Tu [Perfil](/profile) es donde gestionas tu cuenta, conectas tus datos del juego mediante FIO y defines las preferencias que deciden cómo empiezan las herramientas de PRUNplanner. Esta página también trata el inicio de sesión, el registro y el restablecimiento de la contraseña. Ven aquí cuando conectes FIO por primera vez, cuando quieras que una herramienta empiece con otros ajustes o para cambiar tu e-mail o tu contraseña.

## Tu cuenta {#account}

### Iniciar sesión y registrarse {#login-and-sign-up}

- **Iniciar sesión** con tu nombre de usuario y tu contraseña. Después llegas a tu [Imperio](/empire), salvo que vinieras de un enlace que te devuelve a donde estabas.
- **Crear cuenta** pide un **Nombre de usuario** (al menos 3 caracteres, sin espacios), una **Contraseña** (al menos 8 caracteres, no solo números, no una contraseña común) y un e-mail opcional. Para demostrar que juegas, escribes el nombre de un planeta cuyo ID se te muestra. Ábrelo en un búfer de Prosperous Universe para leer su nombre.
- Una cuenta nueva empieza con un imperio, «My Empire», y una [[exchange-preference|preferencia de bolsa]] asignada a él, «My Exchange Preference» (Universe · VWAP 30D). Consulta [Tu primera base](/help/guide_first_base).

### E-mail y recuperación de la cuenta {#email}

El e-mail es opcional, y PRUNplanner solo lo usa para restablecer tu contraseña. Sin él, no puedes restablecer una contraseña olvidada.

1. Introdúcelo en **Dirección de e-mail** con tu **Contraseña actual** y pulsa **Guardar**. Añadir, cambiar y quitar la dirección necesitan tu contraseña actual.
2. PRUNplanner envía un código de 8 caracteres válido durante 24 horas. Pulsa **Introducir código** y escríbelo, o haz clic en el enlace del e-mail en cualquier dispositivo. **Enviar código nuevo** envía otro.

**Recuperación de la cuenta** muestra en qué punto estás: **Sin configurar** (sin e-mail), **A la espera de confirmación** o **Listo** (los restablecimientos van a esta dirección). Una dirección nueva solo recibe restablecimientos cuando la confirmas.

Como una contraseña olvidada solo se puede restablecer mediante una dirección confirmada, la página del Imperio muestra un recordatorio mientras tengas planes pero ningún e-mail confirmado. «Ahora no» lo oculta durante 30 días, y «No volver a recordármelo» lo oculta para siempre.

### Contraseña olvidada {#password-reset}

En el formulario de inicio de sesión, **¿Olvidaste tu contraseña?** te pide tu dirección de e-mail confirmada y envía allí un código. Introduce el código con una contraseña nueva para establecerla.

### Cambiar tu contraseña {#change-password}

Abre **Cambiar contraseña** e introduce tu **Contraseña actual** y una **Contraseña nueva** (al menos 8 caracteres).

