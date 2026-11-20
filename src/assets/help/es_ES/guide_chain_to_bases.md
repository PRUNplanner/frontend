Empieza con un objetivo como «producir 50 RAT al día». Esta guía lleva unos 20 minutos, y al terminar tendrás:

- toda la cadena de producción que hay detrás de tu objetivo, con su beneficio y su coste de construcción,
- esa cadena repartida en bases que podrías construir, cada una en un planeta,
- un [[plan]] por base, en un [[empire|imperio]] nuevo si quieres.

Es para jugadores que planifican una nueva línea de producción repartida en varias bases. Las páginas enlazadas al final de cada paso profundizan más. Necesitas una cuenta, y conviene que configures antes tus precios (consulta [Configurar tus precios](/help/guide_cx_prices)).

## 1. Fija tus objetivos {#step-1}

Abre [Cadenas de producción](/production-chain) (Calculadoras en el menú lateral).

![Cadenas de producción con 100 RAT al día como objetivo, los ajustes y las tarjetas de resultados](/images/help/guides/chain-targets.webp)

1. En **Producir al día**, elige un material en **Añadir material**.
2. Escribe la cantidad que quieres al día. Un objetivo nuevo empieza en 10.
3. Añade más objetivos si quieres, por ejemplo DW, RAT y OVE juntos. La cadena comparte los pasos que tienen en común.

Los resultados, **Pasos** y **Gráfico** se rellenan al momento y se actualizan con cada cambio.

