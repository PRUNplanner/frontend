Utilise le calculateur de coûts d'entretien pour voir quel bâtiment et quel matériau couvrent un besoin de la population (sécurité, santé, confort, culture, éducation) au moindre coût, aux prix de ta préférence d'échange. Il compare les matériaux que consomment les bâtiments d'[[upkeep|entretien]] selon ce que coûte une unité de besoin avec chacun d'eux.

Sers-t'en quand tu veux comparer ce que coûte la couverture d'un besoin avec chaque bâtiment et chaque matériau, à tes prix. Il ne regarde ni tes plans ni tes bases : les chiffres des bâtiments sont intégrés, et les prix viennent de ta préférence d'échange.

## Comment l'utiliser {#how-to-use}

1. Vérifie **Préférence CX**, qui détermine les prix (voir [Prix](#prices)).
2. Choisis le besoin sous **Besoin** : **Sécurité** (par défaut), **Santé**, **Confort**, **Culture** ou **Éducation**.
3. Lis le tableau **Détails des matériaux**, du moins cher au plus cher.

La page calcule les cinq besoins à son ouverture (« Calcul des prix des matériaux d'entretien »), et à nouveau quand tu changes de préférence d'échange. Tant que ce n'est pas fini, tu vois une barre de progression avec cette ligne. Ensuite, changer de **Besoin** est instantané, parce que les cinq besoins sont déjà calculés.

## Bâtiments et besoins {#buildings}

PRUNplanner connaît 14 bâtiments d'entretien, chacun avec les matériaux qu'il consomme par jour et la quantité de chaque besoin qu'il fournit. Ces chiffres sont intégrés à PRUNplanner.

| Besoin        | Bâtiments                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------- |
| **Sécurité**  | SST Station de sécurité, SDP Poste de drone de sécurité, EMC Centre d'urgence             |
| **Santé**     | INF Infirmerie, HOS Hôpital, EMC Centre d'urgence, WCE Centre de bien-être                |
| **Confort**   | PAR Parc naturel, 4DA Arcades 4D, WCE Centre de bien-être, ACA Café d'art                 |
| **Culture**   | ART Galerie d'art, VRT Théâtre RV, ACA Café d'art, PBH Centre de communication planétaire |
| **Éducation** | LIB Bibliothèque, UNI Université, PBH Centre de communication planétaire                  |

Quatre bâtiments servent deux besoins : EMC (sécurité et santé), WCE (santé et confort), ACA (confort et culture) et PBH (culture et éducation).

## Détails des matériaux {#material-details}

Pour le besoin sélectionné, le tableau a une ligne par bâtiment et par matériau. Il affiche 50 lignes par page, et tu peux cliquer sur un en-tête pour trier sur cette colonne.

| Colonne                            | Ce qu'elle montre                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Matériau**                       | le matériau que le bâtiment consomme                                                                      |
| **Bâtiment**                       | le bâtiment d'entretien, sous forme de ticker                                                             |
| **ȼ/besoin**                       | le coût par unité de besoin (4 décimales). Plus c'est bas, mieux c'est |
| **Prix CX (ȼ)** | le prix d'achat du matériau selon ta préférence d'échange                                                 |
| **Qté/jour**                       | combien d'unités le bâtiment consomme par jour                                                            |

Par défaut, les lignes sont triées par **ȼ/besoin**, du plus bas au plus haut. Les matériaux sans prix affichent « — » dans **ȼ/besoin** et **Prix CX (ȼ)** et se retrouvent en bas. Pas d'inquiétude, cela veut seulement dire que ta préférence d'échange ne donne pas de prix d'achat pour eux, donc il n'y a rien à comparer.

## Comment ȼ/besoin est calculé {#price-per-need}

ȼ/besoin = Prix CX × Qté/jour ÷ (besoin fourni × nombre de besoins que sert le bâtiment)

Pour un bâtiment qui sert deux besoins, PRUNplanner compte deux fois le besoin qu'il fournit, parce que les mêmes matériaux paient les deux besoins. C'est pourquoi ses lignes paraissent moins chères que celles d'un bâtiment à un seul besoin avec les mêmes coûts.

Par exemple, avec des chiffres inventés : un bâtiment consomme 10 unités par jour d'un matériau à 50 ȼ et fournit 500 d'un besoin. Sa ligne affiche 50 × 10 ÷ (500 × 1) = 1 ȼ/besoin. Un bâtiment qui consomme la même chose et fournit 500 de chacun de deux besoins affiche 50 × 10 ÷ (500 × 2) = 0,5 ȼ/besoin.

Chaque ligne considère un seul matériau, comme si ce matériau payait à lui seul tout le besoin du bâtiment. Un bâtiment consomme tous ses matériaux, donc son coût complet par unité de besoin est la somme de ses lignes. Si le bâtiment à un seul besoin ci-dessus consommait aussi un second matériau dont la ligne affiche 0,5, son coût complet serait de 1 + 0,5 = 1,5 ȼ/besoin.

> [!tip]
> Compare les bâtiments en additionnant leurs lignes. Un bâtiment avec un matériau bon marché et un cher peut coûter plus par besoin qu'un bâtiment dont tous les matériaux sont de prix moyen.

## Prix {#prices}

**Préférence CX** choisit la [[exchange-preference|préférence d'échange]], et « None - Universe 30D » utilise le [[vwap|VWAP]] sur 30 jours de l'[[universe|Univers]]. Les prix ne dépendent pas d'une planète, donc les exceptions par planète de ta préférence d'échange ne s'appliquent pas ici. Les prix décident de l'ordre, donc une autre préférence d'échange peut placer un autre matériau ou bâtiment en tête.

> [!warning]
> Choisir une préférence d'échange ici en fait aussi ta préférence d'échange par défaut, donc les autres pages qui suivent ta préférence par défaut changent avec elle.
