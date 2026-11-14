Plan check tests a plan against the market before you build it. It tells you whether you can really buy and sell these amounts, which prices the profit hangs on, and how the plan compares with your other plans. You'll find it as a tool tab of Production (see [Plan layout](/help/plan_layout#parts)), with three views under **View**: **Market check** (the default), **Price sensitivity** and **Compare plans**. **Compare plans** only shows up when you're logged in.

The view and the price change you pick stay put for this browser tab, even when you switch plans or close and reopen the tool. Clicking a flag in [[material-io|Material I/O]] opens a popover, and its **Open Plan check →** opens Plan check on the Market check.

## Market check {#market-check}

A plan's [[profit]] assumes you can buy and sell every material at its price, in any amount. The Market check shows where that isn't true. It lists every material the plan buys or sells per day, worst first: red, then amber, then grey notes, and by share within each.

| Column | What it shows |
| --- | --- |
| **Material**, **Side** | The material and whether the plan buys or sells it. |
| **Per day** | How much the plan buys or sells per day. |
| **Share of daily volume, 30 days** | The plan's daily amount ÷ the average daily volume traded on the exchange in the last 30 days. Marks on the bar show 10 % and 50 %. |
| **Traded 30d** | Units traded on the exchange in the last 30 days. |
| **Bid · ask ȼ**, **Spread** | The best [[bid]] and [[ask]] right now, and the [[spread]] between them as a % of the ask. |
| **Check** | The material's first flag, or **ok**. |

- For [[share-of-volume|share of daily volume]], selling 50 units a day into a market that trades 100 a day is a 50 % share.
- If you buy at once, you pay the ask. If you sell at once, you take the bid.
- PRUNplanner checks each material on the exchange your [[exchange-preference|exchange preference]] uses for buying or selling it, and the caption names those exchanges (for example "Exchanges AI1, NC1"). Without an exchange preference, the check uses the volume of all exchanges together. The caption then says "no CX preference set" and, on your own plan, links to where you set one.
- With an exchange preference, a flagged row names the price rule it uses. On your own plan, that's a link to the rule in Exchanges (see [Exchanges](/help/exchanges#how-a-price-is-found)).
- **What this means** puts the worst material into one sentence. It also counts the materials that **Can't trade as planned**, have a **Large share of the market** or are **Fine**. Its button opens this page.
- On a phone, the table turns into cards: the first 6 and every flagged one, then "+ n more materials, all ok".

### At real prices {#real-prices}

**At real prices** recalculates the plan as if you bought what it buys at the ask and sold what it sells at the bid, each on its exchange. It shows **Plan profit**, **Buying at ask, selling at bid**, the **Difference** and the **ROI at ask / bid**.

It needs an exchange preference. Without one, it isn't calculated and says "Set a CX preference to see the plan at real ask and bid prices."

A material keeps its plan price in three cases: nobody offers or bids on it right now, no exchange is set for it, or it's priced at the [[universe|Universe]] average, which has no ask or bid. The section lists those materials. A material with a [[fixed-price|fixed price]] in your exchange preference does get the ask or bid here.

> [!tip]
> The plan's prices usually come from averages such as [[vwap|VWAP]]. At real prices shows your profit if you trade at once instead of waiting for your orders to fill. A big difference means the plan's profit depends on patient trading.

## What the flags mean {#flags}

The flag thresholds are fixed:

| Flag | Level | When |
| --- | --- | --- |
| *No price* | red | The plan has no price for the material and counts it at 0 ȼ. |
| *No trades in 7 days* | red | Nobody traded it on the exchange in the last 7 days, or the exchange has no data for it. |
| *No offers* | red | You buy it, and nobody sells it on the exchange right now. |
| *No buyers* | red | You sell it, and nobody bids for it on the exchange right now. |
| *Bigger than the market* | red | The plan trades 50 % or more of the daily volume. |
| *Large share of the market* | amber | The plan trades 10 % or more of the daily volume. Your orders will likely move the price. |
| *All exchanges, no exchange set* | grey note | No exchange preference, so all exchanges are counted. Shown once above the table. |
| *Data older than 2 days* | grey note | The exchange's latest data is more than 2 days old. |

