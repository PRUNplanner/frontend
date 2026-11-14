PRUNplanner plans your bases. You build and run them in the game. This guide covers the hand-over, and by the end you'll have:

- FIO connected, so PRUNplanner sees your bases and stores,
- the materials to build a base and its first supply, as [[xit|XIT]] packages that do the shopping and shipping for you,
- FIO Burn and FIO Repair set up to keep running bases supplied and repaired.

It's for players about to build a planned base. It takes about 15 minutes, plus a one-time FIO setup. The pages linked at the end of each step go deeper.

## 1. Connect FIO {#step-1}

[[FIO]] is a free community browser extension that reads your game data. With it, PRUNplanner knows what stands on your planets and what's in your stores.

1. Install the FIO extension and register your FIO account from the game's extensions button.
2. On the FIO website, create an API key for PRUNplanner.
3. In your [Profile](/profile), under **FIO connection**, enter the **FIO API Key** and your **PrUn Username** and press **Save**.

Once it works, the FIO icon at the bottom of the side menu gets a green dot. Hover it to see **FIO Active** and when FIO last updated. **FIO Burn** and **FIO Repair** now appear under Tools. While you use PRUNplanner, your FIO data is at most about 30 to 45 minutes old.

More: [FIO connection](/help/profile#fio-connection).

## 2. Buy and ship the construction materials {#step-2}

Open the plan of the base (from the side menu or the plan list on [Empire](/empire)) and go to its **Construction** tab, the [[construction-cart|construction cart]].

- **Built** starts at what FIO sees on the planet, and **Amount** is what's left to build.
- **Materials to buy** takes off the stock of the storage you pick under **Storage**, so **Need** is what you still have to get. As an example, with an **Amount** of 120 BSE and 40 in storage, **Need** is 80. With 150 in storage it's 0, never below.
- A warning next to **Amount** tells you when the buildings would need more workers than their habitations house.

The XIT button next to **Storage** ships only **Need**. The one at the top of the tool ships everything and ignores stock.

Read more: [Construction](/help/plan_tools#construction).

## 3. Plan the first supply {#step-3}

Open the **Supply** tab, the [[supply-cart|supply cart]]. It lists the workforce consumables and production inputs the base needs for **Stock Duration (days)** (20 by default), minus what's in stock.

> [!tip]
> For the very first flight, use **XIT Initial**. The plain XIT button nets out what the base makes itself, so a base that makes its own DW or RAT would arrive without any before production starts.

More: [Supply](/help/plan_tools#supply), [XIT and XIT Initial](/help/plan_tools#supply-xit).

## 4. Run the XIT package in the game {#step-4}

Every XIT button opens a drawer with a package for [Refined PrUn](https://github.com/refined-prun/refined-prun), the browser extension for the game.

1. Pick **Origin**: a station warehouse, or **Configure on Execution** to choose when you run it.
2. Leave **Buy From CX** on to buy the materials on that station's exchange first. It needs a warehouse origin.
3. **Copy** the JSON.
4. In the game, Refined PrUn runs it with its XIT ACT command. You pick the destination when it runs.

PRUNplanner saves **Origin** and **Buy From CX** with your preferences, and every XIT button shares them.

Details: [XIT actions](/help/plan_tools#xit).

## 5. Keep your bases supplied with FIO Burn {#step-5}

Open [FIO Burn](/fio/burn) and pick the empire. For each plan, it divides the stock of your base store on that planet by the plan's net daily use and shows how many days each material lasts.

- Red and yellow mark materials at or below your thresholds (5 and 10 days by default). As an example, 160 RAT in store and a net use of 20 a day last 160 ÷ 20 = 8 days. That's at or below 10 but above 5, so it shows yellow.
- The XIT button on a plan opens its XIT resupply. Set **Target Days** or let **Fit Ship** pick the most days that fit a ship size, then **Copy XIT JSON**.

> [!warning]
> FIO Burn counts from your plan, not from what really runs in the game. Keep one plan per planet in the empire and keep the plan in step with your base, or the days are off.

More: [FIO Burn](/help/fio_burn), [XIT Resupply](/help/fio_burn#xit-resupply).

## 6. Plan repairs with FIO Repair {#step-6}

Buildings wear, and the [[repair]] bill grows the longer you wait. A plan's **Repair** tab finds the best interval for each building type.

Open [FIO Repair](/fio/repair). It matches your plans to your real bases and shows which bases are overdue, due soon or due later.

1. Open a base. Check that **Repair target** names the plan you run there.
2. Under **Repair flight**, set **Arrives in** to the days your ship needs.
3. **XIT Repair** builds the package with the repair materials.
4. Fly to the base, unload and run BRA in the game to repair all its buildings.

Read more: [FIO Repair](/help/fio_repair#repair-flight), [Repair](/help/plan_tools#repair).

## 7. Where the game takes over {#step-7}

PRUNplanner's job is the plan: what to build, where, at what price, and what it pays back. It ends in an export you run in the game. Running your bases day to day happens in the game and its browser extensions, Refined PrUn and its OOG fork, which work inside the game with your live data.

- Changed your base in the game? Change the plan too. FIO Burn and FIO Repair count from your plans, so a plan that differs from your base gives different days and due dates.
- Planning an expansion? Go back to the plan, a copy of it or a new plan, and compare before you build.
- Want your numbers in a spreadsheet? An [API key](/help/api_keys) lets a Google Sheet read your empire's Material I/O.

More: [Your first base](/help/guide_first_base), [Grow to an empire](/help/guide_empire).

## Next {#next}

- [Grow to an empire](/help/guide_empire): check all your bases together before you add the next one.
- [Glossary](/help/glossary): the game and planning terms in one place.
