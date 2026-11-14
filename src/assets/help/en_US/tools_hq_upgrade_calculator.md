Use the HQ Upgrade Calculator to plan an [[hq-level|HQ level]] upgrade. It lists the materials you need to raise your company headquarters from one level to another, what you already have, and what the rest costs, so you can buy or ship exactly what's missing.

In the game, each HQ level upgrade gives you one more base [[area-permits|permit]]. Use the calculator when you get ready for an upgrade, or to see what several upgrades in a row take.

## Choosing the levels {#levels}

| Setting | What it does |
| --- | --- |
| **From HQ Level** | your current level, 1 to 50 (default 1) |
| **To HQ Level** | the level you want to reach. It only offers levels from **From HQ Level** up (default 3) |
| **CX Preference** | the [[exchange-preference\|exchange preference]] for the prices |
| **Show Locations** | shows the **Storage Locations** column (on by default) |

The calculator adds up the materials of every upgrade from the level after **From HQ Level** up to **To HQ Level**, so you can plan several upgrades at once. With From 1 and To 3 it shows the upgrades to level 2 and level 3. For example, level 2 takes 6 BBH and level 3 takes 16, so **Amount** shows 22 BBH. With **From HQ Level** and **To HQ Level** the same, there's no upgrade to add up and the table stays empty.

The materials per level come from a table built into PRUNplanner, which covers levels 1 to 50.

If you raise **From HQ Level** above **To HQ Level**, the table keeps the previous result. To recalculate, pick a **To HQ Level** at or above the new **From HQ Level**.

> [!warning]
> Picking an exchange preference here also makes it your default exchange preference, so other pages that follow your default switch with it.

## The table {#table}

The table has one row per material, A to Z by ticker. Click a header to sort by it. That works on every column except **Override Stock** and **Storage Locations**.

| Column | What it shows |
| --- | --- |
| **Material** | the material. Click it for its market card |
| **Amount** | how many the upgrades need in total |
| **Storage** | how many you have: your [[fio\|FIO]] stock, or your override |
| **Override Stock** | your own stock figure for this material |
| **Required** | what you still need: max(Amount − Storage, 0) |
| **Cost / Unit (ȼ)** | the buy price under your exchange preference |
| **Total Cost (ȼ)** | Required × Cost / Unit |
| **Storage Locations** | where FIO found the material, e.g. `120x @ <name> (WAR)`. The type is PLANET, WAR or SHIP |

Prices don't depend on a planet, so planet exceptions in your exchange preference don't apply here.

## Your stock {#stock}

With FIO connected, **Storage** is the sum of the material in all your bases, warehouses and ships that FIO reports. Without FIO it's 0. Don't worry if every material then shows its full **Amount** as **Required**: that only means PRUNplanner doesn't know your stock. Connect FIO in your [Profile](/help/profile), or type your stock into **Override Stock**.

FIO counts the material wherever it is, in a base, a warehouse or on a ship, so **Storage Locations** tells you where it sits.

For example, with the 22 BBH from above and 10 in storage, **Required** is 22 − 10 = 12, and at a made-up 100 ȼ a unit **Total Cost (ȼ)** is 1,200 ȼ. With 30 in storage, **Required** is 0, never below.

To replace the FIO figure for a material, type a number into **Override Stock**, for example for stock that's already on its way. 0 counts as 0. Clear the field to use the FIO figure again. The table and the totals update as soon as you change an override. Overrides last until you leave the page.

## Totals {#totals}

Above the table:

- **Total Cost**: the sum of **Total Cost (ȼ)**.
- **Total Weight** in t and **Total Volume** in m³ of everything **Required**, so you can check it fits your ship.

All three count only what you still need, so they leave out stock you already have.

## XIT {#xit}

The XIT button opens the XIT Action drawer with a transfer for every material whose **Required** is above 0. Set the **Origin** (the station warehouse to take it from) and **Buy From CX**. Then **Copy** the **JSON** and run it with [[xit|XIT]] in Refined PrUn. PRUNplanner saves **Origin** and **Buy From CX** as your preferences and shares them with the other XIT buttons, e.g. in [FIO Burn](/help/fio_burn).
