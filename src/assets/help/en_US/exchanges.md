On the [Exchanges](/exchanges) page you decide which prices your plans use. Set a home exchange, pick a price basis, add fixed prices for materials you make yourself, and make exceptions for single planets. Every profit, cost and ROI number in PRUNplanner depends on these prices.

Come here when you want to know where a price in your plans comes from, or to change it. The [Overview](#overview) shows every price your plans use and the rule behind it, and nothing you change reaches your plans until you save.

## Exchange Preferences {#exchange-preferences}

An [[exchange-preference|exchange preference]] sets the prices your plans use. It picks the [[cx|exchange]] and price basis, and holds [[fixed-price|fixed prices]] for materials you get at your own cost or from a partner.

- A preference belongs to your account. You assign it to an [[empire]] in [Management](/manage), in the CX column of **Empire Configuration**. An empire has one preference, and one preference can serve several empires.
- A [[plan]] has no preference of its own. It uses the preference of the empire it's opened in, so a plan that's in two empires can show different prices in each.
- An empire without a preference ("None") prices everything at **Universe · VWAP 30D**.
- Every new account starts with "My Exchange Preference", set to Universe · VWAP 30D for buying and selling and assigned to "My Empire".

You create, rename and delete preferences in [Management](/help/management#cx). This page edits the rules of one preference at a time, which you pick under **Switch Preference**. Below the select you'll see which empires use it, or that no empire does.

## The Rules List {#rules-list}

The column on the left lists the parts of the preference you can open. On screens narrower than 1024 px it's a **Rules for** select instead.

| Entry | What it shows |
| --- | --- |
| **Overview** | Every price your plans use, see [Overview](#overview) |
| **All planets** | Your home exchange and fixed prices for every planet |
| **Planets with their own rules** | Planets with an [exception](#planet-exceptions) |
| **Using all-planets rules** | Planets of the empires using this preference that follow the all-planets rules (grouped by empire when several empires use the preference) |
| **Planets of other empires** | Planets of empires that don't use this preference, shown after you press the button to show them |
| **Not in any plan** | Planets with saved rules that none of your plans uses |

**All planets** and every planet with saved rules show how many rules they have, and the count turns amber when the entry has a warning note. From 10 planets on, a **Filter planets** box appears.

## Overview {#overview}

The page opens on the **Overview**. It lists every material that the plans of the empires using this preference buy or sell, the price it gets and the rule behind it. While planets of other empires are shown, their plans count too. It includes unsaved changes, so you see the effect of an edit before you save. Materials a plan neither buys nor sells (net 0) are left out.

- The summary on top shows the **All planets** rule, how many planets have their own rules, and how many fixed prices there are.
- **Search material** and **Show materials** (**All**, **Fixed**, **No price (0 ȼ)**, **Varies by planet**) narrow the table.
- The table lists **Material**, **Buy ȼ**, **Sell ȼ** and **Used on** (the first three planets, the rest as "+n"). When planets get different prices, you see the range and a "varies by planet" tag.
- A tag shows where each price comes from, for example "NC1 · VWAP 30D", **Fixed · all planets**, **Fixed · this planet** or **No price data**. Prices of 0 ȼ without a fixed price are amber.
- Expand a row to see the full ladder of [how the price is found](#how-a-price-is-found), for each side and planet. **Open the rule** jumps to the rule that set it.

While PRUNplanner calculates your plans, the table shows **Calculating your plans…** with a progress bar.

### Notes {#notes}

Notes above the table point to rules that need a look. Warnings come first, and **Open** takes you to the rule.

| Note | Kind | What to do |
| --- | --- | --- |
| A rule has no buy or sell price for some materials | Warning | Those materials count as 0 ȼ. Set a fixed price or pick another exchange or basis. |
| A material has no price on any exchange | Warning | It counts as 0 ȼ. Set a fixed price if you know one. |
| A material is fixed at 0 ȼ | Info | Fine if it's your own supply and free to you. |
| Fixed buy prices differ from their COGM | Info | Overview only. See [Fixed prices and COGM](#fixed-prices-and-cogm). |
| A planet's exchange rule is the same as all planets' | Info | You can remove it. |
| **No empire uses this preference** | Info | Assign it in Management. |
| Rules for planets in no plan | Info | Delete them under **Not in any plan** if you don't need them. |

## How a Price Is Found {#how-a-price-is-found}

For every material, PRUNplanner looks for a buy price (for what a plan consumes) and a sell price (for what it produces). It checks these levels in order and takes the first rule that matches:

1. **Planet fixed price**: a fixed price set on that planet
2. **All-planets fixed price**
3. **Planet exchange**: the exchange rule set on that planet
4. **All-planets exchange**
5. **Universe · VWAP 30D**, when no rule above matches

So an all-planets fixed price wins over a planet's exchange rule.

An example: **All planets** has NC1 · VWAP 30D for buying and selling and a fixed buy price of 45 ȼ for RAT. One planet has its own exchange rule, CI1 · Ask, for buying only. On that planet:

- Buying RAT gets 45 ȼ: the planet has no fixed price of its own, so the all-planets fixed price (level 2) matches first.
- Buying H2O gets the CI1 Ask: no fixed price matches, so the planet's exchange rule (level 3) does.
- Selling RAT gets the NC1 VWAP 30D: there's no fixed sell price, and the planet's rule is for buying only, so the all-planets exchange (level 4) matches.

### Buy, Sell or Both {#buy-sell-or-both}

A rule can apply to buying, selling or both. If a level has no rule for the side a plan needs, PRUNplanner skips that level and checks the next one, down to Universe · VWAP 30D. That happens, for example, when a level only has a buy rule and the plan sells the material.

### Exchanges Without a Price {#exchanges-without-a-price}

When an exchange rule matches but its exchange has no price for a material, the price is 0 ȼ. It doesn't fall through to the next level. This happens with Ask when nobody offers the material, with Bid when nobody wants it, and with VWAP when the exchange had no trade in the last 30 days. A material with no exchange data at all shows **No price data** and also counts as 0 ȼ.

A 0 ȼ price changes your plan's numbers: a material it buys at 0 ȼ costs nothing, and one it sells at 0 ȼ earns nothing. So a plan's profit can look better or worse than it would be on the market.

The page shows these prices in amber and lists them in the [notes](#notes), so you can set a fixed price or pick another exchange or basis.

## Price Basis: VWAP, Ask and Bid {#price-basis-vwap-ask-and-bid}

| Basis | What it is |
| --- | --- |
| VWAP 7D, VWAP 30D | The [[vwap\|volume-weighted average price]] of the last 7 or 30 days. Trades with higher volume count more, so one odd trade moves it little. |
| Ask | The cheapest offer in the order book right now: what you pay when you buy at once. |
| Bid | The highest buy order in the order book right now: what you get when you sell at once. |

[[Ask]] and [[Bid]] come from the live order book, so they can change at any time and can be missing for materials with little trading. When an exchange had no trade in the last 7 days, VWAP 7D uses the price of the last day it was traded. Both VWAPs are only 0 when there was no trade at all in the last 30 days.

An example of VWAP with made-up numbers: on one day 100 units trade for 5,000 ȼ in total (50 ȼ each), and on another 10 units trade for 1,000 ȼ (100 ȼ each). The VWAP is the credits ÷ the units, (5,000 + 1,000) ÷ (100 + 10) ≈ 54.55 ȼ. A plain average of the two prices would be 75 ȼ, so the small, pricier day moves the VWAP far less.

What the basis does to your plans: VWAP is one price for both sides, so with the same VWAP rule for buying and selling a material gets the same buy and sell price. With Ask for buying and Bid for selling, a plan buys at the cheapest offer and sells to the highest buy order, and the gap between the two, the [[spread]], shows in its profit.

[[Universe]] combines all four exchanges and only has VWAP prices. PRUNplanner refreshes exchange prices about every 30 minutes.

## Setting an Exchange Rule {#exchange-rule}

The **Exchange price** box on **All planets** and on each planet sets the exchange rule. Under **How buy and sell prices are set**, pick one of these:

- **Same for buy and sell**: one exchange and basis for both sides.
- **Separate buy and sell**: its own exchange and basis per side. A side can stay **Not set**, and then falls through to the next level.
- **Use all-planets rule** (planets only): the planet follows the all-planets rule, shown as "Uses the all-planets rule: …".

For each side you choose **Exchange for {side}** (AI1, CI1, IC1, NC1 or Universe) and **Price basis for {side}** (VWAP 7D, VWAP 30D, Ask, Bid). Universe only offers the two VWAPs. When you switch a planet from the all-planets rule to its own, it starts with the choice it inherited.

## Presets {#presets}

Two presets fill in the rule in one click:

- **Average · VWAP 30D** uses the VWAP 30D of the exchange for buying and selling.
- **Trade now · buy Ask, sell Bid** buys at the exchange's Ask and sells at its Bid. It isn't available for Universe, which has no order book.

Presets work on the exchange of the rule you're editing, else the all-planets exchange, else NC1. The box tells you which ("Presets on NC1:").

## Fixed Prices and COGM {#fixed-prices-and-cogm}

Fixed prices suit materials you make yourself and use at cost, or prices you've agreed with a corporation or partner. Add one with **Add material**, then type a buy price, a sell price or both. Leave a side empty to use the exchange price for it.

The **Fixed prices** table shows:

| Column | Meaning |
| --- | --- |
| **Buy ȼ**, **Sell ȼ** | Your fixed prices |
| **Market** | The price the material would get without the fixed price (buy side, unless only sell is fixed), with the difference in % |
| **COGM in your plans** | All planets only. For materials your plans make, the lowest [[cogm\|COGM]] (cost of goods manufactured) among the plans of the empires that use this preference, and in how many plans it's made. "in use" marks a buy price equal to it, otherwise **Use** sets the buy price to that COGM (rounded to 2 decimals). |
| Last column | The × button removes the row. On a planet, **Override** copies an all-planets price into a fixed price of its own |

From 10 rows on, you can search and sort the table by **Material** or **% vs market**.

In a plan's COGM tool, **Use as buy price on all planets** sets an all-planets fixed buy price to *that plan's* COGM, not the lowest one. See [Plan tools](/help/plan_tools#cogm-buy-price).

The Overview shows a note when an all-planets fixed buy price is more than 2 % off the lowest COGM. Its table has a **Use COGM** button per material. For example, with a fixed buy price of 45 ȼ and a lowest COGM of 40 ȼ, the gap is (45 − 40) ÷ 40 = 12.5 %, so the note shows. At 40.50 ȼ it's 1.25 %, and there's no note. Don't worry about this note: it's for information, and the fixed price keeps working as it is.

> [!tip]
> A fixed buy price at your own COGM makes the plans that use the material show the profit of the whole chain in the plan that sells the end product. Keep it in step with the COGM when your production changes.

## Planet Exceptions {#planet-exceptions}

Most players use one home exchange for all planets. When one planet needs something else, open it in the list and set its own exchange rule or fixed prices. On that planet its rules win over the all-planets rules, except all-planets fixed prices, which still win over the planet's exchange.

On a planet, the all-planets fixed prices are listed muted as **All-planets price**, and **Override** gives the planet its own fixed price for that material. Below that, **Prices on {planet}** shows what that planet's plans buy and sell and the price each gets.

Planets with stored rules that none of your plans uses any more are listed under **Not in any plan**. Their rules stay saved until you delete them with **Delete rules**.

## Saving {#saving}

Your plans only use your changes once you save them. The save bar at the bottom counts your changes: each changed part of the preference, plus one for a rename. **Save changes** saves them and re-prices every plan you have open, and **Discard** goes back to the saved rules. Since the [Overview](#overview) already shows unsaved changes, you can try a rule, look at the prices it gives, and discard it if it's not what you wanted. If you have unsaved changes, the page asks before you leave or switch preference.

**Rename…** in the **More actions** menu changes the preference's name. You save the new name with the save bar. **Manage preferences** opens Management.

If the same preference was saved in another tab or on another device after you opened it, the page tells you and keeps your edits. When you save, you choose **Overwrite** (your version replaces the other) or **Reload** (drop your edits and load the saved version).

## CSV Import and Export {#csv-import-and-export}

**Export CSV** downloads every rule of the preference, including unsaved changes, as `PRUNPlannerExchangePreferences.csv`. **Import CSV** reads such a file and asks before it replaces all rules of the preference. An import stays unsaved until you save it.

The file uses semicolons as separators and has the columns `Location;Type;CX;Ticker;Price`:

| Column | Values |
| --- | --- |
| Location | `EMPIRE` for all planets, or a planet's natural ID |
| Type | `BUY`, `SELL` or `BOTH` |
| CX | Exchange rules only: exchange and basis, e.g. `NC1_30D`, `CI1_7D`, `AI1_ASK`, `IC1_BID`, `UNIVERSE_30D` |
| Ticker, Price | Fixed prices only: the material's ticker and its price |

PRUNplanner rejects a file with a missing column or an invalid row as a whole, and nothing changes.

```
Location;Type;CX;Ticker;Price
EMPIRE;BOTH;NC1_30D;;
EMPIRE;BUY;;RAT;45
```

## Material Market Card {#market-card}

Every material [[ticker]] in PRUNplanner opens a market card. Hover it (or focus it with the keyboard) and the card appears. On a touch screen or a narrow window, tapping opens it as a sheet from the bottom.

The card shows one row per exchange plus Universe, with Ask, Bid, [[spread|Spread]], VWAP 7D and VWAP 30D, the change of 7D against 30D, a 30-day price line and the units traded per day (30-day average). Below that, short lines cover the trend across exchanges, the order books (units offered and wanted) and how far apart the exchanges' prices are. If a material trades less than one unit per day on all four exchanges together, the card marks it as rarely traded.

When the ticker belongs to a plan, an empire or a setup, the card also shows how much of the material it buys or sells per day and its [[share-of-volume|share of the daily volume]]: Fine below 10 %, Watch from 10 %, Too big from 50 %. These are the same limits as [Plan check](/help/plan_check#market-check). For example, if a plan sells 60 units a day and the exchange traded 9,000 units in the last 30 days, that's 300 a day, and the plan's share is 60 ÷ 300 = 20 %: Watch.

- Click the ticker to pin the card. Esc or × closes it. In a plan's Material I/O and in the HQ Calculator, a click opens the details right away.
- **Market details →** opens a drawer with the material's weight and volume, the data date, a table per exchange (**Prices**, **Order books**, **Volume**), a 30-day chart and **Market health** (breadth, volume-weighted trend, order book balance, price cohesion).
- **Market Exploration ↗** opens the material in [Market Exploration](/help/tools_market_exploration).

In [Profile](/help/profile#preferences), **Market card** sets how the card opens: **On hover** (default) or **On click only**. With On click only, hovering shows nothing and a click pins the card.
