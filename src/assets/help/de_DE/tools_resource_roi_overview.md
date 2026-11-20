Mit Ressourcen ROI findest du einen Planeten für eine Abbaubasis. Es sucht jeden Planeten, auf dem eine Ressource abgebaut werden kann, und rechnet aus, was eine Basis voller RIG, EXT oder COL dort verdient. Sieht ein Planet gut aus, öffne ihn als Plan und feile daran.

## So nutzt du es {#how-to-use}

1. Wähle die Ressource unter **Ressource auswählen** (36 Planetenressourcen, ALO bis ZIR).
2. Prüfe die **CX-Präferenz**, die über die Preise entscheidet (siehe [Preise](#prices)).
3. Drück **Suche & Berechnen**.

PRUNplanner sucht zuerst jeden Planeten mit dieser Ressource und zeigt dabei „Warte auf Antwort vom Backend“. Dann berechnet es jeden einzelnen, mit einem Fortschrittsbalken, auf dem **Kalkuliere Ressourcen ROI für gefundene Planeten.** steht. Die Ergebnisse bekommst du nach Tagesertrag sortiert, den höchsten zuerst.

Änderst du die Ressource oder die Marktplatz-Präferenz, rechnet die Tabelle nicht von selbst neu. Drück noch einmal **Suche & Berechnen**.

## Was es berechnet {#what-it-calculates}

Auf jedem Planeten mit der Ressource betrachtet PRUNplanner jedes Abbaugebäude, dessen Aufträge sie dort fördern. Für jedes dieser Gebäude baut es einen Plan aus dem hinterlegten Layout des Gebäudes (siehe [Optimale Setups](#optimal-setups)). Jede Zeile ist also ein Planet und ein Gebäude, das die Ressource dort abbauen kann.

Jeder Plan nutzt diese Einstellungen:

| Einstellung                                                                                                                     | Wert                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planet                                                                                                                          | der echte Planet, mit seiner Ressourcenkonzentration, seinen [[extra-building-materials\|zusätzlichen Baumaterialien]] und [[production-fees\|Produktionsgebühren]] |
| [[cogc\|COGC]]-Programm | Ressourcengewinnung, auf jedem Planeten                                                                                                                                                                                                                                                                                                                                             |
| [[experts\|Experten]]   | 5 in jedem Fachgebiet                                                                                                                                                                                                                                                                                                                                                               |
| Belegschaft                                                                                                                     | voll untergebracht durch die Unterkünfte des Layouts                                                                                                                                                                                                                                                                                                                                |

> [!warning]
> Jeder Plan nimmt an, dass der Planet das Programm Ressourcengewinnung hat, egal was er wirklich hat. Die Spalte **COGC** zeigt das Programm, das der Planet heute hat. Wo es abweicht, sind die echten Zahlen niedriger.

## Spalten {#columns}

Die Tabelle zeigt 50 Zeilen pro Seite. Die Planetenspalte bleibt angeheftet, und auf schmalen Bildschirmen scrollt die Tabelle seitwärts. Klick auf den Kopf einer Zahlenspalte, um danach zu sortieren.

| Gruppe              | Spalte                                      | Was sie zeigt                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                     | **Planet**                                  | Name und ID. Der Link öffnet einen neuen Plan auf diesem Planeten                                                                                                                                                                  |
| **Produktion**      | **Gebäude**                                 | RIG, EXT oder COL                                                                                                                                                                                                                                  |
|                     | **Täglich**                                 | Einheiten der Ressource, die das Layout pro Tag abbaut                                                                                                                                                                                             |
|                     | **% Max.**                  | Täglich als Prozentsatz des besten Täglich-Werts in den Ergebnissen, mit Balken                                                                                                                                                                    |
| **Kosten / Gewinn** | **COGM**                                    | öffnet die Kostenaufschlüsselung pro Einheit ([[cogm\|COGM]])                                                           |
|                     | **Plan Kosten (ȼ)**      | was es kostet, das ganze Layout auf diesem Planeten zu bauen                                                                                                                                                                                       |
|                     | **Täglicher Gewinn (ȼ)** | was das Layout pro Tag verdient, mit einem Balken relativ zur besten Zeile                                                                                                                                                                         |
|                     | **Plan-ROI (Tage)**      | Plan Kosten ÷ Täglicher Gewinn, in Tagen                                                                                                                                                                                                           |
| **Planet**          | **POPR**                                    | der neueste Bevölkerungsbericht des Planeten (siehe [POPR](#popr))                                                                                                                                                              |
|                     | **COGC**                                    | das Programm, das der Planet heute hat, oder „—“, wenn er keins hat                                                                                                                                                                                |
|                     | **Umwelt**                                  | die zusätzlichen Baumaterialien, die der Planet braucht, als Kacheln                                                                                                                                                                               |
|                     | **Infrastruktur**                           | LM, COGC, WAR, ADM und SHY, wo der Planet sie hat                                                                                                                                                                                                  |
| **Entfernungen**    | AI1, CI1, IC1, NC1                          | [[jumps\|Sprünge]] zu jedem Marktplatz. Der nächste ist fett in seiner Marktplatzfarbe, und „—“ heißt, es gibt keine Route |

Täglicher Gewinn und Plan Kosten folgen denselben Regeln wie [Auftrags-ROI](/help/tools_roi_overview#calculation). Outputs zählen zum Verkaufspreis und Verbrauchsgüter zum Kaufpreis, mit [[degradation|Abnutzung]] und den Produktionsgebühren des Planeten.

**Plan-ROI (Tage)** zeigt die rohe Zahl. Ein negativer Wert heißt, dass der Plan Geld verliert und sich nie amortisiert. Sein Balken füllt sich, je näher die Amortisation an 20 Tage kommt, ein längerer Balken heißt also eine langsamere Amortisation. Eine Amortisation von 10 Tagen füllt zum Beispiel den halben Balken, 20 Tage oder mehr füllen ihn ganz.

**% Max.** vergleicht jede Zeile mit der besten. Baut das beste Layout zum Beispiel 200 Einheiten am Tag ab, zeigt eine Zeile mit Täglich 150 den Wert 150 ÷ 200 = 75 %.

## Filter {#filters}

- **Planet** und **Gebäude** beschränken die Tabelle auf den einen Planeten oder das eine Gebäude, das du wählst.
- **Positiver ROI** blendet die Pläne aus, die Geld verlieren.
- **Gesuchtes Material** zeigt die Ressource, die unter **Ressource auswählen** gewählt ist. Änderst du sie, ohne **Suche & Berechnen** zu drücken, sind die Zeilen noch die der vorherigen Ressource.

Das Diagramm darunter zeigt dieselben Zeilen wie die gefilterte Tabelle.

## Amortisation vs. Entfernung {#chart}

Nach einer Suche öffnet **Chart** das Diagramm **Amortisation vs. Entfernung** unter der Tabelle, und dein Browser merkt sich, ob es offen ist. Um es höher oder niedriger zu machen, zieh an seiner Oberkante oder fokussiere die Kante und nutze die Pfeiltasten.

- Die waagerechte Achse ist der Plan-ROI in Tagen. Die senkrechte Achse sind die Sprünge zum nächsten Marktplatz oder zu dem, den du unter **Entfernung zu** wählst (standardmäßig **Nächster Marktplatz**).
- Die Größe eines Punkts ist sein Tagesgewinn, und seine Farbe ist der Marktplatz, zu dem seine Sprünge zählen (standardmäßig der nächste).
- Hervorgehobene Punkte sind die besten Kompromisse: Kein anderer Planet amortisiert sich schneller und liegt gleichzeitig näher. Ein Planet mit 10 Tagen bei 4 Sprüngen und einer mit 12 Tagen bei 2 Sprüngen sind zum Beispiel beide hervorgehoben, weil keiner den anderen in beidem schlägt. Ein Planet mit 14 Tagen bei 5 Sprüngen nicht, weil der erste ihn in beidem schlägt.
- Eine Zeile unter dem Diagramm nennt die hervorgehobenen Planeten und ihre Sprünge. Sie nennt außerdem den Planeten, der pro Tag am meisten verdient, falls er nicht darunter ist.
- Fahr mit der Maus über einen Punkt, um seine Zeile ins Bild zu scrollen.

Nicht jede Zeile wird zu einem Punkt. Das Diagramm lässt Zeilen weg, die sich nie amortisieren, keine Route zum Marktplatz haben oder mehr als doppelt so lange brauchen wie die schnellste Amortisation, und zählt sie unter dem Diagramm. Amortisiert sich die schnellste Zeile also in 10 Tagen, werden Zeilen über 20 Tage gezählt, aber nicht gezeichnet. Keine Sorge, wenn Punkte zu fehlen scheinen: Sie stehen weiterhin in der Tabelle.

> [!tip]
> Ein Planet ein paar Sprünge weiter draußen, der sich fast genauso schnell amortisiert, ist oft die bessere Basis, denn der Versand zu und von einem Marktplatz kostet jede Woche Zeit und Treibstoff.

## POPR {#popr}

Der Button **POPR** lädt den neuesten Bevölkerungsbericht des Planeten ([[popr|POPR]]) und öffnet ihn pro Stufe der Belegschaft:

| Zeile                   | Was sie zeigt                                  |
| ----------------------- | ---------------------------------------------- |
| **Gesamtbevölkerung**   | die Bevölkerungszahl der Stufe aus dem Bericht |
| **Freie Bevölkerung**   | Arbeiter ohne Job                              |
| **Freie Bevölkerung %** | freie Arbeiter als Prozentsatz                 |
| **Ungefüllte Jobs**     | Jobs, die Basen auf dem Planeten offen haben   |

Hat ein Planet keinen Bericht, wird der Button beim Drücken zu einem roten, deaktivierten **Kein POPR**. In einem Plan zeigt das Werkzeug POPR denselben Bericht mit dem Bedarf deines Plans daneben (siehe [Plan-Werkzeuge](/help/plan_tools)).

## Optimale Setups {#optimal-setups}

PRUNplanner nutzt eine feste Tabelle von Layouts, dieselbe, die auch [Auftrags-ROI](/help/tools_roi_overview#layouts) nutzt:

- RIG: 35 RIG, 11 HB1, 1 STO
- EXT: 14 EXT, 8 HB1, 1 HBB, 1 STO
- COL: 22 COL, 11 HB1, 1 STO

Zusammen mit dem Kernmodul passt jedes davon in eine Basis mit 500 Fläche.

## Preise {#prices}

**CX-Präferenz** wählt die [[exchange-preference|Marktplatz-Präferenz]], aus der die Preise kommen. „None - Universe 30D“ nutzt den 30-Tage-[[vwap|VWAP]] des [[universe|Universe]].

> [!warning]
> Wählst du hier eine Marktplatz-Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz für jede Seite.
