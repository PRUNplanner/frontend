El [Informe de mercado](/market) muestra cómo se movieron los precios y el volumen de negocio en las cuatro bolsas de materias primas durante los últimos 90 días. Empieza aquí para tener la visión de conjunto y después profundiza en un material en [Exploración de mercado](/help/tools_market_exploration) o revisa los precios de tu plan. El informe es público, así que no necesitas iniciar sesión.

## Datos y actualizaciones {#data}

Los precios diarios salen de los datos de negociación diarios que [[fio|FIO]] entrega para AI1, CI1, IC1 y NC1. El informe abarca los 90 días UTC completos hasta ayer. Se actualiza a diario (UTC) con la negociación del día anterior, así que la de hoy solo aparece cuando el día ha terminado. La cabecera indica el último día como «Precios diarios hasta» una fecha.

Los libros de órdenes son actuales. La mayor diferencia abierta, las diferencias de «Libros de órdenes ahora» y las cifras de los libros en las tarjetas de las bolsas usan los libros más recientes que tiene PRUNplanner, que se mantienen al día desde FIO como mínimo cada 30 minutos.

El dinero está en ȼ. Cada bolsa tiene su propia [[currency|moneda]] (AIC, CIS, ICA, NCC), y el informe las suma a la par, una a una. Funciona porque el mismo material se negocia a un precio parecido en todas partes.

Si una parte de la página muestra «No se han podido cargar los datos del mercado.» con un botón **Reintentar**, púlsalo para volver a cargar esa parte.

## En resumen {#in-short}

Arriba hay cuatro recuadros:

