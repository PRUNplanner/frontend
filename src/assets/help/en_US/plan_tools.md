The plan page's tools turn a [[plan]] into shopping lists, flight schedules and a closer look at its numbers. In the Standard layout they are tabs next to **Production**: **Construction**, **Supply**, **Visits**, **Repair**, **Profit**, **Plan check** and **POPR**. The [[cogm|COGM]] dialog opens from each recipe, and the calculation debug panel is there for bug reports. [Plan check](/help/plan_check) has its own article; this page covers the rest.

A tool loads the first time you open its tab. Tools work on the plan as you see it, unsaved changes included, and price materials with the plan's [[exchange-preference|exchange preference]]. You can move or split the tabs like any other part of the page ([Plan layout](/help/plan_layout)). The results tiles open the tool behind them: **Profit / day** opens Profit, **Payback** opens Construction and **Storage** opens Visits.

## Construction {#construction}

**Construction Cart** works out what is left to buy before you can build the base. It is your [[construction-cart|construction cart]]: the buildings still to build, and the materials they need after what you already have in stock.

### Buildings {#construction-buildings}

The **Buildings** table has one row per building type in the plan, habitations, storage and the [[core-module|core module]] included.

| Column | What it shows |
|---|---|
| **Built** | How many you already have on the planet. With [[FIO]] connected it starts at FIO's count for the plan's planet; you can type your own number. |
| **Amount** | How many are left to build: **Planned** − **Built**, never below 0. You can type a different number. |
| **Planned** | How many the plan has. The core module always counts as 1. |
| one column per material | The construction materials for that row's **Amount**. **Materials Sum** adds them up. |

- A number you type into **Built** shows a pencil ("**Entered by you, not from FIO**") and a reset button. **Reset built** clears all of them and goes back to FIO's counts.
- Typed built counts are saved per plan, with your preferences, for plans you own and have saved. On a new plan, a shared plan or an older version you are looking at, they last only while you stay on the page: "**Built counts aren't saved for this plan.**"
- A **Built** count above **Planned** turns amber.
- Typed **Amount** values are not saved. Changing **Built** for a row sets its **Amount** back to **Planned** − **Built**.
- When the buildings (built plus still to build) need more workers of a tier than their habitations house, a warning sits next to **Amount**: "**Insufficient habitation will reduce production efficiency.**" The habitation rows that house the short tier turn red.
- With FIO, a warning icon next to the title lists buildings FIO has on the planet that the plan doesn't. Demolish them in the game, or the base's area, housing and materials won't match the plan.

Under the table, **Total Cost**, **Total Weight** and **Total Volume** cover everything in the **Amount** column, before stock. Prices are the plan's buy prices.

### Materials to buy {#construction-materials}

**Materials to buy** sums the materials over all buildings and takes off what you have:

| Column | What it shows |
|---|---|
| **Material** | The construction material. |
| **Amount** | What all buildings in the **Amount** column need. |
| **Stock** | What the FIO storage chosen under **Storage** holds. Only with FIO. |
| **Stock Override** | A number you type instead of **Stock**, for stock FIO doesn't know about. Not saved. |
| **Need** | **Amount** − stock (or your override), never below 0. |

**Storage** offers every FIO storage: your planets' bases, warehouses and ships, or none. It starts at the base on the plan's planet. The totals below the table cover **Need**.

