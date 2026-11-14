Use **Planet Search** to find a planet you already know, or the best places for new production. It's the place to start before a [[plan]]. You filter every planet by resources, conditions, [[COGC]], infrastructure and [[jumps]], then compare the best few side by side. It works without an account, and the results update as soon as you change a filter.

## Where to find it {#where-to-find-it}

Planet Search is in the Planning group of the navigation, and on the home page. When you're logged out, a line under the title says it's free and needs no account. You only need to log in for distances to your own plans and to create a plan from a result.

Other pages lead here too. [Production Chains](/help/tools_production_chain) opens Planet Search from an extraction step's planet picker and from a Location finding, and the Empire page links here while you set up your first plans.

## Name or ID {#name-or-id}

Type part of a name or ID in the box at the top (**Planet or system name, or ID**). It matches the planet's natural ID ("OT-580b"), its name ("Montem"), its in-game name ("Antares II e") and its system's name, so "Antares II" lists every planet of that system.

A name search shows every planet that matches, even when your filters would hide some. A note above the results then says your filters are paused.

- *Apply filters* combines the name with your filters again. The note then says how many matching planets the filters hide. It also offers up to three changes that would show more of them, each with the number of planets it adds.
- *Show all* pauses the filters again.

Your filters are kept either way. Once you clear the name, the next name search starts with them paused again. If the filters hide none of the matches, there's no note.

> [!tip]
> Looking up a planet someone mentioned in chat? Type its name. You don't have to clear your filters first.

## Materials {#materials}

You can search for one or more groups of materials.

- Each group matches **any of** or **all of** its materials. A new group starts as **any of**.
- The groups combine with **all groups** (the default) or **any group**.
- **+ add material…** adds a material to a group, and each option shows how many planets you'd get with it. × removes a material, **Remove** removes a whole group, and **+ Add group** adds one.

That covers searches like "(FEO and H2O) or (MAG and O)": two **all of** groups, combined with **any group**.

You can give every material a minimum daily [[extraction]] ("min … /day"). That's the planet's daily rate for the material, and a plan builds its EXT, RIG or COL recipe there from it, so a higher minimum keeps the planets where each extractor yields more. The "(max …)" next to it is the highest daily extraction of that material on any planet, so you know what's possible. A minimum belongs to the material, not the group. If the same material is in two groups, they share one minimum.

## Planet conditions {#planet-conditions}

Pick **Rocky** and/or **Gaseous** planets, and whether they must be **Fertile** (allow farming). A new search starts with Rocky planets only. One surface always stays ticked.

[[fertility|Fertility]] only matters for farms (FRM and ORC). On a planet without it, PRUNplanner sets their efficiency to 0, so they produce nothing there.

Gravity, pressure and temperature only matter through the [[extra-building-materials|extra building materials]] they require. Under **Accept extra building materials**, tick the ones you're willing to ship in:

| Material | Needed for |
| --- | --- |
| MGC | **Low gravity** |
| BL | **High gravity** |
| SEA | **Low pressure** |
| HSE | **High pressure** |
| INS | **Low temperature** |
| TSH | **High temperature** |

These materials matter because a plan on that planet adds them to the construction of every building, so they raise its construction cost. For example, a building with an area of 20 needs 20 × 4 = 80 MCG on a rocky planet, and on a low-temperature planet another 20 × 10 = 200 INS.

Planet Search hides planets that need any material you didn't tick. With none ticked, you only see planets that need none of them. The surface material (MCG on rocky planets, AEF on gaseous ones) is always needed and isn't part of this filter.

## COGC and infrastructure {#cogc-and-infrastructure}

**Active COGC program** keeps planets that run one of the ticked programs right now, meaning at the moment you opened the page. The list has every program: the advertising programs for each industry and the workforce programs for each tier.

A program matters because it speeds up production in a plan: an advertising program speeds up buildings of its expertise by 25 %, and a workforce program speeds up buildings that employ that tier by 10 %. In the game, the residents (players with a base on the planet) vote on the program, and the winning program runs for a week, so the program you see here can change later.

**Infrastructure** is a separate filter, and a stricter one. A planet must have every ticked building.

