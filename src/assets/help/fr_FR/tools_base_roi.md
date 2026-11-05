Base ROI classe toutes les façons de faire tourner une base : chaque ressource sur chaque planète qui en dispose, chaque recette agricole sur chaque planète fertile et chaque recette de tous les autres bâtiments de production. Chaque ligne est une base complète de 500 de surface avec la disposition optimale du bâtiment, calculée avec le même moteur que tes plans et évaluée avec la préférence CX choisie (prix Universe 30j quand tu n'es pas connecté).

**Note** : toutes les lignes supposent le COGC et les experts définis ici ; les lignes de recette tournent sur une planète standard.

# Types de lignes

- **Ressource** : une ressource sur une planète, avec RIG, EXT ou COL et les matériaux d'environnement de la planète. Affiche « @ planète (sauts) ».
- **Agriculture** : une recette FRM ou ORC sur une planète fertile, avec la fertilité de la planète dans le rendement.
- **Recette** : une recette de n'importe quel autre bâtiment de production, sur une planète standard (rocheuse, gravité, pression et température normales). Utilise **Essayer sur une planète** dans les détails de la ligne pour la voir sur une vraie planète.

# Metrics

- **Bénéfice quotidien** : recettes moins intrants, consommables et dégradation (construction des bâtiments de production ÷ 180), à 5 experts avec la montée progressive, sinon au nombre fixe.
- Indicateurs Avec **Progression depuis 0**, une nouvelle base démarre sans experts : les paliers à 0, 1, 2, 3 et 4 experts durent 10, 12.5, 57.57, 276.5 et 915.1 jours, chacun divisé par le nombre de bâtiments de production, et les recettes et intrants augmentent avec le bonus des experts. « jamais » quand la base ne fait pas de bénéfice.
- **Rendement hebdomadaire** : 7 × bénéfice quotidien ÷ coût des bâtiments.
- **Coût des bâtiments** : la construction, plus les options des Réglages : le stock tampon (jours de tampon × (intrants + consommables + recettes) ÷ 2) et l'amélioration du QG pour un permis de plus (niveau de QG N − 1).
- **Coût de fonctionnement quotidien** : intrants + consommables + dégradation. Masqué jusqu'à ce que tu l'actives dans Colonnes : le stock tampon inclus dans le coût des bâtiments couvre déjà le coût de fonctionnement au départ.
- **Cargaison / jour** : le plus grand du poids et du volume que la base fait entrer ou sortir par jour ; (I) quand il en entre davantage, (O) quand il en sort davantage.
- **Capacité du marché** : combien de bases comme celle-ci le marché peut absorber, des deux côtés. Pour chaque produit, c'est le volume échangé moyen sur 7 jours ÷ ce que la base produit par jour, et pour chaque intrant de recette, le volume échangé ÷ ce dont la base a besoin par jour. The lowest counts. (O) or (I) shows which side limits it, and the tooltip names the material. En dessous de 1, une seule base produit ou consomme plus que ce que le marché échange.
- **Parcelles** : parcelles libres sur la planète, pour les lignes de planète. Trie par cette colonne pour voir les planètes les plus vides. Les lignes de recette tournent sur une planète standard ; elles affichent donc un tiret.
- **Main-d'œuvre** : la main-d'œuvre dont la base a besoin par niveau.
- **Bénéfice, 30 jours** : le bénéfice quotidien avec le VWAP quotidien de l'échange de chaque matériau sur les 30 derniers jours. Les jours sans transaction gardent le dernier prix. Les prix ASK, BID et fixes n'ont pas d'historique.
- **⚠** : un matériau évalué avec un VWAP 7j ou 30j dont le bid ou l'ask s'écarte de plus de 30% de ce prix. La fenêtre contextuelle indique le bénéfice quotidien avec ces prix.

# Réglages

- **Stock tampon** : du stockage pour ce nombre de jours de cargaison ; des STO ou STA sont ajoutés, et un bâtiment de production est retiré quand la base ne tiendrait plus.
- **Capacité du marché min.** (à côté de la recherche au-dessus du tableau), **Limite logistique** et **Sauts max.** masquent des lignes ; la ligne au-dessus du tableau compte les lignes masquées par limite. Sauts max. compte jusqu'à l'échange le plus proche de ta préférence CX.
- **Afficher les planètes sans travailleurs ni parcelles** : désactivé par défaut, donc les lignes de planète sont masquées quand aucune nouvelle base ne tient (toutes les parcelles prises et aucun site fantôme) ou quand le dernier rapport de population ne peut pas pourvoir les emplois de la base, en comptant les travailleurs libres moins les emplois déjà ouverts. Une planète sans rapport de population compte comme n'ayant aucun travailleur. Active-le pour voir ces lignes ; la colonne Main-d'œuvre montre ce qui manque. Recipe rows are not checked. If the reports can't be loaded, the page says so and nothing is hidden.
- **Relancer la configuration** ouvre la configuration de la première visite avec ses préréglages : Débutant (SCB, sans rendement hebdomadaire ni coût de fonctionnement), Standard (WCB) et Vétéran (n'importe quel vaisseau ou aucune limite).

# Graphique des bénéfices

Au-dessus du tableau, un graphique montre le bénéfice quotidien des 30 derniers jours pour chaque industrie. Chaque base compte selon la quantité de son produit que le marché échange (moyenne sur 7 jours), et les nombreuses planètes d'une même recette de ressource comptent comme une seule. Search to drill in:

- une industrie (par ex. « Chemistry ») affiche ses bâtiments ;
- un bâtiment (par ex. « CHP ») affiche ses produits ;
- un produit (par ex. « SC ») affiche les recettes qui le fabriquent.

Le graphique suit les réglages et les limites du tableau. Il affiche les 7 lignes les plus échangées et indique combien il en reste.

# Recherche et info-bulles

- La recherche au-dessus du tableau filtre par industrie, bâtiment ou ticker de produit.
- Survole un en-tête de colonne pour voir sa signification, et un nombre pour le calcul rapide qui se cache derrière.

# Détails

Déplie une ligne pour voir deux graphiques sur 30 jours des recettes, du coût de fonctionnement et du bénéfice quotidien, puis le calcul complet en dessous. Tu peux aussi copier le calcul sous forme de texte, ou ouvrir la ligne comme nouveau plan avec la même disposition (connecté).

- **Absolu** : toutes les lignes sur une même échelle en ȼ, pour voir leurs rapports.
- **Chaque ligne sur sa propre plage** : chaque ligne va de 0 (sa valeur la plus basse sur les 30 jours) à 1 (sa plus haute), pour que les variations d'une petite ligne se voient à côté des grandes. The labels still show ȼ.
