import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql as sqlExpr } from "drizzle-orm";
import { projectsTable, dashboardsTable } from "../../lib/db/src/schema";

type Bindings = {
  DATABASE_URL: string;
  ADMIN_EMAIL: string;
};

function makeDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { ssl: "require", max: 1 });
  return drizzle(client);
}

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
    if (
      idx > 0 &&
      prev &&
      prev.metricValue &&
      stage.metricValue != null
    ) {
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

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ── Projects ──────────────────────────────────────────────

app.get("/api/projects", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(projectsTable.createdAt);
  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const [{ count }] = await db
        .select({ count: sqlExpr<number>`count(*)::int` })
        .from(dashboardsTable)
        .where(eq(dashboardsTable.projectId, p.id));
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
  const db = makeDb(c.env.DATABASE_URL);
  const { name, slug, description, isHidden } = await c.req.json();
  const finalSlug = slug || generateSlug(name);
  try {
    const [project] = await db
      .insert(projectsTable)
      .values({ name, slug: finalSlug, description: description ?? null, isHidden: isHidden ?? false })
      .returning();
    return c.json({ ...project, dashboardCount: 0 }, 201);
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json({ error: "이미 사용 중인 슬러그입니다." }, 400);
    }
    throw err;
  }
});

app.get("/api/projects/:projectSlug", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const [{ count }] = await db
    .select({ count: sqlExpr<number>`count(*)::int` })
    .from(dashboardsTable)
    .where(eq(dashboardsTable.projectId, project.id));
  return c.json({ ...project, dashboardCount: count });
});

app.put("/api/projects/:projectSlug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 수정할 수 있습니다." }, 403);
  }
  const db = makeDb(c.env.DATABASE_URL);
  const { name, description, isHidden } = await c.req.json();
  const [project] = await db
    .update(projectsTable)
    .set({ name, description: description ?? null, isHidden: isHidden ?? false })
    .where(eq(projectsTable.slug, c.req.param("projectSlug")))
    .returning();
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const [{ count }] = await db
    .select({ count: sqlExpr<number>`count(*)::int` })
    .from(dashboardsTable)
    .where(eq(dashboardsTable.projectId, project.id));
  return c.json({ ...project, dashboardCount: count });
});

app.delete("/api/projects/:projectSlug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  if (!isAdmin(c, adminEmail)) {
    return c.json({ error: "관리자만 프로젝트를 삭제할 수 있습니다." }, 403);
  }
  const db = makeDb(c.env.DATABASE_URL);
  await db
    .delete(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  return c.json({ success: true });
});

// ── Dashboards ────────────────────────────────────────────

app.get("/api/projects/:projectSlug/dashboards", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const dashboards = await db
    .select()
    .from(dashboardsTable)
    .where(eq(dashboardsTable.projectId, project.id))
    .orderBy(dashboardsTable.createdAt);
  return c.json(dashboards);
});

app.post("/api/projects/:projectSlug/dashboards", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const { title, slug, serviceName, periodStart, periodEnd, createdByToken, stages } =
    await c.req.json();
  const finalSlug = slug || generateSlug(title);
  const computedStages = computeStages(stages || []);
  const [dashboard] = await db
    .insert(dashboardsTable)
    .values({
      projectId: project.id,
      title,
      slug: finalSlug,
      serviceName: serviceName ?? null,
      periodStart: periodStart ?? null,
      periodEnd: periodEnd ?? null,
      createdByToken,
      isHidden: false,
      stages: computedStages,
    })
    .returning();
  return c.json(dashboard, 201);
});

app.get("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const [dashboard] = await db
    .select()
    .from(dashboardsTable)
    .where(
      and(
        eq(dashboardsTable.projectId, project.id),
        eq(dashboardsTable.slug, c.req.param("dashboardSlug"))
      )
    );
  if (!dashboard) return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);
  return c.json(dashboard);
});

app.put("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const [existing] = await db
    .select()
    .from(dashboardsTable)
    .where(
      and(
        eq(dashboardsTable.projectId, project.id),
        eq(dashboardsTable.slug, c.req.param("dashboardSlug"))
      )
    );
  if (!existing) return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);

  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  const { title, serviceName, periodStart, periodEnd, ownerToken, stages } = await c.req.json();
  if (!isAdmin(c, adminEmail) && ownerToken !== existing.createdByToken) {
    return c.json({ error: "이 대시보드를 수정할 권한이 없습니다." }, 403);
  }
  const computedStages = computeStages(stages || []);
  const [dashboard] = await db
    .update(dashboardsTable)
    .set({
      title,
      serviceName: serviceName ?? null,
      periodStart: periodStart ?? null,
      periodEnd: periodEnd ?? null,
      stages: computedStages,
      updatedAt: new Date(),
    })
    .where(eq(dashboardsTable.id, existing.id))
    .returning();
  return c.json(dashboard);
});

app.delete("/api/projects/:projectSlug/dashboards/:dashboardSlug", async (c) => {
  const adminEmail = c.env.ADMIN_EMAIL ?? "admin@growthcamp.site";
  const adminUser = isAdmin(c, adminEmail);
  const ownerToken = c.req.header("x-owner-token");
  if (!adminUser && !ownerToken) {
    return c.json({ error: "삭제 권한이 없습니다." }, 403);
  }
  const db = makeDb(c.env.DATABASE_URL);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, c.req.param("projectSlug")));
  if (!project) return c.json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const [existing] = await db
    .select()
    .from(dashboardsTable)
    .where(
      and(
        eq(dashboardsTable.projectId, project.id),
        eq(dashboardsTable.slug, c.req.param("dashboardSlug"))
      )
    );
  if (!existing) return c.json({ error: "대시보드를 찾을 수 없습니다." }, 404);
  if (!adminUser && ownerToken !== existing.createdByToken) {
    return c.json({ error: "본인이 만든 대시보드만 삭제할 수 있습니다." }, 403);
  }
  await db.delete(dashboardsTable).where(eq(dashboardsTable.id, existing.id));
  return c.json({ success: true });
});

export const onRequest = app.fetch;
