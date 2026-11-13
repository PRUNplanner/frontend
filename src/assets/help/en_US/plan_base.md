The base setup is the group of parts on the left of a plan in the Standard layout: **Empire & prices**, **Planet**, **Workforce**, **Infrastructure** and **Experts**. They hold everything about the base that isn't a production building: which prices and bonuses apply, how many workers are housed and fed, and what lifts your buildings' [[efficiency|efficiency]]. Every change here flows straight into [Production](/help/plan_production) and the [results](/help/plan_results).

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

A plan calculates with one [[empire|empire]]: its [[faction|faction]] and permits, and its [[exchange-preference|exchange preference]] for every price.

- **Calculate with empire** lists your empires by name. Empires the plan is in start with "»". It doesn't show on a read-only plan or when you have no empires.
- On opening, the plan picks your current empire when the plan is in it, else the first empire the plan is in. Your current empire is the default empire from [Profile](/profile); switching empires on the [Empire](/empire) page changes it. A plan in no empire uses your first empire.
- Picking another empire only changes how this page calculates. It doesn't add the plan to that empire or remove it from another, and it isn't saved. Which empires hold a plan is set in [Management](/manage).
- The note under it ("Faction …, permits from the empire. Plan is in … empires.") names the faction whose bonus applies and how many empires hold the plan.

**Prices** shows the name of the empire's exchange preference, as a link to that preference in [Exchanges](/exchanges) for this planet. Without a preference it reads **Universe · VWAP 30D (no preference)**: the 30-day [[vwap|VWAP]] across all exchanges.

