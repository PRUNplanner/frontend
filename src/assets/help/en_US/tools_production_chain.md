With **Production Chains** you plan a whole production chain per day. Tell it what you want to produce and how much a day, for one material or several at once (say DW, RAT and OVE). It works out every step for you: which [[recipe]] makes each material, how many buildings that takes, what you have to buy, and what the chain costs and earns at your [[cx|CX]] prices. Then it lays the chain out into bases, picks planets and creates the [[plan|plans]]. Its second mode, **Check an empire**, looks at an empire you already run.

Use it before you build: it shows what to make per day, what to buy and what it takes to run, from the raw materials up, so you know what a chain costs and earns before you place a building.

## Getting started {#getting-started}

You need an account for Production Chains. Log in, then open it under Calculators → **Production Chains**.

1. Under **Produce per day**, pick a material in **Add material**. You can pick any material that has a recipe or occurs as a planet resource.
2. Each target starts at 10 per day. Type an amount, or use − and +. They step by 1 below 20, by 5 from 20 and by 10 from 100, and − never goes below 1.
3. × removes a target. You can add as many as you like, and the chain shares steps between them.

The results, steps and graph update with every change you make. Until you add a material, the page asks "What do you want to produce?" in place of the results.

While the planets load, a line says "Loading planets for extraction …". If they can't be loaded, extracted rows show no buildings. Press **Retry** to load them again.

> [!tip]
> Start with the daily amount you'd like to sell and look at the profit and the buildings. Then use **Fit the rate to your bases** (see [Bases](#bases)) to size the chain to the bases you can actually build.

## Settings {#settings}

