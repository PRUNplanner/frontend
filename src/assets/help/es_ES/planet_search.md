Usa **Búsqueda de planetas** para encontrar un planeta que ya conoces, o los mejores sitios para una producción nueva. Es el punto de partida antes de un [[plan|plan]]. Filtras todos los planetas por recursos, condiciones, [[cogc|COGC]], infraestructura y [[jumps|saltos]], y luego comparas los mejores lado a lado. Funciona sin cuenta, y los resultados se actualizan en cuanto cambias un filtro.

## Dónde encontrarla {#where-to-find-it}

Búsqueda de planetas está en el grupo Planificación de la navegación, y en la página de inicio. Cuando no has iniciado sesión, una línea bajo el título dice que es gratis y no necesita cuenta. Solo necesitas iniciar sesión para las distancias a tus propios planes y para crear un plan a partir de un resultado.

Otras páginas también llevan aquí. [Cadenas de producción](/help/tools_production_chain) abre Búsqueda de planetas desde el selector de planeta de un paso de extracción y desde un hallazgo de Ubicación, y la página del Imperio enlaza aquí mientras preparas tus primeros planes.

## Nombre o ID {#name-or-id}

Escribe parte de un nombre o ID en la casilla de arriba (**Nombre de planeta o sistema, o ID**). Coincide con el ID natural del planeta («OT-580b»), su nombre («Montem»), su nombre en el juego («Antares II e») y el nombre de su sistema, así que «Antares II» enumera todos los planetas de ese sistema.

Una búsqueda por nombre muestra todos los planetas que coinciden, aunque tus filtros ocultarían algunos. Entonces una nota sobre los resultados dice que tus filtros están en pausa.

- _Aplicar filtros_ vuelve a combinar el nombre con tus filtros. La nota dice entonces cuántos planetas coincidentes ocultan los filtros. También ofrece hasta tres cambios que mostrarían más de ellos, cada uno con el número de planetas que añade.
- _Mostrar todo_ vuelve a poner los filtros en pausa.

Tus filtros se conservan en ambos casos. Cuando borras el nombre, la siguiente búsqueda por nombre vuelve a empezar con ellos en pausa. Si los filtros no ocultan ninguna coincidencia, no aparece la nota.

> [!tip]
> ¿Buscas un planeta que alguien ha mencionado en el chat? Escribe su nombre. No hace falta que borres antes tus filtros.

## Materiales {#materials}

Puedes buscar uno o varios grupos de materiales.

- Cada grupo coincide con **cualquiera de** o **todos los de** sus materiales. Un grupo nuevo empieza como **cualquiera de**.
- Los grupos se combinan con **todos los grupos** (por defecto) o **algún grupo**.
- **+ añadir material…** añade un material a un grupo, y cada opción muestra cuántos planetas obtendrías con él. × quita un material, **Quitar** quita un grupo entero y **+ Añadir grupo** añade uno.

Eso cubre búsquedas como «(FEO y H2O) o (MAG y O)»: dos grupos **todos los de**, combinados con **algún grupo**.

Puedes dar a cada material una [[extraction|extracción]] diaria mínima («mín. … /día»). Es la tasa diaria del planeta para el material, y un plan calcula a partir de ella su receta de EXT, RIG o COL allí, así que un mínimo más alto deja los planetas donde cada extractor rinde más. El «(máx. …)» de al lado es la mayor extracción diaria de ese material en cualquier planeta, para que sepas qué es posible. Un mínimo pertenece al material, no al grupo. Si el mismo material está en dos grupos, comparten un mínimo.

## Condiciones del planeta {#planet-conditions}

Elige planetas **Rocoso** y/o **Gaseoso**, y si tienen que ser **Fértil** (permitir cultivos). Una búsqueda nueva empieza solo con planetas rocosos. Siempre queda marcada al menos una superficie.

