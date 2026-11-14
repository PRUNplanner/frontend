[FIO Burn](/fio/burn) tells you which base needs a resupply first and builds the [[xit|XIT]] load for it. It shows how many days the stock of each of your bases lasts, based on your plans and your real storage from [[FIO]].

## Before You Start {#before-you-start}

- You need a [FIO connection](/help/profile#fio-connection). Without one, the page asks you to connect FIO in your Profile.
- The page shows one [[empire]], which you pick under **Empire**. That also makes it your **Default Empire**. With no empire, the page offers **Create empire**.
- Each plan of the empire must be on the planet of a base you have in the game. If FIO has no base store on a plan's planet, every stock counts as 0. If a plan shows 0 for every stock, check that it sits on the planet your base is on.

The header shows when FIO last updated your data ("FIO Data Update"). [Profile](/help/profile#fio-connection) explains how fresh that is.

## Calculations {#calculations}

FIO Burn calculates every plan of the empire, the same way the Empire page does, and takes each plan's [[material-io|Material I/O]] (production and workforce needs).

For each material the plan uses more of than it makes:

*days left = stock ÷ net daily consumption*

The stock is the amount of that material in your base store on the plan's planet, from FIO. A material the plan makes as much of as it uses, or more, never runs out ("produced here"). A plan's **Burn** is its lowest days left.

The net daily consumption is what the plan uses of the material per day minus what it makes. The plan table shows it as a negative **Delta** (production − consumption), so a **Delta** of −30 means 30 net a day. For example, a plan that uses 40 of a material a day and makes 10 consumes 30 net a day. With 300 in the store, that lasts 300 ÷ 30 = 10 days.

FIO Burn doesn't count:

- Warehouses and ships. It only looks at the base store on the planet.
- [[Degradation]] and repair materials, which aren't part of Material I/O. Use [FIO Repair](/help/fio_repair) for those.
- What really runs in the game. The numbers come from your plan, so if the plan differs from your base, you'll get different days.

> [!warning]
> Each plan counts the whole store of its planet. If two plans in the same empire sit on one planet, both see all of the stock, so the days left come out too high. Keep one plan per planet in the empire you check.

## Thresholds {#thresholds}

Colours show how soon a material runs out, in *days of supply left*:

- **Red**: days left at or below the red threshold (default 5).
- **Yellow**: days left at or below the yellow threshold (default 10).

With the defaults (red 5, yellow 10), a material with 4 days left shows red, one with 8 shows yellow, and one with 12 has no colour.

You can set both under **Burn Thresholds** on this page or in [Profile](/help/profile#preferences) (**Red Threshold**, **Yellow Threshold**). It's the same preference, saved to your account. Both are at least 1. Keep yellow above red, or nothing shows yellow.

## Plan Burn Overview {#overview}

**Plan Burn Overview** gives one row per plan, with the plan's **Burn** and a strip that has one dot per consumed material at its days left. The strip runs from 0 to three times the yellow threshold, and materials beyond it are counted as "+n". Hover or tap a dot to see which material it is. The summary counts the red and yellow materials.

## Plan Table {#plan-table}

Beside the overview (below it on narrower screens), each plan has a row with its **Exhaustion** (lowest days left) and an XIT button. Expand the row to see which material runs out first, how many more are under the yellow threshold, and how many the plan makes itself. Its table lists every material with **Consumption** and **Production** (both on wide screens only), **Delta**, **Stock**, a **Runway** bar and its **Burn** in days.

## XIT Resupply {#xit-resupply}

The XIT button opens the resupply for that plan's base (**XIT Resupply: {plan_name}**):

| Control | What it does |
| --- | --- |
| **Origin** | Where the ship loads: **Configure on Execution** or a station warehouse. The default comes from **XIT Origin** in Profile. |
| **Target Days** | How many days of supply to bring. The default comes from **Resupply Days** in Profile (20). |
| **Buy From CX** | Buys the materials at the origin's exchange first. It only works with a warehouse origin. The default comes from **XIT Buy from CX** in Profile. |
| **Fit Ship** | 500, 1k, 2k, 3k/1k, 1k/3k or 5k (t / m³). Sets the largest number of days, up to 100, whose load fits. |
| **Hide Infinite** | Hides materials that never run out. |

**Fit Ship** writes its result into **Target Days**. It starts from the days set there, takes away days until the load fits both the ship's weight and its volume, then adds days as long as it still fits.

**Origin**, **Target Days** and **Buy From CX** are your Profile preferences. A change here is saved to your account. Origin and buying also apply to the other XIT actions, such as FIO Repair's and the plan carts'.

The amount per material is what tops the stock up to the target days: net daily consumption × days − stock, rounded up, never below 0. You can untick a material or override its amount. The totals show weight, volume and price. The price is an estimate at Universe · VWAP 30D buy prices, not your exchange preference, so it can differ from what you pay at the origin's exchange.

In the example from [Calculations](/help/fio_burn#calculations), with **Target Days** at 20 the amount is 30 × 20 − 300 = 300 units, which tops the store up to 600, 20 days of net use.

**Copy XIT JSON** copies the package ("PRUNplanner Burn Supply") for Refined PrUn. With **Buy From CX**, it first buys at the origin's exchange and then transfers the load. You choose the destination when you run it.
