**Layout**

The plan page is a grid of parts: Base's empire and prices, planet, workforce, infrastructure and experts; Production with the tools (Construction, Supply, Visits, Repair, Profit, Plan check, POPR) as its tabs; Material I/O and its totals; and the five results (profit per day, payback, workforce, area with profit per area, storage). Each part uses the room it gets: wider, it shows more side by side instead of growing taller (experts two or three per line, workforce tiers next to each other). The layout is the same for all your plans.

- **Layout menu** (in the header): **Standard** (results on top, Base on the left, Production with its tools, Material I/O on the right). Once you saved one, **Custom Layout** is there too; there is one, used for all your plans. Standard never changes; customising it starts from a copy.
- **Customise**: pick "Customise, starting from …". The page shows its real content, not clickable, with a grip (⋮⋮) on each part's title bar, its size and its ⋯ menu; results tiles get a title bar too.
  - **Moving**: drag a title bar; a dashed box shows where it lands. Its top lines up with a part beside it (a yellow line says which). Drop it on another part's title bar to make it a tab there, below or beside the part shown there (the title bar splits into Tab, Below and Beside before you let go), or into the band at the top to pin it there.
  - **Sizing**: drag the left or right edge (width in columns), the bottom edge (height) or the corner. Growing into a part beside it makes that part narrower, down to its minimum; there the edge stops and the badge says so. A badge shows the size; the bottom edge snaps to the bottom of a part beside it, to the height of another part and to its own content. Hold **Alt** to place freely. Parts never get smaller than they need (Production at least 540 px wide).
  - **Height**: _Fit content_ grows with the content; _Fit content, at most N px_ shrinks and scrolls inside; _Fixed N px_ keeps its height and scrolls. Dragging the bottom edge above the content makes it fixed, below it makes it "at most"; − and + in the menu's Height row (40 px) do the same.
  - **Pin to top** puts a part into the band at the top of the page, which stays there while you scroll the rest. When the band would cover more than 40 % of the window and the page below needs the room, it is cut there and scrolls inside. With nothing left on the page, it simply is the page.
  - **Follow while scrolling** keeps a part in view in its own columns: as you scroll past it, it moves down with you, together with the parts below it in those columns, until the first part below that is wider or the page ends. Material I/O beside a long Production list is the classic case; set it to _Fit content, at most N px_ so it fits the window.
  - **Tabs**: drag a part onto the left of another's title bar, or pick **Tab** under "Tab, below or beside …" in its ⋯ menu. Click a tab to see it; drag a tab off its title bar to take it out again (the first tab moves the whole group). The menu also takes a tab out or splits all of them.
  - **Two parts in one tab**: drop a part on the middle of another's title bar to show it below the part shown there, or on the right third to show it beside it (where the part is too narrow for both, it goes below), or pick **Below** or **Beside** in the menu. Any two parts can share a tab, two at most; the menu switches between below and beside or takes the second one out. Drag the line between them to size them: beside, the first part takes whole columns of the grid and the second the rest; below, the first part gets a height in px and scrolls inside when its content is taller. The menu does the same in steps (a column, 40 px), and **Auto** shares by their sizes again. Hiding the tab hides both.
  - **The ⋯ menu** of each part does everything a drag does: width, height, pin to top, follow, move, tabs and hide. Width (the right edge), height and move are rows of small buttons (− and +, the height modes, arrows); the menu stays open after one, so you can click again, and the row's heading names the button under the pointer. Under **Display** it picks, for Workforce, cards or a table with a row per tier (a narrow part scrolls the table sideways), and for Workforce, Experts and Infrastructure **Everything open**: every tier, expert field and habitation button, also on the page. What is set shows as small icons after a part's size: pinned, follows, everything open, table. When something isn't possible it says why. On a title bar the arrow keys move a part, **Shift**+arrows resize it and **Enter** opens the menu.
  - **Hiding**: the eye on a part's title bar hides it (of a group, the tab on view), or drop a part on Elements (a whole group with its tabs). Production always stays. The parts below move up and slide into place; Undo brings it back.
  - **Elements** (beside the page) lists every part and where it is; add a hidden one at the bottom, drag any one onto the page (a placed one moves there, a tab leaves its group), or **Show** one (switches to its tab and highlights it).
  - **Wide and Phone**: Custom Layout has two arrangements, picked at the top while customising. **Wide** is used on tablets and wider screens; **Phone** on a phone, edited at a phone's width in two columns. Each has its own parts, places, sizes and folds. Until you change something in Phone it is automatic: Wide as a phone shows it, every part stacked in order, small ones two per row. Your first change there starts from that; **Back to automatic** follows Wide again.
  - **Columns** (4–24, Wide only) and **gap**. A note says how many parts narrower screens rearrange to keep their minimum width.
  - **Tinted parts** gives every part a slightly lighter background, for more contrast, in either layout and on every screen. It is kept as soon as you tick it.
  - **Elements · N**: N parts are not placed in the arrangement shown.
  - **Undo** (button, Ctrl/⌘+Z, or the message after hiding a part or changing its tabs), **Reset to Standard** (Wide as Standard, Phone automatic), **Cancel** (asks when there are changes) and **Save** (both arrangements). Saving Standard's copy over your Custom Layout asks first.
  - **New parts**: when PRUNplanner gets a new part, it joins your Custom Layout once, at the bottom of both arrangements, marked **New** for that visit; a message says so. Move or hide it like any other.
