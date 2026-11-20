**ROI de bases** ordena todas las formas de montar una base, para que veas qué bases se amortizan más rápido antes de planificar una. Cada fila es una base completa: un recurso en un planeta, una receta de cultivo en un planeta fértil o una receta de cualquier otro edificio de producción. No necesitas una cuenta para usarlo.

Te sirve cuando buscas tu próxima base y quieres comparar las opciones una al lado de otra. Cuando una fila te parece interesante y has iniciado sesión, **Abrir como plan** la convierte en un plan que puedes cambiar hasta el último detalle.

> [!warning]
> ROI de bases está en fase de pruebas y todavía no tiene entrada en la navegación. Ábrelo en [/base-roi](/base-roi).

## Primera visita {#first-visit}

La primera vez que abres la página, **Configurar ROI de bases** te hace unas preguntas para que la tabla se ajuste a tu forma de jugar:

- tu preferencia de bolsa (solo si has iniciado sesión)
- **¿Qué tan estricta debe ser la tabla?**: **Novato**, **Estándar** (preseleccionado) o **Veterano**
- la nave (solo Veterano: cualquier nave, o **Sin límite**, el predeterminado) y **Visitas de la nave**, cuántos días de carga lleva la nave por viaje, de entrada y de salida
- **Elegir columnas**: las columnas del ajuste, que puedes cambiar antes de pulsar **Empezar**

| Ajuste predefinido | Logística                                                                   | Capacidad de mercado mín. | Búfer de stock | Columnas ocultas                                                     |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------------------- | -------------- | -------------------------------------------------------------------- |
| **Novato**         | SCB (500 t / 500 m³)                                     | 0,7                                       | 10 días        | Rendimiento semanal, coste de funcionamiento, parcelas, mano de obra |
| **Estándar**       | WCB (3.000 t / 1.000 m³) | 0,7                                       | 10 días        | Rendimiento semanal, coste de funcionamiento, parcelas, mano de obra |
| **Veterano**       | tu nave, o sin límite                                                       | 0 (cualquiera)         | 10 días        | Coste de funcionamiento                                              |

