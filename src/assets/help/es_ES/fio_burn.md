[FIO Consumo](/fio/burn) te dice qué base necesita reabastecerse primero y prepara la carga de [[xit|XIT]] para ella. Muestra cuántos días dura el stock de cada una de tus bases, según tus planes y tu almacenamiento real de [[fio|FIO]].

## Antes de empezar {#before-you-start}

- Necesitas una [conexión con FIO](/help/profile#fio-connection). Sin ella, la página te pide que conectes FIO en tu Perfil.
- La página muestra un [[empire|imperio]], que eliges en **Imperio**. Eso también lo convierte en tu **Imperio predeterminado**. Sin ningún imperio, la página ofrece **Crear imperio**.
- Cada plan del imperio tiene que estar en el planeta de una base que tengas en el juego. Si FIO no tiene almacén de base en el planeta de un plan, todo el stock cuenta como 0. Si un plan muestra 0 en todo el stock, comprueba que está en el planeta donde está tu base.

La cabecera muestra cuándo actualizó FIO tus datos por última vez («Actualización de datos FIO»). [Perfil](/help/profile#fio-connection) explica cómo de recientes son.

## Cálculos {#calculations}

FIO Consumo calcula cada plan del imperio, igual que la página Imperio, y toma la [[material-io|E/S de materiales]] de cada plan (necesidades de producción y de mano de obra).

Para cada material del que el plan usa más de lo que produce:

_días restantes = stock ÷ consumo diario neto_

El stock es la cantidad de ese material en el almacén de tu base en el planeta del plan, según FIO. Un material del que el plan produce tanto como usa, o más, nunca se agota («producido aquí»). El **Consumo** de un plan son sus días restantes más bajos.

El consumo diario neto es lo que el plan usa del material al día menos lo que produce. La tabla del plan lo muestra como un **Delta** negativo (producción − consumo), así que un **Delta** de −30 significa 30 netas al día. Por ejemplo, un plan que usa 40 de un material al día y produce 10 consume 30 netas al día. Con 300 en el almacén, eso dura 300 ÷ 30 = 10 días.

FIO Consumo no cuenta:

- Almacenes y naves. Solo mira el almacén de la base en el planeta.
- La [[degradation|degradación]] ni los materiales de reparación, que no forman parte de la E/S de materiales. Para eso usa [FIO Reparación](/help/fio_repair).
- Lo que de verdad funciona en el juego. Las cifras salen de tu plan, así que si el plan difiere de tu base, obtendrás otros días.

> [!warning]
> Cada plan cuenta todo el almacén de su planeta. Si dos planes del mismo imperio están en un mismo planeta, ambos ven todo el stock, así que los días restantes salen demasiado altos. Mantén un plan por planeta en el imperio que revisas.

## Umbrales {#thresholds}

Los colores muestran lo pronto que se agota un material, en _días de suministro restantes_:

- **Rojo**: días restantes iguales o por debajo del umbral rojo (5 por defecto).
- **Amarillo**: días restantes iguales o por debajo del umbral amarillo (10 por defecto).

Con los valores por defecto (rojo 5, amarillo 10), un material al que le quedan 4 días se muestra en rojo, uno con 8 en amarillo, y uno con 12 no tiene color.

Puedes fijar ambos en **Umbrales de consumo** en esta página o en [Perfil](/help/profile#preferences) (**Umbral rojo**, **Umbral amarillo**). Es la misma preferencia, guardada en tu cuenta. Ambos valen como mínimo 1. Mantén el amarillo por encima del rojo, o nada se mostrará en amarillo.

## Resumen de consumo de los planes {#overview}

**Resumen de consumo de los planes** da una fila por plan, con el **Consumo** del plan y una franja con un punto por material consumido en sus días restantes. La franja va de 0 a tres veces el umbral amarillo, y los materiales que lo superan se cuentan como «+n». Pasa el ratón o toca un punto para ver de qué material se trata. El resumen cuenta los materiales en rojo y en amarillo.

## Tabla de planes {#plan-table}

Junto al resumen (debajo en pantallas más estrechas), cada plan tiene una fila con su **Agotamiento** (los días restantes más bajos) y un botón XIT. Despliega la fila para ver qué material se agota primero, cuántos más están por debajo del umbral amarillo y cuántos produce el propio plan. Su tabla lista cada material con **Consumo** y **Producción** (ambos solo en pantallas anchas), **Delta**, **Stock**, una barra de **Autonomía** y su **Consumo** en días.

## Reabastecimiento XIT {#xit-resupply}

El botón XIT abre el reabastecimiento de la base de ese plan (**Reabastecimiento XIT: {plan_name}**):

| Control               | Qué hace                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origen**            | Dónde carga la nave: **Configurar al ejecutar** o el almacén de una estación. El valor predeterminado viene de **Origen de XIT** en el Perfil.                       |
| **Días objetivo**     | Cuántos días de suministro llevar. El valor predeterminado viene de **Días de reabastecimiento** en el Perfil (20).                                               |
| **Comprar en CX**     | Compra primero los materiales en la bolsa del origen. Solo funciona con un almacén como origen. El valor predeterminado viene de **XIT Comprar de CX** en el Perfil. |
| **Ajustar a la nave** | 500, 1k, 2k, 3k/1k, 1k/3k o 5k (t / m³). Fija el mayor número de días, hasta 100, cuya carga cabe.                                                                |
| **Ocultar infinitos** | Oculta los materiales que nunca se agotan.                                                                                                                                                           |

**Ajustar a la nave** escribe su resultado en **Días objetivo**. Empieza con los días fijados ahí, quita días hasta que la carga cabe tanto en el peso como en el volumen de la nave, y luego añade días mientras siga cabiendo.

**Origen**, **Días objetivo** y **Comprar en CX** son preferencias de tu Perfil. Un cambio aquí se guarda en tu cuenta. El origen y la compra también se aplican a las demás acciones de XIT, como las de FIO Reparación y las de los carritos del plan.

La cantidad por material es lo que completa el stock hasta los días objetivo: consumo diario neto × días − stock, redondeado hacia arriba, nunca por debajo de 0. Puedes desmarcar un material o cambiar su cantidad. Los totales muestran peso, volumen y precio. El precio es una estimación a precios de compra de Universe · VWAP 30D, no de tu preferencia de bolsa, así que puede diferir de lo que pagas en la bolsa del origen.

En el ejemplo de [Cálculos](/help/fio_burn#calculations), con **Días objetivo** en 20 la cantidad es 30 × 20 − 300 = 300 unidades, que completan el almacén hasta 600, 20 días de uso neto.

**Copiar XIT JSON** copia el paquete («PRUNplanner Burn Supply») para Refined PrUn. Con **Comprar en CX**, primero compra en la bolsa del origen y luego traslada la carga. El destino lo eliges cuando lo ejecutas.
