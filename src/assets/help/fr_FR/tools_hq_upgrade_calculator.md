Utilise le Calculateur d'amélioration du QG pour planifier une amélioration de [[hq-level|niveau de QG]]. Il liste les matériaux nécessaires pour faire passer le siège social de ton entreprise d'un niveau à un autre, ce que tu as déjà et ce que coûte le reste : tu peux ainsi acheter ou expédier exactement ce qui manque.

Dans le jeu, chaque amélioration de niveau du QG te donne un [[area-permits|permis]] de base de plus. Utilise le calculateur quand tu te prépares à une amélioration, ou pour voir ce que demandent plusieurs améliorations à la suite.

## Choisir les niveaux {#levels}

| Réglage                       | Ce qu'il fait                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Du niveau de QG**           | ton niveau actuel, de 1 à 50 (1 par défaut)                                                                                                         |
| **Au niveau de QG**           | le niveau que tu veux atteindre. Il ne propose que les niveaux à partir de **Du niveau de QG** (3 par défaut)                       |
| **Préférence CX**             | la [[exchange-preference\|préférence d'échange]] pour les prix |
| **Afficher les emplacements** | affiche la colonne **Emplacements de Stockage** (activé par défaut)                                                                                 |

Le calculateur additionne les matériaux de chaque amélioration, du niveau qui suit **Du niveau de QG** jusqu'à **Au niveau de QG** : tu peux donc planifier plusieurs améliorations d'un coup. Avec De 1 et À 3, il montre les améliorations aux niveaux 2 et 3. Par exemple, le niveau 2 demande 6 BBH et le niveau 3 en demande 16 : **Quantité** affiche donc 22 BBH. Avec **Du niveau de QG** et **Au niveau de QG** identiques, il n'y a aucune amélioration à additionner et le tableau reste vide.

Les matériaux par niveau viennent d'un tableau intégré à PRUNplanner, qui couvre les niveaux 1 à 50.

Si tu montes **Du niveau de QG** au-dessus de **Au niveau de QG**, le tableau garde le résultat précédent. Pour recalculer, choisis un **Au niveau de QG** égal ou supérieur au nouveau **Du niveau de QG**.

> [!warning]
> Choisir une préférence d'échange ici en fait aussi ta préférence d'échange par défaut : les autres pages qui suivent ta préférence par défaut changent avec elle.

## Le tableau {#table}

Le tableau a une ligne par matériau, de A à Z par ticker. Clique sur un en-tête pour trier selon lui. Cela fonctionne sur toutes les colonnes sauf **Remplacer le stock** et **Emplacements de Stockage**.

| Colonne                                 | Ce qu'elle montre                                                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Matériau**                            | le matériau. Clique dessus pour voir sa fiche de marché                                                                                                                         |
| **Quantité**                            | combien les améliorations en demandent au total                                                                                                                                                 |
| **Stockage**                            | combien tu en as : ton stock [[fio\|FIO]], ou ta valeur de remplacement |
| **Remplacer le stock**                  | ton propre chiffre de stock pour ce matériau                                                                                                                                                    |
| **Requis**                              | ce qu'il te faut encore : max(Quantité − Stockage, 0)                                                                                                        |
| **Coût / unité (ȼ)** | le prix d'achat selon ta préférence d'échange                                                                                                                                                   |
| **Coût total (ȼ)**   | Requis × Coût / unité                                                                                                                                                                           |
| **Emplacements de Stockage**            | où FIO a trouvé le matériau, par ex. `120x @ <name> (WAR)`. Le type est PLANET, WAR ou SHIP                                                                     |

Les prix ne dépendent pas d'une planète : les exceptions par planète de ta préférence d'échange ne s'appliquent donc pas ici.

## Ton stock {#stock}

Avec FIO connecté, **Stockage** est la somme du matériau dans toutes tes bases, entrepôts et vaisseaux que FIO signale. Sans FIO, il vaut 0. Pas d'inquiétude si chaque matériau affiche alors toute sa **Quantité** en **Requis** : cela signifie seulement que PRUNplanner ne connaît pas ton stock. Connecte FIO dans ton [Profil](/help/profile), ou saisis ton stock dans **Remplacer le stock**.

FIO compte le matériau où qu'il soit, dans une base, un entrepôt ou un vaisseau : **Emplacements de Stockage** t'indique donc où il se trouve.

Par exemple, avec les 22 BBH de plus haut et 10 en stock, **Requis** vaut 22 − 10 = 12, et à un prix inventé de 100 ȼ l'unité, **Coût total (ȼ)** vaut 1 200 ȼ. Avec 30 en stock, **Requis** vaut 0, jamais moins.

Pour remplacer le chiffre FIO d'un matériau, saisis un nombre dans **Remplacer le stock**, par exemple pour un stock déjà en route. 0 compte comme 0. Vide le champ pour revenir au chiffre FIO. Le tableau et les totaux se mettent à jour dès que tu modifies une valeur de remplacement. Les valeurs de remplacement durent jusqu'à ce que tu quittes la page.

## Totaux {#totals}

Au-dessus du tableau :

- **Coût total** : la somme des **Coût total (ȼ)**.
- **Poids total** en t et **Volume total** en m³ de tout ce qui est **Requis**, pour vérifier que ça tient dans ton vaisseau.

Les trois ne comptent que ce qu'il te faut encore : ils laissent donc de côté le stock que tu as déjà.

## XIT {#xit}

Le bouton XIT ouvre le panneau d'action XIT avec un transfert pour chaque matériau dont le **Requis** est supérieur à 0. Règle l'**Origine** (l'entrepôt de station d'où le prendre) et **Acheter sur le CX**. Puis **Copier** le **JSON** et exécute-le avec [[xit|XIT]] dans Refined PrUn. PRUNplanner enregistre l'**Origine** et **Acheter sur le CX** dans tes préférences et les partage avec les autres boutons XIT, par ex. dans [Consommation FIO](/help/fio_burn).
