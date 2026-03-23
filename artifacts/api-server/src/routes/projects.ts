import { Router, type IRouter } from "express";
import { db, projectsTable, dashboardsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@growthcamp.site";

function getAdminEmail(req: any): string | undefined {
  const auth = req.headers["authorization"] as string | undefined;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return req.headers["x-admin-email"] as string | undefined;
}

function isAdmin(req: any): boolean {
  const email = getAdminEmail(req);
  return !!email && email === ADMIN_EMAIL;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() + "-" + Math.random().toString(36).slice(2, 6);
}

const router: IRouter = Router();

router.get("/projects", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    const withCounts = await Promise.all(projects.map(async (p) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dashboardsTable)
        .where(eq(dashboardsTable.projectId, p.id));
      return { ...p, dashboardCount: count };
    }));
    res.json(withCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.post("/projects", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "관리자만 프로젝트를 만들 수 있습니다." });
    return;
  }
  try {
    const { name, slug, description, isHidden } = req.body;
    const finalSlug = slug || generateSlug(name);
    const [project] = await db.insert(projectsTable).values({
      name,
      slug: finalSlug,
      description: description ?? null,
      isHidden: isHidden ?? false,
    }).returning();
    const dashboardCount = 0;
    res.status(201).json({ ...project, dashboardCount });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "이미 사용 중인 슬러그입니다. 다른 이름을 시도해보세요." });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.get("/projects/:projectSlug", async (req, res) => {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dashboardsTable)
      .where(eq(dashboardsTable.projectId, project.id));
    res.json({ ...project, dashboardCount: count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.put("/projects/:projectSlug", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "관리자만 프로젝트를 수정할 수 있습니다." });
    return;
  }
  try {
    const { name, description, isHidden } = req.body;
    const [project] = await db
      .update(projectsTable)
      .set({ name, description: description ?? null, isHidden: isHidden ?? false })
      .where(eq(projectsTable.slug, req.params.projectSlug))
      .returning();
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dashboardsTable)
      .where(eq(dashboardsTable.projectId, project.id));
    res.json({ ...project, dashboardCount: count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.delete("/projects/:projectSlug", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "관리자만 프로젝트를 삭제할 수 있습니다." });
    return;
  }
  try {
    await db.delete(projectsTable).where(eq(projectsTable.slug, req.params.projectSlug));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default router;
