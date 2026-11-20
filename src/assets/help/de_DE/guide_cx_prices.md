Jeder Profit, alle Kosten und jede Amortisation in PRUNplanner hängen von den Preisen ab, die du wählst. In etwa 15 Minuten führt dich diese Anleitung durch deine [[exchange-preference|Marktplatz-Präferenz]]. Am Ende hast du:

- einen Heimat-Marktplatz und eine Preisbasis für alle deine Planeten,
- getrennte Regeln für Kauf und Verkauf, falls du auf verschiedenen Marktplätzen kaufst und verkaufst,
- Ausnahmen für einzelne Planeten und [[fixed-price|Festpreise]] für das, was du selbst herstellst,
- eine Übersicht über jeden Preis, den deine Pläne nutzen, und die Regel dahinter.

Sie ist für alle, deren Pläne dazu passen sollen, wie sie wirklich handeln. Du brauchst ein Konto. Die Seiten, die am Ende jedes Schritts verlinkt sind, gehen tiefer.

## 1. Öffne deine Marktplatz-Präferenz {#step-1}

Öffne [Marktplätze](/exchanges). Die Seite zeigt jeweils eine Präferenz, und **Präferenz wechseln** wählt eine andere. Unter der Auswahl siehst du, welche [[empire|Imperien]] sie nutzen.

![Marktplätze: links Präferenz wechseln und die Imperien, die sie nutzen, rechts die Übersicht der Preise, die deine Pläne nutzen](/images/help/guides/cx-prices-overview.webp)

Ein neues Konto hat „My Exchange Preference“, die „My Empire“ nutzt, eingestellt auf **Universe · VWAP 30D**. Ein [[plan|Plan]] hat keine eigenen Preise. Er nutzt die Präferenz des Imperiums, mit dem er rechnet. Jedes Imperium nutzt eine Präferenz, und mehrere Imperien können sich eine teilen. Um einem Imperium eine andere Präferenz zu geben, wähl sie in der Spalte CX der **Imperium-Konfiguration** in der [Verwaltung](/manage).

