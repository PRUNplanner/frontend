Avec **Chaînes de production**, tu planifies toute une chaîne de production par jour. Dis-lui ce que tu veux produire et combien par jour, pour un matériau ou plusieurs à la fois (par exemple DW, RAT et OVE). Elle calcule chaque étape pour toi : quelle [[recipe|recette]] fabrique chaque matériau, combien de bâtiments il faut, ce que tu dois acheter, et ce que la chaîne coûte et rapporte à tes prix [[cx|CX]]. Ensuite, elle répartit la chaîne en bases, choisit des planètes et crée les [[plan|plans]]. Son second mode, **Vérifier un empire**, examine un empire que tu fais déjà tourner.

Utilise-la avant de construire : elle montre ce qu'il faut produire par jour, ce qu'il faut acheter et ce qu'il faut pour faire tourner le tout, depuis les matières premières, pour que tu saches ce qu'une chaîne coûte et rapporte avant de poser le moindre bâtiment.

## Bien démarrer {#getting-started}

Il te faut un compte pour utiliser Chaînes de production. Connecte-toi, puis ouvre-la sous Calculateurs → **Chaînes de production**.

1. Sous **Produire par jour**, choisis un matériau dans **Ajouter un matériau**. Tu peux choisir n'importe quel matériau qui a une recette ou qui existe comme ressource planétaire.
2. Chaque objectif démarre à 10 par jour. Saisis une quantité, ou utilise − et +. Ils avancent de 1 en dessous de 20, de 5 à partir de 20 et de 10 à partir de 100, et − ne descend jamais sous 1.
3. × retire un objectif. Tu peux en ajouter autant que tu veux, et la chaîne partage les étapes entre eux.

Les résultats, les étapes et le graphe se mettent à jour à chaque modification. Tant que tu n'as pas ajouté de matériau, la page affiche « Que veux-tu produire ? » à la place des résultats.

Pendant le chargement des planètes, une ligne indique « Chargement des planètes pour l'extraction … ». Si elles ne peuvent pas être chargées, les lignes extraites n'affichent aucun bâtiment. Appuie sur **Réessayer** pour les recharger.

