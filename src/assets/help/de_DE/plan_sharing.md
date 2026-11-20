Mit einem Freigabelink kann sich jeder einen deiner [[plan|Pläne]] ansehen, mit oder ohne PRUNplanner-Konto. Nutze ihn, um eine Basis in einem Discord-Thread zu zeigen, um Feedback zu bitten oder einem Corp-Kollegen ein Setup zu übergeben. Betrachter können Änderungen an ihrer eigenen Kopie ausprobieren und sie als eigenen Plan speichern, aber dein Plan ändert sich nie.

Diese Seite erklärt, wie du einen Link erstellst und beendest, was Leute sehen und tun können, wenn sie ihn öffnen, und wie der Link aussieht, wenn du ihn in einen Chat einfügst.

## Einen Plan teilen {#share-link}

Öffne deinen Plan und klick im Kopf auf **Link teilen**. Der Button erscheint bei deinen eigenen Plänen, sobald sie gespeichert sind. In der [Verwaltung](/manage) öffnet das ⋯-Menü in der Zeile eines Plans denselben Dialog unter **Teilen…**.

Der Dialog **Plan teilen** arbeitet in zwei Schritten:

1. Bevor der Plan geteilt ist, erklärt er, was der Link macht. **Freigabelink erstellen** erstellt ihn.
2. Sobald er geteilt ist, zeigt der Dialog den Link selbst, `https://prunplanner.org/shared/…`, und wie oft er angesehen wurde. **URL kopieren** kopiert ihn, und **Freigabe beenden** beendet ihn.

Jeder Plan hat einen Link, ein erneutes Öffnen des Dialogs zeigt also denselben Link und seine Aufrufe. Jedes Öffnen des Links zählt als Aufruf, Neuladen eingeschlossen. Auch deine eigenen Klicks zählen: Öffnest du deinen eigenen Link, zählt das als Aufruf, bevor PRUNplanner zu deinem Plan wechselt. In der Verwaltung markiert ein kleines Auge mit der Anzahl jeden geteilten Plan.

### Was Betrachter sehen {#what-viewers-see}

