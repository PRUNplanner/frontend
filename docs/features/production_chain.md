# production_chain

**Purpose.** A chain planner: the player enters what they want per day
(several targets) and sees every step with its recipe, buildings and source
(make, buy, extract), what each unit costs against the CX, what to buy and
haul, and what the whole chain earns and needs to build. Check mode checks
an existing empire's plans as chains, with findings per base.

**Used by.** `views/tools/ProductionChainView.vue` (`/production-chain`),
which only gates the data (`WrapperGameDataLoader` with materials, recipes,
buildings and exchanges; `WrapperPlanningDataLoader load-c-x`) and mounts
`components/ChainPage.vue`, or `components/check/CheckPage.vue` (loaded
lazily) with `?mode=check`.

## Key files

| File | Role |
| --- | --- |
| `engine/chainSolver.ts` | `solveChain(input, ctx)`: the pure solver. `defaultRecipe`, `recipeEffects` (the recipe picker's Δ profit / Δ buildings), `extractionUnitCost`, `groupRecipesByOutput` |
| `engine/chainSolver.types.ts` | Input, context and result types |
| `engine/chainBases.ts` | Bases: `splitByExpertise`, `chainShipping`, `rankPlanets` (the planet picker), `recipeAmounts` and `planDrafts` (Create plans) |
| `engine/chainExtraction.ts` | Extraction sites per resource from the planet search index, and the typical planet |
| `engine/chainLayout.ts` | `layoutChain(result)`: stage columns and barycenter ordering for the graph. A plain function, so a library layout could replace it |
| `engine/chainUrl.ts` | `encodeChain` / `decodeChain`: the chain in the URL query |
| `engine/chainHave.ts` | Own production: `empireSurplus`, `haveSuppliers` (which plan supplies each Have row), `unusedSurplus`, and the override rules (`effectiveHave`, `withHave`, `typedOnly`) |
| `useChainPlans.ts` | `loadEmpirePlans`: an empire's plans through the plan engine, for Check and Own production |
| `engine/chainCheck.ts` | `checkEmpire(input, ctx)`: the empire check (steps, chains, findings, verdicts), `tryInPlanner` |
| `useChainCheck.ts` | Check mode state: URL, empires, plans (`useChainPlans`), planet index, analytics |
| `chainCheck.util.ts` | Finding texts, option chips, the Planet Search link |
| `components/ChainModeSwitch.vue` | Plan a chain · Check an empire, each mode keeps its last query |
| `components/check/` | `CheckPage` with bar, results, Bases, Findings, Chains, aside and the planet list (`CheckPlanetList`) |
| `useProductionChain.ts` | Page state: input, CX, own production (empire, overrides), solved result, URL and localStorage sync, lazy planet index, analytics |
| `productionChain.util.ts` | Formatting, the buy list and CSV |
| `components/ChainPage.vue` | The page: header, targets, settings, results, panel, aside, planet picker |
| `components/ChainPanel.vue` | Steps / Graph / Bases tabs (Bases as a slot), warning chips, view tools |
| `components/ChainStepsTable.vue`, `ChainStepDetail.vue`, `ChainRecipePicker.vue` | Steps table, row details, recipe picker |
| `components/ChainPlanetPicker.vue` | Where to extract: planets with the resource, filters from Planet Search's engine |
| `components/ChainGraph.vue` | SVG edges with HTML node buttons, focus, line width, zoom |
| `components/ChainBuyList.vue`, `ChainFootprint.vue` | Aside: buy list per base with XIT actions, buildings, workforce, habitation, expertise, construction |
| `components/ChainBases.vue`, `ChainBaseCard.vue` | Bases tab: toolbar, one card per base, shipping per day |
| `components/ChainBasePlanetPicker.vue` | Planet for a base: every planet ranked by the base's buildings and area |
| `components/ChainCreatePlans.vue` | Create plans dialog: one plan per base, new, existing or no empire |

## Solver rules

`engine/` is plain TypeScript like the plan engine (same ESLint
restriction: no Vue, stores or `@/database`). It reuses the plan engine's
helpers instead of copying their math: `calculateExtraction`,
`getBuildingConstructionMaterials`, `WORKFORCE_CONSUMPTION_MAP`,
`optimizeHabs`, the price book, `MARKET_SHARE_AMBER` / `MARKET_SHARE_RED`.

- **Order.** Depth-first from the targets over the chosen recipes; each
  material once. Demand is summed in reverse post-order, so shared
  ingredients add up and the work is linear in materials. A recipe loop
  stops at the repeated material and shows as a warning.
- **Source.** Targets are made (or extracted when raw) and never bought.
  Materials with a recipe are made; raw resources are bought, or extracted
  with Raw resources = Extract. A per-material choice overrides this.
- **Default recipe.** The cheapest single-output recipe by local unit cost
  (inputs at CX price plus upkeep and wear); recipes with byproducts only
  when no single-output one exists.
- **Buildings.** `perDay / outputPerRun × time_ms / 86,400,000 / efficiency`.
  A building type shares its capacity across recipes: built = ceil of the
  summed exact count.
- **Extraction.** The planet's `daily_extraction` through
  `calculateExtraction`; the extractor follows the planet's resource type.
  Without a picked planet, the typical planet: the 90th percentile of all
  planets with the resource. The planet index loads only when a row
  extracts or the planet picker opens.
- **Byproducts.** Cover demand: a byproduct first reduces the demand for the
  same material, repeated until stable (at most 8 passes); the rest is
  sold. Sell: all sold.
- **Have (own production).** `input.have` per ticker: an amount per day or
  `"all"`. Demand is covered by byproducts first, then Have
  (`min(rest, have)`), then the row's source. Targets ignore Have. A row with
  nothing left is a Have row: source `"have"`, no recipe, inputs, buildings
  or base, unit cost = the CX BUY price. A partly had row keeps its source
  and stage; `perDay` is only the rest, `have` the part from own
  production. After the passes, rows nothing needs any more (inputs of Have
  rows and of steps byproducts cover fully) drop out with their links.
- **Own production.** The page fills Have from one empire: the net surplus
  is Σ of its plans' `materialio` deltas, positive totals only, reloaded
  when another tab saves its plans (`remoteChange`). Typed amounts win over
  the empire and stay when it changes; linked amounts (`have=` in the link
  or the saved chain) give way to a picked empire. Switching a row to make,
  buy or extract sets `"off"` while the empire has a surplus of it. The
  link holds the amounts in use, never the empire. Suppliers: the plans
  with a positive delta in name order, each giving what is left up to its
  delta; a typed or linked amount comes from "Your bases".
- **Unit cost.** Inputs at their chain unit cost plus the building's upkeep
  and wear for the run; a recipe with several outputs shares its cost by
  CX value (by quantity without prices). Upkeep is basic needs plus the
  base's luxuries at CX price, wear is construction ÷ 180 a day.
- **Bases.** Up to eight (A–H); every made or extracted material sits in
  one (`baseOf`, missing = the first), bought rows in none. Demand stays one
  chain; bases change efficiency, extraction and building counts.
- **Base setup.** Each base has luxuries (`lux`, default both) and experts
  (`experts`, default auto). The workforce record has every tier fully
  supplied with the base's luxuries (`calculateSatisfaction`: 79.4 %,
  86.7 %, 91.7 %, 100 %). Auto experts: `bestExpertSplit` over the top three
  expertises by the output value of the base's steps (building-days without
  prices), at most 5 per type and 6 per base (`MAX_EXPERTS_*` in
  `efficiency.ts`), by Σ weight × `calculateExpertBonus`. Load doesn't
  depend on efficiency, so the split is set after the demand pass.
