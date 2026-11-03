# AGENTS.md

Instructions for AI coding agents (and humans) working in this repository.

**PRUNplanner frontend**: the web app behind [prunplanner.org](https://prunplanner.org),
a base, empire and market planner for the game _Prosperous Universe_. Vue 3
(`<script setup>`), Vite, TypeScript, Pinia, Tailwind v4, Zod, Vitest. The
backend is a separate service; the app calls `https://api.prunplanner.org`
unless `VITE_API_BASE_URL` is set (other env vars: `README.md`).

## Commands

Node per `.nvmrc`, pnpm per `packageManager` in `package.json`.

| Task | Command |
| --- | --- |
| Install / dev server / build | `pnpm install` / `pnpm dev` / `pnpm build` |
| Unit tests | `pnpm test` (one file: `pnpm vitest run <path>`) |
| Component and view tests | `pnpm test:components` |
| Merged coverage report | `pnpm test:coverage` (slow, writes `coverage/lcov.info`) |
| Benchmarks | `pnpm vitest bench --run` |
| Type check | `pnpm tsc` |
| Lint and format | `pnpm lint` / `pnpm lint:fix` |
| Unused exports, files, deps | `pnpm knip` |

## Definition of done

PR CI (`.github/workflows/`) runs both test suites, `tsc`, `lint` and `knip`.
Run them before calling a change finished:

```
pnpm test && pnpm tsc && pnpm lint && pnpm knip
```

- Run `pnpm test:components` too when you touch a component, a view or their
  tests.
- Run `pnpm build` when you touch Vite config, static asset imports, the
  prerender or anything else that only fails at build time (CI builds on
  `main` only).
- Coverage: `coverage.yml` merges both suites into one report for Codacy;
  the thresholds in `vitest.config.ts` apply to that merged report. Every
  file in `src/` counts. Don't exclude files to raise the number; raise the
  thresholds when coverage grows.
- `.eslintrc.json` exists only for Codacy (ESLint 8). Keep it in step with
  `eslint.config.js`.

## Hard rules

1. **Import explicitly** (nothing is auto-imported) and use the `@/` alias
   for `src/`.
2. **Use the UI kit** `@/ui` (`src/ui/`): `PButton`, `PSelect`,
   `PDataTable`, and for overlays `PModal`, `PDrawer`, `PPopover`,
   `PDropdown`, `useConfirm`, `useToast`. No component libraries. The app
   shell and public pages (`App.vue`, `AppProvider.vue`, landing page,
   `/market`, header) import kit files by path
   (`@/ui/components/PButton.vue`) so a first visit doesn't load the whole
   kit. New or changed views follow
   [Layout & hierarchy](docs/ui-and-i18n.md#layout--hierarchy).
3. **No hard-coded user-facing strings.** Add keys only to
   `src/locales/en_US/<namespace>.json`; help pages live in
   `src/assets/help/en_US/`. Crowdin syncs every other locale and would
   overwrite edits there, so keep them out of PRs. Debug tooling (`/debug`,
   `/dev/kit`, `features/planning/components/debug/`, `lib/debugMode.ts`)
   stays English only.
4. **Backend calls follow one chain:** `call*()` in
   `src/features/api/*.api.ts` → Zod schema in `src/features/api/schemas/` →
   named `defineQuery()` / `defineMutation()` in
   `src/lib/query_cache/queries/*.queries.ts`. Components and composables
   use `useQuery("Name", params).execute()`, not axios or `call*()`, so
   caching and invalidation keep working. Wrap
   loops of planning mutations in `batchChanges()`. See
   [data-layer.md](docs/data-layer.md).
5. **Game data** (materials, buildings, recipes, exchanges, planets) comes
   from `src/database/services/use*Data`, cached in IndexedDB and loaded by
   the `features/wrapper` gates. Don't fetch it again.
6. **The plan engine is the single source of truth** for production, cost
   and profit numbers: `usePlanCalculation` in the editor, `calculatePlan`
   with `usePlanContext` in batch views. Don't duplicate the math. Lint keeps
   `planning/engine/` and `production_chain/engine/` free of Vue, Pinia,
   `@/stores` (except `*.types`) and `@/database`. See
   [planning-engine.md](docs/planning-engine.md).
7. **Keep knip green:** delete dead code rather than leaving it exported.
8. **Don't mutate shared module state** (`preferenceDefaults`, JSON
   fixtures, objects from `planningStore.getCX` or a plan query). Clone with
   `deepClone` / `inertClone` (`src/util/data.ts`) and save through a query.
9. **Test new logic** in `src/tests/`, mirroring the `src/` path. See
   [testing.md](docs/testing.md).

## Conventions

- **Layout.** Features live in `src/features/<snake_case>/`: composables flat
  as `useX.ts` (types in `useX.types.ts`), Vue files in `components/`, other
  files as `*.constants.ts`, `*.util.ts`, `*.schemas.ts`. Pages are thin
  `src/views/*View.vue` that gate data through `features/wrapper` loaders.
  Global stores in `src/stores/` are setup-style
  `defineStore("prunplanner_x", () => {...})`. Generic helpers in
  `src/util/`.
- **Naming.** Components are PascalCase with a feature prefix: `Plan*`,
  `Empire*`, `CX*` for the commodity exchange (CX), or `FIO*` for the
  community game-data API (FIO).
  Frontend-only interfaces start with `I`;
  schema-derived types don't.
- **Composables are synchronous.** Register watchers and lifecycle hooks
  before any `await` (Vue binds them only during synchronous setup). Put
  async work in returned functions or a `features/wrapper` loader. Outside
  setup (loops, handlers) run a composable inside `effectScope()` and stop
  it, or call the engine directly (see `useROIOverview`).
- **SFCs.** `<script setup lang="ts">` first; imports grouped under comment
  headers (`// Composables`, `// Components`, `// Types & Interfaces`,
  `// UI`); heavy children via `defineAsyncComponent`.
- **Formatting** is Prettier (tabs, double quotes, 80 columns), checked by
  `pnpm lint`. Prefix unused variables with `_`.
- **Comments.** JSDoc with `@author`, matching the density around you.

## Types

Every shape has exactly one definition.

- **Boundary data** (API, the market's server-sent events, FIO,
  localStorage): the Zod schema is
  the source of truth. `export const ThingSchema = z.object({...})` with
  `export type Thing = z.infer<typeof ThingSchema>` next to it, in
  `src/features/api/schemas/<domain>.schemas.ts` or the feature's
  `*.schemas.ts`. Derive variants with `.extend/.pick/.omit/.partial`; use
  `z.input` for payloads callers build; enums are `z.enum([...])`. Don't
  annotate `z.ZodType<…>`: it widens the inferred type (recursive schemas
  are the exception, with a comment).
- **Frontend-only shapes** are plain TypeScript in `*.types.ts`, no Zod.
- `type` for schema-derived types and unions, `interface` for object
  shapes, `import type` for type-only imports. Keep schemas and
  frontend-only types in separate files, so the file says which is
  validated. Only the ambient files are `.d.ts`
  (`skipLibCheck` skips them).
- Lint enforces the `ZodType` ban, `interface` and `import type`.
- Details: [data-layer.md](docs/data-layer.md).

## Git & PRs

- Branch from `main` as `fix/…`, `feat/…`, `chore/…`, `test/…` or `docs/…`;
  PRs target `main` and land as merge commits.
- Conventional commits: `fix(fio): …`, `feat(planning): …`.

## Docs

Read the doc for the area you touch. Code wins when a doc disagrees; fix the
doc in the same PR whenever your change moves, renames or changes something
it describes.

| Doc | Read it when you… |
| --- | --- |
| [architecture.md](docs/architecture.md) | need to orient: `src/` layout, bootstrap, router, views |
| [data-layer.md](docs/data-layer.md) | touch the API, query cache, IndexedDB or stores |
| [planning-engine.md](docs/planning-engine.md) | touch plan, empire, price or profit math |
| [domain-glossary.md](docs/domain-glossary.md) | meet a game term (COGC, HQ, CX, POPR, XIT, …) |
| [ui-and-i18n.md](docs/ui-and-i18n.md) | build UI or add text |
| [testing.md](docs/testing.md) | write or fix tests |
| [analytics.md](docs/analytics.md) | add or change a tracked event or person property |
| [seo.md](docs/seo.md) | touch titles, `index.html`, the landing prerender or server config |
| [security.md](docs/security.md) | touch help rendering, redirects, inline scripts or response headers |
| [features/](docs/features/README.md) | work inside a `src/features/*` folder |
