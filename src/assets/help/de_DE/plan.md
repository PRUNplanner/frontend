**Layout**

The plan view reads from left to right: **Base** (set up), **Production** (build) and **Material I/O** (result). The results bar above them stays in view and shows profit per day, payback, profit per area, area and storage.

- **Base** holds the empire and prices, the planet (COGC program, permits, Corp HQ, planet resources), workforce with its luxuries, housing and experts. Each section folds; its summary line shows the setting at a glance.
- **Tools** (Construction, Supply, Visits, Repair, Profit, Plan check, POPR) open in place of the production list. While a tool is open, Base folds to a strip at the left, and for Repair, Profit and Plan check Material I/O folds too. Click a strip to show the pane again; it stays open until you fold it.
- On narrower screens (below 1360 px with the collapsed sidebar, 1544 px with the full one) Base opens from the "Base" button next to the tabs; on a tablet Material I/O opens from its button at the end of the tabs too. On a phone the tabs under the results switch between Production, Base, Material I/O and Tools, recipes are picked in a sheet from the bottom, and Save sits above the navigation bar while there is something to save.

**Results bar**

- **Profit / day**: the value of the plan's output minus inputs, workforce consumables and building degradation, with revenue and cost below it. Construction includes the core module.
- **Payback**: the build cost of the plan divided by its profit per day.
- **Profit / area**: profit per day divided by the area the base uses. It uses the actual base as the denominator, while ȼ / area of a recipe uses a standardized one for comparison. When the empire page has calculated your empire, its average is shown below.
- **Storage**: days until the base storage is full, from what the base exports per day.

**Production**

Each building has one row: count, efficiency, ȼ per day and area. Click the name to fold its orders. Its orders are listed below it: the amount, the recipe, its runtime, its share of the building's time, its part of the building's ȼ per day (the orders add up to the building), COGM and delete. Deleting asks nothing; Ctrl+Z or the Undo message takes it back.

**Changing a recipe**

Click a recipe to open the picker under it, or "+ Recipe" to add one as a new order. Click a row or press Enter to pick it, ↑ and ↓ move through the list, Esc closes it. A line under the row says what changed, with Undo.

- **ȼ / day** is the net profit of one building running only this recipe: the output sold at the plan's CX setting minus inputs, workforce and depreciation. Die Belegschaftskosten richten sich nach den Wohngebäuden und Luxusgütern des Plans: Arbeiter ohne Unterkunft und ausgeschaltete Luxusgüter kosten nichts. "vs now" compares it with the recipe it would replace.
- **ȼ / area** is that profit divided by the area of the building plus a proportionate share of the HABs and STOs of its "optimal" layout (as in the Recipe ROI tool), so recipes compare across buildings.
- **Payback** is the building's construction cost divided by its profit per day.
- **Plans here** is the share of plans on the planet with this building that run the recipe.
- A dot after each input says whether the plan makes it (made here) or buys it (bought). When the plan uses what the recipe you replace makes, a note says how much of it you'd have to buy instead.

**Speichern und Widerrufen**

Name your plan with the pencil next to its name and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). The text next to Save shows the plan's state: when it was saved, unsaved changes, "Saving…", or a failed save with a retry. Your changes are kept until it succeeds.

Every change can be undone with the Undo and Redo buttons next to the name, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). Der Verlauf umfasst die letzten 50 Änderungen und beginnt nach dem Speichern oder Neuladen des Plans von vorn.

**Plan-Check**

Der Plan-Check prüft einen Plan gegen den Markt. Er hat drei Ansichten: Markt-Check (Standard), Preissensitivität und Pläne vergleichen.

**Markt-Check**

Der Profit eines Plans setzt voraus, dass jedes Material in beliebiger Menge zu seinem Preis gekauft und verkauft werden kann. Der Markt-Check zeigt, wo das nicht zutrifft.

- **Anteil am Tagesvolumen**: was der Plan pro Tag kauft oder verkauft, geteilt durch das durchschnittliche Tagesvolumen, das in den letzten 30 Tagen auf dem Marktplatz gehandelt wurde. Verkaufst du 50 Einheiten pro Tag in einen Markt, der 100 pro Tag handelt, ist das ein Anteil von 50 %.
- **Bid, Ask und Spread**: Das Bid ist der beste Preis, den ein Käufer gerade bietet, das Ask der beste Preis, den ein Verkäufer verlangt. Sofort kaufen heißt, das Ask zu zahlen, sofort verkaufen heißt, das Bid anzunehmen. Der Spread ist der Abstand zwischen beiden, in % des Ask.
- **Zu echten Preisen**: der Profit des Plans, wenn jedes Material auf seinem Marktplatz zum Ask gekauft und zum Bid verkauft wird. Ein Material ohne Ask oder Bid oder ohne Marktplatz in deiner CX-Präferenz behält seinen Planpreis.
- **Exchange**: the exchange of your CX preference. Ohne Präferenz nutzt der Check das Volumen aller Marktplätze zusammen.

**Was die Markierungen bedeuten**

- Rot, ein gefüllter Kreis: Der Plan kann dieses Material nicht wie geplant handeln.
  - _Kein Preis_: Der Plan hat keinen Preis dafür und rechnet es mit 0.
  - _Keine Transaktionen in 7 Tagen_: Niemand hat es in den letzten 7 Tagen auf dem Marktplatz gehandelt.
  - _Keine Angebote_ / _Keine Käufer_: Gerade verkauft es niemand auf dem Marktplatz (wenn du kaufst) bzw. bietet niemand darauf (wenn du verkaufst).
  - _Größer als der Markt_: Der Plan handelt 50 % oder mehr des Tagesvolumens.
- Orange, ein Dreieck: _Großer Marktanteil_, 10 % oder mehr des Tagesvolumens. Deine Orders werden den Preis wahrscheinlich bewegen.
- Grau, ein Ring: ein Hinweis. _Alle Marktplätze, keiner gewählt_ (keine CX-Präferenz, daher werden alle Marktplätze gezählt) oder _Daten älter als 2 Tage_.

Spreads werden angezeigt, aber nie markiert.

To watch the shares while you change counts and recipes, switch Material I/O to **%**: each material's Δ as a share of the average daily volume of the last 7 and 30 days, amber from 10 %, red from 50 %.

**Was das CX-Volumen nicht erfasst**

Das Volumen stammt nur von den Handelskammern (CX). Verkäufe auf lokalen Märkten, Verträge zwischen Spielern und Handel innerhalb einer Corporation werden nicht gezählt, daher kann sich ein Material leichter verkaufen lassen, als sein CX-Volumen vermuten lässt.

**Imperium**

Das Material I/O des Imperiums prüft den Nettofluss des Imperiums: Was ein Plan herstellt und ein anderer verbraucht, gleicht sich aus, und nur der Rest erreicht den Markt. Klicke auf einen Markierungs-Chip über der Tabelle, um nur diese Materialien anzuzeigen.

**Zielpreis**

In der Preissensitivität findet der Zielpreis den Preis eines Materials, der deinen gewünschten Profit ergibt, während alle anderen Preise unverändert bleiben. Außerdem zeigt er den niedrigsten und höchsten Preis des Marktplatzes in den letzten 30 Tagen.

**Amortisation der Differenz**

In Pläne vergleichen: die zusätzlichen Baukosten des anderen Plans geteilt durch seinen zusätzlichen Profit pro Tag, in Tagen. „nie“ bedeutet, dass er mehr kostet und nicht mehr einbringt.