Un ajuste solo rellena opciones que también puedes cambiar después en [Ajustes](#settings), así que nada de lo que elijas aquí es definitivo. La nave y **Visitas de la nave** importan porque fijan el límite logístico: la tabla oculta las bases que mueven más carga entre dos visitas de la que lleva la nave. La capacidad de mercado mínima oculta las bases de las que el mercado puede absorber menos que ese número, por ejemplo menos de 0,7 bases.

**Omitir**, o cerrar el diálogo, mantiene los ajustes actuales. En ambos casos el diálogo no vuelve a abrirse solo, pero **Volver a ejecutar la configuración** en Ajustes lo trae de vuelta. Todos los ajustes se guardan solo en este navegador, no en tu cuenta.

## Lo que supone cada base {#assumptions}

Cada fila es una base completa de 500 de área (un [[area-permits|permiso]]) con la distribución óptima del edificio. PRUNplanner la calcula con el mismo motor que tus [[plan|planes]] y la valora con la [[exchange-preference|preferencia de bolsa]] seleccionada, o con precios 30D de Universe cuando no has iniciado sesión o tienes seleccionado «Ninguna - Universe 30D». Cada base supone además:

- Ambos [[luxuries|lujos]] para cada nivel.
- [[experts|Expertos]] solo en la propia [[expertise|especialización]] del edificio, según lo fijado en Ajustes.
- El COGC de Ajustes, nunca el programa real del planeta. Los detalles muestran el programa real del planeta como «(no aplicado)». En el juego, los residentes del planeta votan el programa y el ganador está activo durante una semana, así que el programa real puede cambiar de una semana a otra.
- Las filas de recetas se calculan en un planeta estándar: rocoso, con gravedad, presión y temperatura normales, no fértil y sin tasas de producción.

El pie de Ajustes dice lo mismo: «Todas las filas asumen el COGC y los expertos definidos aquí; las filas de recetas se calculan en un planeta estándar.»

## Tipos de fila {#row-kinds}

- **Recurso**: un recurso en un planeta, con RIG, EXT o COL y los materiales de entorno del planeta en la construcción. PRUNplanner solo calcula planetas dentro de **Saltos máx. (filas de planetas)** y recursos con una [[extraction|extracción]] diaria mayor que 0. La fila muestra «@ planeta · N saltos», los [[jumps|saltos]] hasta la bolsa más cercana de tu preferencia de bolsa, o de las cuatro bolsas si no tienes ninguna.
- **Cultivo**: una receta de FRM u ORC en un planeta fértil, con la fertilidad del planeta en el rendimiento. También muestra «@ planeta · N saltos». La casilla **Recursos** de **Tipos de fila** muestra u oculta estas filas junto con las filas de recursos.
- **Receta**: una receta de cualquier otro edificio de producción, en el planeta estándar. Usa **Probar en un planeta** en los detalles de la fila para verla en un planeta real.

## Métricas {#metrics}

- **Beneficio diario**: ingresos menos insumos, consumibles, [[degradation|degradación]] y [[production-fees|tasas de producción]]. La degradación es la construcción de los edificios de producción ÷ 180. Las filas de planeta pagan las tasas de su planeta (la tasa diaria del planeta × eficiencia × edificios). Las filas de recetas en el planeta estándar no pagan ninguna. Con **Progresivo desde 0** este es el beneficio con 5 expertos; si no, con el número fijo.
- **Amortización**: días hasta pagar el coste de construcción. Con **Progresivo desde 0** una base nueva empieza sin expertos. Las etapas con 0, 1, 2, 3 y 4 expertos duran 10, 12,5, 57,57, 276,5 y 915,1 días, cada una dividida por el número de edificios de producción. Los ingresos, los insumos y las tasas de producción crecen con la bonificación de expertos, mientras que los consumibles y la degradación se mantienen. Muestra «nunca» cuando la base no da beneficio (con la progresión: con 5 expertos). No te preocupes si casi nunca lo ves: esas filas tienen un beneficio diario de 0 o menos, así que solo aparecen mientras **Mostrar negativos** está activado.
- **Rendimiento semanal**: 7 × beneficio diario ÷ coste de construcción.
- **Coste de construcción**: la construcción más las opciones de Ajustes, que son el stock de búfer (días de búfer × (insumos + consumibles + ingresos) ÷ 2) y la mejora de HQ para un permiso más.
- **Coste diario de funcionamiento**: insumos + consumibles + degradación + tasas de producción. Está oculto hasta que lo activas en **Columnas**, porque el stock de búfer del coste de construcción ya cubre el coste de funcionamiento al principio.
- **Carga / día**: dos números, toneladas y m³, cada uno el mayor entre lo que la base mueve de entrada y de salida al día. La información emergente indica la entrada y la salida por separado, junto con la comprobación de la nave. La ordenación usa el mayor de los dos números, tanto en toneladas como en m³.
- **Capacidad de mercado**: cuántas bases como esta puede absorber el mercado. Para cada salida, es el volumen negociado al día (todo lo negociado en los últimos 7 días ÷ 7, así que cuentan los días sin operaciones) ÷ lo que la base produce al día. Para cada insumo de la receta, es el volumen negociado ÷ lo que la base necesita al día. Los subproductos cuentan como salidas, y los consumibles de la mano de obra no cuentan. Cuenta el valor más bajo. (S) o (E) muestra qué lado la limita, y la información emergente nombra el material. Por debajo de 1 (en ámbar), una base produce o necesita más de lo que negocia el mercado. La información emergente también da la parte del volumen negociado que corresponde a una base (1 ÷ capacidad de mercado, como porcentaje). Consulta [[market-capacity|capacidad de mercado]].
- **Industria**: la industria de la base, abreviada (Food para Industria Alimenticia, Fuel para Refinamiento de Combustible, Extraction para Extracción de Recursos).
- **Parcelas**: [[plots|parcelas]] libres en el planeta, para las filas de planeta. Ordena por esta columna para encontrar los planetas más vacíos. Las filas de recetas muestran un guion.
- **Mano de obra**: los trabajadores que necesita la base por nivel (PIO, SET, TEC, ENG, SCI). Cuando el planeta no puede cubrir la plantilla de la base, una línea ámbar dice cuántos hay libres, o «Sin informe de población».
- **Beneficio, 30 días**: el beneficio diario con el [[vwap|VWAP]] diario de la bolsa de cada material durante los últimos 30 días, como un gráfico pequeño. Los días sin operaciones mantienen el último precio, y los materiales sin historial mantienen el precio de hoy. ASK, BID y los precios fijos no tienen historial.
- **⚠**: un material valorado con un VWAP 7D o 30D cuyo [[bid]] o [[ask]] se aleja más de un 30 % de ese precio. Es una pista de que el beneficio diario puede ser bastante distinto cuando operas con el libro de órdenes en lugar de con la media. La ventana emergente lista el beneficio diario para cada combinación de bid y ask de esos materiales, de menor a mayor. Con más de 100 combinaciones solo muestra los dos extremos: comprar al ask y vender al bid, y al revés.

### Ejemplo práctico {#metrics-example}

Las cifras de aquí son inventadas y redondas, con un número fijo de expertos, para que las cuentas sean fáciles de seguir.

- Una base tiene un coste de construcción de 700.000 ȼ y gana 20.000 ȼ al día. La amortización es 700.000 ÷ 20.000 = 35 días, y el rendimiento semanal es 7 × 20.000 ÷ 700.000 = 20 %.
- Parte de ese coste de construcción es el búfer de stock. Con 10 días de búfer, insumos de 3.000 ȼ, consumibles de 1.000 ȼ e ingresos de 8.000 ȼ al día, es 10 × (3.000 + 1.000 + 8.000) ÷ 2 = 60.000 ȼ.
- La base produce 300 unidades de su salida al día, y el mercado negocia 900 al día de media en 7 días: 900 ÷ 300 = 3 bases. Su receta necesita 200 unidades al día de un insumo, que se negocia a 400 al día: 400 ÷ 200 = 2 bases. Cuenta el valor más bajo, así que la capacidad de mercado es 2 (E), y la parte de una base en el volumen negociado de ese insumo es 1 ÷ 2 = 50 %.

Con **Progresivo desde 0**, la amortización es más larga que coste de construcción ÷ beneficio diario, porque las primeras etapas funcionan con menos expertos. En el juego, los expertos llegan con el tiempo por tener en marcha los edificios de producción de esa especialización, y con más edificios llegan antes. La progresión lo sigue: cada etapa se divide por el número de edificios de producción.

> [!tip]
> Una amortización corta con una capacidad de mercado por debajo de 1 es una trampa, porque una sola base ya inunda el mercado. Ordena por amortización y luego comprueba que la capacidad de mercado queda muy por encima del número de bases que planeas.

## Ajustes {#settings}

El panel de ajustes está encima de la tabla. Cuando está cerrado, muestra un resumen de una línea con los ajustes que dan forma a la tabla.

| Ajuste                                                                 | Predeterminado                                                                                                              | Opciones                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **COGC (todas las filas)**                          | **Programa correspondiente** (el programa de la propia especialización del edificio)                     | **Ninguno**                                                        |
| **Expertos**                                                           | **Progresivo desde 0**                                                                                                      | de 0 a 5, fijo                                                     |
| **Búfer de stock**                                                     | 10 días                                                                                                                     | **Desactivado**, de 1 a 10, 14, 21 o 28 días                       |
| **Límite logístico**                                                   | **Por nave**: WCB, cada 3 días                                                                              | **Manual** (600 t y 200 m³ al día), **Ninguno** |
| **Permiso objetivo (coste de HQ)**                  | **Desactivado**                                                                                                             | de 2 a 50                                                          |
| **Saltos máx. (filas de planetas)** | 7                                                                                                                           | cualquier número entero desde 0                                    |
| **Capacidad de mercado mín.**                          | 0,7 bases                                                                                                                   | de 0,0 a 1,0 en pasos de 0,1                                       |
| **Tipos de fila**                                                      | **Recursos** y **Recetas** activados; **Mostrar negativos** y **Mostrar planetas sin trabajadores o parcelas** desactivados |                                                                    |

- **Límite logístico**: **Por nave** elige una nave (de TCB a HCB, cada una con sus t y m³) y cada cuánto viene («Cada … días»). La nave tiene que llevar esos días de carga, de entrada y de salida, en peso y en volumen. La tabla oculta las filas que necesitan más. **Manual** fija el límite por día, y **Ninguno** no limita nada. Por ejemplo, la WCB predeterminada (3.000 t / 1.000 m³) cada 3 días permite una base que mueve hasta 3.000 ÷ 3 = 1.000 t y 1.000 ÷ 3 ≈ 333 m³ al día, contando el mayor entre entrada y salida.
- **Búfer de stock**: almacenamiento para ese número de días de carga. PRUNplanner añade STO o STA. Cuando la base ya no cabría en 500 de área, quita un edificio de producción hasta que cabe.
- **Permiso objetivo (coste de HQ)**: suma los materiales de ese nivel de HQ, a precios de compra de la CX, al coste de construcción de cada fila. El coste cuenta a partir de 3, así que 2 no suma nada. En el juego, cada mejora de nivel de la HQ te da un permiso de base más, así que esto muestra lo que cuesta la base con ese permiso, incluida la mejora hasta ese nivel de HQ.
- **Saltos máx. (filas de planetas)**: contados hasta la bolsa más cercana de tu preferencia de bolsa, que el ajuste nombra. Los planetas sin ruta cuentan como demasiado lejanos.
- **Capacidad de mercado mín.** está junto a la búsqueda encima de la tabla y oculta las filas por debajo de ese valor.
- **Mostrar negativos**: cuando está desactivado, la tabla oculta las filas con un beneficio diario de 0 o menos.
- **Mostrar planetas sin trabajadores o parcelas**: desactivado por defecto. La tabla oculta entonces las filas de planeta cuando no cabe ninguna base nueva (todas las parcelas ocupadas y sin [[ghost-sites|sitios fantasma]]) o cuando el último [[popr|informe de población]] no puede cubrir los puestos de la base, contando los trabajadores libres menos los puestos ya vacantes. Un planeta sin informe de población cuenta como sin trabajadores. Actívalo para ver estas filas, y activa la columna **Mano de obra** para ver lo que falta. Las filas de recetas no se comprueban. Si no se pueden cargar los informes, la página lo dice y no se oculta nada.
- **Restablecer valores predeterminados** restablece los ajustes, pero mantiene tus columnas, los paneles y gráficos abiertos o cerrados, y el rango de tiempo y la agregación de los gráficos.
- **Volver a ejecutar la configuración** abre el diálogo de la primera visita.

Un planeta lleno pero con sitios fantasma se queda en la tabla. En el juego, los sitios fantasma solo permiten asentarse allí a los jugadores nuevos que empiezan en ese planeta, así que revisa la columna **Parcelas** si tu empresa empezó en otro sitio.

Solo el COGC, los expertos, el búfer de stock, los saltos máximos y la preferencia de bolsa hacen que PRUNplanner vuelva a calcular las filas. Todos los demás ajustes se aplican al instante.

> [!warning]
> Elegir una preferencia de bolsa en el selector de arriba (solo con sesión iniciada) también la convierte en tu preferencia de bolsa predeterminada. Las demás páginas que siguen tu predeterminada cambian con ella.

### Filas ocultas {#hidden-rows}

La línea encima de la tabla cuenta las filas, y las ocultas por cada límite: «saltos máx.», «logística», «capacidad de mercado», «sin parcelas», «sin trabajadores» y «beneficio negativo». Cada fila cuenta una vez, en su primer límite según ese orden. «sin parcelas» y «sin trabajadores» solo cuentan mientras **Mostrar planetas sin trabajadores o parcelas** está desactivado, y «beneficio negativo» solo mientras **Mostrar negativos** está desactivado. La búsqueda no es un límite y no se cuenta.

Cuando no queda ninguna fila, la tabla dice «Ninguna base cumple estos ajustes.» No te preocupes: salvo que la página diga que ha fallado una petición, esto solo significa que tus ajustes o tu búsqueda no dejan nada que mostrar. Los recuentos encima de la tabla te dicen qué límites ocultaron filas, para que sepas qué ajuste cambiar.

## Gráfico de beneficio {#profit-chart}

Encima de la tabla, **Beneficio diario por industria** muestra el beneficio diario de cada industria durante el rango de tiempo elegido (90 días salvo que lo cambies). En pantallas de 1.536 px o más anchas se coloca junto a los ajustes.

- Cada base cuenta según cuánto negocia el mercado de su material (media de 7 días de sus salidas).
- Los muchos planetas de un mismo recurso o receta de cultivo cuentan como uno: la media de los 3 planetas con mayor beneficio diario, para que los planetas malos no hundan la línea.
- Sigue los ajustes y los límites de la tabla.
- Muestra las 7 líneas más negociadas y dice cuántas más hay.

Haz clic en el título para plegar el gráfico, y se queda plegado. Busca para ver el detalle:

- una industria (p. ej. «Chemistry») muestra sus edificios
- un edificio (p. ej. «CHP») muestra sus materiales
- un material (p. ej. «SC») muestra las recetas que lo producen

Una búsqueda que deja solo un edificio o una industria también entra en el detalle.

Cada gráfico de historial tiene un rango de tiempo (**7D**, **30D** o **90D**) y una agregación (**1D**, **3D** o **7D** por punto) arriba a la derecha, como los gráficos del juego. Una agregación más larga suaviza el ruido diario. Tu elección se aplica a todos estos gráficos y se recuerda. La columna **Beneficio, 30 días** de la tabla siempre muestra 30 días.

## Gráfico {#chart}

**Gráfico**, arriba, abre **Amortización frente a capacidad de mercado** en un panel cuyo tamaño puedes cambiar. Representa las filas que muestra la tabla, búsqueda incluida:

- en horizontal, la amortización en días, y en vertical, la capacidad de mercado en bases, ambas en escala logarítmica
- el tamaño del punto es el beneficio diario, y el color es el tipo de fila
- la línea discontinua une los mejores compromisos: filas que ninguna otra fila supera a la vez en amortización más corta y en mayor capacidad de mercado

Las filas que nunca se amortizan o no tienen capacidad de mercado no se dibujan, pero el panel las cuenta. Pasa el ratón por un punto para desplazar la tabla hasta su fila. El botón está desactivado mientras no se muestra ninguna fila, y el panel se queda abierto o cerrado como lo dejaste.

> [!tip]
> La esquina superior izquierda del gráfico es donde quieres estar: amortización rápida y sitio en el mercado. Pasa el ratón por los puntos de ahí para encontrar sus filas.

## Búsqueda e información emergente {#search-and-tooltips}

- La búsqueda encima de la tabla filtra por industria, edificio o ticker de salida.
- La tabla ordena las filas por amortización, de la más corta a la más larga, y entre amortizaciones iguales por el mayor beneficio diario. Haz clic en el encabezado de una columna para ordenar por ella (Material, Mano de obra y Beneficio, 30 días no se ordenan). La tabla muestra 50 filas por página.
- Pasa el ratón por el encabezado de una columna para ver qué significa, o por un número para ver la cuenta rápida que hay detrás.

## Detalles {#details}

Despliega una fila para ver dos gráficos en **Historial de beneficio**, con todo el cálculo debajo.

- Beneficio: ingresos, coste de funcionamiento y beneficio diario, todas las líneas en una misma escala de ȼ.
- Volumen de mercado: cuántas bases sostiene el mercado cada día, a partir del volumen negociado en la CX ese día. **Salidas** es el volumen negociado de la salida más escasa ÷ lo que una base vende al día. **Entradas (cuello de botella)** es lo mismo para el insumo de la receta con menos volumen por unidad que necesita la receta. Es la columna de capacidad de mercado, día a día.

Ambos gráficos siguen el rango de tiempo y la agregación de los gráficos de historial. El cálculo viene en ocho secciones: **Distribución y coste de construcción**, **Logística y almacenamiento**, **Eficiencia de producción**, **Ciclos de producción**, **Rendimiento**, **Dinero por día** (con consumibles, degradación y tasas de producción), **Amortización** (cada etapa de expertos y el día en que se amortiza) y **Capacidad de mercado**. **Copiar como texto** lo copia todo.

**Probar en un planeta** (solo filas de recetas) te deja elegir cualquier planeta, y PRUNplanner calcula allí la fila con los ajustes de la tabla. Una línea compara el coste de construcción y la amortización con el planeta estándar, y **Volver al planeta estándar** lo deshace. PRUNplanner olvida la elección cuando se cierran los detalles.

**Abrir como plan** (con sesión iniciada) crea y guarda un plan al momento y lo abre. El plan se llama «Base ROI» con las salidas y el edificio, y recibe la misma distribución. Va en el planeta de la fila, en el planeta que probaste o en Montem (OT-580b) para una fila de receta. Entra en uno de tus imperios con la misma preferencia de bolsa y sin bonificación de facción para el edificio. Sin un imperio así no entra en ninguno, y un aviso dice que el beneficio diario del plan puede ser distinto. Las filas de planeta también enlazan «Abrir …» para empezar un plan en ese planeta.

> [!tip]
> Una fila de receta no tiene tasas de producción. Usa antes **Probar en un planeta**: las cifras incluyen entonces las tasas de ese planeta, y **Abrir como plan** pone el plan allí en lugar de en Montem.

## Carga {#loading}

Primero aparecen las filas de recetas y después las de planetas («Cargando filas de planetas…»). Una línea de progreso muestra cada paso. Si falla una petición, la página lo dice. Cambia un ajuste o recarga la página para intentarlo de nuevo. En la primera carga, las filas de recetas aparecen en cuanto están listas, así que puedes mirarlas mientras las filas de planetas todavía se están calculando.
