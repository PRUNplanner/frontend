Auf der Seite [Marktplätze](/exchanges) legst du fest, welche Preise deine Pläne verwenden. Setz einen Heimat-Marktplatz, wähl eine Preisbasis, füg Festpreise für Materialien hinzu, die du selbst herstellst, und mach Ausnahmen für einzelne Planeten. Jede Zahl zu Profit, Kosten und ROI in PRUNplanner hängt von diesen Preisen ab.

Komm hierher, wenn du wissen willst, woher ein Preis in deinen Plänen kommt, oder wenn du ihn ändern willst. Die [Übersicht](#overview) zeigt jeden Preis, den deine Pläne verwenden, und die Regel dahinter, und nichts, was du änderst, erreicht deine Pläne, bevor du speicherst.

## Marktplatz-Präferenzen {#exchange-preferences}

Eine [[exchange-preference|Marktplatz-Präferenz]] legt die Preise fest, die deine Pläne verwenden. Sie wählt den [[cx|Marktplatz]] und die Preisbasis und enthält [[fixed-price|Festpreise]] für Materialien, die du zu deinen eigenen Kosten oder von einem Partner bekommst.

- Eine Präferenz gehört zu deinem Konto. Du weist sie in der [Verwaltung](/manage) einem [[empire|Imperium]] zu, in der CX-Spalte der **Imperium-Konfiguration**. Ein Imperium hat eine Präferenz, und eine Präferenz kann mehreren Imperien dienen.
- Ein [[plan|Plan]] hat keine eigene Präferenz. Er nutzt die Präferenz des Imperiums, in dem er geöffnet ist, also kann ein Plan, der in zwei Imperien ist, in jedem andere Preise zeigen.
- Ein Imperium ohne Präferenz („Keine“) bewertet alles mit **Universe · VWAP 30D**.
- Jedes neue Konto beginnt mit „My Exchange Preference“, eingestellt auf Universe · VWAP 30D für Kauf und Verkauf und „My Empire“ zugewiesen.

Präferenzen erstellst, benennst und löschst du in der [Verwaltung](/help/management#cx). Diese Seite bearbeitet die Regeln jeweils einer Präferenz, die du unter **Präferenz wechseln** auswählst. Unter der Auswahl siehst du, welche Imperien sie nutzen oder dass keins sie nutzt.

## Die Regelliste {#rules-list}

Die Spalte links listet die Teile der Präferenz auf, die du öffnen kannst. Auf Bildschirmen schmaler als 1024 px ist sie stattdessen eine Auswahlliste.

| Eintrag                          | Was er zeigt                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Übersicht**                    | Jeden Preis, den deine Pläne verwenden, siehe [Übersicht](#overview)                                                                                                               |
| **Alle Planeten**                | Deinen Heimat-Marktplatz und Festpreise für jeden Planeten                                                                                                                         |
| **Planeten mit eigenen Regeln**  | Planeten mit einer [Ausnahme](#planet-exceptions)                                                                                                                                  |
| **Mit Regeln für alle Planeten** | Planeten der Imperien, die diese Präferenz nutzen und den Regeln für alle Planeten folgen (nach Imperium gruppiert, wenn mehrere Imperien die Präferenz nutzen) |
| **Planeten anderer Imperien**    | Planeten von Imperien, die diese Präferenz nicht nutzen, angezeigt, nachdem du den Button zum Anzeigen gedrückt hast                                                               |
| **In keinem Plan**               | Planeten mit gespeicherten Regeln, die keiner deiner Pläne nutzt                                                                                                                   |

**Alle Planeten** und jeder Planet mit gespeicherten Regeln zeigen, wie viele Regeln sie haben, und die Zahl wird bernsteinfarben, wenn der Eintrag einen Warnhinweis hat. Ab 10 Planeten erscheint ein Feld **Planeten filtern**.

## Übersicht {#overview}

Die Seite öffnet sich mit der **Übersicht**. Sie listet jedes Material, das die Pläne der Imperien mit dieser Präferenz kaufen oder verkaufen, den Preis, den es bekommt, und die Regel dahinter. Solange Planeten anderer Imperien angezeigt werden, zählen deren Pläne mit. Ungespeicherte Änderungen sind eingeschlossen, du siehst also die Wirkung einer Änderung, bevor du speicherst. Materialien, die ein Plan weder kauft noch verkauft (netto 0), fehlen.

- Die Zusammenfassung oben zeigt die Regel für **Alle Planeten**, wie viele Planeten eigene Regeln haben und wie viele Festpreise es gibt.
- **Material suchen** und **Materialien anzeigen** (**Alle**, **Festpreis**, **Kein Preis (0 ȼ)**, **Je nach Planet**) grenzen die Tabelle ein.
- Die Tabelle listet **Material**, **Kauf ȼ**, **Verkauf ȼ** und **Genutzt auf** (die ersten drei Planeten, den Rest als „+n“). Bekommen Planeten unterschiedliche Preise, siehst du die Spanne und ein Tag „je nach Planet“. Auf Bildschirmen schmaler als 1024 px zeigt die Tabelle jeweils eine Seite, zuerst die Kaufpreise, mit einem Schalter für die Verkaufsseite, und lässt **Genutzt auf** weg.
- Ein Tag zeigt, woher jeder Preis kommt, zum Beispiel „NC1 · VWAP 30D“, **Festpreis · alle Planeten**, **Festpreis · dieser Planet** oder **Keine Preisdaten**. Preise von 0 ȼ ohne Festpreis sind bernsteinfarben.
- Klapp eine Zeile auf, um die ganze Stufenleiter zu sehen, [wie der Preis gefunden wird](#how-a-price-is-found), für jede Seite und jeden Planeten. **Regel öffnen** springt zu der Regel, die ihn gesetzt hat.

Während PRUNplanner deine Pläne berechnet, zeigt die Tabelle **Berechne deine Pläne…** mit einem Fortschrittsbalken.

### Hinweise {#notes}

Hinweise über der Tabelle zeigen auf Regeln, die du dir ansehen solltest. Warnungen kommen zuerst, und **Öffnen** bringt dich zur Regel.

| Hinweis                                                                    | Art     | Was zu tun ist                                                                                                                                    |
| -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eine Regel hat für manche Materialien keinen Kauf- oder Verkaufspreis      | Warnung | Diese Materialien zählen als 0 ȼ. Setz einen Festpreis oder wähl einen anderen Marktplatz oder eine andere Basis. |
| Ein Material hat auf keinem Marktplatz einen Preis                         | Warnung | Es zählt als 0 ȼ. Setz einen Festpreis, wenn du einen kennst.                                                     |
| Ein Material ist auf 0 ȼ festgelegt                                        | Info    | In Ordnung, wenn es deine eigene Versorgung ist und dich nichts kostet.                                                           |
| Feste Kaufpreise weichen von ihrem COGM ab                                 | Info    | Nur in der Übersicht. Siehe [Festpreise und COGM](#fixed-prices-and-cogm).                                        |
| Die Marktplatz-Regel eines Planeten ist dieselbe wie die für alle Planeten | Info    | Du kannst sie entfernen.                                                                                                          |
| **Kein Imperium nutzt diese Präferenz**                                    | Info    | Weise sie in der Verwaltung zu.                                                                                                   |
| Regeln für Planeten in keinem Plan                                         | Info    | Lösch sie unter **In keinem Plan**, wenn du sie nicht brauchst.                                                                   |

## Wie ein Preis gefunden wird {#how-a-price-is-found}

Für jedes Material sucht PRUNplanner einen Kaufpreis (für das, was ein Plan verbraucht) und einen Verkaufspreis (für das, was er produziert). Es prüft diese Stufen der Reihe nach und nimmt die erste Regel, die passt:

1. **Festpreis des Planeten**: ein Festpreis, der auf diesem Planeten gesetzt ist
2. **Festpreis für alle Planeten**
3. **Marktplatz des Planeten**: die Marktplatz-Regel, die auf diesem Planeten gesetzt ist
4. **Marktplatz für alle Planeten**
5. **Universe · VWAP 30D**, wenn keine Regel darüber passt

Ein Festpreis für alle Planeten gewinnt also gegen die Marktplatz-Regel eines Planeten.

Ein Beispiel: **Alle Planeten** hat NC1 · VWAP 30D für Kauf und Verkauf und einen festen Kaufpreis von 45 ȼ für RAT. Ein Planet hat seine eigene Marktplatz-Regel, CI1 · Ask, nur für den Kauf. Auf diesem Planeten gilt:

- Der Kauf von RAT bekommt 45 ȼ: Der Planet hat keinen eigenen Festpreis, also passt zuerst der Festpreis für alle Planeten (Stufe 2).
- Der Kauf von H2O bekommt den Ask von CI1: Kein Festpreis passt, also passt die Marktplatz-Regel des Planeten (Stufe 3).
- Der Verkauf von RAT bekommt den VWAP 30D von NC1: Es gibt keinen festen Verkaufspreis, und die Regel des Planeten gilt nur für den Kauf, also passt der Marktplatz für alle Planeten (Stufe 4).

### Kauf, Verkauf oder beides {#buy-sell-or-both}

Eine Regel kann für den Kauf, den Verkauf oder beides gelten. Hat eine Stufe keine Regel für die Seite, die ein Plan braucht, überspringt PRUNplanner diese Stufe und prüft die nächste, bis hinunter zu Universe · VWAP 30D. Das passiert zum Beispiel, wenn eine Stufe nur eine Kaufregel hat und der Plan das Material verkauft.

### Marktplätze ohne Preis {#exchanges-without-a-price}

Wenn eine Marktplatz-Regel passt, ihr Marktplatz aber keinen Preis für ein Material hat, ist der Preis 0 ȼ. Er fällt nicht zur nächsten Stufe durch. Das passiert beim Ask, wenn niemand das Material anbietet, beim Bid, wenn niemand es haben will, und beim VWAP, wenn es auf dem Marktplatz in den letzten 30 Tagen keinen Handel gab. Ein Material ganz ohne Marktdaten zeigt **Keine Preisdaten** und zählt ebenfalls als 0 ȼ.

Ein Preis von 0 ȼ ändert die Zahlen deines Plans: Ein Material, das er zu 0 ȼ kauft, kostet nichts, und eins, das er zu 0 ȼ verkauft, bringt nichts ein. Der Profit eines Plans kann also besser oder schlechter aussehen, als er am Markt wäre.

Die Seite zeigt diese Preise bernsteinfarben und listet sie in den [Hinweisen](#notes) auf, damit du einen Festpreis setzen oder einen anderen Marktplatz oder eine andere Basis wählen kannst.

## Preisbasis: VWAP, Ask und Bid {#price-basis-vwap-ask-and-bid}

| Basis             | Was sie ist                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VWAP 7D, VWAP 30D | Der [[vwap\|volumengewichtete Durchschnittspreis]] der letzten 7 oder 30 Tage. Handel mit mehr Volumen zählt stärker, ein einzelner Ausreißer bewegt ihn also kaum. |
| Ask               | Das günstigste Angebot im Orderbuch gerade jetzt: was du zahlst, wenn du sofort kaufst.                                                                                                                                                                                     |
| Bid               | Die höchste Kauforder im Orderbuch gerade jetzt: was du bekommst, wenn du sofort verkaufst.                                                                                                                                                                                 |

[[ask|Ask]] und [[bid|Bid]] kommen aus dem Live-Orderbuch, sie können sich also jederzeit ändern und bei wenig gehandelten Materialien fehlen. Gab es auf einem Marktplatz in den letzten 7 Tagen keinen Handel, nutzt VWAP 7D den Preis des letzten Handelstags. Beide VWAPs sind nur dann 0, wenn es in den letzten 30 Tagen gar keinen Handel gab.

Ein VWAP-Beispiel mit ausgedachten Zahlen: An einem Tag werden 100 Einheiten für insgesamt 5.000 ȼ gehandelt (50 ȼ pro Stück), an einem anderen 10 Einheiten für 1.000 ȼ (100 ȼ pro Stück). Der VWAP ist Credits ÷ Einheiten, (5.000 + 1.000) ÷ (100 + 10) ≈ 54,55 ȼ. Ein einfacher Durchschnitt der beiden Preise wäre 75 ȼ, der kleine, teurere Tag bewegt den VWAP also viel weniger.

Was die Basis mit deinen Plänen macht: Der VWAP ist ein Preis für beide Seiten, also bekommt ein Material mit derselben VWAP-Regel für Kauf und Verkauf denselben Kauf- und Verkaufspreis. Mit Ask für den Kauf und Bid für den Verkauf kauft ein Plan zum günstigsten Angebot und verkauft an die höchste Kauforder, und die Lücke zwischen beiden, der [[spread|Spread]], zeigt sich in seinem Profit.

[[universe|Universe]] fasst alle vier Marktplätze zusammen und hat nur VWAP-Preise. PRUNplanner aktualisiert die Marktplatzpreise etwa alle 30 Minuten.

## Eine Marktplatz-Regel setzen {#exchange-rule}

Das Feld **Marktplatzpreis** bei **Alle Planeten** und bei jedem Planeten setzt die Marktplatz-Regel. Dann wählst du eins davon:

- **Gleich für Kauf und Verkauf**: ein Marktplatz und eine Basis für beide Seiten.
- **Kauf und Verkauf getrennt**: ein eigener Marktplatz und eine eigene Basis pro Seite. Eine Seite kann **Nicht gesetzt** bleiben und fällt dann zur nächsten Stufe durch.
- **Regel für alle Planeten nutzen** (nur Planeten): Der Planet folgt der Regel für alle Planeten, angezeigt als „Nutzt die Regel für alle Planeten: …“.

Für jede Seite wählst du **Marktplatz für {side}** (AI1, CI1, IC1, NC1 oder Universe) und **Preisbasis für {side}** (VWAP 7D, VWAP 30D, Ask, Bid). Universe bietet nur die beiden VWAPs. Wenn du einen Planeten von der Regel für alle Planeten auf eine eigene umstellst, beginnt er mit der geerbten Wahl.

## Voreinstellungen {#presets}

Zwei Voreinstellungen füllen die Regel mit einem Klick aus:

- **Durchschnitt · VWAP 30D** nutzt den VWAP 30D des Marktplatzes für Kauf und Verkauf.
- **Sofort handeln · Kauf zum Ask, Verkauf zum Bid** kauft zum Ask des Marktplatzes und verkauft zu seinem Bid. Für Universe gibt es sie nicht, weil Universe kein Orderbuch hat.

Voreinstellungen wirken auf den Marktplatz der Regel, die du bearbeitest, sonst auf den Marktplatz für alle Planeten, sonst auf NC1. Das Feld sagt dir, welcher es ist („Voreinstellungen für NC1:“).

## Festpreise und COGM {#fixed-prices-and-cogm}

Festpreise passen für Materialien, die du selbst herstellst und zum Selbstkostenpreis nutzt, oder für Preise, die du mit einer Corporation oder einem Partner vereinbart hast. Füg einen mit **Material hinzufügen** hinzu und tipp dann einen Kaufpreis, einen Verkaufspreis oder beide ein. Lass eine Seite leer, um dafür den Marktplatz-Preis zu verwenden.

Die Tabelle **Festpreise** zeigt:

| Spalte                    | Bedeutung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kauf ȼ**, **Verkauf ȼ** | Deine Festpreise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Markt**                 | Der Preis, den das Material ohne den Festpreis bekäme (Kaufseite, außer nur der Verkauf ist festgelegt), mit der Abweichung in %                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **COGM in deinen Plänen** | Nur bei Alle Planeten. Für Materialien, die deine Pläne herstellen, der niedrigste [[cogm\|COGM]] (Herstellungskosten) unter den Plänen der Imperien, die diese Präferenz nutzen, und in wie vielen Plänen es hergestellt wird. „aktiv“ markiert einen Kaufpreis, der ihm entspricht, sonst setzt **Nutzen** den Kaufpreis auf diesen COGM (auf 2 Nachkommastellen gerundet). |
| Letzte Spalte             | Der Button × entfernt die Zeile. Auf einem Planeten kopiert **Überschreiben** einen Preis für alle Planeten in einen eigenen Festpreis                                                                                                                                                                                                                                                                                                                                                                                                                      |

Ab 10 Zeilen kannst du die Tabelle nach **Material** oder **% ggü. Markt** durchsuchen und sortieren.

Im COGM-Werkzeug eines Plans setzt **Als Kaufpreis auf allen Planeten verwenden** einen festen Kaufpreis für alle Planeten auf den COGM _dieses Plans_, nicht auf den niedrigsten. Siehe [Plan-Werkzeuge](/help/plan_tools#cogm-buy-price).

Die Übersicht zeigt einen Hinweis, wenn ein fester Kaufpreis für alle Planeten mehr als 2 % vom niedrigsten COGM abweicht. Ihre Tabelle hat pro Material einen Button **COGM nutzen**. Zum Beispiel ist bei einem festen Kaufpreis von 45 ȼ und einem niedrigsten COGM von 40 ȼ die Abweichung (45 − 40) ÷ 40 = 12,5 %, der Hinweis erscheint also. Bei 40,50 ȼ sind es 1,25 %, und es gibt keinen Hinweis. Mach dir wegen dieses Hinweises keine Sorgen: Er dient nur zur Information, und der Festpreis funktioniert weiter wie bisher.

> [!tip]
> Ein fester Kaufpreis zu deinem eigenen COGM sorgt dafür, dass die Pläne, die das Material nutzen, den Profit der ganzen Kette in dem Plan zeigen, der das Endprodukt verkauft. Halt ihn mit dem COGM im Gleichschritt, wenn sich deine Produktion ändert.

## Ausnahmen für Planeten {#planet-exceptions}

Die meisten Spieler nutzen einen Heimat-Marktplatz für alle Planeten. Braucht ein Planet etwas anderes, öffne ihn in der Liste und setz seine eigene Marktplatz-Regel oder eigene Festpreise. Auf diesem Planeten gewinnen seine Regeln gegen die Regeln für alle Planeten, außer gegen Festpreise für alle Planeten, die weiterhin gegen den Marktplatz des Planeten gewinnen.

Auf einem Planeten sind die Festpreise für alle Planeten abgeschwächt als **Preis für alle Planeten** aufgelistet, und **Überschreiben** gibt dem Planeten einen eigenen Festpreis für dieses Material. Darunter zeigt **Preise auf {planet}**, was die Pläne dieses Planeten kaufen und verkaufen und welchen Preis jedes bekommt.

Planeten mit gespeicherten Regeln, die keiner deiner Pläne mehr nutzt, stehen unter **In keinem Plan**. Ihre Regeln bleiben gespeichert, bis du sie mit **Regeln löschen** löschst.

## Speichern {#saving}

Deine Pläne nutzen deine Änderungen erst, wenn du sie speicherst. Die Speicherleiste unten zählt deine Änderungen: jeden geänderten Teil der Präferenz, plus eine für eine Umbenennung. **Änderungen speichern** speichert sie und bewertet jeden Plan, den du offen hast, neu, und **Verwerfen** geht zurück zu den gespeicherten Regeln. Da die [Übersicht](#overview) ungespeicherte Änderungen schon zeigt, kannst du eine Regel ausprobieren, dir die Preise ansehen, die sie ergibt, und sie verwerfen, wenn sie nicht das ist, was du wolltest. Hast du ungespeicherte Änderungen, fragt die Seite nach, bevor du sie verlässt oder die Präferenz wechselst.

**Umbenennen…** im Menü **Weitere Aktionen** ändert den Namen der Präferenz. Den neuen Namen speicherst du mit der Speicherleiste. **Präferenzen verwalten** öffnet die Verwaltung.

Wurde dieselbe Präferenz nach dem Öffnen in einem anderen Tab oder auf einem anderen Gerät gespeichert, sagt dir die Seite das und behält deine Änderungen. Beim Speichern wählst du **Überschreiben** (deine Version ersetzt die andere) oder **Neu laden** (deine Änderungen verwerfen und die gespeicherte Version laden).

## CSV-Import und -Export {#csv-import-and-export}

**CSV exportieren** lädt jede Regel der Präferenz, einschließlich ungespeicherter Änderungen, als `PRUNPlannerExchangePreferences.csv` herunter. **CSV importieren** liest eine solche Datei ein und fragt nach, bevor es alle Regeln der Präferenz ersetzt. Ein Import bleibt ungespeichert, bis du ihn speicherst.

Die Datei nutzt Semikolons als Trennzeichen und hat die Spalten `Location;Type;CX;Ticker;Price`:

| Spalte        | Werte                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Location      | `EMPIRE` für alle Planeten oder die natürliche ID eines Planeten                                                                                             |
| Type          | `BUY`, `SELL` oder `BOTH`                                                                                                                                    |
| CX            | Nur Marktplatz-Regeln: Marktplatz und Basis, z. B. `NC1_30D`, `CI1_7D`, `AI1_ASK`, `IC1_BID`, `UNIVERSE_30D` |
| Ticker, Price | Nur Festpreise: der Ticker des Materials und sein Preis                                                                                      |

PRUNplanner lehnt eine Datei mit einer fehlenden Spalte oder einer ungültigen Zeile als Ganzes ab, und nichts ändert sich.

```
Location;Type;CX;Ticker;Price
EMPIRE;BOTH;NC1_30D;;
EMPIRE;BUY;;RAT;45
```

## Marktkarte eines Materials {#market-card}

Jeder Material-[[ticker|Ticker]] in PRUNplanner öffnet eine Marktkarte. Fahr mit der Maus darüber (oder fokussier ihn mit der Tastatur), und die Karte erscheint. Auf einem Touchscreen oder in einem schmalen Fenster öffnet ein Tippen sie als Blatt von unten.

Die Karte zeigt eine Zeile pro Marktplatz plus Universe, mit Ask, Bid, [[spread|Spread]], VWAP 7D und VWAP 30D, der Veränderung von 7D gegenüber 30D, einer 30-Tage-Preislinie und den pro Tag gehandelten Einheiten (30-Tage-Durchschnitt). Darunter fassen kurze Zeilen den Trend über die Marktplätze, die Orderbücher (angebotene und gesuchte Einheiten) und den Preisabstand zwischen den Marktplätzen zusammen. Wird ein Material auf allen vier Marktplätzen zusammen weniger als eine Einheit pro Tag gehandelt, markiert die Karte es als selten gehandelt.

Gehört der Ticker zu einem Plan, einem Imperium oder einem Setup, zeigt die Karte auch, wie viel davon pro Tag gekauft oder verkauft wird, und den [[share-of-volume|Anteil am Tagesvolumen]]: Passt unter 10 %, Beobachten ab 10 %, Zu groß ab 50 %. Das sind dieselben Grenzen wie im [Plan-Check](/help/plan_check#market-check). Verkauft ein Plan zum Beispiel 60 Einheiten pro Tag und der Marktplatz hat in den letzten 30 Tagen 9.000 Einheiten gehandelt, sind das 300 pro Tag, und der Anteil des Plans ist 60 ÷ 300 = 20 %: Beobachten.

- Klick auf den Ticker, um die Karte anzupinnen. Esc oder × schließt sie. In Material I/O eines Plans und im HQ Kalkulator öffnet ein Klick direkt die Details.
- **Marktdetails →** öffnet eine Schublade mit Gewicht und Volumen des Materials, dem Datenstand, einer Tabelle pro Marktplatz (**Preise**, **Orderbücher**, **Volumen**), einem 30-Tage-Chart und **Marktgesundheit** (Breite, volumengewichteter Trend, Orderbuch-Balance, Preisnähe).
- **Marktforschung ↗** öffnet das Material in der [Marktforschung](/help/tools_market_exploration).

Unter [Profil](/help/profile#preferences) legt **Marktkarte** fest, wie sich die Karte öffnet: **Beim Darüberfahren** (Standard) oder **Nur beim Klicken**. Mit Nur beim Klicken zeigt das Darüberfahren nichts, und ein Klick pinnt die Karte an.
