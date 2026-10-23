# 거래소 설정

거래소 설정은 계획에 적용할 가격을 정합니다. 어느 거래소의 어떤 가격 기준을 쓸지, 그리고 직접 조달하거나 파트너에게서 받는 자재의 고정 가격을 지정할 수 있습니다. 관리 메뉴에서 제국에 설정을 지정하면, 해당 제국의 모든 계획에 적용됩니다.

이 페이지는 **개요**에서 시작합니다. 계획에서 구매하거나 판매하는 모든 자재와, 각 자재에 적용되는 가격 및 그 가격의 출처를 확인할 수 있습니다. Expand a row to see the full cascade for each planet. Notes above the table point to rules that need a look.

# How a Price Is Found

For every material, PRUNplanner looks for a buy price (for what a plan consumes) and a sell price (for what it produces). It checks these levels in order and takes the first rule that matches:

1. **Planet fixed price**: a fixed price set on that planet
2. **All-planets fixed price**
3. **Planet exchange**: the exchange rule set on that planet
4. **All-planets exchange**
5. **Universe · VWAP 30D**, when no rule above matches

An all-planets fixed price wins over a planet's exchange rule.

## Buy, Sell or Both

A rule can apply to buying, selling or both. If a level has no rule for the side a plan needs (for example only a buy rule, and the plan sells the material), that level is skipped and the next one is checked, down to Universe · VWAP 30D.

## Exchanges Without a Price

When an exchange rule matches but its exchange has no price for a material (no trades, no asks or no bids), the price is **0 ȼ**. It does not fall through to the next level. The page shows these prices in amber and lists them in the notes, so you can set a fixed price or pick another exchange or basis.

# Price Basis: VWAP, Ask and Bid

PRUNplanner can use a Volume-Weighted Average Price (VWAP) over 7 or 30 days. VWAP gives more weight to trades with higher volumes, so it reflects where most of the trading happened instead of single outlier orders.

Ask and Bid are today's order book: the cheapest offer and the highest bid. They change daily and can be missing for materials with little trading. Universe only has VWAP prices.

# Presets

- **Average · VWAP 30D** uses the VWAP 30D of the exchange for buying and selling.
- **Trade now · buy Ask, sell Bid** buys at the exchange's Ask and sells at its Bid. Not available for Universe.

Presets work on the scope's exchange, else the all-planets exchange, else NC1.

# Fixed Prices and COGM

Fixed prices suit materials you make yourself and use at cost, or prices agreed with a corporation or partner. Leave a side empty to use the exchange price for it.

On **All planets**, the fixed price table shows the market price without the fixed one and, for materials your plans make, the lowest COGM (cost of goods manufactured) among the plans that use the preference. **Use** sets the buy price to that COGM. In a plan's COGM tool, **Use as buy price** does the same. A note tells you when a fixed buy price is more than 2 % off the COGM.

# Planet Exceptions

Most players use one home exchange for all planets. When one planet needs something else, open it in the list and set its own exchange rule or fixed prices. Its rules win over the all-planets rules on that planet, except all-planets fixed prices, which still win over the planet's exchange.

Planets with stored rules that no plan uses any more are listed under **Not in any plan**. Their rules stay saved until you delete them.

# Saving

Changes are not used by your plans until you save them. The save bar counts the changed scopes; Discard goes back to the saved rules. The page asks before you leave or switch preference with unsaved changes.

# CSV Import and Export

**Export CSV** downloads every rule of the preference, including unsaved changes. **Import CSV** reads such a file and asks before it replaces all rules of the preference. An import is unsaved until you save it.
