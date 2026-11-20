PRUNplanner conserva tu trabajo en un [[plan|plan]] con guardados, borradores de los cambios sin guardar, deshacer, copias y versiones con nombre a las que puedes volver. Cuando el mismo plan cambia en dos sitios, pregunta antes de sobrescribir nada. Para enseñar un plan a otra persona, consulta [Compartir un plan](/help/plan_sharing).

Léelo cuando quieras saber si tus cambios están a salvo, cómo volver a un estado anterior de un plan o qué significa un mensaje de guardado.

## Guardar y deshacer {#saving-and-undo}

Ponle nombre a tu plan con el lápiz junto a su nombre. Intro o hacer clic fuera conserva el nombre, y Esc lo cancela. Guárdalo con **Guardar** (**Crear** para un plan nuevo) o con Ctrl+S (Cmd+S en un Mac).

- **Guardar** solo aparece cuando hay algo que guardar, y sigue desactivado hasta que el plan tiene nombre.
- Un plan nuevo recibe su propia dirección en cuanto se crea, y tus imperios y enlaces usan esa. Hasta entonces, PRUNplanner no conserva nada de él, ni siquiera un [borrador](#drafts).
- Deshacer, Rehacer, el estado del plan y Guardar están juntos en un mismo control. En el móvil, Deshacer y Rehacer se quedan en la cabecera, y el estado con Guardar está sobre la navegación inferior.

El estado te dice cómo está el plan:

| Estado                                | Significado                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| «Guardado …»                          | Guardado a esa hora, seguido del nombre de la versión cuando tiene uno.                            |
| **Cambios sin guardar**               | Has cambiado algo desde el último guardado. Lo marca un punto ámbar.                               |
| «Sin guardar · borrador conservado …» | Sin guardar, pero conservado en un [borrador](#drafts).                                            |
| **Guardando…**                        | El guardado está en curso.                                                                         |
| **Error al guardar**                  | El guardado no se completó. Tus cambios se conservan, así que haz clic en **Reintentar guardado**. |
| **Borrador no guardado**              | Tus cambios sin guardar no se conservan en un borrador. Haz clic para volver a intentarlo.         |
| «Ponle nombre al plan para crearlo»   | Un plan nuevo necesita primero un nombre.                                                          |

Haz clic en el estado de un plan guardado para abrir sus [versiones](#versions).

> [!tip]
> **Recargar la versión guardada**, el icono junto a Guardar, te devuelve al plan tal como se guardó por última vez y descarta el borrador. Si tienes cambios sin guardar, pregunta antes.

### Borradores {#drafts}

Una vez creado un plan, PRUNplanner conserva sus cambios sin guardar como borrador unos 3 segundos después de cada cambio. Una recarga, una pestaña cerrada o un fallo no los perderán.

Un borrador no es un guardado. Se conserva con tu cuenta, pero tus imperios y el enlace para compartir del plan siguen usando la versión guardada hasta que guardas. Por eso la lista de versiones marca un borrador como «aún no está en ningún imperio».

Cuando vuelves a abrir el plan, siempre aparece como guardado. Un mensaje («Tienes cambios sin guardar de …») ofrece **Restaurar**. Tu siguiente cambio, o abrir una versión, cierra el mensaje, y tus cambios nuevos sustituyen al borrador. Si quieres recuperar esos cambios, haz clic en **Restaurar** antes de editar nada.

La página solo te avisa antes de salir cuando el borrador no puede guardar tus cambios. Eso pasa cuando el plan aún no se ha creado, el último cambio tiene menos de unos 3 segundos o el borrador ha fallado.

### Deshacer y rehacer {#undo}

Puedes deshacer cualquier cambio con **Deshacer** y **Rehacer**, o con Ctrl+Z y Ctrl+Mayús+Z (Cmd en un Mac). Las teclas no funcionan dentro de un campo de texto.

El historial guarda los últimos 50 cambios. Empieza de cero cuando abres, guardas o recargas el plan, y cuando descartas cambios. Mientras personalizas el diseño, las teclas deshacen en su lugar los cambios de diseño (consulta [Diseño](/help/plan_layout)).

## Guardar como copia {#save-as-copy}

Para un plan guardado y con nombre, la flecha junto a Guardar (**Opciones de guardado**) tiene **Guardar como copia…**. Abre **Guardar como**:

- **Nombre** empieza siendo el nombre del plan con « (Copia)».
- Si tienes imperios, un selector de imperio empieza con el imperio con el que se calcula el plan, y la copia se añade a él.
- **Crear** guarda el plan tal como está ahora, cambios sin guardar incluidos, como un plan nuevo y lo abre en una pestaña nueva. Tu original conserva su estado y sus cambios sin guardar.

> [!tip]
> Una copia es la forma de probar otra distribución de la misma base y quedarte con ambas. Ponles nombres claros a las copias, porque desde ese momento son planes independientes.

## Versiones {#versions}

Cada guardado conserva una versión del plan. Haz clic en el estado de un plan guardado para abrir **Versiones**.

- **Solo con nombre** está activado por defecto. La lista muestra tus versiones con nombre y la activa, con «… sin nombre ocultas» abajo. Desmárcalo para verlas todas.
- **Activa** marca la versión que es ahora tu plan.
- Si tienes cambios sin guardar, la fila de arriba los muestra como **Cambios sin guardar**, con «Borrador conservado … · aún no está en ningún imperio» o «No se conserva en un borrador».
- **Antes del historial de versiones** es el plan tal como era antes de que existieran las versiones. **Modificada por soporte** marca un cambio hecho por el soporte de PRUNplanner.
- Las versiones con nombre se quedan. PRUNplanner conserva las últimas 10 sin nombre, y las más antiguas desaparecen.

Por ejemplo, cuando un plan se crea y luego se guarda 14 veces sin nombre, se quedan las 10 más recientes de esas 15 versiones sin nombre y desaparecen las 5 más antiguas, mientras que todas las versiones con nombre se quedan. Para conservar un estado del plan para siempre, ponle nombre a su versión.

### Poner nombre a las versiones {#naming-versions}

Abre **Opciones de guardado** (o pulsa Ctrl+Alt+S, Cmd+Opción+S en un Mac), escribe un nombre en **Nombre de la versión (opcional)** y pulsa Intro o **Guardar con nombre**. Un nombre puede tener hasta 80 caracteres. Funciona con cualquier plan guardado y con nombre, aunque no haya nada sin guardar, y pone nombre al plan tal como está ahora.

Para ponerle nombre a una versión más tarde, o cambiárselo, usa **Poner nombre a esta versión** en su menú ⋯. Un nombre vacío quita el nombre.

Un plan tiene como máximo 20 versiones con nombre. En el límite, quítale el nombre a una o elimina una antes de ponerle nombre a otra.

### Vista previa, comparar y restaurar {#preview}

El ojo de una versión la muestra en modo de solo lectura. Un aviso te dice qué versión estás viendo, y los recuadros de resultados muestran sus números. Desde ahí:

- **Comparar con la actual** enumera lo que difiere de tu plan actual.
- **Restaurar** la carga como cambios sin guardar. Deshacer la quita, y guardar la convierte en la versión activa.
- **Abrir como plan nuevo** la copia en un plan nuevo en una pestaña nueva, con el nombre del plan más el nombre o la fecha de la versión. La copia no está en ningún imperio.
- **Volver a la actual** te devuelve a tu plan tal como estaba.

### Activar y eliminar {#make-active}

**Activar**, en el menú ⋯ de una versión o en el aviso de vista previa, cambia el plan a esa versión en un solo paso. Tus imperios y el enlace para compartir del plan la usan enseguida. Se coloca arriba como versión nueva («Restaurada desde …»), y la que elegiste se queda donde está. Los cambios sin guardar se descartan en cuanto confirmas.

**Eliminar** en el mismo menú quita una versión para siempre, después de que confirmes. No puedes eliminar la versión activa.

**Descartar cambios** en **Opciones de guardado** descarta tus cambios sin guardar y vuelve a la versión guardada, después de que confirmes.

## Conflictos al guardar {#conflicts}

El mismo plan puede estar abierto en dos pestañas o en dos dispositivos. PRUNplanner nunca sobrescribe uno con el otro sin preguntar.

Si otra pestaña de este navegador guarda el plan y no tienes cambios sin guardar aquí, esta pestaña carga el nuevo guardado. Si tienes cambios sin guardar, un mensaje dice «Guardado en otra pestaña. Se conservan tus cambios.» con **Recargar**.

Si guardas después de que el plan se haya guardado en otro sitio (otra pestaña u otro dispositivo), se abre **Guardado en otra pestaña**. No te preocupes, cuando se abre aún no se ha sobrescrito nada. Enumera lo que cambió allí y lo que cambiaste tú, y ofrece:

| Opción                      | Qué hace                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Guardar como plan nuevo** | Guarda tus cambios como una copia («… (copia)») en el imperio del plan y la abre. El original conserva la otra versión. |
| **Sobrescribir**            | Sustituye la otra versión por la tuya.                                                                                  |
| **Recargar**                | Descarta tus cambios y carga la versión guardada.                                                                       |
| **Seguir editando**         | Cierra el diálogo sin guardar nada todavía.                                                                             |

Si el plan se eliminó en otro sitio, **Eliminado en otra pestaña** solo ofrece **Guardar como plan nuevo**.

Los borradores tienen sus propias comprobaciones:

- **Borrador guardado en otro sitio** significa que otra pestaña u otro dispositivo conservó un borrador más reciente de este plan. El guardado automático se pausa hasta que eliges **Conservar los míos** o **Cargar el otro borrador**. **Decidir más tarde** cierra el diálogo y deja el guardado automático en pausa.
- **Cambios sin guardar sobre una versión anterior** significa que dejaste cambios sin guardar y el plan se ha vuelto a guardar desde entonces. Elige **Conservar mis cambios** (encima del guardado más reciente), **Usar la versión guardada** (elimina tus cambios sin guardar) o **Decidir más tarde**.

> [!tip]
> ¿Trabajas en un plan desde dos dispositivos? Guarda antes de cambiar. Así el otro dispositivo solo tiene que recargar, y nunca necesitas el diálogo de conflicto.