- **Base efficiency.** The plan engine's `calculateBuildingEfficiency` with
  the base's workforce and experts, no HQ and, on a planet, the base's COGC
  (the planet's running program for "auto") and fertility, times the chain
  efficiency. FRM and ORC on a planet without fertility get 0: no
  buildings, costed at the chain efficiency, flagged "no farming".
  Without a planet (or before the planet index loads) no COGC and no
  fertility count.
- **Base extraction.** The base planet's own site when it has the resource;
  otherwise the picked or typical site, flagged "not on planet".
- **Footprint per base.** Buildings (built = ceil per base and type), one
  STO and the 25 core module area, habs from `optimizeHabs` for the base's
  workforce in the area three permits leave (cheapest habs when they fit or
  when the buildings alone fill 1,000: proving that nothing fits is slow).
  Permits = ceil((area − 250) / 250), 1 to 3; above 1,000 warns. A base
  without steps builds nothing.
- **Totals.** Profit = targets and sold byproducts at CX price − bought
  inputs − own production at CX BUY price (`own`) − upkeep − wear of the bases' buildings, STOs and habs. Area,
  buildings, workforce and construction are the bases' sums. Planet extras
  (MCG, AEF, …) are left out.
- **Shipping.** Cross-base links from the input's base (the part covered by
  byproducts from their producers' bases, the Have part from each supplying
  plan, jumps from its planet), bought inputs from the CX,
  targets and sold byproducts to the CX ("CX" with Universe prices).
- **Split by expertise.** Groups of made and extracted rows by building
  expertise; 1.5 or more exact buildings (at the chain efficiency) get a
  base, largest first, at most four; the rest join the first.
