Con **Cadenas de producción** planificas una cadena de producción completa por día. Dile qué quieres producir y cuánto al día, de un material o de varios a la vez (por ejemplo DW, RAT y OVE). Calcula cada paso por ti: qué [[recipe|receta]] produce cada material, cuántos edificios hacen falta, qué tienes que comprar y cuánto cuesta y gana la cadena con tus precios de [[cx|CX]]. Después reparte la cadena en bases, elige planetas y crea los [[plan|planes]]. Su segundo modo, **Revisar un imperio**, analiza un imperio que ya tienes en marcha.

Úsala antes de construir: muestra qué producir al día, qué comprar y qué hace falta para mantenerla, desde las materias primas hacia arriba, para que sepas cuánto cuesta y gana una cadena antes de colocar un solo edificio.

## Primeros pasos {#getting-started}

Necesitas una cuenta para usar Cadenas de producción. Inicia sesión y ábrela en Calculadoras → **Cadenas de producción**.

1. En **Producir al día**, elige un material en **Añadir material**. Puedes elegir cualquier material que tenga una receta o que exista como recurso de un planeta.
2. Cada objetivo empieza en 10 al día. Escribe una cantidad o usa − y +. Avanzan de 1 en 1 por debajo de 20, de 5 en 5 a partir de 20 y de 10 en 10 a partir de 100, y − nunca baja de 1.
3. × quita un objetivo. Puedes añadir tantos como quieras, y la cadena comparte pasos entre ellos.

Los resultados, los pasos y el gráfico se actualizan con cada cambio que haces. Hasta que añades un material, la página pregunta «¿Qué quieres producir?» en lugar de los resultados.

Mientras se cargan los planetas, una línea dice «Cargando planetas para la extracción …». Si no se pueden cargar, las filas extraídas no muestran edificios. Pulsa **Reintentar** para volver a cargarlos.

