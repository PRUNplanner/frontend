PRUNplanner plant deine Basen. Bauen und betreiben tust du sie im Spiel. Diese Anleitung behandelt die Übergabe, und am Ende hast du:

- FIO verbunden, sodass PRUNplanner deine Basen und Lager sieht,
- die Materialien, um eine Basis zu bauen und erstmals zu versorgen, als [[xit|XIT]]-Pakete, die Einkauf und Versand für dich erledigen,
- FIO Verbrauch und FIO Reparieren eingerichtet, damit laufende Basen versorgt und repariert bleiben.

Sie ist für Spieler, die gleich eine geplante Basis bauen. Sie dauert etwa 15 Minuten, plus eine einmalige FIO-Einrichtung. Die Seiten, die am Ende jedes Schritts verlinkt sind, gehen tiefer.

## 1. FIO verbinden {#step-1}

[[fio|FIO]] ist eine kostenlose Browser-Erweiterung der Community, die deine Spieldaten liest. Damit weiß PRUNplanner, was auf deinen Planeten steht und was in deinen Lagern liegt.

![Die FIO-Verbindung auf der Profilseite, verbunden, mit den Feldern PrUn Benutzername und FIO-API-Schlüssel](/images/help/guides/hand-off-fio.webp)

1. Installiere die FIO-Erweiterung und registriere dein FIO-Konto über den Erweiterungs-Button im Spiel.
2. Erstelle auf der FIO-Website einen API-Schlüssel für PRUNplanner.
3. Gib in deinem [Profil](/profile) unter **FIO-Verbindung** den **FIO-API-Schlüssel** und deinen **PrUn Benutzername** ein und drück **Speichern**.

Sobald es funktioniert, bekommt das FIO-Symbol unten im Seitenmenü einen grünen Punkt. Fahr mit der Maus darüber, um **FIO Aktiv** zu sehen und wann FIO zuletzt aktualisiert hat. **FIO Verbrauch** und **FIO Reparieren** erscheinen jetzt unter den Werkzeugen. Während du PRUNplanner nutzt, sind deine FIO-Daten höchstens etwa 30 bis 45 Minuten alt.

