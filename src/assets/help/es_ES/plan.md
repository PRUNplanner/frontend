**Overview**

The overview is the heart of the plan analysis.  It provides the daily cost of inputs and workforce consumables, as well as the daily production building degradation.  Initial building cost of the plan (including CM) is included and later used to calculate ROI (payback period) on the base.  Daily profit is calculated by subtracting daily costs from the value of each day's output.  Finally, profit per area is the daily profit of the base divided by the area used in the base; importantly, it uses the actual base as a denominator while profit per area of building recipes (more info below) uses a standardized denominator for comparison purposes.

- Overview Calculations include the cost for constructing the core module

**Production Buildings**

Each building added to the plan appears in this section.  Users should add a recipe using the +RECIPE button on the rop right.  Once selected, that recipe will propogate through the plan and contribute to the Overview at the top and Material I/O on the right.

When selecting a recipe, a dropdown of that buildings recipes appears.  For each recipe, the inputs, duration, and output are given.  The profit per day (ȼ / Day), profit per area (ȼ / Area), and ROI (payback period) for the building's construction cost are also automatically calculated and displayed.

- Profit per day is the net profit from selling the output at the plan's CX setting minus input, workforce, and depreciation costs.
- Profit per area is that profit per day divided by the area of the production building and a proportionate share of the necessary HABs and STOs from the buildings "optimal" layout (used in the Recipe ROI tool).  This is provided to allow a consistent measure of comparative recipe profitability across buildings.
- ROI is the building cost for this production building divided by the profit per day of the building.

**Saving and Undo**

Name your plan in Configuration and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). The Save button shows the plan's state: "Saved" when there is nothing to save (hover it to see when it was last saved), a dot when there are unsaved changes, "Saving…" while it saves, and "Retry save" if a save fails. Your changes are kept until it succeeds.

Every change can be undone with the Undo and Redo buttons next to Save, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). Removing a building or recipe, or changing a recipe, also shows a message with an Undo button for a few seconds. The history covers the last 50 changes and starts fresh after saving or reloading the plan.
