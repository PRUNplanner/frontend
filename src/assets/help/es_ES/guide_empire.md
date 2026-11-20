Una base es un plan. Varias bases que se abastecen entre sí son un [[empire|imperio]]. Esta guía lleva unos 15 minutos, y al terminar tendrás:

- tus bases en un imperio, con su facción y sus permisos configurados,
- leída la página Imperio: lo que ganan las bases juntas, lo que fabrican y necesitan, y si el mercado puede absorberlo,
- una lista de recetas que podría alimentar tu excedente y de correcciones para tus planes, para decidir qué construir después.

Es para jugadores con dos o más bases o planes. Necesitas una cuenta. Las páginas enlazadas al final de cada paso profundizan más.

## 1. Pon tus bases en un imperio {#step-1}

Abre [Gestión](/manage) y baja hasta **Asignaciones plan ↔ imperio**. Tiene una fila por [[plan]] y una columna de casillas por imperio.

1. Marca la casilla del imperio en cada plan que pertenezca a él. Las casillas cambiadas siguen marcadas hasta que guardes.
2. Pulsa **Guardar cambios** en la barra de abajo.

Un plan puede estar en varios imperios, por ejemplo uno con tus bases reales y otro para una expansión futura. Calcula con un imperio cada vez y usa la facción, los permisos y la [[exchange-preference|preferencia de bolsa]] de ese imperio.

> [!tip]
> ¿Quieres probar una variante de una base sin cambiar la original? **Clonar** en **Acciones** copia el plan. Pon la copia en un imperio de pruebas.

