Neu bei PRUNplanner? Diese Anleitung dauert etwa 15 Minuten. Am Ende hast du:

- dein [[empire|Imperium]] mit deiner Fraktion und deinen Genehmigungen eingerichtet,
- Preise, die von dem Marktplatz kommen, den du wählst,
- einen ersten gespeicherten [[plan|Plan]], dessen Profit und Amortisation du lesen kannst.

Es ist ein kurzer Rundgang. Die Seiten, die am Ende jedes Schritts verlinkt sind, gehen tiefer, wenn du die Details willst.

Du brauchst ein Konto. Ein neues kommt schon mit einem Imperium und einer [[exchange-preference|Marktplatz-Präferenz]], das meiste hier ist also Prüfen und Anpassen.

## 1. Prüf dein Imperium {#step-1}

Ein Imperium ist eine Gruppe von Plänen, die sich eine Fraktion, Genehmigungen und eine Marktplatz-Präferenz teilen. Was du hier einstellst, gilt also für jeden Plan darin.

![Der Schritt Dein Imperium auf der Imperium-Seite eines neuen Kontos, mit Fraktion, Genehmigungen gesamt, Genehmigungen benutzt und Speichern](/images/help/guides/first-base-empire.webp)

Öffne [Imperium](/empire). Ein neues Konto hat ein Imperium, „My Empire“, ohne [[faction|Fraktion]] und mit 1 von 2 genutzten Genehmigungen. Solange es keine Pläne hat, zeigt die Seite drei Schritte. Der erste, **Dein Imperium**, enthält seine Einstellungen.

1. Wähle deine **Fraktion**. Sie gibt den Gebäuden ihres [[expertise|Fachgebiets]] in jedem Plan des Imperiums einen Bonus.
2. Stell **Genehmigungen gesamt** und **Genehmigungen benutzt** auf das, was dein `HQ`-Puffer im Spiel zeigt. Je weniger Genehmigungen du nutzt, desto größer der Fraktionsbonus.
3. Drück **Speichern**.

Zeigt der Schritt **Gespeichert**, bist du hier fertig. Sobald das Imperium Pläne hat, findest du dieselben Felder im Kasten **Konfiguration** auf der Imperium-Seite.

> [!tip]
> Sobald das Imperium Pläne hat, warnt der Kasten **Konfiguration** mit „Unstimmigkeit erkannt“, wenn **Genehmigungen benutzt** von den Genehmigungen abweicht, die deine Pläne zusammen ergeben. Er prüft schon beim Tippen, die Warnung kann also während der Eingabe erscheinen. Keine Sorge, sie erinnert dich nur daran, die Zahlen an das Spiel anzupassen. Der Schritt beim ersten Start oben zeigt sie nicht.

> [!tip]
> Du willst ein zweites Imperium, etwa um eine Erweiterung zu testen, ohne deine echten Basen anzufassen? Erstell es in der [Verwaltung](/manage) mit **Neues Imperium**.

