import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/projects", (c) => {
  return c.json([{ id: 1, name: "test", slug: "test", dashboardCount: 0 }]);
});

app.post("/api/projects", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ ok: true, body }, 201);
});

export const onRequest = handle(app);
