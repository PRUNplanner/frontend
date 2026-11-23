[Réparer FIO](/fio/repair) t'indique quand chacune de tes vraies bases doit passer en [[repair|réparation]], ce que coûte la réparation et quoi charger dans le vaisseau. L'outil lit tes bâtiments depuis [[fio|FIO]] : il te faut donc d'abord une [connexion FIO](/help/profile#fio-connection).

Utilise-le avant une tournée de réparation : il montre quelles bases sont à réparer, et il prépare le chargement et un paquet XIT pour le vol. Quand l'un de tes plans correspond à une base, il reprend les jours de réparation de l'analyse de réparation de ce plan.

## Échéances {#due-dates}

Réparer FIO lit depuis FIO les bâtiments de production de chaque base, avec leur état et le jour de leur dernière réparation (ou de leur construction s'ils n'ont jamais été réparés). Les habitations, le stockage et le module central vieillissent aussi, mais ils n'ont pas besoin de matériaux de réparation : ils sont donc laissés de côté.

Chaque type de bâtiment arrive à échéance à un jour cible :

- **Avec un plan associé**, la cible est le meilleur jour de réparation de ce type dans l'analyse de réparation de ce plan (voir [Outils du plan](/help/plan_tools#repair)), valorisé avec la préférence d'échange de l'empire du plan. Un type de bâtiment absent du plan utilise l'intervalle ci-dessous.
- **Sans plan**, la cible est l'intervalle défini dans les réglages (**Réparer tous les** n jours, 60 par défaut).

Le bâtiment le plus ancien d'un type détermine quand ce type arrive à échéance, et une base arrive à échéance avec son premier type de bâtiment. Une base est _bientôt due_ quand sa cible est au plus à **Bientôt dû** jours (7 par défaut). Si un bâtiment n'a aucune date, sa base affiche **Aucune date de réparation**. Elle compte comme en retard et est facturée comme un bâtiment neuf. Pas d'inquiétude : cela signifie seulement que FIO n'a envoyé aucune date pour l'un de ses bâtiments, et la facture compte ce bâtiment au maximum de ce que sa réparation peut coûter.

## Réglages {#settings}

La barre des réglages se trouve en haut :

| Réglage                                        | Par défaut            | Ce qu'il fait                                                                                                                                                                                                    |
| ---------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Utiliser les plans associés**                | activé                | Utilise les meilleurs jours des plans associés. Quand il est désactivé, chaque base est réparée selon l'intervalle. Il est activé à chaque ouverture de la page. |
| **Réparer tous les** / **Sans plan, tous les** | 60 jours              | L'intervalle pour les bases sans plan (1–180)                                                                                                                                                 |
| **Bientôt dû**                                 | 7 jours               | Les jours avant le jour cible qui comptent comme bientôt dus (0–60)                                                                                                                           |
| **Préférence d'échange**                       | ton **CX par défaut** | Les prix des matériaux de réparation                                                                                                                                                                             |

