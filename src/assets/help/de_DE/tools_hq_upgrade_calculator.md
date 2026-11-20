Mit dem Firmensitz-Kalkulator planst du ein Upgrade deiner [[hq-level|HQ-Stufe]]. Er listet die Materialien, die du brauchst, um dein Firmenhauptquartier von einer Stufe auf eine andere zu heben, was du schon hast und was der Rest kostet, sodass du genau das kaufen oder verschiffen kannst, was fehlt.

Im Spiel bringt dir jedes Upgrade der HQ-Stufe eine weitere Basis-[[area-permits|Genehmigung]]. Nutze den Kalkulator, wenn du dich auf ein Upgrade vorbereitest, oder um zu sehen, was mehrere Upgrades hintereinander brauchen.

## Die Stufen wählen {#levels}

| Einstellung            | Was sie macht                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Von Level**          | deine aktuelle Stufe, 1 bis 50 (Standard 1)                                                                                                           |
| **Zu Level**           | die Stufe, die du erreichen willst. Sie bietet nur Stufen ab **Von Level** aufwärts an (Standard 3)                                   |
| **CX-Präferenz**       | die [[exchange-preference\|Marktplatz-Präferenz]] für die Preise |
| **Standorte anzeigen** | zeigt die Spalte **Lager Standorte** (standardmäßig an)                                                                                               |

Der Kalkulator addiert die Materialien jedes Upgrades von der Stufe nach **Von Level** bis **Zu Level**, so kannst du mehrere Upgrades auf einmal planen. Mit Von 1 und Zu 3 zeigt er die Upgrades auf Stufe 2 und Stufe 3. Stufe 2 braucht zum Beispiel 6 BBH und Stufe 3 braucht 16, **Anzahl** zeigt also 22 BBH. Sind **Von Level** und **Zu Level** gleich, gibt es kein Upgrade zu addieren, und die Tabelle bleibt leer.

Die Materialien pro Stufe stammen aus einer in PRUNplanner eingebauten Tabelle, die die Stufen 1 bis 50 abdeckt.

Setzt du **Von Level** über **Zu Level**, behält die Tabelle das vorherige Ergebnis. Um neu zu rechnen, wähle ein **Zu Level** gleich oder über dem neuen **Von Level**.

> [!warning]
> Wählst du hier eine Marktplatz-Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz, und andere Seiten, die deinem Standard folgen, wechseln mit.

## Die Tabelle {#table}

Die Tabelle hat eine Zeile pro Material, von A bis Z nach Ticker. Klick auf einen Spaltenkopf, um danach zu sortieren. Das geht bei jeder Spalte außer **Bestand überschreiben** und **Lager Standorte**.

| Spalte                                      | Was sie zeigt                                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**                                | das Material. Klick darauf für seine Marktkarte                                                                                                                                         |
| **Anzahl**                                  | wie viele die Upgrades insgesamt brauchen                                                                                                                                                               |
| **Lager**                                   | wie viele du hast: deinen [[fio\|FIO]]-Bestand oder deinen überschriebenen Wert |
| **Bestand überschreiben**                   | deine eigene Bestandszahl für dieses Material                                                                                                                                                           |
| **Benötigt**                                | was du noch brauchst: max(Anzahl − Lager, 0)                                                                                                                         |
| **Kosten / Einheit (ȼ)** | der Kaufpreis nach deiner Marktplatz-Präferenz                                                                                                                                                          |
| **Gesamtkosten (ȼ)**     | Benötigt × Kosten / Einheit                                                                                                                                                                             |
| **Lager Standorte**                         | wo FIO das Material gefunden hat, z. B. `120x @ <name> (WAR)`. Der Typ ist PLANET, WAR oder SHIP                                                        |

Die Preise hängen von keinem Planeten ab, Planeten-Ausnahmen in deiner Marktplatz-Präferenz gelten hier also nicht.

## Dein Bestand {#stock}

Mit verbundenem FIO ist **Lager** die Summe des Materials in allen deinen Basen, Lagerhäusern und Schiffen, die FIO meldet. Ohne FIO ist es 0. Keine Sorge, wenn dann jedes Material seine volle **Anzahl** als **Benötigt** zeigt: Das heißt nur, dass PRUNplanner deinen Bestand nicht kennt. Verbinde FIO in deinem [Profil](/help/profile) oder trag deinen Bestand unter **Bestand überschreiben** ein.

FIO zählt das Material, wo immer es ist, in einer Basis, einem Lagerhaus oder auf einem Schiff, und **Lager Standorte** sagt dir, wo es liegt.

Ein Beispiel: Mit den 22 BBH von oben und 10 im Lager ist **Benötigt** 22 − 10 = 12, und bei ausgedachten 100 ȼ pro Einheit ist **Gesamtkosten (ȼ)** 1.200 ȼ. Mit 30 im Lager ist **Benötigt** 0, nie weniger.

Um die FIO-Zahl für ein Material zu ersetzen, gib eine Zahl unter **Bestand überschreiben** ein, zum Beispiel für Bestand, der schon unterwegs ist. 0 zählt als 0. Leere das Feld, um wieder die FIO-Zahl zu nutzen. Tabelle und Summen aktualisieren sich, sobald du einen Wert überschreibst. Überschriebene Werte gelten, bis du die Seite verlässt.

## Summen {#totals}

Über der Tabelle:

- **Gesamt Kosten**: die Summe von **Gesamtkosten (ȼ)**.
- **Gesamt Gewicht** in t und **Gesamt Volumen** in m³ von allem **Benötigt**, damit du prüfen kannst, ob es auf dein Schiff passt.

Alle drei zählen nur, was du noch brauchst, sie lassen also Bestand weg, den du schon hast.

## XIT {#xit}

Der XIT-Button öffnet die Schublade XIT-Aktion mit einem Transfer für jedes Material, dessen **Benötigt** über 0 liegt. Stell die **Herkunft** ein (das Stationslager, aus dem es kommt) und **Von CX Kaufen**. Kopiere dann mit **Kopieren** das **JSON** und führe es mit [[xit|XIT]] in Refined PrUn aus. PRUNplanner speichert **Herkunft** und **Von CX Kaufen** in deinen Einstellungen und teilt sie mit den anderen XIT-Buttons, z. B. in [FIO Verbrauch](/help/fio_burn).
