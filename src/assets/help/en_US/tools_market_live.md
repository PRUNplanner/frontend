Market Live shows changes on the four commodity exchanges as they arrive and checks them against alerts you set up. Use it to watch prices and order books on the [[cx|CX]] while you trade, and to spot moves you care about without refreshing anything.

## Where the data comes from {#data-stream-mechanics}

[[fio|FIO]], the community service fed by players' game clients, forwards exchange updates to PRUNplanner, which passes each one straight on to your browser. There is no fixed interval: data arrives as FIO receives changes.

- Only AI1, CI1, IC1 and NC1 are streamed.
- A material and exchange only appear after FIO has sent an update for them. Quiet materials can stay missing for a long time.
- PRUNplanner keeps about the last 500 changes. When you open the page you get those first, so the overview isn't empty, then new ones as they come.

> [!warning]
> The stored changes arrive in a burst when you open the page. They get the time they arrived in your browser, not the time they happened, and they run through your active alerts like new ones.

The status at the top right shows **Connected** (pulsing green), **Reconnecting** or **Disconnected**. If the connection drops, the page reconnects by itself, waiting 5 seconds first and up to 60 seconds after repeated failures. The server accepts up to 5 open streams per IP address, so close Market Live in tabs you don't need.

## Live View {#live-view}

The overview on the right (under the feed on narrower screens) lists every material and exchange received so far, as `DW.NC1`, sorted A to Z. **Hide Overview** and **Show Overview** toggle it.

| Column | What it shows |
| --- | --- |
| **Ticker** | material and exchange |
| **Price (ȼ)** | the price in the update |
| **Bid (ȼ)** | the highest buy order ([[bid]]) |
| **Ask (ȼ)** | the lowest sell order ([[ask]]) |
| **Spread %** | (ask − bid) ÷ ask × 100 ([[spread]]) |
| **Buy Vol.** | units in all open buy orders |
| **Sell Vol.** | units in all open sell orders |

Each change updates only the fields it carries; the rest keep their last value. Buy and sell volume are what sits in the order book, not what was traded.

## Alert Feed {#alert-feed}

The **Alert Feed** lists every alert that fired, newest first, up to 500. **Clear Feed** empties it. The feed lives only on this page: it is cleared when you leave Market Live, and nothing reaches you anywhere else (no notification, sound or email).

| Column | What it shows |
| --- | --- |
| **Ticker / Alert** | material and exchange, with the alert's name |
| **Severity** | **LOW**, **MEDIUM** (amber) or **HIGH** (red row) |
| **Trigger Logic** | each condition that matched: field, value, operator, target |
| **Event** | for number fields: the previous and the new value |
| **Time** | when the change arrived, as HH:mm:ss |

Hover a row to see the full state of that material: price, bid, ask, spread, buy and sell volume with their [[vwap|VWAP]] and change, and a bar of buy against sell volume. Narrow screens hide some columns.

The bell (**Alert notifications**) pauses and resumes checking alerts for this visit. It is on when you open the page; changes that arrive while it is off never fire.

Before any alert fires, the feed shows **Waiting for market events triggering alerts...**.

## Data History {#data-history}

**Data History** at the bottom groups the incoming changes by minute: how many arrived ("Ticker received") and which ones. It keeps the last 25 minutes that had data.

## Alert Engine {#alert-engine}

An alert is a set of conditions. Every time a change arrives for a material and exchange, PRUNplanner checks each active alert against the new values and the previous values of that same material and exchange. When the conditions match, the alert adds a row to the feed.

Alerts are stored in this browser for your account only: "Alerts are currently stored on this device only and are not synced to your account." Another browser or device starts without them.

### Setup {#setup}

A condition has three parts: a field, an operator and a target, for example **Price** GT **Value** 100.

#### Fields {#fields}

| Field | Meaning |
| --- | --- |
| **Ticker**, **Exchange Code** | the material ticker, the exchange code (text) |
| **Price**, **Bid**, **Ask** | price, bid and ask as in the overview |
| **Price Change**, **Bid Change**, **Ask Change** | new value − previous value |
| **Price Change (Percent)** | Price Change ÷ previous price × 100 |
| **Demand**, **Supply** | demand and supply as the change reports them |
| **Traded**, **Volume** | traded figures as the change reports them |
| **Buy Volume**, **Sell Volume** | units in all open buy or sell orders |
| **Buy Volume Change (Abs.)**, **Sell Volume Change (Abs.)** | how much that volume changed, without sign |
| **Buy VWAP**, **Sell VWAP** | unit-weighted average price of the open buy or sell orders |
| **Best Bid Price**, **Best Ask Price** | highest buy order, lowest sell order in the book |
| **Spread**, **Spread (Percent)** | ask − bid, and that as a percentage of the ask |

The change fields need a previous value, so they are empty on the first change of a material and exchange.

#### Comparisons {#comparisons}

Number fields offer:

- GT: greater than
- LT: less than
- EQ: equal
- NEQ: not equal

**Ticker** and **Exchange Code** only offer MATCHES: equal, ignoring upper and lower case. Their target is always fixed text (shown as **Text**).

#### Comparison Targets {#comparison-targets}

| Target | Compares the field with | Good for |
| --- | --- | --- |
| **Value** | a fixed number (or text) you enter | price floors and ceilings, one material or exchange |
| **Previous** | the field's previous value for that material and exchange (**Previous Datapoint**) | any change at all, sudden jumps |
| **Offset %** | the previous value × (1 + offset ÷ 100) | moves of a given size |

**Previous** and **Offset %** never fire on the first change of a material and exchange, because there is nothing to compare with.

Example: **Price** GT **Offset %** 2 fires when the price rises more than 2 % from the last change. **Price** LT **Offset %** −2 fires on a drop of more than 2 %.

#### Logical Operators {#logical-operators}

Conditions sit in a group. **Match** sets how the group combines them:

- AND: every condition in the group must match.
- OR: one matching condition is enough.

A group can hold other groups (**Group**), so you can build e.g. (**Ticker** MATCHES RAT AND (**Price Change (Percent)** GT 2 OR **Price Change (Percent)** LT −2)). The conditions that made the alert fire are listed in the feed's **Trigger Logic** (for OR, the first one that matched).

An AND group without conditions counts as matched, so an active alert whose top group is still empty fires on every change.

### Setting up Alerts {#setting-up-alerts}

1. Press **Open Alert Manager**.
2. Press **Create New Alert**. A paused alert named **New Alert** with severity **LOW** and an empty AND group is added to the list right away.
3. Hover the alert and press **Edit**. **Edit Alert** opens.
4. Set **Alert Name** and **Severity** (**LOW**, **MEDIUM**, **HIGH**).
5. Under **Logic Configuration**, set **Match** and add conditions with **Condition** (a new one starts as **Demand** EQ **Value** 0) or nested groups with **Group**. **Remove** deletes a condition or a nested group (on the top group it has no effect); a group without conditions shows **Empty Group**.
6. Switch **Status** from **Paused** to **Active**.
7. Press **Save**, or **Discard** to drop your changes.

> [!tip]
> Add at least one condition before you set an alert **Active**: an active alert with an empty group fills the feed with every change.

To change an alert later, hover it and press **Edit**; **Delete** removes it at once. The list shows each alert's name and whether it is **Active** or **Paused**. **Close Alert Manager** hides the list again.
