Marché en direct te permet de suivre les prix et les carnets d'ordres sur le [[cx|CX]] pendant que tu échanges. Il affiche les changements sur les quatre échanges de marchandises au fur et à mesure qu'ils arrivent et vérifie chacun d'eux par rapport aux alertes que tu as configurées : tu repères ainsi les mouvements qui t'intéressent sans rien rafraîchir.

## D'où viennent les données {#data-stream-mechanics}

[[fio|FIO]] est le service communautaire alimenté par les clients de jeu des joueurs. Il transmet les mises à jour des échanges à PRUNplanner, qui les fait suivre directement à ton navigateur. Il n'y a pas d'intervalle fixe : les données arrivent dès que FIO reçoit des changements.

- Seuls AI1, CI1, IC1 et NC1 sont diffusés.
- Un couple matériau et échange n'apparaît qu'après que FIO a envoyé une mise à jour pour lui. Les matériaux peu actifs peuvent rester absents longtemps.
- PRUNplanner garde environ les 500 derniers changements. Quand tu ouvres la page, tu reçois d'abord ceux-là, pour que l'aperçu ne soit pas vide, puis les nouveaux au fil de l'eau.

> [!warning]
> Les changements stockés arrivent d'un coup quand tu ouvres la page. Ils reçoivent l'heure de leur arrivée dans ton navigateur, pas l'heure où ils ont eu lieu, et ils passent par tes alertes actives comme des nouveaux.

L'état en haut à droite affiche **Connecté** (vert pulsant), **Reconnexion** ou **Déconnecté**. Si la connexion tombe, ton navigateur se reconnecte tout seul. Si le serveur refuse le flux (par exemple quand trop de flux sont ouverts), la page réessaie après 5 secondes, puis attend plus longtemps après chaque échec, jusqu'à 60 secondes. L'attente double à chaque fois : les tentatives ont donc lieu après 5, 10, 20 et 40 secondes, puis toutes les 60 secondes. Pendant que la page attend, l'état indique **Reconnexion**.

Pas d'inquiétude s'il indique **Déconnecté** un instant. Il l'affiche jusqu'à la première ouverture du flux, et pendant que ton navigateur reconnecte un flux interrompu.

Le serveur accepte jusqu'à 5 flux ouverts par adresse IP : ferme donc Marché en direct dans les onglets dont tu n'as pas besoin.

## Vue en direct {#live-view}

L'aperçu à droite (sous le flux sur les écrans plus étroits) liste chaque couple matériau et échange reçu jusqu'ici, sous la forme `DW.NC1`, trié de A à Z. **Masquer l'aperçu** et **Afficher l'aperçu** l'affichent ou le masquent.

| Colonne                         | Ce qu'elle montre                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticker**                      | le matériau et l'échange                                                                                                                                                                  |
| **Prix (ȼ)** | le prix de la mise à jour                                                                                                                                                                 |
| **Bid (ȼ)**  | l'ordre d'achat le plus élevé ([[bid\|Bid]])                   |
| **Ask (ȼ)**  | l'ordre de vente le plus bas ([[ask\|Ask]])                    |
| **Écart %**                     | (Ask − Bid) ÷ Ask × 100 ([[spread\|écart]]) |
| **Vol. achat**  | les unités de tous les ordres d'achat ouverts                                                                                                                                             |
| **Vol. vente**  | les unités de tous les ordres de vente ouverts                                                                                                                                            |

Chaque changement met à jour les champs qu'il contient. Quand il n'a pas de prix, de Bid ou d'Ask, la dernière valeur reste. Les volumes d'achat et de vente sont ce qui se trouve dans le carnet d'ordres, pas ce qui a été échangé.

Par exemple, un Bid de 90 ȼ et un Ask de 100 ȼ donnent un **Écart %** de (100 − 90) ÷ 100 × 100 = 10 %. Quand le changement n'a ni Bid ni Ask, l'écart utilise à la place le meilleur ordre d'achat ou de vente de son carnet.

## Flux d'alertes {#alert-feed}

Le **Flux d'alertes** liste chaque alerte déclenchée, la plus récente en premier, jusqu'à 500. **Vider le flux** le vide. Le flux n'existe que sur cette page. Il est vidé quand tu quittes Marché en direct, et rien ne t'atteint ailleurs : ni notification, ni son, ni e-mail.

