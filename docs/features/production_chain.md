# production_chain

**Purpose.** A chain planner: the player enters what they want per day
(several targets) and sees every step with its recipe, buildings and source
(make, buy, extract), what each unit costs against the CX, what to buy and
haul, and what the whole chain earns and needs to build.

**Used by.** `views/tools/ProductionChainView.vue` (`/production-chain`),
which only gates the data (`WrapperGameDataLoader` with materials, recipes,
buildings and exchanges; `WrapperPlanningDataLoader load-c-x`) and mounts
`components/ChainPage.vue`.

## Key files

| File | Role |
| --- | --- |
| `engine/chainSolver.ts` | `solveChain(input, ctx)`: the pure solver. `defaultRecipe`, `recipeEffects` (the recipe picker's Δ profit / Δ buildings), `extractionUnitCost`, `groupRecipesByOutput` |
| `engine/chainSolver.types.ts` | Input, context and result types |
| `engine/chainBases.ts` | Bases: `splitByExpertise`, `chainShipping`, `rankPlanets` (the planet picker), `recipeAmounts` and `planDrafts` (Create plans) |
| `engine/chainExtraction.ts` | Extraction sites per resource from the planet search index, and the typical planet |
| `engine/chainLayout.ts` | `layoutChain(result)`: stage columns and barycenter ordering for the graph. A plain function, so a library layout could replace it |
| `engine/chainUrl.ts` | `encodeChain` / `decodeChain`: the chain in the URL query |
| `useProductionChain.ts` | Page state: input, CX, solved result, URL and localStorage sync, lazy planet index, analytics |
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
- **Unit cost.** Inputs at their chain unit cost plus the building's upkeep
  and wear for the run; a recipe with several outputs shares its cost by
  CX value (by quantity without prices). Upkeep is basic needs only at CX
  price, wear is construction ÷ 180 a day.
- **Bases.** Up to eight (A–H); every made or extracted material sits in
  one (`baseOf`, missing = the first), bought rows in none. Demand stays one
  chain; bases change efficiency, extraction and building counts.
- **Base efficiency.** On a base with a planet: the plan engine's
  `calculateBuildingEfficiency` with a full workforce, no experts, no HQ
  and the base's COGC (the planet's running program for "auto"), times the
  chain efficiency. FRM and ORC on a planet without fertility get 0: no
  buildings, costed at the chain efficiency, flagged "no farming".
  Without a planet (or before the planet index loads) the chain efficiency.
- **Base extraction.** The base planet's own site when it has the resource;
  otherwise the picked or typical site, flagged "not on planet".
- **Footprint per base.** Buildings (built = ceil per base and type), one
  STO and the 25 core module area, habs from `optimizeHabs` for the base's
  workforce in the area three permits leave (cheapest habs when they fit or
  when the buildings alone fill 1,000: proving that nothing fits is slow).
  Permits = ceil((area − 250) / 250), 1 to 3; above 1,000 warns. A base
  without steps builds nothing.
- **Totals.** Profit = targets and sold byproducts at CX price − bought
  inputs − upkeep − wear of the bases' buildings, STOs and habs. Area,
  buildings, workforce and construction are the bases' sums. Planet extras
  (MCG, AEF, …) are left out.
- **Shipping.** Cross-base links from the input's base (the part covered by
  byproducts from their producers' bases), bought inputs from the CX,
  targets and sold byproducts to the CX ("CX" with Universe prices).
- **Split by expertise.** Groups of made and extracted rows by building
  expertise; 1.5 or more exact buildings (at the chain efficiency) get a
  base, largest first, at most four; the rest join the first.
- **Plan drafts.** Built count per type; recipes with the smallest whole
  order amounts (≤ 10) whose time shares are within 5 % of the chain's runs;
  habs and one STO; no experts, luxuries or HQ; the base's COGC and permits.
- **Warnings.** Cheaper to buy: made or extracted, not a target, unit cost
  above the CX price. Thin market: bought with no trades in 30 days or a
  share of the daily volume from `MARKET_SHARE_AMBER` (red from
  `MARKET_SHARE_RED`).

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
- **Create plans** creates the empire first, then the plans one by one, and
  stops at the first failure without rollback.

## Tests

`src/tests/features/production_chain/`: solver, layout, extraction and URL
on the test data (`chain.fixtures.ts` builds a context), components, and
`src/tests/views/ProductionChainView.test.ts`.