| Code | Building |
| --- | --- |
| LM | **Local Market** |
| COGC | **Chamber of Commerce** |
| WAR | **Warehouse** |
| ADM | **Administration Center** |
| SHY | **Shipyard** |

The pills show the code. Hover one for the name.

## Counts and Any {#counts-and-any}

The number next to an unticked option tells you how many planets you'd get by ticking it. You'll see the same counts in the add-material list, next to the exchanges and next to your plans.

Planet conditions, Accept extra building materials, Active COGC program and Infrastructure each have an *Any* button in their header. It sets that section to the state that hides the fewest planets, and shows how many planets that gives:

- Planet conditions: both surfaces, fertility not required.
- Accept extra building materials: all accepted.
- Active COGC program: none ticked.
- Infrastructure: none ticked.

When the section is already there, the button is highlighted and can't be clicked.

## Distance {#distance}

Under **Distance**, pick **Exchanges** and/or plans from one of your [[empire|empires]]. A planet must be within **Max jumps** of every pick. Jumps count between star systems, so every planet of a system has the same distance, and a planet with no jump route to a pick doesn't pass. For example, with NC1 and one of your plans picked and Max jumps at 5, a planet 3 jumps from NC1 and 6 from your plan is hidden. Max jumps runs from 0 to 30 and starts at 10. It only matters once you pick something.

- **Plans from empire** picks the empire whose plans you can choose. It starts at the empire that holds most of the plans in your search, otherwise your current or default empire. Changing the empire drops the plans you picked.
- The plan list has a filter box where you can type a plan name, planet ID or planet name.
- Each picked plan shows as a chip you can remove, and gets its own jumps column in the results.

AI1, CI1, IC1 and NC1 have their own jumps columns too, and you can hide them under **Columns**.

Distances to your own plans need a login. When you're logged out, the section says so and offers **Log in**. Planet Search drops plans in a link someone else shared, because they aren't yours.

> [!tip]
> To find a second base near your first, pick its plan under Distance and set Max jumps to 2 or 3. When nothing matches, the suggestions above the results offer a few more jumps.

## Active filters and Reset {#active-filters-and-reset}

Every active filter shows as a chip above the results, and × on a chip removes only that filter. You get one chip per material group (one for all groups when they combine with **any group**) and one per infrastructure building. There's one chip for all COGC programs, one for the accepted extra materials and one for all distance picks together. The surface gets a chip when it isn't Rocky only. Max jumps alone makes no chip.

**Reset** at the top right goes back to the starting filters and the default order. It keeps your compare pins, the view and your columns. On phones it's in the "⋯" menu.

When no planet matches, the page says **No planets match these filters. Try one of these:** and offers up to three changes, each with the number of planets it would give, most first:

- remove one of your chips;
- **Include gaseous planets**;
- **Accept all extra building materials**;
- a higher Max jumps (3 more, up to 30), when you picked a distance.

Don't worry, this only means your filters together leave no planet. Click a suggestion to apply it.

If two changes give the same result, only one shows. A name search's note can also offer "Any surface, fertile or not", "Any COGC program" and "Any infrastructure".

## Filter panel {#filter-panel}

The panel heading counts your active filters. On screens 1,024 px and wider, the panel sits beside the results. The double arrow at its top collapses it to a narrow rail and expands it again. Below 1,440 px it starts collapsed on every visit, so the results get the room. From 1,440 px on, the browser remembers whether you collapsed it.

On small screens, the *Filters* button opens the filters in a drawer, and *Show n planets* at its bottom closes it.

## Results {#results}

The heading above the results reads "n of total planets". Next to it you switch between **List**, **Matrix** and **Chart**. Long lists load 100 rows at a time as you scroll.

## List and Matrix {#list-and-matrix}

The **List** shows the searched materials as tiles next to the other resources. It also has fertility, extra building materials, COGC and infrastructure, and the jumps columns.

The **Matrix** gives every material found in the results its own column. The searched ones come first (alphabetically), then a blue divider, then the others. A cell's shading gets stronger with higher daily extraction, compared with the highest of that material on any planet. A colour strip on top shows the material's category. Hover a header for "on n of total results", or a cell for its value and its share of the maximum.

