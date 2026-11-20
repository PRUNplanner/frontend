Cada beneficio, coste y amortización de PRUNplanner depende de los precios que elijas. En unos 15 minutos, esta guía te lleva paso a paso por tu [[exchange-preference|preferencia de bolsa]]. Al terminar tendrás:

- una bolsa principal y una base de precio para todos tus planetas,
- reglas de compra y venta separadas, si compras y vendes en bolsas distintas,
- excepciones para planetas concretos y [[fixed-price|precios fijos]] para lo que fabricas tú mismo,
- un Resumen de cada precio que usan tus planes y la regla que hay detrás.

Es para quien quiera que sus planes reflejen cómo comercia de verdad. Necesitas una cuenta. Las páginas enlazadas al final de cada paso entran en más detalle.

## 1. Abre tu preferencia de bolsa {#step-1}

Abre [Bolsas](/exchanges). Muestra una preferencia cada vez, y **Cambiar preferencia** elige otra. Debajo del selector ves qué [[empire|imperios]] la usan.

![Bolsas: Cambiar preferencia y los imperios que la usan a la izquierda, el Resumen de los precios que usan tus planes a la derecha](/images/help/guides/cx-prices-overview.webp)

Una cuenta nueva tiene «My Exchange Preference», que usa «My Empire», configurada con **Universe · VWAP 30D**. Un [[plan|plan]] no tiene precios propios. Usa la preferencia del imperio con el que se calcula. Cada imperio usa una preferencia, y varios imperios pueden compartir una. Para dar a un imperio otra preferencia, elígela en la columna CX de **Configuración de imperios** en [Gestión](/manage).

