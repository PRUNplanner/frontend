## Exchange Preferences {#exchange-preferences}

An exchange preference sets the prices your plans use: which exchange and price basis, and fixed prices for materials you get at your own cost or from a partner. Asigna una preferencia a un imperio en Gestión; todos los planes de ese imperio la usarán.

La página se abre en el **Resumen**: cada material que tus planes compran o venden, el precio que obtiene y de dónde viene ese precio. Despliega una fila para ver la cascada completa de cada planeta. Las notas sobre la tabla señalan las reglas que conviene revisar.

## How a Price Is Found {#how-a-price-is-found}

Para cada material, PRUNplanner busca un precio de compra (para lo que consume un plan) y un precio de venta (para lo que produce). It checks these levels in order and takes the first rule that matches:

1. **Precio fijo del planeta**: un precio fijo definido en ese planeta
2. **Precio fijo de todos los planetas**
3. **Bolsa del planeta**: la regla de bolsa definida en ese planeta
4. **Bolsa de todos los planetas**
5. **Universe · VWAP 30D**, cuando no coincide ninguna regla anterior

Un precio fijo de todos los planetas tiene prioridad sobre la regla de bolsa de un planeta.

### Buy, Sell or Both {#buy-sell-or-both}

Una regla puede aplicarse a la compra, a la venta o a ambas. Si un nivel no tiene regla para el lado que necesita un plan (por ejemplo, solo una regla de compra y el plan vende el material), ese nivel se salta y se comprueba el siguiente, hasta llegar a Universe · VWAP 30D.

### Exchanges Without a Price {#exchanges-without-a-price}

Cuando coincide una regla de bolsa pero su bolsa no tiene precio para un material (sin operaciones, sin ofertas de venta o sin ofertas de compra), el precio es **0 ȼ**. It does not fall through to the next level. La página muestra estos precios en ámbar y los enumera en las notas, para que puedas definir un precio fijo o elegir otra bolsa o base de precio.

## Price Basis: VWAP, Ask and Bid {#price-basis-vwap-ask-and-bid}

PRUNplanner puede usar un precio medio ponderado por volumen (VWAP) de 7 o 30 días. El VWAP da más peso a las operaciones con mayor volumen, así que refleja dónde se concentró la mayor parte del comercio en lugar de órdenes aisladas atípicas.

Ask y Bid son el libro de órdenes de hoy: la oferta de venta más barata y la oferta de compra más alta. They change daily and can be missing for materials with little trading. Universe solo tiene precios VWAP.

## Presets {#presets}

- **Media · VWAP 30D** usa el VWAP 30D de la bolsa para comprar y vender.
- **Operar ya · compra Ask, venta Bid** compra al Ask de la bolsa y vende a su Bid. No disponible para Universe.

Los ajustes predefinidos se aplican a la bolsa del ámbito; si no, a la bolsa de todos los planetas; si no, a NC1.

## Fixed Prices and COGM {#fixed-prices-and-cogm}

Los precios fijos sirven para los materiales que fabricas tú mismo y usas a coste, o para precios acordados con una corporación o un socio. Deja un lado vacío para usar el precio de bolsa en él.

En **Todos los planetas**, la tabla de precios fijos muestra el precio de mercado sin el fijo y, para los materiales que fabrican tus planes, el COGM (coste de los bienes fabricados) más bajo entre los planes que usan la preferencia. **Usar** fija el precio de compra en ese COGM. En la herramienta COGM de un plan, **Usar como precio de compra** hace lo mismo. Una nota te avisa cuando un precio de compra fijo se desvía más de un 2 % del COGM.

## Planet Exceptions {#planet-exceptions}

La mayoría de jugadores usa una sola bolsa principal para todos los planetas. Cuando un planeta necesita otra cosa, ábrelo en la lista y define su propia regla de bolsa o sus precios fijos. Sus reglas tienen prioridad sobre las de todos los planetas en ese planeta, salvo los precios fijos de todos los planetas, que siguen teniendo prioridad sobre la bolsa del planeta.

Los planetas con reglas guardadas que ya no usa ningún plan aparecen en **Sin ningún plan**. Sus reglas se quedan guardadas hasta que las elimines.

## Saving {#saving}

Tus planes no usan los cambios hasta que los guardas. La barra de guardado cuenta los ámbitos modificados; Descartar vuelve a las reglas guardadas. La página te pregunta antes de salir o cambiar de preferencia si hay cambios sin guardar.

## CSV Import and Export {#csv-import-and-export}

**Exportar CSV** descarga todas las reglas de la preferencia, incluidos los cambios sin guardar. **Importar CSV** lee un archivo así y pregunta antes de reemplazar todas las reglas de la preferencia. Una importación queda sin guardar hasta que la guardes.