Mehr: [FIO-Verbindung](/help/profile#fio-connection).

## 2. Baumaterialien kaufen und versenden {#step-2}

Öffne den Plan der Basis (über das Seitenmenü oder die Planliste unter [Imperium](/empire)) und geh zu seinem Tab **Konstruktion**, dem [[construction-cart|Bauwagen]].

![Das Werkzeug Konstruktion eines Plans: Gebaut, Anzahl und Geplant pro Gebäude, und der XIT-Button](/images/help/guides/hand-off-construction.webp)

- **Gebaut** startet bei dem, was FIO auf dem Planeten sieht, und **Anzahl** ist, was noch zu bauen ist.
- **Zu kaufende Materialien** zieht den Bestand des Lagers ab, das du unter **Lager** wählst, **Bedarf** ist also, was du noch besorgen musst. Ein Beispiel: Bei einer **Anzahl** von 120 BSE und 40 im Lager ist **Bedarf** 80. Mit 150 im Lager ist er 0, nie weniger.
- Eine Warnung neben **Anzahl** sagt dir, wenn die Gebäude mehr Arbeiter bräuchten, als ihre Unterkünfte unterbringen.

Der XIT-Button neben **Lager** verschickt nur den **Bedarf**. Der oben im Werkzeug verschickt alles und ignoriert den Bestand.

Mehr dazu: [Konstruktion](/help/plan_tools#construction).

## 3. Die erste Versorgung planen {#step-3}

Öffne den Tab **Versorgung**, den [[supply-cart|Versorgungswagen]]. Er listet die Verbrauchsgüter der Belegschaft und die Produktions-Inputs, die die Basis für **Bestandsverfügbarkeit (Tage)** (standardmäßig 20) braucht, abzüglich dessen, was auf Lager ist.

![Das Werkzeug Versorgung eines Plans mit seinen XIT-Buttons](/images/help/guides/hand-off-supply.webp)

> [!tip]
> Nimm für den allerersten Flug **XIT Erstversorgung**. Der einfache XIT-Button rechnet heraus, was die Basis selbst herstellt, eine Basis, die ihr eigenes DW oder RAT herstellt, käme also ohne an, bevor die Produktion startet.

Mehr: [Versorgung](/help/plan_tools#supply), [XIT und XIT Erstversorgung](/help/plan_tools#supply-xit).

## 4. Das XIT-Paket im Spiel ausführen {#step-4}

Jeder XIT-Button öffnet eine Schublade mit einem Paket für [Refined PrUn](https://github.com/refined-prun/refined-prun), die Browser-Erweiterung für das Spiel.

1. Wähle die **Herkunft**: ein Stationslager oder **Bei Ausführung konfigurieren**, um beim Ausführen zu wählen.
2. Lass **Von CX Kaufen** an, um die Materialien zuerst am Marktplatz dieser Station zu kaufen. Das braucht ein Lager als Herkunft.
3. Mit **Kopieren** kopierst du das JSON.
4. Im Spiel führt Refined PrUn es mit seinem Befehl XIT ACT aus. Das Ziel wählst du beim Ausführen.

PRUNplanner speichert **Herkunft** und **Von CX Kaufen** in deinen Einstellungen, und jeder XIT-Button nutzt sie gemeinsam.

Details: [XIT-Aktionen](/help/plan_tools#xit).

## 5. Deine Basen mit FIO Verbrauch versorgt halten {#step-5}

Öffne [FIO Verbrauch](/fio/burn) und wähle das Imperium. Für jeden Plan teilt es den Bestand deines Basislagers auf diesem Planeten durch den Netto-Tagesverbrauch des Plans und zeigt, wie viele Tage jedes Material reicht.

![FIO Verbrauch: die Verbrauchsschwellen und die verbleibenden Tage pro Basis](/images/help/guides/hand-off-burn.webp)

- Rot und Gelb markieren Materialien auf oder unter deinen Schwellen (standardmäßig 5 und 10 Tage). Ein Beispiel: 160 RAT im Lager bei einem Nettoverbrauch von 20 am Tag reichen 160 ÷ 20 = 8 Tage. Das ist auf oder unter 10, aber über 5, also erscheint es gelb.
- Der XIT-Button bei einem Plan öffnet dessen XIT-Nachschub. Stell **Ziel-Tage** ein oder lass **Auf Schiff anpassen** die meisten Tage wählen, die in eine Schiffsgröße passen, dann **XIT JSON kopieren**.

> [!warning]
> FIO Verbrauch rechnet mit deinem Plan, nicht mit dem, was im Spiel wirklich läuft. Halte einen Plan pro Planet im Imperium und halte den Plan im Einklang mit deiner Basis, sonst stimmen die Tage nicht.

Mehr: [FIO Verbrauch](/help/fio_burn), [XIT-Nachschub](/help/fio_burn#xit-resupply).

## 6. Reparaturen mit FIO Reparieren planen {#step-6}

Gebäude nutzen sich ab, und die [[repair|Reparatur]]rechnung wächst, je länger du wartest. Der Tab **Reparatur** eines Plans findet das beste Intervall für jeden Gebäudetyp.

![FIO Reparieren: wann Basen fällig werden, und die Basen mit ihren Reparaturterminen](/images/help/guides/hand-off-repair.webp)

Öffne [FIO Reparieren](/fio/repair). Es ordnet deine Pläne deinen echten Basen zu und zeigt, welche Basen überfällig, bald fällig oder später fällig sind.

1. Öffne eine Basis. Prüfe, ob **Reparaturziel** den Plan nennt, den du dort betreibst.
2. Stell unter **Reparaturflug** **Ankunft in** auf die Tage, die dein Schiff braucht.
3. **XIT Reparatur** baut das Paket mit den Reparaturmaterialien.
4. Flieg zur Basis, entlade und führe im Spiel BRA aus, um alle ihre Gebäude zu reparieren.

Mehr dazu: [FIO Reparieren](/help/fio_repair#repair-flight), [Reparatur](/help/plan_tools#repair).

## 7. Wo das Spiel übernimmt {#step-7}

PRUNplanners Aufgabe ist der Plan: was du baust, wo, zu welchem Preis und wann es sich amortisiert. Er endet in einem Export, den du im Spiel ausführst. Der tägliche Betrieb deiner Basen passiert im Spiel und in seinen Browser-Erweiterungen, Refined PrUn und dessen OOG-Fork, die im Spiel mit deinen Live-Daten arbeiten.

- Du hast deine Basis im Spiel geändert? Ändere auch den Plan. FIO Verbrauch und FIO Reparieren rechnen mit deinen Plänen, ein Plan, der von deiner Basis abweicht, ergibt also andere Tage und Fälligkeiten.
- Du planst eine Erweiterung? Geh zurück zum Plan, zu einer Kopie davon oder zu einem neuen Plan, und vergleiche, bevor du baust.
- Du willst deine Zahlen in einer Tabelle? Mit einem [API-Schlüssel](/help/api_keys) kann ein Google Sheet das Material I/O deines Imperiums lesen.

Mehr: [Deine erste Basis](/help/guide_first_base), [Zum Imperium wachsen](/help/guide_empire).

## Wie geht es weiter {#next}

- [Zum Imperium wachsen](/help/guide_empire): Prüfe alle deine Basen zusammen, bevor du die nächste hinzufügst.
- [Glossar](/help/glossary): die Begriffe aus Spiel und Planung an einem Ort.
