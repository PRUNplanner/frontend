Die Ergebnisse sagen dir, was deine Basis verdient, wie lange sie braucht, um sich zu amortisieren, ob ihre Arbeiter untergebracht sind und wie Fläche und Lager mithalten. Das sind die fünf Kacheln oben in einem Plan (im Standard-Layout) plus die Tabelle Material I/O mit ihren Summen, und sie aktualisieren sich bei jeder Änderung.

Auf sie schaust du, um einen Plan zu beurteilen: was die Basis verdienen würde und wo es knapp wird. Eine rote Zahl auf der Kachel **Belegschaft** oder **Fläche** zeigt einen Mangel an Betten oder Fläche.

## Ergebnis-Kacheln {#tiles}

Jede Kachel ist ein Button. Klick darauf, um den Teil zu öffnen, aus dem ihre Zahl stammt, und ist dieser Teil in deinem Layout ausgeblendet, öffnet er sich in einem Dialog.

| Kachel           | Zeigt                                                         | Öffnet                                           |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| **Profit / Tag** | Umsatz minus Kosten pro Tag                                   | **Profit** (das Werkzeug Profit-Aufschlüsselung) |
| **Amortisation** | Tage, bis der Profit die Basis bezahlt hat                    | **Konstruktion**                                 |
| **Belegschaft**  | Die niedrigste Effizienz der Belegschaft, Betten pro Stufe    | **Belegschaft**                                  |
| **Fläche**       | Genutzte Fläche von der verfügbaren Fläche, Profit pro Fläche | **Planet**                                       |
| **Lager**        | Tage, bis das Lager der Basis voll ist                        | **Besuche**                                      |

