[Management](/manage) is where you organise your account: create and delete empires and exchange preferences, connect each empire to its prices, and decide which plans belong to which empire.

## Core Concepts {#core-concepts}

PRUNplanner keeps your planning in three kinds of things, one section of the page each.

### Plans {#plans}

A [[plan]] is one base: its planet, buildings, recipes and bonuses. You create a plan from a planet in [Planet Search](/search). A plan can be in several empires at once, or in none, so you can reuse it in an empire of your real bases and in one for a future expansion.

A plan has no exchange preference of its own. It uses the [[exchange-preference|exchange preference]] of its empire; when it is in several empires, the one you open it in.

### Empires {#empires}

An [[empire]] is a group of plans, for example all bases you run in the game, or a set you want to compare. It holds your [[faction]] and [[area-permits|permits]], which change the production bonus of every plan in it, and it uses one exchange preference for its prices. The [Empire](/help/empire) page shows an empire's numbers.

### CX {#cx}

An exchange preference holds your price rules: which [[cx|exchange]] and price basis to use, and fixed prices. One preference can serve several empires, but an empire uses only one. You edit its rules on [Exchanges](/help/exchanges).

## Empire Configuration {#empire-configuration}

The **Empire Configuration** table lists your empires with faction, permits (used / total), number of plans and the exchange preference in column CX.

- **New Empire** opens a form: **Empire Name** (required, up to 100 characters), **Faction**, **Permits Total** (at least 2) and **Permits Used** (at least 1, not more than the total). **Create** saves the empire at once.
- Pick the empire's exchange preference in column CX, or "None" (then prices are Universe · VWAP 30D). This change waits for the save bar.
- Deleting an empire asks first. Its plans are not deleted; they just lose that empire.

You change an empire's name, faction and permits later on the [Empire](/help/empire#configuration) page.

## CX Configuration {#cx-configuration}

The **CX Configuration** table lists your exchange preferences and whether an empire uses them (**Yes** with the number of empires, or **No**).

- The button above the table opens a form for a new preference: a name of up to 100 characters, then **Create**. It saves at once.
- Click a preference's name to edit its rules on [Exchanges](/exchanges).
- Deleting a preference asks first and deletes all its rules. Empires that used it keep working, but without a preference, so assign another one.

## Plan ↔ Empire Assignments {#assignments}

This table has one row per plan and one checkbox column per empire. Tick a box to put the plan into that empire, untick it to take it out. Changed boxes are marked "Will be added to …" or "Will be removed from …" until you save.

- **Search plan or planet**, **In empire** and the unassigned-only filter narrow the rows. The checkbox in an empire's column header adds or removes every plan the search and filters show.
- **Actions** on a row: **Clone** copies the plan as "name (Clone)", saved at once and in no empire; **Share…** creates a share link (see [Sharing a plan](/help/plan_sharing#share-link)); **Delete…** deletes the plan after you confirm. Deleting can't be undone.
- To delete several plans, tick them in the first column and press **Delete selected…**. The box in that column's header ticks every plan the search and filters show, also those you have to scroll to. You confirm once for all.

On phones, the table becomes a list of cards.

## Saving {#saving}

Exchange preference picks and assignment boxes are collected in the save bar at the bottom: it counts your changes, **Save changes** saves them all, **Discard** drops them. If saving fails, your changes stay and you can **Retry**. The page asks before you leave with unsaved changes.

Creating, deleting and cloning save at once, without the save bar.
