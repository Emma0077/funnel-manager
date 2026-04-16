import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

function mapProject(p: any) {
  return {
    ...p,
    isHidden: p.is_hidden,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function mapDashboard(d: any) {
  return {
    ...d,
    projectId: d.project_id,
    serviceName: d.service_name,
    periodStart: d.period_start,
    periodEnd: d.period_end,
    createdByToken: d.created_by_token,
    isHidden: d.is_hidden,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

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

function computeStages(stages: any[]): any[] {
  return stages.map((stage, idx) => {
    const prev = stages[idx - 1];
    let conversionRate = stage.conversionRate ?? null;
    let dropOffRate = stage.dropOffRate ?? null;

    if (idx > 0 && prev && prev.metricValue && stage.metricValue != null) {
      if (conversionRate === null) {
        conversionRate =
          Math.round((stage.metricValue / prev.metricValue) * 1000) / 10;
      }
      if (dropOffRate === null) {
        dropOffRate = Math.round((100 - conversionRate) * 10) / 10;
      }
    }

    return { ...stage, conversionRate, dropOffRate };
  });
}

function supabaseHeaders(c: any) {
  return {
    apikey: c.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${c.env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
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

// Projects
app.get("/api/projects", async (c) => {
  try {
    const projectsRes = await sb(c, `/projects?select=*&order=created_at.asc`);

    if (!projectsRes.ok) {
      return c.json(
        { error: "프로젝트 조회 실패", detail: projectsRes.data },
        projectsRes.status
      );
    }

    const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];

    const withCounts = await Promise.all(
      projects.map(async (p: any) => {
        const countRes = await sb(
          c,
          `/dashboards?project_id=eq.${p.id}&select=id`
        );

        const count =
          countRes.ok && Array.isArray(countRes.data)
            ? countRes.data.length
            : 0;

        return { ...p, dashboardCount: count };
      })
    );

    return c.json(withCounts.map(mapProject));
  } catch (err: any) {
    return c.json(
      {
        error: "Unhandled exception in /api/projects",
        message: err?.message ?? "unknown error",
        stack: String(err?.stack ?? ""),
      },
      500
    );
  }
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

  const project = Array.isArray(createRes.data)
    ? createRes.data[0]
    : createRes.data;

  return c.json({ ...mapProject(project), dashboardCount: 0 }, 201);
});

app.get("/api/projects/:projectSlug", async (c) => {
  const { projectSlug } = c.req.param();

  const res = await sb(c, `/projects?slug=eq.${projectSlug}&select=*`);

  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const project = res.data[0];

  const countRes = await sb(
    c,
    `/dashboards?project_id=eq.${project.id}&select=id`
  );

  const dashboardCount =
    countRes.ok && Array.isArray(countRes.data) ? countRes.data.length : 0;

  return c.json({ ...mapProject(project), dashboardCount });
});

app.put("/api/projects/:projectSlug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 수정할 수 있습니다." }, 403);
  }

  const { projectSlug } = c.req.param();
  const body = await c.req.json();
  const { name, description, isHidden } = body;

  const res = await sb(c, `/projects?slug=eq.${projectSlug}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      description: description ?? null,
      is_hidden: isHidden ?? false,
    }),
  });

  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return c.json({ error: "프로젝트 수정 실패", detail: res.data }, 500);
  }

  const project = res.data[0];

  const countRes = await sb(
    c,
    `/dashboards?project_id=eq.${project.id}&select=id`
  );

  const dashboardCount =
    countRes.ok && Array.isArray(countRes.data) ? countRes.data.length : 0;

  return c.json({ ...mapProject(project), dashboardCount });
});

app.delete("/api/projects/:projectSlug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 삭제할 수 있습니다." }, 403);
  }

  const { projectSlug } = c.req.param();

  const res = await sb(c, `/projects?slug=eq.${projectSlug}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    return c.json({ error: "삭제 실패", detail: res.data }, res.status);
  }

  return c.json({ success: true });
});

// Dashboards
app.get("/api/projects/:projectSlug/dashboards", async (c) => {
  const { projectSlug } = c.req.param();

  const projectRes = await sb(c, `/projects?slug=eq.${projectSlug}&select=id`);

  if (
    !projectRes.ok ||
    !Array.isArray(projectRes.data) ||
    projectRes.data.length === 0
  ) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const projectId = projectRes.data[0].id;

  const dashboardsRes = await sb(
    c,
    `/dashboards?project_id=eq.${projectId}&select=*&order=created_at.asc`
  );

  if (!dashboardsRes.ok) {
    return c.json(
      { error: "대시보드 조회 실패", detail: dashboardsRes.data },
      dashboardsRes.status
    );
  }

  const dashboards = Array.isArray(dashboardsRes.data) ? dashboardsRes.data : [];
  return c.json(dashboards.map(mapDashboard));
});

app.post("/api/projects/:projectSlug/dashboards", async (c) => {
  const { projectSlug } = c.req.param();

  const projectRes = await sb(c, `/projects?slug=eq.${projectSlug}&select=id`);

  if (
    !projectRes.ok ||
    !Array.isArray(projectRes.data) ||
    projectRes.data.length === 0
  ) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const projectId = projectRes.data[0].id;
  const body = await c.req.json();
  const {
    title,
    slug,
    serviceName,
    periodStart,
    periodEnd,
    createdByToken,
    stages,
  } = body;

  const finalSlug = slug || generateSlug(title);
  const computedStages = computeStages(stages || []);

  const createRes = await sb(c, `/dashboards`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        project_id: projectId,
        title,
        slug: finalSlug,
        service_name: serviceName ?? null,
        period_start: periodStart ?? null,
        period_end: periodEnd ?? null,
        created_by_token: createdByToken ?? null,
        is_hidden: false,
        stages: computedStages,
      },
    ]),
  });

  if (!createRes.ok) {
    return c.json(
      { error: "대시보드 생성 실패", detail: createRes.data },
      createRes.status
    );
  }

  const dashboard = Array.isArray(createRes.data)
    ? createRes.data[0]
    : createRes.data;

  return c.json(mapDashboard(dashboard), 201);
});

