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
| `engine/chainExtraction.ts` | Extraction sites per resource from the planet search index, and the typical planet |
| `engine/chainLayout.ts` | `layoutChain(result)`: stage columns and barycenter ordering for the graph. A plain function, so a library layout could replace it |
| `engine/chainUrl.ts` | `encodeChain` / `decodeChain`: the chain in the URL query |
| `useProductionChain.ts` | Page state: input, CX, solved result, URL and localStorage sync, lazy planet index, analytics |
| `productionChain.util.ts` | Formatting, the buy list and CSV |
| `components/ChainPage.vue` | The page: header, targets, settings, results, panel, aside, planet picker |
| `components/ChainPanel.vue` | Steps / Graph tabs, warning chips, view tools |
| `components/ChainStepsTable.vue`, `ChainStepDetail.vue`, `ChainRecipePicker.vue` | Steps table, row details, recipe picker |
| `components/ChainPlanetPicker.vue` | Where to extract: planets with the resource, filters from Planet Search's engine |
| `components/ChainGraph.vue` | SVG edges with HTML node buttons, focus, line width, zoom |
| `components/ChainBuyList.vue`, `ChainFootprint.vue` | Aside: buy list with XIT action, buildings, workforce, habitation, expertise, construction |

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
- **Totals.** Profit = targets and sold byproducts at CX price − bought
  inputs − upkeep − wear of built buildings and habs. Habs come from
  `optimizeHabs("auto", …)` without an area limit. Planet extras (MCG, AEF,
  …) and the core module are left out.
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
  never in the backend.

## Tests

`src/tests/features/production_chain/`: solver, layout, extraction and URL
on the test data (`chain.fixtures.ts` builds a context), components, and
`src/tests/views/ProductionChainView.test.ts`.