There are two XIT buttons. The one at the top of the tool ships everything in **Materials Sum**, ignoring stock. The one next to **Storage** ships only **Need**. See [XIT actions](#xit).

> [!tip]
> Expanding a base you already have? With FIO, **Built** starts at what stands on the planet, so **Amount** and **Need** cover only the new buildings, while the habitation warning counts old and new together.

## Supply {#supply}

**Supply Cart** lists the [[workforce]] consumables and production inputs the running base needs for a number of days, minus what is in stock. It is your [[supply-cart|supply cart]].

### Settings {#supply-settings}

| Setting | Default | What it does |
|---|---|---|
| **Supply for** | **Whole base** | **Whole base**, **Production** or **Workforce**: which materials are listed. |
| **Stock Duration (days)** | 20 | How many days the supply lasts. Decimals are allowed. One value for all plans, saved with your preferences. |
| **Storage** | the base on the plan's planet | The FIO storage whose stock is taken off. Only with FIO. |

**Supply for** picks which materials are listed: a material shows under **Workforce** when the workforce uses it, under **Production** when a recipe uses it. The amounts stay the whole base's net need.

### Columns and totals {#supply-columns}

Only materials the base buys in are listed: those it uses more of than it makes.

| Column | Formula |
|---|---|
| **Ticker** | The material. |
| **Daily Need** | What the base uses minus what it makes, per day. |
| **Daily Cost** | **Daily Need** at the plan's buy price, ȼ / day. |
| **Stock** | What the chosen storage holds. Only with FIO. |
| **Full Need** | **Daily Need** × days, rounded up. |
| **Final Need** | **Full Need** − **Stock**, never below 0. |
| t, m³ | Weight and volume of **Final Need**. |
| **Workforce**, **Production** | Whether the workforce or a recipe uses the material. |

Below the table: **Daily Cost**, **Total Cost** (**Final Need** at the plan's buy price), **Total Weight** and **Total Volume**. "More options in FIO Burn" opens [FIO Burn](/fio/burn) ([help](/help/fio_burn)), which plans supply for all bases of an empire at once.

### XIT and XIT Initial {#supply-xit}

- The XIT button ships **Final Need** of the listed materials: what the running base still needs once its own production covers part of it.
- **XIT Initial** (its drawer is titled **Supply Cart (Initial)**) is for the first supply, when nothing is produced yet. It ships each material's full input × days, rounded up, minus stock, including the materials the plan makes itself. It follows **Supply for**: the workforce's or production's own inputs, or both.

> [!tip]
> Starting a new base? Use **XIT Initial** for the first flight. The plain XIT nets out what the base makes, so a base that makes its own DW or RAT would arrive without any.

## XIT actions {#xit}

The XIT buttons in Construction, Supply and Repair open a drawer with an [[xit|XIT]] package for [Refined PrUn](https://github.com/refined-prun/refined-prun), the browser extension for the game. Refined PrUn runs it with its XIT ACT command, so you don't copy amounts by hand.

| Field | Default | What it does |
|---|---|---|
| **Origin** | **Configure on Execution** | Where the materials come from: one of the six station warehouses (Antares, Arclight, Benten, Hortus, Hubur, Moria), or chosen when you run the package. |
| **Buy From CX** | on | Adds a step that buys the materials on that station's exchange before the transfer. "**Only warehouse origin allows purchasing.**" With **Configure on Execution** the box is disabled. |
| **JSON** | | The package. **Copy** puts it on the clipboard. |

Below the fields a table lists each material and its amount; materials with an amount of 0 are left out. The package is named "PRUNplanner" plus the tool (for example "PRUNplanner Supply Cart"), and its destination is always chosen when you run it. **Origin** and **Buy From CX** are saved with your preferences and shared by every XIT button, FIO Burn and FIO Repair included.

## Visits {#visits}

**Visitation Frequency** answers two questions: when the base's storage is full, and how often a ship has to come by. The [[visitation]] numbers count materials the base sells (export) and buys (import), per day.

### Storage {#visits-storage}

The sentence at the top gives the base's capacity: the base's own 1,500 t and 1,500 m³ plus the plan's [[storage]] buildings.

| Building | t | m³ |
|---|---|---|
| STO | 5,000 | 5,000 |
| STA | 2,500 | 2,500 |
| STE | 10,000 | 10,000 |
| STV | 2,500 | 7,500 |
| STW | 7,500 | 2,500 |

The table shows, in t and m³ per day:

- **Import**: what the base buys in, the materials it uses more of than it makes.
- **Export**: what it makes more of than it uses.
- **Larger leg**: the larger of the two, what a ship carries on its fuller leg. Weight and volume are compared on their own.
- **Storage Filled**: capacity ÷ **Larger leg**, in days, whichever of weight and volume runs out first.

**Excluded materials** leaves materials out of this tool, for ones you sell or buy on the planet itself (local market, contracts). Search and pick tickers. The list is saved per plan with your preferences; on a new or shared plan it lasts for the visit.

> [!warning]
> The **Storage** results tile counts every material, without your **Excluded materials**. With exclusions set, its days and **Storage Filled** here differ.

### Shipping {#visits-shipping}

One row per ship size: 500 t / 500 m³, 1,000 t / 1,000 m³, 2,000 t / 2,000 m³, 1,000 t / 3,000 m³, 3,000 t / 1,000 m³ and 5,000 t / 5,000 m³ (**Ship t**, **Ship m³**). For exports and imports each:

- **Visitation (days)**: how many days of exports (or imports) fill that ship, the smaller of ship t ÷ t per day and ship m³ ÷ m³ per day.
- **Limit**: which one runs out first, t or m³.

> [!tip]
> A ship should visit at least as often as the smallest of **Storage Filled** and the ship's two **Visitation (days)**: wait longer and storage overflows, the exports no longer fit in one load, or the imports run out. The [[cargo-bays|cargo bay]] sizes in the game tell you which row is yours.

## Repair {#repair}

**Repair Analysis** finds the best [[repair]] interval for each production building type: how many days to wait between repairs so the base makes the most profit. Habitations, storage and the core module are left out.

### How it is calculated {#repair-calculation}

Buildings wear: their condition, and with it their output, falls from 100 % to 33 % over time, slowly at first, fastest around day 100, then levelling off. Repairing restores it, but the repair bill grows the longer you wait: on day *n* each construction material costs its amount minus ⌊amount × (180 − *n*) ÷ 180⌋, so the bill grows until day 180, when it equals the materials of a new building.

For every interval from 1 to 180 days, PRUNplanner works out per building and day:

1. *Output*: the building's production value at full condition (output value minus inputs and [[production-fees|production fees]], from the plan) × its average condition over the interval.
2. minus its workforce cost per day.
3. minus the repair bill for that interval spread over the interval's days (bill ÷ (*n* + 1)).

The interval with the highest profit is the best one. The *good range* is the run of days around it whose profit is within 1 % of the best. Repair materials are priced at the plan's buy prices.

The plan's own numbers ([Results](/help/plan_results)) charge [[degradation]] as 1/180 of the construction cost per day instead. "**Profit with these repairs**" counts the real repair cost at each interval.

### What it shows {#repair-view}

- At the top: "**Profit with these repairs**" for the whole plan in ȼ / day, with "**all at best**" or how far it is from all at best; **Repair cost** in ȼ / day (or **Next repair due** with FIO, see below); and "**One repair of every building**" in ȼ, t and m³.
- **Buildings** lists each type, most expensive repair first: **Best (good)** (the best interval and its good range), **Interval (d)** (yours, starting at the best), **ȼ/day** at that interval, and **Good range** (or **Next due** with FIO).
- Clicking a building opens its detail: profit at your interval and how it compares with the best, the **Repair bill**, **Condition at repair** and the average output, **Repair every** with a field, a slider (1–180 days) and **Presets** (**Best · {n} d**, 30, 60 and 90 days), and the materials of one repair of all buildings of that type.
- Charts: **Profit per day, by repair interval** with the good range marked; **Why {best} days: repair cost vs. lost output**, where the lowest total is the best interval; and **Building condition**.

Intervals you set are not saved. **Reset all to best** goes back to the best intervals.

### With FIO {#repair-fio}

With FIO connected, the detail lists your buildings of that type on the plan's planet: "**Your {ticker} on {planet} (FIO)**", each with days since its last repair, its condition and a due tag at your interval: **Overdue {n} d**, **Due today**, **Due in {n} d** (within 7 days, amber) or **In {n} d**. A building FIO reports as never repaired shows "**never repaired**" and gets no due tag. The top shows **Next repair due** instead of **Repair cost**, and "**FIO last update: {when}**" with a note when that is more than a day old.

**XIT for due ones** ships the repair materials, as FIO reports them, of every building that is overdue or due within 7 days ([XIT actions](#xit)). Without FIO, a note links to "**Set up FIO in your Profile**". On a shared plan the FIO part is hidden, because the FIO data would be yours, not the owner's.

> [!tip]
> [FIO Repair](/help/fio_repair) uses each building type's best interval from this tool for the plans it matches to your bases. Set up the plan here, then plan the repair flights there.

## Profit {#profit}

**Profit Breakdown** shows where each day's output value goes, in ȼ / day at the plan's exchange preference. It adds nothing new: its steps end at the plan's [[profit]] per day.

**Break down** switches between **By cost type** (default) and **By building**. PRUNplanner keeps your choice until you reload the page.

### By cost type {#profit-cost-type}

A waterfall from left to right:

| Step | What it is |
|---|---|
| **Output value** | What the base makes more of than it uses, at the plan's sell prices. |
| **Production inputs** | What the base buys in for its recipes, at the plan's buy prices. |
| **Workforce** | What the base buys in for its workforce. A material both use goes to **Workforce** up to what the workers consume, the rest to **Production inputs**. |
| **Degradation** | The production buildings' wear: their construction cost ÷ 180 per day. |
| **Production fees** | The planet's fees for the buildings' expertise. Shown only when the planet charges any. |
| **Daily profit** | What is left: the plan's profit per day. |

Materials are netted over the whole base, so a material the base makes and uses counts only with its surplus or shortfall. The output, input, workforce and fee steps show their three largest materials (buildings, for fees) and "+{n} more". Hover a part for **Produced / day** or **Consumed / day**, **Price**, **ȼ / day** and **Share of output**.

A production fee is the planet's fee for the building's expertise, averaged over the building's workers by headcount. It is charged per day at 100 % and scales with the building's [[efficiency]], like its output.

### By building {#profit-building}

One step per building type: its output minus its own inputs and workforce, priced on its own, before degradation and fees. The seven largest show; the rest are summed as "{n} more buildings". **Not attributed** holds what can't be pinned on one building: the whole plan's workforce and materials traded between buildings. Then **Degradation**, **Production fees** and **Daily profit** as above.

### Key figures {#profit-key-figures}

- **Output value**, **Costs incl. degradation and fees** (production inputs + workforce + degradation + production fees) and **Margin** (daily profit ÷ output value).
- The material that brings in the largest share of the output value: its price decides the plan.
- The largest single cost, among production inputs and workforce, as a share of the output value.
- The workforce consumables' share of the output value, with the two biggest.

> [!tip]
> When one output carries most of the value, check how deep its market is in [Plan check](/help/plan_check#market-check) before you build.

## POPR {#popr}

**Latest Population Report** puts the planet's workforce from the game's last [[popr|population report]] next to what the plan needs. The game publishes the report weekly. The tab is there only when you are logged in.

The chart "**Free workers next to what this plan needs**" has one row per tier. The bar is the free workers less the jobs other bases already have open, never below 0. The line is what the plan needs. A bar is green when it covers the need, red when it doesn't, and grey when the plan needs none of that tier.

The table has a column per tier (Pioneer to Scientist):

| Row | What it shows |
|---|---|
| **Total Population** | FIO's *next population* value for the tier. |
| **Free Population** | Workers without a job. |
| **Free Population %** | The unemployment rate × 100 (shown without a % sign). |
| **Unfilled Jobs** | Jobs other bases have open. |
| "Plan Need" | Workers this plan needs. |
| "Plan Check" | ✓ when the plan needs none, or when free workers minus unfilled jobs cover the need. |

Without a report: "**No population report for this planet yet.**"

> [!tip]
> A ✗ in "Plan Check" means you would compete for workers with bases already waiting for them. Plan with fewer workers of that tier, or check again after the next report.

## COGM {#cogm}

The **COGM** button on each recipe row in [Production](/help/plan_production) opens **Cost Of Goods Manufactured**: what one unit of each output costs you to make in this plan. It uses the plan's efficiency, runtime, degradation, production fees, input prices and workforce.

### The calculation {#cogm-calculation}

| Row | Formula |
|---|---|
| Recipe runtime and its "% / day" | The recipe's time ÷ the building's efficiency, and its share of a day (*runtime share*). |
| **Efficiency** | The building's efficiency in this plan. |
| **Degradation** | Construction cost ÷ 180 × runtime share. |
| **Production fee / run** | The building's production fee per day × the recipe's base time ÷ 1 day. It ignores efficiency. |
| Inputs, **Input Total** | Each input's amount × the plan's buy price. A tag says where each price comes from and opens that rule in [Exchanges](/help/exchanges). |
| **Workforce** | The building's daily workforce cost × runtime share. Workers without housing and luxuries turned off cost nothing. |
| **Total Cost** | Degradation + production fee + inputs + workforce. |
| Recipe profit | The outputs at the plan's sell prices − **Total Cost**. |

For each output:

- **Cost Total**: **Total Cost** ÷ that output's amount. Every output carries the whole cost. This is the COGM PRUNplanner uses elsewhere.
- **Cost Split**: **Total Cost** ÷ all outputs together, the cost shared by quantity.
- A line under it gives the output's market price and how far the COGM is from it, in %.

### Using COGM as a buy price {#cogm-buy-price}

When the plan's empire has an exchange preference, a second panel opens beside the table: **Prices in {name}**, the preference by name (**Open in Exchanges** opens it). Without one, a note says prices are Universe · VWAP 30D, with **Set one in Management**.

Per output it shows **COGM here ({planet})**, **Market · {source}** (the market buy price without fixed prices) and **Buy price, all planets** (your [[fixed-price|fixed]] buy price, or **not fixed**). Then:

- **Use as buy price on all planets** (when there is no fixed price) sets the output's buy price, for all planets of this preference, to this plan's COGM.
- When there is one and it is more than 2 % off the current COGM: "**The fixed buy price is {diff} % off the current COGM**" ("Inputs or efficiency changed since it was set."), with **Update to {value}**.
- Otherwise: **Buy price matches COGM**.

A line says which plans of the preference buy the material, since the change applies to every plan using it. **Fixed prices** below lists the preference's fixed prices for **All planets** or this planet, to edit right there. Nothing is stored until you click **Save changes** in the bar at the bottom (or **Discard**). [Fixed prices and COGM](/help/exchanges#fixed-prices-and-cogm) explains fixed prices.

> [!tip]
> Using your own output in another base? A fixed buy price at COGM prices it at what it costs you instead of the market, so the other plan shows its real margin. For a recipe with a [[byproduct]], **Cost Total** gives each output the whole cost; compare it with **Cost Split** before you fix it.

## Calculation debug {#debug}

Calculation debug lists every step of the plan's calculation with its formula and inputs. It is meant for bug reports: when a number looks wrong, it shows where it comes from. It is hidden until you turn it on, and it is in English only.

**Turning it on and off:**

- Add `?debug=calc` to any PRUNplanner address (for example `https://prunplanner.org/?debug=calc`) to turn it on, `?debug=off` to turn it off. The address loses the parameter right away, so a link you share never carries it.
- Or tick "Calculation debug" on the `/debug` page (logged in).
- Or click "Turn off" in the panel.

The setting is kept in this browser and applies to all its tabs. Once it is on, the plan page's **More** menu (⋯ in the header) has "Calculation debug", and Ctrl plus the key left of 1 (`` ` `` on a US keyboard; ⌘ instead of Ctrl on a Mac) opens and closes it, unless you are typing in a field.

**What the panel shows:** a panel under the plan, resizable by its top edge.

- A status line: when it last recalculated, how long it took, the number of steps and how many self-checks pass.
- Buttons to show or hide each phase of the calculation (input, infrastructure, workforce, area, experts, production, COGM, material I/O, prices, construction, finance and visitation), a "Filter" by building, ticker or label, and "Issues only".
- The self-checks, any warnings, and the plan's data as a save would send it, with whether it has unsaved edits.
- "Copy text" and "Copy JSON" copy the whole trace with the app version, the plan, planet, exchange preference and empire.

> [!tip]
> Reporting a wrong number? Open the plan, turn on calculation debug, click "Copy text" and paste it into your report. It holds your plan's data, so share it only where you are fine with that.
