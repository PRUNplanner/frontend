Mit der **Planetensuche** findest du einen Planeten, den du schon kennst, oder die besten Orte für neue Produktion. Hier fängst du an, bevor du einen [[plan|Plan]] erstellst. Du filterst jeden Planeten nach Ressourcen, Bedingungen, [[cogc|COGC]], Infrastruktur und [[jumps|Sprüngen]] und vergleichst dann die besten paar nebeneinander. Sie funktioniert ohne Konto, und die Ergebnisse aktualisieren sich, sobald du einen Filter änderst.

## Wo du sie findest {#where-to-find-it}

Die Planetensuche steht in der Navigation in der Gruppe Planen und auf der Startseite. Wenn du abgemeldet bist, sagt eine Zeile unter dem Titel, dass sie kostenlos ist und kein Konto braucht. Anmelden musst du dich nur für Entfernungen zu deinen eigenen Plänen und um aus einem Ergebnis einen Plan zu erstellen.

Auch andere Seiten führen hierher. [Produktionsketten](/help/tools_production_chain) öffnet die Planetensuche aus der Planetenauswahl eines Abbauschritts und aus einem Standort-Befund, und die Imperium-Seite verlinkt hierher, während du deine ersten Pläne einrichtest.

## Name oder ID {#name-or-id}

Tipp einen Teil eines Namens oder einer ID in das Feld oben (**Planeten- oder Systemname oder ID**). Es findet die natürliche ID des Planeten („OT-580b“), seinen Namen („Montem“), seinen Namen im Spiel („Antares II e“) und den Namen seines Systems, also listet „Antares II“ jeden Planeten dieses Systems.

Eine Namenssuche zeigt jeden passenden Planeten, auch wenn deine Filter einige ausblenden würden. Ein Hinweis über den Ergebnissen sagt dann, dass deine Filter pausiert sind.

- _Filter anwenden_ kombiniert den Namen wieder mit deinen Filtern. Der Hinweis sagt dann, wie viele passende Planeten die Filter ausblenden. Er bietet außerdem bis zu drei Änderungen an, die mehr davon zeigen würden, jede mit der Zahl der Planeten, die sie hinzufügt.
- _Zeige alle_ pausiert die Filter wieder.

Deine Filter bleiben so oder so erhalten. Sobald du den Namen löschst, beginnt die nächste Namenssuche wieder mit pausierten Filtern. Wenn die Filter keinen der Treffer ausblenden, gibt es keinen Hinweis.

> [!tip]
> Du suchst einen Planeten, den jemand im Chat erwähnt hat? Tipp seinen Namen ein. Deine Filter musst du vorher nicht löschen.

## Materialien {#materials}

Du kannst nach einer oder mehreren Gruppen von Materialien suchen.

- Jede Gruppe passt auf **eines von** oder **alle von** ihren Materialien. Eine neue Gruppe beginnt mit **eines von**.
- Die Gruppen werden mit **alle Gruppen** (Standard) oder **jede Gruppe** kombiniert.
- **+ Material hinzufügen** fügt einer Gruppe ein Material hinzu, und jede Option zeigt, wie viele Planeten du damit bekämst. × entfernt ein Material, **Entfernen** entfernt eine ganze Gruppe, und **+ Gruppe hinzufügen** fügt eine hinzu.

Damit gehen Suchen wie „(FEO und H2O) oder (MAG und O)“: zwei Gruppen mit **alle von**, kombiniert mit **jede Gruppe**.

Du kannst jedem Material einen minimalen täglichen [[extraction|Abbau]] geben („min … /Tag“). Das ist die tägliche Rate des Planeten für das Material, und ein Plan baut daraus seinen EXT-, RIG- oder COL-Auftrag dort, also behält ein höheres Minimum die Planeten, auf denen jeder Extraktor mehr liefert. Das „(max. …)“ daneben ist der höchste tägliche Abbau dieses Materials auf irgendeinem Planeten, damit du weißt, was möglich ist. Ein Minimum gehört zum Material, nicht zur Gruppe. Steht dasselbe Material in zwei Gruppen, teilen sie sich ein Minimum.

