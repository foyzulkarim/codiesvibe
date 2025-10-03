## Gateway & Port Migration — Agent-Executable Plan

This plan turns the high-level strategy into granular, sequential tasks the AI Agent can execute safely with zero frontend impact.

### Objectives

- Introduce a gateway on port `4000` that proxies to NestJS on `4001`.
- Migrate NestJS API from `4000` → `4001` without breaking the frontend.
- Maintain `/api/*`, `/health`, `/docs` routes.

### Prerequisites

- Repo cloned and up to date.
- Docker running locally.
- Frontend proxies `/api` to `http://localhost:4000`.

### Definitions

- `gateway`: Nginx reverse proxy on `4000`.
- `nestjs-api`: NestJS service on `4001`.
- `compose.dev`: `docker-compose.backend.yml`.
- `compose.prod`: `docker-compose.production.yml`.

---

## Phase 0 — Baseline Verification

Task 0.1 — [ ] Verify current state
- Files: `src/api/client.ts`, `vite.config.ts`, `backend/nestjs-api/src/main.ts`.
- Actions:
  - Confirm frontend uses `/api` path.
  - Confirm NestJS global prefix `/api`.
  - Confirm dev proxy points to `:4000`.
- Validation:
  - `curl http://localhost:4000/health` succeeds if running.
  - `curl http://localhost:4000/docs` returns docs HTML.

---

## Phase 1 — Move NestJS to Port 4001

Task 1.1 — [ ] Update environment
- Files: `backend/nestjs-api/.env.example`, `.env` (local).
- Actions:
  - Set `PORT=4001`.
- Validation:
  - `.env` reflects `PORT=4001`.

Task 1.2 — [ ] Update NestJS bootstrap
- Files: `backend/nestjs-api/src/main.ts`.
- Actions:
  - Read port from env (`process.env.PORT || 4001`).
  - Ensure global prefix `/api` remains.
- Validation:
  - Build/start uses `4001`.

Task 1.3 — [ ] Update dev scripts
- Files: `backend/nestjs-api/package.json`.
- Actions:
  - Ensure `dev`/`start` scripts do not hardcode `4000`.
- Validation:
  - `npm run start:dev` binds `4001`.

Task 1.4 — [ ] Run API on 4001
- Commands:
  - `docker compose -f docker-compose.backend.yml up -d nestjs-api`.
  - `curl http://localhost:4001/health` → `200`.
- Validation:
  - `curl http://localhost:4001/api` routes correctly.

Rollback (Phase 1)
- Restore `PORT=4000` in env.
- Revert `main.ts` change.
- Restart service.
---

## Phase 2 — Bootstrap Gateway (Nginx)

Task 2.1 — [ ] Ensure gateway structure exists
- Path: `backend/gateway/`.
- Files (expected): `nginx.conf`, `Dockerfile.gateway`.
- Actions:
  - Create missing files if absent.

Task 2.2 — [ ] Write Nginx config
- File: `backend/gateway/nginx.conf`.
- Content requirements:
  - `listen 4000;`.
  - `upstream nestjs_backend { server nestjs-api:4001; }`.
  - `location /api/` → `proxy_pass http://nestjs_backend;`.
  - `location /health` → proxy to backend.
  - `location /docs` → proxy to backend.
- Validation:
  - Config loads without errors.

Task 2.3 — [ ] Write Gateway Dockerfile
- File: `backend/gateway/Dockerfile.gateway`.
- Content requirements:
  - Base: `nginx:alpine`.
  - Copy `nginx.conf` to `/etc/nginx/nginx.conf`.
  - Expose `4000`.
- Validation:
  - Image builds successfully.

Task 2.4 — [ ] Local gateway runtime test
- Commands:
  - `docker compose -f docker-compose.backend.yml up -d gateway`.
  - `curl http://localhost:4000/health` → `200`.
  - `curl http://localhost:4000/docs` → HTML.
- Validation:
  - `/api/*` proxies to NestJS on `4001`.

Rollback (Phase 2)
- Stop `gateway` container.
- Revert `nginx.conf` and Dockerfile changes.
---

## Phase 3 — Docker Compose Integration

Task 3.1 — [ ] Update production compose
- File: `docker-compose.production.yml`.
- Actions:
  - Add `gateway` service:
    - Build `./backend/gateway` with `Dockerfile.gateway`.
    - `ports: ["4000:4000"]`.
    - `depends_on: [nestjs-api]`.
    - Attach to `codiesvibe-network`.
  - Update `nestjs-api`:
    - Remove external `4000` mapping.
    - Use `expose: ["4001"]`.
    - Set `environment: PORT=4001`.
- Validation:
  - `docker compose -f docker-compose.production.yml config` passes.

Task 3.2 — [ ] Update backend/dev compose
- File: `docker-compose.backend.yml`.
- Actions:
  - Add `gateway` service with `ports: ["4000:4000"]`.
  - Mount `nginx.conf` to `/etc/nginx/nginx.conf:ro`.
  - Keep `nestjs-api` mapped `"4001:4001"`.
- Validation:
  - `docker compose -f docker-compose.backend.yml config` passes.

