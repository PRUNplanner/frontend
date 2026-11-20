Usa ROI de recursos para elegir un planeta para una base de extracción. Encuentra todos los planetas donde se puede extraer un recurso y calcula lo que gana allí una base llena de RIG, EXT o COL. Cuando un planeta tenga buena pinta, ábrelo como plan para afinarlo.

## Cómo usarlo {#how-to-use}

1. Elige el recurso en **Seleccionar Recurso** (36 recursos planetarios, de ALO a ZIR).
2. Revisa **Preferencia de CX**, que decide los precios (consulta [Precios](#prices)).
3. Pulsa **Buscar y calcular**.

PRUNplanner primero busca todos los planetas con ese recurso, mientras muestra «Esperando la respuesta del backend». Después calcula cada uno, con una barra de progreso que indica **Calculando el ROI del recurso para los planetas.** Obtienes los resultados ordenados por rendimiento diario, de mayor a menor.

Si cambias el recurso o la preferencia de bolsa, la tabla no se recalcula sola. Vuelve a pulsar **Buscar y calcular**.

## Qué calcula {#what-it-calculates}

En cada planeta con el recurso, PRUNplanner mira todos los edificios de extracción cuyas recetas lo producen allí. Para cada uno de esos edificios monta un plan a partir de la distribución guardada del edificio (consulta [Configuraciones óptimas](#optimal-setups)). Así que cada fila es un planeta y un edificio que puede extraer el recurso allí.

Todos los planes usan estos ajustes:

| Ajuste                                                                                                                             | Valor                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planeta                                                                                                                            | el planeta real, con su concentración del recurso, sus [[extra-building-materials\|materiales de construcción adicionales]] y sus [[production-fees\|tasas de producción]] |
| Programa de [[cogc\|COGC]] | Extracción de Recursos, en todos los planetas                                                                                                                                                                                                                                                                                                                                              |
| [[experts\|Expertos]]      | 5 en cada especialización                                                                                                                                                                                                                                                                                                                                                                  |
| Mano de obra                                                                                                                       | totalmente alojada en los hábitats de la distribución                                                                                                                                                                                                                                                                                                                                      |

> [!warning]
> Todos los planes suponen que el planeta tiene el programa de Extracción de Recursos, tenga el que tenga en realidad. La columna **COGC** muestra el programa que tiene hoy el planeta. Donde sea distinto, las cifras reales son más bajas.

## Columnas {#columns}

La tabla muestra 50 filas por página. La columna del planeta se queda fija, y en pantallas estrechas la tabla se desplaza en horizontal. Haz clic en la cabecera de una columna numérica para ordenar por ella.

| Grupo                 | Columna                                     | Qué muestra                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                       | **Planeta**                                 | nombre e ID. El enlace abre un plan nuevo en ese planeta                                                                                                                                                                           |
| **Producción**        | **Edificio**                                | RIG, EXT o COL                                                                                                                                                                                                                                     |
|                       | **Diario**                                  | unidades del recurso que extrae la distribución al día                                                                                                                                                                                             |
|                       | **% máx.**                  | Diario como porcentaje del mejor Diario de los resultados, con una barra                                                                                                                                                                           |
| **Coste / Beneficio** | **COGM**                                    | abre el desglose de costes por unidad ([[cogm\|COGM]])                                                                  |
|                       | **Coste del Plan (ȼ)**   | lo que cuesta construir toda la distribución en ese planeta                                                                                                                                                                                        |
|                       | **Beneficio diario (ȼ)** | lo que gana la distribución al día, con una barra a escala de la mejor fila                                                                                                                                                                        |
|                       | **ROI del plan (d)**     | Coste del plan ÷ Beneficio diario, en días                                                                                                                                                                                                         |
| **Planeta**           | **POPR**                                    | el último informe de población del planeta (consulta [POPR](#popr))                                                                                                                                                             |
|                       | **COGC**                                    | el programa que tiene hoy el planeta, o «—» si no tiene ninguno                                                                                                                                                                                    |
|                       | **Entorno**                                 | los materiales de construcción adicionales que necesita el planeta, como recuadros                                                                                                                                                                 |
|                       | **Infraestructura**                         | LM, COGC, WAR, ADM y SHY, donde el planeta los tiene                                                                                                                                                                                               |
| **Distancias**        | AI1, CI1, IC1, NC1                          | [[jumps\|saltos]] hasta cada bolsa. La más cercana va en negrita con el color de su bolsa, y «—» significa que no hay ruta |

El Beneficio diario y el Coste del plan siguen las mismas reglas que en [ROI de recetas](/help/tools_roi_overview#calculation). Las salidas cuentan al precio de venta y los consumibles al precio de compra, con la [[degradation|degradación]] y las tasas de producción del planeta incluidas.

**ROI del plan (d)** muestra el número tal cual. Un valor negativo significa que el plan pierde dinero y nunca se amortiza. Su barra se llena a medida que la amortización se acerca a 20 días, así que una barra más larga significa una amortización más lenta. Por ejemplo, una amortización de 10 días llena media barra, y 20 días o más la llenan entera.

**% máx.** compara cada fila con la mejor. Por ejemplo, si la mejor distribución extrae 200 unidades al día, una fila con un Diario de 150 muestra 150 ÷ 200 = 75 %.

## Filtros {#filters}

- **Planeta** y **Edificio** reducen la tabla al planeta o al edificio que elijas.
- **ROI positivo** oculta los planes que pierden dinero.
- **Material buscado** muestra el recurso elegido en **Seleccionar Recurso**. Si lo cambias sin pulsar **Buscar y calcular**, las filas siguen siendo las del recurso anterior.

El gráfico de abajo muestra las mismas filas que la tabla filtrada.

## Amortización frente a distancia {#chart}

Tras una búsqueda, **Gráfico** abre el gráfico **Amortización frente a distancia** bajo la tabla, y tu navegador recuerda si está abierto. Para hacerlo más alto o más bajo, arrastra su borde superior, o pon el foco en el borde y usa las flechas.

- El eje horizontal es el ROI del plan en días. El eje vertical son los saltos hasta la bolsa más cercana, o hasta la que elijas en **Distancia a** (**CX más cercana** por defecto).
- El tamaño de un punto es su beneficio diario, y su color es la bolsa hasta la que se cuentan sus saltos (por defecto, la más cercana).
- Los puntos resaltados son los mejores compromisos: ningún otro planeta se amortiza antes y además está más cerca. Por ejemplo, un planeta con 10 días a 4 saltos y otro con 12 días a 2 saltos se resaltan los dos, ya que ninguno supera al otro en ambas cosas. Un planeta con 14 días a 5 saltos no se resalta, porque el primero lo supera en ambas.
- Una línea bajo el gráfico nombra los planetas resaltados y sus saltos. También nombra el planeta que más gana al día, si no está entre ellos.
- Pasa el puntero por un punto para desplazar la tabla hasta su fila.

No todas las filas se convierten en un punto. El gráfico deja fuera las filas que nunca se amortizan, no tienen ruta hasta la bolsa o tardan más del doble que la amortización más rápida, y las cuenta bajo el gráfico. Así que si la fila más rápida se amortiza en 10 días, las filas de más de 20 días se cuentan pero no se dibujan. No te preocupes si parece que faltan puntos: siguen en la tabla.

> [!tip]
> Un planeta a unos saltos más que se amortiza casi igual de rápido suele ser mejor base, ya que el transporte desde y hacia una bolsa cuesta tiempo y combustible cada semana.

## POPR {#popr}

El botón **POPR** carga el último informe de población del planeta ([[popr|POPR]]) y lo abre por nivel de mano de obra:

| Fila                   | Qué muestra                                           |
| ---------------------- | ----------------------------------------------------- |
| **Población total**    | la cifra de población del nivel según el informe      |
| **Población libre**    | trabajadores sin empleo                               |
| **Población libre %**  | los trabajadores libres en porcentaje                 |
| **Empleos sin cubrir** | los puestos que tienen abiertos las bases del planeta |

Si un planeta no tiene informe, al pulsar el botón se convierte en un **Sin POPR** rojo y desactivado. Dentro de un plan, la herramienta POPR muestra el mismo informe con lo que necesita tu plan al lado (consulta [Herramientas del plan](/help/plan_tools)).

## Configuraciones óptimas {#optimal-setups}

PRUNplanner usa una tabla fija de distribuciones, la misma que usa [ROI de recetas](/help/tools_roi_overview#layouts):

- RIG: 35 RIG, 11 HB1, 1 STO
- EXT: 14 EXT, 8 HB1, 1 HBB, 1 STO
- COL: 22 COL, 11 HB1, 1 STO

Junto con el módulo central, cada una cabe en una base de 500 de área.

## Precios {#prices}

**Preferencia de CX** elige la [[exchange-preference|preferencia de bolsa]] de la que salen los precios. «None - Universe 30D» usa el [[vwap|VWAP]] de 30 días de [[universe|Universe]].

> [!warning]
> Elegir aquí una preferencia de bolsa también la convierte en tu preferencia de bolsa por defecto en todas las páginas.
