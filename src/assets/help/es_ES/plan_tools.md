Las herramientas de la página del plan convierten un [[plan|plan]] en listas de la compra y horarios de vuelo, y te dejan ver sus números más de cerca. En el diseño Standard son pestañas junto a **Producción**: **Construcción**, **Suministro**, **Visitas**, **Reparación**, **Beneficio**, **Revisión del plan** y **POPR**. El diálogo de [[cogm|COGM]] se abre desde cada receta, y el panel de depuración del cálculo está ahí para los informes de errores. [Revisión del plan](/help/plan_check) tiene su propio artículo, y esta página cubre el resto.

Cada herramienta responde a una pregunta sobre la base: qué comprar para construirla (Construcción), qué llevar para mantenerla en marcha (Suministro), cada cuánto tiene que venir una nave (Visitas), cuándo reparar (Reparación), de dónde sale el beneficio (Beneficio) y si el planeta tiene los trabajadores (POPR).

Una herramienta se carga la primera vez que abres su pestaña. Las herramientas trabajan con el plan tal como lo ves, cambios sin guardar incluidos, y ponen precio a los materiales con la [[exchange-preference|preferencia de bolsa]] del plan. Puedes mover o dividir las pestañas como cualquier otra parte de la página ([Diseño del plan](/help/plan_layout)). Los recuadros de resultados abren la herramienta que hay detrás: **Beneficio / día** abre Beneficio, **Amortización** abre Construcción y **Almacenamiento** abre Visitas.

## Construcción {#construction}

**Carrito de construcción** calcula lo que te queda por comprar antes de poder construir la base. Es tu [[construction-cart|carrito de construcción]]: los edificios que faltan por construir y los materiales que necesitan después de descontar lo que ya tienes en stock.

### Edificios {#construction-buildings}

La tabla **Edificios** tiene una fila por tipo de edificio del plan, incluidos los hábitats, el almacenamiento y el [[core-module|módulo central]].

| Columna                  | Qué muestra                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Construidos**          | Cuántos tienes ya en el planeta. Con [[fio\|FIO]] conectado empieza con el recuento de FIO para el planeta del plan, y puedes escribir tu propio número. |
| **Cantidad**             | Cuántos quedan por construir: **Planificados** − **Construidos**, nunca por debajo de 0. Puedes escribir otro número.                                    |
| **Planificados**         | Cuántos tiene el plan. El módulo central siempre cuenta como 1.                                                                                          |
| una columna por material | Los materiales de construcción para la **Cantidad** de esa fila. **Total de materiales** los suma.                                                       |

