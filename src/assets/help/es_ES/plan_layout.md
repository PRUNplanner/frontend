Puedes organizar las partes de la página del plan según tu forma de planificar. Usa el diseño Estándar o crea el tuyo propio, pliega partes, agrúpalas como pestañas y decide cómo se ve la página en un teléfono. La página también muestra sugerencias de plan basadas en lo que planifican otros jugadores.

Úsalo, por ejemplo, para tener E/S de materiales a la vista junto a una lista de Producción larga, o para plegar las partes que configuras una sola vez. El diseño solo guarda dónde van las partes, qué tamaño tienen, qué está plegado y si las partes llevan tinte, así que cambiarlo nunca cambia las cifras de tu plan.

## Las partes de la página {#parts}

- **Base**: **Imperio y precios**, **Planeta**, **Mano de obra**, **Infraestructura** y **Expertos**. Consulta [Configuración de la base](/help/plan_base).
- **Producción**, con las herramientas como pestañas: **Construcción**, **Suministro**, **Visitas**, **Reparación**, **Beneficio**, **Revisión del plan** y **POPR**. Consulta [Producción y recetas](/help/plan_production), [Herramientas del plan](/help/plan_tools) y [Revisión del plan](/help/plan_check). POPR solo aparece si has iniciado sesión.
- **E/S de materiales** y **Totales de E/S de materiales**.
- Los cinco recuadros de resultados: **Beneficio / día**, **Amortización**, **Mano de obra %**, **Área** y **Almacenamiento**. Consulta [Resultados](/help/plan_results).

Cada parte aprovecha el espacio que recibe. Si le das más ancho, muestra más cosas una al lado de otra en lugar de crecer en altura. Los expertos llenan tantos por línea como quepan, y los niveles de [[workforce|mano de obra]] se colocan uno junto a otro. El diseño es el mismo para todos tus planes.

## El menú Diseño {#layout-menu}

El botón **Diseño** de la cabecera del plan elige el diseño. Solo lo ves si has iniciado sesión, y por debajo de 768 px se muestra solo como icono.

- **Estándar**: resultados arriba, Base a la izquierda, Producción con sus herramientas en el centro y E/S de materiales a la derecha. Estándar nunca cambia.
- **Diseño personalizado**: tu propia organización. Aparece en cuanto guardas uno. Hay un único Diseño personalizado, que se usa para todos tus planes. Cambiar a Estándar lo conserva, así que puedes volver a él cuando quieras.

Personalizar siempre parte de una copia. Elige **Personalizar, partiendo de Estándar…**, o **Personalizar el diseño personalizado…** mientras usas el Diseño personalizado. Por debajo de 768 px no se ofrece la opción de personalizar, pero sigues pudiendo cambiar de diseño ahí.

## Personalizar {#customise}

Mientras personalizas, la página muestra su contenido real, pero no puedes hacer clic en él. La barra de título de cada parte lleva un asa (⋮⋮), su tamaño, el ojo que la oculta y su menú ⋯. Los recuadros de resultados también reciben una barra de título, y **Elementos** se abre junto a la página.

La barra superior tiene:

