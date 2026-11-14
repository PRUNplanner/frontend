One base is a plan. Several bases that feed each other are an [[empire]]. In about 15 minutes this guide puts your bases into one empire, sets its faction and permits, and shows you how to read the Empire page: what the bases earn together, what they make and need, whether the market can take it, and what to build next. It's for players with two or more bases or plans. You need an account.

## 1. Put your bases in one empire {#step-1}

Open [Management](/manage) and scroll to **Plan ↔ Empire Assignments**. It has one row per [[plan]] and one checkbox column per empire.

1. Tick the empire's box on every plan that belongs to it. Changed boxes stay marked until you save.
2. Press **Save changes** in the bar at the bottom.

A plan can be in several empires, for example one with your real bases and one for a future expansion. It calculates with one empire at a time and uses that empire's faction, permits and [[exchange-preference|exchange preference]].

> [!tip]
> Want to try a variant of a base without changing the original? **Clone** under **Actions** copies the plan. Put the copy in a test empire.

Read more: [Plan ↔ Empire assignments](/help/management#assignments), [Core concepts](/help/management#core-concepts).

## 2. Set faction and permits {#step-2}

Open [Empire](/empire) and pick the empire under **Switch Empire**. In the **Configuration** box, set **Faction**, **Permits Total** and **Permits Used**, then press **Save**.

- Permits come from your HQ. Each HQ level upgrade gives one more base permit, and the [HQ Calculator](/hq-upgrade-calculator) lists what an upgrade costs.
- The [[faction]] bonus grows the fewer permits you use, so these numbers change every plan of the empire.
- When **Permits Used** differs from the permits your plans add up to, you'll see a "Mismatch Detected" warning. Take the right values from your in-game HQ.

More: [Configuration](/help/empire#configuration), [Area and permits](/help/glossary#area-permits).

## 3. Read the overview numbers {#step-3}

The tiles on top sum up the empire per day: **Revenue**, **Cost**, **Profit** and **Profit / Area**.

The empire isn't a plain sum of its plans. What one plan makes and another uses cancels out first, and only the rest gets sold or bought, at the plans' average price. That's why the empire's numbers can differ from its plans' profits added up.

- The bar below splits revenue into inputs, workforce, [[degradation]], [[production-fees|production fees]] and profit.
- **Shipping** shows the tonnes and m³ your plans ship in and out per day.
- The plan list shows each plan's profit. Click one to open it.

Details: [Overview numbers](/help/empire#overview-numbers), [Plan list](/help/empire#plan-list).

## 4. Balance the materials {#step-4}

Under **View**, open **Material I/O**. It lists every material of the empire with its **Delta** (made minus used per day).

- A positive Delta gets sold, a negative one bought. A large negative Delta of something you could make is a candidate for your next base.
- With **Display** set to **Loadbalance**, you only see materials the empire both makes and uses. Check that supply and demand match.
- Expand a row to see which plans make and use the material. **Net per planet** adds up plans on the same planet.

More: [Material I/O](/help/empire#material-io).

## 5. Check the market {#step-5}

**Market check on the empire's net flow**, above the table, checks what the empire as a whole sells and buys against the exchange's trading. Chips count the flags: red ("can't trade as planned"), amber ("large share of the market") and other notes. Click a chip to show only those materials.

- From 10 % of a material's daily volume, your orders will likely move the price. From 50 %, the market can't take the amount as planned.
- The check uses the *all-planets* rules of the empire's exchange preference. If a material has a planet exception, that plan's own [Plan check](/help/plan_check#market-check) checks it.

> [!tip]
> A red flag on an output doesn't make a base bad. Fewer buildings, a second output or another exchange can bring the share down.

Read more: [Market check](/help/empire#market-check), [Plan check: Empire](/help/plan_check#empire).

## 6. Find production opportunities {#step-6}

Under **View**, open **Production Opportunities** to see [[recipe|recipes]] that could use what your empire has left over.

- **Opportunities**: recipes where every input is in surplus, enough for at least one run a day.
- **Potential Batches**: how many runs a day your surplus covers. It ignores recipe time, buildings and efficiency, so read it as "how much input there is", not "how much you can make".
- **Sell Inputs** and **Sell Outputs** compare selling the surplus as it is with selling what the recipe would make of it.

More: [Production Opportunities](/help/empire#production-opportunities).

## 7. Check the chains behind your bases {#step-7}

In [Production Chains](/production-chain), switch **Mode** to **Check an empire** and pick the empire. Add the chains to check, or pick **Check everything the empire sells**.

The check follows each sold material back through your plans and lists findings with their gain per day. A **Plan fix** means the plan counts a COGC program the planet doesn't run, or misses one it does. The other findings are a cheaper **Recipe**, **Make or buy**, a better **Location**, or a better **Setup** of luxuries and experts. It never changes a plan.

> [!tip]
> Do the plan fixes first. They cost nothing to build, and the plan's numbers are off until you do.

Details: [Check an empire](/help/tools_production_chain#check-an-empire), [Findings](/help/tools_production_chain#findings).

## Next {#next}

- [Hand off to the game](/help/guide_hand_off): build, supply and repair your bases with XIT packages.
- [From a chain to bases](/help/guide_chain_to_bases): plan the next chain and add it to this empire.
