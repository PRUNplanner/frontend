En la página [Bolsas](/exchanges) decides qué precios usan tus planes. Define una bolsa principal, elige una base de precio, añade precios fijos para los materiales que fabricas tú mismo y crea excepciones para planetas concretos. Cada número de beneficio, coste y ROI de PRUNplanner depende de estos precios.

Ven aquí cuando quieras saber de dónde sale un precio de tus planes, o para cambiarlo. El [Resumen](#overview) muestra cada precio que usan tus planes y la regla que hay detrás, y nada de lo que cambies llega a tus planes hasta que guardas.

## Preferencias de bolsa {#exchange-preferences}

Una [[exchange-preference|preferencia de bolsa]] define los precios que usan tus planes. Elige la [[cx|bolsa]] y la base de precio, y guarda [[fixed-price|precios fijos]] para los materiales que consigues a tu propio coste o de un socio.

- Una preferencia pertenece a tu cuenta. La asignas a un [[empire|imperio]] en [Gestión](/manage), en la columna CX de **Configuración de imperios**. Un imperio tiene una preferencia, y una preferencia puede servir a varios imperios.
- Un [[plan|plan]] no tiene preferencia propia. Usa la preferencia del imperio en el que se abre, así que un plan que está en dos imperios puede mostrar precios distintos en cada uno.
- Un imperio sin preferencia («Ninguna») pone precio a todo con **Universe · VWAP 30D**.
- Cada cuenta nueva empieza con «My Exchange Preference», configurada con Universe · VWAP 30D para comprar y vender y asignada a «My Empire».

Las preferencias se crean, renombran y eliminan en [Gestión](/help/management#cx). Esta página edita las reglas de una preferencia cada vez, que eliges en **Cambiar preferencia**. Debajo del selector verás qué imperios la usan, o que no la usa ninguno.

## La lista de reglas {#rules-list}

La columna de la izquierda enumera las partes de la preferencia que puedes abrir. En pantallas de menos de 1024 px es un selector.

| Entrada                                   | Qué muestra                                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resumen**                               | Cada precio que usan tus planes, consulta [Resumen](#overview)                                                                                                                     |
| **Todos los planetas**                    | Tu bolsa principal y los precios fijos para todos los planetas                                                                                                                     |
| **Planetas con reglas propias**           | Planetas con una [excepción](#planet-exceptions)                                                                                                                                   |
| **Usan las reglas de todos los planetas** | Planetas de los imperios que usan esta preferencia y siguen las reglas de todos los planetas (agrupados por imperio cuando varios imperios usan la preferencia) |
| **Planetas de otros imperios**            | Planetas de imperios que no usan esta preferencia, que aparecen después de pulsar el botón para mostrarlos                                                                         |
| **Sin ningún plan**                       | Planetas con reglas guardadas que no usa ninguno de tus planes                                                                                                                     |

**Todos los planetas** y cada planeta con reglas guardadas muestran cuántas reglas tienen, y el recuento se pone ámbar cuando la entrada tiene una nota de aviso. A partir de 10 planetas aparece una casilla **Filtrar planetas**.

## Resumen {#overview}

La página se abre en el **Resumen**. Enumera cada material que compran o venden los planes de los imperios que usan esta preferencia, el precio que recibe y la regla que hay detrás. Mientras se muestran los planetas de otros imperios, sus planes también cuentan. Incluye los cambios sin guardar, así que ves el efecto de una edición antes de guardar. Se omiten los materiales que un plan ni compra ni vende (neto 0).

- El resumen de arriba muestra la regla de **Todos los planetas**, cuántos planetas tienen reglas propias y cuántos precios fijos hay.
- **Buscar material** y **Mostrar materiales** (**Todos**, **Fijos**, **Sin precio (0 ȼ)**, **Varía según el planeta**) acotan la tabla.
- La tabla enumera **Material**, **Compra ȼ**, **Venta ȼ** y **Usado en** (los tres primeros planetas, el resto como «+n»). Cuando los planetas reciben precios distintos, ves el rango y una etiqueta «varía según el planeta». En pantallas de menos de 1024 px la tabla muestra un lado cada vez, primero los precios de compra, con un selector para el lado de venta, y omite **Usado en**.
- Una etiqueta muestra de dónde sale cada precio, por ejemplo «NC1 · VWAP 30D», **Fijo · todos los planetas**, **Fijo · este planeta** o **Sin datos de precio**. Los precios de 0 ȼ sin precio fijo salen en ámbar.
- Despliega una fila para ver toda la escalera de [cómo se encuentra el precio](#how-a-price-is-found), para cada lado y planeta. **Abrir la regla** salta a la regla que lo definió.

Mientras PRUNplanner calcula tus planes, la tabla muestra **Calculando tus planes…** con una barra de progreso.

### Notas {#notes}

Las notas sobre la tabla señalan reglas que conviene revisar. Los avisos van primero, y **Abrir** te lleva a la regla.

| Nota                                                                   | Tipo        | Qué hacer                                                                                                          |
| ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Una regla no tiene precio de compra o de venta para algunos materiales | Aviso       | Esos materiales cuentan como 0 ȼ. Define un precio fijo o elige otra bolsa o base. |
| Un material no tiene precio en ninguna bolsa                           | Aviso       | Cuenta como 0 ȼ. Define un precio fijo si conoces uno.                             |
| Un material está fijado en 0 ȼ                                         | Información | Correcto si es de tu propio suministro y te sale gratis.                                           |
| Los precios de compra fijos difieren de su COGM                        | Información | Solo en el Resumen. Consulta [Precios fijos y COGM](#fixed-prices-and-cogm).       |
| La regla de bolsa de un planeta es igual a la de todos los planetas    | Información | Puedes quitarla.                                                                                   |
| **Ningún imperio usa esta preferencia**                                | Información | Asígnala en Gestión.                                                                               |
| Reglas para planetas que no están en ningún plan                       | Información | Elimínalas en **Sin ningún plan** si no las necesitas.                                             |

## Cómo se encuentra un precio {#how-a-price-is-found}

Para cada material, PRUNplanner busca un precio de compra (para lo que consume un plan) y un precio de venta (para lo que produce). Revisa estos niveles en orden y toma la primera regla que coincide:

1. **Precio fijo del planeta**: un precio fijo definido en ese planeta
2. **Precio fijo de todos los planetas**
3. **Bolsa del planeta**: la regla de bolsa definida en ese planeta
4. **Bolsa de todos los planetas**
5. **Universe · VWAP 30D**, cuando no coincide ninguna regla de arriba

Así que un precio fijo de todos los planetas gana a la regla de bolsa de un planeta.

Un ejemplo: **Todos los planetas** tiene NC1 · VWAP 30D para comprar y vender y un precio de compra fijo de 45 ȼ para RAT. Un planeta tiene su propia regla de bolsa, CI1 · Ask, solo para comprar. En ese planeta:

- Comprar RAT sale a 45 ȼ: el planeta no tiene precio fijo propio, así que el precio fijo de todos los planetas (nivel 2) coincide primero.
- Comprar H2O sale al Ask de CI1: no coincide ningún precio fijo, así que coincide la regla de bolsa del planeta (nivel 3).
- Vender RAT sale al VWAP 30D de NC1: no hay precio de venta fijo, y la regla del planeta es solo para comprar, así que coincide la bolsa de todos los planetas (nivel 4).

### Compra, venta o ambas {#buy-sell-or-both}

Una regla puede aplicarse a la compra, a la venta o a ambas. Si un nivel no tiene regla para el lado que necesita un plan, PRUNplanner se salta ese nivel y revisa el siguiente, hasta Universe · VWAP 30D. Eso pasa, por ejemplo, cuando un nivel solo tiene una regla de compra y el plan vende el material.

### Bolsas sin precio {#exchanges-without-a-price}

Cuando coincide una regla de bolsa pero su bolsa no tiene precio para un material, el precio es 0 ȼ. No pasa al siguiente nivel. Esto ocurre con Ask cuando nadie ofrece el material, con Bid cuando nadie lo quiere y con VWAP cuando la bolsa no ha tenido operaciones en los últimos 30 días. Un material sin ningún dato de bolsa muestra **Sin datos de precio** y también cuenta como 0 ȼ.

Un precio de 0 ȼ cambia los números de tu plan: un material que compra a 0 ȼ no cuesta nada, y uno que vende a 0 ȼ no le hace ganar nada. Así que el beneficio de un plan puede parecer mejor o peor de lo que sería en el mercado.

La página muestra estos precios en ámbar y los enumera en las [notas](#notes), para que puedas definir un precio fijo o elegir otra bolsa o base.

## Base de precio: VWAP, Ask y Bid {#price-basis-vwap-ask-and-bid}

| Base              | Qué es                                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VWAP 7D, VWAP 30D | El [[vwap\|precio medio ponderado por volumen]] de los últimos 7 o 30 días. Las operaciones con más volumen cuentan más, así que una operación rara apenas lo mueve. |
| Ask               | La oferta más barata del libro de órdenes ahora mismo: lo que pagas si compras al instante.                                                                                                                                                                                  |
| Bid               | La orden de compra más alta del libro de órdenes ahora mismo: lo que recibes si vendes al instante.                                                                                                                                                                          |

[[ask|Ask]] y [[bid|Bid]] salen del libro de órdenes en directo, así que pueden cambiar en cualquier momento y pueden faltar en materiales con poco comercio. Cuando una bolsa no ha tenido operaciones en los últimos 7 días, VWAP 7D usa el precio del último día en que se negoció. Los dos VWAP solo son 0 cuando no hubo ninguna operación en los últimos 30 días.

Un ejemplo de VWAP con números inventados: un día se negocian 100 unidades por 5.000 ȼ en total (50 ȼ cada una), y otro día 10 unidades por 1.000 ȼ (100 ȼ cada una). El VWAP es los créditos ÷ las unidades, (5.000 + 1.000) ÷ (100 + 10) ≈ 54,55 ȼ. Una media simple de los dos precios daría 75 ȼ, así que el día pequeño y más caro mueve mucho menos el VWAP.

Lo que hace la base con tus planes: VWAP es un único precio para los dos lados, así que con la misma regla VWAP para comprar y vender un material recibe el mismo precio de compra y de venta. Con Ask para comprar y Bid para vender, un plan compra a la oferta más barata y vende a la orden de compra más alta, y la diferencia entre ambas, el [[spread|diferencial]], se nota en su beneficio.

[[universe|Universe]] combina las cuatro bolsas y solo tiene precios VWAP. PRUNplanner actualiza los precios de bolsa más o menos cada 30 minutos.

## Definir una regla de bolsa {#exchange-rule}

La casilla **Precio de bolsa** de **Todos los planetas** y de cada planeta define la regla de bolsa. Luego elige una de estas opciones:

- **Igual para compra y venta**: una bolsa y una base para los dos lados.
- **Compra y venta por separado**: su propia bolsa y base para cada lado. Un lado puede quedarse **Sin definir**, y entonces pasa al siguiente nivel.
- **Usar la regla de todos los planetas** (solo planetas): el planeta sigue la regla de todos los planetas, que se muestra como «Usa la regla de todos los planetas: …».

Para cada lado eliges **Bolsa para {side}** (AI1, CI1, IC1, NC1 o Universe) y **Base de precio para {side}** (VWAP 7D, VWAP 30D, Ask, Bid). Universe solo ofrece los dos VWAP. Cuando cambias un planeta de la regla de todos los planetas a una propia, empieza con la elección que heredaba.

## Ajustes predefinidos {#presets}

Dos ajustes predefinidos rellenan la regla con un clic:

- **Media · VWAP 30D** usa el VWAP 30D de la bolsa para comprar y vender.
- **Operar ya · compra Ask, venta Bid** compra al Ask de la bolsa y vende a su Bid. No está disponible para Universe, que no tiene libro de órdenes.

Los ajustes predefinidos actúan sobre la bolsa de la regla que estás editando, si no, sobre la bolsa de todos los planetas, y si no, sobre NC1. La casilla te dice cuál («Ajustes predefinidos en NC1:»).

## Precios fijos y COGM {#fixed-prices-and-cogm}

Los precios fijos van bien para materiales que fabricas tú mismo y usas a coste, o para precios que has acordado con una corporación o un socio. Añade uno con **Añadir material** y escribe un precio de compra, uno de venta o ambos. Deja un lado vacío para usar en él el precio de bolsa.

La tabla **Precios fijos** muestra:

| Columna                   | Significado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compra ȼ**, **Venta ȼ** | Tus precios fijos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Mercado**               | El precio que recibiría el material sin el precio fijo (lado de compra, salvo que solo esté fijada la venta), con la diferencia en %                                                                                                                                                                                                                                                                                                                                                                                                    |
| **COGM en tus planes**    | Solo en Todos los planetas. Para los materiales que fabrican tus planes, el [[cogm\|COGM]] (coste de bienes fabricados) más bajo entre los planes de los imperios que usan esta preferencia, y en cuántos planes se fabrica. «en uso» marca un precio de compra igual a él; si no, **Usar** pone el precio de compra en ese COGM (redondeado a 2 decimales). |
| Última columna            | El botón × quita la fila. En un planeta, **Sobrescribir** copia un precio de todos los planetas en un precio fijo propio                                                                                                                                                                                                                                                                                                                                                                                                                   |

A partir de 10 filas, puedes buscar y ordenar la tabla por **Material** o **% vs mercado**.

En la herramienta COGM de un plan, **Usar como precio de compra en todos los planetas** pone un precio de compra fijo de todos los planetas en el COGM _de ese plan_, no en el más bajo. Consulta [Herramientas del plan](/help/plan_tools#cogm-buy-price).

El Resumen muestra una nota cuando un precio de compra fijo de todos los planetas se aleja más de un 2 % del COGM más bajo. Su tabla tiene un botón **Usar COGM** por material. Por ejemplo, con un precio de compra fijo de 45 ȼ y un COGM más bajo de 40 ȼ, la diferencia es (45 − 40) ÷ 40 = 12,5 %, así que aparece la nota. Con 40,50 ȼ es un 1,25 %, y no hay nota. No te preocupes por esta nota: es informativa, y el precio fijo sigue funcionando tal cual.

> [!tip]
> Un precio de compra fijo a tu propio COGM hace que los planes que usan el material muestren el beneficio de toda la cadena en el plan que vende el producto final. Mantenlo al día con el COGM cuando cambie tu producción.

## Excepciones por planeta {#planet-exceptions}

La mayoría de los jugadores usa una bolsa principal para todos los planetas. Cuando un planeta necesita otra cosa, ábrelo en la lista y define su propia regla de bolsa o sus precios fijos. En ese planeta sus reglas ganan a las de todos los planetas, salvo los precios fijos de todos los planetas, que siguen ganando a la bolsa del planeta.

En un planeta, los precios fijos de todos los planetas aparecen atenuados como **Precio de todos los planetas**, y **Sobrescribir** da al planeta su propio precio fijo para ese material. Debajo, **Precios en {planet}** muestra lo que compran y venden los planes de ese planeta y el precio que recibe cada cosa.

Los planetas con reglas guardadas que ya no usa ninguno de tus planes aparecen en **Sin ningún plan**. Sus reglas siguen guardadas hasta que las eliminas con **Eliminar reglas**.

## Guardar {#saving}

Tus planes solo usan tus cambios una vez que los guardas. La barra de guardado de abajo cuenta tus cambios: cada parte modificada de la preferencia, más uno por un cambio de nombre. **Guardar cambios** los guarda y vuelve a calcular los precios de todos los planes que tienes abiertos, y **Descartar** vuelve a las reglas guardadas. Como el [Resumen](#overview) ya muestra los cambios sin guardar, puedes probar una regla, ver los precios que da y descartarla si no es lo que querías. Si tienes cambios sin guardar, la página te pregunta antes de salir o cambiar de preferencia.

**Renombrar…** en el menú **Más acciones** cambia el nombre de la preferencia. El nombre nuevo se guarda con la barra de guardado. **Gestionar preferencias** abre Gestión.

Si la misma preferencia se guardó en otra pestaña o en otro dispositivo después de que la abrieras, la página te lo dice y conserva tus ediciones. Al guardar, eliges **Sobrescribir** (tu versión sustituye a la otra) o **Recargar** (descarta tus ediciones y carga la versión guardada).

## Importar y exportar CSV {#csv-import-and-export}

**Exportar CSV** descarga todas las reglas de la preferencia, incluidos los cambios sin guardar, como `PRUNPlannerExchangePreferences.csv`. **Importar CSV** lee un archivo así y pregunta antes de sustituir todas las reglas de la preferencia. Una importación queda sin guardar hasta que la guardas.

El archivo usa punto y coma como separador y tiene las columnas `Location;Type;CX;Ticker;Price`:

| Columna       | Valores                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location      | `EMPIRE` para todos los planetas, o el ID natural de un planeta                                                                                      |
| Type          | `BUY`, `SELL` o `BOTH`                                                                                                                               |
| CX            | Solo reglas de bolsa: bolsa y base, p. ej. `NC1_30D`, `CI1_7D`, `AI1_ASK`, `IC1_BID`, `UNIVERSE_30D` |
| Ticker, Price | Solo precios fijos: el ticker del material y su precio                                                                               |

PRUNplanner rechaza entero un archivo al que le falta una columna o que tiene una fila no válida, y no cambia nada.

```
Location;Type;CX;Ticker;Price
EMPIRE;BOTH;NC1_30D;;
EMPIRE;BUY;;RAT;45
```

## Tarjeta de mercado del material {#market-card}

Cada [[ticker|ticker]] de material en PRUNplanner abre una tarjeta de mercado. Pasa el ratón por encima (o dale el foco con el teclado) y aparece la tarjeta. En una pantalla táctil o una ventana estrecha, al tocarlo se abre como una hoja desde abajo.

La tarjeta muestra una fila por bolsa más Universe, con Ask, Bid, [[spread|Diferencial]], VWAP 7D y VWAP 30D, la variación de 7D frente a 30D, una línea de precios de 30 días y las unidades negociadas por día (media de 30 días). Debajo, unas líneas breves cubren la tendencia entre bolsas, los libros de órdenes (unidades ofrecidas y pedidas) y lo separados que están los precios de las bolsas. Si un material se negocia menos de una unidad al día en las cuatro bolsas juntas, la tarjeta lo marca como poco negociado.

Cuando el ticker pertenece a un plan, un imperio o una configuración, la tarjeta también muestra cuánto material compra o vende al día y su [[share-of-volume|parte del volumen diario]]: Bien por debajo del 10 %, Vigilar desde el 10 %, Demasiado grande desde el 50 %. Son los mismos límites que en [Revisión del plan](/help/plan_check#market-check). Por ejemplo, si un plan vende 60 unidades al día y la bolsa negoció 9.000 unidades en los últimos 30 días, son 300 al día, y la parte del plan es 60 ÷ 300 = 20 %: Vigilar.

- Haz clic en el ticker para fijar la tarjeta. Esc o × la cierran. En la E/S de materiales de un plan y en la Calculadora de HQ, un clic abre los detalles directamente.
- **Detalles del mercado →** abre un panel con el peso y el volumen del material, la fecha de los datos, una tabla por bolsa (**Precios**, **Libros de órdenes**, **Volumen**), un gráfico de 30 días y **Salud del mercado** (amplitud, tendencia ponderada por volumen, equilibrio del libro de órdenes, cohesión de precios).
- **Exploración del mercado ↗** abre el material en [Exploración del mercado](/help/tools_market_exploration).

En [Perfil](/help/profile#preferences), **Tarjeta de mercado** define cómo se abre la tarjeta: **Al pasar el ratón** (por defecto) o **Solo al hacer clic**. Con Solo al hacer clic, pasar el ratón no muestra nada y un clic fija la tarjeta.
