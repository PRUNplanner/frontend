PRUNplanner tiene un servidor MCP (Model Context Protocol), para que un asistente de IA como Claude, ChatGPT/Codex, Copilot o Cursor pueda trabajar con tus planes e imperios. Tu asistente los lee y los calcula con el propio motor de planes de PRUNplanner y tus preferencias de CX, así que sus cifras coinciden con lo que muestra la página del plan. Tú preguntas con palabras normales; el asistente elige las herramientas adecuadas.

Solo necesitas una [clave API](/help/api_keys) y unas pocas líneas de configuración en tu asistente. La página [Claves API](/apikey) muestra la dirección del servidor y tiene la descarga para Claude Desktop.

## Qué puedes preguntar {#what-it-does}

El asistente tiene un conjunto de herramientas, agrupadas abajo según para qué las usarías. Nunca las llamas tú; sus nombres están aquí para que las reconozcas cuando tu asistente muestre qué herramienta usa.

_Leer tus planes e imperios._ «¿Cuál de mis bases gana más al día?» o «¿Qué importa mi imperio cada día?»
`list_empires`, `list_plans`, `get_plan`, `get_empire`, `compare_plans`, `list_plan_versions`, `diff_plan_versions`

_Hipótesis, sin guardar nada._ «¿Y si mi base de granjas tuviera 5 expertos?» o «¿Cuánto ganaría un plan nuevo con 4 FRM en este planeta?»
`calculate_plan_variant`, `calculate_new_plan`, `calculate_empire_variant`

_Alternativas._ «¿Qué receta de mi FP rinde más?» o «¿Debería fabricar o comprar los insumos de mi DW?»
`rank_recipes`, `get_production_cost`, `check_make_or_buy`, `lookup_material`

_Dónde construir._ «¿Dónde debería extraer ALO cerca de Moria?» o «¿Cuál de estos planetas encaja mejor con una base de fundición?»
`find_planets`, `get_planet`, `get_distances`, `suggest_base`, `rank_bases`

_¿Es real el precio?_ «¿Es el mercado de mis salidas lo bastante profundo?» o «¿Cómo se ha movido el precio de RAT este mes?»
`check_plan_market`, `get_material_prices`, `get_market_report`, `get_price_history`

_Pasar al juego._ «Dame la acción de [[xit|XIT]] para abastecer mi base durante 7 días.»
`get_xit_action`

_Planes compartidos._ «Mira este plan compartido y compáralo con el mío.»
`get_shared_plan`