| Recuadro                           | Qué muestra                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Índice CX**                      | el último [índice de precios](#price-index) combinado, su variación desde el primero de los 90 días y una minigráfica de 90 días     |
| **El que más se movió**            | el sector cuyo índice más subió desde el primero de los 90 días (si todos los sectores bajaron, el que menos bajó), con su variación |
| **Alimentar a 100 pioneros**       | lo que consumen 100 pioneros al día al último VWAP 7D de todas las bolsas, y cómo ha cambiado en las dos últimas semanas             |
| **Mayor diferencia abierta ahora** | la mayor [diferencia de precio](#price-gaps) en los libros de órdenes ahora: comprar en una bolsa y vender en otra                   |

La cesta de los pioneros incluye todas sus necesidades, [[luxuries|lujos]] incluidos. Si ningún material tiene una diferencia abierta del 15 % o más, el último recuadro te lo indica.

## Cifras clave {#kpis}

| Cifra                                       | Qué muestra                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Negociado, últimos 7 días**               | el volumen de negocio de las cuatro bolsas en los últimos 7 días, y su variación frente a los 7 días anteriores |
| **Materiales negociados, 7 días**           | cuántos materiales se negociaron en los últimos 7 días, de los negociados en 30 días                            |
| **Índice CX**                               | el índice de precios combinado, y su variación desde el primero de los 90 días                                  |
| **Volumen de negocio en materiales planos** | la parte del volumen de negocio de 30 días en materiales [planos](#flat), y cuántos hay                         |

El volumen de negocio es unidades negociadas × precio, así que es una cifra en ȼ. Por ejemplo, 200 unidades vendidas a 50 ȼ cada una suman 10.000 ȼ de volumen de negocio.

## Índice de precios {#price-index}

**Índice de precios** sigue cómo se ha movido el precio de lo que negocian los jugadores. Es una línea que empieza en 100 el primero de los 90 días, y el valor de cada día usa el [[vwap|VWAP]] 7D de ese día. El VWAP 7D es el volumen de negocio de los últimos 7 días ÷ las unidades negociadas en ellos, así que un día con pocas operaciones apenas lo mueve.

En **Vista del índice** eliges las líneas:

- **Por bolsa** (por defecto): una línea por bolsa, cada una en su propia moneda.
- **Combinado**: una línea para las cuatro bolsas.
- **Por sector**: una línea por sector, con todas las bolsas juntas. Hay ocho sectores, de Consumibles a Drones y otros.

Todo material con un VWAP 7D en cada uno de los 90 días dentro de ese ámbito forma parte del índice. El peso de un miembro es su parte del volumen de negocio de 30 días, con un tope del 5 % (20 % dentro de un sector). Lo que el tope le recorta a un material se reparte entre los demás, así que ningún material muy negociado arrastra él solo el índice.

Cada día, PRUNplanner compara el VWAP 7D de cada miembro con su valor del primer día y lo suma según su peso. Dos ejemplos inventados:

- Si el VWAP 7D de todos los miembros está un 10 % por encima de su valor del primer día, el índice marca 100 × 1,10 = 110, sean cuales sean los pesos.
- Si solo un miembro con un peso del 5 % duplica su precio, el índice marca 100 + 100 × 0,05 × (2 − 1) = 105.

La nota bajo el gráfico indica la fecha base y los miembros. En **Combinado** también da la parte del volumen de negocio de 30 días que suman los miembros.

## Lo que cuesta mantener la mano de obra {#workforce}

Esta sección valora los consumibles que necesitan 100 trabajadores de un nivel durante un día, todas las necesidades incluidos ambos lujos, al VWAP 7D de cada día. Toda base paga esto, produzca lo que produzca.

- Hay una tarjeta por cada nivel de [[workforce|mano de obra]], de pionero a científico. Muestra el coste por 100 trabajadores al día en todas las bolsas, y su variación en 90 días.
- Elige un nivel para ver su gráfico, con una línea por bolsa a lo largo de 90 días.
- «Más barata hoy» indica la bolsa donde la cesta de ese nivel cuesta menos a los últimos precios.
- **Más movimiento** indica los dos materiales que más cambiaron el coste del nivel, en ȼ, durante los 90 días.

Si un material de la cesta no tiene precio un día, el gráfico no tiene valor para ese día.

## Dónde se mueve el dinero {#treemap}

**Dónde se mueve el dinero** es un mapa de árbol. Cada recuadro es un material, con un tamaño según su volumen de negocio de 30 días en las cuatro bolsas y agrupado por sector. El color compara el VWAP 7D con el VWAP 30D: verde cuando sube, rojo cuando baja, más intenso a partir de ±12 %. Con la paleta **Para daltonismo (azul / naranja)** de tu Perfil, la subida es azul y la bajada naranja. Los materiales [planos](#flat) aparecen rayados y marcados como **plano** («Mantenido a un solo precio, probablemente por un creador de mercado»).

Pasa el puntero por un recuadro para ver **Volumen de negocio, 30 días**, **VWAP 7D**, **VWAP 30D** y **7D frente a 30D**. Cuando no hay variación que mostrar, indica **muy pocas operaciones**. Eso pasa cuando el material se negoció en los últimos 30 días pero no en los últimos 7, así que no hay VWAP 7D que comparar.

## Mayores variaciones de la semana {#movers}

**Mayores variaciones de la semana** lista los materiales cuyo VWAP 7D está más por encima (**Al alza**) o por debajo (**A la baja**) de su VWAP 30D, en todas las bolsas. Por ejemplo, un VWAP 7D de 110 ȼ frente a un VWAP 30D de 100 ȼ es (110 ÷ 100 − 1) × 100 = +10 %.

Solo cuentan los materiales con al menos 5.000.000 ȼ y 50 unidades negociadas en los últimos 7 días, y se excluyen los materiales planos. Primero aparecen los 8 primeros, cada uno con una minigráfica de 15 días de su VWAP 7D. «Mostrar todo» abre la lista completa en páginas de 25, y puedes **Ordenar por** **Variación vs 30 días**, **Material**, **VWAP 7D** o **Negociado, 7 días**.

Los 30 días incluyen los últimos 7, así que una variación parece menor de lo que sería comparando semana con semana. Cuando ningún material cumple los requisitos en un sentido, la lista indica «Ningún material se movió en este sentido con volumen suficiente.»

## De qué vive la economía {#leaders}

**De qué vive la economía** lista los 10 materiales con más volumen de negocio de 30 días, con su parte de él. Cada barra reparte por bolsa el volumen de negocio de los últimos 7 días de ese material. «Mostrar todo» lista todos los materiales negociados en 30 días.

## Diferencias de precio entre bolsas {#price-gaps}

**Diferencias de precio entre bolsas** lista materiales que se negocian bastante más baratos en una bolsa que en otra. Tú eliges la **Base de la diferencia**:

- **Últimos 7 días** (por defecto) compara el VWAP 7D de cada bolsa. Puede que una diferencia de aquí ya haya desaparecido. **Libros ahora** te dice si aún podrías comprar en una bolsa y vender en la otra («Abierta» con la diferencia, o **Cerrada**).
- **Libros de órdenes ahora** compara el mejor Ask de la bolsa más barata con el mejor Bid de la más cara, ahora mismo.

Un material solo cuenta cuando ambas bolsas negociaron al menos 20 unidades y 5.000.000 ȼ en los últimos 7 días, la diferencia es de al menos el 15 % y no es [plano](#flat).

La diferencia es el precio más caro ÷ el más barato − 1, en %. Por ejemplo, un mejor Ask de 100 ȼ en una bolsa y un mejor Bid de 120 ȼ en otra dan una diferencia de (120 ÷ 100 − 1) × 100 = 20 %. Cuando ningún material cumple los requisitos, la sección indica «Ningún material tiene una diferencia de 15 % o más con volumen suficiente.»

Primero aparecen los 10 primeros, de mayor a menor diferencia. Solo cuenta el mejor precio, no cuánto hay en oferta, y la diferencia no tiene en cuenta el envío, el combustible ni el tiempo de vuelo.

> [!tip]
> Una diferencia en los libros solo es una oportunidad si hay suficiente en oferta y puedes mover la mercancía a tiempo. Revisa los libros de órdenes del material en [Exploración de mercado](/help/tools_market_exploration) antes de actuar.

## Las cuatro bolsas {#exchanges}

**Las cuatro bolsas** tiene una tarjeta por bolsa: Antares Station (AI1, AIC), Benten Station (CI1, CIS), Hortus Station (IC1, ICA) y Moria Station (NC1, NCC). Cada tarjeta muestra:

| Cifra                                   | Qué muestra                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Volumen de negocio, 30 días**         | el volumen de negocio de la bolsa, y su parte del total de las cuatro                      |
| barras                                  | el volumen de negocio diario a lo largo de 90 días                                         |
| **Volumen de negocio, 7 días**          | el volumen de negocio de los últimos 7 días                                                |
| **Materiales negociados, 7 días**       | materiales con volumen de negocio en esta bolsa en los últimos 7 días                      |
| **Diferencial mediano entre Bid y Ask** | la mediana de (Ask − Bid) ÷ el punto medio entre Bid y Ask, en los libros que tienen ambos |
| **Libros sin comprador**                | libros de órdenes sin Bid ahora                                                            |
| **Libros sin vendedor**                 | libros de órdenes sin Ask ahora                                                            |

Aquí el diferencial se mide frente al punto medio. Mercado en vivo y la ficha del material lo miden frente al Ask, así que el mismo libro muestra aquí un número algo mayor. Por ejemplo, un libro con un Bid de 90 ȼ y un Ask de 110 ȼ tiene aquí un diferencial de 20 ÷ 100 = 20 % y en Mercado en vivo de 20 ÷ 110 ≈ 18,2 %.

## Materiales planos {#flat}

Un material es _plano_ cuando, en los últimos 30 días, se negoció al menos 10 días y su VWAP diario se mantuvo dentro de ±0,3 % de su mediana de 30 días en al menos el 80 % de esos días. Por ejemplo, con una mediana de 30 días de 100 ȼ, un día se queda dentro de la franja entre 99,70 ȼ y 100,30 ȼ, y un material que se negoció 20 días necesita al menos 16 de esos días. Eso suele significar que [[market-maker|creadores de mercado]] lo compran o venden a precios fijos. Los materiales planos cuentan en el volumen de negocio, pero se excluyen de las variaciones y de las diferencias de precio.

## Cómo se calculan estas cifras {#how-made}

El apartado desplegable **Cómo se calculan estas cifras**, al final de la página, explica de forma breve la fuente, el volumen de negocio, los precios, el índice, las variaciones, las diferencias, los materiales planos y lo que queda fuera.

Un día con mucho volumen se nota durante una semana. Una sola operación grande a un precio inusual tira del VWAP 7D mientras esté dentro de la ventana de 7 días, y después el precio vuelve a su sitio.

## Lo que los datos de CX no ven {#not-included}

El informe abarca las bolsas, no toda la economía:

- Los mercados locales de planetas y estaciones, los contratos y las operaciones dentro de las corporaciones nunca pasan por las bolsas, así que no aparecen. Los jugadores dicen que algunos bienes de uso diario se mueven sobre todo en mercados locales.
- Las operaciones con creadores de mercado cuentan como cualquier otra.
- Las órdenes que no se ejecutan no cuentan, y los datos no dicen qué lado inició una operación.
- Las cifras de los libros de órdenes usan solo el mejor precio, no la profundidad que hay detrás.

[Lo que no ve el volumen de CX](/help/plan_check#cx-volume) explica qué significa esto para los precios de tu plan.
