[FIO Verbrauch](/fio/burn) sagt dir, welche Basis zuerst Nachschub braucht, und stellt die [[xit|XIT]]-Ladung dafür zusammen. Es zeigt, wie viele Tage der Bestand jeder deiner Basen reicht, auf Grundlage deiner Pläne und deines echten Lagers aus [[fio|FIO]].

## Bevor du anfängst {#before-you-start}

- Du brauchst eine [FIO-Verbindung](/help/profile#fio-connection). Ohne sie bittet dich die Seite, FIO in deinem Profil zu verbinden.
- Die Seite zeigt ein [[empire|Imperium]], das du unter **Imperium** wählst. Das macht es auch zu deinem **Standard-Imperium**. Ohne Imperium bietet die Seite **Imperium erstellen** an.
- Jeder Plan des Imperiums muss auf dem Planeten einer Basis liegen, die du im Spiel hast. Hat FIO auf dem Planeten eines Plans kein Basislager, zählt jeder Bestand als 0. Zeigt ein Plan bei jedem Bestand 0, prüf, ob er auf dem Planeten liegt, auf dem deine Basis steht.

Der Kopf zeigt, wann FIO deine Daten zuletzt aktualisiert hat („FIO Datenaktualisierung“). [Profil](/help/profile#fio-connection) erklärt, wie aktuell das ist.

## Berechnungen {#calculations}

FIO Verbrauch berechnet jeden Plan des Imperiums auf dieselbe Weise wie die Imperium-Seite und nimmt das [[material-io|Material I/O]] jedes Plans (Bedarf von Produktion und Belegschaft).

Für jedes Material, von dem der Plan mehr verbraucht, als er herstellt:

_verbleibende Tage = Bestand ÷ täglicher Nettoverbrauch_

Der Bestand ist die Menge dieses Materials in deinem Basislager auf dem Planeten des Plans, laut FIO. Ein Material, von dem der Plan so viel herstellt, wie er verbraucht, oder mehr, geht nie aus („hier produziert“). Der **Verbrauch** eines Plans ist sein niedrigster Wert an verbleibenden Tagen.

Der tägliche Nettoverbrauch ist, was der Plan pro Tag von dem Material verbraucht, minus was er herstellt. Die Plantabelle zeigt ihn als negatives **Delta** (Produktion − Verbrauch), ein **Delta** von −30 heißt also netto 30 pro Tag. Ein Beispiel: Ein Plan, der 40 eines Materials pro Tag verbraucht und 10 herstellt, verbraucht netto 30 pro Tag. Mit 300 im Lager reicht das 300 ÷ 30 = 10 Tage.

FIO Verbrauch zählt nicht:

- Lagerhäuser und Schiffe. Es schaut nur auf das Basislager auf dem Planeten.
- [[degradation|Abnutzung]] und Reparaturmaterialien, die nicht Teil von Material I/O sind. Nutze dafür [FIO Reparieren](/help/fio_repair).
- Was im Spiel wirklich läuft. Die Zahlen kommen aus deinem Plan, weicht der Plan also von deiner Basis ab, bekommst du andere Tage.

> [!warning]
> Jeder Plan zählt das ganze Lager seines Planeten. Liegen zwei Pläne desselben Imperiums auf einem Planeten, sehen beide den ganzen Bestand, und die verbleibenden Tage fallen zu hoch aus. Halte im Imperium, das du prüfst, einen Plan pro Planet.

## Grenzwerte {#thresholds}

Farben zeigen, wie bald ein Material ausgeht, in _verbleibenden Versorgungstagen_:

- **Rot**: verbleibende Tage beim roten Grenzwert oder darunter (Standard 5).
- **Gelb**: verbleibende Tage beim gelben Grenzwert oder darunter (Standard 10).

Mit den Standardwerten (rot 5, gelb 10) erscheint ein Material mit 4 verbleibenden Tagen rot, eines mit 8 gelb und eines mit 12 ohne Farbe.

Beide stellst du unter **Verbrauchsgrenzwerte** auf dieser Seite oder im [Profil](/help/profile#preferences) ein (**Roter Grenzwert**, **Gelber Grenzwert**). Es ist dieselbe Einstellung, gespeichert in deinem Konto. Beide sind mindestens 1. Halte Gelb über Rot, sonst erscheint nichts gelb.

## Plan-Verbrauch-Übersicht {#overview}

**Plan-Verbrauch-Übersicht** zeigt eine Zeile pro Plan, mit dem **Verbrauch** des Plans und einem Streifen, der für jedes verbrauchte Material einen Punkt bei seinen verbleibenden Tagen hat. Der Streifen reicht von 0 bis zum Dreifachen des gelben Grenzwerts, und Materialien darüber werden als „+n“ gezählt. Fahr mit der Maus über einen Punkt oder tipp ihn an, um zu sehen, welches Material es ist. Die Zusammenfassung zählt die roten und gelben Materialien.

## Plantabelle {#plan-table}

Neben der Übersicht (auf schmaleren Bildschirmen darunter) hat jeder Plan eine Zeile mit seinem Wert **Erschöpft** (niedrigste verbleibende Tage) und einem XIT-Button. Klapp die Zeile auf, um zu sehen, welches Material zuerst ausgeht, wie viele weitere unter dem gelben Grenzwert liegen und wie viele der Plan selbst herstellt. Ihre Tabelle listet jedes Material mit **Verbrauch** und **Produktion** (beide nur auf breiten Bildschirmen), **Delta**, **Lager**, einem Balken **Reichweite** und seinem **Verbrauch** in Tagen.

## XIT-Nachschub {#xit-resupply}

Der XIT-Button öffnet den Nachschub für die Basis dieses Plans (**XIT Nachschub: {plan_name}**):

| Steuerelement             | Was es tut                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Herkunft**              | Wo das Schiff lädt: **Bei Ausführung konfigurieren** oder ein Stationslagerhaus. Der Standard kommt aus **XIT-Herkunft** im Profil.                                 |
| **Ziel-Tage**             | Für wie viele Tage Versorgung mitgebracht wird. Der Standard kommt aus **Nachschub-Tage** im Profil (20).                                                        |
| **Von CX Kaufen**         | Kauft die Materialien zuerst am Marktplatz der Herkunft. Funktioniert nur mit einem Lagerhaus als Herkunft. Der Standard kommt aus **XIT Von CX kaufen** im Profil. |
| **Auf Schiff anpassen**   | 500, 1k, 2k, 3k/1k, 1k/3k oder 5k (t / m³). Setzt die größte Zahl von Tagen, bis 100, deren Ladung passt.                                                        |
| **Unendliche ausblenden** | Blendet Materialien aus, die nie ausgehen.                                                                                                                                                          |

**Auf Schiff anpassen** schreibt sein Ergebnis in **Ziel-Tage**. Es startet bei den dort eingestellten Tagen, nimmt Tage weg, bis die Ladung sowohl ins Gewicht als auch ins Volumen des Schiffs passt, und fügt dann Tage hinzu, solange sie noch passt.

**Herkunft**, **Ziel-Tage** und **Von CX Kaufen** sind deine Profil-Einstellungen. Eine Änderung hier wird in deinem Konto gespeichert. Herkunft und Kauf gelten auch für die anderen XIT-Aktionen, etwa die von FIO Reparieren und den Wagen der Pläne.

Die Menge pro Material ist, was den Bestand auf die Ziel-Tage auffüllt: täglicher Nettoverbrauch × Tage − Bestand, aufgerundet, nie unter 0. Du kannst ein Material abwählen oder seine Menge überschreiben. Die Summen zeigen Gewicht, Volumen und Preis. Der Preis ist eine Schätzung zu Universe · VWAP 30D-Kaufpreisen, nicht zu deiner Marktplatz-Präferenz, und kann daher von dem abweichen, was du am Marktplatz der Herkunft zahlst.

Im Beispiel aus [Berechnungen](/help/fio_burn#calculations) ist die Menge mit **Ziel-Tage** auf 20 gleich 30 × 20 − 300 = 300 Einheiten, was das Lager auf 600 auffüllt, 20 Tage Nettoverbrauch.

**XIT JSON kopieren** kopiert das Paket („PRUNplanner Burn Supply“) für Refined PrUn. Mit **Von CX Kaufen** kauft es zuerst am Marktplatz der Herkunft und transferiert dann die Ladung. Das Ziel wählst du, wenn du es ausführst.
