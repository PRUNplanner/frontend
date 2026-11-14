Use Resource ROI to pick a planet for an extraction base. It finds every planet where a resource can be extracted and works out what a base full of RIG, EXT or COL earns there. When a planet looks good, open it as a plan to fine-tune it.

## How to use it {#how-to-use}

1. Pick the resource under **Select Resource** (36 planet resources, ALO through ZIR).
2. Check **CX Preference**, which decides the prices (see [Prices](#prices)).
3. Press **Search & Calculate**.

PRUNplanner first searches every planet with that resource, showing "Awaiting backend response". Then it calculates each one, with a progress bar that reads **Calculating resource ROI for planets.** You get the results sorted by daily yield, highest first.

If you change the resource or the exchange preference, the table doesn't recalculate on its own. Press **Search & Calculate** again.

## What it calculates {#what-it-calculates}

On each planet with the resource, PRUNplanner looks at every extraction building whose recipes there produce it. For each of those buildings it builds a plan from the building's stored layout (see [Optimal Setups](#optimal-setups)). So each row is one planet and one building that can extract the resource there.

Every plan uses these settings:

| Setting | Value |
| --- | --- |
| Planet | the real planet, with its resource concentration, [[extra-building-materials\|extra construction materials]] and [[production-fees\|production fees]] |
| [[cogc\|COGC]] program | Resource Extraction, on every planet |
| [[experts\|Experts]] | 5 in every expertise |
| Workforce | fully housed by the layout's habitations |

> [!warning]
> Every plan assumes the planet runs the Resource Extraction program, whatever it really runs. The **COGC** column shows the program the planet has today. Where that's different, the real numbers are lower.

## Columns {#columns}

The table shows 50 rows per page. The planet column stays pinned, and on narrow screens the table scrolls sideways. Click a numeric column's header to sort by it.

| Group | Column | What it shows |
| --- | --- | --- |
| | **Planet** | name and ID. The link opens a new plan on that planet |
| **Production** | **Building** | RIG, EXT or COL |
| | **Daily** | units of the resource the layout extracts per day |
| | **% Max.** | Daily as a percentage of the best Daily in the results, with a bar |
| **Cost / Profit** | **COGM** | opens the cost breakdown per unit ([[cogm\|COGM]]) |
| | **Plan Cost (ȼ)** | what it costs to build the whole layout on that planet |
| | **Daily Profit (ȼ)** | what the layout earns per day, with a bar scaled to the best row |
| | **Plan ROI (d)** | Plan Cost ÷ Daily Profit, in days |
| **Planet** | **POPR** | the planet's latest population report (see [POPR](#popr)) |
| | **COGC** | the program the planet runs today, or "—" if it has none |
| | **Environment** | the extra construction materials the planet needs, as tiles |
| | **Infrastructure** | LM, COGC, WAR, ADM and SHY, where the planet has them |
| **Distances** | AI1, CI1, IC1, NC1 | [[jumps]] to each exchange. The nearest one is bold in its exchange colour, and "—" means there's no route |

Daily Profit and Plan Cost follow the same rules as [Recipe ROI](/help/tools_roi_overview#calculation). Outputs count at the sell price and consumables at the buy price, with [[degradation]] and the planet's production fees included.

**Plan ROI (d)** shows the raw number. A negative value means the plan loses money and never pays back. Its bar fills up as the payback approaches 20 days, so a longer bar means a slower payback.

## Filters {#filters}

- **Planet** and **Building** narrow the table to the one planet or building you pick.
- **Positive ROI** hides the plans that lose money.
- **Searched Material** shows the resource picked under **Select Resource**. If you change it without pressing **Search & Calculate**, the rows are still those of the earlier resource.

The chart below shows the same rows as the filtered table.

## Payback vs. distance {#chart}

After a search, **Chart** opens the **Payback vs. distance** chart under the table, and your browser remembers whether it's open. To make it taller or shorter, drag its top edge, or focus the edge and use the arrow keys.

- The horizontal axis is the plan ROI in days. The vertical axis is the jumps to the nearest exchange, or to the one you pick in **Distance to** (**Nearest CX** by default).
- A dot's size is its daily profit, and its colour is the exchange its jumps count to (the nearest one by default).
- Highlighted dots are the best trade-offs: no other planet both pays back faster and is closer.
- A line under the chart names the highlighted planets and their jumps. It also names the planet that earns the most per day, if that one isn't among them.
- Hover a dot to scroll its row into view.

Not every row becomes a dot. The chart leaves out rows that never pay back, have no route to the exchange, or take more than twice the fastest payback, and it counts them below the chart.

> [!tip]
> A planet a few jumps further out that pays back almost as fast is often the better base, since shipping to and from an exchange costs time and fuel every week.

## POPR {#popr}

The **POPR** button loads the planet's latest population report ([[popr|POPR]]) and opens it per workforce tier:

| Row | What it shows |
| --- | --- |
| **Total Population** | the tier's population figure from the report |
| **Free Population** | workers without a job |
| **Free Population %** | free workers as a percentage |
| **Unfilled Jobs** | jobs that bases on the planet have open |

If a planet has no report, the button turns into a red, disabled **No POPR** when you press it. Inside a plan, the POPR tool shows the same report with your plan's need next to it (see [Plan tools](/help/plan_tools)).

## Optimal Setups {#optimal-setups}

PRUNplanner uses a fixed table of layouts, the same one [Recipe ROI](/help/tools_roi_overview#layouts) uses:

- RIG: 35 RIG, 11 HB1, 1 STO
- EXT: 14 EXT, 8 HB1, 1 HBB, 1 STO
- COL: 22 COL, 11 HB1, 1 STO

Together with the core module, each one fits a base of 500 area.

## Prices {#prices}

**CX Preference** picks the [[exchange-preference|exchange preference]] the prices come from. "None - Universe 30D" uses the [[universe|Universe]] 30-day [[vwap|VWAP]].

> [!warning]
> Picking an exchange preference here also makes it your default exchange preference for every page.