Der Link zeigt deinen Plan immer so, wie er gespeichert ist: seine aktive Version, ohne die ungespeicherten Änderungen, die du offen hast. Speicherst du den Plan oder machst eine andere Version aktiv ([Versionen](/help/plan_saving#versions)), sieht der nächste Betrachter das.

> [!tip]
> Teile den Plan, über den du wirklich sprechen willst. Arbeitest du weiter daran, während andere zusehen, speichere eine Kopie (**Als Kopie speichern** im Speichermenü) und teile diese, damit sich der Link nicht unter ihnen verändert.

### Einen Link beenden {#stop-sharing}

**Freigabe beenden** beendet den Link sofort, ohne nachzufragen. Wer ihn danach öffnet, sieht „**Dieser geteilte Plan ist nicht mehr verfügbar**“. Löschst du den Plan, endet sein Link ebenfalls. Teilst du den Plan später erneut, bekommt er einen neuen Link, und der alte bleibt tot. Kopien, die Leute schon in ihren eigenen Plänen gespeichert haben, sind nicht betroffen, weil es eigene Pläne sind.

## Einen geteilten Plan öffnen {#shared-view}

Ein geteilter Link öffnet die Planseite mit einem Banner oben: „**Geteilter Plan**“, „Versuche Änderungen an deiner Kopie dieses Plans. Der geteilte Plan verändert sich dadurch nie.“

### Deine Arbeitskopie {#working-copy}

Was du siehst, ist eine Arbeitskopie. Du kannst alles ändern, was du auch in deinem eigenen Plan ändern könntest, etwa Gebäude, Aufträge, Experten, Unterkünfte oder das [[empire|Imperium]], mit dem gerechnet wird. Rückgängig und Wiederherstellen funktionieren wie gewohnt.

- Die Kopie lebt nur in diesem Browser-Tab. Verlässt du die Seite, verschwindet sie ohne Nachfrage. Eingeloggt behältst du deine Änderungen mit **In meinen Plänen speichern** (siehe [Zurücksetzen, kopieren, speichern](#shared-actions)).
- Die Unterkünfte bleiben so, wie der Besitzer sie eingestellt hat. Die automatische Optimierung ist aus, bis du unter Infrastruktur **Auto** einschaltest.
- Die Werkzeuge arbeiten mit deiner Kopie. Gebaute Anzahlen in [Konstruktion](/help/plan_tools#construction) und ausgeschlossene Materialien in [Besuche](/help/plan_tools#visits) gelten nur für den Besuch, und Reparatur blendet ihren FIO-Teil aus. Jeder [[fio|FIO]]-Bestand, den die Werkzeuge nutzen, ist dein eigener.
- Ausgeloggt siehst du den Plan im Standard-Layout und ohne den Tab POPR. Eingeloggt siehst du ihn in deinem eigenen Layout.
- Öffnest du einen Link zu deinem eigenen Plan, öffnet PRUNplanner stattdessen den Plan selbst.

### Preise {#shared-prices}

Unter dem Titel des Banners sagt dir ein Hinweis, welche Preise die Zahlen nutzen: „Preise: …“, gefolgt von „Die Person, die ihn geteilt hat, kann unterschiedliche Zahlen sehen.“

- **Eingeloggt** berechnet PRUNplanner die Kopie mit deinem Standard-Imperium (oder deinem ersten), die Preise folgen also der [[exchange-preference|Marktplatz-Präferenz]] dieses Imperiums („Deine Handelspräferenz: {name}“). Ein Imperium ohne eine nutzt den 30-Tage-Durchschnitt des [[universe|Universe]].
- **Ausgeloggt** sind die Preise der 30-Tage-Durchschnitt des Universe.

> [!tip]
> Du vergleichst dich mit dem Besitzer? Sag ihm, welche Marktplatz-Präferenz du nutzt, oder prüft beide die Zahlen gegen dieselbe Präferenz. Profit und Amortisation können sich zwischen Marktplätzen stark unterscheiden.

### Mit der geteilten Version vergleichen {#vs-shared}

Sobald deine Kopie vom geteilten Plan abweicht, sagt das Banner „**Geändert von der geteilten Version**“. Eine Zeile unter dem Kopf listet nach „**vs. geteilt:**“, was sich verändert hat:

| Kennzahl                     | Angezeigt als                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Profit                       | die Änderung in ȼ / Tag, grün, wenn er gestiegen ist, rot, wenn er gefallen ist |
| [[roi\|ROI]]                 | die Amortisation vorher → nachher, grün, wenn sie kürzer wurde                  |
| Fläche, Belegschaft, Gebäude | die Änderung der genutzten Fläche, der benötigten Arbeiter und der Gebäudezahl  |

Ein Beispiel (ausgedachte Zahlen): Bringt der geteilte Plan 10.000 ȼ am Tag und deine Kopie 12.000 ȼ, zeigt Profit den Anstieg um 2.000 ȼ/Tag in Grün.

Die Zeile listet nur die Kennzahlen, die sich geändert haben. In der Produktion sind geänderte Gebäude mit **neu**, **Anzahl geändert** oder **Auftrag geändert** markiert, und Aufträge, die das geteilte Gebäude nicht hatte, mit **neu**. Entfernte Gebäude bleiben durchgestrichen in der Liste, als **entfernt**.

### Zurücksetzen, kopieren, speichern {#shared-actions}

- **Auf geteilte Version zurücksetzen** verwirft deine Änderungen und geht zurück zum geteilten Plan.
- **Änderungen kopieren** legt eine Zusammenfassung in deine Zwischenablage, fertig zum Einfügen in Discord. Sie enthält Namen und Planet des Plans, eine Zeile pro Änderung, Profit und Amortisation vorher → nachher, die genutzten Preise und den Link. Sie wird auf 2.000 Zeichen gekürzt, mit „...und {n} weitere“ für den Rest. Eine Meldung bestätigt: „**Änderungen kopiert. Teile sie in Discord**“.
- **In meinen Plänen speichern** (oder Strg+S, ⌘+S auf dem Mac) speichert deine Kopie mit deinen Änderungen als neuen eigenen Plan. Der Dialog fragt nach einem **Name** (er schlägt den Namen des Plans mit „(Kopie)“ vor) und, wenn du Imperien hast, nach einem **Imperium**. **Erstellen** speichert ihn und öffnet deinen neuen Plan. Der Plan des Besitzers und sein Link bleiben, wie sie sind.
- Bist du nicht eingeloggt, stehen an ihrer Stelle **Melde dich an, um zu Speichern** und **Anmelden**.

> [!tip]
> Du willst jemandem eine Verbesserung für seine Basis vorschlagen? Mach die Änderung in der Kopie, prüf die Zeile „vs. geteilt:“, dann **Änderungen kopieren** und füg die Zusammenfassung in den Thread ein. So sieht er genau, was du geändert hast und was es mit Profit und Amortisation macht, samt Link, um es selbst zu öffnen.

## Link-Vorschauen {#link-previews}

Füg einen Freigabelink in Discord oder eine andere Chat-App ein, die Link-Vorschauen zeigt, und er klappt zu einer Karte für den Plan auf. Die Karte ist auf Englisch.

- **Titel**: der Planet, dann der Name des Plans, zum Beispiel „Montem (OT-580b) · Iron base“.
- **Text**: wer ihn geteilt hat, der Profit pro Tag, die Amortisation, wenn sich der Plan amortisiert („pays back in 42 days“), das COGC-Programm des Plans und die Outputs, die er herstellt. Danach die Preisgrundlage des wichtigsten Outputs (zum Beispiel „CI1 30-day average“ oder „own prices“ für einen [[fixed-price|Festpreis]]) und das Datum dieser Preise. Am Ende steht „Open it to see the whole base and try changes, no account needed.“
- **Bild**: Planet und Planname, wer ihn geteilt hat, der Profit pro Tag in großen Zahlen, die Amortisation, die genutzte von der verfügbaren Fläche und bis zu vier Outputs mit ihren Mengen pro Tag.

Die Karte nutzt die Zahlen, die PRUNplanner beim letzten Speichern des Plans abgelegt hat. Erstellst du einen Link von der Planseite aus, werden außerdem die aktuellen Zahlen abgelegt, sofern der Plan keine ungespeicherten Änderungen hat. Jedes Speichern gibt dem Link eine frische Karte.

Manchmal sind keine Zahlen abgelegt, zum Beispiel bei einem Plan, der zuletzt vor Einführung der Vorschauen gespeichert wurde, oder direkt nachdem du eine ältere Version aktiv gemacht hast. Dann zeigt die Karte den Planeten, das COGC, die Gebäudezahl und was der Plan herstellt, ohne Profit oder Amortisation. Speichere den Plan einmal, um sie hinzuzufügen.

> [!tip]
> Speichere den Plan, bevor du seinen Link postest. Die Karte zeigt die Zahlen des letzten Speicherns, ein Link, der mit ungespeicherten Änderungen gepostet wird, zeigt also die alten Werte.
