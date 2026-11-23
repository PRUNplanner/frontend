PRUNplanner betreibt einen MCP-Server (Model Context Protocol), sodass ein KI-Assistent wie Claude, ChatGPT/Codex, Copilot oder Cursor mit deinen Plänen und Imperien arbeiten kann. Dein Assistent liest sie und berechnet sie mit PRUNplanners eigener Plan-Engine und deinen Handelskammer-Präferenzen, sodass seine Zahlen mit dem übereinstimmen, was die Planseite zeigt. Du fragst in normalen Worten, und der Assistent wählt die passenden Werkzeuge.

Du brauchst nur einen [API-Schlüssel](/help/api_keys) und ein paar Zeilen Einrichtung in deinem Assistenten. Die Seite [API-Schlüssel](/apikey) zeigt die Serveradresse und bietet den Download für Claude Desktop.

## Was du fragen kannst {#what-it-does}

Der Assistent hat eine Reihe von Werkzeugen, unten danach gruppiert, wofür du sie nutzen würdest. Du rufst sie nie selbst auf; ihre Namen stehen hier, damit du sie wiedererkennst, wenn dein Assistent zeigt, welches Werkzeug er nutzt.

_Deine Pläne und Imperien lesen._ „Welche meiner Basen verdient am meisten pro Tag?“ oder „Was importiert mein Imperium jeden Tag?“
`list_empires`, `list_plans`, `get_plan`, `get_empire`, `compare_plans`, `list_plan_versions`, `diff_plan_versions`

_Was-wäre-wenn, ohne etwas zu speichern._ „Was wäre, wenn meine Farmbasis 5 Experten hätte?“ oder „Was würde ein neuer Plan mit 4 FRM auf diesem Planeten verdienen?“
`calculate_plan_variant`, `calculate_new_plan`, `calculate_empire_variant`

_Alternativen._ „Welcher Auftrag in meinem FP bringt am meisten?“ oder „Soll ich die Inputs meines DW selbst herstellen oder kaufen?“
`rank_recipes`, `get_production_cost`, `check_make_or_buy`, `lookup_material`

_Wo bauen._ „Wo sollte ich ALO in der Nähe von Moria abbauen?“ oder „Welcher dieser Planeten eignet sich am besten für eine Schmelzbasis?“
`find_planets`, `get_planet`, `get_distances`, `suggest_base`, `rank_bases`

_Ist der Preis echt?_ „Ist der Markt für meine Outputs tief genug?“ oder „Wie hat sich der Preis von RAT diesen Monat bewegt?“
`check_plan_market`, `get_material_prices`, `get_market_report`, `get_price_history`

_Übergabe ans Spiel._ „Gib mir die [[xit|XIT]]-Aktion, um meine Basis für 7 Tage zu versorgen.“
`get_xit_action`

_Geteilte Pläne._ „Sieh dir diesen geteilten Plan an und vergleiche ihn mit meinem.“
`get_shared_plan`

