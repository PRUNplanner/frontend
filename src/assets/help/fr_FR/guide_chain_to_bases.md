Pars d'un objectif comme « produire 50 RAT par jour ». Ce guide prend environ 20 minutes, et à la fin tu auras :

- toute la chaîne de production derrière ton objectif, avec son bénéfice et son coût de construction,
- cette chaîne répartie en bases que tu pourrais construire, chacune sur une planète,
- un [[plan]] par base, dans un nouvel [[empire]] si tu le souhaites.

Il s'adresse aux joueurs qui planifient une nouvelle ligne de production sur plusieurs bases. Les pages indiquées à la fin de chaque étape vont plus loin. Il te faut un compte, et tu devrais d'abord configurer tes prix (voir [Configurer tes prix](/help/guide_cx_prices)).

## 1. Fixe tes objectifs {#step-1}

Ouvre [Chaînes de production](/production-chain) (Calculateurs dans le menu latéral).

![Chaînes de production avec 100 RAT par jour comme objectif, les réglages et les tuiles de résultats](/images/help/guides/chain-targets.webp)

1. Sous **Produire par jour**, choisis un matériau dans **Ajouter un matériau**.
2. Saisis la quantité que tu veux par jour. Un nouvel objectif démarre à 10.
3. Ajoute d'autres objectifs si tu veux, par exemple DW, RAT et OVE ensemble. La chaîne partage les étapes qu'ils ont en commun.

Les résultats, les **Étapes** et le **Graphe** se remplissent immédiatement et se mettent à jour à chaque modification.

