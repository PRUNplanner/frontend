The Upkeep Price Calculator compares the materials that [[upkeep]] buildings consume, by what one unit of a need costs with each of them. Use it to see which building and material cover a population need (Safety, Health, Comfort, Culture, Education) most cheaply at today's prices.

## How to use it {#how-to-use}

1. Check **CX Preference**: it decides the prices (see [Prices](#prices)).
2. Pick the need under **Need**: **Safety** (default), **Health**, **Comfort**, **Culture** or **Education**.
3. Read the **Material Details** table, cheapest first.

The page calculates all five needs when you open it ("Calculating Upkeep Material Prices") and again when you change the exchange preference.

## Buildings and needs {#buildings}

PRUNplanner knows 14 upkeep buildings, each with the materials it consumes per day and how much of each need it provides. These figures are built into PRUNplanner.

| Need | Buildings |
| --- | --- |
| **Safety** | SST Safety Station, SDP Security Drone Post, EMC Emergency Center |
| **Health** | INF Infirmary, HOS Hospital, EMC Emergency Center, WCE Wellness Center |
| **Comfort** | PAR Park, 4DA 4D Arcades, WCE Wellness Center, ACA Art Cafe |
| **Culture** | ART Art Gallery, VRT VR Theater, ACA Art Cafe, PBH Planetary Broadcasting Hub |
| **Education** | LIB Library, UNI University, PBH Planetary Broadcasting Hub |

Four buildings serve two needs: EMC (Safety and Health), WCE (Health and Comfort), ACA (Comfort and Culture) and PBH (Culture and Education).

## Material Details {#material-details}

One row per building and material for the selected need. The table shows 50 rows per page; click a header to sort by it.

| Column | What it shows |
| --- | --- |
| **Material** | the material the building consumes |
| **Building** | the upkeep building, as its ticker |
| **ȼ/Need** | the cost per unit of need (4 decimals); lower is better |
| **CX Price (ȼ)** | the material's buy price under your exchange preference |
| **Qty/Day** | how many the building consumes per day |

By default the rows are sorted by **ȼ/Need**, lowest first. Materials without a price show "—" and sit at the bottom.

## How ȼ/Need is calculated {#price-per-need}

ȼ/Need = CX Price × Qty/Day ÷ (need provided × number of needs the building serves)

For a building that serves two needs, the need it provides is counted twice, because the same materials pay for both needs. Its rows therefore look cheaper than a one-need building with the same costs.

Each row looks at one material on its own, as if that material alone bought the building's whole need. A building consumes all of its materials, so the full cost of a building per unit of need is the sum of its rows.

> [!tip]
> Compare buildings by adding up their rows: a building with one cheap material and one expensive one can cost more per need than a building whose materials are all middling.

## Prices {#prices}

**CX Preference** picks the [[exchange-preference|exchange preference]]; "None - Universe 30D" uses the [[universe|Universe]] 30-day [[vwap|VWAP]]. Prices don't depend on a planet: planet exceptions in your exchange preference don't apply here.

> [!warning]
> Picking an exchange preference here also makes it your default exchange preference for every page.