## Planetenbedingungen {#planet-conditions}

Wähl **Erdähnlich** und/oder **Gasriese** und ob sie **Fruchtbar** sein müssen (Landwirtschaft erlauben). Eine neue Suche beginnt nur mit erdähnlichen Planeten. Eine Oberfläche bleibt immer angehakt.

[[fertility|Fruchtbarkeit]] zählt nur für Farmen (FRM und ORC). Auf einem Planeten ohne sie setzt PRUNplanner ihre Effizienz auf 0, sie produzieren dort also nichts.

Schwerkraft, Druck und Temperatur zählen nur über die [[extra-building-materials|zusätzlichen Baumaterialien]], die sie verlangen. Unter **Zusätzliche Baumaterialien akzeptieren** hakst du die an, die du bereit bist heranzuschaffen:

| Material | Nötig bei                |
| -------- | ------------------------ |
| MGC      | **Niedrige Schwerkraft** |
| BL       | **Hohe Schwerkraft**     |
| SEA      | **Niedriger Druck**      |
| HSE      | **Hoher Druck**          |
| INS      | **Niedrige Temperatur**  |
| TSH      | **Hohe Temperatur**      |

Diese Materialien zählen, weil ein Plan auf diesem Planeten sie zum Bau jedes Gebäudes hinzufügt, sie erhöhen also seine Baukosten. Zum Beispiel braucht ein Gebäude mit Fläche 20 auf einem felsigen Planeten 20 × 4 = 80 MCG und auf einem Planeten mit niedriger Temperatur zusätzlich 20 × 10 = 200 INS.

Die Planetensuche blendet Planeten aus, die ein Material brauchen, das du nicht angehakt hast. Ist keins angehakt, siehst du nur Planeten, die keins davon brauchen. Das Oberflächenmaterial (MCG auf felsigen Planeten, AEF auf gasförmigen) wird immer gebraucht und gehört nicht zu diesem Filter.

## COGC und Infrastruktur {#cogc-and-infrastructure}

**Aktives COGC-Programm** behält Planeten, auf denen gerade eins der angehakten Programme läuft, also in dem Moment, in dem du die Seite geöffnet hast. Die Liste enthält jedes Programm: die Werbeprogramme für jede Industrie und die Belegschaftsprogramme für jede Stufe.

Ein Programm zählt, weil es die Produktion in einem Plan beschleunigt: Ein Werbeprogramm beschleunigt Gebäude seines Fachgebiets um 25 %, ein Belegschaftsprogramm beschleunigt Gebäude, die diese Stufe beschäftigen, um 10 %. Im Spiel stimmen die Bewohner (Spieler mit einer Basis auf dem Planeten) über das Programm ab, und das siegreiche Programm läuft eine Woche, das Programm, das du hier siehst, kann sich also später ändern.

**Infrastruktur** ist ein eigener Filter, und ein strengerer. Ein Planet muss jedes angehakte Gebäude haben.

| Code | Gebäude                   |
| ---- | ------------------------- |
| LM   | **Lokaler Marktplatz**    |
| COGC | **Globale Handelskammer** |
| WAR  | **Lagerhaus**             |
| ADM  | **Planetare Verwaltung**  |
| SHY  | **Schiffswerft**          |

Die Pillen zeigen den Code. Fahr mit der Maus über eine, um den Namen zu sehen.

## Zahlen und „Jede“ {#counts-and-any}

Die Zahl neben einer nicht angehakten Option sagt dir, wie viele Planeten du bekämst, wenn du sie anhakst. Dieselben Zahlen siehst du in der Liste zum Hinzufügen von Materialien, neben den Marktplätzen und neben deinen Plänen.

Planetenbedingungen, Zusätzliche Baumaterialien akzeptieren, Aktives COGC-Programm und Infrastruktur haben jeweils einen Button _Jede_ in ihrer Kopfzeile. Er setzt diesen Abschnitt auf den Zustand, der die wenigsten Planeten ausblendet, und zeigt, wie viele Planeten das ergibt:

- Planetenbedingungen: beide Oberflächen, Fruchtbarkeit nicht erforderlich.
- Zusätzliche Baumaterialien akzeptieren: alle akzeptiert.
- Aktives COGC-Programm: keins angehakt.
- Infrastruktur: keins angehakt.

Ist der Abschnitt schon in diesem Zustand, ist der Button hervorgehoben und lässt sich nicht anklicken.

## Entfernung {#distance}

Unter **Entfernung** wählst du **Marktplätze** und/oder Pläne aus einem deiner [[empire|Imperien]]. Ein Planet muss höchstens **Max. Sprünge** von jeder Auswahl entfernt sein. Sprünge zählen zwischen Sternsystemen, also hat jeder Planet eines Systems dieselbe Entfernung, und ein Planet ohne Sprungroute zu einer Auswahl fällt heraus. Zum Beispiel ist bei NC1 und einem deiner Pläne als Auswahl und Max. Sprünge auf 5 ein Planet ausgeblendet, der 3 Sprünge von NC1 und 6 von deinem Plan entfernt ist. Max. Sprünge reicht von 0 bis 30 und beginnt bei 10. Es zählt erst, wenn du etwas auswählst.

- **Pläne des Imperiums** wählt das Imperium, aus dessen Plänen du wählen kannst. Es beginnt mit dem Imperium, das die meisten Pläne deiner Suche enthält, sonst mit deinem aktuellen oder Standard-Imperium. Wechselst du das Imperium, fallen die gewählten Pläne weg.
- Die Planliste hat ein Filterfeld, in das du einen Plannamen, eine Planeten-ID oder einen Planetennamen tippen kannst.
- Jeder gewählte Plan erscheint als Chip, den du entfernen kannst, und bekommt in den Ergebnissen eine eigene Sprung-Spalte.

AI1, CI1, IC1 und NC1 haben ebenfalls eigene Sprung-Spalten, die du unter **Spalten** ausblenden kannst.

Entfernungen zu deinen eigenen Plänen brauchen eine Anmeldung. Wenn du abgemeldet bist, sagt der Abschnitt das und bietet **Anmelden** an. Die Planetensuche lässt Pläne in einem Link weg, den jemand anderes geteilt hat, weil sie nicht deine sind.

> [!tip]
> Um eine zweite Basis in der Nähe deiner ersten zu finden, wähl ihren Plan unter Entfernung und setz Max. Sprünge auf 2 oder 3. Wenn nichts passt, bieten die Vorschläge über den Ergebnissen ein paar Sprünge mehr an.

## Aktive Filter und Zurücksetzen {#active-filters-and-reset}

Jeder aktive Filter erscheint als Chip über den Ergebnissen, und × auf einem Chip entfernt nur diesen Filter. Du bekommst einen Chip pro Materialgruppe (einen für alle Gruppen, wenn sie mit **jede Gruppe** kombiniert werden) und einen pro Infrastrukturgebäude. Es gibt einen Chip für alle COGC-Programme, einen für die akzeptierten zusätzlichen Materialien und einen für alle Entfernungs-Auswahlen zusammen. Die Oberfläche bekommt einen Chip, wenn sie nicht nur Erdähnlich ist. Max. Sprünge allein erzeugt keinen Chip.

**Zurücksetzen** oben rechts geht zurück zu den Startfiltern und der Standardsortierung. Deine Vergleichs-Pins, die Ansicht und deine Spalten bleiben. Auf Handys steht es im Menü „⋯“.

Wenn kein Planet passt, sagt die Seite **Keine Planeten stimmen mit diesen Filtern überein. Probiere einen von diesen:** und bietet bis zu drei Änderungen an, jede mit der Zahl der Planeten, die sie ergeben würde, die meisten zuerst:

- einen deiner Chips entfernen;
- **Gasförmige Planeten einbeziehen**;
- **Alle zusätzlichen Baumaterialien akzeptieren**;
- ein höheres Max. Sprünge (3 mehr, bis 30), wenn du eine Entfernung gewählt hast.