La [[fertility|fertilidad]] solo importa para las granjas (FRM y ORC). En un planeta sin ella, PRUNplanner pone su eficiencia a 0, así que allí no producen nada.

La gravedad, la presión y la temperatura solo importan por los [[extra-building-materials|materiales de construcción adicionales]] que exigen. En **Aceptar materiales de construcción adicionales**, marca los que estás dispuesto a llevar:

| Material | Necesario para       |
| -------- | -------------------- |
| MGC      | **Gravedad baja**    |
| BL       | **Gravedad alta**    |
| SEA      | **Presión baja**     |
| HSE      | **Presión alta**     |
| INS      | **Temperatura baja** |
| TSH      | **Temperatura alta** |

Estos materiales importan porque un plan en ese planeta los añade a la construcción de cada edificio, así que suben su coste de construcción. Por ejemplo, un edificio con un área de 20 necesita 20 × 4 = 80 MCG en un planeta rocoso, y en un planeta de temperatura baja otros 20 × 10 = 200 INS.

Búsqueda de planetas oculta los planetas que necesitan algún material que no has marcado. Sin ninguno marcado, solo ves planetas que no necesitan ninguno. El material de superficie (MCG en planetas rocosos, AEF en los gaseosos) siempre hace falta y no forma parte de este filtro.

## COGC e infraestructura {#cogc-and-infrastructure}

**Programa COGC activo** deja los planetas que tienen en marcha uno de los programas marcados ahora mismo, es decir, en el momento en que abriste la página. La lista tiene todos los programas: los programas de publicidad de cada industria y los programas de mano de obra de cada nivel.

Un programa importa porque acelera la producción en un plan: un programa de publicidad acelera un 25 % los edificios de su especialización, y un programa de mano de obra acelera un 10 % los edificios que emplean ese nivel. En el juego, los residentes (jugadores con una base en el planeta) votan el programa, y el ganador está en marcha durante una semana, así que el programa que ves aquí puede cambiar más adelante.

**Infraestructura** es un filtro aparte, y más estricto. Un planeta tiene que tener todos los edificios marcados.

| Código | Edificio                      |
| ------ | ----------------------------- |
| LM     | **Mercado Local**             |
| COGC   | **Cámara de Comercio Global** |
| WAR    | **Almacén**                   |
| ADM    | **Centro de Administración**  |
| SHY    | **Astillero Espacial**        |

Las pastillas muestran el código. Pasa el ratón por una para ver el nombre.

## Recuentos y Cualquiera {#counts-and-any}

El número junto a una opción sin marcar te dice cuántos planetas obtendrías al marcarla. Verás los mismos recuentos en la lista para añadir materiales, junto a las bolsas y junto a tus planes.

Condiciones del planeta, Aceptar materiales de construcción adicionales, Programa COGC activo e Infraestructura tienen cada uno un botón _Cualquiera_ en su cabecera. Pone esa sección en el estado que oculta menos planetas, y muestra cuántos planetas da:

- Condiciones del planeta: ambas superficies, sin exigir fertilidad.
- Aceptar materiales de construcción adicionales: todos aceptados.
- Programa COGC activo: ninguno marcado.
- Infraestructura: ninguno marcado.

Cuando la sección ya está así, el botón aparece resaltado y no se puede pulsar.

## Distancia {#distance}

En **Distancia**, elige **Bolsas** y/o planes de uno de tus [[empire|imperios]]. Un planeta tiene que estar a **Saltos máx.** como mucho de cada elección. Los saltos se cuentan entre sistemas estelares, así que todos los planetas de un sistema tienen la misma distancia, y un planeta sin ruta de saltos hasta una elección no pasa. Por ejemplo, con NC1 y uno de tus planes elegidos y Saltos máx. en 5, un planeta a 3 saltos de NC1 y a 6 de tu plan queda oculto. Saltos máx. va de 0 a 30 y empieza en 10. Solo importa cuando eliges algo.

