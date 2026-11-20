Nouveau sur PRUNplanner ? Ce guide prend environ 15 minutes. À la fin, tu auras :

- ton [[empire]] configuré avec ta faction et tes permis,
- des prix qui viennent de l'échange que tu choisis,
- un premier [[plan]] enregistré dont tu sais lire le bénéfice et l'amortissement.

C'est un parcours rapide. Les pages indiquées à la fin de chaque étape vont plus loin quand tu veux les détails.

Il te faut un compte. Un nouveau compte a déjà un empire et une [[exchange-preference|préférence d'échange]], donc l'essentiel consiste à vérifier et ajuster.

## 1. Vérifie ton empire {#step-1}

Un empire est un groupe de plans qui partagent une faction, des permis et une préférence d'échange, donc ce que tu règles ici s'applique à chaque plan qu'il contient.

![L'étape Ton empire sur la page Empire d'un nouveau compte, avec Faction, Permis total, Permis utilisés et Enregistrer](/images/help/guides/first-base-empire.webp)

Ouvre [Empire](/empire). Un nouveau compte a un empire, « My Empire », sans [[faction]] et avec 1 permis utilisé sur 2. Tant qu'il n'a pas de plans, la page affiche trois étapes. La première, **Ton empire**, contient ses réglages.

1. Choisis ta **Faction**. Elle donne un bonus aux bâtiments de son [[expertise]] dans chaque plan de l'empire.
2. Règle **Permis total** et **Permis utilisés** sur ce qu'affiche ton buffer `HQ` dans le jeu. Moins tu utilises de permis, plus le bonus de faction est élevé.
3. Appuie sur **Enregistrer**.

Quand l'étape affiche **Enregistré**, tu as fini ici. Une fois que l'empire a des plans, tu retrouves les mêmes champs dans l'encadré **Configuration** de la page Empire.

> [!tip]
> Une fois que l'empire a des plans, l'encadré **Configuration** avertit « Écart détecté » quand **Permis utilisés** diffère du total des permis de tes plans. Il vérifie pendant que tu tapes, donc l'avertissement peut apparaître en cours de saisie. Pas d'inquiétude, c'est seulement un rappel pour faire correspondre les chiffres au jeu. L'étape de démarrage ci-dessus ne l'affiche pas.

> [!tip]
> Tu veux un deuxième empire, par exemple pour tester une expansion sans toucher à tes vraies bases ? Crée-le dans [Gestion](/manage) avec **Nouvel empire**.

En savoir plus : [Configuration de l'empire](/help/empire#configuration), [Bonus de faction](/help/plan_base#faction).

## 2. Règle ton échange principal {#step-2}

Tes prix viennent de ta préférence d'échange, et les recettes, les coûts et le bénéfice de chaque plan sont calculés à ces prix. Un nouveau compte a « My Exchange Preference », qui est déjà liée à « My Empire ». Elle est réglée sur **Universe · VWAP 30j**, la moyenne sur 30 jours des quatre échanges. Tu peux aussi prendre tous les prix d'un seul échange à la place.

![Bourses avec Toutes les planètes ouvert : l'encadré Prix d'échange avec ses préréglages, Identique pour l'achat et la vente et les boutons des échanges](/images/help/guides/first-base-exchange.webp)

1. Ouvre [Bourses](/exchanges). La page ouvre ta préférence. Si tu en as plusieurs, **Changer de préférence** en choisit une autre.
2. Dans la liste à gauche, ouvre **Toutes les planètes**.
3. Dans l'encadré **Prix d'échange**, garde **Identique pour l'achat et la vente** et choisis ton échange principal : AI1 à Antares Station, CI1 à Benten, IC1 à Hortus ou NC1 à Moria.
4. Choisis une base de prix, ou clique sur le préréglage **Moyenne · VWAP 30j**.
5. Appuie sur **Enregistrer les modifications** dans la barre du bas.

> [!tip]
> Le [[vwap|VWAP]] est le prix moyen pondéré par le volume : les crédits payés pour un matériau ÷ les unités échangées. Par exemple, disons qu'un échange a vu s'échanger 30 unités à 200 ȼ, 40 à 210 ȼ, 10 à 215 ȼ et 20 à 220 ȼ. Le VWAP vaut (6 000 + 8 400 + 2 150 + 4 400) ÷ 100 = 20 950 ÷ 100 = 209,50 ȼ. Les prix derrière lesquels il y a plus d'unités comptent davantage.
>
> Le VWAP 7j fait la moyenne des transactions des 7 derniers jours, le VWAP 30j celle des 30 derniers. Un échange seul n'utilise que les transactions faites chez lui. Univers additionne les transactions d'AI1, CI1, IC1 et NC1 en une seule moyenne.

Si l'**Aperçu** affiche la nouvelle règle sous **Toutes les planètes**, c'est bon. Une fois que tu as des plans, l'Aperçu liste chaque prix qu'ils utilisent, et les prix en orange marquent les matériaux qui comptent pour 0 ȼ. Cela veut seulement dire que l'échange que tu as choisi n'a pas de prix pour eux, et PRUNplanner n'en prend pas sur un autre échange. Avec le VWAP, cela n'arrive qu'après 30 jours sans transaction sur cet échange. Avant cela, le VWAP 7j se rabat sur le prix du dernier jour où le matériau s'est échangé.

Les empires que tu crées plus tard démarrent sans préférence et sont valorisés à Univers · VWAP 30j. Tu leur en attribues une dans [Gestion](/manage), dans la colonne **CX** de **Configuration de l'empire**.

Détails : [Configurer tes prix](/help/guide_cx_prices), [Définir une règle d'échange](/help/exchanges#exchange-rule).

## 3. Trouve une planète {#step-3}

Ouvre [Recherche de planètes](/search).

![Recherche de planètes avec un filtre FEO et une limite de 5 sauts depuis NC1, les filtres à gauche et les planètes correspondantes à droite](/images/help/guides/first-base-search.webp)

1. Sous Matériaux, utilise **+ ajouter un matériau…** pour ajouter ce que tu veux produire ou extraire. Chaque option indique combien de planètes tu obtiendrais.
2. Sous **Distance**, coche ton échange principal sous **Échanges** et baisse **Sauts max.**, pour que les vols de ravitaillement restent courts.
3. Active **Parcelles** sous **Colonnes** pour voir quelles planètes ont encore des [[plots|parcelles]] libres.

Tu cherches une courte liste où la tuile du matériau est verte ou jaune (proche du rendement de la meilleure planète), avec peu de sauts et des parcelles libres. Un ⊘ rouge à côté d'un nom signifie que la planète est pleine.

Plus : [Trouver une planète pour un matériau](/help/guide_find_planet), [Recherche de planètes](/help/planet_search#materials).

## 4. Crée le plan {#step-4}

Clique sur « + » sur la ligne de la planète. Un nouveau plan pour cette planète s'ouvre dans un nouvel onglet, pour que tu ne perdes pas ta recherche.

![Un nouveau plan avec les tuiles de résultats en haut, Empire et prix, Planète et Production](/images/help/guides/first-base-plan.webp)

1. **Empire et prix** : **Calculer avec l'empire** affiche l'empire avec lequel le plan est calculé. Un nouveau plan démarre avec ton premier empire, et quand tu crées le plan, il rejoint l'empire sélectionné à cet endroit. **Prix** nomme la préférence d'échange qu'il utilise.
2. **Planète** : le menu **COGC** démarre sur le programme que la planète fait tourner en ce moment. Pour une première base, laisse **Permis** à 1 (500 de surface).
3. Production : choisis un bâtiment dans le menu des bâtiments, puis clique sur **+ Recette** et choisis une [[recipe|recette]]. Règle **Nombre** sur le nombre que tu construis. Pour une extraction, clique plutôt sur une tuile de ressource sous **Planète**. Cela ajoute l'extracteur et sa recette.
4. **Infrastructures** : laisse **Auto** activé. Il choisit les habitations les moins chères qui logent tous tes travailleurs.

> [!tip]
> Sur une planète où beaucoup de joueurs planifient, un plan vide propose une carte « Partir d'une configuration typique sur … » avec les bâtiments et les experts que les autres y utilisent. Elle montre ce que les autres planifient, pas ce qui rapporte le plus, donc vérifie les chiffres avant de la garder.

En savoir plus : [Configuration de la base](/help/plan_base), [Production et recettes](/help/plan_production#adding-buildings).

## 5. Lis les résultats {#step-5}

Les tuiles du haut se mettent à jour à chaque modification.

![Les tuiles de résultats d'un plan : Bénéfice / jour, Amortissement, Main-d'œuvre, Surface et Stockage, ici avec une perte et trop de surface en rouge](/images/help/guides/first-base-results.webp)

| Tuile               | Ce qu'il faut regarder                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bénéfice / jour** | Positif. Ce sont les recettes moins les matériaux achetés, la [[degradation\|dégradation]] et les [[production-fees\|frais de production]]. |
| **Amortissement**   | Le nombre de jours avant que la base se soit payée. « jamais » signifie qu'elle ne fait pas de bénéfice.                                    |
| **Main-d'œuvre**    | Le rouge signifie qu'une catégorie a moins de lits que de travailleurs.                                                                     |
| **Surface**         | Le chiffre utilisé passe au rouge quand la base a besoin de plus de surface que ce que tes permis donnent.                                  |
| **Stockage**        | Le nombre de jours avant que le stockage soit plein, ce qui te dit à quelle fréquence un vaisseau doit passer.                              |

Les [[material-io|E/S des matériaux]] à droite listent ce que la base produit et utilise par jour. Un Δ positif est vendu, un négatif est acheté. Un signalement après un matériau signifie que le marché pourrait ne pas absorber cette quantité. Clique dessus pour ouvrir le contrôle du plan.

> [!tip]
> Essaie un changement à la fois et regarde **Bénéfice / jour** : une autre recette, un bâtiment de plus, ou un produit de luxe désactivé dans **Main-d'œuvre**. **Annuler** (Ctrl+Z) revient sur un changement.

Détails : [Résultats](/help/plan_results), [Contrôle du plan](/help/plan_check#market-check).

## 6. Enregistre le plan {#step-6}

1. Clique sur le crayon à côté du nom du plan et tape un nom.
2. Appuie sur **Créer** (ou Ctrl+S, Cmd+S sur Mac).

Une fois que l'état indique « Enregistré … », le menu latéral liste le plan sous **Plans** chaque fois qu'il affiche l'empire du plan. À partir de là, chaque enregistrement garde une version, et PRUNplanner conserve les modifications non enregistrées comme brouillon, donc fermer l'onglet ne fait rien perdre.

Plus : [Enregistrement et versions](/help/plan_saving).

## Ensuite {#next}

- [Trouver une planète pour un matériau](/help/guide_find_planet) : tire le meilleur de chaque filtre de la recherche de planètes.
- [Configurer tes prix](/help/guide_cx_prices) : règles d'achat et de vente, exceptions par planète et prix fixes.
- [Grandir jusqu'à un empire](/help/guide_empire) : pour quand tu planifies ta deuxième base.
