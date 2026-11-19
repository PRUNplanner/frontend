# MCP server

An [MCP](https://modelcontextprotocol.io) server that lets AI assistants
(Claude Desktop, Claude Code, Cursor) read a user's plans and empires,
calculate them with the app's own plan engine and price book, and, with a
read-write API key, save plans, empires, CX preferences, shares and planning
defaults.
Local prototype for now (spec `2026-11-17-mcp-01-local`); it runs in the e2e
stack, not in production.

```
pnpm build:mcp    # dist-mcp/server.js, one Node bundle
pnpm start:mcp    # PORT (8080), PRUNPLANNER_API_URL, PRUNPLANNER_APP_URL
pnpm build:mcpb   # dist-mcp/prunplanner.mcpb, the Claude Desktop extension
docker build --target mcp .   # the image (ghcr.io/prunplanner/prunplanner-mcp), see below
```

**Extension.** On every published release the workflow's `mcpb` job stamps
the manifest with the app version, runs `pnpm build:mcpb` and attaches
`prunplanner.mcpb` to the release, so
`https://github.com/PRUNplanner/frontend/releases/latest/download/prunplanner.mcpb`
is always the current one. The tools live on the server: an installed
extension picks up new tools on its next connect and needs a new download
only when the bridge or its manifest changes.

**Image.** The `Dockerfile`'s `mcp` stage (before `production`, so a build
without `--target` still makes the app) runs `server.js` as `node` on port
8080 with a `/healthz` health check and a 160 MB heap
(`--max-old-space-size`: the production server has 4 GB for the whole stack;
measured about 135 MB with game data, 0.25 MB per cached price history, caches
capped at 1,000 entries and 200 histories, so about 140 MiB in use); `docker-build-latest.yml` pushes it to
`ghcr.io/prunplanner/prunplanner-mcp` (`latest` and the release tag) next to
the frontend image. Its deployment (compose service, DNS, Traefik) sets
`PRUNPLANNER_API_URL` and `PRUNPLANNER_APP_URL` and is not in this repo.

## Layout (`src/mcp/`)

