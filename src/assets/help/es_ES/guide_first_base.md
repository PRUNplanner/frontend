¿Eres nuevo en PRUNplanner? Esta guía lleva unos 15 minutos. Al terminar tendrás:

- tu [[empire|imperio]] configurado con tu facción y tus permisos,
- precios que vienen de la bolsa que elijas,
- un primer [[plan]] guardado cuyo beneficio y amortización sabes leer.

Es un recorrido corto. Las páginas enlazadas al final de cada paso profundizan cuando quieras los detalles.

Necesitas una cuenta. Una cuenta nueva ya viene con un imperio y una [[exchange-preference|preferencia de bolsa]], así que casi todo consiste en revisar y ajustar.

## 1. Revisa tu imperio {#step-1}

Un imperio es un grupo de planes que comparten facción, permisos y preferencia de bolsa, así que lo que configures aquí se aplica a todos sus planes.

![El paso Tu imperio en la página Imperio de una cuenta nueva, con Facción, Permisos totales, Permisos usados y Guardar](/images/help/guides/first-base-empire.webp)

Abre [Imperio](/empire). Una cuenta nueva tiene un imperio, «My Empire», sin [[faction|facción]] y con 1 de 2 permisos usados. Mientras no tiene planes, la página muestra tres pasos. El primero, **Tu imperio**, contiene sus ajustes.

1. Elige tu **Facción**. Da una bonificación a los edificios de su [[expertise|especialización]] en todos los planes del imperio.
2. Pon en **Permisos totales** y **Permisos usados** lo que muestra el búfer `HQ` del juego. Cuantos menos permisos uses, mayor es la bonificación de facción.
3. Pulsa **Guardar**.

Cuando el paso muestra **Guardado**, has terminado aquí. Una vez que el imperio tiene planes, encontrarás los mismos campos en el recuadro **Configuración** de la página Imperio.

> [!tip]
> Una vez que el imperio tiene planes, el recuadro **Configuración** avisa con «Discrepancia detectada» cuando **Permisos usados** no coincide con los permisos que suman tus planes. Lo comprueba mientras escribes, así que puede aparecer mientras editas. No te preocupes, solo es un recordatorio para que cuadres las cifras con el juego. El paso inicial de arriba no lo muestra.

> [!tip]
> ¿Quieres un segundo imperio, por ejemplo para probar una expansión sin tocar tus bases reales? Créalo en [Gestión](/manage) con **Nuevo imperio**.

