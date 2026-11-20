Mit dem Live-Markt beobachtest du Preise und Orderbücher an der [[cx|CX]], während du handelst. Er zeigt Änderungen an den vier Rohstoffbörsen, sobald sie eintreffen, und prüft jede gegen die Alarme, die du eingerichtet hast. So entdeckst du die Bewegungen, die dich interessieren, ohne etwas neu laden zu müssen.

## Woher die Daten kommen {#data-stream-mechanics}

[[fio|FIO]] ist der Community-Dienst, der von den Spielclients der Spieler gespeist wird. Er leitet Marktplatz-Updates an PRUNplanner weiter, das jedes davon direkt an deinen Browser weitergibt. Es gibt kein festes Intervall, denn Daten kommen immer dann, wenn FIO Änderungen erhält.

- Gestreamt werden nur AI1, CI1, IC1 und NC1.
- Ein Material an einem Marktplatz erscheint erst, nachdem FIO ein Update dafür geschickt hat. Ruhige Materialien können lange fehlen.
- PRUNplanner behält etwa die letzten 500 Änderungen. Öffnest du die Seite, bekommst du zuerst diese, damit die Übersicht nicht leer ist, und danach neue, sobald sie kommen.

> [!warning]
> Die gespeicherten Änderungen kommen beim Öffnen der Seite in einem Schwung. Sie bekommen die Zeit, zu der sie in deinem Browser ankamen, nicht die Zeit, zu der sie passiert sind, und sie laufen wie neue Änderungen durch deine aktiven Alarme.

Der Status oben rechts zeigt **Verbunden** (pulsierend grün), **Verbinde neu** oder **Getrennt**. Bricht die Verbindung ab, verbindet sich dein Browser von selbst neu. Weist der Server den Stream ab (zum Beispiel, wenn zu viele offen sind), versucht es die Seite nach 5 Sekunden erneut und wartet nach jedem Fehlschlag länger, bis zu 60 Sekunden. Die Wartezeit verdoppelt sich jedes Mal, die Versuche kommen also nach 5, 10, 20 und 40 Sekunden, danach alle 60 Sekunden. Während die Seite wartet, zeigt der Status **Verbinde neu**.

Keine Sorge, wenn kurz **Getrennt** dasteht. Das zeigt er, bis der Stream zum ersten Mal öffnet, und während dein Browser einen abgebrochenen Stream neu verbindet.

Der Server erlaubt bis zu 5 offene Streams pro IP-Adresse, schließ den Live-Markt also in Tabs, die du nicht brauchst.

## Live-Ansicht {#live-view}

Die Übersicht rechts (auf schmaleren Bildschirmen unter dem Feed) listet jedes bisher empfangene Material an jedem Marktplatz, als `DW.NC1`, sortiert von A bis Z. **Übersicht ausblenden** und **Übersicht anzeigen** schalten sie um.

| Spalte                           | Was sie zeigt                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ticker**                       | Material und Marktplatz                                                                                                                                                                    |
| **Preis (ȼ)** | den Preis im Update                                                                                                                                                                        |
| **Bid (ȼ)**   | die höchste Kauforder ([[bid\|Bid]])                            |
| **Ask (ȼ)**   | die niedrigste Verkaufsorder ([[ask\|Ask]])                     |
| **Spread %**                     | (Ask − Bid) ÷ Ask × 100 ([[spread\|Spread]]) |
| **Kauf-Vol.**    | Einheiten in allen offenen Kauforders                                                                                                                                                      |
| **Verkauf-Vol.** | Einheiten in allen offenen Verkaufsorders                                                                                                                                                  |

Jede Änderung aktualisiert die Felder, die sie mitbringt. Hat sie keinen Preis, Bid oder Ask, bleibt der letzte Wert stehen. Kauf- und Verkaufsvolumen sind das, was im Orderbuch liegt, nicht das, was gehandelt wurde.

Ein Bid von 90 ȼ und ein Ask von 100 ȼ ergeben zum Beispiel einen **Spread %** von (100 − 90) ÷ 100 × 100 = 10 %. Hat die Änderung keinen Bid oder Ask, nutzt der Spread stattdessen die beste Kauf- oder Verkaufsorder in ihrem Orderbuch.

## Alarm Feed {#alert-feed}

Der **Alarm Feed** listet jeden ausgelösten Alarm, den neuesten zuerst, bis zu 500. **Feed leeren** leert ihn. Der Feed existiert nur auf dieser Seite. Er wird geleert, wenn du den Live-Markt verlässt, und nichts erreicht dich anderswo: keine Benachrichtigung, kein Ton, keine E-Mail.

