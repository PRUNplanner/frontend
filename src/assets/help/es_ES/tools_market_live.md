Mercado en vivo te permite vigilar los precios y los libros de órdenes de la [[cx|CX]] mientras negocias. Muestra los cambios de las cuatro bolsas de materias primas según llegan y compara cada uno con las alertas que configures, para que veas los movimientos que te interesan sin tener que recargar nada.

## De dónde vienen los datos {#data-stream-mechanics}

[[fio|FIO]] es el servicio de la comunidad que alimentan los clientes del juego de los jugadores. Reenvía las actualizaciones de las bolsas a PRUNplanner, que pasa cada una directamente a tu navegador. No hay un intervalo fijo, ya que los datos llegan cada vez que FIO recibe cambios.

- Solo se transmiten AI1, CI1, IC1 y NC1.
- Un material y una bolsa solo aparecen después de que FIO haya enviado una actualización de ellos. Los materiales con poco movimiento pueden tardar mucho en aparecer.
- PRUNplanner guarda los últimos 500 cambios aproximadamente. Al abrir la página recibes primero esos, para que el resumen no esté vacío, y después los nuevos según llegan.

> [!warning]
> Los cambios guardados llegan todos de golpe al abrir la página. Reciben la hora a la que llegaron a tu navegador, no la hora en que ocurrieron, y pasan por tus alertas activas como si fueran nuevos.

El estado de arriba a la derecha muestra **Conectado** (verde parpadeante), **Reconectando** o **Desconectado**. Si se corta la conexión, tu navegador vuelve a conectarse solo. Si el servidor rechaza la transmisión (por ejemplo, cuando hay demasiadas abiertas), la página lo vuelve a intentar a los 5 segundos, y espera más tras cada fallo, hasta 60 segundos. La espera se duplica cada vez, así que los intentos llegan a los 5, 10, 20 y 40 segundos, y después cada 60 segundos. Mientras la página espera, el estado indica **Reconectando**.

No te preocupes si indica **Desconectado** un momento. Lo muestra hasta que la transmisión se abre por primera vez, y mientras tu navegador vuelve a conectar una que se ha cortado.

El servidor acepta hasta 5 transmisiones abiertas por dirección IP, así que cierra Mercado en vivo en las pestañas que no necesites.

## Vista en vivo {#live-view}

El resumen de la derecha (debajo del feed en pantallas más estrechas) lista todos los materiales y bolsas recibidos hasta ahora, como `DW.NC1`, ordenados de la A a la Z. **Ocultar resumen** y **Mostrar resumen** lo muestran u ocultan.

| Columna                           | Qué muestra                                                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticker**                        | material y bolsa                                                                                                                                                                                |
| **Precio (ȼ)** | el precio de la actualización                                                                                                                                                                   |
| **Bid (ȼ)**    | la orden de compra más alta ([[bid]])                                |
| **Ask (ȼ)**    | la orden de venta más baja ([[ask]])                                 |
| **Diferencial %**                 | (Ask − Bid) ÷ Ask × 100 ([[spread\|diferencial]]) |
| **Vol. compra**   | unidades en todas las órdenes de compra abiertas                                                                                                                                                |
| **Vol. venta**    | unidades en todas las órdenes de venta abiertas                                                                                                                                                 |

Cada cambio actualiza los campos que trae. Si no trae precio, Bid o Ask, se mantiene el último valor. El volumen de compra y de venta es lo que hay en el libro de órdenes, no lo que se ha negociado.

Por ejemplo, un Bid de 90 ȼ y un Ask de 100 ȼ dan un **Diferencial %** de (100 − 90) ÷ 100 × 100 = 10 %. Si el cambio no trae Bid o Ask, el diferencial usa en su lugar la mejor orden de compra o de venta de su libro.

## Feed de alertas {#alert-feed}

El **Feed de alertas** lista todas las alertas que se han activado, de la más reciente a la más antigua, hasta 500. **Vaciar feed** lo vacía. El feed solo existe en esta página. Se vacía cuando sales de Mercado en vivo, y no te llega nada a ningún otro sitio: ni notificaciones, ni sonidos, ni correos.

