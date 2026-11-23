Fang mit einem Ziel an wie „50 RAT pro Tag herstellen“. Diese Anleitung dauert etwa 20 Minuten, und am Ende hast du:

- die ganze Produktionskette hinter deinem Ziel, mit ihrem Profit und ihren Baukosten,
- diese Kette aufgeteilt in Basen, die du bauen könntest, jede auf einem Planeten,
- einen [[plan|Plan]] pro Basis, auf Wunsch in einem neuen [[empire|Imperium]].

Sie ist für Spieler, die eine neue Produktionslinie über mehrere Basen planen. Die Seiten, die am Ende jedes Schritts verlinkt sind, gehen tiefer. Du brauchst ein Konto und solltest zuerst deine Preise einrichten (siehe [Preise einrichten](/help/guide_cx_prices)).

## 1. Leg deine Ziele fest {#step-1}

Öffne [Produktionsketten](/production-chain) (Rechner im Seitenmenü).

![Produktionsketten mit 100 RAT pro Tag als Ziel, den Einstellungen und den Ergebnis-Kacheln](/images/help/guides/chain-targets.webp)

1. Wähle unter **Produktion pro Tag** ein Material in **Material hinzufügen**.
2. Gib die Menge ein, die du pro Tag willst. Ein neues Ziel startet mit 10.
3. Füg auf Wunsch weitere Ziele hinzu, zum Beispiel DW, RAT und OVE zusammen. Die Kette teilt die Schritte, die sie gemeinsam haben.

Die Ergebnisse, **Schritte** und **Graph** füllen sich sofort und aktualisieren sich bei jeder Änderung.

