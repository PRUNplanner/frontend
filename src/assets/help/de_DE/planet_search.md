**Planetensuche** findet einen Planeten, den du schon kennst, oder Orte für neue Produktion. Jede Änderung an einem Filter aktualisiert die Ergebnisse sofort.

## Name or ID {#name-or-id}

Type part of a planet's name or natural ID (e.g. "OT-580" or "Montem") in the box at the top. A name search shows every planet that matches it, even when the filters set in the panel would hide some: a note above the results says the filters are paused. _Apply filters_ combines the name with them again; the note then says how many matching planets the filters hide and offers up to three changes that would show more of them, each with the number of planets it adds. _Show all_ pauses the filters again. Your filters are kept either way; once the name is cleared, the next search starts with them paused again.

## Materials {#materials}

Each group matches _any of_ or _all of_ its materials, and the groups combine with _all groups_ or _any group_. Damit lassen sich Suchen wie „(FEO und H2O) oder (MAG und O)“ abbilden. Für jedes Material kannst du eine minimale tägliche Extraktion in Einheiten pro Tag festlegen.

## Planet conditions {#planet-conditions}

Pick Rocky and/or Gaseous planets, and whether they must be fertile. Eine neue Suche beginnt nur mit erdähnlichen Planeten. Schwerkraft, Druck und Temperatur spielen nur über die zusätzlichen Baumaterialien eine Rolle, die sie erfordern (MGC, BL, SEA, HSE, INS, TSH). Hake die an, die du anliefern willst; Planeten, die ein anderes davon benötigen, werden ausgeblendet, sodass du ohne Haken nur Planeten siehst, die kein zusätzliches Material brauchen.

## COGC and infrastructure {#cogc-and-infrastructure}

_Active COGC program_ keeps planets running one of the ticked programs right now. _Infrastruktur_ ist ein separater und strengerer Filter: Ein Planet muss jedes angehakte Gebäude haben (LM Lokaler Marktplatz, COGC Globale Handelskammer, WAR Lagerhaus, ADM Planetare Verwaltung, SHY Schiffswerft).

## Counts and Any {#counts-and-any}

The number next to an option that isn't ticked is how many planets you would get by ticking it. Der Button _Jede_ in der Kopfzeile von Planetenbedingungen, Zusätzliche Baumaterialien akzeptieren, Aktives COGC-Programm und Infrastruktur setzt diesen Abschnitt auf den Zustand, der die wenigsten Planeten ausblendet, und zeigt, wie viele Planeten das ergibt: beide Oberflächen und keine Anforderung an die Fruchtbarkeit, alle zusätzlichen Baumaterialien akzeptiert, kein COGC-Programm angehakt, keine Infrastruktur angehakt. It is highlighted and can no longer be clicked when the section is already there.

## Distance {#distance}

Pick exchanges and/or plans from one of your empires. Ein Planet muss innerhalb der maximalen Sprünge jeder Auswahl liegen, und jeder gewählte Plan bekommt eine eigene Sprung-Spalte. AI1, CI1, IC1 und NC1 sind immer sortierbare Spalten. Planet Search works without an account; distances to your own plans need a login.

## Active filters and Reset {#active-filters-and-reset}

Every active filter shows as a chip above the results; × on a chip removes just that filter. _Zurücksetzen_ oben rechts stellt die Startfilter und die Standardsortierung wieder her. Wenn kein Planet passt, erscheinen bis zu drei Vorschläge, jeweils mit der Zahl der Planeten, die er ergeben würde.

## Filter panel {#filter-panel}

On larger screens the double arrow at the top of the panel collapses it to a narrow rail, and expands it again. Auf kleinen Bildschirmen öffnen sich die Filter mit dem Button _Filter_ in einem ausklappbaren Seitenbereich; _n Planeten anzeigen_ an seinem unteren Ende schließt ihn.

## List and Matrix {#list-and-matrix}

The List shows the searched materials as tiles next to the other resources. Die Matrix gibt jedem in den Ergebnissen gefundenen Material eine eigene Spalte, gesuchte zuerst, mit stärkerer Schattierung für höhere tägliche Extraktion.

