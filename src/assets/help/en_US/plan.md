**Layout**

The plan page is a grid of parts: Base's empire and prices, planet, workforce, infrastructure and experts; Production with the tools (Construction, Supply, Visits, Repair, Profit, Plan check, POPR) as its tabs; Material I/O and its totals; and the five results (profit per day, payback, workforce, area with profit per area, storage). Each part uses the room it gets: wider, it shows more side by side instead of growing taller (experts two or three per line, workforce tiers next to each other). The layout is the same for all your plans.

- **Layout menu** (in the header): **Today's** (results on top, Base on the left, Production with its tools, Material I/O on the right), **Wide** (Supply and Plan check next to Production) and **Stacked** (Base's parts side by side, Production full width below). Once you saved one, **Custom Layout** is there too. Presets never change; customising one starts from a copy.
- **Customise**: pick "Customise, starting from …". The page shows its real content, not clickable, with a grip (⋮⋮) on each part's title bar, its size and its ⋯ menu; results tiles get a title bar too.
  - **Moving**: drag a title bar; a dashed box shows where it lands. Its top lines up with a part beside it (a yellow line says which). Drop it on another part's title bar to make it a tab there (the title bar says so before you let go), or into the band at the top to keep it in view.
  - **Sizing**: drag the right edge (width in columns), the bottom edge (height) or the corner. A badge shows the size; the bottom edge snaps to the bottom of a part beside it, to the height of another part and to its own content. Hold **Alt** to place freely. Parts never get smaller than they need (Production at least 540 px wide).
  - **Height**: *Fit content* grows with the content; *Fit content, at most N px* shrinks and scrolls inside; *Fixed N px* keeps its height and scrolls. Dragging the bottom edge above the content makes it fixed, below it makes it "at most"; Taller and Shorter (40 px) do the same.
  - **Keep in view while scrolling** puts a part into the band at the top, which sticks while you scroll the rest of the page. When it would cover more than 40 % of the window and the page below needs the room, it is cut there and scrolls inside. With nothing left on the page, it simply is the page.
  - **Tabs**: drag a part onto another's title bar, or pick "Make it a tab of …" in its ⋯ menu. Click a tab to see it; drag a tab off its title bar to take it out again (the first tab moves the whole group). The menu also takes a tab out or splits all of them.
  - **The ⋯ menu** of each part does everything a drag does: width, height, keep in view, move, tabs and hide. When something isn't possible it says why. On a title bar the arrow keys move a part, **Shift**+arrows resize it and **Enter** opens the menu.
  - **Elements** (beside the page) lists every part and where it is; add a hidden one at the bottom, drag any one onto the page (a placed one moves there, a tab leaves its group), or **Show** one (switches to its tab and highlights it).
  - **Columns** (4–24) and **gap**, and the preview width (Full, 1600, 1440, 1280, 1024, Phone).
  - **Everything open**: the button on the title bar of Workforce, Experts and Infrastructure makes it show all it can hide (every tier, every expert field, the habitation buttons). It is saved with the layout, so the page shows it that way too.
  - **Undo** (button, Ctrl/⌘+Z, or the message after hiding a part or changing its tabs), **Reset to Today's**, **Cancel** (asks when there are changes) and **Save**. Saving a preset's copy over your Custom Layout asks first.
- **Folding**: the chevron on a part's title bar folds it to its title. Two or more folded parts side by side with open ones stack into a short column, and the open parts in that row take their room. Folded parts stay folded, whichever layout you use. A results tile or a "Plan check →" link opens and unfolds the part it points to; a hidden one opens in a dialog.
- **Smaller screens**: when a part would be narrower than it needs, the parts are rearranged at that width (marked "auto" while customising); your layout stays as it is. On a phone every part is stacked in order, small ones two per row; layouts can be switched there, customising is for wider screens. Recipes are picked in a sheet from the bottom, and the save status with Save sits above the navigation bar.
- For now the layout and what is folded are kept for this browser tab: they survive a reload and are gone in a new tab.

**Results**

- **Profit / day**: the value of the plan's output minus inputs, workforce consumables and building degradation, with revenue and cost below it. Construction includes the core module.
- **Payback**: the build cost of the plan divided by its profit per day.
- **Profit / area**: profit per day divided by the area the base uses. It uses the actual base as the denominator, while ȼ / area of a recipe uses a standardized one for comparison. When the empire page has calculated your empire, its average is shown below.
- **Storage**: days until the base storage is full, from what the base exports per day.

**Production**

Each building has one row: count, efficiency, ȼ per day and area. Click the name to fold its orders. Its orders are listed below it: the amount, the recipe, its runtime, its share of the building's time, its part of the building's ȼ per day (the orders add up to the building), COGM and delete. Deleting asks nothing; Ctrl+Z or the Undo message takes it back.

