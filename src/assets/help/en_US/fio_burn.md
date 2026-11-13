[FIO Burn](/fio/burn) shows how many days the stock of each of your bases lasts, based on your plans and your real storage from [[FIO]]. Use it to see which base needs a resupply first and to build the [[xit|XIT]] load for it.

## Before You Start {#before-you-start}

- You need a [FIO connection](/help/profile#fio-connection). Without one, the page asks you to connect FIO in your Profile.
- The page shows one [[empire]]: pick it under **Empire**. That also makes it your **Default Empire**. With no empire, the page offers **Create empire**.
- Each plan of the empire must be on the planet of a base you have in the game. A plan on a planet where FIO has no base store counts every stock as 0.

The header shows when FIO last updated your data ("FIO Data Update"). See [Profile](/help/profile#fio-connection) for how fresh it is.

## Calculations {#calculations}

FIO Burn calculates every plan of the empire, as on the Empire page, and takes each plan's [[material-io|Material I/O]] (production and workforce needs).

For each material the plan uses more of than it makes:

*days left = stock ÷ net daily consumption*

The stock is the amount of that material in your base store on the plan's planet, from FIO. Materials the plan makes as much as or more than it uses never run out ("produced here"). A plan's **Burn** is its lowest days left.

What it doesn't count:

- Warehouses and ships: only the base store on the planet.
- [[Degradation]] and repair materials: they are not part of Material I/O. Use [FIO Repair](/help/fio_repair).
- What really runs in the game: the numbers come from your plan, so a plan that differs from your base gives different days.

> [!warning]
> Each plan counts the whole store of its planet. With two plans on one planet in the same empire, both see all of the stock, so the days left are too high. Keep one plan per planet in the empire you check.

## Thresholds {#thresholds}

Colours mark how soon a material runs out, in *days of supply left*:

- **Red**: days left at or below the red threshold (default 5).
- **Yellow**: days left at or below the yellow threshold (default 10).

Set both under **Burn Thresholds** on this page or in [Profile](/help/profile#preferences) (**Red Threshold**, **Yellow Threshold**); they are the same preference, saved to your account. Both are at least 1. Keep yellow above red, or nothing shows yellow.

## Plan Burn Overview {#overview}

**Plan Burn Overview** gives one row per plan: a strip with one dot per consumed material at its days left, and the plan's **Burn**. The strip runs from 0 to three times the yellow threshold; materials beyond it are counted as "+n". Hover or tap a dot to see which material it is. The summary counts red and yellow materials.

## Plan Table {#plan-table}

Below, each plan has a row with its **Exhaustion** (lowest days left) and an XIT button. Expand it to see which material runs out first, how many more are under the yellow threshold, and how many the plan makes itself. The table lists every material with **Consumption**, **Production** (on wide screens), **Delta**, **Stock**, a **Runway** bar and its **Burn** in days.

## XIT Resupply {#xit-resupply}

The XIT button opens the resupply for that plan's base (**XIT Resupply: {plan_name}**):

| Control | What it does |
| --- | --- |
| **Origin** | Where the ship loads: **Configure on Execution** or a station warehouse. Default from **XIT Origin** in Profile. |
| **Target Days** | How many days of supply to bring. Default from **Resupply Days** in Profile (20). |
| **Buy From CX** | Buy the materials at the origin's exchange first. Only with a warehouse origin. Default from **XIT Buy from CX** in Profile. |
| **Fit Ship** | 500, 1k, 2k, 3k/1k, 1k/3k or 5k (t / m³): sets the largest number of days, up to 100, whose load fits. |
| **Hide Infinite** | Hides materials that never run out. |

**Origin**, **Target Days** and **Buy From CX** are your Profile preferences: a change here is saved to your account and also applies to FIO Repair's XIT origin and buying.

The amount per material is what tops the stock up to the target days: net daily consumption × days − stock, rounded up, never below 0. You can untick a material or override its amount. The totals show weight, volume and price. The price is an estimate at Universe · VWAP 30D buy prices, not your exchange preference.

**Copy XIT JSON** copies the package ("PRUNplanner Burn Supply") for Refined PrUn: with **Buy From CX** it first buys at the origin's exchange, then transfers the load. The destination is chosen when you run it.
