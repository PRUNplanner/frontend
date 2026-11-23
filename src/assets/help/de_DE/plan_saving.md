PRUNplanner sichert deine Arbeit an einem [[plan|Plan]] mit Speicherständen, Entwürfen ungespeicherter Änderungen, Rückgängig, Kopien und benannten Versionen, zu denen du zurückkehren kannst. Wenn sich derselbe Plan an zwei Stellen ändert, fragt es nach, bevor es etwas überschreibt. Wie du einen Plan jemand anderem zeigst, steht unter [Einen Plan teilen](/help/plan_sharing).

Lies das, wenn du wissen willst, ob deine Änderungen sicher sind, wie du zu einem früheren Stand eines Plans zurückkommst oder was eine Speichermeldung bedeutet.

## Speichern und Rückgängig {#saving-and-undo}

Gib deinem Plan mit dem Stift neben seinem Namen einen Namen. Enter oder ein Klick daneben übernimmt den Namen, Esc bricht ab. Speichern kannst du mit **Speichern** (**Erstellen** bei einem neuen Plan) oder Strg+S (Cmd+S auf einem Mac).

- **Speichern** erscheint nur, wenn es etwas zu speichern gibt, und bleibt deaktiviert, bis der Plan einen Namen hat.
- Ein neuer Plan bekommt eine eigene Adresse, sobald er erstellt ist, und deine Imperien und Links nutzen diese. Bis dahin behält PRUNplanner nichts davon, nicht einmal einen [Entwurf](#drafts).
- Rückgängig, Wiederholen, der Zustand des Plans und Speichern sitzen zusammen in einem Bedienelement. Auf einem Handy bleiben Rückgängig und Wiederholen in der Kopfzeile, und der Zustand mit Speichern sitzt über der unteren Navigation.

Der Zustand sagt dir, wo der Plan steht:

| Zustand                                            | Bedeutung                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| „Gespeichert …“                                    | Zu dieser Zeit gespeichert, gefolgt vom Namen der Version, wenn sie einen hat.                                   |
| **Nicht gespeicherte Änderungen**                  | Du hast seit dem letzten Speichern etwas geändert. Ein bernsteinfarbener Punkt markiert das.                     |
| „Ungespeichert · Entwurf behalten …“               | Nicht gespeichert, aber in einem [Entwurf](#drafts) behalten.                                                    |
| **Speichern…**                                     | Das Speichern ist unterwegs.                                                                                     |
| **Speichern fehlgeschlagen**                       | Das Speichern hat nicht geklappt. Deine Änderungen bleiben erhalten, also klick auf **Speichern wiederholen**.   |
| **Entwurf nicht gespeichert**                      | Deine ungespeicherten Änderungen sind in keinem Entwurf gesichert. Klick darauf, um es noch einmal zu versuchen. |
| „Gib deinem Plan einen Namen, um ihn zu erstellen“ | Ein neuer Plan braucht zuerst einen Namen.                                                                       |

Klick auf den Zustand eines gespeicherten Plans, um seine [Versionen](#versions) zu öffnen.

> [!tip]
> **Gespeicherte Version neu laden**, das Symbol neben Speichern, bringt dich zum zuletzt gespeicherten Stand des Plans zurück und verwirft den Entwurf. Hast du ungespeicherte Änderungen, fragt es vorher nach.

### Entwürfe {#drafts}

Sobald ein Plan erstellt ist, sichert PRUNplanner seine ungespeicherten Änderungen etwa 3 Sekunden nach jeder Änderung als Entwurf. Ein Neuladen, ein geschlossener Tab oder ein Absturz verliert sie nicht.

Ein Entwurf ist kein Speichern. Er wird bei deinem Konto aufbewahrt, aber deine Imperien und der Teilen-Link des Plans nutzen weiter die gespeicherte Version, bis du speicherst. Deshalb markiert die Versionsliste einen Entwurf mit „noch in keinem Imperium“.

Wenn du den Plan wieder öffnest, erscheint er immer als gespeichert. Eine Meldung („Du hast ungespeicherte Änderungen vom …“) bietet **Wiederherstellen** an. Deine nächste Änderung oder das Öffnen einer Version schließt die Meldung, und deine neuen Änderungen ersetzen den Entwurf. Wenn du die alten Änderungen zurückhaben willst, klick auf **Wiederherstellen**, bevor du etwas bearbeitest.

Die Seite warnt dich nur dann vor dem Verlassen, wenn der Entwurf deine Änderungen nicht halten kann. Das ist der Fall, wenn der Plan noch nicht erstellt ist, die letzte Änderung weniger als etwa 3 Sekunden her ist oder der Entwurf fehlgeschlagen ist.

### Rückgängig und Wiederholen {#undo}

Du kannst jede Änderung mit **Widerrufen** und **Wiederherstellen** rückgängig machen und wiederholen, oder mit Strg+Z und Strg+Umschalt+Z (Cmd auf einem Mac). In einem Textfeld funktionieren die Tasten nicht.

Der Verlauf hält die letzten 50 Änderungen. Er beginnt neu, wenn du den Plan öffnest, speicherst oder neu lädst und wenn du Änderungen verwirfst. Während du das Layout anpasst, machen die Tasten stattdessen Layout-Änderungen rückgängig (siehe [Layout](/help/plan_layout)).

## Als Kopie speichern {#save-as-copy}

Bei einem gespeicherten, benannten Plan hat der Pfeil neben Speichern (**Speicheroptionen**) den Eintrag **Als Kopie speichern**. Er öffnet **Speichern als**:

- **Name** beginnt mit dem Namen des Plans plus „ (Copy)“.
- Wenn du Imperien hast, beginnt eine Imperiumsauswahl mit dem Imperium, mit dem der Plan rechnet, und die Kopie wird diesem hinzugefügt.
- **Erstellen** speichert den Plan so, wie er jetzt ist, ungespeicherte Änderungen eingeschlossen, als neuen Plan und öffnet ihn in einem neuen Tab. Dein Original behält seinen Zustand und seine ungespeicherten Änderungen.

> [!tip]
> Mit einer Kopie probierst du einen anderen Aufbau derselben Basis aus und behältst beide. Benenn die Kopien eindeutig, denn ab dann sind es getrennte Pläne.

## Versionen {#versions}

Jedes Speichern behält eine Version des Plans. Klick auf den Zustand eines gespeicherten Plans, um **Versionen** zu öffnen.

- **Nur benannte** ist standardmäßig an. Die Liste zeigt deine benannten Versionen und die aktive, mit „… unbenannte ausgeblendet“ unten. Nimm das Häkchen heraus, um alle zu sehen.
- **Aktiv** markiert die Version, die dein Plan gerade ist.
- Hast du ungespeicherte Änderungen, zeigt die oberste Zeile sie als **Ungespeicherte Änderungen**, mit „Entwurf behalten … · noch in keinem Imperium“ oder „Nicht in einem Entwurf behalten“.
- **Vor dem Versionsverlauf** ist der Plan, wie er war, bevor es Versionen gab. **Vom Support geändert** markiert eine Änderung durch den PRUNplanner-Support.
- Benannte Versionen bleiben. PRUNplanner behält die letzten 10 unbenannten, ältere fallen weg.

Wird zum Beispiel ein Plan erstellt und dann 14-mal ohne Namen gespeichert, bleiben die neuesten 10 dieser 15 unbenannten Versionen, und die 5 ältesten sind weg, während jede benannte Version bleibt. Um einen Stand des Plans dauerhaft zu behalten, gib seiner Version einen Namen.

### Versionen benennen {#naming-versions}

Öffne **Speicheroptionen** (oder drück Strg+Alt+S, Cmd+Option+S auf einem Mac), tipp einen Namen in **Versionsname (optional)** und drück Enter oder **Benannt speichern**. Ein Name kann bis zu 80 Zeichen lang sein. Das geht bei jedem gespeicherten, benannten Plan, auch wenn nichts ungespeichert ist, und benennt den Plan so, wie er jetzt ist.

Um eine Version später zu benennen oder umzubenennen, nutze **Diese Version benennen** in ihrem ⋯-Menü. Ein leerer Name entfernt den Namen.

Ein Plan hat höchstens 20 benannte Versionen. Am Limit entfernst du bei einer den Namen oder löschst eine, bevor du eine weitere benennst.

### Vorschau, Vergleich und Wiederherstellen {#preview}

Das Auge an einer Version zeigt sie schreibgeschützt an. Ein Banner sagt dir, welche Version du ansiehst, und die Ergebnis-Kacheln zeigen ihre Zahlen. Von dort aus:

- **Mit aktueller vergleichen** listet auf, was sich von deinem jetzigen Plan unterscheidet.
- **Wiederherstellen** lädt sie als ungespeicherte Änderungen. Rückgängig nimmt das zurück, und Speichern macht sie zur aktiven Version.
- **Als neuen Plan öffnen** kopiert sie in einen neuen Plan in einem neuen Tab, benannt nach dem Plan mit dem Namen oder Datum der Version. Die Kopie ist in keinem Imperium.
- **Zurück zur aktuellen** bringt dich zu deinem Plan zurück, wie er war.

### Aktiv setzen und löschen {#make-active}

**Aktiv setzen**, im ⋯-Menü einer Version oder im Vorschau-Banner, stellt den Plan in einem Schritt auf diese Version um. Deine Imperien und der Teilen-Link des Plans nutzen sie sofort. Sie kommt als neue Version nach oben („Wiederhergestellt aus …“), und die gewählte bleibt, wo sie ist. Ungespeicherte Änderungen werden nach deiner Bestätigung verworfen.

**Löschen** im selben Menü entfernt eine Version endgültig, nachdem du bestätigt hast. Die aktive Version kannst du nicht löschen.

**Änderungen verwerfen** in den **Speicheroptionen** verwirft deine ungespeicherten Änderungen und geht zurück zur gespeicherten Version, nachdem du bestätigt hast.

## Speicherkonflikte {#conflicts}

Derselbe Plan kann in zwei Tabs oder auf zwei Geräten offen sein. PRUNplanner überschreibt nie das eine mit dem anderen, ohne zu fragen.

Speichert ein anderer Tab in diesem Browser den Plan und du hast hier keine ungespeicherten Änderungen, lädt dieser Tab den neuen Stand. Hast du ungespeicherte Änderungen, sagt eine Meldung „In einem anderen Tab gespeichert. Deine Änderungen bleiben erhalten.“ mit **Neu laden**.

Speicherst du, nachdem der Plan woanders gespeichert wurde (in einem anderen Tab oder auf einem anderen Gerät), öffnet sich **In einem anderen Tab gespeichert**. Keine Sorge, wenn es sich öffnet, ist noch nichts überschrieben. Es listet auf, was dort geändert wurde und was du geändert hast, und bietet an:

| Option                       | Was sie bewirkt                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Als neuen Plan speichern** | Speichert deine Änderungen als Kopie („… (copy)“) im Imperium des Plans und öffnet sie. Das Original behält die andere Version. |
| **Überschreiben**            | Ersetzt die andere Version durch deine.                                                                                         |
| **Neu laden**                | Verwirft deine Änderungen und lädt die gespeicherte Version.                                                                    |
| **Weiter bearbeiten**        | Schließt den Dialog, ohne schon etwas zu speichern.                                                                             |

Wurde der Plan woanders gelöscht, bietet **In einem anderen Tab gelöscht** nur **Als neuen Plan speichern** an.

Entwürfe haben eigene Prüfungen:

- **Entwurf woanders gespeichert** heißt, ein anderer Tab oder ein anderes Gerät hat einen neueren Entwurf dieses Plans gesichert. Das automatische Speichern pausiert, bis du **Meine behalten** oder **Anderen Entwurf laden** wählst. **Später entscheiden** schließt den Dialog und lässt das automatische Speichern pausiert.
- **Ungespeicherte Änderungen an einer älteren Version** heißt, du hast ungespeicherte Änderungen hinterlassen, und der Plan wurde seitdem erneut gespeichert. Wähl **Meine Änderungen behalten** (auf dem neueren Speicherstand), **Gespeicherte Version nutzen** (löscht deine ungespeicherten Änderungen) oder **Später entscheiden**.

> [!tip]
> Du arbeitest von zwei Geräten an einem Plan? Speichere, bevor du wechselst. Dann muss das andere Gerät nur neu laden, und du brauchst den Konfliktdialog nie.
