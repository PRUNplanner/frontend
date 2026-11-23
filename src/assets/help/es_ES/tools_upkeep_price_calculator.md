Usa la Calculadora de precios de mantenimiento para ver qué edificio y qué material cubren de la forma más barata una necesidad de la población (Seguridad, Salud, Comodidad, Cultura, Educación) a los precios de tu preferencia de bolsa. Compara los materiales que consumen los edificios de [[upkeep|mantenimiento]] según lo que cuesta una unidad de necesidad con cada uno de ellos.

Úsala cuando quieras comparar lo que cuesta cubrir una necesidad con cada edificio y material, a tus precios. No mira tus planes ni tus bases: las cifras de los edificios vienen incluidas, y los precios salen de tu preferencia de bolsa.

## Cómo usarla {#how-to-use}

1. Revisa **Preferencia de CX**, que decide los precios (consulta [Precios](#prices)).
2. Elige la necesidad en **Necesidad**: **Seguridad** (predeterminada), **Salud**, **Comodidad**, **Cultura** o **Educación**.
3. Lee la tabla **Detalles del material**, de la más barata a la más cara.

La página calcula las cinco necesidades al abrirla («Calculando precios de materiales de mantenimiento»), y otra vez cuando cambias la preferencia de bolsa. Hasta que termina, ves una barra de progreso con esa línea. Después, cambiar de **Necesidad** es instantáneo, porque las cinco necesidades ya están calculadas.

## Edificios y necesidades {#buildings}

PRUNplanner conoce 14 edificios de mantenimiento, cada uno con los materiales que consume al día y cuánto aporta de cada necesidad. Estas cifras vienen incluidas en PRUNplanner.

| Necesidad     | Edificios                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| **Seguridad** | SST Estación de Seguridad, SDP Puesto de Drones de Seguridad, EMC Centro de Emergencia                      |
| **Salud**     | INF Enfermería, HOS Hospital, EMC Centro de Emergencia, WCE Centro de Bienestar                             |
| **Comodidad** | PAR Parque de Vida Silvestre, 4DA Arcades 4D, WCE Centro de Bienestar, ACA Café de Arte                     |
| **Cultura**   | ART Galería de Arte, VRT Teatro de Realidad Virtual, ACA Café de Arte, PBH Centro de Transmisión Planetaria |
| **Educación** | LIB Librería, UNI Universidad, PBH Centro de Transmisión Planetaria                                         |

Cuatro edificios cubren dos necesidades: EMC (Seguridad y Salud), WCE (Salud y Comodidad), ACA (Comodidad y Cultura) y PBH (Cultura y Educación).

## Detalles del material {#material-details}

Para la necesidad seleccionada, la tabla tiene una fila por edificio y material. Muestra 50 filas por página, y puedes hacer clic en un encabezado para ordenar por él.

| Columna                                 | Qué muestra                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Material**                            | el material que consume el edificio                                                                       |
| **Edificio**                            | el edificio de mantenimiento, por su ticker                                                               |
| **ȼ/Necesidad**                         | el coste por unidad de necesidad (4 decimales). Cuanto más bajo, mejor |
| **Precio en CX (ȼ)** | el precio de compra del material según tu preferencia de bolsa                                            |
| **Cant./día**           | cuántas unidades consume el edificio al día                                                               |

Por defecto, las filas se ordenan por **ȼ/Necesidad**, de menor a mayor. Los materiales sin precio muestran «—» en **ȼ/Necesidad** y **Precio en CX (ȼ)** y quedan al final. No te preocupes, eso solo significa que tu preferencia de bolsa no da precio de compra para ellos, así que no hay nada que comparar.

## Cómo se calcula ȼ/Necesidad {#price-per-need}

ȼ/Necesidad = Precio en CX × Cant./día ÷ (necesidad aportada × número de necesidades que cubre el edificio)

Para un edificio que cubre dos necesidades, PRUNplanner cuenta dos veces la necesidad que aporta, porque los mismos materiales pagan ambas necesidades. Por eso sus filas parecen más baratas que las de un edificio de una sola necesidad con los mismos costes.

Por ejemplo, con cifras inventadas: un edificio consume 10 unidades al día de un material a 50 ȼ y aporta 500 de una necesidad. Su fila muestra 50 × 10 ÷ (500 × 1) = 1 ȼ/Necesidad. Un edificio que consume lo mismo y aporta 500 de cada una de dos necesidades muestra 50 × 10 ÷ (500 × 2) = 0,5 ȼ/Necesidad.

Cada fila mira un material por separado, como si ese material solo pagara toda la necesidad del edificio. Un edificio consume todos sus materiales, así que su coste completo por unidad de necesidad es la suma de sus filas. Si el edificio de una sola necesidad de arriba consumiera también un segundo material cuya fila muestra 0,5, su coste completo sería 1 + 0,5 = 1,5 ȼ/Necesidad.

> [!tip]
> Compara los edificios sumando sus filas. Un edificio con un material barato y otro caro puede costar más por necesidad que un edificio cuyos materiales están todos en un término medio.

## Precios {#prices}

**Preferencia de CX** elige la [[exchange-preference|preferencia de bolsa]], y «Ninguna - Universe 30D» usa el [[vwap|VWAP]] de 30 días de [[universe|Universe]]. Los precios no dependen de un planeta, así que las excepciones por planeta de tu preferencia de bolsa no se aplican aquí. Los precios deciden el orden, así que otra preferencia de bolsa puede poner primero otro material u otro edificio.

> [!warning]
> Elegir una preferencia de bolsa aquí también la convierte en tu preferencia de bolsa predeterminada, así que las demás páginas que siguen tu predeterminada cambian con ella.
