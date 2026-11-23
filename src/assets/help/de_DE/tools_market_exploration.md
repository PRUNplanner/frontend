Bevor du um einen Preis herum planst oder damit handelst, schau in der Marktforschung nach, ob dieser Preis normal ist, steigt oder fällt. Sie zeigt die Preisentwicklung und den aktuellen Markt eines Materials auf allen vier Marktplätzen.

## Preisentwicklung {#history}

Das Spiel zeigt nur die letzten 365 Tage der Preisentwicklung. PRUNplanner behält jeden Tag, den es gespeichert hat, zurück bis Juli 2023. Der Zeitraum **Alle** im Chart [Alle Marktplätze](#all-exchanges) kann also weiter zurückreichen als das Spiel.

PRUNplanner baut die Entwicklung aus den täglichen Preisdaten auf, die [[fio|FIO]] liefert. Ein Tag, für den FIO nichts geliefert hat, fehlt, und PRUNplanner korrigiert die Preise keines Tages. Ein einzelner Handel zu einem extremen Preis erscheint also so, wie er passiert ist, zum Beispiel als langer Docht an einer Kerze.

## Ein Material wählen {#material}

**Material wechseln** wählt das Material, es beginnt mit DW. Links aus der Marktkarte eines Materials öffnen die Seite mit diesem Material, ebenso **Entdecken** in der [Übersichtstabelle](#overview).

## Kennzahlen {#kpis}

Die Kacheln oben beschreiben das Material über alle vier Marktplätze ([[universe|Universe]]):

| Kachel                                                                   | Was sie zeigt                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Universe VWAP 7D**                                                     | der [[vwap\|VWAP]] der letzten 7 Tage in ȼ. Darunter **% Trend** = (VWAP 7D − VWAP 30D) ÷ VWAP 30D                                                                    |
| **Universum Gehandeltes Volumen 7T**                                     | in den letzten 7 Tagen gehandelte Einheiten, mit den Einheiten der 30 Tage darunter                                                                                                                                                                                                                              |
| **Universe-Markt-Delta**                                                 | Angebot − Nachfrage: Einheiten in allen Verkaufsorders minus Einheiten in allen Kauforders der vier Orderbücher. Es zeigt **Mangel**, wenn es negativ ist, und **Überschuss**, wenn es positiv ist, mit **Angebot:** und **Nachfrage:** darunter |
| **Gewichteter Trend** (**Volumen-bereinigtes Delta**) | der % Trend jedes Marktplatzes, gewichtet nach seinem Anteil an den in 7 Tagen gehandelten Einheiten                                                                                                                                                                                                             |
| **Preis Kohäsion** (**Varianz-Index**)                | wie weit die VWAP 7D der vier Marktplätze auseinanderliegen: Standardabweichung ÷ Mittelwert, in %                                                                                                                                                                                               |

Ein positiver % Trend heißt, die letzten 7 Tage wurde im Schnitt teurer gehandelt als in den letzten 30, ein negativer heißt billiger. Ein paar Beispiele mit ausgedachten Zahlen:

- **% Trend**: Ein VWAP 7D von 105 ȼ gegenüber einem VWAP 30D von 100 ȼ ergibt (105 − 100) ÷ 100 = +5 %.
- **Universe-Markt-Delta**: Ein Angebot von 1.000 gegenüber einer Nachfrage von 1.500 ergibt 1.000 − 1.500 = −500, es zeigt also **Mangel**.
- **Gewichteter Trend**: Von 1.000 in 7 Tagen gehandelten Einheiten hat AI1 500 bei +10 % gehandelt, CI1 250 bei +4 %, IC1 150 bei −2 % und NC1 100 bei 0 %. Das ergibt 0,5 × 10 + 0,25 × 4 + 0,15 × (−2) + 0,1 × 0 = +5,7 %.
- **Preis Kohäsion**: VWAP 7D von 98, 100, 100 und 102 ȼ haben einen Mittelwert von 100 und eine Standardabweichung von √((4 + 0 + 0 + 4) ÷ 4) ≈ 1,41, es zeigt also etwa 1,4 %.

Eine niedrige Preis Kohäsion heißt, die Marktplätze handeln fast zum selben Preis, eine hohe heißt, es gibt Lücken zwischen ihnen. Ein Marktplatz ohne Handel zählt darin mit einem Preis von 0.

Der Gewichtete Trend zeigt „—“, wenn einer der vier Marktplätze in den letzten 30 Tagen keinen Handel hatte, weil PRUNplanner den Trend dieses Marktplatzes nicht berechnen kann.

## Markt-Chart {#chart}

**Chart-Ansicht** wechselt zwischen zwei Charts. Die Seite merkt sich deine Wahl, bis du den Browser-Tab schließt.

### Kerzen {#candles}

Hier siehst du einen Marktplatz als Kerzenchart (Eröffnung, Hoch, Tief, Schluss pro Zeitraum), mit den gehandelten Einheiten als Balken darunter.

- **Marktplatz**: AI1 (Standard), CI1, IC1 oder NC1.
- **Intervall**: **Täglich**, **Wöchentlich** (Wochen beginnen am Montag) oder **Monatlich**, in UTC.

Ein Tag ohne Daten erscheint als flache Kerze beim letzten Schlusskurs mit Volumen 0, eine Lücke sieht also aus wie ein ruhiger Tag.

### Alle Marktplätze {#all-exchanges}

Jeder Marktplatz bekommt seine eigene Linie, damit du sie direkt vergleichen kannst, mit **Gehandeltes Volumen, alle Marktplätze** (Einheiten / Tag) darunter.

- **Wert**: **VWAP** (gehandelte ȼ ÷ an diesem Tag gehandelte Einheiten), **Tief** oder **Hoch**.
- **Zeitraum**: **30 T**, **90 T** (Standard), **1 J** oder **Alle**.

Der Zeitraum endet am letzten Tag mit Handel auf irgendeinem Marktplatz. Ein Tag ohne Handel auf einem Marktplatz hinterlässt eine Lücke in dessen Linie. Hat das Material gar keinen Handel, sagt das Chart **Kein Handel in diesem Zeitraum**.

Der Button oben rechts am Chart (**Vollbildmodus an/aus**) gibt dem Chart die volle Breite.

## Marktdaten {#market-data}

**Marktdaten** ist die Tabelle pro Marktplatz aus der Marktkarte des Materials, mit den Ansichten **Preise**, **Orderbücher** und **Volumen**. [Marktplätze & Preise](/help/exchanges) erklärt, was ihre Spalten bedeuten.

## Material-Markt-Übersicht {#overview}

**Material-Markt-Übersicht** listet jedes Material, sortiert nach Ticker. Klick auf eine Überschrift, um danach zu sortieren. Das geht bei jeder Spalte außer **30 Tage** und **Details**.

| Spalte                                                  | Was sie zeigt                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Material**                                            | das Material                                                                                                                   |
| **VWAP 7D**, **VWAP 30D**                               | Universe-VWAP der letzten 7 und 30 Tage                                                                                        |
| **30 Tage**                                             | der tägliche Universe-VWAP der letzten 30 Tage. Er zeigt nur die Richtung, da jede Zeile ihre eigene Skala hat |
| **Trend**                                               | der Gewichtete Trend (siehe [Kennzahlen](#kpis))                                                            |
| **Gehandeltes Volumen 7T**, **Gehandeltes Volumen 30T** | in Universe gehandelte Einheiten                                                                                               |
| **Details**                                             | **Entdecken** lädt das Material in die Seite                                                                                   |

> [!tip]
> Sortier nach **Trend**, um die Materialien zu finden, deren Preis sich diese Woche am stärksten bewegt, und drück dann **Entdecken**, um zu sehen, ob es ein Ausreißer oder eine längere Bewegung ist. Den ganzen Markt auf einen Blick zeigt der [Marktbericht](/help/tools_market_report).

## Kerzencharts lesen {#candlesticks}

Eine Kerze umfasst einen Zeitraum. Ihr Körper reicht vom Eröffnungs- zum Schlusskurs, und die dünnen Linien (Dochte) reichen bis zum Hoch und Tief des Zeitraums. Ein Schluss über der Eröffnung ergibt eine steigende Kerze, ein Schluss darunter eine fallende. Die Balken unter dem Chart zeigen, wie viele Einheiten gehandelt wurden, so kannst du eine Bewegung mit echtem Volumen von einer durch einen einzelnen Handel unterscheiden.
