# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CS2 skin inventory web app. Users create an account, pick skins from a public catalog, enter float, price paid, StatTrak and purchase date, and the app shows market value and profit/loss. The code, comments, API fields, error messages and docs are all in **Portuguese**: keep new code in Portuguese too (e.g. `cadastrar`, `preco_pago`, `{ "erro": "..." }`).

`README.md` is the source of truth for the spec: endpoints, business rules, data model and request/response examples. Keep it in sync when behavior changes. `KANBAN.md` is a local, untracked task list (backend stages 1–6). Never commit it.

Stack: React + Vite (frontend), Node.js 22 + Express 5 in plain JavaScript ESM (`"type": "module"`), PostgreSQL, bcryptjs + jsonwebtoken.

## Commands

Each app has its own `package.json`. There is no root package.

```bash
# Backend (backend/)
npm run dev                 # nodemon, API on http://localhost:3000/api
npm test                    # Jest (runs with --experimental-vm-modules, required for ESM)
npm test -- tests/unit/inventario.service.test.js   # single file
npm test -- -t "float"      # tests whose name matches
npm run test:coverage

# Frontend (frontend/)
npm run dev                 # Vite on :5173, proxies /api to API_PROXY_TARGET (default http://localhost:3000)
npm run build

# Full stack (repo root, needs .env copied from .env.example)
docker compose -f docker-compose.dev.yml up --build   # hot reload; API on :3001, frontend on :5173, Postgres on :5433
docker compose up --build                             # production: nginx serves the build on :8080 and proxies /api
```

There is no linter configured. Env vars are validated in `backend/src/configuration/env.js` (`DATABASE_URL` and `JWT_SECRET` are required, and the app throws at import if they are missing). The backend reads `backend/.env`, then the root `.env`. Outside Docker, `DATABASE_URL` must point to `localhost:5433`, not the `postgres` host.

## Backend architecture

Layered flow: `route → middleware/auth → controller → service → repository → PostgreSQL`.

- **Dependency injection via factories.** Services and repositories are created by `create...` functions (`criarXService({ deps })`) and wired once in `configuration/factory/index.js` (`criarContextos()`). `server.js` builds the contexts, loads the catalog, then calls `criarApp(contextos)`. Controllers export `criarXRouter({ service, ... })`. New contexts must follow this pattern; it is what lets the tests swap the DB for fakes.
- **Layer rules:**
  - controllers only shape the HTTP request/response;
  - services hold all business rules and never touch `req`/`res` or SQL;
  - repositories hold only SQL;
  - `infraestructure/external/` only downloads data.
- **Spelling:** the folder is spelled `infraestructure` (sic). Keep it as is.
- **Errors:** services throw `ValidationError` (400), `UnauthorizedError` (401), `NotFoundError` (404), `ConflictError` (409) or `AppError(msg, status)` from `domain/common/errors`. The middleware `application/middleware/error-handler.js` turns them into `{ "erro": msg }`. Express 5 forwards async errors automatically, so handlers need no try/catch.
- **Postgres error codes:** services translate `23505` (unique violation) into 409 and `23503` (foreign key violation) into 401.
- **Auth:** `middleware/auth.js` validates `Authorization: Bearer <jwt>` (HS256 only, `sub` = user id) and sets `req.usuario = { id, email }`. Every inventory query filters by `usuario_id` from the token, so another user's item is a 404. `senha_hash` must never leave the service (`publico()` strips it). A wrong `senha_atual` returns 400, not 401, because the frontend logs out on any 401.
- **Catalog:** the CSGO-API `skins.json` is downloaded at startup and kept **in memory** (`catalogoService`). It has no DB table and no repository. If the download fails the server still starts, and catalog-dependent routes return 503. `catalogoService.buscarPorId` is the internal lookup used by the inventory service. Skins are normalized to camelCase internally (`minFloat`, `semPintura`, `nomeCompleto`), and API output is snake_case.
- **Computed, not stored:** desgaste (wear), `market_hash_name`, prices and profit are computed per request in `inventario.service.js`. Only `skin_id`, `float`, `stattrak`, `preco_pago` and `data_compra` are stored.
  - `market_hash_name` = `[StatTrak™ ]<nome completo> (<desgaste>)`.
  - For knives, `★ ` stays first: `★ StatTrak™ Karambit | Doppler (Factory New)`.
  - Vanilla knives (`semPintura`, no `pattern` in the catalog) have no wear: `desgaste` is `null` and the name has no suffix.
