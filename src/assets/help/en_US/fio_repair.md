[FIO Repair](/fio/repair) tells you when each of your real bases is due for [[repair]], what the repair costs and what to load on the ship. It reads your buildings from [[FIO]], so you'll need a [FIO connection](/help/profile#fio-connection) first.

## Due Dates {#due-dates}

FIO Repair reads each base's production buildings from FIO, with their condition and the day they were last repaired (or built, if they never were). Habitations, storage and the core module age too, but they need no repair materials, so they're left out.

Each building type comes due at a target day:

- **With a matched plan**, the target is the type's best repair day from that plan's Repair Analysis (see [Plan tools](/help/plan_tools#repair)), priced with the exchange preference of the plan's empire. A building type the plan doesn't have uses the interval below.
- **Without a plan**, the target is the interval from the settings (**Repair every** n days, default 60).

The oldest building of a type sets when that type is due, and a base comes due with its first building type. A base is *due soon* when its target is at most **Due soon** days away (default 7). If a building has no date at all, its base shows **No repair date**. It counts as overdue and gets billed as a new building.

## Settings {#settings}

The settings bar sits at the top:

| Setting | Default | What it does |
| --- | --- | --- |
| **Use matched plans** | on | Uses matched plans' best days. When it's off, every base repairs at the interval. It's on each time you open the page. |
| **Repair every** / **Without a plan, every** | 60 days | The interval for bases without a plan (1–180) |
| **Due soon** | 7 days | Days before the target day that count as due soon (0–60) |
| **Exchange Preference** | your **Default CX** | Prices for the repair materials |

The interval, the due soon days and the exchange preference are the same settings you'll find in [Profile](/help/profile#preferences), and they're saved to your account.

## Overview {#overview}

- **Overdue**, **Due within n d** and **Later** count your bases. Click one to filter the list. Overdue includes bases without a repair date.
- **Repair what's due, today** is the cost, weight and volume of repairing every overdue and due-soon base today.
- **Waiting costs** is how much more that repair costs for each day you wait. Each of those buildings younger than 180 days adds 1/180 of its construction cost.
- **When bases come due** is a timeline that runs from the most overdue base to the last one due. Click a base to open it.
- The **Bases** list shows each base's buildings, lowest condition, days since repair (or since built), next repair, and **Repair now**, the bill for repairing every production building today. Under the name you can see which plan sets the targets: "plan …", "likely plan …", "plan … (your choice)" or "no plan · every n d".

When your FIO data is more than a day old, a note tells you so. The buildings have aged since then, so conditions are lower and amounts higher than shown. Ages are always counted to today.

## Matched Plans {#matched-plans}

A plan matches a base when it's on the same planet and its production buildings match FIO well enough. Per building type, PRUNplanner counts the buildings both have and divides by the larger total (FIO's or the plan's). The plan matches from 80 %, so extra buildings in the plan lower the score too.

- **Matched**: all buildings match.
- **Likely**: at least 80 % match. Check that it's the plan you run.

When several plans qualify, the best score wins. On a tie, the plan in the empire that covers most of your bases wins. To pick another plan, or no plan, open a base and use **Repair target**, where each option shows its % match. PRUNplanner saves your pick for that base in your preferences, on every device. **Back to automatic match** undoes it. When none of your plans is on that planet, **Create a plan for {planet}** starts a new plan there.

## Repair Flight {#repair-flight}

Open a base to plan the repair. Its table lists each building type with its target, days since repair, condition and due day.

Repairing gets more expensive every day. The bill grows until day 180, when it equals a new building. In **Repair flight**:

- **Arrives in** n days (default 2, 0–30) sizes the bill for the day the ship unloads, and shows how much more that costs than repairing today. Add a day or two for long flights.
- **Use what's already in the base store** takes off what the base already holds.
- The load list shows every material with **Cargo weight** and **Cargo volume**, plus the total price.

**XIT Repair** builds an [[xit|XIT]] ACT package with the load for Refined PrUn to run. It uses the same XIT origin and "Buy from CX" setting as FIO Burn (you set both in [Profile](/help/profile#preferences)). The ship gets picked when the XIT runs, and it needs the load's tonnes and cubic metres of free cargo. Fly to the base, unload and run BRA to repair all its buildings.

## Prices {#prices}

Prices come from your **Default CX** (shown here as **Exchange Preference**), using only its all-planets rules and fixed prices. Planet exceptions aren't used. If you have no default, or it was deleted, prices are Universe · VWAP 30D. See [Exchanges & prices](/help/exchanges).
