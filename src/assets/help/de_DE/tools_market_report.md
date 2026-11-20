Der [Marktbericht](/market) zeigt, wie sich Preise und Umsatz an den vier Rohstoffbörsen in den letzten 90 Tagen entwickelt haben. Fang hier für das große Bild an und sieh dir dann ein einzelnes Material in der [Marktforschung](/help/tools_market_exploration) genauer an oder prüfe die Preise deines Plans. Der Bericht ist öffentlich, du musst dich also nicht einloggen.

## Daten und Aktualisierung {#data}

Die Tagespreise stammen aus den täglichen Handelsdaten, die [[fio|FIO]] für AI1, CI1, IC1 und NC1 liefert. Der Bericht deckt die 90 vollständigen UTC-Tage bis gestern ab. Er aktualisiert sich täglich (UTC) mit dem Handel des Vortags, der heutige Handel erscheint also erst, wenn der Tag vorbei ist. Der Kopf nennt den letzten Tag als „Tagespreise bis“ ein Datum.

Die Orderbücher sind aktuell. Die größte offene Lücke, die Lücken unter „Auftragsbücher jetzt“ und die Orderbuch-Zahlen auf den Marktplatzkarten nutzen alle die neuesten Orderbücher, die PRUNplanner hat, laufend aus FIO aktualisiert, mindestens alle 30 Minuten.

Geldbeträge sind in ȼ. Jeder Marktplatz hat seine eigene [[currency|Währung]] (AIC, CIS, ICA, NCC), und der Bericht addiert sie zum Nennwert, eins zu eins. Das funktioniert, weil dasselbe Material überall zu fast demselben Preis gehandelt wird.

Zeigt ein Teil der Seite „Die Marktdaten konnten nicht geladen werden.“ mit einem Button **Erneut versuchen**, drück ihn, um diesen Teil neu zu laden.

## Kurz gesagt {#in-short}

Oben sitzen vier Kacheln:

