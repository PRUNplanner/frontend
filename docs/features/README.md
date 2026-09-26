# Features

One page per `src/features/*` folder. Each page follows the same outline:
**Purpose**, **Used by**, **Key files**, **Data**, **Gotchas**, **Tests**.

## Core planning

| Feature | One-liner |
| --- | --- |
| [planning](planning.md) | The plan engine (`engine/`, `usePlanCalculation`) and the plan editor panels/tools |
| [planning_data](planning_data.md) | Plan create/save/clone/reload (`usePlan`) |
| [empire](empire.md) | Empire dashboard components: cost overview, material I/O, opportunities |
| [manage](manage.md) | Create empires and CX preferences, assign plans to empires |
| [exchanges](exchanges.md) | Edit CX preferences (exchange and ticker prices), CSV import/export |
| [cx](cx.md) | Price resolution (`PriceBook`, `usePrice`) and CX helpers |
| [preferences](preferences.md) | User and per-plan preferences synced to the backend |
| [sharing](sharing.md) | Public read-only plan links |

## Tools

| Feature | One-liner |
| --- | --- |
| [fio](fio.md) | FIO-powered burn, repair and storage views |
| [xit](xit.md) | Generate XIT action JSON (buy/transfer) |
| [roi_overview](roi_overview.md) | ROI of every production recipe |
| [resource_roi_overview](resource_roi_overview.md) | ROI of extracting a resource per planet |
| [repair_analysis](repair_analysis.md) | Repair cost vs building age |
| [hq_upgrade_calculator](hq_upgrade_calculator.md) | Materials and cost for HQ level upgrades |
| [government](government.md) | POPR reports and the upkeep price calculator |
| [production_chain](production_chain.md) | Production dependency graph (vue-flow + dagre) |
| [market_exploration](market_exploration.md) | Historical CX charts |
| [market_live](market_live.md) | Live CX feed over SSE with user alert rules |
| [planet_search](planet_search.md) | Basic and advanced planet search |
| [pathfinding](pathfinding.md) | Jump distances between systems |

## Infrastructure & shared UI

| Feature | One-liner |
| --- | --- |
| [api](api.md) | Backend `call*()` functions and Zod schemas |
| [wrapper](wrapper.md) | Data-loading gates used by every view |
| [material_tile](material_tile.md) | The standard material ticker chip |
| [plan_analytics](plan_analytics.md) | Planet insights box on the plan page |
| [help](help.md) | Markdown help drawer and tutorial |
| [account](account.md) | Login, registration, email verification, password reset |
| [profile](profile.md) | Profile page sections |
| [api_keys](api_keys.md) | Personal API key management |
| [user_activity](user_activity.md) | Idle detection that throttles background refetching |