Mehr dazu: [Marktplatz-Präferenzen](/help/exchanges#exchange-preferences), [Verwaltung](/help/management#cx-configuration).

## 2. Setz deinen Heimat-Marktplatz mit einer Voreinstellung {#step-2}

1. Öffne **Alle Planeten** in der Liste links. Seine Regeln gelten für jeden Planeten, der keine eigenen hat.
2. Wähl im Feld **Marktplatzpreis** deinen Heimat-Marktplatz: AI1, CI1, IC1 oder NC1.
3. Klick auf eine Voreinstellung:
   - **Durchschnitt · VWAP 30D** kauft und verkauft zum 30-Tage-[[vwap|VWAP]] dieses Marktplatzes, einem stabilen Durchschnitt dessen, was gehandelt wurde. [Deine erste Basis](/help/guide_first_base#step-2) rechnet ein VWAP-Beispiel durch.
   - **Sofort handeln · Kauf zum Ask, Verkauf zum Bid** kauft zum günstigsten Angebot und verkauft an den höchsten Käufer, und zwar jetzt. Das ist der Preis, wenn du sofort handelst.

![Alle Planeten unter Marktplätze: das Feld Marktplatzpreis mit den Voreinstellungen und darunter die Tabelle Festpreise](/images/help/guides/cx-prices-rule.webp)

Das Feld sagt dir, auf welchen Marktplatz die Voreinstellungen wirken („Voreinstellungen für NC1:“).

Mehr: [Voreinstellungen](/help/exchanges#presets).

## 3. Wähl Kauf, Verkauf oder beides und die Preisbasis {#step-3}

Im Feld **Marktplatzpreis**:

- **Gleich für Kauf und Verkauf** nutzt einen Marktplatz und eine Basis für beide Seiten.
- **Kauf und Verkauf getrennt** gibt jeder Seite ihren eigenen Marktplatz und ihre eigene Basis, zum Beispiel Kauf auf CI1 und Verkauf auf NC1. Eine Seite, die **Nicht gesetzt** bleibt, fällt zur nächsten Regel durch, bis hinunter zu Universe · VWAP 30D.

| Basis             | Nimm sie, wenn                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| VWAP 7D, VWAP 30D | Du einen stabilen Durchschnitt willst. 7D folgt jüngsten Bewegungen schneller. |
| Ask               | Du sofort kaufst, zum günstigsten Angebot.                                     |
| Bid               | Du sofort verkaufst, an den höchsten Käufer.                                   |

[[universe|Universe]] hat nur die beiden VWAPs.

> [!warning]
> Hat der gewählte Marktplatz keinen Preis für ein Material (niemand bietet es an, niemand bietet darauf, oder beim VWAP gab es dort in den letzten 30 Tagen keinen Handel), zählt es als 0 ȼ. PRUNplanner weicht nicht auf einen anderen Marktplatz aus. Die Seite zeigt solche Preise bernsteinfarben und listet sie in ihren Hinweisen auf.
>
> Ohne Handel in den letzten 7 Tagen nutzt VWAP 7D den Preis des letzten Tages innerhalb dieser 30 Tage, an dem das Material gehandelt wurde. Ist ein bernsteinfarbenes Material eins, das deine Pläne kaufen oder verkaufen, kannst du für den Planeten, der es nutzt, eine Planetenregel auf einem anderen Marktplatz setzen (Schritt 4) oder ihm einen Festpreis geben (Schritt 5).

Details: [Preisbasis](/help/exchanges#price-basis-vwap-ask-and-bid), [Kauf, Verkauf oder beides](/help/exchanges#buy-sell-or-both).

## 4. Füg Ausnahmen für einzelne Planeten hinzu {#step-4}

Verkauft eine Basis woanders, etwa weil sie näher an einem anderen Marktplatz liegt, gib ihrem Planeten eine eigene Regel.

1. Öffne den Planeten in der Liste (unter **Mit Regeln für alle Planeten**).
2. Stell in seinem Feld **Marktplatzpreis** von **Regel für alle Planeten nutzen** auf **Gleich für Kauf und Verkauf** oder **Kauf und Verkauf getrennt** um und setz die Regel.

Der Planet wandert dann zu **Planeten mit eigenen Regeln**. Seine Regel schlägt die Regel für alle Planeten, mit einer Ausnahme: Festpreise für alle Planeten gewinnen weiterhin. Die Preisliste unter den Regeln zeigt, was die Pläne dieses Planeten kaufen und verkaufen und zu welchem Preis.

Mehr dazu: [Ausnahmen für Planeten](/help/exchanges#planet-exceptions), [Wie ein Preis gefunden wird](/help/exchanges#how-a-price-is-found).

## 5. Leg Festpreise für das fest, was du selbst herstellst {#step-5}

Ein Material, das du in einer Basis herstellst und in einer anderen verbrauchst, sollte nicht den Marktpreis kosten. Es kostet, was du für seine Herstellung zahlst, deinen [[cogm|COGM]].

- Öffne in einem Plan **COGM** an dem Auftrag, der das Material herstellt, und klick auf **Als Kaufpreis auf allen Planeten verwenden** (angeboten, solange das Material keinen Festpreis hat), dann auf **Änderungen speichern**. Das setzt einen festen Kaufpreis zum COGM _dieses Plans_ für jeden Planeten der Präferenz.
- Oder füg unter Marktplätze bei **Alle Planeten** das Material mit **Material hinzufügen** zu den **Festpreise** hinzu und tipp einen Preis ein. Für Materialien, die deine Pläne herstellen, zeigt die Spalte **COGM in deinen Plänen** den niedrigsten COGM, und **Nutzen** übernimmt ihn in den Kaufpreis.

Lass eine Seite leer, um für sie den Marktplatzpreis zu behalten.

> [!tip]
> Halt Festpreise mit deiner Produktion im Gleichschritt. Die Übersicht weist darauf hin, wenn ein fester Kaufpreis mehr als 2 % vom niedrigsten COGM abweicht, und der COGM-Dialog bietet an, ihn zu aktualisieren.
>
> Ein Beispiel: Dein niedrigster COGM für RAT ist 95 ȼ und sein fester Kaufpreis 100 ȼ. Das sind 5 ÷ 95 ≈ 5,3 % Abweichung, also weist die Übersicht darauf hin. Bei 96 ȼ wären es 1 ÷ 95 ≈ 1,1 %, und es gibt keinen Hinweis.

Mehr: [Festpreise und COGM](/help/exchanges#fixed-prices-and-cogm), [COGM als Kaufpreis nutzen](/help/plan_tools#cogm-buy-price).

## 6. Speichern und das Ergebnis prüfen {#step-6}

1. Drück **Änderungen speichern** in der Leiste unten. Deine Pläne nutzen die neuen Regeln erst, wenn du speicherst.
2. Öffne die **Übersicht**. Sie listet jedes Material, das deine Pläne kaufen oder verkaufen, seinen Preis und die Regel dahinter. Lies zuerst die Hinweise oben, dort stehen die Warnungen zuerst.
3. Öffne einen Plan. **Preise** unter **Imperium & Preise** nennt die Präferenz. Öffne dann den **Plan-Check**: **Markt-Check** prüft jedes Material auf dem Marktplatz, den deine Präferenz nutzt, und **Zu echten Preisen** zeigt den Profit zu den heutigen Ask- und Bid-Preisen.

Du bist fertig, wenn die Materialien, mit denen du handelst, keine bernsteinfarbenen 0-ȼ-Preise mehr zeigen und der Profit zu echten Preisen einer ist, mit dem du leben kannst.

Details: [Übersicht](/help/exchanges#overview), [Plan-Check](/help/plan_check#market-check).

## Weiter {#next}

- [Von der Kette zu Basen](/help/guide_chain_to_bases): eine ganze Kette zu diesen Preisen planen.
- [Zum Imperium wachsen](/help/guide_empire): alle deine Basen zusammen prüfen.
