import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/api/projects", async (c) => {
  return c.json({ debug: "projects route reached" });
});

app.post("/api/projects", async (c) => {
  return c.json({ debug: "projects POST reached" });
});

export const onRequest = app.fetch;