_Cambios_, solo con una clave de lectura y escritura (consulta [Qué clave](#keys)). «Guarda esta variante como mi plan.» o «Comparte mi plan de granjas.»
`save_plan`, `restore_plan_version`, `save_empire`, `save_cx_preference`, `share_plan`, `copy_shared_plan`, `set_preferences`, `delete`

Las cantidades y el dinero de las respuestas son por día salvo que el asistente diga otra cosa. Los precios siguen la preferencia de [[cx|CX]] del plan; sin ella, el [[vwap|VWAP]] de 30 días de Universe.

## Prompts preparados {#prompts}

El servidor también ofrece cuatro prompts preparados, cada uno una petición completa para una tarea habitual. Los clientes que admiten prompts de MCP los ofrecen como comandos; Claude Code, por ejemplo, los lista cuando escribes `/`:

- `review_plan`, _Revisar un plan_: prueba todas las palancas de un plan (expertos, lujos, COGC, hábitats, almacenamiento, otras recetas) sin cambiar sus edificios, y muestra cuánto vale cada una al día.
- `review_empire`, _Revisar mi imperio_: qué gana dinero, qué es débil o arriesgado, y dónde depende el imperio de mercados poco profundos.
- `vertical_chain`, _Planificar una cadena vertical_: la cadena de producción de un material a un ritmo diario, con las proporciones correctas, repartida en bases cerca de una bolsa.
- `load_lists`, _Listas de carga para mis bases_: listas de carga de suministros y paquetes de XIT para un grupo de bases, al intervalo de visita más rápido del grupo.

Todos terminan igual: el asistente muestra las opciones con sus cifras y te deja elegir, y no guarda nada salvo que se lo digas.

## Primero respuestas breves {#summary}

`get_plan`, `get_shared_plan`, `calculate_new_plan`, `get_planet` y `find_planets` responden primero con las cifras clave. En un plan eso es el dinero, los edificios con sus recetas, los flujos netos de materiales, la mano de obra, el área y el transporte; se dejan fuera la economía por orden, los precios por material y los materiales de construcción. Así las respuestas son rápidas y se ahorra contexto de tu asistente. Cuando lo necesites todo, pide «el desglose completo» y el asistente vuelve a preguntar con todo el detalle.

## Qué clave {#keys}

El servidor usa tu clave API de PRUNplanner; no tiene inicio de sesión propio.

- Una clave de **Solo lectura** es la que recomendamos. El asistente lee y calcula todo lo anterior, y no puede cambiar nada.
- Una clave de **Lectura y escritura** además le permite guardar planes, imperios y preferencias de CX, compartir y copiar planes, cambiar tus valores por defecto y borrar. Cada vez que guarda un plan se crea una versión nueva que puedes restaurar. Antes de borrar, el asistente te muestra lo que se eliminaría y te pregunta primero, y antes de guardar dice lo que va a cambiar.
- Con una clave de solo lectura, un cambio falla con un mensaje que dice que la clave es de solo lectura y cómo conseguir una clave de lectura y escritura. No se cambia nada.

Una clave en un archivo de configuración es texto sin cifrar en tu ordenador. Usa una clave por asistente, con su nombre, para poder revocar una sin tocar las demás.

## Configuración {#setup}

Todos los clientes necesitan las mismas dos cosas:

- la URL del servidor `https://mcp.prunplanner.org/mcp` (Streamable HTTP),
- la cabecera `Authorization: Api-Key <YOUR_KEY>`.

A continuación, sustituye `<YOUR_KEY>` por tu clave, el texto completo que se muestra una sola vez al crearla.

### Claude Desktop {#claude-desktop}

Lo más fácil es la extensión de PRUNplanner:

1. En la página [Claves API](/apikey), haz clic en **Descargar para Claude Desktop**. Obtienes `prunplanner.mcpb`.
2. En Claude Desktop, abre Settings → Extensions y arrastra el archivo dentro; después, Install.
3. Pega tu clave en el campo API Key de la extensión. Claude Desktop la guarda en el llavero de tu sistema.

Tienes que haber iniciado sesión en Claude, y una cuenta de organización puede tener las extensiones desactivadas.

> En Windows, Claude Desktop a veces pasa a una extensión un ajuste oculto como `__encrypted__…` en lugar de la clave (un problema abierto de Claude Desktop). Si tu asistente responde con un error de clave no válida aunque la clave sea correcta, quita la extensión y usa el archivo de configuración de abajo.

_Alternativa: el archivo de configuración._ Necesita Node.js. Abre Settings → Developer → Edit Config, que abre `claude_desktop_config.json`, y añade:

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

No pongas espacio después de `Authorization:` en `args`; la clave va en `env`, donde los espacios no son problema. Después cierra Claude Desktop por completo y vuelve a abrirlo.

### claude.ai en la web y el móvil {#claude-web}

Un conector personalizado en claude.ai solo puede enviar nuestra cabecera donde está disponible la beta «Request headers», que por ahora llega a un número limitado de organizaciones. Si ves una sección Request headers al añadir un conector personalizado, elige sin inicio de sesión y añade la cabecera `Authorization` con el valor `Api-Key <YOUR_KEY>`. Si no la ves, usa Claude Desktop: el conector pediría un inicio de sesión que PRUNplanner no ofrece.

### Claude Code {#claude-code}

Un solo comando añade el servidor para todos tus proyectos:

```bash
claude mcp add --transport http prunplanner https://mcp.prunplanner.org/mcp --header "Authorization: Api-Key <YOUR_KEY>" --scope user
```

Empieza una sesión nueva, o compruébalo con `/mcp`. No uses `--scope project` con una clave: escribe la clave en `.mcp.json`, un archivo pensado para subirse al repositorio. La extensión de Claude Code para VS Code usa esta misma configuración.

### App de escritorio de ChatGPT y Codex {#codex}

La app de escritorio de ChatGPT, la CLI de Codex y la extensión de Codex para IDE comparten un archivo: `~/.codex/config.toml` (en Windows `%USERPROFILE%\.codex\config.toml`). Añade:

```toml
[mcp_servers.prunplanner]
url = "https://mcp.prunplanner.org/mcp"
http_headers = { "Authorization" = "Api-Key <YOUR_KEY>" }
```

Después reinicia la app. Para no tener la clave en el archivo, usa en su lugar `env_http_headers = { "Authorization" = "PRUNPLANNER_AUTH" }` y pon la variable de entorno `PRUNPLANNER_AUTH` a `Api-Key <YOUR_KEY>`. No uses `bearer_token_env_var`: envía `Bearer`, que PRUNplanner no acepta.

ChatGPT en la web no puede conectarse: solo inicia sesión en servidores con OAuth o sin autenticación, y no puede enviar una clave API.

### VS Code con Copilot {#vscode}

Ejecuta el comando MCP: Open User Configuration y añade el servidor. VS Code te pide la clave la primera vez que arranca el servidor:

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

VS Code está pasando a un formato más nuevo (`.mcp.json` en un espacio de trabajo, o `~/.copilot/mcp-config.json`), que no pide la clave. Ahí, usa `mcpServers` en lugar de `servers`, los mismos `type`, `url` y `headers`, y `"Authorization": "Api-Key ${PRUNPLANNER_KEY}"` con la clave en la variable de entorno `PRUNPLANNER_KEY`.

### Cursor {#cursor}

Añade a `~/.cursor/mcp.json` (todos los proyectos) o `.cursor/mcp.json` (un proyecto) lo siguiente, y luego activa el servidor en los ajustes de MCP de Cursor:

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

`${env:PRUNPLANNER_KEY}` en lugar de `<YOUR_KEY>` lee la clave de una variable de entorno.

### Hermes Agent {#hermes}

Pon la clave en `~/.hermes/.env` como `PRUNPLANNER_KEY=<YOUR_KEY>` y luego añade a `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  prunplanner:
    url: "https://mcp.prunplanner.org/mcp"
    headers:
      Authorization: "Api-Key ${PRUNPLANNER_KEY}"
```

Recarga con `/reload-mcp`.

### Antigravity (Gemini) {#antigravity}

Antigravity, el IDE y la CLI que sustituyeron a Gemini CLI, lee `~/.gemini/config/mcp_config.json`. Fíjate en el nombre de clave `serverUrl`:

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

Recarga los servidores con `/mcp` o reinicia.

### Zed, Cline, LM Studio y Open WebUI {#other-clients}

- Zed: Settings → AI → MCP Servers → Add Remote Server, o `context_servers` en el archivo de ajustes, con la URL y la cabecera.
- Cline: una entrada `mcpServers` con `"type": "streamableHttp"`, `url` y `headers`. Sin el `type`, Cline intenta usar un protocolo más antiguo.
- LM Studio: Program → Install → Edit mcp.json, una entrada con `url` y `headers`.
- Open WebUI (0.6.31 o posterior): Admin Settings → MCP, tipo Streamable HTTP, la cabecera como Headers JSON. No elijas Bearer.

### Cualquier otro cliente {#any-client}

Dale la URL del servidor y la cabecera del principio de esta sección. Un cliente que solo arranca servidores locales puede usar `mcp-remote` como en la alternativa de Claude Desktop de arriba.

Para probar una clave por separado, MCP Inspector lista las herramientas a las que llega:

```bash
npx @modelcontextprotocol/inspector --cli https://mcp.prunplanner.org/mcp --transport http --method tools/list --header "Authorization: Api-Key <YOUR_KEY>"
```

## Comprueba que funciona {#check}

Pregunta a tu asistente «Lista mis imperios.» Debería nombrar tus imperios y decir qué acceso tiene su clave. Si no lo hace:

- _Clave no válida o revocada_ (401): la clave está mal escrita, revocada o dejó de funcionar porque cambiaste tu contraseña (consulta [Validez](/help/api_keys#validity)). Crea una clave nueva y sustitúyela en la configuración.
- _La clave es de solo lectura_: pediste un cambio con una clave de solo lectura. No se cambió nada; usa una clave de lectura y escritura si quieres que el asistente guarde.
- _Demasiadas peticiones_ (429): el servidor acepta 10 peticiones por segundo por dirección IP, con ráfagas de hasta 60, y además se aplica el límite habitual de tu clave de 240 por minuto (consulta [Límites de peticiones](/help/api_keys#rate-limits)). Una pregunta puede necesitar varias peticiones, y comparten ese límite con tus hojas de cálculo y scripts. Espera un momento y vuelve a preguntar.
- _No se puede acceder a la API de PRUNplanner_: el servidor no pudo llegar a la API de PRUNplanner. Vuelve a intentarlo dentro de unos minutos.
- _El cliente te pide iniciar sesión o muestra OAuth_: el cliente no puede enviar la cabecera. Revisa su sección de arriba; ChatGPT en la web y claude.ai sin la beta no pueden conectarse.

## Privacidad {#privacy}

- El proveedor de tu asistente (Anthropic, OpenAI, GitHub, etc.) ve lo que devuelven las herramientas: tus planes, imperios y precios. Sus condiciones se aplican a eso.
- Nada llega al juego. El asistente no puede actuar en Prosperous Universe; las acciones de XIT son texto para que lo pegues tú.
- Los planes que comparten otros jugadores se tratan como datos. Al asistente se le indica que nunca siga instrucciones escritas en el nombre de un plan o de un imperio.
- Revoca la clave en la página [Claves API](/apikey) para cortar al asistente al instante.
- Por cada llamada a una herramienta, PRUNplanner registra el nombre de la herramienta, el nombre del cliente, si funcionó, cuánto tardó y el prefijo de tu clave (la parte antes del punto, que no es secreta). Nunca registra la clave, lo que preguntaste ni lo que se devolvió.
- El servidor no guarda ninguna copia de tus datos. Cada petición los lee con tu clave y los olvida después; solo se guardan en caché los datos públicos del juego (materiales, recetas, edificios, planetas, precios), compartidos por todos.
