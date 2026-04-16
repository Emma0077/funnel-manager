import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ADMIN_EMAIL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function getAdminEmail(c: any): string | undefined {
  const auth = c.req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return c.req.header("x-admin-email");
}

function isAdmin(c: any, adminEmail: string): boolean {
  const email = getAdminEmail(c);
  return !!email && email === adminEmail;
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

function supabaseHeaders(c: any, extra?: Record<string, string>) {
  return {
    apikey: c.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${c.env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function sb(c: any, path: string, init?: RequestInit) {
  const headers = new Headers(supabaseHeaders(c));

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const res = await fetch(`${c.env.SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }

  return { ok: true as const, status: res.status, data };
}

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/projects", async (c) => {
  const projectsRes = await sb(
    c,
    `/projects?select=*&order=created_at.asc`
  );

  if (!projectsRes.ok) {
    return c.json(
      { error: "프로젝트 조회 실패", detail: projectsRes.data },
      500
    );
  }

  const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];

  const withCounts = await Promise.all(
    projects.map(async (p: any) => {
      const countRes = await sb(
        c,
        `/dashboards?project_id=eq.${p.id}&select=id`
      );

      const count = countRes.ok && Array.isArray(countRes.data)
        ? countRes.data.length
        : 0;

      return { ...p, dashboardCount: count };
    })
  );

  return c.json(withCounts);
});

app.post("/api/projects", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 만들 수 있습니다." }, 403);
  }

  const body = await c.req.json();
  const { name, slug, description, isHidden } = body;
  const finalSlug = slug || generateSlug(name);

  const createRes = await sb(c, `/projects`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        name,
        slug: finalSlug,
        description: description ?? null,
        is_hidden: isHidden ?? false,
      },
    ]),
  });

  if (!createRes.ok) {
    return c.json(
      { error: "프로젝트 생성 실패", detail: createRes.data },
      createRes.status
    );
  }

  const project = Array.isArray(createRes.data) ? createRes.data[0] : createRes.data;
  return c.json({ ...project, dashboardCount: 0 }, 201);
});

export const onRequest = handle(app);

app.patch("/api/projects/:slug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 수정할 수 있습니다." }, 403);
  }

  try {
    const slug = c.req.param("slug");
    const body = await c.req.json();
    const { name, description, isHidden } = body;

    const updatePayload: Record<string, any> = {};

    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description ?? null;
    if (isHidden !== undefined) updatePayload.is_hidden = isHidden;

    const updateRes = await sb(
      c,
      `/projects?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      return c.json(
        { error: "프로젝트 수정 실패", detail: updateRes.data },
        updateRes.status
      );
    }

    const project = Array.isArray(updateRes.data)
      ? updateRes.data[0]
      : updateRes.data;

    if (!project) {
      return c.json({ error: "수정할 프로젝트를 찾을 수 없습니다." }, 404);
    }

    const countRes = await sb(
      c,
      `/dashboards?project_id=eq.${project.id}&select=id`
    );

    const dashboardCount =
      countRes.ok && Array.isArray(countRes.data)
        ? countRes.data.length
        : 0;

    return c.json({ ...project, dashboardCount });
  } catch (err: any) {
    return c.json(
      {
        error: "프로젝트 수정 중 예외 발생",
        detail: err?.message ?? String(err),
        stack: err?.stack ?? null,
      },
      500
    );
  }
});

app.delete("/api/projects/:slug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 삭제할 수 있습니다." }, 403);
  }

  try {
    const slug = c.req.param("slug");

    // 1) 프로젝트 조회
    const projectRes = await sb(
      c,
      `/projects?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug`
    );

    if (!projectRes.ok) {
      return c.json(
        { error: "삭제 대상 프로젝트 조회 실패", detail: projectRes.data },
        projectRes.status
      );
    }

    const project = Array.isArray(projectRes.data)
      ? projectRes.data[0]
      : projectRes.data;

    if (!project) {
      return c.json({ error: "삭제할 프로젝트를 찾을 수 없습니다." }, 404);
    }

    // 2) 관련 dashboards 먼저 삭제
    const dashboardsDeleteRes = await sb(
      c,
      `/dashboards?project_id=eq.${project.id}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=representation",
        },
      }
    );

    if (!dashboardsDeleteRes.ok) {
      return c.json(
        {
          error: "관련 대시보드 삭제 실패",
          detail: dashboardsDeleteRes.data,
        },
        dashboardsDeleteRes.status
      );
    }

    // 3) 프로젝트 삭제
    const deleteRes = await sb(
      c,
      `/projects?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=representation",
        },
      }
    );

    if (!deleteRes.ok) {
      return c.json(
        { error: "프로젝트 삭제 실패", detail: deleteRes.data },
        deleteRes.status
      );
    }

    return c.json({
      success: true,
      deletedProject: project,
    });
  } catch (err: any) {
    return c.json(
      {
        error: "프로젝트 삭제 중 예외 발생",
        detail: err?.message ?? String(err),
        stack: err?.stack ?? null,
      },
      500
    );
  }
});

app.get("/api/projects/:projectSlug/dashboards", async (c) => {
  try {
    const projectSlug = c.req.param("projectSlug");

    const projectRes = await sb(
      c,
      `/projects?slug=eq.${encodeURIComponent(projectSlug)}&select=id,name,slug,is_hidden`
    );

    if (!projectRes.ok) {
      return c.json(
        { error: "프로젝트 조회 실패", detail: projectRes.data },
        projectRes.status
      );
    }

    const project = Array.isArray(projectRes.data)
      ? projectRes.data[0]
      : projectRes.data;

    if (!project) {
      return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
    }

    const dashboardsRes = await sb(
      c,
      `/dashboards?project_id=eq.${project.id}&select=*&order=created_at.asc`
    );

    if (!dashboardsRes.ok) {
      return c.json(
        { error: "대시보드 조회 실패", detail: dashboardsRes.data },
        dashboardsRes.status
      );
    }

    const dashboards = Array.isArray(dashboardsRes.data)
      ? dashboardsRes.data
      : [];

    return c.json(dashboards);
  } catch (err: any) {
    return c.json(
      {
        error: "대시보드 조회 중 예외 발생",
        detail: err?.message ?? String(err),
        stack: err?.stack ?? null,
      },
      500
    );
  }
});
