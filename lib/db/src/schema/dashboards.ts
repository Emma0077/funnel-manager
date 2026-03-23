import { pgTable, text, serial, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const dashboardsTable = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  serviceName: text("service_name"),
  createdByToken: text("created_by_token").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false),
  stages: jsonb("stages").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDashboardSchema = createInsertSchema(dashboardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type Dashboard = typeof dashboardsTable.$inferSelect;