- **Plan drafts.** Built count per type; recipes with the smallest whole
  order amounts (≤ 10) whose time shares are within 5 % of the chain's runs;
  habs and one STO; the base's luxuries, experts, COGC and permits; no HQ.
- **Warnings.** Cheaper to buy: made or extracted, not a target, unit cost
  above the CX price; never a Have row. Thin market: bought (a partly had
  row on its bought part) with no trades in 30 days or a
  share of the daily volume from `MARKET_SHARE_AMBER` (red from
  `MARKET_SHARE_RED`).

## Check rules

`engine/chainCheck.ts` is pure like the solver. Its input is the empire's
plans with their `IPlanResult` (from `calculatePlan` with
`usePlanContext().createContext`, as `EmpireView` does), the targets and
the settings; the chain context brings prices, recipes and the planet index.

- **Steps.** One per plan building and active recipe: outputs and inputs
  per day as `calculateMaterialIO` (amount × day × buildings ÷ batch
  time), buildings = amount × daily share, upkeep (the plan's luxuries) and
  wear per building-day from the plan result. The main output is the one
  worth most.
- **Sold.** Net per material = Σ plans' `materialio.delta` (production
  and workforce); net > 0 with a CX price, by value.
- **Chains.** From a target through the inputs of every step that outputs
  it, while the empire makes the input; bought inputs end a branch. A base
  is checked when one of its steps is in a chain.
- **Unit cost.** Per material: (inputs at their unit cost, or BUY price
  when bought, + upkeep and wear) × its value share ÷ output, over its
  steps; a loop falls back to the price. Margin = outputs at SELL price −
  input cost.
- **Plan fix.** The plan counts a program the planet doesn't run: steps
  with a COGC factor lose margin × (1 ÷ factor − 1). The planet runs a
  program the plan doesn't count: margin × (program factor − 1).
- **Recipe.** Another single-output recipe of the same building, at the
  step's efficiency and upkeep, at least 3 % cheaper per unit:
  (now − alternative) × output; extra buildings are built.
- **Make or buy.** Not a target, unit cost above the BUY price:
  (cost − price) × output, with the market share.
- **Location.** Planet factor = `planetFactor` without setup (running
  COGC, fertility) × extractor rate for extraction. Options: the empire's
  other bases (the step's buildings; area against 1,000 − used) and every
  index planet outside the empire (a new base: `baseFootprint` plus the
  core module; area ≤ 1,000; plots from `plots_total`, `plots_used`,
  `supports_ghost_sites`, unknown counts as possible) with ratio ≥ 1.1.
  Gain = (ratio − 1) × margin, ranked best first. The suggestion is the
  first with room, settleable and paying back within the limit; a user
  pick (`loc=` in the URL) replaces it; better options above it are named.
- **Setup.** Below both luxuries: Σ margin × (workforce factor with both ÷
  now − 1) − the luxuries' cost. Experts below `bestExpertSplit` (weights:
  margin per expertise): Σ margin × (bonus ratio − 1). Hidden with Setup
  gains: Hide.
- **Threshold, verdict, gain.** Findings below "Ignore below" are hidden,
  fixes never. Verdict: not checked, plan fix, improvements, looks optimal.
  A base's gain = fixes + setup + the best alternative per step; payback =
  construction ÷ gain.
- **Try in planner.** `tryInPlanner` builds a chain input: the chain's
  target at the empire's net amount, its bases (at most 8) with their
  planets, COGC, luxuries and experts, recipes and sources as planned, and
  the finding's change.

## Gotchas

- **The chain is solved synchronously** from game data in memory, so
  `ChainPage` must mount inside the loaders.
- **A CX from a link** counts only when it is one of the viewer's CX
  preferences; `CXPreferenceSelector` then gets `follow-default="false"`
  so the link wins over the user's default.
- **The last chain lives in localStorage** (`prunplanner_production_chain`),
  never in the backend. Its query values include `bases` and `base`; a chain
  without them opens as one base A.
- **COGC programs are checked against the time the page opened.** Created
  plans keep the base's program, running or not.
- **The check runs only for the user's own empires**: a link with another
  empire shows "This empire isn't yours". Its state lives in the URL
  (`mode=check`, `empire`, `t`, `min`, `setup`, `pay`, `loc`), not in the
  browser. The plot fields come from the planet index (`planetPlots`); they
  are null until the backend's first plots refresh, and a new base on such a
  planet shows "plots unknown".
- **Create plans** creates the empire first, then the plans one by one, and
  stops at the first failure without rollback.

## Tests

`src/tests/features/production_chain/`: solver, bases, check, layout,
extraction and URL on the test data (`chain.fixtures.ts` builds a context),
`useChainCheck`, components (`check/` too), a solver bench
(`chainSolver.bench.ts`), and `src/tests/views/ProductionChainView.test.ts`.