| Spalte             | Was sie zeigt                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Ticker / Alarm** | Material und Marktplatz, mit dem Namen des Alarms                                               |
| **Schweregrad**    | **NIEDRIG**, **MITTEL** (gelb) oder **HOCH** (rote Zeile) |
| **Trigger-Logik**  | jede Bedingung, die zutraf: Feld, Wert, Operator, Ziel                          |
| **Ereignis**       | bei Zahlenfeldern: der vorherige und der neue Wert                              |
| **Zeit**           | wann die Änderung ankam, als HH:mm:ss                           |

Fahr mit der Maus über eine Zeile, um die Werte der Änderung zu sehen, die den Alarm ausgelöst hat. Du bekommst Preis, Bid, Ask, Spread, Kauf- und Verkaufsvolumen mit ihrem [[vwap|VWAP]] und ihrer Änderung sowie einen Balken Kauf- gegen Verkaufsvolumen. Schmale Bildschirme blenden einige Spalten aus.

Die Glocke (**Warnmeldungen**) pausiert die Prüfung der Alarme für diesen Besuch und setzt sie fort. Sie ist an, wenn du die Seite öffnest, und Änderungen, die ankommen, während sie aus ist, lösen nie aus.

Bis ein Alarm auslöst, zeigt der Feed **Warten auf Marktereignisse, die Alarme auslösen...**.

## Datenhistorie {#data-history}

**Datenhistorie**, unter dem Alarm Feed, gruppiert die eingehenden Änderungen nach Minute und zeigt, wie viele Materialien an Marktplätzen eine geschickt haben („Ticker erhalten“) und welche. Sie behält die letzten 25 Minuten, in denen Daten kamen.

## Alarm-Engine {#alert-engine}

Ein Alarm ist eine Reihe von Bedingungen. Jedes Mal, wenn eine Änderung für ein Material an einem Marktplatz ankommt, prüft PRUNplanner jeden aktiven Alarm gegen die neuen Werte und die vorherigen Werte desselben Materials am selben Marktplatz. Treffen die Bedingungen zu, fügt der Alarm dem Feed eine Zeile hinzu.

Eine Bedingung liest den neuen Wert ihres Felds aus der eintreffenden Änderung, nicht aus der Übersicht. Bringt diese Änderung das Feld nicht mit, hat sie zum Beispiel keinen Preis, trifft eine Bedingung auf **Preis** nicht zu.

PRUNplanner speichert Alarme in diesem Browser, nur für dein Konto: „Alarme werden derzeit nur auf diesem Gerät gespeichert und nicht mit deinem Konto synchronisiert.“ Ein anderer Browser oder ein anderes Gerät startet ohne sie.

### Aufbau {#setup}

Eine Bedingung hat drei Teile: ein Feld, einen Operator und ein Ziel. Zum Beispiel **Preis** GT **Wert** 100.

#### Felder {#fields}

| Feld                                                                                                                                          | Bedeutung                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Ticker**, **Marktplatz-Code**                                                                                                               | der Material-Ticker, der Marktplatz-Code (Text)                  |
| **Preis**, **Bid**, **Ask**                                                                                                                   | Preis, Bid und Ask wie in der Übersicht                                             |
| **Preisänderung**, **Bid-Änderung**, **Ask-Änderung**                                                                                         | neuer Wert − vorheriger Wert                                                        |
| **Preisänderung (Prozent)**                                                                                                | Preisänderung ÷ vorheriger Preis × 100                                              |
| **Nachfrage**, **Angebot**                                                                                                                    | Nachfrage und Angebot, wie die Änderung sie meldet                                  |
| **Gehandelt**, **Volumen**                                                                                                                    | Handelszahlen, wie die Änderung sie meldet                                          |
| **Kauf-Volumen**, **Verkaufs-Volumen**                                                                                                        | Einheiten in allen offenen Kauf- oder Verkaufsorders                                |
| **Volumenänderung kaufen (Abs.)**, **Volumenänderung verkaufen (Abs.)** | wie stark sich dieses Volumen geändert hat, ohne Vorzeichen                         |
| **VWAP-Kauf**, **VWAP-Verkauf**                                                                                                               | nach Einheiten gewichteter Durchschnittspreis der offenen Kauf- oder Verkaufsorders |
| **Bester Bid-Preis**, **Bester Ask-Preis**                                                                                                    | höchste Kauforder, niedrigste Verkaufsorder im Orderbuch                            |
| **Spread**, **Spread (Prozent)**                                                                                           | Ask − Bid, und das als Prozentsatz des Ask                                          |

**Preisänderung**, **Bid-Änderung**, **Ask-Änderung** und **Preisänderung (Prozent)** brauchen einen vorherigen Wert, sie sind bei der ersten Änderung eines Materials an einem Marktplatz also leer. Die beiden Felder zur Volumenänderung zeigen dann 0.

