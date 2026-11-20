**Basis-ROI** ordnet jede Möglichkeit, eine Basis zu betreiben, damit du siehst, welche Basen sich am schnellsten amortisieren, bevor du eine planst. Jede Zeile ist eine vollständige Basis: eine Ressource auf einem Planeten, ein Landwirtschaftsauftrag auf einem fruchtbaren Planeten oder ein Auftrag eines beliebigen anderen Produktionsgebäudes. Ein Konto brauchst du dafür nicht.

Du nutzt es, wenn du deine nächste Basis suchst und die Optionen nebeneinander vergleichen willst. Sieht eine Zeile interessant aus und du bist angemeldet, macht **Als Plan öffnen** daraus einen Plan, den du in jedem Detail ändern kannst.

> [!warning]
> Basis-ROI ist in einer Testphase und hat noch keinen Eintrag in der Navigation. Öffne es unter [/base-roi](/base-roi).

## Erster Besuch {#first-visit}

Wenn du die Seite zum ersten Mal öffnest, stellt **Basis-ROI einrichten** ein paar Fragen, damit die Tabelle zu deiner Spielweise passt:

- deine Marktplatz-Präferenz (nur wenn du angemeldet bist)
- **Wie streng soll die Tabelle sein?**: **Einsteiger**, **Standard** (vorausgewählt) oder **Veteran**
- das Schiff (nur Veteran: ein beliebiges Schiff oder **Kein Limit**, der Standard) und **Schiffsbesuche**, für wie viele Tage Fracht das Schiff pro Fahrt mitnimmt, rein und raus
- **Spalten wählen**: die Spalten der Voreinstellung, die du ändern kannst, bevor du **Starten** drückst

| Voreinstellung | Logistik                                                                    | Min. Marktkapazität | Lagerpuffer | Ausgeblendete Spalten                                 |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------- | ----------- | ----------------------------------------------------- |
| **Einsteiger** | SCB (500 t / 500 m³)                                     | 0,7                                 | 10 Tage     | Wochenrendite, Betriebskosten, Bauplätze, Belegschaft |
| **Standard**   | WCB (3.000 t / 1.000 m³) | 0,7                                 | 10 Tage     | Wochenrendite, Betriebskosten, Bauplätze, Belegschaft |
| **Veteran**    | dein Schiff oder kein Limit                                                 | 0 (beliebig)     | 10 Tage     | Betriebskosten                                        |

