La Revisión del plan pone a prueba un plan frente al mercado antes de que lo construyas. Te dice si de verdad puedes comprar y vender esas cantidades, de qué precios depende el beneficio y cómo se compara el plan con tus otros planes. La encontrarás como pestaña de herramientas de Producción (consulta [Diseño](/help/plan_layout#parts)), con tres vistas que cambias junto a su título: **Revisión de mercado** (la predeterminada), **Sensibilidad de precios** y **Comparar planes**. **Comparar planes** solo aparece cuando has iniciado sesión.

La vista y el cambio de precio que eliges se mantienen en esta pestaña del navegador, aunque cambies de plan o cierres y vuelvas a abrir la herramienta. Hacer clic en una marca de la [[material-io|E/S de materiales]] abre una ventana emergente, y su **Abrir Revisión del plan →** abre la Revisión del plan en la Revisión de mercado.

## Revisión de mercado {#market-check}

El [[profit|beneficio]] de un plan supone que puedes comprar y vender cada material a su precio, en cualquier cantidad. La Revisión de mercado muestra dónde no es así. Lista todos los materiales que el plan compra o vende al día, del peor al mejor: rojo, luego ámbar, luego notas grises, y dentro de cada uno por su parte.

Un plan que todavía no compra ni vende nada muestra «Este plan aún no compra ni vende nada.» en lugar de la tabla. Añade antes edificios y recetas en [Producción](/help/plan_production), y la revisión se rellena.

| Columna                               | Qué muestra                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Material**, **Lado**                | El material y si el plan lo compra o lo vende.                                                                                                         |
| **Por día**                           | Cuánto compra o vende el plan al día.                                                                                                                  |
| **Parte del volumen diario, 30 días** | La cantidad diaria del plan ÷ el volumen diario medio negociado en la bolsa en los últimos 30 días. Unas marcas en la barra indican el 10 % y el 50 %. |
| **Negociado 30d**                     | Unidades negociadas en la bolsa en los últimos 30 días.                                                                                                |
| **Bid · Ask ȼ**, **Diferencial**      | El mejor [[bid]] y el mejor [[ask]] ahora mismo, y el [[spread\|diferencial]] entre ellos como % del ask.                                              |
| **Revisión**                          | La primera marca del material, u **ok**.                                                                                                               |

- Para la [[share-of-volume|parte del volumen diario]], vender 50 unidades al día en un mercado que negocia 100 al día es una parte del 50 %.
- Si compras al instante, pagas el ask. Si vendes al instante, te llevas el bid.
- PRUNplanner revisa cada material en la bolsa que usa tu [[exchange-preference|preferencia de bolsa]] para comprarlo o venderlo, y el pie nombra esas bolsas (por ejemplo «Bolsas AI1, NC1»). Sin preferencia de bolsa, la revisión usa el volumen de todas las bolsas juntas. El pie dice entonces «sin preferencia de CX definida» y, en tu propio plan, enlaza a donde puedes definir una.
- Con una preferencia de bolsa, una fila marcada nombra la regla de precio que usa. En tu propio plan, es un enlace a la regla en Bolsas (consulta [Bolsas](/help/exchanges#how-a-price-is-found)).
- **Qué significa** resume el peor material en una frase. También cuenta los materiales que **No se puede comerciar como se planeó**, los que tienen **Gran parte del mercado** y los que están **Bien**. Su botón abre esta página. Cuando no hay nada rojo ni ámbar, dice «Todos los materiales encajan con su mercado.» Un material que solo tiene una nota gris cuenta aquí como **Bien**, porque las notas grises tratan de los datos que usó la revisión, no de tus cantidades.
- En un teléfono, la tabla se convierte en tarjetas: las 6 primeras y todas las marcadas, y luego «+ n materiales más, todo correcto».

### A precios reales {#real-prices}

**A precios reales** recalcula el plan como si compraras lo que compra al ask y vendieras lo que vende al bid, cada uno en su bolsa. Muestra **Beneficio del plan**, **Comprando al Ask, vendiendo al Bid**, la **Diferencia** y el **ROI al Ask / Bid**.

Necesita una preferencia de bolsa. Sin ella, no se calcula y dice «Define una preferencia de CX para ver el plan a precios reales de Ask y Bid.»

Un material mantiene su precio del plan en tres casos: ahora mismo nadie lo ofrece ni hace un bid por él, no tiene ninguna bolsa asignada o se valora a la media de [[universe|Universe]], que no tiene ask ni bid. La sección lista esos materiales. Un material con un [[fixed-price|precio fijo]] en tu preferencia de bolsa sí recibe aquí el ask o el bid.

Aquí tienes un ejemplo con cifras inventadas. Supón que el plan vende 100 unidades al día a un precio del plan de 50 ȼ, y que el mejor bid ahora mismo es de 45 ȼ. Vender al bid aporta 100 × 5 = 500 ȼ menos al día. Si ese es el único precio que cambia, la **Diferencia** es de −500 ȼ al día.

> [!tip]
> Los precios del plan suelen venir de medias como el [[vwap|VWAP]]. A precios reales muestra tu beneficio si operas al instante en lugar de esperar a que se llenen tus órdenes. Una diferencia grande significa que el beneficio del plan depende de operar con paciencia.

## Qué significan las marcas {#flags}

Los umbrales de las marcas son fijos:

| Marca                                      | Nivel     | Cuándo                                                                                                |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| _Sin precio_                               | rojo      | El plan no tiene precio para el material y lo cuenta a 0 ȼ.                                           |
| _Sin operaciones en 7 días_                | rojo      | Nadie lo ha negociado en la bolsa en los últimos 7 días, o la bolsa no tiene datos de él.             |
| _Sin ofertas_                              | rojo      | Lo compras, y ahora mismo nadie lo vende en la bolsa.                                                 |
| _Sin compradores_                          | rojo      | Lo vendes, y ahora mismo nadie hace un bid por él en la bolsa.                                        |
| _Mayor que el mercado_                     | rojo      | El plan negocia el 50 % o más del volumen diario.                                                     |
| _Gran parte del mercado_                   | ámbar     | El plan negocia el 10 % o más del volumen diario. Es probable que tus órdenes muevan el precio.       |
| _Todas las bolsas, ninguna bolsa definida_ | nota gris | Sin preferencia de bolsa, así que se cuentan todas las bolsas. Se muestra una vez encima de la tabla. |
| _Datos de más de 2 días_                   | nota gris | Los últimos datos de la bolsa tienen más de 2 días.                                                   |

El rojo es un círculo relleno (_no se puede comerciar como se planeó_), el ámbar un triángulo y el gris un anillo. _Sin ofertas_ y _Sin compradores_ necesitan una bolsa real, así que nunca aparecen cuando se cuentan todas las bolsas. Los diferenciales aparecen en la tabla, pero nunca reciben una marca.

Los volúmenes, el bid y el ask vienen de los datos de las bolsas que PRUNplanner carga de [[fio|FIO]]. Tienen como mucho unos 35 minutos: PRUNplanner los actualiza más o menos cada 30 minutos, y el servidor puede entregar una copia de hasta 5 minutos.

También puedes vigilar las partes mientras cambias cantidades y recetas. Cambia el valor de la E/S de materiales de ȼ a %, y muestra el Δ de cada material como parte del volumen diario medio de los últimos 7 y 30 días (**Parte 7d**, **Parte 30d**), en ámbar a partir del 10 % y en rojo a partir del 50 %. En **Toda la base**, la E/S de materiales también muestra los iconos de las marcas, y su resumen («2 materiales no pueden comerciarse según lo planificado, …») enlaza a **Revisión del plan →**. La pestaña Revisión del plan lleva un punto mientras el plan tiene marcas de mercado.

> [!tip]
> Una marca roja o ámbar en una salida no significa que el plan sea malo. Significa que vendes más de lo que absorbe el mercado. Menos edificios, una segunda salida u otra bolsa pueden arreglarlo: pruébalos y mira cómo baja la parte.

## Lo que el volumen de la CX no ve {#cx-volume}

El volumen solo viene de las bolsas de comercio ([[cx|CX]]). PRUNplanner no cuenta las ventas en mercados locales, los contratos entre jugadores ni las operaciones dentro de una corporación, así que un material puede ser más fácil de vender de lo que dice su volumen en la CX.

## Imperio {#empire}

La E/S de materiales del [[empire|imperio]] hace la misma revisión sobre el flujo neto del imperio. Lo que un plan produce y otro usa se compensa, y solo el resto llega al mercado. La E/S de materiales de cada plan sigue marcando sus propias cantidades.

Unas etiquetas encima de la tabla cuentan los materiales marcados por nivel, como «3 no pueden comerciarse según lo planificado», «2 con gran parte del mercado» y «1 otra nota». Haz clic en una para ver solo los materiales de ese nivel, y vuelve a hacer clic para verlos todos. Más en [Imperio](/help/empire).

## Sensibilidad de precios {#sensitivity}

La Sensibilidad de precios muestra de qué precios depende el beneficio. Elige **Cambiar cada precio en** ±10 %, ±20 % (el predeterminado), ±30 % o ±50 %.

Cada material que el plan compra o vende recibe una fila, siempre que su precio mueva el beneficio. PRUNplanner recalcula el plan una vez por material con ese precio duplicado, y el cambio de beneficio es el impacto del material. Si un material también es material de construcción, mueve además el coste de [[degradation|degradación]], y eso cuenta en su fila. Las [[production-fees|tasas de producción]] no dependen de los precios. El beneficio cambia en línea recta con cualquier precio individual, así que este único recálculo da el efecto de cualquier % que elijas en **Cambiar cada precio en**.

Hasta que el plan compra o vende algo cuyo precio mueve el beneficio, la vista dice «Añade producción para ver de qué precios depende este plan.»

| Columna                                       | Qué muestra                                                                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**, **Lado**                        | El material, y **comprar** o **venta**.                                                                                                                                                              |
| **El beneficio baja ← · → El beneficio sube** | Una barra con el cambio de beneficio cuando solo este precio se mueve el % elegido y todo lo demás queda igual. Pasa el ratón por encima para ver el valor por día y el beneficio en ambos extremos. |
| **Rango de beneficio ȼ/día**                  | El beneficio con el precio bajado y subido el % elegido.                                                                                                                                             |
| **Punto de equilibrio**                       | El cambio de precio con el que el beneficio del plan llega a 0.                                                                                                                                      |

PRUNplanner ordena las filas por impacto, y la línea central de las barras es el beneficio de hoy. Muestra las 10 primeras y resume el resto en una línea, «+ n materiales más … mueven el beneficio menos de ±…», con un botón **Mostrar todo ({n})** para listarlos.

**Punto de equilibrio** se pone en rojo dentro de ±60 % y en ámbar dentro de ±200 %. Dice **nunca** cuando el precio tendría que bajar de 0. Dice **> +500 %** cuando el precio tendría que subir más de un 500 %. No te preocupes por un **nunca** en un material que vendes mientras el plan da beneficio: significa que el plan sigue siendo rentable aunque ese precio baje a 0.

Así encajan las cifras, con números inventados. Un plan gana 2.000 ȼ al día, y su salida principal, que solo vende y no usa para construir, aporta 8.000 ȼ al día. Duplicar ese precio suma 8.000 ȼ al día. A ±20 %, el **Rango de beneficio ȼ/día** de la salida va de 2.000 − 1.600 = 400 a 2.000 + 1.600 = 3.600. Su **Punto de equilibrio** es −2.000 ÷ 8.000 = −25 %: si ese precio baja una cuarta parte, el plan no gana nada. Se muestra en rojo, porque −25 % está dentro de ±60 %.

### Qué significa {#sensitivity-means}

**Qué significa** elige el material más sensible y te dice:

- el beneficio tras un movimiento del % elegido en la dirección que perjudica, y el cambio de precio del punto de equilibrio (o que el plan sigue siendo rentable incluso con un precio de 0, o que ningún cambio en este precio por sí solo lo lleva al punto de equilibrio);
- «Beneficio si …» y «ROI si …»: el beneficio y el ROI tras ese movimiento;
- **Todos los costes +{pct} %**: el beneficio si todos los costes suben el % elegido, contando los materiales comprados, la degradación y las tasas de producción;
- **Más sensible**: los 3 materiales principales;
- de dónde vienen los precios: la preferencia de bolsa del plan, o la media de 30 días de Universe cuando no tiene ninguna.

> [!tip]
> Un punto de equilibrio cercano al 0 % en tu salida principal significa que una pequeña bajada de precio se come el beneficio. Antes de construir, revisa ese material en [Exploración de mercado](/market-exploration) y fija en tu preferencia de bolsa un precio en el que confíes.

### Precio objetivo {#target-price}

**Precio objetivo** busca el precio de un material que da el beneficio que quieres, con todos los demás precios sin cambiar.

- **Material** lista los materiales de la tabla y empieza con el material vendido de mayor impacto.
- **Beneficio objetivo, ȼ/día** empieza con el beneficio de hoy, redondeado hacia arriba a la siguiente decena de millar.
- La respuesta dice «{ticker} tiene que venderse a» o «{ticker} tiene que comprarse a» un precio. Cuando ningún precio por encima de 0 alcanza el objetivo, dice que no puedes llegar a ese beneficio cambiando este precio.
- **Precio del plan hoy** y el bid y el ask actuales de la bolsa se muestran para comparar.
- En cuanto cambias el material o el objetivo, también ves el precio más bajo y el más alto de la bolsa en los 30 días hasta su último día con operaciones. Usa los mínimos y máximos diarios de los días con operaciones, y para todas las bolsas cubre las cuatro. Una nota te avisa cuando el precio que necesitarías está por encima o por debajo de todo lo pagado en esos 30 días.

## Comparar planes {#compare}

**Comparar planes** pone este plan junto a otro de tus planes. Necesitas haber iniciado sesión.

**Comparar con** lista tus otros planes, primero **Este planeta** y luego **Otros planetas**. Empieza con el primer plan de esa lista y recuerda tu elección para este plan mientras la pestaña está abierta. Si todavía no tienes otro plan, dice «Aún no tienes otro plan con el que comparar.»

PRUNplanner toma este plan tal como está en pantalla, incluidos los cambios sin guardar. Calcula el otro plan tal como está guardado, con su propio imperio, y lo valora con la preferencia de bolsa de ese imperio (o con la media de 30 días de Universe). Una línea junto a **Comparar con** indica cuál.

Las cifras de los dos planes aparecen una al lado de otra, cada una con una barra:

| Cifra                             | Qué es                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| **Beneficio diario**              | Beneficio por día.                                                     |
| **Valor de producción**           | Lo que el plan vende al día.                                           |
| **Coste diario**                  | Lo que el plan compra al día.                                          |
| **Degradación**                   | 1/180 del coste de construcción de los edificios de producción al día. |
| **Tasas de producción**           | Tasas por día.                                                         |
| **Coste del plan**                | El coste de construcción.                                              |
| **ROI**                           | Días hasta pagar el coste de construcción.                             |
| **Amortización de la diferencia** | Consulta [más abajo](#payback-difference).                             |
| **Beneficio / Área**              | Beneficio por área.                                                    |
| **Área usada**                    | El área que usa el plan.                                               |

**Diferencia** es el otro plan menos este. Se muestra en verde o en rojo según lo que sea mejor para ti: más beneficio y más producción, costes más bajos y un ROI más corto cuentan como buenos, y el área es neutral.

**Veredicto** lo resume en una frase. Dice cuánto más o menos gana este plan al día, cuántos días antes o después se amortiza, la mayor ganancia del otro plan y sus dos mayores costes por material, y si su coste de construcción extra se amortiza.

**Qué cambia** lista los ȼ / día por material, el otro plan menos este, de mayor a menor. Si el otro plan llevara un material a una marca de mercado peor, ese material aparece marcado con su parte.

El glosario tiene más sobre [[roi|ROI]] y la [[payback|amortización]].

> [!tip]
> Guarda una copia de tu plan, cambia una sola cosa en la copia (una receta, un número de edificios, el planeta) y compara los dos. El Veredicto y Qué cambia muestran exactamente cuánto vale el cambio.

### Amortización de la diferencia {#payback-difference}

Es el coste de construcción extra del otro plan dividido por su beneficio extra al día, en días: «{cost} ȼ más de construcción ÷ {profit} ȼ/día más de beneficio». **nunca** significa que cuesta más de construir y no gana más. Cuando el otro plan no cuesta más de construir, ves «–».

Por ejemplo (con cifras inventadas), si el otro plan cuesta 200.000 ȼ más de construir y gana 2.000 ȼ más al día, su coste de construcción extra se amortiza en 200.000 ÷ 2.000 = 100 días.