Task 3.3 — [ ] Network verification
- Files: `docker-compose.production.yml`, `docker-compose.backend.yml`.
- Actions:
  - Ensure network `codiesvibe-network` exists or define it.
- Validation:
  - Services share a network; DNS `nestjs-api` resolves.

Rollback (Phase 3)
- Revert compose changes.
- Restart previous working stack.
---

## Phase 4 — End-to-End Dev Verification

Task 4.1 — [ ] Bring up dev stack
- Commands:
  - `docker compose -f docker-compose.backend.yml up -d nestjs-api gateway`.
  - `docker ps` → both containers running.

Task 4.2 — [ ] Health checks via gateway
- Commands:
  - `curl -sS http://localhost:4000/health` → `200` JSON.
  - `curl -I http://localhost:4000/docs` → `200` HTML.
  - `curl -I http://localhost:4000/api/` → `200/404` depending on route.

Task 4.3 — [ ] Frontend integration sanity check
- Files: `src/api/client.ts`, `vite.config.ts`.
- Actions:
  - Ensure frontend continues to call `/api/*`.
  - Confirm no hardcoded `http://localhost:4001`.
- Validation:
  - Frontend connects via `:4000` without changes.

Rollback (Phase 4)
- Stop `gateway`.
- Access API directly on `4001` for debugging.
---

## Phase 5 — Switch-Over & Cleanup

Task 5.1 — [ ] Remove legacy exposure
- Files: `docker-compose.production.yml`.
- Actions:
  - Ensure `nestjs-api` does not expose `4000`.
  - Confirm only gateway exposes `4000`.

Task 5.2 — [ ] Documentation updates
- Files: `README.md`, `README-infra.md`, `docs/*`.
- Actions:
  - Update architecture diagram to include gateway.
  - Note API now runs on `4001` internally.
  - Clarify frontend proxy: `/api → :4000`.

Task 5.3 — [ ] Monitoring/logging alignment
- Files: `monitoring/*` (if applicable).
- Actions:
  - Route access logs via gateway (optional).
  - Ensure health checks hit gateway in production.

Rollback (Phase 5)
- Re-add direct exposure for `nestjs-api` (temporary).
- Revert docs to prior state.
---

## Phase 6 — Acceptance, Performance, Rollback

Task 6.1 — [ ] Acceptance criteria
- `/health` via gateway returns `200`.
- `/docs` via gateway renders correctly.
- `/api/*` routes stable with no regressions.
- Frontend works without configuration changes.

Task 6.2 — [ ] Performance checks
- Commands:
  - `ab -n 200 -c 20 http://localhost:4000/health` (optional).
- Validation:
  - Latency comparable to direct `4001` access.

Task 6.3 — [ ] Rollback plan
- Steps:
  - Stop `gateway`.
  - Restore `nestjs-api` to `PORT=4000`.
  - Re-expose `4000` in compose.
  - Update docs back to single-service model.

---

## Quick Reference: File Changes

- `backend/nestjs-api/.env` → `PORT=4001`.
- `backend/nestjs-api/src/main.ts` → read `PORT`.
- `backend/gateway/nginx.conf` → proxy to `nestjs-api:4001`.
- `backend/gateway/Dockerfile.gateway` → `nginx:alpine`, expose `4000`.
- `docker-compose.backend.yml` → add `gateway`, map `4000:4000`.
- `docker-compose.production.yml` → add `gateway`, `nestjs-api` expose `4001`.

## Quick Reference: Validation Commands

- `curl http://localhost:4001/health` → direct API.
- `curl http://localhost:4000/health` → via gateway.
- `docker compose -f docker-compose.backend.yml up -d`.
- `docker compose -f docker-compose.production.yml config`.
---

## Master Checklist

- [ ] Phase 0 — Task 0.1: Verify current state
- [ ] Phase 1 — Task 1.1: Update environment (PORT=4001)
- [ ] Phase 1 — Task 1.2: Update NestJS bootstrap
- [ ] Phase 1 — Task 1.3: Update dev scripts
- [ ] Phase 1 — Task 1.4: Run API on 4001
- [ ] Phase 2 — Task 2.1: Ensure gateway structure
- [ ] Phase 2 — Task 2.2: Write Nginx config
- [ ] Phase 2 — Task 2.3: Write Gateway Dockerfile
- [ ] Phase 2 — Task 2.4: Local gateway runtime test
- [ ] Phase 3 — Task 3.1: Update production compose
- [ ] Phase 3 — Task 3.2: Update backend/dev compose
- [ ] Phase 3 — Task 3.3: Network verification
- [ ] Phase 4 — Task 4.1: Bring up dev stack
- [ ] Phase 4 — Task 4.2: Health checks via gateway
- [ ] Phase 4 — Task 4.3: Frontend integration sanity check
- [ ] Phase 5 — Task 5.1: Remove legacy exposure
- [ ] Phase 5 — Task 5.2: Documentation updates
- [ ] Phase 5 — Task 5.3: Monitoring/logging alignment
- [ ] Phase 6 — Task 6.1: Acceptance criteria
- [ ] Phase 6 — Task 6.2: Performance checks
- [ ] Phase 6 — Task 6.3: Rollback plan