> [!tip]
> The Matrix is the quickest way to spot planets with two or three useful resources at once. Search one material, then scan the other columns.

## Chart {#chart}

The **Chart** plots the results by distance and output.

- **Across (X)**: the jumps to your Distance picks, or to the farthest one if you picked several. Without a pick, it's the jumps to one exchange, the one closest to the plotted planets overall (fewest jumps in total). The axis names it, e.g. "jumps to IC1 · nearest exchange".
- **Up (Y)**: the daily extraction of a searched material. With two or more searched materials, a picker chooses which one (the first by default). Without a searched material, Y is fertility.
- **Dot size**: fertility, scaled within the range shown in the caption. This only applies when you search a material.

The **best trade-off** planets are the ones no other result beats on both counts: none is closer *and* richer. The chart highlights them and joins them with a dashed line. Everything below and right of that line is beaten by one of them.

For example, say planet A is 2 jumps away with 10 /day, B is 4 jumps away with 25 /day, and C is 5 jumps away with 20 /day. A and B are best trade-offs: no result is closer than A, and none within 4 jumps is richer than B. C isn't, because B is both closer and richer.

**Colour by** switches between **Best trade-off** and **COGC**. With COGC, the six most common running programs get their own colours, and the rest share one colour: "other or no COGC program", or "no COGC program" when no other program runs.