| Colonne                      | Ce qu'elle montre                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| **Ticker / Alerte**          | le matériau et l'échange, avec le nom de l'alerte                                             |
| **Gravité**                  | **BAS**, **MOYENNE** (ambre) ou **HAUTE** (ligne rouge) |
| **Logique de déclenchement** | chaque condition remplie : champ, valeur, opérateur, cible                    |
| **Événement**                | pour les champs numériques : la valeur précédente et la nouvelle              |
| **Heure**                    | l'heure d'arrivée du changement, au format HH:mm:ss           |

Survole une ligne pour voir les valeurs du changement qui l'a déclenchée. Tu obtiens le prix, le Bid, l'Ask, l'écart, les volumes d'achat et de vente avec leur [[vwap|VWAP]] et leur variation, ainsi qu'une barre du volume d'achat face au volume de vente. Les écrans étroits masquent certaines colonnes.

La cloche (**Notifications d'alertes**) met en pause et reprend la vérification des alertes pour cette visite. Elle est activée quand tu ouvres la page, et les changements qui arrivent pendant qu'elle est désactivée ne déclenchent jamais rien.

Tant qu'aucune alerte ne s'est déclenchée, le flux affiche **En attente d'événements de marché déclenchant des alertes...**.

## Historique des données {#data-history}

**Historique des données**, sous le Flux d'alertes, regroupe les changements reçus par minute, en montrant combien de couples matériau et échange en ont envoyé un (« Ticker reçus ») et lesquels. Il garde les 25 dernières minutes qui ont eu des données.

## Moteur d'alertes {#alert-engine}

Une alerte est un ensemble de conditions. Chaque fois qu'un changement arrive pour un couple matériau et échange, PRUNplanner vérifie chaque alerte active par rapport aux nouvelles valeurs et aux valeurs précédentes de ce même couple. Quand les conditions sont remplies, l'alerte ajoute une ligne au flux.

Une condition lit la nouvelle valeur de son champ dans le changement qui arrive, pas dans l'aperçu. Si ce changement ne contient pas le champ, par exemple s'il n'a pas de prix, une condition sur **Prix** n'est pas remplie.

PRUNplanner stocke les alertes dans ce navigateur, pour ton compte uniquement : « Les alertes sont actuellement stockées uniquement sur cet appareil et ne sont pas synchronisées avec ton compte. » Un autre navigateur ou appareil démarre sans elles.

### Configuration {#setup}

Une condition a trois parties : un champ, un opérateur et une cible. Par exemple, **Prix** GT **Valeur** 100.

#### Champs {#fields}

| Champ                                                                                                                                                 | Signification                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Ticker**, **Code d'échange**                                                                                                                        | le ticker du matériau, le code de l'échange (texte)      |
| **Prix**, **Bid**, **Ask**                                                                                                                            | prix, Bid et Ask comme dans l'aperçu                                        |
| **Variation du prix**, **Variation du bid**, **Variation de l'ask**                                                                                   | nouvelle valeur − valeur précédente                                         |
| **Variation du prix (pourcentage)**                                                                                                | Variation du prix ÷ prix précédent × 100                                    |
| **Demande**, **Réserve**                                                                                                                              | la demande et l'offre telles que le changement les indique                  |
| **Échangé**, **Volume**                                                                                                                               | les chiffres d'échange tels que le changement les indique                   |
| **Volume d'achat**, **Volume de vente**                                                                                                               | les unités de tous les ordres d'achat ou de vente ouverts                   |
| **Variation du volume d'achat (abs.)**, **Variation du volume de vente (abs.)** | de combien ce volume a changé, sans signe                                   |
| **VWAP d'achat**, **VWAP de vente**                                                                                                                   | le prix moyen pondéré par les unités des ordres d'achat ou de vente ouverts |
| **Meilleur prix bid**, **Meilleur prix ask**                                                                                                          | l'ordre d'achat le plus élevé, l'ordre de vente le plus bas du carnet       |
| **Écart**, **Écart (pourcentage)**                                                                                                 | Ask − Bid, et la même chose en pourcentage de l'Ask                         |

**Variation du prix**, **Variation du bid**, **Variation de l'ask** et **Variation du prix (pourcentage)** ont besoin d'une valeur précédente : ils sont donc vides au premier changement d'un couple matériau et échange. Les deux champs de variation de volume valent alors 0.

Par exemple, quand le prix précédent était de 200 ȼ et que le nouveau est de 210 ȼ, **Variation du prix** vaut 210 − 200 = 10 et **Variation du prix (pourcentage)** vaut 10 ÷ 200 × 100 = 5.

#### Comparaisons {#comparisons}

Les champs numériques proposent :

- GT : supérieur à
- LT : inférieur à
- EQ : égal à
- NEQ : différent de

**Ticker** et **Code d'échange** ne proposent que MATCHES, qui signifie égal, sans tenir compte des majuscules et minuscules. Leur cible est toujours un texte fixe (affiché comme **Texte**).

#### Cibles de comparaison {#comparison-targets}

| Cible          | Compare le champ avec                                                                                                | Utile pour                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Valeur**     | un nombre fixe (ou un texte) que tu saisis                                                        | les prix plancher et plafond, un seul matériau ou échange |
| **Précédent**  | la valeur précédente du champ pour ce couple matériau et échange (**Point de données précédent**) | n'importe quel changement, les sauts soudains             |
| **Décalage %** | la valeur précédente × (1 + décalage ÷ 100)                                                       | les mouvements d'une ampleur donnée                       |

**Précédent** et **Décalage %** ne se déclenchent jamais au premier changement d'un couple matériau et échange, car il n'y a encore rien à comparer.

Par exemple, **Prix** GT **Décalage %** 2 se déclenche quand le prix monte de plus de 2 % depuis le dernier changement. **Prix** LT **Décalage %** −2 se déclenche sur une baisse de plus de 2 %. Avec un prix précédent de 100 ȼ, la cible du premier exemple est 100 × (1 + 2 ÷ 100) = 102 ȼ : un nouveau prix de 102,50 ȼ déclenche l'alerte, 101,90 ȼ non.

#### Opérateurs logiques {#logical-operators}

Les conditions se trouvent dans un groupe, et **Correspondance** définit comment le groupe les combine :

- AND : chaque condition du groupe doit être remplie.
- OR : une seule condition remplie suffit.

Un groupe peut contenir d'autres groupes (**Groupe**). Cela te permet de construire quelque chose comme (**Ticker** MATCHES RAT AND (**Variation du prix (pourcentage)** GT 2 OR **Variation du prix (pourcentage)** LT −2)). La colonne **Logique de déclenchement** du flux liste les conditions qui ont déclenché l'alerte. Pour OR, c'est la première remplie.

Un groupe AND sans conditions compte comme rempli. Une alerte active dont le groupe principal est encore vide se déclenche donc à chaque changement.

### Créer des alertes {#setting-up-alerts}

Tant que tu n'en as pas créé, le gestionnaire d'alertes indique « Aucune alerte trouvée. Commence par créer ton premier signal de détection ».

1. Appuie sur **Ouvrir le gestionnaire d'alertes**.
2. Appuie sur **Créer une alerte**. Une alerte en pause nommée **Nouvelle alerte**, de gravité **BAS** et avec un groupe AND vide, apparaît aussitôt dans la liste.
3. Survole l'alerte et appuie sur **Modifier** pour ouvrir **Modifier l'alerte**.
4. Définis **Nom de l'alerte** et **Gravité** (**BAS**, **MOYENNE**, **HAUTE**).
5. Sous **Configuration de la logique**, règle **Correspondance**. Ajoute des conditions avec **Condition** (une nouvelle démarre comme **Demande** EQ **Valeur** 0) ou des groupes imbriqués avec **Groupe**. **Retirer** supprime une condition ou un groupe imbriqué, mais ne fait rien sur le groupe principal. Un groupe sans conditions affiche **Groupe vide**.
6. Passe le **Statut** de **En pause** à **Actif**.
7. Appuie sur **Enregistrer**, ou sur **Supprimer** pour abandonner tes modifications.

> [!tip]
> Ajoute au moins une condition avant de passer une alerte en **Actif**. Une alerte active avec un groupe vide remplit le flux avec chaque changement.

Pour modifier une alerte plus tard, survole-la et appuie sur **Modifier**. **Supprimer** la retire immédiatement. La liste affiche le nom de chaque alerte et si elle est **Actif** ou **En pause**, et **Fermer le gestionnaire d'alertes** masque à nouveau la liste.
