New to PRUNplanner? This guide takes about 15 minutes. By the end your [[empire]] is set up, your prices come from your home exchange, and you have a first saved [[plan]] whose profit and payback you can read.

You need an account. A new one already comes with an empire and an [[exchange-preference|exchange preference]], so most of this is checking and adjusting.

## 1. Check your empire {#step-1}

Open [Empire](/empire). A new account has one empire, "My Empire", with no [[faction]] and 1 of 2 permits used. While it has no plans, the page shows three steps. The first one, **Your empire**, holds its settings.

1. Pick your **Faction**. It gives the buildings of its [[expertise]] a bonus in every plan of the empire.
2. Set **Permits Total** and **Permits Used** to what your in-game HQ shows. The fewer permits you use, the larger the faction bonus.
3. Press **Save**.

When the step shows **Saved**, you're done here. Once the empire has plans, you'll find the same fields in the **Configuration** box on the Empire page.

> [!tip]
> Want a second empire, for example to test an expansion without touching your real bases? Create it in [Management](/manage) with **New Empire**.

Read more: [Empire configuration](/help/empire#configuration), [Faction bonus](/help/plan_base#faction).

## 2. Set your home exchange {#step-2}

Your prices come from your exchange preference. A new account has "My Exchange Preference", which "My Empire" already uses. It's set to **Universe · VWAP 30D**, the 30-day average across all four exchanges. Most players buy and sell on one home exchange instead.

1. Open [Exchanges](/exchanges). It opens your preference. If you have several, **Switch Preference** picks another one.
2. In the list on the left, open **All planets**.
3. In the **Exchange price** box, under **How buy and sell prices are set**, keep **Same for buy and sell** and pick your home exchange: AI1 at Antares Station, CI1 at Benten, IC1 at Hortus or NC1 at Moria.
4. Pick a price basis, or click the preset **Average · VWAP 30D**.
5. Press **Save changes** in the bar at the bottom.

If the **Overview** shows the new rule under **All planets**, it worked. Once you have plans, the Overview lists every price they use, and amber prices mark materials that count as 0 ȼ.

Details: [Set up your prices](/help/guide_cx_prices), [Setting an exchange rule](/help/exchanges#exchange-rule).

## 3. Find a planet {#step-3}

Open [Planet Search](/search).

1. Under Materials, use **+ add material…** to add what you want to make or extract. Each option shows how many planets you'd get.
2. Under **Distance**, tick your home exchange under **Exchanges** and lower **Max jumps**, so supply flights stay short.
3. Turn on **Plots** under **Columns** to see which planets still have free [[plots]].

You're looking for a short list where the material's tile is green or yellow (close to the best planet's output), with few jumps and free plots. A red ⊘ next to a name means the planet is full.

More: [Find a planet for a material](/help/guide_find_planet), [Planet Search](/help/planet_search#materials).

## 4. Create the plan {#step-4}

Click "+" on the planet's row. A new plan for that planet opens in a new tab, so you don't lose your search.

1. **Empire & prices**: **Calculate with empire** shows the empire the plan calculates with. A new plan starts with your first empire, and when you create the plan it joins the empire selected there. **Prices** names the exchange preference it uses.
2. **Planet**: the **COGC** select starts with the program the planet runs now. For a first base, leave **Permits** at 1 (500 area).
3. Production: pick a building in the building select, then click **+ Recipe** and pick a [[recipe]]. Set **Count** to how many you build. For extraction, click a resource tile under **Planet** instead. That adds the extractor and its recipe.
4. **Infrastructure**: leave **Auto** on. It picks the cheapest habitations that house all your workers.

> [!tip]
> On a planet many players plan on, an empty plan offers a card "Start from a typical setup on …" with the buildings and experts others use there. It shows what others plan, not what earns most, so check the numbers before you keep it.

Read more: [Base setup](/help/plan_base), [Production & recipes](/help/plan_production#adding-buildings).

## 5. Read the results {#step-5}

The tiles at the top update with every edit.

| Tile | What to look for |
| --- | --- |
| **Profit / day** | Positive. It's revenue minus bought materials, [[degradation]] and [[production-fees\|production fees]]. |
| **Payback** | Days until the base has paid for itself. "never" means it makes no profit. |
| **Workforce** | Red means a tier has fewer beds than workers. |
| **Area** | The used figure turns red when the base needs more area than your permits give. |
| **Storage** | Days until the storage is full, which tells you how often a ship must come. |

[[material-io|Material I/O]] on the right lists what the base makes and uses per day. A positive Δ gets sold, a negative one bought. A flag after a material means the market may not take that amount. Click it to open Plan check.

> [!tip]
> Try one change at a time and watch **Profit / day**: another recipe, one more building, or a luxury turned off in **Workforce**. **Undo** (Ctrl+Z) takes a change back.

Details: [Results](/help/plan_results), [Plan check](/help/plan_check#market-check).

## 6. Save the plan {#step-6}

1. Click the pencil next to the plan's name and type a name.
2. Press **Create** (or Ctrl+S, Cmd+S on a Mac).

Once the state reads "Saved …", the side menu lists the plan under **Plans** whenever it shows the plan's empire. From now on every save keeps a version, and PRUNplanner keeps unsaved changes as a draft, so closing the tab loses nothing.

More: [Saving & versions](/help/plan_saving).

## Next {#next}

- [Find a planet for a material](/help/guide_find_planet): get the most out of every Planet Search filter.
- [Set up your prices](/help/guide_cx_prices): buy and sell rules, planet exceptions and fixed prices.
- [Grow to an empire](/help/guide_empire): for when you plan your second base.
