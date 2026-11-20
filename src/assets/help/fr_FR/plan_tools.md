Les outils de la page du plan transforment un [[plan|plan]] en listes d'achats et en calendriers de vols, et te permettent d'examiner ses chiffres de plus près. Dans la disposition Standard, ce sont des onglets à côté de **Production** : **Construction**, **Approvisionnement**, **Visites**, **Réparation**, **Bénéfice**, **Contrôle du plan** et **POPR**. La boîte de dialogue [[cogm|COGM]] s'ouvre depuis chaque recette, et le panneau de débogage du calcul sert aux rapports de bug. Le [Contrôle du plan](/help/plan_check) a son propre article, et cette page couvre le reste.

Chaque outil répond à une question sur la base : quoi acheter pour la construire (Construction), quoi apporter pour la faire tourner (Approvisionnement), à quelle fréquence un vaisseau doit passer (Visites), quand réparer (Réparation), d'où vient le bénéfice (Bénéfice) et si la planète a les travailleurs nécessaires (POPR).

Un outil se charge la première fois que tu ouvres son onglet. Les outils travaillent sur le plan tel que tu le vois, modifications non enregistrées comprises, et calculent le prix des matériaux avec la [[exchange-preference|préférence d'échange]] du plan. Tu peux déplacer ou scinder les onglets comme n'importe quelle autre partie de la page ([Disposition](/help/plan_layout)). Les tuiles de résultats ouvrent l'outil qui se trouve derrière : **Bénéfice / jour** ouvre Bénéfice, **Amortissement** ouvre Construction et **Stockage** ouvre Visites.

## Construction {#construction}

**Panier de construction** calcule ce qu'il te reste à acheter avant de pouvoir construire la base. C'est ton [[construction-cart|panier de construction]] : les bâtiments encore à construire et les matériaux dont ils ont besoin, une fois déduit ce que tu as déjà en stock.

### Bâtiments {#construction-buildings}

Le tableau **Bâtiments** a une ligne par type de bâtiment du plan, habitations, stockage et [[core-module|module central]] compris.

| Colonne                  | Ce qu'elle affiche                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Construits**           | Combien tu en as déjà sur la planète. Avec [[fio\|FIO]] connecté, la valeur part du nombre indiqué par FIO pour la planète du plan, et tu peux saisir ton propre nombre. |
| **Quantité**             | Combien il en reste à construire : **Planifiés** − **Construits**, jamais en dessous de 0. Tu peux saisir un autre nombre.                                               |
| **Planifiés**            | Combien le plan en contient. Le module central compte toujours pour 1.                                                                                                   |
| une colonne par matériau | Les matériaux de construction pour la **Quantité** de cette ligne. **Total des matériaux** les additionne.                                                               |

- Un nombre que tu saisis dans **Construits** affiche un crayon (« **Saisi par toi, pas issu de FIO** ») et un bouton de réinitialisation. **Réinitialiser les construits** les efface tous et revient aux nombres de FIO.
- PRUNplanner enregistre les nombres de bâtiments construits saisis par plan, avec tes préférences, pour les plans qui t'appartiennent et que tu as enregistrés. Sur un nouveau plan, un plan partagé ou une ancienne version que tu consultes, ils ne durent que tant que tu restes sur la page, et l'outil indique « **Les nombres de bâtiments construits ne sont pas enregistrés pour ce plan.** »
- Un nombre de **Construits** supérieur à **Planifiés** passe en orange. Sa **Quantité** est alors 0, donc cette ligne n'a besoin d'aucun matériau.
- Les valeurs de **Quantité** saisies ne sont pas enregistrées. Modifier **Construits** pour une ligne remet sa **Quantité** à **Planifiés** − **Construits**.
- Quand les bâtiments (construits plus encore à construire) ont besoin de plus de travailleurs d'un niveau que leurs habitations n'en logent, un avertissement apparaît à côté de **Quantité** : « **Une habitation insuffisante réduira l'efficacité de production.** » Les champs **Quantité** des habitations qui logent le niveau en manque passent en rouge. Cela veut dire que la base aurait moins de lits que de travailleurs pour ce niveau. Ajouter assez d'habitations pour ce niveau dans les **Infrastructures** du plan fait disparaître l'avertissement (voir [Configuration de la base](/help/plan_base#infrastructure)).
- Avec FIO, une icône d'avertissement à côté du titre liste les bâtiments que FIO trouve sur la planète et qui ne sont pas dans le plan. Démolis-les dans le jeu, sinon la surface, les logements et les matériaux de la base ne correspondront pas au plan.

Sous le tableau, **Coût total**, **Poids total** et **Volume total** couvrent tout ce qui figure dans la colonne **Quantité**, avant stock, aux prix d'achat du plan.

### Matériaux à acheter {#construction-materials}

**Matériaux à acheter** additionne les matériaux de tous les bâtiments et retire ce que tu possèdes :

| Colonne            | Ce qu'elle affiche                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Matériau**       | Le matériau de construction.                                                                           |
| **Quantité**       | Ce dont ont besoin tous les bâtiments de la colonne **Quantité**.                                      |
| **Stock**          | Ce que contient le stockage FIO choisi sous **Stockage**. Uniquement avec FIO.                         |
| **Stock remplacé** | Un nombre que tu saisis à la place de **Stock**, pour du stock que FIO ne connaît pas. Non enregistré. |
| **Besoin**         | **Quantité** − stock (ou ta valeur de remplacement), jamais en dessous de 0.                           |

**Stockage** propose chaque stockage FIO (les bases de tes planètes, tes entrepôts et tes vaisseaux) ou aucun. Il part de la base sur la planète du plan. Les totaux sous le tableau couvrent **Besoin**.

Il y a deux boutons XIT. Celui en haut de l'outil expédie tout ce qui figure dans **Total des matériaux** et ignore le stock. Celui à côté de **Stockage** n'expédie que le **Besoin**. Plus de détails dans [Actions XIT](#xit).

> [!tip]
> Tu agrandis une base que tu as déjà ? Avec FIO, **Construits** part de ce qui est déjà construit sur la planète, donc **Quantité** et **Besoin** ne couvrent que les nouveaux bâtiments. L'avertissement sur les habitations compte toujours les anciens et les nouveaux ensemble.

## Approvisionnement {#supply}

**Panier d'approvisionnement** liste les consommables de la [[workforce|main-d'œuvre]] et les intrants de production dont la base en activité a besoin pour un nombre de jours donné, moins ce qui est en stock. C'est ton [[supply-cart|panier d'approvisionnement]].

