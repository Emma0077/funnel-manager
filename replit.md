# Workspace

## Overview

AARRR + GA 대시보드 빌더 — A Korean-language workshop tool for building AARRR funnel dashboards from manually entered Google Analytics metrics.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, Wouter routing

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (routes: projects, dashboards)
│   ├── aarrr-dashboard/    # React + Vite frontend
│   └── mockup-sandbox/     # UI prototyping sandbox
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── projects.ts       # projects table
│           └── dashboards.ts     # dashboards table (jsonb stages)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## App Features

- **Project list** (`/projects`): Shows project cards with dashboard count. Admin can create/edit/delete projects.
- **Project detail** (`/projects/:slug`): Shows dashboards for project. "대시보드 만들기" button only here.
- **Dashboard create** (`/projects/:slug/new`): Form with AARRR stage selection, GA guidance panel.
- **Dashboard detail** (`/projects/:slug/:dSlug`): Funnel visualization, interpretation text, print button.
- **Dashboard edit** (`/projects/:slug/:dSlug/edit`): Only creator (localStorage token) or admin can edit.

## Admin System

- Admin email: `admin@example.com` (configure via `ADMIN_EMAIL` env var)
- Admin email input is in the header navbar
- Admin status stored in localStorage (`aarrr_admin_email`)
- Admin email sent to API as `Authorization: Bearer <email>` header

## Owner Token System

- Each browser generates a UUID on first visit, stored as `aarrr_owner_token` in localStorage
- Dashboard stores `createdByToken` to identify creator
- Only creator or admin can edit dashboards

## Data Model

- **projects**: id, name, slug (unique), description, isHidden, createdAt
- **dashboards**: id, projectId, title, slug, serviceName, createdByToken, isHidden, stages (jsonb), createdAt, updatedAt
- **stages**: stageKey, customLabel, order, metricValue, conversionRate (auto-computed), dropOffRate (auto-computed), note

## API Routes

All under `/api`:
- `GET /projects` — list projects (with dashboard count)
- `POST /projects` — create project (admin only)
- `GET /projects/:projectSlug` — get project
- `PUT /projects/:projectSlug` — update project (admin only)
- `DELETE /projects/:projectSlug` — delete project (admin only)
- `GET /projects/:projectSlug/dashboards` — list dashboards
- `POST /projects/:projectSlug/dashboards` — create dashboard
- `GET /projects/:projectSlug/dashboards/:dashboardSlug` — get dashboard
- `PUT /projects/:projectSlug/dashboards/:dashboardSlug` — update dashboard (owner or admin)
- `DELETE /projects/:projectSlug/dashboards/:dashboardSlug` — delete dashboard (admin only)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck; JS bundling handled by esbuild/vite

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` — push database schema changes
