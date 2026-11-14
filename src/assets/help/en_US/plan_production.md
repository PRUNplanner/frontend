Production is where you add buildings, set how many you build, queue [[recipe|recipes]] and compare recipes before you swap one. It lists the plan's buildings and the orders each one runs. The building and order figures use the same prices and efficiency as the [results](/help/plan_results).

## Adding buildings {#adding-buildings}

The building select above the list offers every production building that isn't in the plan yet. Picking one adds it with a count of 1 and no recipe.

**Match COGC** limits the select to buildings whose [[expertise]] matches the plan's [[cogc|COGC]] program. With the program set to **None** or to a workforce program (Pioneers to Scientists), no building matches and the list is empty. Untick it to see all buildings again.

With **Plan suggestions** on (in [Profile](/profile)) and enough plans on the planet, the select starts with a "Popular on …" group, most planned buildings first, followed by **All buildings**.

For extraction, click a resource in **Planet** instead. That adds the right extractor with that resource's recipe (see [Base setup](/help/plan_base#resources)). An empty plan can also start from the planet's typical setup, as described in [Layout](/help/plan_layout).

The line above the buildings counts them ("… buildings · … units · … recipes"). **Collapse all** and **Expand all** fold or open every building.

## The building row {#building-row}

Each building has one row with the columns **Building**, **Count**, **Eff.**, **ȼ / day** and **Area**.

| Column | What it shows |
| --- | --- |
| **Building** | The name. Click it to fold or open its orders. A folded row shows the tiles of what it makes. Folds last for this visit only. |
| **Count** | How many you build. At 0 the row stays, with a red left edge, and the building makes, uses and costs nothing. |
| **Eff.** | The building's [[efficiency\|efficiency]]. Hover it to see each factor. |
| **ȼ / day** | What all buildings of this row earn per day (see below). |
| **Area** | The building's area × count. |

Under the name, the building's expertise is green with ✓ when the plan's COGC program lifts it, and red with ✗ when it doesn't. After it come the other factors that change the efficiency: the number of experts ("3 experts"), Faction, HQ (Corp. HQ), Fertility, and COGC for a workforce program. At 0 % the reason comes first in red: "Planet not fertile", "No workforce housed" or the factor that is 0. [Base setup](/help/plan_base#efficiency) explains how each factor works.

A building's **ȼ / day** is:

- its own inputs and outputs per day, netted within the building, with outputs at the sell price and inputs at the buy price,
- minus its workforce's consumables at the buy price,
- minus 1/180 of its construction cost (degradation),
- minus its [[production-fees|production fees]],
- all times the count.

Workforce costs follow the plan's habitations and luxuries, so workers without a bed and luxuries you've turned off cost nothing. A building always pays its own workers' consumables, even when the plan makes them itself.

Where the production part is narrow, efficiency and area move under ȼ / day as "ȼ/day · … · area …".

The trash icon deletes the building at once, without asking. You can undo it with Ctrl+Z (Cmd+Z on a Mac) or **Undo** in the "Building removed" message.

## Orders {#orders}

A building runs its orders one after another, then starts over. Each order row shows:

