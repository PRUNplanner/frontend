Plan check tests a plan against the market before you build it: can you really buy and sell these amounts, which prices the profit hangs on, and how it compares with your other plans. It is a tool tab of Production (see [Plan layout](/help/plan_layout#parts)) with three views under **View**: **Market check** (the default), **Price sensitivity** and **Compare plans**. **Compare plans** is there only when you are logged in.

The view and the price change you pick stay as they are for this browser tab, also when you switch plans or close and reopen the tool. A flag in [[material-io|Material I/O]] opens Plan check on the Market check.

## Market check {#market-check}

A plan's [[profit]] assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true. It lists every material the plan buys or sells per day, worst first: red, then amber, then by share.

| Column | What it shows |
| --- | --- |
| **Material**, **Side** | The material and whether the plan buys or sells it. |
| **Per day** | How much the plan buys or sells per day. |
| **Share of daily volume, 30 days** | The plan's daily amount ÷ the average daily volume traded on the exchange in the last 30 days. Marks on the bar show 10 % and 50 %. |
| **Traded 30d** | Units traded on the exchange in the last 30 days. |
| **Bid · ask ȼ**, **Spread** | The best [[bid]] and [[ask]] right now, and the [[spread]] between them as a % of the ask. |
| **Check** | The material's first flag, or **ok**. |

- [[share-of-volume|Share of daily volume]]: selling 50 units a day into a market that trades 100 a day is a 50 % share.
- Bid and ask: buying at once means paying the ask, selling at once means taking the bid.
- Exchange: each material is checked on the exchange of its [[exchange-preference|exchange preference]], for buying or selling; the caption names them (for example "Exchanges AI1, NC1"). Without an exchange preference, the check uses the volume of all exchanges together, and the caption says "no CX preference set" with a link to set one.
- A flagged row with an exchange preference links to the price rule it uses in [Exchanges](/help/exchanges#how-a-price-is-found).
- **What this means** puts the worst material into one sentence, counts the materials that **Can't trade as planned**, have a **Large share of the market** or are **Fine**. Its button opens this page.
- On a phone, the table becomes cards: the first 6 and every flagged one, then "+ n more materials, all ok".

### At real prices {#real-prices}

**At real prices** recalculates the plan with every material bought at the ask and sold at the bid on its exchange. It shows **Plan profit**, **Buying at ask, selling at bid**, the **Difference** and the **ROI at ask / bid**.

- It needs an exchange preference. Without one it isn't calculated and says "Set a CX preference to see the plan at real ask and bid prices."
- A material keeps its plan price when nobody offers or bids on it right now, when no exchange is set for it, or when it is priced at the [[universe|Universe]] average, which has no ask or bid. The section lists those materials.
- A material with a [[fixed-price|fixed price]] in your exchange preference is also priced at the ask or bid here.

> [!tip]
> The plan's prices usually come from averages such as [[vwap|VWAP]]. At real prices shows the profit if you trade at once instead of waiting for your orders to fill. A big difference means the plan's profit depends on patient trading.

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

- Red is a filled circle (*can't trade as planned*), amber a triangle, grey a ring.
- *No offers* and *No buyers* need a real exchange; with all exchanges counted, they never show.
- Spreads are shown but never flagged.
- Source: volumes, bid and ask come from the exchange data PRUNplanner loads from [[fio|FIO]], refreshed about every 30 minutes.

To watch the shares while you change counts and recipes, set Material I/O's **Value shown** to %: each material's Δ as a share of the average daily volume of the last 7 and 30 days (**7d share**, **30d share**), amber from 10 %, red from 50 %. With **Show materials for** set to **Whole base**, Material I/O shows the flag icons too, and its summary ("2 materials can't trade as planned, …") links to **Plan check →**. The Plan check tab carries a dot while the plan has market flags.

> [!tip]
> A red or amber flag on an output doesn't mean the plan is bad. It means you sell more than the market takes. Fewer buildings, a second output or another exchange can fix that: try them and watch the share drop.

## What CX volume misses {#cx-volume}

The volume comes from the commodity exchanges ([[cx|CX]]) only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

## Empire {#empire}

The [[empire]]'s Material I/O runs the same check on the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Each plan's own Material I/O still flags its own amounts. Chips above the table count them by level, such as "3 can't trade as planned", "2 large share of the market" and "1 other note"; click one, or tick **Show only flagged materials**, to show only flagged materials. See [Empire](/help/empire).

## Price sensitivity {#sensitivity}

Price sensitivity shows which prices the profit hangs on. Pick **Change each price by** ±10 %, ±20 % (the default), ±30 % or ±50 %.

Every material the plan buys or sells gets one row, as long as its price moves the profit. PRUNplanner recalculates the plan once per material with that price doubled; the profit change is the material's impact. A material that is also a building material moves the [[degradation]] cost too, and that counts in its row. [[production-fees|Production fees]] don't depend on prices.

| Column | What it shows |
| --- | --- |
| **Material**, **Side** | The material, and **buy** or **sell**. |
| **Profit falls ← · → Profit rises** | A bar for the profit change when this one price moves by the chosen %, everything else unchanged. Hover it for the value per day and the profit at both ends. |
| **Profit range ȼ/day** | Profit with the price down and up by the chosen %. |
| **Break-even** | The price change at which the plan's profit reaches 0. |

- Rows are sorted by impact. The top 10 show; the rest are summed up as "+ n more materials … move profit by less than ±…", with a **Show all ({n})** button to list them.
- The centre line of the bars is today's profit.
- **Break-even** is red within ±60 %, amber within ±200 %. It reads **never** when the price would have to fall below 0, or when the price doesn't move the profit, and **> +500 %** when it would have to rise more than 500 %.

### What this means {#sensitivity-means}

**What this means** takes the most sensitive material:

- the profit after a move of the chosen % in the direction that hurts, and the break-even price change (or that the plan stays profitable even at a price of 0, or that no change to this price alone brings it to break-even);
- "Profit if …" and "ROI if …": the profit and the ROI after that move;
- **All costs +{pct} %**: the profit if every cost rises by the chosen %: materials bought, degradation and production fees;
- **Most sensitive**: the top 3 materials;
- where the prices come from: the plan's exchange preference, or the Universe 30-day average when it has none.

> [!tip]
> A break-even close to 0 % on your main output means a small price drop wipes out the profit. Before you build, check that material in [Market Exploration](/market-exploration) and set a price you trust in your exchange preference.

### Target price {#target-price}

**Target price** finds the price of one material that gives the profit you want, with every other price unchanged.

- **Material** lists the materials of the table. It starts with the sold material with the most impact.
- **Target profit, ȼ/day** starts at today's profit, rounded up to the next 10,000.
- The answer reads "{ticker} has to sell at" or "{ticker} has to be bought at" a price. When no price above 0 can reach the target, it says the profit can't be reached by changing that price.
- **Plan price today** and the exchange's bid and ask now show for comparison.
- Once you change the material or the target, the exchange's lowest and highest price of the last 30 trading days shows too, from the daily lows and highs up to the last day with trades; for all exchanges, over all four. A note warns when the needed price is above or below anything paid in those 30 days.

## Compare plans {#compare}

**Compare plans** puts this plan next to another of your plans. It needs you to be logged in.

- **Compare with** lists your other plans: **This planet** first, then **Other planets**. It starts with the first plan in that list and remembers your pick for this plan while the tab is open.
- This plan is compared as it is on screen, with unsaved changes. The other plan is calculated as saved, with its own empire and priced with that empire's exchange preference (or the Universe 30-day average); a line under the table says which.

The key figures, side by side with a bar each:

| Key figure | What it is |
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

**Difference** is the other plan minus this one, green or red by what is better for you: more profit and output, lower costs and a shorter ROI count as good; area is neutral.

- **Verdict** sums it up in a sentence: how much more or less this plan earns per day, how many days sooner or later it pays back, the other plan's largest gain and its two largest costs by material, and whether its extra build cost pays back.
- **What changes** lists the ȼ / day per material, the other plan minus this one, largest first. A material the other plan would trade into a worse market flag is marked with its share.

See [[roi|ROI]] and [[payback]] in the glossary.

> [!tip]
> Save a copy of your plan, change one thing in the copy (a recipe, a building count, the planet), then compare the two. The Verdict and What changes show exactly what the change is worth.

### Payback of the difference {#payback-difference}

The other plan's extra build cost divided by its extra profit per day, in days: "{cost} ȼ more to build ÷ {profit} ȼ/day more profit". **never** means it costs more to build and earns no more. When the other plan doesn't cost more to build, it shows "–".
