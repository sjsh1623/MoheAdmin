# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Admin dashboard for the Mohe platform. Served at `https://<host>/admin` via Caddy (see `MoheReact/Caddyfile`). Used by operators to monitor the data pipeline, batch jobs, visitor analytics, and manage places.

## Commands

### Development
- `npm run dev` — Vite dev server with HMR
- `npm run build` — Production build (outputs to `dist/`)
- `npm run preview` — Preview the production build locally
- `npm run lint` — ESLint

### Docker
- Built by `MoheReact/docker-compose.yml` as the `mohe-admin-app` service (`build: ../MoheAdmin`)
- Serves static `dist/` via nginx on internal port 80
- Caddy routes `/admin/*` to this container

## Tech Stack

- React 19.1.0
- React Router DOM 7.7.1 (browser router with `basename="/admin"`)
- Vite 7.0.4
- CSS Modules (`.module.css`) for scoped styling
- No Framer Motion — admin is function-over-form, no page transitions

## Architecture

### Entry & Routing

- `src/main.jsx` mounts `<BrowserRouter basename="/admin">` so the app lives under the `/admin` path prefix in production.
- `src/App.jsx` defines the route tree. All pages render inside `AdminLayout` at `/monitor/*`:
  - `/admin/` → redirects to `/admin/monitor`
  - `/admin/monitor` → Dashboard (index)
  - `/admin/monitor/pipeline` → Pipeline
  - `/admin/monitor/analytics` → Analytics
  - `/admin/monitor/batch` → BatchMonitor
  - `/admin/monitor/logs` → DockerLogs
  - `/admin/monitor/places` → Places
  - `/admin/monitor/crawling` → CrawlingMap
  - Any unknown path → redirect to `/admin/monitor`

### Directory Structure

```
src/
├── App.jsx              # Route definitions
├── main.jsx             # Entry + BrowserRouter(basename="/admin")
├── components/
│   └── layout/          # AdminLayout (sidebar + outlet)
├── pages/               # One .jsx + one .module.css per page
│   ├── Dashboard
│   ├── Pipeline
│   ├── Analytics
│   ├── BatchMonitor
│   ├── Places
│   ├── DockerLogs
│   └── CrawlingMap
├── services/            # API clients (fetch wrappers)
└── styles/              # Global CSS
```

## Pages

| Page | Purpose | Primary backend endpoints |
|------|---------|---------------------------|
| **Dashboard** | High-level metrics overview | `/api/admin/monitor/pipeline/stats`, `/api/admin/analytics/summary` |
| **Pipeline** | Crawl → AI description → embedding progress, recent crawls, manual job trigger | `/api/admin/monitor/pipeline/{stats,recent-crawls,progress}`, `POST /api/admin/monitor/pipeline/jobs/{name}/trigger` |
| **Analytics** | Visitor analytics: summary, hourly traffic, devices, browsers, OS, top pages, recent visitors | `/api/admin/analytics/{summary,hourly,devices,browsers,os,pages,visitors}` |
| **BatchMonitor** | Running Spring Batch jobs, stop/stop-all | `/api/batch/jobs/running`, `POST /api/batch/jobs/stop/{id}`, `POST /api/batch/jobs/stop-all` |
| **Places** | Browse, search, and delete places (single or batch) | `/api/admin/monitor/places/...`, `DELETE /api/admin/monitor/places/{id}`, `POST /api/admin/monitor/places/batch-delete` |
| **DockerLogs** | Streamed Docker container logs | Backend endpoint exposing docker logs |
| **CrawlingMap** | Geographic visualization of crawled place coverage | Place list with coordinates |

## API Integration

- All admin calls hit `/api/admin/*` (and `/api/batch/*` for batch control), which Caddy forwards to `spring:8080`.
- Public analytics ingress (`POST /api/analytics/pageview`) is called by `MoheReact`, not by this admin app.
- Services live under `src/services/`; page components call them and render loading/error/empty states.

## Styling Conventions

- CSS Modules alongside each page: `Pipeline.jsx` + `Pipeline.module.css`.
- Desktop-first layout (operator tool, not mobile) — unlike MoheReact.
- Neutral admin palette defined in `src/styles/`.

## Deployment

- Build: `npm run build` produces static assets in `dist/`.
- Container: `Dockerfile` copies `dist/` into an nginx image; nginx serves it on port 80.
- Routing: Caddy path-prefix `/admin/*` → `mohe-admin-app:80`. Because Vite is built with `base: '/admin/'` and React Router uses `basename="/admin"`, all client-side links resolve correctly under the prefix.
- To deploy: rebuild the `mohe-admin-app` service from `MoheReact/docker-compose.yml` (`docker compose up -d --build mohe-admin-app`).

## Notes for Claude

- This repo is built by a compose file **outside** itself (`MoheReact/docker-compose.yml`). Keep the Dockerfile and `vite.config.js` `base` in sync with the `/admin` prefix.
- When adding a new admin page, update both `src/App.jsx` (route) and the sidebar in `AdminLayout`.
- New backend endpoints should be added under `/api/admin/*` on MoheSpring and documented there (`MoheSpring/CLAUDE.md` Admin Dashboard section).
