La page [Empire](/empire) te permet de vérifier que tes bases fonctionnent comme un tout avant de les construire. Elle réunit tous les plans d'un [[empire|empire]] et montre ce qu'ils rapportent et coûtent par jour, quels matériaux l'empire fabrique et consomme, quelle part d'un marché il occuperait, et quelles recettes pourraient utiliser ce qui reste.

Un plan sur sa propre page ne connaît que sa propre base. Ici, ce qu'une base fabrique et ce qu'une autre consomme n'est compté qu'une fois, donc tu vois ce que l'empire dans son ensemble achète et vend.

## Pour commencer {#getting-started}

Un empire regroupe les [[plan|plans]] de tes bases et contient ta [[faction|faction]] et tes [[area-permits|permis]]. Chaque nouveau compte en a un, « My Empire ». Tu en crées d'autres, les supprimes et y attribues des plans dans la [Gestion](/help/management).

- **Changer d'empire** choisit l'empire à afficher. Celui que tu choisis devient aussi ton **Empire par défaut** (voir [Profil](/help/profile#preferences)), donc la page s'ouvre dessus la prochaine fois.
- Un empire sans plan affiche trois étapes vers ta première base. Vérifie la faction et les permis, trouve une planète dans la [Recherche de planètes](/search) (un plan que tu y crées est ajouté à cet empire), et définis tes prix sur [Bourses](/exchanges).
- Si tu n'as aucun empire, **Créer un empire** en crée un sans faction et avec 1 permis utilisé sur 2.

Une barre de progression s'affiche pendant que PRUNplanner calcule les plans. Les prix viennent de la [[exchange-preference|préférence d'échange]] de l'empire, avec les règles de planète de chaque plan. Un empire sans préférence utilise Univers · VWAP 30j. Détails dans [Bourses et prix](/help/exchanges).

## Chiffres de l'aperçu {#overview-numbers}

Les tuiles en haut résument l'empire par jour :

| Tuile                   | Comment elle est calculée                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recettes**            | La valeur de tout ce que l'empire vend, après compensation (voir plus bas)                                                                                                                                                                                                                                                                                                                                                             |
| **Coût**                | Ce que l'empire achète après compensation, plus la [[degradation\|dégradation]] de chaque plan (coût de construction ÷ 180 par jour) et ses [[production-fees\|frais de production]] ; aussi affiché en % des recettes |
| **Bénéfice**            | Recettes − Coût, avec la marge en %                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Bénéfices / Surface** | Bénéfice ÷ la surface utilisée par tous les plans                                                                                                                                                                                                                                                                                                                                                                                                         |

_Compensation :_ l'empire n'est pas une simple somme de ses plans. Pour chaque matériau, ce qu'un plan fabrique et ce qu'un autre consomme s'annulent d'abord. Seul le reste est vendu ou acheté, à la moyenne des prix des plans pour ce matériau, pondérée par la quantité de chaque plan. Les consommables de la main-d'œuvre comptent ici comme des matériaux.

Par exemple (chiffres inventés), le plan A fabrique 100 unités d'un matériau par jour à 80 ȼ l'unité, et le plan B en consomme 60 à 100 ȼ l'unité. L'empire ne vend que les 40 restantes, à (100 × 80 + 60 × 100) ÷ (100 + 60) = 14 000 ÷ 160 = 87,50 ȼ l'unité, donc elles ajoutent 40 × 87,50 = 3 500 ȼ par jour aux **Recettes**.

La barre en dessous répartit les recettes entre intrants de production, main-d'œuvre, dégradation, frais de production et bénéfice, chacun en % des recettes. Quand l'empire est en perte, la barre affiche plutôt les parts en proportion du coût, avec une partie hachurée pour le coût que les recettes ne couvrent pas.

**Transport** affiche les tonnes et mètres cubes par jour que tes plans font entrer (importation) et sortir (exportation), additionnés sur les plans.

## Liste des plans et configuration {#plan-list}

La liste des plans affiche chaque plan de l'empire avec ses planètes, son [[cogc|COGC]], ses permis et son **Bénéfice (ȼ)**. Clique sur un plan pour l'ouvrir. Le pied de liste additionne les permis utilisés par tes plans. Sur les écrans larges, **Masquer la liste des plans** replie toute la colonne de gauche : les tuiles, la liste des plans et la Configuration.

### Configuration {#configuration}