**Changing a recipe**

Click a recipe to open the picker under it, or "+ Recipe" to add one as a new order. Click a row or press Enter to pick it, ↑ and ↓ move through the list, Esc closes it. A line under the row says what changed, with Undo.

- **ȼ / day** is the net profit of one building running only this recipe: the output sold at the plan's CX setting minus inputs, workforce and depreciation. Workforce costs follow the plan's habitats and luxuries: workers without housing and luxuries turned off cost nothing. "vs now" compares it with the recipe it would replace.
- **ȼ / area** is that profit divided by the area of the building plus a proportionate share of the HABs and STOs of its "optimal" layout (as in the Recipe ROI tool), so recipes compare across buildings.
- **Payback** is the building's construction cost divided by its profit per day.
- **Plans here** is the share of plans on the planet with this building that run the recipe.
- A dot after each input says whether the plan makes it (made here) or buys it (bought). When the plan uses what the recipe you replace makes, a note says how much of it you'd have to buy instead.

**Saving and Undo**

Name your plan with the pencil next to its name and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). Undo, Redo, the plan's state and Save sit together in one control: when it was saved, unsaved changes, "Saving…", or a failed save with a retry. Your changes are kept until it succeeds.

Unsaved changes of a saved plan are kept as a draft a few seconds after each change, so a reload or a closed tab doesn't lose them. Opening the plan again always shows it as saved; a notice offers to restore the draft, and your next change replaces it. The Reload saved version button next to Save goes back to the saved plan at any time and drops the draft, after asking if you have unsaved changes. "Draft not saved" means they aren't kept yet (click it to try again); the page then warns before you leave. If another tab or device saved a draft of the same plan, nothing is replaced until you choose which one to keep.

Every change can be undone with the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). The history covers the last 50 changes and starts fresh after saving the plan or discarding the changes.

**Versions**

Every save keeps a version of the plan. Click the save state to see them. To name a version, open the arrow next to Save (or press Ctrl+Alt+S, Cmd+Option+S on a Mac), type a name and press Enter; the ⋯ menu of a version in the list names or renames it later. Named versions stay (at most 20 per plan; delete one to name another), the last 10 unnamed ones are kept. The same menu has Save as copy and Discard changes.

The eye in the list shows an older version read-only, with its numbers in the results bar. From there, Compare with current lists what differs, Restore loads it as unsaved changes (Undo takes it back, saving makes it the active version), Open as new plan copies it into a new plan, and Back to current returns to your plan as it was.

Make active, in the ⋯ menu or next to Restore, switches the plan to that version in one step: your empires and the plan's share link use it right away. It is added as a new version on top ("Restored from …"), the one you picked stays where it is. Unsaved changes are discarded after you confirm. Delete in the same menu removes a version for good, after you confirm; the active version can't be deleted.


**Plan check**

Plan check tests a plan against the market. It has three views: Market check (the default), Price sensitivity and Compare plans.

**Market check**

A plan's profit assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true.

- **Share of daily volume**: what the plan buys or sells per day, divided by the average daily volume traded on the exchange in the last 30 days. Selling 50 units a day into a market that trades 100 a day is a 50 % share.
- **Bid, ask and spread**: the bid is the best price a buyer offers right now, the ask the best price a seller asks. Buying at once means paying the ask, selling at once means taking the bid. The spread is the gap between them, as a % of the ask.
- **At real prices**: the plan's profit when every material is bought at the ask and sold at the bid on its exchange. A material without an ask or bid, or without an exchange in your CX preference, keeps its plan price.
- **Exchange**: the exchange of your CX preference. Without one, the check uses the volume of all exchanges together.

**What the flags mean**

- Red, a filled circle: the plan can't trade this material as planned.
  - *No price*: the plan has no price for it and counts it at 0.
  - *No trades in 7 days*: nobody traded it on the exchange in the last 7 days.
  - *No offers* / *No buyers*: nobody sells (when you buy) or bids for it (when you sell) on the exchange right now.
  - *Bigger than the market*: the plan trades 50 % or more of the daily volume.
- Amber, a triangle: *Large share of the market*, 10 % or more of the daily volume. Your orders will likely move the price.
- Grey, a ring: a note. *All exchanges, no exchange set* (no CX preference, so all exchanges are counted) or *Data older than 2 days*.

Spreads are shown but never flagged.

To watch the shares while you change counts and recipes, switch Material I/O to **%**: each material's Δ as a share of the average daily volume of the last 7 and 30 days, amber from 10 %, red from 50 %.

**What CX volume misses**

The volume comes from the commodity exchanges only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

**Empire**

The empire's Material I/O checks the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Click a flag chip above the table to show only those materials.

**Target price**

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

**Payback of the difference**

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
