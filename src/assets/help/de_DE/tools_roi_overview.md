Mit Auftrags-ROI stellst du eine Vorauswahl von Gebäuden und Aufträgen zusammen, bevor du eine Basis planst. Es ordnet jeden Produktions-[[recipe|Auftrag]] danach, was eine Basis voller seiner Gebäude verdienen würde. Prüfe die Gewinner danach auf einem echten Planeten in einem [Plan](/help/plan_layout).

Die Seite entstand mit Beiträgen von Lowstrife, MemoryAlpha und Laaxus aus den Discord-Communitys von PCT und Prosperous Universe.

## Was die Seite berechnet {#what-it-calculates}

Für jedes Produktionsgebäude baut PRUNplanner einen Plan mit einem festen Layout dieses Gebäudes (siehe [Layouts](#layouts)). Diesen Plan rechnet es einmal pro Auftrag durch, wobei das Gebäude nur diesen Auftrag laufen lässt. Jede Zeile ist ein Gebäude und ein Auftrag, und PRUNplanner berechnet sie mit derselben Engine wie deine eigenen Pläne.

Jeder Plan nutzt dasselbe Setup:

| Einstellung                                                                                                                     | Wert                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planet                                                                                                                          | Montem (OT-580b), mit seinen [[production-fees\|Produktionsgebühren]] und seiner [[fertility\|Fruchtbarkeit]] |
| [[cogc\|COGC]]-Programm | das eigene [[expertise\|Fachgebiet]] des Gebäudes, +25 %                                                                                                                                                                                 |
| [[experts\|Experten]]   | 5 in jedem Fachgebiet, also +28,4 % für das eigene des Gebäudes                                                                                                                                                                                                                                                                                  |
| Belegschaft                                                                                                                     | voll untergebracht durch die [[habs\|Unterkünfte]] des Layouts                                                                                                                                                                           |
| Preise                                                                                                                          | deine Marktplatz-Präferenz (siehe unten)                                                                                                                                                                                                                                                                                      |

Weil jede Zeile diesen Planeten, diese Experten und diese Preise teilt, unterscheiden sich die Zeilen nur im Gebäude, seinem Layout und seinem Programm sowie im Auftrag. Das macht sie untereinander vergleichbar.

Die Produktionsgebühren von Montem stecken in jedem Profit auf dieser Seite, ein Auftrag kann also auf einem Planeten mehr verdienen, dessen Gouverneur weniger verlangt. Fruchtbarkeit zählt nur für ORC, das PRUNplanner mit der Fruchtbarkeit von Montem berechnet.

Die Seite lässt die Abbaugebäude RIG, EXT und COL und die Farm FRM weg, weil ihr Ertrag vom Planeten abhängt. Für RIG, EXT und COL nutze [Ressourcen ROI](/help/tools_resource_roi_overview). Für FRM gibt es keine solche Seite.

Die Seite rechnet von selbst, wenn du sie öffnest, und ein Fortschrittsbalken **Berechne alle Gebäude-Auftrage und ihr ROI** zählt die Gebäude durch.

## Layouts {#layouts}

Jedes Gebäude hat ein hinterlegtes Layout: eine Anzahl Produktionsgebäude plus die Unterkünfte und das Lager, die sie brauchen. PRUNplanner hält diese Layouts in einer festen Tabelle und rechnet sie nicht für deine Preise neu. Zusammen mit den 25 Fläche des [[core-module|Kernmoduls]] nutzt jedes Layout 450 bis 500 Fläche und passt so in eine Basis mit 500 Fläche.

Die Spalte **Optimale Konfiguration** zeigt das Layout, zum Beispiel `11x TNP, 9x HB3, 1x STO`. Das Produktionsgebäude kommt zuerst, dann Unterkünfte und Lager.

## Marktplatz-Präferenz {#exchange-preference}

**CX-Präferenz** im Kopf wählt die [[exchange-preference|Marktplatz-Präferenz]], aus der die Preise kommen. PRUNplanner kauft Inputs und Verbrauchsgüter der Belegschaft zum Kaufpreis und verkauft Outputs zum Verkaufspreis (siehe [Kaufen, Verkaufen oder beides](/help/exchanges#buy-sell-or-both)).

> [!warning]
> Wählst du hier eine Marktplatz-Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz für jede Seite, genau wie beim Einstellen in deinem Profil. Die Seite rechnet sofort neu.

„None - Universe 30D“ heißt keine Marktplatz-Präferenz, jeder Preis ist dann der 30-Tage-[[vwap|VWAP]] des [[universe|Universe]].

## Spalten {#columns}

Die Tabelle zeigt 50 Zeilen pro Seite. Klick auf den Kopf einer Zahlenspalte, um danach zu sortieren.

| Spalte                                      | Was sie zeigt                                                                                                                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gebäude**                                 | das Produktionsgebäude                                                                                                                                                                                                 |
| **Optimale Konfiguration**                  | das hinterlegte Layout (siehe [Layouts](#layouts))                                                                                                                                                  |
| **Aufträge Ausgang**                        | die Outputs des Auftrags, als Materialkacheln                                                                                                                                                                          |
| **Aufträge Eingang**                        | die Inputs des Auftrags, als Materialkacheln                                                                                                                                                                           |
| **COGC**                                    | das Programm, mit dem der Plan läuft, also das Fachgebiet des Gebäudes                                                                                                                                                 |
| **COGM**                                    | öffnet die Aufschlüsselung **Kosten der hergestellten Waren** des Auftrags ([[cogm\|COGM]]) |
| **Plan Kosten (ȼ)**      | was es kostet, das ganze Layout zu bauen                                                                                                                                                                               |
| **Täglicher Gewinn (ȼ)** | was das ganze Layout pro Tag verdient                                                                                                                                                                                  |
| **Profit/Fläche (ȼ)**    | Tagesgewinn pro genutzter Flächeneinheit                                                                                                                                                                               |
| **Plan ROI (Tag)**       | Tage, bis der Profit den Bau bezahlt hat                                                                                                                                                                               |

Die Tagesmenge auf einer Materialkachel ist Auftragsmenge × Gebäude × Durchläufe pro Tag × 1,25 (der COGC-Bonus). Experten und Effizienz der Belegschaft fehlen darin, sie ist also niedriger als der Fluss hinter dem Profit daneben. Ein Auftrag, der 4 Einheiten in 12 Stunden herstellt, läuft zum Beispiel 2-mal am Tag, ein Layout mit 10 Gebäuden zeigt also 4 × 10 × 2 × 1,25 = 100 am Tag.

## Wie die Zahlen entstehen {#calculation}

- **Täglicher Gewinn (ȼ)** = Wert der Outputs zum Verkaufspreis − Inputs und Verbrauchsgüter der Belegschaft zum Kaufpreis − [[degradation|Abnutzung]] − Produktionsgebühren. Die Abnutzung ist die Baukosten der Produktionsgebäude ÷ 180 pro Tag.
- **Plan Kosten (ȼ)** = Baumaterialien des ganzen Layouts zum Kaufpreis: Produktionsgebäude, Unterkünfte, Lager und das Kernmodul.
- **Profit/Fläche (ȼ)** = Täglicher Gewinn ÷ genutzte Fläche, Kernmodul eingeschlossen.
- **Plan ROI (Tag)** = Plan Kosten ÷ Täglicher Gewinn. Er ist grün, wenn sich der Plan amortisiert. Amortisiert er sich nie (kein Profit), zeigt die Spalte **nie** in Rot.

Ein ausgedachtes Beispiel: Ein Layout mit Produktionsgebäuden im Wert von 900.000 ȼ verliert 900.000 ÷ 180 = 5.000 ȼ am Tag durch Abnutzung. Kostet der Bau des ganzen Layouts 1.500.000 ȼ, nutzt es 500 Fläche und bringt es einen Täglichen Gewinn von 30.000 ȼ, ist sein Profit/Fläche 30.000 ÷ 500 = 60 ȼ und sein Plan ROI 1.500.000 ÷ 30.000 = 50 Tage.

Deine Pläne rechnen mit denselben Formeln. Für die Basisansicht von [[profit|Profit]] und [[roi|ROI]] siehe [Plan-Ergebnisse](/help/plan_results).

## Filter {#filters}

Über der Tabelle:

- **Gebäude**, **COGC**, **Ausgang** und **Eingang** nehmen je einen oder mehrere Werte, und du kannst darin suchen. **Ausgang** und **Eingang** behalten die Aufträge, die eines der gewählten Materialien herstellen oder verbrauchen.
- **Positiver ROI** blendet die Aufträge aus, die Geld verlieren.

> [!tip]
> Um herauszufinden, was du aus einem Material machen kannst, das du schon herstellst, wähle es unter **Eingang**. Um zu sehen, wer ein Material herstellt, das du brauchst, wähle es unter **Ausgang**.
