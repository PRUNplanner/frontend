Eine Basis ist ein Plan. Mehrere Basen, die sich gegenseitig beliefern, sind ein [[empire|Imperium]]. Diese Anleitung dauert etwa 15 Minuten, und am Ende hast du:

- deine Basen in einem Imperium, mit eingestellter Fraktion und Genehmigungen,
- die Imperium-Seite gelesen: was die Basen zusammen verdienen, was sie herstellen und brauchen und ob der Markt das aufnehmen kann,
- eine Liste von Aufträgen, die dein Überschuss beliefern könnte, und von Korrekturen an deinen Plänen, um zu entscheiden, was du als Nächstes baust.

Sie ist für Spieler mit zwei oder mehr Basen oder Plänen. Du brauchst ein Konto. Die Seiten, die am Ende jedes Schritts verlinkt sind, gehen tiefer.

## 1. Bring deine Basen in ein Imperium {#step-1}

Öffne die [Verwaltung](/manage) und scrolle zu **Plan ↔ Imperium Zuweisung**. Dort gibt es eine Zeile pro [[plan|Plan]] und eine Checkbox-Spalte pro Imperium.

1. Hake bei jedem Plan, der dazugehört, das Kästchen des Imperiums an. Geänderte Kästchen bleiben markiert, bis du speicherst.
2. Drück **Änderungen speichern** in der Leiste unten.

Ein Plan kann in mehreren Imperien sein, zum Beispiel in einem mit deinen echten Basen und in einem für eine künftige Erweiterung. Er rechnet immer mit einem Imperium und nutzt dessen Fraktion, Genehmigungen und [[exchange-preference|Marktplatz-Präferenz]].

> [!tip]
> Du willst eine Variante einer Basis ausprobieren, ohne das Original zu ändern? **Duplizieren** unter **Aktionen** kopiert den Plan. Pack die Kopie in ein Test-Imperium.

