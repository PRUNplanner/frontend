PRUNplanner runs an MCP server (Model Context Protocol), so an AI assistant such as Claude, ChatGPT/Codex, Copilot or Cursor can work with your plans and empires. Your assistant reads them and calculates them with PRUNplanner's own plan engine and your CX preferences, so its numbers match what the plan page shows. You ask in plain words; the assistant picks the right tools.

All you need is an [API key](/help/api_keys) and a few lines of setup in your assistant. The [API Keys](/apikey) page shows the server address and has the download for Claude Desktop.

## What You Can Ask {#what-it-does}

The assistant has a set of tools, grouped below by what you'd use them for. You never call them yourself; their names are here so you recognise them when your assistant shows which tool it uses.

*Read your plans and empires.* "Which of my bases earns the most per day?" or "What does my empire import every day?"
`list_empires`, `list_plans`, `get_plan`, `get_empire`, `compare_plans`, `list_plan_versions`, `diff_plan_versions`

*What-ifs, without saving anything.* "What if my farm base had 5 experts?" or "What would a new plan with 4 FRM on this planet earn?"
`calculate_plan_variant`, `calculate_new_plan`, `calculate_empire_variant`

*Alternatives.* "Which recipe in my FP makes the most?" or "Should I make or buy the inputs of my DW?"
`rank_recipes`, `get_production_cost`, `check_make_or_buy`, `lookup_material`

*Where to build.* "Where should I extract ALO near Moria?" or "Which of these planets suits a smelting base best?"
`find_planets`, `get_planet`, `get_distances`, `suggest_base`, `rank_bases`

*Is the price real?* "Is the market for my outputs deep enough?" or "How did the price of RAT move this month?"
`check_plan_market`, `get_material_prices`, `get_market_report`, `get_price_history`

*Hand-off to the game.* "Give me the [[xit|XIT]] action to supply my base for 7 days."
`get_xit_action`

*Shared plans.* "Look at this shared plan and compare it with mine."
`get_shared_plan`

