Antes de planificar en torno a un precio o de operar con él, consulta Exploración del mercado para ver si ese precio es normal, está subiendo o está bajando. Muestra el historial de precios y el mercado actual de un material en las cuatro bolsas.

## Historial de precios {#history}

El juego solo muestra los últimos 365 días de historial de precios. PRUNplanner conserva todos los días que tiene guardados, desde julio de 2023. Así que el rango **Todo** del gráfico [Todas las bolsas](#all-exchanges) puede llegar más atrás que el juego.

PRUNplanner construye el historial a partir de los datos diarios de precios que entrega [[fio|FIO]]. Falta cualquier día para el que FIO no entregó nada, y PRUNplanner no corrige los precios de ningún día. Así que una única operación a un precio extremo aparece tal como ocurrió, por ejemplo como una mecha larga en una vela.

## Elegir un material {#material}

**Cambiar material** elige el material, y empieza con DW. Los enlaces desde la tarjeta de mercado de un material abren la página con ese material, igual que **Explorar** en la [tabla de resumen](#overview).

## Cifras clave {#kpis}

Los recuadros de arriba describen el material en las cuatro bolsas ([[universe|Universe]]):

| Recuadro                                                                    | Qué muestra                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **VWAP 7D de Universe**                                                     | el [[vwap\|VWAP]] de los últimos 7 días en ȼ. Debajo, **% Tendencia** = (VWAP 7D − VWAP 30D) ÷ VWAP 30D                                                           |
| **Volumen negociado 7D de Universe**                                        | unidades negociadas en los últimos 7 días, con las unidades de 30 días debajo                                                                                                                                                                                                                                |
| **Delta de mercado de Universe**                                            | oferta − demanda: unidades en todas las órdenes de venta menos unidades en todas las órdenes de compra de los cuatro libros. Indica **Escasez** cuando es negativo y **Excedente** cuando es positivo, con **Oferta:** y **Demanda:** debajo |
| **Tendencia ponderada** (**Delta ajustado por volumen**) | la % Tendencia de cada bolsa, ponderada por su parte de las unidades negociadas en 7 días                                                                                                                                                                                                                    |
| **Cohesión de precios** (**Índice de varianza**)         | lo separados que están los VWAP 7D de las cuatro bolsas: desviación estándar ÷ media, en %                                                                                                                                                                                                   |

Una % Tendencia positiva significa que los últimos 7 días se negoció más caro de media que en los últimos 30, y una negativa, más barato. Algunos ejemplos inventados:

- **% Tendencia**: un VWAP 7D de 105 ȼ frente a un VWAP 30D de 100 ȼ da (105 − 100) ÷ 100 = +5 %.
- **Delta de mercado de Universe**: una oferta de 1.000 frente a una demanda de 1.500 da 1.000 − 1.500 = −500, así que indica **Escasez**.
- **Tendencia ponderada**: de 1.000 unidades negociadas en 7 días, AI1 negoció 500 a +10 %, CI1 250 a +4 %, IC1 150 a −2 % y NC1 100 a 0 %. Eso da 0,5 × 10 + 0,25 × 4 + 0,15 × (−2) + 0,1 × 0 = +5,7 %.
- **Cohesión de precios**: unos VWAP 7D de 98, 100, 100 y 102 ȼ tienen una media de 100 y una desviación estándar de √((4 + 0 + 0 + 4) ÷ 4) ≈ 1,41, así que indica alrededor de 1,4 %.

Una Cohesión de precios baja significa que las bolsas negocian casi al mismo precio, y una alta, que hay diferencias entre ellas. Una bolsa sin operaciones cuenta en ella con un precio de 0.

Tendencia ponderada muestra «—» cuando alguna de las cuatro bolsas no tuvo operaciones en los últimos 30 días, porque PRUNplanner no puede calcular la tendencia de esa bolsa.

## Gráfico de mercado {#chart}

**Vista del gráfico** cambia entre dos gráficos. La página recuerda tu elección hasta que cierras la pestaña del navegador.

### Velas {#candles}

Aquí ves una bolsa como gráfico de velas (apertura, máximo, mínimo y cierre por periodo), con las unidades negociadas como barras debajo.

- **Bolsa**: AI1 (por defecto), CI1, IC1 o NC1.
- **Intervalo**: **Diario**, **Semanal** (las semanas empiezan el lunes) o **Mensual**, en UTC.

Un día sin datos aparece como una vela plana en el último cierre con volumen 0, así que un hueco parece un día tranquilo.

### Todas las bolsas {#all-exchanges}

Cada bolsa tiene su propia línea para que puedas compararlas directamente, con **Volumen negociado, todas las bolsas** (unidades / día) debajo.

- **Valor**: **VWAP** (ȼ negociados ÷ unidades negociadas ese día), **Mín.** o **Máximo**.
- **Rango**: **30 d**, **90 d** (por defecto), **1 a** o **Todo**.

El rango termina en el último día con operaciones en alguna bolsa. Un día sin operaciones en una bolsa deja un hueco en su línea. Si el material no tiene ninguna operación, el gráfico dice **No hay operaciones en este rango**.

El botón de arriba a la derecha del gráfico (**Pantalla completa**) le da al gráfico todo el ancho.

## Datos de mercado {#market-data}

**Datos de mercado** es la tabla por bolsa de la tarjeta de mercado del material, con las vistas **Precios**, **Libros de órdenes** y **Volumen**. [Bolsas y precios](/help/exchanges) explica qué significan sus columnas.

## Resumen del mercado de materiales {#overview}

**Resumen del mercado de materiales** enumera todos los materiales, ordenados por ticker. Haz clic en una cabecera para ordenar por ella. Funciona en todas las columnas salvo **30 días** y **Detalles**.

| Columna                                             | Qué muestra                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**                                        | el material                                                                                                                           |
| **VWAP 7D**, **VWAP 30D**                           | VWAP de Universe de los últimos 7 y 30 días                                                                                           |
| **30 días**                                         | el VWAP diario de Universe de los últimos 30 días. Solo muestra la dirección, ya que cada fila tiene su propia escala |
| **Tendencia**                                       | la Tendencia ponderada (consulta [Cifras clave](#kpis))                                                            |
| **Volumen negociado 7D**, **Volumen negociado 30D** | unidades negociadas en Universe                                                                                                       |
| **Detalles**                                        | **Explorar** carga el material en la página                                                                                           |

> [!tip]
> Ordena por **Tendencia** para encontrar los materiales cuyo precio más se mueve esta semana, y luego pulsa **Explorar** para ver si es algo pasajero o un movimiento más largo. Para ver todo el mercado de un vistazo, consulta el [Informe de mercado](/help/tools_market_report).

## Cómo leer los gráficos de velas {#candlesticks}

Una vela cubre un periodo. Su cuerpo va del precio de apertura al de cierre, y las líneas finas (mechas) llegan al máximo y al mínimo del periodo. Un cierre por encima de la apertura da una vela alcista, y un cierre por debajo, una bajista. Las barras bajo el gráfico muestran cuántas unidades se negociaron, así que puedes distinguir un movimiento con volumen real de uno con una sola operación.
