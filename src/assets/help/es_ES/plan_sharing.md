Un enlace para compartir permite a cualquiera ver uno de tus [[plan|planes]], tenga o no cuenta de PRUNplanner. Úsalo para enseñar una base en un hilo de Discord, pedir opiniones o pasarle una configuración a un compañero de corporación. Quien lo vea puede probar cambios en su propia copia y guardarla como plan suyo, pero tu plan nunca cambia.

Esta página explica cómo crear y detener un enlace, qué ve y qué puede hacer la gente al abrirlo, y cómo se ve el enlace cuando lo pegas en un chat.

## Compartir un plan {#share-link}

Abre tu plan y haz clic en **Compartir enlace** en la cabecera. El botón aparece en tus propios planes una vez guardados. En [Gestión](/manage), el menú ⋯ de la fila de un plan abre el mismo cuadro de diálogo con **Compartir…**.

El cuadro **Compartir plan** funciona en dos pasos:

1. Antes de compartir el plan, explica lo que hace el enlace. **Crear enlace para compartir** lo crea.
2. Una vez compartido, el cuadro muestra el propio enlace, `https://prunplanner.org/shared/…`, y cuántas veces se ha visto. **Copiar URL** lo copia, y **Dejar de compartir** lo termina.

Cada plan tiene un solo enlace, así que al volver a abrir el cuadro ves el mismo enlace y su número de visitas. Cada vez que alguien abre el enlace cuenta como una visita, recargas incluidas. Tus propios clics también cuentan: abrir tu propio enlace cuenta como visita antes de que PRUNplanner cambie a tu plan. En Gestión, un pequeño ojo con el número marca cada plan compartido.

### Qué ve quien lo abre {#what-viewers-see}