Más información: [Asignaciones plan ↔ imperio](/help/management#assignments), [Conceptos básicos](/help/management#core-concepts).

## 2. Configura la facción y los permisos {#step-2}

Abre [Imperio](/empire) y elige el imperio en **Cambiar de imperio**. En el recuadro **Configuración**, rellena **Facción**, **Permisos totales** y **Permisos usados**, y pulsa **Guardar**.

- Los permisos vienen de tu sede. Cada mejora de nivel de la sede da un permiso de base más, y la [Calculadora de HQ](/hq-upgrade-calculator) lista lo que cuesta una mejora.
- La bonificación de [[faction|facción]] crece cuantos menos permisos uses, así que estas cifras cambian todos los planes del imperio.
- Cuando **Permisos usados** no coincide con los permisos que suman tus planes, verás un aviso «Discrepancia detectada». Comprueba las cifras mientras escribes y no te impide guardar. Es un recordatorio para tomar los valores correctos de tu búfer `HQ` del juego.

Más: [Configuración](/help/empire#configuration), [Área y permisos](/help/glossary#area-permits).

## 3. Lee las cifras del resumen {#step-3}

Los recuadros de arriba resumen el imperio por día: **Ingresos**, **Coste**, **Beneficio** y **Beneficio / Área**.

![La página Imperio: ingresos, coste y beneficio, el reparto de costes, el envío y la lista de planes](/images/help/guides/empire-overview.webp)

El imperio no es una simple suma de sus planes. Lo que un plan fabrica y otro usa se compensa primero, y solo el resto se vende o se compra, al precio medio de los planes. Por eso las cifras del imperio pueden diferir de la suma de los beneficios de sus planes.

Por ejemplo, el plan A fabrica 100 DW al día y su E/S de materiales los valora a 80 ȼ cada uno. El plan B usa 60 DW al día a 100 ȼ cada uno. El imperio vende los 40 que sobran. Su precio es la media ponderada por la cantidad de cada plan: (100 × 80 + 60 × 100) ÷ 160 = 14.000 ÷ 160 = 87,50 ȼ, así que los 40 DW cuentan 3.500 ȼ al día. Los dos planes por separado cuentan +8.000 y −6.000, que suman 2.000 ȼ.

- La barra de debajo reparte los ingresos entre insumos, mano de obra, [[degradation|degradación]], [[production-fees|tasas de producción]] y beneficio.
- **Envío** muestra las toneladas y los m³ que tus planes envían y reciben al día.
- La lista de planes muestra el beneficio de cada plan. Haz clic en uno para abrirlo.

Detalles: [Cifras del resumen](/help/empire#overview-numbers), [Lista de planes](/help/empire#plan-list).

## 4. Equilibra los materiales {#step-4}

Arriba de la página, abre **E/S de materiales**. Lista todos los materiales del imperio con su **Delta** (lo fabricado menos lo usado al día).

![La vista E/S de materiales de la página Imperio](/images/help/guides/empire-materials.webp)

- Un Delta positivo se vende y uno negativo se compra. Un Delta muy negativo de algo que podrías fabricar es candidato para tu próxima base.
- Con **Mostrar** en **Equilibrado de carga**, solo ves los materiales que el imperio fabrica y usa a la vez. Comprueba que la oferta y la demanda cuadran.
- Despliega una fila para ver qué planes fabrican y usan el material. **Neto por planeta** suma los planes del mismo planeta.

Más: [E/S de materiales](/help/empire#material-io).

## 5. Revisa el mercado {#step-5}

**Revisión de mercado del flujo neto del imperio**, encima de la tabla, compara lo que vende y compra el imperio en conjunto con la negociación de la bolsa. Unas etiquetas cuentan los avisos: rojo («no pueden comerciarse según lo planificado»), ámbar («gran parte del mercado») y otras notas. Haz clic en una etiqueta para ver solo esos materiales.

- A partir del 10 % del volumen diario de un material, tus órdenes probablemente moverán el precio. A partir del 50 %, el mercado no puede absorber la cantidad tal como está planificada. El volumen diario es el total de 30 días de la bolsa ÷ 30. Por ejemplo, 30.000 unidades negociadas en 30 días son 1.000 al día, así que un imperio que vende 150 al día se lleva el 15 % y recibe un aviso ámbar.
- La revisión usa las reglas de _todos los planetas_ de la preferencia de bolsa del imperio. Si un material tiene una excepción de planeta, lo revisa la propia [Revisión del plan](/help/plan_check#market-check) de ese plan.

> [!tip]
> Un aviso rojo en una salida no hace mala una base. Menos edificios, una segunda salida u otra bolsa pueden bajar la cuota.

Más información: [Revisión de mercado](/help/empire#market-check), [Revisión del plan: Imperio](/help/plan_check#empire).

## 6. Encuentra oportunidades de producción {#step-6}

Arriba de la página, abre **Oportunidades de producción** para ver [[recipe|recetas]] que podrían usar lo que le sobra a tu imperio.

![La vista Oportunidades de producción de la página Imperio](/images/help/guides/empire-opportunities.webp)

- **Oportunidades**: recetas en las que todos los insumos tienen excedente, suficiente para al menos una ejecución al día.
- **Lotes potenciales**: cuántas ejecuciones al día cubre tu excedente. No tiene en cuenta el tiempo de la receta, los edificios ni la eficiencia, así que léelo como «cuánto insumo hay», no como «cuánto puedes fabricar».
- **Vender insumos** y **Vender productos** comparan vender el excedente tal cual con vender lo que la receta fabricaría con él.

Más: [Oportunidades de producción](/help/empire#production-opportunities).

## 7. Revisa las cadenas detrás de tus bases {#step-7}

En [Cadenas de producción](/production-chain), cambia de **Planificar una cadena** a **Revisar un imperio** y elige el imperio. Añade las cadenas que quieras revisar, o elige **Revisar todo lo que vende el imperio**.

La revisión sigue hacia atrás cada material vendido a través de tus planes y lista hallazgos con su ganancia al día. Una **Corrección del plan** significa que el plan cuenta un programa de COGC que el planeta no tiene, o le falta uno que sí tiene. Los demás hallazgos son una **Receta** más barata, **Fabricar o comprar**, una mejor **Ubicación** o una mejor **Configuración** de lujos y expertos. Nunca cambia un plan.

> [!tip]
> Haz primero las correcciones del plan. No cuesta nada construirlas, y las cifras del plan no son correctas hasta que las hagas.

Detalles: [Revisar un imperio](/help/tools_production_chain#check-an-empire), [Hallazgos](/help/tools_production_chain#findings).

## Siguiente {#next}

- [Pasar al juego](/help/guide_hand_off): construye, abastece y repara tus bases con paquetes de XIT.
- [De una cadena a bases](/help/guide_chain_to_bases): planifica la siguiente cadena y añádela a este imperio.
