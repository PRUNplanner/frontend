In der [Verwaltung](/manage) organisierst du dein Konto. Du erstellst und löschst Imperien und Marktplatz-Präferenzen, verbindest jedes Imperium mit seinen Preisen und legst fest, welche Pläne zu welchem Imperium gehören. Du nutzt sie, um dein erstes Imperium und deine erste Marktplatz-Präferenz einzurichten, und später, um Pläne zwischen Imperien zu verschieben oder die zu löschen, die du nicht mehr brauchst.

## Grundbegriffe {#core-concepts}

PRUNplanner hält deine Planung in drei Arten von Dingen fest, und jede bekommt ihren eigenen Abschnitt auf der Seite.

### Pläne {#plans}

Ein [[plan|Plan]] ist eine Basis: ihr Planet, ihre Gebäude, Aufträge und Boni. Du erstellst einen Plan aus einem Planeten in der [Planetensuche](/search). Ein Plan kann in mehreren Imperien gleichzeitig sein oder in keinem. So kannst du ihn in einem Imperium deiner echten Basen und in einem für eine künftige Erweiterung wiederverwenden.

Ein Plan hat keine eigene Marktplatz-Präferenz. Er nutzt die [[exchange-preference|Marktplatz-Präferenz]] seines Imperiums. Ist er in mehreren Imperien, nutzt er die des Imperiums, mit dem er rechnet, das du im Plan wählst (siehe [Imperium & Preise](/help/plan_base#empire-and-prices)).

### Imperien {#empires}

Ein [[empire|Imperium]] ist eine Gruppe von Plänen, zum Beispiel alle Basen, die du im Spiel betreibst, oder eine Auswahl, die du vergleichen willst. Es enthält deine [[faction|Fraktion]] und deine [[area-permits|Genehmigungen]], die den Produktionsbonus jedes Plans darin ändern, und es nutzt eine Marktplatz-Präferenz für seine Preise. Die Seite [Imperium](/help/empire) zeigt die Zahlen eines Imperiums.

Fraktion und Genehmigungen zählen, weil sie den Bonus der [[faction|Fraktion]] festlegen: Gebäude des Fachgebiets deiner Fraktion bekommen einen Bonus, der umso größer ist, je weniger deiner Genehmigungen du nutzt. Zum Beispiel zählt PRUNplanner bei 1 von 2 genutzten Genehmigungen den Grundbonus der Fraktion 4-mal und bei 2 von 2 zweimal. Deshalb bittet dich die Seite, jedem Imperium deine Fraktion und die richtigen Genehmigungen zu geben, damit die Effizienz der Pläne stimmt.

### CX {#cx}

Eine Marktplatz-Präferenz enthält deine Preisregeln: welcher [[cx|Marktplatz]] und welche Preisbasis genutzt werden, und Festpreise. Eine Präferenz kann mehreren Imperien dienen, aber ein Imperium nutzt nur eine. Ihre Regeln bearbeitest du unter [Marktplätze](/help/exchanges).

## Imperium-Konfiguration {#empire-configuration}

Die Tabelle **Imperium-Konfiguration** listet deine Imperien mit ihrer Fraktion, den Genehmigungen (benutzt / gesamt), der Zahl der Pläne und der Marktplatz-Präferenz in der Spalte CX. Solange du keins hast, sagt die Tabelle „Keine Imperien verfügbar“, und mit **Neues Imperium** fängst du an.

- **Neues Imperium** öffnet ein Formular mit **Name des Imperiums** (Pflicht, bis zu 100 Zeichen), **Fraktion**, **Genehmigungen gesamt** (mindestens 2) und **Genehmigungen benutzt** (mindestens 1, nicht mehr als gesamt). **Erstellen** speichert das Imperium sofort.
- Wähl die Marktplatz-Präferenz des Imperiums in der Spalte CX, oder wähl „Keine“, um Preise nach Universe · VWAP 30D zu bekommen. Diese Änderung wartet auf die Speicherleiste.
- Das Löschen eines Imperiums fragt vorher nach. Seine Pläne werden nicht gelöscht. Sie verlieren nur dieses Imperium.

Name, Fraktion und Genehmigungen eines Imperiums kannst du später auf der Seite [Imperium](/help/empire#configuration) ändern.

## Handelskammer-Konfiguration {#cx-configuration}

Die Tabelle **Handelskammer-Konfiguration** listet deine Marktplatz-Präferenzen und ob ein Imperium sie nutzt (**Ja** mit der Zahl der Imperien oder **Nein**).

- Der Button über der Tabelle öffnet ein Formular für eine neue Präferenz. Gib ihr einen Namen mit bis zu 100 Zeichen und drück **Erstellen**, was sie sofort speichert.
- Klick auf den Namen einer Präferenz, um ihre Regeln unter [Marktplätze](/exchanges) zu bearbeiten.
- Das Löschen einer Präferenz fragt vorher nach und löscht alle ihre Regeln. Imperien, die sie genutzt haben, funktionieren weiter, aber ohne Präferenz, also weise ihnen eine andere zu. Bis dahin bekommen sie Preise nach Universe · VWAP 30D, genau wie bei „Keine“.

## Zuordnung Plan ↔ Imperium {#assignments}

Diese Tabelle hat eine Zeile pro Plan und eine Kästchenspalte pro Imperium. Hak ein Kästchen an, um den Plan in dieses Imperium zu legen, und nimm das Häkchen heraus, um den Plan herauszunehmen. Bis du speicherst, sind geänderte Kästchen mit „Wird zu … hinzugefügt“ oder „Wird von … entfernt“ markiert.

- **Plan oder Planet suchen**, **Im Imperium** und der Filter für nur nicht zugeordnete Pläne grenzen die Zeilen ein. Das Kästchen in der Spaltenüberschrift eines Imperiums fügt jeden Plan hinzu oder entfernt ihn, den die Suche und die Filter zeigen.
- Jede Zeile hat **Aktionen**. **Duplizieren** kopiert den Plan als „Name (Klon)“, sofort gespeichert und in keinem Imperium. **Teilen…** erstellt einen Teilen-Link (siehe [Einen Plan teilen](/help/plan_sharing#share-link)). **Löschen** löscht den Plan, nachdem du bestätigt hast, und das lässt sich nicht rückgängig machen.
- Um mehrere Pläne zu löschen, hak sie in der ersten Spalte an und drück **Auswahl löschen…**. Das Kästchen in der Überschrift dieser Spalte hakt jeden Plan an, den die Suche und die Filter zeigen, auch die, zu denen du scrollen müsstest. Du bestätigst einmal für alle. Lassen sich manche Pläne nicht löschen, bleiben sie angehakt und eine Meldung sagt, wie viele, damit du es noch einmal versuchen kannst.
- Lassen die Suche und die Filter keine Zeilen übrig, sagt die Tabelle „Keine Pläne stimmen mit der Suche und den Filtern überein.“

Auf Handys wird die Tabelle zu einer Liste von Karten.

## Speichern {#saving}

Die Wahl der Marktplatz-Präferenz und die Zuordnungskästchen sammeln sich in der Speicherleiste unten. Sie zählt deine Änderungen, **Änderungen speichern** speichert sie alle und **Verwerfen** verwirft sie. Nach dem Speichern erscheint ein paar Sekunden lang „Alle Änderungen gespeichert“. Schlägt das Speichern fehl, bleiben deine Änderungen erhalten und du kannst **Wiederholen**. Die Seite fragt nach, bevor du sie mit ungespeicherten Änderungen verlässt.

Erstellen, Löschen und Duplizieren speichern sofort, ohne die Speicherleiste.
