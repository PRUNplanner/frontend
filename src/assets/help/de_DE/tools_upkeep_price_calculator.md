Mit dem Instandhaltungskosten-Rechner siehst du, welches Gebäude und welches Material einen Bedarf der Bevölkerung (Sicherheit, Gesundheit, Komfort, Kultur, Bildung) zu den Preisen deiner Marktplatz-Präferenz am günstigsten decken. Er vergleicht die Materialien, die [[upkeep|Unterhalts]]-Gebäude verbrauchen, danach, was eine Einheit eines Bedarfs mit jedem von ihnen kostet.

Nutze ihn, wenn du vergleichen willst, was die Versorgung eines Bedarfs mit jedem Gebäude und Material zu deinen Preisen kostet. Er schaut nicht auf deine Pläne oder Basen: Die Gebäudedaten sind fest eingebaut, und die Preise kommen aus deiner Marktplatz-Präferenz.

## So nutzt du ihn {#how-to-use}

1. Prüf **CX-Präferenz**, die die Preise bestimmt (siehe [Preise](#prices)).
2. Wähle den Bedarf unter **Bedarf**: **Sicherheit** (Standard), **Gesundheit**, **Komfort**, **Kultur** oder **Bildung**.
3. Lies die Tabelle **Materialdetails**, die günstigste zuerst.

Die Seite berechnet alle fünf Bedarfe, wenn du sie öffnest („Berechne Preise der Infrastruktur Materialien“), und noch einmal, wenn du die Marktplatz-Präferenz änderst. Bis sie fertig ist, siehst du einen Fortschrittsbalken mit dieser Zeile. Danach wechselt **Bedarf** sofort, weil alle fünf Bedarfe schon berechnet sind.

## Gebäude und Bedarfe {#buildings}

PRUNplanner kennt 14 Unterhaltsgebäude, jedes mit den Materialien, die es pro Tag verbraucht, und wie viel es von jedem Bedarf liefert. Diese Daten sind in PRUNplanner fest eingebaut.

| Bedarf         | Gebäude                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| **Sicherheit** | SST Safety Station, SDP Security Drone Post, EMC Emergency Center             |
| **Gesundheit** | INF Infirmary, HOS Hospital, EMC Emergency Center, WCE Wellness Center        |
| **Komfort**    | PAR Park, 4DA 4D Arcades, WCE Wellness Center, ACA Art Cafe                   |
| **Kultur**     | ART Art Gallery, VRT VR Theater, ACA Art Cafe, PBH Planetary Broadcasting Hub |
| **Bildung**    | LIB Library, UNI University, PBH Planetary Broadcasting Hub                   |

Vier Gebäude decken zwei Bedarfe: EMC (Sicherheit und Gesundheit), WCE (Gesundheit und Komfort), ACA (Komfort und Kultur) und PBH (Kultur und Bildung).

## Materialdetails {#material-details}

Für den gewählten Bedarf hat die Tabelle eine Zeile pro Gebäude und Material. Sie zeigt 50 Zeilen pro Seite, und du kannst auf eine Überschrift klicken, um danach zu sortieren.

| Spalte                              | Was sie zeigt                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Material**                        | das Material, das das Gebäude verbraucht                                                                    |
| **Gebäude**                         | das Unterhaltsgebäude, als Ticker                                                                           |
| **ȼ/Bedarf**                        | die Kosten pro Einheit Bedarf (4 Nachkommastellen). Niedriger ist besser |
| **CX Preis (ȼ)** | der Kaufpreis des Materials laut deiner Marktplatz-Präferenz                                                |
| **Menge/Tag**                       | wie viel das Gebäude pro Tag verbraucht                                                                     |

Standardmäßig sind die Zeilen nach **ȼ/Bedarf** sortiert, der niedrigste zuerst. Materialien ohne Preis zeigen „—“ in **ȼ/Bedarf** und **CX Preis (ȼ)** und stehen unten. Keine Sorge, das heißt nur, dass deine Marktplatz-Präferenz keinen Kaufpreis für sie liefert, es gibt also nichts zu vergleichen.

## So wird ȼ/Bedarf berechnet {#price-per-need}

ȼ/Bedarf = CX-Preis × Menge/Tag ÷ (gelieferter Bedarf × Zahl der Bedarfe, die das Gebäude deckt)

Bei einem Gebäude, das zwei Bedarfe deckt, zählt PRUNplanner den gelieferten Bedarf doppelt, weil dieselben Materialien beide Bedarfe bezahlen. Deshalb sehen seine Zeilen günstiger aus als die eines Gebäudes mit einem Bedarf und denselben Kosten.

Ein Beispiel mit ausgedachten Zahlen: Ein Gebäude verbraucht pro Tag 10 Einheiten eines Materials zu 50 ȼ und liefert 500 eines Bedarfs. Seine Zeile zeigt 50 × 10 ÷ (500 × 1) = 1 ȼ/Bedarf. Ein Gebäude, das dasselbe verbraucht und je 500 von zwei Bedarfen liefert, zeigt 50 × 10 ÷ (500 × 2) = 0,5 ȼ/Bedarf.

Jede Zeile betrachtet ein Material für sich, als ob dieses Material allein den ganzen Bedarf des Gebäudes bezahlen würde. Ein Gebäude verbraucht alle seine Materialien, seine vollen Kosten pro Einheit Bedarf sind also die Summe seiner Zeilen. Würde das Gebäude mit einem Bedarf oben auch ein zweites Material verbrauchen, dessen Zeile 0,5 zeigt, lägen seine vollen Kosten bei 1 + 0,5 = 1,5 ȼ/Bedarf.

> [!tip]
> Vergleiche Gebäude, indem du ihre Zeilen addierst. Ein Gebäude mit einem günstigen und einem teuren Material kann pro Bedarf mehr kosten als ein Gebäude, dessen Materialien alle im Mittelfeld liegen.

## Preise {#prices}

**CX-Präferenz** wählt die [[exchange-preference|Marktplatz-Präferenz]], und „None - Universe 30D“ nutzt den [[universe|Universe]]-30-Tage-[[vwap|VWAP]]. Preise hängen nicht von einem Planeten ab, Planeten-Ausnahmen in deiner Marktplatz-Präferenz gelten hier also nicht. Die Preise bestimmen die Reihenfolge, eine andere Marktplatz-Präferenz kann also ein anderes Material oder Gebäude nach vorne bringen.

> [!warning]
> Wählst du hier eine Marktplatz-Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz, und andere Seiten, die deinem Standard folgen, wechseln mit.
