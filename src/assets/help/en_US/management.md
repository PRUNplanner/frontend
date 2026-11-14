[Management](/manage) is where you organise your account. You create and delete empires and exchange preferences, connect each empire to its prices, and decide which plans belong to which empire. You'll use it to set up your first empire and exchange preference, and later to move plans between empires or delete the ones you no longer need.

## Core Concepts {#core-concepts}

PRUNplanner keeps your planning in three kinds of things, and each one gets its own section of the page.

### Plans {#plans}

A [[plan]] is one base: its planet, buildings, recipes and bonuses. You create a plan from a planet in [Planet Search](/search). A plan can be in several empires at once, or in none. That way you can reuse it in an empire of your real bases and in one for a future expansion.

A plan has no exchange preference of its own. It uses the [[exchange-preference|exchange preference]] of its empire. If it's in several empires, it uses the one of the empire it calculates with, which you pick on the plan (see [Empire & prices](/help/plan_base#empire-and-prices)).

### Empires {#empires}

An [[empire]] is a group of plans, for example all the bases you run in the game, or a set you want to compare. It holds your [[faction]] and [[area-permits|permits]], which change the production bonus of every plan in it, and it uses one exchange preference for its prices. The [Empire](/help/empire) page shows an empire's numbers.

The faction and permits matter because they set the [[faction]] bonus: buildings of your faction's expertise get a bonus that's larger the fewer of your permits you use. For example, with 1 of 2 permits used PRUNplanner counts the faction's base bonus 4 times, and with 2 of 2 used twice. That's why the page asks you to give each empire your faction and the right permits, so the plans' efficiency comes out right.

### CX {#cx}

An exchange preference holds your price rules: which [[cx|exchange]] and price basis to use, and fixed prices. One preference can serve several empires, but an empire uses only one. You edit its rules on [Exchanges](/help/exchanges).

## Empire Configuration {#empire-configuration}

The **Empire Configuration** table lists your empires with their faction, permits (used / total), number of plans and the exchange preference in column CX. Until you have one, the table says "No Empires available", and **New Empire** is where you start.

- **New Empire** opens a form with **Empire Name** (required, up to 100 characters), **Faction**, **Permits Total** (at least 2) and **Permits Used** (at least 1, not more than the total). **Create** saves the empire at once.
- Pick the empire's exchange preference in column CX, or pick "None" to get Universe · VWAP 30D prices. This change waits for the save bar.
- Deleting an empire asks first. Its plans aren't deleted. They only lose that empire.

You can change an empire's name, faction and permits later on the [Empire](/help/empire#configuration) page.

## CX Configuration {#cx-configuration}

The **CX Configuration** table lists your exchange preferences and whether an empire uses them (**Yes** with the number of empires, or **No**).

- The button above the table opens a form for a new preference. Give it a name of up to 100 characters and press **Create**, which saves it at once.
- Click a preference's name to edit its rules on [Exchanges](/exchanges).
- Deleting a preference asks first and deletes all its rules. Empires that used it keep working, but without a preference, so assign them another one. Until then they get Universe · VWAP 30D prices, the same as "None".

## Plan ↔ Empire Assignments {#assignments}

This table has one row per plan and one checkbox column per empire. Tick a box to put the plan into that empire, and untick it to take the plan out. Until you save, changed boxes are marked "Will be added to …" or "Will be removed from …".

- **Search plan or planet**, **In empire** and the unassigned-only filter narrow the rows. The checkbox in an empire's column header adds or removes every plan the search and filters show.
- Each row has **Actions**. **Clone** copies the plan as "name (Clone)", saved at once and in no empire. **Share…** creates a share link (see [Sharing a plan](/help/plan_sharing#share-link)). **Delete…** deletes the plan after you confirm, and you can't undo it.
- To delete several plans, tick them in the first column and press **Delete selected…**. The box in that column's header ticks every plan the search and filters show, including the ones you'd have to scroll to. You confirm once for all of them. If some plans can't be deleted, they stay ticked and a message says how many, so you can try again.
- If the search and filters leave no rows, the table says "No plans match the search and filters."

On phones, the table turns into a list of cards.

## Saving {#saving}

Exchange preference picks and assignment boxes collect in the save bar at the bottom. It counts your changes, **Save changes** saves them all and **Discard** drops them. After a save, "All changes saved" shows for a few seconds. If saving fails, your changes stay and you can **Retry**. The page asks before you leave with unsaved changes.

Creating, deleting and cloning save at once, without the save bar.
