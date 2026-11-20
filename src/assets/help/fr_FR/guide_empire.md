Une base, c'est un plan. Plusieurs bases qui s'alimentent les unes les autres forment un [[empire|empire]]. Ce guide prend environ 15 minutes, et à la fin tu auras :

- tes bases dans un seul empire, avec sa faction et ses permis réglés,
- lu la page Empire : ce que les bases rapportent ensemble, ce qu'elles produisent et ce dont elles ont besoin, et si le marché peut l'absorber,
- une liste de recettes que ton surplus pourrait alimenter et de corrections à apporter à tes plans, pour décider quoi construire ensuite.

Il s'adresse aux joueurs qui ont au moins deux bases ou plans. Il te faut un compte. Les pages en lien à la fin de chaque étape vont plus loin.

## 1. Mets tes bases dans un seul empire {#step-1}

Ouvre [Gestion](/manage) et descends jusqu'à **Assignations plan ↔ empire**. Elle a une ligne par [[plan|plan]] et une colonne de cases à cocher par empire.

1. Coche la case de l'empire sur chaque plan qui lui appartient. Les cases modifiées restent marquées jusqu'à l'enregistrement.
2. Appuie sur **Enregistrer les modifications** dans la barre en bas.

Un plan peut faire partie de plusieurs empires, par exemple un avec tes vraies bases et un pour une future expansion. Il calcule avec un seul empire à la fois et utilise la faction, les permis et la [[exchange-preference|préférence d'échange]] de cet empire.

> [!tip]
> Tu veux essayer une variante d'une base sans modifier l'original ? **Cloner** sous **Actions** copie le plan. Mets la copie dans un empire de test.

Pour aller plus loin : [Assignations plan ↔ empire](/help/management#assignments), [Notions de base](/help/management#core-concepts).

## 2. Règle la faction et les permis {#step-2}

Ouvre [Empire](/empire) et choisis l'empire sous **Changer d'empire**. Dans le cadre **Configuration**, règle **Faction**, **Permis total** et **Permis utilisés**, puis appuie sur **Enregistrer**.

- Les permis viennent de ton QG. Chaque amélioration de niveau du QG donne un permis de base de plus, et le [Calculateur de QG](/hq-upgrade-calculator) liste ce que coûte une amélioration.
- Le bonus de [[faction|faction]] augmente quand tu utilises moins de permis : ces chiffres changent donc chaque plan de l'empire.
- Quand **Permis utilisés** diffère du total des permis de tes plans, tu vois un avertissement « Écart détecté ». Il vérifie les chiffres pendant la saisie et ne t'empêche pas d'enregistrer. C'est un rappel pour reprendre les bonnes valeurs dans ton buffer `HQ` en jeu.

Pour aller plus loin : [Configuration](/help/empire#configuration), [Surface et permis](/help/glossary#area-permits).

## 3. Lis les chiffres de l'aperçu {#step-3}

Les tuiles du haut résument l'empire par jour : **Recettes**, **Coût**, **Bénéfice** et **Bénéfice / Surface**.

![La page Empire : recettes, coût et bénéfice, la répartition des coûts, le transport et la liste des plans](/images/help/guides/empire-overview.webp)

L'empire n'est pas une simple somme de ses plans. Ce qu'un plan produit et qu'un autre consomme se compense d'abord, et seul le reste est vendu ou acheté, au prix moyen des plans. C'est pourquoi les chiffres de l'empire peuvent différer de la somme des bénéfices de ses plans.

Par exemple, le plan A produit 100 DW par jour et ses E/S des matériaux les valorisent à 80 ȼ pièce. Le plan B consomme 60 DW par jour à 100 ȼ pièce. L'empire vend les 40 restants. Leur prix est la moyenne pondérée par la quantité de chaque plan : (100 × 80 + 60 × 100) ÷ 160 = 14 000 ÷ 160 = 87,50 ȼ, donc les 40 DW comptent pour 3 500 ȼ par jour. Les deux plans pris séparément comptent +8 000 et −6 000, soit 2 000 ȼ au total.

- La barre en dessous répartit les recettes entre intrants, main-d'œuvre, [[degradation|dégradation]], [[production-fees|frais de production]] et bénéfice.
- **Transport** montre les tonnes et les m³ que tes plans font entrer et sortir par jour.
- La liste des plans montre le bénéfice de chaque plan. Clique sur l'un d'eux pour l'ouvrir.

Détails : [Chiffres de l'aperçu](/help/empire#overview-numbers), [Liste des plans](/help/empire#plan-list).

## 4. Équilibre les matériaux {#step-4}

En haut de la page, ouvre **E/S matières**. Cette vue liste chaque matériau de l'empire avec son **Delta** (produit moins consommé par jour).

![La vue E/S matières de la page Empire](/images/help/guides/empire-materials.webp)

- Un Delta positif est vendu, un Delta négatif est acheté. Un gros Delta négatif sur quelque chose que tu pourrais produire est un bon candidat pour ta prochaine base.
- Avec **Affichage** réglé sur **Répartition de charge**, tu ne vois que les matériaux que l'empire produit et consomme à la fois. Vérifie que l'offre et la demande correspondent.
- Déplie une ligne pour voir quels plans produisent et consomment le matériau. **Net par planète** additionne les plans situés sur la même planète.

Pour aller plus loin : [E/S des matériaux](/help/empire#material-io).

## 5. Vérifie le marché {#step-5}

**Contrôle du marché sur le flux net de l'empire**, au-dessus du tableau, compare ce que l'empire dans son ensemble vend et achète aux échanges réalisés sur l'échange. Des pastilles comptent les alertes : rouge (« ne peut pas être échangé comme prévu »), ambre (« grande part du marché ») et autres remarques. Clique sur une pastille pour n'afficher que ces matériaux.

- À partir de 10 % du volume quotidien d'un matériau, tes ordres feront probablement bouger le prix. À partir de 50 %, le marché ne peut pas absorber la quantité prévue. Le volume quotidien est le total sur 30 jours de l'échange ÷ 30. Par exemple, 30 000 unités échangées en 30 jours font 1 000 par jour : un empire qui en vend 150 par jour en prend donc 15 % et reçoit une alerte ambre.
- Le contrôle utilise les règles _toutes planètes_ de la préférence d'échange de l'empire. Si un matériau a une exception de planète, c'est le [Contrôle du plan](/help/plan_check#market-check) de ce plan qui le vérifie.

> [!tip]
> Une alerte rouge sur un produit ne rend pas une base mauvaise pour autant. Moins de bâtiments, un deuxième produit ou un autre échange peuvent faire baisser la part.

Pour aller plus loin : [Contrôle du marché](/help/empire#market-check), [Contrôle du plan : Empire](/help/plan_check#empire).

## 6. Trouve des opportunités de production {#step-6}

En haut de la page, ouvre **Opportunités de production** pour voir les [[recipe|recettes]] qui pourraient utiliser ce qu'il reste à ton empire.

![La vue Opportunités de production de la page Empire](/images/help/guides/empire-opportunities.webp)

- **Opportunités** : les recettes dont chaque intrant est en surplus, suffisamment pour au moins une exécution par jour.
- **Lots possibles** : combien d'exécutions par jour ton surplus couvre. Cela ignore la durée de la recette, les bâtiments et l'efficacité : lis-le comme « combien d'intrants il y a », pas « combien tu peux produire ».
- **Vente des entrées** et **Vente des sorties** comparent la vente du surplus tel quel avec la vente de ce que la recette en ferait.

Pour aller plus loin : [Opportunités de production](/help/empire#production-opportunities).

## 7. Vérifie les chaînes derrière tes bases {#step-7}

Dans [Chaînes de production](/production-chain), passe de **Planifier une chaîne** à **Vérifier un empire** et choisis l'empire. Ajoute les chaînes à vérifier, ou choisis **Vérifier tout ce que l'empire vend**.

La vérification remonte chaque matériau vendu à travers tes plans et liste les constats avec leur gain par jour. Une **Correction de plan** signifie que le plan compte un programme COGC que la planète n'applique pas, ou en oublie un qu'elle applique. Les autres constats sont une **Recette** moins chère, **Produire ou acheter**, un meilleur **Emplacement** ou une meilleure **Configuration** des produits de luxe et des experts. Elle ne modifie jamais un plan.

> [!tip]
> Commence par les corrections de plan. Elles ne coûtent rien à construire, et les chiffres du plan restent faux tant que tu ne les as pas faites.

Détails : [Vérifier un empire](/help/tools_production_chain#check-an-empire), [Constats](/help/tools_production_chain#findings).

## Ensuite {#next}

- [Passer le relais au jeu](/help/guide_hand_off) : construis, approvisionne et répare tes bases avec des paquets XIT.
- [D'une chaîne à des bases](/help/guide_chain_to_bases) : planifie la prochaine chaîne et ajoute-la à cet empire.
