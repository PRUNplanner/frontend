The results tell you what your base earns, how long it takes to pay back, whether its workers are housed, and how its area and storage hold up. They're the five tiles at the top of a plan (in the Standard layout), plus the Material I/O table with its totals, and they update with every edit.

They're what you look at to judge a plan: what the base would earn, and where it runs short. A red figure on the **Workforce** or **Area** tile marks a shortage of beds or area.

## Results tiles {#tiles}

Each tile is a button. Click it to open the part its figure comes from, and if that part is hidden in your layout, it opens in a dialog.

| Tile | Shows | Opens |
| --- | --- | --- |
| **Profit / day** | Revenue minus cost per day | **Profit** (the Profit Breakdown tool) |
| **Payback** | Days until the profit has paid for the base | **Construction** |
| **Workforce** | The lowest workforce efficiency, beds per tier | **Workforce** |
| **Area** | Area used of the area you have, profit per area | **Planet** |
| **Storage** | Days until the base storage is full | **Visits** |

Every figure uses the prices of the empire the plan calculates with (see [Empire & prices](/help/plan_base#empire-and-prices)).

### Profit / day {#profit}

**Profit / day** is the base's [[profit]]: revenue minus cost, per day. The line under it reads "Revenue … · cost … incl. … degradation and … production fees".

*Revenue* is the value of every material the base makes more of than it uses (a positive Δ in [Material I/O](#material-io)), at the sell price.

*Cost* adds up three things:

- every material the base uses more of than it makes, at the buy price, including the consumables of your [[workforce]];
- [[degradation]], which is 1/180 of the construction cost of the *production buildings* per day. The [[core-module|core module]], [[habs|habitations]] and [[storage]] don't count here;
- [[production-fees|production fees]] (see [below](#production-fees)).

Degradation stands for the wear on your buildings. For example (made-up numbers), production buildings that cost 900,000 ȼ to build add 900,000 ÷ 180 = 5,000 ȼ of degradation per day.

A material the base makes and also uses counts once, by its net amount. If the plan makes 100 RAT and its workers eat 60, only the 40 extra are sold.

> [!tip]
> Profit / day is the same figure as the bold **Profit / day** line in the [Material I/O totals](#totals). Click the tile to see it broken down into its parts in the Profit tool (see [Plan tools](/help/plan_tools)).

### Production fees {#production-fees}

The planet charges a fee for each production order, and PRUNplanner counts it per building. In the game, the planet's governors set these fees per expertise and workforce tier, and a fee is paid when a production order starts. PRUNplanner takes the planet's fee for the building's expertise for each workforce tier, then averages those over the building's workers, weighted by headcount.

Per day, a building pays that fee × its efficiency × its count. A faster building runs more orders, so it pays more, and a building that runs nothing pays nothing. A planet without fees, or a building without an expertise, costs no fee.

For example (made-up numbers), take a building with 10 pioneers and 30 settlers on a planet that charges 20 ȼ for pioneers and 40 ȼ for settlers in its expertise. Its fee is (10 × 20 + 30 × 40) ÷ 40 = 35 ȼ per day at 100 %. Two of them at 120 % efficiency pay 35 × 1.2 × 2 = 84 ȼ per day.

Fees aren't a material, so they don't show up as rows in Material I/O. You'll find them in the profit line, in the [totals](#totals), in the recipe picker's **ȼ / day** and in the COGM dialog (see [Production & recipes](/help/plan_production#cogm)).

### Payback {#payback}

**Payback** is the build cost of the base divided by its profit per day, in days (for example "212.40 d"). It shows "never" when the base makes no profit.

For example (made-up numbers), a base that costs 1,000,000 ȼ to build and makes 5,000 ȼ a day pays back in 1,000,000 ÷ 5,000 = 200 days. If you see "never", don't worry: it only means the profit per day is 0 or below at these prices, so the base wouldn't earn its build cost back. The **Profit / day** tile shows why.

The line under it is the build cost ("… **ȼ build cost**"). That's every construction material at the buy price, for the production buildings, the core module (once), and every habitation and storage building. It includes the extra materials the planet's environment needs (see [[extra-building-materials|extra building materials]]).

> [!tip]
> Payback counts the habitations and storage, but Profit / day's degradation doesn't. A base with many habitations can pay back slowly even though its daily profit looks fine. Open **Construction** to see what you still have to buy.

### Workforce {#workforce}

The **Workforce** figure is the lowest efficiency among the workforce tiers the plan needs workers of, for example "86.7 %". It shows "—" when no building needs workers, and it turns red when any tier has fewer beds than workers.

The red matters because workers without beds lower production efficiency, and with it what your buildings make. Adding enough habitations for that tier in **Infrastructure** clears it. With **Auto** on, PRUNplanner picks them for you.

The line under it lists each needed tier as workers needed / beds, for example "PIO 260/650 · SET 550/1,450", with a tier short of beds in red. A second line lists the experts you placed, for example "Agri 1 · Chem 4". Hover it for the whole list.

[Base setup](/help/plan_base#workforce) explains how the efficiency is worked out and how to change it.

### Area {#area}

**Area** shows the area used of the area you have, with a meter. The used figure turns red when the base needs more than your permits give.

- Area you have = 250 + 250 × permits (set in **Planet**, see [Base setup](/help/plan_base#permits)).
- Area used = 25 for the core module + the area of every production building, habitation and storage building.

For example, with 2 permits you have 250 + 2 × 250 = 750 area. When the used figure is red, you can raise **Permits** in **Planet** (up to 3) or take buildings out until the base fits.

Under it, "**ȼ profit / area**" is the profit per day divided by the area used, or 0 when nothing uses area. The recipe picker's **ȼ / area** divides by a standard layout so recipes compare across buildings. This one uses your actual base.

After it, an "Empire" figure shows the same ratio for the whole empire the plan calculates with: the empire's total profit per day ÷ the total area all its plans use. It's an area-weighted figure, not an average of plan figures. It only shows once you've opened that empire's page in [Empire](/empire) in this browser tab, and saving a plan clears it until you open the empire page again.

> [!tip]
> A plan above the empire figure earns more per area than your empire does on average. That's a good sign when you're choosing which base to build next with limited permits.

### Storage {#storage}

**Storage** shows the days until the base storage is full ("**days to full**"). PRUNplanner works it out for weight and volume separately, dividing the storage capacity by the *larger* of what comes in and what goes out per day. The tile shows the smaller of the two results. It tells you how long the base can go between ships before its storage is full.

Capacity is the core module's 1,500 t and 1,500 m³ plus your storage buildings (see [Infrastructure](/help/plan_base#infrastructure)). The line under the figure reads "… t in · … t out / day", and you can hover it for the same in m³. It shows "—" when nothing comes in or goes out.

For example (made-up numbers), a base without storage buildings holds 1,500 t and 1,500 m³. If it takes in 60 t and sends out 100 t a day, weight lasts 1,500 ÷ 100 = 15 days. If it takes in 50 m³ and sends out 75 m³, volume lasts 1,500 ÷ 75 = 20 days. The tile shows 15 days.

The tile uses the whole Material I/O. It doesn't follow the "excluded materials" you set in the Visits tool, so it can show a different number of days than **Visits** itself. More in [Plan tools](/help/plan_tools).

## Material I/O {#material-io}

[[material-io|Material I/O]] lists every material the base makes or uses, per day:

- **In**: what the base uses (production inputs and workforce consumables).
- **Out**: what the base makes.
- **Δ**: Out − In. A positive Δ is exported (sold), a negative Δ is imported (bought).

Three controls above the table choose what you see. They aren't saved, so the page always opens with Whole base, All and ȼ. Whole base is the view the profit is calculated from, so its Δ is what the base would buy and sell.

| Control | Options | What it does |
| --- | --- | --- |
| **Show materials for** | **Whole base** (default), **Production**, **Workforce** | Whole base nets production and workforce together. Production shows only the buildings' inputs and outputs, Workforce only what your workers consume. |
| **Filter** | **All** (default), **Exports**, **Imports** | Exports keeps rows with a positive Δ, Imports rows with a negative Δ. |
| **Value shown** | ȼ (default), t, m³, % | The last column: **ȼ / day** (Δ at the sell price for exports, the buy price for imports), **Δ t**, **Δ m³**, or **7d share** and **30d share**. |

The % view shows Δ as a share of the average daily volume traded in the last 7 and 30 days. It tells you whether the market can take what you sell or supply what you buy (see [Plan check](/help/plan_check#flags)).

Click a column heading to sort by it. With **Whole base**, a flag after a material's tile marks a market warning. Click it to open Plan check on its market view, described in [Plan check](/help/plan_check#market-check).

### Totals {#totals}

The Material I/O totals part sums up the table per day:

- **Exports**: the value of all rows with a positive Δ.
- **Imports**: the value of all rows with a negative Δ, as a negative number.
- With **Whole base** only: **Degradation**, **Production fees** and **Profit / day** (in bold).

The totals follow **Show materials for** but not **Filter**. With Whole base, Exports + Imports + Degradation + Production fees = Profit / day, the same figure as the tile.

> [!tip]
> Switch **Show materials for** to **Workforce** to see what feeding your workers costs per day. Turning a luxury off in Workforce lowers it, but it also lowers the workers' efficiency (see [Base setup](/help/plan_base#workforce)).

### Download as CSV {#csv}

**More** in the plan header has **Download Material I/O (CSV)**. The file has one row per material with the columns ticker, input, output, delta, value, weight and volume, all per day. Value is in ȼ, and weight and volume are of Δ. A CSV file opens in any spreadsheet program, so you can work with the numbers outside PRUNplanner.

The download covers the current **Show materials for** choice and ignores **Filter**. The file is named after the plan, or after the planet's ID while the plan has no name, followed by "-material-io.csv".
