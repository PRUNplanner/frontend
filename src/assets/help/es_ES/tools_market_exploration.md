APEX solo muestra hasta 365 días de historial de precios; después se elimina y desaparece del historial. Esta herramienta muestra todos los datos de precios registrados desde el 27 de junio de 2022. Como los datos se recopilan a partir de las importaciones de FIO, puede haber huecos o información incompleta. Despite this caveat, because of the resilience of FIO, one can consider this information to be highly reliable.

Certain assumptions are made due to technical constraints. Los datos que recibe PRUNplanner pueden quedarse obsoletos y repetir el mismo valor del día anterior hasta que llegan datos nuevos. Esto puede hacer que decenas de días consecutivos del gráfico muestren datos incorrectos cuando en realidad no hubo ninguna operación. Para paliar el problema que esto causa en los gráficos, los datos se depuran automáticamente cuando el volumen negociado recibido es igual al del día anterior. Si esta cifra se repite, se supone un volumen negociado de cero hasta que se negocie una cifra distinta.

Otra suposición es la de eliminar de los gráficos las cifras absurdas. Manipulation sometimes happens and causes a market which normally trades at ȼ100 to print a trade at ȼ10,000,000. Some people like to have fun here. Esto distorsiona enormemente el gráfico y lo hace ilegible. Por eso, las velas se corrigen cuando superan 3 veces la diferencia con la vela anterior. Así se conserva el sentido del gráfico, que te informa de que algo ocurrió, pero sin romper la representación visual. La corrección se aplica de forma independiente a los 4 puntos de la vela: apertura, máximo, mínimo y cierre. Each run their own 3x "reality check" code and modify that value accordingly.

Aquí tienes un buen recurso sobre cómo leer e interpretar gráficos de velas:
https://www.investopedia.com/trading/candlestick-charting-what-is-it/

Además, una forma excelente y «real» de ver por ti mismo cómo funcionan es ir a este sitio web, fijar el intervalo en 1 minuto y observar cómo evolucionan en tiempo real:
https://bitcoinwisdom.io/markets/deribit/ethperpetual

