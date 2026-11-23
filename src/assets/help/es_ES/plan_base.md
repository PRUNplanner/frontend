La configuración de la base decide qué precios y bonificaciones se aplican a tu base, cuántos trabajadores tienen alojamiento y comida, y qué aumenta la [[efficiency|eficiencia]] de tus edificios. En el diseño Estándar es el grupo de partes a la izquierda de un plan: **Imperio y precios**, **Planeta**, **Mano de obra**, **Infraestructura** y **Expertos**. Juntas reúnen todo lo de la base que no es un edificio de producción, y cada cambio aquí pasa directamente a [Producción](/help/plan_production) y a los [resultados](/help/plan_results).

## Un plan nuevo {#new-plan}

Un plan nuevo empieza con estos ajustes:

| Ajuste              | Empieza como                                            |
| ------------------- | ------------------------------------------------------- |
| Programa de COGC    | El programa actual del planeta; **Ninguno** si no tiene |
| **Sede corp.**      | Desactivado                                             |
| **Permisos**        | 1 (área 500)                                            |
| Lujos               | Ambos activados en todos los niveles                    |
| Expertos            | Ninguno                                                 |
| **Auto** (hábitats) | Activado                                                |
| Imperio             | Consulta [Imperio y precios](#empire-and-prices)        |

## Imperio y precios {#empire-and-prices}

Un plan calcula con un [[empire|imperio]]. Toma la [[faction|facción]] y los permisos de ese imperio, y su [[exchange-preference|preferencia de bolsa]] para todos los precios. Así que el imperio decide qué edificios tuyos reciben una bonificación de facción y de cuánto es (consulta [Bonificación de facción](#faction)), y todos los precios a los que el plan compra y vende.

**Calcular con el imperio** lista tus imperios por nombre, y los que contienen el plan llevan delante el signo ». No aparece en un plan de solo lectura ni si no tienes imperios.

Al abrir un plan, se elige tu imperio actual si el plan está en él; si no, el primer imperio que contiene el plan. Un plan que no está en ningún imperio usa tu primer imperio. Tu imperio actual es el imperio por defecto de [Perfil](/profile), y cambiar de imperio en la página [Imperio](/empire) lo cambia.

En un plan guardado, elegir otro imperio solo cambia cómo calcula esta página. No añade el plan a ese imperio ni lo quita de otro, y no se guarda. Un plan nuevo se une al imperio que elegiste cuando lo guardas por primera vez. Qué imperios contienen un plan se decide en [Gestión](/manage).

La nota de debajo («Facción …, permisos del imperio. El plan está en … imperios.») indica la facción cuya bonificación se aplica y cuántos imperios contienen el plan.

**Precios** muestra el nombre de la preferencia de bolsa del imperio, como enlace a esa preferencia en [Bolsas](/exchanges) para este planeta. Sin preferencia pone **Universe · VWAP 30D (sin preferencia)**, que es el [[vwap|VWAP]] de 30 días de todas las bolsas.

Con esta lista de precios, el plan valora lo que vende al precio de venta. Lo que compra (insumos, consumibles de la mano de obra, materiales de construcción) lo valora al precio de compra. [Bolsas y preferencias de bolsa](/help/exchanges#how-a-price-is-found) explica cómo se encuentra un precio y cómo fijar precios o definirlos por planeta.

> [!tip]
> Dos imperios con preferencias de bolsa distintas pueden mostrar beneficios muy diferentes para el mismo plan. Cambia **Calcular con el imperio** para comprobar un plan con el mercado donde de verdad venderías.

### Bonificación de facción {#faction}

Una facción mejora los edificios de sus [[expertise|especializaciones]]. PRUNplanner aplica la bonificación como un factor sobre la eficiencia del edificio:

1 + bonificación × 2 × (3 − 2 × permisos usados ÷ permisos totales)

Los permisos son los del imperio, tal como están en sus ajustes. Si los usas todos, obtienes 1 + 2 × bonificación. Usar menos da más.

| Facción         | Especialización y bonificación                                             |
| --------------- | -------------------------------------------------------------------------- |
| Antares         | Electrónica 5 %                                                            |
| Benten          | Manufacturas 5 %                                                           |
| Hortus          | Agricultura 3 %, Industria Alimenticia 2 %                                 |
| Moria           | Metalurgia 2 %, Construcción 3 %                                           |
| Fuera de región | Química, Refinamiento de Combustible y Extracción de Recursos 2 % cada una |

Por ejemplo, un imperio de Antares que usa todos sus permisos da a los edificios de Electrónica 1 + 0,05 × 2 = 1,10, es decir, +10 %.

## Planeta {#planet}

La parte **Planeta** fija lo que el planeta aporta a tu base: su programa de COGC, una sede de corporación, tus permisos y sus recursos.

### Programa de COGC {#cogc}

El selector **COGC** elige el programa de [[cogc|COGC]] del planeta. Puedes elegir **Ninguno**, uno de los nueve programas de especialización (de Agricultura a Extracción de Recursos) o uno de los cinco programas de mano de obra (de Pioneros a Científicos).

Un plan nuevo empieza con el programa que el planeta tiene ahora. Puedes elegir cualquier otro para planificar con antelación, ya que lo votan los residentes y puede cambiar cada semana.

Un programa de especialización multiplica por 1,25 (+25 %) la eficiencia de todos los edificios de esa especialización. Un programa de mano de obra multiplica por 1,1 (+10 %) la eficiencia de todos los edificios que emplean ese nivel. En Producción, la especialización de un edificio se pone en verde con ✓ cuando el programa la mejora.

### Sede corp. {#corp-hq}

Marca **Sede corp.** cuando la [[corp-hq|corporación]] a la que perteneces tiene su sede en este planeta (la sede de tu propia empresa no cuenta). Multiplica por 1,1 (+10 %) la eficiencia de todos los edificios de producción, y está desactivada por defecto.

### Permisos y área {#permits}

**Permisos** (de 1 a 3) fija cuántos permisos de base usas en este planeta. El área que aparece al lado es 250 + 250 × permisos: 500, 750 o 1.000. El resultado **Área** muestra cuánta usa la base (consulta [Resultados](/help/plan_results#area)). El [[core-module|módulo central]] siempre ocupa 25, y cada edificio de producción, hábitat y edificio de almacenamiento ocupa su propia área × su cantidad.

En el juego, cada mejora de nivel de la sede de tu empresa te da un permiso de base más. Este campo solo fija el área del plan. La bonificación de facción cuenta en cambio los permisos del imperio (consulta [Bonificación de facción](#faction)).

### Recursos {#resources}

**Recursos** muestra un recuadro por cada recurso del planeta. El número que lleva es lo que produce un extractor al día con un 100 % de eficiencia.

Haz clic en un recuadro para empezar a extraer ese recurso. Si el plan aún no tiene el extractor adecuado (EXT para minerales, COL para gases, RIG para líquidos), PRUNplanner añade uno con cantidad 1. También añade la receta de ese recurso como una orden de 1, salvo que el extractor ya la tenga. Después ajustas la cantidad en Producción.

Con **Sugerencias de plan** activado y datos del planeta disponibles, un enlace bajo los recuadros («… planes en … · lo que otros construyen aquí») abre lo que otros jugadores planifican en este planeta. Más información en [Diseño](/help/plan_layout).

### Fertilidad {#fertility}

La [[fertility|fertilidad]] solo importa para las granjas (FRM y ORC). Su eficiencia recibe el factor 1 + fertilidad × 10 ÷ 33, así que una fertilidad positiva las acelera y una negativa las frena. En un planeta que no es fértil en absoluto, las granjas funcionan al 0 % y Producción indica «Planeta no fértil».

> [!tip]
> Todo edificio necesita además los [[extra-building-materials|materiales de construcción adicionales]] del planeta según su superficie, gravedad, presión y temperatura. Están en el coste de construcción detrás de **Amortización** y en la herramienta Construcción, así que un planeta hostil se nota en una amortización más larga.

## Mano de obra {#workforce}

**Mano de obra** tiene una entrada por cada nivel de [[workforce|mano de obra]] del que el plan necesita trabajadores. Cada una muestra:

- «necesarios / alojados»: los trabajadores que necesitan tus edificios y las camas que dan tus hábitats, con un medidor;
- la **Eficiencia** del nivel en %;
- **Lujos**: dos botones, uno por [[luxuries|lujo]], con su ticker, y ✓ cuando se suministra;
- «… libres»: camas sobrantes, en rojo y negativas cuando al nivel le faltan.

Un «… libres» negativo solo significa que el nivel tiene más trabajadores que camas. Añade hábitats en [Infraestructura](#infrastructure), o activa [Auto](#auto-habs) para que PRUNplanner los elija por ti.

Los niveles que el plan no necesita quedan tras «Mostrar … (no necesarios)». En las opciones de **Visualización** del diseño puedes mostrar Mano de obra como tabla (**Nivel**, **Necesarios / alojados**, **Libres**, **Lujos**, **Eficiencia %**) o con todos los niveles abiertos (consulta [Diseño](/help/plan_layout)).

### Cómo se calcula la eficiencia {#workforce-efficiency}

La eficiencia de un nivel es:

- la parte de sus trabajadores que tienen cama (como máximo el 100 %),
- × 79,4 % como base,
- × 12/11 cuando se suministra su primer lujo,
- × 15/13 cuando se suministra su segundo lujo.

| Lujos suministrados | Eficiencia (todos alojados) |
| ------------------- | --------------------------- |
| Ninguno             | 79,4 %                      |
| Solo el primero     | 86,7 %                      |
| Solo el segundo     | 91,7 %                      |
| Ambos               | 100 %                       |

Las camas que faltan reducen el primer factor. Por ejemplo (cifras inventadas), un plan que necesita 100 Pioneros pero tiene camas para 50 aloja a la mitad: sin lujos, el nivel funciona al 50 % × 79,4 % = 39,7 %, y con ambos lujos al 50 % × 100 % = 50 %.

El factor de mano de obra de un edificio es la media de las eficiencias de sus niveles, ponderada por cuántos trabajadores de cada nivel emplea.

### Necesidades y lujos {#needs}

Los trabajadores alojados consumen sus necesidades cada día. Los trabajadores sin cama no consumen nada, pero tampoco trabajan. Si desactivas un lujo, no se consume ni se compra, y la eficiencia del nivel baja. Todo lo consumido aparece en [E/S de materiales](/help/plan_results#material-io) y cuenta como coste.

Consumo por cada 100 trabajadores al día, así que 200 Pioneros alojados beben 2 × 4 = 8 DW al día:

| Nivel      | Necesidades                              | Lujo 1  | Lujo 2  |
| ---------- | ---------------------------------------- | ------- | ------- |
| Pionero    | DW 4, RAT 4, OVE 0,5                     | PWO 0,2 | COF 0,5 |
| Colono     | DW 5, RAT 6, EXO 0,5, PT 0,5             | REP 0,2 | KOM 1   |
| Técnico    | DW 7,5, RAT 7, MED 0,5, HMS 0,5, SCN 0,1 | SC 0,1  | ALE 1   |
| Ingeniero  | DW 10, MED 0,5, FIM 7, HSS 0,2, PDA 0,1  | VG 0,2  | GIN 1   |
| Científico | DW 10, MED 0,5, MEA 7, LC 0,2, WS 0,05   | NST 0,1 | WIN 1   |

> [!tip]
> Un lujo compensa cuando la producción extra de los edificios más rápidos vale más que el propio lujo. Actívalo y desactívalo y mira **Beneficio / día**: cuentan tanto el coste del lujo como el cambio de eficiencia.

## Infraestructura {#infrastructure}

**Infraestructura** tiene un campo por cada [[habs|hábitat]] (HB1, HBB, HB2, HBC, HB3, HBM, HB4, HBL, HB5) y por cada edificio de [[storage|almacenamiento]] (STO, STA, STE, STV, STW).

Camas por hábitat:

| Hábitat                 | Camas                                                     |
| ----------------------- | --------------------------------------------------------- |
| HB1, HB2, HB3, HB4, HB5 | 100 Pioneros, Colonos, Técnicos, Ingenieros o Científicos |
| HBB                     | 75 Pioneros + 75 Colonos                                  |
| HBC                     | 75 Colonos + 75 Técnicos                                  |
| HBM                     | 75 Técnicos + 75 Ingenieros                               |
| HBL                     | 75 Ingenieros + 75 Científicos                            |

Capacidad de almacenamiento, además de las 1.500 t y 1.500 m³ del [[core-module|módulo central]]:

| Almacenamiento | Peso     | Volumen   |
| -------------- | -------- | --------- |
| STO            | 5.000 t  | 5.000 m³  |
| STA            | 2.500 t  | 2.500 m³  |
| STE            | 10.000 t | 10.000 m³ |
| STV            | 2.500 t  | 7.500 m³  |
| STW            | 7.500 t  | 2.500 m³  |

Los hábitats y el almacenamiento ocupan área y cuentan en el coste de construcción detrás de **Amortización**, pero no en la degradación. Tu almacenamiento fija los días hasta llenarse del resultado **Almacenamiento**.

### Auto y el optimizador {#auto-habs}

**Auto** elige los hábitats por ti. Mientras está activado, los campos de hábitats quedan bloqueados, pero el almacenamiento lo sigues fijando tú. Cada vez que cambia la mano de obra que necesitan tus edificios, o cambian los precios de construcción de los hábitats, elige el conjunto de hábitats más barato que aloja a todos y cabe en el área libre. Si no cabe ninguno, elige el conjunto que necesita menos área, aunque sea más de la que tienes.

**Auto** está activado en los planes nuevos. Los planes guardados sin este ajuste empiezan con él desactivado, y en una copia del plan compartido de otra persona también empieza desactivado. PRUNplanner recuerda tu elección en cada plan.

Con **Auto** desactivado, **Más barata** y **Menos área** ejecutan el optimizador una vez. Más barata busca el menor coste de construcción a tus precios de compra, sin límite de área. Menos área busca la menor área. Si ningún conjunto sirve, aparece el mensaje «No se ha encontrado una configuración de hábitats para esta mano de obra.»

> [!tip]
> Desactiva **Auto** cuando ya tengas hábitats construidos en el juego y quieras que el plan coincida con ellos. Usa **Más barata** o **Menos área** una vez para tener un punto de partida y luego ajústalo.

## Expertos {#experts}

Los [[experts|expertos]] mejoran todos los edificios de su especialización. **Expertos** muestra un campo por cada especialización que usan tus edificios, con los tickers de esos edificios, y por cada especialización que tenga expertos asignados. «+ … campos más» muestra el resto, y **Menos campos** los vuelve a ocultar.

Cada campo admite de 0 a 5 expertos, con la bonificación indicada bajo el nombre:

| Expertos | Bonificación |
| -------- | ------------ |
| 1        | 3,06 %       |
| 2        | 6,96 %       |
| 3        | 12,48 %      |
| 4        | 19,74 %      |
| 5        | 28,4 %       |

Un edificio de esa especialización recibe 1 + bonificación como factor sobre su eficiencia. Una base puede tener como máximo 6 expertos en total. Si introduces más, un aviso dice «El máximo de expertos en una base es 6. Ahora mismo tienes asignados … expertos.», pero el plan sigue contando todos los expertos que introdujiste.

En el juego, los expertos llegan con el tiempo al tener en marcha edificios de esa especialización. Cuantos más de esos edificios tengas en marcha, antes llegan.

## Cómo se forma la eficiencia de un edificio {#efficiency}

La eficiencia de un edificio de producción es el producto de sus factores. Como se multiplican, un solo factor de 0, como no tener trabajadores alojados o una granja en un planeta que no es fértil, detiene el edificio sean cuales sean los demás.

| Factor                    | Valor                                                              | Se fija en                                                     |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Mano de obra              | Las eficiencias de los niveles de sus trabajadores, ponderadas     | [Mano de obra](#workforce), [Infraestructura](#infrastructure) |
| COGC                      | × 1,25 programa de especialización, × 1,1 programa de mano de obra | [Programa de COGC](#cogc)                                      |
| Sede                      | × 1,1                                                              | [Sede corp.](#corp-hq)                                         |
| Expertos                  | × (1 + bonificación)                                               | [Expertos](#experts)                                           |
| Facción                   | × (1 + bonificación × 2 × (3 − 2 × usados ÷ totales))              | [Imperio y precios](#faction)                                  |
| Fertilidad (solo granjas) | × (1 + fertilidad × 10 ÷ 33), 0 si no es fértil                    | [Fertilidad](#fertility)                                       |

Imagina un edificio de Metalurgia con sus trabajadores totalmente alojados y ambos lujos suministrados, un COGC de Metalurgia, 2 expertos de Metalurgia y Sede corp., en un imperio sin bonificación de facción para Metalurgia. Funciona al 1 × 1,25 × 1,0696 × 1,1 = 147,07 %. Pasa el puntero por **Efic.** en Producción para ver los factores de cualquier edificio.
