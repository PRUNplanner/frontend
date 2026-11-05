APEX n'affiche que 365 jours d'historique des prix au maximum ; au-delà, les données sont supprimées et effacées de l'historique. Cet outil affiche toutes les données de prix enregistrées depuis le 27 juin 2022. Comme les données sont agrégées à partir des imports FIO, il peut y avoir des trous ou des informations manquantes. Despite this caveat, because of the resilience of FIO, one can consider this information to be highly reliable.

Certain assumptions are made due to technical constraints. Les données reçues par PRUNplanner peuvent devenir obsolètes et répéter la valeur de la veille jusqu'à la réception de nouvelles données. Cela peut amener des dizaines de jours consécutifs du graphique à afficher des données incorrectes alors qu'aucune transaction n'a eu lieu. Pour limiter ce problème dans les graphiques, les données sont automatiquement élaguées quand le volume échangé reçu est égal à celui de la veille. Un volume échangé nul est supposé tant que ce chiffre se répète, jusqu'à ce qu'un nouveau chiffre différent soit échangé.

Une autre hypothèse consiste à retirer des graphiques les valeurs absurdes. Des manipulations arrivent parfois et font qu'un marché qui s'échange normalement à ȼ100 enregistre une transaction à ȼ10,000,000. Some people like to have fun here. This enormously distorts the chart, breaking its readability. Because of this, candlesticks are edited whenever they are greater than 3x the difference of the previous candlestick. This preserves the spirit of the chart, informing you something did actually happen - but without breaking the visual graph. The editing is applied to all 4 points of the candlestick independently, open high low and close. Each run their own 3x "reality check" code and modify that value accordingly.

Voici une bonne ressource pour apprendre à lire et interpréter les graphiques en chandeliers :
https://www.investopedia.com/trading/candlestick-charting-what-is-it/

Par ailleurs, une excellente façon « concrète » de voir comment ils fonctionnent est d'aller sur ce site, de régler l'intervalle sur 1 minute et de les regarder évoluer en temps réel :
https://bitcoinwisdom.io/markets/deribit/ethperpetual