War der vorherige Preis zum Beispiel 200 ȼ und der neue 210 ȼ, ist **Preisänderung** 210 − 200 = 10 und **Preisänderung (Prozent)** 10 ÷ 200 × 100 = 5.

#### Vergleiche {#comparisons}

Zahlenfelder bieten:

- GT: größer als
- LT: kleiner als
- EQ: gleich
- NEQ: ungleich

**Ticker** und **Marktplatz-Code** bieten nur MATCHES, das heißt gleich, ohne auf Groß- und Kleinschreibung zu achten. Ihr Ziel ist immer fester Text (angezeigt als **Text**).

#### Vergleichsziele {#comparison-targets}

| Ziel                | Vergleicht das Feld mit                                                                                               | Gut für                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Wert**            | einer festen Zahl (oder einem Text), die du eingibst                                               | Preisuntergrenzen und -obergrenzen, ein Material oder Marktplatz |
| **Vorheriger Wert** | dem vorherigen Wert des Felds für dieses Material an diesem Marktplatz (**Vorheriger Datenpunkt**) | jede Änderung überhaupt, plötzliche Sprünge                      |
| **Unterschied %**   | dem vorherigen Wert × (1 + Unterschied ÷ 100)                                                      | Bewegungen einer bestimmten Größe                                |

**Vorheriger Wert** und **Unterschied %** lösen bei der ersten Änderung eines Materials an einem Marktplatz nie aus, weil es noch nichts zum Vergleichen gibt.

**Preis** GT **Unterschied %** 2 löst zum Beispiel aus, wenn der Preis gegenüber der letzten Änderung um mehr als 2 % steigt. **Preis** LT **Unterschied %** −2 löst bei einem Rückgang um mehr als 2 % aus. Bei einem vorherigen Preis von 100 ȼ ist das Ziel des ersten Beispiels 100 × (1 + 2 ÷ 100) = 102 ȼ, ein neuer Preis von 102,50 ȼ löst also aus und 101,90 ȼ nicht.

#### Logische Operatoren {#logical-operators}

Bedingungen sitzen in einer Gruppe, und **Übereinstimmung** legt fest, wie die Gruppe sie verknüpft:

- AND: Jede Bedingung in der Gruppe muss zutreffen.
- OR: Eine zutreffende Bedingung reicht.

Eine Gruppe kann weitere Gruppen enthalten (**Gruppe**). So kannst du etwa (**Ticker** MATCHES RAT AND (**Preisänderung (Prozent)** GT 2 OR **Preisänderung (Prozent)** LT −2)) bauen. Die **Trigger-Logik** im Feed listet die Bedingungen, die den Alarm ausgelöst haben. Bei OR ist das die erste, die zutraf.

Eine AND-Gruppe ohne Bedingungen gilt als zutreffend. Ein aktiver Alarm, dessen oberste Gruppe noch leer ist, löst also bei jeder Änderung aus.

### Alarme einrichten {#setting-up-alerts}

Bis du einen erstellst, sagt der Alarm-Manager „Keine Alarme gefunden. Erstelle dein erstes Alarm-Signal“.

1. Drück **Alarm-Manager öffnen**.
2. Drück **Neuen Alarm erstellen**. Ein pausierter Alarm namens **Neuer Alarm** mit Schweregrad **NIEDRIG** und einer leeren AND-Gruppe erscheint sofort in der Liste.
3. Fahr mit der Maus über den Alarm und drück **Bearbeiten**, um **Alarm bearbeiten** zu öffnen.
4. Setze **Alarmname** und **Schweregrad** (**NIEDRIG**, **MITTEL**, **HOCH**).
5. Setze unter **Logik Konfiguration** die **Übereinstimmung**. Füge mit **Bedingung** Bedingungen hinzu (eine neue startet als **Nachfrage** EQ **Wert** 0) oder mit **Gruppe** verschachtelte Gruppen. **Entfernen** löscht eine Bedingung oder eine verschachtelte Gruppe, macht bei der obersten Gruppe aber nichts. Eine Gruppe ohne Bedingungen zeigt **Leere Gruppe**.
6. Stell **Status** von **Pausiert** auf **Aktiv**.
7. Drück **Speichern**, oder **Verwerfen**, um deine Änderungen zu verwerfen.

> [!tip]
> Füge mindestens eine Bedingung hinzu, bevor du einen Alarm auf **Aktiv** stellst. Ein aktiver Alarm mit einer leeren Gruppe füllt den Feed mit jeder Änderung.

Um einen Alarm später zu ändern, fahr mit der Maus darüber und drück **Bearbeiten**. **Löschen** entfernt ihn sofort. Die Liste zeigt den Namen jedes Alarms und ob er **Aktiv** oder **Pausiert** ist, und **Alarm-Manager schließen** blendet die Liste wieder aus.
