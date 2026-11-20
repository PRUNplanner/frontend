Con una clave API, una hoja de cálculo, un panel, un script o un asistente de IA puede leer tus datos de PRUNplanner sin tu contraseña. En la página [Claves API](/apikey) (**API** en el menú de la cuenta) creas y revocas claves, conectas un [asistente de IA](/help/mcp) y generas URL, fórmulas de Google Sheets y fragmentos de curl y Python listos para pegar.

## Para qué sirven las claves {#what-keys-are-for}

La API REST de PRUNplanner sirve tus datos de planificación (planes, imperios, preferencias de bolsa, la [[material-io|E/S de materiales]] de tus imperios), tu almacenamiento de [[fio|FIO]], datos del juego (materiales, recetas, edificios, planetas) y cifras del mercado como el [[vwap|VWAP]]. Usos típicos:

- llevar la E/S de materiales de tu imperio a una hoja de Google que se recalcula sola,
- pasar los precios de las bolsas o tu almacenamiento de FIO a tu propio panel,
- hacer tus propios análisis sobre todos tus planes.

Los datos públicos del juego y los precios de las bolsas no necesitan clave. Todo lo que es tuyo, sí.

Cada clave tiene un **Acceso**: **Solo lectura** o **Lectura y escritura**. Consulta [Acceso](#access) para ver qué permite cada uno.

Tienes la referencia completa en [api.prunplanner.org/docs](https://api.prunplanner.org/docs). Su botón Authorize acepta una clave, así que puedes probar las llamadas en el navegador.

## Crear una clave {#create}

1. Pulsa **Crear nueva clave**.
2. Escribe un **Nombre de la clave** que más adelante te diga dónde la usas, por ejemplo el nombre de la hoja. Que no pase de 50 caracteres. Un nombre más largo falla con un error genérico.
3. Elige el **Acceso**: **Solo lectura** (ya seleccionado) o **Lectura y escritura**. La línea de debajo dice lo que podrá hacer la clave.
4. Pulsa **Crear**. La clave aparece una sola vez, bajo **Tu clave secreta (¡guárdala ahora!)**, junto con su acceso.
5. Pulsa **Copiar clave** y guarda la clave en un lugar seguro, por ejemplo un gestor de contraseñas. **Usar en el generador de URL** la pone en el generador de URL de abajo, solo durante esta visita.
6. Pulsa **He guardado mi clave**.

> [!warning]
> PRUNplanner no puede volver a mostrar la clave, porque solo guarda una forma cifrada con hash, que sirve para comprobar una clave pero no se puede convertir de nuevo en ella. Si la pierdes, revócala y crea una nueva.

## Gestionar las claves {#manage-keys}

**Claves API de PRUNplanner** lista tus claves con su **Nombre**, **Prefijo**, **Acceso**, **Creada** y **Último uso**. El prefijo es la primera parte de la clave, la que no es secreta, antes del punto, para que puedas distinguirlas. Último uso muestra **Nunca** hasta que se usa la clave. Después se actualiza como mucho una vez cada 5 minutos, así que puede que una petición que enviaste hace un momento aún no aparezca.

**Revocar** elimina una clave después de que lo confirmes. Los scripts y las hojas que la usan dejan de funcionar al instante.

## Acceso {#access}

Todas las claves leen tus datos. Que además puedan cambiarlos depende del acceso que elegiste al crearlas:

| Acceso                  | Lee tus planes, imperios y demás datos | Los crea, cambia y elimina      |
| ----------------------- | -------------------------------------- | ------------------------------- |
| **Solo lectura**        | sí                                     | no                              |
| **Lectura y escritura** | sí                                     | sí, con la clave en la cabecera |

Las claves nuevas son de **Solo lectura** salvo que elijas **Lectura y escritura**. Una hoja, un panel o cualquier cosa que montes con el generador de URL solo lee, así que le basta una clave de solo lectura. Da a una clave el acceso **Lectura y escritura** solo cuando un script tuyo cambie tus datos. Las claves que creaste antes de que las claves tuvieran acceso son de **Lectura y escritura**, para que los scripts que las usan sigan funcionando.

No puedes cambiar el acceso de una clave después. Para cambiarlo, crea una clave nueva con el acceso que quieras, pasa a ella tu hoja o tu script y revoca la antigua.

Hay cosas que ninguna clave puede hacer, tenga el acceso que tenga. Necesitan que hayas iniciado sesión en PRUNplanner:

- listar, crear o revocar claves,
- cambiar tu correo, tu contraseña, tu nombre de usuario de PrUn o tu clave API de FIO,
- solicitar o confirmar la verificación del correo.

Una clave puede leer tu perfil, pero tu clave API de FIO vuelve vacía: es tu clave para FIO, y un script no la necesita.

Cuando una clave intenta algo que no tiene permitido, la respuesta es _403 Forbidden_ con un `code` que dice por qué:

- `api_key_read_only`: una clave de **Solo lectura** intentó cambiar datos.
- `api_key_in_url`: una clave enviada como `?api_key=` intentó cambiar datos. Envíala en la cabecera `Authorization`.
- `api_key_not_allowed`: una clave intentó una de las acciones de cuenta de arriba. Inicia sesión para hacerla.

Cuando esto pasa, no se cambia nada.

## Usar una clave {#using-keys}

Envía la clave con cada petición, de una de estas dos formas:

| Forma                 | Ejemplo                                  | Úsala para                                                           |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Cabecera              | `Authorization: Api-Key <YOUR_KEY>`      | Scripts, curl, paneles                                               |
| Parámetro de consulta | `?api_key=<YOUR_KEY>` al final de la URL | `IMPORTDATA` de Google Sheets, herramientas que solo aceptan una URL |

Cualquiera que pueda ver una URL puede ver la clave que lleva, por ejemplo todo el que pueda abrir tu hoja. Por eso una clave en una URL solo puede leer, aunque sea de **Lectura y escritura**. Usa una clave de solo lectura distinta para cada hoja o script, para poder revocar una sin romper las demás.

Las dos formas funcionan para todas las peticiones que puede hacer una clave, salvo que los cambios necesitan la cabecera. Si una petición lleva las dos, PRUNplanner usa la cabecera.

## Asistentes de IA {#ai-assistants}

Una clave también conecta un asistente de IA como Claude, ChatGPT/Codex, Copilot o Cursor al servidor MCP de PRUNplanner, para que pueda leer y calcular tus planes e imperios con el propio motor de PRUNplanner. La tarjeta **Asistentes de IA (MCP)** de esta página tiene la dirección del servidor, la cabecera y la descarga para Claude Desktop. [Asistentes de IA (MCP)](/help/mcp) explica lo que puede hacer el asistente y cómo configurar cada cliente.

Una clave de **Solo lectura** basta para preguntas e hipótesis; el asistente solo necesita **Lectura y escritura** para guardar por ti.

## Generador de URL {#url-builder}

El **Generador de URL** escribe la petición por ti. Elige los **Datos** y el **Formato** (CSV o JSON, donde existen ambos) y luego rellena los datos que necesita el endpoint. Pueden ser **Imperio**, **Plan** o **Preferencia de CX** (de tu cuenta), **Planeta** (un ID natural como OT-580b), **Material**, **Bolsa** (AI1, CI1, IC1, NC1 o UNIVERSE) o **Días** (último día, 7, 14 o 31).

| Grupo                                      | Datos                                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listos para hojas (CSV y JSON)             | **I/O de materiales del imperio**, **I/O de materiales por plan (imperio)**, **Lista de planes del imperio**, **Almacenamiento FIO**, **Precios de las bolsas** (sin clave) |
| Tus datos de planificación (JSON)          | **Todos los planes**, **Un plan**, **Todos los imperios**, **Un imperio**, **Preferencias de CX**, **Una preferencia de CX**                                                |
| Datos públicos del juego (JSON, sin clave) | **Materiales**, **Recetas**, **Edificios**, **Un planeta**, **Informe de población del planeta**, **Historial de mercado**, **Historial de mercado, todos los materiales**  |

Después copia lo que necesites:

- **Google Sheets**: una fórmula `=IMPORTDATA("…")`, solo para CSV. Pégala en una celda.
- **URL**: la dirección con la clave como `?api_key=`.
- **curl** y **Python**: con la clave en la cabecera. El fragmento de Python lee la versión CSV cuando existe.

Hasta que rellenes tu clave, los fragmentos muestran `<YOUR_KEY>` en su lugar.

> [!tip]
> **I/O de materiales del imperio** e **I/O de materiales por plan (imperio)** devuelven las cifras de la última vez que PRUNplanner calculó ese imperio, lo que ocurre cuando lo abres en la página [Imperio](/empire). La columna `updated_at` indica cuándo. Abre el imperio después de cambiar sus planes, y tu hoja se pone al día.

## Límites de peticiones {#rate-limits}

Si superas estos límites, la petición recibe la respuesta _429 Too Many Requests_. Espera un minuto y vuelve a intentarlo.

Estos límites quedan muy por encima del uso normal: las 240 por minuto son unas cuatro veces, y el límite de almacenamiento de FIO unas dos veces, el minuto de más actividad de un uso normal.

| Peticiones                                               | Límite         | Se cuenta por                                            |
| -------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| Todo lo que pides con una clave o con la sesión iniciada | 240 por minuto | cuenta                                                   |
| **Almacenamiento FIO**                                   | 30 por minuto  | cuenta                                                   |
| **Historial de mercado** (un material)                   | 120 por minuto | dirección IP, o cuenta cuando la petición lleva tu clave |
| **Historial de mercado, todos los materiales**           | 30 por minuto  | dirección IP, o cuenta cuando la petición lleva tu clave |

El historial de mercado no necesita clave, pero si envías una, tus peticiones cuentan en tu cuenta en lugar de en tu dirección IP, así que otros que comparten esa dirección (por ejemplo, el servidor de una hoja de cálculo) no gastan tu límite. Ahí se ignora una clave no válida o revocada: la petición sigue adelante, contada por dirección IP.

Una hoja que actualiza muchas celdas con `IMPORTDATA` a la vez puede llegar a un límite. Una sola petición con muchas filas, como **Historial de mercado, todos los materiales**, es mejor que una petición por material.

Por ejemplo, si llegan 40 peticiones de **Almacenamiento FIO** en un minuto, las primeras 30 pasan y las otras 10 reciben 429.

## Validez {#validity}

Las claves no caducan. Una clave deja de funcionar cuando:

- la revocas,
- cambias o restableces tu contraseña (todas las claves creadas antes dejan de funcionar al instante, así que crea otras nuevas y actualiza tus hojas y scripts),
- se desactiva tu cuenta.

Así que si otra persona conociera tu contraseña y hubiera creado una clave con ella, al cambiar tu contraseña esa clave también queda bloqueada.

Una petición con una clave que ya no funciona recibe _401_ con «Invalid API Key». Las claves que dejaron de funcionar por un cambio de contraseña siguen apareciendo en la lista, y puedes revocarlas para ordenarla.

> [!warning]
> Trata una clave como tu contraseña. No la pongas en repositorios públicos ni la compartas con servicios en los que no confíes. Si una clave puede haberse filtrado, revócala y crea una nueva.
