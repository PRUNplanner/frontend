APEX only displays up to 365 days of price history, after which it is deleted and erased from history. This tool displays all recorded price data since June 27th, 2022. Because collection of data is aggregated from FIO imports, there may be gaps in the data or missing information. Despite this caveat, because of the resilience of FIO, one can consider this information to be highly reliable.

Certain assumptions are made due to technical constraints. Data received by PRUNplanner can become stale, repeating the same value as the previous day until new data is received. This causes potentially dozens of consecutive days on the chart to report incorrect data when infact no trades actually occurred. To alleviate the issue this causes with the charts, data is automatically pruned when the trading volume received is equal to trading volume on the preceding day. Zero trading volume is assumed if this figure repeats, until a new different figure is traded.

Another assumption which is made is to prune absurd numbers from the charts. Manipulation sometimes happens and causes a market which normally trades at ȼ100 to print a trade at ȼ10,000,000. Some people like to have fun here. This enormously distorts the chart, breaking its readability. Because of this, candlesticks are edited whenever they are greater than 3x the difference of the previous candlestick. This preserves the spirit of the chart, informing you something did actually happen - but without breaking the visual graph. The editing is applied to all 4 points of the candlestick independently, open high low and close. Each run their own 3x "reality check" code and modify that value accordingly.

Here is a good resource on how to read and interpret candlestick charts:
https://www.investopedia.com/trading/candlestick-charting-what-is-it/

Furthermore, an excellent "real world" way to just see how they actually work on your own is to go to this website, set the time interval to 1 minute and watch how they evolve in realtime:
https://bitcoinwisdom.io/markets/deribit/ethperpetual