Le cadre **Configuration** contient le **Nom** de l'empire, sa **Faction**, **Permis total** (au moins 2) et **Permis utilisés** (au moins 1). **Enregistrer** les enregistre, et **Recharger** abandonne tes modifications et charge les valeurs enregistrées.

**Permis total** est le nombre de permis de base de ta société, et **Permis utilisés** le nombre de ceux qu'occupent tes bases. Dans le jeu, chaque amélioration de [[hq-level|niveau de QG]] te donne un permis de plus.

La faction et les permis modifient ta production. Un bâtiment dont l'expertise est favorisée par ta faction obtient un bonus de `1 + bonus × 2 × (3 − 2 × Permits Used ÷ Permits Total)` : moins de permis utilisés signifie donc un bonus plus grand. Le [glossaire](/help/glossary#faction) explique les factions.

Par exemple (chiffres inventés), avec un bonus de base de 0,05 et 2 permis utilisés sur 4, PRUNplanner calcule 1 + 0,05 × 2 × (3 − 2 × 2 ÷ 4) = 1 + 0,05 × 2 × 2 = 1,20, soit +20 %. Avec les 4 utilisés, il calcule 1 + 0,05 × 2 × 1 = 1,10, soit +10 %. La page calcule chaque plan avec les valeurs enregistrées, donc les chiffres changent une fois que tu as cliqué sur **Enregistrer**.

