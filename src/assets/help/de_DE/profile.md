In deinem [Profil](/profile) verwaltest du dein Konto, verbindest deine Spieldaten über FIO und legst die Einstellungen fest, mit denen die Werkzeuge von PRUNplanner starten. Diese Seite behandelt auch Anmelden, Registrieren und das Zurücksetzen eines Passworts. Komm hierher, wenn du FIO zum ersten Mal verbindest, wenn ein Werkzeug mit anderen Einstellungen starten soll oder um deine E-Mail-Adresse oder dein Passwort zu ändern.

## Dein Konto {#account}

### Anmelden und registrieren {#login-and-sign-up}

- **Anmelden** mit deinem Benutzernamen und Passwort. Danach landest du in deinem [Imperium](/empire), außer du kamst über einen Link, der dich dorthin zurückbringt, wo du warst.
- **Konto erstellen** fragt nach einem **Benutzername** (mindestens 3 Zeichen, keine Leerzeichen), einem **Passwort** (mindestens 8 Zeichen, nicht nur Ziffern, kein gängiges Passwort) und optional einer E-Mail-Adresse. Um zu zeigen, dass du das Spiel spielst, tippst du den Namen eines Planeten ein, dessen ID dir angezeigt wird. Öffne ihn in einem Buffer von Prosperous Universe, um seinen Namen zu lesen.
- Ein neues Konto beginnt mit einem Imperium, „My Empire“, und einer ihm zugewiesenen [[exchange-preference|Marktplatz-Präferenz]], „My Exchange Preference“ (Universe · VWAP 30D). Siehe [Deine erste Basis](/help/guide_first_base).

### E-Mail und Kontowiederherstellung {#email}

Eine E-Mail-Adresse ist optional, und PRUNplanner nutzt sie nur, um dein Passwort zurückzusetzen. Ohne sie kannst du ein vergessenes Passwort nicht zurücksetzen.

1. Gib sie unter **E-Mail-Adresse** mit deinem **Aktuelles Passwort** ein und drück **Speichern**. Hinzufügen, Ändern und Entfernen der Adresse brauchen alle dein aktuelles Passwort.
2. PRUNplanner schickt einen 8-stelligen Code, der 24 Stunden gültig ist. Drück **Code eingeben** und tipp ihn ein, oder klick auf einem beliebigen Gerät auf den Link in der E-Mail. **Neuen Code senden** schickt einen neuen.

**Kontowiederherstellung** zeigt, wo du stehst: **Nicht eingerichtet** (keine E-Mail), **Warte auf Bestätigung** oder **Bereit** (Zurücksetzungen gehen an diese Adresse). Eine neue Adresse bekommt Zurücksetzungen erst, wenn du sie bestätigst.

Weil ein vergessenes Passwort nur über eine bestätigte Adresse zurückgesetzt werden kann, zeigt die Imperium-Seite eine Erinnerung, solange du Pläne, aber keine bestätigte E-Mail-Adresse hast. „Jetzt nicht“ blendet sie für 30 Tage aus, und „Nicht mehr nachfragen“ blendet sie dauerhaft aus.

### Passwort vergessen {#password-reset}

Im Anmeldeformular fragt **Passwort vergessen?** nach deiner bestätigten E-Mail-Adresse und schickt einen Code dorthin. Gib den Code mit einem neuen Passwort ein, um es zu setzen.

### Passwort ändern {#change-password}

Öffne **Passwort ändern** und gib dann dein **Aktuelles Passwort** und ein **Neues Passwort** (mindestens 8 Zeichen) ein.

