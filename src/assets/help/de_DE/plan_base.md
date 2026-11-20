Das Basis-Setup entscheidet, welche Preise und Boni für deine Basis gelten, wie viele Arbeiter untergebracht und versorgt werden und was die [[efficiency|Effizienz]] deiner Gebäude anhebt. Im Standard-Layout ist es die Gruppe von Bereichen links im Plan: **Imperium & Preise**, **Planet**, **Belegschaft**, **Infrastruktur** und **Experten**. Zusammen enthalten sie alles an der Basis, was kein Produktionsgebäude ist, und jede Änderung hier fließt direkt in die [Produktion](/help/plan_production) und die [Ergebnisse](/help/plan_results).

## Ein neuer Plan {#new-plan}

Ein neuer Plan startet mit diesen Einstellungen:

| Einstellung            | Startwert                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| COGC-Programm          | Das aktuelle Programm des Planeten; **Keine**, wenn er keins hat |
| **Corp.-HQ**           | Aus                                                              |
| **Genehmigungen**      | 1 (Fläche 500)                                                   |
| Luxusgüter             | Beide an, für jede Stufe                                         |
| Experten               | Keine                                                            |
| **Auto** (Unterkünfte) | An                                                               |
| Imperium               | Siehe [Imperium & Preise](#empire-and-prices)                    |

## Imperium & Preise {#empire-and-prices}

Ein Plan rechnet mit einem [[empire|Imperium]]. Er übernimmt dessen [[faction|Fraktion]] und Genehmigungen sowie seine [[exchange-preference|Marktplatz-Präferenz]] für jeden Preis. Das Imperium entscheidet also, welche deiner Gebäude einen Fraktionsbonus bekommen und wie groß er ist (siehe [Fraktionsbonus](#faction)), und zu welchen Preisen der Plan kauft und verkauft.

**Mit Imperium berechnen** listet deine Imperien mit Namen auf, und die, in denen der Plan ist, beginnen mit „»“. Bei einem schreibgeschützten Plan oder wenn du keine Imperien hast, erscheint es nicht.

Öffnest du einen Plan, wählt er dein aktuelles Imperium, wenn der Plan darin ist, sonst das erste Imperium, in dem der Plan ist. Ein Plan in keinem Imperium nutzt dein erstes Imperium. Dein aktuelles Imperium ist das Standard-Imperium aus dem [Profil](/profile), und ein Wechsel des Imperiums auf der Seite [Imperium](/empire) ändert es.

Bei einem gespeicherten Plan ändert die Wahl eines anderen Imperiums nur, wie diese Seite rechnet. Der Plan wird dadurch weder diesem Imperium hinzugefügt noch aus einem anderen entfernt, und die Wahl wird nicht gespeichert. Ein neuer Plan kommt in das Imperium, das du gewählt hast, wenn du ihn zum ersten Mal speicherst. In welchen Imperien ein Plan liegt, legst du in der [Verwaltung](/manage) fest.

Der Hinweis darunter („Fraktion …, Genehmigungen aus dem Imperium. Plan ist in … Imperien.“) nennt die Fraktion, deren Bonus gilt, und wie viele Imperien den Plan enthalten.

**Preise** zeigt den Namen der Marktplatz-Präferenz des Imperiums, als Link zu dieser Präferenz unter [Marktplätze](/exchanges) für diesen Planeten. Ohne Präferenz steht dort **Universe · VWAP 30D (keine Präferenz)**, also der 30-Tage-[[vwap|VWAP]] über alle Marktplätze.

Aus diesem Preisbuch bewertet der Plan, was er verkauft, zum Verkaufspreis. Was er kauft (Inputs, Verbrauchsgüter der Belegschaft, Baumaterialien), bewertet er zum Kaufpreis. Unter [Marktplätze](/help/exchanges#how-a-price-is-found) steht, wie ein Preis gefunden wird und wie du Preise festlegst oder pro Planet setzt.

> [!tip]
> Zwei Imperien mit unterschiedlichen Marktplatz-Präferenzen können für denselben Plan sehr unterschiedliche Profite zeigen. Stell **Mit Imperium berechnen** um, um einen Plan gegen den Markt zu prüfen, auf dem du wirklich verkaufen würdest.

### Fraktionsbonus {#faction}

Eine Fraktion hebt die Gebäude ihrer [[expertise|Fachgebiete]] an. PRUNplanner rechnet den Bonus als Faktor auf die Effizienz des Gebäudes:

1 + Bonus × 2 × (3 − 2 × genutzte Genehmigungen ÷ Genehmigungen gesamt)

Die Genehmigungen sind die des Imperiums, wie in seinen Einstellungen festgelegt. Nutzt du alle, bekommst du 1 + 2 × Bonus. Nutzt du weniger, bekommst du mehr.

| Fraktion       | Fachgebiet und Bonus                                         |
| -------------- | ------------------------------------------------------------ |
| Antares        | Elektronik 5 %                                               |
| Benten         | Fertigung 5 %                                                |
| Hortus         | Landwirtschaft 3 %, Lebensmittelindustrie 2 %                |
| Moria          | Metallurgie 2 %, Bauwesen 3 %                                |
| Outside Region | Chemie, Treibstoffherstellung und Ressourcengewinnung je 2 % |

Ein Antares-Imperium, das alle seine Genehmigungen nutzt, gibt Elektronikgebäuden zum Beispiel 1 + 0,05 × 2 = 1,10, also +10 %.

## Planet {#planet}

Der Bereich **Planet** legt fest, was der Planet deiner Basis gibt: sein COGC-Programm, ein Corporation-HQ, deine Genehmigungen und seine Ressourcen.

### COGC-Programm {#cogc}

Die Auswahl **COGC** wählt das [[cogc|COGC]]-Programm des Planeten. Du kannst **Keine** wählen, eines der neun Fachgebietsprogramme (Landwirtschaft bis Ressourcengewinnung) oder eines der fünf Belegschaftsprogramme (Pioniere bis Wissenschaftler).

Ein neuer Plan startet mit dem Programm, das der Planet gerade hat. Du kannst jedes andere wählen, um vorauszuplanen, denn die Bewohner stimmen darüber ab, und es kann sich jede Woche ändern.

Ein Fachgebietsprogramm multipliziert die Effizienz jedes Gebäudes dieses Fachgebiets mit 1,25 (+25 %). Ein Belegschaftsprogramm multipliziert die Effizienz jedes Gebäudes, das diese Stufe beschäftigt, mit 1,1 (+10 %). In der Produktion wird das Fachgebiet eines Gebäudes grün mit ✓, wenn das Programm es anhebt.

### Corp.-HQ {#corp-hq}

Hake **Corp.-HQ** an, wenn die [[corp-hq|Corporation]], zu der du gehörst, ihr Hauptquartier auf diesem Planeten hat (das HQ deiner eigenen Firma zählt nicht). Es multipliziert die Effizienz jedes Produktionsgebäudes mit 1,1 (+10 %) und ist standardmäßig aus.

### Genehmigungen und Fläche {#permits}

**Genehmigungen** (1 bis 3) legt fest, wie viele Basisgenehmigungen du auf diesem Planeten nutzt. Die Fläche daneben ist 250 + 250 × Genehmigungen: 500, 750 oder 1.000. Das Ergebnis **Fläche** zeigt, wie viel davon die Basis nutzt (siehe [Ergebnisse](/help/plan_results#area)). Das [[core-module|Kernmodul]] belegt immer 25 davon, und jedes Produktionsgebäude, jede Unterkunft und jedes Lagergebäude belegt seine eigene Fläche × Anzahl.

Im Spiel bringt dir jedes Upgrade der Stufe deines Firmen-HQs eine weitere Basisgenehmigung. Dieses Feld legt nur die Fläche des Plans fest. Der Fraktionsbonus zählt stattdessen die Genehmigungen des Imperiums (siehe [Fraktionsbonus](#faction)).

### Ressourcen {#resources}

**Ressourcen** zeigt eine Kachel für jede Ressource des Planeten. Die Zahl darauf ist, was ein Extraktor pro Tag bei 100 % Effizienz fördert.

Klick auf eine Kachel, um diese Ressource abzubauen. Hat der Plan noch nicht den passenden Extraktor (EXT für Mineralien, COL für Gase, RIG für Flüssigkeiten), fügt PRUNplanner einen mit Anzahl 1 hinzu. Außerdem fügt es den Auftrag dieser Ressource mit 1 hinzu, sofern der Extraktor ihn nicht schon laufen lässt. Danach stellst du die Anzahl in der Produktion ein.

Ist **Plan-Vorschläge** an und gibt es Planeteneinblicke, öffnet ein Link unter den Kacheln („… Pläne auf … · was andere hier bauen“), was andere Spieler auf diesem Planeten planen. Mehr dazu unter [Layout](/help/plan_layout).

### Fruchtbarkeit {#fertility}

[[fertility|Fruchtbarkeit]] zählt nur für Farmen (FRM und ORC). Ihre Effizienz bekommt den Faktor 1 + Fruchtbarkeit × 10 ÷ 33, positive Fruchtbarkeit beschleunigt sie also, negative bremst sie. Auf einem Planeten, der gar nicht fruchtbar ist, laufen Farmen mit 0 %, und die Produktion zeigt „Planet ist nicht fruchtbar“.

> [!tip]
> Jedes Gebäude braucht außerdem die [[extra-building-materials|zusätzlichen Baumaterialien]] des Planeten für Oberfläche, Schwerkraft, Druck und Temperatur. Sie stecken in den Baukosten hinter **Amortisation** und im Werkzeug Konstruktion, ein rauer Planet zeigt sich also als längere Amortisation.

## Belegschaft {#workforce}

**Belegschaft** hat einen Eintrag für jede Stufe der [[workforce|Belegschaft]], deren Arbeiter der Plan braucht. Jeder zeigt:

- „Bedarf / untergebracht“: die Arbeiter, die deine Gebäude brauchen, und die Betten, die deine Unterkünfte bieten, mit einer Anzeige;
- die **Effizienz** der Stufe in %;
- **Luxusgüter**: zwei Buttons, einer pro [[luxuries|Luxusgut]], mit seinem Ticker, ✓ wenn versorgt;
- „… frei“: freie Betten, rot und negativ, wenn der Stufe Betten fehlen.

Ein negatives „… frei“ heißt nur, dass die Stufe mehr Arbeiter als Betten hat. Füge Unterkünfte unter [Infrastruktur](#infrastructure) hinzu oder schalte [Auto](#auto-habs) ein, damit PRUNplanner sie für dich auswählt.

Stufen, die der Plan nicht braucht, bleiben hinter „… anzeigen (nicht benötigt)“. In den **Darstellung**-Optionen des Layouts kannst du die Belegschaft als Tabelle (**Stufe**, **Bedarf / untergebracht**, **Frei**, **Luxusgüter**, **Effizienz %**) oder mit allen Stufen offen zeigen (siehe [Layout](/help/plan_layout)).

### Wie die Effizienz berechnet wird {#workforce-efficiency}

Die Effizienz einer Stufe ist:

- der Anteil ihrer Arbeiter mit einem Bett (höchstens 100 %),
- × 79,4 % als Basis,
- × 12/11, wenn ihr erstes Luxusgut versorgt ist,
- × 15/13, wenn ihr zweites Luxusgut versorgt ist.

| Versorgte Luxusgüter | Effizienz (alle untergebracht) |
| -------------------- | ------------------------------ |
| Keine                | 79,4 %                         |
| Nur das erste        | 86,7 %                         |
| Nur das zweite       | 91,7 %                         |
| Beide                | 100 %                          |

Fehlende Betten senken den ersten Faktor. Ein Beispiel (ausgedachte Zahlen): Ein Plan, der 100 Pioniere braucht, aber nur Betten für 50 hat, bringt die Hälfte unter. Ohne Luxusgüter läuft die Stufe mit 50 % × 79,4 % = 39,7 %, mit beiden Luxusgütern mit 50 % × 100 % = 50 %.

Der Belegschaftsfaktor eines Gebäudes ist der Durchschnitt der Effizienzen seiner Stufen, gewichtet danach, wie viele Arbeiter jeder Stufe es beschäftigt.

### Bedürfnisse und Luxusgüter {#needs}

Untergebrachte Arbeiter verbrauchen jeden Tag ihre Bedürfnisse. Arbeiter ohne Bett verbrauchen nichts, arbeiten aber auch nicht. Schaltest du ein Luxusgut aus, wird es weder verbraucht noch gekauft, und die Effizienz der Stufe sinkt. Alles, was verbraucht wird, erscheint in [Material I/O](/help/plan_results#material-io) und zählt als Kosten.

Verbrauch pro 100 Arbeiter pro Tag, 200 untergebrachte Pioniere trinken also 2 × 4 = 8 DW am Tag:

| Stufe           | Bedürfnisse                              | Luxusgut 1 | Luxusgut 2 |
| --------------- | ---------------------------------------- | ---------- | ---------- |
| Pioniere        | DW 4, RAT 4, OVE 0,5                     | PWO 0,2    | COF 0,5    |
| Siedler         | DW 5, RAT 6, EXO 0,5, PT 0,5             | REP 0,2    | KOM 1      |
| Techniker       | DW 7,5, RAT 7, MED 0,5, HMS 0,5, SCN 0,1 | SC 0,1     | ALE 1      |
| Ingenieure      | DW 10, MED 0,5, FIM 7, HSS 0,2, PDA 0,1  | VG 0,2     | GIN 1      |
| Wissenschaftler | DW 10, MED 0,5, MEA 7, LC 0,2, WS 0,05   | NST 0,1    | WIN 1      |

> [!tip]
> Ein Luxusgut lohnt sich, wenn der Mehrertrag der schnelleren Gebäude mehr wert ist als das Luxusgut selbst. Schalte es um und beobachte **Profit / Tag**: Die Kosten des Luxusguts und die Änderung der Effizienz zählen beide.

## Infrastruktur {#infrastructure}

**Infrastruktur** hat ein Feld für jede [[habs|Unterkunft]] (HB1, HBB, HB2, HBC, HB3, HBM, HB4, HBL, HB5) und jedes [[storage|Lager]]gebäude (STO, STA, STE, STV, STW).

Betten pro Unterkunft:

| Unterkunft              | Betten                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| HB1, HB2, HB3, HB4, HB5 | 100 Pioniere, Siedler, Techniker, Ingenieure oder Wissenschaftler |
| HBB                     | 75 Pioniere + 75 Siedler                                          |
| HBC                     | 75 Siedler + 75 Techniker                                         |
| HBM                     | 75 Techniker + 75 Ingenieure                                      |
| HBL                     | 75 Ingenieure + 75 Wissenschaftler                                |

Lagerkapazität, zusätzlich zu den 1.500 t und 1.500 m³ des [[core-module|Kernmoduls]]:

| Lager | Gewicht  | Volumen   |
| ----- | -------- | --------- |
| STO   | 5.000 t  | 5.000 m³  |
| STA   | 2.500 t  | 2.500 m³  |
| STE   | 10.000 t | 10.000 m³ |
| STV   | 2.500 t  | 7.500 m³  |
| STW   | 7.500 t  | 2.500 m³  |

Unterkünfte und Lager belegen Fläche und zählen zu den Baukosten hinter **Amortisation**, aber nicht zur Abnutzung. Dein Lager bestimmt die Tage bis voll im Ergebnis **Lager**.

### Auto und der Optimierer {#auto-habs}

**Auto** wählt die Unterkünfte für dich. Solange es an ist, sind die Felder der Unterkünfte gesperrt, das Lager stellst du aber weiterhin selbst ein. Immer wenn sich die Belegschaft ändert, die deine Gebäude brauchen, oder sich die Baupreise der Unterkünfte ändern, wählt es die günstigste Kombination von Unterkünften, die alle unterbringt und in die freie Fläche passt. Passt nichts, wählt es die Kombination mit der kleinsten Fläche, auch wenn das mehr ist, als du hast.

**Auto** ist bei neuen Plänen an. Pläne, die ohne diese Einstellung gespeichert wurden, starten mit Auto aus, und auf der Kopie eines geteilten Plans von jemand anderem startet es ebenfalls aus. PRUNplanner merkt sich deine Wahl pro Plan.

Bei ausgeschaltetem **Auto** lassen **Günstigste** und **Wenigste Fläche** den Optimierer einmal laufen. Günstigste findet die niedrigsten Baukosten zu deinen Kaufpreisen, ohne Flächengrenze. Wenigste Fläche findet die kleinste Fläche. Klappt keine Kombination, bekommst du die Meldung „Für diese Belegschaft wurde keine Wohnkonfiguration gefunden.“

> [!tip]
> Schalte **Auto** aus, wenn du im Spiel schon Unterkünfte gebaut hast und der Plan dazu passen soll. Nutze **Günstigste** oder **Wenigste Fläche** einmal als Ausgangspunkt und passe dann an.

## Experten {#experts}

[[experts|Experten]] heben jedes Gebäude ihres Fachgebiets an. **Experten** zeigt ein Feld für jedes Fachgebiet, das deine Gebäude nutzen, mit den Tickern dieser Gebäude, und für jedes Fachgebiet, in dem Experten eingetragen sind. „+ … weitere Felder“ zeigt den Rest, und **Weniger Felder** blendet ihn wieder aus.

Jedes Feld nimmt 0 bis 5 Experten, mit dem Bonus unter dem Namen:

| Experten | Bonus   |
| -------- | ------- |
| 1        | 3,06 %  |
| 2        | 6,96 %  |
| 3        | 12,48 % |
| 4        | 19,74 % |
| 5        | 28,4 %  |

Ein Gebäude dieses Fachgebiets bekommt 1 + Bonus als Faktor auf seine Effizienz. Eine Basis kann insgesamt höchstens 6 Experten haben. Trägst du mehr ein, warnt ein Hinweis „Pro Basis sind höchstens 6 Experten möglich. Du hast derzeit … Experten zugewiesen.“, aber der Plan zählt trotzdem jeden Experten, den du eingetragen hast.

Im Spiel kommen Experten mit der Zeit durch laufende Gebäude dieses Fachgebiets. Je mehr dieser Gebäude du betreibst, desto schneller kommen sie.

## Wie die Effizienz eines Gebäudes zustande kommt {#efficiency}

Die Effizienz eines Produktionsgebäudes ist das Produkt seiner Faktoren. Weil sie multipliziert werden, stoppt ein einziger Faktor von 0, etwa keine untergebrachten Arbeiter oder eine Farm auf einem nicht fruchtbaren Planeten, das Gebäude, egal wie die anderen aussehen.

| Faktor                     | Wert                                                    | Eingestellt in                                              |
| -------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Belegschaft                | Die Stufeneffizienzen seiner Arbeiter, gewichtet        | [Belegschaft](#workforce), [Infrastruktur](#infrastructure) |
| COGC                       | × 1,25 Fachgebietsprogramm, × 1,1 Belegschaftsprogramm  | [COGC-Programm](#cogc)                                      |
| HQ                         | × 1,1                                                   | [Corp.-HQ](#corp-hq)                                        |
| Experten                   | × (1 + Bonus)                                           | [Experten](#experts)                                        |
| Fraktion                   | × (1 + Bonus × 2 × (3 − 2 × genutzt ÷ gesamt))          | [Imperium & Preise](#faction)                               |
| Fruchtbarkeit (nur Farmen) | × (1 + Fruchtbarkeit × 10 ÷ 33), 0 wenn nicht fruchtbar | [Fruchtbarkeit](#fertility)                                 |

Nimm ein Metallurgiegebäude mit voll untergebrachten Arbeitern und beiden Luxusgütern versorgt, einem Metallurgie-COGC, 2 Metallurgie-Experten und Corp.-HQ, in einem Imperium ohne Metallurgie-Fraktionsbonus. Es läuft mit 1 × 1,25 × 1,0696 × 1,1 = 147,07 %. Fahr in der Produktion mit der Maus über **Eff.**, um die Faktoren jedes Gebäudes zu sehen.