> [!tip]
> Commence par la quantité quotidienne que tu aimerais vendre et regarde le bénéfice et les bâtiments. Utilise ensuite **Ajuster le rythme à tes bases** (voir [Bases](#bases)) pour dimensionner la chaîne aux bases que tu peux vraiment construire.

## Réglages {#settings}

Chaque base tourne avec les deux [[luxuries|produits de luxe]] et les [[experts]] qui rapportent le plus pour ses bâtiments (plus de détails dans [Bases](#bases)). Les produits de luxe sont des consommables facultatifs qui augmentent l'efficacité de tes travailleurs, et les experts accélèrent les bâtiments d'une base relevant d'une même expertise. Ces réglages se trouvent au-dessus des résultats :

- **Efficacité** : un pourcentage global supplémentaire appliqué en plus, pour les bonus de [[corp-hq|QG de corp.]] ou de [[faction]]. 100 % n'ajoute rien, et la valeur accepte de 1 à 1 000 %. Elle change ce que produit chaque bâtiment, pas les frais de production. Par exemple, à 125 %, une étape qui demande 10 bâtiments à 100 % revient à 8 bâtiments exacts.
- **Prix** : la [[exchange-preference|préférence d'échange]] utilisée pour valoriser la chaîne. Elle démarre sur ta préférence d'échange par défaut, et « None - Universe 30D » utilise les prix de tout l'Univers. La chaîne utilise les prix de la préférence mais pas ses exceptions propres à une planète. Les prix déterminent les recettes par défaut, chaque coût et le bénéfice, donc une autre préférence d'échange peut changer la chaîne.
- **Matières premières** : **Acheter** (par défaut) ou **Extraire**. Tu peux aussi passer une seule ligne en Extraire dans Étapes. Une matière première qui est elle-même un objectif est toujours extraite. Avec **Extraire**, la chaîne planifie des extracteurs et compte leur entretien, leur usure et leurs frais au lieu d'un prix CX. Trois ressources planétaires ont aussi une recette : O, HE3 et SIO. Avec **Extraire**, la chaîne extrait une telle ressource quand cela coûte moins cher par unité que de la fabriquer et que la base de l'étape peut l'extraire, et la fabrique sinon. Par exemple, l'acier a besoin de O : le fabriquer dans un TNP produit aussi du TC à vendre, alors que l'extraire ne demande que l'extracteur de la planète. Une ligne que tu as toi-même passée en Produire ou Extraire garde ce choix.
- **Sous-produits** : certaines recettes fabriquent un second produit en plus du matériau pour lequel elles tournent. **Couvrir la demande** (par défaut) utilise d'abord chaque [[byproduct|sous-produit]] là où la chaîne a besoin de ce même matériau, et vend le reste. **Vendre** les vend tous.

> [!warning]
> Choisir une préférence d'échange sous **Prix** en fait aussi ta préférence d'échange par défaut, donc les autres pages qui suivent ta préférence par défaut changent avec elle. C'est le cas dans les deux modes.

### Valeurs par défaut {#defaults}

| Réglage                     | Par défaut                           |
| --------------------------- | ------------------------------------ |
| **Efficacité**              | 100 %                                |
| **Prix**                    | ta préférence d'échange par défaut   |
| **Matières premières**      | **Acheter**                          |
| **Sous-produits**           | **Couvrir la demande**               |
| **Production propre**       | **Aucune**                           |
| Un nouvel objectif          | 10 / jour                            |
| **Bases jusqu'à**           | 500 de surface                       |
| **Nombre de bases**         | 2                                    |
| **Liste d'achats**          | pour 10 jours                        |
| **Ordre des lignes**        | **Chaîne**                           |
| **Épaisseur des lignes**    | **t / jour**                         |
| Produits de luxe d'une base | les deux                             |
| Experts d'une base          | **Auto**                             |
| COGC d'une base             | le programme en cours sur la planète |

## Production propre {#own-production}

Si tu fabriques déjà une partie d'une chaîne, choisis l'un de tes [[empire|empires]] sous **Production propre**. Tout matériau dont la chaîne a besoin et que l'empire produit en plus grande quantité qu'il n'en utilise est marqué **Disponible**. Ce surplus, c'est ce que ses plans produisent moins ce qu'ils utilisent, consommation de la main-d'œuvre comprise. La chaîne l'utilise en premier, après les sous-produits, et ne fabrique, n'achète ou n'extrait que le reste.

- Un matériau dont tu as assez passe dans la première colonne du graphe, et ses intrants sortent de la chaîne. Les étapes, les bâtiments et la construction ne montrent alors que ce que la nouvelle chaîne ajoute, et les résultats t'indiquent combien de bâtiments et combien de construction tu économises.
- Tu peux aussi marquer un matériau **Disponible** à la main dans la colonne Source et saisir combien tu en as par jour. Laisse le champ vide pour tout prendre, ou saisis 0 pour le désactiver. Une quantité saisie l'emporte sur l'empire. Quand elle diffère du surplus de l'empire, « utiliser … » à côté revient à la quantité de l'empire.
- Si tu n'as qu'une partie d'un matériau, la ligne affiche « reste » et te laisse choisir ce qui couvre le reste.
- Les objectifs viennent toujours de la chaîne elle-même.
- Pas d'inquiétude si un matériau que tes plans produisent n'affiche pas **Disponible** : seul ce que l'empire produit en plus de ce qu'il utilise compte, donc un matériau qu'il consomme entièrement n'a pas de surplus. Tu peux quand même le marquer **Disponible** à la main.
- Ce qui vient de tes plans compte dans le bénéfice comme un intrant acheté à son prix CX. La tuile des intrants affiche alors **Intrants / jour** et la divise entre propre et acheté.
- [Bases](#bases) indique quel plan fournit quoi, dans l'ordre des noms de plans, et quelle part du surplus la chaîne n'utilise pas. Le tableau de transport inclut les routes depuis ces plans.
- Les lignes Disponible ne font pas partie des plans créés par **Créer les plans**.
- Si tu modifies les plans de l'empire dans un autre onglet, les quantités se mettent à jour tant que cette page est ouverte.
- Le lien de la chaîne garde les quantités Disponible que la chaîne utilise, y compris celles de l'empire, mais jamais l'empire lui-même.

## Résultats {#results}

La bande du haut additionne toutes tes bases.

| Tuile                               | Ce qu'elle montre                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bénéfice / jour**                 | Valeur produite moins les intrants achetés, la production propre au prix CX, l'entretien, l'usure et les frais de production, aussi en part de la valeur produite (sans la production propre)                                                                                                                                                                                               |
| **Valeur produite / jour**          | Les objectifs au prix de vente CX, plus les sous-produits vendus                                                                                                                                                                                                                                                                                                                                               |
| **Intrants achetés / jour**         | Ce que tu achètes, au prix d'achat CX                                                                                                                                                                                                                                                                                                                                                                          |
| **Entretien, usure + frais / jour** | L'[[upkeep\|entretien]] de la main-d'œuvre avec les produits de luxe, l'usure et les [[production-fees\|frais de production]], avec l'entretien de la main-d'œuvre et les frais sous la valeur |
| **Bâtiments**                       | Construits et exacts                                                                                                                                                                                                                                                                                                                                                                                           |
| **Surface**                         | Habitations comprises                                                                                                                                                                                                                                                                                                                                                                                          |
| **Main-d'œuvre**                    | Par catégorie                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Construction**                    | Avec l'[[payback\|amortissement]], ou « jamais amorti » quand le bénéfice est de 0 ou moins                                                                                                                                                                                                            |

Chaque base compte son module central et un STO dans la surface. La construction compte les bâtiments, les habitations et le STO, mais pas le module central ni les matériaux supplémentaires de la planète (MCG, AEF, SEA, HSE, INS, TSH). Une base sans étapes ne compte rien.

Les bâtiments d'un même type partagent leur capacité entre les recettes, comme dans le jeu, donc 4,5 Food Processors donnent 5 bâtiments construits. Cela ne fonctionne qu'à l'intérieur d'une même base.

Par exemple, avec des chiffres inventés : une valeur produite de 10 000 ȼ par jour, 4 000 ȼ d'intrants achetés et 2 500 ȼ d'entretien, d'usure et de frais laissent un **Bénéfice / jour** de 3 500 ȼ, soit 35 % de la valeur produite. Avec 700 000 ȼ de construction, c'est amorti en 700 000 ÷ 3 500 = 200 jours. Un bénéfice inférieur à 0 s'affiche en rouge, et **Construction** indique alors « jamais amorti ».

### Comment les coûts sont calculés {#how-costs-are-calculated}

- **Usure** : le coût de construction du bâtiment ÷ 180 jours. Par exemple, un bâtiment qui coûte 90 000 ȼ à construire ajoute 500 ȼ d'usure par jour.
- **Coût par unité d'une étape produite** : la somme de ses intrants à leur coût dans la chaîne, de l'entretien et de l'usure du bâtiment pour un cycle, et des frais de production pour un cycle. Les intrants produits comptent à leur propre coût par unité, les intrants achetés au prix d'achat CX. Un cycle raccourcit quand l'efficacité augmente. Une recette à plusieurs produits répartit son coût selon la valeur de vente CX des produits, ou selon la quantité quand aucune n'a de prix.
- **Coût par unité d'une étape extraite** : l'entretien et l'usure de l'extracteur par jour ÷ les unités par jour, plus les frais.
- **Frais de production** : facturés par cycle sur la durée de base de la recette, donc l'efficacité ne les change pas. Une étape produite paie les frais de la planète de sa base, et chaque morceau d'une étape divisée paie ceux de la planète de sa propre base. Une étape extraite paie ceux de la planète de son site. La planète type et une base sans planète n'en paient pas, donc choisir des planètes peut augmenter les coûts.
- **Recette par défaut** : quand tu n'en choisis pas, la chaîne prend la recette à produit unique la moins chère aux prix CX. Elle n'utilise des recettes avec sous-produits que s'il n'existe aucune recette à produit unique.

## Étapes {#steps}

Chaque matériau apparaît une seule fois. Tu peux trier les lignes par **Chaîne**, où chaque objectif vient avec ses intrants (le chevron les replie), ou **Par source**, dans les groupes « Produits », « Extraits », « Achetés » et « De tes plans ».

| Colonne                          | Ce qu'elle montre                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Matériau**                     | Avec « objectif », « pour … » (ce qu'il alimente) ou « vendu »                                                                                                 |
| **Par jour**                     | La quantité, avec « + … issus de sous-produits » et « + … en propre »                                                                                                             |
| **Base**                         | La base qui le produit. Sert à déplacer une étape ou un morceau d'étape (voir [Bases](#bases))                                                 |
| **Source**                       | **Produire**, **Acheter**, **Extraire** (ressources planétaires uniquement) ou **Disponible**                                                                  |
| **Recette ou approvisionnement** | La recette, l'échange où il est acheté, ou la planète d'extraction                                                                                                                |
| **Bâtiments**                    | Le bâtiment et combien, et la part des bâtiments construits qu'il utilise                                                                                                         |
| **Coût / unité**                 | Son coût par unité dans la chaîne                                                                                                                                                 |
| **Prix CX**                      | Le prix CX                                                                                                                                                                        |
| **Produire ou acheter**          | Si produire fait économiser (« Produire, économise … » ou « Acheter coûte … de moins »), avec une pastille de marché pour les lignes achetées et les objectifs |

**Produire** est désactivé pour un matériau sans recette, et **Acheter** et **Disponible** sont désactivés pour les objectifs. Un bloc des sous-produits en bas indique d'où vient chaque sous-produit, combien la chaîne en utilise et combien elle en vend. **CSV** télécharge le tableau sous `production-chain.csv`.

- Clique sur un matériau pour voir ce qu'il **Consomme**, où il **Va vers**, son coût **Par unité** (intrants, entretien et usure, frais de production, coût dans la chaîne comparé au prix CX) et la capacité libre de ses bâtiments : « … en réserve jusqu'à + … / jour ».
- Clique sur une recette (« n recettes ▾ », affiché seulement quand il y en a plusieurs) pour comparer toutes les recettes de ce matériau. Celle utilisée vient en premier, puis les autres selon leur effet sur le bénéfice, chacune avec la variation de bénéfice par jour et de bâtiments. Des badges marquent celle **utilisée**, celle **par défaut** et celles **avec sous-produits**.
- Les lignes extraites utilisent une planète type : les 10 % meilleures de toutes les planètes qui ont la ressource, c'est-à-dire le 90e centile de l'extraction quotidienne, ou la meilleure planète quand moins de 10 planètes l'ont. C'est une valeur par défaut de planification, pas une vraie base, et elle ne paie pas de frais de production. Clique dessus pour choisir une vraie planète dans **Où extraire**. Tu peux filtrer par extracteur, surface, sauts jusqu'à un échange, **Sans matériaux supplémentaires**, **COGC Extraction de ressources** et **Marché local**, ou utiliser **Ouvrir dans la recherche de planètes**. Quand la base de l'étape a une planète avec la ressource, le rendement propre de cette planète l'emporte.

## Avertissements {#warnings}

Les pastilles au-dessus des étapes résument ce qu'il faut regarder. Clique sur l'une d'elles pour filtrer les étapes, et **Tout afficher** fait tout réapparaître.

- **Moins chers à acheter** liste les matériaux que la chaîne produit ou extrait pour plus cher que le prix CX. Les objectifs ne comptent jamais. **Acheter les …** les fait tous passer à l'achat, et la notification propose **Annuler**.
- **Marché étroit** liste les matériaux achetés dont la chaîne a besoin à hauteur de 10 % ou plus de ce que le CX échange par jour (la moyenne sur 30 jours), ou qui ne se sont pas échangés depuis 30 jours. Par exemple, si le CX a échangé 6 000 unités en 30 jours, cela fait 200 par jour, donc en acheter 30 par jour représente 15 %. Dans Étapes, la pastille de [[share-of-volume|part du volume]] passe à l'orange à partir de 10 % et au rouge à partir de 50 %. Les objectifs reçoivent la même pastille côté vente. En savoir plus : [[thin-market|marchés étroits]].
- **Étapes que leurs bases ne peuvent pas faire tourner** signale une ferme sur une planète sans fertilité, ou une extraction sur une planète sans la ressource. La pastille mène à Bases.
- **Boucle de recettes** signifie qu'une recette a besoin de son propre produit quelque part plus haut dans la chaîne. La chaîne s'arrête à la répétition.

Sans rien de moins cher à acheter, sans marché étroit ni avertissement de base, une pastille « Aucun avertissement » s'affiche à leur place.

## Graphe {#graph}

Le graphe montre la même chaîne. Les matières premières sont à gauche (« Achetés · extraits », plus « disponibles » avec la production propre) et les objectifs à droite. **Épaisseur des lignes** suit **t / jour** (par défaut), **ȼ / jour** ou **Égale**. Zoome avec −, **Ajuster** et +. Chaque nœud indique où il est acheté, ou quelle base et quel bâtiment le produisent. Clique sur un matériau pour ne voir que ce dont il a besoin et ce qu'il alimente, et sur **Tout afficher** pour revenir.

## Bases {#bases}

Une chaîne peut tourner sur jusqu'à 26 bases (de A à Z), chacune sur une planète. L'onglet Bases commence par trois étapes, et la prochaine à faire est le bouton principal.

### 1. Répartir en bases {#auto-layout}

**Répartition automatique** répartit la chaîne en bases que tu pourrais construire :

- Chaque base reçoit une [[expertise]] (le domaine de ses bâtiments de production, comme Agriculture ou Métallurgie), jusqu'à la taille fixée dans **Bases jusqu'à** : 500 de surface (par défaut), 750 ou 1 000. Quand une expertise a besoin de plus d'une base à cette taille, elle remplit plutôt des bases jusqu'à 1 000, pour que tu fasses tourner une base pleine plutôt que plusieurs identiques.
- La répartition automatique divise une étape qui ne rentre pas par bâtiments entiers. Autant qu'il en rentre vont dans la base en cours et le reste dans la suivante, donc 6 CHP peuvent devenir 4 + 2. Une étape peut s'étendre sur plus de deux bases. Les étapes d'extraction restent entières.
- Les petits groupes d'étapes (moins de 1,5 bâtiment, ou sans expertise) rejoignent la base avec laquelle ils échangent le plus de tonnes et qui a de la place pour eux. S'il n'y en a aucune, ils reçoivent une base mixte.
- La répartition automatique achète les étapes de moins de 0,2 bâtiment qui coûtent plus cher par unité avec un bâtiment entier que sur le CX. Tant qu'une telle étape est produite, elle affiche une étiquette **Acheter** dans Étapes. Tu peux les repasser en Produire, mais la prochaine répartition automatique ou le prochain ajustement les rachète.
- Chaque base reçoit une planète, comme décrit dans [Comment les planètes sont choisies](#planet-picking).
- Ensuite, elle fusionne les bases de même expertise quand la base fusionnée tient dans 1 000 de surface et ne perd ni ressource ni fertilité.

> [!warning]
> La répartition automatique repart de zéro. Elle construit de nouvelles bases à partir de rien, avec de nouveaux noms et de nouvelles planètes, le COGC réglé sur le programme en cours, et les produits de luxe et experts par défaut. Tous les noms, planètes, choix de COGC, produits de luxe et modifications d'experts que tu avais faits sont perdus.

### Comment les planètes sont choisies {#planet-picking}

La répartition automatique n'utilise qu'une planète qui :

- a une [[plots|parcelle]] libre, ou des parcelles que PRUNplanner n'a pas encore lues (une planète pleine avec des [[ghost-sites|sites fantômes]] n'est pas utilisée)
- n'a aucun de tes plans, dans un empire ou non
- peut faire tourner la base : chaque ressource extraite y est présente, les fermes peuvent tourner, et la base tient dans la taille.

Parmi celles-ci, les planètes où tourne un programme COGC qui aide les bâtiments de la base passent en premier. Ensuite, c'est la proximité qui compte : avec les autres bases, pondérée par les tonnes transportées, et avec les planètes de l'empire si tu en as choisi un sous Production propre. En cas d'égalité, la planète où la base a besoin du moins de surface l'emporte. La plus grande base est placée en premier. Si aucune planète ne peut faire tourner la base, elle prend quand même la première selon le COGC et la proximité, donc vérifie les avertissements de la carte de la base.

### 2. Ajuster le rythme à tes bases {#fit}

Règle **Nombre de bases** (2 par défaut, de 1 à 26) et appuie sur **Ajuster le rythme**. Il trouve le rythme le plus élevé, avec tous les objectifs mis à l'échelle de la même façon, que la répartition automatique fait tenir dans ce nombre de bases, puis répartit la chaîne. Il peut baisser les rythmes ou les augmenter (jusqu'à 4 096 fois), par pas de 0,01 par jour sur le plus grand objectif. Si même 0,01 par jour demande plus de bases, il te le dit.

Il vérifie le nombre avec la répartition avant le choix des planètes. Des planètes avec des taux d'extraction plus faibles ou une fertilité moindre peuvent alors demander un peu plus, donc relis le résultat.

> [!tip]
> Ajuster le rythme met chaque objectif à l'échelle par le même facteur, donc leur rapport reste le même. Si tu veux un autre mélange, change d'abord un objectif. Par exemple, DW à 20 et RAT à 10 par jour deviennent 10 et 5 quand l'ajustement divise le rythme par deux.

### 3. Créer les plans {#create-the-plans}

Dès que chaque base a une planète et tient dans 1 000 de surface, la troisième étape l'indique et propose « Créer … plans… ». Sinon, elle t'indique combien de bases n'ont pas de planète ou dépassent 1 000 de surface. Détails dans [Créer les plans](#create-plans).

### Vue d'ensemble et cartes de base {#base-cards}

Sous les étapes, une vue d'ensemble montre **Bases** (combien ont une planète), **Plus grande base**, **Permis** (avec la surface de toutes les bases) et **Transport t / jour** (avec les routes). Elle a aussi une ligne par base avec son expertise et sa planète. **Ajouter une base** ajoute une base.

Sur chaque carte de base, tu peux :

- nommer la base et choisir sa planète (« Choisir une planète », ou « changer »)
- choisir son programme COGC : « Actif : … » (par défaut), **Aucun programme**, ou un autre programme pour anticiper un vote. Les programmes qui aident la base passent en premier, avec leur bonus, et affichent « inactif » quand la planète ne les fait pas tourner
- régler ses **Produits de luxe** : Les deux (100 % d'efficacité de la main-d'œuvre, par défaut), Luxe 2 (92 %), Luxe 1 (87 %) ou Essentiels (79 %). L'entretien les paie
- **Modifier** ses **Experts**, ou revenir à **Auto**. Auto choisit la répartition qui rapporte le plus pour la production de la base : en général 5 dans son expertise principale et le sixième dans la suivante, avec au plus 5 d'un même type et 6 par base
- **Fusionner dans…** une autre base, qui garde sa planète
- **Séparer** la base par expertise, ou en deux pour une seule expertise, avec des planètes pour les nouvelles bases
- la supprimer avec ×, ce qui déplace ses étapes vers la première base.

Les bâtiments d'une base reçoivent les bonus de la planète comme dans un plan : +25 % d'un programme publicitaire pour leur expertise, +10 % d'un programme de main-d'œuvre pour une catégorie qu'ils emploient, et la fertilité pour les fermes. FRM et ORC ne peuvent pas tourner sans fertilité. Les étapes extraites utilisent le rendement propre de la planète. Une planète sans la ressource garde le rendement de la chaîne et affiche un avertissement, tout comme une base qui dépasse 1 000 de surface.

La carte montre ses bâtiments, sa surface (module central, un STO et habitations), ses [[area-permits|permis]], sa main-d'œuvre, et son entretien avec l'usure par jour.

La colonne **Base** dans Étapes déplace une étape, ou un morceau d'étape divisée, vers une autre base. « + nouvelle base » en crée une nouvelle.

Le sélecteur de planète d'une base calcule les étapes de la base sur chaque planète, pour que tu puisses comparer les bâtiments et la surface. Il marque les planètes où tu as déjà un plan (« ton plan »). **Uniquement les planètes qui** filtre les planètes qui ont les ressources et permettent l'agriculture (activé par défaut), font tourner un programme COGC pour la base, sont fertiles, ou ont l'un de tes plans. Tu peux aussi filtrer par matériaux supplémentaires, marché local, sauts et nom. Il affiche les parcelles de chaque planète mais ne filtre pas sur elles.

**Transport par jour** liste ce qui circule entre les bases et le CX, en tonnes et en m³, avec les [[jumps|sauts]]. C'est ce que tu confies à ta logistique.

## Créer les plans {#create-plans}

**Créer les plans** crée un plan par base qui a des étapes, avec ses bâtiments, ses recettes, ses habitations, un STO, le programme COGC et les permis. Chaque plan reçoit les produits de luxe et les experts de sa base, donc il produit ce que la chaîne montre. Les bonus de QG et de faction sont laissés aux plans.

- Le nom de chaque plan commence par les objectifs suivis du nom de la base, et tu peux le changer.
- Choisis **Nouvel empire** (par défaut, nommé « Chaîne … » d'après les objectifs, avec une **Faction**), **Ajouter à** un empire existant, ou **Aucun empire**. Un nouvel empire est créé en premier, avec ses permis réglés d'après les plans.
- La boîte de dialogue t'indique ce qui bloque : aucune base avec des étapes, une base sans planète ou au-delà de 1 000 de surface, un nom manquant, ou aucun empire choisi.
- Une ferme sur une planète sans fertilité est laissée hors de son plan, et une extraction sans sa ressource reçoit l'extracteur sans recette. La boîte de dialogue le signale.
- Avec la production propre, les matériaux que tes bases fournissent ne figurent pas dans les nouveaux plans.

La page reste sur la chaîne et affiche les liens vers les nouveaux plans et l'empire. Ces liens restent dans l'onglet Bases jusqu'à ce que la chaîne change. Si un plan échoue, les plans créés avant lui sont conservés et listés.

## Liste d'achats {#buy-list}

La liste d'achats montre ce que la chaîne achète sur un nombre de jours (10 par défaut), regroupé par base quand il y en a plusieurs. Chaque ligne a les unités (arrondies au supérieur), le poids et le coût. Par exemple, sur une chaîne à une base, un matériau acheté à 2,5 par jour donne 25 unités sur 10 jours, et à 2,55 par jour, 26. La liste montre aussi les totaux, les m³ à acheminer, et les tonnes et m³ des objectifs qui repartent.

**Copier l'action d'achat XIT** (ou « Copier l'action XIT pour … » par base) copie une action [[xit|XIT]] qui achète la liste à l'entrepôt de l'échange sur lequel la plupart de ses lignes sont valorisées. Quand la base a une planète, l'action y déplace aussi les marchandises.

La liste ne contient que les intrants des recettes de la chaîne. Les consommables de la main-d'œuvre n'y figurent pas, donc prévois-les dans les plans que la chaîne crée.

## Partage {#sharing}

Le lien contient toute la chaîne : objectifs, réglages, sources, recettes, planètes, bases, quantités Disponible et le CX. **Copier le lien de la chaîne** le copie. Quand tu ouvres la page sans lien, la dernière chaîne sur laquelle tu as travaillé s'ouvre à nouveau, dans ce navigateur et par compte.

## Vérifier un empire {#check-an-empire}

Passe de **Planifier une chaîne** à **Vérifier un empire** en haut pour voir comment l'un de tes empires fabrique ce qu'il vend, et ce qui l'améliorerait. Chaque mode garde son propre état quand tu passes de l'un à l'autre.

1. Choisis l'**Empire**. Il démarre sur ton empire par défaut.
2. Choisis les chaînes. Chaque matériau que l'empire vend (qu'il produit en plus grande quantité qu'il n'en utilise, avec un prix de vente CX) est une chaîne, affichée avec sa quantité par jour. « + Ajouter une chaîne » en ajoute une, et « Tout ce que l'empire vend » ou **Vérifier tout ce que l'empire vend** les ajoute toutes. **Effacer** les retire.

Si tu n'as pas encore d'empire, la page te le dit et te renvoie vers Planifier une chaîne ou vers la gestion.

La vérification suit chaque chaîne à travers tes plans : quelle base fait chaque étape, avec quelle recette et quelle efficacité, et ce qui est acheté. Elle ne modifie jamais un plan, elle se contente de les pointer.

| Réglage                              | Par défaut                          |
| ------------------------------------ | ----------------------------------- |
| **Prix**                             | la préférence d'échange de l'empire |
| **Gains de configuration**           | **Afficher**                        |
| **Ignorer en dessous de**            | 200 ȼ / jour                        |
| **Déplacements amortis en moins de** | 100 jours                           |

La bande du haut montre le **Bénéfice / jour** de l'empire tel que planifié, le **Gain possible / jour**, les **Bases vérifiées**, combien **Semblent optimales**, les **Améliorations**, les **Corrections de plan**, les **Gains de configuration / jour** et les **Déplacements**. Les gains sont mesurés par rapport au défaut de la chaîne : les deux produits de luxe, les experts qui rapportent le plus et le COGC en cours sur la planète, à tes prix CX, avec les intrants produits au coût propre de l'empire.

### Bases {#check-an-empire-bases}

Chaque base reçoit une marque : **Semble optimale**, a des améliorations, **Correction de plan**, ou **Hors de ces chaînes**. Ouvre une base pour voir sa **Production telle que planifiée**, ses produits de luxe, experts et COGC sous **Plan** comparés au **Défaut de la chaîne**, et ses **Constats**. **Couverture** sur le côté montre combien de bases les chaînes atteignent, et « Ajouter … » ajoute ce que les autres bases vendent.

### Constats {#findings}

Chaque constat montre son gain par jour, sa construction et son amortissement. Tu peux les filtrer par type :

- **Correction de plan** : le plan compte un programme COGC que la planète ne fait pas tourner, ou la planète en fait tourner un que le plan ne compte pas. Avec un programme publicitaire (d'expertise), les bâtiments produisent 20 % de moins que ce que dit le plan, ou produiraient 25 % de plus. Avec un programme de main-d'œuvre, c'est 9 % de moins ou 10 % de plus.
- **Recette** : une autre recette du même bâtiment fabrique le matériau au moins 3 % moins cher.
- **Produire ou acheter** : un matériau qui n'est pas un objectif coûte plus cher à produire qu'à acheter.
- **Emplacement** : une autre planète convient au moins 10 % mieux à l'étape grâce à son programme COGC, sa fertilité ou son taux d'extraction, comparé au programme que la planète fait réellement tourner. L'option est soit l'une de tes bases (seuls les bâtiments déplacés sont à construire, et il faut de la surface libre), soit une nouvelle base (bâtiments, habitations et module central). PRUNplanner suggère la meilleure option qui a de la place, une parcelle libre (ou des sites fantômes ; les parcelles inconnues comptent comme possibles) et qui est amortie en moins de **Déplacements amortis en moins de**. « Toutes les … planètes… » liste chaque option avec des filtres et un tri. **Utiliser** fait d'une planète ton choix, et **Revenir à la suggestion** l'annule.
- **Configuration** : les deux produits de luxe (seulement quand la production en plus rapporte plus qu'ils ne coûtent), ou une meilleure répartition des experts. Dans le jeu, les experts arrivent avec le temps. Règle **Gains de configuration** sur **Masquer** pour les exclure.

La vérification masque les constats en dessous de **Ignorer en dessous de**, mais les corrections de plan et les emplacements que tu as choisis s'affichent toujours. Les gains sur une même étape sont des alternatives, donc le gain possible d'une base ne compte que le meilleur par étape. Par exemple, un constat Recette qui vaut 300 ȼ / jour et un constat Emplacement qui vaut 500 ȼ / jour sur la même étape comptent pour 500 ȼ / jour, pas 800. **Essayer dans le planificateur** (sur les constats Recette, Produire ou acheter et Emplacement) ouvre Planifier une chaîne avec les bases de la chaîne et le changement appliqué.

> [!tip]
> Règle d'abord les corrections de plan. Elles ne coûtent rien à construire, et les chiffres du plan sont faux tant que tu ne les as pas faites.

> [!warning]
> Un constat Emplacement compte une planète pleine avec des sites fantômes comme possible pour une nouvelle base. Dans le jeu, les sites fantômes ne permettent de s'installer qu'aux nouveaux joueurs qui démarrent sur cette planète.

### Chaînes {#chains}

Chaque chaîne est listée matériau par matériau : combien est produit (**Produit / jour**), où (**Produit dans**), avec quelle recette (**Recette planifiée**), à quel coût comparé au prix CX, et ce que ferait le planificateur de chaîne (**Planificateur de chaîne**).

### Partage {#check-an-empire-sharing}

**Copier le lien de la vérification** copie l'empire, les chaînes, les réglages et les emplacements que tu as choisis, mais pas les prix. Quiconque l'ouvre voit la préférence d'échange propre à l'empire. Toi seul peux ouvrir tes propres empires. Pour toute autre personne, la page indique que l'empire n'est pas le sien.