Más información: [Preferencias de bolsa](/help/exchanges#exchange-preferences), [Gestión](/help/management#cx-configuration).

## 2. Define tu bolsa principal con un ajuste predefinido {#step-2}

1. Abre **Todos los planetas** en la lista de la izquierda. Sus reglas se aplican a todos los planetas que no tienen reglas propias.
2. En la casilla **Precio de bolsa**, elige tu bolsa principal: AI1, CI1, IC1 o NC1.
3. Haz clic en un ajuste predefinido:
   - **Media · VWAP 30D** compra y vende al [[vwap|VWAP]] de 30 días de esa bolsa, una media estable de lo que se ha negociado. [Tu primera base](/help/guide_first_base#step-2) trabaja con un ejemplo de VWAP.
   - **Operar ya · compra Ask, venta Bid** compra a la oferta más barata y vende al comprador que más paga ahora mismo. Es el precio de operar al instante.

![Todos los planetas en Bolsas: la casilla Precio de bolsa con los ajustes predefinidos, y la tabla Precios fijos debajo](/images/help/guides/cx-prices-rule.webp)

La casilla te dice sobre qué bolsa actúan los ajustes predefinidos («Ajustes predefinidos en NC1:»).

Más: [Ajustes predefinidos](/help/exchanges#presets).

## 3. Elige compra, venta o ambas, y la base de precio {#step-3}

En la casilla **Precio de bolsa**:

- **Igual para compra y venta** usa una bolsa y una base para los dos lados.
- **Compra y venta por separado** da a cada lado su propia bolsa y base, por ejemplo comprar en CI1 y vender en NC1. Un lado que se deja **Sin definir** pasa a la siguiente regla, hasta Universe · VWAP 30D.

| Base              | Úsala cuando                                                         |
| ----------------- | -------------------------------------------------------------------- |
| VWAP 7D, VWAP 30D | Quieres una media estable. 7D sigue antes los movimientos recientes. |
| Ask               | Compras al instante, a la oferta más barata.                         |
| Bid               | Vendes al instante, al comprador que más paga.                       |

[[universe|Universe]] solo tiene los dos VWAP.

> [!warning]
> Cuando la bolsa elegida no tiene precio para un material (nadie lo ofrece, nadie puja o, en el caso del VWAP, no ha habido operaciones allí en los últimos 30 días), cuenta como 0 ȼ. PRUNplanner no recurre a otra bolsa. La página muestra esos precios en ámbar y los enumera en sus notas.
>
> Sin operaciones en los últimos 7 días, VWAP 7D usa el precio del último día dentro de esos 30 días en que se negoció el material. Si un material en ámbar es uno que tus planes compran o venden, puedes definir una regla de planeta con otra bolsa para el planeta que lo usa (paso 4) o darle un precio fijo (paso 5).

Detalles: [Base de precio](/help/exchanges#price-basis-vwap-ask-and-bid), [Compra, venta o ambas](/help/exchanges#buy-sell-or-both).

## 4. Añade excepciones para planetas concretos {#step-4}

Si una base vende en otro sitio, por ejemplo porque está más cerca de otra bolsa, dale a su planeta una regla propia.

1. Abre el planeta en la lista (en **Usan las reglas de todos los planetas**).
2. En su casilla **Precio de bolsa**, cambia de **Usar la regla de todos los planetas** a **Igual para compra y venta** o **Compra y venta por separado**, y define la regla.

El planeta pasa entonces a **Planetas con reglas propias**. Su regla gana a la de todos los planetas, con una excepción: los precios fijos de todos los planetas siguen ganando. La lista de precios bajo las reglas muestra lo que compran y venden los planes de ese planeta, y a qué precio.

Más información: [Excepciones por planeta](/help/exchanges#planet-exceptions), [Cómo se encuentra un precio](/help/exchanges#how-a-price-is-found).

## 5. Fija precios para lo que fabricas tú mismo {#step-5}

Un material que fabricas en una base y usas en otra no debería costar el precio de mercado. Cuesta lo que pagas por fabricarlo, tu [[cogm|COGM]].

- En un plan, abre **COGM** en la orden que fabrica el material y haz clic en **Usar como precio de compra en todos los planetas** (se ofrece mientras el material no tiene precio fijo), y luego en **Guardar cambios**. Esto fija un precio de compra al COGM _de ese plan_ para todos los planetas de la preferencia.
- O bien, en **Todos los planetas** dentro de Bolsas, añade el material a **Precios fijos** con **Añadir material** y escribe un precio. Para los materiales que fabrican tus planes, la columna **COGM en tus planes** muestra el COGM más bajo, y **Usar** lo copia en el precio de compra.

Deja un lado vacío para mantener en él el precio de bolsa.

> [!tip]
> Mantén los precios fijos al día con tu producción. El Resumen avisa cuando un precio de compra fijo se aleja más de un 2 % del COGM más bajo, y el diálogo de COGM ofrece actualizarlo.
>
> Como ejemplo, supongamos que tu COGM más bajo para RAT es 95 ȼ y su precio de compra fijo es 100 ȼ. Eso es 5 ÷ 95 ≈ 5,3 % de diferencia, así que el Resumen lo señala. Con 96 ȼ sería 1 ÷ 95 ≈ 1,1 %, y no hay nota.

Más: [Precios fijos y COGM](/help/exchanges#fixed-prices-and-cogm), [Usar el COGM como precio de compra](/help/plan_tools#cogm-buy-price).

## 6. Guarda y comprueba el resultado {#step-6}

1. Pulsa **Guardar cambios** en la barra de abajo. Tus planes solo usan las reglas nuevas cuando guardas.
2. Abre el **Resumen**. Enumera cada material que compran o venden tus planes, su precio y la regla que hay detrás. Lee primero las notas de arriba, donde los avisos van primero.
3. Abre un plan. **Precios** en **Imperio y precios** indica la preferencia. Luego abre **Revisión del plan**: **Revisión de mercado** comprueba cada material en la bolsa que usa tu preferencia, y **A precios reales** muestra el beneficio con el ask y el bid de hoy.

Has terminado cuando los materiales con los que comercias no muestran precios de 0 ȼ en ámbar y el beneficio a precios reales es uno con el que puedes vivir.

Detalles: [Resumen](/help/exchanges#overview), [Revisión del plan](/help/plan_check#market-check).

## Siguiente {#next}

- [De una cadena a bases](/help/guide_chain_to_bases): planifica una cadena entera con estos precios.
- [Crece hasta un imperio](/help/guide_empire): comprueba todas tus bases juntas.