Jede Zahl nutzt die Preise des Imperiums, mit dem der Plan rechnet (siehe [Imperium & Preise](/help/plan_base#empire-and-prices)).

### Profit / Tag {#profit}

**Profit / Tag** ist der [[profit|Profit]] der Basis: Umsatz minus Kosten, pro Tag. Die Zeile darunter lautet „Umsatz … · Kosten … inkl. … Abnutzung und … Produktionsgebühren“.

_Umsatz_ ist der Wert jedes Materials, von dem die Basis mehr herstellt, als sie verbraucht (ein positives Δ in [Material I/O](#material-io)), zum Verkaufspreis.

_Kosten_ zählen drei Dinge zusammen:

- jedes Material, von dem die Basis mehr verbraucht, als sie herstellt, zum Kaufpreis, inklusive der Verbrauchsgüter deiner [[workforce|Belegschaft]];
- [[degradation|Abnutzung]], also 1/180 der Baukosten der _Produktionsgebäude_ pro Tag. [[core-module|Kernmodul]], [[habs|Unterkünfte]] und [[storage|Lager]] zählen hier nicht;
- [[production-fees|Produktionsgebühren]] (siehe [unten](#production-fees)).

Die Abnutzung steht für den Verschleiß deiner Gebäude. Ein Beispiel (ausgedachte Zahlen): Produktionsgebäude mit 900.000 ȼ Baukosten fügen 900.000 ÷ 180 = 5.000 ȼ Abnutzung pro Tag hinzu.

Ein Material, das die Basis herstellt und auch verbraucht, zählt einmal, mit seiner Nettomenge. Stellt der Plan 100 RAT her und essen seine Arbeiter 60, werden nur die 40 überschüssigen verkauft.

> [!tip]
> Profit / Tag ist dieselbe Zahl wie die fette Zeile **Profit / Tag** in den [Summen von Material I/O](#totals). Klick auf die Kachel, um sie im Werkzeug Profit in ihre Teile aufgeschlüsselt zu sehen (siehe [Plan-Werkzeuge](/help/plan_tools)).

### Produktionsgebühren {#production-fees}

Der Planet verlangt für jeden Produktionsauftrag eine Gebühr, und PRUNplanner rechnet sie pro Gebäude. Im Spiel legen die Gouverneure des Planeten diese Gebühren pro Fachgebiet und Belegschaftsstufe fest, und eine Gebühr wird fällig, wenn ein Produktionsauftrag startet. PRUNplanner nimmt die Gebühr des Planeten für das Fachgebiet des Gebäudes für jede Belegschaftsstufe und mittelt sie dann über die Arbeiter des Gebäudes, gewichtet nach Kopfzahl.

Pro Tag zahlt ein Gebäude diese Gebühr × seine Effizienz × seine Anzahl. Ein schnelleres Gebäude führt mehr Aufträge aus und zahlt daher mehr, und ein Gebäude, das nichts ausführt, zahlt nichts. Ein Planet ohne Gebühren oder ein Gebäude ohne Fachgebiet kostet keine Gebühr.

Ein Beispiel (ausgedachte Zahlen): Nimm ein Gebäude mit 10 Pionieren und 30 Siedlern auf einem Planeten, der in seinem Fachgebiet 20 ȼ für Pioniere und 40 ȼ für Siedler verlangt. Seine Gebühr ist (10 × 20 + 30 × 40) ÷ 40 = 35 ȼ pro Tag bei 100 %. Zwei davon bei 120 % Effizienz zahlen 35 × 1,2 × 2 = 84 ȼ pro Tag.

Gebühren sind kein Material, sie erscheinen also nicht als Zeilen in Material I/O. Du findest sie in der Profitzeile, in den [Summen](#totals), bei **ȼ / Tag** in der Auftragsauswahl und im COGM-Dialog (siehe [Produktion & Aufträge](/help/plan_production#cogm)).

### Amortisation {#payback}

**Amortisation** sind die Baukosten der Basis geteilt durch ihren Profit pro Tag, in Tagen (zum Beispiel „212,40 d“). Sie zeigt „nie“, wenn die Basis keinen Profit macht.

Ein Beispiel (ausgedachte Zahlen): Eine Basis mit 1.000.000 ȼ Baukosten, die 5.000 ȼ pro Tag macht, amortisiert sich in 1.000.000 ÷ 5.000 = 200 Tagen. Siehst du „nie“, keine Sorge: Das heißt nur, dass der Profit pro Tag zu diesen Preisen 0 oder weniger ist, die Basis würde ihre Baukosten also nicht wieder einspielen. Die Kachel **Profit / Tag** zeigt, warum.

Die Zeile darunter sind die Baukosten („… **ȼ Baukosten**“). Das ist jedes Baumaterial zum Kaufpreis, für die Produktionsgebäude, das Kernmodul (einmal) und jedes Wohn- und Lagergebäude. Es enthält die zusätzlichen Materialien, die die Umwelt des Planeten braucht (siehe [[extra-building-materials|zusätzliche Baumaterialien]]).

> [!tip]
> Die Amortisation zählt die Wohngebäude und das Lager, die Abnutzung in Profit / Tag aber nicht. Eine Basis mit vielen Wohngebäuden kann sich langsam amortisieren, obwohl ihr täglicher Profit gut aussieht. Öffne **Konstruktion**, um zu sehen, was du noch kaufen musst.

### Belegschaft {#workforce}

Die Zahl **Belegschaft** ist die niedrigste Effizienz unter den Belegschaftsstufen, von denen der Plan Arbeiter braucht, zum Beispiel „86,7 %“. Sie zeigt „—“, wenn kein Gebäude Arbeiter braucht, und wird rot, wenn eine Stufe weniger Betten als Arbeiter hat.

Das Rot ist wichtig, weil Arbeiter ohne Betten die Produktionseffizienz senken und damit, was deine Gebäude herstellen. Genug Wohngebäude für diese Stufe in **Infrastruktur** hinzuzufügen behebt es. Mit **Auto** wählt PRUNplanner sie für dich.

Die Zeile darunter listet jede benötigte Stufe als benötigte Arbeiter / Betten, zum Beispiel „PIO 260/650 · SET 550/1.450“, eine Stufe mit zu wenig Betten in Rot. Eine zweite Zeile listet die Experten, die du gesetzt hast, zum Beispiel „Agri 1 · Chem 4“. Fahr mit der Maus darüber für die ganze Liste.

[Basis einrichten](/help/plan_base#workforce) erklärt, wie die Effizienz berechnet wird und wie du sie änderst.

### Fläche {#area}

**Fläche** zeigt die genutzte Fläche von der verfügbaren Fläche, mit einer Anzeige. Die genutzte Zahl wird rot, wenn die Basis mehr braucht, als deine Genehmigungen hergeben.

- Verfügbare Fläche = 250 + 250 × Genehmigungen (eingestellt in **Planet**, siehe [Basis einrichten](/help/plan_base#permits)).
- Genutzte Fläche = 25 für das Kernmodul + die Fläche jedes Produktions-, Wohn- und Lagergebäudes.

Ein Beispiel: Mit 2 Genehmigungen hast du 250 + 2 × 250 = 750 Fläche. Ist die genutzte Zahl rot, kannst du **Genehmigungen** in **Planet** erhöhen (bis 3) oder Gebäude herausnehmen, bis die Basis passt.

Darunter ist „**ȼ Profit / Fläche**“ der Profit pro Tag geteilt durch die genutzte Fläche, oder 0, wenn nichts Fläche nutzt. **ȼ / Fläche** in der Auftragsauswahl teilt durch ein Standardlayout, damit sich Aufträge über Gebäude hinweg vergleichen lassen. Diese Zahl nutzt deine tatsächliche Basis.

Danach zeigt eine Zahl „Imperium“ dasselbe Verhältnis für das ganze Imperium, mit dem der Plan rechnet: der gesamte Profit des Imperiums pro Tag ÷ die gesamte Fläche, die alle seine Pläne nutzen. Es ist eine nach Fläche gewichtete Zahl, kein Mittelwert der Planzahlen. Sie erscheint erst, wenn du die Seite dieses Imperiums in [Imperium](/empire) in diesem Browser-Tab geöffnet hast, und das Speichern eines Plans löscht sie, bis du die Imperium-Seite wieder öffnest.

> [!tip]
> Ein Plan über der Zahl des Imperiums verdient mehr pro Fläche als dein Imperium im Schnitt. Das ist ein gutes Zeichen, wenn du mit begrenzten Genehmigungen wählst, welche Basis du als Nächstes baust.

### Lager {#storage}

**Lager** zeigt die Tage, bis das Lager der Basis voll ist („**Tage bis voll**“). PRUNplanner rechnet das für Gewicht und Volumen getrennt aus und teilt die Lagerkapazität durch den _größeren_ Wert von dem, was pro Tag reinkommt und rausgeht. Die Kachel zeigt das kleinere der beiden Ergebnisse. Sie sagt dir, wie lange die Basis zwischen zwei Schiffen auskommt, bevor ihr Lager voll ist.

Die Kapazität sind die 1.500 t und 1.500 m³ des Kernmoduls plus deine Lagergebäude (siehe [Infrastruktur](/help/plan_base#infrastructure)). Die Zeile unter der Zahl lautet „… t rein · … t raus / Tag“, und mit der Maus darüber siehst du dasselbe in m³. Sie zeigt „—“, wenn nichts reinkommt oder rausgeht.

Ein Beispiel (ausgedachte Zahlen): Eine Basis ohne Lagergebäude fasst 1.500 t und 1.500 m³. Nimmt sie 60 t pro Tag auf und schickt 100 t raus, reicht das Gewicht 1.500 ÷ 100 = 15 Tage. Nimmt sie 50 m³ auf und schickt 75 m³ raus, reicht das Volumen 1.500 ÷ 75 = 20 Tage. Die Kachel zeigt 15 Tage.

Die Kachel nutzt das ganze Material I/O. Sie folgt nicht den „Ausgeschlossene Materialien“, die du im Werkzeug Besuche einstellst, und kann daher eine andere Zahl von Tagen zeigen als **Besuche** selbst. Mehr in [Plan-Werkzeuge](/help/plan_tools).

## Material I/O {#material-io}

[[material-io|Material I/O]] listet jedes Material, das die Basis herstellt oder verbraucht, pro Tag:

- **Ein**: was die Basis verbraucht (Produktionsinputs und Verbrauchsgüter der Belegschaft).
- **Aus**: was die Basis herstellt.
- **Δ**: Aus − Ein. Ein positives Δ wird exportiert (verkauft), ein negatives Δ importiert (gekauft).

Drei Schalter über der Tabelle wählen, was du siehst. Sie werden nicht gespeichert, die Seite öffnet also immer mit Ganze Basis, Alle und ȼ. Ganze Basis ist die Ansicht, aus der der Profit berechnet wird, ihr Δ ist also, was die Basis kaufen und verkaufen würde.

| Schalter           | Optionen                                                    | Was er tut                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welche Materialien | **Ganze Basis** (Standard), **Produktion**, **Belegschaft** | Ganze Basis verrechnet Produktion und Belegschaft miteinander. Produktion zeigt nur Inputs und Outputs der Gebäude, Belegschaft nur, was deine Arbeiter verbrauchen. |
| Richtung           | **Alle** (Standard), **Exporte**, **Importe**               | Exporte behält Zeilen mit positivem Δ, Importe Zeilen mit negativem Δ.                                                                                               |
| Wert               | ȼ (Standard), t, m³, %                                      | Die letzte Spalte: **ȼ / Tag** (Δ zum Verkaufspreis bei Exporten, zum Kaufpreis bei Importen), **Δ t**, **Δ m3** oder **Anteil 7T** und **Anteil 30T**.              |

Die %-Ansicht zeigt Δ als Anteil am durchschnittlichen Tagesvolumen, das in den letzten 7 und 30 Tagen gehandelt wurde. Sie sagt dir, ob der Markt aufnehmen kann, was du verkaufst, oder liefern kann, was du kaufst (siehe [Plan-Check](/help/plan_check#flags)).

Klick auf eine Spaltenüberschrift, um danach zu sortieren. Mit **Ganze Basis** markiert ein Symbol nach der Kachel eines Materials eine Marktwarnung. Klick darauf, um den Plan-Check in seiner Marktansicht zu öffnen, beschrieben in [Plan-Check](/help/plan_check#market-check).

### Summen {#totals}

Der Teil mit den Summen von Material I/O fasst die Tabelle pro Tag zusammen:

- **Exporte**: der Wert aller Zeilen mit positivem Δ.
- **Importe**: der Wert aller Zeilen mit negativem Δ, als negative Zahl.
- Nur mit **Ganze Basis**: **Abnutzung**, **Produktionsgebühren** und **Profit / Tag** (fett).

Die Summen folgen der Wahl Ganze Basis, Produktion oder Belegschaft, aber nicht der Wahl Alle, Exporte oder Importe. Mit Ganze Basis gilt Exporte + Importe + Abnutzung + Produktionsgebühren = Profit / Tag, dieselbe Zahl wie auf der Kachel.

> [!tip]
> Stell Material I/O auf **Belegschaft**, um zu sehen, was die Versorgung deiner Arbeiter pro Tag kostet. Ein Luxusgut in Belegschaft auszuschalten senkt das, senkt aber auch die Effizienz der Arbeiter (siehe [Basis einrichten](/help/plan_base#workforce)).

### Als CSV herunterladen {#csv}

**Mehr** im Kopf des Plans hat **Material I/O herunterladen (CSV)**. Die Datei hat eine Zeile pro Material mit den Spalten ticker, input, output, delta, value, weight und volume, alle pro Tag. Value ist in ȼ, und weight und volume beziehen sich auf Δ. Eine CSV-Datei öffnet sich in jedem Tabellenprogramm, sodass du mit den Zahlen auch außerhalb von PRUNplanner arbeiten kannst.

Der Download folgt der aktuellen Wahl Ganze Basis, Produktion oder Belegschaft und ignoriert die Wahl Alle, Exporte oder Importe. Die Datei ist nach dem Plan benannt, oder nach der ID des Planeten, solange der Plan keinen Namen hat, gefolgt von „-material-io.csv“.