### Paramètres {#supply-settings}

| Paramètre                  | Par défaut                     | Ce qu'il fait                                                                                                                                        |
| -------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quels matériaux            | **Toute la base**              | **Toute la base**, **Production** ou **Main-d'œuvre** : quels matériaux sont listés.                                                                 |
| **Durée du stock (jours)** | 20                             | Combien de jours dure l'approvisionnement. Les décimales fonctionnent. C'est une seule valeur pour tous les plans, enregistrée avec tes préférences. |
| **Stockage**               | la base sur la planète du plan | Le stockage FIO dont le stock est déduit. Uniquement avec FIO.                                                                                       |

Le sélecteur **Toute la base**, **Production** ou **Main-d'œuvre** choisit quels matériaux sont listés. Un matériau apparaît sous **Main-d'œuvre** quand la main-d'œuvre l'utilise, et sous **Production** quand une recette l'utilise ou le fabrique. Les quantités restent le besoin net de toute la base.

### Colonnes et totaux {#supply-columns}

Le Panier d'approvisionnement ne liste que les matériaux que la base achète, c'est-à-dire ceux qu'elle consomme plus qu'elle n'en fabrique.

| Colonne                          | Formule                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| **Ticker**                       | Le matériau.                                                                        |
| **Besoin quotidien**             | Ce que la base consomme moins ce qu'elle fabrique, par jour.                        |
| **Coût quotidien**               | Le **Besoin quotidien** au prix d'achat du plan, en ȼ / jour.                       |
| **Stock**                        | Ce que contient le stockage choisi. Uniquement avec FIO.                            |
| **Besoin complet**               | **Besoin quotidien** × jours, arrondi au supérieur.                                 |
| **Besoin final**                 | **Besoin complet** − **Stock**, jamais en dessous de 0.                             |
| t, m³                            | Poids et volume du **Besoin final**.                                                |
| **Main-d'œuvre**, **Production** | Si la main-d'œuvre utilise le matériau, ou si une recette l'utilise ou le fabrique. |

