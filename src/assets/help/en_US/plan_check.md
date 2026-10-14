**Plan check**

Plan check tests a plan against the market. It has three views: Market check (the default), Price sensitivity and Compare plans.

**Market check**

A plan's profit assumes every material can be bought and sold at its price, in any amount. The Market check shows where that isn't true.

- **Share of daily volume**: what the plan buys or sells per day, divided by the average daily volume traded on the exchange in the last 30 days. Selling 50 units a day into a market that trades 100 a day is a 50 % share.
- **Bid, ask and spread**: the bid is the best price a buyer offers right now, the ask the best price a seller asks. Buying at once means paying the ask, selling at once means taking the bid. The spread is the gap between them, as a % of the ask.
- **At real prices**: the plan's profit when every material is bought at the ask and sold at the bid on its exchange. A material without an ask or bid, or without an exchange in your CX preference, keeps its plan price.
- **Exchange**: the exchange of your CX preference. Without one, the check uses the volume of all exchanges together.

**What the flags mean**

- Red, a filled circle: the plan can't trade this material as planned.
  - *No price*: the plan has no price for it and counts it at 0.
  - *No trades in 7 days*: nobody traded it on the exchange in the last 7 days.
  - *No offers* / *No buyers*: nobody sells (when you buy) or bids for it (when you sell) on the exchange right now.
  - *Bigger than the market*: the plan trades 50 % or more of the daily volume.
- Amber, a triangle: *Large share of the market*, 10 % or more of the daily volume. Your orders will likely move the price.
- Grey, a ring: a note. *All exchanges, no exchange set* (no CX preference, so all exchanges are counted) or *Data older than 2 days*.

Spreads are shown but never flagged.

**What CX volume misses**

The volume comes from the commodity exchanges only. Sales on local markets, contracts between players and trades inside a corporation aren't counted, so a material can be easier to sell than its CX volume says.

**Empire**

The empire's Material I/O checks the empire's net flow: what one plan makes and another uses nets out, and only the rest reaches the market. Click a flag chip above the table to show only those materials.

**Target price**

In Price sensitivity, Target price finds the price of one material that gives the profit you want, with every other price unchanged. It also shows the exchange's lowest and highest price of the last 30 days.

**Payback of the difference**

In Compare plans: the other plan's extra build cost divided by its extra profit per day, in days. "never" means it costs more and earns no more.
