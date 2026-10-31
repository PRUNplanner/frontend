**Layout**

The plan view reads from left to right: **Base** (set up), **Production** (build) and **Material I/O** (result). The results bar above them stays in view and shows profit per day, payback, profit per area, area and storage.

- **Base** holds the empire and prices, the planet (COGC program, permits, Corp HQ, planet resources), workforce with its luxuries, housing and experts. Each section folds; its summary line shows the setting at a glance.
- **Tools** (Construction, Supply, Visits, Repair, Profit, Plan check, POPR) open in place of the production list. While a tool is open, Base folds to a strip at the left, and for Repair, Profit and Plan check Material I/O folds too. Click a strip to show the pane again; it stays open until you fold it.
- On narrower screens (below 1360 px with the collapsed sidebar, 1544 px with the full one) Base opens from the "Base" button next to the tabs; on a tablet Material I/O opens from its button at the end of the tabs too. On a phone the tabs under the results switch between Production, Base, Material I/O and Tools, recipes are picked in a sheet from the bottom, and the save status with Save sits above the navigation bar.

**Results bar**

- **Profit / day**: the value of the plan's output minus inputs, workforce consumables and building degradation, with revenue and cost below it. Construction includes the core module.
- **Payback**: the build cost of the plan divided by its profit per day.
- **Profit / area**: profit per day divided by the area the base uses. It uses the actual base as the denominator, while ȼ / area of a recipe uses a standardized one for comparison. When the empire page has calculated your empire, its average is shown below.
- **Storage**: days until the base storage is full, from what the base exports per day.

**Production**

Each building has one row: count, efficiency, ȼ per day and area. Click the name to fold its orders. Its orders are listed below it: the amount, the recipe, its runtime, its share of the building's time, its part of the building's ȼ per day (the orders add up to the building), COGM and delete. Deleting asks nothing; Ctrl+Z or the Undo message takes it back.

**Changing a recipe**

Click a recipe to open the picker under it, or "+ Recipe" to add one as a new order. Click a row or press Enter to pick it, ↑ and ↓ move through the list, Esc closes it. A line under the row says what changed, with Undo.

- **ȼ / day** is the net profit of one building running only this recipe: the output sold at the plan's CX setting minus inputs, workforce and depreciation. 每日利润是按计划的 CX 设置出售产出后，扣除输入物资、劳动力和折旧成本后的净利润。 Workforce costs follow the plan's habitats and luxuries: workers without housing and luxuries turned off cost nothing. "vs now" compares it with the recipe it would replace.
- **ȼ / area** is that profit divided by the area of the building plus a proportionate share of the HABs and STOs of its "optimal" layout (as in the Recipe ROI tool), so recipes compare across buildings.
- **Payback** is the building's construction cost divided by its profit per day.
- **Plans here** is the share of plans on the planet with this building that run the recipe.
- A dot after each input says whether the plan makes it (made here) or buys it (bought). When the plan uses what the recipe you replace makes, a note says how much of it you'd have to buy instead.

**保存与撤销**

Name your plan with the pencil next to its name and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). Undo, Redo, the plan's state and Save sit together in one control: when it was saved, unsaved changes, "Saving…", or a failed save with a retry. 在保存成功前你的修改内容均会保留。

Unsaved changes of a saved plan are kept as a draft a few seconds after each change, so they survive a reload or a closed tab: when you open the plan again they are back, and the notice offers to discard them. "Draft not saved" means they aren't kept yet (click it to try again); the page then warns before you leave. If another tab or device saved a draft of the same plan, nothing is replaced until you choose which one to keep.

Every change can be undone with the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). The history covers the last 50 changes and starts fresh after saving the plan or discarding the changes.

**Versions**

Every save keeps a version of the plan. Click the save state to see them. To name a version, open the arrow next to Save (or press Ctrl+Alt+S, Cmd+Option+S on a Mac), type a name and press Enter; the ⋯ menu of a version in the list names or renames it later. Named versions stay, the last 10 unnamed ones are kept. The same menu has Save as copy and Discard changes.

The eye in the list shows an older version read-only, with its numbers in the results bar. From there, Compare with current lists what differs, Restore loads it as unsaved changes (Undo takes it back, saving makes it the active version), Open as new plan copies it into a new plan, and Back to current returns to your plan as it was.

Make active, in the ⋯ menu or next to Restore, switches the plan to that version in one step: your empires and the plan's share link use it right away. It is added as a new version on top ("Restored from …"), the one you picked stays where it is. Unsaved changes are discarded after you confirm. Delete in the same menu removes a version for good, after you confirm; the active version can't be deleted.

**Plan check**

Plan check tests a plan against the market. It has three views: Market check (the default), Price sensitivity and Compare plans.

概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。

A plan's profit assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true.

- **Share of daily volume**: what the plan buys or sells per day, divided by the average daily volume traded on the exchange in the last 30 days. 选择配方时，会出现该建筑可用配方的下拉列表。每个配方都会显示输入、运行时间和输出。系统还会自动计算并显示该建筑建造成本对应的每日利润（ȼ / 天）、单位面积利润（ȼ / 面积）以及 ROI（回本周期）。
- **Bid, ask and spread**: the bid is the best price a buyer offers right now, the ask the best price a seller asks. Buying at once means paying the ask, selling at once means taking the bid. The spread is the gap between them, as a % of the ask.
- **At real prices**: the plan's profit when every material is bought at the ask and sold at the bid on its exchange. A material without an ask or bid, or without an exchange in your CX preference, keeps its plan price.
- **Exchange**: the exchange of your CX preference. Without one, the check uses the volume of all exchanges together.

**What the flags mean**

- Red, a filled circle: the plan can't trade this material as planned.
  - _No price_: the plan has no price for it and counts it at 0.
  - _No trades in 7 days_: nobody traded it on the exchange in the last 7 days.
  - _No offers_ / _No buyers_: nobody sells (when you buy) or bids for it (when you sell) on the exchange right now.
  - _Bigger than the market_: the plan trades 50 % or more of the daily volume.
- Amber, a triangle: _Large share of the market_, 10 % or more of the daily volume. Your orders will likely move the price.
- Grey, a ring: a note. _All exchanges, no exchange set_ (no CX preference, so all exchanges are counted) or _Data older than 2 days_.

Spreads are shown but never flagged.

To watch the shares while you change counts and recipes, switch Material I/O to **%**: each material's Δ as a share of the average daily volume of the last 7 and 30 days, amber from 10 %, red from 50 %.

**What CX volume misses**

The volume comes from the commodity exchanges only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

**Empire**

The empire's Material I/O checks the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Click a flag chip above the table to show only those materials.

概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

概览是规划分析的核心。它会提供输入物资和劳动力消耗品的每日成本，以及生产建筑的每日损耗。规划也会计入初始建筑成本（包括核心建筑），其后续会用于计算基地的 ROI（回本周期）。每日利润通过从每日产出价值中扣除每日成本计算得出。最后，单位区域利润是基地每日利润除以基地实际占用区域得出的数值。需要注意的是，它以实际基地面积作为分母；而建筑配方的单位区域利润（下文会进一步说明）则使用标准化分母，便于比较。

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