| Columna                  | Qué muestra                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Ticker / Alerta**      | material y bolsa, con el nombre de la alerta                                             |
| **Gravedad**             | **BAJA**, **MEDIA** (ámbar) o **ALTA** (fila roja) |
| **Lógica de activación** | cada condición que se cumplió: campo, valor, operador, objetivo          |
| **Evento**               | en campos numéricos: el valor anterior y el nuevo                        |
| **Hora**                 | cuándo llegó el cambio, como HH:mm:ss                    |

Pasa el puntero por una fila para ver los valores del cambio que la activó. Verás el precio, el Bid, el Ask, el diferencial y el volumen de compra y de venta con su [[vwap|VWAP]] y su variación, y una barra del volumen de compra frente al de venta. En pantallas estrechas se ocultan algunas columnas.

La campana (**Notificaciones de alertas**) pausa y reanuda la comprobación de alertas durante esta visita. Está activada al abrir la página, y los cambios que llegan mientras está desactivada nunca activan alertas.

Hasta que se active una alerta, el feed muestra **Esperando eventos de mercado que activen alertas...**.

## Historial de datos {#data-history}

**Historial de datos**, bajo el Feed de alertas, agrupa los cambios entrantes por minuto y muestra cuántos materiales y bolsas enviaron uno («Ticker recibidos») y cuáles. Guarda los últimos 25 minutos que tuvieron datos.

## Motor de alertas {#alert-engine}

Una alerta es un conjunto de condiciones. Cada vez que llega un cambio para un material y una bolsa, PRUNplanner comprueba cada alerta activa con los valores nuevos y los valores anteriores de ese mismo material y esa misma bolsa. Cuando se cumplen las condiciones, la alerta añade una fila al feed.

Una condición lee el valor nuevo de su campo del cambio que llega, no del resumen. Si ese cambio no trae el campo, por ejemplo si no tiene precio, una condición sobre **Precio** no se cumple.

PRUNplanner guarda las alertas en este navegador, solo para tu cuenta: «Las alertas se guardan por ahora solo en este dispositivo y no se sincronizan con tu cuenta.» Otro navegador u otro dispositivo empieza sin ellas.

### Configuración {#setup}

Una condición tiene tres partes: un campo, un operador y un objetivo. Por ejemplo, **Precio** GT **Valor** 100.

#### Campos {#fields}

| Campo                                                                                                                                                 | Significado                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Ticker**, **Código de bolsa**                                                                                                                       | el ticker del material, el código de la bolsa (texto)         |
| **Precio**, **Bid**, **Ask**                                                                                                                          | precio, Bid y Ask como en el resumen                                             |
| **Cambio de precio**, **Cambio de Bid**, **Cambio de Ask**                                                                                            | valor nuevo − valor anterior                                                     |
| **Cambio de precio (porcentaje)**                                                                                                  | Cambio de precio ÷ precio anterior × 100                                         |
| **Demanda**, **Oferta**                                                                                                                               | la demanda y la oferta tal como las indica el cambio                             |
| **Negociado**, **Volumen**                                                                                                                            | las cifras negociadas tal como las indica el cambio                              |
| **Volumen de compra**, **Volumen de venta**                                                                                                           | unidades en todas las órdenes de compra o de venta abiertas                      |
| **Cambio del volumen de compra (abs.)**, **Cambio del volumen de venta (abs.)** | cuánto cambió ese volumen, sin signo                                             |
| **VWAP de compra**, **VWAP de venta**                                                                                                                 | precio medio ponderado por unidades de las órdenes de compra o de venta abiertas |
| **Mejor precio Bid**, **Mejor precio Ask**                                                                                                            | la orden de compra más alta y la orden de venta más baja del libro               |
| **Diferencial**, **Diferencial (porcentaje)**                                                                                      | Ask − Bid, y eso como porcentaje del Ask                                         |

**Cambio de precio**, **Cambio de Bid**, **Cambio de Ask** y **Cambio de precio (porcentaje)** necesitan un valor anterior, así que están vacíos en el primer cambio de un material y una bolsa. Los dos campos de cambio de volumen marcan 0 en ese caso.

