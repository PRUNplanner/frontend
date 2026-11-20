Die Werkzeuge der Planseite machen aus einem [[plan|Plan]] Einkaufslisten und Flugpläne und lassen dich seine Zahlen genauer ansehen. Im Standard-Layout sind sie Tabs neben **Produktion**: **Konstruktion**, **Versorgung**, **Besuche**, **Reparatur**, **Profit**, **Plan-Check** und **POPR**. Der [[cogm|COGM]]-Dialog öffnet sich an jedem Auftrag, und das Berechnungs-Debug-Panel ist für Fehlermeldungen da. Der [Plan-Check](/help/plan_check) hat einen eigenen Artikel, diese Seite behandelt den Rest.

Jedes Werkzeug beantwortet eine Frage zur Basis: was du kaufen musst, um sie zu bauen (Konstruktion), was du mitbringen musst, damit sie läuft (Versorgung), wie oft ein Schiff kommen muss (Besuche), wann du reparieren solltest (Reparatur), woher der Profit kommt (Profit) und ob der Planet genug Arbeiter hat (POPR).

Ein Werkzeug lädt, wenn du seinen Tab zum ersten Mal öffnest. Die Werkzeuge rechnen mit dem Plan, wie du ihn gerade siehst, ungespeicherte Änderungen eingeschlossen, und bewerten Materialien mit der [[exchange-preference|Marktplatz-Präferenz]] des Plans. Du kannst die Tabs wie jeden anderen Teil der Seite verschieben oder aufteilen ([Plan-Layout](/help/plan_layout)). Die Ergebnis-Kacheln öffnen das Werkzeug dahinter: **Profit / Tag** öffnet Profit, **Amortisation** öffnet Konstruktion und **Lager** öffnet Besuche.

## Konstruktion {#construction}

**Konstruktion** ermittelt, was du noch kaufen musst, bevor du die Basis bauen kannst. Das ist dein [[construction-cart|Bauwagen]]: die Gebäude, die noch zu bauen sind, und die Materialien, die sie brauchen, abzüglich dessen, was du schon auf Lager hast.

### Gebäude {#construction-buildings}

Die Tabelle **Gebäude** hat eine Zeile pro Gebäudetyp im Plan, einschließlich Unterkünften, Lager und [[core-module|Kernmodul]].

| Spalte                   | Was sie zeigt                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gebaut**               | Wie viele du schon auf dem Planeten hast. Mit verbundenem [[fio\|FIO]] beginnt sie bei der Anzahl, die FIO für den Planeten des Plans meldet, und du kannst deine eigene Zahl eintippen. |
| **Anzahl**               | Wie viele noch zu bauen sind: **Geplant** − **Gebaut**, nie unter 0. Du kannst eine andere Zahl eintippen.                                                                               |
| **Geplant**              | Wie viele der Plan enthält. Das Kernmodul zählt immer als 1.                                                                                                                             |
| eine Spalte pro Material | Die Baumaterialien für die **Anzahl** dieser Zeile. **Material Summe** zählt sie zusammen.                                                                                               |

