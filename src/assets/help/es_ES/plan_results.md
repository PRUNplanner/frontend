Los resultados te dicen cuánto gana tu base, cuánto tarda en amortizarse, si sus trabajadores tienen alojamiento y cómo van su área y su almacenamiento. Son las cinco tarjetas de la parte superior de un plan (en el diseño Estándar), más la tabla de E/S de materiales con sus totales, y se actualizan con cada cambio.

Son lo que miras para valorar un plan: cuánto ganaría la base y dónde se queda corta. Una cifra en rojo en la tarjeta **Mano de obra** o **Área** indica que faltan camas o área.

## Tarjetas de resultados {#tiles}

Cada tarjeta es un botón. Haz clic en ella para abrir la parte de la que sale su cifra, y si esa parte está oculta en tu diseño, se abre en un diálogo.

| Tarjeta             | Muestra                                                 | Abre                                                  |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| **Beneficio / día** | Ingresos menos coste al día                             | **Beneficio** (la herramienta Desglose del beneficio) |
| **Amortización**    | Días hasta que el beneficio ha pagado la base           | **Construcción**                                      |
| **Mano de obra**    | La eficiencia de mano de obra más baja, camas por nivel | **Mano de obra**                                      |
| **Área**            | Área usada del área que tienes, beneficio por área      | **Planeta**                                           |
| **Almacenamiento**  | Días hasta que el almacenamiento de la base se llena    | **Visitas**                                           |

