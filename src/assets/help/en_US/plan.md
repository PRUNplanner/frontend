**Overview**

The overview is the heart of the plan analysis.  It provides the daily cost of inputs and workforce consumables, as well as the daily production building degradation.  Initial building cost of the plan (including CM) is included and later used to calculate ROI (payback period) on the base.  Daily profit is calculated by subtracting daily costs from the value of each day's output.  Finally, profit per area is the daily profit of the base divided by the area used in the base; importantly, it uses the actual base as a denominator while profit per area of building recipes (more info below) uses a standardized denominator for comparison purposes.

- Overview Calculations include the cost for constructing the core module


**Production Buildings**

Each building added to the plan appears in this section.  Users should add a recipe using the +RECIPE button on the top right.  Once selected, that recipe will propagate through the plan and contribute to the Overview at the top and Material I/O on the right.  

When selecting a recipe, a dropdown of that buildings recipes appears.  For each recipe, the inputs, duration, and output are given.  The profit per day (ȼ / Day), profit per area (ȼ / Area), and ROI (payback period) for the building's construction cost are also automatically calculated and displayed.  

- Profit per day is the net profit from selling the output at the plan's CX setting minus input, workforce, and depreciation costs. Workforce costs follow the plan's habitats and luxuries: workers without housing and luxuries turned off cost nothing.  
- Profit per area is that profit per day divided by the area of the production building and a proportionate share of the necessary HABs and STOs from the buildings "optimal" layout (used in the Recipe ROI tool).  This is provided to allow a consistent measure of comparative recipe profitability across buildings.
- ROI is the building cost for this production building divided by the profit per day of the building.  




**Saving and Undo**

Name your plan in Configuration and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). The Save button shows the plan's state: "Saved" when there is nothing to save (hover it to see when it was last saved), a dot when there are unsaved changes, "Saving…" while it saves, and "Retry save" if a save fails. Your changes are kept until it succeeds.

Every change can be undone with the Undo and Redo buttons next to Save, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). Removing a building or recipe, or changing a recipe, also shows a message with an Undo button for a few seconds. The history covers the last 50 changes and starts fresh after saving or reloading the plan.


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

**What CX volume misses**

The volume comes from the commodity exchanges only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

**Empire**

The empire's Material I/O checks the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Click a flag chip above the table to show only those materials.

**Target price**

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

**Payback of the difference**

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