- Un número que escribes en **Construidos** muestra un lápiz («**Introducido por ti, no proviene de FIO**») y un botón para restablecerlo. **Restablecer construidos** los borra todos y vuelve a los recuentos de FIO.
- PRUNplanner guarda los recuentos de construidos que escribes por plan, con tus preferencias, en los planes que son tuyos y que has guardado. En un plan nuevo, un plan compartido o una versión anterior que estés viendo, solo duran mientras sigues en la página, y la herramienta dice «**Los recuentos de construidos no se guardan en este plan.**»
- Un recuento de **Construidos** por encima de **Planificados** se pone ámbar. Su **Cantidad** pasa a 0, así que esa fila no necesita materiales.
- Los valores de **Cantidad** que escribes no se guardan. Cambiar **Construidos** en una fila devuelve su **Cantidad** a **Planificados** − **Construidos**.
- Cuando los edificios (construidos más los que faltan) necesitan más trabajadores de un nivel de los que alojan sus hábitats, aparece un aviso junto a **Cantidad**: «**Una habitación insuficiente reducirá la eficiencia de producción.**» Los campos de **Cantidad** de los hábitats que alojan el nivel que falta se ponen en rojo. Significa que la base tendría menos camas que trabajadores de ese nivel. Añadir suficientes hábitats para él en la **Infraestructura** del plan quita el aviso (consulta [Configuración de la base](/help/plan_base#infrastructure)).
- Con FIO, un icono de aviso junto al título enumera los edificios que FIO tiene en el planeta y el plan no. Demuélelos en el juego, o el área, el alojamiento y los materiales de la base no coincidirán con el plan.

Debajo de la tabla, **Coste total**, **Peso total** y **Volumen total** cubren todo lo de la columna **Cantidad**, antes de descontar el stock, a los precios de compra del plan.

### Materiales por comprar {#construction-materials}

**Materiales por comprar** suma los materiales de todos los edificios y descuenta lo que tienes:

| Columna          | Qué muestra                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Material**     | El material de construcción.                                                                 |
| **Cantidad**     | Lo que necesitan todos los edificios de la columna **Cantidad**.                             |
| **Stock**        | Lo que contiene el almacenamiento de FIO elegido en **Almacenamiento**. Solo con FIO.        |
| **Stock manual** | Un número que escribes en lugar de **Stock**, para el stock que FIO no conoce. No se guarda. |
| **Necesidad**    | **Cantidad** − stock (o tu valor manual), nunca por debajo de 0.                             |

**Almacenamiento** ofrece todos los almacenamientos de FIO (las bases de tus planetas, almacenes y naves) o ninguno. Empieza con la base del planeta del plan. Los totales bajo la tabla cubren **Necesidad**.

Hay dos botones de XIT. El de arriba de la herramienta envía todo lo de **Total de materiales** e ignora el stock. El que está junto a **Almacenamiento** envía solo la **Necesidad**. Más en [Acciones de XIT](#xit).

> [!tip]
> ¿Vas a ampliar una base que ya tienes? Con FIO, **Construidos** empieza con lo que ya hay en el planeta, así que **Cantidad** y **Necesidad** cubren solo los edificios nuevos. El aviso de habitación sigue contando los antiguos y los nuevos juntos.

## Suministro {#supply}

**Carrito de suministro** enumera los consumibles de la [[workforce|mano de obra]] y los insumos de producción que la base en marcha necesita durante un número de días, menos lo que hay en stock. Es tu [[supply-cart|carrito de suministro]].

### Ajustes {#supply-settings}

| Ajuste                        | Por defecto                  | Qué hace                                                                                                                   |
| ----------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Qué materiales                | **Toda la base**             | **Toda la base**, **Producción** o **Mano de obra**: qué materiales se enumeran.                                           |
| **Duración del stock (días)** | 20                           | Cuántos días dura el suministro. Admite decimales. Es un único valor para todos los planes, guardado con tus preferencias. |
| **Almacenamiento**            | la base del planeta del plan | El almacenamiento de FIO cuyo stock se descuenta. Solo con FIO.                                                            |

El selector **Toda la base**, **Producción** o **Mano de obra** elige qué materiales se enumeran. Un material aparece en **Mano de obra** cuando lo usa la mano de obra, y en **Producción** cuando una receta lo usa o lo fabrica. Las cantidades siguen siendo la necesidad neta de toda la base.

### Columnas y totales {#supply-columns}

Carrito de suministro solo enumera los materiales que la base compra, es decir, los que usa en mayor cantidad de la que fabrica.

| Columna                          | Fórmula                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| **Ticker**                       | El material.                                                             |
| **Necesidad diaria**             | Lo que la base usa menos lo que fabrica, por día.                        |
| **Coste diario**                 | **Necesidad diaria** al precio de compra del plan, ȼ / día.              |
| **Stock**                        | Lo que contiene el almacenamiento elegido. Solo con FIO.                 |
| **Necesidad total**              | **Necesidad diaria** × días, redondeado hacia arriba.                    |
| **Necesidad final**              | **Necesidad total** − **Stock**, nunca por debajo de 0.                  |
| t, m³                            | Peso y volumen de la **Necesidad final**.                                |
| **Mano de obra**, **Producción** | Si la mano de obra usa el material, o si una receta lo usa o lo fabrica. |

Por ejemplo (números inventados), a una base a la que le faltan 4,33 DW al día con 20 días configurados le sale una **Necesidad total** de 4,33 × 20 = 86,6, redondeado a 87. Con 30 en stock, la **Necesidad final** es 87 − 30 = 57.

Debajo de la tabla tienes **Coste diario**, **Coste total** (la **Necesidad final** al precio de compra del plan), **Peso total** y **Volumen total**. «Más opciones en FIO Consumo» abre [FIO Consumo](/fio/burn) ([ayuda](/help/fio_burn)), que planifica el suministro de todas las bases de un imperio a la vez.

### XIT y XIT inicial {#supply-xit}

- El botón de XIT envía la **Necesidad final** de los materiales enumerados: lo que la base en marcha aún necesita una vez que su propia producción cubre una parte.
- **XIT inicial** (su panel se titula **Carrito de suministro (inicial)**) es para el primer suministro, cuando aún no se produce nada. Envía el insumo completo de cada material × días, redondeado hacia arriba, menos el stock, y eso incluye los materiales que el propio plan fabrica. Sigue la elección de **Toda la base**, **Producción** o **Mano de obra**, así que envía los insumos propios de la mano de obra o de la producción, o ambos.

> [!tip]
> ¿Empiezas una base nueva? Usa **XIT inicial** para el primer vuelo. El XIT normal descuenta lo que fabrica la base, así que una base que fabrica su propio DW o RAT llegaría sin nada.

## Acciones de XIT {#xit}

Los botones de XIT de Construcción, Suministro y Reparación abren un panel con un paquete de [[xit|XIT]] para [Refined PrUn](https://github.com/refined-prun/refined-prun), la extensión del navegador para el juego. Refined PrUn lo ejecuta con su comando XIT ACT, así que no tienes que copiar cantidades a mano. PRUNplanner solo prepara el paquete, de modo que no pasa nada en el juego hasta que lo ejecutas allí.

| Campo             | Por defecto                | Qué hace                                                                                                                                                                                          |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origen**        | **Configurar al ejecutar** | De dónde salen los materiales: uno de los seis almacenes de estación (Antares, Arclight, Benten, Hortus, Hubur, Moria), o se elige al ejecutar el paquete.                                        |
| **Comprar en CX** | activado                   | Añade un paso que compra los materiales en la bolsa de esa estación antes del traslado. «**Solo el origen almacén permite comprar.**» Con **Configurar al ejecutar** la casilla está desactivada. |
| **JSON**          |                            | El paquete. **Copiar** lo pone en el portapapeles.                                                                                                                                                |

Debajo de los campos, una tabla enumera cada material y su cantidad, sin los materiales con cantidad 0. El paquete se llama «PRUNplanner» más la herramienta (por ejemplo «PRUNplanner Supply Cart»), y el destino siempre lo eliges al ejecutarlo. **Origen** y **Comprar en CX** se guardan con tus preferencias y los comparten todos los botones de XIT, incluidos FIO Consumo y FIO Reparación.

## Visitas {#visits}

**Frecuencia de visitas** te dice cuándo se llena el almacenamiento de la base y cada cuánto tiene que pasar una nave. Los números de [[visitation|visitas]] cuentan los materiales que la base vende (exportación) y compra (importación), por día.

### Almacenamiento {#visits-storage}

La frase de arriba da la capacidad de la base: sus propias 1.500 t y 1.500 m³ más los edificios de [[storage|almacenamiento]] del plan.

| Edificio | t      | m³     |
| -------- | ------ | ------ |
| STO      | 5.000  | 5.000  |
| STA      | 2.500  | 2.500  |
| STE      | 10.000 | 10.000 |
| STV      | 2.500  | 7.500  |
| STW      | 7.500  | 2.500  |

La tabla muestra, en t y m³ por día:

- **Importar**: lo que la base compra, es decir, los materiales que usa en mayor cantidad de la que fabrica.
- **Exportar**: lo que fabrica en mayor cantidad de la que usa.
- **Tramo mayor**: el mayor de los dos, que es lo que lleva una nave en su tramo más cargado. El peso y el volumen se comparan por separado.
- **Almacenamiento lleno**: capacidad ÷ **Tramo mayor**, en días, para lo que se agote antes, el peso o el volumen.

La lista de exclusiones deja materiales fuera de esta herramienta, para los que vendes o compras en el propio planeta (mercado local, contratos). Busca tickers y elígelos. La lista se guarda por plan con tus preferencias. En un plan nuevo o compartido dura lo que dura la visita.

> [!warning]
> El recuadro de resultados **Almacenamiento** cuenta todos los materiales e ignora tus materiales excluidos. En cuanto configuras exclusiones, sus días y el **Almacenamiento lleno** de aquí difieren.

### Envíos {#visits-shipping}

Hay una fila por tamaño de nave: 500 t / 500 m³, 1.000 t / 1.000 m³, 2.000 t / 2.000 m³, 1.000 t / 3.000 m³, 3.000 t / 1.000 m³ y 5.000 t / 5.000 m³ (**Nave t**, **Nave m³**). Las exportaciones y las importaciones tienen cada una:

- **Visita (días)**: cuántos días de exportaciones (o importaciones) llenan esa nave. Es el menor entre t de la nave ÷ t por día y m³ de la nave ÷ m³ por día.
- **Límite**: cuál se agota antes, t o m³.

Por ejemplo (números inventados), unas exportaciones de 100 t y 50 m³ al día llenan la nave de 1.000 t / 1.000 m³ en 1.000 ÷ 100 = 10 días por peso y en 1.000 ÷ 50 = 20 días por volumen. Su **Visita (días)** es 10 y su **Límite** es t.

> [!tip]
> Una nave debería pasar al menos tan a menudo como el menor de **Almacenamiento lleno** y las dos **Visita (días)** de la nave. Si esperas más, el almacenamiento se desborda, las exportaciones ya no caben en una carga o las importaciones se acaban. Los tamaños de [[cargo-bays|bodega de carga]] del juego te dicen cuál es tu fila.

## Reparación {#repair}

**Análisis de reparaciones** encuentra el mejor intervalo de [[repair|reparación]] para cada tipo de edificio de producción, es decir, cuántos días esperar entre reparaciones para que la base dé el máximo beneficio. Deja fuera los hábitats, el almacenamiento y el módulo central.

### Cómo se calcula {#repair-calculation}

Los edificios se desgastan. Su condición, y con ella su producción, baja del 100 % al 33 % con el tiempo: despacio al principio, lo más rápido hacia el día 100, y luego se estabiliza. Una reparación la restablece, pero la factura crece cuanto más esperas. El día _n_ cada material de construcción cuesta su cantidad menos ⌊cantidad × (180 − _n_) ÷ 180⌋, así que la factura crece hasta el día 180, cuando equivale a los materiales de un edificio nuevo.

Por ejemplo, un material con una cantidad de 10 cuesta 10 − ⌊10 × 135 ÷ 180⌋ = 10 − 7 = 3 el día 45, y 10 − ⌊10 × 90 ÷ 180⌋ = 10 − 5 = 5 el día 90. Reparar a menudo mantiene alta la producción pero cuesta una factura cada vez, y esperar hace cada factura más grande mientras la producción baja. La herramienta pondera las dos cosas.

Para cada intervalo de 1 a 180 días, PRUNplanner calcula por edificio y día:

1. _Producción_: el valor de producción del edificio en condición completa (valor de producción menos insumos y [[production-fees|tasas de producción]], según el plan) × su condición media durante el intervalo.
2. menos su coste de mano de obra por día.
3. menos la factura de reparación de ese intervalo repartida entre los días del intervalo (factura ÷ (_n_ + 1)).

El intervalo con el mayor beneficio es el mejor. El _rango bueno_ es la serie de días a su alrededor cuyo beneficio está a menos de un 1 % del mejor. PRUNplanner pone precio a los materiales de reparación con los precios de compra del plan.

Los números propios del plan ([Resultados](/help/plan_results)) cargan en cambio la [[degradation|degradación]] como 1/180 del coste de construcción por día. «**Beneficio con estas reparaciones**» cuenta el coste real de reparación en cada intervalo.

### Qué muestra {#repair-view}

- Arriba ves «**Beneficio con estas reparaciones**» para todo el plan en ȼ / día, con «**todo en el óptimo**» o cuánto se aleja de tenerlo todo en el óptimo. Al lado están **Coste de reparación** en ȼ / día (o **Próxima reparación** con FIO, ver abajo) y «**Una reparación de cada edificio**» en ȼ, t y m³.
- **Edificios** enumera cada tipo, empezando por la reparación más cara: **Óptimo (bueno)** (el mejor intervalo y su rango bueno), **Intervalo (d)** (el tuyo, que empieza en el óptimo), **ȼ/día** en ese intervalo y **Rango bueno** (o **Próxima** con FIO).
- Haz clic en un edificio para abrir su detalle. Muestra el beneficio con tu intervalo y cómo se compara con el óptimo, la **Factura de reparación**, la **Condición al reparar** y la producción media. **Reparar cada** tiene un campo, un deslizador (1–180 días) y selecciones rápidas (**Óptimo · {n} d**, 30, 60 y 90 días). El detalle también enumera los materiales de una reparación de todos los edificios de ese tipo.
- En los gráficos, **Beneficio por día, según el intervalo de reparación** marca el rango bueno, y en **Por qué {best} días: coste de reparación frente a producción perdida** el total más bajo es el mejor intervalo. También está **Condición del edificio**.

Los intervalos que configuras no se guardan. **Restablecer todo al óptimo** vuelve a los mejores intervalos.

### Con FIO {#repair-fio}

Con FIO conectado, el detalle enumera tus edificios de ese tipo en el planeta del plan («**Tu {ticker} en {planet} (FIO)**»). Cada uno muestra los días desde su última reparación, su condición y una etiqueta de vencimiento según tu intervalo: **Vencido hace {n} d**, **Vence hoy**, **Vence en {n} d** (en 7 días o menos, ámbar) o **En {n} d**. Un edificio que FIO indica como nunca reparado muestra «**nunca reparado**» y no recibe etiqueta. Arriba aparece **Próxima reparación** en lugar de **Coste de reparación**, más «**Última actualización de FIO: {when}**», con una nota cuando tiene más de un día.

**XIT para los pendientes** envía los materiales de reparación, tal como los indica FIO, para cada edificio vencido o que vence en 7 días o menos ([Acciones de XIT](#xit)). Sin FIO, una nota enlaza a «**Configura FIO en tu perfil**». En un plan compartido la parte de FIO está oculta, porque los datos de FIO serían los tuyos, no los del propietario.

> [!tip]
> [FIO Reparación](/help/fio_repair) usa el mejor intervalo de cada tipo de edificio de esta herramienta para los planes que asocia a tus bases. Prepara el plan aquí y luego planifica allí los vuelos de reparación.

## Beneficio {#profit}

**Desglose del beneficio** muestra adónde va el valor de producción de cada día, en ȼ / día según la preferencia de bolsa del plan. No añade nada nuevo: sus pasos terminan en el [[profit|beneficio]] del plan por día.

Un selector elige **Por tipo de coste** (por defecto) o **Por edificio**. PRUNplanner mantiene tu elección hasta que recargas la página.

### Por tipo de coste {#profit-cost-type}

Una cascada, que se lee de izquierda a derecha:

| Paso                      | Qué es                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Valor de producción**   | Lo que la base fabrica en mayor cantidad de la que usa, a los precios de venta del plan.                                                                                     |
| **Insumos de producción** | Lo que la base compra para sus recetas, a los precios de compra del plan.                                                                                                    |
| **Mano de obra**          | Lo que la base compra para su mano de obra. Un material que usan ambos va a **Mano de obra** hasta lo que consumen los trabajadores, y el resto a **Insumos de producción**. |
| **Degradación**           | El desgaste de los edificios de producción: su coste de construcción ÷ 180 por día.                                                                                          |
| **Tasas de producción**   | Las tasas del planeta por la especialización de los edificios. Solo aparece cuando el planeta cobra alguna.                                                                  |
| **Beneficio diario**      | Lo que queda: el beneficio del plan por día.                                                                                                                                 |

PRUNplanner compensa los materiales en toda la base, así que un material que la base fabrica y usa solo cuenta con su excedente o su déficit. Los pasos de producción, insumos, mano de obra y tasas muestran sus tres materiales más grandes (edificios, en el caso de las tasas) y «+{n} más». Pasa el ratón por una parte para ver **Producido / día** o **Consumido / día**, **Precio**, **ȼ / día** y **Parte de la producción**.

Una tasa de producción es la tasa del planeta por la especialización del edificio, promediada entre los trabajadores del edificio según su número. Se cobra por día al 100 % y escala con la [[efficiency|eficiencia]] del edificio, igual que su producción.

### Por edificio {#profit-building}

Cada tipo de edificio tiene un paso: su producción menos sus propios insumos y mano de obra, con precio por separado, antes de degradación y tasas. Se muestran los siete más grandes, y el resto se suma como «{n} edificios más». **Sin atribuir** contiene lo que no se puede asignar a un solo edificio: la mano de obra de todo el plan y los materiales que se intercambian entre edificios. Luego vienen **Degradación**, **Tasas de producción** y **Beneficio diario**, como arriba.

### Cifras clave {#profit-key-figures}

- **Valor de producción**, **Costes incl. degradación y tasas** (insumos de producción + mano de obra + degradación + tasas de producción) y **Margen** (beneficio diario ÷ valor de producción). Por ejemplo, 10.000 ȼ de valor de producción y 2.500 ȼ de beneficio diario dan un margen del 25 %. El margen sale en rojo cuando el plan pierde dinero.
- El material que aporta la mayor parte del valor de producción. Su precio decide el plan.
- El mayor coste individual entre los insumos de producción y la mano de obra, como parte del valor de producción.
- La parte de los consumibles de la mano de obra en el valor de producción, con los dos más grandes.

> [!tip]
> Cuando una sola producción aporta la mayor parte del valor, comprueba lo profundo que es su mercado en [Revisión del plan](/help/plan_check#market-check) antes de construir.

## POPR {#popr}

**Último informe de población** pone la mano de obra del planeta según el último [[popr|informe de población]] del juego junto a lo que necesita el plan. El juego publica el informe cada semana. Solo ves la pestaña si has iniciado sesión.

El gráfico «**Trabajadores libres junto a lo que necesita este plan**» tiene una fila por nivel. La barra son los trabajadores libres menos los empleos que otras bases ya tienen abiertos, nunca por debajo de 0. La línea es lo que necesita el plan. Una barra es verde cuando cubre la necesidad, roja cuando no, y gris cuando el plan no necesita ninguno de ese nivel.

Por ejemplo (números inventados), con 500 pioneros libres y 200 empleos de pionero sin cubrir, la barra muestra 300. Un plan que necesita 250 pioneros recibe una barra verde y un ✓ en «Revisión del plan», y uno que necesita 400 recibe una barra roja y un ✗.

La tabla tiene una columna por nivel (de Pionero a Científico):

| Fila                   | Qué muestra                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Población total**    | El valor de _próxima población_ de FIO para el nivel.                                                                    |
| **Población libre**    | Trabajadores sin empleo.                                                                                                 |
| **Población libre %**  | La tasa de desempleo × 100 (se muestra sin el signo %).                                                                  |
| **Empleos sin cubrir** | Empleos que otras bases tienen abiertos.                                                                                 |
| «Necesidad del plan»   | Trabajadores que necesita este plan.                                                                                     |
| «Revisión del plan»    | ✓ cuando el plan no necesita ninguno, o cuando los trabajadores libres menos los empleos sin cubrir cubren la necesidad. |

Sin informe, la pestaña dice «**Aún no hay informe de población para este planeta.**»

> [!tip]
> Un ✗ en «Revisión del plan» significa que competirías por trabajadores con bases que ya los están esperando. Planifica con menos trabajadores de ese nivel, o vuelve a comprobarlo tras el próximo informe.

## COGM {#cogm}

El botón **COGM** de cada fila de receta en [Producción](/help/plan_production) abre **Coste de bienes fabricados**: lo que te cuesta fabricar una unidad de cada salida en este plan. Usa la eficiencia, el tiempo de ejecución, la degradación, las tasas de producción, los precios de los insumos y la mano de obra del plan.

### El cálculo {#cogm-calculation}

| Fila                                            | Fórmula                                                                                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución de la receta y su «% / día» | El tiempo de la receta ÷ la eficiencia del edificio, y su parte de un día (_parte de ejecución_).                                                                                                  |
| **Eficiencia**                                  | La eficiencia del edificio en este plan.                                                                                                                                                           |
| **Degradación**                                 | Coste de construcción ÷ 180 × parte de ejecución.                                                                                                                                                  |
| **Tasa de producción / ciclo**                  | La tasa de producción del edificio por día al 100 % × el tiempo base de la receta ÷ 1 día. Ignora la eficiencia. Por ejemplo, 35 ȼ por día y una receta de 6 h dan 35 × 6 ÷ 24 = 8,75 ȼ por ciclo. |
| Insumos, **Total de insumos**                   | La cantidad de cada insumo × el precio de compra del plan. Una etiqueta indica de dónde sale cada precio y abre esa regla en [Bolsas](/help/exchanges).                                            |
| **Mano de obra**                                | El coste diario de mano de obra del edificio × parte de ejecución. Los trabajadores sin alojamiento y los lujos desactivados no cuestan nada.                                                      |
| **Coste total**                                 | Degradación + tasa de producción + insumos + mano de obra.                                                                                                                                         |
| Beneficio de la receta                          | Las salidas a los precios de venta del plan − **Coste total**.                                                                                                                                     |

Para cada salida:

- **Coste total**: **Coste total** ÷ la cantidad de esa salida, así que cada salida carga con todo el coste. Este es el COGM que PRUNplanner usa en otras partes.
- **Reparto del coste**: **Coste total** ÷ todas las salidas juntas, lo que reparte el coste según la cantidad.
- Una línea debajo da el precio de mercado de la salida y cuánto se aleja el COGM de ella, en %. Muestra si fabricar el material aquí cuesta más o menos que su precio de mercado.

Por ejemplo (números inventados), un ciclo con un **Coste total** de 1.200 ȼ que fabrica 4 de un material y 2 de otro da un **Coste total** de 1.200 ÷ 4 = 300 ȼ y 1.200 ÷ 2 = 600 ȼ, y un **Reparto del coste** de 1.200 ÷ 6 = 200 ȼ para ambos.

### Usar el COGM como precio de compra {#cogm-buy-price}

Cuando el imperio del plan tiene una preferencia de bolsa, se abre un segundo panel junto a la tabla: **Precios en {name}**, con el nombre de la preferencia (**Abrir en Bolsas** la abre). Sin ella, una nota dice que los precios son Universe · VWAP 30D, con **Defínela en Gestión**.

Para cada salida muestra **COGM aquí ({planet})**, **Mercado · {source}** (el precio de compra de mercado sin precios fijos) y **Precio de compra, todos los planetas** (tu precio de compra [[fixed-price|fijo]], o **no fijado**). Después:

- **Usar como precio de compra en todos los planetas** (cuando no hay precio fijo) pone como precio de compra de la salida el COGM de este plan, para todos los planetas de esta preferencia.
- Cuando hay un precio fijo y se aleja más de un 2 % del COGM actual, ves «**El precio de compra fijado difiere un {diff} % del COGM actual**» («Los insumos o la eficiencia han cambiado desde que se fijó.») con **Actualizar a {value}**.
- Si no, dice **El precio de compra coincide con el COGM**.

Una línea dice qué planes de la preferencia compran el material, ya que el cambio se aplica a todos los planes que la usan. **Precios fijos** debajo enumera los precios fijos de la preferencia para **Todos los planetas** o para este planeta, y puedes editarlos ahí mismo. No se guarda nada hasta que haces clic en **Guardar cambios** en la barra de abajo (o **Descartar**). [Precios fijos y COGM](/help/exchanges#fixed-prices-and-cogm) explica los precios fijos.

> [!tip]
> ¿Usas tu propia producción en otra base? Un precio de compra fijo al COGM le pone el precio de lo que te cuesta a ti en vez del mercado, así que el otro plan muestra su margen real. En una receta con un [[byproduct|subproducto]], **Coste total** da a cada salida todo el coste. Compáralo con **Reparto del coste** antes de fijarlo.

## Depuración del cálculo {#debug}

La depuración del cálculo enumera cada paso del cálculo del plan con su fórmula y sus datos de entrada. Está pensada para los informes de errores: cuando un número parece incorrecto, muestra de dónde sale. Permanece oculta hasta que la activas, y solo está en inglés.

**Cómo activarla y desactivarla:**

- Añade `?debug=calc` a cualquier dirección de PRUNplanner (por ejemplo `https://prunplanner.org/?debug=calc`) para activarla, y `?debug=off` para desactivarla. El parámetro desaparece de la dirección enseguida, así que un enlace que compartas nunca lo lleva.
- O marca «Calculation debug» en la página `/debug` (con la sesión iniciada).
- O haz clic en «Turn off» en el panel.

El ajuste se guarda en este navegador y se aplica a todas sus pestañas. Una vez activado, el menú **Más** de la página del plan (⋯ en la cabecera) tiene «Calculation debug». Ctrl más la tecla a la izquierda del 1 (`` ` `` en un teclado de EE. UU., ⌘ en lugar de Ctrl en un Mac) lo abre y lo cierra, salvo que estés escribiendo en un campo.

**Qué muestra el panel:** el panel está debajo del plan, y puedes cambiar su tamaño desde el borde superior.

- Una línea de estado: cuándo se recalculó por última vez, cuánto tardó, el número de pasos y cuántas autocomprobaciones pasan.
- Botones para mostrar u ocultar cada fase del cálculo (entrada, infraestructura, mano de obra, área, expertos, producción, COGM, E/S de materiales, precios, construcción, finanzas y visitas), un «Filter» por edificio, ticker o etiqueta, y «Issues only».
- Las autocomprobaciones, los avisos que haya y los datos del plan tal como los enviaría un guardado, incluido si tiene cambios sin guardar.
- «Copy text» y «Copy JSON» copian toda la traza con la versión de la app, el plan, el planeta, la preferencia de bolsa y el imperio.

> [!tip]
> ¿Vas a informar de un número incorrecto? Abre el plan, activa la depuración del cálculo, haz clic en «Copy text» y pégalo en tu informe. Contiene los datos de tu plan, así que compártelo solo donde no te importe.