_Änderungen_, nur mit einem Schlüssel mit Lesen & Schreiben (siehe [Welcher Schlüssel](#keys)). „Speichere diese Variante als meinen Plan.“ oder „Teile meinen Farmplan.“
`save_plan`, `restore_plan_version`, `save_empire`, `save_cx_preference`, `share_plan`, `copy_shared_plan`, `set_preferences`, `delete`

Mengen und Geldbeträge in den Antworten gelten pro Tag, sofern der Assistent nichts anderes sagt. Die Preise folgen der [[cx|CX]]-Präferenz des Plans; ohne eine den 30-Tage-[[vwap|VWAP]] des Universe.

## Fertige Prompts {#prompts}

Der Server bietet außerdem vier fertige Prompts, jeder eine vollständige Anfrage für eine häufige Aufgabe. Clients, die MCP-Prompts unterstützen, bieten sie als Befehle an; Claude Code zum Beispiel listet sie, wenn du `/` tippst:

- `review_plan`, _Einen Plan prüfen_: probiert jeden Hebel eines Plans aus (Experten, Luxusgüter, COGC, Unterkünfte, Lager, andere Aufträge), ohne seine Gebäude zu ändern, und zeigt, was jeder pro Tag wert ist.
- `review_empire`, _Mein Imperium prüfen_: was verdient, was schwach oder riskant ist und wo das Imperium von dünnen Märkten abhängt.
- `vertical_chain`, _Eine vertikale Kette planen_: die Produktionskette für ein Material bei einer Tagesrate, mit den richtigen Verhältnissen, aufgeteilt auf Basen in der Nähe eines Marktplatzes.
- `load_lists`, _Ladelisten für meine Basen_: Versorgungs-Ladelisten und XIT-Pakete für eine Gruppe von Basen im schnellsten Besuchsintervall der Gruppe.

Alle enden gleich: Der Assistent zeigt die Optionen mit ihren Zahlen, lässt dich wählen und speichert nichts, solange du es nicht sagst.

## Kurze Antworten zuerst {#summary}

`get_plan`, `get_shared_plan`, `calculate_new_plan`, `get_planet` und `find_planets` antworten zuerst mit den Kennzahlen. Bei einem Plan sind das das Geld, die Gebäude mit ihren Aufträgen, die Netto-Materialflüsse, Belegschaft, Fläche und Versand; die Wirtschaftlichkeit pro Auftrag, Preise pro Material und Baumaterialien bleiben weg. Das hält die Antworten schnell und spart Kontext deines Assistenten. Brauchst du alles, frag nach „der vollständigen Aufschlüsselung“, und der Assistent fragt noch einmal mit allen Details.

## Welcher Schlüssel {#keys}

Der Server nutzt deinen PRUNplanner-API-Schlüssel; eine eigene Anmeldung hat er nicht.

- Ein Schlüssel mit **Nur lesen** ist der, den wir empfehlen. Der Assistent liest und berechnet alles oben Genannte und kann nichts ändern.
- Ein Schlüssel mit **Lesen & Schreiben** lässt ihn außerdem Pläne, Imperien und Handelskammer-Präferenzen speichern, Pläne teilen und kopieren, deine Standards ändern und löschen. Jedes Speichern eines Plans ist eine neue Version, die du wiederherstellen kannst. Vor einem Löschen zeigt der Assistent, was wegfallen würde, und fragt dich zuerst, und vor jedem Speichern sagt er, was er ändern wird.
- Mit einem Schlüssel mit Nur lesen schlägt eine Änderung fehl, mit einer Meldung, dass der Schlüssel nur lesen darf und wie du einen Schlüssel mit Lesen & Schreiben bekommst. Es wird nichts geändert.

Ein Schlüssel in einer Konfigurationsdatei liegt als Klartext auf deinem Computer. Nutze einen Schlüssel pro Assistent, nach ihm benannt, damit du einen widerrufen kannst, ohne die anderen anzufassen.

## Einrichtung {#setup}

Jeder Client braucht dieselben zwei Dinge:

- die Server-URL `https://mcp.prunplanner.org/mcp` (Streamable HTTP),
- den Header `Authorization: Api-Key <YOUR_KEY>`.

Ersetze unten `<YOUR_KEY>` durch deinen Schlüssel, den vollständigen Text, der beim Erstellen einmal angezeigt wird.

### Claude Desktop {#claude-desktop}

Am einfachsten geht es mit der PRUNplanner-Erweiterung:

1. Klick auf der Seite [API-Schlüssel](/apikey) auf **Download für Claude Desktop**. Du bekommst `prunplanner.mcpb`.
2. Öffne in Claude Desktop Settings → Extensions, zieh die Datei hinein und klick dann auf Install.
3. Füge deinen Schlüssel in das Feld API Key der Erweiterung ein. Claude Desktop bewahrt ihn im Schlüsselbund deines Systems auf.

Du musst bei Claude angemeldet sein, und bei einem Organisationskonto können Erweiterungen abgeschaltet sein.

> Unter Windows übergibt Claude Desktop einer Erweiterung eine verborgene Einstellung manchmal als `__encrypted__…` statt des Schlüssels (ein offenes Problem in Claude Desktop). Antwortet dein Assistent mit einem Fehler zu einem ungültigen Schlüssel, obwohl der Schlüssel stimmt, entferne die Erweiterung und nutze stattdessen die Konfigurationsdatei unten.

_Ausweichweg: die Konfigurationsdatei._ Dafür brauchst du Node.js. Öffne Settings → Developer → Edit Config, das öffnet `claude_desktop_config.json`, und füge hinzu:

```json
{
  "mcpServers": {
    "prunplanner": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.prunplanner.org/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": { "AUTH_HEADER": "Api-Key <YOUR_KEY>" }
    }
  }
}
```

Schreib in `args` kein Leerzeichen nach `Authorization:`; der Schlüssel kommt in `env`, wo Leerzeichen kein Problem sind. Beende Claude Desktop dann vollständig und starte es neu.

### claude.ai im Web und mobil {#claude-web}

Ein benutzerdefinierter Connector auf claude.ai kann unseren Header nur senden, wo die Beta „Request headers“ verfügbar ist, und die erreicht bisher nur eine begrenzte Zahl von Organisationen. Siehst du beim Hinzufügen eines benutzerdefinierten Connectors einen Abschnitt Request headers, wähle keine Anmeldung und füge den Header `Authorization` mit dem Wert `Api-Key <YOUR_KEY>` hinzu. Siehst du ihn nicht, nutze Claude Desktop: Der Connector würde nach einer Anmeldung fragen, die PRUNplanner nicht anbietet.

### Claude Code {#claude-code}

Ein Befehl fügt den Server für alle deine Projekte hinzu:

```bash
claude mcp add --transport http prunplanner https://mcp.prunplanner.org/mcp --header "Authorization: Api-Key <YOUR_KEY>" --scope user
```

Starte eine neue Sitzung oder prüfe es mit `/mcp`. Nutze `--scope project` nicht mit einem Schlüssel: Es schreibt den Schlüssel in `.mcp.json`, eine Datei, die zum Committen gedacht ist. Die Claude-Code-Erweiterung für VS Code nutzt dieselbe Einrichtung.

### ChatGPT-Desktop-App und Codex {#codex}

Die ChatGPT-Desktop-App, die Codex CLI und die Codex-IDE-Erweiterung teilen sich eine Datei: `~/.codex/config.toml` (unter Windows `%USERPROFILE%\.codex\config.toml`). Füge hinzu:

```toml
[mcp_servers.prunplanner]
url = "https://mcp.prunplanner.org/mcp"
http_headers = { "Authorization" = "Api-Key <YOUR_KEY>" }
```

Starte die App dann neu. Um den Schlüssel aus der Datei herauszuhalten, nutze stattdessen `env_http_headers = { "Authorization" = "PRUNPLANNER_AUTH" }` und setze die Umgebungsvariable `PRUNPLANNER_AUTH` auf `Api-Key <YOUR_KEY>`. Nutze nicht `bearer_token_env_var`: Das sendet `Bearer`, was PRUNplanner nicht akzeptiert.

ChatGPT im Web kann sich nicht verbinden: Es meldet sich bei Servern nur mit OAuth oder ohne Authentifizierung an und kann keinen API-Schlüssel senden.

### VS Code mit Copilot {#vscode}

Führe den Befehl MCP: Open User Configuration aus und füge den Server hinzu. VS Code fragt beim ersten Start des Servers nach dem Schlüssel:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "prunplanner-key",
      "description": "PRUNplanner API key",
      "password": true
    }
  ],
  "servers": {
    "prunplanner": {
      "type": "http",
      "url": "https://mcp.prunplanner.org/mcp",
      "headers": { "Authorization": "Api-Key ${input:prunplanner-key}" }
    }
  }
}
```

VS Code stellt auf ein neueres Format um (`.mcp.json` in einem Workspace oder `~/.copilot/mcp-config.json`), das keine Schlüsselabfrage hat. Nutze dort `mcpServers` statt `servers`, dieselben `type`, `url` und `headers` und `"Authorization": "Api-Key ${PRUNPLANNER_KEY}"` mit dem Schlüssel in der Umgebungsvariable `PRUNPLANNER_KEY`.

### Cursor {#cursor}

Füge es zu `~/.cursor/mcp.json` (alle Projekte) oder `.cursor/mcp.json` (ein Projekt) hinzu und schalte den Server dann in den MCP-Einstellungen von Cursor ein:

```json
{
  "mcpServers": {
    "prunplanner": {
      "url": "https://mcp.prunplanner.org/mcp",
      "headers": { "Authorization": "Api-Key <YOUR_KEY>" }
    }
  }
}
```

`${env:PRUNPLANNER_KEY}` anstelle von `<YOUR_KEY>` liest den Schlüssel aus einer Umgebungsvariable.

### Hermes Agent {#hermes}

Leg den Schlüssel in `~/.hermes/.env` als `PRUNPLANNER_KEY=<YOUR_KEY>` ab und füge dann zu `~/.hermes/config.yaml` hinzu:

```yaml
mcp_servers:
  prunplanner:
    url: "https://mcp.prunplanner.org/mcp"
    headers:
      Authorization: "Api-Key ${PRUNPLANNER_KEY}"
