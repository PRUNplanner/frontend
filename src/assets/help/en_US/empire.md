The [Empire](/empire) page lets you check that your bases work as a whole before you build them. It puts all plans of one [[empire]] together and shows what they earn and cost per day, which materials the empire makes and needs, how much of a market it would take, and which recipes could use what's left over.

## Getting Started {#getting-started}

An empire groups your base [[plan|plans]] and holds your [[faction]] and [[area-permits|permits]]. Every new account has one, "My Empire". You create more, delete them and assign plans in [Management](/help/management).

- **Switch Empire** picks the empire to show. The one you pick also becomes your **Default Empire** (see [Profile](/help/profile#preferences)), so the page opens on it next time.
- An empire without plans shows three steps to your first base. Check faction and permits, find a planet in [Planet Search](/search) (a plan you create there is added to this empire), and set your prices on [Exchanges](/exchanges).
- If you have no empire at all, **Create empire** makes one with no faction and 1 of 2 permits used.

A progress bar shows while PRUNplanner calculates the plans. Prices come from the empire's [[exchange-preference|exchange preference]], with each plan's planet rules. An empire without a preference uses Universe · VWAP 30D. Details in [Exchanges & prices](/help/exchanges).

## Overview Numbers {#overview-numbers}

The tiles on top sum up the empire per day:

| Tile | How it's calculated |
| --- | --- |
| **Revenue** | The value of everything the empire sells, after netting (see below) |
| **Cost** | What the empire buys after netting, plus each plan's [[degradation]] (construction cost ÷ 180 per day) and [[production-fees\|production fees]]; also shown as % of revenue |
| **Profit** | Revenue − Cost, with the margin in % |
| **Profit / Area** | Profit ÷ the area all plans use |

*Netting:* the empire isn't a plain sum of its plans. For each material, what one plan makes and another uses cancels out first. Only the rest is sold or bought, at the average of the plans' prices for that material, weighted by each plan's amount. Workforce consumables count as materials here.

The bar below splits the revenue into production inputs, workforce, degradation, production fees and profit, each in % of revenue. When the empire makes a loss, the bar shows the parts as a share of cost instead, with a hatched part for the cost that revenue doesn't cover.

**Shipping** shows the tonnes and cubic metres per day your plans ship in (import) and out (export), added up over the plans.

## Plan List and Configuration {#plan-list}

The plan list shows every plan of the empire with its planets, [[cogc|COGC]], permits and **Profit (ȼ)**. Click a plan to open it. The footer adds up the permits your plans use. On wide screens, **Hide plan list** folds away the whole left column: the tiles, the plan list and Configuration.

### Configuration {#configuration}

The **Configuration** box holds the empire's **Name**, **Faction**, **Permits Total** (at least 2) and **Permits Used** (at least 1). **Save** stores them, and **Reload** drops your edits and loads the saved values.

Faction and permits change your production. A building whose expertise your faction favours gets a bonus of `1 + bonus × 2 × (3 − 2 × Permits Used ÷ Permits Total)`, so fewer used permits mean a larger bonus. The [glossary](/help/glossary#faction) explains factions.

When **Permits Used** differs from the permits your plans add up to, a warning tells you ("Mismatch Detected"). Take the right values from your in-game HQ buffer.

If the empire was saved in another tab or on another device in the meantime, you choose whether to overwrite it or reload the saved version.

## Material I/O {#material-io}

**Material I/O** (under **View**) lists every material of the empire with these columns:

- **Delta**: made minus used per day.
- **Production** and **Consumption**.
- **ȼ Delta**: the delta's value per day.
- **Produced by** and **Consumed by**: which plans make and use the most of it.

Expand a row to see the plans behind it. **Detail view** switches between producers and consumers and **Net per planet**, which adds up plans on the same planet into a surplus or a need.

These filters are shared with Analysis:

- **Display**: **All**, or **Loadbalance** for materials the empire both makes and uses.
- **Consumables**: **Show** or **Hide** workforce consumables.
- **Planets** (Material I/O only): **Summary**, or **Expand all** rows.
- **Materials** and **Planets**: show only the ones you pick.

Hover any [[ticker]] for its market card (see [Exchanges & prices](/help/exchanges#market-card)).

After each calculation, PRUNplanner also saves the empire's Material I/O to your account. That copy is what the API's "Empire material I/O" returns (see [API keys](/help/api_keys#url-builder)).

### Market Check {#market-check}

Above the table, **Market check on the empire's net flow** checks what the empire as a whole sells or buys against the exchange's trading. Made-and-used materials net out first, so they're only flagged on what reaches the market. Each plan's own [Plan check](/help/plan_check#market-check) still flags them.

| Chip | Flags |
| --- | --- |
| Red: "can't trade as planned" | No price; no trades in 7 days; no offers (when buying) or no buyers (when selling); 50 % or more of the exchange's average daily volume (30 days) |
| Amber: "large share of the market" | 10 % or more of the average daily volume |
| Muted: "other notes" | All exchanges, no exchange set; data older than 2 days |

Click a chip to see only the materials of that level, and click it again to see all of them.

The empire check only uses the *all-planets* rules of the empire's exchange preference. A planet exception still counts for the empire's prices, but the check doesn't see it, so check those materials in each plan's Plan check.

## Analysis {#analysis}

**Analysis** shows charts. The material charts follow the filters, and the plan charts don't.

- **Where each plan's revenue goes** shows the revenue split, margin and revenue per day for each plan. You see the top 10 plans by profit and every loss-making plan, and the rest go into "Other". These are each plan's own numbers, not netted.
- **Materials moving the most ȼ** shows the 10 materials with the most ȼ per day, what the empire buys on the left and what it sells on the right, in **ȼ / day** or **Units / day**. A button below shows all of them. Click a material to open it in Material I/O.
- **More charts** stays open or closed the way you left it in this browser. It holds **Plan Profit (ȼ)**, **Material Profits (ȼ)**, **Material Costs (ȼ)**, **Net Production**, **Net Consumption**, **Exclusive Production** (made but never used in the empire) and **Exclusive Consumption** (used but never made).

## Production Opportunities {#production-opportunities}

**Production Opportunities** looks for [[recipe|recipes]] that could use what your empire has left over. It lists every recipe with at least one input the empire has a positive delta of, sorted by the share of inputs in surplus, then by **Potential Batches**.

The three tiles count them:

| Tile | Meaning |
| --- | --- |
| **Opportunities** | Every input is in surplus, enough for at least 1 batch per day |
| **Delta Required** | Every input is in surplus, but not enough for 1 batch per day |
| **Material Missing** | At least one input isn't in surplus |

**Potential Batches** is how many runs of the recipe per day your surplus covers. For each input, PRUNplanner divides the daily surplus by the amount the recipe needs and takes the lowest result. It doesn't account for recipe time, how many buildings you'd need, or their efficiency. Read it as "how much input is there", not "how much you can make".

For full matches, **Sell Inputs** and **Sell Outputs** compare selling the inputs as they are with selling what the recipe would make from them (sell price × amount × batches). The better one is green. Prices are sell prices from the empire's exchange preference, all-planets rules only. The list uses the unfiltered Material I/O.

> [!tip]
> Before you build for an opportunity, open the market card of its outputs, because a thin market can't take the extra amount. [Production Chains](/help/tools_production_chain) plans the buildings it would take.
