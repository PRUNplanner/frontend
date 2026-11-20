Usa la Calculadora de mejora de HQ para planificar una mejora de [[hq-level|nivel de sede]]. Lista los materiales que necesitas para subir la sede de tu empresa de un nivel a otro, lo que ya tienes y lo que cuesta el resto, para que compres o envíes exactamente lo que falta.

En el juego, cada mejora de nivel de la sede te da un [[area-permits|permiso]] de base más. Usa la calculadora cuando te prepares para una mejora, o para ver lo que suponen varias mejoras seguidas.

## Elegir los niveles {#levels}

| Ajuste                  | Qué hace                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Del nivel de sede**   | tu nivel actual, de 1 a 50 (1 por defecto)                                                                                                             |
| **Al nivel de sede**    | el nivel al que quieres llegar. Solo ofrece niveles a partir de **Del nivel de sede** (3 por defecto)                                  |
| **Preferencia de CX**   | la [[exchange-preference\|preferencia de bolsa]] para los precios |
| **Mostrar ubicaciones** | muestra la columna **Ubicaciones de Almacenamiento** (activado por defecto)                                                                            |

La calculadora suma los materiales de cada mejora desde el nivel siguiente a **Del nivel de sede** hasta **Al nivel de sede**, así que puedes planificar varias mejoras a la vez. Con Del 1 y Al 3 muestra las mejoras a los niveles 2 y 3. Por ejemplo, el nivel 2 necesita 6 BBH y el nivel 3 necesita 16, así que **Cantidad** muestra 22 BBH. Con **Del nivel de sede** y **Al nivel de sede** iguales, no hay ninguna mejora que sumar y la tabla queda vacía.

Los materiales por nivel salen de una tabla incluida en PRUNplanner, que abarca los niveles 1 a 50.

Si subes **Del nivel de sede** por encima de **Al nivel de sede**, la tabla mantiene el resultado anterior. Para recalcular, elige un **Al nivel de sede** igual o superior al nuevo **Del nivel de sede**.

> [!warning]
> Elegir aquí una preferencia de bolsa también la convierte en tu preferencia de bolsa por defecto, así que las demás páginas que siguen tu preferencia por defecto cambian con ella.

## La tabla {#table}

La tabla tiene una fila por material, de la A a la Z por ticker. Haz clic en una cabecera para ordenar por ella. Funciona en todas las columnas salvo **Forzar stock** y **Ubicaciones de Almacenamiento**.

| Columna                                   | Qué muestra                                                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material**                              | el material. Haz clic en él para ver su ficha de mercado                                                                                                                 |
| **Cantidad**                              | cuántos necesitan las mejoras en total                                                                                                                                                   |
| **Almacenamiento**                        | cuántos tienes: tu stock de [[fio\|FIO]], o el que hayas forzado |
| **Forzar stock**                          | tu propia cifra de stock para este material                                                                                                                                              |
| **Necesario**                             | lo que aún necesitas: máx(Cantidad − Almacenamiento, 0)                                                                                               |
| **Coste / unidad (ȼ)** | el precio de compra según tu preferencia de bolsa                                                                                                                                        |
| **Coste total (ȼ)**    | Necesario × Coste / unidad                                                                                                                                                               |
| **Ubicaciones de Almacenamiento**         | dónde encontró FIO el material, p. ej. `120x @ <name> (WAR)`. El tipo es PLANET, WAR o SHIP                                              |

Los precios no dependen de un planeta, así que aquí no se aplican las excepciones por planeta de tu preferencia de bolsa.

## Tu stock {#stock}

Con FIO conectado, **Almacenamiento** es la suma del material en todas tus bases, almacenes y naves que indica FIO. Sin FIO es 0. No te preocupes si entonces todos los materiales muestran toda su **Cantidad** como **Necesario**: solo significa que PRUNplanner no conoce tu stock. Conecta FIO en tu [Perfil y preferencias](/help/profile), o escribe tu stock en **Forzar stock**.

FIO cuenta el material esté donde esté, en una base, en un almacén o en una nave, así que **Ubicaciones de Almacenamiento** te dice dónde está.

Por ejemplo, con los 22 BBH de antes y 10 en el almacén, **Necesario** es 22 − 10 = 12, y a un precio inventado de 100 ȼ por unidad, **Coste total (ȼ)** es 1.200 ȼ. Con 30 en el almacén, **Necesario** es 0, nunca menos.

Para sustituir la cifra de FIO de un material, escribe un número en **Forzar stock**, por ejemplo para un stock que ya está de camino. 0 cuenta como 0. Vacía el campo para volver a usar la cifra de FIO. La tabla y los totales se actualizan en cuanto cambias un valor forzado. Los valores forzados duran hasta que sales de la página.

## Totales {#totals}

Encima de la tabla:

- **Coste total**: la suma de **Coste total (ȼ)**.
- **Peso total** en t y **Volumen total** en m³ de todo lo **Necesario**, para que compruebes si cabe en tu nave.

Los tres cuentan solo lo que aún necesitas, así que dejan fuera el stock que ya tienes.

## XIT {#xit}

El botón XIT abre el panel de acción de XIT con una transferencia por cada material cuyo **Necesario** sea mayor que 0. Fija el **Origen** (el almacén de estación del que tomarlo) y **Comprar en CX**. Después pulsa **Copiar** para copiar el **JSON** y ejecútalo con [[xit|XIT]] en Refined PrUn. PRUNplanner guarda **Origen** y **Comprar en CX** como tus preferencias y los comparte con los demás botones XIT, p. ej. en [FIO Consumo](/help/fio_burn).