> [!tip]
> Empieza con la cantidad diaria que te gustaría vender y fíjate en el beneficio y los edificios. Luego usa **Ajustar el ritmo a tus bases** (consulta [Bases](#bases)) para dimensionar la cadena según las bases que de verdad puedes construir.

## Ajustes {#settings}

Cada base funciona con ambos [[luxuries|lujos]] y con los [[experts|expertos]] que más rinden para sus edificios (más en [Bases](#bases)). Los lujos son consumibles opcionales que aumentan la eficiencia de tus trabajadores, y los expertos aceleran los edificios de una base de una especialización. Estos ajustes están encima de los resultados:

- **Eficiencia**: un porcentaje global extra encima de todo, para bonificaciones de [[corp-hq|Sede corp.]] o de [[faction|facción]]. 100 % no añade nada, y acepta de 1 a 1.000 %. Cambia cuánto produce cada edificio, no las tasas de producción. Por ejemplo, al 125 % un paso que necesita 10 edificios al 100 % se queda en 8 edificios exactos.
- **Precios**: la [[exchange-preference|preferencia de bolsa]] con la que se valora la cadena. Empieza con tu preferencia de bolsa predeterminada, y «Ninguna - Universe 30D» usa precios de todo el universo. La cadena usa los precios de la preferencia pero no sus excepciones por planeta. Los precios determinan las recetas predeterminadas, cada coste y el beneficio, así que otra preferencia de bolsa puede cambiar la cadena.
- **Materias primas**: **Comprar** (predeterminado) o **Extraer**. También puedes poner una sola fila en Extraer en Pasos. Una materia prima que es a su vez un objetivo siempre se extrae. Con **Extraer**, la cadena planifica extractores y cuenta su mantenimiento, desgaste y tasas en lugar de un precio de CX. Tres recursos planetarios también tienen receta: O, HE3 y SIO. Con **Extraer**, la cadena extrae un recurso así cuando eso cuesta menos por unidad que fabricarlo y la base del paso puede extraerlo, y si no, lo fabrica. Por ejemplo, el acero necesita O: fabricarlo en un TNP también da TC para vender, mientras que extraerlo solo necesita el extractor del planeta. Una fila que pones tú mismo en Fabricar o Extraer mantiene esa elección.
- **Subproductos**: algunas recetas producen una segunda salida junto al material para el que se ejecutan. **Cubrir demanda** (predeterminado) usa cada [[byproduct|subproducto]] primero donde la cadena necesita ese mismo material, y vende el resto. **Vender** los vende todos.

> [!warning]
> Elegir una preferencia de bolsa en **Precios** también la convierte en tu preferencia de bolsa predeterminada, así que las demás páginas que siguen tu predeterminada cambian con ella. Eso ocurre en los dos modos.

### Valores predeterminados {#defaults}

| Ajuste                   | Predeterminado                         |
| ------------------------ | -------------------------------------- |
| **Eficiencia**           | 100 %                                  |
| **Precios**              | tu preferencia de bolsa predeterminada |
| **Materias primas**      | **Comprar**                            |
| **Subproductos**         | **Cubrir demanda**                     |
| **Producción propia**    | **Ninguna**                            |
| Un objetivo nuevo        | 10 / día                               |
| **Bases de hasta**       | 500 de área                            |
| **Número de bases**      | 2                                      |
| **Lista de compra**      | para 10 días                           |
| **Orden de filas**       | **Cadena**                             |
| **Grosor de línea**      | **t / día**                            |
| Los lujos de una base    | ambos                                  |
| Los expertos de una base | **Auto**                               |
| El COGC de una base      | el programa activo del planeta         |

## Producción propia {#own-production}

Si ya produces parte de una cadena, elige uno de tus [[empire|imperios]] en **Producción propia**. Cualquier material que necesite la cadena y del que el imperio produzca más de lo que usa se marca como **Disponible**. Ese excedente es lo que producen sus planes menos lo que usan, incluido el consumo de la mano de obra. La cadena lo usa primero, después de los subproductos, y solo fabrica, compra o extrae el resto.

- Un material del que tienes suficiente pasa a la primera columna del Gráfico, y sus insumos salen de la cadena. Pasos, edificios y construcción muestran entonces solo lo que añade la nueva cadena, y los resultados te dicen cuántos edificios menos y cuánta construcción menos necesitas.
- También puedes marcar un material como **Disponible** a mano en la columna Origen y escribir cuánto tienes al día. Déjalo vacío para usarlo todo, o escribe 0 para desactivarlo. Una cantidad escrita tiene prioridad sobre el imperio. Cuando difiere del excedente del imperio, «usar …» a su lado vuelve a la cantidad del imperio.
- Si solo tienes parte de un material, la fila muestra «resto» y te deja elegir qué cubre el resto.
- Los objetivos siempre salen de la propia cadena.
- No te preocupes si un material que producen tus planes no muestra **Disponible**: solo cuenta lo que el imperio produce de más respecto a lo que usa, así que un material que gasta del todo no tiene excedente. Aun así puedes marcarlo como **Disponible** a mano.
- Lo que viene de tus planes cuenta en el beneficio como un insumo comprado a su precio de CX. La tarjeta de insumos dice entonces **Insumos / día** y lo divide en propios y comprados.
- [Bases](#bases) lista qué plan suministra qué, por orden de nombre del plan, y qué parte del excedente no usa la cadena. La tabla de envíos incluye las rutas desde esos planes.
- Las filas Disponible no forman parte de los planes que crea **Crear planes**.
- Si cambias los planes del imperio en otra pestaña, las cantidades se actualizan mientras esta página está abierta.
- El enlace de la cadena guarda las cantidades Disponible que usa la cadena, también las del imperio, pero nunca el imperio en sí.

## Resultados {#results}

La franja de arriba suma todas tus bases.

| Tarjeta                                   | Qué muestra                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Beneficio / día**                       | Valor producido menos insumos comprados, producción propia a precio de CX, mantenimiento, desgaste y tasas de producción, también como parte del valor producido (sin Producción propia)                                                                                                                                                                                                     |
| **Valor producido / día**                 | Los objetivos al precio de venta de la CX, más los subproductos vendidos                                                                                                                                                                                                                                                                                                                                        |
| **Insumos comprados / día**               | Lo que compras, al precio de compra de la CX                                                                                                                                                                                                                                                                                                                                                                    |
| **Mantenimiento, desgaste + tasas / día** | El [[upkeep\|mantenimiento]] de la mano de obra con los lujos, el desgaste y las [[production-fees\|tasas de producción]], con el mantenimiento de la mano de obra y las tasas debajo del valor |
| **Edificios**                             | Construidos y exactos                                                                                                                                                                                                                                                                                                                                                                                           |
| **Área**                                  | Incluida la habitación                                                                                                                                                                                                                                                                                                                                                                                          |
| **Mano de obra**                          | Por nivel                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Construcción**                          | Con la [[payback\|amortización]], o «no se amortiza» cuando el beneficio es 0 o menos                                                                                                                                                                                                                   |

Cada base cuenta en el área su módulo central y un STO. La construcción cuenta los edificios, la habitación y el STO, pero no el módulo central ni los extras del planeta (MCG, AEF, SEA, HSE, INS, TSH). Una base sin pasos no cuenta nada.

Los edificios de un mismo tipo comparten su capacidad entre recetas, como en el juego, así que 4,5 procesadoras de alimentos se quedan en 5 construidas. Eso solo funciona dentro de una base.

Por ejemplo, con cifras inventadas: un valor producido de 10.000 ȼ al día, 4.000 ȼ de insumos comprados y 2.500 ȼ de mantenimiento, desgaste y tasas dejan un **Beneficio / día** de 3.500 ȼ, el 35 % del valor producido. Con 700.000 ȼ de construcción, eso se amortiza en 700.000 ÷ 3.500 = 200 días. Un beneficio por debajo de 0 se muestra en rojo, y **Construcción** dice entonces «no se amortiza».

### Cómo se calculan los costes {#how-costs-are-calculated}

- **Desgaste** es el coste de construcción del edificio ÷ 180 días. Por ejemplo, un edificio que cuesta 90.000 ȼ de construir añade 500 ȼ de desgaste al día.
- **Coste por unidad de un paso fabricado** suma sus insumos a su coste en la cadena, el mantenimiento y el desgaste del edificio durante una ejecución, y la tasa de producción de una ejecución. Los insumos fabricados cuentan a su propio coste por unidad, los comprados al precio de compra de la CX. Una ejecución se acorta con más eficiencia. Una receta con varias salidas reparte su coste según el valor de venta en la CX de las salidas, o según la cantidad cuando ninguna tiene precio.
- **Coste por unidad de un paso extraído** es el mantenimiento y el desgaste diarios del extractor ÷ las unidades al día, más la tasa.
- **Tasas de producción** se cobran por ejecución según el tiempo base de la receta, así que la eficiencia no las cambia. Un paso fabricado paga las tasas del planeta de su base, y cada parte de un paso dividido paga las del planeta de su propia base. Un paso extraído paga las del planeta de su sitio. El planeta típico y una base sin planeta no pagan ninguna, así que elegir planetas puede subir los costes.
- **Receta predeterminada**: cuando no eliges una, la cadena toma la receta de una sola salida más barata a precios de CX. Solo usa recetas con subproductos cuando no existe ninguna receta de una sola salida.

## Pasos {#steps}

Cada material aparece una vez. Puedes ordenar las filas por **Cadena**, donde cada objetivo va con sus insumos (el triángulo los pliega), o **Por origen**, en los grupos «Producidos», «Extraídos», «Comprados» y «De tus planes».

| Columna                 | Qué muestra                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**            | Con «objetivo», «para …» (a qué alimenta) o «vendido»                                                                                              |
| **Al día**              | Cuánto, con «+ … de subproductos» y «+ … propios»                                                                                                                     |
| **Base**                | Qué base lo produce. Úsala para mover un paso o una parte de él (consulta [Bases](#bases))                                         |
| **Origen**              | **Fabricar**, **Comprar**, **Extraer** (solo recursos planetarios) o **Disponible**                                                                |
| **Receta o suministro** | La receta, la bolsa en la que se compra o el planeta de extracción                                                                                                    |
| **Edificios**           | El edificio y cuántos, y cuánto usa de los construidos                                                                                                                |
| **Coste / unidad**      | Su coste por unidad en la cadena                                                                                                                                      |
| **Precio CX**           | El precio de la CX                                                                                                                                                    |
| **Fabricar o comprar**  | Si fabricar ahorra dinero («Fabricar, ahorra …» o «Comprar es … más barato»), con una etiqueta de mercado para las filas compradas y los objetivos |

**Fabricar** está desactivado para un material sin receta, y **Comprar** y **Disponible** lo están para los objetivos. Un bloque de subproductos al final lista de dónde viene cada subproducto, cuánto usa la cadena y cuánto vende. **CSV** descarga la tabla como `production-chain.csv`.

- Haz clic en un material para ver qué **Consume**, adónde **Va a**, su coste **Por unidad** (insumos, mantenimiento y desgaste, tasas de producción, coste en la cadena frente al precio de la CX) y la capacidad libre de sus edificios: «… libres hasta + … / día».
- Haz clic en una receta («n recetas ▾», solo se muestra cuando hay varias) para comparar todas las recetas de ese material. La que está en uso va primero, y luego las demás según su efecto en el beneficio, cada una con el cambio de beneficio al día y de edificios. Unas insignias marcan la que está **en uso**, la **predeterminada** y las que van **con subproductos**.
- Las filas extraídas usan un planeta típico: el 10 % superior de todos los planetas con el recurso, es decir, el percentil 90 de extracción diaria, o el mejor planeta cuando menos de 10 planetas lo tienen. Es un valor de planificación, no una base real, y no paga tasas de producción. Haz clic en él para elegir un planeta real en **Dónde extraer**. Puedes filtrar por extractor, superficie, saltos hasta una bolsa, **Sin materiales extra**, **COGC de extracción de recursos** y **Mercado local**, o usar **Abrir en Búsqueda de planetas**. Cuando la base del paso tiene un planeta con el recurso, manda la tasa propia de ese planeta.

## Avisos {#warnings}

Las etiquetas encima de los pasos resumen lo que conviene mirar. Haz clic en una para filtrar los pasos, y **Mostrar todo** lo vuelve a mostrar todo.

- **Más baratos de comprar** lista los materiales que la cadena fabrica o extrae por más del precio de la CX. Los objetivos nunca cuentan. **Comprar los …** los pasa a compra, y el aviso emergente ofrece **Deshacer**.
- **Mercados poco líquidos** lista los materiales comprados de los que la cadena necesita el 10 % o más de lo que la CX negocia al día (la media de 30 días), o que no se han negociado en 30 días. Por ejemplo, si la CX negoció 6.000 unidades en 30 días, eso son 200 al día, así que comprar 30 al día es un 15 %. En Pasos, la etiqueta de [[share-of-volume|parte del volumen]] se vuelve ámbar a partir del 10 % y roja a partir del 50 %. Los objetivos reciben la misma etiqueta para el lado de la venta. Más información: [[thin-market|mercados poco líquidos]].
- **Pasos que sus bases no pueden ejecutar** señala una granja en un planeta sin fertilidad, o una extracción en un planeta sin el recurso. La etiqueta salta a Bases.
- **Bucle de recetas** significa que una receta necesita su propia salida en algún punto más arriba de la cadena. La cadena se detiene en la repetición.

Sin nada más barato de comprar, ni mercado poco líquido, ni aviso de base, aparece en su lugar una etiqueta «Sin avisos».

## Gráfico {#graph}

El gráfico muestra la misma cadena. Las materias primas están a la izquierda («Comprado · extraído», más «disponible» con Producción propia) y los objetivos a la derecha. **Grosor de línea** sigue **t / día** (predeterminado), **ȼ / día** o **Igual**. Haz zoom con −, **Ajustar** y +. Cada nodo muestra dónde se compra, o qué base y qué edificio lo producen. Haz clic en un material para ver solo lo que necesita y lo que alimenta, y en **Mostrar todo** para volver.

## Bases {#bases}

Una cadena puede funcionar en hasta 26 bases (de la A a la Z), cada una en un planeta. La pestaña Bases empieza con tres pasos, y el siguiente que toca es el botón principal.

### 1. Distribuir en bases {#auto-layout}

**Distribución automática** reparte la cadena en bases que podrías construir:

- Cada base recibe una [[expertise|especialización]] (el campo de sus edificios de producción, como Agricultura o Metalurgia), hasta el tamaño de **Bases de hasta**: 500 de área (predeterminado), 750 o 1.000. Cuando una especialización necesita más de una base de ese tamaño, llena bases de hasta 1.000, para que tengas una base completa en lugar de varias parecidas.
- La distribución automática divide por edificios enteros un paso que no cabe. Los que caben van a la base actual y el resto a la siguiente, así que 6 CHP pueden quedar en 4 + 2. Un paso puede abarcar más de dos bases. Los pasos de extracción no se dividen.
- Los grupos pequeños de pasos (menos de 1,5 edificios, o sin especialización) se unen a la base con la que más toneladas intercambian que tenga sitio para ellos. Si ninguna lo tiene, reciben una base mixta.
- La distribución automática compra los pasos de menos de 0,2 edificios que cuestan más por unidad con un edificio entero que en la CX. Mientras un paso así se fabrica, muestra una etiqueta **Comprar** en Pasos. Puedes volver a ponerlos en Fabricar, pero la siguiente distribución automática o ajuste los vuelve a comprar.
- Cada base recibe un planeta, como se explica en [Cómo se eligen los planetas](#planet-picking).
- Después, fusiona bases de la misma especialización cuando la base fusionada cabe en 1.000 de área y no pierde ningún recurso ni fertilidad.

> [!warning]
> La distribución automática empieza de cero. Crea bases nuevas desde el principio, con nombres y planetas nuevos, el COGC en el programa activo y lujos y expertos predeterminados. Cualquier nombre, planeta, elección de COGC, lujos y cambios de expertos que hicieras antes se pierden.

### Cómo se eligen los planetas {#planet-picking}

La distribución automática solo usa un planeta que:

- tiene una [[plots|parcela]] libre, o parcelas que PRUNplanner aún no ha leído (no se usa un planeta lleno con [[ghost-sites|sitios fantasma]])
- no tiene ninguno de tus planes, estén o no en un imperio
- puede mantener la base: están todos los recursos extraídos, las granjas pueden funcionar y la base cabe dentro del tamaño.

Entre ellos, van primero los planetas con un programa del COGC que ayuda a los edificios de la base. Después cuenta la cercanía: a las otras bases, ponderada por las toneladas enviadas, y a los planetas del imperio si elegiste uno en Producción propia. En caso de empate, gana el planeta donde la base necesita menos área. La base más grande se coloca primero. Si ningún planeta puede mantener la base, toma igualmente el primero por COGC y cercanía, así que revisa los avisos de la tarjeta de la base.

### 2. Ajustar el ritmo a tus bases {#fit}

Fija **Número de bases** (2 por defecto, de 1 a 26) y pulsa **Ajustar ritmo**. Busca el mayor ritmo, con todos los objetivos escalados por igual, que la distribución automática cabe en ese número de bases, y luego distribuye la cadena. Puede bajar los ritmos o subirlos (hasta 4.096 veces), en pasos de 0,01 al día sobre el objetivo más grande. Si incluso 0,01 al día necesita más bases, te lo dice.

Comprueba el número con la distribución antes de elegir planetas. Los planetas con tasas de extracción más bajas o menos fertilidad pueden necesitar entonces algo más, así que revisa el resultado.

> [!tip]
> Ajustar ritmo escala todos los objetivos por el mismo factor, así que su proporción se mantiene. Si quieres otra mezcla, cambia antes un objetivo. Por ejemplo, DW a 20 y RAT a 10 al día pasan a 10 y 5 cuando el ajuste reduce el ritmo a la mitad.

### 3. Crear los planes {#create-the-plans}

Cuando todas las bases tienen planeta y caben en 1.000 de área, el tercer paso lo indica y ofrece «Crear … planes…». Si no, te dice cuántas bases no tienen planeta o superan 1.000 de área. Detalles en [Crear planes](#create-plans).

### Resumen y tarjetas de base {#base-cards}

Debajo de los pasos, un resumen muestra **Bases** (cuántas tienen planeta), **Base más grande**, **Permisos** (con el área de todas las bases) y **Transporte t / día** (con las rutas). También tiene una línea por base con su especialización y su planeta. **Añadir base** añade una base.

En cada tarjeta de base puedes:

- ponerle nombre a la base y elegir su planeta («Elige un planeta» o «cambiar»)
- elegir su programa del COGC: «Activo: …» (el predeterminado), **Sin programa** u otro programa para planificar antes de una votación. Los programas que ayudan a la base van primero, con su bonificación, y muestran «no activo» cuando el planeta no los tiene
- fijar sus **Lujos**: Ambos (100 % de eficiencia de la mano de obra, el predeterminado), Lujo 2 (92 %), Lujo 1 (87 %) o Básicos (79 %). El mantenimiento los paga
- **Editar** sus **Expertos**, o volver a **Auto**. Auto elige el reparto que más rinde para la producción de la base: normalmente 5 en su especialización principal y el sexto en la siguiente, con como mucho 5 de un tipo y 6 por base
- **Fusionar en…** otra base, que mantiene su planeta
- **Separar** por especialización, o en dos mitades si solo tiene una especialización, con planetas para las bases nuevas
- quitarla con ×, lo que mueve sus pasos a la primera base.

Los edificios de una base reciben las bonificaciones del planeta como en un plan: +25 % de un programa de publicidad para su especialización, +10 % de un programa de mano de obra para un nivel que emplean y la fertilidad para las granjas. FRM y ORC no pueden funcionar sin fertilidad. Los pasos extraídos usan la tasa propia del planeta. Un planeta sin el recurso mantiene la tasa de la cadena y muestra un aviso, igual que una base de más de 1.000 de área.

La tarjeta muestra sus edificios, el área (módulo central, un STO y habitación), los [[area-permits|permisos]], la mano de obra y el mantenimiento con el desgaste al día.

La columna **Base** de Pasos mueve un paso, o una parte de un paso dividido, a otra base. «+ nueva base» crea una nueva.

El selector de planeta de una base resuelve los pasos de la base en cada planeta, para que puedas comparar edificios y área. Marca los planetas donde ya tienes un plan («tu plan»). **Solo planetas que** filtra los planetas que tienen los recursos y permiten cultivar (activado por defecto), tienen un programa del COGC para la base, son fértiles o tienen uno de tus planes. También puedes filtrar por materiales extra, mercado local, saltos y nombre. Muestra las parcelas de cada planeta, pero no filtra por ellas.

**Envíos al día** lista lo que se mueve entre las bases y la CX, en toneladas y m³, con los [[jumps|saltos]]. Eso es lo que pasas a tu logística.

## Crear planes {#create-plans}

**Crear planes** crea un plan por cada base que tiene pasos, con sus edificios, recetas, habitación, un STO, el programa del COGC y los permisos. Cada plan recibe los lujos y los expertos de su base, así que produce lo que muestra la cadena. Las bonificaciones de HQ y de facción se dejan para los planes.

- El nombre de cada plan empieza siendo los objetivos más el nombre de la base, y puedes cambiarlo.
- Elige **Nuevo imperio** (el predeterminado, llamado «Cadena …» por los objetivos, con una **Facción**), **Añadir a** un imperio existente o **Sin imperio**. Un imperio nuevo se crea primero, con sus permisos fijados según los planes.
- El diálogo te dice qué lo bloquea: ninguna base con pasos, una base sin planeta o de más de 1.000 de área, un nombre que falta o ningún imperio elegido.
- Una granja en un planeta sin fertilidad se queda fuera de su plan, y una extracción sin su recurso recibe el extractor sin receta. El diálogo lo indica.
- Con Producción propia, los materiales que suministran tus bases no están en los planes nuevos.

La página se queda en la cadena y enlaza los planes nuevos y el imperio. Esos enlaces siguen en la pestaña Bases hasta que cambia la cadena. Si falla un plan, los planes creados antes se conservan y se listan.

## Lista de compra {#buy-list}

La lista de compra muestra lo que compra la cadena durante un número de días (10 por defecto), agrupado por base cuando hay más de una. Cada fila tiene las unidades (redondeadas hacia arriba), el peso y el coste. Por ejemplo, en una cadena de una base, un material comprado a 2,5 al día da 25 unidades en 10 días, y a 2,55 al día da 26. La lista también muestra los totales, los m³ que hay que transportar y las toneladas y m³ de los objetivos que salen.

**Copiar acción de compra XIT** (o «Copiar acción XIT para …» por base) copia una acción de [[xit|XIT]] que compra la lista en el almacén de la bolsa con la que se valoran la mayoría de sus filas. Cuando la base tiene planeta, la acción también lleva allí la mercancía.

La lista solo contiene los insumos de las recetas de la cadena. Los consumibles de la mano de obra no están en ella, así que planifícalos en los planes que crea la cadena.

## Compartir {#sharing}

El enlace contiene toda la cadena: objetivos, ajustes, orígenes, recetas, planetas, bases, cantidades Disponible y la CX. **Copiar enlace de la cadena** lo copia. Cuando abres la página sin enlace, vuelve a abrirse la última cadena en la que trabajaste, en este navegador y por cuenta.

## Revisar un imperio {#check-an-empire}

Cambia arriba de **Planificar una cadena** a **Revisar un imperio** para ver cómo produce uno de tus imperios lo que vende, y qué lo mejoraría. Cada modo conserva su propio estado mientras cambias entre ellos.

1. Elige el **Imperio**. Empieza con tu imperio predeterminado.
2. Elige las cadenas. Cada material que vende el imperio (del que produce más de lo que usa, con precio de venta en la CX) es una cadena, mostrada con su cantidad al día. «+ Añadir una cadena» añade una, y «Todo lo que vende el imperio» o **Revisar todo lo que vende el imperio** las añade todas. **Borrar** las quita.

Si aún no tienes ningún imperio, la página lo dice y te remite a Planificar una cadena o a Gestionar.

La revisión sigue cada cadena hacia atrás por tus planes: qué base produce cada paso, con qué receta y eficiencia, y qué se compra. Nunca cambia un plan, solo los señala.

| Ajuste                            | Predeterminado                      |
| --------------------------------- | ----------------------------------- |
| **Precios**                       | la preferencia de bolsa del imperio |
| **Mejoras de configuración**      | **Mostrar**                         |
| **Ignorar por debajo de**         | 200 ȼ / día                         |
| **Los traslados se amortizan en** | 100 días                            |

La franja de arriba muestra el **Beneficio / día** del imperio según lo planificado, la **Ganancia posible / día**, **Bases revisadas**, cuántas **Parecen óptimas**, **Mejoras**, **Correcciones del plan**, **Mejoras de configuración / día** y **Traslados**. Las ganancias se miden frente al valor de la cadena: ambos lujos, los expertos que más rinden y el COGC activo del planeta, a tus precios de CX, con los insumos fabricados al coste propio del imperio.

### Bases {#check-an-empire-bases}

Cada base recibe una marca: **Parece óptima**, tiene mejoras, **Corrección del plan** o **No está en estas cadenas**. Abre una base para ver su **Producción según el plan**, sus lujos, expertos y COGC en **Plan** frente al **Valor de la cadena**, y sus **Hallazgos**. **Cobertura**, en el lateral, muestra a cuántas bases llegan las cadenas, y «Añadir …» añade lo que venden las otras bases.

### Hallazgos {#findings}

Cada hallazgo muestra su ganancia al día, la construcción y la amortización. Puedes filtrarlos por tipo:

- **Corrección del plan**: el plan cuenta un programa del COGC que el planeta no tiene activo, o el planeta tiene activo uno que el plan no cuenta. Con un programa de publicidad (especialización), los edificios producen un 20 % menos de lo que dice el plan, o producirían un 25 % más. Con un programa de mano de obra es un 9 % menos o un 10 % más.
- **Receta**: otra receta del mismo edificio produce el material al menos un 3 % más barato.
- **Fabricar o comprar**: un material que no es un objetivo cuesta más fabricarlo que comprarlo.
- **Ubicación**: otro planeta encaja con el paso al menos un 10 % mejor por su programa del COGC, su fertilidad o su tasa de extracción, comparado con el programa que tiene activo de verdad el planeta. La opción es una de tus bases (solo hay que construir los edificios trasladados, y necesita área libre) o una base nueva (edificios, habitación y módulo central). PRUNplanner sugiere la mejor opción que tiene sitio, una parcela libre (o sitios fantasma; las parcelas desconocidas cuentan como posibles) y se amortiza dentro de **Los traslados se amortizan en**. «Los … planetas…» lista todas las opciones con filtros y ordenación. **Usar** convierte un planeta en tu elección, y **Volver a la sugerencia** lo deshace.
- **Configuración**: ambos lujos (solo cuando la producción extra gana más de lo que cuestan), o un mejor reparto de expertos. Los expertos llegan con el tiempo en el juego. Pon **Mejoras de configuración** en **Ocultar** para dejarlos fuera.

La revisión oculta los hallazgos por debajo de **Ignorar por debajo de**, pero las correcciones del plan y las ubicaciones que has elegido siempre se muestran. Las ganancias de un mismo paso son alternativas, así que la ganancia posible de una base cuenta solo la mejor de cada paso. Por ejemplo, un hallazgo de Receta que vale 300 ȼ / día y uno de Ubicación que vale 500 ȼ / día en el mismo paso cuentan como 500 ȼ / día, no 800. **Probar en el planificador** (en los hallazgos de Receta, Fabricar o comprar y Ubicación) abre Planificar una cadena con las bases de la cadena y el cambio aplicado.

> [!tip]
> Arregla primero las correcciones del plan. No cuestan nada de construir, y las cifras del plan no son correctas hasta que lo hagas.

> [!warning]
> Un hallazgo de Ubicación cuenta un planeta lleno con sitios fantasma como posible para una base nueva. En el juego, los sitios fantasma solo permiten asentarse allí a los jugadores nuevos que empiezan en ese planeta.

### Cadenas {#chains}

Cada cadena se lista material por material: cuánto se fabrica (**Fabricado / día**), dónde (**Fabricado en**), con qué receta (**Receta según el plan**), a qué coste frente al precio de la CX y qué haría el planificador de cadenas (**Planificador de cadenas**).

### Compartir {#check-an-empire-sharing}

**Copiar enlace de la revisión** copia el imperio, las cadenas, los ajustes y las ubicaciones que has elegido, pero no los precios. Quien lo abra ve la preferencia de bolsa propia del imperio. Solo tú puedes abrir tus propios imperios. A cualquier otra persona, la página le dice que el imperio no es suyo.
