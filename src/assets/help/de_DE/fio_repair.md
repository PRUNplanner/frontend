[FIO Reparieren](/fio/repair) sagt dir, wann jede deiner echten Basen zur [[repair|Reparatur]] fällig ist, was die Reparatur kostet und was aufs Schiff muss. Es liest deine Gebäude aus [[fio|FIO]], du brauchst also zuerst eine [FIO-Verbindung](/help/profile#fio-connection).

Nutze es vor einem Reparaturflug: Es zeigt, welche Basen fällig sind, und stellt die Ladung und ein XIT-Paket für den Flug zusammen. Passt einer deiner Pläne zu einer Basis, übernimmt es die Reparaturtage aus der Reparaturanalyse dieses Plans.

## Fälligkeiten {#due-dates}

FIO Reparieren liest die Produktionsgebäude jeder Basis aus FIO, mit ihrem Zustand und dem Tag, an dem sie zuletzt repariert (oder gebaut, falls nie repariert) wurden. Unterkünfte, Lager und das Kernmodul altern auch, brauchen aber keine Reparaturmaterialien und bleiben deshalb außen vor.

Jeder Gebäudetyp wird an einem Zieltag fällig:

- **Mit zugeordnetem Plan** ist das Ziel der beste Reparaturtag des Typs aus der Reparaturanalyse dieses Plans (siehe [Plan-Werkzeuge](/help/plan_tools#repair)), bewertet mit der Marktplatz-Präferenz des Imperiums des Plans. Ein Gebäudetyp, den der Plan nicht hat, nutzt das Intervall unten.
- **Ohne Plan** ist das Ziel das Intervall aus den Einstellungen (**Reparatur alle** n Tage, Standard 60).

Das älteste Gebäude eines Typs bestimmt, wann dieser Typ fällig ist, und eine Basis wird mit ihrem ersten Gebäudetyp fällig. Eine Basis ist _bald fällig_, wenn ihr Ziel höchstens **Bald fällig** Tage entfernt ist (Standard 7). Hat ein Gebäude gar kein Datum, zeigt seine Basis **Kein Reparaturdatum**. Sie zählt als überfällig und wird wie ein neues Gebäude abgerechnet. Keine Sorge, das heißt nur, dass FIO für eines ihrer Gebäude kein Datum geschickt hat, und die Rechnung zählt dieses Gebäude mit dem Höchstbetrag, den seine Reparatur kosten kann.

## Einstellungen {#settings}

Die Einstellungsleiste sitzt oben:

| Einstellung                              | Standard              | Was sie macht                                                                                                                                                                         |
| ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zugeordnete Pläne nutzen**             | an                    | Nutzt die besten Tage zugeordneter Pläne. Ist sie aus, wird jede Basis im Intervall repariert. Sie ist bei jedem Öffnen der Seite an. |
| **Reparatur alle** / **Ohne Plan, alle** | 60 Tage               | Das Intervall für Basen ohne Plan (1–180)                                                                                                                          |
| **Bald fällig**                          | 7 Tage                | Tage vor dem Zieltag, die als bald fällig zählen (0–60)                                                                                                            |
| **Marktplatz-Präferenz**                 | deine **Standard CX** | Preise für die Reparaturmaterialien                                                                                                                                                   |

Das Intervall, die Tage für bald fällig und die Marktplatz-Präferenz sind dieselben Einstellungen wie im [Profil](/help/profile#preferences), und sie werden in deinem Konto gespeichert.

## Übersicht {#overview}

- **Überfällig**, **Fällig binnen n T** und **Später** zählen deine Basen. Klick auf eine Zahl, um die Liste zu filtern. Überfällig schließt Basen ohne Reparaturdatum ein.
- **Fälliges heute reparieren** sind Kosten, Gewicht und Volumen, um jede überfällige und bald fällige Basis heute zu reparieren.
- **Warten kostet** ist, wie viel mehr diese Reparatur für jeden Tag kostet, den du wartest. Jedes dieser Gebäude, das jünger als 180 Tage ist, fügt 1/180 seiner Baukosten hinzu. Ein Beispiel (ausgedachte Zahlen): Zwei solcher Gebäude, deren Bau 90.000 ȼ und 180.000 ȼ kostet, fügen für jeden Tag Warten 500 + 1.000 = 1.500 ȼ hinzu.
- **Wann Basen fällig werden** ist eine Zeitleiste von der am längsten überfälligen Basis bis zur zuletzt fälligen. Klick auf eine Basis, um sie zu öffnen.
- Die Liste **Basen** zeigt für jede Basis die Gebäude, den niedrigsten Zustand, die Tage seit der Reparatur (oder seit dem Bau), die nächste Reparatur und **Jetzt reparieren**, die Rechnung, um heute jedes Produktionsgebäude zu reparieren. Unter dem Namen siehst du, welcher Plan die Ziele setzt: „Plan …“, „wahrscheinlich Plan …“, „Plan … (deine Wahl)“ oder „kein Plan · alle n T“.

Sind deine FIO-Daten älter als einen Tag, sagt dir ein Hinweis das. Die Gebäude sind seitdem gealtert, der Zustand ist also niedriger und die Mengen höher als angezeigt. Das Alter wird immer bis heute gezählt.

## Zugeordnete Pläne {#matched-plans}

Ein Plan passt zu einer Basis, wenn er auf demselben Planeten liegt und seine Produktionsgebäude gut genug zu FIO passen. PRUNplanner zählt pro Gebäudetyp die Gebäude, die beide haben, und teilt durch die größere Gesamtzahl (die von FIO oder die des Plans). Ab 80 % passt der Plan, zusätzliche Gebäude im Plan senken die Wertung also ebenfalls.

Ein Beispiel: Eine Basis hat 4 FRM und 2 FP, und ein Plan auf ihrem Planeten hat dasselbe plus 1 PP1. Sie haben 6 Gebäude gemeinsam, und die größere Gesamtzahl sind die 7 des Plans, die Wertung ist also 6 ÷ 7, etwa 86 %: eine wahrscheinliche Zuordnung. Ein Plan mit nur den 4 FRM kommt auf 4 ÷ 6, etwa 67 %, und passt nicht.

- **Zugeordnet**: Alle Gebäude passen.
- **Wahrscheinlich**: Mindestens 80 % passen. Prüfe, ob es der Plan ist, den du betreibst.

Kommen mehrere Pläne infrage, gewinnt die beste Wertung. Bei Gleichstand gewinnt der Plan in dem Imperium, das die meisten deiner Basen abdeckt. Um einen anderen Plan oder keinen Plan zu wählen, öffne eine Basis und nutze **Reparaturziel**, wo jede Option ihre Übereinstimmung in % zeigt. PRUNplanner speichert deine Wahl für diese Basis in deinen Einstellungen, auf jedem Gerät. **Zurück zur automatischen Zuordnung** macht sie rückgängig. Liegt keiner deiner Pläne auf diesem Planeten, startet **Plan für {planet} erstellen** dort einen neuen Plan.

## Reparaturflug {#repair-flight}

Öffne eine Basis, um die Reparatur zu planen. Ihre Tabelle listet jeden Gebäudetyp mit Ziel, Tagen seit der Reparatur, Zustand und Fälligkeitstag.

Reparieren wird jeden Tag teurer. Die Rechnung wächst bis Tag 180, an dem sie einem neuen Gebäude entspricht. Im **Reparaturflug**:

- **Ankunft in** n Tagen (Standard 2, 0–30) bemisst die Rechnung für den Tag, an dem das Schiff entlädt, und zeigt, wie viel mehr das kostet als heute zu reparieren. Rechne bei langen Flügen ein oder zwei Tage dazu.
- **Vorhandenes aus dem Basislager nutzen** zieht ab, was die Basis schon hat.
- **Frachtgewicht** und **Frachtvolumen** zeigen die Gesamtladung, und die Ladeliste zeigt Menge und Preis jedes Materials sowie den Gesamtpreis.

**XIT Reparatur** baut ein [[xit|XIT]]-ACT-Paket mit der Ladung, das Refined PrUn ausführt. Es nutzt dieselbe XIT-Herkunft und dieselbe Einstellung „Von CX kaufen“ wie FIO Verbrauch (beides stellst du im [Profil](/help/profile#preferences) ein). Das Schiff wird gewählt, wenn das XIT läuft, und braucht so viele Tonnen und Kubikmeter freien Frachtraum wie die Ladung. Flieg zur Basis, entlade und führe BRA aus, um alle ihre Gebäude zu reparieren.

## Preise {#prices}

Die Preise kommen aus deiner **Standard CX** (hier als **Marktplatz-Präferenz** angezeigt), und zwar nur aus ihren Regeln für alle Planeten und ihren Festpreisen. Planeten-Ausnahmen werden nicht genutzt. Hast du keine Standard-Präferenz oder wurde sie gelöscht, sind die Preise Universe · VWAP 30D. Siehe [Marktplätze & Preise](/help/exchanges).
