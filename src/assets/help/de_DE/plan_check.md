Der Plan-Check testet einen Plan gegen den Markt, bevor du ihn baust. Er sagt dir, ob du diese Mengen wirklich kaufen und verkaufen kannst, an welchen Preisen der Profit hängt und wie der Plan im Vergleich zu deinen anderen Plänen abschneidet. Du findest ihn als Werkzeug-Tab der Produktion (siehe [Layout](/help/plan_layout#parts)), mit drei Ansichten, zwischen denen du neben seinem Titel wechselst: **Markt-Check** (der Standard), **Preissensitivität** und **Pläne vergleichen**. **Pläne vergleichen** erscheint nur, wenn du angemeldet bist.

Die Ansicht und die gewählte Preisänderung bleiben für diesen Browser-Tab erhalten, auch wenn du den Plan wechselst oder das Werkzeug schließt und wieder öffnest. Ein Klick auf eine Markierung in [[material-io|Material I/O]] öffnet ein Popover, und dessen **Plan-Check öffnen →** öffnet den Plan-Check im Markt-Check.

## Markt-Check {#market-check}

Der [[profit|Profit]] eines Plans setzt voraus, dass du jedes Material zu seinem Preis in jeder Menge kaufen und verkaufen kannst. Der Markt-Check zeigt, wo das nicht stimmt. Er listet jedes Material, das der Plan pro Tag kauft oder verkauft, das schlimmste zuerst: rot, dann gelb, dann graue Hinweise, und innerhalb jeder Stufe nach Anteil.

Ein Plan, der noch nichts kauft oder verkauft, zeigt statt der Tabelle „Dieser Plan kauft oder verkauft noch nichts.“. Füge zuerst in der [Produktion](/help/plan_production) Gebäude und Aufträge hinzu, dann füllt sich der Check.

| Spalte                              | Was sie zeigt                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**, **Seite**             | Das Material und ob der Plan es kauft oder verkauft.                                                                                                                             |
| **Pro Tag**                         | Wie viel der Plan pro Tag kauft oder verkauft.                                                                                                                                   |
| **Anteil am Tagesvolumen, 30 Tage** | Die Tagesmenge des Plans ÷ das durchschnittliche Tagesvolumen, das in den letzten 30 Tagen auf dem Marktplatz gehandelt wurde. Markierungen auf dem Balken zeigen 10 % und 50 %. |
| **Gehandelt 30T**                   | Auf dem Marktplatz in den letzten 30 Tagen gehandelte Einheiten.                                                                                                                 |
| **Bid · Ask ȼ**, **Spread**         | Der beste [[bid\|Bid]] und [[ask\|Ask]] gerade jetzt und der [[spread\|Spread]] dazwischen in % des Ask.                                                                         |
| **Check**                           | Die erste Markierung des Materials, oder **ok**.                                                                                                                                 |

- Beim [[share-of-volume|Anteil am Tagesvolumen]] sind 50 Einheiten pro Tag, verkauft in einen Markt, der 100 pro Tag handelt, ein Anteil von 50 %.
- Wenn du sofort kaufst, zahlst du den Ask. Wenn du sofort verkaufst, nimmst du den Bid.
- PRUNplanner prüft jedes Material auf dem Marktplatz, den deine [[exchange-preference|Marktplatz-Präferenz]] für seinen Kauf oder Verkauf nutzt, und die Beschriftung nennt diese Marktplätze (zum Beispiel „Marktplätze AI1, NC1“). Ohne Marktplatz-Präferenz nutzt der Check das Volumen aller Marktplätze zusammen. Die Beschriftung sagt dann „keine CX-Präferenz festgelegt“ und verlinkt bei deinem eigenen Plan dorthin, wo du eine festlegst.
- Mit einer Marktplatz-Präferenz nennt eine markierte Zeile die Preisregel, die sie nutzt. Bei deinem eigenen Plan ist das ein Link zur Regel in Marktplätze (siehe [Marktplätze](/help/exchanges#how-a-price-is-found)).
- **Was das bedeutet** fasst das schlimmste Material in einem Satz zusammen. Es zählt außerdem die Materialien unter **Handel wie geplant nicht möglich**, **Großer Marktanteil** und **Passt**. Sein Button öffnet diese Seite. Ist nichts rot oder gelb, steht dort „Jedes Material passt zu seinem Markt.“ Ein Material mit nur einem grauen Hinweis zählt hier als **Passt**, weil graue Hinweise die Daten betreffen, die der Check genutzt hat, nicht deine Mengen.
- Auf dem Handy wird die Tabelle zu Karten: die ersten 6 und jede markierte, dann „+ n weitere Materialien, alles ok“.

### Zu echten Preisen {#real-prices}

**Zu echten Preisen** berechnet den Plan neu, als ob du, was er kauft, zum Ask kaufst und, was er verkauft, zum Bid verkaufst, jeweils auf seinem Marktplatz. Es zeigt **Plan-Profit**, **Kauf zum Ask, Verkauf zum Bid**, die **Differenz** und den **ROI bei Ask / Bid**.

Es braucht eine Marktplatz-Präferenz. Ohne eine wird es nicht berechnet und sagt „Lege eine CX-Präferenz fest, um den Plan zu echten Ask- und Bid-Preisen zu sehen.“

Ein Material behält in drei Fällen seinen Planpreis: Niemand bietet es gerade an oder fragt es nach, für es ist kein Marktplatz festgelegt, oder es ist zum [[universe|Universe]]-Durchschnitt bepreist, der keinen Ask oder Bid hat. Der Abschnitt listet diese Materialien. Ein Material mit einem [[fixed-price|Festpreis]] in deiner Marktplatz-Präferenz bekommt hier dagegen den Ask oder Bid.

Hier ein Beispiel mit ausgedachten Zahlen. Angenommen, der Plan verkauft 100 Einheiten pro Tag zu einem Planpreis von 50 ȼ, und der beste Bid liegt gerade bei 45 ȼ. Zum Bid zu verkaufen bringt 100 × 5 = 500 ȼ pro Tag weniger ein. Ist das der einzige Preis, der sich ändert, ist die **Differenz** −500 ȼ pro Tag.

> [!tip]
> Die Preise des Plans kommen meist aus Durchschnitten wie dem [[vwap|VWAP]]. Zu echten Preisen zeigt deinen Profit, wenn du sofort handelst, statt zu warten, bis deine Orders ausgeführt werden. Eine große Differenz heißt, dass der Profit des Plans von geduldigem Handeln abhängt.

## Was die Markierungen bedeuten {#flags}

Die Schwellen der Markierungen sind fest:

| Markierung                         | Stufe          | Wann                                                                                                          |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| _Kein Preis_                       | rot            | Der Plan hat keinen Preis für das Material und rechnet es mit 0 ȼ.                                            |
| _Keine Transaktionen in 7 Tagen_   | rot            | Niemand hat es in den letzten 7 Tagen auf dem Marktplatz gehandelt, oder der Marktplatz hat keine Daten dazu. |
| _Keine Angebote_                   | rot            | Du kaufst es, und gerade verkauft es niemand auf dem Marktplatz.                                              |
| _Keine Käufer_                     | rot            | Du verkaufst es, und gerade bietet niemand auf dem Marktplatz dafür.                                          |
| _Größer als der Markt_             | rot            | Der Plan handelt 50 % oder mehr des Tagesvolumens.                                                            |
| _Großer Marktanteil_               | gelb           | Der Plan handelt 10 % oder mehr des Tagesvolumens. Deine Orders werden den Preis wahrscheinlich bewegen.      |
| _Alle Marktplätze, keiner gewählt_ | grauer Hinweis | Keine Marktplatz-Präferenz, also werden alle Marktplätze gezählt. Wird einmal über der Tabelle angezeigt.     |
| _Daten älter als 2 Tage_           | grauer Hinweis | Die neuesten Daten des Marktplatzes sind älter als 2 Tage.                                                    |

Rot ist ein gefüllter Kreis (_Handel wie geplant nicht möglich_), gelb ein Dreieck, grau ein Ring. _Keine Angebote_ und _Keine Käufer_ brauchen einen echten Marktplatz, sie erscheinen also nie, wenn alle Marktplätze gezählt werden. Spreads erscheinen in der Tabelle, bekommen aber nie eine Markierung.

Volumen, Bid und Ask kommen aus den Marktplatzdaten, die PRUNplanner von [[fio|FIO]] lädt. Sie sind höchstens etwa 35 Minuten alt: PRUNplanner aktualisiert sie etwa alle 30 Minuten, und der Server kann eine bis zu 5 Minuten alte Kopie ausliefern.

Du kannst die Anteile auch beobachten, während du Anzahlen und Aufträge änderst. Stell den Wert von Material I/O von ȼ auf %, dann zeigt es das Δ jedes Materials als Anteil am durchschnittlichen Tagesvolumen der letzten 7 und 30 Tage (**Anteil 7T**, **Anteil 30T**), gelb ab 10 % und rot ab 50 %. Bei **Ganze Basis** zeigt Material I/O auch die Markierungssymbole, und seine Zusammenfassung („2 Materialien können nicht wie geplant gehandelt werden, …“) verlinkt auf **Plan-Check →**. Der Tab Plan-Check trägt einen Punkt, solange der Plan Marktmarkierungen hat.

> [!tip]
> Eine rote oder gelbe Markierung bei einem Output heißt nicht, dass der Plan schlecht ist. Sie heißt, dass du mehr verkaufst, als der Markt aufnimmt. Weniger Gebäude, ein zweiter Output oder ein anderer Marktplatz können das beheben: Probier sie aus und sieh zu, wie der Anteil sinkt.

## Was das CX-Volumen nicht erfasst {#cx-volume}

Das Volumen kommt nur von den Rohstoffbörsen ([[cx|CX]]). PRUNplanner zählt keine Verkäufe auf lokalen Märkten, Verträge zwischen Spielern oder Handel innerhalb einer Corporation, ein Material kann sich also leichter verkaufen lassen, als sein CX-Volumen sagt.

## Imperium {#empire}

Das Material I/O des [[empire|Imperiums]] führt denselben Check für den Nettofluss des Imperiums aus. Was ein Plan herstellt und ein anderer verbraucht, gleicht sich aus, und nur der Rest erreicht den Markt. Das eigene Material I/O jedes Plans markiert weiterhin seine eigenen Mengen.

Chips über der Tabelle zählen die markierten Materialien nach Stufe, etwa „3 kann nicht wie geplant gehandelt werden“, „2 großer Marktanteil“ und „1 andere Notiz“. Klick auf einen, um nur die Materialien dieser Stufe zu sehen, und klick noch einmal, um wieder alle zu sehen. Mehr in [Imperium](/help/empire).

## Preissensitivität {#sensitivity}

Die Preissensitivität zeigt, an welchen Preisen der Profit hängt. Wähle bei **Jeden Preis ändern um** ±10 %, ±20 % (der Standard), ±30 % oder ±50 %.

Jedes Material, das der Plan kauft oder verkauft, bekommt eine Zeile, solange sein Preis den Profit bewegt. PRUNplanner berechnet den Plan einmal pro Material mit verdoppeltem Preis neu, und die Änderung des Profits ist die Wirkung des Materials. Ist ein Material auch ein Baumaterial, bewegt es auch die Kosten der [[degradation|Abnutzung]], und das zählt in seiner Zeile mit. [[production-fees|Produktionsgebühren]] hängen nicht von Preisen ab. Der Profit ändert sich mit jedem einzelnen Preis linear, diese eine Neuberechnung ergibt also die Wirkung jedes Prozentsatzes, den du in **Jeden Preis ändern um** wählst.

Solange der Plan nichts kauft oder verkauft, dessen Preis den Profit bewegt, sagt die Ansicht „Füge Produktion hinzu, um zu sehen, von welchen Preisen dieser Plan abhängt.“

| Spalte                               | Was sie zeigt                                                                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**, **Seite**              | Das Material und **kaufen** oder **verkaufen**.                                                                                                                                                                         |
| **Profit sinkt ← · → Profit steigt** | Ein Balken für die Änderung des Profits, wenn sich dieser eine Preis um den gewählten Prozentsatz bewegt und alles andere gleich bleibt. Fahr mit der Maus darüber für den Wert pro Tag und den Profit an beiden Enden. |
| **Profit-Spanne ȼ/Tag**              | Profit mit dem Preis um den gewählten Prozentsatz gesenkt und erhöht.                                                                                                                                                   |
| **Gewinnschwelle**                   | Die Preisänderung, bei der der Profit des Plans 0 erreicht.                                                                                                                                                             |

PRUNplanner sortiert die Zeilen nach Wirkung, und die Mittellinie der Balken ist der heutige Profit. Es zeigt die obersten 10 und fasst den Rest in einer Zeile zusammen, „+ n weitere Materialien … verändern den Profit um weniger als ±…“, mit einem Button **Zeige alle ({n})**, um sie aufzulisten.

Die **Gewinnschwelle** wird innerhalb von ±60 % rot und innerhalb von ±200 % gelb. Sie zeigt **nie**, wenn der Preis unter 0 fallen müsste. Sie zeigt **> +500 %**, wenn der Preis um mehr als 500 % steigen müsste. Keine Sorge wegen **nie** bei einem Material, das du verkaufst, während der Plan Profit macht: Es heißt, dass der Plan profitabel bleibt, selbst wenn dieser Preis auf 0 fällt.

So passen die Zahlen zusammen, mit ausgedachten Zahlen. Ein Plan macht 2.000 ȼ pro Tag, und sein Haupt-Output, den er nur verkauft und nicht zum Bauen nutzt, bringt 8.000 ȼ pro Tag ein. Diesen Preis zu verdoppeln bringt 8.000 ȼ pro Tag mehr. Bei ±20 % ist die **Profit-Spanne ȼ/Tag** des Outputs 2.000 − 1.600 = 400 bis 2.000 + 1.600 = 3.600. Seine **Gewinnschwelle** ist −2.000 ÷ 8.000 = −25 %: Fällt dieser Preis um ein Viertel, verdient der Plan nichts. Sie erscheint rot, weil −25 % innerhalb von ±60 % liegt.

### Was das bedeutet {#sensitivity-means}

**Was das bedeutet** wählt das empfindlichste Material und sagt dir:

- den Profit nach einer Bewegung um den gewählten Prozentsatz in die Richtung, die schadet, und die Preisänderung bis zur Gewinnschwelle (oder dass der Plan selbst bei einem Preis von 0 profitabel bleibt, oder dass keine Änderung dieses Preises allein ihn zur Gewinnschwelle bringt);
- „Profit bei …“ und „ROI bei …“: den Profit und den ROI nach dieser Bewegung;
- **Alle Kosten +{pct} %**: den Profit, wenn alle Kosten um den gewählten Prozentsatz steigen, gezählt werden gekaufte Materialien, Abnutzung und Produktionsgebühren;
- **Am empfindlichsten**: die 3 obersten Materialien;
- woher die Preise kommen: aus der Marktplatz-Präferenz des Plans oder, wenn er keine hat, aus dem Universe-30-Tage-Durchschnitt.

> [!tip]
> Eine Gewinnschwelle nahe 0 % bei deinem Haupt-Output heißt, dass ein kleiner Preisrückgang den Profit auslöscht. Prüf dieses Material vor dem Bau in der [Marktforschung](/market-exploration) und leg in deiner Marktplatz-Präferenz einen Preis fest, dem du vertraust.

### Zielpreis {#target-price}

**Zielpreis** findet den Preis eines Materials, der den gewünschten Profit ergibt, bei unveränderten anderen Preisen.

- **Material** listet die Materialien aus der Tabelle und startet mit dem verkauften Material mit der größten Wirkung.
- **Ziel-Profit, ȼ/Tag** startet beim heutigen Profit, aufgerundet auf die nächsten 10.000.
- Die Antwort lautet „{ticker} muss verkauft werden zu“ oder „{ticker} muss gekauft werden zu“ einem Preis. Kann kein Preis über 0 das Ziel erreichen, sagt sie, dass du diesen Profit nicht durch Ändern dieses Preises erreichen kannst.
- **Planpreis heute** sowie Bid und Ask des Marktplatzes gerade jetzt stehen zum Vergleich da.
- Sobald du das Material oder das Ziel änderst, siehst du auch den niedrigsten und höchsten Preis des Marktplatzes in den 30 Tagen bis zu seinem letzten Handelstag. Er nutzt die Tagestiefs und -hochs der Tage mit Handel, und bei allen Marktplätzen deckt er alle vier ab. Ein Hinweis warnt dich, wenn der nötige Preis über oder unter allem liegt, was in diesen 30 Tagen bezahlt wurde.

## Pläne vergleichen {#compare}

**Pläne vergleichen** stellt diesen Plan neben einen anderen deiner Pläne. Dafür musst du angemeldet sein.

**Vergleichen mit** listet deine anderen Pläne, **Dieser Planet** zuerst, dann **Andere Planeten**. Es startet mit dem ersten Plan dieser Liste und merkt sich deine Wahl für diesen Plan, solange der Tab offen ist. Hast du noch keinen anderen Plan, sagt es „Du hast noch keinen anderen Plan zum Vergleichen.“

PRUNplanner nimmt diesen Plan so, wie er auf dem Bildschirm ist, ungespeicherte Änderungen eingeschlossen. Den anderen Plan berechnet es wie gespeichert, mit seinem eigenen Imperium, und bepreist ihn mit der Marktplatz-Präferenz dieses Imperiums (oder dem Universe-30-Tage-Durchschnitt). Eine Zeile neben **Vergleichen mit** sagt, welche.

Die Zahlen der beiden Pläne stehen nebeneinander, jede mit einem Balken:

| Zahl                           | Was sie ist                                         |
| ------------------------------ | --------------------------------------------------- |
| **Täglicher Profit**           | Profit pro Tag.                                     |
| **Output-Wert**                | Was der Plan pro Tag verkauft.                      |
| **Tägliche Kosten**            | Was der Plan pro Tag kauft.                         |
| **Abnutzung**                  | 1/180 der Baukosten der Produktionsgebäude pro Tag. |
| **Produktionsgebühren**        | Gebühren pro Tag.                                   |
| **Plankosten**                 | Die Baukosten.                                      |
| **ROI**                        | Tage, bis die Baukosten zurückgezahlt sind.         |
| **Amortisation der Differenz** | Siehe [unten](#payback-difference).                 |
| **Profit / Fläche**            | Profit pro Fläche.                                  |
| **Genutzte Fläche**            | Fläche, die der Plan nutzt.                         |

**Differenz** ist der andere Plan minus dieser. Sie ist grün oder rot, je nachdem, was für dich besser ist: mehr Profit und Output, niedrigere Kosten und ein kürzerer ROI zählen als gut, Fläche ist neutral.

**Fazit** fasst es in einem Satz zusammen. Es sagt, wie viel mehr oder weniger dieser Plan pro Tag verdient, wie viele Tage früher oder später er sich amortisiert, den größten Gewinn des anderen Plans und seine zwei größten Kosten nach Material, und ob sich seine zusätzlichen Baukosten amortisieren.

**Was sich ändert** listet die ȼ / Tag pro Material, der andere Plan minus dieser, die größten zuerst. Würde der andere Plan ein Material in eine schlechtere Marktmarkierung handeln, ist dieses Material mit seinem Anteil markiert.

Das Glossar erklärt mehr zu [[roi|ROI]] und [[payback|Amortisation]].

> [!tip]
> Speichere eine Kopie deines Plans, ändere in der Kopie eine Sache (einen Auftrag, eine Gebäudeanzahl, den Planeten) und vergleiche dann die beiden. Fazit und Was sich ändert zeigen genau, was die Änderung wert ist.

### Amortisation der Differenz {#payback-difference}

Das sind die zusätzlichen Baukosten des anderen Plans geteilt durch seinen zusätzlichen Profit pro Tag, in Tagen: „{cost} ȼ mehr Baukosten ÷ {profit} ȼ/Tag mehr Profit“. **nie** heißt, dass er mehr kostet und nicht mehr einbringt. Kostet der andere Plan nicht mehr, siehst du „–“.

Ein Beispiel (ausgedachte Zahlen): Kostet der andere Plan 200.000 ȼ mehr und bringt 2.000 ȼ pro Tag mehr ein, amortisieren sich seine zusätzlichen Baukosten in 200.000 ÷ 2.000 = 100 Tagen.