Todas las cifras usan los precios del imperio con el que se calcula el plan (consulta [Imperio y precios](/help/plan_base#empire-and-prices)).

### Beneficio / día {#profit}

**Beneficio / día** es el [[profit|beneficio]] de la base: ingresos menos coste, al día. La línea de debajo dice «Ingresos … · coste … incl. … de degradación y … de tasas de producción».

Los _ingresos_ son el valor de cada material del que la base produce más de lo que usa (un Δ positivo en [E/S de materiales](#material-io)), al precio de venta.

El _coste_ suma tres cosas:

- cada material del que la base usa más de lo que produce, al precio de compra, incluidos los consumibles de tu [[workforce|mano de obra]];
- la [[degradation|degradación]], que es 1/180 del coste de construcción de los _edificios de producción_ al día. El [[core-module|módulo central]], los [[habs|hábitats]] y el [[storage|almacenamiento]] no cuentan aquí;
- las [[production-fees|tasas de producción]] (consulta [más abajo](#production-fees)).

La degradación representa el desgaste de tus edificios. Por ejemplo (con cifras inventadas), unos edificios de producción que cuestan 900.000 ȼ de construir añaden 900.000 ÷ 180 = 5.000 ȼ de degradación al día.

Un material que la base produce y también usa cuenta una vez, por su cantidad neta. Si el plan produce 100 RAT y sus trabajadores comen 60, solo se venden las 40 que sobran.

> [!tip]
> Beneficio / día es la misma cifra que la línea en negrita **Beneficio / día** de los [totales de la E/S de materiales](#totals). Haz clic en la tarjeta para verla desglosada en sus partes en la herramienta Beneficio (consulta [Herramientas del plan](/help/plan_tools)).

### Tasas de producción {#production-fees}

El planeta cobra una tasa por cada orden de producción, y PRUNplanner la cuenta por edificio. En el juego, los gobernadores del planeta fijan estas tasas por especialización y nivel de mano de obra, y la tasa se paga cuando empieza una orden de producción. PRUNplanner toma la tasa del planeta para la especialización del edificio en cada nivel de mano de obra, y luego hace la media entre los trabajadores del edificio, ponderada por número de trabajadores.

Por día, un edificio paga esa tasa × su eficiencia × su cantidad. Un edificio más rápido ejecuta más órdenes, así que paga más, y un edificio que no ejecuta nada no paga nada. Un planeta sin tasas, o un edificio sin especialización, no cuesta ninguna tasa.

Por ejemplo (con cifras inventadas), toma un edificio con 10 pioneros y 30 colonos en un planeta que cobra 20 ȼ por los pioneros y 40 ȼ por los colonos en su especialización. Su tasa es (10 × 20 + 30 × 40) ÷ 40 = 35 ȼ al día al 100 %. Dos de ellos al 120 % de eficiencia pagan 35 × 1,2 × 2 = 84 ȼ al día.

Las tasas no son un material, así que no aparecen como filas en la E/S de materiales. Las encontrarás en la línea del beneficio, en los [totales](#totals), en la columna **ȼ / día** del selector de recetas y en el diálogo de COGM (consulta [Producción y recetas](/help/plan_production#cogm)).

### Amortización {#payback}

**Amortización** es el coste de construcción de la base dividido por su beneficio al día, en días (por ejemplo «212,40 d»). Muestra «nunca» cuando la base no da beneficio.

Por ejemplo (con cifras inventadas), una base que cuesta 1.000.000 ȼ de construir y gana 5.000 ȼ al día se amortiza en 1.000.000 ÷ 5.000 = 200 días. Si ves «nunca», no te preocupes: solo significa que el beneficio al día es 0 o menos con estos precios, así que la base no recuperaría su coste de construcción. La tarjeta **Beneficio / día** muestra por qué.

La línea de debajo es el coste de construcción («… **ȼ coste de construcción**»). Es cada material de construcción al precio de compra, para los edificios de producción, el módulo central (una vez) y cada edificio de habitación y de almacenamiento. Incluye los materiales extra que necesita el entorno del planeta (consulta [[extra-building-materials|materiales de construcción adicionales]]).

> [!tip]
> La amortización cuenta la habitación y el almacenamiento, pero la degradación de Beneficio / día no. Una base con muchos hábitats puede amortizarse despacio aunque su beneficio diario parezca bueno. Abre **Construcción** para ver lo que aún tienes que comprar.

### Mano de obra {#workforce}

La cifra de **Mano de obra** es la eficiencia más baja entre los niveles de mano de obra de los que el plan necesita trabajadores, por ejemplo «86,7 %». Muestra «—» cuando ningún edificio necesita trabajadores, y se pone en rojo cuando algún nivel tiene menos camas que trabajadores.

El rojo importa porque los trabajadores sin cama reducen la eficiencia de producción, y con ella lo que producen tus edificios. Añadir suficientes hábitats para ese nivel en **Infraestructura** lo soluciona. Con **Auto** activado, PRUNplanner los elige por ti.

La línea de debajo lista cada nivel necesario como trabajadores necesarios / camas, por ejemplo «PIO 260/650 · COL 550/1.450», con el nivel al que le faltan camas en rojo. Una segunda línea lista los expertos que has colocado, por ejemplo «Agri 1 · Quím 4». Pasa el ratón por encima para ver la lista completa.

[Configuración de la base](/help/plan_base#workforce) explica cómo se calcula la eficiencia y cómo cambiarla.

### Área {#area}

**Área** muestra el área usada del área que tienes, con un medidor. La cifra usada se pone en rojo cuando la base necesita más de lo que dan tus permisos.

- Área que tienes = 250 + 250 × permisos (se fija en **Planeta**, consulta [Configuración de la base](/help/plan_base#permits)).
- Área usada = 25 del módulo central + el área de cada edificio de producción, de habitación y de almacenamiento.

Por ejemplo, con 2 permisos tienes 250 + 2 × 250 = 750 de área. Cuando la cifra usada está en rojo, puedes subir **Permisos** en **Planeta** (hasta 3) o quitar edificios hasta que la base quepa.

Debajo, «**ȼ beneficio / área**» es el beneficio al día dividido por el área usada, o 0 cuando nada usa área. La columna **ȼ / área** del selector de recetas divide por una distribución estándar para que las recetas se puedan comparar entre edificios. Esta usa tu base real.

Después, una cifra «Imperio» muestra la misma relación para todo el imperio con el que se calcula el plan: el beneficio total al día del imperio ÷ el área total que usan todos sus planes. Es una cifra ponderada por área, no una media de las cifras de los planes. Solo aparece una vez que has abierto la página de ese imperio en [Imperio](/empire) en esta pestaña del navegador, y guardar un plan la borra hasta que vuelves a abrir la página del imperio.

> [!tip]
> Un plan por encima de la cifra del imperio gana más por área que tu imperio de media. Es buena señal cuando eliges qué base construir a continuación con permisos limitados.

### Almacenamiento {#storage}

**Almacenamiento** muestra los días hasta que el almacenamiento de la base se llena («**días hasta llenarse**»). PRUNplanner lo calcula por separado para el peso y el volumen, dividiendo la capacidad de almacenamiento por el _mayor_ entre lo que entra y lo que sale al día. La tarjeta muestra el menor de los dos resultados. Te dice cuánto tiempo puede pasar la base entre naves antes de que se le llene el almacenamiento.

La capacidad es la del módulo central, 1.500 t y 1.500 m³, más tus edificios de almacenamiento (consulta [Infraestructura](/help/plan_base#infrastructure)). La línea bajo la cifra dice «… t entran · … t salen / día», y puedes pasar el ratón por encima para ver lo mismo en m³. Muestra «—» cuando no entra ni sale nada.

Por ejemplo (con cifras inventadas), una base sin edificios de almacenamiento guarda 1.500 t y 1.500 m³. Si recibe 60 t y envía 100 t al día, el peso dura 1.500 ÷ 100 = 15 días. Si recibe 50 m³ y envía 75 m³, el volumen dura 1.500 ÷ 75 = 20 días. La tarjeta muestra 15 días.

La tarjeta usa toda la E/S de materiales. No sigue los «materiales excluidos» que fijas en la herramienta Visitas, así que puede mostrar un número de días distinto al de **Visitas**. Más en [Herramientas del plan](/help/plan_tools).

## E/S de materiales {#material-io}

La [[material-io|E/S de materiales]] lista cada material que la base produce o usa, al día:

- **Entrada**: lo que usa la base (insumos de producción y consumibles de la mano de obra).
- **Salida**: lo que produce la base.
- **Δ**: Salida − Entrada. Un Δ positivo se exporta (se vende), un Δ negativo se importa (se compra).

Tres controles encima de la tabla eligen lo que ves. No se guardan, así que la página siempre se abre con Toda la base, Todos y ȼ. Toda la base es la vista con la que se calcula el beneficio, así que su Δ es lo que la base compraría y vendería.

| Selector       | Opciones                                                            | Qué hace                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qué materiales | **Toda la base** (predeterminado), **Producción**, **Mano de obra** | Toda la base compensa producción y mano de obra juntas. Producción muestra solo los insumos y las salidas de los edificios, Mano de obra solo lo que consumen tus trabajadores. |
| Dirección      | **Todos** (predeterminado), **Exportaciones**, **Importaciones**    | Exportaciones deja las filas con Δ positivo, Importaciones las filas con Δ negativo.                                                                                            |
| Valor          | ȼ (predeterminado), t, m³, %                                        | La última columna: **ȼ / día** (Δ al precio de venta para las exportaciones, al precio de compra para las importaciones), **Δ t**, **Δ m³**, o **Parte 7d** y **Parte 30d**.    |

La vista en % muestra el Δ como parte del volumen diario medio negociado en los últimos 7 y 30 días. Te dice si el mercado puede absorber lo que vendes o suministrar lo que compras (consulta [Revisión del plan](/help/plan_check#flags)).

Haz clic en el encabezado de una columna para ordenar por ella. Con **Toda la base**, una marca tras la tarjeta de un material indica un aviso de mercado. Haz clic en ella para abrir la Revisión del plan en su vista de mercado, descrita en [Revisión del plan](/help/plan_check#market-check).

### Totales {#totals}

La parte de totales de la E/S de materiales resume la tabla al día:

- **Exportaciones**: el valor de todas las filas con Δ positivo.
- **Importaciones**: el valor de todas las filas con Δ negativo, como número negativo.
- Solo con **Toda la base**: **Degradación**, **Tasas de producción** y **Beneficio / día** (en negrita).

Los totales siguen la elección de Toda la base, Producción o Mano de obra, pero no la de Todos, Exportaciones o Importaciones. Con Toda la base, Exportaciones + Importaciones + Degradación + Tasas de producción = Beneficio / día, la misma cifra que la tarjeta.

> [!tip]
> Cambia la E/S de materiales a **Mano de obra** para ver cuánto cuesta al día alimentar a tus trabajadores. Desactivar un lujo en Mano de obra lo reduce, pero también reduce la eficiencia de los trabajadores (consulta [Configuración de la base](/help/plan_base#workforce)).

### Descargar como CSV {#csv}

**Más**, en la cabecera del plan, tiene **Descargar E/S de materiales (CSV)**. El archivo tiene una fila por material con las columnas ticker, input, output, delta, value, weight y volume, todas al día. El valor está en ȼ, y el peso y el volumen son los del Δ. Un archivo CSV se abre en cualquier programa de hojas de cálculo, así que puedes trabajar con las cifras fuera de PRUNplanner.

La descarga cubre la elección actual de Toda la base, Producción o Mano de obra e ignora la de Todos, Exportaciones o Importaciones. El archivo lleva el nombre del plan, o el ID del planeta mientras el plan no tiene nombre, seguido de «-material-io.csv».
