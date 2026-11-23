Producción es donde añades edificios, defines cuántos construyes, pones [[recipe|recetas]] en cola y comparas recetas antes de cambiar una. Enumera los edificios del plan y las órdenes que tiene cada uno. Las cifras de edificios y órdenes usan los mismos precios y la misma eficiencia que los [resultados](/help/plan_results).

## Añadir edificios {#adding-buildings}

El selector de edificios sobre la lista ofrece todos los edificios de producción que aún no están en el plan. Al elegir uno se añade con una cantidad de 1 y sin receta. No fabrica nada hasta que le das una con **+ Receta** (consulta [Órdenes](#orders)).

Un plan vacío muestra «Aún no hay edificios.» y te señala el selector de edificios. Con **Sugerencias de plan** activado y datos del planeta disponibles, ofrece empezar en su lugar con una configuración típica.

**Igualar COGC** limita el selector a los edificios cuya [[expertise|especialización]] coincide con el programa [[cogc|COGC]] del plan. Con el programa en **Ninguno** o en un programa de mano de obra (de Pioneros a Científicos), ningún edificio coincide y la lista queda vacía. Desmárcalo para volver a ver todos los edificios.

Con **Sugerencias de plan** activado (en [Perfil](/profile)) y suficientes planes en el planeta, el selector empieza con un grupo «Popular en …», con los edificios más planificados primero, seguido de **Todos los edificios**.

Para la extracción, haz clic en un recurso en **Planeta**. Eso añade el extractor adecuado con la receta de ese recurso (consulta [Configuración de la base](/help/plan_base#resources)). Un plan vacío también puede empezar con la configuración típica del planeta, como se describe en [Diseño](/help/plan_layout).

La línea sobre los edificios los cuenta («… edificios · … unidades · … recetas»). **Contraer todo** y **Expandir todo** pliegan o abren todos los edificios.

## La fila del edificio {#building-row}

Cada edificio tiene una fila con las columnas **Edificio**, **Cantidad**, **Efic.**, **ȼ / día** y **Área**.

| Columna      | Qué muestra                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edificio** | El nombre. Haz clic en él para plegar o abrir sus órdenes. Una fila plegada muestra los recuadros de lo que fabrica. Los pliegues solo duran esta visita. |
| **Cantidad** | Cuántos construyes. Con 0 la fila se queda, con el borde izquierdo en rojo, y el edificio no fabrica, no usa ni cuesta nada.                              |
| **Efic.**    | La [[efficiency\|eficiencia]] del edificio. Pasa el ratón por encima para ver cada factor.                                                                |
| **ȼ / día**  | Lo que ganan por día todos los edificios de esta fila (ver abajo).                                                                                        |
| **Área**     | El área del edificio × la cantidad.                                                                                                                       |

Bajo el nombre, la especialización del edificio sale en verde con ✓ cuando el programa COGC del plan la potencia, y en rojo con ✗ cuando no. Después vienen los demás factores que cambian la eficiencia: el número de expertos («3 expertos»), Facción, HQ (Sede corp.), Fertilidad y COGC para un programa de mano de obra. Al 0 % la razón va primero en rojo: «Planeta no fértil», «Sin mano de obra alojada» o el factor que es 0. [Configuración de la base](/help/plan_base#efficiency) explica cómo funciona cada factor.

El **ȼ / día** de un edificio es:

- sus propios insumos y salidas por día, compensados dentro del edificio, con las salidas al precio de venta y los insumos al precio de compra,
- menos los consumibles de su mano de obra al precio de compra,
- menos 1/180 de su coste de construcción (degradación),
- menos sus [[production-fees|tasas de producción]],
- todo ello multiplicado por la cantidad.

Por ejemplo (números inventados), toma una fila de 2 edificios. Las salidas de cada uno se venden por 3.000 ȼ al día, sus insumos cuestan 1.000 ȼ, los consumibles de sus trabajadores 400 ȼ, su degradación 100 ȼ y sus tasas 50 ȼ. El ȼ / día de la fila es (3.000 − 1.000 − 400 − 100 − 50) × 2 = 2.900 ȼ.

Los costes de mano de obra siguen los hábitats y los lujos del plan, así que los trabajadores sin cama y los lujos que has desactivado no cuestan nada. Un edificio siempre paga los consumibles de sus propios trabajadores, aunque el plan los fabrique él mismo.

El **Beneficio / día** del plan parte en cambio de la E/S de materiales de toda la base, donde lo que fabrica un edificio y usa otro se compensa. Así que en una base que fabrica sus propios consumibles o insumos, los ȼ / día de los edificios no suman el **Beneficio / día**.

Donde la parte de producción es estrecha, la eficiencia y el área pasan debajo de ȼ / día como «ȼ/día · … · área …».

El icono de la papelera elimina el edificio al instante, sin preguntar. Puedes deshacerlo con Ctrl+Z (Cmd+Z en un Mac) o con **Deshacer** en el mensaje «Edificio eliminado».

## Órdenes {#orders}

Un edificio ejecuta sus órdenes una tras otra y luego vuelve a empezar. Cada fila de orden muestra:

- la cantidad, que es cuántos ciclos de la receta tiene la orden en cada vuelta;
- la receta, como sus insumos y salidas (haz clic en ella para [cambiarla](#changing-a-recipe));
- su tiempo de ejecución: el tiempo de la receta × la cantidad ÷ la eficiencia del edificio;
- su parte del tiempo del edificio: su tiempo de ejecución ÷ el tiempo de ejecución de todas las órdenes;
- su parte del **ȼ / día** del edificio;
- **COGM** (consulta [COGM](#cogm));
- eliminar, que no pide confirmación («Receta eliminada», con Deshacer).

Por ejemplo (números inventados), con un 100 % de eficiencia una orden de 2 ciclos de una receta de 4 horas tarda 8 h, y una orden de 3 ciclos de una receta de 8 horas tarda 24 h. Juntas son 32 h, así que la primera orden recibe 8 ÷ 32 = 25 % del tiempo del edificio y la segunda el 75 %. Con un 125 % de eficiencia los tiempos bajan a 6,4 h y 19,2 h, y las partes siguen igual.

El ȼ / día de una orden es el ȼ por edificio y día de la receta (como en el [selector de recetas](#changing-a-recipe)) × su parte del tiempo × la cantidad. Así las órdenes se reparten la cifra del edificio según su tiempo.

Cuando las órdenes no usan las salidas de las otras, su suma es igual a la cifra del edificio. Cuando sí las usan, el edificio compensa esos materiales y las órdenes no, así que las sumas difieren. Una orden que nunca se ejecuta (0 % del tiempo) muestra «—». Con un 0 % de eficiencia todas las órdenes muestran «—», mientras que el edificio sigue mostrando sus costes fijos (degradación y la mano de obra alojada) como pérdida.

**+ Receta** añade una orden nueva, y un edificio puede pedir la misma receta dos veces. Un edificio sin órdenes muestra **Sin recetas activas**. Hasta que añadas una, no fabrica nada pero sigue pagando su degradación y los consumibles de sus trabajadores alojados, así que su ȼ / día muestra una pérdida. Con **Sugerencias de plan** activado y datos del planeta, también muestra **Más planificado aquí:** con la combinación de recetas más planificada del planeta, su parte de los planes y **Añadir**.

> [!tip]
> Usa las cantidades para equilibrar una cadena dentro de un mismo edificio: la columna de la parte muestra cómo se reparte el tiempo del edificio. Duplicar la cantidad de una orden duplica su tiempo de ejecución, así que recibe una parte mayor y las demás órdenes una menor.

## Cambiar una receta {#changing-a-recipe}

Haz clic en la receta de una orden para abrir el selector debajo (**Cambiar receta**, «sustituye …»), o en **+ Receta** para añadir una orden nueva. Solo hay un selector abierto a la vez.

Haz clic en una fila o pulsa Intro para elegirla. ↑ y ↓ recorren la lista, y Esc o un clic fuera la cierran. En el móvil, el selector se abre como una hoja desde abajo y muestra **Produce** (con el tiempo de ejecución debajo), **A partir de** y **ȼ / día**.

Tras un cambio, una línea bajo la fila dice qué ha cambiado («Se sustituyó … por ….» o «Se añadió … como orden nueva.»), con **Deshacer**.

Las cifras en ȼ del selector son _por edificio y día_: corresponden a un edificio que ejecuta solo esta receta con su eficiencia actual. El pie dice **ȼ por edificio y día**.

| Columna                 | Qué muestra                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Produce**             | Las salidas de un ciclo.                                                                                                                                                                                                                                                                                                                            |
| **A partir de**         | Los insumos de un ciclo, con una línea debajo (ver abajo).                                                                                                                                                                                                                                                                                          |
| **Tiempo de ejecución** | Un ciclo con la eficiencia del edificio.                                                                                                                                                                                                                                                                                                            |
| **ȼ / día**             | Salidas al precio de venta menos insumos al precio de compra, × ciclos por día, menos 1/180 del coste de construcción, los consumibles de la mano de obra y la tasa de producción (la tasa del planeta × eficiencia). Mientras cambias una receta, «… vs ahora» la compara con la que sustituyes.                                                   |
| **ȼ / área**            | ȼ / día ÷ el área por edificio de una distribución estándar para este edificio, como en [ROI de recetas](/help/tools_roi_overview). Esa área es su propia área más su parte de hábitats, almacenamiento y las 25 del módulo central. Un edificio sin distribución estándar cuenta su propia área + 25. Así puedes comparar recetas entre edificios. |
| **Amortización**        | El coste de construcción del edificio ÷ su ȼ / día, sin hábitats. «nunca» cuando no da beneficio.                                                                                                                                                                                                                                                   |
| **Planes**              | La parte de los planes de este planeta con este edificio que ejecutan la receta. «< 5 %» cuando está por debajo del 5 % o la usan menos de 10 jugadores.                                                                                                                                                                                            |

La columna **Planes** y el selector **Ordenar por** solo aparecen con **Sugerencias de plan** activado y un planeta con suficientes planes. Eso significa al menos 15 planes de al menos 10 jugadores, contando los jugadores activos en los últimos 90 días y los planes modificados en los últimos 180.

**Ordenar por** ordena las filas por **ȼ / día** (por defecto) o **Populares** (las más planificadas primero). Cuando cambias una receta, la actual va primero, marcada y sin poder elegirse. Cuando añades una, las recetas que el edificio ya ejecuta van al final.

La línea bajo los insumos reúne:

- «usa … del plan»: los insumos que el plan ya fabrica;
- «abastece a …»: edificios del plan cuyas órdenes usan una salida de esta receta;
- **receta actual** o **en el plan**.

### Nota de dependencia {#dependency-note}

Cuando el plan usa una salida de la receta que sustituyes, aparece un aviso sobre la lista: «Tus … convierten este … en …. Sustituirlo significa comprar … al día. Para conservar ambos, usa “+ Receta”.» Si lo que lo usa es tu mano de obra, la nota lo dice en su lugar.

La cantidad es cuánto de ese material usa el plan por día en total, tomado de la E/S de materiales. Es la cantidad entera, aunque otras órdenes también fabriquen una parte.

> [!tip]
> ¿Quieres probar una receta sin perder la anterior? Usa **+ Receta** para añadirla como segunda orden y compara el ȼ / día del edificio; luego elimina la que no quieras.

## COGM {#cogm}

**COGM** en una orden abre su [[cogm|coste de bienes fabricados]]. Muestra lo que cuesta un ciclo, y por tanto lo que cuesta cada unidad producida, con la eficiencia y los precios de este plan.

- **Parámetros**: el tiempo de ejecución de la receta con esta eficiencia, su parte de un día (**% / día**), **Eficiencia**, **Degradación** (el coste de construcción del edificio ÷ 180 por día) y **Tasa de producción / ciclo** (la tasa ponderada × el tiempo base de la receta, independiente de la eficiencia).
- **Coste** de un ciclo: cada insumo al precio de compra (**Total de insumos**), la parte de **Mano de obra** (el coste diario de mano de obra del edificio × la parte del día del ciclo), la parte de degradación y la tasa de producción. Juntos forman el **Coste total**.
- Por salida: **Coste total** pone todo el coste en esa salida (coste ÷ su cantidad), mientras que **Reparto del coste** lo reparte entre todas las salidas según la cantidad (coste ÷ las cantidades de todas las salidas).

Las partes siguen el tiempo del ciclo. Por ejemplo, un ciclo de 6 horas con un 100 % de eficiencia es el 25 % de un día, así que carga con el 25 % del coste diario de mano de obra y de la degradación del edificio. Y si un ciclo cuesta 600 ȼ en total y fabrica 2 de una salida y 1 de otra, el **Coste total** es 600 ÷ 2 = 300 ȼ para la primera y 600 ÷ 1 = 600 ȼ para la segunda, mientras que el **Reparto del coste** es 600 ÷ 3 = 200 ȼ para cada una. En una receta con una sola salida, las dos columnas muestran la misma cifra.

Los precios salen de la [[exchange-preference|preferencia de bolsa]] del imperio. Si tiene una, **Usar como precio de compra en todos los planetas** convierte el COGM en un precio de compra fijo para todos los planes que usan esa preferencia (consulta [Bolsas](/help/exchanges#fixed-prices-and-cogm)).