## Chart {#chart}

The Chart plots every result by distance and output: across, the jumps to your _Distance_ picks (the farthest one when you picked several), or to the nearest exchange without a pick; up, the daily extraction of a searched material you choose (fertility when you search no material). Bigger dots are more fertile. Die Planeten mit dem **besten Kompromiss** sind die, die kein anderes Ergebnis in beidem schlägt: keiner ist näher _und_ reicher. They are highlighted, joined by a dashed line, and everything below and right of that line is beaten by one of them. _Colour by COGC_ colours the dots by their active COGC program instead. Hover a dot for its details, click it to pin it for Compare, and double-click it to create a plan. Die Liste neben dem Chart ordnet dieselben Planeten nach Output. Up to 300 results are plotted, the first ones by the current sort.

## Reading the results {#reading-the-results}

The colour bar on a material tile compares the planet's daily extraction with the highest of that material on any planet: red is below a quarter, then orange, yellow, and green above three quarters. Die Spalte mit dem Bau-Symbol listet die zusätzlichen Baumaterialien auf, die ein Planet benötigt; fahre mit der Maus über eines, um den Grund zu sehen (etwa „Niedrige Schwerkraft“). _COGC · Infra_ zeigt das laufende COGC-Programm und die Infrastruktur des Planeten als LM, COGC, WAR, ADM und SHY. A "—" in a jumps column means there is no jump route: hover it to read "Colony Ship Required".

## Plots {#plots}

Every base takes one plot of its planet, and so do HQs and planetary projects (COGC, warehouse, local market and the others). A planet that can't be settled anymore, with every plot taken and no ghost sites, carries a red ⊘ icon next to its name; hover it for the details. The _Plots_ column, which you turn on in the _Columns_ menu, shows the free plots out of the planet's total, as FIO last saw the planet (hover for the date), and marks such a planet red _Full_. Some planets allow **ghost sites**: once every plot is taken, new bases still fit without one, so a full planet that allows them shows an amber _Full · ghost sites_. Full planets keep their place in the results. _plots unknown_ means PRUNplanner hasn't read the planet's plots yet. Sort by the column to see the planets with the most free plots first.

## Sorting {#sorting}

Click a column header to sort by it, click again to reverse. Mit Shift+Klick auf eine weitere Überschrift fügst du sie als Tiebreaker hinzu (die Überschriften zeigen 1, 2, 3), bis zu vier Spalten: „NC1-Sprünge, dann FEO /Tag“ listet die reichsten FEO-Planeten in jeder Entfernung. Das Menü _Sortieren_ macht dasselbe ohne Tastatur. Ohne eigene Sortierung werden die Ergebnisse nach dem ersten gesuchten Material (höchstes zuerst) geordnet, sonst nach den Sprüngen zur ersten Entfernungsauswahl, sonst nach Name.

## Columns {#columns}

The _Columns_ menu hides and shows columns. In der Matrix listet es außerdem jedes gefundene Material mit _Alle_ und _Keine_ auf, um sie auf einmal ein- oder auszublenden. _Reset_ goes back to the default columns.

## Compare {#compare}

On larger screens, pin up to four planets with ☆ to compare them side by side in the tray at the bottom. Fruchtbarkeit, die gesuchten Materialien und die Sprünge zu deinen Entfernungsauswahlen sind vom besten zum schlechtesten Wert eingefärbt, der beste Wert ist fett. Zeilen, in denen sich die Planeten in etwas anderem unterscheiden, sind blau eingefärbt.

## Saving and sharing {#saving-and-sharing}

The address bar always holds the whole search, so _Copy link_ shares it. „+“ öffnet einen neuen Plan für diesen Planeten in einem neuen Tab, damit deine Suche erhalten bleibt. Without an account, "+" asks you to log in first and then opens the plan. _Suche speichern_ speichert benannte Suchen in diesem Browser; _Verwalten_ benennt sie um, lädt oder löscht sie.