On screens 1,024 px and wider, hover a dot for its details, click it to pin it for Compare, and double-click it to create a plan (when you're logged out, you log in first). On touch and narrow screens, tap a dot for its details.

The list beside the chart ranks the same planets by Y, with "+" and ☆ on each row. The chart plots up to 300 results, the first ones by the current sort, so **Sort** decides which planets make it on. Below the chart, the page counts the planets it couldn't place: without a route, without the material, or not fertile.

## Reading the results {#reading-the-results}

- **Material tiles**: the colour bar compares the planet's daily extraction with the highest of that material on any planet. Red is below a quarter, then orange, then yellow, and green above three quarters. Hover the bar for the value, the maximum and the percentage. For example, if the richest planet has 40 FEO /day, a planet with 25 is at 25 ÷ 40 = 62.5 %, so its bar is yellow.
- **Fert. %**: fertility as the game shows it, or "—" when the planet isn't fertile. Sorting puts planets that aren't fertile last.
- **Extra building materials** (the construction icon): the materials a base on this planet needs. It always lists MCG ("Rocky surface") or AEF ("Gaseous surface"). Hover any one to see why, e.g. "Low gravity".
- **COGC · Infra**: the running COGC program ("—" for none) and the planet's infrastructure as LM, COGC, WAR, ADM and SHY.
- **Jumps columns**: "—" means there's no jump route. Hover it to read "Colony Ship Required".

## Plots {#plots}

Every base takes one [[plots|plot]] of its planet, and so do HQs and [[planetary-projects|planetary projects]] (COGC, warehouse, local market and the others).

- A planet with every plot taken and no [[ghost-sites|ghost sites]] carries a red ⊘ icon next to its name, whether or not the Plots column is on. Hover it for the details and the date.
- The **Plots** column is off by default; turn it on in **Columns**. It shows the free plots out of the planet's total, as FIO last saw the planet (hover for the date), and marks a full planet red **Full**.
- Some planets allow ghost sites. A full planet that allows them shows an amber **Full · ghost sites**, and the tooltip counts the ghost sites so far.
- **plots unknown** means PRUNplanner hasn't read the planet's plots yet.
- Sort by the column to see the planets with the most free plots first. Planets with unknown plots go last.

Full planets keep their place in the results. Plots aren't a filter.

> [!warning]
> Ghost sites are for new players. In the game they occur on starter planets. A new player who starts there can still settle once every plot is taken. If your starting planet was elsewhere, you can't settle a planet with **Full · ghost sites**.

## Sorting {#sorting}

Click a column header to sort by it, and click again to reverse. Materials, fertility and plots sort high first. The name and jumps sort low first.

Shift+click another header to add it as a tiebreaker, up to four columns (the headers then show 1, 2, 3). For example, "NC1 jumps, then FEO /day" lists the richest FEO planets at each distance. Shift+click a column already in the chain to reverse it, and a second time to remove it.

The **Sort** menu does the same without a keyboard: **Sort by**, **Then by**, **Low first** and **High first**. If you haven't set a sort of your own, the menu shows the default order: the first searched material (high first), otherwise the jumps to the first distance pick, otherwise the name. When a sorted column goes away, such as a material you no longer search or a plan you unpicked, the page drops that sort.

## Columns {#columns}

The **Columns** menu hides and shows columns: **Fertility**, **Plots**, **Other resources** (List only), **Extra building materials**, **COGC · Infrastructure** and the four exchange jumps columns. It isn't shown in the Chart.

In the Matrix it also lists every found material except the searched ones (those always show), each with how many results have it. **All** and **None** show or hide them at once.

**Reset** in the menu goes back to the default columns, which is everything except Plots.

## Compare {#compare}

On screens 1,024 px and wider, pin up to four planets with ☆ to compare them side by side in the tray at the bottom. Its header collapses and expands the table.

These rows are coloured from best to worst, with the best value in bold:

- fertility;
- the daily extraction of each searched material;
- the jumps to each of your distance picks;
- **Free {tier} workers** for each of the five tiers: free workers minus the jobs already open, from the planet's latest [[popr|population report]], which the game publishes weekly.

For example, 1,000 free technicians with 400 open jobs show as 600. The figure never goes below 0, even when there are more open jobs than free workers.

A planet without a value ranks worst. The other rows (extra building materials, other resources, COGC, infrastructure, and the jumps to AI1 / CI1 / IC1 / NC1) are plain text, and a row where the planets differ is tinted blue.

Pins are part of the link, but the tray only shows on larger screens.

> [!tip]
> The free-workers rows tell you how many workers a new base could hire on each planet, as of its latest population report.

## Saving and sharing {#saving-and-sharing}

- **Copy link**: the address bar always holds the whole search (filters, sort, view and compare pins), so the link shares exactly what you see.
- **Save search**: stores the current filters and view under a name in this browser. The name starts as the chip labels, or "All planets". A saved search keeps neither the sort nor the pins.
- **Saved** loads a saved search. In **Manage** you can rename, load or delete them. Delete doesn't ask first.
- "+" on a row opens a new plan for that planet in a new tab, so your search stays where it is. Without an account, "+" asks you to log in first and then opens the plan.

On phones, the saved searches, **Copy link** and **Reset** are in the "⋯" menu.

### What this browser remembers {#what-the-browser-remembers}

Some things stay in this browser only, not in your account: your saved searches, hidden columns and materials, whether the Plots column is on, the collapsed filter panel (1,440 px and wider), and the last view. A visit without a link opens in your last view. A link opens in its own view.

> [!tip]
> To keep a search on another device or share it with your corporation, use **Copy link** rather than **Save search**.

### Link parameters {#link-parameters}

A link holds only what differs from the defaults. You can also write one by hand:

| Parameter | Meaning | Example |
| --- | --- | --- |
| `q` | name or ID | `q=Montem` |
| `m` | material groups | `m=any:FEO\|MAG,all:H2O` |
| `g` | groups combine with any group | `g=any` |
| `d` | minimum per day | `d=FEO:15` |
| `cogc` | COGC programs | `cogc=ADVERTISING_METALLURGY` |
| `infra` | infrastructure | `infra=LM,WAR` |
| `fert` | fertile only | `fert=1` |
| `surf` | surfaces, r and/or g | `surf=rg` |
| `x` | accepted extra materials | `x=INS,SEA` |
| `ref` | distance picks | `ref=cx:NC1` |
| `j` | max jumps | `j=5` |
| `sort` | sort chain | `sort=mat:FEO:desc` |
| `view` | `matrix` or `chart` | `view=chart` |
| `pin` | compare pins | `pin=OT-580b` |

The page drops values it doesn't recognise.

## When the planets don't load {#errors}

If loading fails, the page says "The planets couldn't be loaded." and shows a **Retry** button. After too many requests, it asks you to wait a few seconds before you try again.
