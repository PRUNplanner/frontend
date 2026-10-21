**Übersicht**

Die Übersicht ist das Herzstück der Plananalyse.  It provides the daily cost of inputs and workforce consumables, as well as the daily production building degradation.  Die anfänglichen Baukosten des Plans (einschließlich CM) sind enthalten und werden später zur Berechnung des ROI (Amortisationszeit) der Basis verwendet.  Der tägliche Profit ergibt sich, indem die täglichen Kosten vom Wert des täglichen Outputs abgezogen werden.  Schließlich ist der Profit pro Fläche der tägliche Profit der Basis geteilt durch die genutzte Fläche der Basis; wichtig ist, dass dabei die tatsächliche Basis als Nenner dient, während der Profit pro Fläche der Gebäude-Aufträge (mehr dazu unten) zu Vergleichszwecken einen standardisierten Nenner verwendet.

- Die Berechnungen der Übersicht enthalten die Kosten für den Bau des Kernmoduls

**Produktionsgebäude**

Jedes Gebäude, das du zum Plan hinzufügst, erscheint in diesem Abschnitt.  Users should add a recipe using the +RECIPE button on the top right.  Sobald er ausgewählt ist, wirkt sich der Auftrag auf den gesamten Plan aus und fließt oben in die Übersicht und rechts in das Material I/O ein.

Wenn du einen Auftrag auswählst, erscheint eine Dropdown-Liste mit den Aufträgen dieses Gebäudes.  For each recipe, the inputs, duration, and output are given.  Der Profit pro Tag (ȼ / Tag), der Profit pro Fläche (ȼ / Fläche) und der ROI (Amortisationszeit) für die Baukosten des Gebäudes werden ebenfalls automatisch berechnet und angezeigt.

- Der Profit pro Tag ist der Nettoprofit aus dem Verkauf des Outputs zur CX-Einstellung des Plans abzüglich der Kosten für Inputs, Belegschaft und Abschreibung. Die Belegschaftskosten richten sich nach den Wohngebäuden und Luxusgütern des Plans: Arbeiter ohne Unterkunft und ausgeschaltete Luxusgüter kosten nichts.
- Der Profit pro Fläche ist dieser Profit pro Tag geteilt durch die Fläche des Produktionsgebäudes plus einen anteiligen Teil der benötigten HABs und STOs aus dem „optimalen“ Layout des Gebäudes (wird im Werkzeug Rezept-ROI verwendet).  So lässt sich die Profitabilität von Aufträgen über verschiedene Gebäude hinweg einheitlich vergleichen.
- Der ROI sind die Baukosten dieses Produktionsgebäudes geteilt durch den Profit pro Tag des Gebäudes.

**Speichern und Widerrufen**

Gib deinem Plan in der Konfiguration einen Namen und speichere ihn mit Speichern / Erstellen oder Strg+S (Cmd+S auf dem Mac). Der Speichern-Button zeigt den Status des Plans: „Gespeichert“, wenn es nichts zu speichern gibt (fahre mit der Maus darüber, um zu sehen, wann zuletzt gespeichert wurde), ein Punkt bei nicht gespeicherten Änderungen, „Speichern…“ während des Speicherns und „Speichern wiederholen“, wenn das Speichern fehlschlägt. Your changes are kept until it succeeds.

Jede Änderung kannst du mit den Buttons Widerrufen und Wiederherstellen neben Speichern rückgängig machen, oder mit Strg+Z und Strg+Umschalt+Z (Cmd auf dem Mac). Wenn du ein Gebäude oder einen Auftrag entfernst oder einen Auftrag änderst, erscheint außerdem für ein paar Sekunden eine Meldung mit einem Widerrufen-Button. Der Verlauf umfasst die letzten 50 Änderungen und beginnt nach dem Speichern oder Neuladen des Plans von vorn.

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

**Was das CX-Volumen nicht erfasst**

Das Volumen stammt nur von den Handelskammern (CX). Verkäufe auf lokalen Märkten, Verträge zwischen Spielern und Handel innerhalb einer Corporation werden nicht gezählt, daher kann sich ein Material leichter verkaufen lassen, als sein CX-Volumen vermuten lässt.

**Imperium**

Das Material I/O des Imperiums prüft den Nettofluss des Imperiums: Was ein Plan herstellt und ein anderer verbraucht, gleicht sich aus, und nur der Rest erreicht den Markt. Klicke auf einen Markierungs-Chip über der Tabelle, um nur diese Materialien anzuzeigen.

**Zielpreis**

In der Preissensitivität findet der Zielpreis den Preis eines Materials, der deinen gewünschten Profit ergibt, während alle anderen Preise unverändert bleiben. Außerdem zeigt er den niedrigsten und höchsten Preis des Marktplatzes in den letzten 30 Tagen.

**Amortisation der Differenz**

In Pläne vergleichen: die zusätzlichen Baukosten des anderen Plans geteilt durch seinen zusätzlichen Profit pro Tag, in Tagen. „nie“ bedeutet, dass er mehr kostet und nicht mehr einbringt.
