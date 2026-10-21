Dieses System bietet eine Überwachung der Handelskammern (CX) nahezu in Echtzeit über FIO-API-Webhooks, die PRUNplanner verarbeitet und an deinen Browser streamt. Es ist dafür gedacht, dass du Marktbewegungen beobachten und Alarme erstellen kannst, um automatisiert auf Änderungen zu reagieren.

# Funktionsweise des Datenstroms

Die FIO-API erhält Daten aus Prosperous Universe, sobald ein Nutzer eine Änderung sieht, und sendet sie alle 30 Sekunden gebündelt an PRUNplanner. PRUNplanner selbst speichert die letzten 500 Datenpunkte, damit du beim Öffnen dieser Ansicht nicht bei null anfängst.

Bitte beachte: Es gibt nicht für alle verfügbaren Materialien und Marktplätze Datenpunkte, sondern nur für die, bei denen sich etwas geändert hat und ein Nutzer sie im Spiel aufgerufen hat. Die Live-Übersicht baut sich laufend weiter auf, je mehr Daten empfangen werden.

# Live-Ansicht

Die rechte Seite dieser Ansicht zeigt die empfangenen Datenpunkte nach Kombination aus Material-Ticker und Marktplatz und zeigt dir den aktuellen Handelspreis, Bid- und Ask-Preise, den Spread zwischen ihnen sowie die aktuell aktiven Kauf- und Verkaufsvolumen.

Preise haben einen zusätzlichen Indikator, der die letzte Änderung in Prozent zeigt.

# Alarm-Engine

Dieses System nutzt eine rekursive Logik-Engine, um eingehende Daten mit zuvor empfangenen Daten und deiner eigenen Alarmkonfiguration abzugleichen.

## Einrichtung

### Logische Operatoren

Du kannst Bedingungen verketten, um Rauschen zu reduzieren:

- **AND**: Alle Bedingungen müssen erfüllt sein (etwa Preis > 100 **AND** Volumen != vorheriges Volumen)
- **OR**: Eine einzige erfüllte Bedingung löst den Alarm aus

### Vergleiche:

- **GT**: Größer als
- **LT**: Kleiner als
- **EQ**: Gleich
- **NEQ**: Ungleich

## Vergleichsziele:

- **Wert**: Vergleicht ein Feld mit einer festen Zahl / einem festen Text.
  - Harte Preisuntergrenzen oder das Durchbrechen von Obergrenzen, Filtern nach bestimmten Materialien oder Marktplätzen.
- **Vorheriger Wert**: Vergleicht die aktuellen Daten mit den unmittelbar vorherigen Daten.
  - Erkennen von „Flash“-Änderungen oder plötzlichen Spitzen.
- **Unterschied %**: Vergleicht mit dem letzten Tick mit einer prozentualen Abweichung.
  - Überwachen der Volatilität (etwa „Alarm, wenn die Preise um > 2% steigen“). Du kannst eine OR-Bedingung mit GT / LT einrichten, die positive und negative Änderungen kombiniert.

## Alarme einrichten

- Bereich festlegen: Wähle ein Feld
- Schweregrad wählen: Niedrig, Mittel, Hoch
- Logik konfigurieren: Nutze Operatoren, Vergleiche und Vergleichsziele
- Ändere den Namen des Alarms
- Aktiviere den Detektor
- Speichere