- the amount, which is how many runs of the recipe the order has each time round;
- the recipe, as its inputs and outputs (click it to [change it](#changing-a-recipe));
- its runtime: the recipe's time × amount ÷ the building's efficiency;
- its share of the building's time: its runtime ÷ the runtime of all orders;
- its part of the building's **ȼ / day**;
- **COGM** (see [COGM](#cogm));
- delete, which doesn't ask first ("Recipe removed", with Undo).

An order's ȼ / day is the recipe's ȼ per building and day (as in the [recipe picker](#changing-a-recipe)) × its share of the time × the count. That way the orders split the building's figure by their time.

When the orders don't use each other's outputs, their sum equals the building's figure. When they do, the building nets those materials and the orders don't, so the sums differ. An order that never runs (0 % of the time) shows "—". At 0 % efficiency all orders show "—", while the building still shows its fixed costs (degradation and any housed workforce) as a loss.

**+ Recipe** adds a new order, and a building can order the same recipe twice. A building without orders shows **No Active Recipes**. With **Plan suggestions** on and planet insights, it also shows **Most planned here:** with the planet's most planned recipe mix, its share of plans and **Add**.

> [!tip]
> Use the amounts to balance a chain inside one building: the share column shows how the building's time splits. Doubling an order's amount doubles its runtime, so it gets a larger share and the other orders a smaller one.

## Changing a recipe {#changing-a-recipe}

Click an order's recipe to open the picker under it (**Change recipe**, "replacing …"), or **+ Recipe** to add a new order. Only one picker is open at a time.

Click a row or press Enter to pick it. ↑ and ↓ move through the list, and Esc or a click outside closes it. On a phone, the picker opens as a sheet from the bottom and shows **Makes** (with the runtime under it), **From** and **ȼ / day**.

After a change, a line under the row says what changed ("Replaced … with …." or "Added … as a new order."), with **Undo**.

The ȼ figures in the picker are *per building and day*: it's for one building that runs only this recipe at its current efficiency. The footer says **ȼ per building and day**.

| Column | What it shows |
| --- | --- |
| **Makes** | The outputs of one run. |
| **From** | The inputs of one run, with a line under them (see below). |
| **Runtime** | One run at the building's efficiency. |
| **ȼ / day** | Outputs at the sell price minus inputs at the buy price, × runs per day, minus 1/180 of the construction cost, the workforce's consumables and the production fee (the planet's fee × efficiency). While you change a recipe, "… vs now" compares it with the one you replace. |
| **ȼ / area** | ȼ / day ÷ the area per building of a standard layout for this building, as in [Recipe ROI](/help/tools_roi_overview). That area is its own area plus its share of habitations, storage and the 25 of the core module. A building without a standard layout counts its own area + 25. This way you can compare recipes across buildings. |
| **Payback** | The building's construction cost ÷ its ȼ / day, without habitations. "never" when it makes no profit. |
| **Plans** | The share of plans on this planet with this building that run the recipe. "< 5 %" when it's below 5 % or fewer than 10 players use it. |

The **Plans** column and the **Sort by** switch only show with **Plan suggestions** on and a planet with enough plans. That means at least 15 plans from at least 10 players, counting players active in the last 90 days and plans changed in the last 180.

**Sort by** orders the rows by **ȼ / day** (default) or **Popular** (most planned first). When you change a recipe, the current one comes first, marked and not selectable. When you add one, the recipes the building already runs come last.

The line under the inputs joins:

- "uses … from the plan": the inputs the plan already makes;
- "feeds …": plan buildings whose orders use an output of this recipe;
- **current recipe** or **in plan**.

### Dependency note {#dependency-note}

When the plan uses an output of the recipe you replace, a warning shows above the list: "Your … turn this … into …. Replacing it means buying … a day. To keep both, use “+ Recipe”." If your workforce is what uses it, the note says that instead.

The amount is how much of that material the plan uses per day in total, taken from Material I/O. It's the whole amount, even when other orders make some of it too.

> [!tip]
> Want to try a recipe without losing the old one? Use **+ Recipe** to add it as a second order and compare the building's ȼ / day, then delete the one you don't want.

## COGM {#cogm}

**COGM** on an order opens its [[cogm|cost of goods manufactured]]. It shows what one run costs, and so what each unit of output costs, at this plan's efficiency and prices.

- **Parameters**: the recipe's runtime at this efficiency, its share of a day (**% / day**), **Efficiency**, **Degradation** (the building's construction cost ÷ 180 per day) and **Production fee / run** (the weighted fee × the recipe's base time, independent of efficiency).
- **Cost** of one run: each input at the buy price (**Input Total**), the **Workforce** share (the building's daily workforce cost × the run's share of a day), the degradation share and the production fee. Together they make **Total Cost**.
- Per output: **Cost Total** puts the whole cost on that output (cost ÷ its amount), while **Cost Split** spreads it over all outputs by quantity (cost ÷ all outputs' amounts).

Prices come from the empire's [[exchange-preference|exchange preference]]. If it has one, **Use as buy price on all planets** turns the COGM into a fixed buy price for every plan that uses that preference (see [Exchanges](/help/exchanges#fixed-prices-and-cogm)).