- Eine Zahl, die du bei **Gebaut** eintippst, zeigt einen Stift („**Von dir eingegeben, nicht von FIO**“) und einen Zurücksetzen-Button. **Gebäude zurücksetzen** löscht alle und geht zurück zu den Zahlen von FIO.
- PRUNplanner speichert eingetippte Gebaut-Zahlen pro Plan in deinen Einstellungen, für Pläne, die dir gehören und die du gespeichert hast. Bei einem neuen Plan, einem geteilten Plan oder einer älteren Version, die du dir ansiehst, gelten sie nur, solange du auf der Seite bleibst, und das Werkzeug sagt „**Gebäudezähler werden für diesen Plan nicht gespeichert.**“
- Eine Zahl bei **Gebaut** über **Geplant** wird bernsteinfarben. Ihre **Anzahl** ist dann 0, diese Zeile braucht also keine Materialien.
- Eingetippte Werte bei **Anzahl** werden nicht gespeichert. Wenn du **Gebaut** für eine Zeile änderst, springt ihre **Anzahl** zurück auf **Geplant** − **Gebaut**.
- Wenn die Gebäude (gebaute plus noch zu bauende) mehr Arbeiter einer Stufe brauchen, als ihre Unterkünfte beherbergen, erscheint neben **Anzahl** eine Warnung: „**Zu wenige Unterkünfte senken die Produktionseffizienz.**“ Die Felder bei **Anzahl** der Unterkünfte, die die fehlende Stufe beherbergen, werden rot. Das heißt, die Basis hätte für diese Stufe weniger Betten als Arbeiter. Füg in der **Infrastruktur** des Plans genug Unterkünfte für sie hinzu, dann verschwindet die Warnung (siehe [Basis einrichten](/help/plan_base#infrastructure)).
- Mit FIO listet ein Warnsymbol neben dem Titel Gebäude auf, die FIO auf dem Planeten kennt, der Plan aber nicht. Reiß sie im Spiel ab, sonst passen Fläche, Unterkünfte und Materialien der Basis nicht zum Plan.

Unter der Tabelle umfassen **Gesamtkosten**, **Gesamtgewicht** und **Gesamtvolumen** alles in der Spalte **Anzahl**, vor Abzug des Lagerbestands, zu den Kaufpreisen des Plans.

### Zu kaufende Materialien {#construction-materials}

**Zu kaufende Materialien** zählt die Materialien über alle Gebäude zusammen und zieht ab, was du hast:

| Spalte                    | Was sie zeigt                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Material**              | Das Baumaterial.                                                                                              |
| **Anzahl**                | Was alle Gebäude in der Spalte **Anzahl** brauchen.                                                           |
| **Lagerbestand**          | Was das unter **Lager** gewählte FIO-Lager enthält. Nur mit FIO.                                              |
| **Bestand überschreiben** | Eine Zahl, die du statt **Lagerbestand** eintippst, für Bestand, den FIO nicht kennt. Wird nicht gespeichert. |
| **Bedarf**                | **Anzahl** − Lagerbestand (oder dein überschriebener Wert), nie unter 0.                                      |

**Lager** bietet jedes FIO-Lager an (die Basen deiner Planeten, Warenhäuser und Schiffe) oder keines. Es beginnt bei der Basis auf dem Planeten des Plans. Die Summen unter der Tabelle beziehen sich auf **Bedarf**.

Es gibt zwei XIT-Buttons. Der oben im Werkzeug verschickt alles aus **Material Summe** und ignoriert den Lagerbestand. Der neben **Lager** verschickt nur den **Bedarf**. Mehr dazu unter [XIT-Aktionen](#xit).

> [!tip]
> Du baust eine bestehende Basis aus? Mit FIO beginnt **Gebaut** bei dem, was schon auf dem Planeten steht, sodass **Anzahl** und **Bedarf** nur die neuen Gebäude abdecken. Die Unterkunfts-Warnung zählt alte und neue Gebäude trotzdem zusammen.

## Versorgung {#supply}

**Versorgung** listet die Verbrauchsgüter der [[workforce|Belegschaft]] und die Produktions-Inputs, die die laufende Basis für eine Anzahl von Tagen braucht, abzüglich des Lagerbestands. Das ist dein [[supply-cart|Versorgungswagen]].

### Einstellungen {#supply-settings}

| Einstellung                      | Standard                             | Was sie bewirkt                                                                                                                      |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Welche Materialien               | **Ganze Basis**                      | **Ganze Basis**, **Produktion** oder **Belegschaft**: welche Materialien aufgelistet werden.                                         |
| **Bestandsverfügbarkeit (Tage)** | 20                                   | Wie viele Tage die Versorgung reicht. Dezimalzahlen gehen auch. Es ist ein Wert für alle Pläne, gespeichert in deinen Einstellungen. |
| **Lager**                        | die Basis auf dem Planeten des Plans | Das FIO-Lager, dessen Bestand abgezogen wird. Nur mit FIO.                                                                           |

Der Schalter **Ganze Basis**, **Produktion** oder **Belegschaft** wählt, welche Materialien aufgelistet werden. Ein Material steht unter **Belegschaft**, wenn die Belegschaft es verbraucht, und unter **Produktion**, wenn ein Auftrag es verbraucht oder herstellt. Die Mengen sind trotzdem der Netto-Bedarf der ganzen Basis.

### Spalten und Summen {#supply-columns}

Versorgung listet nur Materialien, die die Basis zukauft, also solche, von denen sie mehr verbraucht, als sie herstellt.

| Spalte                          | Formel                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| **Ticker**                      | Das Material.                                                                             |
| **Täglicher Bedarf**            | Was die Basis verbraucht minus was sie herstellt, pro Tag.                                |
| **Tägliche Kosten**             | **Täglicher Bedarf** zum Kaufpreis des Plans, ȼ / Tag.                                    |
| **Lagerbestand**                | Was das gewählte Lager enthält. Nur mit FIO.                                              |
| **Voller Bedarf**               | **Täglicher Bedarf** × Tage, aufgerundet.                                                 |
| **Finaler Bedarf**              | **Voller Bedarf** − **Lagerbestand**, nie unter 0.                                        |
| t, m³                           | Gewicht und Volumen des **Finaler Bedarf**.                                               |
| **Belegschaft**, **Produktion** | Ob die Belegschaft das Material verbraucht oder ein Auftrag es verbraucht oder herstellt. |

Ein Beispiel (ausgedachte Zahlen): Einer Basis fehlen 4,33 DW pro Tag, eingestellt sind 20 Tage. Dann ist der **Voller Bedarf** 4,33 × 20 = 86,6, aufgerundet 87. Mit 30 auf Lager ist der **Finaler Bedarf** 87 − 30 = 57.

Unter der Tabelle findest du **Tägliche Kosten**, **Gesamtkosten** (**Finaler Bedarf** zum Kaufpreis des Plans), **Gesamtgewicht** und **Gesamtvolumen**. „Weitere Optionen in FIO Verbrauch“ öffnet [FIO Verbrauch](/fio/burn) ([Hilfe](/help/fio_burn)), das die Versorgung für alle Basen eines Imperiums auf einmal plant.

### XIT und XIT Erstversorgung {#supply-xit}

- Der XIT-Button verschickt den **Finaler Bedarf** der aufgelisteten Materialien: was die laufende Basis noch braucht, wenn ihre eigene Produktion einen Teil davon deckt.
- **XIT Erstversorgung** (ihre Schublade heißt **Versorgung (Erstlieferung)**) ist für die erste Lieferung, wenn noch nichts produziert wird. Sie verschickt den vollen Input jedes Materials × Tage, aufgerundet, abzüglich Lagerbestand, und das schließt die Materialien ein, die der Plan selbst herstellt. Sie folgt der Wahl **Ganze Basis**, **Produktion** oder **Belegschaft**, verschickt also die Inputs der Belegschaft, die der Produktion oder beides.

> [!tip]
> Du startest eine neue Basis? Nimm **XIT Erstversorgung** für den ersten Flug. Das normale XIT verrechnet, was die Basis herstellt, also käme eine Basis, die ihr eigenes DW oder RAT herstellt, ohne an.

## XIT-Aktionen {#xit}

Die XIT-Buttons in Konstruktion, Versorgung und Reparatur öffnen eine Schublade mit einem [[xit|XIT]]-Paket für [Refined PrUn](https://github.com/refined-prun/refined-prun), die Browser-Erweiterung für das Spiel. Refined PrUn führt es mit seinem Befehl XIT ACT aus, sodass du keine Mengen von Hand abtippen musst. PRUNplanner baut nur das Paket, im Spiel passiert also nichts, bis du es dort ausführst.

| Feld              | Standard                         | Was es bewirkt                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Herkunft**      | **Bei Ausführung konfigurieren** | Woher die Materialien kommen: eins der sechs Stations-Warenhäuser (Antares, Arclight, Benten, Hortus, Hubur, Moria) oder beim Ausführen des Pakets gewählt.                                                                                    |
| **Von CX Kaufen** | an                               | Fügt vor dem Transfer einen Schritt hinzu, der die Materialien an der Handelskammer dieser Station kauft. „**Nur Warenhäuser als Ursprung erlauben den direkten Einkauf.**“ Mit **Bei Ausführung konfigurieren** ist das Kästchen deaktiviert. |
| **JSON**          |                                  | Das Paket. **Kopieren** legt es in die Zwischenablage.                                                                                                                                                                                         |

Unter den Feldern listet eine Tabelle jedes Material mit seiner Menge auf, Materialien mit Menge 0 lässt sie weg. Das Paket heißt „PRUNplanner“ plus das Werkzeug (zum Beispiel „PRUNplanner Supply Cart“), und das Ziel wählst du immer beim Ausführen. **Herkunft** und **Von CX Kaufen** werden in deinen Einstellungen gespeichert und gelten für jeden XIT-Button, auch in FIO Verbrauch und FIO Reparieren.

## Besuche {#visits}

**Besuchsfrequenz** sagt dir, wann das Lager der Basis voll ist und wie oft ein Schiff vorbeikommen muss. Die Zahlen zur [[visitation|Besuchsfrequenz]] zählen Materialien, die die Basis verkauft (Export) und kauft (Import), pro Tag.

### Lager {#visits-storage}

Der Satz oben nennt die Kapazität der Basis: ihre eigenen 1.500 t und 1.500 m³ plus die [[storage|Lager]]-Gebäude des Plans.

| Gebäude | t      | m³     |
| ------- | ------ | ------ |
| STO     | 5.000  | 5.000  |
| STA     | 2.500  | 2.500  |
| STE     | 10.000 | 10.000 |
| STV     | 2.500  | 7.500  |
| STW     | 7.500  | 2.500  |

Die Tabelle zeigt in t und m³ pro Tag:

- **Import**: was die Basis zukauft, also die Materialien, von denen sie mehr verbraucht, als sie herstellt.
- **Export**: wovon sie mehr herstellt, als sie verbraucht.
- **Größere Strecke**: der größere der beiden Werte, also das, was ein Schiff auf seiner volleren Strecke trägt. Gewicht und Volumen werden getrennt verglichen.
- **Lager gefüllt**: Kapazität ÷ **Größere Strecke**, in Tagen, für das, was zuerst knapp wird, Gewicht oder Volumen.

Die Ausschlussliste nimmt Materialien aus diesem Werkzeug heraus, für die, die du direkt auf dem Planeten verkaufst oder kaufst (lokaler Markt, Verträge). Such nach Tickern und wähl sie aus. Die Liste wird pro Plan in deinen Einstellungen gespeichert. Bei einem neuen oder geteilten Plan gilt sie nur für diesen Besuch.

> [!warning]
> Die Ergebnis-Kachel **Lager** zählt jedes Material und ignoriert deine ausgeschlossenen Materialien. Sobald du Ausschlüsse setzt, weichen ihre Tage und **Lager gefüllt** hier voneinander ab.

### Transport {#visits-shipping}

Es gibt eine Zeile pro Schiffsgröße: 500 t / 500 m³, 1.000 t / 1.000 m³, 2.000 t / 2.000 m³, 1.000 t / 3.000 m³, 3.000 t / 1.000 m³ und 5.000 t / 5.000 m³ (**Schiff t**, **Schiff m³**). Exporte und Importe bekommen jeweils:

- **Besuche (Tage)**: nach wie vielen Tagen Exporte (oder Importe) dieses Schiff füllen. Es ist der kleinere Wert aus Schiff-t ÷ t pro Tag und Schiff-m³ ÷ m³ pro Tag.
- **Limit**: was zuerst knapp wird, t oder m³.

Ein Beispiel (ausgedachte Zahlen): Exporte von 100 t und 50 m³ pro Tag füllen das Schiff mit 1.000 t / 1.000 m³ nach Gewicht in 1.000 ÷ 100 = 10 Tagen und nach Volumen in 1.000 ÷ 50 = 20 Tagen. Seine **Besuche (Tage)** sind 10 und sein **Limit** ist t.

> [!tip]
> Ein Schiff sollte mindestens so oft kommen wie der kleinste Wert aus **Lager gefüllt** und den beiden **Besuche (Tage)** des Schiffs. Wartest du länger, läuft das Lager über, die Exporte passen nicht mehr in eine Ladung oder die Importe gehen aus. Die Größen der [[cargo-bays|Frachträume]] im Spiel sagen dir, welche Zeile deine ist.

## Reparatur {#repair}

**Reparatur-Analyse** findet für jeden Produktionsgebäudetyp das beste [[repair|Reparatur]]-Intervall, also wie viele Tage du zwischen Reparaturen warten solltest, damit die Basis den meisten Profit macht. Unterkünfte, Lager und das Kernmodul lässt sie weg.

### Wie gerechnet wird {#repair-calculation}

Gebäude nutzen sich ab. Ihr Zustand und damit ihr Output fällt mit der Zeit von 100 % auf 33 %: erst langsam, um Tag 100 am schnellsten, dann flacht es ab. Eine Reparatur stellt ihn wieder her, aber die Rechnung wächst, je länger du wartest. An Tag _n_ kostet jedes Baumaterial seine Menge minus ⌊Menge × (180 − _n_) ÷ 180⌋, die Rechnung wächst also bis Tag 180, an dem sie den Materialien eines neuen Gebäudes entspricht.

Zum Beispiel kostet ein Material mit Menge 10 an Tag 45 10 − ⌊10 × 135 ÷ 180⌋ = 10 − 7 = 3 und an Tag 90 10 − ⌊10 × 90 ÷ 180⌋ = 10 − 5 = 5. Häufiges Reparieren hält den Output hoch, kostet aber jedes Mal eine Rechnung, und Warten macht jede Rechnung größer, während der Output sinkt. Das Werkzeug wägt beides ab.

Für jedes Intervall von 1 bis 180 Tagen rechnet PRUNplanner pro Gebäude und Tag:

1. _Output_: der Produktionswert des Gebäudes bei vollem Zustand (Output-Wert minus Inputs und [[production-fees|Produktionsgebühren]], aus dem Plan) × sein durchschnittlicher Zustand über das Intervall.
2. minus seine Belegschaftskosten pro Tag.
3. minus die Reparaturrechnung für dieses Intervall, verteilt auf die Tage des Intervalls (Rechnung ÷ (_n_ + 1)).

Das Intervall mit dem höchsten Profit ist das beste. Der _gute Bereich_ ist die Spanne von Tagen um es herum, deren Profit höchstens 1 % unter dem besten liegt. PRUNplanner bewertet Reparaturmaterialien zu den Kaufpreisen des Plans.

Die eigenen Zahlen des Plans ([Ergebnisse](/help/plan_results)) berechnen die [[degradation|Abnutzung]] stattdessen als 1/180 der Baukosten pro Tag. „**Profit mit diesen Reparaturen**“ zählt die echten Reparaturkosten bei jedem Intervall.

### Was es zeigt {#repair-view}

- Oben siehst du „**Profit mit diesen Reparaturen**“ für den ganzen Plan in ȼ / Tag, mit „**alle optimal**“ oder wie weit er davon entfernt ist. Daneben stehen **Reparaturkosten** in ȼ / Tag (oder **Nächste Reparatur fällig** mit FIO, siehe unten) und „**Eine Reparatur jedes Gebäudes**“ in ȼ, t und m³.
- **Gebäude** listet jeden Typ auf, die teuerste Reparatur zuerst: **Optimal (gut)** (das beste Intervall und sein guter Bereich), **Intervall (T)** (deins, beginnend beim besten), **ȼ/Tag** bei diesem Intervall und **Guter Bereich** (oder **Nächste Fälligkeit** mit FIO).
- Klick auf ein Gebäude, um seine Details zu öffnen. Sie zeigen den Profit bei deinem Intervall und wie er sich zum besten verhält, die **Reparaturrechnung**, den **Zustand bei Reparatur** und den durchschnittlichen Output. **Reparieren alle** hat ein Feld, einen Schieberegler (1–180 Tage) und Schnellauswahlen (**Optimal · {n} T**, 30, 60 und 90 Tage). Die Details listen auch die Materialien einer Reparatur aller Gebäude dieses Typs auf.
- In den Diagrammen markiert **Profit pro Tag nach Reparaturintervall** den guten Bereich, und in **Warum {best} Tage: Reparaturkosten vs. verlorener Output** ist die niedrigste Summe das beste Intervall. Außerdem gibt es **Gebäudezustand**.

Intervalle, die du einstellst, werden nicht gespeichert. **Alle auf optimal zurücksetzen** geht zurück zu den besten Intervallen.

### Mit FIO {#repair-fio}

Mit verbundenem FIO listen die Details deine Gebäude dieses Typs auf dem Planeten des Plans auf („**Deine {ticker} auf {planet} (FIO)**“). Jedes zeigt die Tage seit seiner letzten Reparatur, seinen Zustand und ein Fälligkeits-Tag bei deinem Intervall: **{n} T überfällig**, **Heute fällig**, **Fällig in {n} T** (innerhalb von 7 Tagen, bernsteinfarben) oder **In {n} T**. Ein Gebäude, das laut FIO nie repariert wurde, zeigt „**nie repariert**“ und bekommt kein Fälligkeits-Tag. Oben steht dann **Nächste Reparatur fällig** statt **Reparaturkosten**, dazu „**FIO zuletzt aktualisiert: {when}**“, mit einem Hinweis, wenn das mehr als einen Tag her ist.

**XIT für fällige** verschickt die Reparaturmaterialien, wie FIO sie meldet, für jedes Gebäude, das überfällig oder innerhalb von 7 Tagen fällig ist ([XIT-Aktionen](#xit)). Ohne FIO verlinkt ein Hinweis auf „**Richte FIO in deinem Profil ein**“. Bei einem geteilten Plan ist der FIO-Teil ausgeblendet, weil die FIO-Daten deine wären, nicht die des Besitzers.

> [!tip]
> [FIO Reparieren](/help/fio_repair) nutzt das beste Intervall jedes Gebäudetyps aus diesem Werkzeug für die Pläne, die es deinen Basen zuordnet. Richte den Plan hier ein und plane dann dort die Reparaturflüge.

## Profit {#profit}

**Profit-Aufschlüsselung** zeigt, wohin der Output-Wert jedes Tages geht, in ȼ / Tag zur Marktplatz-Präferenz des Plans. Sie fügt nichts Neues hinzu: Ihre Schritte enden beim [[profit|Profit]] des Plans pro Tag.

Ein Schalter wählt **Nach Kostenart** (Standard) oder **Nach Gebäude**. PRUNplanner merkt sich deine Wahl, bis du die Seite neu lädst.

### Nach Kostenart {#profit-cost-type}

Ein Wasserfall, von links nach rechts gelesen:

| Schritt                 | Was er ist                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Output-Wert**         | Wovon die Basis mehr herstellt, als sie verbraucht, zu den Verkaufspreisen des Plans.                                                                                                 |
| **Produktions-Inputs**  | Was die Basis für ihre Aufträge zukauft, zu den Kaufpreisen des Plans.                                                                                                                |
| **Belegschaft**         | Was die Basis für ihre Belegschaft zukauft. Ein Material, das beide nutzen, geht bis zu dem, was die Arbeiter verbrauchen, an **Belegschaft** und der Rest an **Produktions-Inputs**. |
| **Abnutzung**           | Der Verschleiß der Produktionsgebäude: ihre Baukosten ÷ 180 pro Tag.                                                                                                                  |
| **Produktionsgebühren** | Die Gebühren des Planeten für das Fachgebiet der Gebäude. Nur vorhanden, wenn der Planet welche erhebt.                                                                               |
| **Täglicher Profit**    | Was übrig bleibt: der Profit des Plans pro Tag.                                                                                                                                       |

PRUNplanner verrechnet Materialien über die ganze Basis, also zählt ein Material, das die Basis herstellt und verbraucht, nur mit seinem Überschuss oder Fehlbetrag. Die Schritte für Output, Inputs, Belegschaft und Gebühren zeigen ihre drei größten Materialien (bei Gebühren Gebäude) und „+{n} weitere“. Fahr mit der Maus über einen Teil, um **Produziert / Tag** oder **Verbraucht / Tag**, **Preis**, **ȼ / Tag** und **Anteil am Output** zu sehen.

Eine Produktionsgebühr ist die Gebühr des Planeten für das Fachgebiet des Gebäudes, gemittelt über die Arbeiter des Gebäudes nach Kopfzahl. Sie wird pro Tag bei 100 % berechnet und skaliert wie der Output mit der [[efficiency|Effizienz]] des Gebäudes.

### Nach Gebäude {#profit-building}

Jeder Gebäudetyp bekommt einen Schritt: sein Output minus seine eigenen Inputs und Belegschaft, für sich bewertet, vor Abnutzung und Gebühren. Die sieben größten werden gezeigt, der Rest wird als „{n} weitere Gebäude“ zusammengefasst. **Nicht zugeordnet** enthält, was sich keinem einzelnen Gebäude zuordnen lässt: die Belegschaft des ganzen Plans und Materialien, die zwischen Gebäuden gehandelt werden. Dann folgen **Abnutzung**, **Produktionsgebühren** und **Täglicher Profit** wie oben.

### Kennzahlen {#profit-key-figures}

- **Output-Wert**, **Kosten inkl. Abnutzung und Gebühren** (Produktions-Inputs + Belegschaft + Abnutzung + Produktionsgebühren) und **Marge** (täglicher Profit ÷ Output-Wert). Zum Beispiel ergeben 10.000 ȼ Output-Wert und 2.500 ȼ täglicher Profit eine Marge von 25 %. Die Marge ist rot, wenn der Plan Geld verliert.
- Das Material, das den größten Anteil am Output-Wert einbringt. Sein Preis entscheidet über den Plan.
- Die größten Einzelkosten unter Produktions-Inputs und Belegschaft, als Anteil am Output-Wert.
- Der Anteil der Verbrauchsgüter der Belegschaft am Output-Wert, mit den beiden größten.

> [!tip]
> Wenn ein Output den Großteil des Werts trägt, prüf im [Plan-Check](/help/plan_check#market-check), wie tief sein Markt ist, bevor du baust.

## POPR {#popr}

**Aktuellster Bevölkerungsbericht** stellt die Belegschaft des Planeten aus dem letzten [[popr|Bevölkerungsbericht]] des Spiels neben das, was der Plan braucht. Das Spiel veröffentlicht den Bericht wöchentlich. Den Tab siehst du nur, wenn du angemeldet bist.

Das Diagramm „**Freie Arbeiter neben dem, was dieser Plan braucht**“ hat eine Zeile pro Stufe. Der Balken sind die freien Arbeiter minus die Stellen, die andere Basen schon offen haben, nie unter 0. Die Linie ist, was der Plan braucht. Ein Balken ist grün, wenn er den Bedarf deckt, rot, wenn nicht, und grau, wenn der Plan von dieser Stufe keine braucht.

Ein Beispiel (ausgedachte Zahlen): Bei 500 freien Pionieren und 200 unbesetzten Pionier-Stellen zeigt der Balken 300. Ein Plan, der 250 Pioniere braucht, bekommt einen grünen Balken und ein ✓ bei „Plan Check“, einer, der 400 braucht, einen roten Balken und ein ✗.

Die Tabelle hat eine Spalte pro Stufe (Pioniere bis Wissenschaftler):

| Zeile                   | Was sie zeigt                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **Gesamtbevölkerung**   | Der Wert _next population_ von FIO für die Stufe.                                                   |
| **Freie Bevölkerung**   | Arbeiter ohne Job.                                                                                  |
| **Freie Bevölkerung %** | Die Arbeitslosenquote × 100 (ohne %-Zeichen angezeigt).                                             |
| **Ungefüllte Jobs**     | Stellen, die andere Basen offen haben.                                                              |
| „Plan Need“             | Arbeiter, die dieser Plan braucht.                                                                  |
| „Plan Check“            | ✓, wenn der Plan keine braucht oder wenn freie Arbeiter minus unbesetzte Stellen den Bedarf decken. |

Ohne Bericht sagt der Tab „**Noch kein Bevölkerungsbericht für diesen Planeten.**“

> [!tip]
> Ein ✗ bei „Plan Check“ heißt, du würdest mit Basen, die schon auf Arbeiter warten, um Arbeiter konkurrieren. Plane mit weniger Arbeitern dieser Stufe oder prüf nach dem nächsten Bericht noch einmal.

## COGM {#cogm}

Der Button **COGM** in jeder Auftragszeile in der [Produktion](/help/plan_production) öffnet **Kosten der hergestellten Waren**: was dich eine Einheit jedes Outputs in diesem Plan in der Herstellung kostet. Er nutzt Effizienz, Laufzeit, Abnutzung, Produktionsgebühren, Input-Preise und Belegschaft des Plans.

### Die Berechnung {#cogm-calculation}

| Zeile                                    | Formel                                                                                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laufzeit des Auftrags und sein „% / Tag“ | Die Zeit des Auftrags ÷ die Effizienz des Gebäudes und ihr Anteil an einem Tag (_Laufzeit-Anteil_).                                                                                                               |
| **Effizienz**                            | Die Effizienz des Gebäudes in diesem Plan.                                                                                                                                                                        |
| **Abnutzung**                            | Baukosten ÷ 180 × Laufzeit-Anteil.                                                                                                                                                                                |
| **Produktionsgebühr / Durchlauf**        | Die Produktionsgebühr des Gebäudes pro Tag bei 100 % × die Basiszeit des Auftrags ÷ 1 Tag. Sie ignoriert die Effizienz. Zum Beispiel ergeben 35 ȼ pro Tag und ein 6-h-Auftrag 35 × 6 ÷ 24 = 8,75 ȼ pro Durchlauf. |
| Inputs, **Input Gesamt**                 | Die Menge jedes Inputs × der Kaufpreis des Plans. Ein Tag zeigt, woher jeder Preis kommt, und öffnet diese Regel unter [Marktplätze](/help/exchanges).                                                            |
| **Belegschaft**                          | Die täglichen Belegschaftskosten des Gebäudes × Laufzeit-Anteil. Arbeiter ohne Unterkunft und abgeschaltete Luxusgüter kosten nichts.                                                                             |
| **Gesamtkosten**                         | Abnutzung + Produktionsgebühr + Inputs + Belegschaft.                                                                                                                                                             |
| Auftrags-Profit                          | Die Outputs zu den Verkaufspreisen des Plans − **Gesamtkosten**.                                                                                                                                                  |

Für jeden Output:

- **Gesamtkosten**: **Gesamtkosten** ÷ die Menge dieses Outputs, sodass jeder Output die gesamten Kosten trägt. Das ist der COGM, den PRUNplanner auch anderswo verwendet.
- **Kostenteilung**: **Gesamtkosten** ÷ alle Outputs zusammen, was die Kosten nach Menge aufteilt.
- Eine Zeile darunter nennt den Marktpreis des Outputs und wie weit der COGM davon abweicht, in %. Sie zeigt, ob die Herstellung des Materials hier mehr oder weniger kostet als sein Marktpreis.

Ein Beispiel (ausgedachte Zahlen): Ein Durchlauf mit **Gesamtkosten** von 1.200 ȼ, der 4 von einem Material und 2 von einem anderen herstellt, ergibt **Gesamtkosten** pro Output von 1.200 ÷ 4 = 300 ȼ und 1.200 ÷ 2 = 600 ȼ und eine **Kostenteilung** von 1.200 ÷ 6 = 200 ȼ für beide.

### COGM als Kaufpreis nutzen {#cogm-buy-price}

Wenn das Imperium des Plans eine Marktplatz-Präferenz hat, öffnet sich neben der Tabelle ein zweites Panel: **Preise in {name}**, mit dem Namen der Präferenz (**Unter Marktplätze öffnen** öffnet sie). Ohne eine sagt ein Hinweis, dass die Preise Universe · VWAP 30D sind, mit **Lege eine in der Verwaltung fest**.

Für jeden Output zeigt es **COGM hier ({planet})**, **Markt · {source}** (der Markt-Kaufpreis ohne Festpreise) und **Kaufpreis, alle Planeten** (dein [[fixed-price|fester]] Kaufpreis oder **nicht festgelegt**). Dann:

- **Als Kaufpreis auf allen Planeten verwenden** (wenn es keinen Festpreis gibt) setzt den Kaufpreis des Outputs auf den COGM dieses Plans, für alle Planeten dieser Präferenz.
- Wenn es einen Festpreis gibt und er mehr als 2 % vom aktuellen COGM abweicht, siehst du „**Der feste Kaufpreis weicht {diff} % vom aktuellen COGM ab**“ („Inputs oder Effizienz haben sich seit dem Festlegen geändert.“) mit **Auf {value} aktualisieren**.
- Sonst steht dort **Kaufpreis entspricht COGM**.

Eine Zeile sagt, welche Pläne der Präferenz das Material kaufen, denn die Änderung gilt für jeden Plan, der es nutzt. **Feste Preise** darunter listet die Festpreise der Präferenz für **Alle Planeten** oder diesen Planeten auf, und du kannst sie direkt dort bearbeiten. Gespeichert wird erst, wenn du in der Leiste unten auf **Änderungen speichern** klickst (oder auf **Verwerfen**). [Festpreise und COGM](/help/exchanges#fixed-prices-and-cogm) erklärt Festpreise.

> [!tip]
> Du nutzt deinen eigenen Output in einer anderen Basis? Ein fester Kaufpreis zum COGM bewertet ihn mit dem, was er dich kostet, statt mit dem Markt, sodass der andere Plan seine echte Marge zeigt. Bei einem Auftrag mit [[byproduct|Nebenprodukt]] gibt **Gesamtkosten** jedem Output die gesamten Kosten. Vergleich es mit **Kostenteilung**, bevor du den Preis festlegst.

## Berechnungs-Debug {#debug}

Das Berechnungs-Debug listet jeden Schritt der Planberechnung mit Formel und Inputs auf. Es ist für Fehlermeldungen gedacht: Wenn eine Zahl falsch aussieht, zeigt es, woher sie kommt. Es bleibt verborgen, bis du es einschaltest, und es gibt es nur auf Englisch.

**Ein- und ausschalten:**

- Häng `?debug=calc` an eine beliebige PRUNplanner-Adresse (zum Beispiel `https://prunplanner.org/?debug=calc`), um es einzuschalten, und `?debug=off`, um es auszuschalten. Der Parameter verschwindet sofort aus der Adresse, ein geteilter Link enthält ihn also nie.
- Oder setz auf der Seite `/debug` (angemeldet) das Häkchen bei „Calculation debug“.
- Oder klick im Panel auf „Turn off“.

Die Einstellung wird in diesem Browser gespeichert und gilt für alle seine Tabs. Sobald sie an ist, hat das Menü **Mehr** der Planseite (⋯ im Kopfbereich) den Eintrag „Calculation debug“. Strg plus die Taste links neben der 1 (`` ` `` auf einer US-Tastatur, ⌘ statt Strg auf einem Mac) öffnet und schließt es, außer du tippst gerade in einem Feld.

**Was das Panel zeigt:** Das Panel sitzt unter dem Plan, und du kannst seine Größe an der Oberkante ändern.

- Eine Statuszeile: wann zuletzt neu berechnet wurde, wie lange das gedauert hat, die Anzahl der Schritte und wie viele Selbsttests bestanden sind.
- Buttons, um jede Phase der Berechnung ein- oder auszublenden (Input, Infrastruktur, Belegschaft, Fläche, Experten, Produktion, COGM, Material I/O, Preise, Konstruktion, Finanzen und Besuchsfrequenz), ein „Filter“ nach Gebäude, Ticker oder Label und „Issues only“.
- Die Selbsttests, eventuelle Warnungen und die Daten des Plans so, wie ein Speichern sie senden würde, einschließlich der Angabe, ob er ungespeicherte Änderungen hat.
- „Copy text“ und „Copy JSON“ kopieren den ganzen Trace mit App-Version, Plan, Planet, Marktplatz-Präferenz und Imperium.

> [!tip]
> Du willst eine falsche Zahl melden? Öffne den Plan, schalte das Berechnungs-Debug ein, klick auf „Copy text“ und füg es in deine Meldung ein. Es enthält die Daten deines Plans, teil es also nur dort, wo dir das recht ist.