> [!warning]
> Wenn du dein Passwort änderst oder zurücksetzt, wirst du überall abgemeldet, auch in diesem Browser, und jeder [API-Schlüssel](/help/api_keys#validity), den du vorher erstellt hast, hört auf zu funktionieren. Erstell danach neue Schlüssel und aktualisiere deine Tabellen und Skripte.

## FIO-Verbindung {#fio-connection}

[[fio|FIO]] ist eine kostenlose Browser-Erweiterung der Community, die deine Spieldaten ausliest. Damit kann PRUNplanner deinen echten Lagerbestand in [FIO Verbrauch](/help/fio_burn), den Zustand deiner Gebäude in [FIO Reparieren](/help/fio_repair) und deine Lager in der API zeigen.

1. Installier die FIO-Browser-Erweiterung und registrier dein FIO-Konto über den Erweiterungs-Button im Spiel.
2. Öffne auf der FIO-Website deine Einstellungen und erstell einen API-Schlüssel für PRUNplanner.
3. Gib den **FIO-API-Schlüssel** und deinen **PrUn Benutzername** unter **FIO-Verbindung** ein und drück **Speichern**.

PRUNplanner prüft den Schlüssel und sagt dir, wenn FIO ihn nicht annimmt oder er zu einem anderen Benutzernamen gehört. **FIO-Status** zeigt dann, wo die Verbindung steht: nicht verbunden, deine Daten werden geladen, verbunden mit der Zeit der letzten Aktualisierung, verbunden, aber noch keine Daten (öffne das Spiel bei laufender FIO-Erweiterung), Schlüssel abgelehnt oder Aktualisierungen schlagen fehl.

Während du PRUNplanner nutzt, sind deine FIO-Daten höchstens etwa 30–45 Minuten alt. Warst du eine Woche weg, werden sie beim Anmelden aktualisiert. FIO selbst kennt nur, was die Erweiterung gesehen hat, während du gespielt hast.

PRUNplanner speichert deine FIO-Daten (Lager und Standorte) nicht in deinem Browser. Es lädt sie jedes Mal, wenn du die App öffnest, und dann alle 5 Minuten erneut.

## Einstellungen {#preferences}

PRUNplanner speichert Einstellungen in deinem Konto, sobald du sie änderst, sie folgen dir also auf jedes Gerät. Nur **Nutzungsanalyse** wird allein in diesem Browser gespeichert.

| Einstellung                                       | Standard                                     | Was sie bewirkt                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprache**                                       | Englisch                                     | Die Sprache der App. Die Übersetzungen kommen von der Community auf Crowdin.                                                                                                                                                                                                                                            |
| **Farbpalette**                                   | **Standard (grün / rot)** | **Farbenblind (blau / orange)** ändert die Farben für gut/schlecht in der ganzen App.                                                                                                                                                                                                                                |
| **Marktkarte**                                    | **Beim Darüberfahren**                       | Mit **Nur beim Klicken** zeigt das Darüberfahren über ein Material nichts, und du klickst es für die Preise an. Siehe [Marktkarte eines Materials](/help/exchanges#market-card).                                                                                                                                        |
| **Standard-Imperium**                             | dein erstes Imperium                         | Das Imperium, mit dem die Imperium-Seite und FIO Verbrauch öffnen. Wechselst du dort das Imperium, ändert sich auch diese Einstellung.                                                                                                                                                                                  |
| **Standard CX**                                   | keine                                        | Die Marktplatz-Präferenz, mit der diese Werkzeuge starten: ROI-Werkzeuge, Basis-ROI, HQ Kalkulator, Instandhaltungskosten, Produktionsketten und FIO Reparieren. Wählst du in einem davon eine Präferenz, ändert sich auch diese Einstellung. Ohne eine nutzen sie Universe · VWAP 30D. |
| **Roter Grenzwert**                               | 5                                            | FIO Verbrauch: rot, wenn eine Basis noch so viele Tage Vorrat hat oder weniger.                                                                                                                                                                                                                                         |
| **Gelber Grenzwert**                              | 10                                           | FIO Verbrauch: gelb bei so vielen Tagen Vorrat oder weniger.                                                                                                                                                                                                                                                            |
| **Nachschub-Tage**                                | 20                                           | FIO Verbrauch: die Tage, die ein XIT-Nachschub abdeckt.                                                                                                                                                                                                                                                                 |
| **XIT-Herkunft**                                  | **Bei Ausführung konfigurieren**             | Wo XIT-Ladungen für Nachschub und Reparatur starten: ein Stations-Warenhaus oder beim Ausführen des XIT gewählt.                                                                                                                                                                                                        |
| **XIT Von CX kaufen**                             | an                                           | Die Ladung am Marktplatz der Herkunft kaufen (nur mit einem Warenhaus als Herkunft). Gilt für FIO Verbrauch und FIO Reparieren.                                                                                                                                                                      |
| **Reparatur alle (ohne Plan)** | 60                                           | FIO Reparieren: Reparaturintervall in Tagen für Basen ohne zugeordneten Plan (1–180).                                                                                                                                                                                                                |
| **Bald fällig**                                   | 7                                            | FIO Reparieren: Tage vor dem Ziel, die als bald fällig gelten (0–60).                                                                                                                                                                                                                                |
| **Tage bis Ankunft**                              | 2                                            | FIO Reparieren: Tage, bis ein Reparaturschiff entlädt (0–30).                                                                                                                                                                                                                                        |
| **Plan-Vorschläge**                               | an                                           | Beliebte Gebäude und Aufträge auf dem Planeten, Planeten-Einblicke und ein typisches Setup für leere Pläne.                                                                                                                                                                                                                             |
| **Nutzungsanalyse**                               | einmal gefragt, in einem Banner              | Erlaubt PRUNplanner, Nutzungsereignisse, Fehlerberichte und Sitzungsaufzeichnungen zu sammeln. Nur in diesem Browser gespeichert. Sie bleibt aus, wenn dein Browser Do-Not-Track oder Global Privacy Control sendet.                                                                                    |

Eine [[exchange-preference|Marktplatz-Präferenz]] ist dein Satz an Regeln, aus welchem Marktplatz und mit welcher Preisbasis die Preise kommen, also entscheidet **Standard CX**, mit welchen Preisen die oben genannten Werkzeuge starten.

Die Verbrauchs-Grenzwerte sind _verbleibende Tage Vorrat_, keine Lagermengen. Zum Beispiel zeigt mit **Roter Grenzwert** auf 5 und **Gelber Grenzwert** auf 10 eine Basis mit 4 verbleibenden Tagen Rot, eine mit 7 Tagen Gelb und eine mit 12 Tagen keine Farbe. Du kannst sie auch auf der Seite [FIO Verbrauch](/help/fio_burn#thresholds) einstellen und die Reparatur-Einstellungen unter [FIO Reparieren](/help/fio_repair). Es ist an beiden Stellen dieselbe Einstellung.

**Planspezifische Einstellungen** listet Pläne auf, die eigene Einstellungen haben, zum Beispiel Ausschlüsse bei der Besuchsfrequenz, gebaute Gebäude im Bauwagen oder ausgeschaltete Auto-Optimierung. Du änderst sie in jedem Plan selbst.

## Browser-Speicher {#browser-storage}

Damit alles schnell lädt und der Server geschont wird, behält PRUNplanner eine Kopie der Spieldaten und deiner Planungsdaten in deinem Browser und aktualisiert sie nach festen Zeiten. Die Tabelle **Browser-Speicher** zeigt, wie viel darin liegt. Deine Pläne, Imperien und Einstellungen sind in deinem Konto gespeichert, diese Kopie ist also nicht der einzige Ort, an dem sie liegen.

### Speicherkategorien {#storage-categories}

| Kategorie     | Was                                                                                          | Aktualisiert                                           |
| ------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Spieldaten    | Materialien, Gebäude, Aufträge und Planeten (von FIO)                     | seltener als Marktplätze                               |
| Marktplätze   | Preise und Marktzahlen: Ask und Bid von FIO, VWAPs von PRUNplanner berechnet | etwa alle 30 Minuten                                   |
| Planungsdaten | Deine Pläne, Imperien, Marktplatz-Präferenzen und geteilten Pläne                            | eine Kopie dessen, was in deinem Konto gespeichert ist |

FIO-Daten liegen nicht im Browser-Speicher, auch wenn die Tabelle ihre Zeilen auflistet (siehe [FIO-Verbindung](#fio-connection)).
