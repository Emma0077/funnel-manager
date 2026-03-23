import { Router, type IRouter } from "express";
import { db, projectsTable, dashboardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() + "-" + Math.random().toString(36).slice(2, 6);
}

function computeStages(stages: any[]): any[] {
  return stages.map((stage, idx) => {
    const prev = stages[idx - 1];
    let conversionRate = stage.conversionRate ?? null;
    let dropOffRate = stage.dropOffRate ?? null;

    if (idx > 0 && prev && prev.metricValue && stage.metricValue !== null && stage.metricValue !== undefined) {
      if (conversionRate === null) {
        conversionRate = Math.round((stage.metricValue / prev.metricValue) * 1000) / 10;
      }
      if (dropOffRate === null) {
        dropOffRate = Math.round((100 - conversionRate) * 10) / 10;
      }
    }

    return { ...stage, conversionRate, dropOffRate };
  });
}

const router: IRouter = Router();

router.get("/projects/:projectSlug/dashboards", async (req, res) => {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const dashboards = await db
      .select()
      .from(dashboardsTable)
      .where(eq(dashboardsTable.projectId, project.id))
      .orderBy(dashboardsTable.createdAt);
    res.json(dashboards);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.post("/projects/:projectSlug/dashboards", async (req, res) => {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const { title, slug, serviceName, createdByToken, stages } = req.body;
    const finalSlug = slug || generateSlug(title);
    const computedStages = computeStages(stages || []);

    const [dashboard] = await db.insert(dashboardsTable).values({
      projectId: project.id,
      title,
      slug: finalSlug,
      serviceName: serviceName ?? null,
      createdByToken,
      isHidden: false,
      stages: computedStages,
    }).returning();
    res.status(201).json(dashboard);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.get("/projects/:projectSlug/dashboards/:dashboardSlug", async (req, res) => {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const [dashboard] = await db
      .select()
      .from(dashboardsTable)
      .where(
        and(
          eq(dashboardsTable.projectId, project.id),
          eq(dashboardsTable.slug, req.params.dashboardSlug)
        )
      );
    if (!dashboard) {
      res.status(404).json({ error: "대시보드를 찾을 수 없습니다." });
      return;
    }
    res.json(dashboard);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.put("/projects/:projectSlug/dashboards/:dashboardSlug", async (req, res) => {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    const [existing] = await db
      .select()
      .from(dashboardsTable)
      .where(
        and(
          eq(dashboardsTable.projectId, project.id),
          eq(dashboardsTable.slug, req.params.dashboardSlug)
        )
      );
    if (!existing) {
      res.status(404).json({ error: "대시보드를 찾을 수 없습니다." });
      return;
    }

    const { title, serviceName, ownerToken, stages } = req.body;
    const isAdminUser = isAdmin(req);

    if (!isAdminUser && ownerToken !== existing.createdByToken) {
      res.status(403).json({ error: "이 대시보드를 수정할 권한이 없습니다." });
      return;
    }

    const computedStages = computeStages(stages || []);

    const [dashboard] = await db
      .update(dashboardsTable)
      .set({
        title,
        serviceName: serviceName ?? null,
        stages: computedStages,
        updatedAt: new Date(),
      })
      .where(eq(dashboardsTable.id, existing.id))
      .returning();
    res.json(dashboard);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.delete("/projects/:projectSlug/dashboards/:dashboardSlug", async (req, res) => {
  const adminEmail = req.headers["x-admin-email"] as string | undefined;
  const isAdminUser = !!adminEmail && adminEmail === ADMIN_EMAIL;
  if (!isAdminUser) {
    res.status(403).json({ error: "관리자만 대시보드를 삭제할 수 있습니다." });
    return;
  }
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, req.params.projectSlug));
    if (!project) {
      res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
      return;
    }
    await db.delete(dashboardsTable).where(
      and(
        eq(dashboardsTable.projectId, project.id),
        eq(dashboardsTable.slug, req.params.dashboardSlug)
      )
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default router;
