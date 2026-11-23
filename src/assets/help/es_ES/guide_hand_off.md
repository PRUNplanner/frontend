PRUNplanner planifica tus bases. Tú las construyes y las gestionas en el juego. Esta guía trata del traspaso, y al terminar tendrás:

- FIO conectado, para que PRUNplanner vea tus bases y tus almacenes,
- los materiales para construir una base y su primer suministro, como paquetes de [[xit|XIT]] que hacen las compras y el transporte por ti,
- FIO Consumo y FIO Reparación configurados para mantener abastecidas y reparadas las bases en marcha.

Es para jugadores a punto de construir una base planificada. Lleva unos 15 minutos, más una configuración única de FIO. Las páginas enlazadas al final de cada paso profundizan más.

## 1. Conecta FIO {#step-1}

[[fio|FIO]] es una extensión gratuita del navegador, hecha por la comunidad, que lee tus datos del juego. Con ella, PRUNplanner sabe qué hay construido en tus planetas y qué tienes en tus almacenes.

![La conexión con FIO en la página Perfil, conectada, con los campos Usuario de PrUn y Clave de API de FIO](/images/help/guides/hand-off-fio.webp)

1. Instala la extensión de FIO y registra tu cuenta de FIO desde el botón de extensiones del juego.
2. En la web de FIO, crea una clave API para PRUNplanner.
3. En tu [Perfil](/profile), en **Conexión con FIO**, introduce la **Clave de API de FIO** y tu **Usuario de PrUn** y pulsa **Guardar**.

Cuando funcione, el icono de FIO al final del menú lateral muestra un punto verde. Pasa el puntero por él para ver **FIO activo** y cuándo se actualizó FIO por última vez. **FIO Consumo** y **FIO Reparación** aparecen ahora en Herramientas. Mientras usas PRUNplanner, tus datos de FIO tienen como mucho unos 30 a 45 minutos de antigüedad.

