Le [Rapport de marché](/market) montre comment les prix et les volumes ont évolué sur les quatre échanges de marchandises au cours des 90 derniers jours. Commence ici pour avoir une vue d'ensemble, puis creuse un matériau dans [Exploration du marché](/help/tools_market_exploration) ou vérifie les prix de ton plan. Le rapport est public : pas besoin de te connecter.

## Données et mises à jour {#data}

Les prix quotidiens viennent des données de transactions quotidiennes que [[fio|FIO]] fournit pour AI1, CI1, IC1 et NC1. Le rapport couvre les 90 jours UTC complets jusqu'à hier. Il se met à jour chaque jour (UTC) à partir des échanges de la veille : les transactions du jour n'apparaissent donc qu'une fois la journée terminée. L'en-tête donne le dernier jour sous la forme « Prix quotidiens au » suivi d'une date.

Les carnets d'ordres sont actuels. Le plus gros écart ouvert, les écarts « Carnets d'ordres actuels » et les chiffres des carnets sur les cartes des échanges utilisent tous les derniers carnets dont dispose PRUNplanner, tenus à jour depuis FIO au moins toutes les 30 minutes.

Les montants sont en ȼ. Chaque échange a sa propre [[currency|monnaie]] (AIC, CIS, ICA, NCC), et le rapport les additionne à parité, un pour un. Cela fonctionne parce qu'un même matériau s'échange à peu près au même prix partout.

Si une partie de la page affiche « Impossible de charger les données du marché. » avec un bouton **Réessayer**, appuie dessus pour recharger cette partie.

## En bref {#in-short}

Quatre tuiles se trouvent en haut :