Más información: [Configuración del imperio](/help/empire#configuration), [Bonificación de facción](/help/plan_base#faction).

## 2. Elige tu bolsa principal {#step-2}

Tus precios vienen de tu preferencia de bolsa, y los ingresos, costes y beneficio de cada plan se calculan con esos precios. Una cuenta nueva tiene «My Exchange Preference», que ya está vinculada a «My Empire». Está configurada en **Universe · VWAP 30D**, la media de 30 días de las cuatro bolsas. También puedes tomar todos los precios de una sola bolsa.

![Bolsas con Todos los planetas abierto: el recuadro Precio de bolsa con sus ajustes rápidos, Igual para compra y venta y los botones de las bolsas](/images/help/guides/first-base-exchange.webp)

1. Abre [Bolsas](/exchanges). Se abre tu preferencia. Si tienes varias, **Cambiar preferencia** elige otra.
2. En la lista de la izquierda, abre **Todos los planetas**.
3. En el recuadro **Precio de bolsa**, deja **Igual para compra y venta** y elige tu bolsa principal: AI1 en Antares Station, CI1 en Benten, IC1 en Hortus o NC1 en Moria.
4. Elige una base de precio, o haz clic en el ajuste rápido **Media · VWAP 30D**.
5. Pulsa **Guardar cambios** en la barra de abajo.

> [!tip]
> El [[vwap|VWAP]] es el precio medio ponderado por volumen: los créditos pagados por un material ÷ las unidades negociadas. Por ejemplo, supón que en una bolsa se negociaron 30 unidades a 200 ȼ, 40 a 210 ȼ, 10 a 215 ȼ y 20 a 220 ȼ. El VWAP es (6.000 + 8.400 + 2.150 + 4.400) ÷ 100 = 20.950 ÷ 100 = 209,50 ȼ. Los precios con más unidades detrás cuentan más.
>
> El VWAP 7D hace la media de las operaciones de los últimos 7 días, el VWAP 30D la de los últimos 30. Una sola bolsa usa solo las operaciones hechas allí. Universe suma las operaciones de AI1, CI1, IC1 y NC1 en una sola media.

Si el **Resumen** muestra la nueva regla en **Todos los planetas**, ha funcionado. Cuando tengas planes, el Resumen lista todos los precios que usan, y los precios en ámbar marcan materiales que cuentan como 0 ȼ. Eso solo significa que la bolsa que elegiste no tiene precio para ellos, y PRUNplanner no toma uno de otra bolsa. Con VWAP, eso solo pasa tras 30 días sin operaciones en esa bolsa. Antes de eso, el VWAP 7D recurre al precio del último día en que se negoció.

Los imperios que crees más adelante empiezan sin preferencia y se valoran a Universe · VWAP 30D. Les asignas una en [Gestión](/manage), en la columna **CX** de **Configuración de imperios**.

Detalles: [Configurar tus precios](/help/guide_cx_prices), [Definir una regla de bolsa](/help/exchanges#exchange-rule).

## 3. Encuentra un planeta {#step-3}

Abre [Búsqueda de planetas](/search).

![Búsqueda de planetas con un filtro de FEO y un límite de 5 saltos desde NC1, los filtros a la izquierda y los planetas que coinciden a la derecha](/images/help/guides/first-base-search.webp)

1. En Materiales, usa **+ añadir material…** para añadir lo que quieres producir o extraer. Cada opción muestra cuántos planetas obtendrías.
2. En **Distancia**, marca tu bolsa principal en **Bolsas** y baja **Saltos máx.**, para que los vuelos de suministro sean cortos.
3. Activa **Parcelas** en **Columnas** para ver qué planetas aún tienen [[plots|parcelas]] libres.

Buscas una lista corta en la que la tarjeta del material esté en verde o amarillo (cerca de la producción del mejor planeta), con pocos saltos y parcelas libres. Un ⊘ rojo junto a un nombre significa que el planeta está lleno.

Más: [Encontrar un planeta para un material](/help/guide_find_planet), [Búsqueda de planetas](/help/planet_search#materials).

## 4. Crea el plan {#step-4}

Haz clic en «+» en la fila del planeta. Se abre un plan nuevo para ese planeta en una pestaña nueva, así no pierdes tu búsqueda.

![Un plan nuevo con las tarjetas de resultados arriba, Imperio y precios, Planeta y Producción](/images/help/guides/first-base-plan.webp)

1. **Imperio y precios**: **Calcular con el imperio** muestra el imperio con el que se calcula el plan. Un plan nuevo empieza con tu primer imperio, y cuando creas el plan se une al imperio seleccionado ahí. **Precios** nombra la preferencia de bolsa que usa.
2. **Planeta**: el selector **COGC** empieza con el programa que tiene activo ahora el planeta. Para una primera base, deja **Permisos** en 1 (500 de área).
3. Producción: elige un edificio en el selector de edificios, luego haz clic en **+ Receta** y elige una [[recipe|receta]]. Pon en **Cantidad** cuántos construyes. Para extraer, haz clic en una tarjeta de recurso en **Planeta**. Eso añade el extractor y su receta.
4. **Infraestructura**: deja **Auto** activado. Elige los hábitats más baratos que alojan a todos tus trabajadores.

> [!tip]
> En un planeta donde planifican muchos jugadores, un plan vacío ofrece una tarjeta «Empieza con una configuración típica en …» con los edificios y expertos que usan otros allí. Muestra lo que planifican otros, no lo que más gana, así que revisa las cifras antes de quedártela.

Más información: [Configuración de la base](/help/plan_base), [Producción y recetas](/help/plan_production#adding-buildings).

## 5. Lee los resultados {#step-5}

Las tarjetas de arriba se actualizan con cada cambio.

![Las tarjetas de resultados de un plan: Beneficio / día, Amortización, Mano de obra, Área y Almacenamiento, aquí con pérdidas y demasiada área en rojo](/images/help/guides/first-base-results.webp)

| Tarjeta             | Qué mirar                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Beneficio / día** | Positivo. Son los ingresos menos los materiales comprados, la [[degradation\|degradación]] y las [[production-fees\|tasas de producción]]. |
| **Amortización**    | Días hasta que la base se ha pagado sola. «nunca» significa que no da beneficio.                                                           |
| **Mano de obra**    | El rojo significa que un nivel tiene menos camas que trabajadores.                                                                         |
| **Área**            | La cifra usada se pone en rojo cuando la base necesita más área de la que dan tus permisos.                                                |
| **Almacenamiento**  | Días hasta que el almacenamiento se llena, lo que te dice cada cuánto debe venir una nave.                                                 |

La [[material-io|E/S de materiales]] de la derecha lista lo que la base produce y usa al día. Un Δ positivo se vende, uno negativo se compra. Una marca tras un material significa que el mercado quizá no absorba esa cantidad. Haz clic en ella para abrir la Revisión del plan.

> [!tip]
> Prueba un cambio cada vez y fíjate en **Beneficio / día**: otra receta, un edificio más o un lujo desactivado en **Mano de obra**. **Deshacer** (Ctrl+Z) revierte un cambio.

Detalles: [Resultados](/help/plan_results), [Revisión del plan](/help/plan_check#market-check).

## 6. Guarda el plan {#step-6}

1. Haz clic en el lápiz junto al nombre del plan y escribe un nombre.
2. Pulsa **Crear** (o Ctrl+S, Cmd+S en un Mac).

Cuando el estado dice «Guardado …», el menú lateral lista el plan en **Planes** siempre que muestre el imperio del plan. A partir de ahora cada guardado conserva una versión, y PRUNplanner guarda los cambios sin guardar como borrador, así que cerrar la pestaña no hace perder nada.

Más: [Guardado y versiones](/help/plan_saving).

## Siguientes pasos {#next}

- [Encontrar un planeta para un material](/help/guide_find_planet): saca el máximo partido a cada filtro de la Búsqueda de planetas.
- [Configurar tus precios](/help/guide_cx_prices): reglas de compra y venta, excepciones por planeta y precios fijos.
- [Crecer hasta un imperio](/help/guide_empire): para cuando planifiques tu segunda base.
