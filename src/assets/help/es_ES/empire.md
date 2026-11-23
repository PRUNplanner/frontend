La página [Imperio](/empire) te permite comprobar que tus bases funcionan como conjunto antes de construirlas. Junta todos los planes de un [[empire|imperio]] y muestra lo que ganan y cuestan por día, qué materiales fabrica y necesita el imperio, cuánto de un mercado ocuparía y qué recetas podrían aprovechar lo que sobra.

Un plan en su propia página solo conoce su propia base. Aquí, lo que fabrica una base y usa otra se cuenta una sola vez, así que ves lo que compra y vende el imperio en su conjunto.

## Primeros pasos {#getting-started}

Un imperio agrupa tus [[plan|planes]] de base y guarda tu [[faction|facción]] y tus [[area-permits|permisos]]. Cada cuenta nueva tiene uno, «My Empire». Puedes crear más, eliminarlos y asignar planes en [Gestión](/help/management).

- **Cambiar de imperio** elige el imperio que se muestra. El que eliges pasa a ser también tu **Imperio predeterminado** (consulta [Perfil](/help/profile#preferences)), así que la página se abre con él la próxima vez.
- Un imperio sin planes muestra tres pasos hacia tu primera base. Comprueba la facción y los permisos, busca un planeta en [Búsqueda de planetas](/search) (un plan que crees allí se añade a este imperio) y define tus precios en [Bolsas](/exchanges).
- Si no tienes ningún imperio, **Crear imperio** crea uno sin facción y con 1 de 2 permisos usados.

Mientras PRUNplanner calcula los planes se muestra una barra de progreso. Los precios salen de la [[exchange-preference|preferencia de bolsa]] del imperio, con las reglas de planeta de cada plan. Un imperio sin preferencia usa Universe · VWAP 30D. Detalles en [Bolsas y precios](/help/exchanges).

## Cifras generales {#overview-numbers}

Los recuadros de arriba resumen el imperio por día:

| Recuadro             | Cómo se calcula                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ingresos**         | El valor de todo lo que vende el imperio, después de compensar (ver abajo)                                                                                                                                                                                                                                                                                                                                                                      |
| **Coste**            | Lo que compra el imperio después de compensar, más la [[degradation\|degradación]] de cada plan (coste de construcción ÷ 180 por día) y las [[production-fees\|tasas de producción]]; también se muestra como % de los ingresos |
| **Beneficio**        | Ingresos − Coste, con el margen en %                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Beneficio / Área** | Beneficio ÷ el área que usan todos los planes                                                                                                                                                                                                                                                                                                                                                                                                                      |

_Compensación:_ el imperio no es una simple suma de sus planes. Para cada material, lo que fabrica un plan y usa otro se anula primero. Solo el resto se vende o se compra, a la media de los precios de los planes para ese material, ponderada por la cantidad de cada plan. Aquí los consumibles de la mano de obra cuentan como materiales.

Por ejemplo (números inventados), el plan A fabrica 100 unidades de un material al día a 80 ȼ cada una, y el plan B usa 60 a 100 ȼ cada una. El imperio solo vende las 40 que sobran, a (100 × 80 + 60 × 100) ÷ (100 + 60) = 14.000 ÷ 160 = 87,50 ȼ cada una, así que suman 40 × 87,50 = 3.500 ȼ al día a los **Ingresos**.

La barra de debajo reparte los ingresos en insumos de producción, mano de obra, degradación, tasas de producción y beneficio, cada uno en % de los ingresos. Cuando el imperio tiene pérdidas, la barra muestra en cambio las partes como proporción del coste, con una parte rayada para el coste que los ingresos no cubren.

**Envío** muestra las toneladas y los metros cúbicos por día que tus planes reciben (importación) y envían (exportación), sumados para todos los planes.

## Lista de planes y configuración {#plan-list}

La lista de planes muestra cada plan del imperio con sus planetas, [[cogc|COGC]], permisos y **Beneficio (ȼ)**. Haz clic en un plan para abrirlo. El pie suma los permisos que usan tus planes. En pantallas anchas, **Ocultar lista de planes** pliega toda la columna izquierda: los recuadros, la lista de planes y Configuración.

### Configuración {#configuration}

La casilla **Configuración** contiene el **Nombre**, la **Facción**, los **Permisos totales** (al menos 2) y los **Permisos usados** (al menos 1) del imperio. **Guardar** los guarda, y **Recargar** descarta tus cambios y carga los valores guardados.

**Permisos totales** es cuántos permisos de base tiene tu empresa, y **Permisos usados** es cuántos de ellos ocupan tus bases. En el juego, cada mejora de [[hq-level|nivel de HQ]] te da un permiso más.

La facción y los permisos cambian tu producción. Un edificio cuya especialización favorece tu facción recibe una bonificación de `1 + bonus × 2 × (3 − 2 × Permits Used ÷ Permits Total)`, así que cuantos menos permisos uses, mayor es la bonificación. El [glosario](/help/glossary#faction) explica las facciones.

Por ejemplo (números inventados), con una bonificación base de 0,05 y 2 de 4 permisos usados, PRUNplanner calcula 1 + 0,05 × 2 × (3 − 2 × 2 ÷ 4) = 1 + 0,05 × 2 × 2 = 1,20, es decir, +20 %. Con los 4 usados, calcula 1 + 0,05 × 2 × 1 = 1,10, es decir, +10 %. La página calcula todos los planes con los valores guardados, así que los números cambian cuando haces clic en **Guardar**.

Cuando **Permisos usados** difiere de los permisos que suman tus planes, un aviso te lo indica («Discrepancia detectada»). La casilla compara **Permisos usados** con el total del pie de la lista de planes, donde cada plan cuenta los permisos definidos en su propia [Configuración de la base](/help/plan_base#permits), y vuelve a comprobarlo mientras escribes. Por ejemplo, tres planes con 1, 1 y 2 permisos suman 4, así que con **Permisos usados** en 3 el aviso dice «Discrepancia detectada: 3 permisos configurados frente a 4 planificados».

No te preocupes, el aviso no bloquea nada: puedes guardar igualmente y tus planes se siguen calculando. Está ahí porque la bonificación de facción usa **Permisos usados**, así que un valor que no coincide con las bases que vas a tener da una bonificación equivocada. Cambia **Permisos usados**, o los permisos de tus planes, hasta que coincidan. Toma los valores correctos del búfer de HQ del juego. El paso inicial «Tu imperio» no muestra el aviso.

Si el imperio se guardó mientras tanto en otra pestaña o en otro dispositivo, eliges si sobrescribirlo o recargar la versión guardada.

## E/S de materiales {#material-io}

**E/S de materiales** (una de las vistas de la página) enumera cada material del imperio con estas columnas:

- **Delta**: lo fabricado menos lo usado por día. Por encima de cero, el imperio vende el resto, y por debajo de cero, compra lo que falta.
- **Producción** y **Consumo**.
- **ȼ Delta**: el valor del delta por día.
- **Producido por** y **Consumido por**: qué planes fabrican y usan más de él.

Despliega una fila para ver los planes que hay detrás. **Vista detallada** cambia entre productores y consumidores y **Neto por planeta**, que suma los planes del mismo planeta en un excedente o una necesidad.

Estos filtros se comparten con Análisis:

- **Mostrar**: **Todos**, o **Equilibrado de carga** para los materiales que el imperio fabrica y usa a la vez.
- **Consumibles**: **Mostrar** u **Ocultar** los consumibles de la mano de obra.
- **Planetas** (solo E/S de materiales): **Resumen**, o **Expandir todo** las filas.
- **Materiales** y **Planetas**: muestran solo los que eliges.

Pasa el ratón por cualquier [[ticker|ticker]] para ver su tarjeta de mercado (consulta [Bolsas y precios](/help/exchanges#market-card)).

Después de cada cálculo, PRUNplanner también guarda la E/S de materiales del imperio en tu cuenta. Esa copia es lo que devuelve «I/O de materiales del imperio» de la API (consulta [Claves de API](/help/api_keys#url-builder)).

### Revisión de mercado {#market-check}

Encima de la tabla, **Revisión de mercado del flujo neto del imperio** compara lo que el imperio en su conjunto vende o compra con el comercio de la bolsa. Los materiales que se fabrican y usan se compensan primero, así que solo se señalan por lo que llega al mercado. La [Revisión del plan](/help/plan_check#market-check) de cada plan sigue señalándolos.

| Etiqueta                                                     | Señala                                                                                                                                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roja: «no se puede comerciar como se planeó» | Sin precio; sin operaciones en 7 días; sin ofertas (al comprar) o sin compradores (al vender); un 50 % o más del volumen diario medio de la bolsa (30 días) |
| Ámbar: «gran parte del mercado»              | Un 10 % o más del volumen diario medio                                                                                                                                                                               |
| Atenuada: «otras notas»                      | Todas las bolsas, sin bolsa definida; datos de más de 2 días                                                                                                                                                         |

Haz clic en una etiqueta para ver solo los materiales de ese nivel, y otra vez para verlos todos.

La revisión del imperio solo usa las reglas de _todos los planetas_ de la preferencia de bolsa del imperio. Una excepción de planeta sigue contando para los precios del imperio, pero la revisión no la ve, así que comprueba esos materiales en la Revisión del plan de cada plan.

## Análisis {#analysis}

**Análisis** muestra gráficos. Los gráficos de materiales siguen los filtros, y los de planes no.

- **A dónde van los ingresos de cada plan** muestra el reparto de los ingresos, el margen y los ingresos por día de cada plan. Ves los 10 planes con más beneficio y todos los planes con pérdidas, y el resto va a «Otros». Son los números propios de cada plan, sin compensar.
- **Materiales que más ȼ mueven** muestra los 10 materiales con más ȼ por día, lo que compra el imperio a la izquierda y lo que vende a la derecha, en **ȼ / día** o **Unidades / día**. Un botón debajo los muestra todos. Haz clic en un material para abrirlo en E/S de materiales.
- **Más gráficos** se queda abierto o cerrado como lo dejaste en este navegador. Contiene **Beneficio del plan (ȼ)**, **Beneficios de materiales (ȼ)**, **Costes de materiales (ȼ)**, **Producción neta**, **Consumo neto**, **Producción exclusiva** (se fabrica pero nunca se usa en el imperio) y **Consumo exclusivo** (se usa pero nunca se fabrica).

## Oportunidades de producción {#production-opportunities}

**Oportunidades de producción** busca [[recipe|recetas]] que podrían aprovechar lo que le sobra a tu imperio. Enumera cada receta con al menos un insumo del que el imperio tiene un delta positivo, ordenadas por la parte de insumos en excedente y luego por **Lotes potenciales**.

Los tres recuadros las cuentan:

| Recuadro               | Significado                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Oportunidades**      | Todos los insumos están en excedente, suficiente para al menos 1 lote al día   |
| **Delta necesario**    | Todos los insumos están en excedente, pero no lo suficiente para 1 lote al día |
| **Material que falta** | Al menos un insumo no está en excedente                                        |

**Lotes potenciales** es cuántos ciclos de la receta al día cubre tu excedente. Para cada insumo, PRUNplanner divide el excedente diario entre la cantidad que necesita la receta y toma el resultado más bajo. No tiene en cuenta el tiempo de la receta, cuántos edificios harían falta ni su eficiencia. Léelo como «cuánto insumo hay», no como «cuánto puedes fabricar».

Por ejemplo (números inventados), una receta necesita 10 de un insumo y 5 de otro por ciclo, y al imperio le sobran 30 y 10 al día. Eso da 30 ÷ 10 = 3 y 10 ÷ 5 = 2 ciclos, así que **Lotes potenciales** es 2, porque el segundo insumo se acaba antes.

Para las coincidencias completas, **Vender insumos** y **Vender productos** comparan vender los insumos tal cual con vender lo que la receta fabricaría con ellos (precio de venta × cantidad × lotes). El mejor sale en verde. Los precios son precios de venta de la preferencia de bolsa del imperio, solo con las reglas de todos los planetas. La lista usa la E/S de materiales sin filtrar.

> [!tip]
> Antes de construir para una oportunidad, abre la tarjeta de mercado de sus salidas, porque un mercado pequeño no puede absorber la cantidad extra. [Cadenas de producción](/help/tools_production_chain) planifica los edificios que harían falta.
