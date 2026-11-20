PRUNplanner planifie tes bases. Tu les construis et les fais tourner dans le jeu. Ce guide couvre le passage de relais, et à la fin tu auras :

- FIO connecté, pour que PRUNplanner voie tes bases et tes stocks,
- les matériaux pour construire une base et son premier approvisionnement, sous forme de paquets [[xit|XIT]] qui font les achats et le transport pour toi,
- Consommation FIO et Réparer FIO configurés pour garder tes bases en activité approvisionnées et réparées.

Il s'adresse aux joueurs sur le point de construire une base planifiée. Il prend environ 15 minutes, plus une configuration unique de FIO. Les pages en lien à la fin de chaque étape vont plus loin.

## 1. Connecte FIO {#step-1}

[[fio|FIO]] est une extension de navigateur communautaire et gratuite qui lit tes données de jeu. Grâce à elle, PRUNplanner sait ce qui se trouve sur tes planètes et ce qu'il y a dans tes stocks.

![La connexion FIO sur la page Profil, connectée, avec les champs Nom d'utilisateur PrUn et Clé API FIO](/images/help/guides/hand-off-fio.webp)

1. Installe l'extension FIO et enregistre ton compte FIO depuis le bouton des extensions du jeu.
2. Sur le site de FIO, crée une clé API pour PRUNplanner.
3. Dans ton [Profil](/profile), sous **Connexion FIO**, saisis la **Clé API FIO** et ton **Nom d'utilisateur PrUn**, puis appuie sur **Enregistrer**.

Une fois que ça marche, l'icône FIO en bas du menu latéral reçoit un point vert. Survole-la pour voir **FIO Actif** et la dernière mise à jour de FIO. **Consommation FIO** et **Réparer FIO** apparaissent maintenant sous Outils. Pendant que tu utilises PRUNplanner, tes données FIO ont au plus 30 à 45 minutes environ.

Pour aller plus loin : [Connexion FIO](/help/profile#fio-connection).

## 2. Achète et expédie les matériaux de construction {#step-2}

Ouvre le plan de la base (depuis le menu latéral ou la liste des plans sur [Empire](/empire)) et va dans son onglet **Construction**, le [[construction-cart|panier de construction]].

![L'outil Construction d'un plan : Construits, Quantité et Prévus par bâtiment, et le bouton XIT](/images/help/guides/hand-off-construction.webp)

- **Construits** part de ce que FIO voit sur la planète, et **Quantité** est ce qu'il reste à construire.
- **Matériaux à acheter** déduit le stock de l'entrepôt que tu choisis sous **Stockage** : **Besoin** est donc ce qu'il te reste à obtenir. Par exemple, avec une **Quantité** de 120 BSE et 40 en stock, **Besoin** vaut 80. Avec 150 en stock, il vaut 0, jamais moins.
- Un avertissement à côté de **Quantité** te signale quand les bâtiments auraient besoin de plus de travailleurs que leurs habitations n'en logent.

Le bouton XIT à côté de **Stockage** n'expédie que le **Besoin**. Celui en haut de l'outil expédie tout et ignore le stock.

Pour aller plus loin : [Construction](/help/plan_tools#construction).

## 3. Planifie le premier approvisionnement {#step-3}

Ouvre l'onglet **Approvisionnement**, le [[supply-cart|panier d'approvisionnement]]. Il liste les consommables de la main-d'œuvre et les intrants de production dont la base a besoin pendant **Durée du stock (jours)** (20 par défaut), moins ce qui est en stock.

![L'outil Approvisionnement d'un plan avec ses boutons XIT](/images/help/guides/hand-off-supply.webp)

> [!tip]
> Pour le tout premier vol, utilise **XIT initial**. Le bouton XIT simple déduit ce que la base produit elle-même : une base qui produit son propre DW ou RAT arriverait donc sans en avoir avant le démarrage de la production.

Pour aller plus loin : [Approvisionnement](/help/plan_tools#supply), [XIT et XIT initial](/help/plan_tools#supply-xit).

## 4. Lance le paquet XIT dans le jeu {#step-4}

Chaque bouton XIT ouvre un panneau avec un paquet pour [Refined PrUn](https://github.com/refined-prun/refined-prun), l'extension de navigateur pour le jeu.

1. Choisis l'**Origine** : un entrepôt de station, ou **Configurer à l'exécution** pour choisir au moment de le lancer.
2. Laisse **Acheter sur le CX** activé pour acheter d'abord les matériaux sur l'échange de cette station. Il faut un entrepôt comme origine.
3. **Copier** le JSON.
4. Dans le jeu, Refined PrUn l'exécute avec sa commande XIT ACT. Tu choisis la destination au lancement.

PRUNplanner enregistre l'**Origine** et **Acheter sur le CX** dans tes préférences, et tous les boutons XIT les partagent.

Détails : [Actions XIT](/help/plan_tools#xit).

## 5. Garde tes bases approvisionnées avec Consommation FIO {#step-5}

Ouvre [Consommation FIO](/fio/burn) et choisis l'empire. Pour chaque plan, l'outil divise le stock de ta base sur cette planète par la consommation nette quotidienne du plan et montre combien de jours dure chaque matériau.

![Consommation FIO : les seuils de consommation et les jours restants par base](/images/help/guides/hand-off-burn.webp)

- Le rouge et le jaune marquent les matériaux qui sont à tes seuils ou en dessous (5 et 10 jours par défaut). Par exemple, 160 RAT en stock et une consommation nette de 20 par jour durent 160 ÷ 20 = 8 jours. C'est sous 10 mais au-dessus de 5 : l'affichage est donc jaune.
- Le bouton XIT d'un plan ouvre son réapprovisionnement XIT. Règle les **Jours cibles** ou laisse **Adapter au vaisseau** choisir le plus de jours qui tiennent dans une taille de vaisseau, puis **Copier XIT JSON**.

> [!warning]
> Consommation FIO compte à partir de ton plan, pas de ce qui tourne réellement dans le jeu. Garde un seul plan par planète dans l'empire et maintiens le plan en phase avec ta base, sinon les jours sont faux.

Pour aller plus loin : [Consommation FIO](/help/fio_burn), [Réapprovisionnement XIT](/help/fio_burn#xit-resupply).

## 6. Planifie les réparations avec Réparer FIO {#step-6}

Les bâtiments s'usent, et la facture de [[repair|réparation]] augmente plus tu attends. L'onglet **Réparation** d'un plan trouve le meilleur intervalle pour chaque type de bâtiment.

![Réparer FIO : quand les bases arrivent à échéance, et les bases avec leurs dates de réparation](/images/help/guides/hand-off-repair.webp)

Ouvre [Réparer FIO](/fio/repair). L'outil associe tes plans à tes vraies bases et montre quelles bases sont en retard, bientôt dues ou dues plus tard.

1. Ouvre une base. Vérifie que **Objectif de réparation** nomme le plan que tu y fais tourner.
2. Sous **Vol de réparation**, règle **Arrive dans** sur le nombre de jours dont ton vaisseau a besoin.
3. **XIT Réparation** crée le paquet avec les matériaux de réparation.
4. Vole jusqu'à la base, décharge et lance BRA dans le jeu pour réparer tous ses bâtiments.

Pour aller plus loin : [Réparer FIO](/help/fio_repair#repair-flight), [Réparation](/help/plan_tools#repair).

## 7. Là où le jeu prend le relais {#step-7}

Le rôle de PRUNplanner, c'est le plan : quoi construire, où, à quel prix et en combien de temps ça s'amortit. Il se termine par un export que tu exécutes dans le jeu. La gestion quotidienne de tes bases se fait dans le jeu et ses extensions de navigateur, Refined PrUn et son fork OOG, qui fonctionnent dans le jeu avec tes données en direct.

- Tu as modifié ta base dans le jeu ? Modifie aussi le plan. Consommation FIO et Réparer FIO comptent à partir de tes plans : un plan qui diffère de ta base donne d'autres jours et d'autres échéances.
- Tu prépares une expansion ? Reviens au plan, à une copie ou à un nouveau plan, et compare avant de construire.
- Tu veux tes chiffres dans une feuille de calcul ? Une [clé API](/help/api_keys) permet à une feuille Google Sheets de lire les E/S des matériaux de ton empire.

Pour aller plus loin : [Ta première base](/help/guide_first_base), [Grandir jusqu'à un empire](/help/guide_empire).

## Ensuite {#next}

- [Grandir jusqu'à un empire](/help/guide_empire) : vérifie toutes tes bases ensemble avant d'ajouter la suivante.
- [Glossaire](/help/glossary) : les termes du jeu et de la planification réunis en un seul endroit.
