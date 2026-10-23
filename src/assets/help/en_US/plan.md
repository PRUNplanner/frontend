**Layout**

The plan view reads from left to right: **Base** (set up), **Production** (build) and **Material I/O** (result). The results bar above them stays in view and shows profit per day, payback, profit per area, area and storage.

- **Base** holds the empire and prices, the planet (COGC program, permits, Corp HQ, planet resources), workforce with its luxuries, housing and experts. Each section folds; its summary line shows the setting at a glance.
- **Tools** (Construction, Supply, Visits, Repair, Profit, Plan check, POPR) open in place of the production list. While a tool is open, Base folds to a strip at the left, and for Repair, Profit and Plan check Material I/O folds too. Click a strip to show the pane again; it stays open until you fold it.
- On narrower screens (below 1360 px with the collapsed sidebar, 1544 px with the full one) Base opens from the "Base" button next to the tabs.

**Results bar**

- **Profit / day**: the value of the plan's output minus inputs, workforce consumables and building degradation, with revenue and cost below it. Construction includes the core module.
- **Payback**: the build cost of the plan divided by its profit per day.
- **Profit / area**: profit per day divided by the area the base uses. It uses the actual base as the denominator, while ȼ / area of a recipe uses a standardized one for comparison. When the empire page has calculated your empire, its average is shown below.
- **Storage**: days until the base storage is full, from what the base exports per day.

**Production**

Each building has one row: count, efficiency, ȼ per day and area. Click the name to fold its orders. Its orders are listed below it: the amount, the recipe, its runtime, its share of the building's time, COGM and delete. Deleting asks nothing; Ctrl+Z or the Undo message takes it back.

**Changing a recipe**

Click a recipe to open the picker under it, or "+ Recipe" to add one as a new order. Click a row or press Enter to pick it, ↑ and ↓ move through the list, Esc closes it. A line under the row says what changed, with Undo.

- **ȼ / day** is the net profit of one building running only this recipe: the output sold at the plan's CX setting minus inputs, workforce and depreciation. Workforce costs follow the plan's habitats and luxuries: workers without housing and luxuries turned off cost nothing. "vs now" compares it with the recipe it would replace.
- **ȼ / area** is that profit divided by the area of the building plus a proportionate share of the HABs and STOs of its "optimal" layout (as in the Recipe ROI tool), so recipes compare across buildings.
- **Payback** is the building's construction cost divided by its profit per day.
- **Plans here** is the share of plans on the planet with this building that run the recipe.
- A dot after each input says whether the plan makes it (made here) or buys it (bought). When the plan uses what the recipe you replace makes, a note says how much of it you'd have to buy instead.

**Saving and Undo**

Name your plan with the pencil next to its name and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). The text next to Save shows the plan's state: when it was saved, unsaved changes, "Saving…", or a failed save with a retry. Your changes are kept until it succeeds.

Every change can be undone with the Undo and Redo buttons next to the name, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). The history covers the last 50 changes and starts fresh after saving or reloading the plan.


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