Keine Sorge, das heißt nur, dass deine Filter zusammen keinen Planeten übrig lassen. Klick auf einen Vorschlag, um ihn anzuwenden.

Ergeben zwei Änderungen dasselbe Ergebnis, erscheint nur eine. Der Hinweis einer Namenssuche kann außerdem „Jede Oberfläche, fruchtbar oder nicht“, „Jedes COGC-Programm“ und „Jede Infrastruktur“ anbieten.

## Filterleiste {#filter-panel}

Die Überschrift der Leiste zählt deine aktiven Filter. Auf Bildschirmen ab 1.024 px Breite sitzt die Leiste neben den Ergebnissen. Der Doppelpfeil oben klappt sie zu einer schmalen Schiene ein und wieder auf. Unter 1.440 px beginnt sie bei jedem Besuch eingeklappt, damit die Ergebnisse den Platz bekommen. Ab 1.440 px merkt sich der Browser, ob du sie eingeklappt hast.

Auf kleinen Bildschirmen öffnet der Button _Filter_ die Filter in einer Schublade, und _n Planeten anzeigen_ unten schließt sie.

## Ergebnisse {#results}

Die Überschrift über den Ergebnissen lautet „n von gesamt Planeten“. Daneben wechselst du zwischen **Liste**, **Matrix** und **Chart**. Lange Listen laden beim Scrollen jeweils 100 Zeilen nach.

## Liste und Matrix {#list-and-matrix}

Die **Liste** zeigt die gesuchten Materialien als Kacheln neben den anderen Ressourcen. Sie hat außerdem Fruchtbarkeit, zusätzliche Baumaterialien, COGC und Infrastruktur sowie die Sprung-Spalten.

Die **Matrix** gibt jedem Material, das in den Ergebnissen vorkommt, eine eigene Spalte. Die gesuchten kommen zuerst (alphabetisch), dann ein blauer Trenner, dann die anderen. Die Schattierung einer Zelle wird mit höherem täglichem Abbau kräftiger, verglichen mit dem höchsten Wert dieses Materials auf irgendeinem Planeten. Ein Farbstreifen oben zeigt die Kategorie des Materials. Fahr mit der Maus über eine Überschrift für „auf n von gesamt Ergebnissen“ oder über eine Zelle für ihren Wert und ihren Anteil am Maximum.

> [!tip]
> Mit der Matrix entdeckst du am schnellsten Planeten mit zwei oder drei nützlichen Ressourcen auf einmal. Such ein Material und überflieg dann die anderen Spalten.

## Chart {#chart}

Das **Chart** zeichnet die Ergebnisse nach Entfernung und Ertrag.

- **Quer (X)**: die Sprünge zu deinen Entfernungs-Auswahlen oder, wenn du mehrere gewählt hast, zur am weitesten entfernten. Ohne Auswahl sind es die Sprünge zu einem Marktplatz, dem, der den gezeichneten Planeten insgesamt am nächsten ist (die wenigsten Sprünge in Summe). Die Achse nennt ihn, z. B. „Sprünge zu IC1 · nächster Marktplatz“.
- **Hoch (Y)**: der tägliche Abbau eines gesuchten Materials. Bei zwei oder mehr gesuchten Materialien wählt eine Auswahl, welches (standardmäßig das erste). Ohne gesuchtes Material ist Y die Fruchtbarkeit.
- **Punktgröße**: Fruchtbarkeit, skaliert innerhalb des Bereichs, den die Legende zeigt. Das gilt nur, wenn du nach einem Material suchst.

Als **bester Kompromiss** gelten die Planeten, die kein anderes Ergebnis in beiden Punkten schlägt: Keiner ist näher _und_ reicher. Das Chart hebt sie hervor und verbindet sie mit einer gestrichelten Linie. Alles unterhalb und rechts dieser Linie wird von einem von ihnen geschlagen.

Ein Beispiel: Planet A ist 2 Sprünge entfernt mit 10 /Tag, B 4 Sprünge mit 25 /Tag und C 5 Sprünge mit 20 /Tag. A und B sind beste Kompromisse: Kein Ergebnis ist näher als A, und keins innerhalb von 4 Sprüngen ist reicher als B. C ist keiner, weil B sowohl näher als auch reicher ist.

