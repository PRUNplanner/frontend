The plan page is a grid of parts you can arrange to suit how you plan. This page explains the two layouts, how to customise one, how folding and tabs work, how the page behaves on a phone, and the plan suggestions PRUNplanner shows on the page.

## The parts of the page {#parts}

- **Base**: **Empire & prices**, **Planet**, **Workforce**, **Infrastructure** and **Experts**. See [Base setup](/help/plan_base).
- **Production**, with the tools as its tabs: **Construction**, **Supply**, **Visits**, **Repair**, **Profit**, **Plan check** and **POPR**. See [Production](/help/plan_production), [Plan tools](/help/plan_tools) and [Plan check](/help/plan_check). POPR is there only when you are logged in.
- **Material I/O** and **Material I/O totals**.
- The five results tiles: **Profit / day**, **Payback**, **Workforce %**, **Area** and **Storage**. See [Results](/help/plan_results).

Each part uses the room it gets: wider, it shows more side by side instead of growing taller. Experts fill as many per line as fit, and the [[workforce]] tiers sit next to each other. The layout is the same for all your plans.

## The Layout menu {#layout-menu}

The **Layout** button in the plan header picks the layout. It is there only when you are logged in; below 768 px it shows as an icon only.

- **Standard**: results on top, Base on the left, Production with its tools in the middle, Material I/O on the right. Standard never changes.
- **Custom Layout**: your own arrangement. It appears once you saved one. There is one Custom Layout, used for all your plans.

Customising starts from a copy: pick **Customise, starting from Standard…**, or **Customise Custom Layout…** while Custom Layout is in use. The customise item isn't offered below 768 px; layouts can still be switched there.

## Customise {#customise}

While you customise, the page shows its real content, but it isn't clickable. Each part's title bar carries a grip (⋮⋮), its size, the eye that hides it and its ⋯ menu. The results tiles get a title bar too. **Elements** opens beside the page.

The bar at the top has:

