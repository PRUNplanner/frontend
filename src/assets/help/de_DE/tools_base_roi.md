Basis-ROI bewertet jede Möglichkeit, eine Basis zu betreiben: jede Ressource auf jedem Planeten, der sie hat, jedes Landwirtschaftsrezept auf jedem fruchtbaren Planeten und jedes Rezept jedes anderen Produktionsgebäudes. Jede Zeile ist eine volle Basis mit 500 Fläche und dem optimalen Layout des Gebäudes, berechnet mit derselben Engine wie deine Pläne und bepreist mit der gewählten CX-Präferenz (Universe-30D-Preise, wenn du nicht angemeldet bist).

**Bitte beachten**: Alle Zeilen nutzen das hier eingestellte COGC und die Experten; Rezeptzeilen laufen auf einem Standardplaneten.

# Zeilenarten

- **Ressource**: eine Ressource auf einem Planeten, mit RIG, EXT oder COL und den Umweltmaterialien des Planeten. Zeigt "@ Planet (Sprünge)".
- **Landwirtschaft**: ein FRM- oder ORC-Rezept auf einem fruchtbaren Planeten, mit der Fruchtbarkeit des Planeten im Ertrag.
- **Rezept**: ein Rezept eines beliebigen anderen Produktionsgebäudes, auf einem Standardplaneten (felsig, normale Schwerkraft, normaler Druck und normale Temperatur). Nutze **Auf einem Planeten testen** in den Details der Zeile, um es auf einem echten Planeten zu sehen.

# Metrics

- **Täglicher Profit**: Umsatz minus Inputs, Konsumgüter und Abnutzung (Konstruktion der Produktionsgebäude ÷ 180), bei 5 Experten mit dem Aufbau, sonst bei der festen Anzahl.
- Fahre über eine Spaltenüberschrift, um zu sehen, was sie bedeutet, und über eine Zahl für die Überschlagsrechnung dahinter. Mit **Aufbau ab 0** startet eine neue Basis ohne Experten: Die Phasen mit 0, 1, 2, 3 und 4 Experten dauern 10, 12.5, 57.57, 276.5 und 915.1 Tage, jeweils geteilt durch die Anzahl der Produktionsgebäude, und Umsatz und Inputs wachsen mit dem Expertenbonus. "nie", wenn die Basis keinen Profit macht.
- **Wochenrendite**: 7 × täglicher Profit ÷ Baukosten.
- **Baukosten**: Konstruktion, plus die Optionen in den Einstellungen: Pufferbestand (Puffertage × (Inputs + Konsumgüter + Umsatz) ÷ 2) und das HQ-Upgrade für eine weitere Genehmigung (HQ-Stufe N − 1).
- **Tägliche Betriebskosten**: Inputs + Konsumgüter + Abnutzung. Ausgeblendet, bis du sie unter Spalten einschaltest: Der Pufferbestand in den Baukosten deckt die Betriebskosten zu Beginn bereits ab.
- **Fracht / Tag**: der größere Wert aus Gewicht und Volumen, den die Basis pro Tag rein- oder rausbewegt; (I), wenn mehr reinkommt, (O), wenn mehr rausgeht.
- **Marktkapazität**: wie viele solcher Basen der Markt verkraftet, auf beiden Seiten. Für jeden Output ist es das durchschnittliche 7-Tage-Handelsvolumen ÷ was die Basis pro Tag produziert, und für jeden Rezept-Input das Handelsvolumen ÷ was die Basis pro Tag braucht. The lowest counts. (O) or (I) shows which side limits it, and the tooltip names the material. Unter 1 produziert oder braucht eine einzige Basis mehr, als der Markt handelt.
- **Bauplätze**: freie Bauplätze auf dem Planeten, bei Planetenzeilen. Sortiere danach, um die leersten Planeten zu sehen. Rezeptzeilen laufen auf einem Standardplaneten und zeigen daher einen Strich.
- **Belegschaft**: die Belegschaft, die die Basis je Stufe braucht.
- **Profit, 30 Tage**: täglicher Profit mit dem täglichen VWAP des Marktplatzes jedes Materials über die letzten 30 Tage. Tage ohne Abschlüsse behalten den letzten Preis. ASK, BID und Festpreise haben keinen Verlauf.
- **⚠**: ein Material, das mit einem 7D- oder 30D-VWAP bepreist ist und dessen Bid oder Ask mehr als 30% von diesem Preis abweicht. Das Popover listet den täglichen Profit mit diesen Preisen.

# Einstellungen

- **Lagerpuffer**: Lager für so viele Tage Fracht; STO oder STA werden hinzugefügt, und ein Produktionsgebäude entfällt, wenn die Basis sonst nicht mehr passen würde.
- Marktkapazität\*\* (neben der Suche über der Tabelle), **Logistiklimit** und **Max. Sprünge** blenden Zeilen aus; die Zeile über der Tabelle zählt die ausgeblendeten Zeilen je Limit. Max. Sprünge zählt bis zum nächsten Marktplatz deiner CX-Präferenz.
- **Planeten ohne Arbeiter oder Bauplätze anzeigen**: standardmäßig aus, daher sind Planetenzeilen ausgeblendet, wenn keine neue Basis passt (jeder Bauplatz belegt und keine Geisterplätze) oder wenn der letzte Bevölkerungsbericht die Stellen der Basis nicht besetzen kann, gezählt als freie Arbeiter abzüglich der bereits offenen Stellen. Ein Planet ohne Bevölkerungsbericht gilt als ohne Arbeiter. Schalte es ein, um diese Zeilen zu sehen; die Spalte Belegschaft zeigt, was fehlt. Recipe rows are not checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Einrichtung erneut starten** öffnet die Einrichtung des ersten Besuchs mit ihren Voreinstellungen: Einsteiger (SCB, ohne Wochenrendite und Betriebskosten), Standard (WCB) und Veteran (beliebiges Schiff oder kein Limit).

# Profit-Chart

Above the table (beside the settings on wide screens), a chart shows the daily profit of the last 90 days for each industry. Jede Basis zählt danach, wie viel von ihrem Produkt der Markt handelt (7-Tage-Durchschnitt), und die vielen Planeten eines Ressourcenrezepts zählen als eins. Search to drill in:

- eine Branche (z. B. "Chemistry") zeigt ihre Gebäude;
- ein Gebäude (z. B. "CHP") zeigt seine Produkte;
- ein Produkt (z. B. "SC") zeigt die Rezepte, die es herstellen.

Das Chart folgt den Einstellungen und Limits der Tabelle. Es zeigt die 7 am meisten gehandelten Linien und sagt, wie viele es noch gibt.

Every history chart has a time range (7, 30 or 90 days) and an aggregation (1, 3 or 7 days per point) at its top right, like the game's charts. A longer aggregation smooths out daily noise. The choice applies to all charts and is remembered.

# Suche und Tooltips

- Die Suche über der Tabelle filtert nach Branche, Gebäude oder Produkt-Ticker.
- Hover a column header for what it means, and a number for the napkin math behind it.

# Details

Expand a row to see two charts, then the full math below them. Du kannst die Rechnung auch als Text kopieren oder die Zeile als neuen Plan mit demselben Layout öffnen (angemeldet).

- **Profit**: revenue, running cost and daily profit, every line on one ȼ scale.
- **Market volume**: how many bases the market carries each day, from the CX traded volume. _Outputs_ is the scarcest output's traded volume ÷ what one base sells per day; _Inputs (bottleneck)_ is the same for the recipe input with the least volume per unit the recipe needs. It's the market capacity column, day by day.