| File | Does |
| --- | --- |
| `server.ts` | Entry: `node:http` server, env |
| `app.ts` | `/healthz`, `/mcp` and `/` (stateless Streamable HTTP, a fresh `McpServer` per request), API key check, logging per tool call, server instructions |
| `backend.ts` | `fetch` client: `get` and, for the write tools, `send` (POST, PUT, PATCH, DELETE; the body checked with the app's payload schema first); answers validated with `features/api/schemas/*`; maps a read-only key's 403 to `read_only_key`, a 409 to `conflict`, a 400 to the backend's reason; sends `User-Agent: PRUNplanner-MCP/<version> (<client>)` |
| `gameData.ts` | Game data shared by all users, in memory with the app's TTLs (exchanges 30 min, planets 180, the rest 1440); `getPlanet` takes an id in any case or a planet name (via the planet search index) |
| distances | `get_distances`: jumps between any planets, plans and exchanges with the app's pathfinder (`features/pathfinding/pathfinder.ts`, as Planet Search counts exchange distance), the order's total and optionally the systems on the way; no fuel or flight time (ship routes stay parked) |
| XIT | `get_xit_action` builds the XIT ACT package the app's XIT buttons build (`features/xit/xitAction.util.ts` `transferAction`, the station-to-exchange map) from a plan's Construction or Supply cart (`features/planning/util/carts.util.ts`, shared with the cart components) or a list; origin, buy and supply days default to the user's saved settings; FIO stock and FIO-built buildings are not subtracted |
| planned by players | `gameData.getPlannedMaterials` reads `/analytics/planning_insights/materials/` (public, cached an hour): PRUNplanner players' planned production, consumption and net per material and day, from the empire states (empires changed in the last 30 days; the MCP stores them too). `get_material_prices` shows it per material with production against the Universe's 7-day daily traded volume, `rank_bases` per output, so the assistant can warn about crowded markets |
| market report | `get_market_report` reads `/data/market/summary/` (public, cached 15 min for all users like the edge) and builds the app's market report with `market_report/marketReport.util.ts` (KPIs, index, sectors, exchanges, movers, gaps); its text helpers live in `marketReport.format.ts` |
| price history | `gameData.getSparks` reads `/data/cxpc/spark/<exchange>/?days=30` once an hour per exchange for every user (the endpoint is throttled per IP) and `historySummary` sums a series up. `get_price_history` reads one material's full history on every exchange in one request (`/data/cxpc/<ticker>/`) through `gameData.getHistory`: shared by all users for an hour, at most 200 materials (least recently used out), packed as numbers (about 0.25 MB a material), sent with the user's key so the backend counts it per user (`OptionalAPIKeyAuthentication`), not per server IP; bars come from Market Exploration's `candles`, the daily VWAP from its `exchangeLines`. A 429 is the tool error `rate_limited` |
| `chainCost.ts` | The Production Chains solver for one material with the page's defaults and own production, for `get_production_cost` and `check_make_or_buy`; with a planet the chain's base sits there, and what it can't extract is made, or bought without a recipe |
| `context.ts` | Node counterpart of `usePlanContext`: the plan's empire (requested, else the one its plan page opens with: `planEmpireUuid` in `features/empire/util/planEmpire.util.ts`, the default empire if the plan is in it, else the list's first that holds it; a plan in no empire: the first empire), the empire's CX, `planSetup` / `loadPlanSetup`; `loadEmpireCX` for tools without a saved plan: the requested empire, else the user's `defaultEmpireUuid` (`/user/preferences/`), else their only empire, else their only CX preference, else none with `empire_choices` to ask about |
| `priceBasis.ts` | `price_basis`: the plan's CX preference, or one basis for everything (an exchange's VWAP 7D/30D or ask/bid, the best ask/bid across exchanges), built as a temporary CX preference for the app's price book |
| `variant.ts` | A saved plan with changes (`buildVariant`) and any plan calculated with its habs sized (`calculateWithHabs`): variants, market check on variants, planet ranking, empire variants, new plans |
| `tools/*.ts` | One file per tool (33 tools: 25 reading, 8 writing), all registered in `tools/index.ts`; `tools/shared.ts` shapes results (details, per-order economics, warnings, shipping), `tools/planEdit.ts` applies changes (buildings and their recipes, habs and storage as infrastructure, recipes checked per planet incl. extraction, experts (a list, at most 6 per base, or "auto": `autoExperts`, weighted by what experts scale), luxuries, permits, the editor's hab optimiser); `variant.ts` `calculateWithHabs` sizes habs, then experts "auto", then `storage_days` (Base ROI's `storageForDays`) |
| write tools | `write: "save" \| "delete"` on the tool (`readOnlyHint` false, `destructiveHint` for deletes and overwrites). `savePlan.ts` saves what `calculate_new_plan` / `calculate_plan_variant` calculate (same builders, `plan_summary` from `buildPlanSummary`, `base_modified_at`, never `draft_updated_at` so app drafts stay); `planVersions.ts` `restore_plan_version`; `saveEmpire.ts`, `saveCXPreference.ts` (CX assignment through `context.ts` `assignCX`, which sends the full map: the backend's sync clears empires it isn't sent); `sharing.ts` (`copy_shared_plan` creates the copy like the app's Copy: name, empire, summary); `setPreferences.ts` (default empire, default CX, buy from CX); `deleteItem.ts` (first call describes, `confirm: true` deletes). As the app around the same saves: `savePlan.ts` `createPlan` stores the per-plan auto-optimise-habs setting (on for new plans, the source's for copies, off for a shared plan's copy), and `empireState.ts` `storeEmpireStates` stores the state of every empire whose production a write changed (what the Empire page stores on opening: the API's empire exports and the global material insights read it; `empireStateOf` in `empireMaterialIO.util.ts`, shared with the app) |
| `prompts.ts` | Ready-made workflows clients offer as commands (MCP prompts): `review_plan` (every lever without changing buildings), `review_empire`, `vertical_chain` (a material at a rate, split into bases near an exchange), `load_lists` (supply packages at the group's fastest visit interval). Each ends with the owner's rule: show options and trade-offs, the player decides, save nothing unasked |
| compare, shared | `compare_plans` uses Plan check compare's `compareRows`, `materialChanges`, `paybackOfDifference` and the version compare's wording (`planVersions.ts` `planChanges`); `get_shared_plan` calculates `/planning/shared/<uuid>/` as the app shows it: someone else's plan in the user's default empire, else the first (`pickEmpire`, as `usePlanSharedCopy`), the user's own as its plan page |
| `log.ts` | JSON lines on stdout: `mcp_session_started`, `mcp_tool_called`, `mcp_request_rejected` |
| `bridge/` | The `.mcpb` extension: stdio ↔ Streamable HTTP with the user's key; `icon.png` (the favicon's lime square) is its icon and, inlined, the server's `icons` |

