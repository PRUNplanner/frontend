**Base ROI** ranks every way to run one base, so you can see which bases pay back fastest before you plan one. Each row is a full base: one resource on one planet, one farming recipe on one fertile planet, or one recipe of any other production building. You don't need an account for it.

You'd use it when you're looking for your next base and want to compare the options side by side. When a row looks interesting and you're logged in, **Open as plan** turns it into a plan you can change in every detail.

> [!warning]
> Base ROI is in a test phase and has no entry in the navigation yet. Open it at [/base-roi](/base-roi).

## First visit {#first-visit}

The first time you open the page, **Set up Base ROI** asks a few questions so the table fits how you play:

- your exchange preference (only when you're logged in)
- **How strict should the table be?**: **Rookie**, **Standard** (preselected) or **Veteran**
- the ship (Veteran only: any ship, or **No limit**, the default) and **Ship visits**, how many days of cargo the ship carries per trip, in and out
- **Choose columns**: the preset's columns, which you can change before you press **Start**

| Preset | Logistics | Min market capacity | Stock buffer | Hidden columns |
| --- | --- | --- | --- | --- |
| **Rookie** | SCB (500 t / 500 m³) | 0.7 | 10 days | Weekly return, running cost, plots, workforce |
| **Standard** | WCB (3,000 t / 1,000 m³) | 0.7 | 10 days | Weekly return, running cost, plots, workforce |
| **Veteran** | your ship, or no limit | 0 (any) | 10 days | Running cost |

A preset only fills in settings you can also change later in [Settings](#settings), so nothing you pick here is final. The ship and **Ship visits** matter because they set the logistics limit: the table hides bases that move more cargo between two visits than the ship carries. The minimum market capacity hides bases the market can take fewer of than that number, for example fewer than 0.7 bases.

**Skip**, or closing the dialog, keeps the current settings. Either way the dialog won't open by itself again, but **Run setup again** in Settings brings it back. All settings live in this browser only, not in your account.

## What every base assumes {#assumptions}

Every row is a full 500-area base (one [[area-permits|permit]]) with the building's optimal layout. PRUNplanner calculates it with the same engine as your [[plan|plans]] and prices it with the selected [[exchange-preference|exchange preference]], or with Universe 30D prices when you're not logged in. Each base also assumes:

- Both [[luxuries]] for every tier.
- [[experts|Experts]] only in the building's own [[expertise]], as set in Settings.
- The COGC from Settings, never the planet's real program. The details show the planet's real program as "(not applied)". In the game the planet's residents vote on the program, and the winner runs for a week, so the real program can change from week to week.
- Recipe rows run on a standard planet: rocky, normal gravity, pressure and temperature, not fertile, and without production fees.

The bottom of Settings says the same: "All rows assume the COGC and experts set here; recipe rows run on a standard planet."

## Row kinds {#row-kinds}

- **Resource**: one resource on one planet, with RIG, EXT or COL and the planet's environment materials in the construction. PRUNplanner only calculates planets within **Max jumps (planet rows)** and resources with a daily [[extraction]] above 0. The row shows "@ planet · N jumps", the [[jumps]] to the nearest exchange of your exchange preference, or of all four exchanges if you have none.
- **Farming**: one FRM or ORC recipe on one fertile planet, with the planet's fertility in the yield. It shows "@ planet · N jumps" too.
- **Recipe**: one recipe of any other production building, on the standard planet. Use **Try on a planet** in the row's details to see it on a real planet.

## Metrics {#metrics}

- **Daily profit**: revenue minus inputs, consumables, [[degradation]] and [[production-fees|production fees]]. Degradation is the construction of the production buildings ÷ 180. Planet rows pay their planet's fees (the planet's fee per day × efficiency × buildings). Recipe rows on the standard planet pay none. With **Ramp from 0** this is the profit at 5 experts, otherwise at the fixed count.
- **Break-even**: days until the building cost is paid back. With **Ramp from 0** a new base starts without experts. The stages with 0, 1, 2, 3 and 4 experts last 10, 12.5, 57.57, 276.5 and 915.1 days, each divided by the number of production buildings. Revenue, inputs and production fees grow with the expert bonus, while consumables and degradation stay the same. It shows "never" when the base makes no profit (with the ramp: at 5 experts). Don't worry if you rarely see it: those rows have a daily profit of 0 or less, so they only show while **Show negative** is on.
- **Weekly return**: 7 × daily profit ÷ building cost.
- **Building cost**: construction plus the options in Settings, which are the buffer stock (buffer days × (inputs + consumables + revenue) ÷ 2) and the HQ upgrade for one more permit.
- **Daily running cost**: inputs + consumables + degradation + production fees. It's hidden until you turn it on in **Columns**, because the buffer stock in the building cost already covers the running cost to start with.
- **Cargo / day**: two numbers, tonnes and m³, each the larger of what the base moves in and out per day. The tooltip lists in and out separately, along with the ship check. Sorting uses the larger of the two numbers, tonnes and m³ alike.
- **Market capacity**: how many bases like this the market can take. For each output, it's the 7-day average traded volume ÷ what the base produces per day. For each recipe input, it's the traded volume ÷ what the base needs per day. Byproducts count as outputs, and workforce consumables don't count. The lowest value counts. (O) or (I) shows which side limits it, and the tooltip names the material. Below 1 (shown in amber), one base produces or needs more than the market trades. The tooltip also gives one base's share of the traded volume (1 ÷ market capacity, as a percentage). See [[market-capacity|market capacity]].
- **Industry**: the base's industry, in short (Food for Food Industries, Fuel for Fuel Refining, Extraction for Resource Extraction).
- **Plots**: free [[plots]] on the planet, for planet rows. Sort by it to find the emptiest planets. Recipe rows show a dash.
- **Workforce**: the workers the base needs per tier (PIO, SET, TEC, ENG, SCI). When the planet can't staff the base, an amber line says how many are free, or "No population report".
- **Profit, 30 days**: daily profit with the daily [[vwap|VWAP]] of each material's exchange over the last 30 days, as a small chart. Days without trades keep the last price, and materials without history keep today's price. ASK, BID and fixed prices have no history.
- **⚠**: a material priced from a 7D or 30D VWAP whose [[bid]] or [[ask]] is more than 30 % off that price. It's a hint that the daily profit can look quite different when you trade at the order book instead of at the average. The popover lists the daily profit for each combination of bid and ask of those materials, lowest first. With more than 100 combinations it shows only the two extremes: buying at the ask and selling at the bid, and the other way round.

### Worked example {#metrics-example}

The numbers here are made up and round, with a fixed expert count, so the arithmetic stays easy to follow.

- A base has a building cost of 700,000 ȼ and makes 20,000 ȼ a day. Break-even is 700,000 ÷ 20,000 = 35 days, and the weekly return is 7 × 20,000 ÷ 700,000 = 20 %.
- Part of that building cost is the stock buffer. With 10 buffer days, inputs of 3,000 ȼ, consumables of 1,000 ȼ and revenue of 8,000 ȼ a day, it's 10 × (3,000 + 1,000 + 8,000) ÷ 2 = 60,000 ȼ.
- The base makes 300 units of its output a day, and the market trades 900 a day on average over 7 days: 900 ÷ 300 = 3 bases. Its recipe needs 200 units of one input a day, which trades 400 a day: 400 ÷ 200 = 2 bases. The lower value counts, so the market capacity is 2 (I), and one base's share of that input's traded volume is 1 ÷ 2 = 50 %.

With **Ramp from 0**, break-even is longer than building cost ÷ daily profit, because the early stages run with fewer experts. In the game, experts arrive over time from running that expertise's production buildings, and more buildings bring them faster. The ramp follows that: each stage is divided by the number of production buildings.

> [!tip]
> A short break-even with a market capacity below 1 is a trap, because one base already floods the market. Sort by break-even, then check that the market capacity is well above the number of bases you plan.

## Settings {#settings}

The Settings panel sits above the table. When it's closed, it shows a one-line summary of the settings that shape the table.

| Setting | Default | Options |
| --- | --- | --- |
| **COGC (all rows)** | **Matching program** (the program for the building's own expertise) | **None** |
| **Experts** | **Ramp from 0** | 0 to 5, fixed |
| **Stock buffer** | 10 days | **Off**, 1 to 10, 14, 21 or 28 days |
| **Logistics limit** | **By ship**: WCB, every 3 days | **Manual** (600 t and 200 m³ per day), **None** |
| **Target permit (HQ cost)** | **Off** | 2 to 50 |
| **Max jumps (planet rows)** | 7 | any whole number from 0 |
| **Min market capacity** | 0.7 bases | 0.0 to 1.0 in steps of 0.1 |
| **Row kinds** | **Resources** and **Recipes** on; **Show negative** and **Show planets without workers or plots** off | |

- **Logistics limit**: **By ship** picks a ship (TCB to HCB, each with its t and m³) and how often it comes ("Every … days"). The ship has to carry that many days of cargo, in and out, by weight and by volume. The table hides rows that need more. **Manual** sets the limit per day, and **None** limits nothing. For example, the default WCB (3,000 t / 1,000 m³) every 3 days allows a base that moves up to 3,000 ÷ 3 = 1,000 t and 1,000 ÷ 3 ≈ 333 m³ a day, counting the larger of in and out.
- **Stock buffer**: storage for this many days of cargo. PRUNplanner adds STO or STA. When the base would no longer fit in 500 area, it drops a production building until it does.
- **Target permit (HQ cost)**: adds the materials for that HQ level, at CX buy prices, to every row's building cost. The cost counts from 3 on, so 2 adds nothing. In the game each HQ level upgrade gives you one more base permit, so this shows what the base on that permit costs, including the upgrade to that HQ level.
- **Max jumps (planet rows)**: counted to the nearest exchange of your exchange preference, which the setting names. Planets without a route count as too far.
- **Min market capacity** sits next to the search above the table and hides rows below it.
- **Show negative**: when it's off, the table hides rows with a daily profit of 0 or less.
- **Show planets without workers or plots**: off by default. The table then hides planet rows when no new base fits (every plot taken and no [[ghost-sites|ghost sites]]) or when the latest [[popr|population report]] can't fill the base's jobs, counting free workers less the jobs already open. A planet with no population report counts as having no workers. Turn it on to see these rows, and turn on the **Workforce** column to see what's missing. Recipe rows aren't checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Reset to defaults** resets the settings, but keeps your columns, the open or closed panels and charts, and the charts' time range and aggregation.
- **Run setup again** opens the first-visit dialog.

A planet that's full but has ghost sites stays in the table. In the game, ghost sites only let new players who start on that planet settle there, so check the **Plots** column if your company started elsewhere.

Only COGC, experts, stock buffer, max jumps and the exchange preference make PRUNplanner calculate the rows again. Every other setting applies at once.

> [!warning]
> Picking an exchange preference in the selector at the top (logged in only) also makes it your default exchange preference. Other pages that follow your default switch with it.

### Hidden rows {#hidden-rows}

The line above the table counts the rows, and the hidden ones per limit: "max jumps", "logistics", "market capacity", "no plots", "no workers" and "negative profit". Each row counts once, at its first limit in that order. "no plots" and "no workers" only count while **Show planets without workers or plots** is off, and "negative profit" only while **Show negative** is off. The search isn't a limit and isn't counted.

When no row is left, the table says "No base passes these settings." Don't worry: unless the page says a request failed, this only means your settings or your search leave nothing to show. The counts above the table tell you which limits hid rows, so you know which setting to change.

## Profit chart {#profit-chart}

Above the table, **Daily profit by industry** shows each industry's daily profit over the chosen time range (90 days unless you change it). On screens 1,536 px and wider it sits beside the settings.

- Each base counts by how much of its material the market trades (7-day average of its outputs).
- The many planets of one resource or farming recipe count as one: the mean of the 3 planets with the highest daily profit, so poor planets don't drag the line down.
- It follows the table's settings and limits.
- It shows the 7 most traded lines and says how many more there are.

Click the title to collapse the chart, and it stays collapsed. Search to drill in:

- an industry (e.g. "Chemistry") shows its buildings
- a building (e.g. "CHP") shows its materials
- a material (e.g. "SC") shows the recipes that make it

A search that leaves only one building or one industry drills in too.

Every history chart has a time range (**7D**, **30D** or **90D**) and an aggregation (**1D**, **3D** or **7D** per point) at its top right, like the game's charts. A longer aggregation averages out daily noise. Your choice applies to all of these charts and is remembered. The table's **Profit, 30 days** column always shows 30 days.

## Chart {#chart}

**Chart** at the top opens **Break-even vs. market capacity** in a drawer you can resize. It plots the rows the table shows, search included:

- across, the break-even in days, and up, the market capacity in bases, both on log scales
- dot size is the daily profit, and colour is the row kind
- the dashed line joins the best trade-offs: rows that no other row beats on both a shorter break-even and a higher market capacity

Rows that never pay off or have no market capacity aren't drawn, but the drawer counts them. Hover a dot to scroll the table to its row. The button is off while no row shows, and the drawer stays open or closed as you left it.

> [!tip]
> The top-left corner of the chart is where you want to be: quick payback and room in the market. Hover the dots there to find their rows.

## Search and tooltips {#search-and-tooltips}

- The search above the table filters by industry, building or output ticker.
- The table orders rows by break-even, shortest first, and among equal break-evens by the higher daily profit. Click a column header to sort by it instead (Material, Workforce and Profit, 30 days don't sort). The table shows 50 rows per page.
- Hover a column header to see what it means, or a number for the napkin math behind it.

## Details {#details}

Expand a row to see two charts under **Profit history**, with the full math below them.

- Profit: revenue, running cost and daily profit, every line on one ȼ scale.
- Market volume: how many bases the market carries each day, from the CX traded volume of that day. **Outputs** is the scarcest output's traded volume ÷ what one base sells per day. **Inputs (bottleneck)** is the same for the recipe input with the least volume per unit the recipe needs. It's the market capacity column, day by day.

Both charts follow the time range and aggregation of the history charts. The math comes in eight sections: **Layout and building cost**, **Logistics and storage**, **Production efficiency**, **Line runs**, **Yield**, **Money per day** (with consumables, degradation and production fees), **Break-even** (each expert stage and the day it's paid off) and **Market capacity**. **Copy as text** copies it all.

**Try on a planet** (recipe rows only) lets you pick any planet, and PRUNplanner calculates the row there with the table's settings. A line compares building cost and break-even with the standard planet, and **Back to standard planet** undoes it. PRUNplanner forgets the choice when the details close.

**Open as plan** (logged in) creates and saves a plan right away and opens it. The plan is named "Base ROI" with the outputs and building, and gets the same layout. It goes on the row's planet, the planet you tried, or Montem (OT-580b) for a recipe row. It goes into one of your empires with the same exchange preference and no faction bonus for the building. Without such an empire it goes into none, and a notice says the plan's daily profit can differ. Planet rows also link "Open …" to start a plan on that planet.

> [!tip]
> A recipe row has no production fees. Use **Try on a planet** first: the numbers then include that planet's fees, and **Open as plan** puts the plan there instead of on Montem.

## Loading {#loading}

Recipe rows appear first, then the planet rows ("Loading planet rows…"). A progress line shows each step. If a request fails, the page says so. Change a setting or reload the page to try again. On the first load the recipe rows show as soon as they're ready, so you can look at those while the planet rows are still being calculated.
