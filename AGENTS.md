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
   then a named query in `src/lib/query_cache/queryRepository.ts` (typed in
   `queryRepository.types.ts`). Components and composables call
   `useQuery("Name", params).execute()`, never axios or `call*()` directly.
   See [docs/data-layer.md](docs/data-layer.md).
5. **Read game data (materials, buildings, recipes, exchanges, planets)
   through `src/database/services/use*Data`.** It is cached in IndexedDB and
   loaded by the `WrapperGameDataLoader` gate, so don't fetch it again.
6. **Keep the plan engine the single source of truth.** Anything that needs
   a plan's production, cost or profit numbers calls `usePlanCalculation`.
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
  - Interfaces are prefixed with `I` (`IPlan`, `IPlanResult`).
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
  stop the scope when done (see `useROIOverview`).
- **SFC layout.** `<script setup lang="ts">` comes first. Group imports under
  comment headers (`// Composables`, `// Components`, `// Types & Interfaces`,
  `// UI`). Load heavy children with `defineAsyncComponent`.
- **Formatting.** Prettier: tabs, double quotes, semicolons, es5 trailing
  commas, 80 columns. Unused variables must be prefixed `_`.
- **Doc comments.** Existing code uses JSDoc blocks with `@author`. Match the
  surrounding density, and don't write essays.

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
| [features/](docs/features/README.md) | work inside a specific `src/features/*` folder |

**Keep the docs true.** When your change moves a file, renames a symbol or
changes behaviour that a doc describes, update that doc in the same PR.
