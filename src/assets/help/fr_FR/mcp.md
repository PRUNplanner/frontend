PRUNplanner fait tourner un serveur MCP (Model Context Protocol) : un assistant IA comme Claude, ChatGPT/Codex, Copilot ou Cursor peut ainsi travailler avec tes plans et tes empires. Ton assistant les lit et les calcule avec le moteur de calcul de plans de PRUNplanner et tes préférences CX : ses chiffres correspondent donc à ce qu'affiche la page du plan. Tu poses tes questions avec tes propres mots ; l'assistant choisit les bons outils.

Il te suffit d'une [clé API](/help/api_keys) et de quelques lignes de configuration dans ton assistant. La page [Clés API](/apikey) affiche l'adresse du serveur et propose le téléchargement pour Claude Desktop.

## Ce que tu peux demander {#what-it-does}

L'assistant dispose d'un ensemble d'outils, regroupés ci-dessous selon leur usage. Tu ne les appelles jamais toi-même ; leurs noms figurent ici pour que tu les reconnaisses quand ton assistant indique quel outil il utilise.

_Lire tes plans et tes empires._ « Laquelle de mes bases rapporte le plus par jour ? » ou « Qu'est-ce que mon empire importe chaque jour ?
`list_empires`, `list_plans`, `get_plan`, `get_empire`, `compare_plans`, `list_plan_versions`, `diff_plan_versions`

_Des scénarios, sans rien enregistrer._ « Et si ma base agricole avait 5 experts ? » ou « Combien rapporterait un nouveau plan avec 4 FRM sur cette planète ?
`calculate_plan_variant`, `calculate_new_plan`, `calculate_empire_variant`

_Des alternatives._ « Quelle recette de mon FP rapporte le plus ? » ou « Dois-je fabriquer ou acheter les intrants de mon DW ?
`rank_recipes`, `get_production_cost`, `check_make_or_buy`, `lookup_material`

_Où construire._ « Où devrais-je extraire de l'ALO près de Moria ? » ou « Laquelle de ces planètes convient le mieux à une base de fonderie ?
`find_planets`, `get_planet`, `get_distances`, `suggest_base`, `rank_bases`

_Le prix est-il réel ?_ « Le marché de mes produits est-il assez profond ? » ou « Comment le prix du RAT a-t-il évolué ce mois-ci ?
`check_plan_market`, `get_material_prices`, `get_market_report`, `get_price_history`

_Passer le relais au jeu._ « Donne-moi l'action [[xit|XIT]] pour approvisionner ma base pour 7 jours.
`get_xit_action`

_Plans partagés._ « Regarde ce plan partagé et compare-le avec le mien.
`get_shared_plan`