Más: [Conexión con FIO](/help/profile#fio-connection).

## 2. Compra y envía los materiales de construcción {#step-2}

Abre el plan de la base (desde el menú lateral o desde la lista de planes de [Imperio](/empire)) y ve a su pestaña **Construcción**, el [[construction-cart|carrito de construcción]].

![La herramienta Construcción de un plan: Construidos, Cantidad y Planificados por edificio, y el botón XIT](/images/help/guides/hand-off-construction.webp)

- **Construidos** empieza con lo que FIO ve en el planeta, y **Cantidad** es lo que queda por construir.
- **Materiales por comprar** descuenta las existencias del almacenamiento que elijas en **Almacenamiento**, así que **Necesidad** es lo que aún tienes que conseguir. Por ejemplo, con una **Cantidad** de 120 BSE y 40 en el almacén, **Necesidad** es 80. Con 150 en el almacén es 0, nunca menos.
- Un aviso junto a **Cantidad** te indica cuándo los edificios necesitarían más trabajadores de los que alojan sus hábitats.

El botón XIT junto a **Almacenamiento** envía solo la **Necesidad**. El de arriba de la herramienta lo envía todo y no tiene en cuenta las existencias.

Más información: [Construcción](/help/plan_tools#construction).

## 3. Planifica el primer suministro {#step-3}

Abre la pestaña **Suministro**, el [[supply-cart|carrito de suministros]]. Lista los consumibles de la mano de obra y los insumos de producción que necesita la base durante **Duración del stock (días)** (20 por defecto), menos lo que hay en existencias.

![La herramienta Suministro de un plan con sus botones XIT](/images/help/guides/hand-off-supply.webp)

> [!tip]
> Para el primer vuelo de todos, usa **XIT inicial**. El botón XIT normal descuenta lo que fabrica la propia base, así que una base que fabrica su propio DW o RAT llegaría sin nada de eso antes de que empiece la producción.

Más: [Suministro](/help/plan_tools#supply), [XIT y XIT inicial](/help/plan_tools#supply-xit).

## 4. Ejecuta el paquete de XIT en el juego {#step-4}

Cada botón XIT abre un panel con un paquete para [Refined PrUn](https://github.com/refined-prun/refined-prun), la extensión del navegador para el juego.

1. Elige **Origen**: un almacén de estación, o **Configurar al ejecutar** para elegirlo cuando lo ejecutes.
2. Deja activado **Comprar en CX** para comprar primero los materiales en la bolsa de esa estación. Necesita un almacén como origen.
3. Pulsa **Copiar** para copiar el JSON.
4. En el juego, Refined PrUn lo ejecuta con su comando XIT ACT. El destino lo eliges al ejecutarlo.

PRUNplanner guarda **Origen** y **Comprar en CX** con tus preferencias, y todos los botones XIT los comparten.

Detalles: [Acciones de XIT](/help/plan_tools#xit).

## 5. Mantén tus bases abastecidas con FIO Consumo {#step-5}

Abre [FIO Consumo](/fio/burn) y elige el imperio. Para cada plan, divide las existencias del almacén de tu base en ese planeta entre el consumo neto diario del plan y muestra cuántos días dura cada material.

![FIO Consumo: los umbrales de consumo y los días restantes por base](/images/help/guides/hand-off-burn.webp)

- El rojo y el amarillo marcan los materiales que están en tus umbrales o por debajo (5 y 10 días por defecto). Por ejemplo, 160 RAT en el almacén y un consumo neto de 20 al día duran 160 ÷ 20 = 8 días. Eso está en 10 o por debajo, pero por encima de 5, así que se muestra en amarillo.
- El botón XIT de un plan abre su reabastecimiento XIT. Fija **Días objetivo** o deja que **Ajustar a la nave** elija el mayor número de días que caben en un tamaño de nave, y luego pulsa **Copiar XIT JSON**.

> [!warning]
> FIO Consumo cuenta a partir de tu plan, no de lo que de verdad funciona en el juego. Ten un plan por planeta en el imperio y mantén el plan al día con tu base, o los días no serán correctos.

Más: [FIO Consumo](/help/fio_burn), [Reabastecimiento XIT](/help/fio_burn#xit-resupply).

## 6. Planifica las reparaciones con FIO Reparación {#step-6}

Los edificios se desgastan, y la factura de [[repair|reparación]] crece cuanto más esperas. La pestaña **Reparación** de un plan encuentra el mejor intervalo para cada tipo de edificio.

![FIO Reparación: cuándo vencen las bases, y las bases con sus fechas de reparación](/images/help/guides/hand-off-repair.webp)

Abre [FIO Reparación](/fio/repair). Asocia tus planes con tus bases reales y muestra qué bases están vencidas, vencen pronto o vencen más adelante.

1. Abre una base. Comprueba que **Objetivo de reparación** indica el plan que usas allí.
2. En **Vuelo de reparación**, pon en **Llega en** los días que necesita tu nave.
3. **Reparación XIT** prepara el paquete con los materiales de reparación.
4. Vuela a la base, descarga y ejecuta BRA en el juego para reparar todos sus edificios.

Más información: [FIO Reparación](/help/fio_repair#repair-flight), [Reparación](/help/plan_tools#repair).

## 7. Dónde toma el relevo el juego {#step-7}

El trabajo de PRUNplanner es el plan: qué construir, dónde, a qué precio y cuándo se amortiza. Termina en una exportación que ejecutas en el juego. La gestión diaria de tus bases ocurre en el juego y en sus extensiones del navegador, Refined PrUn y su fork OOG, que funcionan dentro del juego con tus datos en directo.

- ¿Has cambiado tu base en el juego? Cambia también el plan. FIO Consumo y FIO Reparación cuentan a partir de tus planes, así que un plan distinto de tu base da otros días y otras fechas de vencimiento.
- ¿Planificas una ampliación? Vuelve al plan, a una copia o a un plan nuevo, y compara antes de construir.
- ¿Quieres tus cifras en una hoja de cálculo? Una [clave API](/help/api_keys) permite que una hoja de Google lea la E/S de materiales de tu imperio.

Más: [Tu primera base](/help/guide_first_base), [Crecer hasta un imperio](/help/guide_empire).

## Siguiente {#next}

- [Crecer hasta un imperio](/help/guide_empire): revisa todas tus bases juntas antes de añadir la siguiente.
- [Glosario](/help/glossary): los términos del juego y de planificación en un solo sitio.