- **Folding**: the chevron on a part's title bar folds it to its title. Two or more folded parts side by side with open ones stack into a short column, and the open parts in that row take their room. Folded parts stay folded, whichever layout you use; Wide and Phone keep their own folds. A results tile or a "Plan check →" link opens and unfolds the part it points to; a hidden one opens in a dialog.
- **Smaller screens**: when a part would be narrower than it needs, the parts are rearranged at that width (marked "auto" while customising); your layout stays as it is. On a phone Custom Layout uses its Phone arrangement (automatic: every part stacked in order, small ones two per row); layouts can be switched there, customising is for wider screens. Recipes are picked in a sheet from the bottom, and the save status with Save sits above the navigation bar.
- For now the layout, Tinted parts and what is folded are kept for this browser tab: they survive a reload and are gone in a new tab.

**Results**

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

Name your plan with the pencil next to its name and save it with Save / Create or Ctrl+S (Cmd+S on a Mac). Undo, Redo, the plan's state and Save sit together in one control: when it was saved, unsaved changes, "Saving…", or a failed save with a retry. Your changes are kept until it succeeds.

Unsaved changes of a saved plan are kept as a draft a few seconds after each change, so they survive a reload or a closed tab: when you open the plan again they are back, and the notice offers to discard them. Opening the plan again always shows it as saved; a notice offers to restore the draft, and your next change replaces it. The Reload saved version button next to Save goes back to the saved plan at any time and drops the draft, after asking if you have unsaved changes. "Draft not saved" means they aren't kept yet (click it to try again); the page then warns before you leave. If another tab or device saved a draft of the same plan, nothing is replaced until you choose which one to keep.

Every change can be undone with the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on a Mac). The history covers the last 50 changes and starts fresh after saving the plan or discarding the changes.

**Versions**

Every save keeps a version of the plan. Click the save state to see them. To name a version, open the arrow next to Save (or press Ctrl+Alt+S, Cmd+Option+S on a Mac), type a name and press Enter; the ⋯ menu of a version in the list names or renames it later. Named versions stay, the last 10 unnamed ones are kept. The same menu has Save as copy and Discard changes.

The eye in the list shows an older version read-only, with its numbers in the results bar. From there, Compare with current lists what differs, Restore loads it as unsaved changes (Undo takes it back, saving makes it the active version), Open as new plan copies it into a new plan, and Back to current returns to your plan as it was.

Make active, in the ⋯ menu or next to Restore, switches the plan to that version in one step: your empires and the plan's share link use it right away. It is added as a new version on top ("Restored from …"), the one you picked stays where it is. Unsaved changes are discarded after you confirm. Delete in the same menu removes a version for good, after you confirm; the active version can't be deleted.

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
