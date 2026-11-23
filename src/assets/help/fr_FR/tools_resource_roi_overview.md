Utilise ROI ressource pour choisir une planète pour une base d'extraction. L'outil trouve toutes les planètes où une ressource peut être extraite et calcule ce qu'y rapporte une base remplie de RIG, EXT ou COL. Quand une planète semble intéressante, ouvre-la comme plan pour l'affiner.

## Comment l'utiliser {#how-to-use}

1. Choisis la ressource sous **Sélectionner Ressource** (36 ressources planétaires, de ALO à ZIR).
2. Vérifie la **Préférence CX**, qui détermine les prix (voir [Prix](#prices)).
3. Appuie sur **Rechercher et calculer**.

PRUNplanner cherche d'abord toutes les planètes qui ont cette ressource, en affichant « En attente de la réponse du backend ». Puis il calcule chacune d'elles, avec une barre de progression qui indique **Calcul du ROI de la ressource pour les planètes.** Tu obtiens les résultats triés par rendement quotidien, du plus élevé au plus faible.

Si tu changes la ressource ou la préférence d'échange, le tableau ne se recalcule pas tout seul. Appuie à nouveau sur **Rechercher et calculer**.

## Ce qui est calculé {#what-it-calculates}

Sur chaque planète qui a la ressource, PRUNplanner examine chaque bâtiment d'extraction dont les recettes y produisent cette ressource. Pour chacun de ces bâtiments, il construit un plan à partir de la configuration enregistrée du bâtiment (voir [Configurations optimales](#optimal-setups)). Chaque ligne correspond donc à une planète et à un bâtiment qui peut y extraire la ressource.

Chaque plan utilise ces réglages :

| Réglage                                                                                                                          | Valeur                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planète                                                                                                                          | la vraie planète, avec sa concentration de ressource, ses [[extra-building-materials\|matériaux de construction supplémentaires]] et ses [[production-fees\|frais de production]] |
| Programme [[cogc\|COGC]] | Extraction de ressources, sur chaque planète                                                                                                                                                                                                                                                                                                                                                      |
| [[experts\|Experts]]     | 5 dans chaque expertise                                                                                                                                                                                                                                                                                                                                                                           |
| Main-d'œuvre                                                                                                                     | entièrement logée par les habitations de la configuration                                                                                                                                                                                                                                                                                                                                         |

> [!warning]
> Chaque plan suppose que la planète applique le programme Extraction de ressources, quel que soit celui qu'elle applique réellement. La colonne **COGC** montre le programme actuel de la planète. Là où il est différent, les vrais chiffres sont plus bas.

## Colonnes {#columns}

Le tableau affiche 50 lignes par page. La colonne des planètes reste épinglée, et sur les écrans étroits, le tableau défile horizontalement. Clique sur l'en-tête d'une colonne numérique pour trier selon elle.

| Groupe              | Colonne                                       | Ce qu'elle montre                                                                                                                                                                                                                                                          |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                     | **Planète**                                   | le nom et l'ID. Le lien ouvre un nouveau plan sur cette planète                                                                                                                                                                                            |
| **Production**      | **Bâtiment**                                  | RIG, EXT ou COL                                                                                                                                                                                                                                                            |
|                     | **Quotidien**                                 | les unités de la ressource que la configuration extrait par jour                                                                                                                                                                                                           |
|                     | **% max.**                    | Quotidien en pourcentage du meilleur Quotidien des résultats, avec une barre                                                                                                                                                                                               |
| **Coût / Bénéfice** | **COGM**                                      | ouvre le détail du coût par unité ([[cogm\|COGM]])                                                                                              |
|                     | **Plan Coût (ȼ)**          | ce que coûte la construction de toute la configuration sur cette planète                                                                                                                                                                                                   |
|                     | **Bénéfice quotidien (ȼ)** | ce que rapporte la configuration par jour, avec une barre mise à l'échelle de la meilleure ligne                                                                                                                                                                           |
|                     | **ROI du plan (j)**        | Coût du plan ÷ Bénéfice quotidien, en jours                                                                                                                                                                                                                                |
| **Planète**         | **POPR**                                      | le dernier rapport de population de la planète (voir [POPR](#popr))                                                                                                                                                                                     |
|                     | **COGC**                                      | le programme que la planète applique actuellement, ou « — » si elle n'en a pas                                                                                                                                                                                             |
|                     | **Environnement**                             | les matériaux de construction supplémentaires dont la planète a besoin, sous forme de tuiles                                                                                                                                                                               |
|                     | **Infrastructures**                           | LM, COGC, WAR, ADM et SHY, quand la planète les possède                                                                                                                                                                                                                    |
| **Distances**       | AI1, CI1, IC1, NC1                            | les [[jumps\|sauts]] jusqu'à chaque échange. Le plus proche est en gras dans la couleur de son échange, et « — » signifie qu'il n'y a pas de route |

Le bénéfice quotidien et le coût du plan suivent les mêmes règles que [RSI recette](/help/tools_roi_overview#calculation). Les produits comptent au prix de vente et les consommables au prix d'achat, avec la [[degradation|dégradation]] et les frais de production de la planète inclus.

**ROI du plan (j)** affiche le nombre brut. Une valeur négative signifie que le plan perd de l'argent et ne s'amortit jamais. Sa barre se remplit à mesure que l'amortissement approche de 20 jours : une barre plus longue signifie donc un amortissement plus lent. Par exemple, un amortissement de 10 jours remplit la moitié de la barre, et 20 jours ou plus la remplissent entièrement.

**% max.** compare chaque ligne à la meilleure. Par exemple, si la meilleure configuration extrait 200 unités par jour, une ligne avec un Quotidien de 150 affiche 150 ÷ 200 = 75 %.

## Filtres {#filters}

- **Planète** et **Bâtiment** limitent le tableau à la planète ou au bâtiment que tu choisis.
- **ROI positif** masque les plans qui perdent de l'argent.
- **Matériau recherché** affiche la ressource choisie sous **Sélectionner Ressource**. Si tu la changes sans appuyer sur **Rechercher et calculer**, les lignes restent celles de la ressource précédente.

Le graphique en dessous montre les mêmes lignes que le tableau filtré.

## Amortissement vs distance {#chart}

Après une recherche, **Graphique** ouvre le graphique **Amortissement vs distance** sous le tableau, et ton navigateur retient s'il est ouvert. Pour l'agrandir ou le réduire, fais glisser son bord supérieur, ou place le focus sur ce bord et utilise les flèches.

- L'axe horizontal est le ROI du plan en jours. L'axe vertical est le nombre de sauts jusqu'à l'échange le plus proche, ou jusqu'à celui que tu choisis dans **Distance vers** (**CX le plus proche** par défaut).
- La taille d'un point est son bénéfice quotidien, et sa couleur est l'échange vers lequel ses sauts sont comptés (le plus proche par défaut).
- Les points mis en évidence sont les meilleurs compromis : aucune autre planète ne s'amortit à la fois plus vite et n'est plus proche. Par exemple, une planète à 10 jours et 4 sauts et une autre à 12 jours et 2 sauts sont toutes les deux mises en évidence, car aucune ne bat l'autre sur les deux critères. Une planète à 14 jours et 5 sauts ne l'est pas, car la première la bat sur les deux.
- Une ligne sous le graphique nomme les planètes mises en évidence et leurs sauts. Elle nomme aussi la planète qui rapporte le plus par jour, si elle n'en fait pas partie.
- Survole un point pour faire défiler sa ligne jusqu'à elle.

Toutes les lignes ne deviennent pas des points. Le graphique écarte les lignes qui ne s'amortissent jamais, qui n'ont pas de route vers l'échange ou qui mettent plus de deux fois le temps de l'amortissement le plus rapide, et il les compte sous le graphique. Ainsi, si la ligne la plus rapide s'amortit en 10 jours, les lignes au-delà de 20 jours sont comptées mais pas dessinées. Pas d'inquiétude si des points semblent manquer : ils sont toujours dans le tableau.

> [!tip]
> Une planète quelques sauts plus loin qui s'amortit presque aussi vite est souvent la meilleure base, car les trajets vers et depuis un échange coûtent du temps et du carburant chaque semaine.

## POPR {#popr}

Le bouton **POPR** charge le dernier rapport de population de la planète ([[popr|POPR]]) et l'ouvre par niveau de main-d'œuvre :

| Ligne                       | Ce qu'elle montre                                   |
| --------------------------- | --------------------------------------------------- |
| **Population totale**       | le chiffre de population du niveau dans le rapport  |
| **Population disponible**   | les travailleurs sans emploi                        |
| **% Population disponible** | les travailleurs disponibles en pourcentage         |
| **Emplois non pourvus**     | les emplois que les bases de la planète ont ouverts |

Si une planète n'a pas de rapport, le bouton devient un **Pas de POPR** rouge et désactivé quand tu appuies dessus. Dans un plan, l'outil POPR montre le même rapport avec les besoins de ton plan à côté (voir [Outils du plan](/help/plan_tools)).

## Configurations optimales {#optimal-setups}

PRUNplanner utilise un tableau fixe de configurations, le même que celui de [RSI recette](/help/tools_roi_overview#layouts) :

- RIG : 35 RIG, 11 HB1, 1 STO
- EXT : 14 EXT, 8 HB1, 1 HBB, 1 STO
- COL : 22 COL, 11 HB1, 1 STO

Avec le module central, chacune tient dans une base de 500 de surface.

## Prix {#prices}

**Préférence CX** choisit la [[exchange-preference|préférence d'échange]] d'où viennent les prix. « None - Universe 30D » utilise le [[vwap|VWAP]] sur 30 jours de l'[[universe|Univers]].

> [!warning]
> Choisir une préférence d'échange ici en fait aussi ta préférence d'échange par défaut pour toutes les pages.
