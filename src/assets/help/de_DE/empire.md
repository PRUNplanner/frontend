Auf der Seite [Imperium](/empire) prüfst du, ob deine Basen als Ganzes funktionieren, bevor du sie baust. Sie bringt alle Pläne eines [[empire|Imperiums]] zusammen und zeigt, was sie pro Tag einbringen und kosten, welche Materialien das Imperium herstellt und braucht, wie viel von einem Markt es beanspruchen würde und welche Aufträge das nutzen könnten, was übrig bleibt.

Ein Plan auf seiner eigenen Seite kennt nur seine eigene Basis. Hier wird, was eine Basis herstellt und eine andere verbraucht, nur einmal gezählt, du siehst also, was das Imperium als Ganzes kauft und verkauft.

## Erste Schritte {#getting-started}

Ein Imperium fasst deine Basis-[[plan|Pläne]] zusammen und enthält deine [[faction|Fraktion]] und deine [[area-permits|Genehmigungen]]. Jedes neue Konto hat eins, „My Empire“. Weitere erstellst du, löschst sie und weist Pläne zu in der [Verwaltung](/help/management).

- **Imperium wechseln** wählt das Imperium, das angezeigt wird. Das gewählte wird auch dein **Standard-Imperium** (siehe [Profil](/help/profile#preferences)), sodass die Seite beim nächsten Mal damit öffnet.
- Ein Imperium ohne Pläne zeigt drei Schritte zu deiner ersten Basis. Prüf Fraktion und Genehmigungen, finde einen Planeten in der [Planetensuche](/search) (ein Plan, den du dort erstellst, kommt in dieses Imperium) und leg deine Preise unter [Marktplätze](/exchanges) fest.
- Hast du gar kein Imperium, erstellt **Imperium erstellen** eins ohne Fraktion und mit 1 von 2 genutzten Genehmigungen.

Ein Fortschrittsbalken erscheint, während PRUNplanner die Pläne berechnet. Die Preise kommen aus der [[exchange-preference|Marktplatz-Präferenz]] des Imperiums, mit den Planetenregeln jedes Plans. Ein Imperium ohne Präferenz nutzt Universe · VWAP 30D. Details unter [Marktplätze & Preise](/help/exchanges).

## Übersichtszahlen {#overview-numbers}

Die Kacheln oben fassen das Imperium pro Tag zusammen:

| Kachel              | Wie sie berechnet wird                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Umsatz**          | Der Wert von allem, was das Imperium nach dem Verrechnen verkauft (siehe unten)                                                                                                                                                                                                                                                                                                                                       |
| **Kosten**          | Was das Imperium nach dem Verrechnen kauft, plus die [[degradation\|Abnutzung]] jedes Plans (Baukosten ÷ 180 pro Tag) und [[production-fees\|Produktionsgebühren]]; auch als % des Umsatzes angezeigt |
| **Profit**          | Umsatz − Kosten, mit der Marge in %                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Profit / Fläche** | Profit ÷ die Fläche, die alle Pläne nutzen                                                                                                                                                                                                                                                                                                                                                                                               |

_Verrechnen:_ Das Imperium ist keine einfache Summe seiner Pläne. Für jedes Material hebt sich zuerst auf, was ein Plan herstellt und ein anderer verbraucht. Nur der Rest wird verkauft oder gekauft, zum Durchschnitt der Preise der Pläne für dieses Material, gewichtet nach der Menge jedes Plans. Verbrauchsgüter der Belegschaft zählen hier als Materialien.

Ein Beispiel (ausgedachte Zahlen): Plan A stellt 100 Einheiten eines Materials pro Tag her, zu je 80 ȼ, und Plan B verbraucht 60 davon, zu je 100 ȼ. Das Imperium verkauft nur die übrigen 40, zu je (100 × 80 + 60 × 100) ÷ (100 + 60) = 14.000 ÷ 160 = 87,50 ȼ, sie bringen also 40 × 87,50 = 3.500 ȼ pro Tag zum **Umsatz**.

Der Balken darunter teilt den Umsatz in Produktions-Inputs, Belegschaft, Abnutzung, Produktionsgebühren und Profit auf, jeweils in % des Umsatzes. Macht das Imperium Verlust, zeigt der Balken die Teile stattdessen als Anteil an den Kosten, mit einem schraffierten Teil für die Kosten, die der Umsatz nicht deckt.

**Versand** zeigt die Tonnen und Kubikmeter pro Tag, die deine Pläne hereinholen (Import) und verschicken (Export), über die Pläne zusammengezählt.

## Planliste und Konfiguration {#plan-list}

Die Planliste zeigt jeden Plan des Imperiums mit seinen Planeten, [[cogc|COGC]], Genehmigungen und **Profit (ȼ)**. Klick auf einen Plan, um ihn zu öffnen. Die Fußzeile zählt die Genehmigungen zusammen, die deine Pläne nutzen. Auf breiten Bildschirmen klappt **Planliste ausblenden** die ganze linke Spalte weg: die Kacheln, die Planliste und die Konfiguration.

### Konfiguration {#configuration}

Das Feld **Konfiguration** enthält **Name**, **Fraktion**, **Genehmigungen gesamt** (mindestens 2) und **Genehmigungen benutzt** (mindestens 1) des Imperiums. **Speichern** speichert sie, und **Aktualisieren** verwirft deine Änderungen und lädt die gespeicherten Werte.

**Genehmigungen gesamt** ist, wie viele Basis-Genehmigungen deine Firma hat, und **Genehmigungen benutzt**, wie viele davon deine Basen belegen. Im Spiel gibt dir jedes Upgrade des [[hq-level|HQ-Levels]] eine Genehmigung mehr.

Fraktion und Genehmigungen ändern deine Produktion. Ein Gebäude, dessen Fachgebiet deine Fraktion fördert, bekommt einen Bonus von `1 + bonus × 2 × (3 − 2 × Permits Used ÷ Permits Total)`, weniger genutzte Genehmigungen bedeuten also einen größeren Bonus. Das [Glossar](/help/glossary#faction) erklärt Fraktionen.

Ein Beispiel (ausgedachte Zahlen): Mit einem Grundbonus von 0,05 und 2 von 4 genutzten Genehmigungen rechnet PRUNplanner 1 + 0,05 × 2 × (3 − 2 × 2 ÷ 4) = 1 + 0,05 × 2 × 2 = 1,20, also +20 %. Sind alle 4 genutzt, rechnet es 1 + 0,05 × 2 × 1 = 1,10, also +10 %. Die Seite berechnet jeden Plan mit den gespeicherten Werten, die Zahlen ändern sich also, sobald du auf **Speichern** klickst.

Wenn **Genehmigungen benutzt** von der Summe der Genehmigungen deiner Pläne abweicht, sagt dir eine Warnung das („Unstimmigkeit erkannt“). Das Feld vergleicht **Genehmigungen benutzt** mit der Summe in der Fußzeile der Planliste, in der jeder Plan die Genehmigungen zählt, die in seinem eigenen [Basis-Setup](/help/plan_base#permits) eingestellt sind, und es prüft beim Tippen erneut. Zum Beispiel ergeben drei Pläne mit 1, 1 und 2 Genehmigungen zusammen 4, bei **Genehmigungen benutzt** auf 3 lautet die Warnung also „Unstimmigkeit erkannt: 3 konfiguriert vs. 4 geplante Genehmigungen“.

Keine Sorge, die Warnung blockiert nichts: Du kannst trotzdem speichern, und deine Pläne werden weiter berechnet. Sie ist da, weil der Fraktionsbonus **Genehmigungen benutzt** nutzt, ein Wert, der nicht zu den Basen passt, die du betreiben wirst, ergibt also den falschen Bonus. Ändere **Genehmigungen benutzt** oder die Genehmigungen in deinen Plänen, bis beides übereinstimmt. Die richtigen Werte findest du im HQ-Buffer im Spiel. Der Schritt „Dein Imperium“ beim ersten Start zeigt die Warnung nicht.

Wurde das Imperium in der Zwischenzeit in einem anderen Tab oder auf einem anderen Gerät gespeichert, wählst du, ob du es überschreibst oder die gespeicherte Version neu lädst.

## Material I/O {#material-io}

**Material I/O** (eine der Ansichten der Seite) listet jedes Material des Imperiums mit diesen Spalten:

- **Delta**: hergestellt minus verbraucht pro Tag. Über null verkauft das Imperium den Rest, unter null kauft es, was fehlt.
- **Produktion** und **Verbrauch**.
- **ȼ Delta**: der Wert des Deltas pro Tag.
- **Produziert von** und **Verbraucht von**: welche Pläne am meisten davon herstellen und verbrauchen.

Klapp eine Zeile auf, um die Pläne dahinter zu sehen. **Detailansicht** wechselt zwischen Herstellern und Verbrauchern und **Netto pro Planet**, das Pläne auf demselben Planeten zu einem Überschuss oder einem Bedarf zusammenzählt.

Diese Filter teilt sie mit der Analyse:

- **Anzeige**: **Alle** oder **Ladeausgleich** für Materialien, die das Imperium sowohl herstellt als auch verbraucht.
- **Verbrauchsmaterialien**: Verbrauchsgüter der Belegschaft **Anzeigen** oder **Ausblenden**.
- **Planeten** (nur Material I/O): **Zusammenfassung** oder **Alle ausklappen** für alle Zeilen.
- **Materialien** und **Planeten**: nur die anzeigen, die du auswählst.

Fahr mit der Maus über einen beliebigen [[ticker|Ticker]] für seine Marktkarte (siehe [Marktplätze & Preise](/help/exchanges#market-card)).

Nach jeder Berechnung speichert PRUNplanner das Material I/O des Imperiums außerdem in deinem Konto. Diese Kopie liefert „Material-I/O des Imperiums“ in der API (siehe [API-Schlüssel](/help/api_keys#url-builder)).

### Markt-Check {#market-check}

Über der Tabelle prüft **Markt-Check für den Nettofluss des Imperiums**, was das Imperium als Ganzes verkauft oder kauft, gegen den Handel am Marktplatz. Hergestellte und verbrauchte Materialien werden zuerst verrechnet, sie werden also nur mit dem markiert, was den Markt erreicht. Der eigene [Plan-Check](/help/plan_check#market-check) jedes Plans markiert sie trotzdem.

| Chip                                                           | Markiert                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rot: „kann nicht wie geplant gehandelt werden“ | Kein Preis; kein Handel in 7 Tagen; keine Angebote (beim Kauf) oder keine Käufer (beim Verkauf); 50 % oder mehr des durchschnittlichen Tagesvolumens (30 Tage) des Marktplatzes |
| Bernstein: „großer Marktanteil“                | 10 % oder mehr des durchschnittlichen Tagesvolumens                                                                                                                                                                                      |
| Gedämpft: „andere Notizen“                     | Alle Marktplätze, kein Marktplatz gesetzt; Daten älter als 2 Tage                                                                                                                                                                        |

Klick auf einen Chip, um nur die Materialien dieser Stufe zu sehen, und noch einmal, um wieder alle zu sehen.

Der Imperium-Check nutzt nur die Regeln _für alle Planeten_ der Marktplatz-Präferenz des Imperiums. Eine Planeten-Ausnahme zählt für die Preise des Imperiums trotzdem, aber der Check sieht sie nicht, also prüf diese Materialien im Plan-Check jedes Plans.

## Analyse {#analysis}

**Analyse** zeigt Charts. Die Material-Charts folgen den Filtern, die Plan-Charts nicht.

- **Wohin der Umsatz jedes Plans fließt** zeigt für jeden Plan die Aufteilung des Umsatzes, die Marge und den Umsatz pro Tag. Du siehst die 10 Pläne mit dem meisten Profit und jeden Plan mit Verlust, der Rest geht in „Andere“. Das sind die eigenen Zahlen jedes Plans, nicht verrechnet.
- **Materialien mit den größten ȼ-Flüssen** zeigt die 10 Materialien mit den meisten ȼ pro Tag, links was das Imperium kauft und rechts was es verkauft, in **ȼ / Tag** oder **Einheiten / Tag**. Ein Button darunter zeigt alle. Klick auf ein Material, um es im Material I/O zu öffnen.
- **Weitere Charts** bleibt in diesem Browser so offen oder geschlossen, wie du es verlassen hast. Es enthält **Plan Gewinn (ȼ)**, **Material Gewinn (ȼ)**, **Material Kosten (ȼ)**, **Nettoproduktion**, **Nettoverbrauch**, **Exklusive Produktion** (hergestellt, aber im Imperium nie verbraucht) und **Exklusiver Verbrauch** (verbraucht, aber nie hergestellt).

## Produktionschancen {#production-opportunities}

**Produktionschancen** sucht nach [[recipe|Aufträgen]], die nutzen könnten, was dein Imperium übrig hat. Es listet jeden Auftrag mit mindestens einem Input, bei dem das Imperium ein positives Delta hat, sortiert nach dem Anteil der Inputs im Überschuss, dann nach **Mögliche Batches**.

Die drei Kacheln zählen sie:

| Kachel             | Bedeutung                                                           |
| ------------------ | ------------------------------------------------------------------- |
| **Chancen**        | Jeder Input ist im Überschuss, genug für mindestens 1 Batch pro Tag |
| **Delta benötigt** | Jeder Input ist im Überschuss, aber nicht genug für 1 Batch pro Tag |
| **Material fehlt** | Mindestens ein Input ist nicht im Überschuss                        |

**Mögliche Batches** ist, wie viele Durchläufe des Auftrags pro Tag dein Überschuss abdeckt. Für jeden Input teilt PRUNplanner den täglichen Überschuss durch die Menge, die der Auftrag braucht, und nimmt das niedrigste Ergebnis. Auftragszeit, die Zahl der nötigen Gebäude und ihre Effizienz berücksichtigt es nicht. Lies es als „wie viel Input da ist“, nicht als „wie viel du herstellen kannst“.

Ein Beispiel (ausgedachte Zahlen): Ein Auftrag braucht pro Durchlauf 10 von einem Input und 5 von einem anderen, und das Imperium hat davon 30 und 10 pro Tag übrig. Das sind 30 ÷ 10 = 3 und 10 ÷ 5 = 2 Durchläufe, also ist **Mögliche Batches** 2, weil der zweite Input zuerst ausgeht.

Bei vollen Treffern vergleichen **Inputs verkaufen** und **Outputs verkaufen**, die Inputs so zu verkaufen, wie sie sind, mit dem Verkauf dessen, was der Auftrag daraus herstellen würde (Verkaufspreis × Menge × Batches). Das Bessere ist grün. Die Preise sind Verkaufspreise aus der Marktplatz-Präferenz des Imperiums, nur Regeln für alle Planeten. Die Liste nutzt das ungefilterte Material I/O.

> [!tip]
> Bevor du für eine Chance baust, öffne die Marktkarte ihrer Outputs, denn ein dünner Markt kann die zusätzliche Menge nicht aufnehmen. [Produktionsketten](/help/tools_production_chain) plant die Gebäude, die dafür nötig wären.