Mehr: [Erste Schritte](/help/tools_production_chain#getting-started).

## 2. Prüf die Einstellungen {#step-2}

Diese stehen über den Ergebnissen:

- **Preise**: die [[exchange-preference|Marktplatz-Präferenz]], mit der PRUNplanner die Kette bepreist.
- **Rohstoffe**: **Kaufen** (Standard) oder **Abbauen**.
- **Nebenprodukte**: **Bedarf decken** nutzt ein [[byproduct|Nebenprodukt]] zuerst innerhalb der Kette. **Verkaufen** verkauft alle.
- **Eigene Produktion**: Wähle ein Imperium, das du schon betreibst, und die Kette nutzt zuerst dessen Überschuss.

> [!warning]
> Wählst du unter **Preise** eine Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz, und andere Werkzeuge, die deinem Standard folgen, wechseln mit.

Mehr dazu: [Einstellungen](/help/tools_production_chain#settings), [Eigene Produktion](/help/tools_production_chain#own-production).

## 3. Entscheide, was du herstellst und was du kaufst {#step-3}

**Schritte** listet jedes Material der Kette einmal. Für jedes sagt **Quelle**, ob du es **Herstellen**, **Kaufen** oder **Abbauen** willst, und **Herstellen oder kaufen** sagt, ob die Herstellung Geld spart.

- Die Chips über den Schritten fassen zusammen, worauf du schauen solltest. **Günstiger zu kaufen** listet Schritte, die du teurer herstellst als zum Marktplatzpreis, und **Alle kaufen** stellt sie auf Kaufen um.
- **Dünner Markt** listet gekaufte Materialien, bei denen die Kette 10 % oder mehr dessen braucht, was der Marktplatz pro Tag handelt. So viel zu kaufen bewegt wahrscheinlich den Preis. Er listet auch Materialien, die dort in 30 Tagen nicht gehandelt wurden. Ein Beispiel: Hat ein Marktplatz in den letzten 30 Tagen 30.000 Einheiten eines Materials gehandelt, sind das 1.000 pro Tag. Eine Kette, die 120 pro Tag kauft, braucht 120 ÷ 1.000 = 12 %, also wird es gelistet.
- Hat ein Material mehrere [[recipe|Aufträge]], klick auf „… Aufträge ▾“, um ihre Wirkung auf die Kette zu vergleichen.

Mehr: [Schritte](/help/tools_production_chain#steps), [Warnungen](/help/tools_production_chain#warnings).

## 4. Lies die Ergebnisse {#step-4}

Die Leiste oben zählt die ganze Kette zusammen:

- **Profit / Tag** ist der Output-Wert minus gekaufte Inputs, [[upkeep|Unterhalt]] der Belegschaft, Verschleiß und Produktionsgebühren.
- **Gebäude**, **Fläche** und **Belegschaft** zeigen, was es braucht.
- **Baukosten** ist, was der Bau kostet, mit der [[payback|Amortisation]].

Die Amortisation ist Baukosten ÷ Profit pro Tag. Ein Beispiel: Eine Kette mit 3.000.000 ȼ Baukosten, die 25.000 ȼ pro Tag macht, amortisiert sich in 3.000.000 ÷ 25.000 = 120 Tagen. Ohne Profit zeigt die Leiste „keine Amortisation“.

Du willst einen Profit, der die Baukosten in einer Zeit zurückzahlt, die du akzeptierst. Tut er das nicht, ändere ein Ziel oder stell Schritte zwischen Herstellen und Kaufen um und beobachte die Leiste.

Details: [Ergebnisse](/help/tools_production_chain#results), [So werden die Kosten berechnet](/help/tools_production_chain#how-costs-are-calculated).

## 5. Teil die Kette auf Basen auf {#step-5}

Öffne den Tab **Basen**. Er zeigt drei Schritte, und der nächste ist der Hauptbutton.

![Der Tab Basen in Produktionsketten mit Automatische Aufteilung, Rate anpassen und Die Pläne erstellen](/images/help/guides/chain-bases.webp)

1. Wähle die Größe unter **Basen bis**: 500 Fläche (1 Genehmigung), 750 oder 1.000.
2. Drück **Automatische Aufteilung**. Sie gruppiert die Schritte in Basen mit je einem [[expertise|Fachgebiet]] und wählt für jede Basis einen Planeten. Dieser Planet hat einen freien Bauplatz, keinen Plan von dir und die Ressourcen und Fruchtbarkeit, die die Basis braucht. Die automatische Aufteilung bevorzugt ein hilfreiches COGC-Programm und kurze Entfernungen.
3. Willst du stattdessen eine bestimmte Zahl von Basen? Stell **Anzahl Basen** ein und drück **Rate anpassen**. Es skaliert alle Ziele gleich auf die größte Rate, die passt, und teilt die Kette dann auf.

> [!warning]
> **Automatische Aufteilung** und **Rate anpassen** fangen von vorne an. Du verlierst alle Namen, Planeten, COGC-Wahlen, Luxusgüter und Experten, die du vorher geändert hast, teil also zuerst auf und passe danach an.

Mehr: [Auf Basen aufteilen](/help/tools_production_chain#auto-layout), [So werden Planeten gewählt](/help/tools_production_chain#planet-picking), [Die Rate anpassen](/help/tools_production_chain#fit).

## 6. Pass die Basen an {#step-6}

Auf jeder Basiskarte kannst du die Basis umbenennen, einen anderen Planeten wählen, ihr COGC-Programm wählen, ihre **Luxusgüter** und **Experten** einstellen, sie mit einer anderen Basis zusammenführen oder sie trennen.

Die Planetenauswahl löst die Basis auf jedem Planeten, sodass du Gebäude und Fläche vergleichen kannst. Sie markiert auch Planeten, auf denen du schon einen Plan hast. **Transport pro Tag** listet, was zwischen deinen Basen und dem Marktplatz bewegt wird, in Tonnen und m³, mit den [[jumps|Sprüngen]].

Du bist bereit für den nächsten Schritt, wenn jede Basis einen Planeten hat und in 1.000 Fläche passt und der dritte Schritt anbietet, die Pläne zu erstellen.

Mehr: [Übersicht und Basiskarten](/help/tools_production_chain#base-cards).

## 7. Erstell die Pläne {#step-7}

Drück „… Pläne erstellen…“ im dritten Schritt oder **Pläne erstellen**.

1. Prüf den Namen jedes Plans.
2. Wähle **Neues Imperium** (der Standard, mit einer **Fraktion**), **Hinzufügen zu** einem bestehenden Imperium oder **Kein Imperium**.
3. Bestätige. Die Seite bleibt bei der Kette und verlinkt die neuen Pläne und das Imperium.

Jeder Plan bekommt die Gebäude, Aufträge, Wohngebäude, ein STO, das COGC-Programm, die Genehmigungen, Luxusgüter und Experten seiner Basis.

Mehr dazu: [Pläne erstellen](/help/tools_production_chain#create-plans).

## 8. Prüf die Pläne {#step-8}

Die Kette überlässt manches den Plänen, öffne also jeden neuen Plan und prüf ihn als Basis:

- **Planet** und **Imperium & Preise**: Die Kette überlässt HQ- und Fraktionsboni den Plänen. Hak **Corp.-HQ** unter **Planet** an, wo es zutrifft, und prüf Fraktion und Genehmigungen des Imperiums.
- Die Ergebnis-Kacheln: **Profit / Tag**, **Amortisation** und **Fläche** innerhalb deiner Genehmigungen.
- **Plan-Check**: ob der Markt aufnimmt, was diese Basis verkauft, und liefert, was sie kauft.
- **Konstruktion**: was du noch brauchst, um sie zu bauen.

Zurück in Produktionsketten fasst die **Einkaufsliste** zusammen, was die Kette für eine Anzahl Tage kauft, und **XIT-Kaufaktion kopieren** kopiert sie als [[xit|XIT]]-Aktion.

> [!tip]
> **Kettenlink kopieren** speichert die ganze Kette als Link, damit du zu ihr zurückkehren oder sie teilen kannst.

Mehr: [Basis einrichten](/help/plan_base#empire-and-prices), [Plan-Check](/help/plan_check), [Einkaufsliste](/help/tools_production_chain#buy-list).

## Weiter {#next}

- [Zum Imperium wachsen](/help/guide_empire): Prüf die neuen Basen zusammen auf der Imperium-Seite.
- [Übergabe ans Spiel](/help/guide_hand_off): Bau, Versorgung und XIT-Pakete, um sie zu errichten.