Mehr dazu: [Imperium-Konfiguration](/help/empire#configuration), [Fraktionsbonus](/help/plan_base#faction).

## 2. Leg deinen Heimatmarktplatz fest {#step-2}

Deine Preise kommen aus deiner Marktplatz-Präferenz, und Umsatz, Kosten und Profit jedes Plans werden zu diesen Preisen berechnet. Ein neues Konto hat „My Exchange Preference“, die schon mit „My Empire“ verknüpft ist. Sie steht auf **Universe · VWAP 30D**, dem 30-Tage-Durchschnitt über alle vier Marktplätze. Du kannst stattdessen auch alle Preise von einem Marktplatz nehmen.

![Marktplätze mit geöffnetem Alle Planeten: der Kasten Marktplatzpreis mit seinen Voreinstellungen, Gleich für Kauf und Verkauf und den Marktplatz-Buttons](/images/help/guides/first-base-exchange.webp)

1. Öffne [Marktplätze](/exchanges). Es öffnet deine Präferenz. Hast du mehrere, wählt **Präferenz wechseln** eine andere.
2. Öffne in der Liste links **Alle Planeten**.
3. Behalte im Kasten **Marktplatzpreis** die Option **Gleich für Kauf und Verkauf** und wähle deinen Heimatmarktplatz: AI1 an der Antares Station, CI1 bei Benten, IC1 bei Hortus oder NC1 bei Moria.
4. Wähle eine Preisbasis oder klick auf die Voreinstellung **Durchschnitt · VWAP 30D**.
5. Drück **Änderungen speichern** in der Leiste unten.

> [!tip]
> [[vwap|VWAP]] ist der volumengewichtete Durchschnittspreis: die für ein Material bezahlten Credits ÷ die gehandelten Einheiten. Ein Beispiel: Auf einem Marktplatz wurden 30 Einheiten zu 200 ȼ, 40 zu 210 ȼ, 10 zu 215 ȼ und 20 zu 220 ȼ gehandelt. Der VWAP ist (6.000 + 8.400 + 2.150 + 4.400) ÷ 100 = 20.950 ÷ 100 = 209,50 ȼ. Preise mit mehr Einheiten dahinter zählen mehr.
>
> VWAP 7D mittelt die Handelsgeschäfte der letzten 7 Tage, VWAP 30D die der letzten 30. Ein einzelner Marktplatz nutzt nur die dort getätigten Geschäfte. Universe fasst die Geschäfte von AI1, CI1, IC1 und NC1 zu einem Durchschnitt zusammen.

Zeigt die **Übersicht** die neue Regel unter **Alle Planeten**, hat es geklappt. Sobald du Pläne hast, listet die Übersicht jeden Preis, den sie nutzen, und gelbe Preise markieren Materialien, die mit 0 ȼ zählen. Das heißt nur, dass der gewählte Marktplatz keinen Preis für sie hat, und PRUNplanner nimmt keinen von einem anderen Marktplatz. Beim VWAP passiert das erst nach 30 Tagen ohne Handel auf diesem Marktplatz. Davor greift VWAP 7D auf den Preis des letzten Handelstags zurück.

Imperien, die du später erstellst, starten ohne Präferenz und bepreisen mit Universe · VWAP 30D. Du gibst ihnen eine in der [Verwaltung](/manage), in der Spalte **CX** der **Imperium-Konfiguration**.

Details: [Preise einrichten](/help/guide_cx_prices), [Eine Marktplatz-Regel festlegen](/help/exchanges#exchange-rule).

## 3. Such einen Planeten {#step-3}

Öffne die [Planetensuche](/search).

![Planetensuche mit einem FEO-Filter und einem Limit von 5 Sprüngen ab NC1, links die Filter und rechts die passenden Planeten](/images/help/guides/first-base-search.webp)

1. Füge unter Materialien mit **+ Material hinzufügen** hinzu, was du herstellen oder abbauen willst. Jede Option zeigt, wie viele Planeten du bekämst.
2. Hak unter **Entfernung** deinen Heimatmarktplatz unter **Marktplätze** an und senke **Max. Sprünge**, damit Versorgungsflüge kurz bleiben.
3. Schalte **Bauplätze** unter **Spalten** ein, um zu sehen, welche Planeten noch freie [[plots|Bauplätze]] haben.

Du suchst eine kurze Liste, in der die Kachel des Materials grün oder gelb ist (nah am Output des besten Planeten), mit wenigen Sprüngen und freien Bauplätzen. Ein rotes ⊘ neben einem Namen heißt, dass der Planet voll ist.

Mehr: [Einen Planeten für ein Material finden](/help/guide_find_planet), [Planetensuche](/help/planet_search#materials).

## 4. Erstell den Plan {#step-4}

Klick auf „+“ in der Zeile des Planeten. Ein neuer Plan für diesen Planeten öffnet sich in einem neuen Tab, so verlierst du deine Suche nicht.

![Ein neuer Plan mit den Ergebnis-Kacheln oben, Imperium & Preise, Planet und Produktion](/images/help/guides/first-base-plan.webp)

1. **Imperium & Preise**: **Mit Imperium berechnen** zeigt das Imperium, mit dem der Plan rechnet. Ein neuer Plan startet mit deinem ersten Imperium, und wenn du den Plan erstellst, kommt er in das dort gewählte Imperium. **Preise** nennt die Marktplatz-Präferenz, die er nutzt.
2. **Planet**: Die Auswahl **COGC** startet mit dem Programm, das der Planet gerade betreibt. Lass für eine erste Basis **Genehmigungen** auf 1 (500 Fläche).
3. Produktion: Wähle ein Gebäude in der Gebäudeauswahl, klick dann auf **+ Auftrag** und wähle einen [[recipe|Auftrag]]. Stell **Anzahl** darauf, wie viele du baust. Für den Abbau klickst du stattdessen auf eine Ressourcen-Kachel unter **Planet**. Das fügt den Extraktor und seinen Auftrag hinzu.
4. **Infrastruktur**: Lass **Auto** an. Es wählt die günstigsten Wohngebäude, die alle deine Arbeiter unterbringen.

> [!tip]
> Auf einem Planeten, auf dem viele Spieler planen, bietet ein leerer Plan eine Karte „Beginne mit einem typischen Setup auf …“ mit den Gebäuden und Experten, die andere dort nutzen. Sie zeigt, was andere planen, nicht was am meisten einbringt, prüf also die Zahlen, bevor du es behältst.

Mehr dazu: [Basis einrichten](/help/plan_base), [Produktion & Aufträge](/help/plan_production#adding-buildings).

## 5. Lies die Ergebnisse {#step-5}

Die Kacheln oben aktualisieren sich bei jeder Änderung.

![Die Ergebnis-Kacheln eines Plans: Profit / Tag, Amortisation, Belegschaft, Fläche und Lager, hier mit einem Verlust und zu viel Fläche in Rot](/images/help/guides/first-base-results.webp)

| Kachel           | Worauf du achtest                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Profit / Tag** | Positiv. Es ist Umsatz minus gekaufte Materialien, [[degradation\|Abnutzung]] und [[production-fees\|Produktionsgebühren]]. |
| **Amortisation** | Tage, bis die Basis sich bezahlt gemacht hat. „nie“ heißt, dass sie keinen Profit macht.                                    |
| **Belegschaft**  | Rot heißt, dass eine Stufe weniger Betten als Arbeiter hat.                                                                 |
| **Fläche**       | Die genutzte Zahl wird rot, wenn die Basis mehr Fläche braucht, als deine Genehmigungen hergeben.                           |
| **Lager**        | Tage, bis das Lager voll ist. Das sagt dir, wie oft ein Schiff kommen muss.                                                 |

[[material-io|Material I/O]] rechts listet, was die Basis pro Tag herstellt und verbraucht. Ein positives Δ wird verkauft, ein negatives gekauft. Ein Symbol nach einem Material heißt, dass der Markt diese Menge vielleicht nicht aufnimmt. Klick darauf, um den Plan-Check zu öffnen.

> [!tip]
> Probier eine Änderung nach der anderen und beobachte **Profit / Tag**: ein anderer Auftrag, ein Gebäude mehr oder ein in **Belegschaft** ausgeschaltetes Luxusgut. **Rückgängig** (Ctrl+Z) nimmt eine Änderung zurück.

Details: [Ergebnisse](/help/plan_results), [Plan-Check](/help/plan_check#market-check).

## 6. Speichere den Plan {#step-6}

1. Klick auf den Stift neben dem Namen des Plans und gib einen Namen ein.
2. Drück **Erstellen** (oder Ctrl+S, auf dem Mac Cmd+S).

Sobald der Status „Gespeichert …“ zeigt, listet das Seitenmenü den Plan unter **Pläne**, wann immer es das Imperium des Plans zeigt. Ab jetzt behält jedes Speichern eine Version, und PRUNplanner hält ungespeicherte Änderungen als Entwurf fest, beim Schließen des Tabs geht also nichts verloren.

Mehr: [Speichern & Versionen](/help/plan_saving).

## Weiter {#next}

- [Einen Planeten für ein Material finden](/help/guide_find_planet): Hol das Beste aus jedem Filter der Planetensuche heraus.
- [Preise einrichten](/help/guide_cx_prices): Kauf- und Verkaufsregeln, Ausnahmen für Planeten und Festpreise.
- [Zum Imperium wachsen](/help/guide_empire): für wenn du deine zweite Basis planst.
