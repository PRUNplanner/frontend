Los términos del juego y de planificación que usa PRUNplanner, por orden alfabético. El primer párrafo de cada entrada es la definición breve que ves al pasar el ratón por encima del término en un artículo. El resto explica cómo lo calcula o lo muestra PRUNplanner y dónde leer más.

## Área y permisos {#area-permits}

El área útil de una base es 250 más 250 por cada permiso que usa, así que un permiso da las 500 de área habituales. El módulo central siempre ocupa 25 de ellas.

Cada edificio ocupa área, y un plan muestra cuánta está usada y cuánta libre. En el juego, cada mejora de nivel de la HQ te da un permiso de base más. Cadenas de producción planifica bases con 1 a 3 permisos, es decir, 500, 750 o 1.000 de área. Consulta [Cadenas de producción](/help/tools_production_chain#bases).

## Ask {#ask}

El precio más bajo que pide ahora mismo un vendedor en una bolsa. Si compras al instante, pagas el ask. Sin ask significa que ahora mismo nadie vende el material allí.

La Revisión del plan muestra «Sin ofertas» cuando un plan compra un material en una bolsa sin ask. Tu preferencia de bolsa puede usar el ask como base de precio. Consulta [Revisión del plan](/help/plan_check#flags) y [Base de precio](/help/exchanges#price-basis-vwap-ask-and-bid).

## Bid {#bid}

El precio más alto que ofrece ahora mismo un comprador en una bolsa. Si vendes al instante, te llevas el bid. Sin bid significa que ahora mismo nadie compra el material allí.

La Revisión del plan muestra «Sin compradores» cuando un plan vende un material en una bolsa sin bid. Tu preferencia de bolsa puede usar el bid como base de precio. Consulta [Revisión del plan](/help/plan_check#flags).

## Consumo (burn) {#burn}

Cuántos días dura el stock de un material en una base: el stock de tu almacenamiento en FIO ÷ lo que la base gasta al día. Un material del que la base produce tanto como gasta nunca se agota.

FIO Consumo colorea un material de rojo con 5 días o menos y de amarillo con 10 días o menos por defecto. Puedes cambiar ambos umbrales en la página FIO Consumo o en tu Perfil. El consumo necesita tus datos de FIO. Consulta [FIO Consumo](/help/fio_burn#calculations).

Por ejemplo, una base con 300 unidades de un material en stock que gasta 40 al día y produce 10 al día consume 30 netas al día, así que el stock dura 300 ÷ 30 = 10 días. Con los umbrales por defecto (rojo 5, amarillo 10 días) eso es amarillo, todavía no rojo.

## Subproducto {#byproduct}

Una segunda salida de una receta, que se produce junto al material para el que se ejecuta la receta.

Por defecto, Cadenas de producción usa primero un subproducto para las necesidades de la propia cadena y vende el resto. Consulta [Cadenas de producción](/help/tools_production_chain#settings).

## Bodegas de carga {#cargo-bays}

Los tamaños de nave que usa ROI de bases para comprobar si la carga de una base cabe en una visita de nave, expresados en peso y volumen.

| Nave | Peso    | Volumen  |
| ---- | ------- | -------- |
| TCB  | 100 t   | 100 m³   |
| VSC  | 250 t   | 250 m³   |
| SCB  | 500 t   | 500 m³   |
| MCB  | 1.000 t | 1.000 m³ |
| LCB  | 2.000 t | 2.000 m³ |
| WCB  | 3.000 t | 1.000 m³ |
| VCB  | 1.000 t | 3.000 m³ |
| HCB  | 5.000 t | 5.000 m³ |

El ajuste para principiantes de ROI de bases usa la SCB como nave inicial. Consulta [ROI de bases](/help/tools_base_roi#settings).

## COGC {#cogc}

El programa de la Cámara de Comercio Global que está activo en un planeta. Un programa de publicidad acelera un 25 % los edificios de una especialización, y un programa de mano de obra acelera un 10 % los edificios que emplean ese nivel de mano de obra.

En el juego, los residentes (los jugadores con una base en el planeta) votan el programa, y el ganador está activo durante una semana. Eliges el programa en los ajustes de planeta de un plan, y la Búsqueda de planetas puede filtrar por él. Consulta [Búsqueda de planetas](/help/planet_search#cogc-and-infrastructure).

## COGM {#cogm}

Coste de los bienes fabricados (cost of goods manufactured): lo que cuesta en un plan una unidad de la salida de una receta, a partir de los precios de los insumos, la mano de obra, el desgaste, las tasas de producción, la duración y la eficiencia.

El coste de una ejecución es su parte del desgaste diario y del coste diario de mano de obra del edificio, más sus insumos y su tasa de producción. Esa parte es lo que tarda la ejecución con la eficiencia del edificio ÷ 24 h.

Un ejemplo inventado: una receta tarda 12 h al 100 % de eficiencia, así que su parte es 12 ÷ 24 = 0,5. El edificio costó 18.000 ȼ de construir, así que su desgaste es 18.000 ÷ 180 = 100 ȼ al día, y a la ejecución le tocan 50 ȼ. Su mano de obra cuesta 400 ȼ al día, así que a la ejecución le tocan 200 ȼ. Con 1.000 ȼ de insumos y una tasa de 50 ȼ, la ejecución cuesta 50 + 200 + 1.000 + 50 = 1.300 ȼ. Si produce 10 unidades, el COGM es 1.300 ÷ 10 = 130 ȼ por unidad.

Cuando una receta tiene varias salidas, PRUNplanner reparte el coste según la cantidad o lo carga entero a cada salida. Un COGM también puede convertirse en un precio fijo de tu preferencia de bolsa. Consulta [Herramientas del plan](/help/plan_tools) y [Precios fijos y COGM](/help/exchanges#fixed-prices-and-cogm).

Si la misma ejecución produjera 10 unidades de una salida y 5 de un subproducto, el reparto carga 1.300 ÷ 15 ≈ 86,67 ȼ a cada unidad de ambas. Cargarlo entero da 1.300 ÷ 10 = 130 ȼ por unidad a la primera salida y 1.300 ÷ 5 = 260 ȼ por unidad al subproducto.

## Carrito de construcción {#construction-cart}

Una herramienta del plan que lista los materiales que aún tienes que comprar para los edificios del plan, descontando los edificios que ya están en pie en la base.

Los edificios en pie salen de tus datos de FIO, o los introduces tú. Obtienes la lista como tabla o como acción de XIT. Consulta [Herramientas del plan](/help/plan_tools).

## Módulo central {#core-module}

El edificio central de toda base. Ocupa 25 de área de la base, y los planes siempre lo cuentan entre los edificios que hay que construir.

También se le llama CM.

## Sede corp. {#corp-hq}

La sede de la corporación a la que perteneces, cuando está en el planeta del plan. No es la HQ de tu propia empresa. Acelera un 10 % todos los edificios del plan.

Actívala en los ajustes de planeta de un plan. Consulta [Configuración de la base](/help/plan_base). La sede de tu propia empresa es otra cosa, que se explica en Nivel de HQ.

## Créditos (ȼ) {#currency}

El dinero del juego. PRUNplanner muestra todos los precios, costes y beneficios en créditos, escritos ȼ.

Las tasas de producción se fijan en la moneda del planeta. PRUNplanner las suma a los costes uno a uno como ȼ.

## CX {#cx}

Una bolsa de comercio (commodity exchange), uno de los mercados del juego gestionados por jugadores, cada uno con su propio libro de órdenes. Los precios y volúmenes de PRUNplanner cubren AI1, CI1, IC1 y NC1.

AI1 está en Antares, CI1 en Benten, IC1 en Hortus y NC1 en Moria. Mercado en vivo también muestra CI2 (Arclight) y NC2 (Hubur), y las acciones de XIT pueden partir de sus almacenes. El comercio fuera de la CX, en mercados locales o por contrato, no está en estos datos. Consulta [Bolsas](/help/exchanges).

## Degradación {#degradation}

Los edificios se desgastan con el tiempo. Los planes lo cargan como un coste diario de 1 ⁄ 180 del coste de construcción de los edificios de producción.

Por ejemplo, unos edificios de producción que cuestan 180.000 ȼ de construir suman 180.000 ÷ 180 = 1.000 ȼ al día al coste del plan.

La degradación cuenta en el coste y el beneficio de un plan, y en el COGM. También se le llama desgaste. Consulta Reparación para ver cómo funcionan la condición y los costes de reparación.

## Eficiencia {#efficiency}

Lo rápido que produce un edificio en comparación con el tiempo base de su receta. Al 100 % ejecuta una receta en su tiempo base, y al 125 % en el 80 % de ese tiempo.

La eficiencia de un edificio es el producto de sus factores: fertilidad (solo granjas), Sede corp., COGC, expertos, mano de obra y facción. Un plan muestra cada factor de cada edificio. Consulta [Configuración de la base](/help/plan_base).

Por ejemplo, un edificio con el programa de publicidad del COGC para su especialización (× 1,25), una Sede corp. (× 1,1) y trabajadores bien alojados con ambos lujos (× 1), sin otros factores, funciona a 1,25 × 1,1 × 1 = 1,375, es decir, al 137,5 %. Una receta con un tiempo base de 10 h tarda entonces 10 ÷ 1,375 ≈ 7,3 h.

## Imperio {#empire}

Un grupo con nombre de tus planes, con una facción y un número de permisos. La facción y los permisos dan a cada plan su bonificación de facción, y la preferencia de bolsa del imperio pone precio a todos sus planes.

Un plan puede pertenecer a varios imperios, y sus cifras dependen del imperio en el que lo abras. Los imperios se crean y editan en Gestión. Consulta [Gestión](/help/management#empires).

## Preferencia de bolsa {#exchange-preference}

Tus reglas para los precios que usan los planes: qué bolsa y qué base de precio (VWAP 7D, VWAP 30D, ask o bid), más precios fijos para materiales concretos. Asignas una a un imperio.

Una regla puede aplicarse a la compra, a la venta o a ambas, y a todos los planetas o a uno. PRUNplanner usa la primera regla que coincide, en este orden: un precio fijo de planeta, un precio fijo de todos los planetas, una regla de bolsa de planeta, una regla de bolsa de todos los planetas. Si ninguna coincide, usa el VWAP 30D de Universe. También se le llama preferencia de CX o Default CX. Consulta [Cómo se obtiene un precio](/help/exchanges#how-a-price-is-found).

## Especialización {#expertise}

El campo de un edificio de producción: Agricultura, Química, Construcción, Electrónica, Industria Alimenticia, Refinamiento de Combustible, Fabricación, Metalurgia o Extracción de Recursos.

Los expertos, los programas de publicidad del COGC y las bonificaciones de facción actúan cada uno sobre los edificios de una especialización.

## Expertos {#experts}

Especialistas de una base que aceleran sus edificios de una especialización. Llegan con el tiempo por tener en marcha los edificios de producción de esa especialización, y con más edificios llegan antes.

| Expertos | Aceleración |
| -------- | ----------- |
| 1        | 3,06 %      |
| 2        | 6,96 %      |
| 3        | 12,48 %     |
| 4        | 19,74 %     |
| 5        | 28,4 %      |

Un plan admite como mucho 5 expertos por especialización, y avisa cuando una base tiene más de 6 en total. Consulta [Configuración de la base](/help/plan_base).

## Materiales de construcción adicionales {#extra-building-materials}

Materiales que un planeta añade a la construcción de cada edificio por su superficie, gravedad, presión o temperatura.

| Planeta                  | Material adicional |
| ------------------------ | ------------------ |
| Superficie rocosa        | MCG                |
| Gaseoso (sin superficie) | AEF                |
| Gravedad baja            | MGC                |
| Gravedad alta            | BL                 |
| Presión baja             | SEA                |
| Presión alta             | HSE                |
| Temperatura baja         | INS                |
| Temperatura alta         | TSH                |

Aumentan el coste de construcción de un plan. La Búsqueda de planetas los muestra para cada planeta. Consulta [Búsqueda de planetas](/help/planet_search#reading-the-results).

## Extracción {#extraction}

Sacar un recurso de un planeta con un EXT (minerales), un RIG (líquidos) o un COL (gases). La cantidad por ejecución depende de la tasa diaria del planeta para ese recurso.

Una ejecución rinde la tasa diaria del planeta × una parte del día (12 h para EXT, 4,8 h para RIG, 6 h para COL), redondeada hacia arriba a unidades enteras. Tarda lo que esa cantidad necesita a la tasa diaria. Así que una ejecución puede durar algo más que su parte, y la producción diaria coincide con la tasa del planeta.

Por ejemplo, con una tasa diaria de 7 para un mineral, una ejecución de EXT rinde 7 × 12 ÷ 24 = 3,5, redondeado a 4 unidades, y tarda 4 ÷ 7 de día, unas 13,7 h. Cuatro unidades cada 13,7 h suman las 7 al día del planeta.

## Facción {#faction}

La facción de tu empresa, que se fija por imperio. Los edificios de la especialización de la facción reciben una bonificación que crece cuantos menos permisos tuyos uses.

| Facción         | Bonificación base                                                          |
| --------------- | -------------------------------------------------------------------------- |
| Antares         | Electrónica 5 %                                                            |
| Benten          | Fabricación 5 %                                                            |
| Hortus          | Agricultura 3 %, Industria Alimenticia 2 %                                 |
| Moria           | Metalurgia 2 %, Construcción 3 %                                           |
| Fuera de región | Química, Refinamiento de Combustible y Extracción de Recursos 2 % cada una |
| Sin facción     | ninguna                                                                    |

PRUNplanner multiplica la bonificación base por 2 × (3 − 2 × permisos usados ÷ permisos totales), según los permisos del imperio. Con todos los permisos usados eso es × 2, así que Antares da a Electrónica un 10 %. Con un tercio usado, es aproximadamente × 4,67.

## Fertilidad {#fertility}

Una propiedad del planeta que solo usan las granjas (FRM y ORC). Más fertilidad las hace más rápidas, y un planeta sin fertilidad no puede tenerlas en marcha.

El factor de fertilidad de una granja es 1 + fertilidad × 10 ⁄ 33. La Búsqueda de planetas puede filtrar por fertilidad. Consulta [Búsqueda de planetas](/help/planet_search#planet-conditions).

## FIO {#fio}

La API de la comunidad que replica los datos del juego. Con tu nombre de usuario y tu clave API de FIO en tu Perfil, PRUNplanner también lee tu almacenamiento, tus sitios y tus naves.

Los datos del juego y de las bolsas de PRUNplanner vienen de FIO. FIO Consumo, FIO Reparación y los carritos del plan usan tus propios datos de FIO. Consulta [Perfil](/help/profile).

## Precio fijo {#fixed-price}

Un precio que fijas tú mismo para un material en una preferencia de bolsa, para la compra, la venta o ambas, en todos los planetas o en uno. Tiene prioridad sobre las reglas de bolsa.

Úsalo para materiales que produces tú mismo o que te da un socio. Consulta [Precios fijos y COGM](/help/exchanges#fixed-prices-and-cogm).

## Sitios fantasma {#ghost-sites}

Bases en un planeta por encima de su número de parcelas. En los planetas iniciales, un jugador nuevo que empieza allí puede asentarse aunque todas las parcelas estén ocupadas. Nadie más puede.

En el juego, los sitios fantasma aparecen en los planetas iniciales para jugadores nuevos. Un jugador nuevo que empieza allí puede asentarse aunque todas las parcelas estén ocupadas. Si tu planeta inicial está en otro sitio, no puedes asentarte en un planeta así cuando ya no tiene parcelas libres. La Búsqueda de planetas marca un planeta lleno que admite sitios fantasma con «Lleno · sitios fantasma». Consulta [Parcelas](/help/planet_search#plots).

## Hábitats {#habs}

Edificios de habitación que alojan a la mano de obra de una base. Del HB1 al HB5 aloja cada uno un nivel, mientras que HBB, HBC, HBM y HBL alojan niveles mixtos.

Un alojamiento insuficiente reduce la eficiencia de la mano de obra. Un plan puede dimensionar sus hábitats automáticamente según la mano de obra, y eso está activado en los planes nuevos. Consulta [Configuración de la base](/help/plan_base).

## Nivel de HQ {#hq-level}

El nivel de la sede (HQ) de tu propia empresa. Cada mejora de nivel de la HQ te da un permiso de base más.

La Calculadora de HQ lista los materiales de un nivel a otro y les pone precio. Su rango termina en el nivel 50, pero ese es el rango de la calculadora, no un límite del juego. ROI de bases puede sumar al coste de una base la mejora para un permiso más. Consulta [Calculadora de HQ](/help/tools_hq_upgrade_calculator).

## Saltos {#jumps}

El número de saltos de sistema a sistema en la ruta más corta entre dos lugares.

La Búsqueda de planetas calcula los saltos en tu navegador, hasta las bolsas y hasta tus planes. Un «—» significa que no hay ruta de saltos y que hace falta una nave colonial. Consulta [Distancia](/help/planet_search#distance).

## Lujos {#luxuries}

Dos consumibles opcionales por nivel de mano de obra, como PWO y COF para los Pioneros. Proporcionarlos aumenta la eficiencia de la mano de obra, a cambio de su consumo diario.

Los trabajadores alojados sin lujos trabajan a un 79 % aproximadamente. El primer lujo lo sube a un 87 % aproximadamente, el segundo a un 92 % aproximadamente, y ambos juntos al 100 %. Los lujos que no activas no se consumen. Consulta [Configuración de la base](/help/plan_base).

## Capacidad de mercado {#market-capacity}

En ROI de bases, cuántas bases como esta puede absorber el mercado: el volumen negociado al día en la bolsa (el total de los últimos 7 días ÷ 7, incluidos los días sin operaciones) ÷ lo que una base vende o necesita al día.

Por ejemplo, si la bolsa negocia 1.000 unidades de una salida al día y una base vende 250 al día, la capacidad es 1.000 ÷ 250 = 4 bases.

ROI de bases la comprueba para cada salida e insumo de receta durante 7 días, y cuenta la más baja. Por debajo de 1, una base produce o necesita más de lo que negocia el mercado. Consulta [ROI de bases](/help/tools_base_roi#metrics).

## Creador de mercado {#market-maker}

Órdenes del propio juego, no de jugadores, que compran o venden ciertos bienes de nivel 1 a precios fijos. Para esos bienes, su precio actúa como suelo o como techo.

Los jugadores informan de creadores de mercado en bienes como productos agrícolas, prefabricados básicos y consumibles, y dicen que el juego ya ha cambiado sus precios antes. Las operaciones con creadores de mercado cuentan en el VWAP de la bolsa como cualquier otra operación. PRUNplanner no usa los precios de compra y venta propios de los creadores de mercado que informa FIO.

## E/S de materiales {#material-io}

Lo que un plan o un imperio consume y produce por material y día, y la diferencia (Δ).

Puedes mostrarlo en ȼ, t, m³ o como parte del mercado. Consulta [Resultados](/help/plan_results).

## Configuración óptima {#optimal-setup}

La base de 500 de área sobre la que las herramientas de ROI comparan recetas: edificios de producción más los hábitats y el almacenamiento que necesitan, con 5 expertos y el COGC correspondiente, en un planeta de condiciones normales.

El beneficio por área en esta configuración te permite comparar edificios entre sí. Consulta [ROI de recetas](/help/tools_roi_overview).

## Amortización {#payback}

Cuántos días tarda el beneficio diario de un plan en pagar su construcción: coste de construcción ÷ beneficio por día. Un plan que no da beneficio nunca se amortiza.

La Amortización de ROI de bases también puede contar un búfer de stock, la mejora de HQ y el tiempo hasta que llegan los expertos. Consulta [ROI de bases](/help/tools_base_roi#metrics).

Por ejemplo, un plan que cuesta 1.200.000 ȼ de construir y da 30.000 ȼ de beneficio al día se amortiza en 1.200.000 ÷ 30.000 = 40 días. La Amortización de ROI de bases suma sus costes extra al coste de construcción. Con un número fijo de expertos, sin búfer de stock y con una mejora de HQ de 300.000 ȼ, la misma base se amortiza tras 1.500.000 ÷ 30.000 = 50 días.

## Plan {#plan}

Una base en un planeta tal como la calcula PRUNplanner: edificios y recetas, hábitats y almacenamiento, expertos, lujos de la mano de obra, programa del COGC, Sede corp. y permisos.

Las cifras de un plan dependen del imperio en el que lo abras (facción y permisos) y de la preferencia de bolsa de ese imperio. Consulta [Diseño](/help/plan_layout).

## Proyectos planetarios {#planetary-projects}

Edificios de todo el planeta: LM (mercado local), COGC, WAR (almacén), ADM (centro de administración) y SHY (astillero). Cada uno ocupa una parcela del planeta.

La Búsqueda de planetas los muestra como infraestructura y puede filtrar por ellos. Consulta [Búsqueda de planetas](/help/planet_search#cogc-and-infrastructure).

## Parcelas {#plots}

Los solares de construcción de un planeta. Cada base ocupa una, y también las sedes de corporación y los proyectos planetarios.

Las parcelas libres son las parcelas totales del planeta menos los sitios que no son sitios fantasma. La Búsqueda de planetas las muestra en su columna Parcelas, tal como FIO vio el planeta por última vez. Consulta [Parcelas](/help/planet_search#plots).

## POPR {#popr}

Informe de población (population report): las cifras de un planeta sobre su población, como trabajadores y trabajadores libres por nivel, y su infraestructura. El juego lo publica cada semana.

La herramienta POPR de un plan muestra el último informe de su planeta. Consulta [Herramientas del plan](/help/plan_tools).

## Tasas de producción {#production-fees}

Una tasa que fija el gobernador del planeta por especialización y nivel de mano de obra, que se paga por cada orden de producción según el tiempo base de la receta. Los edificios más rápidos ejecutan más órdenes, así que pagan más al día.

PRUNplanner la cobra por día como la tasa ponderada por la mano de obra del edificio × la eficiencia del edificio. Cuenta en los planes, en Desglose del beneficio, en Imperio, en ROI de bases y en Cadenas de producción, y en el COGM. Consulta [Resultados](/help/plan_results).

## Beneficio {#profit}

Los ingresos diarios de un plan menos su coste diario. Los ingresos son lo que vende. El coste es lo que compra, más el desgaste y las tasas de producción.

PRUNplanner valora los materiales vendidos a precios de venta, y los materiales comprados y los consumibles de la mano de obra a precios de compra, todos según la preferencia de bolsa del imperio. El desgaste es 1 ⁄ 180 del coste de construcción de los edificios de producción al día. Consulta [Resultados](/help/plan_results).

## Receta {#recipe}

Un paso de producción de un edificio, en el que unos insumos se convierten en salidas durante una duración base. Un edificio ejecuta sus recetas una tras otra.

## Reparación {#repair}

Los edificios pierden condición con el tiempo, y con ella eficiencia. Reparar un edificio cuesta parte de sus materiales de construcción, y cuanto más esperas, más cuesta.

PRUNplanner modela el coste de reparación subiendo cada día hasta el día 180, cuando cuesta tanto como un edificio nuevo, y la eficiencia bajando hacia el 33 %. Consulta [FIO Reparación](/help/fio_repair).

## ROI {#roi}

Retorno de la inversión (return on investment). PRUNplanner lo muestra como días de amortización: coste de construcción ÷ beneficio por día.

ROI de recetas, ROI de recursos y ROI de bases ordenan recetas, recursos y bases según él. Consulta [ROI de recetas](/help/tools_roi_overview).

## Parte del volumen {#share-of-volume}

Lo que un plan o un imperio compra o vende de un material al día ÷ lo que la bolsa negoció de él al día, de media en 30 días.

La Revisión del plan marca una parte en ámbar a partir del 10 % y en rojo a partir del 50 %. Consulta [Revisión de mercado](/help/plan_check#market-check).

Por ejemplo, si un plan compra 50 unidades al día y la bolsa negoció 6.000 unidades en los últimos 30 días, eso son 200 al día, así que la parte es 50 ÷ 200 = 25 %, ámbar.

## Plan compartido {#shared-plan}

Un enlace a uno de tus planes. Cualquiera que lo tenga ve el plan y puede probar cambios en su propia copia. Tu plan nunca cambia.

El enlace deja de funcionar cuando dejas de compartirlo o eliminas el plan. Consulta [Compartir un plan](/help/plan_sharing).

## Diferencial {#spread}

La distancia entre ask y bid en una bolsa, como parte del ask: (ask − bid) ÷ ask. Un diferencial amplio significa que operar al instante cuesta más.

Por ejemplo, un ask de 100 ȼ y un bid de 80 ȼ dan un diferencial de (100 − 80) ÷ 100 = 20 %.

La Revisión del plan muestra el diferencial pero no lo marca. Consulta [Revisión del plan](/help/plan_check#market-check).

## Almacenamiento {#storage}

Edificios de almacenamiento: STO, STA, STE, STV y STW. Su capacidad de peso y volumen determina cuántos días de importaciones y exportaciones diarias de la base pueden guardar.

El almacenamiento de un plan determina su frecuencia de visitas. Consulta [Herramientas del plan](/help/plan_tools).

## Carrito de suministro {#supply-cart}

Una herramienta del plan que lista los consumibles y los insumos que una base necesita para un número de días (20 por defecto), descontando lo que guarda su almacenamiento en FIO.

Obtienes la lista como tabla o como acción de XIT. XIT Initial también envía los insumos que el propio plan produce, para el primer suministro. Consulta [Herramientas del plan](/help/plan_tools).

## Mercado poco líquido {#thin-market}

En Cadenas de producción, un material comprado del que la cadena necesita el 10 % o más de lo que la bolsa negocia al día, o que no se ha negociado en 30 días.

Consulta [Avisos](/help/tools_production_chain#warnings).

## Ticker {#ticker}

El código corto de un material o un edificio, como en el juego: DW para el agua potable, PP1 para la planta de prefabricados.

La búsqueda, los filtros y las acciones de XIT usan tickers.

## Universe {#universe}

La media de PRUNplanner sobre las cuatro bolsas AI1, CI1, IC1 y NC1. No es un lugar donde se pueda comerciar.

PRUNplanner usa el VWAP 30D de Universe para todo precio que no cubra ninguna regla de tu preferencia de bolsa, y para todos los precios de un imperio sin preferencia. Consulta [Cómo se obtiene un precio](/help/exchanges#how-a-price-is-found).

## Mantenimiento {#upkeep}

Lo que cuesta mantener las cosas en marcha. En Cadenas de producción, es el coste diario de los consumibles de la mano de obra. En la Calculadora de precios de mantenimiento, son los materiales que consumen los edificios planetarios para cubrir las necesidades de la población.

Las necesidades de la población son Seguridad, Salud, Comodidad, Cultura y Educación. Consulta [Precios de mantenimiento](/help/tools_upkeep_price_calculator).

## Frecuencia de visitas {#visitation}

Una herramienta del plan que muestra cuántos días tarda en llenarse el almacenamiento de la base con lo que importa y exporta al día. Esa es la frecuencia con la que debe visitarla una nave.

Puedes dejar materiales fuera del cálculo. Consulta [Herramientas del plan](/help/plan_tools).

## VWAP {#vwap}

Precio medio ponderado por volumen (volume-weighted average price): los créditos negociados por un material en una bolsa ÷ las unidades negociadas, en los últimos 7 o 30 días.

Por ejemplo, si una bolsa negocia 100 unidades a 10 ȼ un día (1.000 ȼ) y 300 unidades a 12 ȼ otro día (3.600 ȼ), el VWAP de esos días es 4.600 ÷ 400 = 11,5 ȼ. El día con más actividad pesa más, así que queda por encima de la media simple de 11 ȼ.

Sin operaciones en los últimos 7 días, el VWAP 7D usa el precio del último día en que se negoció, siempre que ese día esté dentro de los últimos 30 días. Tras 30 días sin operaciones, ambos son 0. Consulta [Base de precio](/help/exchanges#price-basis-vwap-ask-and-bid).

Un VWAP de 0 significa que el material no se ha negociado en esa bolsa en 30 días. Un plan que usa ese precio lo cuenta a 0 ȼ, y la Revisión del plan lo marca como «Sin precio». Consulta [Revisión del plan](/help/plan_check#flags).

## Mano de obra {#workforce}

Los trabajadores que necesitan los edificios, en cinco niveles: Pioneros, Colonos, Técnicos, Ingenieros y Científicos. Los hábitats los alojan, y cada día consumen comida, agua y otros bienes.

Los trabajadores alojados sin lujos trabajan a un 79 % de eficiencia aproximadamente. Un alojamiento insuficiente la reduce en proporción. Consulta [Configuración de la base](/help/plan_base).

## XIT {#xit}

Un paquete de acciones que prepara PRUNplanner, como compras en la CX, traslados de materiales o reparaciones, para que Refined PrUn lo ejecute en el juego como XIT ACT. PRUNplanner nunca comercia por ti.

FIO Consumo, FIO Reparación y los carritos del plan preparan acciones de XIT. Tras un vuelo de reparación de XIT, ejecutas BRA en el juego, el comando que repara todos los edificios de una base. Consulta [FIO Reparación](/help/fio_repair#prices).