Every base runs with both [[luxuries]] and the [[experts]] worth most for its buildings (more in [Bases](#bases)). Luxuries are optional consumables that raise your workers' efficiency, and experts speed up a base's buildings of one expertise. These settings sit above the results:

- **Efficiency**: an extra global percentage on top, for [[corp-hq|Corp. HQ]] or [[faction]] bonuses. 100 % adds nothing, and it accepts 1 to 1,000 %. It changes how much each building makes, not the production fees. For example, at 125 % a step that needs 10 buildings at 100 % comes to 8 exact buildings.
- **Prices**: the [[exchange-preference|exchange preference]] the chain is priced with. It starts at your default exchange preference, and "None - Universe 30D" uses universe-wide prices. The chain uses the preference's prices but not its planet-specific exceptions. The prices drive the default recipes, every cost and the profit, so another exchange preference can change the chain.
- **Raw resources**: **Buy** (default) or **Extract**. You can also set a single row to Extract in Steps. A raw material that is itself a target is always extracted. With **Extract**, the chain plans extractors and counts their upkeep, wear and fees instead of a CX price.
- **Byproducts**: some recipes make a second output alongside the material they're run for. **Cover demand** (default) uses each [[byproduct]] first where the chain needs that same material, and sells the rest. **Sell** sells them all.

> [!warning]
> Picking an exchange preference under **Prices** also makes it your default exchange preference, so other pages that follow your default switch with it. That happens in both modes.

### Defaults {#defaults}

| Setting | Default |
| --- | --- |
| **Efficiency** | 100 % |
| **Prices** | your default exchange preference |
| **Raw resources** | **Buy** |
| **Byproducts** | **Cover demand** |
| **Own production** | **None** |
| A new target | 10 / day |
| **Bases up to** | 500 area |
| **Number of bases** | 2 |
| **Buy list** | for 10 days |
| **Row order** | **Chain** |
| **Line width** | **t / day** |
| A base's luxuries | both |
| A base's experts | **Auto** |
| A base's COGC | the planet's running program |

## Own production {#own-production}

If you already make part of a chain, pick one of your [[empire|empires]] under **Own production**. Any material the chain needs that the empire makes more of than it uses is marked **Have**. That surplus is what its plans make minus what they use, workforce consumption included. The chain uses it first, after byproducts, and only makes, buys or extracts the rest.

- A material you have enough of moves to the first column of the Graph, and its inputs drop out of the chain. Steps, buildings and construction then show only what the new chain adds, and the results tell you how many fewer buildings and how much less construction you need.
- You can also mark a material **Have** by hand in the Source column and type how much you have per day. Leave it empty for all of it, or type 0 to turn it off. A typed amount wins over the empire. When it differs from the empire's surplus, "use …" next to it goes back to the empire's amount.
- If you have only part of a material, the row shows "rest" and lets you choose what covers the rest.
- Targets always come from the chain itself.
- Don't worry if a material your plans make shows no **Have**: only what the empire makes more of than it uses counts, so a material it uses up has no surplus. You can still mark it **Have** by hand.
- What comes from your plans counts in the profit like a bought input at its CX price. The inputs tile then reads **Inputs / day** and splits it into own and bought.
- [Bases](#bases) lists which plan supplies what, in plan-name order, and which part of the surplus the chain doesn't use. The shipping table includes the routes from those plans.
- Have rows aren't part of the plans **Create plans** makes.
- If you change the empire's plans in another tab, the amounts update while this page is open.
- The chain link keeps the Have amounts the chain uses, also those from the empire, but never the empire itself.

## Results {#results}

The strip at the top adds up all your bases.

| Tile | What it shows |
| --- | --- |
| **Profit / day** | Output value minus bought inputs, own production at CX price, upkeep, wear and production fees, also as a share of the output value (without Own production) |
| **Output value / day** | The targets at the CX sell price, plus sold byproducts |
| **Bought inputs / day** | What you buy, at the CX buy price |
| **Upkeep, wear + fees / day** | Workforce [[upkeep]] with the luxuries, wear, and [[production-fees\|production fees]], with the workforce upkeep and the fees below the value |
| **Buildings** | Built and exact |
| **Area** | Including habitation |
| **Workforce** | Per tier |
| **Construction** | With the [[payback]], or "no payback" when the profit is 0 or less |

Each base counts its core module and one STO in the area. Construction counts the buildings, habitation and the STO, but not the core module or planet extras (MCG, AEF, SEA, HSE, INS, TSH). A base without steps counts nothing.

Buildings of one type share their capacity across recipes, as in the game, so 4.5 Food Processors come to 5 built. That only works inside one base.

For example, with made-up numbers: an output value of 10,000 ȼ a day, 4,000 ȼ of bought inputs and 2,500 ȼ of upkeep, wear and fees leave a **Profit / day** of 3,500 ȼ, 35 % of the output value. With 700,000 ȼ of construction, that pays back in 700,000 ÷ 3,500 = 200 days. A profit below 0 shows in red, and **Construction** then reads "no payback".

### How costs are calculated {#how-costs-are-calculated}

- **Wear** is the building's construction cost ÷ 180 days. For example, a building that costs 90,000 ȼ to build adds 500 ȼ of wear a day.
- **Cost per unit of a made step** adds up its inputs at their chain cost, the building's upkeep and wear for one run, and the production fee for one run. Made inputs count at their own cost per unit, bought ones at the CX buy price. A run gets shorter with more efficiency. A recipe with several outputs splits its cost by the outputs' CX sell value, or by quantity when none has a price.
- **Cost per unit of an extracted step** is the extractor's upkeep and wear per day ÷ units per day, plus the fee.
- **Production fees** are charged per run on the recipe's base time, so efficiency doesn't change them. A made step pays the fees of its base's planet, and each piece of a split step pays those of its own base's planet. An extracted step pays those of its site's planet. The typical planet and a base without a planet pay none, so picking planets can raise the costs.
- **Default recipe**: when you don't pick one, the chain takes the cheapest single-output recipe at CX prices. It only uses recipes with byproducts when no single-output recipe exists.

## Steps {#steps}

Every material appears once. You can order the rows by **Chain**, where each target comes with its inputs (the caret collapses them), or **By source**, in the groups "Produced", "Extracted", "Bought" and "From your plans".

| Column | What it shows |
| --- | --- |
| **Material** | With "target", "for …" (what it feeds) or "sold" |
| **Per day** | How much, with "+ … from byproducts" and "+ … own" |
| **Base** | Which base makes it. Use it to move a step or a piece of it (see [Bases](#bases)) |
| **Source** | **Make**, **Buy**, **Extract** (planet resources only) or **Have** |
| **Recipe or supply** | The recipe, the exchange it's bought on, or the extraction planet |
| **Buildings** | The building and how many, and how much of the built ones it uses |
| **Cost / unit** | Its cost per unit in the chain |
| **CX price** | The CX price |
| **Make or buy** | Whether making saves money ("Make, saves …" or "Buying is … cheaper"), with a market chip for bought rows and targets |

**Make** is off for a material without a recipe, and **Buy** and **Have** are off for targets. A byproducts block at the bottom lists where each byproduct comes from, how much the chain uses and how much it sells. **CSV** downloads the table as `production-chain.csv`.

- Click a material to see what it **Takes**, where it **Goes to**, its cost **Per unit** (inputs, upkeep and wear, production fees, chain cost against the CX price) and the spare capacity of its buildings: "Spare … up to + … / day".
- Click a recipe ("n recipes ▾", only shown when there are several) to compare all recipes for that material. The one in use comes first, then the others by their effect on the profit, each with the change in profit per day and buildings. Badges mark the one **in use**, the **default** and those **with byproducts**.
- Extracted rows use a typical planet: the top 10 % of all planets with the resource, meaning the 90th percentile of daily extraction, or the best planet when fewer than 10 planets have it. It's a planning default, not a real base, and it pays no production fees. Click it to pick a real planet in **Where to extract**. You can filter by extractor, surface, jumps to an exchange, **No extra materials**, **Resource Extraction COGC** and **Local market**, or use **Open in Planet Search**. When the step's base has a planet with the resource, that planet's own rate wins.

## Warnings {#warnings}

The chips above the steps sum up what to look at. Click one to filter the steps, and **Show all** brings everything back.

- **Cheaper to buy** lists materials the chain makes or extracts for more than the CX price. Targets never count. **Buy all** switches them to buying, and the toast offers **Undo**.
- **Thin market** lists bought materials where the chain needs 10 % or more of what the CX trades a day (the 30-day average), or that didn't trade in 30 days. For example, if the CX traded 6,000 units in 30 days, that's 200 a day, so buying 30 a day is 15 %. In Steps, the [[share-of-volume|share of volume]] chip turns amber from 10 % and red from 50 %. Targets get the same chip for the sell side. Read more: [[thin-market|thin markets]].
- **Steps their bases can't run** flags a farm on a planet without fertility, or an extraction on a planet without the resource. The chip jumps to Bases.
- **Recipe loop** means a recipe needs its own output somewhere up the chain. The chain stops at the repeat.

Without anything cheaper to buy, a thin market or a base warning, a "No warnings" chip shows in their place.

## Graph {#graph}

The graph shows the same chain. Raw materials sit on the left ("Bought · extracted", plus "have" with Own production) and the targets on the right. **Line width** follows **t / day** (default), **ȼ / day** or **Equal**. Zoom with −, **Fit** and +. Each node shows where it's bought, or which base and building make it. Click a material to see only what it needs and feeds, and **Show all** to go back.

## Bases {#bases}

A chain can run on up to 26 bases (A to Z), each on one planet. The Bases tab starts with three steps, and the next one to take is the main button.

### 1. Lay out into bases {#auto-layout}

**Auto layout** lays the chain out into bases you could build:

- Each base gets one [[expertise]] (the field of its production buildings, such as Agriculture or Metallurgy), up to the size in **Bases up to**: 500 area (default), 750 or 1,000. When an expertise needs more than one base at that size, it fills bases up to 1,000 instead, so you run one full base rather than several alike.
- Auto layout splits a step that doesn't fit by whole buildings. As many as fit go into the current base and the rest into the next one, so 6 CHP can become 4 + 2. A step can span more than two bases. Extraction steps stay whole.
- Small groups of steps (under 1.5 buildings, or without an expertise) join the base they ship the most tonnes with that has room for them. If none has, they get a mixed base.
- Auto layout buys steps under 0.2 building that cost more per unit with a whole building than on the CX. While such a step is made, it shows a **Buy** tag in Steps. You can switch them back to Make, but the next Auto layout or Fit buys them again.
- Each base gets a planet, as described in [How planets are picked](#planet-picking).
- Afterwards, it merges bases of the same expertise when the merged base fits 1,000 area and loses no resource or fertility.

> [!warning]
> Auto layout starts over. It builds new bases from scratch, with new names and planets, COGC set to the running program, and default luxuries and experts. Any names, planets, COGC picks, luxuries and expert edits you made before are lost.

### How planets are picked {#planet-picking}

Auto layout only uses a planet that:

- has a free [[plots|plot]], or plots PRUNplanner hasn't read yet (a full planet with [[ghost-sites|ghost sites]] isn't used)
- has none of your plans, in an empire or not
- can run the base: every extracted resource is there, farms can run, and the base fits within the size.

Among those, planets running a COGC program that helps the base's buildings come first. After that, closeness counts: to the other bases, weighted by the tonnes shipped, and to the empire's planets if you picked one under Own production. On a tie, the planet where the base needs the least area wins. The largest base is placed first. If no planet can run the base, it takes the first one by COGC and closeness anyway, so check the base card's warnings.

### 2. Fit the rate to your bases {#fit}

Set **Number of bases** (2 by default, 1 to 26) and press **Fit rate**. It finds the largest rate, with all targets scaled alike, that auto layout fits into that many bases, then lays the chain out. It can lower the rates or raise them (up to 4,096 times), in steps of 0.01 per day on the largest target. If even 0.01 per day needs more bases, it tells you.

It checks the count with the layout before planets are picked. Planets with lower extraction rates or poorer fertility can then need a little more, so look over the result.

> [!tip]
> Fit rate scales every target by the same factor, so their ratio stays the same. If you want a different mix, change one target first. For example, DW at 20 and RAT at 10 per day become 10 and 5 when the fit halves the rate.

### 3. Create the plans {#create-the-plans}

Once every base has a planet and fits 1,000 area, the third step says so and offers "Create … plans…". Otherwise it tells you how many bases lack a planet or are over 1,000 area. Details in [Create plans](#create-plans).

### Overview and base cards {#base-cards}

Below the steps, an overview shows **Bases** (how many have a planet), **Largest base**, **Permits** (with the area in all bases) and **Shipping t / day** (with the routes). It also has one line per base with its expertise and planet. **Add base** adds a base.

On each base card you can:

- name the base and pick its planet ("Pick a planet", or "change")
- pick its COGC program: "Running: …" (the default), **No program**, or another program to plan ahead of a vote. Programs that help the base come first, with their bonus, and show "not running" when the planet doesn't run them
- set its **Luxuries**: Both (100 % workforce efficiency, the default), Lux 2 (92 %), Lux 1 (87 %) or Essentials (79 %). The upkeep pays for them
- **Edit** its **Experts**, or go back to **Auto**. Auto picks the split worth most for the base's output: usually 5 in its main expertise and the sixth in the next one, with at most 5 of one type and 6 per base
- **Merge into…** another base, which keeps its planet
- **Separate** it by expertise, or in half for one expertise, with planets for the new bases
- remove it with ×, which moves its steps to the first base.

A base's buildings get the planet's bonuses as in a plan: +25 % from an advertising program for their expertise, +10 % from a workforce program for a tier they employ, and fertility for farms. FRM and ORC can't run without fertility. Extracted steps use the planet's own rate. A planet without the resource keeps the chain's rate and shows a warning, and so does a base over 1,000 area.

The card shows its buildings, area (core module, one STO and habitation), [[area-permits|permits]], workforce, and upkeep with wear per day.

The **Base** column in Steps moves a step, or one piece of a split step, to another base. "+ new base" starts a new one.

The planet picker for a base solves the base's steps on every planet, so you can compare buildings and area. It marks planets where you already have a plan ("your plan"). **Only planets that** filters for planets that have the resources and allow farming (on by default), run a COGC program for the base, are fertile, or have one of your plans. You can also filter by extra materials, local market, jumps and name. It shows each planet's plots but doesn't filter by them.

**Shipping per day** lists what moves between bases and the CX, in tonnes and m³, with the [[jumps]]. That's what you hand over to your logistics.

## Create plans {#create-plans}

**Create plans** makes one plan per base that has steps, with its buildings, recipes, habitation, one STO, the COGC program and permits. Each plan gets its base's luxuries and experts, so it produces what the chain shows. HQ and faction bonuses are left to the plans.

- Each plan's name starts as the targets plus the base name, and you can change it.
- Pick **New empire** (the default, named "Chain …" after the targets, with a **Faction**), **Add to** an existing empire, or **No empire**. A new empire is created first, with its permits set from the plans.
- The dialog tells you what blocks it: no base with steps, a base without a planet or over 1,000 area, a missing name, or no empire picked.
- A farm on a planet without fertility is left out of its plan, and an extraction off its resource gets the extractor without a recipe. The dialog says so.
- With Own production, materials your bases supply aren't in the new plans.

The page stays on the chain and links the new plans and the empire. Those links stay in the Bases tab until the chain changes. If one plan fails, the plans created before it are kept and listed.

## Buy list {#buy-list}

The buy list shows what the chain buys over a number of days (10 by default), grouped by base when there's more than one. Each row has the units (rounded up), weight and cost. For example, on a one-base chain a material bought at 2.5 a day comes to 25 units over 10 days, and at 2.55 a day to 26. The list also shows the totals, the m³ to haul in, and the targets' tonnes and m³ going out.

**Copy XIT buy action** (or "Copy XIT action for …" per base) copies an [[xit|XIT]] action that buys the list at the warehouse of the exchange most of its rows are priced on. When the base has a planet, the action also moves the goods there.

The list only holds the chain's recipe inputs. Workforce consumables aren't on it, so plan those in the plans the chain creates.

## Sharing {#sharing}

The link holds the whole chain: targets, settings, sources, recipes, planets, bases, Have amounts and the CX. **Copy chain link** copies it. When you open the page without a link, the last chain you worked on opens again, in this browser and per account.

## Check an empire {#check-an-empire}

Switch the **Mode** at the top to **Check an empire** to see how one of your empires makes what it sells, and what would make it better. Each mode keeps its own state while you switch between them.

1. Pick the **Empire**. It starts at your default empire.
2. Pick the chains. Each material the empire sells (makes more of than it uses, with a CX sell price) is a chain, shown with its amount per day. "+ Add a chain" adds one, and "All the empire sells" or **Check everything the empire sells** adds all of them. **Clear** removes them.

If you have no empire yet, the page says so and points you to Plan a chain or to Manage.

The check follows each chain back through your plans: which base makes each step, with which recipe and efficiency, and what's bought. It never changes a plan, it only points at them.

| Setting | Default |
| --- | --- |
| **Prices** | the empire's exchange preference |
| **Setup gains** | **Show** |
| **Ignore below** | 200 ȼ / day |
| **Moves pay back within** | 100 days |

The strip at the top shows the empire's **Profit / day** as planned, the **Possible gain / day**, **Bases checked**, how many **Look optimal**, **Improvements**, **Plan fixes**, **Setup gains / day** and **Moves**. Gains are measured against the chain default: both luxuries, the experts worth most and the planet's running COGC, at your CX prices, with made inputs at the empire's own cost.

### Bases {#check-an-empire-bases}

Each base gets a mark: **Looks optimal**, has improvements, **Plan fix**, or **Not in these chains**. Open a base to see its **Production as planned**, its luxuries, experts and COGC under **Plan** against the **Chain default**, and its **Findings**. **Coverage** on the side shows how many bases the chains reach, and "Add …" adds what the other bases sell.

### Findings {#findings}

Each finding shows its gain per day, construction and payback. You can filter them by kind:

- **Plan fix**: the plan counts a COGC program the planet doesn't run, or the planet runs one the plan doesn't count. With an advertising (expertise) program, the buildings make 20 % less than the plan says, or would make 25 % more. With a workforce program it's 9 % less or 10 % more.
- **Recipe**: another recipe of the same building makes the material at least 3 % cheaper.
- **Make or buy**: a material that isn't a target costs more to make than to buy.
- **Location**: another planet suits the step at least 10 % better through its COGC program, fertility or extraction rate, compared with the program the planet actually runs. The option is either one of your bases (only the moved buildings to build, and it needs free area) or a new base (buildings, habitation and core module). PRUNplanner suggests the best option that has room, a free plot (or ghost sites; unknown plots count as possible) and pays back within **Moves pay back within**. "All … planets…" lists every option with filters and sorting. **Use** makes a planet your pick, and **Back to suggested** undoes that.
- **Setup**: both luxuries (only when the extra output earns more than they cost), or a better expert split. Experts come with time in the game. Set **Setup gains** to **Hide** to leave these out.

The check hides findings below **Ignore below**, but plan fixes and your picked locations always show. Gains on one step are alternatives, so a base's possible gain counts only the best one per step. For example, a Recipe finding worth 300 ȼ / day and a Location finding worth 500 ȼ / day on the same step count as 500 ȼ / day, not 800. **Try in planner** (on Recipe, Make or buy and Location findings) opens Plan a chain with the chain's bases and the change applied.

> [!tip]
> Fix the plan fixes first. They cost nothing to build, and the plan's numbers are off until you do.

> [!warning]
> A Location finding counts a full planet with ghost sites as possible for a new base. In the game, ghost sites only let new players who start on that planet settle there.

### Chains {#chains}

Each chain is listed material by material: how much is made (**Made / day**), where (**Made in**), with which recipe (**Recipe as planned**), at what cost against the CX price, and what the chain planner would do (**Chain planner**).

### Sharing {#check-an-empire-sharing}

**Copy check link** copies the empire, the chains, the settings and your picked locations, but not the prices. Whoever opens it sees the empire's own exchange preference. Only you can open your own empires. For anyone else, the page says the empire isn't theirs.