- **Planes del imperio** elige el imperio cuyos planes puedes escoger. Empieza con el imperio que contiene la mayoría de los planes de tu búsqueda, y si no, con tu imperio actual o predeterminado. Cambiar el imperio quita los planes que habías elegido.
- La lista de planes tiene una casilla de filtro donde puedes escribir un nombre de plan, un ID de planeta o un nombre de planeta.
- Cada plan elegido aparece como una etiqueta que puedes quitar, y tiene su propia columna de saltos en los resultados.

AI1, CI1, IC1 y NC1 también tienen sus propias columnas de saltos, y puedes ocultarlas en **Columnas**.

Las distancias a tus propios planes necesitan iniciar sesión. Si no has iniciado sesión, la sección lo dice y ofrece **Iniciar sesión**. Búsqueda de planetas descarta los planes de un enlace que ha compartido otra persona, porque no son tuyos.

> [!tip]
> Para encontrar una segunda base cerca de la primera, elige su plan en Distancia y pon Saltos máx. en 2 o 3. Si nada coincide, las sugerencias sobre los resultados ofrecen unos cuantos saltos más.

## Filtros activos y Restablecer {#active-filters-and-reset}

Cada filtro activo aparece como una etiqueta sobre los resultados, y la × de una etiqueta quita solo ese filtro. Tienes una etiqueta por grupo de materiales (una para todos los grupos cuando se combinan con **algún grupo**) y una por edificio de infraestructura. Hay una etiqueta para todos los programas COGC, una para los materiales adicionales aceptados y una para todas las elecciones de distancia juntas. La superficie tiene etiqueta cuando no es solo Rocoso. Saltos máx. por sí solo no crea etiqueta.

**Restablecer** arriba a la derecha vuelve a los filtros iniciales y al orden por defecto. Conserva tus planetas fijados para comparar, la vista y tus columnas. En el móvil está en el menú «⋯».

Cuando ningún planeta coincide, la página dice **Ningún planeta cumple estos filtros. Prueba una de estas opciones:** y ofrece hasta tres cambios, cada uno con el número de planetas que daría, de más a menos:

- quitar una de tus etiquetas;
- **Incluir planetas gaseosos**;
- **Aceptar todos los materiales de construcción adicionales**;
- más Saltos máx. (3 más, hasta 30), cuando has elegido una distancia.

No te preocupes, esto solo significa que tus filtros juntos no dejan ningún planeta. Haz clic en una sugerencia para aplicarla.

Si dos cambios dan el mismo resultado, solo se muestra uno. La nota de una búsqueda por nombre también puede ofrecer «Cualquier superficie, fértil o no», «Cualquier programa COGC» y «Cualquier infraestructura».

## Panel de filtros {#filter-panel}

La cabecera del panel cuenta tus filtros activos. En pantallas de 1.024 px o más, el panel está junto a los resultados. La doble flecha de arriba lo pliega a una barra estrecha y lo vuelve a desplegar. Por debajo de 1.440 px empieza plegado en cada visita, para que los resultados tengan sitio. A partir de 1.440 px, el navegador recuerda si lo plegaste.

En pantallas pequeñas, el botón _Filtros_ abre los filtros en un panel lateral, y _Mostrar n planetas_ abajo lo cierra.

## Resultados {#results}

La cabecera sobre los resultados dice «n de total planetas». Al lado cambias entre **Lista**, **Matriz** y **Gráfico**. Las listas largas cargan 100 filas cada vez mientras te desplazas.

## Lista y Matriz {#list-and-matrix}

La **Lista** muestra los materiales buscados como recuadros junto a los demás recursos. También tiene la fertilidad, los materiales de construcción adicionales, el COGC y la infraestructura, y las columnas de saltos.

