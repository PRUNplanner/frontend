La Production est l'endroit où tu ajoutes des bâtiments, règles combien tu en construis, mets des [[recipe|recettes]] en file et compares les recettes avant d'en remplacer une. Elle liste les bâtiments du plan et les ordres que chacun exécute. Les chiffres des bâtiments et des ordres utilisent les mêmes prix et la même efficacité que les [résultats](/help/plan_results).

## Ajouter des bâtiments {#adding-buildings}

La liste de bâtiments au-dessus de la liste propose chaque bâtiment de production qui n'est pas encore dans le plan. En choisir un l'ajoute avec un nombre de 1 et sans recette. Il ne produit rien tant que tu ne lui en donnes pas une avec **+ Recette** (voir [Ordres](#orders)).

Un plan vide affiche « Aucun bâtiment pour l'instant. » et te renvoie vers la liste de bâtiments. Avec **Suggestions de plan** activé et des données sur la planète disponibles, il propose plutôt de partir d'une configuration typique.

**Adapter au COGC** limite la liste aux bâtiments dont l'[[expertise|expertise]] correspond au programme [[cogc|COGC]] du plan. Avec le programme réglé sur **Aucun** ou sur un programme de main-d'œuvre (des Pionniers aux Scientifiques), aucun bâtiment ne correspond et la liste est vide. Décoche-le pour revoir tous les bâtiments.

Avec **Suggestions de plan** activé (dans le [Profil](/profile)) et assez de plans sur la planète, la liste commence par un groupe « Populaires sur … », les bâtiments les plus planifiés en premier, suivi de **Tous les bâtiments**.

Pour l'extraction, clique plutôt sur une ressource dans **Planète**. Cela ajoute le bon extracteur avec la recette de cette ressource (voir [Configuration de la base](/help/plan_base#resources)). Un plan vide peut aussi partir de la configuration typique de la planète, comme décrit dans [Disposition](/help/plan_layout).

La ligne au-dessus des bâtiments les compte (« … bâtiments · … unités · … recettes »). **Tout réduire** et **Tout développer** replient ou déplient chaque bâtiment.

## La ligne d'un bâtiment {#building-row}

Chaque bâtiment a une ligne avec les colonnes **Bâtiment**, **Nombre**, **Eff.**, **ȼ / jour** et **Surface**.

| Colonne      | Ce qu'elle affiche                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bâtiment** | Le nom. Clique dessus pour replier ou déplier ses ordres. Une ligne repliée affiche les tuiles de ce qu'elle produit. Les replis ne durent que pour cette visite. |
| **Nombre**   | Combien tu en construis. À 0, la ligne reste, avec un bord gauche rouge, et le bâtiment ne produit, ne consomme et ne coûte rien.                                 |
| **Eff.**     | L'[[efficiency\|efficacité]] du bâtiment. Survole-la pour voir chaque facteur.                                                                                    |
| **ȼ / jour** | Ce que rapportent par jour tous les bâtiments de cette ligne (voir plus bas).                                                                                     |
| **Surface**  | La surface du bâtiment × le nombre.                                                                                                                               |

Sous le nom, l'expertise du bâtiment est en vert avec ✓ quand le programme COGC du plan la renforce, et en rouge avec ✗ quand ce n'est pas le cas. Viennent ensuite les autres facteurs qui modifient l'efficacité : le nombre d'experts (« 3 experts »), Faction, QG (QG de corp.), Fertilité, et COGC pour un programme de main-d'œuvre. À 0 %, la raison vient en premier, en rouge : « Planète non fertile », « Aucune main-d'œuvre logée » ou le facteur qui vaut 0. [Configuration de la base](/help/plan_base#efficiency) explique le fonctionnement de chaque facteur.

Les **ȼ / jour** d'un bâtiment, ce sont :

- ses propres intrants et produits par jour, soldés au sein du bâtiment, les produits au prix de vente et les intrants au prix d'achat,
- moins les consommables de sa main-d'œuvre au prix d'achat,
- moins 1/180 de son coût de construction (dégradation),
- moins ses [[production-fees|frais de production]],
- le tout multiplié par le nombre.

Par exemple (chiffres inventés), prends une ligne de 2 bâtiments. Les produits de chacun se vendent 3 000 ȼ par jour, ses intrants coûtent 1 000 ȼ, les consommables de ses travailleurs 400 ȼ, sa dégradation 100 ȼ et ses frais 50 ȼ. Les ȼ / jour de la ligne sont de (3 000 − 1 000 − 400 − 100 − 50) × 2 = 2 900 ȼ.

Les coûts de main-d'œuvre suivent les habitations et les produits de luxe du plan, donc les travailleurs sans lit et les produits de luxe que tu as désactivés ne coûtent rien. Un bâtiment paie toujours les consommables de ses propres travailleurs, même quand le plan les fabrique lui-même.

Le **Bénéfice / jour** du plan part plutôt des E/S des matériaux de toute la base, où ce qu'un bâtiment fabrique et ce qu'un autre consomme se compensent. Donc, sur une base qui fabrique ses propres consommables ou intrants, la somme des ȼ / jour des bâtiments ne correspond pas au **Bénéfice / jour**.

Là où la partie production est étroite, l'efficacité et la surface passent sous les ȼ / jour sous la forme « ȼ/jour · … · surface … ».

L'icône de corbeille supprime le bâtiment immédiatement, sans demander. Tu peux l'annuler avec Ctrl+Z (Cmd+Z sur Mac) ou avec **Annuler** dans le message « Bâtiment supprimé ».

## Ordres {#orders}

Un bâtiment exécute ses ordres l'un après l'autre, puis recommence. Chaque ligne d'ordre affiche :

- la quantité, c'est-à-dire le nombre de cycles de la recette que l'ordre comprend à chaque tour ;
- la recette, sous la forme de ses intrants et produits (clique dessus pour la [changer](#changing-a-recipe)) ;
- sa durée : le temps de la recette × la quantité ÷ l'efficacité du bâtiment ;
- sa part du temps du bâtiment : sa durée ÷ la durée de tous les ordres ;
- sa part des **ȼ / jour** du bâtiment ;
- **COGM** (voir [COGM](#cogm)) ;
- la suppression, qui ne demande pas de confirmation (« Recette supprimée », avec Annuler).

Par exemple (chiffres inventés), à 100 % d'efficacité, un ordre de 2 cycles d'une recette de 4 heures prend 8 h, et un ordre de 3 cycles d'une recette de 8 heures prend 24 h. Ensemble, cela fait 32 h, donc le premier ordre obtient 8 ÷ 32 = 25 % du temps du bâtiment et le second 75 %. À 125 % d'efficacité, les durées tombent à 6,4 h et 19,2 h, et les parts restent les mêmes.

Les ȼ / jour d'un ordre sont les ȼ de la recette par bâtiment et par jour (comme dans le [sélecteur de recette](#changing-a-recipe)) × sa part du temps × le nombre. Ainsi, les ordres se partagent le chiffre du bâtiment selon leur temps.

Quand les ordres n'utilisent pas les produits les uns des autres, leur somme est égale au chiffre du bâtiment. Quand ils le font, le bâtiment solde ces matériaux et les ordres non, donc les sommes diffèrent. Un ordre qui ne s'exécute jamais (0 % du temps) affiche « — ». À 0 % d'efficacité, tous les ordres affichent « — », tandis que le bâtiment affiche toujours ses coûts fixes (dégradation et éventuelle main-d'œuvre logée) comme une perte.

**+ Recette** ajoute un nouvel ordre, et un bâtiment peut commander deux fois la même recette. Un bâtiment sans ordre affiche **Aucune recette active**. Tant que tu n'en ajoutes pas, il ne produit rien mais paie quand même sa dégradation et les consommables de ses travailleurs logés, donc ses ȼ / jour affichent une perte. Avec **Suggestions de plan** activé et des données sur la planète, il affiche aussi **Les plus planifiées ici :** avec la combinaison de recettes la plus planifiée de la planète, sa part des plans et **Ajouter**.

> [!tip]
> Utilise les quantités pour équilibrer une chaîne au sein d'un même bâtiment : la colonne des parts montre comment se répartit le temps du bâtiment. Doubler la quantité d'un ordre double sa durée, il obtient donc une part plus grande et les autres ordres une part plus petite.

## Changer une recette {#changing-a-recipe}

Clique sur la recette d'un ordre pour ouvrir le sélecteur en dessous (**Changer de recette**, « remplace … »), ou sur **+ Recette** pour ajouter un nouvel ordre. Un seul sélecteur est ouvert à la fois.

Clique sur une ligne ou appuie sur Entrée pour la choisir. ↑ et ↓ parcourent la liste, et Échap ou un clic à l'extérieur la ferme. Sur téléphone, le sélecteur s'ouvre comme un panneau depuis le bas et affiche **Produit** (avec la durée en dessous), **À partir de** et **ȼ / jour**.

Après une modification, une ligne sous la ligne d'ordre indique ce qui a changé (« … remplacé par …. » ou « … ajoutée comme nouvel ordre. »), avec **Annuler**.

Les chiffres en ȼ du sélecteur sont _par bâtiment et par jour_ : ils valent pour un bâtiment qui n'exécute que cette recette, à son efficacité actuelle. Le pied de page indique **ȼ par bâtiment et par jour**.

| Colonne           | Ce qu'elle affiche                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Produit**       | Les produits d'un cycle.                                                                                                                                                                                                                                                                                                                                                 |
| **À partir de**   | Les intrants d'un cycle, avec une ligne en dessous (voir plus bas).                                                                                                                                                                                                                                                                                                      |
| **Durée**         | Un cycle à l'efficacité du bâtiment.                                                                                                                                                                                                                                                                                                                                     |
| **ȼ / jour**      | Produits au prix de vente moins intrants au prix d'achat, × cycles par jour, moins 1/180 du coût de construction, les consommables de la main-d'œuvre et les frais de production (les frais de la planète × l'efficacité). Pendant que tu changes une recette, « … vs maintenant » la compare avec celle que tu remplaces.                                               |
| **ȼ / surface**   | ȼ / jour ÷ la surface par bâtiment d'une disposition standard pour ce bâtiment, comme dans [RSI recette](/help/tools_roi_overview). Cette surface est sa propre surface plus sa part des habitations, du stockage et des 25 du module central. Un bâtiment sans disposition standard compte sa propre surface + 25. Tu peux ainsi comparer des recettes entre bâtiments. |
| **Amortissement** | Le coût de construction du bâtiment ÷ ses ȼ / jour, sans les habitations. « jamais » quand il ne fait pas de bénéfice.                                                                                                                                                                                                                                                   |
| **Plans**         | La part des plans de cette planète avec ce bâtiment qui exécutent la recette. « < 5 % » quand elle est inférieure à 5 % ou que moins de 10 joueurs l'utilisent.                                                                                                                                                                                                          |

La colonne **Plans** et le sélecteur **Trier par** ne s'affichent qu'avec **Suggestions de plan** activé et une planète qui a assez de plans. Cela veut dire au moins 15 plans d'au moins 10 joueurs, en comptant les joueurs actifs ces 90 derniers jours et les plans modifiés ces 180 derniers jours.

**Trier par** classe les lignes par **ȼ / jour** (par défaut) ou **Populaires** (les plus planifiées en premier). Quand tu changes une recette, la recette actuelle vient en premier, marquée et non sélectionnable. Quand tu en ajoutes une, les recettes que le bâtiment exécute déjà viennent en dernier.

La ligne sous les intrants réunit :

- « utilise … du plan » : les intrants que le plan fabrique déjà ;
- « alimente … » : les bâtiments du plan dont les ordres utilisent un produit de cette recette ;
- **recette actuelle** ou **dans le plan**.

### Note de dépendance {#dependency-note}

Quand le plan utilise un produit de la recette que tu remplaces, un avertissement s'affiche au-dessus de la liste : « Tes … transforment ce … en …. Le remplacer signifie acheter … par jour. Pour garder les deux, utilise « + Recette ». » Si c'est ta main-d'œuvre qui l'utilise, la note l'indique à la place.

La quantité est ce que le plan consomme de ce matériau par jour au total, d'après les E/S des matériaux. C'est la quantité entière, même quand d'autres ordres en fabriquent aussi une partie.

> [!tip]
> Tu veux essayer une recette sans perdre l'ancienne ? Utilise **+ Recette** pour l'ajouter comme second ordre et compare les ȼ / jour du bâtiment, puis supprime celle dont tu ne veux pas.

## COGM {#cogm}

**COGM** sur un ordre ouvre son [[cogm|coût des marchandises fabriquées]]. Il montre ce que coûte un cycle, et donc ce que coûte chaque unité produite, à l'efficacité et aux prix de ce plan.

- **Paramètres** : la durée de la recette à cette efficacité, sa part d'une journée (**% / jour**), **Efficacité**, **Dégradation** (le coût de construction du bâtiment ÷ 180 par jour) et **Frais de production / cycle** (les frais pondérés × le temps de base de la recette, indépendamment de l'efficacité).
- **Coût** d'un cycle : chaque intrant au prix d'achat (**Total des intrants**), la part de **Main-d'œuvre** (le coût quotidien de la main-d'œuvre du bâtiment × la part d'une journée que représente le cycle), la part de dégradation et les frais de production. Ensemble, ils forment le **Coût total**.
- Par produit : **Coût total** met tout le coût sur ce produit (coût ÷ sa quantité), tandis que **Répartition des coûts** le répartit sur tous les produits selon la quantité (coût ÷ les quantités de tous les produits).

Les parts suivent le temps du cycle. Par exemple, un cycle de 6 heures à 100 % d'efficacité représente 25 % d'une journée, il porte donc 25 % du coût quotidien de la main-d'œuvre et de la dégradation du bâtiment. Et si un cycle coûte 600 ȼ au total et fabrique 2 unités d'un produit et 1 d'un autre, le **Coût total** est de 600 ÷ 2 = 300 ȼ pour le premier et 600 ÷ 1 = 600 ȼ pour le second, tandis que la **Répartition des coûts** est de 600 ÷ 3 = 200 ȼ pour chacun. Pour une recette à un seul produit, les deux colonnes affichent le même chiffre.

Les prix viennent de la [[exchange-preference|préférence d'échange]] de l'empire. S'il en a une, **Utiliser comme prix d'achat sur toutes les planètes** transforme le COGM en prix d'achat fixe pour chaque plan qui utilise cette préférence (voir [Bourses](/help/exchanges#fixed-prices-and-cogm)).
