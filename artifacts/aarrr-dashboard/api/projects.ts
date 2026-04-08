import { db, projectsTable, dashboardsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@growthcamp.site";

function getAdminEmail(req: any): string | undefined {
  const auth = req.headers.authorization as string | undefined;

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
  return (
    name
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() + "-" + Math.random().toString(36).slice(2, 6)
  );
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const projects = await db
        .select()
        .from(projectsTable)
        .orderBy(projectsTable.createdAt);

      const withCounts = await Promise.all(
        projects.map(async (p) => {
          const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(dashboardsTable)
            .where(eq(dashboardsTable.projectId, p.id));

          return { ...p, dashboardCount: count };
        }),
      );

      return res.status(200).json(withCounts);
    }

    if (req.method === "POST") {
      if (!isAdmin(req)) {
        return res
          .status(403)
          .json({ error: "관리자만 프로젝트를 만들 수 있습니다." });
      }

      const { name, slug, description, isHidden } = req.body ?? {};

      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ error: "프로젝트 이름(name)은 필수입니다." });
      }

      const finalSlug = slug || generateSlug(name);

      const [project] = await db
        .insert(projectsTable)
        .values({
          name,
          slug: finalSlug,
          description: description ?? null,
          isHidden: isHidden ?? false,
        })
        .returning();

      return res.status(201).json({
        ...project,
        dashboardCount: 0,
      });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res
        .status(400)
        .json({ error: "이미 사용 중인 슬러그입니다. 다른 이름을 시도해보세요." });
    }

    console.error(err);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