**Färben nach** wechselt zwischen **Bester Kompromiss** und **COGC**. Bei COGC bekommen die sechs häufigsten laufenden Programme eigene Farben, und der Rest teilt sich eine Farbe: „anderes oder kein COGC-Programm“ oder „kein COGC-Programm“, wenn kein anderes Programm läuft.

Auf Bildschirmen ab 1.024 px Breite fährst du mit der Maus über einen Punkt für seine Details, klickst ihn an, um ihn für den Vergleich anzupinnen, und doppelklickst, um einen Plan zu erstellen (wenn du abgemeldet bist, meldest du dich zuerst an). Auf Touch- und schmalen Bildschirmen tippst du auf einen Punkt für seine Details.

Die Liste neben dem Chart ordnet dieselben Planeten nach Y, mit „+“ und ☆ in jeder Zeile. Das Chart zeichnet bis zu 300 Ergebnisse, die ersten nach der aktuellen Sortierung, also entscheidet **Sortieren**, welche Planeten darauf landen. Unter dem Chart zählt die Seite die Planeten, die es nicht platzieren konnte: ohne Route, ohne das Material oder nicht fruchtbar.

## Die Ergebnisse lesen {#reading-the-results}

- **Material-Kacheln**: Der Farbbalken vergleicht den täglichen Abbau des Planeten mit dem höchsten Wert dieses Materials auf irgendeinem Planeten. Rot ist unter einem Viertel, dann Orange, dann Gelb und Grün über drei Vierteln. Fahr mit der Maus über den Balken für den Wert, das Maximum und den Prozentsatz. Hat zum Beispiel der reichste Planet 40 FEO /Tag, liegt ein Planet mit 25 bei 25 ÷ 40 = 62,5 %, sein Balken ist also gelb.
- **Frucht. %**: die Fruchtbarkeit, wie das Spiel sie zeigt, oder „—“, wenn der Planet nicht fruchtbar ist. Beim Sortieren kommen nicht fruchtbare Planeten zuletzt.
- **Zusätzliche Baumaterialien** (das Bau-Symbol): die Materialien, die eine Basis auf diesem Planeten braucht. Es listet immer MCG („Felsenoberfläche“) oder AEF („Gasförmige Oberfläche“). Fahr mit der Maus über eins, um zu sehen, warum, z. B. „Niedrige Schwerkraft“.
- **COGC · Infra**: das laufende COGC-Programm („—“ für keins) und die Infrastruktur des Planeten als LM, COGC, WAR, ADM und SHY.
- **Sprung-Spalten**: „—“ heißt, es gibt keine Sprungroute. Fahr mit der Maus darüber, um „Kolonieschiff erforderlich“ zu lesen.

## Bauplätze {#plots}

Jede Basis belegt einen [[plots|Bauplatz]] ihres Planeten, ebenso HQs und [[planetary-projects|planetare Projekte]] (COGC, Lagerhaus, lokaler Marktplatz und die anderen).

- Ein Planet, auf dem jeder Bauplatz belegt ist und es keine [[ghost-sites|Geisterplätze]] gibt, trägt ein rotes ⊘-Symbol neben seinem Namen, egal ob die Spalte Bauplätze an ist. Fahr mit der Maus darüber für die Details und das Datum.
- Die Spalte **Bauplätze** ist standardmäßig aus; schalte sie unter **Spalten** ein. Sie zeigt die freien Bauplätze von der Gesamtzahl des Planeten, so wie FIO den Planeten zuletzt gesehen hat (Datum per Mouseover), und markiert einen vollen Planeten rot mit **Voll**.
- Manche Planeten erlauben Geisterplätze. Ein voller Planet, der sie erlaubt, zeigt ein bernsteinfarbenes **Voll · Geisterplätze**, und der Tooltip zählt die bisherigen Geisterplätze.
- **Bauplätze unbekannt** heißt, PRUNplanner hat die Bauplätze des Planeten noch nicht gelesen.
- Sortier nach der Spalte, um die Planeten mit den meisten freien Bauplätzen zuerst zu sehen. Planeten mit unbekannten Bauplätzen kommen zuletzt.

