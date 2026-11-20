Utilise ROI recette pour présélectionner des bâtiments et des recettes avant de planifier une base. L'outil classe chaque [[recipe|recette]] de production selon ce que rapporterait une base remplie de son bâtiment. Vérifie ensuite les meilleures sur une vraie planète dans un [plan](/help/plan_layout).

La page a été conçue avec l'aide de Lowstrife, MemoryAlpha et Laaxus des communautés Discord PCT et Prosperous Universe.

## Ce que calcule la page {#what-it-calculates}

Pour chaque bâtiment de production, PRUNplanner construit un plan avec une configuration fixe de ce bâtiment (voir [Configurations](#layouts)). Il calcule ce plan une fois par recette, le bâtiment n'exécutant que cette recette. Chaque ligne correspond à un bâtiment et une recette, et PRUNplanner la calcule avec le même moteur que tes propres plans.

Chaque plan utilise la même configuration :

| Réglage                                                                                                                          | Valeur                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planète                                                                                                                          | Montem (OT-580b), avec ses [[production-fees\|frais de production]] et sa [[fertility\|fertilité]] |
| Programme [[cogc\|COGC]] | l'[[expertise\|expertise]] propre au bâtiment, +25 %                                                                                                                                                                          |
| [[experts\|Experts]]     | 5 dans chaque expertise, soit +28,4 % pour celle du bâtiment                                                                                                                                                                                                                                                                          |
| Main-d'œuvre                                                                                                                     | entièrement logée par les [[habs\|habitations]] de la configuration                                                                                                                                                           |
| Prix                                                                                                                             | ta préférence d'échange (voir ci-dessous)                                                                                                                                                                                                                                                                          |

Comme toutes les lignes partagent cette planète, ces experts et ces prix, elles ne diffèrent que par le bâtiment, sa configuration et son programme, et par la recette. C'est ce qui les rend comparables entre elles.

Les frais de production de Montem font partie de chaque bénéfice de cette page : une recette peut donc rapporter plus sur une planète dont le gouverneur prélève moins. La fertilité ne compte que pour ORC, que PRUNplanner calcule à la fertilité de Montem.

La page laisse de côté les bâtiments d'extraction RIG, EXT et COL ainsi que la ferme FRM, car leur production dépend de la planète. Pour RIG, EXT et COL, utilise [RSI ressource](/help/tools_resource_roi_overview). FRM n'a pas de page de ce type.

La page calcule toute seule quand tu l'ouvres, et une barre de progression **Calcul du ROI des recettes de bâtiment** parcourt les bâtiments.

## Configurations {#layouts}

Chaque bâtiment a une configuration enregistrée : un nombre de bâtiments de production plus les habitations et le stockage dont ils ont besoin. PRUNplanner garde ces configurations dans un tableau fixe et ne les recalcule pas selon tes prix. Avec les 25 de surface du [[core-module|module central]], chaque configuration utilise de 450 à 500 de surface : elle tient donc dans une base de 500 de surface.

La colonne **Configuration optimale** montre la configuration, par exemple `11x TNP, 9x HB3, 1x STO`. Le bâtiment de production vient d'abord, puis les habitations et le stockage.

## Préférence d'échange {#exchange-preference}

**Préférence CX** dans l'en-tête choisit la [[exchange-preference|préférence d'échange]] d'où viennent les prix. PRUNplanner achète les intrants et les consommables de la main-d'œuvre au prix d'achat et vend les produits au prix de vente (voir [Achat, vente ou les deux](/help/exchanges#buy-sell-or-both)).

> [!warning]
> Choisir une préférence d'échange ici en fait aussi ta préférence d'échange par défaut pour toutes les pages, comme si tu la réglais dans ton profil. La page se recalcule aussitôt.

« None - Universe 30D » signifie aucune préférence d'échange : chaque prix est alors le [[vwap|VWAP]] sur 30 jours de l'[[universe|Univers]].

## Colonnes {#columns}

