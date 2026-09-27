# Domain glossary

_Prosperous Universe_ (PrUn) is a space-economy MMO where players run
companies, build bases on planets and trade on commodity exchanges.
PRUNplanner lets them simulate those bases and empires before they commit
in-game resources.

| Term | Meaning | Where in code |
| --- | --- | --- |
| **Plan** | One simulated base on one planet: buildings, recipes, habs/storage, experts, workforce luxuries, COGC, HQ, permits | `Plan` / `PlanData` (`api/schemas/planningData.schemas.ts`). Engine: [planning-engine.md](planning-engine.md) |
| **Empire** | A named group of plans with a **faction** and **permits**. It supplies the context for faction bonuses | `PlanEmpireElement` (`api/schemas/empireData.schemas.ts`); `src/features/empire`, `src/features/manage` |
| **Faction** | The player's in-game faction (`ANTARES`, `BENTEN`, `HORTUS`, `MORIA`, `OUTSIDEREGION`, `NONE`), which grants building efficiency bonuses | `PlanFaction` (`api/schemas/planningData.schemas.ts`); `FACTION_BONUS_MAP` in `features/planning/engine/efficiency.ts` |
| **Ticker** | Short material or building code, e.g. `DW` (drinking water) or `PP1` (prefab plant) | `Material.ticker`, `Building.building_ticker` |
| **Recipe** | A building's production step: inputs → outputs over a duration | `Recipe`; `useBuildingData` |
| **CX** | Commodity exchange. The four player markets are **AI1** (Antares), **CI1** (Benten), **IC1** (Hortus) and **NC1** (Moria). **UNIVERSE** is the aggregate across all of them | `Exchange`; `useExchangeData` |
| **CX preference** | A user-defined price source. Exchange options are `AI1_7D`, `AI1_30D`, `AI1_ASK`, `AI1_BID`, …, `UNIVERSE_30D`, and fixed ticker prices can be added. Each option applies at empire or planet level and to BUY, SELL or BOTH | `CX` / `CXData` (`api/schemas/cxData.schemas.ts`); `src/features/exchanges`; resolution in `features/cx/priceBook.ts` (`usePrice` for components) |
| **VWAP** | Volume-weighted average price over 7 or 30 days. `UNIVERSE_30D` VWAP is the global price fallback | `priceBook.ts`, `usePrice`, `useExchangeData` |
| **Workforce** | Five tiers: pioneer, settler, technician, engineer, scientist. Buildings require them and habs house them | `WorkforceType` (`api/schemas/planningData.schemas.ts`); `features/planning/engine/workforce.ts` |
| **Luxuries (lux1/lux2)** | Optional consumables that raise workforce satisfaction and so efficiency | `IWorkforceElement.lux1/lux2`, `WORKFORCE_CONSUMPTION_MAP` |
| **Habs / HAB** | Habitation buildings: `HB1`–`HB5` (one tier each) and `HBB`, `HBC`, `HBM`, `HBL` (mixed tiers) | `InfrastructureType`; auto-optimisation in `calculations/habOptimization.ts` |
| **Storage** | `STO` (base), `STA`, `STE`, `STV`, `STW` | `StorageType`; `infrastructureCalculations.ts` |
| **CM** | Core module, the mandatory base building. It is optionally included in construction materials (`includeCM` plan preference) | `includeCM` plan preference (`usePlanPreferences`) |
| **Area / permits** | Each base has limited area. Extra permits unlock more area | `IAreaResult` |
| **Expertise / experts** | Nine expertise categories (Agriculture, Chemistry, …). Experts on a base boost the matching buildings | `ExpertType`, `expertNames` |
| **COGC** | Chamber of Global Commerce. A planet-wide program that boosts one expertise or workforce type | `PlanCOGCProgram` (`api/schemas/planningData.schemas.ts`); `cogcTextMapping` in `usePlan.ts` |
| **HQ / Corp HQ** | Corporation headquarters on a planet, which gives an efficiency bonus. A separate tool plans HQ level upgrades | `plan_corphq`; `src/features/hq_upgrade_calculator` |
| **Fertility** | Planet property that affects farms (`FRM`, `ORC`) | `features/planning/engine/efficiency.ts` |
| **Extraction** | Resource extractors (`EXT`, `RIG`, `COL`) pulling planet resources | `calculations/extractionCalculations.ts` |
| **Material I/O** | Daily input, output and delta per material for a plan or empire | `IMaterialIO*` in `usePlanCalculation.types.ts`; `features/planning/util/materialIO.util.ts` |
| **Profit** | Daily revenue − material cost − 1/180 of construction cost | [planning-engine.md](planning-engine.md) |
| **COGM** | Cost of goods manufactured: the per-unit production cost of a recipe | `components/tools/PlanCOGM*.vue`, `roi_overview/components/COGMButton.vue` |
| **ROI** | Return on investment: payback time of building a production setup | `src/features/roi_overview`, `src/features/resource_roi_overview` |
| **Repair / condition** | Buildings degrade over time, and repairing them costs construction materials | `src/features/repair_analysis`, `fio/useFIORepair.ts` |
| **Burn** | How many days the stored materials last at the current consumption | `fio/useFIOBurn.ts`, `burnDays*` preferences |
| **Supply cart / construction cart** | Shopping lists: resupply for N days, or materials to build the plan | `components/tools/PlanSupplyCart.vue`, `PlanConstructionCart.vue` |
| **Visitation frequency** | How often a ship must visit a base, given storage capacity and material flow | `visitationData`, `PlanVisitationFrequency.vue` |
| **POPR** | Population report: a planet's population and infrastructure statistics | `callPlanetLastPOPR`; `src/features/government` |
| **Upkeep / government** | Planetary infrastructure buildings (SST, HOS, …) that meet population needs (safety, health, comfort, culture, education) | `src/features/government` |
| **FIO** | The community API that mirrors a player's in-game data (storage, sites). Users link it in their profile | `src/features/fio`; `planningStore.fio_*` |
| **XIT** | Community in-game tooling that imports "XIT action" JSON and runs it, for example CX buys and material transfers (`MTRA`). PRUNplanner only generates the JSON | `src/features/xit` |
| **Shared plan** | A read-only public link to a plan (`/shared/:uuid`) | `src/features/sharing` |