Par exemple (chiffres inventés), une base à qui il manque 4,33 DW par jour, réglée sur 20 jours, obtient un **Besoin complet** de 4,33 × 20 = 86,6, arrondi à 87. Avec 30 en stock, le **Besoin final** est de 87 − 30 = 57.

Sous le tableau, tu trouves **Coût quotidien**, **Coût total** (le **Besoin final** au prix d'achat du plan), **Poids total** et **Volume total**. « Plus d'options dans Consommation FIO » ouvre [Consommation FIO](/fio/burn) ([aide](/help/fio_burn)), qui planifie l'approvisionnement de toutes les bases d'un empire à la fois.

### XIT et XIT initial {#supply-xit}

- Le bouton XIT expédie le **Besoin final** des matériaux listés : ce dont la base en activité a encore besoin une fois qu'une partie est couverte par sa propre production.
- **XIT initial** (son tiroir s'intitule **Panier d'approvisionnement (initial)**) sert au premier approvisionnement, quand rien n'est encore produit. Il expédie l'intrant complet de chaque matériau × jours, arrondi au supérieur, moins le stock, y compris les matériaux que le plan fabrique lui-même. Il suit le choix **Toute la base**, **Production** ou **Main-d'œuvre**, et expédie donc les intrants propres de la main-d'œuvre, ceux de la production, ou les deux.

> [!tip]
> Tu lances une nouvelle base ? Utilise **XIT initial** pour le premier vol. Le XIT simple déduit ce que la base fabrique, donc une base qui fabrique ses propres DW ou RAT arriverait sans aucun.

## Actions XIT {#xit}

Les boutons XIT de Construction, Approvisionnement et Réparation ouvrent un tiroir avec un paquet [[xit|XIT]] pour [Refined PrUn](https://github.com/refined-prun/refined-prun), l'extension de navigateur pour le jeu. Refined PrUn l'exécute avec sa commande XIT ACT, donc tu n'as pas à recopier les quantités à la main. PRUNplanner ne fait que construire le paquet : rien ne se passe dans le jeu tant que tu ne l'y as pas exécuté.

| Champ                 | Par défaut                   | Ce qu'il fait                                                                                                                                                                                            |
| --------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origine**           | **Configurer à l'exécution** | D'où viennent les matériaux : l'un des six entrepôts de station (Antares, Arclight, Benten, Hortus, Hubur, Moria), ou choisi au moment où tu exécutes le paquet.                                         |
| **Acheter sur le CX** | activé                       | Ajoute une étape qui achète les matériaux sur l'échange de cette station avant le transfert. « **Seule l'origine entrepôt permet l'achat.** » Avec **Configurer à l'exécution**, la case est désactivée. |
| **JSON**              |                              | Le paquet. **Copier** le place dans le presse-papiers.                                                                                                                                                   |

Sous les champs, un tableau liste chaque matériau et sa quantité, en omettant les matériaux dont la quantité est 0. Le paquet s'appelle « PRUNplanner » suivi de l'outil (par exemple « PRUNplanner Supply Cart »), et tu choisis toujours sa destination au moment de l'exécuter. **Origine** et **Acheter sur le CX** sont enregistrés avec tes préférences et partagés par tous les boutons XIT, y compris Consommation FIO et Réparer FIO.

## Visites {#visits}

**Fréquence de visite** t'indique quand le stockage de la base est plein et à quelle fréquence un vaisseau doit passer. Les chiffres de [[visitation|fréquence de visite]] comptent les matériaux que la base vend (exportation) et achète (importation), par jour.

### Stockage {#visits-storage}

La phrase en haut donne la capacité de la base : ses propres 1 500 t et 1 500 m³ plus les bâtiments de [[storage|stockage]] du plan.

| Bâtiment | t      | m³     |
| -------- | ------ | ------ |
| STO      | 5 000  | 5 000  |
| STA      | 2 500  | 2 500  |
| STE      | 10 000 | 10 000 |
| STV      | 2 500  | 7 500  |
| STW      | 7 500  | 2 500  |

Le tableau affiche, en t et m³ par jour :

- **Importation** : ce que la base achète, c'est-à-dire les matériaux qu'elle consomme plus qu'elle n'en fabrique.
- **Exportation** : ce qu'elle fabrique en plus de ce qu'elle consomme.
- **Plus gros trajet** : le plus grand des deux, c'est-à-dire ce qu'un vaisseau transporte sur son trajet le plus chargé. Le poids et le volume sont comparés séparément.
- **Stockage rempli** : capacité ÷ **Plus gros trajet**, en jours, pour celui du poids ou du volume qui s'épuise en premier.

La liste d'exclusion retire des matériaux de cet outil, pour ceux que tu vends ou achètes sur la planète elle-même (marché local, contrats). Cherche des tickers et sélectionne-les. La liste est enregistrée par plan avec tes préférences. Sur un plan nouveau ou partagé, elle dure le temps de ta visite.

> [!warning]
> La tuile de résultats **Stockage** compte tous les matériaux et ignore tes matériaux exclus. Dès que tu définis des exclusions, ses jours et le **Stockage rempli** d'ici diffèrent.

### Transport {#visits-shipping}

Il y a une ligne par taille de vaisseau : 500 t / 500 m³, 1 000 t / 1 000 m³, 2 000 t / 2 000 m³, 1 000 t / 3 000 m³, 3 000 t / 1 000 m³ et 5 000 t / 5 000 m³ (**Navire t**, **Navire m³**). Les exportations et les importations ont chacune :

- **Visite (jours)** : combien de jours d'exportations (ou d'importations) remplissent ce vaisseau. C'est le plus petit de t du vaisseau ÷ t par jour et m³ du vaisseau ÷ m³ par jour.
- **Limite** : lequel s'épuise en premier, t ou m³.

Par exemple (chiffres inventés), des exportations de 100 t et 50 m³ par jour remplissent le vaisseau de 1 000 t / 1 000 m³ en 1 000 ÷ 100 = 10 jours en poids et 1 000 ÷ 50 = 20 jours en volume. Sa **Visite (jours)** est de 10 et sa **Limite** est t.

> [!tip]
> Un vaisseau devrait passer au moins aussi souvent que le plus petit de **Stockage rempli** et des deux **Visite (jours)** du vaisseau. Si tu attends plus longtemps, le stockage déborde, les exportations ne tiennent plus en un seul chargement ou les importations s'épuisent. Les tailles de [[cargo-bays|soute]] dans le jeu te disent quelle ligne est la tienne.

## Réparation {#repair}

**Analyse des réparations** trouve le meilleur intervalle de [[repair|réparation]] pour chaque type de bâtiment de production, c'est-à-dire combien de jours attendre entre deux réparations pour que la base fasse le plus de bénéfice. Il exclut les habitations, le stockage et le module central.

### Comment c'est calculé {#repair-calculation}

Les bâtiments s'usent. Leur condition, et avec elle leur production, tombe de 100 % à 33 % avec le temps : lentement au début, plus vite autour du jour 100, puis en se stabilisant. Une réparation la restaure, mais la facture augmente plus tu attends. Au jour _n_, chaque matériau de construction coûte sa quantité moins ⌊quantité × (180 − _n_) ÷ 180⌋, donc la facture augmente jusqu'au jour 180, où elle égale les matériaux d'un bâtiment neuf.

Par exemple, un matériau d'une quantité de 10 coûte 10 − ⌊10 × 135 ÷ 180⌋ = 10 − 7 = 3 au jour 45, et 10 − ⌊10 × 90 ÷ 180⌋ = 10 − 5 = 5 au jour 90. Réparer souvent maintient une production élevée mais coûte une facture à chaque fois, et attendre rend chaque facture plus lourde pendant que la production baisse. L'outil met les deux en balance.

Pour chaque intervalle de 1 à 180 jours, PRUNplanner calcule par bâtiment et par jour :

1. _Production_ : la valeur de production du bâtiment en condition parfaite (valeur produite moins intrants et [[production-fees|frais de production]], d'après le plan) × sa condition moyenne sur l'intervalle.
2. moins son coût de main-d'œuvre par jour.
3. moins la facture de réparation de cet intervalle répartie sur les jours de l'intervalle (facture ÷ (_n_ + 1)).

L'intervalle au bénéfice le plus élevé est le meilleur. La _bonne plage_ est la suite de jours autour de lui dont le bénéfice reste à 1 % ou moins du meilleur. PRUNplanner évalue les matériaux de réparation aux prix d'achat du plan.

Les chiffres propres au plan ([Résultats](/help/plan_results)) comptent plutôt la [[degradation|dégradation]] comme 1/180 du coût de construction par jour. « **Bénéfice avec ces réparations** » compte le vrai coût de réparation à chaque intervalle.

### Ce qu'il affiche {#repair-view}

- En haut, tu vois « **Bénéfice avec ces réparations** » pour tout le plan en ȼ / jour, avec « **tout au mieux** » ou l'écart par rapport à tout au mieux. À côté se trouvent **Coût de réparation** en ȼ / jour (ou **Prochaine réparation due** avec FIO, voir plus bas) et « **Une réparation de chaque bâtiment** » en ȼ, t et m³.
- **Bâtiments** liste chaque type, la réparation la plus chère en premier : **Meilleur (bon)** (le meilleur intervalle et sa bonne plage), **Intervalle (j)** (le tien, qui part du meilleur), **ȼ/jour** à cet intervalle, et **Bonne plage** (ou **Prochaine échéance** avec FIO).
- Clique sur un bâtiment pour ouvrir son détail. Il affiche le bénéfice à ton intervalle et sa comparaison avec le meilleur, la **Facture de réparation**, la **Condition à la réparation** et la production moyenne. **Réparer tous les** a un champ, un curseur (1–180 jours) et des choix rapides (**Meilleur · {n} j**, 30, 60 et 90 jours). Le détail liste aussi les matériaux d'une réparation de tous les bâtiments de ce type.
- Dans les graphiques, **Bénéfice par jour, selon l'intervalle de réparation** marque la bonne plage, et dans **Pourquoi {best} jours : coût de réparation contre production perdue**, le total le plus bas est le meilleur intervalle. Il y a aussi **Condition du bâtiment**.

Les intervalles que tu définis ne sont pas enregistrés. **Tout remettre au meilleur** revient aux meilleurs intervalles.

### Avec FIO {#repair-fio}

Avec FIO connecté, le détail liste tes bâtiments de ce type sur la planète du plan (« **Ton {ticker} sur {planet} (FIO)** »). Chacun affiche les jours depuis sa dernière réparation, sa condition et une étiquette d'échéance à ton intervalle : **En retard de {n} j**, **Dû aujourd'hui**, **Dû dans {n} j** (sous 7 jours, en orange) ou **Dans {n} j**. Un bâtiment que FIO signale comme jamais réparé affiche « **jamais réparé** » et n'a pas d'étiquette d'échéance. Le haut affiche **Prochaine réparation due** à la place de **Coût de réparation**, plus « **Dernière mise à jour FIO : {when}** », avec une note quand elle date de plus d'un jour.

**XIT pour ceux à réparer** expédie les matériaux de réparation, tels que FIO les indique, pour chaque bâtiment en retard ou à réparer sous 7 jours ([Actions XIT](#xit)). Sans FIO, une note renvoie vers « **Configure FIO dans ton profil** ». Sur un plan partagé, la partie FIO est masquée, car les données FIO seraient les tiennes, pas celles du propriétaire.

> [!tip]
> [Réparer FIO](/help/fio_repair) utilise le meilleur intervalle de chaque type de bâtiment issu de cet outil pour les plans qu'il associe à tes bases. Prépare le plan ici, puis planifie les vols de réparation là-bas.

## Bénéfice {#profit}

**Répartition des bénéfices** montre où va la valeur produite chaque jour, en ȼ / jour selon la préférence d'échange du plan. Elle n'ajoute rien de nouveau : ses étapes aboutissent au [[profit|bénéfice]] par jour du plan.

Un sélecteur choisit **Par type de coût** (par défaut) ou **Par bâtiment**. PRUNplanner garde ton choix jusqu'à ce que tu recharges la page.

### Par type de coût {#profit-cost-type}

Une cascade, à lire de gauche à droite :

| Étape                      | Ce que c'est                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Valeur produite**        | Ce que la base fabrique en plus de ce qu'elle consomme, aux prix de vente du plan.                                                                                                              |
| **Intrants de production** | Ce que la base achète pour ses recettes, aux prix d'achat du plan.                                                                                                                              |
| **Main-d'œuvre**           | Ce que la base achète pour sa main-d'œuvre. Un matériau utilisé par les deux va à **Main-d'œuvre** à hauteur de ce que consomment les travailleurs, et le reste aux **Intrants de production**. |
| **Dégradation**            | L'usure des bâtiments de production : leur coût de construction ÷ 180 par jour.                                                                                                                 |
| **Frais de production**    | Les frais de la planète pour l'expertise des bâtiments. Présent uniquement quand la planète en facture.                                                                                         |
| **Bénéfice quotidien**     | Ce qui reste : le bénéfice par jour du plan.                                                                                                                                                    |

PRUNplanner fait le solde des matériaux sur toute la base, donc un matériau que la base fabrique et consomme ne compte que pour son excédent ou son manque. Les étapes de production, d'intrants, de main-d'œuvre et de frais affichent leurs trois plus gros matériaux (bâtiments, pour les frais) et « +{n} de plus ». Survole une partie pour voir **Produit / jour** ou **Consommé / jour**, **Prix**, **ȼ / jour** et **Part de la production**.

Les frais de production sont les frais de la planète pour l'expertise du bâtiment, moyennés sur les travailleurs du bâtiment selon leur nombre. Ils sont facturés par jour à 100 % et évoluent avec l'[[efficiency|efficacité]] du bâtiment, comme sa production.

### Par bâtiment {#profit-building}

Chaque type de bâtiment a une étape : sa production moins ses propres intrants et sa main-d'œuvre, évalués séparément, avant dégradation et frais. Les sept plus gros s'affichent, et le reste est additionné sous « {n} bâtiments de plus ». **Non attribué** contient ce qu'on ne peut pas imputer à un seul bâtiment : la main-d'œuvre de tout le plan et les matériaux échangés entre bâtiments. Viennent ensuite **Dégradation**, **Frais de production** et **Bénéfice quotidien**, comme ci-dessus.

### Chiffres clés {#profit-key-figures}

- **Valeur produite**, **Coûts, dégradation et frais inclus** (intrants de production + main-d'œuvre + dégradation + frais de production) et **Marge** (bénéfice quotidien ÷ valeur produite). Par exemple, 10 000 ȼ de valeur produite et 2 500 ȼ de bénéfice quotidien donnent une marge de 25 %. La marge est en rouge quand le plan perd de l'argent.
- Le matériau qui apporte la plus grande part de la valeur produite. C'est son prix qui décide du plan.
- Le plus gros coût unique parmi les intrants de production et la main-d'œuvre, en part de la valeur produite.
- La part des consommables de la main-d'œuvre dans la valeur produite, avec les deux plus gros.

> [!tip]
> Quand un seul produit porte l'essentiel de la valeur, vérifie la profondeur de son marché dans le [Contrôle du plan](/help/plan_check#market-check) avant de construire.

## POPR {#popr}

**Dernier rapport de population** place la main-d'œuvre de la planète issue du dernier [[popr|rapport de population]] du jeu à côté de ce dont le plan a besoin. Le jeu publie ce rapport chaque semaine. Tu ne vois l'onglet que si tu es connecté.

Le graphique « **Travailleurs libres à côté des besoins de ce plan** » a une ligne par niveau. La barre représente les travailleurs libres moins les postes que d'autres bases ont déjà ouverts, jamais en dessous de 0. La ligne représente ce dont le plan a besoin. Une barre est verte quand elle couvre le besoin, rouge quand elle ne le couvre pas, et grise quand le plan n'a besoin d'aucun travailleur de ce niveau.

Par exemple (chiffres inventés), avec 500 pionniers libres et 200 postes de pionniers non pourvus, la barre affiche 300. Un plan qui a besoin de 250 pionniers obtient une barre verte et un ✓ dans « Contrôle du plan », et un plan qui en a besoin de 400 obtient une barre rouge et un ✗.

Le tableau a une colonne par niveau (des Pionniers aux Scientifiques) :

| Ligne                       | Ce qu'elle affiche                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Population totale**       | La valeur _next population_ de FIO pour le niveau.                                                                        |
| **Population disponible**   | Les travailleurs sans emploi.                                                                                             |
| **% Population disponible** | Le taux de chômage × 100 (affiché sans signe %).                                                                          |
| **Emplois non pourvus**     | Les postes que d'autres bases ont ouverts.                                                                                |
| « Besoin du plan »          | Les travailleurs dont ce plan a besoin.                                                                                   |
| « Contrôle du plan »        | ✓ quand le plan n'en a besoin d'aucun, ou quand les travailleurs libres moins les emplois non pourvus couvrent le besoin. |

Sans rapport, l'onglet indique « **Pas encore de rapport de population pour cette planète.** »

> [!tip]
> Un ✗ dans « Contrôle du plan » veut dire que tu serais en concurrence pour les travailleurs avec des bases qui les attendent déjà. Prévois moins de travailleurs de ce niveau, ou vérifie à nouveau après le prochain rapport.

## COGM {#cogm}

Le bouton **COGM** sur chaque ligne de recette dans [Production](/help/plan_production) ouvre **Coût des marchandises fabriquées** : ce que te coûte la fabrication d'une unité de chaque produit dans ce plan. Il utilise l'efficacité, la durée, la dégradation, les frais de production, les prix des intrants et la main-d'œuvre du plan.

### Le calcul {#cogm-calculation}

| Ligne                                   | Formule                                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durée de la recette et son « % / jour » | Le temps de la recette ÷ l'efficacité du bâtiment, et sa part d'une journée (_part de durée_).                                                                                                                      |
| **Efficacité**                          | L'efficacité du bâtiment dans ce plan.                                                                                                                                                                              |
| **Dégradation**                         | Coût de construction ÷ 180 × part de durée.                                                                                                                                                                         |
| **Frais de production / cycle**         | Les frais de production par jour du bâtiment à 100 % × le temps de base de la recette ÷ 1 jour. Ils ignorent l'efficacité. Par exemple, 35 ȼ par jour et une recette de 6 h donnent 35 × 6 ÷ 24 = 8,75 ȼ par cycle. |
| Intrants, **Total des intrants**        | La quantité de chaque intrant × le prix d'achat du plan. Une étiquette indique d'où vient chaque prix et ouvre cette règle dans [Bourses](/help/exchanges).                                                         |
| **Main-d'œuvre**                        | Le coût quotidien de la main-d'œuvre du bâtiment × part de durée. Les travailleurs sans logement et les produits de luxe désactivés ne coûtent rien.                                                                |
| **Coût total**                          | Dégradation + frais de production + intrants + main-d'œuvre.                                                                                                                                                        |
| Bénéfice de la recette                  | Les produits aux prix de vente du plan − **Coût total**.                                                                                                                                                            |

Pour chaque produit :

- **Coût total** : **Coût total** ÷ la quantité de ce produit, donc chaque produit porte la totalité du coût. C'est le COGM que PRUNplanner utilise ailleurs.
- **Répartition des coûts** : **Coût total** ÷ tous les produits ensemble, ce qui répartit le coût selon les quantités.
- Une ligne en dessous donne le prix de marché du produit et l'écart du COGM par rapport à lui, en %. Elle montre si fabriquer le matériau ici coûte plus ou moins cher que son prix de marché.

Par exemple (chiffres inventés), un cycle avec un **Coût total** de 1 200 ȼ qui fabrique 4 unités d'un matériau et 2 d'un autre donne un **Coût total** de 1 200 ÷ 4 = 300 ȼ et 1 200 ÷ 2 = 600 ȼ, et une **Répartition des coûts** de 1 200 ÷ 6 = 200 ȼ pour les deux.

### Utiliser le COGM comme prix d'achat {#cogm-buy-price}

Quand l'empire du plan a une préférence d'échange, un second panneau s'ouvre à côté du tableau : **Prix dans {name}**, avec le nom de la préférence (**Ouvrir dans Échanges** l'ouvre). Sans préférence, une note indique que les prix sont en Univers · VWAP 30j, avec **Définis-en une dans la gestion**.

Pour chaque produit, il affiche **COGM ici ({planet})**, **Marché · {source}** (le prix d'achat du marché sans prix fixes) et **Prix d'achat, toutes les planètes** (ton prix d'achat [[fixed-price|fixe]], ou **non fixé**). Ensuite :

- **Utiliser comme prix d'achat sur toutes les planètes** (quand il n'y a pas de prix fixe) règle le prix d'achat du produit sur le COGM de ce plan, pour toutes les planètes de cette préférence.
- Quand il y a un prix fixe et qu'il s'écarte de plus de 2 % du COGM actuel, tu vois « **Le prix d'achat fixé s'écarte de {diff} % du COGM actuel** » (« Les intrants ou l'efficacité ont changé depuis sa définition. ») avec **Mettre à jour vers {value}**.
- Sinon, il indique **Le prix d'achat correspond au COGM**.

Une ligne indique quels plans de la préférence achètent le matériau, puisque la modification s'applique à chaque plan qui l'utilise. **Prix fixes**, plus bas, liste les prix fixes de la préférence pour **Toutes les planètes** ou pour cette planète, et tu peux les modifier directement. Rien n'est enregistré tant que tu n'as pas cliqué sur **Enregistrer les modifications** dans la barre en bas (ou sur **Annuler**). [Prix fixes et COGM](/help/exchanges#fixed-prices-and-cogm) explique les prix fixes.

> [!tip]
> Tu utilises ton propre produit dans une autre base ? Un prix d'achat fixe au COGM l'évalue à ce qu'il te coûte plutôt qu'au prix du marché, et l'autre plan affiche ainsi sa vraie marge. Pour une recette avec un [[byproduct|sous-produit]], **Coût total** attribue la totalité du coût à chaque produit. Compare-le avec **Répartition des coûts** avant de le fixer.

## Débogage du calcul {#debug}

Le débogage du calcul liste chaque étape du calcul du plan avec sa formule et ses entrées. Il sert aux rapports de bug : quand un chiffre semble faux, il montre d'où vient ce chiffre. Il reste masqué tant que tu ne l'actives pas, et il n'existe qu'en anglais.

**L'activer et le désactiver :**

- Ajoute `?debug=calc` à n'importe quelle adresse PRUNplanner (par exemple `https://prunplanner.org/?debug=calc`) pour l'activer, et `?debug=off` pour le désactiver. Le paramètre disparaît aussitôt de l'adresse, donc un lien que tu partages ne le contient jamais.
- Ou coche « Calculation debug » sur la page `/debug` (connecté).
- Ou clique sur « Turn off » dans le panneau.

Le réglage est conservé dans ce navigateur et s'applique à tous ses onglets. Une fois activé, le menu **Plus** de la page du plan (⋯ dans l'en-tête) contient « Calculation debug ». Ctrl plus la touche à gauche de 1 (`` ` `` sur un clavier US, ⌘ au lieu de Ctrl sur Mac) l'ouvre et le ferme, sauf si tu es en train de saisir dans un champ.

**Ce que le panneau affiche :** le panneau se trouve sous le plan, et tu peux le redimensionner par son bord supérieur.

- Une ligne d'état : quand il a recalculé pour la dernière fois, combien de temps cela a pris, le nombre d'étapes et combien d'autocontrôles réussissent.
- Des boutons pour afficher ou masquer chaque phase du calcul (entrées, infrastructures, main-d'œuvre, surface, experts, production, COGM, E/S des matériaux, prix, construction, finances et fréquence de visite), un « Filter » par bâtiment, ticker ou libellé, et « Issues only ».
- Les autocontrôles, les éventuels avertissements et les données du plan telles qu'un enregistrement les enverrait, y compris s'il a des modifications non enregistrées.
- « Copy text » et « Copy JSON » copient toute la trace avec la version de l'app, le plan, la planète, la préférence d'échange et l'empire.

> [!tip]
> Tu signales un chiffre faux ? Ouvre le plan, active le débogage du calcul, clique sur « Copy text » et colle le résultat dans ton rapport. Il contient les données de ton plan, alors ne le partage que là où cela ne te dérange pas.