- **Disposición**: **Ancho** o **Teléfono**, consulta [Ancho y Teléfono](#phone).
- **Columnas** (de 4 a 24, solo en Ancho) y **Separación** (8, 12, 16 o 24 px). Al cambiar las columnas, cada parte conserva su proporción del ancho. Por ejemplo, pasar de 12 a 24 columnas convierte una parte de 4 columnas de ancho en una de 8. Las proporciones que no se dividen exactamente se redondean a columnas enteras.
- **Partes tintadas**: da a todas las partes un fondo un poco más claro para tener más contraste, en cualquier diseño y en todas las pantallas. Se guarda en cuanto lo marcas.
- **Elementos · N**: hay N partes sin colocar en la disposición que se muestra.
- **Deshacer** (también Ctrl/⌘+Z), **Volver a Estándar** (Ancho como Estándar, Teléfono automático, y puedes deshacerlo), **Cancelar** y **Guardar**.

Si cambiaste algo, **Cancelar** (o Esc) pregunta «¿Descartar tus cambios de diseño?». **Descartar cambios** los elimina y **Seguir editando** te devuelve a la edición. Durante un arrastre, Esc cancela solo ese arrastre. **Guardar** guarda ambas disposiciones como tu Diseño personalizado. Si guardas la copia de Estándar sobre un Diseño personalizado existente, PRUNplanner te pregunta antes: **Reemplazar diseño personalizado** o **Seguir editando**.

> [!tip]
> Ocultar una parte, unir partes, volver a sacarlas o restablecer muestra un mensaje con **Deshacer**. También puedes pulsar Ctrl/⌘+Z en cualquier momento mientras personalizas. En el diseño no hay rehacer.

### Mover {#moving}

- Arrastra una parte por su barra de título. Un recuadro discontinuo con el texto **Va aquí** muestra dónde caerá.
- Su borde superior se alinea con el de una parte contigua, y una línea amarilla indica con cuál. Mantén pulsado Alt para colocarla libremente.
- Suéltala sobre la barra de título de otra parte para unirla a esa parte. Antes de soltar, la barra de título se divide en **Pestaña**, **Debajo** y **Al lado**. Consulta [Pestañas y partes unidas](#tabs).
- Arrástrala a la franja superior para fijarla ahí, o usa **Fijar arriba** en su menú ⋯. La franja solo acepta partes soltadas mientras haya algo fijado. Si no hay nada fijado, usa **Fijar arriba**.

### Tamaño {#sizing}

- Arrastra el borde izquierdo o derecho para fijar el ancho en columnas, el borde inferior para la altura o la esquina para ambos.
- Si creces hacia una parte contigua, esa parte se estrecha, hasta su mínimo. Ahí el borde se detiene, y el indicador lo avisa.
- El borde inferior se ajusta al borde inferior de una parte contigua, a la altura de otra parte y al propio contenido de la parte. Mantén pulsado Alt para cambiar el tamaño libremente.
- Un indicador muestra el tamaño mientras arrastras.
- Las partes nunca se hacen más pequeñas de lo que necesitan. Producción mide al menos 540 px de ancho.

### Altura {#height}

Cada parte tiene uno de tres modos de altura. Lo eliges en la fila Alto del menú ⋯:

| Modo                                       | Qué hace                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Ajustar al contenido**                   | Crece con su contenido.                                                           |
| **Ajustar al contenido, como máximo N px** | Crece con su contenido hasta N px y luego se desplaza por dentro.                 |
| **Fijo N px**                              | Mantiene su altura. El contenido más alto se desplaza por dentro. |

Por ejemplo, con un límite de 480 px, una parte con 300 px de contenido mide 300 px de alto, y una con 600 px mide 480 px y desplaza el resto por dentro. Con **Fijo N px** a 480 px, ambas miden 480 px de alto.

Cuando una parte aún no tiene altura definida, «como máximo» y «fijo» parten de la altura actual de su contenido, como máximo 480 px.

Arrastrar el borde inferior pone **Fijo N px** a la nueva altura. Una parte en «como máximo» sigue en «como máximo», con el nuevo límite. Cuando el borde se ajusta al propio contenido de la parte, la parte vuelve a **Ajustar al contenido**. **Más bajo, −40 px** y **Más alto, +40 px** de la fila Alto funcionan igual.

### Fijar arriba y Seguir al desplazar {#pin-follow}

- **Fijar arriba** coloca una parte en la franja superior de la página. La franja se queda quieta mientras desplazas el resto. Si fuera a ocupar más del 40 % de la ventana y la página de abajo necesita el espacio, se corta ahí y se desplaza por dentro. Si no queda nada más en la página, la franja es la página.
- **Seguir al desplazar** mantiene una parte a la vista en sus propias columnas. Al desplazarte más allá de ella, baja contigo, junto con las partes que tiene debajo en esas columnas, hasta la primera parte de abajo que se sale de esas columnas, o hasta que termina la página.
- Una parte se fija o sigue, no ambas cosas. Fijar una parte hace que deje de seguir, y hacer que siga la desfija. Seguir no funciona en la disposición Teléfono.

> [!tip]
> E/S de materiales junto a una lista de Producción larga es el caso clásico para Seguir al desplazar. Ponla también en **Ajustar al contenido, como máximo N px**, para que quepa en la ventana.

### El menú ⋯ {#item-menu}

El menú ⋯ de cada parte hace todo lo que hace un arrastre, y algo más:

- Filas Ancho y Alto con botones pequeños: − y +, **Ancho completo** y los modos de altura. El menú sigue abierto tras un clic, así que puedes volver a hacer clic, y el encabezado de la fila nombra el botón que tienes bajo el puntero.
- **Fijar arriba** y **Seguir al desplazar**.
- **Barra de título**: desactívala para mostrar solo el contenido de la parte, como en los recuadros de resultados. Entonces la parte no se puede plegar, y al personalizar se sigue viendo la barra. Una parte con varias pestañas conserva su barra de título, porque sus pestañas están ahí.
- **Mover**: **Una columna a la izquierda**, **Subir**, **Bajar**, **Una columna a la derecha**.
- **Pestaña, debajo o al lado …** (o **Pestañas ({n}) …** en una parte con varias pestañas). Consulta [Pestañas](#tabs).
- **Visualización**: Mano de obra se muestra **Como tarjetas** o **Como tabla** con una fila por nivel (en una parte estrecha, la tabla se desplaza en horizontal). Para Mano de obra, Expertos e Infraestructura, **Todo abierto** muestra todos los niveles, campos de expertos y botones, también en la página. En Infraestructura eso incluye los botones **Más barata** y **Menos área**, incluso con **Auto** activado.
- **Ocultar**.

Unos iconos pequeños tras el tamaño de una parte muestran lo que está activado: fijada, sigue, sin barra de título, todo abierto, tabla. Cuando algo no es posible, el menú te dice por qué.

También puedes usar el teclado. Pon el foco en el asa de una parte: las flechas la mueven, Mayús+flechas cambian su tamaño (arriba y abajo en pasos de 40 px), y Intro o Espacio abren el menú.

### Ocultar y Elementos {#hiding}

- El ojo de una barra de título oculta la parte. En una parte con pestañas, oculta la pestaña que se está viendo. También puedes soltar una parte sobre **Elementos**. Si la arrastras por su barra de título, se va el grupo entero, con todas sus pestañas.
- Producción siempre se queda en la página, igual que cualquier pestaña que la contenga.
- Las partes de abajo suben para ocupar el hueco, y **Deshacer** en el mensaje recupera la parte.
- **Elementos** lista todas las partes, agrupadas en **Base**, **Producción y herramientas**, **E/S de materiales** y **Resultados**, e indica dónde está cada una: **En la página**, **Fijado arriba**, como pestaña o parte de otra, u **Oculto**. **Añadir** coloca una parte oculta al final. Arrastra cualquier parte a la página para colocarla o moverla (una pestaña sale de su grupo). **Mostrar** cambia a su pestaña, se desplaza hasta ella y la resalta.

> [!tip]
> ¿No encuentras una parte en la página? Mientras personalizas, **Elementos** dice dónde está cada una. Una parte que ocultaste aparece como **Oculto**, y **Añadir** la recupera.

### Partes nuevas {#new-parts}

Cuando PRUNplanner incorpora una parte nueva, se añade una vez a tu Diseño personalizado, al final de ambas disposiciones. Aparece marcada como **Nuevo** durante esa visita, y un mensaje te lo avisa. Muévela u ocúltala como cualquier otra parte.

## Pestañas y partes unidas {#tabs}

Una parte puede contener otras como pestañas. En Estándar, las herramientas son pestañas de Producción.

- Para convertir una parte en pestaña de otra, arrástrala sobre el tercio izquierdo de la barra de título de esa parte, o elige **Pestaña** en **Pestaña, debajo o al lado …** de su menú ⋯.
- Haz clic en una pestaña para verla. Para volver a sacar una pestaña, arrástrala fuera de la barra de título. Arrastrar la primera pestaña mueve todo el grupo.
- **Pestañas ({n}) …** del menú ofrece **Sacar {name}** para cada pestaña salvo la primera, y **Separar todo en elementos independientes**.
- Solo una parte suelta puede unirse a otra. Una parte con varias pestañas solo se puede mover, así que saca antes sus pestañas.
- La página se abre con la pestaña que se mostraba cuando guardaste el diseño. Una pestaña en la que haces clic en la página dura esa visita.

### Varias partes en una pestaña {#joined-parts}

Una pestaña puede mostrar varias partes una debajo de otra o una al lado de otra, nunca ambas cosas.

- Suelta una parte en el tercio central de una barra de título para mostrarla **Debajo** de la parte que se muestra ahí, o en el tercio derecho para mostrarla **Al lado**. El menú también tiene **Debajo** y **Al lado**. Si el espacio es demasiado estrecho para ponerlas todas una al lado de otra, se colocan debajo.
- Una pestaña que ya muestra varias partes solo acepta más en su mismo sentido. El otro aparece tachado.
- Arrastra una parte sobre las partes de una pestaña para soltarla entre dos de ellas o en cualquiera de los extremos. Una línea azul muestra dónde.
- Arrastra una parte por su cuerpo para moverla dentro de su pestaña o sacarla de ella. Sacar la primera parte convierte la siguiente en la propia de la pestaña. El menú solo saca las demás partes.
- El menú cambia toda la pestaña entre debajo y al lado.
- Dos partes se llaman «A & B». Tres o más se llaman como la primera parte con un número, por ejemplo «E/S de materiales +2». Pasa el puntero por el nombre para verlas todas.
- Arrastra la línea entre dos partes para cambiar el tamaño solo de esas dos. Una al lado de otra, ocupan columnas enteras y la última parte se queda con el resto. Una debajo de otra, la parte que está por encima de la línea recibe una altura en px y se desplaza por dentro cuando su contenido es más alto.
- **Menos espacio para {name}** y **Más espacio para {name}** hacen lo mismo por pasos (una columna o 40 px). **Auto** vuelve a repartir según sus tamaños.
- Ocultar la pestaña oculta todas sus partes.

## Ancho y Teléfono {#phone}

El Diseño personalizado tiene dos disposiciones. Eliges una en **Disposición** mientras personalizas:

- **Teléfono** se usa cuando la página mide menos de 760 px de ancho: teléfonos, tabletas en vertical, una ventana estrecha. El ancho se cuenta después del menú lateral, así que una ventana de 1024 px con el menú lateral completo abierto también usa Teléfono.
- **Ancho** se usa en los demás casos.

Cada disposición tiene sus propias partes, posiciones, tamaños, pliegues, ajustes de visualización y separación. Teléfono se edita al ancho de un teléfono, en dos columnas.

Hasta que cambies algo en Teléfono, es automático. Muestra Ancho como lo vería un teléfono, con todas las partes apiladas en orden y las pequeñas de dos en dos por fila. Tu primer cambio ahí parte de eso, y **Volver a automático** vuelve a seguir a Ancho.

Mientras personalizas Ancho, una nota lista las partes que las pantallas más estrechas reorganizan para mantener su ancho mínimo.

## Plegar {#folding}

- El chevrón de una barra de título pliega una parte hasta dejar solo su título, con un breve resumen detrás. Los recuadros de resultados y las partes sin barra de título no se pliegan.
- Cuando dos o más partes plegadas están en la misma fila que partes abiertas, las plegadas se apilan en una columna corta y las abiertas de esa fila ocupan su espacio.
- Las partes plegadas siguen plegadas, uses el diseño que uses. Ancho y Teléfono guardan sus propios pliegues.

Un recuadro de resultados abre la parte de la que sale su cifra y la despliega:

| Recuadro            | Abre             |
| ------------------- | ---------------- |
| **Beneficio / día** | **Beneficio**    |
| **Amortización**    | **Construcción** |
| **Mano de obra %**  | **Mano de obra** |
| **Área**            | **Planeta**      |
| **Almacenamiento**  | **Visitas**      |

El enlace **Revisión del plan →** bajo E/S de materiales hace lo mismo con Revisión del plan. Si la parte está oculta, se abre en un cuadro de diálogo.

> [!tip]
> Pliega las partes que configuras una vez por plan, como Imperio y precios o Expertos. Conservan un resumen de una línea, y todos los planes se abren así.

## Pantallas más pequeñas {#smaller-screens}

- Cuando una parte fuera a quedar más estrecha de lo que necesita, PRUNplanner reorganiza las partes a ese ancho (marcado como «auto» mientras personalizas). Tu diseño en sí no cambia.
- Por debajo de 760 px, Estándar apila todas las partes en orden, las pequeñas de dos en dos por fila, igual que el Teléfono automático.
- En un teléfono eliges las recetas en una hoja que sube desde abajo, y el estado de guardado con **Guardar** queda encima de la barra de navegación.

## Dónde se guarda tu diseño {#saved}

- Tu diseño (Estándar, o Diseño personalizado con ambas disposiciones), lo que está plegado y Partes tintadas se guardan en tu cuenta y se usan en todos tus dispositivos.
- Un cambio hecho en otra pestaña del mismo navegador aparece allí al instante. Un cambio hecho en otro dispositivo aparece cuando recargas la página.
- Mientras personalizas, una nota «Tu diseño se cambió en otro lugar» te pregunta si quieres **Cargarlo**. Si tienes cambios sin guardar, vuelve a preguntar antes de descartarlos.
- Si falla el guardado en tu cuenta, el diseño se sigue usando, y PRUNplanner lo envía con tu siguiente cambio o cuando sales de la página.
- Sin sesión iniciada, un plan compartido siempre se muestra en Estándar. Plegar funciona, pero solo hasta que recargas.

## Sugerencias de plan {#suggestions}

PRUNplanner muestra lo que otros jugadores planifican en el mismo planeta. Las cifras salen de planes modificados en los últimos 180 días por jugadores activos en los últimos 90 días, y PRUNplanner las actualiza varias veces al día. Un planeta necesita al menos 15 de esos planes de al menos 10 jugadores. Los edificios y las recetas solo aparecen cuando los usan al menos el 5 % de los planes y al menos 10 jugadores. En un planeta con menos planes no aparece ninguna de las sugerencias de abajo.

Por ejemplo, imagina un planeta con 40 de esos planes de 25 jugadores. Un edificio que está en 4 de ellos (10 %), de 4 jugadores, no aparece, porque lo usan menos de 10 jugadores. Un edificio que está en 12 de ellos (30 %), de 11 jugadores, sí aparece.

- **Información de planificación**: cuando el planeta tiene suficientes planes, la parte **Planeta** muestra un enlace «{n} planes en {planet} · lo que otros construyen aquí». Abre un cuadro con los [[experts|expertos]], los edificios de producción y las [[recipe|recetas]] que usan esos planes, en porcentajes.
- **Selector de edificios**: en Producción, el selector de edificios empieza con un grupo «Popular en {planet} · {plans} planes». Lista hasta 8 edificios con el porcentaje de planes que los tienen, y después **Todos los edificios**.
- **Selector de recetas**: una columna **Planes** muestra el porcentaje de planes con ese edificio que usan la receta («< 5 %» cuando es demasiado rara para mostrarla), y puedes **Ordenar por** **Populares**.
- **Edificio vacío**: un edificio sin receta muestra **Más planificado aquí:** con la combinación de recetas más planificada del planeta, su porcentaje y **Añadir**.
- **Empieza con una configuración típica en {planet}**: un plan vacío que puedes editar te ofrece los edificios más planificados del planeta, hasta 8. Los que están en al menos el 20 % de los planes vienen marcados. Cada uno trae su cantidad típica (**Cantidad**) y **Recetas típicas**. También lista los expertos que tienen al menos la mitad de los planes, con su número típico. **Usar configuración típica ({count})** añade los edificios marcados y los expertos, y activa **Auto** en Infraestructura, para que los hábitats sigan a la mano de obra. Es un solo paso de deshacer, y no se guarda nada hasta que guardes. **Empezar vacío** oculta la tarjeta, y la lista vacía de Producción tiene entonces un enlace para recuperarla.

Para desactivar todo esto, desactiva **Sugerencias de plan** en **Perfil › Preferencias**. Está activado por defecto. Consulta [Perfil y preferencias](/help/profile#preferences).

> [!tip]
> La configuración típica muestra lo que planifican otros, no lo que más gana. Después de usarla, revisa su [[profit|beneficio]] en los resultados y haz la [Revisión de mercado](/help/plan_check#market-check) de sus salidas antes de construir.