L'intervalle, les jours « bientôt dû » et la préférence d'échange sont les mêmes réglages que dans ton [Profil](/help/profile#preferences), et ils sont enregistrés sur ton compte.

## Aperçu {#overview}

- **En retard**, **Dû d'ici n j** et **Plus tard** comptent tes bases. Clique sur l'un d'eux pour filtrer la liste. En retard inclut les bases sans date de réparation.
- **Réparer ce qui est dû, aujourd'hui** est le coût, le poids et le volume de la réparation aujourd'hui de toutes les bases en retard et bientôt dues.
- **Coût de l'attente** est le surcoût de cette réparation pour chaque jour d'attente. Chacun de ces bâtiments âgé de moins de 180 jours ajoute 1/180 de son coût de construction. Par exemple (chiffres inventés), deux de ces bâtiments qui ont coûté 90 000 ȼ et 180 000 ȼ à construire ajoutent 500 + 1 000 = 1 500 ȼ pour chaque jour d'attente.
- **Quand les bases arrivent à échéance** est une frise qui va de la base la plus en retard à la dernière à échéance. Clique sur une base pour l'ouvrir.
- La liste **Bases** montre pour chaque base ses bâtiments, l'état le plus bas, les jours depuis la réparation (ou depuis la construction), la prochaine réparation, et **Réparer maintenant**, la facture pour réparer aujourd'hui tous les bâtiments de production. Sous le nom, tu vois quel plan fixe les cibles : « plan … », « plan probable … », « plan … (ton choix) » ou « aucun plan · tous les n j ».

Quand tes données FIO ont plus d'un jour, une note te le signale. Les bâtiments ont vieilli depuis : les états sont donc plus bas et les quantités plus élevées qu'affiché. Les âges sont toujours comptés jusqu'à aujourd'hui.

## Plans associés {#matched-plans}

Un plan correspond à une base quand il est sur la même planète et que ses bâtiments de production correspondent suffisamment à FIO. Pour chaque type de bâtiment, PRUNplanner compte les bâtiments présents des deux côtés et divise par le plus grand total (celui de FIO ou celui du plan). Le plan correspond à partir de 80 % : les bâtiments en trop dans le plan font donc aussi baisser le score.

Par exemple, une base a 4 FRM et 2 FP, et un plan sur sa planète a les mêmes plus 1 PP1. Ils ont 6 bâtiments en commun, et le plus grand total est celui du plan, 7 : le score est donc 6 ÷ 7, environ 86 %, une correspondance probable. Un plan avec seulement les 4 FRM obtient 4 ÷ 6, environ 67 %, et ne correspond pas.

- **Associé** : tous les bâtiments correspondent.
- **Probable** : au moins 80 % correspondent. Vérifie que c'est bien le plan que tu utilises.

Quand plusieurs plans se qualifient, le meilleur score l'emporte. En cas d'égalité, le plan de l'empire qui couvre le plus de tes bases l'emporte. Pour choisir un autre plan, ou aucun plan, ouvre une base et utilise **Objectif de réparation**, où chaque option affiche son pourcentage de correspondance. PRUNplanner enregistre ton choix pour cette base dans tes préférences, sur tous tes appareils. **Retour à l'association automatique** l'annule. Quand aucun de tes plans n'est sur cette planète, **Créer un plan pour {planet}** démarre un nouveau plan sur place.

## Vol de réparation {#repair-flight}

Ouvre une base pour planifier la réparation. Son tableau liste chaque type de bâtiment avec sa cible, les jours depuis la réparation, l'état et le jour d'échéance.

La réparation coûte plus cher chaque jour. La facture augmente jusqu'au jour 180, où elle égale un bâtiment neuf. Dans **Vol de réparation** :

- **Arrive dans** n jours (2 par défaut, 0–30) calcule la facture pour le jour où le vaisseau décharge, et montre combien cela coûte de plus qu'une réparation aujourd'hui. Ajoute un jour ou deux pour les longs vols.
- **Utiliser ce qui est déjà dans le stock de la base** retire ce que la base contient déjà.
- **Poids de la cargaison** et **Volume de la cargaison** montrent le total du chargement, et la liste de chargement indique la quantité et le prix de chaque matériau, ainsi que le prix total.

**XIT Réparation** crée un paquet [[xit|XIT]] ACT avec le chargement, que Refined PrUn exécute. Il utilise la même origine XIT et le même réglage « Acheter sur le CX » que Consommation FIO (tu règles les deux dans ton [Profil](/help/profile#preferences)). Le vaisseau est choisi au lancement du XIT, et il lui faut les tonnes et les mètres cubes de cargaison libre du chargement. Vole jusqu'à la base, décharge et lance BRA pour réparer tous ses bâtiments.

## Prix {#prices}

Les prix viennent de ton **CX par défaut** (affiché ici comme **Préférence d'échange**), en utilisant seulement ses règles toutes planètes et ses prix fixes. Les exceptions par planète ne sont pas utilisées. Si tu n'as pas de CX par défaut, ou s'il a été supprimé, les prix sont Univers · VWAP 30j. Voir [Bourses et préférences d'échange](/help/exchanges).