| Kachel                           | Was sie zeigt                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CX-Index**                     | den neuesten kombinierten [Preisindex](#price-index), seine Änderung seit dem ersten der 90 Tage und eine 90-Tage-Sparkline                                                 |
| **Am stärksten bewegt**          | den Sektor, dessen Index seit dem ersten der 90 Tage am stärksten gestiegen ist (wenn alle Sektoren gefallen sind, den, der am wenigsten gefallen ist), mit seiner Änderung |
| **100 Pioniere ernähren**        | was 100 Pioniere pro Tag zum neuesten VWAP 7D über alle Marktplätze verbrauchen, und wie sich das in den letzten zwei Wochen verändert hat                                  |
| **Größte offene Lücke momentan** | die größte [Preislücke](#price-gaps) in den Orderbüchern gerade jetzt: an einem Marktplatz kaufen, an einem anderen verkaufen                                               |

Der Pionier-Warenkorb enthält jedes Bedürfnis der Pioniere, [[luxuries|Luxusgüter]] eingeschlossen. Hat kein Material eine offene Lücke von 15 % oder mehr, sagt dir die letzte Kachel das.

## Kennzahlen {#kpis}

| Kennzahl                              | Was sie zeigt                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Gehandelt, letzte 7 Tage**          | den Umsatz der vier Marktplätze in den letzten 7 Tagen und seine Änderung gegenüber den 7 Tagen davor      |
| **Gehandelte Materialien, 7 Tage**    | wie viele Materialien in den letzten 7 Tagen gehandelt wurden, von denen, die in 30 Tagen gehandelt wurden |
| **CX-Index**                          | den kombinierten Preisindex und seine Änderung seit dem ersten der 90 Tage                                 |
| **Umsatz mit konstanten Materialien** | den Anteil des 30-Tage-Umsatzes in [konstanten](#flat) Materialien und wie viele es sind                   |

Umsatz ist gehandelte Einheiten × Preis, also eine Zahl in ȼ. 200 Einheiten zu je 50 ȼ verkauft ergeben zum Beispiel 10.000 ȼ Umsatz.

## Preisindex {#price-index}

**Preisindex** verfolgt, wie sich der Preis dessen bewegt hat, was Spieler handeln. Es ist eine Linie, die am ersten der 90 Tage bei 100 startet, und der Wert jedes Tages nutzt den [[vwap|VWAP]] 7D dieses Tages. VWAP 7D ist der Umsatz der letzten 7 Tage ÷ die darin gehandelten Einheiten, ein Tag mit wenigen Abschlüssen bewegt ihn also kaum.

Unter **Indexansicht** wählst du die Linien:

- **Je Marktplatz** (Standard): eine Linie pro Marktplatz, jede in ihrer eigenen Währung.
- **Gesamt**: eine Linie für alle vier Marktplätze.
- **Je Sektor**: eine Linie pro Sektor, alle Marktplätze zusammen. Es gibt acht Sektoren, von Verbrauchsgütern bis Drohnen & Sonstiges.

Jedes Material, das an jedem der 90 Tage in diesem Bereich einen VWAP 7D hat, ist Mitglied des Index. Das Gewicht eines Mitglieds ist sein Anteil am 30-Tage-Umsatz, begrenzt auf 5 % (20 % innerhalb eines Sektors). Was die Grenze einem Material abschneidet, wird auf die anderen verteilt, sodass kein einzelnes umsatzstarkes Material den Index trägt.

Jeden Tag setzt PRUNplanner den VWAP 7D jedes Mitglieds ins Verhältnis zu seinem Wert am ersten Tag und addiert diese Werte nach Gewicht. Zwei ausgedachte Beispiele:

- Liegt der VWAP 7D jedes Mitglieds 10 % über seinem Wert am ersten Tag, zeigt der Index 100 × 1,10 = 110, egal wie die Gewichte sind.
- Verdoppelt nur ein Mitglied mit einem Gewicht von 5 % seinen Preis, zeigt der Index 100 + 100 × 0,05 × (2 − 1) = 105.

Die Fußnote unter dem Diagramm nennt das Basisdatum und die Mitglieder. Bei **Gesamt** nennt sie außerdem den Anteil der Mitglieder am 30-Tage-Umsatz.

## Was es kostet, eine Belegschaft zu halten {#workforce}

Dieser Abschnitt bewertet die Verbrauchsgüter, die 100 Arbeiter einer Stufe für einen Tag brauchen, alle Bedürfnisse einschließlich beider Luxusgüter, zum VWAP 7D des jeweiligen Tages. Das zahlt jede Basis, egal was sie produziert.

- Es gibt eine Karte pro Stufe der [[workforce|Belegschaft]], von Pionieren bis Wissenschaftlern. Sie zeigt die Kosten pro 100 Arbeiter und Tag über alle Marktplätze und ihre Änderung über 90 Tage.
- Wähle eine Stufe, um ihr Diagramm zu sehen, mit einer Linie pro Marktplatz über 90 Tage.
- „Heute am günstigsten“ nennt den Marktplatz, an dem der Warenkorb dieser Stufe zu den neuesten Preisen am wenigsten kostet.
- **Am stärksten bewegt** nennt die zwei Materialien, die die Kosten der Stufe über die 90 Tage am stärksten verändert haben, in ȼ.

Hat ein Material im Warenkorb an einem Tag keinen Preis, hat das Diagramm für diesen Tag keinen Wert.

## Wohin das Geld fließt {#treemap}

**Wohin das Geld fließt** ist eine Treemap. Jeder Kasten ist ein Material, groß nach seinem 30-Tage-Umsatz an allen vier Marktplätzen und nach Sektor gruppiert. Die Farbe vergleicht VWAP 7D mit VWAP 30D: grün, wenn er steigt, rot, wenn er fällt, am kräftigsten ab ±12 %. Mit der Palette **Farbenblind (blau / orange)** in deinem Profil ist steigend blau und fallend orange. [Konstante](#flat) Materialien sind schraffiert und als **konstant** markiert („Zu einem festen Preis gehalten, vermutlich ein Market Maker“).

Fahr mit der Maus über einen Kasten, um **Umsatz, 30 Tage**, **VWAP 7D**, **VWAP 30D** und **7D gegenüber 30D** zu sehen. Gibt es keine Änderung zu zeigen, steht dort **zu wenige Abschlüsse**. Das passiert, wenn das Material in den letzten 30 Tagen gehandelt wurde, aber nicht in den letzten 7, es also keinen VWAP 7D zum Vergleichen gibt.

## Größte Bewegungen dieser Woche {#movers}

**Größte Bewegungen dieser Woche** listet die Materialien, deren VWAP 7D am weitesten über (**Steigend**) oder unter (**Fallend**) ihrem VWAP 30D liegt, über alle Marktplätze. Ein VWAP 7D von 110 ȼ gegenüber einem VWAP 30D von 100 ȼ ist zum Beispiel (110 ÷ 100 − 1) × 100 = +10 %.

Es zählen nur Materialien mit mindestens 5.000.000 ȼ und 50 gehandelten Einheiten in den letzten 7 Tagen, und konstante Materialien sind ausgenommen. Die Top 8 erscheinen zuerst, jedes mit einer 15-Tage-Sparkline seines VWAP 7D. „Alle anzeigen“ öffnet die ganze Liste in Seiten zu 25, und du kannst mit **Sortieren nach** nach **Änderung vs. 30 Tage**, **Material**, **VWAP 7D** oder **Gehandelt, 7 Tage** sortieren.

Die 30 Tage enthalten die letzten 7, eine Änderung wirkt also kleiner als bei einem Vergleich Woche gegen Woche. Qualifiziert sich in einer Richtung kein Material, sagt die Liste „Kein Material hat sich mit genug Volumen in diese Richtung bewegt.“

## Worauf die Wirtschaft läuft {#leaders}

**Worauf die Wirtschaft läuft** listet die 10 Materialien mit dem meisten 30-Tage-Umsatz, mit ihrem Anteil daran. Jeder Balken teilt den Umsatz der letzten 7 Tage dieses Materials nach Marktplatz auf. „Alle anzeigen“ listet jedes Material, das in 30 Tagen gehandelt wurde.

## Preisunterschiede zwischen den Börsen {#price-gaps}

**Preisunterschiede zwischen den Börsen** listet Materialien, die an einem Marktplatz deutlich günstiger gehandelt werden als an einem anderen. Du wählst die **Lückengrundlagen**:

- **Letzte 7 Tage** (Standard) vergleicht den VWAP 7D jedes Marktplatzes. Eine Lücke hier kann schon wieder weg sein. **Auftragsbücher jetzt** sagt dir, ob du noch an einem Marktplatz kaufen und am anderen verkaufen könntest („Offen“ mit der Lücke oder **Geschlossen**).
- **Auftragsbücher jetzt** vergleicht den besten Ask am günstigeren Marktplatz mit dem besten Bid am teureren, genau jetzt.

Ein Material zählt nur, wenn an beiden Marktplätzen in den letzten 7 Tagen mindestens 20 Einheiten und 5.000.000 ȼ gehandelt wurden, die Lücke mindestens 15 % beträgt und es nicht [konstant](#flat) ist.

Die Lücke ist der teurere Preis ÷ der günstigere − 1, in %. Ein bester Ask von 100 ȼ an einem Marktplatz und ein bester Bid von 120 ȼ an einem anderen ergeben zum Beispiel eine Lücke von (120 ÷ 100 − 1) × 100 = 20 %. Qualifiziert sich kein Material, sagt der Abschnitt „Kein Material hat eine Lücke von 15 % oder mehr bei ausreichendem Volumen.“

Die Top 10 erscheinen zuerst, größte Lücke zuerst. Es zählt nur der beste Preis, nicht wie viel angeboten wird, und die Lücke ignoriert Versand, Treibstoff und Flugzeit.

> [!tip]
> Eine Lücke in den Orderbüchern ist nur dann eine Chance, wenn genug angeboten wird und du die Ware rechtzeitig bewegen kannst. Prüfe die Orderbücher des Materials in der [Marktforschung](/help/tools_market_exploration), bevor du handelst.

## Die vier Marktplätze {#exchanges}

**Die vier Marktplätze** hat eine Karte pro Marktplatz: Antares Station (AI1, AIC), Benten Station (CI1, CIS), Hortus Station (IC1, ICA) und Moria Station (NC1, NCC). Jede Karte zeigt:

| Kennzahl                           | Was sie zeigt                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| **Umsatz, 30 Tage**                | den Umsatz des Marktplatzes und seinen Anteil an allen vier                              |
| Balken                             | den Tagesumsatz über 90 Tage                                                             |
| **Umsatz, 7 Tage**                 | den Umsatz der letzten 7 Tage                                                            |
| **Gehandelte Materialien, 7 Tage** | Materialien mit Umsatz an diesem Marktplatz in den letzten 7 Tagen                       |
| **Bid-Ask-Spread im Median**       | den Median von (Ask − Bid) ÷ Mittelwert von Bid und Ask, über die Orderbücher mit beidem |
| **Orderbücher ohne Käufer**        | Orderbücher, die gerade keinen Bid haben                                                 |
| **Orderbücher ohne Verkäufer**     | Orderbücher, die gerade keinen Ask haben                                                 |

Der Spread wird hier am Mittelwert gemessen. Live-Markt und die Materialkarte messen ihn am Ask, dasselbe Orderbuch zeigt hier also eine etwas größere Zahl. Ein Orderbuch mit einem Bid von 90 ȼ und einem Ask von 110 ȼ hat hier zum Beispiel einen Spread von 20 ÷ 100 = 20 % und im Live-Markt 20 ÷ 110 ≈ 18,2 %.

## Konstante Materialien {#flat}

Ein Material ist _konstant_, wenn es in den letzten 30 Tagen an mindestens 10 Tagen gehandelt wurde und sein täglicher VWAP an mindestens 80 % dieser Tage innerhalb von ±0,3 % seines 30-Tage-Medians blieb. Bei einem 30-Tage-Median von 100 ȼ bleibt ein Tag zum Beispiel im Band zwischen 99,70 ȼ und 100,30 ȼ, und ein Material, das an 20 Tagen gehandelt wurde, braucht mindestens 16 solcher Tage. Meist heißt das, dass [[market-maker|Market Maker]] es zu festen Preisen kaufen oder verkaufen. Konstante Materialien zählen zum Umsatz, sind aber von den Bewegungen und den Preislücken ausgenommen.

## Wie diese Zahlen entstehen {#how-made}

Der aufklappbare Abschnitt **Wie diese Zahlen entstehen** unten auf der Seite erklärt in Kurzform die Quelle, den Umsatz, die Preise, den Index, die Bewegungen, die Lücken, konstante Materialien und was ausgelassen wird.

Ein starker Tag wirkt eine Woche lang. Ein einzelner großer Abschluss zu einem ungewöhnlichen Preis zieht den VWAP 7D, solange er im 7-Tage-Fenster liegt, und danach springt der Preis zurück.

## Was CX-Daten nicht sehen {#not-included}

Der Bericht deckt die Marktplätze ab, nicht die ganze Wirtschaft:

- Lokale Märkte auf Planeten und Stationen, Verträge und Handel innerhalb von Corporations berühren die Marktplätze nie, sie fehlen also. Spieler sagen, dass manche Alltagsgüter vor allem über lokale Märkte laufen.
- Abschlüsse mit Market Makern zählen wie jeder andere Abschluss.
- Nicht ausgeführte Orders zählen nicht, und die Daten sagen nicht, welche Seite einen Abschluss ausgelöst hat.
- Die Orderbuch-Zahlen nutzen nur den besten Preis, nicht die Tiefe dahinter.

[Was das CX-Volumen nicht erfasst](/help/plan_check#cx-volume) erklärt, was das für die Preise deines Plans bedeutet.
