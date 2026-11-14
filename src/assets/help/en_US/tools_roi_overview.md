Use Recipe ROI to shortlist buildings and recipes before you plan a base. It ranks every production [[recipe]] by what a base full of its building would earn. Then check the winners on a real planet in a [plan](/help/plan_layout).

The page was built with input from Lowstrife, MemoryAlpha and Laaxus of the PCT and Prosperous Universe Discord communities.

## What the page calculates {#what-it-calculates}

For each production building, PRUNplanner builds a plan with one fixed layout of that building (see [Layouts](#layouts)). It runs that plan once per recipe, with the building running only that recipe. Every row is one building and one recipe, and PRUNplanner calculates it with the same engine as your own plans.

Every plan uses the same setup:

| Setting | Value |
| --- | --- |
| Planet | Montem (OT-580b), with its [[production-fees\|production fees]] and [[fertility]] |
| [[cogc\|COGC]] program | the building's own [[expertise]], +25 % |
| [[experts\|Experts]] | 5 in every expertise, so +28.4 % for the building's own |
| Workforce | fully housed by the layout's [[habs\|habitations]] |
| Prices | your exchange preference (see below) |

Montem's production fees are part of every profit on this page, so a recipe can earn more on a planet whose governor charges less. Fertility only matters for ORC, which PRUNplanner calculates at Montem's fertility.

The page leaves out the extraction buildings RIG, EXT and COL and the farm FRM, because their output depends on the planet. For RIG, EXT and COL, use [Resource ROI](/help/tools_resource_roi_overview). FRM has no page like this.

The page calculates on its own when you open it, and a progress bar **Calculating Building Recipe ROI** counts through the buildings.

## Layouts {#layouts}

Each building has one stored layout: a number of production buildings plus the habitations and storage they need. PRUNplanner keeps these layouts in a fixed table and doesn't recalculate them for your prices. Together with the 25 area of the [[core-module|core module]], each layout uses 450 to 500 area, so it fits one base of 500 area.

The **Optimal Setup** column shows the layout, for example `11x TNP, 9x HB3, 1x STO`. The production building comes first, then the habitations and storage.

## Exchange preference {#exchange-preference}

**CX Preference** in the header picks the [[exchange-preference|exchange preference]] the prices come from. PRUNplanner buys inputs and workforce consumables at the buy price and sells outputs at the sell price (see [Buy, Sell or Both](/help/exchanges#buy-sell-or-both)).

> [!warning]
> Picking an exchange preference here also makes it your default exchange preference for every page, the same as setting it in your profile. The page recalculates at once.

"None - Universe 30D" means no exchange preference, so every price is the [[universe|Universe]] 30-day [[vwap|VWAP]].

## Columns {#columns}

The table shows 50 rows per page. Click a numeric column's header to sort by it.

| Column | What it shows |
| --- | --- |
| **Building** | the production building |
| **Optimal Setup** | the stored layout (see [Layouts](#layouts)) |
| **Recipe Output** | the recipe's outputs, as material tiles |
| **Recipe Input** | the recipe's inputs, as material tiles |
| **COGC** | the program the plan runs with, which is the building's expertise |
| **COGM** | opens the **Cost Of Goods Manufactured** breakdown of the recipe ([[cogm\|COGM]]) |
| **Plan Cost (ȼ)** | what it costs to build the whole layout |
| **Daily Profit (ȼ)** | what the whole layout earns per day |
| **Profit/Area (ȼ)** | daily profit per unit of area used |
| **Plan ROI (d)** | days until the profit has paid for the build |

The daily amount on a material tile is the recipe amount × buildings × runs per day × 1.25 (the COGC bonus). It leaves out the experts and workforce efficiency, so it's lower than the flow behind the profit next to it.

## How the numbers are made {#calculation}

- **Daily Profit (ȼ)** = value of the outputs at the sell price − inputs and workforce consumables at the buy price − [[degradation]] − production fees. Degradation is the construction cost of the production buildings ÷ 180 per day.
- **Plan Cost (ȼ)** = construction materials of the whole layout at the buy price: production buildings, habitations, storage and the core module.
- **Profit/Area (ȼ)** = Daily Profit ÷ area used, core module included.
- **Plan ROI (d)** = Plan Cost ÷ Daily Profit. It's green when the plan pays back. When it never does (no profit), the column shows **never** in red.

Your plans run the same formulas. For the base view of [[profit]] and [[roi|ROI]], see [Plan results](/help/plan_results).

## Filters {#filters}

Above the table:

- **Building**, **COGC**, **Output** and **Input** each take one or more values, and you can search them. **Output** and **Input** keep the recipes that make or use any of the picked materials.
- **Positive ROI** hides the recipes that lose money.

> [!tip]
> To find what to make from a material you already produce, pick it under **Input**. To see who makes a material you need, pick it under **Output**.