*Changes*, with a Read & write key only (see [Which key](#keys)). "Save this variant as my plan." or "Share my farm plan."
`save_plan`, `restore_plan_version`, `save_empire`, `save_cx_preference`, `share_plan`, `copy_shared_plan`, `set_preferences`, `delete`

Amounts and money in the answers are per day unless the assistant says otherwise. Prices follow the plan's [[cx|CX]] preference; without one, the Universe 30-day [[vwap|VWAP]].

## Ready-Made Prompts {#prompts}

The server also offers four ready-made prompts, each a complete request for a common job. Clients that support MCP prompts offer them as commands; Claude Code, for example, lists them when you type `/`:

- `review_plan`, *Review a plan*: tries every lever of one plan (experts, luxuries, COGC, habitation, storage, other recipes) without changing its buildings, and shows what each is worth per day.
- `review_empire`, *Review my empire*: what earns, what is weak or risky, and where the empire depends on thin markets.
- `vertical_chain`, *Plan a vertical chain*: the production chain for a material at a daily rate, with the right ratios, split into bases near an exchange.
- `load_lists`, *Load lists for my bases*: supply load lists and XIT packages for a group of bases at the group's fastest visit interval.

Each one ends the same way: the assistant shows the options with their numbers and lets you choose, and saves nothing unless you say so.

## Short Answers First {#summary}

`get_plan`, `get_shared_plan`, `calculate_new_plan`, `get_planet` and `find_planets` answer with the key figures first. For a plan that is the money, buildings with their recipes, the net material flows, workforce, area and shipping; per-order economics, prices per material and construction materials are left out. That keeps answers quick and saves your assistant's context. When you need everything, ask for "the full breakdown" and the assistant asks again with the full detail.

## Which Key {#keys}

The server uses your PRUNplanner API key; it has no sign-in of its own.

- A **Read-only** key is the one we recommend. The assistant reads and calculates everything above, and can't change anything.
- A **Read & write** key also lets it save plans, empires and CX preferences, share and copy plans, change your defaults, and delete. Every plan save is a new version you can restore. Before a delete, the assistant shows what would go and asks you first, and it says what it will change before any save.
- With a Read-only key, a change fails with a message saying the key is read-only and how to get a Read & write key. Nothing is changed.

A key in a config file is plain text on your computer. Use one key per assistant, named after it, so you can revoke one without touching the others.

## Set Up {#setup}

Every client needs the same two things:

- the server URL `https://mcp.prunplanner.org/mcp` (Streamable HTTP),
- the header `Authorization: Api-Key <YOUR_KEY>`.

Below, replace `<YOUR_KEY>` with your key, the full text shown once when you create it.

### Claude Desktop {#claude-desktop}

The easy way is the PRUNplanner extension:

1. On the [API Keys](/apikey) page, click **Download for Claude Desktop**. You get `prunplanner.mcpb`.
2. In Claude Desktop, open Settings → Extensions and drag the file in, then Install.
3. Paste your key into the extension's API Key field. Claude Desktop keeps it in your system's keychain.

You need to be signed in to Claude, and an organisation account can have extensions turned off.

> On Windows, Claude Desktop sometimes passes a hidden setting to an extension as `__encrypted__…` instead of the key (an open issue in Claude Desktop). If your assistant answers with an invalid-key error although the key is right, remove the extension and use the config file below instead.

*Fallback: the config file.* This needs Node.js. Open Settings → Developer → Edit Config, which opens `claude_desktop_config.json`, and add:

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

Write no space after `Authorization:` in `args`; the key goes in `env`, where spaces are fine. Then quit Claude Desktop completely and start it again.

### claude.ai on the Web and Mobile {#claude-web}

A custom connector on claude.ai can send our header only where the "Request headers" beta is available, which so far reaches a limited set of organisations. If you see a Request headers section when you add a custom connector, pick no sign-in and add the header `Authorization` with the value `Api-Key <YOUR_KEY>`. If you don't see it, use Claude Desktop: the connector would ask for a sign-in that PRUNplanner doesn't offer.

### Claude Code {#claude-code}

One command adds the server for all your projects:

```bash
claude mcp add --transport http prunplanner https://mcp.prunplanner.org/mcp --header "Authorization: Api-Key <YOUR_KEY>" --scope user
```

Start a new session, or check it with `/mcp`. Don't use `--scope project` with a key: it writes the key into `.mcp.json`, a file meant to be committed. The Claude Code extension for VS Code uses this same setup.

### ChatGPT Desktop App and Codex {#codex}

The ChatGPT desktop app, the Codex CLI and the Codex IDE extension share one file: `~/.codex/config.toml` (on Windows `%USERPROFILE%\.codex\config.toml`). Add:

```toml
[mcp_servers.prunplanner]
url = "https://mcp.prunplanner.org/mcp"
http_headers = { "Authorization" = "Api-Key <YOUR_KEY>" }
```

Then restart the app. To keep the key out of the file, use `env_http_headers = { "Authorization" = "PRUNPLANNER_AUTH" }` instead and set the environment variable `PRUNPLANNER_AUTH` to `Api-Key <YOUR_KEY>`. Don't use `bearer_token_env_var`: it sends `Bearer`, which PRUNplanner doesn't accept.

ChatGPT on the web can't connect: it signs in to servers only with OAuth or no authentication, and can't send an API key.

### VS Code with Copilot {#vscode}

Run the command MCP: Open User Configuration and add the server. VS Code asks for the key the first time the server starts:

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

VS Code is moving to a newer format (`.mcp.json` in a workspace, or `~/.copilot/mcp-config.json`), which has no key prompt. There, use `mcpServers` instead of `servers`, the same `type`, `url` and `headers`, and `"Authorization": "Api-Key ${PRUNPLANNER_KEY}"` with the key in the environment variable `PRUNPLANNER_KEY`.

### Cursor {#cursor}

Add to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project), then turn the server on in Cursor's MCP settings:

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

`${env:PRUNPLANNER_KEY}` in place of `<YOUR_KEY>` reads the key from an environment variable.

### Hermes Agent {#hermes}

Put the key in `~/.hermes/.env` as `PRUNPLANNER_KEY=<YOUR_KEY>`, then add to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  prunplanner:
    url: "https://mcp.prunplanner.org/mcp"
    headers:
      Authorization: "Api-Key ${PRUNPLANNER_KEY}"
```

Reload with `/reload-mcp`.

### Antigravity (Gemini) {#antigravity}

Antigravity, the IDE and CLI that replaced Gemini CLI, reads `~/.gemini/config/mcp_config.json`. Note the key name `serverUrl`:

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

Reload the servers with `/mcp` or restart.

### Zed, Cline, LM Studio and Open WebUI {#other-clients}

- Zed: Settings → AI → MCP Servers → Add Remote Server, or `context_servers` in the settings file, with the URL and the header.
- Cline: an `mcpServers` entry with `"type": "streamableHttp"`, `url` and `headers`. Without the `type`, Cline tries an older protocol.
- LM Studio: Program → Install → Edit mcp.json, an entry with `url` and `headers`.
- Open WebUI (0.6.31 or later): Admin Settings → MCP, type Streamable HTTP, the header as Headers JSON. Don't pick Bearer.

### Any Other Client {#any-client}

Give it the server URL and the header from the start of this section. A client that only starts local servers can use `mcp-remote` like the Claude Desktop fallback above.

To test a key on its own, MCP Inspector lists the tools it can reach:

```bash
npx @modelcontextprotocol/inspector --cli https://mcp.prunplanner.org/mcp --transport http --method tools/list --header "Authorization: Api-Key <YOUR_KEY>"
```

## Check It Works {#check}

Ask your assistant "List my empires." It should name your empires and say which key access it has. If it doesn't:

- *Invalid or revoked key* (401): the key is mistyped, revoked, or stopped working because you changed your password (see [Validity](/help/api_keys#validity)). Create a new key and replace it in the setup.
- *The key is read-only*: you asked for a change with a Read-only key. Nothing was changed; use a Read & write key if you want the assistant to save.
- *Too many requests* (429): the server accepts 10 requests a second per IP address, with bursts up to 60, and your key's usual limit of 240 a minute applies too (see [Rate Limits](/help/api_keys#rate-limits)). One question can take several requests, and they share that limit with your sheets and scripts. Wait a moment and ask again.
- *PRUNplanner's API can't be reached*: the server couldn't reach PRUNplanner's API. Try again in a few minutes.
- *The client asks you to sign in or shows OAuth*: the client can't send the header. Check its section above; ChatGPT on the web and claude.ai without the beta can't connect.

## Privacy {#privacy}

- Your assistant's provider (Anthropic, OpenAI, GitHub and so on) sees what the tools return: your plans, empires and prices. Their terms apply to that.
- Nothing reaches the game. The assistant can't act in Prosperous Universe; XIT actions are text for you to paste.
- Plans other players share are treated as data. The assistant is told never to follow instructions written into a plan or empire name.
- Revoke the key on the [API Keys](/apikey) page to cut the assistant off at once.
- For each tool call, PRUNplanner logs the tool's name, the client's name, whether it worked, how long it took and your key's prefix (the part before the dot, which isn't secret). It never logs the key, what you asked, or what came back.
- The server keeps no copy of your data. Each request reads it with your key and forgets it afterwards; only public game data (materials, recipes, buildings, planets, prices) is cached, shared by everyone.