- **Arrangement**: **Wide** or **Phone**, see [Wide and Phone](#phone).
- **Columns** (4 to 24, Wide only) and **Gap** (8, 12, 16 or 24 px). Changing the columns keeps each part's share of the width.
- **Tinted parts**: a slightly lighter background on every part, for more contrast, in either layout and on every screen. It is kept as soon as you tick it.
- **Elements · N**: N parts are not placed in the arrangement shown.
- **Undo** (also Ctrl/⌘+Z), **Reset to Standard** (Wide as Standard, Phone automatic, and undoable), **Cancel** and **Save**.

**Cancel** (or Esc) asks "Discard your layout changes?" when you changed something; **Discard changes** drops them, **Keep editing** goes back. During a drag, Esc cancels only that drag. **Save** saves both arrangements as your Custom Layout. Saving Standard's copy over an existing Custom Layout asks first: **Replace Custom Layout** or **Keep editing**.

> [!tip]
> Hiding a part, changing a tab or resetting shows a message with **Undo**. You can also press Ctrl/⌘+Z at any time while you customise. There is no redo for the layout.

### Moving {#moving}

- Drag a part by its title bar. A dashed box marked **Lands here** shows where it lands.
- Its top lines up with the top of a part beside it; a yellow line says which. Hold Alt to place it freely.
- Drop it on another part's title bar to join that part: the title bar splits into **Tab**, **Below** and **Beside** before you let go. See [Tabs and joined parts](#tabs).
- Drag it into the band at the top to pin it there (or use **Pin to top** in its ⋯ menu). The band takes drops only while something is pinned; with nothing pinned, use **Pin to top**.

### Sizing {#sizing}

- Drag the left or right edge for the width in columns, the bottom edge for the height, or the corner for both.
- Growing into a part beside it makes that part narrower, down to its minimum; there the edge stops and the badge says so.
- The bottom edge snaps to the bottom of a part beside it, to the height of another part and to the part's own content. Hold Alt to size freely.
- A badge shows the size while you drag.
- Parts never get smaller than they need. Production is at least 540 px wide.

### Height {#height}

Each part has one of three height modes, set in the ⋯ menu's Height row:

| Mode | What it does |
| --- | --- |
| **Fit content** | Grows with its content. |
| **Fit content, at most N px** | Grows with its content up to N px, then scrolls inside. |
| **Fixed N px** | Keeps its height; taller content scrolls inside. |

"At most" and "fixed" start from the part's current content height, at most 480 px.

Dragging the bottom edge sets **Fixed N px** at the new height. A part set to "at most" stays "at most", with the new limit. When the edge snaps to the part's own content, it goes back to **Fit content**. **Shorter, −40 px** and **Taller, +40 px** in the Height row work the same way.

### Pin to top and Follow while scrolling {#pin-follow}

- **Pin to top** puts a part into the band at the top of the page, which stays there while you scroll the rest. When the band would cover more than 40 % of the window and the page below needs the room, it is cut there and scrolls inside. With nothing left on the page, the band simply is the page.
- **Follow while scrolling** keeps a part in view in its own columns: as you scroll past it, it moves down with you, together with the parts below it in those columns, until the first part below that is wider, or the page ends.
- A part either pins or follows, not both: pinning a part stops it following, and following unpins it. Follow doesn't work in the Phone arrangement.

> [!tip]
> Material I/O beside a long Production list is the classic case for Follow while scrolling. Set it to **Fit content, at most N px** as well, so it fits the window.

### The ⋯ menu {#item-menu}

The ⋯ menu of each part does everything a drag does, and a little more:

- Width and Height rows of small buttons (− and +, **Full width**, the height modes). The menu stays open after a click, so you can click again; the row's heading names the button under the pointer.
- **Pin to top**, **Follow while scrolling**.
- **Title bar**: off shows only the part's content, like the results tiles. It can't fold then, and customising still shows the bar. A part with several tabs keeps its title bar, because its tabs live there.
- **Move**: **Left one column**, **Up**, **Down**, **Right one column**.
- **Tab, below or beside …** (or **Tabs ({n}) …** for a part with several tabs), see [Tabs](#tabs).
- **Display**: for Workforce, **As cards** or **As a table** with a row per tier (a narrow part scrolls the table sideways). For Workforce, Experts and Infrastructure, **Everything open** shows every tier, expert field and button, also on the page. For Infrastructure that includes the **Cheapest** and **Least area** buttons even with **Auto** on.
- **Hide**.

What is set shows as small icons after a part's size: pinned, follows, no title bar, everything open, table. When something isn't possible, the menu says why.

With the keyboard, focus a part's grip: the arrow keys move it, Shift+arrows resize it (up and down by 40 px), and Enter or Space opens the menu.

### Hiding and Elements {#hiding}

- The eye on a title bar hides the part; on a part with tabs, it hides the tab on view. Or drop a part on **Elements**: dragged by its title bar, the whole group with its tabs goes.
- Production always stays on the page, and so does any tab that contains it.
- The parts below move up into the gap. **Undo** in the message brings it back.
- **Elements** lists every part, grouped as **Base**, **Production & tools**, **Material I/O** and **Results**, with where each one is: **On the page**, **Pinned to top**, a tab or part of another, or **Hidden**. **Add** puts a hidden part at the bottom; drag any part onto the page to place or move it (a tab leaves its group); **Show** switches to its tab, scrolls to it and highlights it.

### New parts {#new-parts}

When PRUNplanner gets a new part, it joins your Custom Layout once, at the bottom of both arrangements, marked **New** for that visit, and a message says so. Move or hide it like any other part.

## Tabs and joined parts {#tabs}

A part can hold others as tabs. In Standard, the tools are tabs of Production.

- Drag a part onto the left third of another part's title bar to make it a tab there, or pick **Tab** under **Tab, below or beside …** in its ⋯ menu.
- Click a tab to see it. Drag a tab off its title bar to take it out again; dragging the first tab moves the whole group.
- **Tabs ({n}) …** in the menu offers **Take {name} out** for each tab but the first, and **Split all into separate items**.
- Only a part on its own can join another. A part with several tabs can only be moved; take its tabs out first.
- The tab that is shown when you save the layout is the one the page opens with. A tab you click on the page lasts for that visit.

### Several parts in one tab {#joined-parts}

A tab can show several parts below or beside each other, never both.

- Drop a part on the middle third of a title bar to show it **Below** the part shown there, or on the right third to show it **Beside** it. Or pick **Below** or **Beside** in the menu. Where the box is too narrow for all of them side by side, they go below.
- A tab that already shows several parts takes more only on its own side; the other side is struck through.
- Drag a part over the parts of a tab to drop it between two of them or at either end; a blue line shows where.
- Drag a part by its body to move it within its tab or out of it. Taking out the first part makes the next one the tab's own; the menu takes out only the other parts.
- The menu switches the whole tab between below and beside.
- Two parts are named "A & B"; three or more after the first part with a count, such as "Material I/O +2". Hover the name to see all of them.
- Drag the line between two parts to size just those two. Beside, they take whole columns and the last part gets the rest. Below, the part above the line gets a height in px and scrolls inside when its content is taller.
- **Less room for {name}** and **More room for {name}** do the same in steps (a column, or 40 px); **Auto** shares by their sizes again.
- Hiding the tab hides all its parts.

## Wide and Phone {#phone}

Custom Layout has two arrangements, picked under **Arrangement** while you customise:

- **Phone** is used when the page is narrower than 760 px: phones, upright tablets, a narrow window. The width counts after the side menu, so a 1024 px window with the full side menu open gets Phone as well.
- **Wide** is used otherwise.

Each has its own parts, places, sizes, folds, display settings and gap. Phone is edited at a phone's width in two columns.

Until you change something in Phone, it is automatic: Wide as a phone shows it, every part stacked in order, small ones two per row. Your first change there starts from that. **Back to automatic** follows Wide again.

While you customise Wide, a note lists the parts that narrower screens rearrange to keep their minimum width.

## Folding {#folding}

- The chevron on a title bar folds a part to its title, with a short summary after it. Results tiles and parts without a title bar don't fold.
- Two or more folded parts side by side with open ones stack into a short column, and the open parts in that row take their room.
- Folded parts stay folded, whichever layout you use. Wide and Phone keep their own folds.

A results tile opens the part its figure comes from and unfolds it:

| Tile | Opens |
| --- | --- |
| **Profit / day** | **Profit** |
| **Payback** | **Construction** |
| **Workforce %** | **Workforce** |
| **Area** | **Planet** |
| **Storage** | **Visits** |

The **Plan check →** link under Material I/O does the same for Plan check. A hidden part opens in a dialog instead.

> [!tip]
> Fold the parts you set once per plan, such as Empire & prices or Experts. They keep a one-line summary, and every plan opens that way.

## Smaller screens {#smaller-screens}

- When a part would be narrower than it needs, the parts are rearranged at that width (marked "auto" while you customise). Your layout stays as it is.
- Standard stacks every part in order below 760 px, small ones two per row, the same way automatic Phone does.
- On a phone, recipes are picked in a sheet from the bottom, and the save status with **Save** sits above the navigation bar.

## Where your layout is saved {#saved}

- The layout (Standard, or Custom Layout with both arrangements), what is folded and Tinted parts are saved to your account and used on every device.
- A change made in another tab of the same browser shows there at once. A change made on another device shows after you reload the page.
- While you customise, a note "Your layout was changed elsewhere" asks whether to **Load it**. With unsaved changes, it asks again before dropping them.
- If saving to your account fails, the layout stays in use and is sent with your next change or when you leave the page.
- Logged out, a shared plan is always shown in Standard. Folding works, but only until you reload.

## Plan suggestions {#suggestions}

PRUNplanner shows what other players plan on the same planet. The numbers come from plans of players active in the last 90 days, updated daily. A planet needs at least 15 such plans from at least 10 players; buildings and recipes show only when at least 5 % of the plans and at least 10 players use them. On a planet with fewer plans, none of the suggestions below appear.

- **Planning Insights**: the **Planet** part shows a link "{n} plans on {planet} · what others build here" when the planet has enough plans. It opens a box with the [[experts]], production buildings and [[recipe|recipes]] those plans use, as shares.
- **Building select**: in Production, the building select starts with a group "Popular on {planet} · {plans} plans", up to 8 buildings with the share of plans that have them, then **All buildings**.
- **Recipe picker**: a **Plans** column with the share of plans with that building that run the recipe ("< 5 %" when it is too rare to show), and **Sort by** **Popular**.
- **Empty building**: a building without a recipe shows **Most planned here:** with the planet's most planned recipe mix, its share and **Add**.
- **Start from a typical setup on {planet}**: an empty plan you can edit offers the planet's most planned buildings (up to 8; those in at least 20 % of plans are pre-checked), each with its typical amount (**Amount**) and **Typical recipes**, plus the experts that at least half of the plans have, at their typical count. **Use typical setup ({count})** adds the checked buildings and the experts, and switches **Auto** on in Infrastructure, so habitations follow the workforce. It is one undo step, and nothing is saved until you save. **Start empty** hides the card; the empty Production list then offers a link to bring it back.

To turn all of this off, switch off **Plan suggestions** in **Profile › Preferences** (on by default). See [Profile](/help/profile#preferences).

> [!tip]
> The typical setup shows what others plan, not what earns most. After you use it, check its [[profit]] in the results and run the [Market check](/help/plan_check#market-check) on its outputs before you build.
