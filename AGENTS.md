# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, …)
working in this repository. Humans are welcome too.

**PRUNplanner frontend**: the web app behind [prunplanner.org](https://prunplanner.org),
a base, empire and market planning tool for the game _Prosperous Universe_.
It is built with Vue 3 (`<script setup>`), Vite, TypeScript, Pinia, naive-ui,
Tailwind v4, Zod and Vitest. The backend is a separate service at
`https://api.prunplanner.org`.

## Commands

Node `22.19` (see `.nvmrc`) and pnpm 10.

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev server | `pnpm dev` |
| Tests (single run) | `pnpm test` |
| One test file | `pnpm vitest run src/tests/features/cx/usePrice.test.ts` |
| Component tests (local only, not in CI) | `pnpm test:components` |
| Benchmarks (planning engine) | `pnpm vitest bench --run` |
| Type check | `pnpm tsc` (vue-tsc; **excludes `src/tests/`**) |
| Lint | `pnpm lint` / `pnpm lint:fix` |
| Unused exports/files | `pnpm knip` |
| Build | `pnpm build` |

## Definition of done

Every PR runs these in CI (`.github/workflows/`), so run them locally before
you call a change finished:

```
pnpm test && pnpm tsc && pnpm lint && pnpm knip
```

`build.yml` runs `pnpm build` on `main`. Run it yourself when you touch Vite
config, imports of static assets, or anything else that only fails at build
time.

`.eslintrc.json` exists only for Codacy, whose ESLint 8 can't read
`eslint.config.js`; local ESLint ignores it. Change both together.

## Hard rules

1. **Import explicitly.** Write `import { ref } from "vue"` and the like.
   `unplugin-auto-import` is configured, but the generated `.d.ts` files are
   gitignored and Vitest doesn't load the plugin. Use the `@/` alias for
   everything under `src/`.
2. **Reuse the UI kit.** Use `import { PButton, PSelect, … } from "@/ui"`
   (`src/ui/`), and `XNDataTable` from `@skit/x.naive-ui` for tables. Use raw
   naive-ui only for overlays (`NModal`, `NDrawer`, `NPopover`, `useDialog`).
   See [docs/ui-and-i18n.md](docs/ui-and-i18n.md).
3. **Never hard-code user-facing strings.** Add keys to
   `src/locales/en_US/<namespace>.json` only. Crowdin owns every other locale
   folder, so don't edit those. Help pages follow the same rule and live in
   `src/assets/help/en_US/`.
4. **Backend calls follow a fixed chain:** a `call*()` function in
   `src/features/api/*.api.ts`, a Zod schema in `src/features/api/schemas/`,
   then a named `defineQuery()` in `src/lib/query_cache/queries/*.queries.ts`
   (its types are inferred from `fetchFn`). Components and composables call
   `useQuery("Name", params).execute()`, never axios or `call*()` directly.
   See [docs/data-layer.md](docs/data-layer.md).
5. **Read game data (materials, buildings, recipes, exchanges, planets)
   through `src/database/services/use*Data`.** It is cached in IndexedDB and
   loaded by the `WrapperGameDataLoader` gate, so don't fetch it again.
6. **Keep the plan engine the single source of truth.** Anything that needs
   a plan's production, cost or profit numbers uses the pure engine in
   `src/features/planning/engine/`: `usePlanCalculation` in the plan
   editor, `calculatePlan` with a `usePlanContext` context in batch views.
   Don't duplicate the math. See
   [docs/planning-engine.md](docs/planning-engine.md).
7. **Keep knip green.** It fails on unused exports, files and dependencies,
   so delete dead code instead of leaving it exported.
8. **Don't mutate shared module state.** This includes `preferenceDefaults`,
   the JSON fixtures, and objects returned from `planningStore.getPlan` or
   `getCX` (those are inert clones, so edit a copy and save it through a
   query). Clone with `deepClone` / `inertClone` from `src/util/data.ts`.
9. **Add or update a test for new logic**, in `src/tests/` mirroring the
   `src/` path. See [docs/testing.md](docs/testing.md).

## Conventions

- **Feature folders.** Code lives in `src/features/<snake_case>/`:
  - composables sit flat at the root as `useX.ts`, with types in
    `useX.types.ts`;
  - Vue files go in `components/`;
  - other files use `*.constants.ts`, `*.util.ts` or `*.schemas.ts`.
- **Pages and shared code.**
  - `src/views/*View.vue` are thin pages. They gate data through
    `features/wrapper` loaders and compose feature components.
  - Global stores are in `src/stores/`: setup-style
    `defineStore("prunplanner_x", () => {...})`.
  - Generic helpers are in `src/util/`.
- **Naming.**
  - Frontend-only interfaces are prefixed with `I` (`IPlanResult`).
    Schema-derived types are not (`Shared`, `SharedSchema`). See "Types".
  - Components are PascalCase with a feature prefix (`Plan*`, `Empire*`,
    `CX*`, `FIO*`).
- **Composables are synchronous.** Register `watch`, `watchEffect` and
  lifecycle hooks before any `await`, because Vue only binds them to the
  component during synchronous setup. An `async useX()` that awaits first
  leaks its watchers. Put async work in the functions a composable returns
  (`getPrice`, `calculate`, …), or load it up front in a `features/wrapper`
  loader. `useGraph` is the one async composable left: it loads planets and
  registers no watchers.
- **Calling a composable outside setup** (in a loop or an event handler)
  means no component owns its watchers. Run it in `effectScope()` and
  stop the scope when done. For plan numbers in a loop, call the engine
  directly instead (see `useROIOverview`).
- **SFC layout.** `<script setup lang="ts">` comes first. Group imports under
  comment headers (`// Composables`, `// Components`, `// Types & Interfaces`,
  `// UI`). Load heavy children with `defineAsyncComponent`.
- **Formatting.** Prettier: tabs, double quotes, semicolons, es5 trailing
  commas, 80 columns. Unused variables must be prefixed `_`.
- **Doc comments.** Existing code uses JSDoc blocks with `@author`. Match the
  surrounding density, and don't write essays.

## Types

Every shape has exactly one definition.

- **Boundary data** is anything parsed at runtime: the API, the market's
  server-sent events (SSE), FIO or localStorage. Its Zod schema is the
  source of truth.
  - Write `export const ThingSchema = z.object({...})` and, when the type is
    used by name, `export type Thing = z.infer<typeof ThingSchema>` right
    next to it. Put both in `src/features/api/schemas/<domain>.schemas.ts`
    or the feature's `*.schemas.ts`.
  - Never annotate a schema as `z.ZodType<…>` (a recursive schema is the only
    exception, with a comment). Derive related shapes with
    `.extend/.pick/.omit/.partial`.
  - Use `z.input` for payloads callers build and `z.infer` for parsed data.
    Enums are `z.enum([...])` with the union derived from it.
  - Details: [docs/data-layer.md](docs/data-layer.md) §2.
- **Frontend-only shapes** (engine, calculations, UI, query cache,
  composables, store state) are plain TypeScript in `*.types.ts`, with no
  Zod. Import the derived types when they build on boundary data.
- **Conventions.**
  - Schema-derived types have no prefix: `Thing` and `ThingSchema`.
    Frontend-only interfaces keep the `I` prefix, so the name says whether
    a shape is validated.
  - Use `type` for schema-derived types and unions, and `interface` for
    frontend object shapes.
  - Use `import type` for type-only imports.
  - Keep schemas and frontend-only types in separate files. If a file ends
    up holding both, split it.
  - App types live in `.ts` files. Only the real ambient files are `.d.ts`
    (`globals.d.ts`, `vite-env.d.ts`, `router/router.d.ts`), because
    `skipLibCheck` skips type-checking every `.d.ts`.
- **Lint enforces** the `z.ZodType<…>` ban in schema files,
  `interface` over object type aliases, and `import type`
  (`pnpm lint:fix` fixes the last two).

## Git & PRs

- Branch from `main` using `fix/…`, `feat/…`, `chore/…`, `test/…` or
  `docs/…`, and open PRs against `main`. PRs land as merge commits.
- Use conventional commits: `fix(fio): …`, `feat(planning): …`,
  `chore(deps): …`.
- Keep Crowdin-managed locale folders out of feature PRs.

## Docs map

Start at [docs/README.md](docs/README.md).

| Doc | Read it when you… |
| --- | --- |
| [architecture.md](docs/architecture.md) | need to orient: `src/` layout, bootstrap, router, view pattern |
| [data-layer.md](docs/data-layer.md) | touch the API, query cache, IndexedDB or Pinia stores |
| [planning-engine.md](docs/planning-engine.md) | touch plan, empire, price or profit calculations |
| [domain-glossary.md](docs/domain-glossary.md) | meet a game term (COGC, HQ, CX, POPR, XIT, …) |
| [ui-and-i18n.md](docs/ui-and-i18n.md) | build UI or add text |
| [testing.md](docs/testing.md) | write or fix tests |
| [analytics.md](docs/analytics.md) | add or change a tracked event or person property |
| [features/](docs/features/README.md) | work inside a specific `src/features/*` folder |

**Keep the docs true.** When your change moves a file, renames a symbol or
changes behaviour that a doc describes, update that doc in the same PR.