La **Matriz** da a cada material encontrado en los resultados su propia columna. Primero van los buscados (por orden alfabético), luego un separador azul y luego los demás. El sombreado de una celda se intensifica cuanto mayor es la extracción diaria, comparada con la más alta de ese material en cualquier planeta. Una franja de color arriba muestra la categoría del material. Pasa el ratón por una cabecera para ver «en n de total resultados», o por una celda para ver su valor y su parte del máximo.

> [!tip]
> La Matriz es la forma más rápida de ver planetas con dos o tres recursos útiles a la vez. Busca un material y luego repasa las otras columnas.

## Gráfico {#chart}

El **Gráfico** sitúa los resultados según la distancia y la producción.

- **Horizontal (X)**: los saltos a tus elecciones de Distancia, o a la más lejana si elegiste varias. Sin elección, son los saltos a una bolsa, la más cercana a los planetas representados en conjunto (menos saltos en total). El eje la nombra, p. ej. «saltos a IC1 · bolsa más cercana».
- **Vertical (Y)**: la extracción diaria de un material buscado. Con dos o más materiales buscados, un selector elige cuál (el primero por defecto). Sin material buscado, Y es la fertilidad.
- **Tamaño del punto**: la fertilidad, escalada dentro del rango que se muestra en la leyenda. Solo se aplica cuando buscas un material.

Los planetas de **mejor equilibrio** son aquellos que ningún otro resultado supera en las dos cosas: ninguno está más cerca _y_ es más rico. El gráfico los resalta y los une con una línea discontinua. Todo lo que queda por debajo y a la derecha de esa línea lo supera alguno de ellos.

Por ejemplo, supongamos que el planeta A está a 2 saltos con 10 /día, B a 4 saltos con 25 /día y C a 5 saltos con 20 /día. A y B son de mejor equilibrio: ningún resultado está más cerca que A, y ninguno a 4 saltos o menos es más rico que B. C no lo es, porque B está más cerca y es más rico.

**Colorear por** cambia entre **Mejor equilibrio** y **COGC**. Con COGC, los seis programas en marcha más comunes tienen su propio color, y el resto comparten uno: «otro programa COGC o ninguno», o «sin programa COGC» cuando no hay otro programa en marcha.

En pantallas de 1.024 px o más, pasa el ratón por un punto para ver sus detalles, haz clic para fijarlo en Comparar y doble clic para crear un plan (si no has iniciado sesión, primero inicias sesión). En pantallas táctiles y estrechas, toca un punto para ver sus detalles.

La lista junto al gráfico ordena los mismos planetas por Y, con «+» y ☆ en cada fila. El gráfico representa hasta 300 resultados, los primeros según el orden actual, así que **Ordenar** decide qué planetas entran. Debajo del gráfico, la página cuenta los planetas que no pudo situar: sin ruta, sin el material o no fértiles.

## Cómo leer los resultados {#reading-the-results}

- **Recuadros de materiales**: la barra de color compara la extracción diaria del planeta con la más alta de ese material en cualquier planeta. Rojo es menos de una cuarta parte, luego naranja, luego amarillo, y verde por encima de tres cuartas partes. Pasa el ratón por la barra para ver el valor, el máximo y el porcentaje. Por ejemplo, si el planeta más rico tiene 40 FEO /día, un planeta con 25 está en 25 ÷ 40 = 62,5 %, así que su barra es amarilla.
- **Fert. %**: la fertilidad tal como la muestra el juego, o «—» cuando el planeta no es fértil. Al ordenar, los planetas no fértiles van al final.
- **Materiales de construcción adicionales** (el icono de construcción): los materiales que necesita una base en este planeta. Siempre incluye MCG («Superficie rocosa») o AEF («Superficie gaseosa»). Pasa el ratón por cualquiera para ver por qué, p. ej. «Gravedad baja».
- **COGC · Infra**: el programa COGC en marcha («—» si no hay) y la infraestructura del planeta como LM, COGC, WAR, ADM y SHY.
- **Columnas de saltos**: «—» significa que no hay ruta de saltos. Pasa el ratón por encima para leer «Requiere nave colonial».