Por ejemplo, si el precio anterior era 200 ȼ y el nuevo es 210 ȼ, **Cambio de precio** es 210 − 200 = 10 y **Cambio de precio (porcentaje)** es 10 ÷ 200 × 100 = 5.

#### Comparaciones {#comparisons}

Los campos numéricos ofrecen:

- GT: mayor que
- LT: menor que
- EQ: igual
- NEQ: distinto

**Ticker** y **Código de bolsa** solo ofrecen MATCHES, que significa igual, sin distinguir mayúsculas y minúsculas. Su objetivo es siempre un texto fijo (se muestra como **Texto**).

#### Objetivos de comparación {#comparison-targets}

| Objetivo      | Compara el campo con                                                                             | Útil para                                          |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Valor**     | un número (o texto) fijo que introduces                                       | precios mínimos y máximos, un material o una bolsa |
| **Anterior**  | el valor anterior del campo para ese material y esa bolsa (**Dato anterior**) | cualquier cambio, saltos repentinos                |
| **Desfase %** | el valor anterior × (1 + desfase ÷ 100)                                       | movimientos de un tamaño dado                      |

**Anterior** y **Desfase %** nunca se activan con el primer cambio de un material y una bolsa, porque todavía no hay nada con qué comparar.

Por ejemplo, **Precio** GT **Desfase %** 2 se activa cuando el precio sube más de un 2 % respecto al último cambio. **Precio** LT **Desfase %** −2 se activa con una bajada de más del 2 %. Con un precio anterior de 100 ȼ, el objetivo del primer ejemplo es 100 × (1 + 2 ÷ 100) = 102 ȼ, así que un precio nuevo de 102,50 ȼ la activa y uno de 101,90 ȼ no.

#### Operadores lógicos {#logical-operators}

Las condiciones están en un grupo, y **Coincidencia** fija cómo las combina el grupo:

- AND: todas las condiciones del grupo deben cumplirse.
- OR: basta con que se cumpla una condición.

Un grupo puede contener otros grupos (**Grupo**). Así puedes construir algo como (**Ticker** MATCHES RAT AND (**Cambio de precio (porcentaje)** GT 2 OR **Cambio de precio (porcentaje)** LT −2)). La columna **Lógica de activación** del feed lista las condiciones que hicieron saltar la alerta. Con OR, es la primera que se cumplió.

Un grupo AND sin condiciones cuenta como cumplido. Así que una alerta activa cuyo grupo principal sigue vacío se activa con cada cambio.

### Crear alertas {#setting-up-alerts}

Hasta que crees una, el gestor de alertas dice «No se han encontrado alertas. Empieza creando tu primera señal de detección».

1. Pulsa **Abrir gestor de alertas**.
2. Pulsa **Crear nueva alerta**. Aparece al momento en la lista una alerta en pausa llamada **Nueva alerta**, con gravedad **BAJA** y un grupo AND vacío.
3. Pasa el puntero por la alerta y pulsa **Editar** para abrir **Editar alerta**.
4. Fija **Nombre de la alerta** y **Gravedad** (**BAJA**, **MEDIA**, **ALTA**).
5. En **Configuración de la lógica**, fija **Coincidencia**. Añade condiciones con **Condición** (una nueva empieza como **Demanda** EQ **Valor** 0) o grupos anidados con **Grupo**. **Quitar** elimina una condición o un grupo anidado, pero no hace nada en el grupo principal. Un grupo sin condiciones muestra **Grupo vacío**.
6. Cambia **Estado** de **En pausa** a **Activa**.
7. Pulsa **Guardar**, o **Descartar** para desechar tus cambios.

> [!tip]
> Añade al menos una condición antes de poner una alerta en **Activa**. Una alerta activa con un grupo vacío llena el feed con todos los cambios.

Para cambiar una alerta más tarde, pasa el puntero por ella y pulsa **Editar**. **Eliminar** la borra al instante. La lista muestra el nombre de cada alerta y si está **Activa** o **En pausa**, y **Cerrar gestor de alertas** vuelve a ocultar la lista.
