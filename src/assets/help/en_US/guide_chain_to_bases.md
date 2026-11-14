Start from a goal like "make 50 RAT a day". This guide turns it into a whole production chain, splits that chain into bases you could build, and creates one [[plan]] per base in a new [[empire]]. It's for players planning a new line of production across several bases, and it takes about 20 minutes. You need an account, and you should set up your prices first (see [Set up your prices](/help/guide_cx_prices)).

## 1. Set your targets {#step-1}

Open [Production Chains](/production-chain) (Calculators in the side menu).

1. Under **Produce per day**, pick a material in **Add material**.
2. Type the amount you want per day. A new target starts at 10.
3. Add more targets if you like, for example DW, RAT and OVE together. The chain shares the steps they have in common.

The results, **Steps** and **Graph** fill in at once and update with every change.

More: [Getting started](/help/tools_production_chain#getting-started).

## 2. Check the settings {#step-2}

These sit above the results:

- **Prices**: the [[exchange-preference|exchange preference]] PRUNplanner prices the chain with.
- **Raw resources**: **Buy** (default) or **Extract**.
- **Byproducts**: **Cover demand** uses a [[byproduct]] inside the chain first. **Sell** sells them all.
- **Own production**: pick an empire you already run, and the chain uses that empire's surplus first.

> [!warning]
> Picking a preference under **Prices** also makes it your default exchange preference, so other tools that follow your default switch with it.

Read more: [Settings](/help/tools_production_chain#settings), [Own production](/help/tools_production_chain#own-production).

## 3. Decide what to make and what to buy {#step-3}

**Steps** lists every material of the chain once. For each one, **Source** says whether you **Make**, **Buy** or **Extract** it, and **Make or buy** says whether making it saves money.

- The chips above the steps sum up what to look at. **Cheaper to buy** lists steps you make for more than the exchange price, and **Buy all** switches them to buying.
- **Thin market** lists bought materials where the chain needs 10 % or more of what the exchange trades a day. Buying that much will likely move the price.
- If a material has several [[recipe|recipes]], click "n recipes ▾" to compare their effect on the chain.

More: [Steps](/help/tools_production_chain#steps), [Warnings](/help/tools_production_chain#warnings).

## 4. Read the results {#step-4}

The strip at the top adds up the whole chain:

- **Profit / day** is the output value minus bought inputs, workforce [[upkeep]], wear and production fees.
- **Buildings**, **Area** and **Workforce** show what it takes.
- **Construction** is what it costs to build, with its [[payback]].

You want a profit that pays the construction back in a time you accept. If it doesn't, change a target or switch steps between make and buy, and watch the strip.

Details: [Results](/help/tools_production_chain#results), [How costs are calculated](/help/tools_production_chain#how-costs-are-calculated).

## 5. Lay the chain out into bases {#step-5}

Open the **Bases** tab. It shows three steps, and the next one is the main button.

1. Pick the size under **Bases up to**: 500 area (1 permit), 750 or 1,000.
2. Press **Auto layout**. It groups the steps into bases of one [[expertise]] each and picks a planet for each base. That planet has a free plot, no plan of yours, and the resources and fertility the base needs. Auto layout prefers a helpful COGC program and short distances.
3. Want a given number of bases instead? Set **Number of bases** and press **Fit rate**. It scales all targets alike to the largest rate that fits, then lays the chain out.

> [!warning]
> **Auto layout** and **Fit rate** start over. You lose any names, planets, COGC picks, luxuries and experts you changed before, so lay out first and adjust afterwards.

More: [Lay out into bases](/help/tools_production_chain#auto-layout), [How planets are picked](/help/tools_production_chain#planet-picking), [Fit the rate](/help/tools_production_chain#fit).

## 6. Adjust the bases {#step-6}

On each base card you can rename the base, pick another planet, choose its COGC program, set its **Luxuries** and **Experts**, merge it into another base or separate it.

The planet picker solves the base on every planet, so you can compare buildings and area. It also marks planets where you already have a plan. **Shipping per day** lists what moves between your bases and the exchange, in tonnes and m³, with the [[jumps]].

You're ready for the next step when every base has a planet and fits 1,000 area, and the third step offers to create the plans.

More: [Overview and base cards](/help/tools_production_chain#base-cards).

## 7. Create the plans {#step-7}

Press "Create … plans…" in the third step, or **Create plans**.

1. Check each plan's name.
2. Choose **New empire** (the default, with a **Faction**), **Add to** an existing empire, or **No empire**.
3. Confirm. The page stays on the chain and links the new plans and the empire.

Each plan gets its base's buildings, recipes, habitation, one STO, COGC program, permits, luxuries and experts.

Read more: [Create plans](/help/tools_production_chain#create-plans).

## 8. Review the plans {#step-8}

The chain leaves some things to the plans, so open each new plan and check it as a base:

- **Planet** and **Empire & prices**: the chain leaves HQ and faction bonuses to the plans. Tick **Corp. HQ** under **Planet** where it applies, and check the empire's faction and permits.
- The results tiles: **Profit / day**, **Payback**, and **Area** within your permits.
- **Plan check**: whether the market takes what this base sells and supplies what it buys.
- **Construction**: what you still need to build it.

Back in Production Chains, the **Buy list** sums what the chain buys for a number of days, and **Copy XIT buy action** copies it as an [[xit|XIT]] action.

> [!tip]
> **Copy chain link** saves the whole chain as a link, so you can come back to it or share it.

More: [Base setup](/help/plan_base#empire-and-prices), [Plan check](/help/plan_check), [Buy list](/help/tools_production_chain#buy-list).

## Next {#next}

- [Grow to an empire](/help/guide_empire): check the new bases together on the Empire page.
- [Hand off to the game](/help/guide_hand_off): construction, supply and XIT packages for building them.