Más: [Primeros pasos](/help/tools_production_chain#getting-started).

## 2. Revisa los ajustes {#step-2}

Están encima de los resultados:

- **Precios**: la [[exchange-preference|preferencia de bolsa]] con la que PRUNplanner valora la cadena.
- **Materias primas**: **Comprar** (predeterminado) o **Extraer**.
- **Subproductos**: **Cubrir demanda** usa primero un [[byproduct|subproducto]] dentro de la cadena. **Vender** los vende todos.
- **Producción propia**: elige un imperio que ya tengas en marcha, y la cadena usa primero el excedente de ese imperio.

> [!warning]
> Elegir una preferencia en **Precios** también la convierte en tu preferencia de bolsa predeterminada, así que las demás herramientas que siguen tu predeterminada cambian con ella.

Más información: [Ajustes](/help/tools_production_chain#settings), [Producción propia](/help/tools_production_chain#own-production).

## 3. Decide qué fabricar y qué comprar {#step-3}

**Pasos** lista una vez cada material de la cadena. Para cada uno, **Origen** dice si lo fabricas (**Fabricar**), lo compras (**Comprar**) o lo extraes (**Extraer**), y **Fabricar o comprar** dice si fabricarlo ahorra dinero.

- Las etiquetas encima de los pasos resumen lo que conviene mirar. **Más baratos de comprar** lista los pasos que fabricas por más del precio de la bolsa, y **Comprar los …** los pasa a compra.
- **Mercados poco líquidos** lista los materiales comprados de los que la cadena necesita el 10 % o más de lo que la bolsa negocia al día. Comprar tanto probablemente moverá el precio. También lista los materiales que no se han negociado allí en 30 días. Por ejemplo, si una bolsa negoció 30.000 unidades de un material en los últimos 30 días, eso son 1.000 al día. Una cadena que compra 120 al día necesita 120 ÷ 1.000 = 12 %, así que aparece en la lista.
- Si un material tiene varias [[recipe|recetas]], haz clic en «n recetas ▾» para comparar su efecto en la cadena.

Más: [Pasos](/help/tools_production_chain#steps), [Avisos](/help/tools_production_chain#warnings).

## 4. Lee los resultados {#step-4}

La franja de arriba suma toda la cadena:

- **Beneficio / día** es el valor producido menos los insumos comprados, el [[upkeep|mantenimiento]] de la mano de obra, el desgaste y las tasas de producción.
- **Edificios**, **Área** y **Mano de obra** muestran lo que hace falta.
- **Construcción** es lo que cuesta construirla, con su [[payback|amortización]].

La amortización es construcción ÷ beneficio al día. Por ejemplo, una cadena que cuesta 3.000.000 ȼ de construir y gana 25.000 ȼ al día se amortiza en 3.000.000 ÷ 25.000 = 120 días. Sin beneficio, la franja muestra «no se amortiza».

Lo que buscas es un beneficio que amortice la construcción en un plazo que te parezca aceptable. Si no es así, cambia un objetivo o pasa pasos de fabricar a comprar o al revés, y fíjate en la franja.

Detalles: [Resultados](/help/tools_production_chain#results), [Cómo se calculan los costes](/help/tools_production_chain#how-costs-are-calculated).

## 5. Reparte la cadena en bases {#step-5}

Abre la pestaña **Bases**. Muestra tres pasos, y el siguiente es el botón principal.

![La pestaña Bases de Cadenas de producción con Distribución automática, Ajustar ritmo y Crear los planes](/images/help/guides/chain-bases.webp)

1. Elige el tamaño en **Bases de hasta**: 500 de área (1 permiso), 750 o 1.000.
2. Pulsa **Distribución automática**. Agrupa los pasos en bases de una [[expertise|especialización]] cada una y elige un planeta para cada base. Ese planeta tiene una parcela libre, ningún plan tuyo, y los recursos y la fertilidad que necesita la base. La distribución automática prefiere un programa del COGC que ayude y distancias cortas.
3. ¿Prefieres un número concreto de bases? Fija **Número de bases** y pulsa **Ajustar ritmo**. Escala todos los objetivos por igual al mayor ritmo que cabe, y luego distribuye la cadena.

> [!warning]
> **Distribución automática** y **Ajustar ritmo** empiezan de cero. Pierdes los nombres, planetas, elecciones de COGC, lujos y expertos que hayas cambiado antes, así que distribuye primero y ajusta después.

Más: [Distribuir en bases](/help/tools_production_chain#auto-layout), [Cómo se eligen los planetas](/help/tools_production_chain#planet-picking), [Ajustar el ritmo](/help/tools_production_chain#fit).

## 6. Ajusta las bases {#step-6}

En cada tarjeta de base puedes cambiar el nombre de la base, elegir otro planeta, elegir su programa del COGC, fijar sus **Lujos** y **Expertos**, fusionarla con otra base o separarla.

El selector de planeta resuelve la base en cada planeta, para que puedas comparar edificios y área. También marca los planetas donde ya tienes un plan. **Envíos al día** lista lo que se mueve entre tus bases y la bolsa, en toneladas y m³, con los [[jumps|saltos]].

Estás listo para el siguiente paso cuando todas las bases tienen planeta y caben en 1.000 de área, y el tercer paso ofrece crear los planes.

Más: [Resumen y tarjetas de base](/help/tools_production_chain#base-cards).

## 7. Crea los planes {#step-7}

Pulsa «Crear … planes…» en el tercer paso, o **Crear planes**.

1. Revisa el nombre de cada plan.
2. Elige **Nuevo imperio** (el predeterminado, con una **Facción**), **Añadir a** un imperio existente o **Sin imperio**.
3. Confirma. La página se queda en la cadena y enlaza los planes nuevos y el imperio.

Cada plan recibe los edificios, recetas, habitación, un STO, el programa del COGC, los permisos, los lujos y los expertos de su base.

Más información: [Crear planes](/help/tools_production_chain#create-plans).

## 8. Revisa los planes {#step-8}

La cadena deja algunas cosas a los planes, así que abre cada plan nuevo y revísalo como base:

- **Planeta** e **Imperio y precios**: la cadena deja las bonificaciones de HQ y de facción a los planes. Marca **Sede corp.** en **Planeta** donde corresponda, y revisa la facción y los permisos del imperio.
- Las tarjetas de resultados: **Beneficio / día**, **Amortización** y **Área** dentro de tus permisos.
- **Revisión del plan**: si el mercado absorbe lo que vende esta base y suministra lo que compra.
- **Construcción**: lo que aún necesitas para construirla.

De vuelta en Cadenas de producción, la **Lista de compra** suma lo que compra la cadena durante un número de días, y **Copiar acción de compra XIT** la copia como acción de [[xit|XIT]].

> [!tip]
> **Copiar enlace de la cadena** guarda toda la cadena como un enlace, para que puedas volver a ella o compartirla.

Más: [Configuración de la base](/help/plan_base#empire-and-prices), [Revisión del plan](/help/plan_check), [Lista de compra](/help/tools_production_chain#buy-list).

## Siguientes pasos {#next}

- [Crecer hasta un imperio](/help/guide_empire): revisa juntas las bases nuevas en la página Imperio.
- [Pasar al juego](/help/guide_hand_off): construcción, suministro y paquetes de XIT para construirlas.