Quand **Permis utilisés** diffère du total des permis de tes plans, un avertissement te le signale (« Écart détecté »). Le cadre compare **Permis utilisés** au total du pied de la liste des plans, où chaque plan compte les permis définis dans sa propre [Configuration de la base](/help/plan_base#permits), et il revérifie pendant que tu tapes. Par exemple, trois plans avec 1, 1 et 2 permis font 4 au total, donc avec **Permis utilisés** à 3 l'avertissement indique « Écart détecté : 3 permis configurés contre 4 planifiés ».

Pas d'inquiétude, l'avertissement ne bloque rien : tu peux toujours enregistrer, et tes plans sont toujours calculés. Il est là parce que le bonus de faction utilise **Permis utilisés** : une valeur qui ne correspond pas aux bases que tu feras tourner donne un mauvais bonus. Modifie **Permis utilisés**, ou les permis de tes plans, jusqu'à ce qu'ils concordent. Prends les bonnes valeurs dans ton buffer HQ en jeu. L'étape « Ton empire » du premier lancement n'affiche pas l'avertissement.

Si l'empire a été enregistré entre-temps dans un autre onglet ou sur un autre appareil, tu choisis de l'écraser ou de recharger la version enregistrée.

## E/S matières {#material-io}

**E/S matières** (l'une des vues de la page) liste chaque matériau de l'empire avec ces colonnes :

- **Delta** : fabriqué moins consommé par jour. Au-dessus de zéro, l'empire vend le reste, et en dessous de zéro, il achète ce qui manque.
- **Production** et **Consommation**.
- **Delta ȼ** : la valeur du delta par jour.
- **Produit par** et **Consommé par** : quels plans en fabriquent et en consomment le plus.

Déplie une ligne pour voir les plans derrière elle. **Vue détaillée** bascule entre producteurs et consommateurs et **Net par planète**, qui additionne les plans d'une même planète en un excédent ou un besoin.

Ces filtres sont partagés avec l'Analyse :

- **Affichage** : **Tous**, ou **Répartition de charge** pour les matériaux que l'empire fabrique et consomme à la fois.
- **Consommables** : **Afficher** ou **Masquer** les consommables de la main-d'œuvre.
- **Planètes** (E/S matières uniquement) : **Résumé**, ou **Tout développer** pour toutes les lignes.
- **Matériaux** et **Planètes** : n'affichent que ceux que tu choisis.

Survole n'importe quel [[ticker|ticker]] pour voir sa fiche de marché (voir [Bourses et prix](/help/exchanges#market-card)).

Après chaque calcul, PRUNplanner enregistre aussi les E/S matières de l'empire dans ton compte. C'est cette copie que renvoie l'entrée « E/S de matériaux de l'empire » de l'API (voir [Clés API](/help/api_keys#url-builder)).

### Contrôle du marché {#market-check}

Au-dessus du tableau, **Contrôle du marché sur le flux net de l'empire** compare ce que l'empire dans son ensemble vend ou achète aux transactions de l'échange. Les matériaux fabriqués et consommés se compensent d'abord, donc ils ne sont signalés que sur ce qui atteint le marché. Le [Contrôle du plan](/help/plan_check#market-check) de chaque plan les signale toujours.

| Pastille                                                         | Signale                                                                                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rouge : « ne peut pas être échangé comme prévu » | Aucun prix ; aucune transaction en 7 jours ; aucune offre (à l'achat) ou aucun acheteur (à la vente) ; 50 % ou plus du volume quotidien moyen de l'échange (30 jours) |
| Orange : « grande part du marché »               | 10 % ou plus du volume quotidien moyen                                                                                                                                                                                         |
| Grisée : « autres remarques »                    | Tous les échanges, aucun échange défini ; données de plus de 2 jours                                                                                                                                                           |

Clique sur une pastille pour ne voir que les matériaux de ce niveau, et clique à nouveau pour les voir tous.

Le contrôle de l'empire n'utilise que les règles _de toutes les planètes_ de la préférence d'échange de l'empire. Une exception de planète compte toujours pour les prix de l'empire, mais le contrôle ne la voit pas : vérifie donc ces matériaux dans le Contrôle du plan de chaque plan.

## Analyse {#analysis}

**Analyse** affiche des graphiques. Les graphiques de matériaux suivent les filtres, ceux des plans non.

- **Où vont les recettes de chaque plan** affiche la répartition des recettes, la marge et les recettes par jour de chaque plan. Tu vois les 10 plans au plus gros bénéfice et chaque plan en perte, et le reste va dans « Autres ». Ce sont les chiffres propres à chaque plan, sans compensation.
- **Matériaux qui déplacent le plus de ȼ** affiche les 10 matériaux qui représentent le plus de ȼ par jour, ce que l'empire achète à gauche et ce qu'il vend à droite, en **ȼ / jour** ou **Unités / jour**. Un bouton en dessous les affiche tous. Clique sur un matériau pour l'ouvrir dans E/S matières.
- **Plus de graphiques** reste ouvert ou fermé comme tu l'as laissé dans ce navigateur. Il contient **Bénéfice du plan (ȼ)**, **Bénéfices matériels**, **Coûts des matériaux**, **Production nette**, **Consommation nette**, **Production exclusive** (fabriqué mais jamais consommé dans l'empire) et **Consommation exclusive** (consommé mais jamais fabriqué).

## Opportunités de production {#production-opportunities}

**Opportunités de production** cherche des [[recipe|recettes]] qui pourraient utiliser ce qui reste à ton empire. Il liste chaque recette dont au moins un intrant a un delta positif dans l'empire, triée par la part des intrants en excédent, puis par **Lots possibles**.

Les trois tuiles les comptent :

| Tuile                 | Signification                                                      |
| --------------------- | ------------------------------------------------------------------ |
| **Opportunités**      | Chaque intrant est en excédent, assez pour au moins 1 lot par jour |
| **Delta obligatoire** | Chaque intrant est en excédent, mais pas assez pour 1 lot par jour |
| **Matériau manquant** | Au moins un intrant n'est pas en excédent                          |

**Lots possibles** est le nombre de cycles de la recette par jour que ton excédent couvre. Pour chaque intrant, PRUNplanner divise l'excédent quotidien par la quantité dont la recette a besoin et prend le résultat le plus bas. Il ne tient pas compte de la durée de la recette, du nombre de bâtiments nécessaires ni de leur efficacité. Lis-le comme « combien d'intrants il y a », pas « combien tu peux fabriquer ».

Par exemple (chiffres inventés), une recette a besoin de 10 d'un intrant et de 5 d'un autre par cycle, et l'empire en a 30 et 10 en trop par jour. Cela fait 30 ÷ 10 = 3 et 10 ÷ 5 = 2 cycles, donc **Lots possibles** vaut 2, parce que le second intrant s'épuise en premier.

Pour les correspondances complètes, **Vente des entrées** et **Vente des sorties** comparent la vente des intrants tels quels avec la vente de ce que la recette en tirerait (prix de vente × quantité × lots). Le meilleur des deux est en vert. Les prix sont les prix de vente de la préférence d'échange de l'empire, règles de toutes les planètes uniquement. La liste utilise les E/S matières non filtrées.

> [!tip]
> Avant de construire pour une opportunité, ouvre la fiche de marché de ses produits, car un marché peu profond ne peut pas absorber la quantité en plus. [Chaînes de production](/help/tools_production_chain) planifie les bâtiments qu'il faudrait.