- **Database:** `infraestructure/db/postgres/schema.sql` runs on every startup. It is idempotent, so write `CREATE ... IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. There are no migrations. `connection.js` sets pg type parsers: NUMERIC becomes a JS number, and DATE stays a `"YYYY-MM-DD"` string to avoid timezone shifts. Timestamps are `TIMESTAMPTZ`; a `DO` block converts old `TIMESTAMP` columns. Never use `TIMESTAMP` without a time zone, because the DB (UTC in Docker) and Node (local time zone) disagree. The column `"float"` must be double-quoted in SQL.
- **Dates:** "today" for date validation is computed in the `America/Sao_Paulo` timezone, not UTC.
- **Prices (`domain/preco`):** `precoService` downloads the CSGO Trader price files (Steam, Skinport, CSFloat, Buff163, all USD) and the AwesomeAPI USD→BRL rate.
  - Each source has a different JSON shape. `normalizarArquivoDePrecos` reduces it to `{ market_hash_name: { preco, fases? } }` before saving to `cache_precos` (one JSONB row per source plus a `cotacao` row).
  - Lookups (`precosEmReais`) read only the **in-memory cache**. It is loaded from the DB at startup and refreshed by `atualizar()`, so a user request never triggers an external call.
  - A source that fails to download keeps its previous copy. Concurrent `atualizar()` calls share one download.
  - Doppler phases: a catalog skin with `fase` only uses sources that have a price for that phase (CSFloat, Buff163). Steam and Skinport return `null` for it.
  - `inventario.service` turns the per-source BRL prices into `valor_atual`, `menor_preco`, `lucro` and `variacao_percentual` (`calcularValores`). Steam is the default source, with fallback in `FONTES_PRECO` order.
  - The price constants live in `domain/preco/entity/preco.constants.js`.
- **Listing and summary:** filters (`arma`, `desgaste`, `stattrak`) and ordering (`lucro`, `valor`, `data`) are applied in `inventario.service` **after** building the items, not in SQL, because weapon, wear and prices come from the catalog and the price cache.
  - Query values are validated by `interpretarFiltros`: invalid or repeated → 400.
  - Ordering is descending with nulls last. Ties keep the DB order (newest first).
  - `calcularResumo`: `total_pago` counts every item, while the value, profit and % totals count only items with a price.
  - `GET /inventario/resumo` is declared before `/:id` in the router.
- **Scheduler (`configuration/agendador.js`):** started by `server.js` after the catalog loads and the price cache is read from the DB.
  - Every hour it re-downloads whatever is 24h old or never loaded (catalog via `catalogoService.status()`, prices via `precoService.precisaAtualizar()`), so a failed download is retried an hour later.
  - The timer is `unref`'d and stopped on SIGINT/SIGTERM.
  - Tests drive it with an injected `agora` clock plus Jest fake timers (with `Date` left real).
- **Price endpoints:** `GET /precos/status` is public. `POST /precos/atualizar` requires auth and calls `precoService.atualizarAgora()`, which returns 502 only when every source failed.

## Backend tests

`backend/tests/`: Jest + Supertest. Tests use **no DB and no network**.

- `setup-env.js` sets the env vars, including `BCRYPT_ROUNDS=4`.
- `helpers/repositories-em-memoria.js` provides in-memory repositories with the same interface as the real ones. They imitate the unique e-mail constraint (code `23505`), the foreign-key error (`23503`) and `ON DELETE CASCADE`.
- `helpers/catalogo.fixture.js` holds a slice of the real `skins.json`, and `helpers/precos.fixture.js` holds price files in each source's real format (exchange rate R$ 5,00).
- `helpers/contextos.js` builds the same contexts as the factory, but in memory. Integration tests use `criarApp(await criarContextosDeTeste())`.
- When you add a repository method, add it to the in-memory fake too.
- In ESM tests, import `jest` from `@jest/globals` when you need `jest.useFakeTimers` etc.
- Repositories (SQL) are not covered by these tests. Verify them against the real DB through Docker.

## Frontend

React 19 + react-router-dom 7 (`createBrowserRouter`), plain CSS (one `styles/global.css` with CSS variables, dark theme), no UI library and no test runner. Feature-based:
- `pages/` compose `features/<context>/{api,hooks,components,lib}`. Pages never call `fetch` and hold no business rules.
- `shared/api/client.js` is the only `fetch` wrapper: `/api` prefix (`VITE_API_URL`), Bearer token from `localStorage` (`dw-final:token`), throws `ErroApi(message, status)` with the backend's `erro`. A 401 on a request that carried a token clears it and calls the callback registered by `useAuth` (logout).
- `features/auth/hooks/useAuth.jsx` is the session context (`AuthProvider`). `RotaProtegida`/`RotaPublica` guard routes in `app/router.jsx`.
- Data hooks use `shared/hooks/useRequisicao.js` (`{ dados, carregando, erro, recarregar }`, aborts the previous request).
- Formatting lives in `shared/lib/formatacao.js` (pt-BR currency, signed %, dates; `"YYYY-MM-DD"` is formatted without `Date` to avoid timezone shifts).
- Inventory filters live in the URL query string and are sent to the backend as-is; the frontend never filters or sorts itself. The wear ranges in `features/inventario/lib/desgaste.js` mirror the backend only for the live preview and the float bar.
- Profit is shown with color **and** an arrow/sign; price highlights carry text labels, not color only.

Routes: `/login`, `/registro` (public); `/inventario`, `/inventario/nova`, `/inventario/:id`, `/inventario/:id/editar`, `/perfil` (protected).

## Conventions

- **Commit messages:** conventional commits in Portuguese with layer scopes, e.g. `feat(backend/domain): ...`, `test(backend): ...`, `build(docker): ...`, `docs: ...`.
- **Commit grouping:** the user prefers commits grouped by layer or feature.
- **Before acting on git:** show the planned commit list when asked, and don't commit or push without being asked.
