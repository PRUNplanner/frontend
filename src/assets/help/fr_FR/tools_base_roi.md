Base ROI classe toutes les façons de faire tourner une base : chaque ressource sur chaque planète qui en dispose, chaque recette agricole sur chaque planète fertile et chaque recette de tous les autres bâtiments de production. Chaque ligne est une base complète de 500 de surface avec la disposition optimale du bâtiment, calculée avec le même moteur que tes plans et évaluée avec la préférence CX choisie (prix Universe 30j quand tu n'es pas connecté).

**Note** : toutes les lignes supposent le COGC et les experts définis ici ; les lignes de recette tournent sur une planète standard.

## Row kinds {#row-kinds}

- **Ressource** : une ressource sur une planète, avec RIG, EXT ou COL et les matériaux d'environnement de la planète. Shows "@ planet · N jumps" (to the nearest exchange).
- **Agriculture** : une recette FRM ou ORC sur une planète fertile, avec la fertilité de la planète dans le rendement.
- **Recette** : une recette de n'importe quel autre bâtiment de production, sur une planète standard (rocheuse, gravité, pression et température normales). Utilise **Essayer sur une planète** dans les détails de la ligne pour la voir sur une vraie planète.

## Metrics {#metrics}

- **Bénéfice quotidien** : recettes moins intrants, consommables et dégradation (construction des bâtiments de production ÷ 180), à 5 experts avec la montée progressive, sinon au nombre fixe.
- **Absolu** : toutes les lignes sur une même échelle en ȼ, pour voir leurs rapports. Indicateurs Avec **Progression depuis 0**, une nouvelle base démarre sans experts : les paliers à 0, 1, 2, 3 et 4 experts durent 10, 12.5, 57.57, 276.5 et 915.1 jours, chacun divisé par le nombre de bâtiments de production, et les recettes et intrants augmentent avec le bonus des experts. « jamais » quand la base ne fait pas de bénéfice.
- **Rendement hebdomadaire** : 7 × bénéfice quotidien ÷ coût des bâtiments.
- **Coût des bâtiments** : la construction, plus les options des Réglages : le stock tampon (jours de tampon × (intrants + consommables + recettes) ÷ 2) et l'amélioration du QG pour un permis de plus (niveau de QG N − 1).
- **Coût de fonctionnement quotidien** : intrants + consommables + dégradation. Masqué jusqu'à ce que tu l'actives dans Colonnes : le stock tampon inclus dans le coût des bâtiments couvre déjà le coût de fonctionnement au départ.
- **Cargo / day**: the larger of the weight and volume the base moves in or out per day. The tooltip shows both directions.
- **Capacité du marché** : combien de bases comme celle-ci le marché peut absorber, des deux côtés. Pour chaque produit, c'est le volume échangé moyen sur 7 jours ÷ ce que la base produit par jour, et pour chaque intrant de recette, le volume échangé ÷ ce dont la base a besoin par jour. The lowest counts. (O) or (I) shows which side limits it, and the tooltip names the material. En dessous de 1, une seule base produit ou consomme plus que ce que le marché échange. The tooltip also gives one base's share of the traded volume (1 ÷ market capacity, as a percentage).
- **Industry**: the base's industry, in short (Food for Food Industries, Fuel for Fuel Refining, Extraction for Resource Extraction).
- **Parcelles** : parcelles libres sur la planète, pour les lignes de planète. Trie par cette colonne pour voir les planètes les plus vides. Les lignes de recette tournent sur une planète standard ; elles affichent donc un tiret.
- **Main-d'œuvre** : la main-d'œuvre dont la base a besoin par niveau.
- **Bénéfice, 30 jours** : le bénéfice quotidien avec le VWAP quotidien de l'échange de chaque matériau sur les 30 derniers jours. Les jours sans transaction gardent le dernier prix. Les prix ASK, BID et fixes n'ont pas d'historique.
- **⚠** : un matériau évalué avec un VWAP 7j ou 30j dont le bid ou l'ask s'écarte de plus de 30% de ce prix. La fenêtre contextuelle indique le bénéfice quotidien avec ces prix.

## Settings {#settings}

- **Ship visits**: how often the ship comes; it has to carry this many days of cargo, in and out, so rows that need more than the ship holds are hidden.
- **Stock tampon** : du stockage pour ce nombre de jours de cargaison ; des STO ou STA sont ajoutés, et un bâtiment de production est retiré quand la base ne tiendrait plus.
- **Capacité du marché min.** (à côté de la recherche au-dessus du tableau), **Limite logistique** et **Sauts max.** masquent des lignes ; la ligne au-dessus du tableau compte les lignes masquées par limite. Sauts max. compte jusqu'à l'échange le plus proche de ta préférence CX.
- **Afficher les planètes sans travailleurs ni parcelles** : désactivé par défaut, donc les lignes de planète sont masquées quand aucune nouvelle base ne tient (toutes les parcelles prises et aucun site fantôme) ou quand le dernier rapport de population ne peut pas pourvoir les emplois de la base, en comptant les travailleurs libres moins les emplois déjà ouverts. Une planète sans rapport de population compte comme n'ayant aucun travailleur. Active-le pour voir ces lignes ; la colonne Main-d'œuvre montre ce qui manque. Recipe rows are not checked. Recipe rows are not checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Run setup again** opens the first-visit setup with its presets: Rookie (SCB) and Standard (WCB) without weekly return, running cost, plots and workforce, and Veteran (any ship or no limit) with all of them but running cost. Weekly return, running cost, plots and workforce are also hidden for new visitors; turn them on in Columns.

## Profit chart {#profit-chart}

Au-dessus du tableau, un graphique montre le bénéfice quotidien des 30 derniers jours pour chaque industrie. Each base counts by how much of its material the market trades (7-day average), and the many planets of one resource recipe count as one: the mean of the 3 planets with the highest daily profit, so poor planets don't drag the line down. Click the title to collapse the chart; it stays collapsed. Search to drill in:

- une industrie (par ex. « Chemistry ») affiche ses bâtiments ;
- a building (e.g. "CHP") shows its materials;
- a material (e.g. "SC") shows the recipes that make it.

Le graphique suit les réglages et les limites du tableau. Il affiche les 7 lignes les plus échangées et indique combien il en reste.

Every history chart has a time range (7, 30 or 90 days) and an aggregation (1, 3 or 7 days per point) at its top right, like the game's charts. A longer aggregation smooths out daily noise. The choice applies to all charts and is remembered.

## Search and tooltips {#search-and-tooltips}

- The search above the table filters by industry, building or material ticker.
- Survole un en-tête de colonne pour voir sa signification, et un nombre pour le calcul rapide qui se cache derrière.

## Details {#details}

Expand a row to see two 30-day charts of revenue, running cost and daily profit, then the full math below them. Tu peux aussi copier le calcul sous forme de texte, ou ouvrir la ligne comme nouveau plan avec la même disposition (connecté).

- **Profit**: revenue, running cost and daily profit, every line on one ȼ scale.
- **Market volume**: how many bases the market carries each day, from the CX traded volume. _Outputs_ is the scarcest output's traded volume ÷ what one base sells per day; _Inputs (bottleneck)_ is the same for the recipe input with the least volume per unit the recipe needs. It's the market capacity column, day by day.
