[Gestión](/manage) es donde organizas tu cuenta. Creas y eliminas imperios y preferencias de bolsa, conectas cada imperio con sus precios y decides qué planes pertenecen a qué imperio. La usarás para preparar tu primer imperio y tu primera preferencia de bolsa, y más adelante para mover planes entre imperios o eliminar los que ya no necesitas.

## Conceptos básicos {#core-concepts}

PRUNplanner guarda tu planificación en tres tipos de cosas, y cada una tiene su propia sección en la página.

### Planes {#plans}

Un [[plan|plan]] es una base: su planeta, edificios, recetas y bonificaciones. Creas un plan a partir de un planeta en [Búsqueda de planetas](/search). Un plan puede estar en varios imperios a la vez, o en ninguno. Así puedes reutilizarlo en un imperio con tus bases reales y en otro para una futura expansión.

Un plan no tiene preferencia de bolsa propia. Usa la [[exchange-preference|preferencia de bolsa]] de su imperio. Si está en varios imperios, usa la del imperio con el que se calcula, que eliges en el plan (consulta [Imperio y precios](/help/plan_base#empire-and-prices)).

### Imperios {#empires}

Un [[empire|imperio]] es un grupo de planes, por ejemplo todas las bases que tienes en el juego, o un conjunto que quieres comparar. Guarda tu [[faction|facción]] y tus [[area-permits|permisos]], que cambian la bonificación de producción de cada plan que contiene, y usa una preferencia de bolsa para sus precios. La página [Imperio](/help/empire) muestra las cifras de un imperio.

La facción y los permisos importan porque definen la bonificación de [[faction|facción]]: los edificios de la especialización de tu facción reciben una bonificación que es mayor cuantos menos permisos uses. Por ejemplo, con 1 de 2 permisos usados PRUNplanner cuenta la bonificación base de la facción 4 veces, y con 2 de 2 usados, dos veces. Por eso la página te pide que indiques en cada imperio tu facción y los permisos correctos, para que la eficiencia de los planes salga bien.

### CX {#cx}

Una preferencia de bolsa guarda tus reglas de precios: qué [[cx|bolsa]] y qué base de precio usar, y los precios fijos. Una preferencia puede servir a varios imperios, pero un imperio solo usa una. Sus reglas se editan en [Bolsas](/help/exchanges).

## Configuración de imperios {#empire-configuration}

La tabla **Configuración de imperios** enumera tus imperios con su facción, sus permisos (usados / totales), su número de planes y la preferencia de bolsa en la columna CX. Mientras no tengas ninguno, la tabla dice «No hay imperios disponibles», y **Nuevo imperio** es donde empiezas.

- **Nuevo imperio** abre un formulario con **Nombre del Imperio** (obligatorio, hasta 100 caracteres), **Facción**, **Permisos totales** (al menos 2) y **Permisos usados** (al menos 1, no más que el total). **Crear** guarda el imperio al instante.
- Elige la preferencia de bolsa del imperio en la columna CX, o elige «Ninguna» para obtener precios Universe · VWAP 30D. Este cambio espera a la barra de guardado.
- Eliminar un imperio pide confirmación. Sus planes no se eliminan. Solo dejan de estar en ese imperio.

Puedes cambiar más tarde el nombre, la facción y los permisos de un imperio en la página [Imperio](/help/empire#configuration).

## Configuración de CX {#cx-configuration}

La tabla **Configuración de CX** enumera tus preferencias de bolsa y si algún imperio las usa (**Sí** con el número de imperios, o **No**).

- El botón sobre la tabla abre un formulario para una preferencia nueva. Dale un nombre de hasta 100 caracteres y pulsa **Crear**, que la guarda al instante.
- Haz clic en el nombre de una preferencia para editar sus reglas en [Bolsas](/exchanges).
- Eliminar una preferencia pide confirmación y elimina todas sus reglas. Los imperios que la usaban siguen funcionando, pero sin preferencia, así que asígnales otra. Hasta entonces reciben precios Universe · VWAP 30D, igual que con «Ninguna».

## Asignaciones plan ↔ imperio {#assignments}

Esta tabla tiene una fila por plan y una columna de casillas por imperio. Marca una casilla para meter el plan en ese imperio, y desmárcala para sacarlo. Hasta que guardes, las casillas cambiadas se marcan con «Se añadirá a …» o «Se quitará de …».

- **Buscar plan o planeta**, **En el imperio** y el filtro de solo sin asignar acotan las filas. La casilla de la cabecera de la columna de un imperio añade o quita todos los planes que muestran la búsqueda y los filtros.
- Cada fila tiene **Acciones**. **Clonar** copia el plan como «nombre (Clon)», guardado al instante y sin imperio. **Compartir…** crea un enlace para compartir (consulta [Compartir un plan](/help/plan_sharing#share-link)). **Eliminar…** elimina el plan después de que confirmes, y no se puede deshacer.
- Para eliminar varios planes, márcalos en la primera columna y pulsa **Eliminar seleccionados…**. La casilla de la cabecera de esa columna marca todos los planes que muestran la búsqueda y los filtros, incluidos los que tendrías que desplazarte para ver. Confirmas una sola vez para todos. Si algunos planes no se pueden eliminar, siguen marcados y un mensaje dice cuántos, para que puedas volver a intentarlo.
- Si la búsqueda y los filtros no dejan ninguna fila, la tabla dice «Ningún plan coincide con la búsqueda y los filtros.»

En el móvil, la tabla se convierte en una lista de tarjetas.

## Guardar {#saving}

Las elecciones de preferencia de bolsa y las casillas de asignación se acumulan en la barra de guardado de abajo. Cuenta tus cambios, **Guardar cambios** los guarda todos y **Descartar** los descarta. Tras guardar, aparece «Todos los cambios guardados» durante unos segundos. Si el guardado falla, tus cambios se quedan y puedes pulsar **Reintentar**. La página pregunta antes de que salgas con cambios sin guardar.

Crear, eliminar y clonar se guardan al instante, sin la barra de guardado.