```

Lade neu mit `/reload-mcp`.

### Antigravity (Gemini) {#antigravity}

Antigravity, die IDE und CLI, die Gemini CLI abgelöst hat, liest `~/.gemini/config/mcp_config.json`. Achte auf den Schlüsselnamen `serverUrl`:

```json
{
  "mcpServers": {
    "prunplanner": {
      "serverUrl": "https://mcp.prunplanner.org/mcp",
      "headers": { "Authorization": "Api-Key <YOUR_KEY>" }
    }
  }
}
```

Lade die Server mit `/mcp` neu oder starte neu.

### Zed, Cline, LM Studio und Open WebUI {#other-clients}

- Zed: Settings → AI → MCP Servers → Add Remote Server, oder `context_servers` in der Einstellungsdatei, mit der URL und dem Header.
- Cline: ein `mcpServers`-Eintrag mit `"type": "streamableHttp"`, `url` und `headers`. Ohne den `type` versucht Cline ein älteres Protokoll.
- LM Studio: Program → Install → Edit mcp.json, ein Eintrag mit `url` und `headers`.
- Open WebUI (0.6.31 oder neuer): Admin Settings → MCP, Typ Streamable HTTP, der Header als Headers JSON. Wähle nicht Bearer.

### Jeder andere Client {#any-client}

Gib ihm die Server-URL und den Header vom Anfang dieses Abschnitts. Ein Client, der nur lokale Server startet, kann `mcp-remote` nutzen wie der Ausweichweg für Claude Desktop oben.

Um einen Schlüssel für sich allein zu testen, listet MCP Inspector die Werkzeuge, die er erreicht:

```bash
npx @modelcontextprotocol/inspector --cli https://mcp.prunplanner.org/mcp --transport http --method tools/list --header "Authorization: Api-Key <YOUR_KEY>"
```

## Prüfen, ob es funktioniert {#check}

Frag deinen Assistenten „Liste meine Imperien auf.“ Er sollte deine Imperien nennen und sagen, welchen Zugriff der Schlüssel hat. Wenn nicht:

- _Ungültiger oder widerrufener Schlüssel_ (401): Der Schlüssel ist falsch eingegeben, widerrufen oder funktioniert nicht mehr, weil du dein Passwort geändert hast (siehe [Gültigkeit](/help/api_keys#validity)). Erstelle einen neuen Schlüssel und ersetze ihn in der Einrichtung.
- _Der Schlüssel ist schreibgeschützt_: Du hast mit einem Schlüssel mit Nur lesen um eine Änderung gebeten. Es wurde nichts geändert; nutze einen Schlüssel mit Lesen & Schreiben, wenn der Assistent speichern soll.
- _Zu viele Anfragen_ (429): Der Server nimmt 10 Anfragen pro Sekunde und IP-Adresse an, mit Spitzen bis 60, und das übliche Limit deines Schlüssels von 240 pro Minute gilt ebenfalls (siehe [Rate-Limits](/help/api_keys#rate-limits)). Eine Frage kann mehrere Anfragen auslösen, und sie teilen sich dieses Limit mit deinen Tabellen und Skripten. Warte kurz und frag noch einmal.
- _PRUNplanners API ist nicht erreichbar_: Der Server konnte PRUNplanners API nicht erreichen. Versuch es in ein paar Minuten noch einmal.
- _Der Client verlangt eine Anmeldung oder zeigt OAuth_: Der Client kann den Header nicht senden. Sieh in seinem Abschnitt oben nach; ChatGPT im Web und claude.ai ohne die Beta können sich nicht verbinden.

## Datenschutz {#privacy}

- Der Anbieter deines Assistenten (Anthropic, OpenAI, GitHub und so weiter) sieht, was die Werkzeuge zurückgeben: deine Pläne, Imperien und Preise. Dafür gelten seine Bedingungen.
- Nichts erreicht das Spiel. Der Assistent kann in Prosperous Universe nicht handeln; XIT-Aktionen sind Text, den du selbst einfügst.
- Pläne, die andere Spieler teilen, werden als Daten behandelt. Der Assistent ist angewiesen, niemals Anweisungen zu folgen, die in einen Plan- oder Imperiumsnamen geschrieben sind.
- Widerrufe den Schlüssel auf der Seite [API-Schlüssel](/apikey), um den Assistenten sofort abzuschneiden.
- Für jeden Werkzeugaufruf protokolliert PRUNplanner den Namen des Werkzeugs, den Namen des Clients, ob es geklappt hat, wie lange es gedauert hat und das Präfix deines Schlüssels (der Teil vor dem Punkt, der nicht geheim ist). Den Schlüssel selbst, deine Frage oder die Antwort protokolliert es nie.
- Der Server behält keine Kopie deiner Daten. Jede Anfrage liest sie mit deinem Schlüssel und vergisst sie danach; nur öffentliche Spieldaten (Materialien, Aufträge, Gebäude, Planeten, Preise) werden zwischengespeichert, für alle gemeinsam.
