Base ROI clasifica todas las formas de gestionar una base: cada recurso en cada planeta que lo tiene, cada receta de cultivo en cada planeta fértil y cada receta de todos los demás edificios de producción. Cada fila es una base completa de 500 de área con la distribución óptima del edificio, calculada con el mismo motor que tus planes y valorada con la preferencia de CX seleccionada (precios 30D de Universe si no has iniciado sesión).

**Ten en cuenta**: Todas las filas suponen el COGC y los expertos definidos aquí; las filas de receta se calculan en un planeta estándar.

# Tipos de fila

- **Recurso**: un recurso en un planeta, con RIG, EXT o COL y los materiales de entorno del planeta. Muestra «@ planeta (saltos)».
- **Cultivo**: una receta de FRM u ORC en un planeta fértil, con la fertilidad del planeta en el rendimiento.
- **Receta**: una receta de cualquier otro edificio de producción, en un planeta estándar (rocoso, con gravedad, presión y temperatura normales). Usa **Probar en un planeta** en los detalles de la fila para verla en un planeta real.

# Métricas

- **Beneficio diario**: ingresos menos entradas, consumibles y degradación (construcción de los edificios de producción ÷ 180), con 5 expertos si se usa la progresión, si no con el número fijo.
- **Amortización**: días hasta amortizar el coste de los edificios. Con **Progresivo desde 0** una base nueva empieza sin expertos: las etapas con 0, 1, 2, 3 y 4 expertos duran 10, 12.5, 57.57, 276.5 y 915.1 días, cada una dividida entre el número de edificios de producción, y los ingresos y las entradas crecen con la bonificación de expertos. "never" when the base doesn't make a profit.
- **Rentabilidad semanal**: 7 × beneficio diario ÷ coste de los edificios.
- **Coste de los edificios**: construcción, más las opciones de Ajustes: stock de reserva (días de reserva × (entradas + consumibles + ingresos) ÷ 2) y la mejora de la sede para un permiso más (nivel de sede N − 1).
- **Coste operativo diario**: entradas + consumibles + degradación. Oculto hasta que lo actives en Columnas: el stock de reserva del coste de los edificios ya cubre el coste operativo al principio.
- **Carga / día**: el mayor entre el peso y el volumen que la base mueve de entrada o de salida al día; (I) cuando entra más, (O) cuando sale más.
- **Capacidad de mercado**: cuántas bases como esta puede absorber el mercado, por ambos lados. Para cada salida es el volumen negociado medio de 7 días ÷ lo que la base produce al día, y para cada entrada de la receta el volumen negociado ÷ lo que la base necesita al día. The lowest counts. (O) or (I) shows which side limits it, and the tooltip names the material. Por debajo de 1, una sola base produce o necesita más de lo que negocia el mercado.
- **Parcelas**: parcelas libres en el planeta, para las filas de planeta. Ordena por esta columna para ver los planetas más vacíos. Las filas de receta se calculan en un planeta estándar, así que muestran un guion.
- **Mano de obra**: la mano de obra que necesita la base por nivel.
- **Beneficio, 30 días**: beneficio diario con el VWAP diario de la bolsa de cada material durante los últimos 30 días. Los días sin operaciones mantienen el último precio. ASK, BID and fixed prices have no history.
- **⚠**: un material valorado con un VWAP 7D o 30D cuyo bid o ask se desvía más de un 30% de ese precio. La ventana emergente muestra el beneficio diario con esos precios.

# Ajustes

- **Búfer de stock**: almacenamiento para esta cantidad de días de carga; se añaden STO o STA, y se quita un edificio de producción cuando la base ya no cabría.
- **Capacidad de mercado mín.** (junto a la búsqueda sobre la tabla), **Límite logístico** y **Saltos máx.** ocultan filas; la línea sobre la tabla cuenta las filas ocultas por cada límite. Saltos máx. cuenta hasta la bolsa más cercana de tu preferencia de CX.
- **Mostrar planetas sin trabajadores o parcelas**: desactivado por defecto, así que las filas de planeta se ocultan cuando no cabe ninguna base nueva (todas las parcelas ocupadas y sin sitios fantasma) o cuando el último informe de población no puede cubrir los puestos de la base, contando los trabajadores libres menos los puestos ya vacantes. Un planeta sin informe de población cuenta como sin trabajadores. Actívalo para ver estas filas; la columna Personal muestra lo que falta. Recipe rows are not checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Volver a ejecutar la configuración** abre la configuración de la primera visita con sus ajustes predefinidos: Novato (SCB, sin rentabilidad semanal ni coste operativo), Estándar (WCB) y Veterano (cualquier nave o sin límite).

# Gráfico de beneficios

Above the table (beside the settings on wide screens), a chart shows the daily profit of the last 90 days for each industry. Cada base cuenta según cuánto de su producto negocia el mercado (media de 7 días), y los muchos planetas de una misma receta de recurso cuentan como uno. Search to drill in:

- una industria (p. ej., «Chemistry») muestra sus edificios;
- un edificio (p. ej., «CHP») muestra sus productos;
- un producto (p. ej., «SC») muestra las recetas que lo fabrican.

El gráfico sigue los ajustes y límites de la tabla. Muestra las 7 líneas más negociadas e indica cuántas más hay.

Every history chart has a time range (7, 30 or 90 days) and an aggregation (1, 3 or 7 days per point) at its top right, like the game's charts. A longer aggregation smooths out daily noise. The choice applies to all charts and is remembered.

# Search and tooltips

- La búsqueda sobre la tabla filtra por industria, edificio o ticker de producto.
- Pasa el ratón por la cabecera de una columna para ver qué significa, y por un número para ver el cálculo rápido que hay detrás.

# Detalles

Expand a row to see two charts, then the full math below them. También puedes copiar el cálculo como texto o abrir la fila como un plan nuevo con la misma distribución (con sesión iniciada).

- **Profit**: revenue, running cost and daily profit, every line on one ȼ scale.
- **Market volume**: how many bases the market carries each day, from the CX traded volume. _Outputs_ is the scarcest output's traded volume ÷ what one base sells per day; _Inputs (bottleneck)_ is the same for the recipe input with the least volume per unit the recipe needs. It's the market capacity column, day by day.