_Modifications_, uniquement avec une clé en lecture et écriture (voir [Quelle clé](#keys)). « Enregistre cette variante comme mon plan. » ou « Partage mon plan agricole. »
`save_plan`, `restore_plan_version`, `save_empire`, `save_cx_preference`, `share_plan`, `copy_shared_plan`, `set_preferences`, `delete`

Les quantités et les montants dans les réponses sont par jour, sauf si l'assistant dit le contraire. Les prix suivent la préférence [[cx|CX]] du plan ; sans préférence, le [[vwap|VWAP]] Univers sur 30 jours.

## Prompts prêts à l'emploi {#prompts}

Le serveur propose aussi quatre prompts prêts à l'emploi, chacun étant une demande complète pour une tâche courante. Les clients qui prennent en charge les prompts MCP les proposent comme commandes ; Claude Code, par exemple, les liste quand tu tapes `/` :

- `review_plan`, _Review a plan_ : essaie chaque levier d'un plan (experts, produits de luxe, COGC, habitations, stockage, autres recettes) sans changer ses bâtiments, et montre ce que chacun vaut par jour.
- `review_empire`, _Review my empire_ : ce qui rapporte, ce qui est faible ou risqué, et où l'empire dépend de marchés peu profonds.
- `vertical_chain`, _Plan a vertical chain_ : la chaîne de production d'un matériau à un rythme quotidien, avec les bons ratios, répartie en bases près d'un échange.
- `load_lists`, _Load lists for my bases_ : des listes de chargement d'approvisionnement et des paquets XIT pour un groupe de bases, à l'intervalle de visite le plus court du groupe.

Chacun se termine de la même façon : l'assistant montre les options avec leurs chiffres et te laisse choisir, et n'enregistre rien sauf si tu le demandes.

## D'abord des réponses courtes {#summary}

`get_plan`, `get_shared_plan`, `calculate_new_plan`, `get_planet` et `find_planets` répondent d'abord avec les chiffres clés. Pour un plan, ce sont l'argent, les bâtiments avec leurs recettes, les flux nets de matériaux, la main-d'œuvre, la surface et le transport ; l'économie par ordre, les prix par matériau et les matériaux de construction sont laissés de côté. Les réponses restent ainsi rapides et économisent le contexte de ton assistant. Quand tu as besoin de tout, demande « le détail complet » et l'assistant refait la demande avec tout le détail.

## Quelle clé {#keys}

Le serveur utilise ta clé API PRUNplanner ; il n'a pas de connexion propre.

- Une clé en **Lecture seule** est celle que nous recommandons. L'assistant lit et calcule tout ce qui précède, et ne peut rien modifier.
- Une clé en **Lecture et écriture** lui permet aussi d'enregistrer des plans, des empires et des préférences CX, de partager et de copier des plans, de modifier tes réglages par défaut et de supprimer. Chaque enregistrement de plan crée une nouvelle version que tu peux restaurer. Avant une suppression, l'assistant montre ce qui disparaîtrait et te demande d'abord, et il dit ce qu'il va modifier avant tout enregistrement.
- Avec une clé en lecture seule, une modification échoue avec un message indiquant que la clé est en lecture seule et comment obtenir une clé en lecture et écriture. Rien n'est modifié.

Une clé dans un fichier de configuration est du texte en clair sur ton ordinateur. Utilise une clé par assistant, nommée d'après lui, pour pouvoir en révoquer une sans toucher aux autres.

## Configuration {#setup}

Chaque client a besoin des deux mêmes éléments :

- l'URL du serveur `https://mcp.prunplanner.org/mcp` (Streamable HTTP),
- l'en-tête `Authorization: Api-Key <YOUR_KEY>`.

Ci-dessous, remplace `<YOUR_KEY>` par ta clé, le texte complet affiché une seule fois quand tu la crées.

### Claude Desktop {#claude-desktop}

Le plus simple est l'extension PRUNplanner :

1. Sur la page [Clés API](/apikey), clique sur **Télécharger pour Claude Desktop**. Tu obtiens `prunplanner.mcpb`.
2. Dans Claude Desktop, ouvre Settings → Extensions et fais-y glisser le fichier, puis Install.
3. Colle ta clé dans le champ API Key de l'extension. Claude Desktop la conserve dans le trousseau de ton système.

Tu dois être connecté à Claude, et un compte d'organisation peut avoir les extensions désactivées.

> Sous Windows, Claude Desktop transmet parfois un réglage masqué à une extension sous la forme `__encrypted__…` au lieu de la clé (un problème ouvert dans Claude Desktop). Si ton assistant répond par une erreur de clé invalide alors que la clé est correcte, supprime l'extension et utilise plutôt le fichier de configuration ci-dessous.

_Solution de repli : le fichier de configuration._ Il faut Node.js. Ouvre Settings → Developer → Edit Config, qui ouvre `claude_desktop_config.json`, et ajoute :

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

N'écris pas d'espace après `Authorization:` dans `args` ; la clé va dans `env`, où les espaces ne posent pas de problème. Ensuite, quitte complètement Claude Desktop et relance-le.

### claude.ai sur le web et sur mobile {#claude-web}

Un connecteur personnalisé sur claude.ai ne peut envoyer notre en-tête que là où la bêta « Request headers » est disponible, ce qui ne concerne pour l'instant qu'un nombre limité d'organisations. Si tu vois une section Request headers quand tu ajoutes un connecteur personnalisé, choisis l'absence de connexion et ajoute l'en-tête `Authorization` avec la valeur `Api-Key <YOUR_KEY>`. Si tu ne la vois pas, utilise Claude Desktop : le connecteur demanderait une connexion que PRUNplanner ne propose pas.

### Claude Code {#claude-code}

Une seule commande ajoute le serveur pour tous tes projets :

```bash
claude mcp add --transport http prunplanner https://mcp.prunplanner.org/mcp --header "Authorization: Api-Key <YOUR_KEY>" --scope user
```

Démarre une nouvelle session, ou vérifie avec `/mcp`. N'utilise pas `--scope project` avec une clé : cela écrit la clé dans `.mcp.json`, un fichier destiné à être commité. L'extension Claude Code pour VS Code utilise cette même configuration.

### Application de bureau ChatGPT et Codex {#codex}

L'application de bureau ChatGPT, la CLI Codex et l'extension IDE Codex partagent un même fichier : `~/.codex/config.toml` (sous Windows `%USERPROFILE%\.codex\config.toml`). Ajoute :

```toml
[mcp_servers.prunplanner]
url = "https://mcp.prunplanner.org/mcp"
http_headers = { "Authorization" = "Api-Key <YOUR_KEY>" }
```

Puis redémarre l'application. Pour garder la clé hors du fichier, utilise plutôt `env_http_headers = { "Authorization" = "PRUNPLANNER_AUTH" }` et définis la variable d'environnement `PRUNPLANNER_AUTH` à `Api-Key <YOUR_KEY>`. N'utilise pas `bearer_token_env_var` : il envoie `Bearer`, que PRUNplanner n'accepte pas.

ChatGPT sur le web ne peut pas se connecter : il ne se connecte aux serveurs qu'avec OAuth ou sans authentification, et ne peut pas envoyer de clé API.

### VS Code avec Copilot {#vscode}

Lance la commande MCP: Open User Configuration et ajoute le serveur. VS Code demande la clé au premier démarrage du serveur :

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

VS Code passe à un format plus récent (`.mcp.json` dans un espace de travail, ou `~/.copilot/mcp-config.json`), qui ne propose pas de saisie de la clé. Là, utilise `mcpServers` au lieu de `servers`, les mêmes `type`, `url` et `headers`, et `"Authorization": "Api-Key ${PRUNPLANNER_KEY}"` avec la clé dans la variable d'environnement `PRUNPLANNER_KEY`.

### Cursor {#cursor}

Ajoute dans `~/.cursor/mcp.json` (tous les projets) ou `.cursor/mcp.json` (un projet), puis active le serveur dans les réglages MCP de Cursor :

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

`${env:PRUNPLANNER_KEY}` à la place de `<YOUR_KEY>` lit la clé depuis une variable d'environnement.

### Hermes Agent {#hermes}

Mets la clé dans `~/.hermes/.env` sous la forme `PRUNPLANNER_KEY=<YOUR_KEY>`, puis ajoute dans `~/.hermes/config.yaml` :

```yaml
mcp_servers:
  prunplanner:
    url: "https://mcp.prunplanner.org/mcp"
    headers:
      Authorization: "Api-Key ${PRUNPLANNER_KEY}"
```

Recharge avec `/reload-mcp`.

### Antigravity (Gemini) {#antigravity}

Antigravity, l'IDE et la CLI qui ont remplacé Gemini CLI, lit `~/.gemini/config/mcp_config.json`. Attention au nom de clé `serverUrl` :

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

Recharge les serveurs avec `/mcp` ou redémarre.

### Zed, Cline, LM Studio et Open WebUI {#other-clients}

- Zed : Settings → AI → MCP Servers → Add Remote Server, ou `context_servers` dans le fichier de réglages, avec l'URL et l'en-tête.
- Cline : une entrée `mcpServers` avec `"type": "streamableHttp"`, `url` et `headers`. Sans le `type`, Cline essaie un protocole plus ancien.
- LM Studio : Program → Install → Edit mcp.json, une entrée avec `url` et `headers`.
- Open WebUI (0.6.31 ou plus récent) : Admin Settings → MCP, type Streamable HTTP, l'en-tête en Headers JSON. Ne choisis pas Bearer.

### Tout autre client {#any-client}

Donne-lui l'URL du serveur et l'en-tête du début de cette section. Un client qui ne lance que des serveurs locaux peut utiliser `mcp-remote` comme la solution de repli de Claude Desktop ci-dessus.

Pour tester une clé seule, MCP Inspector liste les outils qu'elle peut atteindre :

```bash
npx @modelcontextprotocol/inspector --cli https://mcp.prunplanner.org/mcp --transport http --method tools/list --header "Authorization: Api-Key <YOUR_KEY>"
```

## Vérifier que ça marche {#check}

Demande à ton assistant « Liste mes empires. ». Il devrait nommer tes empires et dire quel accès a la clé. Sinon :

- _Clé invalide ou révoquée_ (401) : la clé est mal saisie, révoquée, ou a cessé de fonctionner parce que tu as changé ton mot de passe (voir [Validité](/help/api_keys#validity)). Crée une nouvelle clé et remplace-la dans la configuration.
- _La clé est en lecture seule_ : tu as demandé une modification avec une clé en lecture seule. Rien n'a été modifié ; utilise une clé en lecture et écriture si tu veux que l'assistant enregistre.
- _Trop de requêtes_ (429) : le serveur accepte 10 requêtes par seconde par adresse IP, avec des pointes jusqu'à 60, et la limite habituelle de ta clé de 240 par minute s'applique aussi (voir [Limites de requêtes](/help/api_keys#rate-limits)). Une seule question peut nécessiter plusieurs requêtes, et elles partagent cette limite avec tes feuilles de calcul et tes scripts. Attends un instant et redemande.
- _L'API de PRUNplanner est injoignable_ : le serveur n'a pas pu joindre l'API de PRUNplanner. Réessaie dans quelques minutes.
- _Le client te demande de te connecter ou affiche OAuth_ : le client ne peut pas envoyer l'en-tête. Vérifie sa section ci-dessus ; ChatGPT sur le web et claude.ai sans la bêta ne peuvent pas se connecter.

## Confidentialité {#privacy}

- Le fournisseur de ton assistant (Anthropic, OpenAI, GitHub, etc.) voit ce que renvoient les outils : tes plans, tes empires et tes prix. Ses conditions s'appliquent à ces données.
- Rien n'atteint le jeu. L'assistant ne peut pas agir dans Prosperous Universe ; les actions XIT sont du texte que tu colles toi-même.
- Les plans que partagent les autres joueurs sont traités comme des données. L'assistant a pour consigne de ne jamais suivre d'instructions écrites dans un nom de plan ou d'empire.
- Révoque la clé sur la page [Clés API](/apikey) pour couper immédiatement l'accès de l'assistant.
- Pour chaque appel d'outil, PRUNplanner enregistre le nom de l'outil, le nom du client, si l'appel a réussi, sa durée et le préfixe de ta clé (la partie avant le point, qui n'est pas secrète). Il n'enregistre jamais la clé, ce que tu as demandé ni ce qui a été renvoyé.
- Le serveur ne garde aucune copie de tes données. Chaque requête les lit avec ta clé et les oublie ensuite ; seules les données publiques du jeu (matériaux, recettes, bâtiments, planètes, prix) sont mises en cache, partagées par tout le monde.
