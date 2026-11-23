Mit **Produktionsketten** planst du eine ganze Produktionskette pro Tag. Sag ihr, was du wie viel pro Tag produzieren willst, für ein Material oder mehrere auf einmal (etwa DW, RAT und OVE). Sie rechnet jeden Schritt für dich aus: welcher [[recipe|Auftrag]] jedes Material herstellt, wie viele Gebäude das braucht, was du kaufen musst und was die Kette zu deinen [[cx|CX]]-Preisen kostet und einbringt. Dann teilt sie die Kette auf Basen auf, wählt Planeten und erstellt die [[plan|Pläne]]. Ihr zweiter Modus, **Imperium prüfen**, schaut sich ein Imperium an, das du schon betreibst.

Nutze sie, bevor du baust: Sie zeigt, was pro Tag herzustellen ist, was zu kaufen ist und was der Betrieb braucht, von den Rohstoffen aufwärts. So weißt du, was eine Kette kostet und einbringt, bevor du ein Gebäude setzt.

## Erste Schritte {#getting-started}

Für Produktionsketten brauchst du ein Konto. Melde dich an und öffne sie dann unter Rechner → **Produktionsketten**.

1. Wähle unter **Produktion pro Tag** ein Material in **Material hinzufügen**. Du kannst jedes Material wählen, das einen Auftrag hat oder als Planetenressource vorkommt.
2. Jedes Ziel startet mit 10 pro Tag. Gib eine Menge ein oder nutze − und +. Sie gehen unter 20 in Schritten von 1, ab 20 in Schritten von 5 und ab 100 in Schritten von 10, und − geht nie unter 1.
3. × entfernt ein Ziel. Du kannst so viele hinzufügen, wie du willst, und die Kette teilt Schritte zwischen ihnen.

Ergebnisse, Schritte und Graph aktualisieren sich bei jeder Änderung. Bis du ein Material hinzufügst, fragt die Seite anstelle der Ergebnisse „Was möchtest du produzieren?“.

Während die Planeten laden, steht dort „Planeten für den Abbau werden geladen …“. Können sie nicht geladen werden, zeigen abgebaute Zeilen keine Gebäude. Drück **Erneut versuchen**, um sie neu zu laden.

