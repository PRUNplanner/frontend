**Production Chains** plans a whole chain per day. Add what you want to produce and how much of it a day, for one material or several at once (for example DW, RAT and OVE). The page works out every step: which [[recipe]] makes each material, how many buildings it takes, what to buy, and what the chain costs and earns at your [[cx|CX]] prices. Then it lays the chain out into bases, picks planets and creates the [[plan|plans]]. In the second mode, **Check an empire**, it looks at an empire you already run.

## Getting started {#getting-started}

Production Chains needs an account: log in, then open it under Calculators → **Production Chains**.

1. Under **Produce per day**, pick a material in **Add material**. The list offers every material that has a recipe or occurs as a planet resource.
2. Each target starts at 10 per day. Type an amount, or use − and +: they step by 1 below 20, by 5 from 20 and by 10 from 100. − never goes below 1.
3. × removes a target. Add as many as you like; the chain shares steps between them.

The results, the steps and the graph update with every change.

> [!tip]
> Start with the daily amount you would like to sell, look at the profit and the buildings, then use **Fit the rate to your bases** (see [Bases](#bases)) to size the chain to the bases you can actually build.

## Settings {#settings}

Every base runs with both [[luxuries]] and the [[experts]] worth most for its buildings (see [Bases](#bases)). Above the results:

- **Efficiency**: one more global percentage on top, for [[corp-hq|Corp. HQ]] or [[faction]] bonuses; 100 % adds nothing. It accepts 1 to 1,000 %. It changes how much each building makes, not the production fees.
- **Prices**: the [[exchange-preference|exchange preference]] the chain is priced with. It starts at your default exchange preference; "None - Universe 30D" uses universe-wide prices. The chain uses the preference's prices, not its planet-specific exceptions.
- **Raw resources**: **Buy** (default) or **Extract**. You can also set a single row to Extract in Steps. A raw material that is itself a target is always extracted.
- **Byproducts**: **Cover demand** (default) uses a [[byproduct]] for the same material in the chain first and sells the rest; **Sell** sells them all.

> [!warning]
> Picking an exchange preference under **Prices** also makes it your default exchange preference, so other pages that follow your default switch with it. This happens in both modes.

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

If you already make part of a chain, pick one of your [[empire|empires]] under **Own production**. Every material the chain needs that the empire makes more of than it uses (what its plans make minus what they use, workforce consumption included) is marked **Have**. The chain uses it first, after byproducts, and only makes, buys or extracts the rest.

- A material you have enough of moves to the first column of the Graph, and its inputs drop out of the chain. Steps, buildings and construction then show only what the new chain adds; the results say how many fewer buildings and how much less construction you need.
- You can also mark a material **Have** by hand in the Source column and type how much you have per day (empty for all of it, 0 for off). A typed amount wins over the empire. When it differs from the empire's surplus, "use …" next to it goes back to the empire's amount.
- When you have only part of a material, the row shows "rest" with a choice of what covers the rest.
- Targets always come from the chain itself.
- What comes from your plans counts in the profit like a bought input at its CX price. The inputs tile then reads **Inputs / day** and splits it into own and bought.
- [Bases](#bases) lists which plan supplies what, in plan-name order, and what of the surplus the chain doesn't use. The shipping table includes the routes from those plans.
- Have rows aren't part of the plans **Create plans** makes.
- The amounts update while the page is open when you change the empire's plans in another tab.
- The chain link keeps typed amounts, never the empire.

## Results {#results}

The strip at the top adds up all bases:

| Tile | What it shows |
| --- | --- |
| **Profit / day** | Output value minus bought inputs, own production at CX price, upkeep, wear and production fees; also as a share of the output value |
| **Output value / day** | The targets at the CX sell price, plus sold byproducts |
| **Bought inputs / day** | What you buy, at the CX buy price |
| **Upkeep, wear + fees / day** | Workforce [[upkeep]] with the luxuries, wear, and [[production-fees\|production fees]], split below the value |
| **Buildings** | Built and exact |
| **Area** | Including habitation |
| **Workforce** | Per tier |
| **Construction** | With the [[payback]], or "no payback" when the profit is 0 or less |

Each base counts its core module and one STO in the area; construction counts the buildings, habitation and the STO, without the core module and planet extras (MCG, AEF, SEA, HSE, INS, TSH). A base without steps counts nothing.

Buildings of one type share their capacity across recipes, as in the game, so 4.5 Food Processors make 5 built. This works inside one base only.

### How costs are calculated {#how-costs-are-calculated}

- **Wear** is the construction cost of the building ÷ 180 days.
- **Cost per unit of a made step**: its inputs at their chain cost (made inputs at their own cost per unit, bought ones at the CX buy price), plus the building's upkeep and wear for one run (shorter with more efficiency), plus the production fee for one run. A recipe with several outputs splits its cost by the outputs' CX sell value (by quantity when none has a price).
- **Cost per unit of an extracted step**: the extractor's upkeep and wear per day ÷ units per day, plus the fee.
- **Production fees** are charged per run on the recipe's base time, so efficiency doesn't change them. A made step pays the fees of its base's planet (each piece of a split step its own base's planet), an extracted step those of its site's planet. The typical planet and a base without a planet pay none, so picking planets can raise the costs.
- **Default recipe**: when you don't pick one, the cheapest single-output recipe at CX prices. Recipes with byproducts are used only when no single-output recipe exists.

## Steps {#steps}

Every material once, in **Chain** order (each target with its inputs; the caret collapses them) or **By source** (groups "Produced", "Extracted", "Bought" and "From your plans"). The columns:

| Column | What it shows |
| --- | --- |
| **Material** | With "target", "for …" (what it feeds) or "sold" |
| **Per day** | How much, with "+ … from byproducts" and "+ … own" |
| **Base** | Which base makes it; moves a step or a piece of it (see [Bases](#bases)) |
| **Source** | **Make**, **Buy**, **Extract** (planet resources only) or **Have** |
| **Recipe or supply** | The recipe, the exchange it is bought on, or the extraction planet |
| **Buildings** | The building and how many, and how much of the built ones it uses |
| **Cost / unit** | Its cost per unit in the chain |
| **CX price** | The CX price |
| **Make or buy** | Whether making saves money ("Make, saves …" or "Buying is … cheaper"), with a market chip for bought rows and targets |

**Make** is off for a material without a recipe; **Buy** and **Have** are off for targets. A byproducts block at the bottom lists where each byproduct comes from, how much the chain uses and how much is sold. **CSV** downloads the table as `production-chain.csv`.

- Click a material to see what it **Takes**, where it **Goes to**, its cost **Per unit** (inputs, upkeep and wear, production fees, chain cost against the CX price) and the spare capacity of its buildings: "Spare … up to + … / day".
- Click a recipe ("n recipes ▾", only when there are several) to compare all recipes for it, best effect on the chain first, with the change in profit per day and buildings. Badges mark the one **in use**, the **default** and those **with byproducts**.
- Extracted rows use a typical planet (top 10 % of all planets with the resource: the 90th percentile of daily extraction, or the best one when fewer than 10 planets have it). It is a planning default, not a real base, and pays no production fees. Click it to pick a real planet in **Where to extract**: filter by extractor, surface, jumps to an exchange, **No extra materials**, **Resource Extraction COGC** and **Local market**, or **Open in Planet Search**. When the step's base has a planet with the resource, that planet's own rate wins.

## Warnings {#warnings}

The chips above the steps sum up what to look at. Click one to filter the steps; **Show all** goes back.

- **Cheaper to buy** lists materials the chain makes or extracts for more than the CX price (targets never count). **Buy all** switches them to buying; the toast offers **Undo**.
- **Thin market** lists bought materials where the chain needs 10 % or more of what the CX trades a day (the 30-day average), or that didn't trade in 30 days. In Steps, the [[share-of-volume|share of volume]] chip turns amber from 10 % and red from 50 %; targets get the same chip for the sell side. See [[thin-market|thin market]].
- **Steps their bases can't run**: a farm on a planet without fertility, or an extraction on a planet without the resource. The chip jumps to Bases.
- **Recipe loop**: a recipe needs its own output somewhere up the chain; the chain stops at the repeat.

## Graph {#graph}

The same chain from raw materials on the left ("Bought · extracted", plus "have" with Own production) to the targets on the right. **Line width** follows **t / day** (default), **ȼ / day** or **Equal**. Zoom with −, **Fit** and +. A node shows where it is bought or which base and building make it. Click a material to see only what it needs and feeds; **Show all** goes back.

## Bases {#bases}

A chain can run on many bases, each on one planet, up to 26 (A to Z). The Bases tab starts with three steps; the next one to take is the main button.

### 1. Lay out into bases {#auto-layout}

**Auto layout** lays the chain out into bases you could build:

- One [[expertise]] per base, up to the size in **Bases up to**: 500 area (default), 750 or 1,000. An expertise that needs more than one base at that size fills bases up to 1,000 instead, so you run one full base rather than several alike.
- A step that doesn't fit is split by whole buildings: as many as fit go into the current base, the rest into the next one, so 6 CHP can become 4 + 2, and a step can span more than two bases. Extraction steps stay whole.
- Small groups of steps (under 1.5 buildings, or without an expertise) join the base they ship the most tonnes with, where they fit; otherwise they get a mixed base.
- Steps under 0.2 building that cost more per unit with a whole building than on the CX are bought. They show a **Buy** tag in Steps; you can switch them back to Make, but the next Auto layout or Fit buys them again.
- Each base gets a planet. See [How planets are picked](#planet-picking).
- Bases of the same expertise are merged afterwards when the merged base fits 1,000 area and loses no resource or fertility.

> [!warning]
> Auto layout starts over. It builds new bases from scratch, with new names, planets, COGC set to the running program, and default luxuries and experts. Names, planets, COGC picks, luxuries and expert edits you made before are lost.

### How planets are picked {#planet-picking}

Auto layout only uses a planet that:

- has a free [[plots|plot]], or plots PRUNplanner hasn't read yet. A full planet with [[ghost-sites|ghost sites]] isn't used;
- has no plan of yours, in any empire;
- can run the base: every extracted resource is there, farms can run, and the base fits within the size.

Among those, planets running a COGC program that helps the base's buildings come first, then the ones closest to the other bases (weighted by the tonnes shipped) and, with an empire picked under Own production, to its planets. Among ties, the one where the base needs the least area wins. The largest base is placed first.

### 2. Fit the rate to your bases {#fit}

Set **Number of bases** (2 by default, 1 to 26) and press **Fit rate**. It sets the largest rate, all targets scaled alike, that auto layout puts into that many bases, and then lays the chain out. It can lower the rates or raise them (up to 4,096 times), in steps of 0.01 per day on the largest target. If even 0.01 per day needs more bases, it says so.

The count is checked with the layout before planets are picked. Planets with lower extraction rates or poorer fertility can then need a little more, so look at the result.

> [!tip]
> Fit rate scales every target by the same factor, so their ratio stays. Change one target first if you want a different mix.

### 3. Create the plans {#create-the-plans}

Once every base has a planet and fits 1,000 area, the third step says so and offers "Create … plans…". Otherwise it says how many bases lack a planet or are over 1,000 area. See [Create plans](#create-plans).

### Overview and base cards {#base-cards}

Below the steps, an overview shows **Bases** (how many have a planet), **Largest base**, **Permits** (with the area in all bases) and **Shipping t / day** (with the routes), with one line per base: its expertise and planet. **Add base** adds one.

Each base card lets you:

- name the base and pick its planet ("Pick a planet", or "change");
- pick its COGC program: "Running: …" (the default), **No program**, or another program to plan ahead of a vote. Programs that help the base come first, with their bonus and "not running" when the planet doesn't run them;
- set its **Luxuries**: Both (100 % workforce efficiency, the default), Lux 2 (92 %), Lux 1 (87 %) or Essentials (79 %). The upkeep pays for them;
- **Edit** its **Experts**, or go back to **Auto**. Auto picks the split worth most for the base's output: usually 5 in its main expertise and the sixth in the next one, at most 5 of one type and 6 per base;
- **Merge into…** another base, which keeps its planet;
- **Separate** it by expertise, or in half for one expertise, with planets for the new bases;
- remove it with ×; its steps move to the first base.

A base's buildings get the planet's bonuses as in a plan: +25 % from an advertising program for their expertise, +10 % from a workforce program for a tier they employ, and fertility for farms (FRM and ORC can't run without it). Extracted steps use the planet's own rate; a planet without the resource keeps the chain's rate and warns. A base over 1,000 area warns too.

The card shows its buildings, area (core module, one STO and habitation), [[area-permits|permits]], workforce, and upkeep with wear per day.

The **Base** column in Steps moves a step, or one piece of a split step, to another base; "+ new base" starts a new one.

The planet picker for a base solves the base's steps on every planet, so you can compare buildings and area. It marks planets where you already have a plan ("your plan"). **Only planets that** filters for planets that have the resources and allow farming (on by default), run a COGC program for the base, are fertile, or have one of your plans; you can also filter by extra materials, local market, jumps and name. It doesn't show plots.

**Shipping per day** lists what moves between bases and the CX, in tonnes and m³, with the [[jumps]]. This is what you hand over to your logistics.

## Create plans {#create-plans}

**Create plans** makes one plan per base that has steps, with its buildings, recipes, habitation, one STO, the COGC program and permits. The plans get the base's luxuries and experts, so they produce what the chain shows; HQ and faction bonuses are left to the plans.

- Each plan's name starts as the targets and the base name; you can change it.
- **New empire** (the default, named "Chain …" after the targets, with a **Faction**), **Add to** an existing empire, or **No empire**. A new empire is created first, with its permits set from the plans.
- The dialog says what blocks it: no base with steps, a base without a planet or over 1,000 area, a missing name, or no empire picked.
- A farm on a planet without fertility is left out of its plan; an extraction off its resource gets the extractor without a recipe. The dialog says so.
- With Own production, materials your bases supply aren't in the new plans.

The page stays on the chain and links the new plans and the empire. The links stay in the Bases tab until the chain changes. If one plan fails, the plans created before it are kept and listed.

## Buy list {#buy-list}

What the chain buys, for a number of days (10 by default). With more than one base it is grouped by base. Each row has the units (rounded up), weight and cost, with totals, the m³ to haul in, and the targets' tonnes and m³ going out.

**Copy XIT buy action** (or "Copy XIT action for …" per base) copies an [[xit|XIT]] action that buys the list at the warehouse of the exchange most of its rows are priced on, and moves it to that base's planet when the base has one.

The list holds only the chain's recipe inputs. Workforce consumables aren't on it; plan them in the plans the chain creates.

## Sharing {#sharing}

The link holds the whole chain: targets, settings, sources, recipes, planets, bases, Have amounts and the CX. **Copy chain link** copies it. The last chain you worked on opens again in this browser, per account, when you open the page without a link.

## Check an empire {#check-an-empire}

Switch the **Mode** at the top to **Check an empire** to see how one of your empires makes what it sells, and what would make it better. Each mode keeps its own state while you switch.

1. Pick the **Empire**. It starts at your default empire.
2. Pick the chains: each material the empire sells (makes more of than it uses, with a CX sell price) is a chain, shown with its amount per day. "+ Add a chain" adds one; "All the empire sells" or **Check everything the empire sells** adds every one. **Clear** removes them.

The check follows each chain back through your plans: which base makes each step, with which recipe and efficiency, and what is bought. It never changes a plan; it only points at them.

| Setting | Default |
| --- | --- |
| **Prices** | the empire's exchange preference |
| **Setup gains** | **Show** |
| **Ignore below** | 200 ȼ / day |
| **Moves pay back within** | 100 days |

The strip at the top shows the empire's **Profit / day** as planned, the **Possible gain / day**, **Bases checked**, how many **Look optimal**, **Improvements**, **Plan fixes**, **Setup gains / day** and **Moves**. Gains are valued against the chain default: both luxuries, the experts worth most and the planet's running COGC, at your CX prices, with made inputs at the empire's own cost.

### Bases {#check-an-empire-bases}

Every base is marked: **Looks optimal**, has improvements, **Plan fix**, or **Not in these chains**. Open a base to see its **Production as planned**, its luxuries, experts and COGC under **Plan** against the **Chain default**, and its **Findings**. **Coverage** on the side shows how many bases the chains reach; "Add …" adds what the other bases sell.

### Findings {#findings}

Each finding shows its gain per day, construction and payback. Filter them by kind:

- **Plan fix**: the plan counts a COGC program the planet doesn't run, or the planet runs one the plan doesn't count. For an advertising (expertise) program, the buildings make 20 % less than the plan says, or would make 25 % more; for a workforce program it is 9 % less or 10 % more.
- **Recipe**: another recipe of the same building makes the material at least 3 % cheaper.
- **Make or buy**: a material that isn't a target costs more to make than to buy.
- **Location**: another planet suits the step at least 10 % better (its COGC program, fertility or extraction rate), compared with the program the planet actually runs. The option is one of your bases (only the moved buildings to build, and it needs free area) or a new base (buildings, habitation and core module). The suggestion is the best option that has room, a free plot (or ghost sites; unknown plots count as possible) and pays back within **Moves pay back within**. "All … planets…" lists every option with filters and sorting; **Use** makes a planet your pick, **Back to suggested** undoes it.
- **Setup**: both luxuries (only when the extra output earns more than they cost), or a better expert split. Experts come with time in game; **Setup gains**: **Hide** leaves these out.

Findings below **Ignore below** are hidden; plan fixes and your picked locations always show. Gains on one step are alternatives, so a base's possible gain counts the best one per step. **Try in planner** (Recipe, Make or buy and Location findings) opens Plan a chain with the chain's bases and the change applied.

> [!tip]
> Fix the plan fixes first: they cost nothing to build, and the plan's numbers are off until you do.

> [!warning]
> A Location finding counts a full planet with ghost sites as possible for a new base. In the game, ghost sites only let new players who start on that planet settle there.

### Chains {#chains}

Each chain material by material: how much is made (**Made / day**), where (**Made in**), with which recipe (**Recipe as planned**), at what cost against the CX price, and what the chain planner would do (**Chain planner**).

### Sharing {#check-an-empire-sharing}

**Copy check link** copies the empire, the chains and the settings, but not the prices; whoever opens it sees the empire's own exchange preference. Only you can open your own empires: for anyone else the page says the empire isn't theirs.