From this price book, the plan prices what it sells at the sell price, and what it buys (inputs, workforce consumables, construction materials) at the buy price. How a price is found, and how to fix prices or set them per planet, is in [Exchanges](/help/exchanges#how-a-price-is-found).

> [!tip]
> Two empires with different exchange preferences can show very different profits for the same plan. Switch **Calculate with empire** to check a plan against the market where you'd really sell.

### Faction bonus {#faction}

A faction lifts the buildings of its [[expertise|expertises]]. PRUNplanner applies the bonus as a factor on the building's efficiency:

1 + bonus × 2 × (3 − 2 × permits used ÷ permits total)

The permits are the empire's, as set in its settings. Using all of them gives 1 + 2 × bonus; using fewer gives more.

| Faction | Expertise and bonus |
| --- | --- |
| Antares | Electronics 5 % |
| Benten | Manufacturing 5 % |
| Hortus | Agriculture 3 %, Food Industries 2 % |
| Moria | Metallurgy 2 %, Construction 3 % |
| Outside Region | Chemistry, Fuel Refining and Resource Extraction 2 % each |

Example: an Antares empire using all its permits gives Electronics buildings 1 + 0.05 × 2 = 1.10, so +10 %.

## Planet {#planet}

The **Planet** part sets what the planet gives your base: its COGC program, a corporation HQ, your permits and its resources.

### COGC program {#cogc}

The **COGC** select picks the planet's [[cogc|COGC]] program: **None**, one of the nine expertise programs (Agriculture to Resource Extraction) or one of the five workforce programs (Pioneers to Scientists). A new plan starts with the program the planet runs now; you can pick any other to plan ahead, since the residents vote on it and it can change every week.

- An expertise program multiplies the efficiency of every building of that expertise by 1.25 (+25 %).
- A workforce program multiplies the efficiency of every building that employs that tier by 1.1 (+10 %).

In Production, a building's expertise turns green with ✓ when the program lifts it.

### Corp. HQ {#corp-hq}

Tick **Corp. HQ** when the [[corp-hq|corporation]] you belong to has its headquarters on this planet (not your own company's HQ). It multiplies the efficiency of every production building by 1.1 (+10 %). It's off by default.

### Permits and area {#permits}

**Permits** (1 to 3) sets how many base permits you use on this planet. The area next to it is 250 + 250 × permits: 500, 750 or 1,000. The **Area** result shows how much of it the base uses, see [Results](/help/plan_results#area).

### Resources {#resources}

**Resources** shows a tile for each resource of the planet. The number on it is what one extractor makes per day at 100 % efficiency.

Click a tile to start extracting it: it adds the right extractor (EXT for minerals, COL for gases, RIG for liquids) with a count of 1 if the plan doesn't have one yet, and that resource's recipe as an order of 1 unless the extractor already runs it. Then set the count in Production.

With **Plan suggestions** on and planet insights, a link under the tiles ("… plans on … · what others build here") opens what other players plan on this planet, see [Layout](/help/plan_layout).

### Fertility {#fertility}

[[fertility|Fertility]] matters only for farms (FRM and ORC). Their efficiency gets the factor 1 + fertility × 10 ÷ 33, so a planet with positive fertility speeds them up and a negative one slows them down. On a planet that isn't fertile at all, farms run at 0 % and Production says "Planet not fertile".

> [!tip]
> Every building also needs the planet's [[extra-building-materials|extra building materials]] for its surface, gravity, pressure and temperature. They're in the build cost behind **Payback** and in the Construction tool, so a harsh planet shows up as a longer payback.

## Workforce {#workforce}

**Workforce** shows, for each [[workforce|workforce]] tier the plan needs workers of:

- "need / housed": workers your buildings need and beds your habitations give, with a meter;
- the tier's **Efficiency** in %;
- **Luxuries**: two buttons, one per [[luxuries|luxury]], with its ticker, ✓ when supplied;
- "… free": spare beds, red and negative when the tier is short.

Tiers the plan doesn't need stay behind "Show … (not needed)". In the layout's **Display** options you can show Workforce as a table (**Tier**, **Need / housed**, **Free**, **Luxuries**, **Efficiency %**) or with every tier open, see [Layout](/help/plan_layout).

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

A building's workforce factor is the average of its tiers' efficiencies, weighted by how many workers of each tier it employs.

### Needs and luxuries {#needs}

Housed workers consume their needs every day. Workers without a bed consume nothing, but they don't work either. A luxury you turn off isn't consumed and isn't bought, and the tier's efficiency drops. Everything consumed shows in [Material I/O](/help/plan_results#material-io) and counts as cost.

Consumption per 100 workers per day:

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

**Infrastructure** holds one field for each [[habs|habitation]] (HB1, HBB, HB2, HBC, HB3, HBM, HB4, HBL, HB5) and [[storage|storage]] building (STO, STA, STE, STV, STW).

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

Habitations and storage take area and count in the build cost behind **Payback**, but not in degradation. Storage sets the **Storage** result's days to full.

### Auto and the optimiser {#auto-habs}

- **Auto** picks the habitations for you. While it's on, the habitation fields are locked (storage stays yours). Whenever the workforce your buildings need changes, or the habitations' construction prices change, it picks the cheapest set of habitations that houses everyone and fits in the free area. If nothing fits, it picks the set that needs the least area, even if that's more than you have.
- **Auto** is on for new plans. Plans saved without this setting start with it off. Your choice is remembered per plan. On a copy of someone's shared plan it starts off.
- With **Auto** off, **Cheapest** and **Least area** run the optimiser once: Cheapest finds the lowest construction cost at your buy prices, without an area limit; Least area finds the smallest area. If no set works, a message says "Couldn't find a habitation setup for this workforce."

> [!tip]
> Turn **Auto** off when you already have habitations built in the game and want the plan to match them. Use **Cheapest** or **Least area** once to get a starting point, then adjust.

## Experts {#experts}

[[experts|Experts]] lift every building of their expertise. **Experts** shows a field for each expertise your buildings use, with those buildings' tickers, and for any expertise with experts placed. "+ … more fields" shows the rest, **Fewer fields** hides them again.

Each field takes 0 to 5 experts. The bonus is shown under the name:

| Experts | Bonus |
| --- | --- |
| 1 | 3.06 % |
| 2 | 6.96 % |
| 3 | 12.48 % |
| 4 | 19.74 % |
| 5 | 28.4 % |

A building of that expertise gets 1 + bonus as a factor on its efficiency. A base can hold at most 6 experts in all. With more, a warning says "Maximum number of experts on a base is 6. You currently have … experts assigned.", but the plan still counts every expert you entered.

In the game, experts arrive over time from running buildings of that expertise: the more of them, the faster.

## How a building's efficiency comes together {#efficiency}

A production building's efficiency is the product of its factors:

| Factor | Value | Set in |
| --- | --- | --- |
| Workforce | Its workers' tier efficiencies, weighted | [Workforce](#workforce), [Infrastructure](#infrastructure) |
| COGC | × 1.25 expertise program, × 1.1 workforce program | [COGC program](#cogc) |
| HQ | × 1.1 | [Corp. HQ](#corp-hq) |
| Experts | × (1 + bonus) | [Experts](#experts) |
| Faction | × (1 + bonus × 2 × (3 − 2 × used ÷ total)) | [Empire & prices](#faction) |
| Fertility (farms only) | × (1 + fertility × 10 ÷ 33), 0 if not fertile | [Fertility](#fertility) |

Example: a Metallurgy building with its workers fully housed and both luxuries supplied, a Metallurgy COGC, 2 Metallurgy experts and Corp. HQ, in an empire without a Metallurgy faction bonus, runs at 1 × 1.25 × 1.0696 × 1.1 = 147.07 %. Hover **Eff.** in Production to see the factors of any building.
