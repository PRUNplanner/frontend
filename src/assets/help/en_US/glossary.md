Game and planning terms as PRUNplanner uses them, from A to Z. Each entry starts with a short definition (the one you see when you hover a term in an article), then says how PRUNplanner calculates or shows it and where to read more.

## Area and permits {#area-permits}

A base's usable area is 250 plus 250 for every permit it uses, so one permit gives the usual 500 area. The core module always takes 25 of it.

Every building takes area; a plan shows how much is used and how much is free. In the game, each HQ level upgrade gives you one more base permit. Production Chains plans bases with 1 to 3 permits, so 500, 750 or 1,000 area. See [Production Chains](/help/tools_production_chain#bases).

## Ask {#ask}

The lowest price a seller currently asks on an exchange. Buying at once means paying the ask. No ask means nobody sells the material there right now.

Plan check shows "No offers" when a plan buys a material on an exchange without an ask. Your exchange preference can use the ask as the price basis. See [Plan check](/help/plan_check#flags) and [Price basis](/help/exchanges#price-basis-vwap-ask-and-bid).

## Bid {#bid}

The highest price a buyer currently offers on an exchange. Selling at once means taking the bid. No bid means nobody buys the material there right now.

Plan check shows "No buyers" when a plan sells a material on an exchange without a bid. Your exchange preference can use the bid as the price basis. See [Plan check](/help/plan_check#flags).

## Burn {#burn}

How many days a base's stock of a material lasts: the stock in your FIO storage ÷ what the base uses up per day. A material the base makes as much of as it uses never runs out.

FIO Burn colours a material red at or below 5 days and yellow at or below 10 days; you can change both in your Profile. Burn needs your FIO data. See [FIO Burn](/help/fio_burn#calculations).

## Byproduct {#byproduct}

A second output of a recipe, made alongside the material the recipe is run for.

Production Chains uses a byproduct for the chain's own needs first and sells the rest. See [Production Chains](/help/tools_production_chain#settings).

## Cargo bays {#cargo-bays}

The ship sizes Base ROI uses to check whether a base's cargo fits one ship visit, given as weight and volume.

| Ship | Weight | Volume |
| --- | --- | --- |
| TCB | 100 t | 100 m³ |
| VSC | 250 t | 250 m³ |
| SCB | 500 t | 500 m³ |
| MCB | 1,000 t | 1,000 m³ |
| LCB | 2,000 t | 2,000 m³ |
| WCB | 3,000 t | 1,000 m³ |
| VCB | 1,000 t | 3,000 m³ |
| HCB | 5,000 t | 5,000 m³ |

Base ROI's beginner preset uses the SCB as the starter ship. See [Base ROI](/help/tools_base_roi#settings).

## COGC {#cogc}

Chamber of Global Commerce: the program running on a planet. An advertising program speeds up buildings of one expertise by 25 %; a workforce program speeds up buildings that employ that workforce tier by 10 %.

In the game, the residents (players with a base on the planet) vote on the program, and the winning program runs for a week. You pick the program in a plan's planet settings; Planet Search can filter by it. See [Planet Search](/help/planet_search#cogc-and-infrastructure).

## COGM {#cogm}

Cost of goods manufactured: what one unit of a recipe's output costs in a plan, from input prices, workforce, wear, production fees, runtime and efficiency.

When a recipe has several outputs, the cost is split by quantity or charged in full to each output. A COGM can also become a fixed price in your exchange preference. See [Plan tools](/help/plan_tools) and [Fixed prices and COGM](/help/exchanges#fixed-prices-and-cogm).

## Construction cart {#construction-cart}

A plan tool that lists the materials still to buy for the plan's buildings, after the buildings already standing on the base.

Standing buildings come from your FIO data, or you type them in. You get the list as a table or as an XIT action. See [Plan tools](/help/plan_tools).

## Core module {#core-module}

Every base's central building. It takes 25 area of the base, and plans always count it among the buildings to construct.

Also called CM.

## Corp. HQ {#corp-hq}

The headquarters of the corporation you belong to, when it is on the plan's planet. It is not your own company's HQ. It speeds up every building of the plan by 10 %.

Turn it on in a plan's planet settings. See [Base setup](/help/plan_base). Your own company's headquarters is a different thing: see HQ level.

## Credits (ȼ) {#currency}

The game's money. PRUNplanner shows every price, cost and profit in credits, written ȼ.

Production fees are set in the planet's currency. PRUNplanner adds them to costs one to one as ȼ.

## CX {#cx}

A commodity exchange: one of the game's player-run markets, each with its own order book. PRUNplanner's prices and volumes cover AI1, CI1, IC1 and NC1.

AI1 is at Antares, CI1 at Benten, IC1 at Hortus and NC1 at Moria. Market Live also shows CI2 (Arclight) and NC2 (Hubur), and XIT actions can start from their warehouses. Trade off the CX, on local markets or by contract, isn't in this data. See [Exchanges](/help/exchanges).

## Degradation {#degradation}

Buildings wear out over time. Plans charge it as a daily cost of 1 ⁄ 180 of the production buildings' construction cost.

Degradation counts in a plan's cost and profit, and in COGM. Also called wear. See Repair for how condition and repair costs work.

## Efficiency {#efficiency}

How fast a building produces compared to its recipe's base time. 100 % runs a recipe in its base time; 125 % runs it in 80 % of that time.

A building's efficiency is the product of its factors: fertility (farms only), Corp. HQ, COGC, experts, workforce and faction. A plan shows each factor for each building. See [Base setup](/help/plan_base).

## Empire {#empire}

A named group of your plans with a faction and a permit count. The faction and permits give each plan its faction bonus, and the empire's exchange preference prices all its plans.

A plan can belong to several empires, and its numbers depend on the empire you open it in. You create and edit empires in Management. See [Management](/help/management#empires).

## Exchange preference {#exchange-preference}

Your rules for the prices plans use: which exchange and price basis (VWAP 7D, VWAP 30D, ask or bid), plus fixed prices for single materials. You assign one to an empire.

Rules can apply to buying, selling or both, and to all planets or one planet. The first matching rule wins: a planet fixed price, an all-planets fixed price, a planet exchange rule, an all-planets exchange rule, else Universe VWAP 30D. Also called CX preference, Default CX. See [How a price is found](/help/exchanges#how-a-price-is-found).

## Expertise {#expertise}

The field of a production building: Agriculture, Chemistry, Construction, Electronics, Food Industries, Fuel Refining, Manufacturing, Metallurgy or Resource Extraction.

Experts, COGC advertising programs and faction bonuses each work on the buildings of one expertise.

## Experts {#experts}

Specialists on a base that speed up its buildings of one expertise. They arrive over time from running that expertise's production buildings; more buildings bring them faster.

| Experts | Speed-up |
| --- | --- |
| 1 | 3.06 % |
| 2 | 6.96 % |
| 3 | 12.48 % |
| 4 | 19.74 % |
| 5 | 28.4 % |

A plan takes at most 5 experts per expertise and 6 per base. See [Base setup](/help/plan_base).

## Extra building materials {#extra-building-materials}

Materials a planet adds to the construction of every building, because of its surface, gravity, pressure or temperature.

| Planet | Extra material |
| --- | --- |
| Rocky surface | MCG |
| Gaseous (no surface) | AEF |
| Low gravity | MGC |
| High gravity | BL |
| Low pressure | SEA |
| High pressure | HSE |
| Low temperature | INS |
| High temperature | TSH |

They raise a plan's construction cost. Planet Search shows them for every planet. See [Planet Search](/help/planet_search#reading-the-results).

## Extraction {#extraction}

Taking a planet's resource with an EXT (minerals), RIG (liquids) or COL (gases). The amount per run depends on the planet's daily rate for that resource.

A run yields the planet's daily rate × a share of the day (12 h for EXT, 4.8 h for RIG, 6 h for COL), rounded up to whole units, and takes as long as that amount needs at the daily rate. So a run can be a little longer than its share, and the output per day matches the planet's rate.

## Faction {#faction}

Your company's faction, set per empire. Buildings of the faction's expertise get a bonus that is larger the fewer of your permits you use.

| Faction | Base bonus |
| --- | --- |
| Antares | Electronics 5 % |
| Benten | Manufacturing 5 % |
| Hortus | Agriculture 3 %, Food Industries 2 % |
| Moria | Metallurgy 2 %, Construction 3 % |
| Outside Region | Chemistry, Fuel Refining and Resource Extraction 2 % each |
| No Faction | none |

PRUNplanner multiplies the base bonus by 2 × (3 − 2 × permits used ÷ permits total), from the empire's permits. With every permit used that is × 2, so Antares gives Electronics 10 %; with a third of them used it is about × 4.67.

## Fertility {#fertility}

A planet property that only farms (FRM and ORC) use. Higher fertility makes them faster; a planet without fertility can't run them.

A farm's fertility factor is 1 + fertility × 10 ⁄ 33. Planet Search can filter by fertility. See [Planet Search](/help/planet_search#planet-conditions).

## FIO {#fio}

The community API that mirrors game data. With your FIO username and API key in your Profile, PRUNplanner also reads your storage, sites and ships.

PRUNplanner's game data and exchange data come from FIO. FIO Burn, FIO Repair and the plan carts use your own FIO data. See [Profile](/help/profile).

## Fixed price {#fixed-price}

A price you set yourself for a material in an exchange preference, for buying, selling or both, on all planets or one planet. It wins over exchange rules.

Use it for materials you make yourself or get from a partner. See [Fixed prices and COGM](/help/exchanges#fixed-prices-and-cogm).

## Ghost sites {#ghost-sites}

Bases on a planet beyond its plot count. On starter planets, a new player who starts there can still settle once every plot is taken; nobody else can.

In the game, ghost sites occur on starter planets for new players: a new player who starts there can settle even when every plot is taken. If your starting planet is elsewhere, you can't settle such a planet once it has no free plots. Planet Search marks a full planet that allows ghost sites "Full · ghost sites". See [Plots](/help/planet_search#plots).

## Habs {#habs}

Habitation buildings that house a base's workforce: HB1 to HB5 each house one tier, HBB, HBC, HBM and HBL house mixed tiers.

Too little housing lowers workforce efficiency. A plan can size its habs to the workforce automatically; this is on for new plans. See [Base setup](/help/plan_base).

## HQ level {#hq-level}

The level of your own company's headquarters. Each HQ level upgrade gives you one more base permit.

The HQ Upgrade Calculator lists and prices the materials from one level to another; its range ends at level 50, but that is the calculator's range, not a game limit. Base ROI can add the upgrade for one more permit to a base's cost. See [HQ Calculator](/help/tools_hq_upgrade_calculator).

## Jumps {#jumps}

The number of system-to-system jumps on the shortest route between two places.

Planet Search calculates jumps in your browser, to the exchanges and to your plans. A "—" means there is no jump route: a colony ship is required. See [Distance](/help/planet_search#distance).

## Luxuries {#luxuries}

Two optional consumables per workforce tier, such as PWO and COF for Pioneers. Providing them raises workforce efficiency, at the cost of their daily consumption.

Workers housed without luxuries work at about 79 %. The first luxury raises that to about 87 %, the second to about 92 %, both together to 100 %. Luxuries you don't turn on aren't consumed. See [Base setup](/help/plan_base).

## Market capacity {#market-capacity}

In Base ROI, how many bases like this one the market can take: the exchange's average traded volume per day ÷ what one base sells or needs per day.

It is checked for every output and recipe input over 7 days, and the lowest one counts. Below 1, one base makes or needs more than the market trades. See [Base ROI](/help/tools_base_roi#metrics).

## Market maker {#market-maker}

Orders from the game itself, not from players, that buy or sell certain tier-1 goods at fixed prices. For those goods their price acts as a floor or a ceiling.

Players report market makers on goods such as agricultural products, basic prefabs and consumables, and that the game has changed their prices before. Trades with market makers count in the exchange's VWAP like any other trade; PRUNplanner doesn't use the market makers' own buy and sell prices that FIO reports.

## Material I/O {#material-io}

Per material and day: what a plan or empire takes in, what it puts out and the difference (Δ).

You can show it in ȼ, t, m³ or as a share of the market. See [Plan results](/help/plan_results).

## Optimal setup {#optimal-setup}

The 500-area base the ROI tools compare recipes on: production buildings plus the habs and storage they need, with 5 experts and the matching COGC, on a planet with normal conditions.

Profit per area on this setup lets you compare buildings with each other. See [Recipe ROI](/help/tools_roi_overview).

## Payback {#payback}

How many days a plan's daily profit takes to pay for its construction: construction cost ÷ profit per day. A plan that makes no profit never pays back.

Base ROI's Break-even also counts its stock buffer, the HQ upgrade and the time until the experts arrive. See [Base ROI](/help/tools_base_roi#metrics).

## Plan {#plan}

One base on one planet as PRUNplanner calculates it: buildings and recipes, habs and storage, experts, workforce luxuries, COGC program, Corp. HQ and permits.

A plan's numbers depend on the empire you open it in (faction and permits) and that empire's exchange preference. See [Plan layout](/help/plan_layout).

## Planetary projects {#planetary-projects}

Planet-wide buildings: LM (local market), COGC, WAR (warehouse), ADM (administration center) and SHY (shipyard). Each takes a plot of the planet.

Planet Search shows them as infrastructure and can filter by them. See [Planet Search](/help/planet_search#cogc-and-infrastructure).

## Plots {#plots}

A planet's building sites. Every base takes one, and so do corporation HQs and planetary projects.

Free plots are the planet's total plots minus the sites that aren't ghost sites. Planet Search shows them in its Plots column, as FIO last saw the planet. See [Plots](/help/planet_search#plots).

## POPR {#popr}

Population report: a planet's figures on its population, such as workers and free workers per tier, and its infrastructure. The game publishes it weekly.

A plan's POPR tool shows the latest report for its planet. See [Plan tools](/help/plan_tools).

## Production fees {#production-fees}

A fee the planet's governor sets per expertise and workforce tier, paid for each production order on the recipe's base time. Faster buildings run more orders, so they pay more per day.

PRUNplanner charges it per day as the fee weighted by the building's workforce × the building's efficiency. It counts in plans, Profit Breakdown, Empire, Base ROI and Production Chains, and in COGM. See [Plan results](/help/plan_results).

## Profit {#profit}

A plan's daily revenue minus its daily cost. Revenue is what it sells; cost is what it buys, wear and production fees.

Sold materials are priced at sell prices, bought materials and workforce consumables at buy prices, from the empire's exchange preference. Wear is 1 ⁄ 180 of the production buildings' construction cost per day. See [Plan results](/help/plan_results).

## Recipe {#recipe}

One production step of a building: inputs turn into outputs over a base duration. A building runs its recipes one after another.

## Repair {#repair}

Buildings lose condition over time, and efficiency with it. Repairing a building costs part of its construction materials, more the longer you wait.

PRUNplanner models the repair cost rising each day until day 180, when it costs as much as a new building, and efficiency falling toward 33 %. See [FIO Repair](/help/fio_repair).

## ROI {#roi}

Return on investment. PRUNplanner shows it as payback days: construction cost ÷ profit per day.

Recipe ROI, Resource ROI and Base ROI rank recipes, resources and bases by it. See [Recipe ROI](/help/tools_roi_overview).

## Share of volume {#share-of-volume}

What a plan or empire buys or sells of a material per day ÷ what the exchange traded of it per day, on average over 30 days.

Plan check flags a share amber from 10 % and red from 50 %. See [Market check](/help/plan_check#market-check).

## Shared plan {#shared-plan}

A link to one of your plans. Anyone with it sees the plan and can try changes on their own copy; your plan never changes.

The link stops working when you stop sharing or delete the plan. See [Sharing a plan](/help/plan_sharing).

## Spread {#spread}

The gap between ask and bid on an exchange, as a share of the ask: (ask − bid) ÷ ask. A wide spread means trading at once costs more.

Plan check shows the spread but doesn't flag it. See [Plan check](/help/plan_check#market-check).

## Storage {#storage}

Storage buildings: STO, STA, STE, STV and STW. Their weight and volume capacity set how many days of the base's daily imports and exports it can hold.

A plan's storage sets its visitation frequency. See [Plan tools](/help/plan_tools).

## Supply cart {#supply-cart}

A plan tool that lists the consumables and inputs a base needs for a number of days (20 by default), less what its FIO storage holds.

You get the list as a table or as an XIT action. XIT Initial also ships the inputs the plan makes itself, for the first supply. See [Plan tools](/help/plan_tools).

## Thin market {#thin-market}

In Production Chains, a bought material where the chain needs 10 % or more of what the exchange trades a day, or that didn't trade in 30 days.

See [Warnings](/help/tools_production_chain#warnings).

## Ticker {#ticker}

The short code of a material or building, as in the game: DW for drinking water, PP1 for prefab plant.

Search, filters and XIT actions use tickers.

## Universe {#universe}

PRUNplanner's average over the four exchanges AI1, CI1, IC1 and NC1. It is not a place where anyone can trade.

Every price that no rule of your exchange preference covers, and every price of an empire without one, is the Universe VWAP 30D. See [How a price is found](/help/exchanges#how-a-price-is-found).

## Upkeep {#upkeep}

What it costs to keep things running. In Production Chains, the daily cost of the workforce's consumables. In the Upkeep Price Calculator, the materials planetary buildings consume to meet population needs.

The population needs are Safety, Health, Comfort, Culture and Education. See [Upkeep Prices](/help/tools_upkeep_price_calculator).

## Visitation frequency {#visitation}

A plan tool: how many days until the base's storage fills with what it imports and exports per day, which is how often a ship must visit.

You can leave materials out of the calculation. See [Plan tools](/help/plan_tools).

## VWAP {#vwap}

Volume-weighted average price: the credits traded for a material on an exchange ÷ the units traded, over the last 7 or 30 days.

When a period has no trades, the last known price stays. See [Price basis](/help/exchanges#price-basis-vwap-ask-and-bid).

## Workforce {#workforce}

The workers buildings need, in five tiers: Pioneers, Settlers, Technicians, Engineers and Scientists. Habs house them, and they consume food, water and other goods every day.

Housed workers without luxuries work at about 79 % efficiency; too little housing lowers it in proportion. See [Base setup](/help/plan_base).

## XIT {#xit}

An action package PRUNplanner builds, such as CX buys, material transfers or repairs, for Refined PrUn to run in the game as XIT ACT. PRUNplanner never trades for you.

FIO Burn, FIO Repair and the plan carts build XIT actions. After an XIT repair flight you run BRA in the game, the command that repairs all buildings of a base. See [FIO Repair](/help/fio_repair#prices).
