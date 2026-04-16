import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/projects", async (c) => {
  try {
    const db = makeDb(c.env.DATABASE_URL);
    const projects = await db.select().from(projectsTable);
    return c.json({ ok: true, count: projects.length, projects });
  } catch (err: any) {
    return c.json(
      {
        ok: false,
        message: err?.message ?? "unknown error",
        stack: String(err?.stack ?? ""),
      },
      500
    );
  }
});

app.post("/api/projects", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ ok: true, body }, 201);
});

export const onRequest = handle(app);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { projectsTable, dashboardsTable } from "../../lib/db/src/schema";

function makeDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { ssl: "require", max: 1 });
  return drizzle(client);
}

app.get("/api/health", async (c) => {
  const db = makeDb(c.env.DATABASE_URL);
  return c.json({ status: "ok", db: !!db });
});