Red is a filled circle (*can't trade as planned*), amber a triangle, grey a ring. *No offers* and *No buyers* need a real exchange, so they never show when all exchanges are counted. Spreads show up in the table but never get a flag.

Volumes, bid and ask come from the exchange data PRUNplanner loads from [[fio|FIO]], refreshed about every 30 minutes.

You can also watch the shares while you change counts and recipes. Set Material I/O's **Value shown** to %, and it shows each material's Δ as a share of the average daily volume of the last 7 and 30 days (**7d share**, **30d share**), amber from 10 % and red from 50 %. With **Show materials for** set to **Whole base**, Material I/O shows the flag icons too, and its summary ("2 materials can't trade as planned, …") links to **Plan check →**. The Plan check tab carries a dot while the plan has market flags.

> [!tip]
> A red or amber flag on an output doesn't mean the plan is bad. It means you sell more than the market takes. Fewer buildings, a second output or another exchange can fix that: try them and watch the share drop.

## What CX volume misses {#cx-volume}

The volume only comes from the commodity exchanges ([[cx|CX]]). PRUNplanner doesn't count sales on local markets, contracts between players or trades inside a corporation, so a material can be easier to sell than its CX volume says.

## Empire {#empire}

The [[empire]]'s Material I/O runs the same check on the empire's net flow. What one plan makes and another uses nets out, and only the rest reaches the market. Each plan's own Material I/O still flags its own amounts.

Chips above the table count the flagged materials by level, such as "3 can't trade as planned", "2 large share of the market" and "1 other note". Click one to see only the materials at that level, and click it again to see them all. More in [Empire](/help/empire).

## Price sensitivity {#sensitivity}

Price sensitivity shows which prices the profit hangs on. Pick **Change each price by** ±10 %, ±20 % (the default), ±30 % or ±50 %.

Every material the plan buys or sells gets a row, as long as its price moves the profit. PRUNplanner recalculates the plan once per material with that price doubled, and the profit change is the material's impact. If a material is also a building material, it moves the [[degradation]] cost too, and that counts in its row. [[production-fees|Production fees]] don't depend on prices.

| Column | What it shows |
| --- | --- |
| **Material**, **Side** | The material, and **buy** or **sell**. |
| **Profit falls ← · → Profit rises** | A bar for the profit change when this one price moves by the chosen %, everything else unchanged. Hover it for the value per day and the profit at both ends. |
| **Profit range ȼ/day** | Profit with the price down and up by the chosen %. |
| **Break-even** | The price change at which the plan's profit reaches 0. |

PRUNplanner sorts the rows by impact, and the bars' centre line is today's profit. It shows the top 10 and sums up the rest in one line, "+ n more materials … move profit by less than ±…", with a **Show all ({n})** button to list them.

**Break-even** turns red within ±60 % and amber within ±200 %. It reads **never** when the price would have to fall below 0. It reads **> +500 %** when the price would have to rise more than 500 %.

### What this means {#sensitivity-means}

**What this means** picks the most sensitive material and tells you:

- the profit after a move of the chosen % in the direction that hurts, and the break-even price change (or that the plan stays profitable even at a price of 0, or that no change to this price alone brings it to break-even);
- "Profit if …" and "ROI if …": the profit and the ROI after that move;
- **All costs +{pct} %**: the profit if every cost rises by the chosen %, counting materials bought, degradation and production fees;
- **Most sensitive**: the top 3 materials;
- where the prices come from: the plan's exchange preference, or the Universe 30-day average when it has none.

> [!tip]
> A break-even close to 0 % on your main output means a small price drop wipes out the profit. Before you build, check that material in [Market Exploration](/market-exploration) and set a price you trust in your exchange preference.

### Target price {#target-price}

**Target price** finds the price of one material that gives the profit you want, with every other price unchanged.

- **Material** lists the materials from the table and starts with the sold material with the most impact.
- **Target profit, ȼ/day** starts at today's profit, rounded up to the next 10,000.
- The answer reads "{ticker} has to sell at" or "{ticker} has to be bought at" a price. When no price above 0 can reach the target, it says you can't reach that profit by changing this price.
- **Plan price today** and the exchange's bid and ask right now show for comparison.
- Once you change the material or the target, you also see the exchange's lowest and highest price in the 30 days up to its last day with trades. It uses the daily lows and highs of the days with trades, and for all exchanges it covers all four. A note warns you when the price you'd need is above or below anything paid in those 30 days.

## Compare plans {#compare}

**Compare plans** puts this plan next to another of your plans. You need to be logged in.

**Compare with** lists your other plans, **This planet** first, then **Other planets**. It starts with the first plan in that list and remembers your pick for this plan while the tab is open.

PRUNplanner takes this plan as it is on screen, unsaved changes included. It calculates the other plan as saved, with its own empire, and prices it with that empire's exchange preference (or the Universe 30-day average). A line next to **Compare with** says which.

The two plans' figures sit side by side, each with a bar:

| Figure | What it is |
| --- | --- |
| **Daily profit** | Profit per day. |
| **Output value** | What the plan sells per day. |
| **Daily cost** | What the plan buys per day. |
| **Degradation** | 1/180 of the production buildings' build cost per day. |
| **Production fees** | Fees per day. |
| **Plan cost** | The build cost. |
| **ROI** | Days until the build cost is paid back. |
| **Payback of the difference** | See [below](#payback-difference). |
| **Profit / Area** | Profit per area. |
| **Area used** | Area the plan uses. |

**Difference** is the other plan minus this one. It's green or red depending on what's better for you: more profit and output, lower costs and a shorter ROI count as good, and area is neutral.

**Verdict** sums it up in a sentence. It says how much more or less this plan earns per day, how many days sooner or later it pays back, the other plan's largest gain and its two largest costs by material, and whether its extra build cost pays back.

**What changes** lists the ȼ / day per material, the other plan minus this one, largest first. If the other plan would trade a material into a worse market flag, that material is marked with its share.

The glossary has more on [[roi|ROI]] and [[payback]].

> [!tip]
> Save a copy of your plan, change one thing in the copy (a recipe, a building count, the planet), then compare the two. The Verdict and What changes show exactly what the change is worth.

### Payback of the difference {#payback-difference}

This is the other plan's extra build cost divided by its extra profit per day, in days: "{cost} ȼ more to build ÷ {profit} ȼ/day more profit". **never** means it costs more to build and earns no more. When the other plan doesn't cost more to build, you see "–".