## Parcelas {#plots}

Cada base ocupa una [[plots|parcela]] de su planeta, igual que las sedes y los [[planetary-projects|proyectos planetarios]] (COGC, almacén, mercado local y los demás).

- Un planeta con todas las parcelas ocupadas y sin [[ghost-sites|sitios fantasma]] lleva un icono rojo ⊘ junto a su nombre, esté o no activada la columna Parcelas. Pasa el ratón por encima para ver los detalles y la fecha.
- La columna **Parcelas** está desactivada por defecto; actívala en **Columnas**. Muestra las parcelas libres sobre el total del planeta, según la última vez que FIO vio el planeta (pasa el ratón para ver la fecha), y marca un planeta lleno en rojo con **Lleno**.
- Algunos planetas permiten sitios fantasma. Un planeta lleno que los permite muestra un **Lleno · sitios fantasma** ámbar, y el texto emergente cuenta los sitios fantasma que hay hasta ahora.
- **parcelas desconocidas** significa que PRUNplanner aún no ha leído las parcelas del planeta.
- Ordena por la columna para ver primero los planetas con más parcelas libres. Los planetas con parcelas desconocidas van al final.

Los planetas llenos conservan su sitio en los resultados. Las parcelas no son un filtro.

> [!warning]
> Los sitios fantasma son para jugadores nuevos. En el juego aparecen en los planetas iniciales. Un jugador nuevo que empieza allí puede asentarse aunque todas las parcelas estén ocupadas. Si tu planeta inicial fue otro, no puedes asentarte en un planeta con **Lleno · sitios fantasma**.

## Ordenar {#sorting}

Haz clic en la cabecera de una columna para ordenar por ella, y otra vez para invertir el orden. Los materiales, la fertilidad y las parcelas ordenan de mayor a menor. El nombre y los saltos, de menor a mayor.

Mayús+clic en otra cabecera la añade como criterio de desempate, hasta cuatro columnas (las cabeceras muestran entonces 1, 2, 3). Por ejemplo, «saltos a NC1, después FEO /día» enumera los planetas más ricos en FEO a cada distancia. Mayús+clic en una columna que ya está en la cadena la invierte, y una segunda vez la quita.

El menú **Ordenar** hace lo mismo sin teclado: **Ordenar por**, **Después por**, **Primero los bajos** y **Primero los altos**. Si no has configurado un orden propio, el menú muestra el orden por defecto: el primer material buscado (de mayor a menor), si no, los saltos a la primera elección de distancia, y si no, el nombre. Cuando desaparece una columna ordenada, como un material que ya no buscas o un plan que has quitado, la página descarta ese orden.

## Columnas {#columns}

El menú **Columnas** oculta y muestra columnas: **Fertilidad**, **Parcelas**, **Otros recursos** (solo en Lista), **Materiales de construcción adicionales**, **COGC · Infraestructura** y las cuatro columnas de saltos a las bolsas. No aparece en el Gráfico.

En la Matriz también enumera todos los materiales encontrados salvo los buscados (esos siempre se muestran), cada uno con cuántos resultados lo tienen. **Todos** y **Ninguno** los muestran u ocultan de una vez.

**Restablecer** en el menú vuelve a las columnas por defecto, que son todas salvo Parcelas.

## Comparar {#compare}

En pantallas de 1.024 px o más, fija hasta cuatro planetas con ☆ para compararlos lado a lado en la bandeja de abajo. Su cabecera pliega y despliega la tabla.

Estas filas se colorean de mejor a peor, con el mejor valor en negrita:

- la fertilidad;
- la extracción diaria de cada material buscado;
- los saltos a cada una de tus elecciones de distancia;
- **Trabajadores {tier} libres** para cada uno de los cinco niveles: trabajadores libres menos los empleos ya abiertos, según el último [[popr|informe de población]] del planeta, que el juego publica cada semana.