## Rules

- **Exchange distances** come from `features/pathfinding/pathfinder.ts`, the
  pure pathfinder `usePathfinder` wraps.
- **No app code paths.** `src/mcp/`, the engine and `features/cx/priceBook.ts`
  import no Vue, Pinia, vue-i18n, stores, `@/database`, `@/lib`, `@/ui` or
  `@/util/numbers` (ESLint, and `src/tests/mcp/nodeImport.test.ts`). Pure
  helpers they need live in `*.util.ts`; formatting for the UI goes in
  `*.format.ts` next to them (`marketCheck.format.ts`, `whatIf.format.ts`).
- **Same numbers as the app.** Tools call the engine (`calculatePlan`,
  `whatIf.util`, `marketCheck`, `empireMaterialIO.util`, the planet search
  engine, the recipe picker's `pickerOptions`, the Production Chains solver,
  Base ROI's rows, planet insights' starter setup, `diffPlan`), never their
  own math.
- **Reads GET, writes only from write tools.** Reading and calculating tools
  only send GET (tested); write tools send the app's own payloads (checked with
  its schemas), with `base_modified_at` where the app sends it, so a newer save
  in the app is a conflict, not overwritten. The key's scope decides: a
  read-only key's write is refused by the backend. An open app page shows the
  change after a reload (plan, empire and CX lists load once per page).
- **Say when it's a test stack.** When `PRUNPLANNER_APP_URL` is localhost
  (or `.localhost`, `.test`), every result's text starts with "[Test
  environment, not production]" and its data has `environment`.
- **Planning facts in the instructions.** `INSTRUCTIONS` in `app.ts` carries
  game facts the engine applies (efficiency factors, COGC, experts, luxuries,
  area, degradation), taken from the help pages and `knowledge/game/` only;
  keep them in step with those sources. Results add the facts that matter
  for one plan or planet (`cogc_boost`, `efficiency_factors`, COGC warnings).
- **Lean tool list.** Clients load every tool definition into each
  conversation (about 17k tokens for 33 tools). Field descriptions stay short;
  explanations shared by several tools (price bases, buildings and recipes,
  storage, experts "auto") live once in `INSTRUCTIONS`. Uuid arguments use
  `uuidArg()` (`tools/shared.ts`), not `z.uuid()`, whose pattern costs about
  2k tokens over the list. `app.test.ts` guards the size. List tools have
  default limits and say how to get more.
- **Text carries the data.** A tool result's text block is a one-line summary
  plus the same JSON as `structuredContent`: Claude Desktop and others pass
  only the text to the model.
- **Logs** carry the key's prefix (the part before the `.`), never the key,
  the `Authorization` header or tool arguments.

Tests: `src/tests/mcp/` (Node environment, backend faked from `test_data`).
Evals: `.claude/skills/e2e/mcp-evals/` in the workspace runs realistic player tasks through Claude
against a running stack (how well a model uses the tools, not only whether the numbers are right); run
it after changing tools, descriptions or instructions.
Running it in the e2e stack: `.claude/skills/e2e/SKILL.md` (`e2e.sh mcp`).