Mehr dazu: [Plan ↔ Imperium Zuweisung](/help/management#assignments), [Grundbegriffe](/help/management#core-concepts).

## 2. Fraktion und Genehmigungen einstellen {#step-2}

Öffne [Imperium](/empire) und wähle das Imperium unter **Imperium wechseln**. Stell im Kasten **Konfiguration** **Fraktion**, **Genehmigungen gesamt** und **Genehmigungen benutzt** ein und drück dann **Speichern**.

- Genehmigungen kommen von deinem HQ. Jedes Upgrade der HQ-Stufe bringt eine weitere Basisgenehmigung, und der [HQ Kalkulator](/hq-upgrade-calculator) listet, was ein Upgrade kostet.
- Der [[faction|Fraktions]]bonus wächst, je weniger Genehmigungen du nutzt, diese Zahlen verändern also jeden Plan des Imperiums.
- Weicht **Genehmigungen benutzt** von den Genehmigungen ab, die deine Pläne zusammen ergeben, siehst du die Warnung „Unstimmigkeit erkannt“. Sie prüft die Zahlen während der Eingabe und hindert dich nicht am Speichern. Sie erinnert dich daran, die richtigen Werte aus deinem `HQ`-Fenster im Spiel zu übernehmen.

Mehr: [Konfiguration](/help/empire#configuration), [Fläche und Genehmigungen](/help/glossary#area-permits).

## 3. Die Übersichtszahlen lesen {#step-3}

Die Kacheln oben fassen das Imperium pro Tag zusammen: **Umsatz**, **Kosten**, **Profit** und **Profit / Fläche**.

![Die Imperium-Seite: Umsatz, Kosten und Profit, die Kostenaufteilung, der Versand und die Planliste](/images/help/guides/empire-overview.webp)

Das Imperium ist keine einfache Summe seiner Pläne. Was ein Plan herstellt und ein anderer verbraucht, hebt sich zuerst auf, und nur der Rest wird verkauft oder gekauft, zum Durchschnittspreis der Pläne. Deshalb können die Zahlen des Imperiums von den addierten Profiten seiner Pläne abweichen.

Ein Beispiel: Plan A stellt 100 DW am Tag her, und sein Material I/O bewertet sie mit je 80 ȼ. Plan B verbraucht 60 DW am Tag zu je 100 ȼ. Das Imperium verkauft die übrigen 40. Sein Preis ist der nach der Menge jedes Plans gewichtete Durchschnitt: (100 × 80 + 60 × 100) ÷ 160 = 14.000 ÷ 160 = 87,50 ȼ, die 40 DW zählen also 3.500 ȼ am Tag. Die beiden Pläne für sich zählen +8.000 und −6.000, zusammen 2.000 ȼ.

- Der Balken darunter teilt den Umsatz in Inputs, Belegschaft, [[degradation|Abnutzung]], [[production-fees|Produktionsgebühren]] und Profit auf.
- **Versand** zeigt die Tonnen und m³, die deine Pläne pro Tag ein- und ausschiffen.
- Die Planliste zeigt den Profit jedes Plans. Klick auf einen, um ihn zu öffnen.

Details: [Übersichtszahlen](/help/empire#overview-numbers), [Planliste](/help/empire#plan-list).

## 4. Die Materialien ausgleichen {#step-4}

Öffne oben auf der Seite **Material I/O**. Es listet jedes Material des Imperiums mit seinem **Delta** (hergestellt minus verbraucht pro Tag).

![Die Ansicht Material I/O der Imperium-Seite](/images/help/guides/empire-materials.webp)

- Ein positives Delta wird verkauft, ein negatives gekauft. Ein großes negatives Delta bei etwas, das du herstellen könntest, ist ein Kandidat für deine nächste Basis.
- Steht **Darstellung** auf **Ladeausgleich**, siehst du nur Materialien, die das Imperium sowohl herstellt als auch verbraucht. Prüfe, ob Angebot und Bedarf zusammenpassen.
- Klapp eine Zeile auf, um zu sehen, welche Pläne das Material herstellen und verbrauchen. **Netto pro Planet** fasst Pläne auf demselben Planeten zusammen.

Mehr: [Material I/O](/help/empire#material-io).

## 5. Den Markt prüfen {#step-5}

**Markt-Check für den Nettofluss des Imperiums**, über der Tabelle, prüft, was das Imperium als Ganzes verkauft und kauft, gegen den Handel am Marktplatz. Chips zählen die Markierungen: rot („kann nicht wie geplant gehandelt werden“), gelb („großer Marktanteil“) und andere Notizen. Klick auf einen Chip, um nur diese Materialien zu zeigen.

- Ab 10 % des Tagesvolumens eines Materials bewegen deine Orders wahrscheinlich den Preis. Ab 50 % kann der Markt die Menge nicht wie geplant aufnehmen. Das Tagesvolumen ist die 30-Tage-Summe des Marktplatzes ÷ 30. Ein Beispiel: 30.000 in 30 Tagen gehandelte Einheiten ergeben 1.000 am Tag, ein Imperium, das 150 am Tag verkauft, nimmt also 15 % und bekommt eine gelbe Markierung.
- Der Check nutzt die Regeln _alle Planeten_ der Marktplatz-Präferenz des Imperiums. Hat ein Material eine Planeten-Ausnahme, prüft es der [Plan-Check](/help/plan_check#market-check) des jeweiligen Plans.

> [!tip]
> Eine rote Markierung bei einem Output macht eine Basis nicht schlecht. Weniger Gebäude, ein zweiter Output oder ein anderer Marktplatz können den Anteil senken.

Mehr dazu: [Markt-Check](/help/empire#market-check), [Plan-Check: Imperium](/help/plan_check#empire).

## 6. Produktionschancen finden {#step-6}

Öffne oben auf der Seite **Produktionschancen**, um [[recipe|Aufträge]] zu sehen, die nutzen könnten, was deinem Imperium übrig bleibt.

![Die Ansicht Produktionschancen der Imperium-Seite](/images/help/guides/empire-opportunities.webp)

- **Chancen**: Aufträge, bei denen jeder Input im Überschuss ist, genug für mindestens einen Durchlauf am Tag.
- **Mögliche Batches**: wie viele Durchläufe am Tag dein Überschuss abdeckt. Auftragsdauer, Gebäude und Effizienz werden ignoriert, lies es also als „wie viel Input da ist“, nicht als „wie viel du herstellen kannst“.
- **Inputs verkaufen** und **Outputs verkaufen** vergleichen, den Überschuss so zu verkaufen, wie er ist, mit dem Verkauf dessen, was der Auftrag daraus machen würde.

Mehr: [Produktionschancen](/help/empire#production-opportunities).

## 7. Die Ketten hinter deinen Basen prüfen {#step-7}

Wechsle in den [Produktionsketten](/production-chain) von **Kette planen** zu **Imperium prüfen** und wähle das Imperium. Füge die Ketten hinzu, die du prüfen willst, oder wähle **Alles prüfen, was das Imperium verkauft**.

Der Check verfolgt jedes verkaufte Material zurück durch deine Pläne und listet Ergebnisse mit ihrem Gewinn pro Tag. Eine **Plankorrektur** heißt, dass der Plan ein COGC-Programm zählt, das der Planet nicht hat, oder eines übersieht, das er hat. Die anderen Ergebnisse sind ein günstigerer **Auftrag**, **Herstellen oder kaufen**, ein besserer **Standort** oder eine bessere **Ausstattung** mit Luxusgütern und Experten. Ein Plan wird dabei nie geändert.

> [!tip]
> Erledige zuerst die Plankorrekturen. Sie kosten nichts beim Bauen, und die Zahlen des Plans stimmen nicht, bis du sie erledigst.

Details: [Imperium prüfen](/help/tools_production_chain#check-an-empire), [Ergebnisse](/help/tools_production_chain#findings).

## Wie geht es weiter {#next}

- [Übergabe ans Spiel](/help/guide_hand_off): Baue, versorge und repariere deine Basen mit XIT-Paketen.
- [Von einer Kette zu Basen](/help/guide_chain_to_bases): Plane die nächste Kette und füge sie diesem Imperium hinzu.