| Tuile                                   | Ce qu'elle montre                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Indice CX**                           | le dernier [indice des prix](#price-index) combiné, sa variation depuis le premier des 90 jours, et une mini-courbe sur 90 jours                             |
| **Plus forte variation**                | le secteur dont l'indice a le plus monté depuis le premier des 90 jours (quand tous les secteurs ont baissé, celui qui a le moins baissé), avec sa variation |
| **Nourrir 100 pionniers**               | ce que 100 pionniers consomment par jour au dernier VWAP 7J sur tous les échanges, et comment cela a évolué ces deux dernières semaines                      |
| **Plus gros écart ouvert en ce moment** | le plus grand [écart de prix](#price-gaps) dans les carnets d'ordres actuels : acheter sur un échange, vendre sur un autre                                   |

Le panier des pionniers contient tous les besoins des pionniers, [[luxuries|produits de luxe]] compris. Si aucun matériau n'a d'écart ouvert de 15 % ou plus, la dernière tuile te l'indique.

## Chiffres clés {#kpis}

| Chiffre                              | Ce qu'il montre                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Échangé, 7 derniers jours**        | le volume des quatre échanges sur les 7 derniers jours, et sa variation par rapport aux 7 jours précédents |
| **Matériaux échangés, 7 jours**      | combien de matériaux se sont échangés sur les 7 derniers jours, parmi ceux échangés sur 30 jours           |
| **Indice CX**                        | l'indice des prix combiné, et sa variation depuis le premier des 90 jours                                  |
| **Volume des matériaux à prix fixe** | la part du volume sur 30 jours qui concerne des matériaux [stables](#flat), et leur nombre                 |

Le volume, c'est les unités échangées × le prix : c'est donc un montant en ȼ. Par exemple, 200 unités vendues à 50 ȼ pièce ajoutent 10 000 ȼ de volume.

## Indice des prix {#price-index}

**Indice des prix** suit l'évolution du prix de ce que les joueurs échangent. C'est une courbe qui part de 100 le premier des 90 jours, et la valeur de chaque jour utilise le [[vwap|VWAP]] 7J de ce jour-là. Le VWAP 7J est le volume des 7 derniers jours ÷ les unités échangées sur cette période : un jour avec peu de transactions le fait donc à peine bouger.

Sous **Vue de l'indice**, tu choisis les courbes :

- **Par échange** (par défaut) : une courbe par échange, chacune dans sa propre monnaie.
- **Combiné** : une seule courbe pour les quatre échanges.
- **Par secteur** : une courbe par secteur, tous échanges confondus. Il y a huit secteurs, de Consommables à Drones et autres.

Chaque matériau qui a un VWAP 7J sur chacun des 90 jours dans ce périmètre fait partie de l'indice. Le poids d'un membre est sa part du volume sur 30 jours, plafonnée à 5 % (20 % à l'intérieur d'un secteur). Ce que le plafond retire à un matériau est réparti sur les autres, si bien qu'aucun matériau très échangé ne porte l'indice à lui seul.

Chaque jour, PRUNplanner compare le VWAP 7J de chaque membre à sa valeur du premier jour et additionne le tout selon les poids. Deux exemples inventés :

- Si le VWAP 7J de chaque membre est 10 % au-dessus de sa valeur du premier jour, l'indice vaut 100 × 1,10 = 110, quels que soient les poids.
- Si un seul membre avec un poids de 5 % voit son prix doubler, l'indice vaut 100 + 100 × 0,05 × (2 − 1) = 105.

La note sous le graphique indique la date de base et les membres. Pour **Combiné**, elle donne aussi la part des membres dans le volume sur 30 jours.

## Ce que coûte l'entretien d'une main-d'œuvre {#workforce}

Cette section valorise les consommables dont 100 travailleurs d'un niveau ont besoin pour un jour, tous besoins confondus y compris les deux produits de luxe, au VWAP 7J de chaque jour. Chaque base paie ce coût, quoi qu'elle produise.

- Il y a une carte par niveau de [[workforce|main-d'œuvre]], des pionniers aux scientifiques. Elle montre le coût pour 100 travailleurs par jour sur tous les échanges, et sa variation sur 90 jours.
- Choisis un niveau pour voir son graphique, avec une courbe par échange sur 90 jours.
- « Le moins cher aujourd'hui » nomme l'échange où le panier de ce niveau coûte le moins aux derniers prix.
- **Plus fortes variations** nomme les deux matériaux qui ont le plus changé le coût du niveau, en ȼ, sur les 90 jours.

Si un matériau du panier n'a pas de prix un jour donné, le graphique n'a pas de valeur pour ce jour.

## Où circule l'argent {#treemap}

**Où circule l'argent** est une carte proportionnelle (treemap). Chaque case est un matériau, dimensionnée selon son volume sur 30 jours sur les quatre échanges et regroupée par secteur. La couleur compare le VWAP 7J au VWAP 30J : vert quand il monte, rouge quand il baisse, le plus foncé à ±12 % et au-delà. Avec la palette **Daltonien (bleu / orange)** dans ton profil, la hausse est en bleu et la baisse en orange. Les matériaux [stables](#flat) sont hachurés et marqués **stable** (« Maintenu à un seul prix, probablement un teneur de marché »).

Survole une case pour voir **Volume, 30 jours**, **VWAP 7J**, **VWAP 30J** et **7J contre 30J**. Quand il n'y a pas de variation à afficher, elle indique **trop peu d'échanges**. Cela arrive quand le matériau s'est échangé sur les 30 derniers jours mais pas sur les 7 derniers : il n'y a alors pas de VWAP 7J à comparer.

## Mouvements de la semaine {#movers}

**Mouvements de la semaine** liste les matériaux dont le VWAP 7J est le plus au-dessus (**En hausse**) ou au-dessous (**En baisse**) de leur VWAP 30J, sur tous les échanges. Par exemple, un VWAP 7J de 110 ȼ contre un VWAP 30J de 100 ȼ donne (110 ÷ 100 − 1) × 100 = +10 %.

Seuls comptent les matériaux avec au moins 5 000 000 ȼ et 50 unités échangées sur les 7 derniers jours, et les matériaux stables sont exclus. Les 8 premiers s'affichent d'abord, chacun avec une mini-courbe de son VWAP 7J sur 15 jours. « Afficher les … » ouvre la liste complète par pages de 25, et tu peux **Trier par** **Variation vs 30 jours**, **Matériau**, **VWAP 7J** ou **Échangé, 7 jours**.

Les 30 jours incluent les 7 derniers : une variation paraît donc plus faible que dans une comparaison semaine sur semaine. Quand aucun matériau ne se qualifie dans un sens, la liste indique « Aucun matériau n'a évolué ainsi avec un volume suffisant. ».

## Ce qui fait tourner l'économie {#leaders}

**Ce qui fait tourner l'économie** liste les 10 matériaux avec le plus gros volume sur 30 jours, avec leur part de ce volume. Chaque barre répartit le volume des 7 derniers jours de ce matériau par échange. « Afficher les … » liste tous les matériaux échangés sur 30 jours.

## Écarts de prix entre échanges {#price-gaps}

**Écarts de prix entre échanges** liste les matériaux qui s'échangent nettement moins cher sur un échange que sur un autre. Tu choisis la **Base de l'écart** :

- **7 derniers jours** (par défaut) compare le VWAP 7J de chaque échange. Un écart ici a peut-être déjà disparu. **Carnets actuels** te dit si tu pourrais encore acheter sur un échange et vendre sur l'autre (« Ouvert » avec l'écart, ou **Fermé**).
- **Carnets d'ordres actuels** compare le meilleur Ask sur l'échange le moins cher au meilleur Bid sur le plus cher, en ce moment.

Un matériau ne compte que si les deux échanges ont eu au moins 20 unités et 5 000 000 ȼ échangés sur les 7 derniers jours, si l'écart est d'au moins 15 % et s'il n'est pas [stable](#flat).

L'écart est le prix le plus élevé ÷ le moins élevé − 1, en %. Par exemple, un meilleur Ask de 100 ȼ sur un échange et un meilleur Bid de 120 ȼ sur un autre donnent un écart de (120 ÷ 100 − 1) × 100 = 20 %. Quand aucun matériau ne se qualifie, la section indique « Aucun matériau n'a un écart de 15 % ou plus avec assez de volume. ».

Les 10 premiers s'affichent d'abord, le plus grand écart en tête. Seul le meilleur prix compte, pas la quantité proposée, et l'écart ne tient pas compte du transport, du carburant ni du temps de vol.

> [!tip]
> Un écart dans les carnets n'est une opportunité que si la quantité proposée suffit et que tu peux déplacer la marchandise à temps. Vérifie les carnets d'ordres du matériau dans [Exploration du marché](/help/tools_market_exploration) avant d'agir.

## Les quatre échanges {#exchanges}

**Les quatre échanges** a une carte par échange : Antares Station (AI1, AIC), Benten Station (CI1, CIS), Hortus Station (IC1, ICA) et Moria Station (NC1, NCC). Chaque carte affiche :

| Chiffre                         | Ce qu'il montre                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| **Volume, 30 jours**            | le volume de l'échange, et sa part dans le total des quatre                              |
| barres                          | le volume quotidien sur 90 jours                                                         |
| **Volume, 7 jours**             | le volume des 7 derniers jours                                                           |
| **Matériaux échangés, 7 jours** | les matériaux avec du volume sur cet échange sur les 7 derniers jours                    |
| **Écart Bid–Ask médian**        | la médiane de (Ask − Bid) ÷ le milieu entre Bid et Ask, sur les carnets qui ont les deux |
| **Carnets sans acheteur**       | les carnets d'ordres sans Bid en ce moment                                               |
| **Carnets sans vendeur**        | les carnets d'ordres sans Ask en ce moment                                               |

L'écart est mesuré ici par rapport au milieu. Marché en direct et la fiche du matériau le mesurent par rapport à l'Ask : le même carnet affiche donc ici un chiffre légèrement plus grand. Par exemple, un carnet avec un Bid de 90 ȼ et un Ask de 110 ȼ a un écart de 20 ÷ 100 = 20 % ici et de 20 ÷ 110 ≈ 18,2 % dans Marché en direct.

## Matériaux stables {#flat}

Un matériau est _stable_ quand, sur les 30 derniers jours, il s'est échangé au moins 10 jours et que son VWAP quotidien est resté à ±0,3 % de sa médiane sur 30 jours pendant au moins 80 % de ces jours. Par exemple, avec une médiane sur 30 jours de 100 ȼ, un jour reste dans la bande entre 99,70 ȼ et 100,30 ȼ, et un matériau échangé sur 20 jours a besoin d'au moins 16 jours de ce type. Cela signifie généralement que des [[market-maker|teneurs de marché]] l'achètent ou le vendent à prix fixe. Les matériaux stables comptent dans le volume, mais ils sont exclus des mouvements et des écarts de prix.

## Comment ces chiffres sont établis {#how-made}

La section repliable **Comment ces chiffres sont établis** en bas de la page explique, en bref, la source, le volume, les prix, l'indice, les mouvements, les écarts, les matériaux stables et ce qui est exclu.

Une journée chargée se voit pendant une semaine. Une seule grosse transaction à un prix inhabituel tire le VWAP 7J tant qu'elle reste dans la fenêtre de 7 jours, puis le prix revient d'un coup.

## Ce que les données CX ne voient pas {#not-included}

Le rapport couvre les échanges, pas toute l'économie :

- Les marchés locaux sur les planètes et les stations, les contrats et les échanges au sein des corporations ne passent jamais par les échanges : ils sont donc absents. Selon les joueurs, certains biens courants circulent surtout sur les marchés locaux.
- Les transactions avec les teneurs de marché comptent comme n'importe quelle autre transaction.
- Les ordres non exécutés ne comptent pas, et les données ne disent pas quel côté a initié une transaction.
- Les chiffres des carnets d'ordres n'utilisent que le meilleur prix, pas la profondeur derrière.

[Ce que le volume CX ne voit pas](/help/plan_check#cx-volume) explique ce que cela signifie pour les prix de ton plan.