Volle Planeten behalten ihren Platz in den Ergebnissen. Bauplätze sind kein Filter.

> [!warning]
> Geisterplätze sind für neue Spieler. Im Spiel gibt es sie auf Startplaneten. Ein neuer Spieler, der dort beginnt, kann sich auch dann noch niederlassen, wenn jeder Bauplatz belegt ist. Wenn dein Startplanet woanders lag, kannst du dich auf einem Planeten mit **Voll · Geisterplätze** nicht niederlassen.

## Sortieren {#sorting}

Klick auf eine Spaltenüberschrift, um danach zu sortieren, und noch einmal, um die Reihenfolge umzukehren. Materialien, Fruchtbarkeit und Bauplätze sortieren hoch zuerst. Name und Sprünge sortieren niedrig zuerst.

Umschalt+Klick auf eine weitere Überschrift fügt sie als Gleichstandsregel hinzu, bis zu vier Spalten (die Überschriften zeigen dann 1, 2, 3). Zum Beispiel listet „NC1-Sprünge, dann FEO /Tag“ die reichsten FEO-Planeten in jeder Entfernung. Umschalt+Klick auf eine Spalte, die schon in der Kette ist, kehrt sie um, ein zweites Mal entfernt sie.

Das Menü **Sortieren** macht dasselbe ohne Tastatur: **Sortieren nach**, **Dann nach**, **Niedrig zuerst** und **Hoch zuerst**. Wenn du keine eigene Sortierung gesetzt hast, zeigt das Menü die Standardsortierung: das erste gesuchte Material (hoch zuerst), sonst die Sprünge zur ersten Entfernungs-Auswahl, sonst der Name. Fällt eine sortierte Spalte weg, etwa ein Material, das du nicht mehr suchst, oder ein Plan, den du abgewählt hast, verwirft die Seite diese Sortierung.

## Spalten {#columns}

Das Menü **Spalten** blendet Spalten aus und ein: **Fruchtbarkeit**, **Bauplätze**, **Weitere Ressourcen** (nur Liste), **Zusätzliche Baumaterialien**, **COGC · Infrastruktur** und die vier Sprung-Spalten der Marktplätze. Im Chart wird es nicht angezeigt.

In der Matrix listet es außerdem jedes gefundene Material außer den gesuchten (die immer angezeigt werden), jeweils mit der Zahl der Ergebnisse, die es haben. **Alle** und **Keine** blenden sie alle auf einmal ein oder aus.

**Zurücksetzen** im Menü geht zurück zu den Standardspalten, also allem außer Bauplätze.

## Vergleichen {#compare}

Auf Bildschirmen ab 1.024 px Breite pinnst du mit ☆ bis zu vier Planeten an, um sie in der Leiste unten nebeneinander zu vergleichen. Ihre Kopfzeile klappt die Tabelle ein und aus.

Diese Zeilen sind vom Besten zum Schlechtesten eingefärbt, der beste Wert ist fett:

- Fruchtbarkeit;
- der tägliche Abbau jedes gesuchten Materials;
- die Sprünge zu jeder deiner Entfernungs-Auswahlen;
- **Freie {tier}-Arbeiter** für jede der fünf Stufen: freie Arbeiter minus die schon offenen Stellen, aus dem letzten [[popr|Bevölkerungsbericht]] des Planeten, den das Spiel wöchentlich veröffentlicht.

Zum Beispiel erscheinen 1.000 freie Techniker bei 400 offenen Stellen als 600. Der Wert fällt nie unter 0, auch wenn es mehr offene Stellen als freie Arbeiter gibt.

Ein Planet ohne Wert landet auf dem letzten Platz. Die anderen Zeilen (zusätzliche Baumaterialien, weitere Ressourcen, COGC, Infrastruktur und die Sprünge zu AI1 / CI1 / IC1 / NC1) sind einfacher Text, und eine Zeile, in der sich die Planeten unterscheiden, ist blau eingefärbt.