> [!tip]
> Fang mit der Tagesmenge an, die du verkaufen möchtest, und schau dir Profit und Gebäude an. Nutze dann **Rate an deine Basen anpassen** (siehe [Basen](#bases)), um die Kette auf die Basen zuzuschneiden, die du wirklich bauen kannst.

## Einstellungen {#settings}

Jede Basis läuft mit beiden [[luxuries|Luxusgütern]] und den [[experts|Experten]], die für ihre Gebäude am meisten bringen (mehr dazu in [Basen](#bases)). Luxusgüter sind optionale Verbrauchsgüter, die die Effizienz deiner Arbeiter erhöhen, und Experten beschleunigen die Gebäude einer Basis in einem Fachgebiet. Diese Einstellungen stehen über den Ergebnissen:

- **Effizienz**: ein zusätzlicher globaler Prozentsatz obendrauf, für Boni durch [[corp-hq|Corp.-HQ]] oder [[faction|Fraktion]]. 100 % fügt nichts hinzu, und erlaubt sind 1 bis 1.000 %. Er ändert, wie viel jedes Gebäude herstellt, nicht die Produktionsgebühren. Ein Beispiel: Bei 125 % kommt ein Schritt, der bei 100 % 10 Gebäude braucht, auf genau 8 Gebäude.
- **Preise**: die [[exchange-preference|Marktplatz-Präferenz]], mit der die Kette bepreist wird. Sie startet mit deiner Standard-Marktplatz-Präferenz, und „None - Universe 30D“ nutzt universumsweite Preise. Die Kette nutzt die Preise der Präferenz, aber nicht ihre planetenspezifischen Ausnahmen. Die Preise bestimmen die Standardaufträge, alle Kosten und den Profit, eine andere Marktplatz-Präferenz kann die Kette also verändern.
- **Rohstoffe**: **Kaufen** (Standard) oder **Abbauen**. Du kannst auch eine einzelne Zeile in Schritte auf Abbauen stellen. Ein Rohstoff, der selbst ein Ziel ist, wird immer abgebaut. Mit **Abbauen** plant die Kette Extraktoren und rechnet ihren Unterhalt, Verschleiß und ihre Gebühren statt eines CX-Preises. Drei Planetenressourcen haben auch einen Auftrag: O, HE3 und SIO. Mit **Abbauen** baut die Kette eine solche Ressource ab, wenn das pro Einheit weniger kostet als die Herstellung und die Basis des Schritts sie abbauen kann, und stellt sie sonst her. Ein Beispiel: Stahl braucht O. Stellst du es in einem TNP her, entsteht auch TC zum Verkaufen, während der Abbau nur den Extraktor des Planeten braucht. Eine Zeile, die du selbst auf Herstellen oder Abbauen stellst, behält diese Wahl.
- **Nebenprodukte**: Manche Aufträge stellen neben dem Material, für das sie laufen, einen zweiten Output her. **Bedarf decken** (Standard) nutzt jedes [[byproduct|Nebenprodukt]] zuerst dort, wo die Kette genau dieses Material braucht, und verkauft den Rest. **Verkaufen** verkauft alle.

> [!warning]
> Wählst du unter **Preise** eine Marktplatz-Präferenz, wird sie auch zu deiner Standard-Marktplatz-Präferenz, und andere Seiten, die deinem Standard folgen, wechseln mit. Das passiert in beiden Modi.

### Standardwerte {#defaults}

| Einstellung            | Standard                            |
| ---------------------- | ----------------------------------- |
| **Effizienz**          | 100 %                               |
| **Preise**             | deine Standard-Marktplatz-Präferenz |
| **Rohstoffe**          | **Kaufen**                          |
| **Nebenprodukte**      | **Bedarf decken**                   |
| **Eigene Produktion**  | **Keine**                           |
| Ein neues Ziel         | 10 / Tag                            |
| **Basen bis**          | 500 Fläche                          |
| **Anzahl Basen**       | 2                                   |
| **Einkaufsliste**      | für 10 Tage                         |
| **Zeilenreihenfolge**  | **Kette**                           |
| **Linienstärke**       | **t / Tag**                         |
| Luxusgüter einer Basis | beide                               |
| Experten einer Basis   | **Auto**                            |
| COGC einer Basis       | das aktive Programm des Planeten    |

## Eigene Produktion {#own-production}

Wenn du einen Teil einer Kette schon herstellst, wähle unter **Eigene Produktion** eines deiner [[empire|Imperien]]. Jedes Material, das die Kette braucht und von dem das Imperium mehr herstellt, als es verbraucht, wird als **Vorhanden** markiert. Dieser Überschuss ist, was seine Pläne herstellen, minus was sie verbrauchen, den Verbrauch der Belegschaft eingeschlossen. Die Kette nutzt ihn zuerst, nach den Nebenprodukten, und stellt nur den Rest her, kauft ihn oder baut ihn ab.

- Ein Material, von dem du genug hast, wandert in die erste Spalte des Graphen, und seine Inputs fallen aus der Kette. Schritte, Gebäude und Baukosten zeigen dann nur, was die neue Kette hinzufügt, und die Ergebnisse sagen dir, wie viel weniger Gebäude und Baukosten du brauchst.
- Du kannst ein Material auch von Hand in der Spalte Quelle als **Vorhanden** markieren und eingeben, wie viel du pro Tag hast. Lass das Feld leer für alles, oder gib 0 ein, um es auszuschalten. Eine eingegebene Menge hat Vorrang vor dem Imperium. Weicht sie vom Überschuss des Imperiums ab, setzt „… nutzen“ daneben sie auf die Menge des Imperiums zurück.
- Hast du nur einen Teil eines Materials, zeigt die Zeile „Rest“ und lässt dich wählen, was den Rest deckt.
- Ziele kommen immer aus der Kette selbst.
- Keine Sorge, wenn ein Material, das deine Pläne herstellen, kein **Vorhanden** zeigt: Nur was das Imperium über den eigenen Verbrauch hinaus herstellt, zählt, ein Material, das es aufbraucht, hat also keinen Überschuss. Du kannst es trotzdem von Hand als **Vorhanden** markieren.
- Was aus deinen Plänen kommt, zählt im Profit wie ein gekaufter Input zu seinem CX-Preis. Die Input-Kachel heißt dann **Inputs / Tag** und teilt sie in eigene und gekaufte auf.
- [Basen](#bases) listet, welcher Plan was liefert, in der Reihenfolge der Plannamen, und welchen Teil des Überschusses die Kette nicht nutzt. Die Transporttabelle enthält die Routen von diesen Plänen.
- Vorhanden-Zeilen sind nicht Teil der Pläne, die **Pläne erstellen** anlegt.
- Änderst du die Pläne des Imperiums in einem anderen Tab, aktualisieren sich die Mengen, solange diese Seite offen ist.
- Der Kettenlink behält die Vorhanden-Mengen, die die Kette nutzt, auch die aus dem Imperium, aber nie das Imperium selbst.

## Ergebnisse {#results}

Die Leiste oben zählt alle deine Basen zusammen.

| Kachel                                     | Was sie zeigt                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profit / Tag**                           | Output-Wert minus gekaufte Inputs, eigene Produktion zum CX-Preis, Unterhalt, Verschleiß und Produktionsgebühren, auch als Anteil am Output-Wert (ohne Eigene Produktion)                                                                                                                                                                                                          |
| **Output-Wert / Tag**                      | Die Ziele zum CX-Verkaufspreis, plus verkaufte Nebenprodukte                                                                                                                                                                                                                                                                                                                                          |
| **Gekaufte Inputs / Tag**                  | Was du kaufst, zum CX-Kaufpreis                                                                                                                                                                                                                                                                                                                                                                       |
| **Unterhalt, Verschleiß + Gebühren / Tag** | [[upkeep\|Unterhalt]] der Belegschaft mit den Luxusgütern, Verschleiß und [[production-fees\|Produktionsgebühren]], mit dem Unterhalt der Belegschaft und den Gebühren unter dem Wert |
| **Gebäude**                                | Gebaut und exakt                                                                                                                                                                                                                                                                                                                                                                                      |
| **Fläche**                                 | Inklusive Wohngebäude                                                                                                                                                                                                                                                                                                                                                                                 |
| **Belegschaft**                            | Pro Stufe                                                                                                                                                                                                                                                                                                                                                                                             |
| **Baukosten**                              | Mit der [[payback\|Amortisation]], oder „keine Amortisation“, wenn der Profit 0 oder weniger ist                                                                                                                                                                                              |

Jede Basis zählt ihr Kernmodul und ein STO zur Fläche. Die Baukosten zählen die Gebäude, die Wohngebäude und das STO, aber nicht das Kernmodul oder Planeten-Extras (MCG, AEF, SEA, HSE, INS, TSH). Eine Basis ohne Schritte zählt nichts.

Gebäude eines Typs teilen ihre Kapazität über Aufträge hinweg, wie im Spiel, also werden aus 4,5 Food Processors 5 gebaute. Das funktioniert nur innerhalb einer Basis.

Ein Beispiel mit ausgedachten Zahlen: Ein Output-Wert von 10.000 ȼ pro Tag, 4.000 ȼ gekaufte Inputs und 2.500 ȼ Unterhalt, Verschleiß und Gebühren lassen einen **Profit / Tag** von 3.500 ȼ, 35 % des Output-Werts. Bei 700.000 ȼ Baukosten amortisiert sich das in 700.000 ÷ 3.500 = 200 Tagen. Ein Profit unter 0 erscheint rot, und **Baukosten** zeigt dann „keine Amortisation“.

### So werden die Kosten berechnet {#how-costs-are-calculated}

- **Verschleiß** sind die Baukosten des Gebäudes ÷ 180 Tage. Ein Beispiel: Ein Gebäude mit 90.000 ȼ Baukosten fügt 500 ȼ Verschleiß pro Tag hinzu.
- **Kosten pro Einheit eines hergestellten Schritts** addieren seine Inputs zu ihren Kettenkosten, Unterhalt und Verschleiß des Gebäudes für einen Durchlauf und die Produktionsgebühr für einen Durchlauf. Hergestellte Inputs zählen zu ihren eigenen Kosten pro Einheit, gekaufte zum CX-Kaufpreis. Mit mehr Effizienz wird ein Durchlauf kürzer. Ein Auftrag mit mehreren Outputs teilt seine Kosten nach dem CX-Verkaufswert der Outputs auf, oder nach Menge, wenn keiner einen Preis hat.
- **Kosten pro Einheit eines abgebauten Schritts** sind Unterhalt und Verschleiß des Extraktors pro Tag ÷ Einheiten pro Tag, plus die Gebühr.
- **Produktionsgebühren** werden pro Durchlauf auf die Grundzeit des Auftrags berechnet, Effizienz ändert sie also nicht. Ein hergestellter Schritt zahlt die Gebühren des Planeten seiner Basis, und jedes Stück eines aufgeteilten Schritts die des Planeten seiner eigenen Basis. Ein abgebauter Schritt zahlt die des Planeten seines Standorts. Der typische Planet und eine Basis ohne Planet zahlen keine, die Wahl von Planeten kann die Kosten also erhöhen.
- **Standardauftrag**: Wählst du keinen, nimmt die Kette den günstigsten Auftrag mit einem einzigen Output zu CX-Preisen. Aufträge mit Nebenprodukten nutzt sie nur, wenn es keinen Auftrag mit einem einzigen Output gibt.

## Schritte {#steps}

Jedes Material erscheint einmal. Du kannst die Zeilen nach **Kette** ordnen, wo jedes Ziel mit seinen Inputs kommt (das Dreieck klappt sie ein), oder **Nach Quelle**, in den Gruppen „Hergestellt“, „Abgebaut“, „Gekauft“ und „Aus deinen Plänen“.

| Spalte                     | Was sie zeigt                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**               | Mit „Ziel“, „für …“ (was es beliefert) oder „verkauft“                                                                             |
| **Pro Tag**                | Wie viel, mit „+ … aus Nebenprodukten“ und „+ … eigen“                                                                                                |
| **Basis**                  | Welche Basis es herstellt. Damit verschiebst du einen Schritt oder ein Stück davon (siehe [Basen](#bases))         |
| **Quelle**                 | **Herstellen**, **Kaufen**, **Abbauen** (nur Planetenressourcen) oder **Vorhanden**                                                |
| **Auftrag oder Bezug**     | Der Auftrag, der Marktplatz, auf dem es gekauft wird, oder der Abbauplanet                                                                            |
| **Gebäude**                | Das Gebäude und wie viele, und wie viel der gebauten es nutzt                                                                                         |
| **Kosten / Einheit**       | Seine Kosten pro Einheit in der Kette                                                                                                                 |
| **CX-Preis**               | Der CX-Preis                                                                                                                                          |
| **Herstellen oder kaufen** | Ob Herstellen Geld spart („Herstellen, spart …“ oder „Kaufen ist … günstiger“), mit einem Markt-Chip für gekaufte Zeilen und Ziele |

**Herstellen** ist für ein Material ohne Auftrag aus, und **Kaufen** und **Vorhanden** sind für Ziele aus. Ein Nebenprodukt-Block unten listet, woher jedes Nebenprodukt kommt, wie viel die Kette nutzt und wie viel sie verkauft. **CSV** lädt die Tabelle als `production-chain.csv` herunter.

- Klick auf ein Material, um zu sehen, was es **Benötigt**, wohin es **Geht an**, seine Kosten **Pro Einheit** (Inputs, Unterhalt und Verschleiß, Produktionsgebühren, Kettenkosten gegen den CX-Preis) und die freie Kapazität seiner Gebäude: „… frei, bis zu + … / Tag“.
- Klick auf einen Auftrag („… Aufträge ▾“, nur angezeigt, wenn es mehrere gibt), um alle Aufträge für dieses Material zu vergleichen. Der genutzte steht oben, dann die anderen nach ihrer Wirkung auf den Profit, jeweils mit der Änderung des Profits pro Tag und der Gebäude. Abzeichen markieren den Auftrag **in Verwendung**, den **Standard** und die **mit Nebenprodukten**.
- Abgebaute Zeilen nutzen einen typischen Planeten: die besten 10 % aller Planeten mit der Ressource, also das 90. Perzentil des täglichen Abbaus, oder den besten Planeten, wenn weniger als 10 Planeten sie haben. Das ist ein Planungsstandard, keine echte Basis, und er zahlt keine Produktionsgebühren. Klick darauf, um in **Wo abbauen** einen echten Planeten zu wählen. Du kannst nach Extraktor, Oberfläche, Sprüngen zu einem Marktplatz, **Keine Zusatzmaterialien**, **Ressourcenabbau-COGC** und **Lokaler Markt** filtern, oder **In der Planetensuche öffnen** nutzen. Hat die Basis des Schritts einen Planeten mit der Ressource, gilt dessen eigene Rate.

## Warnungen {#warnings}

Die Chips über den Schritten fassen zusammen, worauf du schauen solltest. Klick auf einen, um die Schritte zu filtern, und **Alle anzeigen** holt alles zurück.

- **Günstiger zu kaufen** listet Materialien, die die Kette teurer herstellt oder abbaut als zum CX-Preis. Ziele zählen nie. **Alle kaufen** stellt sie auf Kaufen um, und die Meldung bietet **Rückgängig** an.
- **Dünner Markt** listet gekaufte Materialien, bei denen die Kette 10 % oder mehr dessen braucht, was die CX pro Tag handelt (der 30-Tage-Schnitt), oder die in 30 Tagen nicht gehandelt wurden. Ein Beispiel: Hat die CX in 30 Tagen 6.000 Einheiten gehandelt, sind das 200 pro Tag, 30 pro Tag zu kaufen sind also 15 %. In Schritte wird der Chip für den [[share-of-volume|Volumenanteil]] ab 10 % gelb und ab 50 % rot. Ziele bekommen denselben Chip für die Verkaufsseite. Mehr dazu: [[thin-market|dünne Märkte]].
- **Schritte, die ihre Basen nicht ausführen können** markiert eine Farm auf einem Planeten ohne Fruchtbarkeit oder einen Abbau auf einem Planeten ohne die Ressource. Der Chip springt zu Basen.
- **Auftragsschleife** heißt, dass ein Auftrag irgendwo weiter oben in der Kette seinen eigenen Output braucht. Die Kette hört bei der Wiederholung auf.

Gibt es nichts günstiger zu kaufen, keinen dünnen Markt und keine Basiswarnung, steht an ihrer Stelle ein Chip „Keine Warnungen“.

## Graph {#graph}

Der Graph zeigt dieselbe Kette. Rohstoffe stehen links („Gekauft · abgebaut“, mit Eigener Produktion plus „vorhanden“) und die Ziele rechts. **Linienstärke** folgt **t / Tag** (Standard), **ȼ / Tag** oder **Gleich**. Zoome mit −, **Einpassen** und +. Jeder Knoten zeigt, wo er gekauft wird oder welche Basis und welches Gebäude ihn herstellen. Klick auf ein Material, um nur zu sehen, was es braucht und beliefert, und auf **Alle anzeigen**, um zurückzugehen.

## Basen {#bases}

Eine Kette kann auf bis zu 26 Basen (A bis Z) laufen, jede auf einem Planeten. Der Tab Basen beginnt mit drei Schritten, und der nächste fällige ist der Hauptbutton.

### 1. Auf Basen aufteilen {#auto-layout}

**Automatische Aufteilung** teilt die Kette auf Basen auf, die du bauen könntest:

- Jede Basis bekommt ein [[expertise|Fachgebiet]] (das Gebiet ihrer Produktionsgebäude, etwa Landwirtschaft oder Metallurgie), bis zur Größe in **Basen bis**: 500 Fläche (Standard), 750 oder 1.000. Braucht ein Fachgebiet bei dieser Größe mehr als eine Basis, füllt es stattdessen Basen bis 1.000, sodass du eine volle Basis betreibst statt mehrerer gleicher.
- Die automatische Aufteilung teilt einen Schritt, der nicht passt, nach ganzen Gebäuden. So viele wie passen kommen in die aktuelle Basis und der Rest in die nächste, aus 6 CHP können also 4 + 2 werden. Ein Schritt kann sich über mehr als zwei Basen erstrecken. Abbauschritte bleiben ganz.
- Kleine Gruppen von Schritten (unter 1,5 Gebäuden oder ohne Fachgebiet) kommen zu der Basis, mit der sie die meisten Tonnen austauschen und die Platz für sie hat. Hat keine Platz, bekommen sie eine gemischte Basis.
- Die automatische Aufteilung kauft Schritte unter 0,2 Gebäuden, die mit einem ganzen Gebäude pro Einheit mehr kosten als an der CX. Solange so ein Schritt hergestellt wird, zeigt er in Schritte ein Etikett **Kaufen**. Du kannst sie zurück auf Herstellen stellen, aber die nächste automatische Aufteilung oder Anpassung kauft sie wieder.
- Jede Basis bekommt einen Planeten, wie in [So werden Planeten gewählt](#planet-picking) beschrieben.
- Danach führt sie Basen desselben Fachgebiets zusammen, wenn die zusammengeführte Basis in 1.000 Fläche passt und keine Ressource oder Fruchtbarkeit verliert.

> [!warning]
> Die automatische Aufteilung fängt von vorne an. Sie baut neue Basen von Grund auf, mit neuen Namen und Planeten, COGC auf das aktive Programm gesetzt und Standard-Luxusgütern und -Experten. Alle Namen, Planeten, COGC-Wahlen, Luxusgüter und Expertenänderungen, die du vorher gemacht hast, gehen verloren.

### So werden Planeten gewählt {#planet-picking}

Die automatische Aufteilung nutzt nur einen Planeten, der:

- einen freien [[plots|Bauplatz]] hat, oder Bauplätze, die PRUNplanner noch nicht gelesen hat (ein voller Planet mit [[ghost-sites|Geisterplätzen]] wird nicht genutzt)
- keinen deiner Pläne hat, ob in einem Imperium oder nicht
- die Basis betreiben kann: Jede abgebaute Ressource ist vorhanden, Farmen können laufen, und die Basis passt in die Größe.

Unter diesen kommen Planeten zuerst, auf denen ein COGC-Programm läuft, das den Gebäuden der Basis hilft. Danach zählt die Nähe: zu den anderen Basen, gewichtet nach den transportierten Tonnen, und zu den Planeten des Imperiums, falls du unter Eigene Produktion eines gewählt hast. Bei Gleichstand gewinnt der Planet, auf dem die Basis die wenigste Fläche braucht. Die größte Basis wird zuerst platziert. Kann kein Planet die Basis betreiben, nimmt sie trotzdem den ersten nach COGC und Nähe, prüf also die Warnungen der Basiskarte.

### 2. Rate an deine Basen anpassen {#fit}

Stell **Anzahl Basen** ein (standardmäßig 2, 1 bis 26) und drück **Rate anpassen**. Es findet die größte Rate, bei der alle Ziele gleich skaliert werden, die die automatische Aufteilung in so viele Basen packt, und teilt die Kette dann auf. Es kann die Raten senken oder erhöhen (bis zum 4.096-Fachen), in Schritten von 0,01 pro Tag beim größten Ziel. Braucht schon 0,01 pro Tag mehr Basen, sagt es dir das.

Es prüft die Anzahl mit der Aufteilung, bevor Planeten gewählt werden. Planeten mit niedrigeren Abbauraten oder geringerer Fruchtbarkeit können dann etwas mehr brauchen, schau dir das Ergebnis also an.

> [!tip]
> Rate anpassen skaliert jedes Ziel mit demselben Faktor, ihr Verhältnis bleibt also gleich. Willst du eine andere Mischung, ändere zuerst ein Ziel. Ein Beispiel: DW mit 20 und RAT mit 10 pro Tag werden zu 10 und 5, wenn die Anpassung die Rate halbiert.

### 3. Die Pläne erstellen {#create-the-plans}

Sobald jede Basis einen Planeten hat und in 1.000 Fläche passt, sagt der dritte Schritt das und bietet „… Pläne erstellen…“ an. Sonst sagt er dir, wie vielen Basen ein Planet fehlt oder wie viele über 1.000 Fläche liegen. Details in [Pläne erstellen](#create-plans).

### Übersicht und Basiskarten {#base-cards}

Unter den Schritten zeigt eine Übersicht **Basen** (wie viele einen Planeten haben), **Größte Basis**, **Genehmigungen** (mit der Fläche in allen Basen) und **Transport t / Tag** (mit den Routen). Sie hat außerdem eine Zeile pro Basis mit ihrem Fachgebiet und Planeten. **Basis hinzufügen** fügt eine Basis hinzu.

Auf jeder Basiskarte kannst du:

- der Basis einen Namen geben und ihren Planeten wählen („Planet wählen“ oder „ändern“)
- ihr COGC-Programm wählen: „Aktiv: …“ (der Standard), **Kein Programm** oder ein anderes Programm, um vor einer Abstimmung vorauszuplanen. Programme, die der Basis helfen, stehen zuerst, mit ihrem Bonus, und zeigen „nicht aktiv“, wenn der Planet sie nicht betreibt
- ihre **Luxusgüter** einstellen: Beide (100 % Effizienz der Belegschaft, der Standard), Luxus 2 (92 %), Luxus 1 (87 %) oder Grundbedarf (79 %). Der Unterhalt bezahlt sie
- ihre **Experten** **Bearbeiten** oder zu **Auto** zurückkehren. Auto wählt die Verteilung, die für den Output der Basis am meisten bringt: meist 5 in ihrem Hauptfachgebiet und den sechsten im nächsten, mit höchstens 5 eines Typs und 6 pro Basis
- sie **Zusammenführen mit…** einer anderen Basis, die ihren Planeten behält
- sie nach Fachgebiet **Trennen**, oder bei einem einzigen Fachgebiet halbieren, mit Planeten für die neuen Basen
- sie mit × entfernen, was ihre Schritte in die erste Basis verschiebt.

Die Gebäude einer Basis bekommen die Boni des Planeten wie in einem Plan: +25 % durch ein Werbeprogramm für ihr Fachgebiet, +10 % durch ein Belegschaftsprogramm für eine Stufe, die sie beschäftigen, und Fruchtbarkeit für Farmen. FRM und ORC laufen nicht ohne Fruchtbarkeit. Abgebaute Schritte nutzen die eigene Rate des Planeten. Ein Planet ohne die Ressource behält die Rate der Kette und zeigt eine Warnung, ebenso eine Basis über 1.000 Fläche.

Die Karte zeigt ihre Gebäude, die Fläche (Kernmodul, ein STO und Wohngebäude), [[area-permits|Genehmigungen]], Belegschaft und Unterhalt mit Verschleiß pro Tag.

Die Spalte **Basis** in Schritte verschiebt einen Schritt oder ein Stück eines aufgeteilten Schritts in eine andere Basis. „+ neue Basis“ beginnt eine neue.

Die Planetenauswahl für eine Basis löst die Schritte der Basis auf jedem Planeten, sodass du Gebäude und Fläche vergleichen kannst. Sie markiert Planeten, auf denen du schon einen Plan hast („dein Plan“). **Nur Planeten, die** filtert nach Planeten, die die Ressourcen haben und Landwirtschaft erlauben (standardmäßig an), ein COGC-Programm für die Basis betreiben, fruchtbar sind oder einen deiner Pläne haben. Du kannst auch nach Zusatzmaterialien, lokalem Markt, Sprüngen und Name filtern. Sie zeigt die Bauplätze jedes Planeten, filtert aber nicht danach.

**Transport pro Tag** listet, was zwischen den Basen und der CX bewegt wird, in Tonnen und m³, mit den [[jumps|Sprüngen]]. Das gibst du an deine Logistik weiter.

## Pläne erstellen {#create-plans}

**Pläne erstellen** legt einen Plan pro Basis mit Schritten an, mit ihren Gebäuden, Aufträgen, Wohngebäuden, einem STO, dem COGC-Programm und den Genehmigungen. Jeder Plan bekommt die Luxusgüter und Experten seiner Basis, sodass er herstellt, was die Kette zeigt. HQ- und Fraktionsboni bleiben den Plänen überlassen.

- Der Name jedes Plans beginnt mit den Zielen plus dem Basisnamen, und du kannst ihn ändern.
- Wähle **Neues Imperium** (der Standard, nach den Zielen „Kette …“ benannt, mit einer **Fraktion**), **Hinzufügen zu** einem bestehenden Imperium oder **Kein Imperium**. Ein neues Imperium wird zuerst erstellt, mit Genehmigungen aus den Plänen.
- Der Dialog sagt dir, was blockiert: keine Basis mit Schritten, eine Basis ohne Planet oder über 1.000 Fläche, ein fehlender Name oder kein gewähltes Imperium.
- Eine Farm auf einem Planeten ohne Fruchtbarkeit bleibt aus ihrem Plan draußen, und ein Abbau ohne seine Ressource bekommt den Extraktor ohne Auftrag. Der Dialog sagt das.
- Mit Eigener Produktion sind Materialien, die deine Basen liefern, nicht in den neuen Plänen.

Die Seite bleibt bei der Kette und verlinkt die neuen Pläne und das Imperium. Diese Links bleiben im Tab Basen, bis sich die Kette ändert. Schlägt ein Plan fehl, bleiben die vorher erstellten Pläne erhalten und werden aufgelistet.

## Einkaufsliste {#buy-list}

Die Einkaufsliste zeigt, was die Kette über eine Anzahl Tage kauft (standardmäßig 10), nach Basis gruppiert, wenn es mehr als eine gibt. Jede Zeile hat die Einheiten (aufgerundet), das Gewicht und die Kosten. Ein Beispiel: In einer Kette mit einer Basis kommt ein Material, das zu 2,5 pro Tag gekauft wird, über 10 Tage auf 25 Einheiten, und bei 2,55 pro Tag auf 26. Die Liste zeigt außerdem die Summen, die einzufliegenden m³ und die ausgehenden Tonnen und m³ der Ziele.

**XIT-Kaufaktion kopieren** (oder „XIT-Aktion für … kopieren“ pro Basis) kopiert eine [[xit|XIT]]-Aktion, die die Liste im Lagerhaus des Marktplatzes kauft, nach dem die meisten ihrer Zeilen bepreist sind. Hat die Basis einen Planeten, bringt die Aktion die Waren auch dorthin.

Die Liste enthält nur die Auftrags-Inputs der Kette. Verbrauchsgüter der Belegschaft stehen nicht darauf, plane sie also in den Plänen, die die Kette erstellt.

## Teilen {#sharing}

Der Link enthält die ganze Kette: Ziele, Einstellungen, Quellen, Aufträge, Planeten, Basen, Vorhanden-Mengen und die CX. **Kettenlink kopieren** kopiert ihn. Öffnest du die Seite ohne Link, öffnet sich die letzte Kette wieder, an der du gearbeitet hast, in diesem Browser und pro Konto.

## Imperium prüfen {#check-an-empire}

Wechsle oben von **Kette planen** zu **Imperium prüfen**, um zu sehen, wie eines deiner Imperien herstellt, was es verkauft, und was es besser machen würde. Jeder Modus behält seinen eigenen Zustand, während du zwischen ihnen wechselst.

1. Wähle das **Imperium**. Es startet mit deinem Standard-Imperium.
2. Wähle die Ketten. Jedes Material, das das Imperium verkauft (von dem es mehr herstellt, als es verbraucht, mit einem CX-Verkaufspreis), ist eine Kette, angezeigt mit seiner Menge pro Tag. „+ Kette hinzufügen“ fügt eine hinzu, und „Alles, was das Imperium verkauft“ oder **Alles prüfen, was das Imperium verkauft** fügt alle hinzu. **Leeren** entfernt sie.

Hast du noch kein Imperium, sagt die Seite das und verweist dich auf Kette planen oder auf Verwalten.

Die Prüfung verfolgt jede Kette zurück durch deine Pläne: welche Basis jeden Schritt herstellt, mit welchem Auftrag und welcher Effizienz, und was gekauft wird. Sie ändert nie einen Plan, sie zeigt nur auf sie.

| Einstellung                                     | Standard                               |
| ----------------------------------------------- | -------------------------------------- |
| **Preise**                                      | die Marktplatz-Präferenz des Imperiums |
| **Ausstattungsgewinne**                         | **Anzeigen**                           |
| **Ignorieren unter**                            | 200 ȼ / Tag                            |
| **Verlegungen amortisieren sich innerhalb von** | 100 Tage                               |

Die Leiste oben zeigt den **Profit / Tag** des Imperiums wie geplant, den **Möglichen Gewinn / Tag**, **Geprüfte Basen**, wie viele **Wirken optimal**, **Verbesserungen**, **Plankorrekturen**, **Ausstattungsgewinne / Tag** und **Verlegungen**. Gewinne werden am Kettenstandard gemessen: beide Luxusgüter, die Experten, die am meisten bringen, und das aktive COGC des Planeten, zu deinen CX-Preisen, mit hergestellten Inputs zu den eigenen Kosten des Imperiums.

### Basen {#check-an-empire-bases}

Jede Basis bekommt eine Markierung: **Wirkt optimal**, hat Verbesserungen, **Plankorrektur** oder **Nicht in diesen Ketten**. Öffne eine Basis, um ihre **Produktion wie geplant** zu sehen, ihre Luxusgüter, Experten und ihr COGC unter **Plan** gegenüber dem **Kettenstandard**, und ihre **Befunde**. **Abdeckung** an der Seite zeigt, wie viele Basen die Ketten erreichen, und „… hinzufügen“ fügt hinzu, was die anderen Basen verkaufen.

### Befunde {#findings}

Jeder Befund zeigt seinen Gewinn pro Tag, die Baukosten und die Amortisation. Du kannst sie nach Art filtern:

- **Plankorrektur**: Der Plan rechnet mit einem COGC-Programm, das der Planet nicht betreibt, oder der Planet betreibt eines, mit dem der Plan nicht rechnet. Bei einem Werbeprogramm (Fachgebiet) stellen die Gebäude 20 % weniger her, als der Plan sagt, oder würden 25 % mehr herstellen. Bei einem Belegschaftsprogramm sind es 9 % weniger oder 10 % mehr.
- **Auftrag**: Ein anderer Auftrag desselben Gebäudes stellt das Material mindestens 3 % günstiger her.
- **Herstellen oder kaufen**: Ein Material, das kein Ziel ist, kostet in der Herstellung mehr als im Kauf.
- **Standort**: Ein anderer Planet passt durch sein COGC-Programm, seine Fruchtbarkeit oder seine Abbaurate mindestens 10 % besser zum Schritt, verglichen mit dem Programm, das der Planet tatsächlich betreibt. Die Option ist entweder eine deiner Basen (nur die verlegten Gebäude sind zu bauen, und sie braucht freie Fläche) oder eine neue Basis (Gebäude, Wohngebäude und Kernmodul). PRUNplanner schlägt die beste Option vor, die Platz hat, einen freien Bauplatz (oder Geisterplätze; unbekannte Bauplätze zählen als möglich) und sich innerhalb von **Verlegungen amortisieren sich innerhalb von** amortisiert. „Alle … Planeten…“ listet jede Option mit Filtern und Sortierung. **Verwenden** macht einen Planeten zu deiner Wahl, und **Zurück zum Vorschlag** macht das rückgängig.
- **Ausstattung**: beide Luxusgüter (nur wenn der zusätzliche Output mehr einbringt, als sie kosten) oder eine bessere Expertenverteilung. Experten kommen im Spiel mit der Zeit. Stell **Ausstattungsgewinne** auf **Ausblenden**, um diese wegzulassen.

Die Prüfung blendet Befunde unter **Ignorieren unter** aus, aber Plankorrekturen und deine gewählten Standorte erscheinen immer. Gewinne für einen Schritt sind Alternativen, der mögliche Gewinn einer Basis zählt also nur den besten pro Schritt. Ein Beispiel: Ein Auftrag-Befund über 300 ȼ / Tag und ein Standort-Befund über 500 ȼ / Tag für denselben Schritt zählen als 500 ȼ / Tag, nicht 800. **Im Planer ausprobieren** (bei Auftrag-, Herstellen-oder-kaufen- und Standort-Befunden) öffnet Kette planen mit den Basen der Kette und der angewendeten Änderung.

> [!tip]
> Erledige zuerst die Plankorrekturen. Sie kosten nichts zu bauen, und die Zahlen des Plans stimmen nicht, bis du sie behebst.

> [!warning]
> Ein Standort-Befund zählt einen vollen Planeten mit Geisterplätzen als möglich für eine neue Basis. Im Spiel lassen Geisterplätze nur neue Spieler, die auf diesem Planeten beginnen, dort siedeln.

### Ketten {#chains}

Jede Kette wird Material für Material aufgelistet: wie viel hergestellt wird (**Hergestellt / Tag**), wo (**Hergestellt in**), mit welchem Auftrag (**Auftrag wie geplant**), zu welchen Kosten gegenüber dem CX-Preis, und was der Kettenplaner tun würde (**Kettenplaner**).

### Teilen {#check-an-empire-sharing}

**Prüflink kopieren** kopiert das Imperium, die Ketten, die Einstellungen und deine gewählten Standorte, aber nicht die Preise. Wer ihn öffnet, sieht die eigene Marktplatz-Präferenz des Imperiums. Nur du kannst deine eigenen Imperien öffnen. Allen anderen sagt die Seite, dass das Imperium nicht ihres ist.
