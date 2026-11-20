In der Produktion fügst du Gebäude hinzu, legst fest, wie viele du baust, reihst [[recipe|Aufträge]] ein und vergleichst Aufträge, bevor du einen austauschst. Sie listet die Gebäude des Plans und die Aufträge, die jedes davon abarbeitet. Die Zahlen zu Gebäuden und Aufträgen nutzen dieselben Preise und dieselbe Effizienz wie die [Ergebnisse](/help/plan_results).

## Gebäude hinzufügen {#adding-buildings}

Die Gebäudeauswahl über der Liste bietet jedes Produktionsgebäude an, das noch nicht im Plan ist. Wählst du eins, wird es mit Anzahl 1 und ohne Auftrag hinzugefügt. Es stellt nichts her, bis du ihm mit **+ Auftrag** einen gibst (siehe [Aufträge](#orders)).

Ein leerer Plan zeigt „Noch keine Gebäude.“ und verweist dich auf die Gebäudeauswahl. Mit eingeschalteten **Plan-Vorschläge** und verfügbaren Planeten-Einblicken bietet er stattdessen an, mit einem typischen Setup zu starten.

**Filter auf COGC** beschränkt die Auswahl auf Gebäude, deren [[expertise|Fachgebiet]] zum [[cogc|COGC]]-Programm des Plans passt. Steht das Programm auf **Keine** oder auf einem Belegschaftsprogramm (Pioniere bis Wissenschaftler), passt kein Gebäude und die Liste ist leer. Nimm das Häkchen heraus, um wieder alle Gebäude zu sehen.

Mit eingeschalteten **Plan-Vorschläge** (im [Profil](/profile)) und genug Plänen auf dem Planeten beginnt die Auswahl mit einer Gruppe „Beliebt auf …“, die meistgeplanten Gebäude zuerst, gefolgt von **Alle Gebäude**.

Für den Abbau klickst du stattdessen auf eine Ressource unter **Planet**. Das fügt den passenden Extraktor mit dem Auftrag dieser Ressource hinzu (siehe [Basis einrichten](/help/plan_base#resources)). Ein leerer Plan kann auch mit dem typischen Setup des Planeten starten, wie unter [Layout](/help/plan_layout) beschrieben.

Die Zeile über den Gebäuden zählt sie („… Gebäude · … Einheiten · … Aufträge“). **Alle einklappen** und **Alle ausklappen** klappen jedes Gebäude zu oder auf.

## Die Gebäudezeile {#building-row}

Jedes Gebäude hat eine Zeile mit den Spalten **Gebäude**, **Anzahl**, **Eff.**, **ȼ / Tag** und **Fläche**.

| Spalte      | Was sie zeigt                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gebäude** | Den Namen. Klick darauf, um seine Aufträge zu- oder aufzuklappen. Eine zugeklappte Zeile zeigt die Kacheln dessen, was es herstellt. Das Zuklappen gilt nur für diesen Besuch. |
| **Anzahl**  | Wie viele du baust. Bei 0 bleibt die Zeile stehen, mit rotem linken Rand, und das Gebäude stellt nichts her, verbraucht nichts und kostet nichts.                              |
| **Eff.**    | Die [[efficiency\|Effizienz]] des Gebäudes. Fahr mit der Maus darüber, um jeden Faktor zu sehen.                                                                               |
| **ȼ / Tag** | Was alle Gebäude dieser Zeile pro Tag einbringen (siehe unten).                                                                                                                |
| **Fläche**  | Die Fläche des Gebäudes × Anzahl.                                                                                                                                              |

Unter dem Namen ist das Fachgebiet des Gebäudes grün mit ✓, wenn das COGC-Programm des Plans es anhebt, und rot mit ✗, wenn nicht. Danach kommen die anderen Faktoren, die die Effizienz ändern: die Zahl der Experten („3 Experten“), Fraktion, HQ (Corp. HQ), Fruchtbarkeit und COGC bei einem Belegschaftsprogramm. Bei 0 % steht der Grund zuerst in Rot: „Planet nicht fruchtbar“, „Keine Belegschaft untergebracht“ oder der Faktor, der 0 ist. [Basis einrichten](/help/plan_base#efficiency) erklärt, wie jeder Faktor wirkt.

Das **ȼ / Tag** eines Gebäudes ist:

- seine eigenen Inputs und Outputs pro Tag, innerhalb des Gebäudes verrechnet, Outputs zum Verkaufspreis und Inputs zum Kaufpreis,
- minus die Verbrauchsgüter seiner Belegschaft zum Kaufpreis,
- minus 1/180 seiner Baukosten (Abnutzung),
- minus seine [[production-fees|Produktionsgebühren]],
- alles mal die Anzahl.

Ein Beispiel (ausgedachte Zahlen): Nimm eine Zeile mit 2 Gebäuden. Die Outputs jedes Gebäudes verkaufen sich für 3.000 ȼ pro Tag, seine Inputs kosten 1.000 ȼ, die Verbrauchsgüter seiner Arbeiter 400 ȼ, seine Abnutzung 100 ȼ und seine Gebühren 50 ȼ. Das ȼ / Tag der Zeile ist (3.000 − 1.000 − 400 − 100 − 50) × 2 = 2.900 ȼ.

Die Belegschaftskosten folgen den Unterkünften und Luxusgütern des Plans, also kosten Arbeiter ohne Bett und abgeschaltete Luxusgüter nichts. Ein Gebäude zahlt immer die Verbrauchsgüter seiner eigenen Arbeiter, auch wenn der Plan sie selbst herstellt.

Der **Profit / Tag** des Plans rechnet dagegen mit dem Material I/O der ganzen Basis, wo sich verrechnet, was ein Gebäude herstellt und ein anderes verbraucht. Auf einer Basis, die ihre eigenen Verbrauchsgüter oder Inputs herstellt, ergibt die Summe der ȼ / Tag der Gebäude also nicht den **Profit / Tag**.

Wo der Produktionsbereich schmal ist, rutschen Effizienz und Fläche unter ȼ / Tag, als „ȼ/Tag · … · Fläche …“.

Das Papierkorb-Symbol löscht das Gebäude sofort, ohne zu fragen. Du kannst das mit Strg+Z (Cmd+Z auf einem Mac) oder mit **Widerrufen** in der Meldung „Gebäude entfernt“ rückgängig machen.

## Aufträge {#orders}

Ein Gebäude arbeitet seine Aufträge nacheinander ab und fängt dann von vorn an. Jede Auftragszeile zeigt:

- die Menge, also wie viele Durchläufe des Auftrags pro Runde anstehen;
- den Auftrag, als seine Inputs und Outputs (klick darauf, um [ihn zu ändern](#changing-a-recipe));
- seine Laufzeit: die Zeit des Auftrags × Menge ÷ die Effizienz des Gebäudes;
- seinen Anteil an der Zeit des Gebäudes: seine Laufzeit ÷ die Laufzeit aller Aufträge;
- seinen Teil am **ȼ / Tag** des Gebäudes;
- **COGM** (siehe [COGM](#cogm));
- Löschen, ohne vorher zu fragen („Auftrag entfernt“, mit Rückgängig).

Ein Beispiel (ausgedachte Zahlen): Bei 100 % Effizienz dauert ein Auftrag mit 2 Durchläufen eines 4-Stunden-Auftrags 8 h und einer mit 3 Durchläufen eines 8-Stunden-Auftrags 24 h. Zusammen sind das 32 h, also bekommt der erste Auftrag 8 ÷ 32 = 25 % der Zeit des Gebäudes und der zweite 75 %. Bei 125 % Effizienz schrumpfen die Laufzeiten auf 6,4 h und 19,2 h, und die Anteile bleiben gleich.

Das ȼ / Tag eines Auftrags ist das ȼ des Auftrags pro Gebäude und Tag (wie in der [Auftragsauswahl](#changing-a-recipe)) × sein Zeitanteil × die Anzahl. So teilen die Aufträge die Zahl des Gebäudes nach ihrer Zeit auf.

Wenn die Aufträge keine Outputs voneinander nutzen, ergibt ihre Summe die Zahl des Gebäudes. Wenn doch, verrechnet das Gebäude diese Materialien und die Aufträge nicht, die Summen weichen dann ab. Ein Auftrag, der nie läuft (0 % der Zeit), zeigt „—“. Bei 0 % Effizienz zeigen alle Aufträge „—“, während das Gebäude seine Fixkosten (Abnutzung und eine eventuell untergebrachte Belegschaft) weiter als Verlust zeigt.

**+ Auftrag** fügt einen neuen Auftrag hinzu, und ein Gebäude kann denselben Auftrag zweimal einreihen. Ein Gebäude ohne Aufträge zeigt **Keine aktiven Aufträge**. Bis du einen hinzufügst, stellt es nichts her, zahlt aber weiter seine Abnutzung und die Verbrauchsgüter seiner untergebrachten Arbeiter, also zeigt sein ȼ / Tag einen Verlust. Mit eingeschalteten **Plan-Vorschläge** und Planeten-Einblicken zeigt es außerdem **Meist geplant:** mit der meistgeplanten Auftragsmischung des Planeten, ihrem Anteil an den Plänen und **Hinzufügen**.

> [!tip]
> Nutze die Mengen, um eine Kette innerhalb eines Gebäudes auszubalancieren: Die Anteilsspalte zeigt, wie sich die Zeit des Gebäudes aufteilt. Verdoppelst du die Menge eines Auftrags, verdoppelt sich seine Laufzeit, er bekommt also einen größeren Anteil und die anderen Aufträge einen kleineren.

## Einen Auftrag ändern {#changing-a-recipe}

Klick auf den Auftrag in einer Auftragszeile, um die Auswahl darunter zu öffnen (**Auftrag ändern**, „ersetzt …“), oder auf **+ Auftrag**, um einen neuen Auftrag hinzuzufügen. Es ist immer nur eine Auswahl offen.

Klick auf eine Zeile oder drück Enter, um sie zu wählen. ↑ und ↓ bewegen dich durch die Liste, und Esc oder ein Klick daneben schließt sie. Auf einem Handy öffnet sich die Auswahl als Blatt von unten und zeigt **Erzeugt** (mit der Laufzeit darunter), **Aus** und **ȼ / Tag**.

Nach einer Änderung sagt eine Zeile unter der Zeile, was sich geändert hat („… durch … ersetzt.“ oder „… als neuen Auftrag hinzugefügt.“), mit **Widerrufen**.

Die ȼ-Zahlen in der Auswahl gelten _pro Gebäude und Tag_: für ein Gebäude, das nur diesen Auftrag bei seiner aktuellen Effizienz abarbeitet. Die Fußzeile sagt **ȼ pro Gebäude und Tag**.

| Spalte           | Was sie zeigt                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Erzeugt**      | Die Outputs eines Durchlaufs.                                                                                                                                                                                                                                                                                                                                |
| **Aus**          | Die Inputs eines Durchlaufs, mit einer Zeile darunter (siehe unten).                                                                                                                                                                                                                                                                                         |
| **Laufzeit**     | Ein Durchlauf bei der Effizienz des Gebäudes.                                                                                                                                                                                                                                                                                                                |
| **ȼ / Tag**      | Outputs zum Verkaufspreis minus Inputs zum Kaufpreis, × Durchläufe pro Tag, minus 1/180 der Baukosten, die Verbrauchsgüter der Belegschaft und die Produktionsgebühr (die Gebühr des Planeten × Effizienz). Während du einen Auftrag änderst, vergleicht „… vs. jetzt“ ihn mit dem, den du ersetzt.                                                          |
| **ȼ / Fläche**   | ȼ / Tag ÷ die Fläche pro Gebäude eines Standard-Layouts für dieses Gebäude, wie im [Auftrags-ROI](/help/tools_roi_overview). Diese Fläche ist seine eigene Fläche plus sein Anteil an Unterkünften, Lager und den 25 des Kernmoduls. Ein Gebäude ohne Standard-Layout zählt seine eigene Fläche + 25. So kannst du Aufträge über Gebäude hinweg vergleichen. |
| **Amortisation** | Die Baukosten des Gebäudes ÷ sein ȼ / Tag, ohne Unterkünfte. „nie“, wenn es keinen Profit macht.                                                                                                                                                                                                                                                             |
| **Pläne**        | Der Anteil der Pläne auf diesem Planeten mit diesem Gebäude, die den Auftrag nutzen. „< 5 %“, wenn er unter 5 % liegt oder weniger als 10 Spieler ihn nutzen.                                                                                                                                                                                                |

Die Spalte **Pläne** und der Schalter **Sortieren nach** erscheinen nur mit eingeschalteten **Plan-Vorschläge** und auf einem Planeten mit genug Plänen. Das heißt mindestens 15 Pläne von mindestens 10 Spielern, wobei Spieler zählen, die in den letzten 90 Tagen aktiv waren, und Pläne, die in den letzten 180 Tagen geändert wurden.

**Sortieren nach** ordnet die Zeilen nach **ȼ / Tag** (Standard) oder **Beliebt** (meistgeplant zuerst). Wenn du einen Auftrag änderst, kommt der aktuelle zuerst, markiert und nicht wählbar. Wenn du einen hinzufügst, kommen die Aufträge, die das Gebäude schon abarbeitet, zuletzt.

Die Zeile unter den Inputs fasst zusammen:

- „nutzt … aus dem Plan“: die Inputs, die der Plan schon herstellt;
- „versorgt …“: Gebäude im Plan, deren Aufträge einen Output dieses Auftrags nutzen;
- **aktueller Auftrag** oder **im Plan**.

### Hinweis auf Abhängigkeiten {#dependency-note}

Wenn der Plan einen Output des Auftrags nutzt, den du ersetzt, erscheint über der Liste eine Warnung: „Deine … verarbeiten dieses … zu …. Ersetzen heißt, … pro Tag zu kaufen. Um beides zu behalten, nutze „+ Auftrag“.“ Wenn deine Belegschaft es verbraucht, sagt der Hinweis das stattdessen.

Die Menge ist, wie viel dieses Materials der Plan insgesamt pro Tag verbraucht, aus dem Material I/O. Es ist die ganze Menge, auch wenn andere Aufträge einen Teil davon ebenfalls herstellen.

> [!tip]
> Du willst einen Auftrag ausprobieren, ohne den alten zu verlieren? Füg ihn mit **+ Auftrag** als zweiten Auftrag hinzu, vergleich das ȼ / Tag des Gebäudes und lösch dann den, den du nicht willst.

## COGM {#cogm}

**COGM** an einem Auftrag öffnet seine [[cogm|Herstellungskosten]]. Sie zeigen, was ein Durchlauf kostet und damit, was jede Einheit Output kostet, bei der Effizienz und den Preisen dieses Plans.

- **Parameter**: die Laufzeit des Auftrags bei dieser Effizienz, ihr Anteil an einem Tag (**% / Tag**), **Effizienz**, **Abnutzung** (die Baukosten des Gebäudes ÷ 180 pro Tag) und **Produktionsgebühr / Durchlauf** (die gewichtete Gebühr × die Basiszeit des Auftrags, unabhängig von der Effizienz).
- **Kosten** eines Durchlaufs: jeder Input zum Kaufpreis (**Input Gesamt**), der Anteil **Belegschaft** (die täglichen Belegschaftskosten des Gebäudes × der Anteil des Durchlaufs an einem Tag), der Anteil an der Abnutzung und die Produktionsgebühr. Zusammen ergeben sie **Gesamtkosten**.
- Pro Output: **Gesamtkosten** legt die ganzen Kosten auf diesen Output (Kosten ÷ seine Menge), während **Kostenteilung** sie nach Menge über alle Outputs verteilt (Kosten ÷ die Mengen aller Outputs).

Die Anteile folgen der Zeit des Durchlaufs. Zum Beispiel ist ein 6-Stunden-Durchlauf bei 100 % Effizienz 25 % eines Tages, er trägt also 25 % der täglichen Belegschaftskosten und der Abnutzung des Gebäudes. Und kostet ein Durchlauf insgesamt 600 ȼ und stellt 2 von einem Output und 1 von einem anderen her, ist **Gesamtkosten** 600 ÷ 2 = 300 ȼ für den ersten und 600 ÷ 1 = 600 ȼ für den zweiten, während **Kostenteilung** 600 ÷ 3 = 200 ȼ für jeden ist. Bei einem Auftrag mit nur einem Output zeigen beide Spalten dieselbe Zahl.

Die Preise kommen aus der [[exchange-preference|Marktplatz-Präferenz]] des Imperiums. Hat es eine, macht **Als Kaufpreis auf allen Planeten verwenden** den COGM zu einem festen Kaufpreis für jeden Plan, der diese Präferenz nutzt (siehe [Marktplätze](/help/exchanges#fixed-prices-and-cogm)).
