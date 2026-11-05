Base ROI ranks every way to run one base: each resource on each planet that has it, each farming recipe on each fertile planet and each recipe of every other production building. Every row is a full 500-area base with the building's optimal layout, calculated with the same engine as your plans and priced with the selected CX preference (Universe 30D prices when you are not logged in).

**Please note**: All rows assume the COGC and experts set here; recipe rows run on a standard planet.

# Row kinds

- **Resource**: one resource on one planet, with RIG, EXT or COL and the planet's environment materials. Shows "@ planet (jumps)".
- **Farming**: one FRM or ORC recipe on one fertile planet, with the planet's fertility in the yield.
- **Recipe**: one recipe of any other production building, on a standard planet (rocky, normal gravity, pressure and temperature). Use **Try on a planet** in the row's details to see it on a real planet.

# Metrics

- **Daily profit**: revenue minus inputs, consumables and degradation (construction of the production buildings ÷ 180), at 5 experts with the ramp, else at the fixed count.
- **Break-even**: days until the building cost is paid back. With **Ramp from 0** a new base starts without experts: the stages with 0, 1, 2, 3 and 4 experts last 10, 12.5, 57.57, 276.5 and 915.1 days, each divided by the number of production buildings, and revenue and inputs grow with the expert bonus. "never" when the base doesn't make a profit.
- **Weekly return**: 7 × daily profit ÷ building cost.
- **Building cost**: construction, plus the options in Settings: buffer stock (buffer days × (inputs + consumables + revenue) ÷ 2) and the HQ upgrade for one more permit (HQ level N − 1).
- **Daily running cost**: inputs + consumables + degradation. Hidden until you turn it on in Columns: the buffer stock in the building cost already covers the running cost to start with.
- **Cargo / day**: the larger of the weight and volume the base moves in or out per day; (I) when more comes in, (O) when more goes out.
- **Market capacity**: how many bases like this the market can take, on both sides. For each output it is the 7-day average traded volume ÷ what the base produces per day, and for each recipe input the traded volume ÷ what the base needs per day. The lowest counts. (O) or (I) shows which side limits it, and the tooltip names the material. Below 1, one base produces or needs more than the market trades.
- **Plots**: free plots on the planet, for planet rows. Sort by it to see the emptiest planets. Recipe rows run on a standard planet, so they show a dash.
- **Workforce**: the workforce the base needs per tier.
- **Profit, 30 days**: daily profit with the daily VWAP of each material's exchange over the last 30 days. Days without trades keep the last price. ASK, BID and fixed prices have no history.
- **⚠**: a material priced from a 7D or 30D VWAP whose bid or ask is more than 30% off that price. The popover lists the daily profit with those prices.

# Settings

- **Stock buffer**: storage for this many days of cargo; STO or STA are added, and a production building is dropped when the base would no longer fit.
- **Min market capacity** (next to the search above the table), **Logistics limit** and **Max jumps** hide rows; the line above the table counts the hidden rows per limit. Max jumps counts to the nearest exchange of your CX preference.
- **Show planets without workers or plots**: off by default, so planet rows are hidden when no new base fits (every plot taken and no ghost sites) or when the latest population report can't fill the base's jobs, counting free workers less the jobs already open. A planet with no population report counts as having no workers. Turn it on to see these rows; the Workforce column shows what is missing. Recipe rows are not checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Run setup again** opens the first-visit setup with its presets: Rookie (SCB, without weekly return and running cost), Standard (WCB) and Veteran (any ship or no limit).

# Profit chart

Above the table (beside the settings on wide screens), a chart shows the daily profit of the last 90 days for each industry. Each base counts by how much of its product the market trades (7-day average), and the many planets of one resource recipe count as one. Search to drill in:

- an industry (e.g. "Chemistry") shows its buildings;
- a building (e.g. "CHP") shows its products;
- a product (e.g. "SC") shows the recipes that make it.

The chart follows the table's settings and limits. It shows the 7 most traded lines and says how many more there are.

Every history chart has a time range (7, 30 or 90 days) and an aggregation (1, 3 or 7 days per point) at its top right, like the game's charts. A longer aggregation smooths out daily noise. The choice applies to all charts and is remembered.

# Search and tooltips

- The search above the table filters by industry, building or product ticker.
- Hover a column header for what it means, and a number for the napkin math behind it.

# Details

Expand a row to see two charts, then the full math below them. You can also copy the math as text, or open the row as a new plan with the same layout (logged in).

- **Profit**: revenue, running cost and daily profit, every line on one ȼ scale.
- **Market volume**: how many bases the market carries each day, from the CX traded volume. _Outputs_ is the scarcest output's traded volume ÷ what one base sells per day; _Inputs (bottleneck)_ is the same for the recipe input with the least volume per unit the recipe needs. It's the market capacity column, day by day.