Plus : [Bien démarrer](/help/tools_production_chain#getting-started).

## 2. Vérifie les réglages {#step-2}

Ils se trouvent au-dessus des résultats :

- **Prix** : la [[exchange-preference|préférence d'échange]] avec laquelle PRUNplanner valorise la chaîne.
- **Matières premières** : **Acheter** (par défaut) ou **Extraire**.
- **Sous-produits** : **Couvrir la demande** utilise d'abord un [[byproduct|sous-produit]] à l'intérieur de la chaîne. **Vendre** les vend tous.
- **Production propre** : choisis un empire que tu fais déjà tourner, et la chaîne utilise d'abord le surplus de cet empire.

> [!warning]
> Choisir une préférence sous **Prix** en fait aussi ta préférence d'échange par défaut, donc les autres outils qui suivent ta préférence par défaut changent avec elle.

En savoir plus : [Réglages](/help/tools_production_chain#settings), [Production propre](/help/tools_production_chain#own-production).

## 3. Décide ce que tu produis et ce que tu achètes {#step-3}

**Étapes** liste une fois chaque matériau de la chaîne. Pour chacun, **Source** indique s'il faut le **Produire**, l'**Acheter** ou l'**Extraire**, et **Produire ou acheter** indique si le produire fait économiser.

- Les pastilles au-dessus des étapes résument ce qu'il faut regarder. **Moins chers à acheter** liste les étapes que tu produis pour plus cher que le prix de l'échange, et **Acheter les …** les fait passer à l'achat.
- **Marché étroit** liste les matériaux achetés dont la chaîne a besoin à hauteur de 10 % ou plus de ce qui s'échange par jour sur l'échange. En acheter autant fera probablement bouger le prix. Il liste aussi les matériaux qui ne s'y sont pas échangés depuis 30 jours. Par exemple, s'il s'est échangé 30 000 unités d'un matériau sur un échange ces 30 derniers jours, cela fait 1 000 par jour. Une chaîne qui en achète 120 par jour en a besoin à hauteur de 120 ÷ 1 000 = 12 %, donc il est listé.
- Si un matériau a plusieurs [[recipe|recettes]], clique sur « n recettes ▾ » pour comparer leur effet sur la chaîne.

Plus : [Étapes](/help/tools_production_chain#steps), [Avertissements](/help/tools_production_chain#warnings).

## 4. Lis les résultats {#step-4}

La bande du haut additionne toute la chaîne :

- **Bénéfice / jour** est la valeur produite moins les intrants achetés, l'[[upkeep|entretien]] de la main-d'œuvre, l'usure et les frais de production.
- **Bâtiments**, **Surface** et **Main-d'œuvre** montrent ce qu'il faut.
- **Construction** est ce que coûte la construction, avec son [[payback|amortissement]].

L'amortissement vaut construction ÷ bénéfice par jour. Par exemple, une chaîne qui coûte 3 000 000 ȼ à construire et rapporte 25 000 ȼ par jour est amortie en 3 000 000 ÷ 25 000 = 120 jours. Sans bénéfice, la bande affiche « jamais amorti ».

Tu veux un bénéfice qui amortit la construction dans un délai qui te convient. Si ce n'est pas le cas, change un objectif ou fais passer des étapes de la production à l'achat (ou l'inverse), et regarde la bande.

Détails : [Résultats](/help/tools_production_chain#results), [Comment les coûts sont calculés](/help/tools_production_chain#how-costs-are-calculated).

## 5. Répartis la chaîne en bases {#step-5}

Ouvre l'onglet **Bases**. Il affiche trois étapes, et la prochaine est le bouton principal.

![L'onglet Bases de Chaînes de production avec Répartition automatique, Ajuster le rythme et Créer les plans](/images/help/guides/chain-bases.webp)

1. Choisis la taille sous **Bases jusqu'à** : 500 de surface (1 permis), 750 ou 1 000.
2. Appuie sur **Répartition automatique**. Elle regroupe les étapes en bases d'une seule [[expertise]] chacune et choisit une planète pour chaque base. Cette planète a une parcelle libre, aucun de tes plans, et les ressources et la fertilité dont la base a besoin. La répartition automatique privilégie un programme COGC utile et des distances courtes.
3. Tu veux plutôt un nombre de bases précis ? Règle **Nombre de bases** et appuie sur **Ajuster le rythme**. Cela met tous les objectifs à l'échelle de la même façon jusqu'au rythme le plus élevé qui tient, puis répartit la chaîne.

> [!warning]
> **Répartition automatique** et **Ajuster le rythme** repartent de zéro. Tu perds tous les noms, planètes, choix de COGC, produits de luxe et experts que tu avais modifiés, donc répartis d'abord et ajuste ensuite.

Plus : [Répartir en bases](/help/tools_production_chain#auto-layout), [Comment les planètes sont choisies](/help/tools_production_chain#planet-picking), [Ajuster le rythme](/help/tools_production_chain#fit).

## 6. Ajuste les bases {#step-6}

Sur chaque carte de base, tu peux renommer la base, choisir une autre planète, choisir son programme COGC, régler ses **Produits de luxe** et ses **Experts**, la fusionner dans une autre base ou la séparer.

Le sélecteur de planète calcule la base sur chaque planète, pour que tu puisses comparer les bâtiments et la surface. Il marque aussi les planètes où tu as déjà un plan. **Transport par jour** liste ce qui circule entre tes bases et l'échange, en tonnes et en m³, avec les [[jumps|sauts]].

Tu es prêt pour l'étape suivante quand chaque base a une planète et tient dans 1 000 de surface, et que la troisième étape propose de créer les plans.

Plus : [Vue d'ensemble et cartes de base](/help/tools_production_chain#base-cards).

## 7. Crée les plans {#step-7}

Appuie sur « Créer … plans… » dans la troisième étape, ou sur **Créer les plans**.

1. Vérifie le nom de chaque plan.
2. Choisis **Nouvel empire** (par défaut, avec une **Faction**), **Ajouter à** un empire existant, ou **Aucun empire**.
3. Confirme. La page reste sur la chaîne et affiche les liens vers les nouveaux plans et l'empire.

Chaque plan reçoit les bâtiments, les recettes, les habitations, un STO, le programme COGC, les permis, les produits de luxe et les experts de sa base.

En savoir plus : [Créer les plans](/help/tools_production_chain#create-plans).

## 8. Vérifie les plans {#step-8}

La chaîne laisse certaines choses aux plans, donc ouvre chaque nouveau plan et vérifie-le comme une base :

- **Planète** et **Empire et prix** : la chaîne laisse les bonus de QG et de faction aux plans. Coche **QG de corp.** sous **Planète** là où c'est le cas, et vérifie la faction et les permis de l'empire.
- Les tuiles de résultats : **Bénéfice / jour**, **Amortissement**, et **Surface** dans la limite de tes permis.
- **Contrôle du plan** : si le marché absorbe ce que cette base vend et fournit ce qu'elle achète.
- **Construction** : ce qu'il te faut encore pour la construire.

De retour dans Chaînes de production, la **Liste d'achats** additionne ce que la chaîne achète sur un nombre de jours, et **Copier l'action d'achat XIT** la copie sous forme d'action [[xit|XIT]].

> [!tip]
> **Copier le lien de la chaîne** enregistre toute la chaîne sous forme de lien, pour que tu puisses y revenir ou la partager.

Plus : [Configuration de la base](/help/plan_base#empire-and-prices), [Contrôle du plan](/help/plan_check), [Liste d'achats](/help/tools_production_chain#buy-list).

## Ensuite {#next}

- [Grandir jusqu'à un empire](/help/guide_empire) : vérifie les nouvelles bases ensemble sur la page Empire.
- [Passer le relais au jeu](/help/guide_hand_off) : construction, approvisionnement et paquets XIT pour les construire.