app.get("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const { projectSlug, dashboardSlug } = c.req.param();

  const projectRes = await sb(c, `/projects?slug=eq.${projectSlug}&select=id`);

  if (
    !projectRes.ok ||
    !Array.isArray(projectRes.data) ||
    projectRes.data.length === 0
  ) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const projectId = projectRes.data[0].id;

  const dashboardRes = await sb(
    c,
    `/dashboards?project_id=eq.${projectId}&slug=eq.${dashboardSlug}&select=*`
  );

  if (
    !dashboardRes.ok ||
    !Array.isArray(dashboardRes.data) ||
    dashboardRes.data.length === 0
  ) {
    return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);
  }

  return c.json(mapDashboard(dashboardRes.data[0]));
});

app.put("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const { projectSlug, dashboardSlug } = c.req.param();

  const projectRes = await sb(c, `/projects?slug=eq.${projectSlug}&select=id`);

  if (
    !projectRes.ok ||
    !Array.isArray(projectRes.data) ||
    projectRes.data.length === 0
  ) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const projectId = projectRes.data[0].id;

  const existingRes = await sb(
    c,
    `/dashboards?project_id=eq.${projectId}&slug=eq.${dashboardSlug}&select=*`
  );

  if (
    !existingRes.ok ||
    !Array.isArray(existingRes.data) ||
    existingRes.data.length === 0
  ) {
    return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);
  }

  const existing = existingRes.data[0];
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  const body = await c.req.json();
  const { title, serviceName, periodStart, periodEnd, ownerToken, stages } = body;

  if (!isAdmin(c, adminEmail) && ownerToken !== existing.created_by_token) {
    return c.json({ error: "이 대시보드를 수정할 권한이 없습니다." }, 403);
  }

  const computedStages = computeStages(stages || []);

  const updateRes = await sb(c, `/dashboards?id=eq.${existing.id}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title,
      service_name: serviceName ?? null,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
      stages: computedStages,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!updateRes.ok) {
    return c.json(
      { error: "대시보드 수정 실패", detail: updateRes.data },
      updateRes.status
    );
  }

  const dashboard = Array.isArray(updateRes.data)
    ? updateRes.data[0]
    : updateRes.data;

  return c.json(mapDashboard(dashboard));
});

app.delete("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const { projectSlug, dashboardSlug } = c.req.param();

  const projectRes = await sb(c, `/projects?slug=eq.${projectSlug}&select=id`);

  if (
    !projectRes.ok ||
    !Array.isArray(projectRes.data) ||
    projectRes.data.length === 0
  ) {
    return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  }

  const projectId = projectRes.data[0].id;

  const existingRes = await sb(
    c,
    `/dashboards?project_id=eq.${projectId}&slug=eq.${dashboardSlug}&select=*`
  );

  if (
    !existingRes.ok ||
    !Array.isArray(existingRes.data) ||
    existingRes.data.length === 0
  ) {
    return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);
  }

  const existing = existingRes.data[0];
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  const adminUser = isAdmin(c, adminEmail);
  const ownerToken = c.req.header("x-owner-token");

  if (!adminUser && !ownerToken) {
    return c.json({ error: "삭제 권한이 없습니다." }, 403);
  }

  if (!adminUser && ownerToken !== existing.created_by_token) {
    return c.json({ error: "본인이 만든 대시보드만 삭제할 수 있습니다." }, 403);
  }

  const deleteRes = await sb(c, `/dashboards?id=eq.${existing.id}`, {
    method: "DELETE",
  });

  if (!deleteRes.ok) {
    return c.json(
      { error: "대시보드 삭제 실패", detail: deleteRes.data },
      deleteRes.status
    );
  }

  return c.json({ success: true });
});

export const onRequest = handle(app);
