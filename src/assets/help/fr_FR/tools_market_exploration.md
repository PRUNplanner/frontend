Avant de planifier autour d'un prix ou de commercer dessus, consulte l'Exploration du marché pour voir si ce prix est normal, en hausse ou en baisse. Elle montre l'historique des prix et le marché actuel d'un matériau sur les quatre échanges.

## Historique des prix {#history}

Le jeu n'affiche que les 365 derniers jours d'historique des prix. PRUNplanner garde chaque jour qu'il a enregistré, jusqu'à juillet 2023. La période **Tout** du graphique [Tous les échanges](#all-exchanges) peut donc remonter plus loin que le jeu.

PRUNplanner construit l'historique à partir des données de prix quotidiennes que fournit [[fio|FIO]]. Un jour pour lequel FIO n'a rien fourni manque, et PRUNplanner ne corrige les prix d'aucun jour. Une transaction isolée à un prix extrême apparaît donc telle qu'elle a eu lieu, par exemple comme une longue mèche sur une bougie.

## Choisir un matériau {#material}

**Changer de matériau** choisit le matériau, et la page démarre sur DW. Les liens depuis la fiche de marché d'un matériau ouvrent la page sur ce matériau, tout comme **Explorer** dans le [tableau d'aperçu](#overview).

## Chiffres clés {#kpis}

Les tuiles en haut décrivent le matériau sur les quatre échanges réunis ([[universe|Univers]]) :

| Tuile                                                                 | Ce qu'elle affiche                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VWAP univers 7j**                                                   | le [[vwap\|VWAP]] des 7 derniers jours en ȼ. En dessous, **% Tendance** = (VWAP 7j − VWAP 30j) ÷ VWAP 30j                                                                    |
| **Volume échangé univers 7j**                                         | les unités échangées ces 7 derniers jours, avec les unités sur 30 jours en dessous                                                                                                                                                                                                                                      |
| **Delta de marché de l'univers**                                      | offre − demande : les unités de tous les ordres de vente moins les unités de tous les ordres d'achat des quatre carnets. Il indique **Pénurie** quand il est négatif et **Excédent** quand il est positif, avec **Réserve:** et **Demande:** en dessous |
| **Tendance pondérée** (**Delta ajusté au volume**) | la % Tendance de chaque échange, pondérée par sa part des unités échangées sur 7 jours                                                                                                                                                                                                                                  |
| **Cohésion des prix** (**Indice de variance**)     | l'écart entre les VWAP 7j des quatre échanges : écart type ÷ moyenne, en %                                                                                                                                                                                                                              |

Une % Tendance positive veut dire que les 7 derniers jours se sont échangés en moyenne plus cher que les 30 derniers, et une négative moins cher. Quelques exemples inventés :

- **% Tendance** : un VWAP 7j de 105 ȼ face à un VWAP 30j de 100 ȼ donne (105 − 100) ÷ 100 = +5 %.
- **Delta de marché de l'univers** : une offre de 1 000 face à une demande de 1 500 donne 1 000 − 1 500 = −500, donc il indique **Pénurie**.
- **Tendance pondérée** : sur 1 000 unités échangées en 7 jours, AI1 en a échangé 500 à +10 %, CI1 250 à +4 %, IC1 150 à −2 % et NC1 100 à 0 %. Cela donne 0,5 × 10 + 0,25 × 4 + 0,15 × (−2) + 0,1 × 0 = +5,7 %.
- **Cohésion des prix** : des VWAP 7j de 98, 100, 100 et 102 ȼ ont une moyenne de 100 et un écart type de √((4 + 0 + 0 + 4) ÷ 4) ≈ 1,41, donc elle indique environ 1,4 %.

Une Cohésion des prix faible veut dire que les transactions se font presque au même prix sur tous les échanges, et une élevée qu'il y a des écarts entre eux. Un échange sans transaction y compte avec un prix de 0.

La Tendance pondérée affiche « — » quand l'un des quatre échanges n'a eu aucune transaction ces 30 derniers jours, car PRUNplanner ne peut pas calculer la tendance de cet échange.

## Graphique du marché {#chart}

**Vue du graphique** bascule entre deux graphiques. La page retient ton choix jusqu'à ce que tu fermes l'onglet du navigateur.

### Bougies {#candles}

Ici, tu vois un échange sous forme de graphique en chandeliers (ouverture, plus haut, plus bas, clôture par période), avec les unités échangées en barres en dessous.

- **Bourse** : AI1 (par défaut), CI1, IC1 ou NC1.
- **Intervalle** : **Quotidien**, **Hebdomadaire** (les semaines commencent le lundi) ou **Mensuel**, en UTC.

Un jour sans données apparaît comme une bougie plate au dernier cours de clôture avec un volume de 0 : un trou ressemble donc à un jour calme.

### Tous les échanges {#all-exchanges}

Chaque échange a sa propre ligne pour que tu puisses les comparer directement, avec **Volume échangé, tous les échanges** (unités / jour) en dessous.

- **Valeur** : **VWAP** (ȼ échangés ÷ unités échangées ce jour-là), **Bas** ou **Haut**.
- **Période** : **30 j**, **90 j** (par défaut), **1 an** ou **Tout**.

La période se termine au dernier jour avec des transactions sur l'un des échanges. Un jour sans transaction sur un échange laisse un trou dans sa ligne. Si le matériau n'a aucune transaction, le graphique indique **Aucun échange sur cette période**.

Le bouton en haut à droite du graphique (**Basculer le plein écran**) donne toute la largeur au graphique.

## Données du marché {#market-data}

**Données du marché** est le tableau par échange de la fiche de marché du matériau, avec les vues **Prix**, **Carnets d'ordres** et **Volume**. [Bourses et prix](/help/exchanges) explique ce que signifient ses colonnes.

## Aperçu du marché des matériaux {#overview}

**Aperçu du marché des matériaux** liste chaque matériau, trié par ticker. Clique sur un en-tête pour trier par celui-ci. Cela fonctionne sur toutes les colonnes sauf **30 jours** et **Détails**.

| Colonne                                       | Ce qu'elle affiche                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Matériau**                                  | le matériau                                                                                                                          |
| **VWAP 7j**, **VWAP 30j**                     | le VWAP Univers des 7 et 30 derniers jours                                                                                           |
| **30 jours**                                  | le VWAP Univers quotidien des 30 derniers jours. Il ne montre que la direction, car chaque ligne a sa propre échelle |
| **Tendance**                                  | la Tendance pondérée (voir [Chiffres clés](#kpis))                                                                |
| **Volume échangé 7j**, **Volume échangé 30j** | les unités échangées dans l'Univers                                                                                                  |
| **Détails**                                   | **Explorer** charge le matériau dans la page                                                                                         |

> [!tip]
> Trie par **Tendance** pour trouver les matériaux dont le prix bouge le plus cette semaine, puis appuie sur **Explorer** pour voir s'il s'agit d'un simple accident ou d'un mouvement plus long. Pour tout le marché d'un coup d'œil, vois le [Rapport de marché](/help/tools_market_report).

## Lire les graphiques en chandeliers {#candlesticks}

Une bougie couvre une période. Son corps va du prix d'ouverture au prix de clôture, et les fines lignes (mèches) atteignent le plus haut et le plus bas de la période. Une clôture au-dessus de l'ouverture donne une bougie haussière, et une clôture en dessous une bougie baissière. Les barres sous le graphique montrent combien d'unités se sont échangées, pour que tu distingues un mouvement porté par un vrai volume d'un mouvement dû à une seule transaction.
