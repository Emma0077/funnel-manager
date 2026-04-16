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