Pins sind Teil des Links, aber die Leiste erscheint nur auf größeren Bildschirmen.

> [!tip]
> Die Zeilen mit den freien Arbeitern sagen dir, wie viele Arbeiter eine neue Basis auf jedem Planeten einstellen könnte, Stand des letzten Bevölkerungsberichts.

## Speichern und teilen {#saving-and-sharing}

- **Link kopieren**: Die Adressleiste enthält immer die ganze Suche (Filter, Sortierung, Ansicht und Vergleichs-Pins), der Link teilt also genau das, was du siehst.
- **Suche speichern**: speichert die aktuellen Filter und die Ansicht unter einem Namen in diesem Browser. Der Name beginnt mit den Beschriftungen der Chips oder „Alle Planeten“. Eine gespeicherte Suche behält weder die Sortierung noch die Pins.
- **Gespeichert** lädt eine gespeicherte Suche. Unter **Verwalten** kannst du sie umbenennen, laden oder löschen. Löschen fragt nicht vorher nach.
- „+“ in einer Zeile öffnet einen neuen Plan für diesen Planeten in einem neuen Tab, deine Suche bleibt also, wo sie ist. Ohne Konto bittet dich „+“ zuerst, dich anzumelden, und öffnet dann den Plan.

Auf Handys stehen die gespeicherten Suchen, **Link kopieren** und **Zurücksetzen** im Menü „⋯“.

### Was dieser Browser sich merkt {#what-the-browser-remembers}

Manches bleibt nur in diesem Browser, nicht in deinem Konto: deine gespeicherten Suchen, ausgeblendete Spalten und Materialien, ob die Spalte Bauplätze an ist, die eingeklappte Filterleiste (ab 1.440 px Breite) und die letzte Ansicht. Ein Besuch ohne Link öffnet sich in deiner letzten Ansicht. Ein Link öffnet sich in seiner eigenen Ansicht.

> [!tip]
> Um eine Suche auf einem anderen Gerät zu behalten oder mit deiner Corporation zu teilen, nimm **Link kopieren** statt **Suche speichern**.

### Link-Parameter {#link-parameters}

Ein Link enthält nur, was von den Standardwerten abweicht. Du kannst auch selbst einen schreiben:

| Parameter | Bedeutung                           | Beispiel                      |
| --------- | ----------------------------------- | ----------------------------- |
| `q`       | Name oder ID                        | `q=Montem`                    |
| `m`       | Materialgruppen                     | `m=any:FEO\|MAG,all:H2O`      |
| `g`       | Gruppen kombinieren mit jede Gruppe | `g=any`                       |
| `d`       | Minimum pro Tag                     | `d=FEO:15`                    |
| `cogc`    | COGC-Programme                      | `cogc=ADVERTISING_METALLURGY` |
| `infra`   | Infrastruktur                       | `infra=LM,WAR`                |
| `fert`    | nur fruchtbar                       | `fert=1`                      |
| `surf`    | Oberflächen, r und/oder g           | `surf=rg`                     |
| `x`       | akzeptierte zusätzliche Materialien | `x=INS,SEA`                   |
| `ref`     | Entfernungs-Auswahlen               | `ref=cx:NC1`                  |
| `j`       | Max. Sprünge        | `j=5`                         |
| `sort`    | Sortierkette                        | `sort=mat:FEO:desc`           |
| `view`    | `matrix` oder `chart`               | `view=chart`                  |
| `pin`     | Vergleichs-Pins                     | `pin=OT-580b`                 |

Werte, die die Seite nicht erkennt, verwirft sie.

## Wenn die Planeten nicht laden {#errors}

Wenn das Laden fehlschlägt, sagt die Seite „Die Planeten konnten nicht geladen werden.“ und zeigt einen Button **Erneut versuchen**. Nach zu vielen Anfragen bittet sie dich, ein paar Sekunden zu warten, bevor du es noch einmal versuchst.
