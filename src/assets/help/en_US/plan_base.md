The base setup decides which prices and bonuses apply to your base, how many workers are housed and fed, and what lifts your buildings' [[efficiency]]. In the Standard layout it's the group of parts on the left of a plan: **Empire & prices**, **Planet**, **Workforce**, **Infrastructure** and **Experts**. Together they hold everything about the base that isn't a production building, and every change here flows straight into [Production](/help/plan_production) and the [results](/help/plan_results).

## A new plan {#new-plan}

A new plan starts with these settings:

| Setting | Starts as |
| --- | --- |
| COGC program | The planet's current program; **None** when it has none |
| **Corp. HQ** | Off |
| **Permits** | 1 (area 500) |
| Luxuries | Both on for every tier |
| Experts | None |
| **Auto** (habitations) | On |
| Empire | See [Empire & prices](#empire-and-prices) |

## Empire & prices {#empire-and-prices}

A plan calculates with one [[empire]]. It takes that empire's [[faction]] and permits, and its [[exchange-preference|exchange preference]] for every price. So the empire decides which of your buildings get a faction bonus and how large it is (see [Faction bonus](#faction)), and every price the plan buys and sells at.

**Calculate with empire** lists your empires by name, and the ones the plan is in start with "»". It doesn't show on a read-only plan or when you have no empires.

When you open a plan, it picks your current empire if the plan is in it, otherwise the first empire the plan is in. A plan in no empire uses your first empire. Your current empire is the default empire from [Profile](/profile), and switching empires on the [Empire](/empire) page changes it.

On a saved plan, picking another empire only changes how this page calculates. It doesn't add the plan to that empire or remove it from another, and it isn't saved. A new plan joins the empire you picked when you first save it. You set which empires hold a plan in [Management](/manage).

The note underneath ("Faction …, permits from the empire. Plan is in … empires.") names the faction whose bonus applies and how many empires hold the plan.

**Prices** shows the name of the empire's exchange preference, as a link to that preference in [Exchanges](/exchanges) for this planet. Without a preference it reads **Universe · VWAP 30D (no preference)**, which is the 30-day [[vwap|VWAP]] across all exchanges.

From this price book, the plan prices what it sells at the sell price. What it buys (inputs, workforce consumables, construction materials) it prices at the buy price. [Exchanges](/help/exchanges#how-a-price-is-found) explains how a price is found and how to fix prices or set them per planet.

> [!tip]
> Two empires with different exchange preferences can show very different profits for the same plan. Switch **Calculate with empire** to check a plan against the market where you'd really sell.

### Faction bonus {#faction}

A faction lifts the buildings of its [[expertise|expertises]]. PRUNplanner applies the bonus as a factor on the building's efficiency:

1 + bonus × 2 × (3 − 2 × permits used ÷ permits total)

The permits are the empire's, as set in its settings. If you use all of them, you get 1 + 2 × bonus. Using fewer gives more.

| Faction | Expertise and bonus |
| --- | --- |
| Antares | Electronics 5 % |
| Benten | Manufacturing 5 % |
| Hortus | Agriculture 3 %, Food Industries 2 % |
| Moria | Metallurgy 2 %, Construction 3 % |
| Outside Region | Chemistry, Fuel Refining and Resource Extraction 2 % each |

For example, an Antares empire using all its permits gives Electronics buildings 1 + 0.05 × 2 = 1.10, so +10 %.

## Planet {#planet}

The **Planet** part sets what the planet gives your base: its COGC program, a corporation HQ, your permits and its resources.

### COGC program {#cogc}

The **COGC** select picks the planet's [[cogc|COGC]] program. You can choose **None**, one of the nine expertise programs (Agriculture to Resource Extraction) or one of the five workforce programs (Pioneers to Scientists).

A new plan starts with the program the planet runs now. You can pick any other to plan ahead, since the residents vote on it and it can change every week.

An expertise program multiplies the efficiency of every building of that expertise by 1.25 (+25 %). A workforce program multiplies the efficiency of every building that employs that tier by 1.1 (+10 %). In Production, a building's expertise turns green with ✓ when the program lifts it.

### Corp. HQ {#corp-hq}

Tick **Corp. HQ** when the [[corp-hq|corporation]] you belong to has its headquarters on this planet (your own company's HQ doesn't count). It multiplies the efficiency of every production building by 1.1 (+10 %), and it's off by default.

### Permits and area {#permits}

**Permits** (1 to 3) sets how many base permits you use on this planet. The area next to it is 250 + 250 × permits: 500, 750 or 1,000. The **Area** result shows how much of it the base uses (see [Results](/help/plan_results#area)). The [[core-module|core module]] always takes 25 of it, and every production building, habitation and storage building takes its own area × count.

In the game, each upgrade of your company HQ's level gives you one more base permit. This field only sets the plan's area. The faction bonus counts the empire's permits instead (see [Faction bonus](#faction)).

### Resources {#resources}

**Resources** shows a tile for each resource of the planet. The number on it is what one extractor makes per day at 100 % efficiency.

Click a tile to start extracting that resource. If the plan doesn't have the right extractor yet (EXT for minerals, COL for gases, RIG for liquids), PRUNplanner adds one with a count of 1. It also adds that resource's recipe as an order of 1, unless the extractor already runs it. Then you set the count in Production.

With **Plan suggestions** on and planet insights available, a link under the tiles ("… plans on … · what others build here") opens what other players plan on this planet. More in [Layout](/help/plan_layout).

### Fertility {#fertility}

[[fertility|Fertility]] only matters for farms (FRM and ORC). Their efficiency gets the factor 1 + fertility × 10 ÷ 33, so positive fertility speeds them up and negative fertility slows them down. On a planet that isn't fertile at all, farms run at 0 % and Production says "Planet not fertile".

> [!tip]
> Every building also needs the planet's [[extra-building-materials|extra building materials]] for its surface, gravity, pressure and temperature. They're in the build cost behind **Payback** and in the Construction tool, so a harsh planet shows up as a longer payback.

## Workforce {#workforce}

**Workforce** has an entry for each [[workforce]] tier the plan needs workers of. Each one shows:

- "need / housed": the workers your buildings need and the beds your habitations give, with a meter;
- the tier's **Efficiency** in %;
- **Luxuries**: two buttons, one per [[luxuries|luxury]], with its ticker, ✓ when supplied;
- "… free": spare beds, red and negative when the tier is short.

A negative "… free" only means the tier has more workers than beds. Add habitations in [Infrastructure](#infrastructure), or turn on [Auto](#auto-habs) to have PRUNplanner pick them for you.

Tiers the plan doesn't need stay behind "Show … (not needed)". In the layout's **Display** options you can show Workforce as a table (**Tier**, **Need / housed**, **Free**, **Luxuries**, **Efficiency %**) or with every tier open (see [Layout](/help/plan_layout)).

### How efficiency is worked out {#workforce-efficiency}

A tier's efficiency is:

- the share of its workers that have a bed (at most 100 %),
- × 79.4 % as the base,
- × 12/11 when its first luxury is supplied,
- × 15/13 when its second luxury is supplied.

| Luxuries supplied | Efficiency (all housed) |
| --- | --- |
| None | 79.4 % |
| First only | 86.7 % |
| Second only | 91.7 % |
| Both | 100 % |

Missing beds lower the first factor. For example (made-up numbers), a plan that needs 100 Pioneers but has beds for 50 houses half of them: without luxuries, the tier runs at 50 % × 79.4 % = 39.7 %, and with both luxuries at 50 % × 100 % = 50 %.

A building's workforce factor is the average of its tiers' efficiencies, weighted by how many workers of each tier it employs.

### Needs and luxuries {#needs}

Housed workers consume their needs every day. Workers without a bed consume nothing, but they don't work either. If you turn a luxury off, it isn't consumed or bought, and the tier's efficiency drops. Everything consumed shows in [Material I/O](/help/plan_results#material-io) and counts as cost.

Consumption per 100 workers per day, so 200 housed Pioneers drink 2 × 4 = 8 DW a day:

| Tier | Needs | Luxury 1 | Luxury 2 |
| --- | --- | --- | --- |
| Pioneer | DW 4, RAT 4, OVE 0.5 | PWO 0.2 | COF 0.5 |
| Settler | DW 5, RAT 6, EXO 0.5, PT 0.5 | REP 0.2 | KOM 1 |
| Technician | DW 7.5, RAT 7, MED 0.5, HMS 0.5, SCN 0.1 | SC 0.1 | ALE 1 |
| Engineer | DW 10, MED 0.5, FIM 7, HSS 0.2, PDA 0.1 | VG 0.2 | GIN 1 |
| Scientist | DW 10, MED 0.5, MEA 7, LC 0.2, WS 0.05 | NST 0.1 | WIN 1 |

> [!tip]
> A luxury pays off when the extra output of the faster buildings is worth more than the luxury itself. Toggle it and watch **Profit / day**: the luxury cost and the efficiency change both count.

## Infrastructure {#infrastructure}

**Infrastructure** has one field for each [[habs|habitation]] (HB1, HBB, HB2, HBC, HB3, HBM, HB4, HBL, HB5) and each [[storage]] building (STO, STA, STE, STV, STW).

Beds per habitation:

| Habitation | Beds |
| --- | --- |
| HB1, HB2, HB3, HB4, HB5 | 100 Pioneers, Settlers, Technicians, Engineers or Scientists |
| HBB | 75 Pioneers + 75 Settlers |
| HBC | 75 Settlers + 75 Technicians |
| HBM | 75 Technicians + 75 Engineers |
| HBL | 75 Engineers + 75 Scientists |

Storage capacity, on top of the [[core-module|core module]]'s 1,500 t and 1,500 m³:

| Storage | Weight | Volume |
| --- | --- | --- |
| STO | 5,000 t | 5,000 m³ |
| STA | 2,500 t | 2,500 m³ |
| STE | 10,000 t | 10,000 m³ |
| STV | 2,500 t | 7,500 m³ |
| STW | 7,500 t | 2,500 m³ |

Habitations and storage take area and count in the build cost behind **Payback**, but not in degradation. Your storage sets the **Storage** result's days to full.

### Auto and the optimiser {#auto-habs}

**Auto** picks the habitations for you. While it's on, the habitation fields are locked, but storage stays yours to set. Whenever the workforce your buildings need changes, or the habitations' construction prices change, it picks the cheapest set of habitations that houses everyone and fits in the free area. If nothing fits, it picks the set that needs the least area, even if that's more than you have.

**Auto** is on for new plans. Plans saved without this setting start with it off, and on a copy of someone's shared plan it starts off too. PRUNplanner remembers your choice per plan.

With **Auto** off, **Cheapest** and **Least area** run the optimiser once. Cheapest finds the lowest construction cost at your buy prices, with no area limit. Least area finds the smallest area. If no set works, you get the message "Couldn't find a habitation setup for this workforce."

> [!tip]
> Turn **Auto** off when you already have habitations built in the game and want the plan to match them. Use **Cheapest** or **Least area** once to get a starting point, then adjust.

## Experts {#experts}

[[experts|Experts]] lift every building of their expertise. **Experts** shows a field for each expertise your buildings use, with those buildings' tickers, and for any expertise that has experts placed. "+ … more fields" shows the rest, and **Fewer fields** hides them again.

Each field takes 0 to 5 experts, with the bonus shown under the name:

| Experts | Bonus |
| --- | --- |
| 1 | 3.06 % |
| 2 | 6.96 % |
| 3 | 12.48 % |
| 4 | 19.74 % |
| 5 | 28.4 % |

A building of that expertise gets 1 + bonus as a factor on its efficiency. A base can hold at most 6 experts in all. If you enter more, a warning says "Maximum number of experts on a base is 6. You currently have … experts assigned.", but the plan still counts every expert you entered.

In the game, experts arrive over time from running buildings of that expertise. The more of those buildings you run, the faster they come.

## How a building's efficiency comes together {#efficiency}

A production building's efficiency is the product of its factors. Because they multiply, one factor of 0, such as no workers housed or a farm on a planet that isn't fertile, stops the building whatever the others are.

| Factor | Value | Set in |
| --- | --- | --- |
| Workforce | Its workers' tier efficiencies, weighted | [Workforce](#workforce), [Infrastructure](#infrastructure) |
| COGC | × 1.25 expertise program, × 1.1 workforce program | [COGC program](#cogc) |
| HQ | × 1.1 | [Corp. HQ](#corp-hq) |
| Experts | × (1 + bonus) | [Experts](#experts) |
| Faction | × (1 + bonus × 2 × (3 − 2 × used ÷ total)) | [Empire & prices](#faction) |
| Fertility (farms only) | × (1 + fertility × 10 ÷ 33), 0 if not fertile | [Fertility](#fertility) |

Take a Metallurgy building with its workers fully housed and both luxuries supplied, a Metallurgy COGC, 2 Metallurgy experts and Corp. HQ, in an empire without a Metallurgy faction bonus. It runs at 1 × 1.25 × 1.0696 × 1.1 = 147.07 %. Hover **Eff.** in Production to see the factors of any building.
