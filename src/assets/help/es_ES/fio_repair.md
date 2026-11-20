[FIO Reparación](/fio/repair) te dice cuándo le toca la [[repair|reparación]] a cada una de tus bases reales, cuánto cuesta y qué cargar en la nave. Lee tus edificios de [[fio|FIO]], así que primero necesitas una [conexión con FIO](/help/profile#fio-connection).

Úsalo antes de un viaje de reparación: muestra qué bases están pendientes y prepara la carga y un paquete de XIT para el vuelo. Cuando uno de tus planes coincide con una base, toma los días de reparación del Análisis de reparaciones de ese plan.

## Fechas de vencimiento {#due-dates}

FIO Reparación lee de FIO los edificios de producción de cada base, con su condición y el día en que se repararon por última vez (o se construyeron, si nunca se repararon). Los hábitats, el almacenamiento y el módulo central también envejecen, pero no necesitan materiales de reparación, así que se dejan fuera.

Cada tipo de edificio vence en un día objetivo:

- **Con un plan asociado**, el objetivo es el mejor día de reparación del tipo según el Análisis de reparaciones de ese plan (consulta [Herramientas del plan](/help/plan_tools#repair)), valorado con la preferencia de bolsa del imperio del plan. Un tipo de edificio que el plan no tiene usa el intervalo de abajo.
- **Sin plan**, el objetivo es el intervalo de los ajustes (**Reparar cada** n días, 60 por defecto).

El edificio más antiguo de un tipo marca cuándo vence ese tipo, y una base vence con su primer tipo de edificio. Una base _vence pronto_ cuando le faltan como mucho **Próximo** días para su objetivo (7 por defecto). Si un edificio no tiene ninguna fecha, su base muestra **Sin fecha de reparación**. Cuenta como vencida y se factura como un edificio nuevo. No te preocupes: solo significa que FIO no envió fecha para uno de sus edificios, y la factura cuenta ese edificio con lo máximo que puede costar su reparación.

## Ajustes {#settings}

La barra de ajustes está arriba:

| Ajuste                                | Por defecto              | Qué hace                                                                                                                                                                                                      |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usar planes asociados**             | activado                 | Usa los mejores días de los planes asociados. Si está desactivado, todas las bases se reparan según el intervalo. Está activado cada vez que abres la página. |
| **Reparar cada** / **Sin plan, cada** | 60 días                  | El intervalo para las bases sin plan (1–180)                                                                                                                                               |
| **Próximo**                           | 7 días                   | Días antes del día objetivo que cuentan como vencimiento próximo (0–60)                                                                                                                    |
| **Preferencia de bolsa**              | tu **CX predeterminada** | Precios de los materiales de reparación                                                                                                                                                                       |

El intervalo, los días de vencimiento próximo y la preferencia de bolsa son los mismos ajustes que encontrarás en [Perfil y preferencias](/help/profile#preferences), y se guardan en tu cuenta.

## Resumen {#overview}

- **Vencido**, **Vence en n d** y **Más adelante** cuentan tus bases. Haz clic en uno para filtrar la lista. Vencido incluye las bases sin fecha de reparación.
- **Reparar lo pendiente, hoy** es el coste, el peso y el volumen de reparar hoy todas las bases vencidas y próximas a vencer.
- **Coste de esperar** es cuánto más cuesta esa reparación por cada día que esperas. Cada uno de esos edificios con menos de 180 días suma 1/180 de su coste de construcción. Por ejemplo (cifras inventadas), dos de esos edificios que costaron 90.000 ȼ y 180.000 ȼ de construir suman 500 + 1.000 = 1.500 ȼ por cada día que esperas.
- **Cuándo vencen las bases** es una línea de tiempo que va desde la base más vencida hasta la última que vence. Haz clic en una base para abrirla.
- La lista **Bases** muestra de cada base sus edificios, la condición más baja, los días desde la reparación (o desde la construcción), la próxima reparación y **Reparar ahora**, la factura de reparar hoy todos los edificios de producción. Bajo el nombre ves qué plan fija los objetivos: «plan …», «plan probable …», «plan … (tu elección)» o «sin plan · cada n d».

Cuando tus datos de FIO tienen más de un día, una nota te lo indica. Los edificios han envejecido desde entonces, así que las condiciones son más bajas y las cantidades más altas de lo que se muestra. Las edades siempre se cuentan hasta hoy.

## Planes asociados {#matched-plans}

Un plan se asocia con una base cuando está en el mismo planeta y sus edificios de producción coinciden lo bastante con FIO. Por tipo de edificio, PRUNplanner cuenta los edificios que tienen ambos y los divide entre el total mayor (el de FIO o el del plan). El plan se asocia a partir del 80 %, así que los edificios de más en el plan también bajan la puntuación.

Por ejemplo, una base tiene 4 FRM y 2 FP, y un plan en su planeta tiene lo mismo más 1 PP1. Tienen 6 edificios en común, y el total mayor es el del plan, 7, así que la puntuación es 6 ÷ 7, un 86 % aproximadamente: una asociación probable. Un plan con solo los 4 FRM puntúa 4 ÷ 6, un 67 % aproximadamente, y no se asocia.

- **Asociado**: coinciden todos los edificios.
- **Probable**: coincide al menos el 80 %. Comprueba que sea el plan que usas.

Cuando varios planes cumplen los requisitos, gana la mejor puntuación. En caso de empate, gana el plan del imperio que abarca más bases tuyas. Para elegir otro plan, o ninguno, abre una base y usa **Objetivo de reparación**, donde cada opción muestra su % de coincidencia. PRUNplanner guarda tu elección para esa base en tus preferencias, en todos tus dispositivos. **Volver a la asociación automática** la deshace. Cuando ninguno de tus planes está en ese planeta, **Crear un plan para {planet}** empieza un plan nuevo allí.

## Vuelo de reparación {#repair-flight}

Abre una base para planificar la reparación. Su tabla lista cada tipo de edificio con su objetivo, los días desde la reparación, la condición y el día de vencimiento.

Reparar sale más caro cada día. La factura crece hasta el día 180, cuando iguala a un edificio nuevo. En **Vuelo de reparación**:

- **Llega en** n días (2 por defecto, 0–30) calcula la factura para el día en que la nave descarga, y muestra cuánto más cuesta eso que reparar hoy. Añade un día o dos en vuelos largos.
- **Usar lo que ya hay en el almacén de la base** descuenta lo que la base ya tiene.
- **Peso de la carga** y **Volumen de la carga** muestran el total de la carga, y la lista de carga muestra la cantidad y el precio de cada material, además del precio total.

**Reparación XIT** prepara un paquete ACT de [[xit|XIT]] con la carga para que lo ejecute Refined PrUn. Usa el mismo origen de XIT y el mismo ajuste «Comprar en CX» que FIO Consumo (ambos se configuran en [Perfil y preferencias](/help/profile#preferences)). La nave se elige cuando se ejecuta el XIT, y necesita las toneladas y los metros cúbicos de la carga libres en la bodega. Vuela a la base, descarga y ejecuta BRA para reparar todos sus edificios.

## Precios {#prices}

Los precios salen de tu **CX predeterminada** (que aquí aparece como **Preferencia de bolsa**), usando solo sus reglas para todos los planetas y sus precios fijos. No se usan las excepciones por planeta. Si no tienes ninguna predeterminada, o se eliminó, los precios son Universe · VWAP 30D. Consulta [Bolsas y preferencias de bolsa](/help/exchanges).