Eine Voreinstellung füllt nur Einstellungen aus, die du später auch in den [Einstellungen](#settings) ändern kannst, nichts, was du hier wählst, ist also endgültig. Schiff und **Schiffsbesuche** sind wichtig, weil sie das Logistiklimit festlegen: Die Tabelle blendet Basen aus, die zwischen zwei Besuchen mehr Fracht bewegen, als das Schiff trägt. Die minimale Marktkapazität blendet Basen aus, von denen der Markt weniger verkraftet als diese Zahl, etwa weniger als 0,7 Basen.

**Überspringen** oder das Schließen des Dialogs behält die aktuellen Einstellungen. So oder so öffnet sich der Dialog nicht mehr von selbst, aber **Einrichtung erneut starten** in den Einstellungen holt ihn zurück. Alle Einstellungen liegen nur in diesem Browser, nicht in deinem Konto.

## Was jede Basis annimmt {#assumptions}

Jede Zeile ist eine vollständige Basis mit 500 Fläche (eine [[area-permits|Genehmigung]]) mit der optimalen Aufteilung des Gebäudes. PRUNplanner berechnet sie mit derselben Engine wie deine [[plan|Pläne]] und bepreist sie mit der gewählten [[exchange-preference|Marktplatz-Präferenz]], oder mit Universe-30D-Preisen, wenn du nicht angemeldet bist oder „None - Universe 30D“ gewählt hast. Jede Basis nimmt außerdem an:

- Beide [[luxuries|Luxusgüter]] für jede Stufe.
- [[experts|Experten]] nur im eigenen [[expertise|Fachgebiet]] des Gebäudes, wie in den Einstellungen festgelegt.
- Das COGC aus den Einstellungen, nie das echte Programm des Planeten. Die Details zeigen das echte Programm des Planeten als „(nicht angewendet)“. Im Spiel stimmen die Bewohner des Planeten über das Programm ab, und der Gewinner läuft eine Woche lang, das echte Programm kann sich also von Woche zu Woche ändern.
- Auftragszeilen laufen auf einem Standardplaneten: felsig, normale Schwerkraft, normaler Druck und normale Temperatur, nicht fruchtbar und ohne Produktionsgebühren.

Unten in den Einstellungen steht dasselbe: „Alle Zeilen nutzen das hier eingestellte COGC und die Experten; Auftragszeilen laufen auf einem Standardplaneten.“

## Zeilenarten {#row-kinds}

- **Ressource**: eine Ressource auf einem Planeten, mit RIG, EXT oder COL und den Umweltmaterialien des Planeten in den Baukosten. PRUNplanner berechnet nur Planeten innerhalb von **Max. Sprünge (Planetenzeilen)** und Ressourcen mit einem täglichen [[extraction|Abbau]] über 0. Die Zeile zeigt „@ Planet · N Sprünge“, die [[jumps|Sprünge]] zum nächsten Marktplatz deiner Marktplatz-Präferenz, oder zu allen vier Marktplätzen, wenn du keine hast.
- **Landwirtschaft**: ein FRM- oder ORC-Auftrag auf einem fruchtbaren Planeten, mit der Fruchtbarkeit des Planeten im Ertrag. Auch sie zeigt „@ Planet · N Sprünge“. Das Kästchen **Ressourcen** in **Zeilenarten** blendet diese Zeilen zusammen mit den Ressourcenzeilen ein oder aus.
- **Auftrag**: ein Auftrag eines beliebigen anderen Produktionsgebäudes, auf dem Standardplaneten. Nutze **Auf einem Planeten testen** in den Details der Zeile, um ihn auf einem echten Planeten zu sehen.

## Kennzahlen {#metrics}

- **Täglicher Profit**: Umsatz minus Inputs, Verbrauchsgüter, [[degradation|Abnutzung]] und [[production-fees|Produktionsgebühren]]. Die Abnutzung sind die Baukosten der Produktionsgebäude ÷ 180. Planetenzeilen zahlen die Gebühren ihres Planeten (die Gebühr des Planeten pro Tag × Effizienz × Gebäude). Auftragszeilen auf dem Standardplaneten zahlen keine. Mit **Aufbau ab 0** ist das der Profit bei 5 Experten, sonst bei der festen Anzahl.
- **Amortisation**: Tage, bis die Baukosten zurückgezahlt sind. Mit **Aufbau ab 0** startet eine neue Basis ohne Experten. Die Stufen mit 0, 1, 2, 3 und 4 Experten dauern 10, 12,5, 57,57, 276,5 und 915,1 Tage, jeweils geteilt durch die Zahl der Produktionsgebäude. Umsatz, Inputs und Produktionsgebühren wachsen mit dem Expertenbonus, Verbrauchsgüter und Abnutzung bleiben gleich. Sie zeigt „nie“, wenn die Basis keinen Profit macht (mit dem Aufbau: bei 5 Experten). Keine Sorge, wenn du das selten siehst: Diese Zeilen haben einen täglichen Profit von 0 oder weniger, sie erscheinen also nur, solange **Negative anzeigen** an ist.
- **Wochenrendite**: 7 × täglicher Profit ÷ Baukosten.
- **Baukosten**: der Bau plus die Optionen in den Einstellungen, also der Pufferbestand (Puffertage × (Inputs + Verbrauchsgüter + Umsatz) ÷ 2) und das HQ-Upgrade für eine weitere Genehmigung.
- **Tägliche Betriebskosten**: Inputs + Verbrauchsgüter + Abnutzung + Produktionsgebühren. Die Spalte ist ausgeblendet, bis du sie in **Spalten** einschaltest, weil der Pufferbestand in den Baukosten die Betriebskosten für den Anfang schon abdeckt.
- **Fracht / Tag**: zwei Zahlen, Tonnen und m³, jeweils der größere Wert von dem, was die Basis pro Tag rein- und rausbewegt. Der Tooltip listet rein und raus getrennt auf, zusammen mit der Schiffsprüfung. Die Sortierung nutzt die größere der beiden Zahlen, Tonnen und m³ gleichermaßen.
- **Marktkapazität**: wie viele Basen wie diese der Markt verkraftet. Für jeden Output ist das das gehandelte Volumen pro Tag (alles, was in den letzten 7 Tagen gehandelt wurde, ÷ 7, Tage ohne Handel zählen also mit) ÷ das, was die Basis pro Tag herstellt. Für jeden Auftrags-Input ist es das gehandelte Volumen ÷ das, was die Basis pro Tag braucht. Nebenprodukte zählen als Outputs, Verbrauchsgüter der Belegschaft zählen nicht. Der niedrigste Wert zählt. (O) oder (I) zeigt, welche Seite begrenzt, und der Tooltip nennt das Material. Unter 1 (gelb angezeigt) stellt eine Basis mehr her oder braucht mehr, als der Markt handelt. Der Tooltip nennt auch den Anteil einer Basis am gehandelten Volumen (1 ÷ Marktkapazität, in Prozent). Siehe [[market-capacity|Marktkapazität]].
- **Industrie**: die Industrie der Basis, abgekürzt (Food für Lebensmittelindustrie, Fuel für Treibstoffherstellung, Extraction für Ressourcengewinnung).
- **Bauplätze**: freie [[plots|Bauplätze]] auf dem Planeten, für Planetenzeilen. Sortiere danach, um die leersten Planeten zu finden. Auftragszeilen zeigen einen Strich.
- **Belegschaft**: die Arbeiter, die die Basis pro Stufe braucht (PIO, SET, TEC, ENG, SCI). Kann der Planet die Basis nicht besetzen, sagt eine gelbe Zeile, wie viele frei sind, oder „Kein Bevölkerungsbericht“.
- **Profit, 30 Tage**: der tägliche Profit mit dem täglichen [[vwap|VWAP]] des Marktplatzes jedes Materials über die letzten 30 Tage, als kleines Diagramm. Tage ohne Handel behalten den letzten Preis, und Materialien ohne Verlauf behalten den heutigen Preis. ASK, BID und Festpreise haben keinen Verlauf.
- **⚠**: ein Material, das aus einem VWAP 7D oder 30D bepreist wird und dessen [[bid|Bid]] oder [[ask|Ask]] mehr als 30 % von diesem Preis abweicht. Es ist ein Hinweis, dass der tägliche Profit ganz anders aussehen kann, wenn du am Orderbuch statt zum Durchschnitt handelst. Das Popover listet den täglichen Profit für jede Kombination aus Bid und Ask dieser Materialien, den niedrigsten zuerst. Bei mehr als 100 Kombinationen zeigt es nur die zwei Extreme: Kauf zum Ask und Verkauf zum Bid, und umgekehrt.

### Rechenbeispiel {#metrics-example}

Die Zahlen hier sind ausgedacht und rund, mit fester Expertenzahl, damit die Rechnung leicht nachzuvollziehen bleibt.

- Eine Basis hat Baukosten von 700.000 ȼ und macht 20.000 ȼ pro Tag. Die Amortisation ist 700.000 ÷ 20.000 = 35 Tage, und die Wochenrendite ist 7 × 20.000 ÷ 700.000 = 20 %.
- Ein Teil dieser Baukosten ist der Lagerpuffer. Mit 10 Puffertagen, Inputs von 3.000 ȼ, Verbrauchsgütern von 1.000 ȼ und einem Umsatz von 8.000 ȼ pro Tag sind das 10 × (3.000 + 1.000 + 8.000) ÷ 2 = 60.000 ȼ.
- Die Basis stellt 300 Einheiten ihres Outputs pro Tag her, und der Markt handelt im Schnitt über 7 Tage 900 pro Tag: 900 ÷ 300 = 3 Basen. Ihr Auftrag braucht 200 Einheiten eines Inputs pro Tag, der mit 400 pro Tag gehandelt wird: 400 ÷ 200 = 2 Basen. Der niedrigere Wert zählt, die Marktkapazität ist also 2 (I), und der Anteil einer Basis am gehandelten Volumen dieses Inputs ist 1 ÷ 2 = 50 %.

Mit **Aufbau ab 0** ist die Amortisation länger als Baukosten ÷ täglicher Profit, weil die frühen Stufen mit weniger Experten laufen. Im Spiel kommen Experten mit der Zeit, wenn du die Produktionsgebäude dieses Fachgebiets betreibst, und mehr Gebäude bringen sie schneller. Der Aufbau bildet das ab: Jede Stufe wird durch die Zahl der Produktionsgebäude geteilt.

> [!tip]
> Eine kurze Amortisation mit einer Marktkapazität unter 1 ist eine Falle, weil schon eine Basis den Markt überschwemmt. Sortiere nach Amortisation und prüf dann, ob die Marktkapazität deutlich über der Zahl der Basen liegt, die du planst.

## Einstellungen {#settings}

Das Einstellungsfeld steht über der Tabelle. Ist es geschlossen, zeigt es eine einzeilige Zusammenfassung der Einstellungen, die die Tabelle prägen.

| Einstellung                                                          | Standard                                                                                                             | Optionen                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **COGC (alle Zeilen)**                            | **Passendes Programm** (das Programm für das eigene Fachgebiet des Gebäudes)                      | **Keins**                                                            |
| **Experten**                                                         | **Aufbau ab 0**                                                                                                      | 0 bis 5, fest                                                        |
| **Lagerpuffer**                                                      | 10 Tage                                                                                                              | **Aus**, 1 bis 10, 14, 21 oder 28 Tage                               |
| **Logistiklimit**                                                    | **Nach Schiff**: WCB, alle 3 Tage                                                                    | **Manuell** (600 t und 200 m³ pro Tag), **Keins** |
| **Ziel-Genehmigung (HQ-Kosten)**                  | **Aus**                                                                                                              | 2 bis 50                                                             |
| **Max. Sprünge (Planetenzeilen)** | 7                                                                                                                    | jede ganze Zahl ab 0                                                 |
| **Min. Marktkapazität**                              | 0,7 Basen                                                                                                            | 0,0 bis 1,0 in Schritten von 0,1                                     |
| **Zeilenarten**                                                      | **Ressourcen** und **Aufträge** an; **Negative anzeigen** und **Planeten ohne Arbeiter oder Bauplätze anzeigen** aus |                                                                      |

- **Logistiklimit**: **Nach Schiff** wählt ein Schiff (TCB bis HCB, jeweils mit seinen t und m³) und wie oft es kommt („Alle … Tage“). Das Schiff muss so viele Tage Fracht tragen, rein und raus, nach Gewicht und nach Volumen. Die Tabelle blendet Zeilen aus, die mehr brauchen. **Manuell** legt das Limit pro Tag fest, und **Keins** begrenzt nichts. Ein Beispiel: Das Standard-WCB (3.000 t / 1.000 m³) alle 3 Tage erlaubt eine Basis, die bis zu 3.000 ÷ 3 = 1.000 t und 1.000 ÷ 3 ≈ 333 m³ pro Tag bewegt, gezählt wird der größere Wert von rein und raus.
- **Lagerpuffer**: Lager für so viele Tage Fracht. PRUNplanner fügt STO oder STA hinzu. Passt die Basis dann nicht mehr in 500 Fläche, lässt es ein Produktionsgebäude weg, bis sie passt.
- **Ziel-Genehmigung (HQ-Kosten)**: rechnet die Materialien für diese HQ-Stufe zu CX-Kaufpreisen zu den Baukosten jeder Zeile. Die Kosten zählen ab 3, 2 fügt also nichts hinzu. Im Spiel bringt dir jedes HQ-Upgrade eine weitere Basis-Genehmigung, das zeigt also, was die Basis auf dieser Genehmigung kostet, inklusive des Upgrades auf diese HQ-Stufe.
- **Max. Sprünge (Planetenzeilen)**: gezählt zum nächsten Marktplatz deiner Marktplatz-Präferenz, den die Einstellung nennt. Planeten ohne Route gelten als zu weit.
- **Min. Marktkapazität** steht neben der Suche über der Tabelle und blendet Zeilen darunter aus.
- **Negative anzeigen**: Ist es aus, blendet die Tabelle Zeilen mit einem täglichen Profit von 0 oder weniger aus.
- **Planeten ohne Arbeiter oder Bauplätze anzeigen**: standardmäßig aus. Die Tabelle blendet dann Planetenzeilen aus, wenn keine neue Basis passt (alle Bauplätze belegt und keine [[ghost-sites|Geisterplätze]]) oder wenn der neueste [[popr|Bevölkerungsbericht]] die Arbeitsplätze der Basis nicht füllen kann, gezählt werden freie Arbeiter abzüglich der schon offenen Stellen. Ein Planet ohne Bevölkerungsbericht gilt als ohne Arbeiter. Schalte es ein, um diese Zeilen zu sehen, und schalte die Spalte **Belegschaft** ein, um zu sehen, was fehlt. Auftragszeilen werden nicht geprüft. Können die Berichte nicht geladen werden, sagt die Seite das, und nichts wird ausgeblendet.
- **Auf Standard zurücksetzen** setzt die Einstellungen zurück, behält aber deine Spalten, die offenen oder geschlossenen Felder und Diagramme und den Zeitraum und die Zusammenfassung der Diagramme.
- **Einrichtung erneut starten** öffnet den Dialog des ersten Besuchs.

Ein Planet, der voll ist, aber Geisterplätze hat, bleibt in der Tabelle. Im Spiel lassen Geisterplätze nur neue Spieler, die auf diesem Planeten beginnen, dort siedeln, prüf also die Spalte **Bauplätze**, wenn deine Firma woanders begonnen hat.

Nur COGC, Experten, Lagerpuffer, max. Sprünge und die Marktplatz-Präferenz lassen PRUNplanner die Zeilen neu berechnen. Jede andere Einstellung gilt sofort.

> [!warning]
> Wählst du oben im Auswahlfeld eine Marktplatz-Präferenz (nur angemeldet), wird sie auch zu deiner Standard-Marktplatz-Präferenz. Andere Seiten, die deinem Standard folgen, wechseln mit.

### Ausgeblendete Zeilen {#hidden-rows}

Die Zeile über der Tabelle zählt die Zeilen und die ausgeblendeten pro Limit: „max. Sprünge“, „Logistik“, „Marktkapazität“, „keine Bauplätze“, „keine Arbeiter“ und „negativer Profit“. Jede Zeile zählt einmal, bei ihrem ersten Limit in dieser Reihenfolge. „keine Bauplätze“ und „keine Arbeiter“ zählen nur, solange **Planeten ohne Arbeiter oder Bauplätze anzeigen** aus ist, und „negativer Profit“ nur, solange **Negative anzeigen** aus ist. Die Suche ist kein Limit und wird nicht gezählt.

Bleibt keine Zeile übrig, sagt die Tabelle „Keine Basis erfüllt diese Einstellungen.“ Keine Sorge: Solange die Seite nicht sagt, dass eine Anfrage fehlgeschlagen ist, heißt das nur, dass deine Einstellungen oder deine Suche nichts zum Anzeigen übrig lassen. Die Zahlen über der Tabelle sagen dir, welche Limits Zeilen ausgeblendet haben, damit du weißt, welche Einstellung du ändern musst.

## Profit-Diagramm {#profit-chart}

Über der Tabelle zeigt **Täglicher Profit nach Branche** den täglichen Profit jeder Industrie über den gewählten Zeitraum (90 Tage, solange du ihn nicht änderst). Auf Bildschirmen ab 1.536 px Breite steht es neben den Einstellungen.

- Jede Basis zählt danach, wie viel von ihrem Material der Markt handelt (7-Tage-Schnitt ihrer Outputs).
- Die vielen Planeten einer Ressource oder eines Landwirtschaftsauftrags zählen als einer: der Mittelwert der 3 Planeten mit dem höchsten täglichen Profit, damit schwache Planeten die Linie nicht nach unten ziehen.
- Es folgt den Einstellungen und Limits der Tabelle.
- Es zeigt die 7 meistgehandelten Linien und sagt, wie viele es noch gibt.

Klick auf den Titel, um das Diagramm einzuklappen, und es bleibt eingeklappt. Mit der Suche kannst du tiefer einsteigen:

- eine Industrie (z. B. „Chemistry“) zeigt ihre Gebäude
- ein Gebäude (z. B. „CHP“) zeigt seine Materialien
- ein Material (z. B. „SC“) zeigt die Aufträge, die es herstellen

Eine Suche, die nur ein Gebäude oder eine Industrie übrig lässt, steigt ebenfalls tiefer ein.

Jedes Verlaufsdiagramm hat oben rechts einen Zeitraum (**7T**, **30T** oder **90T**) und eine Zusammenfassung (**1T**, **3T** oder **7T** pro Punkt), wie die Diagramme im Spiel. Eine längere Zusammenfassung glättet das tägliche Rauschen. Deine Wahl gilt für alle diese Diagramme und wird gespeichert. Die Spalte **Profit, 30 Tage** der Tabelle zeigt immer 30 Tage.

## Diagramm {#chart}

**Chart** oben öffnet **Amortisation vs. Marktkapazität** in einer Schublade, deren Größe du ändern kannst. Es zeichnet die Zeilen, die die Tabelle zeigt, Suche eingeschlossen:

- waagerecht die Amortisation in Tagen und senkrecht die Marktkapazität in Basen, beide auf logarithmischen Skalen
- die Punktgröße ist der tägliche Profit, die Farbe die Zeilenart
- die gestrichelte Linie verbindet die besten Kompromisse: Zeilen, die keine andere Zeile sowohl bei kürzerer Amortisation als auch bei höherer Marktkapazität schlägt

Zeilen, die sich nie auszahlen oder keine Marktkapazität haben, werden nicht gezeichnet, aber die Schublade zählt sie. Fahr mit der Maus über einen Punkt, um die Tabelle zu seiner Zeile zu scrollen. Der Button ist aus, solange keine Zeile angezeigt wird, und die Schublade bleibt offen oder geschlossen, wie du sie verlassen hast.

> [!tip]
> Die linke obere Ecke des Diagramms ist, wo du hinwillst: schnelle Amortisation und Platz im Markt. Fahr dort mit der Maus über die Punkte, um ihre Zeilen zu finden.

## Suche und Tooltips {#search-and-tooltips}

- Die Suche über der Tabelle filtert nach Industrie, Gebäude oder Output-Ticker.
- Die Tabelle ordnet Zeilen nach Amortisation, die kürzeste zuerst, und bei gleicher Amortisation nach dem höheren täglichen Profit. Klick auf eine Spaltenüberschrift, um stattdessen danach zu sortieren (Material, Belegschaft und Profit, 30 Tage sortieren nicht). Die Tabelle zeigt 50 Zeilen pro Seite.
- Fahr mit der Maus über eine Spaltenüberschrift, um zu sehen, was sie bedeutet, oder über eine Zahl für die Überschlagsrechnung dahinter.

## Details {#details}

Klapp eine Zeile auf, um unter **Profitverlauf** zwei Diagramme zu sehen, mit der vollständigen Rechnung darunter.

- Profit: Umsatz, Betriebskosten und täglicher Profit, jede Linie auf einer ȼ-Skala.
- Marktvolumen: wie viele Basen der Markt jeden Tag trägt, aus dem gehandelten CX-Volumen dieses Tages. **Outputs** ist das gehandelte Volumen des knappsten Outputs ÷ das, was eine Basis pro Tag verkauft. **Inputs (Engpass)** ist dasselbe für den Auftrags-Input mit dem geringsten Volumen pro Einheit, die der Auftrag braucht. Es ist die Spalte Marktkapazität, Tag für Tag.

Beide Diagramme folgen dem Zeitraum und der Zusammenfassung der Verlaufsdiagramme. Die Rechnung kommt in acht Abschnitten: **Layout und Baukosten**, **Logistik und Lager**, **Produktionseffizienz**, **Durchläufe**, **Ertrag**, **Geld pro Tag** (mit Verbrauchsgütern, Abnutzung und Produktionsgebühren), **Amortisation** (jede Expertenstufe und der Tag, an dem sie abbezahlt ist) und **Marktkapazität**. **Als Text kopieren** kopiert alles.

**Auf einem Planeten testen** (nur Auftragszeilen) lässt dich einen beliebigen Planeten wählen, und PRUNplanner berechnet die Zeile dort mit den Einstellungen der Tabelle. Eine Zeile vergleicht Baukosten und Amortisation mit dem Standardplaneten, und **Zurück zum Standardplaneten** macht das rückgängig. PRUNplanner vergisst die Wahl, wenn sich die Details schließen.

**Als Plan öffnen** (angemeldet) erstellt und speichert sofort einen Plan und öffnet ihn. Der Plan heißt „Base ROI“ mit den Outputs und dem Gebäude und bekommt dieselbe Aufteilung. Er kommt auf den Planeten der Zeile, den Planeten, den du getestet hast, oder Montem (OT-580b) bei einer Auftragszeile. Er kommt in eines deiner Imperien mit derselben Marktplatz-Präferenz und ohne Fraktionsbonus für das Gebäude. Ohne ein solches Imperium kommt er in keines, und ein Hinweis sagt, dass der tägliche Profit des Plans abweichen kann. Planetenzeilen verlinken außerdem „… öffnen“, um einen Plan auf diesem Planeten zu beginnen.

> [!tip]
> Eine Auftragszeile hat keine Produktionsgebühren. Nutze zuerst **Auf einem Planeten testen**: Die Zahlen enthalten dann die Gebühren dieses Planeten, und **Als Plan öffnen** setzt den Plan dorthin statt auf Montem.

## Laden {#loading}

Auftragszeilen erscheinen zuerst, dann die Planetenzeilen („Lade Planetenzeilen…“). Eine Fortschrittszeile zeigt jeden Schritt. Schlägt eine Anfrage fehl, sagt die Seite das. Ändere eine Einstellung oder lade die Seite neu, um es noch einmal zu versuchen. Beim ersten Laden erscheinen die Auftragszeilen, sobald sie fertig sind, sodass du sie dir ansehen kannst, während die Planetenzeilen noch berechnet werden.
