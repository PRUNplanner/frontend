Usa ROI de recetas para preseleccionar edificios y recetas antes de planificar una base. Ordena todas las [[recipe|recetas]] de producción según lo que ganaría una base llena de su edificio. Después comprueba las ganadoras en un planeta real en un [plan](/help/plan_layout).

La página se creó con aportaciones de Lowstrife, MemoryAlpha y Laaxus, de las comunidades de Discord de PCT y de Prosperous Universe.

## Qué calcula la página {#what-it-calculates}

Para cada edificio de producción, PRUNplanner monta un plan con una distribución fija de ese edificio (consulta [Distribuciones](#layouts)). Calcula ese plan una vez por receta, con el edificio haciendo solo esa receta. Cada fila es un edificio y una receta, y PRUNplanner la calcula con el mismo motor que tus propios planes.

Todos los planes usan la misma configuración:

| Ajuste                                                                                                                             | Valor                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planeta                                                                                                                            | Montem (OT-580b), con sus [[production-fees\|tasas de producción]] y su [[fertility\|fertilidad]] |
| Programa de [[cogc\|COGC]] | la propia [[expertise\|especialización]] del edificio, +25 %                                                                                                                                                                 |
| [[experts\|Expertos]]      | 5 en cada especialización, así que +28,4 % para la del edificio                                                                                                                                                                                                                                                                      |
| Mano de obra                                                                                                                       | totalmente alojada en los [[habs\|hábitats]] de la distribución                                                                                                                                                              |
| Precios                                                                                                                            | tu preferencia de bolsa (consulta abajo)                                                                                                                                                                                                                                                                          |

Como todas las filas comparten este planeta, estos expertos y estos precios, solo se diferencian en el edificio, su distribución y su programa, y en la receta. Eso es lo que las hace comparables entre sí.

Las tasas de producción de Montem forman parte de todos los beneficios de esta página, así que una receta puede ganar más en un planeta cuyo gobernador cobre menos. La fertilidad solo importa para ORC, que PRUNplanner calcula con la fertilidad de Montem.

La página deja fuera los edificios de extracción RIG, EXT y COL y la granja FRM, porque su producción depende del planeta. Para RIG, EXT y COL, usa [ROI de recursos](/help/tools_resource_roi_overview). FRM no tiene una página como esta.

La página calcula sola al abrirla, y una barra de progreso **Calculando el ROI de recetas de edificios** va recorriendo los edificios.

## Distribuciones {#layouts}

Cada edificio tiene una distribución guardada: un número de edificios de producción más los hábitats y el almacenamiento que necesitan. PRUNplanner guarda estas distribuciones en una tabla fija y no las recalcula según tus precios. Junto con las 25 de área del [[core-module|módulo central]], cada distribución usa de 450 a 500 de área, así que cabe en una base de 500 de área.

La columna **Configuración óptima** muestra la distribución, por ejemplo `11x TNP, 9x HB3, 1x STO`. Primero va el edificio de producción y después los hábitats y el almacenamiento.

## Preferencia de bolsa {#exchange-preference}

**Preferencia de CX**, en la cabecera, elige la [[exchange-preference|preferencia de bolsa]] de la que salen los precios. PRUNplanner compra los insumos y los consumibles de la mano de obra al precio de compra y vende las salidas al precio de venta (consulta [Compra, venta o ambos](/help/exchanges#buy-sell-or-both)).

> [!warning]
> Elegir aquí una preferencia de bolsa también la convierte en tu preferencia de bolsa por defecto en todas las páginas, igual que si la fijaras en tu perfil. La página se recalcula al momento.

«None - Universe 30D» significa sin preferencia de bolsa, así que todos los precios son el [[vwap|VWAP]] de 30 días de [[universe|Universe]].

## Columnas {#columns}

La tabla muestra 50 filas por página. Haz clic en la cabecera de una columna numérica para ordenar por ella.

| Columna                                     | Qué muestra                                                                                                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edificio**                                | el edificio de producción                                                                                                                                                                                |
| **Configuración óptima**                    | la distribución guardada (consulta [Distribuciones](#layouts))                                                                                                                        |
| **Salida de Receta**                        | las salidas de la receta, como recuadros de material                                                                                                                                                     |
| **Entrada de Receta**                       | los insumos de la receta, como recuadros de material                                                                                                                                                     |
| **COGC**                                    | el programa con el que funciona el plan, que es la especialización del edificio                                                                                                                          |
| **COGM**                                    | abre el desglose **Coste de bienes fabricados** de la receta ([[cogm\|COGM]]) |
| **Coste del Plan (ȼ)**   | lo que cuesta construir toda la distribución                                                                                                                                                             |
| **Beneficio diario (ȼ)** | lo que gana toda la distribución al día                                                                                                                                                                  |
| **Beneficio/Área (ȼ)**   | beneficio diario por unidad de área usada                                                                                                                                                                |
| **ROI del plan (d)**     | días hasta que el beneficio ha pagado la construcción                                                                                                                                                    |

La cantidad diaria de un recuadro de material es la cantidad de la receta × edificios × ejecuciones al día × 1,25 (la bonificación del COGC). No incluye los expertos ni la eficiencia de la mano de obra, así que es menor que el flujo que hay detrás del beneficio de al lado. Por ejemplo, una receta que fabrica 4 unidades en 12 horas se ejecuta 2 veces al día, así que una distribución de 10 edificios muestra 4 × 10 × 2 × 1,25 = 100 al día.

## Cómo se calculan las cifras {#calculation}

- **Beneficio diario (ȼ)** = valor de las salidas al precio de venta − insumos y consumibles de la mano de obra al precio de compra − [[degradation|degradación]] − tasas de producción. La degradación es el coste de construcción de los edificios de producción ÷ 180 al día.
- **Coste del Plan (ȼ)** = materiales de construcción de toda la distribución al precio de compra: edificios de producción, hábitats, almacenamiento y módulo central.
- **Beneficio/Área (ȼ)** = Beneficio diario ÷ área usada, módulo central incluido.
- **ROI del plan (d)** = Coste del plan ÷ Beneficio diario. Está en verde cuando el plan se amortiza. Cuando no se amortiza nunca (sin beneficio), la columna muestra **nunca** en rojo.

Un ejemplo inventado: una distribución con edificios de producción que valen 900.000 ȼ pierde 900.000 ÷ 180 = 5.000 ȼ al día por degradación. Si construir toda la distribución cuesta 1.500.000 ȼ, usa 500 de área y da un Beneficio diario de 30.000 ȼ, su Beneficio/Área es 30.000 ÷ 500 = 60 ȼ y su ROI del plan es 1.500.000 ÷ 30.000 = 50 días.

Tus planes usan las mismas fórmulas. Para ver el [[profit|beneficio]] y el [[roi|ROI]] desde la base, consulta [Resultados](/help/plan_results).

## Filtros {#filters}

Encima de la tabla:

- **Edificio**, **COGC**, **Salida** y **Entrada** admiten uno o varios valores, y puedes buscar en ellos. **Salida** y **Entrada** dejan las recetas que fabrican o usan cualquiera de los materiales elegidos.
- **ROI positivo** oculta las recetas que pierden dinero.

> [!tip]
> Para encontrar qué fabricar con un material que ya produces, elígelo en **Entrada**. Para ver quién fabrica un material que necesitas, elígelo en **Salida**.