El enlace siempre muestra tu plan tal como está guardado: su versión activa, sin los cambios sin guardar que tengas abiertos. Cuando guardas el plan o activas otra versión ([Versiones](/help/plan_saving#versions)), el siguiente que lo abra verá eso.

> [!tip]
> Comparte el plan del que de verdad quieres hablar. Si sigues trabajando en él mientras otros lo miran, guarda una copia (**Guardar como copia…** en el menú de guardado) y comparte esa, para que el enlace no les cambie mientras lo miran.

### Detener un enlace {#stop-sharing}

**Dejar de compartir** termina el enlace al instante, sin preguntar. Quien lo abra después verá «**Este plan compartido ya no está disponible**». Eliminar el plan también termina su enlace. Si vuelves a compartir el plan más tarde, recibe un enlace nuevo, y el antiguo sigue sin funcionar. Las copias que otros ya guardaron en sus propios planes no se ven afectadas, porque son planes aparte.

## Abrir un plan compartido {#shared-view}

Un enlace compartido abre la página del plan con un aviso arriba: «**Plan compartido**», «Prueba cambios en tu propia copia. El plan compartido nunca cambia.»

### Tu copia de trabajo {#working-copy}

Lo que ves es una copia de trabajo. Puedes cambiar todo lo que podrías cambiar en un plan tuyo, como edificios, recetas, expertos, hábitats o el [[empire|imperio]] con el que se calcula. Deshacer y Rehacer funcionan como siempre.

- La copia solo existe en esta pestaña del navegador. Salir de la página la descarta sin preguntar. Con la sesión iniciada, conservas tus cambios con **Guardar en mis planes** (consulta [Restablecer, copiar, guardar](#shared-actions)).
- Los hábitats se quedan como los dejó el propietario. La optimización automática está desactivada hasta que actives **Auto** en Infraestructura.
- Las herramientas trabajan sobre tu copia. Las cantidades construidas en [Construcción](/help/plan_tools#construction) y los materiales excluidos en [Visitas](/help/plan_tools#visits) solo duran esa visita, y Reparación oculta su parte de FIO. Las existencias de [[fio|FIO]] que usen las herramientas son las tuyas.
- Sin sesión iniciada, ves el plan con el diseño Estándar y sin la pestaña POPR. Con la sesión iniciada, lo ves con tu propio diseño.
- Si abres un enlace a un plan tuyo, PRUNplanner abre directamente el plan.

### Precios {#shared-prices}

Bajo el título del aviso, una nota te dice qué precios usan las cifras: «Precios: …» seguido de «Quien lo compartió puede ver cifras distintas.»

- **Con sesión iniciada**, PRUNplanner calcula la copia con tu imperio por defecto (o con el primero), así que los precios siguen la [[exchange-preference|preferencia de bolsa]] de ese imperio («tu configuración de bolsas: {name}»). Un imperio sin preferencia usa la media de 30 días de [[universe|Universe]].
- **Sin sesión iniciada**, los precios son la media de 30 días del universo.

> [!tip]
> ¿Comparas cifras con el propietario? Dile qué preferencia de bolsa usas, o comprobad los dos las cifras con la misma preferencia. El beneficio y la amortización pueden variar mucho entre bolsas.

### Comparar con la versión compartida {#vs-shared}

En cuanto tu copia difiere del plan compartido, el aviso dice «**Cambiado respecto a la versión compartida**». Una línea bajo la cabecera lista lo que ha cambiado, tras «**vs. compartido:**»:

| Cifra                         | Se muestra como                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Beneficio                     | la variación en ȼ / día, en verde si ha subido y en rojo si ha bajado             |
| [[roi\|ROI]]                  | la amortización antes → después, en verde si se ha acortado                       |
| Área, Mano de obra, Edificios | la variación del área usada, los trabajadores necesarios y el número de edificios |

Por ejemplo (cifras inventadas), si el plan compartido gana 10.000 ȼ al día y tu copia gana 12.000 ȼ, Beneficio muestra la subida de 2.000 ȼ/día en verde.

La línea solo lista las cifras que han cambiado. En Producción, los edificios cambiados llevan la etiqueta **nuevo**, **cantidad cambiada** o **receta cambiada**, y las recetas que el edificio compartido no tenía llevan **nuevo**. Los edificios eliminados siguen en la lista, tachados, como **eliminado**.

### Restablecer, copiar, guardar {#shared-actions}

- **Restablecer a la versión compartida** descarta tus cambios y vuelve al plan compartido.
- **Copiar cambios** pone un resumen en tu portapapeles, listo para pegar en Discord. Incluye el nombre y el planeta del plan, una línea por cambio, el beneficio y la amortización antes → después, los precios que usaste y el enlace. Se corta a 2.000 caracteres, con «…y {n} más» para el resto. Un mensaje lo confirma: «**Cambios copiados, pégalos en Discord**».
- **Guardar en mis planes** (o Ctrl+S, ⌘+S en un Mac) guarda tu copia, con tus cambios, como un plan nuevo tuyo. El cuadro te pide un **Nombre** (sugiere el nombre del plan con «(Copia)») y, si tienes imperios, un **Imperio**. **Crear** lo guarda y abre tu plan nuevo. El plan del propietario y su enlace no cambian.
- Si no has iniciado sesión, en su lugar aparecen **Regístrate para guardarlo** e **Iniciar sesión**.

> [!tip]
> ¿Quieres proponer una mejora para la base de alguien? Haz el cambio en la copia, mira la línea «vs. compartido:», luego pulsa **Copiar cambios** y pega el resumen en el hilo. Verá exactamente qué has cambiado y qué efecto tiene en el beneficio y la amortización, con el enlace para abrirlo él mismo.

## Vistas previas del enlace {#link-previews}

Pega un enlace compartido en Discord, o en otra app de chat que muestre vistas previas de enlaces, y se despliega en una tarjeta del plan. La tarjeta está en inglés.

- **Título**: el planeta y después el nombre del plan, por ejemplo «Montem (OT-580b) · Iron base».
- **Texto**: quién lo compartió, el beneficio por día, la amortización cuando el plan se amortiza («pays back in 42 days»), el programa de COGC del plan y las salidas que produce. Después la base de precios de la salida principal (por ejemplo «CI1 30-day average», u «own prices» para un [[fixed-price|precio fijo]]) y la fecha de esos precios. Termina con «Open it to see the whole base and try changes, no account needed.»
- **Imagen**: el planeta y el nombre del plan, quién lo compartió, el beneficio por día en cifras grandes, la amortización, el área usada del área disponible y hasta cuatro salidas con sus cantidades por día.

La tarjeta usa las cifras que PRUNplanner guardó con el último guardado del plan. Crear un enlace desde la página del plan también guarda las cifras actuales si el plan no tiene cambios sin guardar. Cada guardado le da al enlace una tarjeta nueva.

A veces no hay cifras guardadas, por ejemplo en un plan guardado por última vez antes de que existieran las vistas previas, o justo después de activar una versión anterior. Entonces la tarjeta muestra el planeta, el COGC, el número de edificios y lo que fabrica el plan, sin beneficio ni amortización. Guarda el plan una vez para añadirlos.

> [!tip]
> Guarda el plan antes de publicar su enlace. La tarjeta muestra las cifras del último guardado, así que un enlace publicado con cambios sin guardar muestra las cifras antiguas.
