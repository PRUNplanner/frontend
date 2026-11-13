Every profit, cost and payback in PRUNplanner depends on the prices you choose. This guide sets up your [[exchange-preference|exchange preference]] step by step: a home exchange, how you buy and sell, exceptions for single planets, and [[fixed-price|fixed prices]] for what you make yourself. It's for anyone whose plans should match how they really trade, and it takes about 15 minutes. You need an account.

## 1. Open your exchange preference {#step-1}

Open [Exchanges](/exchanges). It shows one preference at a time; **Switch Preference** picks another. Below the select you see which [[empire|empires]] use it.

- A new account has "My Exchange Preference", used by "My Empire" and set to **Universe · VWAP 30D**.
- A [[plan]] has no prices of its own: it uses the preference of the empire it calculates with. An empire uses one preference; several empires can share one.
- To give an empire another preference, pick it in column CX of **Empire Configuration** in [Management](/manage).

More: [Exchange preferences](/help/exchanges#exchange-preferences), [Management](/help/management#cx-configuration).

## 2. Set your home exchange with a preset {#step-2}

1. Open **All planets** in the list on the left. Its rules apply to every planet, unless a planet has its own.
2. In the **Exchange price** box, pick your home exchange: AI1, CI1, IC1 or NC1.
3. Click a preset:
   - **Average · VWAP 30D**: buy and sell at the 30-day [[vwap|VWAP]] of that exchange. A steady average of what was traded.
   - **Trade now · buy Ask, sell Bid**: buy at the cheapest offer and sell to the highest buyer right now. The price of trading at once.

The box says which exchange the presets work on ("Presets on NC1:").

More: [Presets](/help/exchanges#presets).

## 3. Choose buy, sell or both, and the price basis {#step-3}

Under **How buy and sell prices are set**:

- **Same for buy and sell**: one exchange and basis for both sides.
- **Separate buy and sell**: its own exchange and basis for each side, for example buy on CI1 and sell on NC1. A side left **Not set** falls through to the next rule, down to Universe · VWAP 30D.

| Basis | Use it when |
| --- | --- |
| VWAP 7D, VWAP 30D | You want a steady average. 7D follows recent moves faster. |
| Ask | You buy at once, from the cheapest offer. |
| Bid | You sell at once, to the highest buyer. |

[[Universe]] only has the two VWAPs.

> [!warning]
> When the chosen exchange has no price for a material (nobody offers it, nobody bids, or no trade in 30 days), it counts as 0 ȼ. It doesn't fall back to another exchange. The page shows such prices in amber and lists them in its notes.

More: [Price basis](/help/exchanges#price-basis-vwap-ask-and-bid), [Buy, sell or both](/help/exchanges#buy-sell-or-both).

## 4. Add exceptions for single planets {#step-4}

When one base sells somewhere else, for example a base closer to another exchange, give its planet its own rule.

1. Open the planet in the list (under **Using all-planets rules**).
2. In its **Exchange price** box, switch from **Use all-planets rule** to **Same for buy and sell** or **Separate buy and sell**, and set the rule.

The planet then moves to **Planets with their own rules**. Its rule wins over the all-planets rule, except for all-planets fixed prices, which still win. The prices list below the rules shows what that planet's plans buy and sell, at which price.

More: [Planet exceptions](/help/exchanges#planet-exceptions), [How a price is found](/help/exchanges#how-a-price-is-found).

## 5. Fix prices for what you make yourself {#step-5}

Materials you make in one base and use in another shouldn't cost the market price: they cost what you pay to make them, your [[cogm|COGM]].

- In a plan, open **COGM** on the order that makes the material and click **Use as buy price on all planets** (offered while the material has no fixed price). This sets a fixed buy price at *that plan's* COGM for every planet of the preference.
- Or, on **All planets** in Exchanges, add the material to **Fixed prices** with **Add material** and type a price. For materials your plans make, the **COGM in your plans** column shows the lowest COGM, and **Use** copies it into the buy price.
- Leave a side empty to keep the exchange price for it.

> [!tip]
> Keep fixed prices in step with your production. The Overview notes when a fixed buy price is more than 2 % off the lowest COGM, and the COGM dialog offers to update it.

More: [Fixed prices and COGM](/help/exchanges#fixed-prices-and-cogm), [Using COGM as a buy price](/help/plan_tools#cogm-buy-price).

## 6. Save and check the result {#step-6}

1. Press **Save changes** in the bar at the bottom. Your plans use the new rules only once you save.
2. Open the **Overview**: every material your plans buy or sell, its price and the rule behind it. Look at the notes on top first; warnings come first.
3. Open a plan. **Prices** under **Empire & prices** names the preference; open **Plan check**. **Market check** checks each material on the exchange your preference uses, and **At real prices** shows the profit at today's ask and bid.

What good looks like: no amber 0 ȼ prices for materials you trade, and a profit at real prices you can live with.

More: [Overview](/help/exchanges#overview), [Plan check](/help/plan_check#market-check).

## Next {#next}

- [From a chain to bases](/help/guide_chain_to_bases): plan a whole chain at these prices.
- [Grow to an empire](/help/guide_empire): check all your bases together.
