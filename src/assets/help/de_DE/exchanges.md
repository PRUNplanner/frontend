# Exchange Preferences

An exchange preference sets the prices your plans use: which exchange and price basis, and fixed prices for materials you get at your own cost or from a partner. Weise eine Präferenz in der Verwaltung einem Imperium zu; jeder Plan dieses Imperiums verwendet sie dann.

Die Seite öffnet sich mit der **Übersicht**: jedes Material, das deine Pläne kaufen oder verkaufen, der Preis, den es bekommt, und woher dieser Preis stammt. Klappe eine Zeile auf, um die vollständige Kaskade für jeden Planeten zu sehen. Notes above the table point to rules that need a look.

# Wie ein Preis ermittelt wird

Für jedes Material sucht PRUNplanner einen Kaufpreis (für das, was ein Plan verbraucht) und einen Verkaufspreis (für das, was er produziert). Dabei werden diese Ebenen der Reihe nach geprüft und die erste passende Regel wird genommen:

1. **Festpreis des Planeten**: ein Festpreis, der auf diesem Planeten festgelegt ist
2. **Festpreis für alle Planeten**
3. **Marktplatz des Planeten**: die Marktplatz-Regel, die auf diesem Planeten festgelegt ist
4. **Marktplatz für alle Planeten**
5. **Universe · VWAP 30D**, wenn keine der obigen Regeln passt

Ein Festpreis für alle Planeten hat Vorrang vor der Marktplatz-Regel eines Planeten.

## Kaufen, Verkaufen oder beides

Eine Regel kann für den Kauf, den Verkauf oder beides gelten. Hat eine Ebene keine Regel für die Seite, die ein Plan braucht (zum Beispiel nur eine Kaufregel, während der Plan das Material verkauft), wird diese Ebene übersprungen und die nächste geprüft, bis hinunter zu Universe · VWAP 30D.

## Marktplätze ohne Preis

When an exchange rule matches but its exchange has no price for a material (no trades, no asks or no bids), the price is **0 ȼ**. It does not fall through to the next level. Die Seite zeigt diese Preise orange an und listet sie in den Hinweisen auf, damit du einen Festpreis setzen oder einen anderen Marktplatz oder eine andere Preisbasis wählen kannst.

# Preisbasis: VWAP, Ask und Bid

PRUNplanner kann einen volumengewichteten Durchschnittspreis (Volume-Weighted Average Price, VWAP) über 7 oder 30 Tage verwenden. Der VWAP gewichtet Abschlüsse mit höherem Volumen stärker und spiegelt daher wider, wo der Großteil des Handels stattfand, statt einzelner Ausreißer-Orders.

Ask und Bid stammen aus dem heutigen Orderbuch: das günstigste Angebot und das höchste Gebot. Sie ändern sich täglich und können bei wenig gehandelten Materialien fehlen. Universe hat nur VWAP-Preise.

# Voreinstellungen

- **Durchschnitt · VWAP 30D** verwendet den VWAP 30D des Marktplatzes für Kauf und Verkauf.
- **Sofort handeln · Kauf zum Ask, Verkauf zum Bid** kauft zum Ask des Marktplatzes und verkauft zu seinem Bid. Nicht verfügbar für Universe.

Presets work on the scope's exchange, else the all-planets exchange, else NC1.

# Festpreise und COGM

Festpreise eignen sich für Materialien, die du selbst herstellst und zum Selbstkostenpreis verwendest, oder für Preise, die du mit einer Corporation oder einem Partner vereinbart hast. Lass eine Seite leer, um dafür den Marktplatz-Preis zu verwenden.

Unter **Alle Planeten** zeigt die Festpreis-Tabelle den Marktpreis ohne den Festpreis und, für Materialien, die deine Pläne herstellen, die niedrigsten COGM (Herstellungskosten, cost of goods manufactured) unter den Plänen, die die Präferenz verwenden. **Nutzen** setzt den Kaufpreis auf diese COGM. Im COGM-Werkzeug eines Plans macht **Als Kaufpreis verwenden** dasselbe. Ein Hinweis sagt dir, wenn ein fester Kaufpreis mehr als 2 % von den COGM abweicht.

# Ausnahmen für Planeten

Die meisten Spieler verwenden einen Heimat-Marktplatz für alle Planeten. Wenn ein Planet etwas anderes braucht, öffne ihn in der Liste und lege eine eigene Marktplatz-Regel oder eigene Festpreise fest. Seine Regeln haben auf diesem Planeten Vorrang vor den Regeln für alle Planeten, außer vor Festpreisen für alle Planeten, die weiterhin Vorrang vor dem Marktplatz des Planeten haben.

Planeten mit gespeicherten Regeln, die kein Plan mehr verwendet, werden unter **In keinem Plan** aufgeführt. Ihre Regeln bleiben gespeichert, bis du sie löschst.

# Speichern

Deine Pläne verwenden Änderungen erst, wenn du sie speicherst. Die Speicherleiste zählt die geänderten Bereiche; Verwerfen kehrt zu den gespeicherten Regeln zurück. Die Seite fragt nach, bevor du sie mit ungespeicherten Änderungen verlässt oder die Präferenz wechselst.

# CSV-Import und -Export

**CSV exportieren** lädt alle Regeln der Präferenz herunter, einschließlich ungespeicherter Änderungen. **CSV importieren** liest eine solche Datei ein und fragt nach, bevor alle Regeln der Präferenz ersetzt werden. Ein Import bleibt ungespeichert, bis du ihn speicherst.
