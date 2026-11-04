# production_chain

**Purpose.** Chain planner: per-day targets in, every step out (recipe,
buildings, source, unit cost vs the CX), plus buy list, shipping, bases and
totals. Check mode (`?mode=check`) checks an empire's plans as chains.

**Used by.** `views/tools/ProductionChainView.vue` (`/production-chain`),
which only gates the data and mounts `ChainPage` or the lazy `CheckPage`.

## Key files

| File | Role |
| --- | --- |
| `engine/chainSolver.ts` | `solveChain(input, ctx)`, the pure solver; `defaultRecipe`, `recipeEffects`, base setup (`bestExpertSplit`, `planetFactor`, `baseFootprint`) |
| `engine/chainBases.ts` | `chainShipping`, `rankPlanets`, `planDrafts` (Create plans) |
| `engine/chainAutoLayout.ts` | `autoLayout` (`layoutBases` + `pickPlanets`), `mergeBases`, `separateBase`, `fitBases`, `buyHint` |
| `engine/chainHave.ts` | Own production: `empireSurplus`, `haveSuppliers`, override rules |
| `engine/chainCheck.ts` | `checkEmpire` (steps, chains, findings, verdicts), `tryInPlanner` |
| `engine/chainExtraction.ts`, `chainLayout.ts`, `chainUrl.ts` | Extraction sites from the planet search index; graph layout; chain ⇄ URL |
| `useProductionChain.ts`, `useChainCheck.ts`, `useChainPlans.ts` | Page state (URL + localStorage sync, lazy planet index); check state (URL); `loadEmpirePlans` |
| `productionChain.util.ts`, `chainCheck.util.ts`, `useSortState.ts`, `*.types.ts`, `productionChain.schemas.ts` | Formatting, buy list, CSV, finding texts; sortable headers; types; localStorage schema |
| `components/ChainPage.vue`, `components/check/CheckPage.vue` | The two pages; the rest of `components/` are their parts |

## Solver rules

`engine/` follows the plan engine's ESLint restriction (no Vue, stores or
`@/database`) and reuses its helpers (`calculateExtraction`,
`calculateBuildingEfficiency`, `optimizeHabs`, price book, market share
thresholds) rather than copying their math.

- **Order.** Depth-first from the targets, each material once, demand summed
  in reverse post-order. A recipe loop stops at the repeat and warns.
- **Source.** Targets are made/extracted, never bought; materials with a
  recipe are made, raw ones bought (or extracted with Raw resources =
  Extract); per-material choices override. Default recipe: cheapest
  single-output by unit cost, byproduct recipes only if nothing else.
- **Buildings.** `perDay / outputPerRun × time_ms / 86,400,000 / efficiency`,
  capacity shared per building type (built = ceil of the sum).
- **Extraction.** On the picked planet, else the typical one (90th
  percentile). The planet index loads only when needed.
- **Demand cover.** Byproducts first ("cover" repeats until stable, max 8
  passes, rest sold), then Have (`input.have`: amount/day or `"all"`;
  targets ignore it), then the source. A fully had row has source `"have"`
  and unit cost = CX BUY; rows nothing needs any more drop out.
- **Own production.** Have = Σ of one empire's plans' positive `materialio`
  deltas, reloaded on `remoteChange`. Typed amounts beat the empire, linked
  ones (`have=`) give way to it; the URL holds amounts, never the empire.
- **Unit cost.** Inputs + upkeep (basic needs + the base's luxuries at CX) +
  wear (construction ÷ 180 per day); multi-output recipes split by CX value.
- **Bases.** Up to 26 (A–Z) via `baseOf` (base → built buildings; one
  base = the whole step, URL `NA:A`; a split step `NA:A3.B3`, its load
  shared by the counts). `row.base` is the largest piece, `row.shares` all
  of them; a piece's buildings use its base's planet factor, its cost and
  extraction site the largest piece's. Bought rows have none; demand stays
  one chain. Each base has luxuries (default both), experts (auto:
  `bestExpertSplit` over the top three expertises), COGC ("auto" = the
  planet's running program) and fertility, no HQ. FRM/ORC without fertility
  build nothing ("no farming"). No planet: no COGC, no fertility.
- **Footprint.** Buildings, one STO, 25 core area, habs via `optimizeHabs`
  (cheapest habs when they fit or buildings alone fill 1,000: proving
  nothing fits is slow). Permits = ceil((area − 250) / 250), 1–3.
- **Totals.** Profit = targets + sold byproducts − bought inputs − own
  production at CX BUY − upkeep − wear. Planet extras (MCG, AEF, …) ignored.
- **Auto layout** (greedy, no optimiser). Solved in one plain base:
  1. Steps under 0.2 building whose whole building costs more per unit
     (`inputs + upkeepWear / buildings`) than the CX buy price are bought
     (`buyHint`, also the table's Buy hint).
  2. Expertise groups of ≥ 1.5 buildings, largest first, fill bases first
     fit decreasing up to the max base size (`maxArea`: 500 default, 750,
     1,000; `area=` in the URL), measured with `baseFootprint`; a step
     that doesn't fit splits by whole buildings.
  3. Smaller groups join the base they ship the most t/day with (links ×
     weight) where they fit, else a new mixed base.
  4. Experts stay auto. Planets (`pickPlanets`), largest base first: free
     plot (unknown counts as free), no own plan on it, not picked yet;
     then buildable (resources, fertility, area), then a running COGC
     program the base benefits from, then mean jumps weighted by t/day to
     placed bases plus mean jumps to the selected empire's planets.
  Merge moves a base's counts into another (its planet stays); Separate
  makes one base per further expertise, or halves a one-expertise base,
  and picks planets for the new ones. Fit into N bases bisects one scale
  on all targets (to 0.01/day on the largest) for the largest whose
  layout uses ≤ N bases within the max size.
- **Warnings.** Cheaper to buy; thin market (no trades in 30 days, or a
  large share of daily volume).

## Check rules

`checkEmpire` takes the plans with their `IPlanResult` (as `EmpireView`
computes them). Chains run from a target through inputs the empire makes;
margin = outputs at SELL − (inputs + upkeep + wear). Findings: plan fix
(COGC counted but not running, or vice versa), recipe (≥ 3 % cheaper
alternative), make or buy, location (planet factor ratio ≥ 1.1, area ≤
1,000, unknown plots count as possible), setup (luxuries, experts). Findings
under "Ignore below" hide, fixes never.

## Gotchas

- **Solved synchronously** from in-memory game data: `ChainPage` must mount
  inside the loaders.
- **A CX from a link** counts only if it is one of the viewer's CX
  preferences.
- **The last chain lives in localStorage** per user
  (`prunplanner_production_chain:<user id>`), never the backend; one
  without `bases` opens as base A.
- **COGC programs are checked at page-open time**; created plans keep the
  base's program anyway.
- **Check is for own empires only**; its state is in the URL. Plot fields
  are null until the backend's first plots refresh ("plots unknown").
- **Create plans** creates the empire, then plans one by one, and stops at
  the first failure without rollback.

## Tests

`src/tests/features/production_chain/` (engine on `chain.fixtures.ts`, a
solver bench) and `src/tests/views/ProductionChainView.test.ts`.