Le tableau affiche 50 lignes par page. Clique sur l'en-tête d'une colonne numérique pour trier selon elle.

| Colonne                                       | Ce qu'elle montre                                                                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bâtiment**                                  | le bâtiment de production                                                                                                                                                                                      |
| **Configuration optimale**                    | la configuration enregistrée (voir [Configurations](#layouts))                                                                                                                              |
| **Produit de la Recette**                     | les produits de la recette, sous forme de tuiles de matériaux                                                                                                                                                  |
| **Intrant de la Recette**                     | les intrants de la recette, sous forme de tuiles de matériaux                                                                                                                                                  |
| **COGC**                                      | le programme avec lequel tourne le plan, c'est-à-dire l'expertise du bâtiment                                                                                                                                  |
| **COGM**                                      | ouvre le détail **Coût des marchandises fabriquées** de la recette ([[cogm\|COGM]]) |
| **Coût du Plan (ȼ)**       | ce que coûte la construction de toute la configuration                                                                                                                                                         |
| **Bénéfice quotidien (ȼ)** | ce que rapporte toute la configuration par jour                                                                                                                                                                |
| **Bénéfice/Surface (ȼ)**   | le bénéfice quotidien par unité de surface utilisée                                                                                                                                                            |
| **ROI du plan (j)**        | les jours avant que le bénéfice ait payé la construction                                                                                                                                                       |

La quantité quotidienne sur une tuile de matériau est la quantité de la recette × les bâtiments × les exécutions par jour × 1,25 (le bonus COGC). Elle laisse de côté les experts et l'efficacité de la main-d'œuvre : elle est donc plus basse que le flux derrière le bénéfice affiché à côté. Par exemple, une recette qui produit 4 unités en 12 heures s'exécute 2 fois par jour : une configuration de 10 bâtiments affiche donc 4 × 10 × 2 × 1,25 = 100 par jour.

## Comment les chiffres sont calculés {#calculation}

- **Bénéfice quotidien (ȼ)** = valeur des produits au prix de vente − intrants et consommables de la main-d'œuvre au prix d'achat − [[degradation|dégradation]] − frais de production. La dégradation est le coût de construction des bâtiments de production ÷ 180 par jour.
- **Coût du Plan (ȼ)** = matériaux de construction de toute la configuration au prix d'achat : bâtiments de production, habitations, stockage et module central.
- **Bénéfice/Surface (ȼ)** = Bénéfice quotidien ÷ surface utilisée, module central compris.
- **ROI du plan (j)** = Coût du plan ÷ Bénéfice quotidien. Il est vert quand le plan s'amortit. Quand il ne s'amortit jamais (pas de bénéfice), la colonne affiche **jamais** en rouge.

Un exemple inventé : une configuration dont les bâtiments de production valent 900 000 ȼ perd 900 000 ÷ 180 = 5 000 ȼ par jour en dégradation. Si toute la configuration coûte 1 500 000 ȼ à construire, utilise 500 de surface et fait un Bénéfice quotidien de 30 000 ȼ, son Bénéfice/Surface est de 30 000 ÷ 500 = 60 ȼ et son ROI du plan de 1 500 000 ÷ 30 000 = 50 jours.

Tes plans utilisent les mêmes formules. Pour la vue base du [[profit|bénéfice]] et du [[roi|ROI]], voir [Résultats](/help/plan_results).

## Filtres {#filters}

Au-dessus du tableau :

- **Bâtiment**, **COGC**, **Sortie** et **Entrée** acceptent chacun une ou plusieurs valeurs, et tu peux y faire une recherche. **Sortie** et **Entrée** gardent les recettes qui produisent ou utilisent l'un des matériaux choisis.
- **ROI positif** masque les recettes qui perdent de l'argent.

> [!tip]
> Pour trouver quoi fabriquer à partir d'un matériau que tu produis déjà, choisis-le sous **Entrée**. Pour voir qui fabrique un matériau dont tu as besoin, choisis-le sous **Sortie**.
