You can arrange the parts of the plan page to suit how you plan. Use the Standard layout or customise your own, fold parts, group them as tabs and set up how the page looks on a phone. The page also shows plan suggestions based on what other players plan.

Use it, for example, to keep Material I/O in view beside a long Production list, or to fold the parts you set once. The layout holds only where the parts go, how big they are, what's folded and whether parts are tinted, so changing it never changes your plan's figures.

## The parts of the page {#parts}

- **Base**: **Empire & prices**, **Planet**, **Workforce**, **Infrastructure** and **Experts**. See [Base setup](/help/plan_base).
- **Production**, with the tools as its tabs: **Construction**, **Supply**, **Visits**, **Repair**, **Profit**, **Plan check** and **POPR**. See [Production](/help/plan_production), [Plan tools](/help/plan_tools) and [Plan check](/help/plan_check). POPR is only there when you're logged in.
- **Material I/O** and **Material I/O totals**.
- The five results tiles: **Profit / day**, **Payback**, **Workforce %**, **Area** and **Storage**. See [Results](/help/plan_results).

Each part uses the room it gets. Give it more width and it shows more side by side instead of growing taller. Experts fill as many per line as fit, and the [[workforce]] tiers sit next to each other. The layout is the same for all your plans.

## The Layout menu {#layout-menu}

The **Layout** button in the plan header picks the layout. You only see it when you're logged in, and below 768 px it shows as an icon only.

- **Standard**: results on top, Base on the left, Production with its tools in the middle, Material I/O on the right. Standard never changes.
- **Custom Layout**: your own arrangement. It appears once you've saved one. There's one Custom Layout, used for all your plans. Switching to Standard keeps it, so you can switch back at any time.

Customising starts from a copy. Pick **Customise, starting from Standard…**, or **Customise Custom Layout…** while Custom Layout is in use. Below 768 px the customise item isn't offered, but you can still switch layouts there.

## Customise {#customise}

While you customise, the page shows its real content, but you can't click it. Each part's title bar carries a grip (⋮⋮), its size, the eye that hides it and its ⋯ menu. The results tiles get a title bar too, and **Elements** opens beside the page.

The bar at the top has:

- **Arrangement**: **Wide** or **Phone**, see [Wide and Phone](#phone).
- **Columns** (4 to 24, Wide only) and **Gap** (8, 12, 16 or 24 px). Changing the columns keeps each part's share of the width. For example, going from 12 to 24 columns turns a part 4 columns wide into one 8 columns wide. Shares that don't divide evenly round to whole columns.
- **Tinted parts**: gives every part a slightly lighter background for more contrast, in either layout and on every screen. It's kept as soon as you tick it.
- **Elements · N**: N parts aren't placed in the arrangement shown.
- **Undo** (also Ctrl/⌘+Z), **Reset to Standard** (Wide as Standard, Phone automatic, and you can undo it), **Cancel** and **Save**.

If you changed something, **Cancel** (or Esc) asks "Discard your layout changes?". **Discard changes** drops them and **Keep editing** takes you back. During a drag, Esc cancels only that drag. **Save** saves both arrangements as your Custom Layout. If you save Standard's copy over an existing Custom Layout, PRUNplanner asks first: **Replace Custom Layout** or **Keep editing**.

> [!tip]
> Hiding a part, joining parts, taking them out again or resetting shows a message with **Undo**. You can also press Ctrl/⌘+Z at any time while you customise. There's no redo for the layout.

### Moving {#moving}

- Drag a part by its title bar. A dashed box marked **Lands here** shows where it'll land.
- Its top lines up with the top of a part beside it, and a yellow line shows which one. Hold Alt to place it freely.
- Drop it on another part's title bar to join that part. Before you let go, the title bar splits into **Tab**, **Below** and **Beside**. See [Tabs and joined parts](#tabs).
- Drag it into the band at the top to pin it there, or use **Pin to top** in its ⋯ menu. The band only takes drops while something is pinned. With nothing pinned, use **Pin to top**.

### Sizing {#sizing}

- Drag the left or right edge to set the width in columns, the bottom edge for the height, or the corner for both.
- Growing into a part beside it makes that part narrower, down to its minimum. There the edge stops, and the badge says so.
- The bottom edge snaps to the bottom of a part beside it, to the height of another part and to the part's own content. Hold Alt to size freely.
- A badge shows the size while you drag.
- Parts never get smaller than they need. Production is at least 540 px wide.

### Height {#height}

Each part has one of three height modes. You set it in the Height row of the ⋯ menu:

| Mode | What it does |
| --- | --- |
| **Fit content** | Grows with its content. |
| **Fit content, at most N px** | Grows with its content up to N px, then scrolls inside. |
| **Fixed N px** | Keeps its height. Taller content scrolls inside. |

For example, with a limit of 480 px, a part with 300 px of content is 300 px tall, and one with 600 px is 480 px tall and scrolls the rest inside. Set to **Fixed N px** at 480 px, both are 480 px tall.

When a part has no height set yet, "at most" and "fixed" start from its current content height, at most 480 px.

Dragging the bottom edge sets **Fixed N px** at the new height. A part set to "at most" stays "at most", with the new limit. When the edge snaps to the part's own content, the part goes back to **Fit content**. **Shorter, −40 px** and **Taller, +40 px** in the Height row work the same way.

### Pin to top and Follow while scrolling {#pin-follow}

- **Pin to top** puts a part into the band at the top of the page. The band stays put while you scroll the rest. If it would cover more than 40 % of the window and the page below needs the room, it's cut there and scrolls inside. With nothing left on the page, the band is the page.
- **Follow while scrolling** keeps a part in view in its own columns. As you scroll past it, it moves down with you, along with the parts below it in those columns, until the first part below that reaches outside those columns, or until the page ends.
- A part either pins or follows, not both. Pinning a part stops it following, and following unpins it. Follow doesn't work in the Phone arrangement.

> [!tip]
> Material I/O beside a long Production list is the classic case for Follow while scrolling. Set it to **Fit content, at most N px** as well, so it fits the window.

### The ⋯ menu {#item-menu}

The ⋯ menu of each part does everything a drag does, and a little more:

- Width and Height rows of small buttons: − and +, **Full width** and the height modes. The menu stays open after a click, so you can click again, and the row's heading names the button under the pointer.
- **Pin to top** and **Follow while scrolling**.
- **Title bar**: switch it off to show only the part's content, like the results tiles. The part can't fold then, and customising still shows the bar. A part with several tabs keeps its title bar, because its tabs live there.
- **Move**: **Left one column**, **Up**, **Down**, **Right one column**.
- **Tab, below or beside …** (or **Tabs ({n}) …** for a part with several tabs). See [Tabs](#tabs).
- **Display**: Workforce shows **As cards** or **As a table** with a row per tier (in a narrow part the table scrolls sideways). For Workforce, Experts and Infrastructure, **Everything open** shows every tier, expert field and button, on the page as well. For Infrastructure that includes the **Cheapest** and **Least area** buttons, even with **Auto** on.
- **Hide**.

Small icons after a part's size show what's set: pinned, follows, no title bar, everything open, table. When something isn't possible, the menu tells you why.

You can use the keyboard too. Focus a part's grip, and the arrow keys move it, Shift+arrows resize it (up and down by 40 px), and Enter or Space opens the menu.

### Hiding and Elements {#hiding}

- The eye on a title bar hides the part. On a part with tabs, it hides the tab on view. You can also drop a part on **Elements**. If you drag it by its title bar, the whole group goes, tabs and all.
- Production always stays on the page, and so does any tab that contains it.
- The parts below move up into the gap, and **Undo** in the message brings the part back.
- **Elements** lists every part, grouped as **Base**, **Production & tools**, **Material I/O** and **Results**, and says where each one is: **On the page**, **Pinned to top**, a tab or part of another, or **Hidden**. **Add** puts a hidden part at the bottom. Drag any part onto the page to place or move it (a tab leaves its group). **Show** switches to its tab, scrolls to it and highlights it.

> [!tip]
> Can't find a part on the page? While you customise, **Elements** says where each one is. A part you hid is marked **Hidden**, and **Add** brings it back.

### New parts {#new-parts}

When PRUNplanner gets a new part, it joins your Custom Layout once, at the bottom of both arrangements. It's marked **New** for that visit, and a message tells you. Move or hide it like any other part.

## Tabs and joined parts {#tabs}

A part can hold others as tabs. In Standard, the tools are tabs of Production.

- To make a part a tab of another, drag it onto the left third of that part's title bar, or pick **Tab** under **Tab, below or beside …** in its ⋯ menu.
- Click a tab to see it. To take a tab out again, drag it off the title bar. Dragging the first tab moves the whole group.
- **Tabs ({n}) …** in the menu offers **Take {name} out** for each tab but the first, and **Split all into separate items**.
- Only a part on its own can join another. A part with several tabs can only be moved, so take its tabs out first.
- The page opens with whichever tab was shown when you saved the layout. A tab you click on the page lasts for that visit.

### Several parts in one tab {#joined-parts}

A tab can show several parts below each other or beside each other, never both.

- Drop a part on the middle third of a title bar to show it **Below** the part shown there, or on the right third to show it **Beside** it. The menu has **Below** and **Beside** too. Where the box is too narrow for all of them side by side, they go below.
- A tab that already shows several parts only takes more on its own side. The other side is struck through.
- Drag a part over the parts of a tab to drop it between two of them or at either end. A blue line shows where.
- Drag a part by its body to move it within its tab or out of it. Taking out the first part makes the next one the tab's own. The menu only takes out the other parts.
- The menu switches the whole tab between below and beside.
- Two parts are named "A & B". Three or more are named after the first part with a count, such as "Material I/O +2". Hover the name to see all of them.
- Drag the line between two parts to size just those two. Beside each other, they take whole columns and the last part gets the rest. Below each other, the part above the line gets a height in px and scrolls inside when its content is taller.
- **Less room for {name}** and **More room for {name}** do the same in steps (a column, or 40 px). **Auto** shares by their sizes again.
- Hiding the tab hides all its parts.

## Wide and Phone {#phone}

Custom Layout has two arrangements. You pick one under **Arrangement** while you customise:

- **Phone** is used when the page is narrower than 760 px: phones, upright tablets, a narrow window. The width counts after the side menu, so a 1024 px window with the full side menu open gets Phone as well.
- **Wide** is used otherwise.

Each arrangement has its own parts, places, sizes, folds, display settings and gap. You edit Phone at a phone's width, in two columns.

Until you change something in Phone, it's automatic. It shows Wide the way a phone would, every part stacked in order, small ones two per row. Your first change there starts from that, and **Back to automatic** follows Wide again.

While you customise Wide, a note lists the parts that narrower screens rearrange to keep their minimum width.

## Folding {#folding}

- The chevron on a title bar folds a part down to its title, with a short summary after it. Results tiles and parts without a title bar don't fold.
- When two or more folded parts sit side by side with open ones, the folded parts stack into a short column and the open parts in that row take their room.
- Folded parts stay folded, whichever layout you use. Wide and Phone keep their own folds.

A results tile opens the part its figure comes from and unfolds it:

| Tile | Opens |
| --- | --- |
| **Profit / day** | **Profit** |
| **Payback** | **Construction** |
| **Workforce %** | **Workforce** |
| **Area** | **Planet** |
| **Storage** | **Visits** |

The **Plan check →** link under Material I/O does the same for Plan check. If the part is hidden, it opens in a dialog instead.

> [!tip]
> Fold the parts you set once per plan, such as Empire & prices or Experts. They keep a one-line summary, and every plan opens that way.

## Smaller screens {#smaller-screens}

- When a part would be narrower than it needs, PRUNplanner rearranges the parts at that width (marked "auto" while you customise). Your layout itself stays as it is.
- Below 760 px, Standard stacks every part in order, small ones two per row, the same way automatic Phone does.
- On a phone you pick recipes in a sheet from the bottom, and the save status with **Save** sits above the navigation bar.

## Where your layout is saved {#saved}

- Your layout (Standard, or Custom Layout with both arrangements), what's folded and Tinted parts are saved to your account and used on every device.
- A change made in another tab of the same browser shows there at once. A change made on another device shows after you reload the page.
- While you customise, a note "Your layout was changed elsewhere" asks whether to **Load it**. If you have unsaved changes, it asks again before dropping them.
- If saving to your account fails, the layout stays in use, and PRUNplanner sends it with your next change or when you leave the page.
- When you're logged out, a shared plan always shows in Standard. Folding works, but only until you reload.

## Plan suggestions {#suggestions}

PRUNplanner shows what other players plan on the same planet. The numbers come from plans of players active in the last 90 days, and PRUNplanner updates them daily. A planet needs at least 15 such plans from at least 10 players. Buildings and recipes only show when at least 5 % of the plans and at least 10 players use them. On a planet with fewer plans, none of the suggestions below appear.

For example, take a planet with 40 such plans from 25 players. A building in 4 of them (10 %), from 4 players, doesn't show, because fewer than 10 players use it. A building in 12 of them (30 %), from 11 players, does.

- **Planning Insights**: when the planet has enough plans, the **Planet** part shows a link "{n} plans on {planet} · what others build here". It opens a box with the [[experts]], production buildings and [[recipe|recipes]] those plans use, as shares.
- **Building select**: in Production, the building select starts with a group "Popular on {planet} · {plans} plans". It lists up to 8 buildings with the share of plans that have them, then **All buildings**.
- **Recipe picker**: a **Plans** column shows the share of plans with that building that run the recipe ("< 5 %" when it's too rare to show), and you can **Sort by** **Popular**.
- **Empty building**: a building without a recipe shows **Most planned here:** with the planet's most planned recipe mix, its share and **Add**.
- **Start from a typical setup on {planet}**: an empty plan you can edit offers the planet's most planned buildings, up to 8. Those in at least 20 % of plans are pre-checked. Each comes with its typical amount (**Amount**) and **Typical recipes**. It also lists the experts that at least half of the plans have, at their typical count. **Use typical setup ({count})** adds the checked buildings and the experts, and switches **Auto** on in Infrastructure, so habitations follow the workforce. It's one undo step, and nothing is saved until you save. **Start empty** hides the card, and the empty Production list then has a link to bring it back.

To turn all of this off, switch off **Plan suggestions** in **Profile › Preferences**. It's on by default. See [Profile](/help/profile#preferences).

> [!tip]
> The typical setup shows what others plan, not what earns most. After you use it, check its [[profit]] in the results and run the [Market check](/help/plan_check#market-check) on its outputs before you build.