Por ejemplo, 1.000 técnicos libres con 400 empleos abiertos se muestran como 600. La cifra nunca baja de 0, aunque haya más empleos abiertos que trabajadores libres.

Un planeta sin valor queda el último. Las demás filas (materiales de construcción adicionales, otros recursos, COGC, infraestructura y los saltos a AI1 / CI1 / IC1 / NC1) son texto normal, y una fila en la que los planetas difieren se tiñe de azul.

Los planetas fijados forman parte del enlace, pero la bandeja solo aparece en pantallas grandes.

> [!tip]
> Las filas de trabajadores libres te dicen cuántos trabajadores podría contratar una base nueva en cada planeta, según su último informe de población.

## Guardar y compartir {#saving-and-sharing}

- **Copiar enlace**: la barra de direcciones siempre contiene toda la búsqueda (filtros, orden, vista y planetas fijados para comparar), así que el enlace comparte exactamente lo que ves.
- **Guardar búsqueda**: guarda los filtros y la vista actuales con un nombre en este navegador. El nombre empieza siendo las etiquetas de los filtros, o «Todos los planetas». Una búsqueda guardada no conserva ni el orden ni los planetas fijados.
- **Guardadas** carga una búsqueda guardada. En **Gestionar** puedes renombrarlas, cargarlas o eliminarlas. Eliminar no pide confirmación.
- «+» en una fila abre un plan nuevo para ese planeta en una pestaña nueva, así que tu búsqueda se queda donde está. Sin cuenta, «+» te pide primero que inicies sesión y luego abre el plan.

En el móvil, las búsquedas guardadas, **Copiar enlace** y **Restablecer** están en el menú «⋯».

### Qué recuerda este navegador {#what-the-browser-remembers}

Algunas cosas solo se quedan en este navegador, no en tu cuenta: tus búsquedas guardadas, las columnas y materiales ocultos, si la columna Parcelas está activada, el panel de filtros plegado (1.440 px o más) y la última vista. Una visita sin enlace se abre en tu última vista. Un enlace se abre en su propia vista.

> [!tip]
> Para conservar una búsqueda en otro dispositivo o compartirla con tu corporación, usa **Copiar enlace** en lugar de **Guardar búsqueda**.

### Parámetros del enlace {#link-parameters}

Un enlace solo contiene lo que difiere de los valores por defecto. También puedes escribir uno a mano:

| Parámetro | Significado                            | Ejemplo                       |
| --------- | -------------------------------------- | ----------------------------- |
| `q`       | nombre o ID                            | `q=Montem`                    |
| `m`       | grupos de materiales                   | `m=any:FEO\|MAG,all:H2O`      |
| `g`       | los grupos se combinan con algún grupo | `g=any`                       |
| `d`       | mínimo por día                         | `d=FEO:15`                    |
| `cogc`    | programas COGC                         | `cogc=ADVERTISING_METALLURGY` |
| `infra`   | infraestructura                        | `infra=LM,WAR`                |
| `fert`    | solo fértiles                          | `fert=1`                      |
| `surf`    | superficies, r y/o g                   | `surf=rg`                     |
| `x`       | materiales adicionales aceptados       | `x=INS,SEA`                   |
| `ref`     | elecciones de distancia                | `ref=cx:NC1`                  |
| `j`       | saltos máximos                         | `j=5`                         |
| `sort`    | cadena de orden                        | `sort=mat:FEO:desc`           |
| `view`    | `matrix` o `chart`                     | `view=chart`                  |
| `pin`     | planetas fijados para comparar         | `pin=OT-580b`                 |

La página descarta los valores que no reconoce.

## Cuando los planetas no cargan {#errors}

Si la carga falla, la página dice «No se pudieron cargar los planetas. Recarga la página para volver a intentarlo.» y muestra un botón **Reintentar**. Tras demasiadas peticiones, te pide que esperes unos segundos antes de volver a intentarlo.