> [!warning]
> Cambiar o restablecer tu contraseña cierra tu sesión en todas partes, este navegador incluido, e invalida todas las [claves de API](/help/api_keys#validity) que creaste antes. Crea claves nuevas después y actualiza tus hojas de cálculo y scripts.

## Conexión con FIO {#fio-connection}

[[fio|FIO]] es una extensión de navegador gratuita de la comunidad que lee tus datos del juego. Con ella, PRUNplanner puede mostrar tu stock real en [FIO Consumo](/help/fio_burn), la condición de tus edificios en [FIO Reparación](/help/fio_repair) y tus almacenes en la API.

1. Instala la extensión de navegador de FIO y registra tu cuenta de FIO desde el botón de extensiones del juego.
2. En el sitio web de FIO, abre tus ajustes y crea una clave de API para PRUNplanner.
3. Introduce la **Clave de API de FIO** y tu **Usuario de PrUn** en **Conexión con FIO** y pulsa **Guardar**.

PRUNplanner comprueba la clave y te avisa si FIO no la acepta o si pertenece a otro nombre de usuario. **Estado de FIO** muestra entonces cómo está la conexión: sin conectar, cargando tus datos, conectada con la hora de la última actualización, conectada pero aún sin datos (abre el juego con la extensión de FIO en marcha), clave rechazada o actualizaciones con fallos.

Mientras usas PRUNplanner, tus datos de FIO tienen como mucho unos 30–45 minutos. Tras una semana sin entrar, se actualizan al iniciar sesión. FIO solo sabe lo que la extensión vio mientras jugabas.

PRUNplanner no guarda tus datos de FIO (almacenes y bases) en tu navegador. Los carga cada vez que abres la app, y de nuevo cada 5 minutos.

## Preferencias {#preferences}

PRUNplanner guarda las preferencias en tu cuenta en cuanto las cambias, así que te siguen a todos tus dispositivos. Solo **Analíticas de uso** se guarda únicamente en este navegador.

| Preferencia                                    | Por defecto                                          | Qué hace                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Idioma**                                     | Inglés                                               | El idioma de la app. Las traducciones vienen de la comunidad en Crowdin.                                                                                                                                                                                                                                              |
| **Paleta de colores**                          | **Predeterminada (verde / rojo)** | **Para daltonismo (azul / naranja)** cambia los colores de bueno/malo en toda la app.                                                                                                                                                                                                                              |
| **Tarjeta de mercado**                         | **Al pasar el ratón**                                | Con **Solo al hacer clic**, pasar el ratón por un material no muestra nada, y haces clic en él para ver los precios. Consulta [Tarjeta de mercado del material](/help/exchanges#market-card).                                                                                                                         |
| **Imperio predeterminado**                     | tu primer imperio                                    | El imperio con el que se abren la página del Imperio y FIO Consumo. Cambiar de imperio allí también lo cambia.                                                                                                                                                                                                        |
| **CX predeterminada**                          | ninguna                                              | La preferencia de bolsa con la que empiezan estas herramientas: herramientas de ROI, ROI de bases, Calculadora de HQ, Precios de mantenimiento, Cadenas de producción y FIO Reparación. Elegir una preferencia en una de ellas también la cambia. Sin ella, usan Universe · VWAP 30D. |
| **Umbral rojo**                                | 5                                                    | FIO Consumo: rojo cuando a una base le quedan estos días de suministro o menos.                                                                                                                                                                                                                                       |
| **Umbral amarillo**                            | 10                                                   | FIO Consumo: amarillo con estos días de suministro o menos.                                                                                                                                                                                                                                                           |
| **Días de reabastecimiento**                   | 20                                                   | FIO Consumo: los días que cubre un reabastecimiento con XIT.                                                                                                                                                                                                                                                          |
| **Origen de XIT**                              | **Configurar al ejecutar**                           | Desde dónde salen las cargas de reabastecimiento y reparación de XIT: un almacén de estación, o se elige al ejecutar el XIT.                                                                                                                                                                                          |
| **XIT Comprar de CX**                          | activado                                             | Compra la carga en la bolsa del origen (solo con un almacén como origen). Lo comparten FIO Consumo y FIO Reparación.                                                                                                                                                                               |
| **Reparar cada (sin plan)** | 60                                                   | FIO Reparación: intervalo de reparación en días para las bases sin plan asociado (1–180).                                                                                                                                                                                                          |
| **Próximo a vencer**                           | 7                                                    | FIO Reparación: días antes del objetivo que cuentan como próximos a vencer (0–60).                                                                                                                                                                                                                 |
| **Días de llegada**                            | 2                                                    | FIO Reparación: días hasta que una nave de reparación descarga (0–30).                                                                                                                                                                                                                             |
| **Sugerencias de plan**                        | activado                                             | Edificios y recetas populares en el planeta, datos del planeta y una configuración típica para planes vacíos.                                                                                                                                                                                                                         |
| **Analíticas de uso**                          | se pregunta una vez, en un aviso                     | Permite a PRUNplanner recoger eventos de uso, informes de errores y grabaciones de sesión. Se guarda solo en este navegador. Se queda desactivado cuando tu navegador envía Do-Not-Track o Global Privacy Control.                                                                                    |

Una [[exchange-preference|preferencia de bolsa]] es tu conjunto de reglas sobre de qué bolsa y con qué base de precio salen los precios, así que **CX predeterminada** decide con qué precios empiezan las herramientas enumeradas arriba.

Los umbrales de consumo son _días de suministro restantes_, no cantidades de stock. Por ejemplo, con **Umbral rojo** en 5 y **Umbral amarillo** en 10, una base a la que le quedan 4 días sale en rojo, una con 7 días en amarillo y una con 12 días sin color. También puedes definirlos en la página [FIO Consumo](/help/fio_burn#thresholds), y los ajustes de reparación en [FIO Reparación](/help/fio_repair). Es el mismo ajuste en ambos sitios.

**Ajustes específicos del plan** enumera los planes que tienen ajustes propios, por ejemplo exclusiones de visitas, edificios construidos en el carrito de construcción u optimización automática desactivada. Los cambias dentro de cada plan.

## Almacenamiento del navegador {#browser-storage}

Para cargar rápido y aliviar el servidor, PRUNplanner guarda una copia de los datos del juego y de tus datos de planificación en tu navegador y la actualiza pasado cierto tiempo. La tabla **Almacenamiento del navegador** muestra cuánto ocupa. Tus planes, imperios y preferencias se guardan en tu cuenta, así que esta copia no es el único sitio donde están.

### Categorías de almacenamiento {#storage-categories}

| Categoría              | Qué                                                                                            | Se actualiza                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| Datos del juego        | Materiales, edificios, recetas y planetas (de FIO)                          | con menos frecuencia que las bolsas   |
| Bolsas                 | Precios y cifras de mercado: Ask y Bid de FIO, VWAP calculados por PRUNplanner | más o menos cada 30 minutos           |
| Datos de planificación | Tus planes, imperios, preferencias de bolsa y planes compartidos                               | una copia de lo guardado en tu cuenta |

Los datos de FIO no se guardan en el almacenamiento del navegador, aunque la tabla enumere sus filas (consulta [Conexión con FIO](#fio-connection)).
