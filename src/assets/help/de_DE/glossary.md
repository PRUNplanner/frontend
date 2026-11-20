Die Spiel- und Planungsbegriffe, die PRUNplanner verwendet, in alphabetischer Reihenfolge. Der erste Absatz jedes Eintrags ist die Kurzdefinition, die du siehst, wenn du in einem Artikel mit der Maus über den Begriff fährst. Der Rest erklärt, wie PRUNplanner ihn berechnet oder anzeigt und wo du mehr dazu liest.

## Fläche und Genehmigungen {#area-permits}

Die nutzbare Fläche einer Basis ist 250 plus 250 für jede Genehmigung, die sie nutzt, also ergibt eine Genehmigung die üblichen 500 Fläche. Das Kernmodul belegt davon immer 25.

Jedes Gebäude belegt Fläche, und ein Plan zeigt, wie viel davon genutzt und wie viel frei ist. Im Spiel bringt dir jedes HQ-Upgrade eine weitere Basis-Genehmigung. Produktionsketten plant Basen mit 1 bis 3 Genehmigungen, also 500, 750 oder 1.000 Fläche. Siehe [Produktionsketten](/help/tools_production_chain#bases).

## Ask {#ask}

Der niedrigste Preis, den ein Verkäufer auf einem Marktplatz gerade verlangt. Wenn du sofort kaufst, zahlst du den Ask. Kein Ask heißt, dass dort gerade niemand das Material verkauft.

Der Plan-Check zeigt „Keine Angebote“, wenn ein Plan ein Material auf einem Marktplatz ohne Ask kauft. Deine Marktplatz-Präferenz kann den Ask als Preisbasis verwenden. Siehe [Plan-Check](/help/plan_check#flags) und [Preisbasis](/help/exchanges#price-basis-vwap-ask-and-bid).

## Bid {#bid}

Der höchste Preis, den ein Käufer auf einem Marktplatz gerade bietet. Wenn du sofort verkaufst, nimmst du den Bid. Kein Bid heißt, dass dort gerade niemand das Material kauft.

Der Plan-Check zeigt „Keine Käufer“, wenn ein Plan ein Material auf einem Marktplatz ohne Bid verkauft. Deine Marktplatz-Präferenz kann den Bid als Preisbasis verwenden. Siehe [Plan-Check](/help/plan_check#flags).

## Verbrauch (Burn) {#burn}

Wie viele Tage der Bestand einer Basis an einem Material reicht: der Bestand in deinem FIO-Lager ÷ das, was die Basis pro Tag verbraucht. Ein Material, von dem die Basis so viel herstellt, wie sie verbraucht, geht nie aus.

FIO Verbrauch färbt ein Material standardmäßig bei 5 Tagen oder weniger rot und bei 10 Tagen oder weniger gelb. Beides kannst du auf der Seite FIO Verbrauch oder in deinem Profil ändern. Der Verbrauch braucht deine FIO-Daten. Siehe [FIO Verbrauch](/help/fio_burn#calculations).

Ein Beispiel: Eine Basis mit 300 Einheiten eines Materials im Lager, die 40 pro Tag verbraucht und 10 pro Tag herstellt, verbraucht netto 30 pro Tag, also reicht der Bestand 300 ÷ 30 = 10 Tage. Bei den Standardgrenzwerten (rot 5, gelb 10 Tage) ist das gelb, noch nicht rot.

## Nebenprodukt {#byproduct}

Ein zweiter Output eines Auftrags, der neben dem Material entsteht, für das der Auftrag läuft.

Standardmäßig nutzt Produktionsketten ein Nebenprodukt zuerst für den eigenen Bedarf der Kette und verkauft den Rest. Siehe [Produktionsketten](/help/tools_production_chain#settings).

## Frachträume {#cargo-bays}

Die Schiffsgrößen, mit denen Basis-ROI prüft, ob die Fracht einer Basis in einen Schiffsbesuch passt, angegeben als Gewicht und Volumen.

| Schiff | Gewicht | Volumen  |
| ------ | ------- | -------- |
| TCB    | 100 t   | 100 m³   |
| VSC    | 250 t   | 250 m³   |
| SCB    | 500 t   | 500 m³   |
| MCB    | 1.000 t | 1.000 m³ |
| LCB    | 2.000 t | 2.000 m³ |
| WCB    | 3.000 t | 1.000 m³ |
| VCB    | 1.000 t | 3.000 m³ |
| HCB    | 5.000 t | 5.000 m³ |

Die Einsteiger-Voreinstellung von Basis-ROI nutzt das SCB als Startschiff. Siehe [Basis-ROI](/help/tools_base_roi#settings).

## COGC {#cogc}

Das Programm der Chamber of Global Commerce, das auf einem Planeten läuft. Ein Werbeprogramm beschleunigt die Gebäude eines Fachgebiets um 25 %, und ein Belegschaftsprogramm beschleunigt die Gebäude, die diese Belegschaftsstufe beschäftigen, um 10 %.

Im Spiel stimmen die Bewohner (Spieler mit einer Basis auf dem Planeten) über das Programm ab, und das siegreiche Programm läuft eine Woche lang. Du wählst das Programm in den Planeteneinstellungen eines Plans, und die Planetensuche kann danach filtern. Siehe [Planetensuche](/help/planet_search#cogc-and-infrastructure).

## COGM {#cogm}

Herstellungskosten (Cost of goods manufactured): was eine Einheit des Outputs eines Auftrags in einem Plan kostet, aus Inputpreisen, Belegschaft, Verschleiß, Produktionsgebühren, Laufzeit und Effizienz.

Die Kosten eines Durchlaufs sind sein Anteil an den täglichen Verschleiß- und Belegschaftskosten des Gebäudes, plus seine Inputs und seine Produktionsgebühr. Der Anteil ist die Laufzeit bei der Effizienz des Gebäudes ÷ 24 h.

Ein ausgedachtes Beispiel: Ein Auftrag läuft 12 h bei 100 % Effizienz, sein Anteil ist also 12 ÷ 24 = 0,5. Das Gebäude hat 18.000 ȼ Baukosten, sein Verschleiß ist also 18.000 ÷ 180 = 100 ȼ pro Tag, und der Teil des Durchlaufs davon ist 50 ȼ. Seine Belegschaft kostet 400 ȼ pro Tag, der Teil des Durchlaufs ist also 200 ȼ. Mit 1.000 ȼ an Inputs und 50 ȼ Gebühr kostet der Durchlauf 50 + 200 + 1.000 + 50 = 1.300 ȼ. Stellt er 10 Einheiten her, sind die COGM 1.300 ÷ 10 = 130 ȼ pro Einheit.

Hat ein Auftrag mehrere Outputs, teilt PRUNplanner die Kosten entweder nach Menge auf oder rechnet sie jedem Output voll an. COGM können in deiner Marktplatz-Präferenz auch zum Festpreis werden. Siehe [Plan-Werkzeuge](/help/plan_tools) und [Festpreise und COGM](/help/exchanges#fixed-prices-and-cogm).

Hätte derselbe Durchlauf 10 Einheiten eines Outputs und 5 eines Nebenprodukts hergestellt, rechnet das Aufteilen jeder Einheit beider 1.300 ÷ 15 ≈ 86,67 ȼ an. Volles Anrechnen ergibt 1.300 ÷ 10 = 130 ȼ pro Einheit für den ersten Output und 1.300 ÷ 5 = 260 ȼ pro Einheit für das Nebenprodukt.

## Bauwagen {#construction-cart}

Ein Plan-Werkzeug, das die Materialien auflistet, die du für die Gebäude des Plans noch kaufen musst, nach Abzug der Gebäude, die schon auf der Basis stehen.

Die stehenden Gebäude kommen aus deinen FIO-Daten, oder du trägst sie selbst ein. Du bekommst die Liste als Tabelle oder als XIT-Aktion. Siehe [Plan-Werkzeuge](/help/plan_tools).

## Kernmodul {#core-module}

Das zentrale Gebäude jeder Basis. Es belegt 25 Fläche der Basis, und Pläne zählen es immer zu den zu errichtenden Gebäuden.

Es heißt auch CM.

## Corp.-HQ {#corp-hq}

Das Hauptquartier der Corporation, der du angehörst, wenn es auf dem Planeten des Plans steht. Es ist nicht das HQ deiner eigenen Firma. Es beschleunigt jedes Gebäude des Plans um 10 %.

Schalte es in den Planeteneinstellungen eines Plans ein. Siehe [Basis einrichten](/help/plan_base). Das Hauptquartier deiner eigenen Firma ist etwas anderes, das unter HQ-Stufe erklärt wird.

## Credits (ȼ) {#currency}

Das Geld des Spiels. PRUNplanner zeigt jeden Preis, alle Kosten und jeden Profit in Credits, geschrieben ȼ.

Produktionsgebühren werden in der Währung des Planeten festgelegt. PRUNplanner rechnet sie eins zu eins als ȼ zu den Kosten.

## CX {#cx}

Ein Marktplatz (Commodity Exchange), einer der von Spielern getragenen Märkte des Spiels, jeder mit eigenem Orderbuch. Die Preise und Volumen von PRUNplanner decken AI1, CI1, IC1 und NC1 ab.

AI1 liegt bei Antares, CI1 bei Benten, IC1 bei Hortus und NC1 bei Moria. Live-Markt zeigt außerdem CI2 (Arclight) und NC2 (Hubur), und XIT-Aktionen können in deren Lagerhäusern starten. Handel abseits der CX, auf lokalen Märkten oder per Vertrag, ist in diesen Daten nicht enthalten. Siehe [Marktplätze](/help/exchanges).

## Abnutzung {#degradation}

Gebäude nutzen sich mit der Zeit ab. Pläne rechnen das als tägliche Kosten von 1 ⁄ 180 der Baukosten der Produktionsgebäude.

Ein Beispiel: Produktionsgebäude mit 180.000 ȼ Baukosten erhöhen die Kosten des Plans um 180.000 ÷ 180 = 1.000 ȼ pro Tag.

Die Abnutzung zählt in den Kosten und im Profit eines Plans und in den COGM. Sie heißt auch Verschleiß. Unter Reparatur steht, wie Zustand und Reparaturkosten funktionieren.

## Effizienz {#efficiency}

Wie schnell ein Gebäude im Vergleich zur Grundzeit seines Auftrags produziert. Bei 100 % läuft ein Auftrag in seiner Grundzeit, bei 125 % in 80 % dieser Zeit.

Die Effizienz eines Gebäudes ist das Produkt seiner Faktoren: Fruchtbarkeit (nur Farmen), Corp.-HQ, COGC, Experten, Belegschaft und Fraktion. Ein Plan zeigt jeden Faktor für jedes Gebäude. Siehe [Basis einrichten](/help/plan_base).

Ein Beispiel: Ein Gebäude mit dem COGC-Werbeprogramm für sein Fachgebiet (× 1,25), einem Corp.-HQ (× 1,1) und voll untergebrachten Arbeitern mit beiden Luxusgütern (× 1), ohne weitere Faktoren, läuft mit 1,25 × 1,1 × 1 = 1,375, also 137,5 %. Ein Auftrag mit 10 h Grundzeit dauert dann 10 ÷ 1,375 ≈ 7,3 h.

## Imperium {#empire}

Eine benannte Gruppe deiner Pläne mit einer Fraktion und einer Anzahl Genehmigungen. Fraktion und Genehmigungen geben jedem Plan seinen Fraktionsbonus, und die Marktplatz-Präferenz des Imperiums bepreist alle seine Pläne.

Ein Plan kann zu mehreren Imperien gehören, und seine Zahlen hängen davon ab, in welchem Imperium du ihn öffnest. Imperien erstellst und bearbeitest du in der Verwaltung. Siehe [Verwaltung](/help/management#empires).

## Marktplatz-Präferenz {#exchange-preference}

Deine Regeln für die Preise, die Pläne verwenden: welcher Marktplatz und welche Preisbasis (VWAP 7D, VWAP 30D, Ask oder Bid), dazu Festpreise für einzelne Materialien. Du weist eine davon einem Imperium zu.

Eine Regel kann für Kauf, Verkauf oder beides gelten, und für alle Planeten oder einen Planeten. PRUNplanner nimmt die erste passende Regel in dieser Reihenfolge: ein Festpreis für den Planeten, ein Festpreis für alle Planeten, eine Marktplatz-Regel für den Planeten, eine Marktplatz-Regel für alle Planeten. Passt keine, nimmt es Universe VWAP 30D. Sie heißt auch CX-Präferenz oder Standard CX. Siehe [So wird ein Preis gefunden](/help/exchanges#how-a-price-is-found).

## Fachgebiet {#expertise}

Das Fachgebiet eines Produktionsgebäudes: Landwirtschaft, Chemie, Bauwesen, Elektronik, Lebensmittelindustrie, Treibstoffherstellung, Fertigung, Metallurgie oder Ressourcengewinnung.

Experten, COGC-Werbeprogramme und Fraktionsboni wirken jeweils auf die Gebäude eines Fachgebiets.

## Experten {#experts}

Spezialisten auf einer Basis, die deren Gebäude eines Fachgebiets beschleunigen. Sie kommen mit der Zeit, wenn du Produktionsgebäude dieses Fachgebiets betreibst, und mehr Gebäude bringen sie schneller.

| Experten | Beschleunigung |
| -------- | -------------- |
| 1        | 3,06 %         |
| 2        | 6,96 %         |
| 3        | 12,48 %        |
| 4        | 19,74 %        |
| 5        | 28,4 %         |

Ein Plan nimmt höchstens 5 Experten pro Fachgebiet und warnt, wenn eine Basis insgesamt mehr als 6 hat. Siehe [Basis einrichten](/help/plan_base).

## Zusätzliche Baumaterialien {#extra-building-materials}

Materialien, die ein Planet wegen seiner Oberfläche, Schwerkraft, seines Drucks oder seiner Temperatur zum Bau jedes Gebäudes hinzufügt.

| Planet                       | Zusatzmaterial |
| ---------------------------- | -------------- |
| Felsige Oberfläche           | MCG            |
| Gasförmig (keine Oberfläche) | AEF            |
| Niedrige Schwerkraft         | MGC            |
| Hohe Schwerkraft             | BL             |
| Niedriger Druck              | SEA            |
| Hoher Druck                  | HSE            |
| Niedrige Temperatur          | INS            |
| Hohe Temperatur              | TSH            |

Sie erhöhen die Baukosten eines Plans. Die Planetensuche zeigt sie für jeden Planeten. Siehe [Planetensuche](/help/planet_search#reading-the-results).

## Abbau {#extraction}

Das Gewinnen einer Ressource eines Planeten mit einem EXT (Minerale), RIG (Flüssigkeiten) oder COL (Gase). Die Menge pro Durchlauf hängt von der Tagesrate des Planeten für diese Ressource ab.

Ein Durchlauf ergibt die Tagesrate des Planeten × einen Anteil des Tages (12 h bei EXT, 4,8 h bei RIG, 6 h bei COL), aufgerundet auf ganze Einheiten. Er dauert so lange, wie diese Menge bei der Tagesrate braucht. Ein Durchlauf kann also etwas länger sein als sein Anteil, und der Output pro Tag entspricht der Rate des Planeten.

Ein Beispiel: Bei einer Tagesrate von 7 für ein Mineral ergibt ein EXT-Durchlauf 7 × 12 ÷ 24 = 3,5, aufgerundet 4 Einheiten, und dauert 4 ÷ 7 eines Tages, etwa 13,7 h. Vier Einheiten alle 13,7 h ergeben zusammen die 7 pro Tag des Planeten.

## Fraktion {#faction}

Die Fraktion deiner Firma, pro Imperium eingestellt. Gebäude des Fachgebiets der Fraktion bekommen einen Bonus, der wächst, je weniger deiner Genehmigungen du nutzt.

| Fraktion             | Grundbonus                                                   |
| -------------------- | ------------------------------------------------------------ |
| Antares              | Elektronik 5 %                                               |
| Benten               | Fertigung 5 %                                                |
| Hortus               | Landwirtschaft 3 %, Lebensmittelindustrie 2 %                |
| Moria                | Metallurgie 2 %, Bauwesen 3 %                                |
| Außerhalb der Region | Chemie, Treibstoffherstellung und Ressourcengewinnung je 2 % |
| Keine Fraktion       | keiner                                                       |

PRUNplanner multipliziert den Grundbonus mit 2 × (3 − 2 × genutzte Genehmigungen ÷ Genehmigungen gesamt), aus den Genehmigungen des Imperiums. Sind alle Genehmigungen genutzt, ist das × 2, Antares gibt Elektronik also 10 %. Ist ein Drittel davon genutzt, sind es etwa × 4,67.

## Fruchtbarkeit {#fertility}

Eine Planeteneigenschaft, die nur Farmen (FRM und ORC) nutzen. Höhere Fruchtbarkeit macht sie schneller, und auf einem Planeten ohne Fruchtbarkeit laufen sie nicht.

Der Fruchtbarkeitsfaktor einer Farm ist 1 + Fruchtbarkeit × 10 ⁄ 33. Die Planetensuche kann nach Fruchtbarkeit filtern. Siehe [Planetensuche](/help/planet_search#planet-conditions).

## FIO {#fio}

Die Community-API, die Spieldaten spiegelt. Mit deinem FIO-Benutzernamen und API-Schlüssel in deinem Profil liest PRUNplanner auch dein Lager, deine Standorte und deine Schiffe.

Die Spieldaten und Marktplatzdaten von PRUNplanner kommen von FIO. FIO Verbrauch, FIO Reparieren und die Wagen der Pläne nutzen deine eigenen FIO-Daten. Siehe [Profil](/help/profile).

## Festpreis {#fixed-price}

Ein Preis, den du in einer Marktplatz-Präferenz selbst für ein Material festlegst, für Kauf, Verkauf oder beides, auf allen Planeten oder einem Planeten. Er hat Vorrang vor Marktplatz-Regeln.

Nutze ihn für Materialien, die du selbst herstellst oder von einem Partner bekommst. Siehe [Festpreise und COGM](/help/exchanges#fixed-prices-and-cogm).

## Geisterplätze {#ghost-sites}

Basen auf einem Planeten über seine Zahl an Bauplätzen hinaus. Auf Startplaneten kann sich ein neuer Spieler, der dort beginnt, auch dann noch niederlassen, wenn alle Bauplätze belegt sind. Sonst niemand.

Im Spiel gibt es Geisterplätze auf Startplaneten für neue Spieler. Ein neuer Spieler, der dort beginnt, kann sich niederlassen, auch wenn alle Bauplätze belegt sind. Liegt dein Startplanet woanders, kannst du dich auf so einem Planeten nicht mehr niederlassen, sobald er keine freien Bauplätze hat. Die Planetensuche markiert einen vollen Planeten, der Geisterplätze erlaubt, mit „Voll · Geisterplätze“. Siehe [Bauplätze](/help/planet_search#plots).

## Unterkünfte {#habs}

Wohngebäude, die die Belegschaft einer Basis unterbringen. HB1 bis HB5 bringen je eine Stufe unter, HBB, HBC, HBM und HBL dagegen gemischte Stufen.

Zu wenig Unterkünfte senken die Effizienz der Belegschaft. Ein Plan kann seine Unterkünfte automatisch an die Belegschaft anpassen, und das ist bei neuen Plänen eingeschaltet. Siehe [Basis einrichten](/help/plan_base).

## HQ-Stufe {#hq-level}

Die Stufe des Hauptquartiers deiner eigenen Firma. Jedes HQ-Upgrade bringt dir eine weitere Basis-Genehmigung.

Der HQ-Upgrade-Rechner listet und bepreist die Materialien von einer Stufe zur anderen. Sein Bereich endet bei Stufe 50, das ist aber der Bereich des Rechners, keine Grenze des Spiels. Basis-ROI kann das Upgrade für eine weitere Genehmigung zu den Kosten einer Basis rechnen. Siehe [HQ Kalkulator](/help/tools_hq_upgrade_calculator).

## Sprünge {#jumps}

Die Zahl der Sprünge von System zu System auf der kürzesten Route zwischen zwei Orten.

Die Planetensuche berechnet Sprünge in deinem Browser, zu den Marktplätzen und zu deinen Plänen. Ein „—“ heißt, dass es keine Sprungroute gibt und ein Kolonieschiff nötig ist. Siehe [Entfernung](/help/planet_search#distance).

## Luxusgüter {#luxuries}

Zwei optionale Verbrauchsgüter pro Belegschaftsstufe, etwa PWO und COF für Pioniere. Sie zu liefern erhöht die Effizienz der Belegschaft, auf Kosten ihres täglichen Verbrauchs.

Untergebrachte Arbeiter ohne Luxusgüter arbeiten mit etwa 79 %. Das erste Luxusgut hebt das auf etwa 87 %, das zweite auf etwa 92 %, und beide zusammen auf 100 %. Luxusgüter, die du nicht einschaltest, werden nicht verbraucht. Siehe [Basis einrichten](/help/plan_base).

## Marktkapazität {#market-capacity}

In Basis-ROI: wie viele Basen wie diese der Markt verkraftet, also das gehandelte Volumen des Marktplatzes pro Tag (die Summe der letzten 7 Tage ÷ 7, Tage ohne Handel mitgezählt) ÷ das, was eine Basis pro Tag verkauft oder braucht.

Ein Beispiel: Handelt der Marktplatz 1.000 Einheiten eines Outputs pro Tag und verkauft eine Basis 250 pro Tag, ist die Kapazität 1.000 ÷ 250 = 4 Basen.

Basis-ROI prüft sie für jeden Output und jeden Auftrags-Input über 7 Tage, und der niedrigste Wert zählt. Unter 1 stellt eine Basis mehr her oder braucht mehr, als der Markt handelt. Siehe [Basis-ROI](/help/tools_base_roi#metrics).

## Market Maker {#market-maker}

Orders des Spiels selbst, nicht von Spielern, die bestimmte Tier-1-Güter zu festen Preisen kaufen oder verkaufen. Für diese Güter wirkt ihr Preis als Unter- oder Obergrenze.

Spieler berichten von Market Makern bei Gütern wie Agrarprodukten, einfachen Fertigteilen und Verbrauchsgütern und sagen, dass das Spiel ihre Preise schon geändert hat. Handel mit Market Makern zählt im VWAP des Marktplatzes wie jeder andere Handel. PRUNplanner nutzt nicht die eigenen Kauf- und Verkaufspreise der Market Maker, die FIO meldet.

## Material I/O {#material-io}

Was ein Plan oder Imperium pro Material und Tag aufnimmt und abgibt, und die Differenz (Δ).

Du kannst es in ȼ, t, m³ oder als Anteil am Markt anzeigen. Siehe [Ergebnisse](/help/plan_results).

## Optimale Konfiguration {#optimal-setup}

Die Basis mit 500 Fläche, auf der die ROI-Werkzeuge Aufträge vergleichen: Produktionsgebäude plus die Unterkünfte und das Lager, die sie brauchen, mit 5 Experten und dem passenden COGC, auf einem Planeten mit normalen Bedingungen.

Mit dem Profit pro Fläche auf dieser Konfiguration kannst du Gebäude miteinander vergleichen. Siehe [Auftrags-ROI](/help/tools_roi_overview).

## Amortisation {#payback}

Wie viele Tage der tägliche Profit eines Plans braucht, um seinen Bau zu bezahlen: Baukosten ÷ Profit pro Tag. Ein Plan ohne Profit amortisiert sich nie.

Die Amortisation in Basis-ROI kann auch einen Lagerpuffer, das HQ-Upgrade und die Zeit bis zur Ankunft der Experten mitrechnen. Siehe [Basis-ROI](/help/tools_base_roi#metrics).

Ein Beispiel: Ein Plan mit 1.200.000 ȼ Baukosten und 30.000 ȼ Profit pro Tag amortisiert sich in 1.200.000 ÷ 30.000 = 40 Tagen. Die Amortisation in Basis-ROI rechnet ihre Zusatzkosten zu den Baukosten. Mit fester Expertenzahl, ohne Lagerpuffer und mit einem HQ-Upgrade für 300.000 ȼ amortisiert sich dieselbe Basis nach 1.500.000 ÷ 30.000 = 50 Tagen.

## Plan {#plan}

Eine Basis auf einem Planeten, so wie PRUNplanner sie berechnet: Gebäude und Aufträge, Unterkünfte und Lager, Experten, Luxusgüter der Belegschaft, COGC-Programm, Corp.-HQ und Genehmigungen.

Die Zahlen eines Plans hängen vom Imperium ab, in dem du ihn öffnest (Fraktion und Genehmigungen), und von dessen Marktplatz-Präferenz. Siehe [Layout](/help/plan_layout).

## Planetare Projekte {#planetary-projects}

Planetenweite Gebäude: LM (lokaler Markt), COGC, WAR (Lagerhaus), ADM (Verwaltungszentrum) und SHY (Werft). Jedes belegt einen Bauplatz des Planeten.

Die Planetensuche zeigt sie als Infrastruktur und kann danach filtern. Siehe [Planetensuche](/help/planet_search#cogc-and-infrastructure).

## Bauplätze {#plots}

Die Bauplätze eines Planeten. Jede Basis belegt einen, ebenso Corporation-HQs und planetare Projekte.

Freie Bauplätze sind die Bauplätze des Planeten insgesamt minus die Standorte, die keine Geisterplätze sind. Die Planetensuche zeigt sie in ihrer Spalte Bauplätze, so wie FIO den Planeten zuletzt gesehen hat. Siehe [Bauplätze](/help/planet_search#plots).

## POPR {#popr}

Bevölkerungsbericht (Population report): die Zahlen eines Planeten zu seiner Bevölkerung, etwa Arbeiter und freie Arbeiter pro Stufe, und zu seiner Infrastruktur. Das Spiel veröffentlicht ihn wöchentlich.

Das POPR-Werkzeug eines Plans zeigt den neuesten Bericht für seinen Planeten. Siehe [Plan-Werkzeuge](/help/plan_tools).

## Produktionsgebühren {#production-fees}

Eine Gebühr, die der Gouverneur des Planeten pro Fachgebiet und Belegschaftsstufe festlegt und die für jeden Produktionsauftrag auf die Grundzeit des Auftrags gezahlt wird. Schnellere Gebäude führen mehr Aufträge aus und zahlen daher mehr pro Tag.

PRUNplanner rechnet sie pro Tag als die nach der Belegschaft des Gebäudes gewichtete Gebühr × die Effizienz des Gebäudes. Sie zählt in Plänen, Profit-Aufschlüsselung, Imperium, Basis-ROI und Produktionsketten sowie in den COGM. Siehe [Ergebnisse](/help/plan_results).

## Profit {#profit}

Der tägliche Umsatz eines Plans minus seine täglichen Kosten. Umsatz ist, was er verkauft. Kosten sind, was er kauft, plus Verschleiß und Produktionsgebühren.

PRUNplanner bepreist verkaufte Materialien zu Verkaufspreisen und gekaufte Materialien sowie Verbrauchsgüter der Belegschaft zu Kaufpreisen, alle aus der Marktplatz-Präferenz des Imperiums. Der Verschleiß beträgt pro Tag 1 ⁄ 180 der Baukosten der Produktionsgebäude. Siehe [Ergebnisse](/help/plan_results).

## Auftrag {#recipe}

Ein Produktionsschritt eines Gebäudes, bei dem Inputs über eine Grunddauer zu Outputs werden. Ein Gebäude führt seine Aufträge nacheinander aus.

## Reparatur {#repair}

Gebäude verlieren mit der Zeit an Zustand und damit an Effizienz. Eine Reparatur kostet einen Teil der Baumaterialien des Gebäudes, und je länger du wartest, desto teurer wird sie.

PRUNplanner bildet die Reparaturkosten so ab, dass sie jeden Tag bis Tag 180 steigen, an dem sie so viel kosten wie ein neues Gebäude, und die Effizienz in Richtung 33 % fällt. Siehe [FIO Reparieren](/help/fio_repair).

## ROI {#roi}

Kapitalrendite (Return on investment). PRUNplanner zeigt sie als Amortisationstage: Baukosten ÷ Profit pro Tag.

Auftrags-ROI, Ressourcen-ROI und Basis-ROI ordnen Aufträge, Ressourcen und Basen danach. Siehe [Auftrags-ROI](/help/tools_roi_overview).

## Volumenanteil {#share-of-volume}

Was ein Plan oder Imperium pro Tag von einem Material kauft oder verkauft ÷ das, was der Marktplatz davon pro Tag gehandelt hat, im Schnitt über 30 Tage.

Der Plan-Check markiert einen Anteil ab 10 % gelb und ab 50 % rot. Siehe [Markt-Check](/help/plan_check#market-check).

Ein Beispiel: Kauft ein Plan 50 Einheiten pro Tag und hat der Marktplatz in den letzten 30 Tagen 6.000 Einheiten gehandelt, sind das 200 pro Tag, der Anteil ist also 50 ÷ 200 = 25 %, gelb.

## Geteilter Plan {#shared-plan}

Ein Link zu einem deiner Pläne. Jeder, der ihn hat, sieht den Plan und kann Änderungen an seiner eigenen Kopie ausprobieren. Dein Plan ändert sich nie.

Der Link funktioniert nicht mehr, wenn du das Teilen beendest oder den Plan löschst. Siehe [Einen Plan teilen](/help/plan_sharing).

## Spread {#spread}

Der Abstand zwischen Ask und Bid auf einem Marktplatz, als Anteil am Ask: (Ask − Bid) ÷ Ask. Ein großer Spread heißt, dass sofortiges Handeln mehr kostet.

Ein Beispiel: Ein Ask von 100 ȼ und ein Bid von 80 ȼ ergeben einen Spread von (100 − 80) ÷ 100 = 20 %.

Der Plan-Check zeigt den Spread, markiert ihn aber nicht. Siehe [Plan-Check](/help/plan_check#market-check).

## Lager {#storage}

Lagergebäude: STO, STA, STE, STV und STW. Ihre Kapazität an Gewicht und Volumen legt fest, wie viele Tage der täglichen Importe und Exporte der Basis sie fassen können.

Das Lager eines Plans bestimmt seine Besuchsfrequenz. Siehe [Plan-Werkzeuge](/help/plan_tools).

## Versorgungswagen {#supply-cart}

Ein Plan-Werkzeug, das die Verbrauchsgüter und Inputs auflistet, die eine Basis für eine Anzahl Tage braucht (standardmäßig 20), abzüglich dessen, was ihr FIO-Lager enthält.

Du bekommst die Liste als Tabelle oder als XIT-Aktion. XIT Erstversorgung liefert für die erste Versorgung auch die Inputs, die der Plan selbst herstellt. Siehe [Plan-Werkzeuge](/help/plan_tools).

## Dünner Markt {#thin-market}

In Produktionsketten ein gekauftes Material, bei dem die Kette 10 % oder mehr dessen braucht, was der Marktplatz pro Tag handelt, oder das in 30 Tagen nicht gehandelt wurde.

Siehe [Warnungen](/help/tools_production_chain#warnings).

## Ticker {#ticker}

Der Kurzcode eines Materials oder Gebäudes, wie im Spiel: DW für Trinkwasser, PP1 für Fertigteilwerk.

Suche, Filter und XIT-Aktionen nutzen Ticker.

## Universe {#universe}

Der Durchschnitt von PRUNplanner über die vier Marktplätze AI1, CI1, IC1 und NC1. Es ist kein Ort, an dem man handeln kann.

PRUNplanner nutzt den Universe VWAP 30D für jeden Preis, den keine Regel deiner Marktplatz-Präferenz abdeckt, und für jeden Preis eines Imperiums ohne Präferenz. Siehe [So wird ein Preis gefunden](/help/exchanges#how-a-price-is-found).

## Unterhalt {#upkeep}

Was es kostet, die Dinge am Laufen zu halten. In Produktionsketten sind das die täglichen Kosten der Verbrauchsgüter der Belegschaft. Im Instandhaltungskosten-Rechner sind es die Materialien, die planetare Gebäude verbrauchen, um den Bedarf der Bevölkerung zu decken.

Die Bedürfnisse der Bevölkerung sind Sicherheit, Gesundheit, Komfort, Kultur und Bildung. Siehe [Instandhaltungskosten](/help/tools_upkeep_price_calculator).

## Besuchsfrequenz {#visitation}

Ein Plan-Werkzeug, das zeigt, wie viele Tage es dauert, bis das Lager der Basis mit dem voll ist, was sie pro Tag importiert und exportiert. So oft muss ein Schiff vorbeikommen.

Du kannst Materialien aus der Berechnung ausnehmen. Siehe [Plan-Werkzeuge](/help/plan_tools).

## VWAP {#vwap}

Volumengewichteter Durchschnittspreis: die für ein Material auf einem Marktplatz gehandelten Credits ÷ die gehandelten Einheiten, über die letzten 7 oder 30 Tage.

Ein Beispiel: Handelt ein Marktplatz an einem Tag 100 Einheiten zu 10 ȼ (1.000 ȼ) und an einem anderen 300 Einheiten zu 12 ȼ (3.600 ȼ), ist der VWAP über diese Tage 4.600 ÷ 400 = 11,5 ȼ. Der umsatzstärkere Tag wiegt mehr, deshalb liegt er über dem einfachen Durchschnitt von 11 ȼ.

Gab es in den letzten 7 Tagen keinen Handel, nimmt VWAP 7D den Preis des letzten Handelstags, solange dieser Tag in den letzten 30 Tagen liegt. Nach 30 Tagen ohne Handel sind beide 0. Siehe [Preisbasis](/help/exchanges#price-basis-vwap-ask-and-bid).

Ein VWAP von 0 heißt, dass das Material auf diesem Marktplatz seit 30 Tagen nicht gehandelt wurde. Ein Plan, der diesen Preis nutzt, rechnet es mit 0 ȼ, und der Plan-Check markiert es als „Kein Preis“. Siehe [Plan-Check](/help/plan_check#flags).

## Belegschaft {#workforce}

Die Arbeiter, die Gebäude brauchen, in fünf Stufen: Pioniere, Siedler, Techniker, Ingenieure und Wissenschaftler. Unterkünfte bringen sie unter, und sie verbrauchen jeden Tag Nahrung, Wasser und andere Güter.

Untergebrachte Arbeiter ohne Luxusgüter arbeiten mit etwa 79 % Effizienz. Zu wenig Unterkünfte senken sie anteilig. Siehe [Basis einrichten](/help/plan_base).

## XIT {#xit}

Ein Aktionspaket, das PRUNplanner erstellt, etwa CX-Käufe, Materialtransfers oder Reparaturen, damit Refined PrUn es im Spiel als XIT ACT ausführt. PRUNplanner handelt nie für dich.

FIO Verbrauch, FIO Reparieren und die Wagen der Pläne erstellen XIT-Aktionen. Nach einem XIT-Reparaturflug führst du im Spiel BRA aus, den Befehl, der alle Gebäude einer Basis repariert. Siehe [FIO Reparieren](/help/fio_repair#prices).
