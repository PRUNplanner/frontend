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
- **Cargo / day**: the larger of the weight and volume the base moves in or out per day.
- **Market capacity**: 7-day average traded volume of each output ÷ the base's output per day, the lowest output. Below 1, one base produces more than the market trades.
- **Workforce**: the workforce the base needs per tier.
- **Profit, 30 days**: daily profit with the daily VWAP of each material's exchange over the last 30 days. Days without trades keep the last price. ASK, BID and fixed prices have no history.
- **⚠**: a material priced from a 7D or 30D VWAP whose bid or ask is more than 30% off that price. The popover lists the daily profit with those prices.

# Settings

- **Stock buffer**: storage for this many days of cargo; STO or STA are added, and a production building is dropped when the base would no longer fit.
- **Min market capacity** (next to the search above the table), **Logistics limit** and **Max jumps** hide rows; the line above the table counts the hidden rows per limit. Max jumps counts to the nearest exchange of your CX preference.
- **Run setup again** opens the first-visit setup with its presets: Rookie (SCB, without weekly return and running cost), Standard (WCB) and Veteran (any ship or no limit).

# Search and tooltips

- The search above the table filters by industry, building or product ticker.
- Hover a column header for what it means, and a number for the napkin math behind it.

# Details

Expand a row to see two 30-day charts of revenue, running cost and daily profit, then the full math below them. You can also copy the math as text, or open the row as a new plan with the same layout (logged in).

- **Absolute**: every line on one ȼ scale, to see how they relate.
- **Each line in its own range**: every line runs from 0 (its lowest value in the 30 days) to 1 (its highest), so a small line's swings show next to large ones. The labels still show ȼ.
