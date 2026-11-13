Resource ROI finds every planet where a resource can be extracted and calculates what a base full of RIG, EXT or COL earns there. Use it to pick a planet for an extraction base, then open that planet as a plan to fine-tune it.

## How to use it {#how-to-use}

1. Pick the resource under **Select Resource** (36 planet resources, from ALO to ZIR).
2. Check **CX Preference**: it decides the prices (see [Prices](#prices)).
3. Press **Search & Calculate**.

PRUNplanner first searches every planet with that resource ("Awaiting backend response"), then calculates each one; a progress bar shows **Calculating resource ROI for planets.** The results are sorted by daily yield, highest first.

Changing the resource or the exchange preference doesn't recalculate on its own: press **Search & Calculate** again.

## What it calculates {#what-it-calculates}

For each planet with the resource, PRUNplanner builds a plan for each extraction building whose recipes on that planet produce the resource, using that building's stored layout (see [Optimal Setups](#optimal-setups)). Each row is one planet and one building that can extract the resource there.

Every plan uses:

| Setting | Value |
| --- | --- |
| Planet | the real planet: its resource concentration, [[extra-building-materials\|extra construction materials]] and [[production-fees\|production fees]] |
| [[cogc\|COGC]] program | Resource Extraction, on every planet |
| [[experts\|Experts]] | 5 in every expertise |
| Workforce | fully housed by the layout's habitations |

> [!warning]
> Every plan assumes the planet runs the Resource Extraction program, whatever it really runs. The **COGC** column shows the program the planet has today; where it differs, the real numbers are lower.

## Columns {#columns}

The table shows 50 rows per page; the planet column stays pinned and narrow screens scroll sideways. Numeric columns sort with a click on the header.

| Group | Column | What it shows |
| --- | --- | --- |
| | **Planet** | name and ID; the link opens a new plan on that planet |
| **Production** | **Building** | RIG, EXT or COL |
| | **Daily** | units of the resource the layout extracts per day |
| | **% Max.** | Daily as a percentage of the best Daily in the results, with a bar |
| **Cost / Profit** | **COGM** | opens the cost breakdown per unit ([[cogm\|COGM]]) |
| | **Plan Cost (ȼ)** | what it costs to build the whole layout on that planet |
| | **Daily Profit (ȼ)** | what the layout earns per day, with a bar scaled to the best row |
| | **Plan ROI (d)** | Plan Cost ÷ Daily Profit, in days |
| **Planet** | **POPR** | the planet's latest population report (see [POPR](#popr)) |
| | **COGC** | the program the planet runs today, "—" without one |
| | **Environment** | the extra construction materials the planet needs, as tiles |
| | **Infrastructure** | LM, COGC, WAR, ADM and SHY, where the planet has them |
| **Distances** | AI1, CI1, IC1, NC1 | [[jumps]] to each exchange; the nearest one is bold in its exchange colour, "—" without a route |

Daily Profit and Plan Cost follow the same rules as in [Recipe ROI](/help/tools_roi_overview#calculation): outputs at the sell price, consumables at the buy price, [[degradation]] and the planet's production fees included.

**Plan ROI (d)** shows the raw number: a negative value means the plan loses money and never pays back. Its bar fills as the payback approaches 20 days, so a longer bar means a slower payback.

## Filters {#filters}

- **Planet** and **Building** narrow the table to the planets or buildings you pick.
- **Positive ROI** hides the plans that lose money.
- **Searched Material** shows the resource the table was calculated for.

The chart below shows the same rows as the filtered table.

## Payback vs. distance {#chart}

**Chart** (after a search) opens the **Payback vs. distance** chart under the table. Your browser remembers whether it is open. Drag its top edge, or focus the edge and use the arrow keys, to make it taller or shorter.

- Across: the plan ROI in days. Up: the jumps to the nearest exchange, or to the one you pick in **Distance to** (**Nearest CX** by default).
- Dot size is the daily profit; dot colour is the nearest exchange.
- Highlighted dots are the best trade-offs: no other planet both pays back faster and is closer.
- A line under the chart names the highlighted planets and their jumps, and the planet that earns the most per day if it isn't one of them.
- Hovering a dot scrolls its row into view.

Not every row becomes a dot. The chart leaves out, and counts below it, the rows that never pay back, have no route to the exchange, or pay back in more than twice the fastest payback.

> [!tip]
> A planet a few jumps further out that pays back almost as fast is often the better base: shipping to and from an exchange costs time and fuel every week.

## POPR {#popr}

The **POPR** button loads the planet's latest population report ([[popr|POPR]]) and opens it per workforce tier:

| Row | What it shows |
| --- | --- |
| **Total Population** | the tier's population figure from the report |
| **Free Population** | workers without a job |
| **Free Population %** | free workers as a percentage |
| **Unfilled Jobs** | jobs bases on the planet have open |

A planet without a report shows a red, disabled **No POPR**. The plan's POPR tool shows the same report with your plan's need next to it (see [Plan tools](/help/plan_tools)).

## Optimal Setups {#optimal-setups}

The layouts are a fixed table in PRUNplanner, the same one [Recipe ROI](/help/tools_roi_overview#layouts) uses:

- RIG: 35 RIG, 11 HB1, 1 STO
- EXT: 14 EXT, 8 HB1, 1 HBB, 1 STO
- COL: 22 COL, 11 HB1, 1 STO

With the core module each fills a base of 500 area.

## Prices {#prices}

**CX Preference** picks the [[exchange-preference|exchange preference]] the prices come from; "None - Universe 30D" uses the [[universe|Universe]] 30-day [[vwap|VWAP]].

> [!warning]
> Picking an exchange preference here also makes it your default exchange preference for every page.
