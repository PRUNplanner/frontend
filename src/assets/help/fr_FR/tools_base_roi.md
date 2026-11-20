**ROI des bases** classe toutes les façons de faire tourner une base, pour que tu voies quelles bases s'amortissent le plus vite avant d'en planifier une. Chaque ligne est une base complète : une ressource sur une planète, une recette agricole sur une planète fertile, ou une recette de n'importe quel autre bâtiment de production. Tu n'as pas besoin de compte pour l'utiliser.

Tu t'en sers quand tu cherches ta prochaine base et que tu veux comparer les options côte à côte. Quand une ligne a l'air intéressante et que tu es connecté, **Ouvrir comme plan** la transforme en un plan que tu peux modifier dans le moindre détail.

> [!warning]
> ROI des bases est en phase de test et n'a pas encore d'entrée dans la navigation. Ouvre-le sur [/base-roi](/base-roi).

## Première visite {#first-visit}

La première fois que tu ouvres la page, **Configurer le ROI des bases** te pose quelques questions pour que le tableau corresponde à ta façon de jouer :

- ta préférence d'échange (seulement si tu es connecté)
- **À quel point le tableau doit-il être strict ?** : **Débutant**, **Standard** (présélectionné) ou **Vétéran**
- le vaisseau (Vétéran uniquement : n'importe quel vaisseau, ou **Sans limite**, par défaut) et **Visites du vaisseau**, le nombre de jours de cargaison que le vaisseau transporte par trajet, à l'aller comme au retour
- **Choisir les colonnes** : les colonnes du préréglage, que tu peux changer avant d'appuyer sur **Commencer**

| Préréglage   | Logistique                                  | Capacité de marché min. | Stock tampon | Colonnes masquées                                                |
| ------------ | ------------------------------------------- | --------------------------------------- | ------------ | ---------------------------------------------------------------- |
| **Débutant** | SCB (500 t / 500 m³)     | 0,7                                     | 10 jours     | Rendement hebdo, coût de fonctionnement, parcelles, main-d'œuvre |
| **Standard** | WCB (3 000 t / 1 000 m³) | 0,7                                     | 10 jours     | Rendement hebdo, coût de fonctionnement, parcelles, main-d'œuvre |
| **Vétéran**  | ton vaisseau, ou sans limite                | 0 (toute)            | 10 jours     | Coût de fonctionnement                                           |

Un préréglage ne fait que remplir des paramètres que tu peux aussi changer plus tard dans [Paramètres](#settings), donc rien de ce que tu choisis ici n'est définitif. Le vaisseau et **Visites du vaisseau** comptent parce qu'ils fixent la limite logistique : le tableau masque les bases qui déplacent plus de cargaison entre deux visites que le vaisseau n'en transporte. La capacité de marché minimale masque les bases dont le marché peut absorber moins que ce nombre, par exemple moins de 0,7 base.

**Passer**, ou fermer la boîte de dialogue, garde les paramètres actuels. Dans les deux cas, la boîte de dialogue ne s'ouvrira plus d'elle-même, mais **Relancer la configuration** dans Paramètres la fait revenir. Tous les paramètres sont stockés dans ce navigateur uniquement, pas dans ton compte.

## Ce que suppose chaque base {#assumptions}

Chaque ligne est une base complète de 500 de surface (un [[area-permits|permis]]) avec la disposition optimale du bâtiment. PRUNplanner la calcule avec le même moteur que tes [[plan|plans]] et la valorise avec la [[exchange-preference|préférence d'échange]] sélectionnée, ou avec les prix Univers 30j quand tu n'es pas connecté ou que « None - Universe 30D » est sélectionné. Chaque base suppose aussi :

- Les deux [[luxuries|produits de luxe]] pour chaque catégorie.
- Des [[experts|experts]] uniquement dans l'[[expertise]] propre du bâtiment, selon les paramètres.
- Le COGC des paramètres, jamais le vrai programme de la planète. Les détails affichent le vrai programme de la planète avec « (non appliqué) ». Dans le jeu, les résidents de la planète votent pour le programme, et le gagnant tourne pendant une semaine, donc le vrai programme peut changer d'une semaine à l'autre.
- Les lignes de recette tournent sur une planète standard : rocheuse, gravité, pression et température normales, non fertile, et sans frais de production.

Le bas des paramètres dit la même chose : « Toutes les lignes supposent le COGC et les experts définis ici ; les lignes de recette tournent sur une planète standard. »

## Types de lignes {#row-kinds}

- **Ressource** : une ressource sur une planète, avec RIG, EXT ou COL et les matériaux d'environnement de la planète dans la construction. PRUNplanner ne calcule que les planètes dans la limite de **Sauts max. (lignes de planète)** et les ressources dont l'[[extraction]] quotidienne est supérieure à 0. La ligne affiche « @ planète · N sauts », les [[jumps|sauts]] jusqu'à l'échange le plus proche de ta préférence d'échange, ou des quatre échanges si tu n'en as pas.
- **Agriculture** : une recette FRM ou ORC sur une planète fertile, avec la fertilité de la planète dans le rendement. Elle affiche aussi « @ planète · N sauts ». La case **Ressources** dans **Types de lignes** affiche ou masque ces lignes en même temps que les lignes de ressources.
- **Recette** : une recette de n'importe quel autre bâtiment de production, sur la planète standard. Utilise **Essayer sur une planète** dans les détails de la ligne pour la voir sur une vraie planète.

## Indicateurs {#metrics}

- **Bénéfice quotidien** : les recettes moins les intrants, les consommables, la [[degradation|dégradation]] et les [[production-fees|frais de production]]. La dégradation vaut la construction des bâtiments de production ÷ 180. Les lignes de planète paient les frais de leur planète (les frais de la planète par jour × efficacité × bâtiments). Les lignes de recette sur la planète standard n'en paient pas. Avec **Progression depuis 0**, c'est le bénéfice à 5 experts, sinon au nombre fixe.
- **Rentabilité** : le nombre de jours avant que le coût de construction soit amorti. Avec **Progression depuis 0**, une nouvelle base démarre sans experts. Les étapes à 0, 1, 2, 3 et 4 experts durent 10, 12,5, 57,57, 276,5 et 915,1 jours, chacune divisée par le nombre de bâtiments de production. Les recettes, les intrants et les frais de production augmentent avec le bonus des experts, tandis que les consommables et la dégradation restent les mêmes. Elle affiche « jamais » quand la base ne fait pas de bénéfice (avec la progression : à 5 experts). Pas d'inquiétude si tu la vois rarement : ces lignes ont un bénéfice quotidien de 0 ou moins, donc elles ne s'affichent que si **Afficher les négatifs** est activé.
- **Rendement hebdo** : 7 × bénéfice quotidien ÷ coût de construction.
- **Coût de construction** : la construction plus les options des paramètres, à savoir le stock tampon (jours de tampon × (intrants + consommables + recettes) ÷ 2) et l'amélioration du QG pour un permis de plus.
- **Coût de fonctionnement quotidien** : intrants + consommables + dégradation + frais de production. Il est masqué tant que tu ne l'actives pas dans **Colonnes**, parce que le stock tampon inclus dans le coût de construction couvre déjà le coût de fonctionnement au démarrage.
- **Cargaison / jour** : deux nombres, en tonnes et en m³, chacun le plus grand entre ce que la base fait entrer et sortir par jour. L'infobulle détaille l'entrée et la sortie séparément, avec la vérification du vaisseau. Le tri utilise le plus grand des deux nombres, tonnes et m³ confondus.
- **Capacité de marché** : combien de bases comme celle-ci le marché peut absorber. Pour chaque produit, c'est le volume échangé par jour (tout ce qui s'est échangé sur les 7 derniers jours ÷ 7, donc les jours sans échange comptent) ÷ ce que la base produit par jour. Pour chaque intrant de recette, c'est le volume échangé ÷ ce dont la base a besoin par jour. Les sous-produits comptent comme des produits, et les consommables de la main-d'œuvre ne comptent pas. C'est la valeur la plus basse qui compte. (O) ou (I) indique quel côté la limite, et l'infobulle nomme le matériau. En dessous de 1 (affiché en orange), une seule base produit ou consomme plus que ce que le marché échange. L'infobulle donne aussi la part d'une base dans le volume échangé (1 ÷ capacité de marché, en pourcentage). Voir [[market-capacity|capacité du marché]].
- **Industrie** : l'industrie de la base, en abrégé (Alimentation pour Industries alimentaires, Carburant pour Raffinage de carburant, Extraction pour Extraction de ressources).
- **Parcelles** : les [[plots|parcelles]] libres de la planète, pour les lignes de planète. Trie sur cette colonne pour trouver les planètes les plus vides. Les lignes de recette affichent un tiret.
- **Main-d'œuvre** : les travailleurs dont la base a besoin par catégorie (PIO, SET, TEC, ENG, SCI). Quand la planète ne peut pas fournir le personnel de la base, une ligne orange indique combien sont disponibles, ou « Aucun rapport de population ».
- **Bénéfice, 30 jours** : le bénéfice quotidien avec le [[vwap|VWAP]] quotidien de l'échange de chaque matériau sur les 30 derniers jours, sous forme de petit graphique. Les jours sans échange gardent le dernier prix, et les matériaux sans historique gardent le prix du jour. Les prix ASK, BID et fixes n'ont pas d'historique.
- **⚠** : un matériau valorisé d'après un VWAP 7j ou 30j dont le [[bid]] ou l'[[ask]] s'écarte de plus de 30 % de ce prix. C'est un indice que le bénéfice quotidien peut être très différent si tu échanges dans le carnet d'ordres plutôt qu'à la moyenne. La fenêtre détaille le bénéfice quotidien pour chaque combinaison de bid et d'ask de ces matériaux, du plus bas au plus haut. Au-delà de 100 combinaisons, elle n'affiche que les deux extrêmes : acheter à l'ask et vendre au bid, et l'inverse.

### Exemple chiffré {#metrics-example}

Les chiffres ici sont inventés et ronds, avec un nombre d'experts fixe, pour que le calcul reste facile à suivre.

- Une base a un coût de construction de 700 000 ȼ et rapporte 20 000 ȼ par jour. La rentabilité est de 700 000 ÷ 20 000 = 35 jours, et le rendement hebdo de 7 × 20 000 ÷ 700 000 = 20 %.
- Une partie de ce coût de construction est le stock tampon. Avec 10 jours de tampon, des intrants à 3 000 ȼ, des consommables à 1 000 ȼ et des recettes à 8 000 ȼ par jour, il vaut 10 × (3 000 + 1 000 + 8 000) ÷ 2 = 60 000 ȼ.
- La base produit 300 unités de son produit par jour, et le marché en échange 900 par jour en moyenne sur 7 jours : 900 ÷ 300 = 3 bases. Sa recette a besoin de 200 unités d'un intrant par jour, qui s'échange à 400 par jour : 400 ÷ 200 = 2 bases. La valeur la plus basse compte, donc la capacité de marché est de 2 (I), et la part d'une base dans le volume échangé de cet intrant est de 1 ÷ 2 = 50 %.

Avec **Progression depuis 0**, la rentabilité est plus longue que coût de construction ÷ bénéfice quotidien, parce que les premières étapes tournent avec moins d'experts. Dans le jeu, les experts arrivent avec le temps en faisant tourner les bâtiments de production de leur expertise, et plus il y a de bâtiments, plus ils arrivent vite. La progression suit cela : chaque étape est divisée par le nombre de bâtiments de production.

> [!tip]
> Une rentabilité courte avec une capacité de marché inférieure à 1 est un piège, parce qu'une seule base inonde déjà le marché. Trie par rentabilité, puis vérifie que la capacité de marché est bien au-dessus du nombre de bases que tu prévois.

## Paramètres {#settings}

Le panneau des paramètres se trouve au-dessus du tableau. Quand il est fermé, il affiche un résumé d'une ligne des paramètres qui façonnent le tableau.

| Paramètre                                                             | Par défaut                                                                                                                                | Options                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **COGC (toutes les lignes)**                       | **Programme correspondant** (le programme de l'expertise propre du bâtiment)                                           | **Aucun**                                                              |
| **Experts**                                                           | **Progression depuis 0**                                                                                                                  | de 0 à 5, fixe                                                         |
| **Stock tampon**                                                      | 10 jours                                                                                                                                  | **Désactivé**, de 1 à 10, 14, 21 ou 28 jours                           |
| **Limite logistique**                                                 | **Par vaisseau** : WCB, tous les 3 jours                                                                                  | **Manuelle** (600 t et 200 m³ par jour), **Aucune** |
| **Permis visé (coût du QG)**                       | **Désactivé**                                                                                                                             | de 2 à 50                                                              |
| **Sauts max. (lignes de planète)** | 7                                                                                                                                         | n'importe quel nombre entier à partir de 0                             |
| **Capacité de marché min.**                           | 0,7 base                                                                                                                                  | de 0,0 à 1,0 par pas de 0,1                                            |
| **Types de lignes**                                                   | **Ressources** et **Recettes** activés ; **Afficher les négatifs** et **Afficher les planètes sans travailleurs ni parcelles** désactivés |                                                                        |

- **Limite logistique** : **Par vaisseau** choisit un vaisseau (de TCB à HCB, chacun avec ses t et m³) et la fréquence de ses passages (« Intervalle de … jours »). Le vaisseau doit transporter autant de jours de cargaison, à l'aller comme au retour, en poids et en volume. Le tableau masque les lignes qui demandent plus. **Manuelle** fixe la limite par jour, et **Aucune** ne limite rien. Par exemple, le WCB par défaut (3 000 t / 1 000 m³) tous les 3 jours permet une base qui déplace jusqu'à 3 000 ÷ 3 = 1 000 t et 1 000 ÷ 3 ≈ 333 m³ par jour, en comptant le plus grand de l'entrée et de la sortie.
- **Stock tampon** : du stockage pour ce nombre de jours de cargaison. PRUNplanner ajoute des STO ou des STA. Quand la base ne tiendrait plus dans 500 de surface, il retire un bâtiment de production jusqu'à ce qu'elle tienne.
- **Permis visé (coût du QG)** : ajoute les matériaux de ce niveau de QG, aux prix d'achat CX, au coût de construction de chaque ligne. Le coût compte à partir de 3, donc 2 n'ajoute rien. Dans le jeu, chaque amélioration de niveau du QG te donne un permis de base de plus, donc cela montre ce que coûte la base sur ce permis, amélioration jusqu'à ce niveau de QG comprise.
- **Sauts max. (lignes de planète)** : comptés jusqu'à l'échange le plus proche de ta préférence d'échange, que le paramètre nomme. Les planètes sans route comptent comme trop loin.
- **Capacité de marché min.** se trouve à côté de la recherche au-dessus du tableau et masque les lignes en dessous de cette valeur.
- **Afficher les négatifs** : quand il est désactivé, le tableau masque les lignes dont le bénéfice quotidien est de 0 ou moins.
- **Afficher les planètes sans travailleurs ni parcelles** : désactivé par défaut. Le tableau masque alors les lignes de planète quand aucune nouvelle base ne rentre (toutes les parcelles prises et aucun [[ghost-sites|site fantôme]]) ou quand le dernier [[popr|rapport de population]] ne permet pas de pourvoir les emplois de la base, en comptant les travailleurs disponibles moins les emplois déjà ouverts. Une planète sans rapport de population compte comme n'ayant aucun travailleur. Active-le pour voir ces lignes, et active la colonne **Main-d'œuvre** pour voir ce qui manque. Les lignes de recette ne sont pas vérifiées. Si les rapports ne peuvent pas être chargés, la page le signale et rien n'est masqué.
- **Rétablir les valeurs par défaut** réinitialise les paramètres, mais garde tes colonnes, les panneaux et graphiques ouverts ou fermés, ainsi que la période et l'agrégation des graphiques.
- **Relancer la configuration** ouvre la boîte de dialogue de première visite.

Une planète pleine mais avec des sites fantômes reste dans le tableau. Dans le jeu, les sites fantômes ne permettent de s'installer qu'aux nouveaux joueurs qui démarrent sur cette planète, donc vérifie la colonne **Parcelles** si ta société a démarré ailleurs.

Seuls le COGC, les experts, le stock tampon, les sauts max. et la préférence d'échange font recalculer les lignes par PRUNplanner. Tous les autres paramètres s'appliquent immédiatement.

> [!warning]
> Choisir une préférence d'échange dans le sélecteur en haut (connecté uniquement) en fait aussi ta préférence d'échange par défaut. Les autres pages qui suivent ta préférence par défaut changent avec elle.

### Lignes masquées {#hidden-rows}

La ligne au-dessus du tableau compte les lignes, et celles qui sont masquées par limite : « sauts max. », « logistique », « capacité de marché », « sans parcelle », « sans travailleurs » et « bénéfice négatif ». Chaque ligne n'est comptée qu'une fois, à sa première limite dans cet ordre. « sans parcelle » et « sans travailleurs » ne comptent que tant que **Afficher les planètes sans travailleurs ni parcelles** est désactivé, et « bénéfice négatif » que tant que **Afficher les négatifs** est désactivé. La recherche n'est pas une limite et n'est pas comptée.

Quand il ne reste aucune ligne, le tableau affiche « Aucune base ne passe ces paramètres. » Pas d'inquiétude : à moins que la page n'indique qu'une requête a échoué, cela veut seulement dire que tes paramètres ou ta recherche ne laissent rien à afficher. Les compteurs au-dessus du tableau t'indiquent quelles limites ont masqué des lignes, pour que tu saches quel paramètre changer.

## Graphique du bénéfice {#profit-chart}

Au-dessus du tableau, **Bénéfice quotidien par industrie** montre le bénéfice quotidien de chaque industrie sur la période choisie (90 jours sauf si tu la changes). Sur les écrans de 1 536 px de large et plus, il se place à côté des paramètres.

- Chaque base compte selon la quantité de son matériau que le marché échange (moyenne sur 7 jours de ses produits).
- Les nombreuses planètes d'une même ressource ou recette agricole comptent pour une : la moyenne des 3 planètes au bénéfice quotidien le plus élevé, pour que les planètes médiocres ne tirent pas la courbe vers le bas.
- Il suit les paramètres et les limites du tableau.
- Il montre les 7 lignes les plus échangées et indique combien il y en a d'autres.

Clique sur le titre pour replier le graphique, et il reste replié. Fais une recherche pour descendre dans le détail :

- une industrie (par ex. « Chemistry ») affiche ses bâtiments
- un bâtiment (par ex. « CHP ») affiche ses matériaux
- un matériau (par ex. « SC ») affiche les recettes qui le fabriquent

Une recherche qui ne laisse qu'un seul bâtiment ou une seule industrie descend aussi dans le détail.

Chaque graphique d'historique a une période (**7j**, **30j** ou **90j**) et une agrégation (**1j**, **3j** ou **7j** par point) en haut à droite, comme les graphiques du jeu. Une agrégation plus longue lisse le bruit quotidien. Ton choix s'applique à tous ces graphiques et est mémorisé. La colonne **Bénéfice, 30 jours** du tableau montre toujours 30 jours.

## Graphique {#chart}

**Graphique** en haut ouvre **Rentabilité vs capacité de marché** dans un tiroir que tu peux redimensionner. Il trace les lignes que le tableau affiche, recherche comprise :

- en abscisse, la rentabilité en jours, et en ordonnée, la capacité de marché en bases, toutes deux sur des échelles logarithmiques
- la taille du point est le bénéfice quotidien, et la couleur le type de ligne
- la ligne pointillée relie les meilleurs compromis : les lignes qu'aucune autre ne bat à la fois sur une rentabilité plus courte et une capacité de marché plus élevée

Les lignes qui ne sont jamais rentables ou qui n'ont pas de capacité de marché ne sont pas tracées, mais le tiroir les compte. Survole un point pour faire défiler le tableau jusqu'à sa ligne. Le bouton est désactivé tant qu'aucune ligne ne s'affiche, et le tiroir reste ouvert ou fermé comme tu l'as laissé.

> [!tip]
> Le coin en haut à gauche du graphique est là où tu veux être : amortissement rapide et de la place sur le marché. Survole les points de cette zone pour trouver leurs lignes.

## Recherche et infobulles {#search-and-tooltips}

- La recherche au-dessus du tableau filtre par industrie, bâtiment ou ticker de produit.
- Le tableau trie les lignes par rentabilité, la plus courte en premier, et à rentabilité égale par le bénéfice quotidien le plus élevé. Clique sur un en-tête de colonne pour trier sur cette colonne à la place (Matériau, Main-d'œuvre et Bénéfice, 30 jours ne se trient pas). Le tableau affiche 50 lignes par page.
- Survole un en-tête de colonne pour voir ce qu'il signifie, ou un nombre pour voir le calcul rapide qui le sous-tend.

## Détails {#details}

Déplie une ligne pour voir deux graphiques sous **Historique du bénéfice**, avec le calcul complet en dessous.

- Bénéfice : recettes, coût de fonctionnement et bénéfice quotidien, toutes les courbes sur une même échelle en ȼ.
- Volume du marché : combien de bases le marché supporte chaque jour, d'après le volume échangé sur le CX ce jour-là. **Sorties** est le volume échangé du produit le plus rare ÷ ce qu'une base vend par jour. **Entrées (goulot d'étranglement)** est la même chose pour l'intrant de recette qui a le moins de volume par unité requise par la recette. C'est la colonne de capacité de marché, jour par jour.

Les deux graphiques suivent la période et l'agrégation des graphiques d'historique. Le calcul se présente en huit sections : **Disposition et coût de construction**, **Logistique et stockage**, **Efficacité de production**, **Cycles de production**, **Rendement**, **Argent par jour** (avec consommables, dégradation et frais de production), **Rentabilité** (chaque étape d'experts et le jour où c'est amorti) et **Capacité de marché**. **Copier en texte** copie le tout.

**Essayer sur une planète** (lignes de recette uniquement) te permet de choisir n'importe quelle planète, et PRUNplanner y calcule la ligne avec les paramètres du tableau. Une ligne compare le coût de construction et la rentabilité avec la planète standard, et **Retour à la planète standard** annule le choix. PRUNplanner oublie ce choix quand les détails se ferment.

**Ouvrir comme plan** (connecté) crée et enregistre un plan tout de suite et l'ouvre. Le plan s'appelle « Base ROI » suivi des produits et du bâtiment, et reçoit la même disposition. Il est placé sur la planète de la ligne, la planète que tu as essayée, ou Montem (OT-580b) pour une ligne de recette. Il va dans l'un de tes empires qui a la même préférence d'échange et aucun bonus de faction pour le bâtiment. Sans un tel empire, il ne va dans aucun, et un avis indique que le bénéfice quotidien du plan peut différer. Les lignes de planète ont aussi un lien « Ouvrir … » pour démarrer un plan sur cette planète.

> [!tip]
> Une ligne de recette n'a pas de frais de production. Utilise d'abord **Essayer sur une planète** : les chiffres incluent alors les frais de cette planète, et **Ouvrir comme plan** place le plan sur celle-ci au lieu de Montem.

## Chargement {#loading}

Les lignes de recette apparaissent en premier, puis les lignes de planète (« Chargement des lignes de planète… »). Une ligne de progression montre chaque étape. Si une requête échoue, la page le signale. Modifie un paramètre ou recharge la page pour réessayer. Au premier chargement, les lignes de recette s'affichent dès qu'elles sont prêtes, pour que tu puisses les consulter pendant que les lignes de planète sont encore en cours de calcul.
