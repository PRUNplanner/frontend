[Consommation FIO](/fio/burn) te dit quelle base doit être réapprovisionnée en premier et prépare le chargement [[xit|XIT]] correspondant. Elle montre combien de jours dure le stock de chacune de tes bases, d'après tes plans et ton vrai stockage issu de [[fio|FIO]].

## Avant de commencer {#before-you-start}

- Il te faut une [connexion FIO](/help/profile#fio-connection). Sans elle, la page te demande de connecter FIO dans ton profil.
- La page affiche un seul [[empire]], que tu choisis sous **Empire**. Cela en fait aussi ton **Empire par défaut**. Sans empire, la page propose **Créer un empire**.
- Chaque plan de l'empire doit se trouver sur la planète d'une base que tu as dans le jeu. Si FIO n'a pas de stockage de base sur la planète d'un plan, chaque stock compte pour 0. Si un plan affiche 0 pour tous ses stocks, vérifie qu'il est bien sur la planète où se trouve ta base.

L'en-tête indique quand FIO a mis à jour tes données pour la dernière fois (« Mise à jour des données FIO »). [Profil](/help/profile#fio-connection) explique à quel point elles sont fraîches.

## Calculs {#calculations}

Consommation FIO calcule chaque plan de l'empire, de la même façon que la page Empire, et prend les [[material-io|E/S des matériaux]] de chaque plan (besoins de production et de main-d'œuvre).

Pour chaque matériau que le plan utilise en plus grande quantité qu'il n'en produit :

_jours restants = stock ÷ consommation nette quotidienne_

Le stock est la quantité de ce matériau dans le stockage de ta base sur la planète du plan, d'après FIO. Un matériau que le plan produit autant qu'il en utilise, ou plus, ne s'épuise jamais (« produit ici »). La **Consommation** d'un plan est son plus petit nombre de jours restants.

La consommation nette quotidienne est ce que le plan utilise du matériau par jour moins ce qu'il en produit. Le tableau du plan l'affiche comme un **Delta** négatif (production − consommation), donc un **Delta** de −30 signifie 30 net par jour. Par exemple, un plan qui utilise 40 unités d'un matériau par jour et en produit 10 en consomme 30 net par jour. Avec 300 en stock, cela dure 300 ÷ 30 = 10 jours.

Consommation FIO ne compte pas :

- Les entrepôts et les vaisseaux. Elle ne regarde que le stockage de la base sur la planète.
- La [[degradation|dégradation]] et les matériaux de réparation, qui ne font pas partie des E/S des matériaux. Utilise [Réparer FIO](/help/fio_repair) pour cela.
- Ce qui tourne réellement dans le jeu. Les chiffres viennent de ton plan, donc si le plan diffère de ta base, tu obtiendras d'autres nombres de jours.

> [!warning]
> Chaque plan compte tout le stockage de sa planète. Si deux plans du même empire sont sur une même planète, les deux voient tout le stock, donc les jours restants sont surestimés. Garde un seul plan par planète dans l'empire que tu vérifies.

## Seuils {#thresholds}

Les couleurs montrent à quelle vitesse un matériau s'épuise, en _jours d'approvisionnement restants_ :

- **Rouge** : jours restants inférieurs ou égaux au seuil rouge (5 par défaut).
- **Jaune** : jours restants inférieurs ou égaux au seuil jaune (10 par défaut).

Avec les valeurs par défaut (rouge à 5, jaune à 10), un matériau avec 4 jours restants s'affiche en rouge, un avec 8 en jaune, et un avec 12 n'a pas de couleur.

Tu peux régler les deux sous **Seuils de consommation** sur cette page ou dans [Profil](/help/profile#preferences) (**Seuil rouge**, **Seuil jaune**). C'est la même préférence, enregistrée dans ton compte. Les deux valent au moins 1. Garde le jaune au-dessus du rouge, sinon rien ne s'affiche en jaune.

## Aperçu de la consommation des plans {#overview}

**Aperçu de la consommation des plans** donne une ligne par plan, avec la **Consommation** du plan et une bande qui a un point par matériau consommé, placé à ses jours restants. La bande va de 0 à trois fois le seuil jaune, et les matériaux au-delà sont comptés en « +n ». Survole ou touche un point pour voir de quel matériau il s'agit. Le résumé compte les matériaux rouges et jaunes.

## Tableau des plans {#plan-table}

À côté de l'aperçu (en dessous sur les écrans plus étroits), chaque plan a une ligne avec son **Épuisement** (le plus petit nombre de jours restants) et un bouton XIT. Déplie la ligne pour voir quel matériau s'épuise en premier, combien d'autres sont sous le seuil jaune, et combien le plan produit lui-même. Son tableau liste chaque matériau avec **Consommation** et **Production** (les deux sur grand écran uniquement), **Delta**, **Stock**, une barre **Autonomie** et sa **Consommation** en jours.

## Réapprovisionnement XIT {#xit-resupply}

Le bouton XIT ouvre le réapprovisionnement de la base de ce plan (**Réapprovisionnement XIT : {plan_name}**) :

| Commande                | Ce qu'elle fait                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origine**             | Où le vaisseau charge : **Configurer à l'exécution** ou l'entrepôt d'une station. La valeur par défaut vient de **Origine XIT** dans le profil.                                                 |
| **Jours cibles**        | Combien de jours d'approvisionnement apporter. La valeur par défaut vient de **Jours de réapprovisionnement** dans le profil (20).                                                           |
| **Acheter sur le CX**   | Achète d'abord les matériaux sur l'échange de l'origine. Ne fonctionne qu'avec un entrepôt comme origine. La valeur par défaut vient de **XIT : acheter au CX** dans le profil. |
| **Adapter au vaisseau** | 500, 1k, 2k, 3k/1k, 1k/3k ou 5k (t / m³). Règle le plus grand nombre de jours, jusqu'à 100, dont le chargement tient.                                                                        |
| **Masquer les infinis** | Masque les matériaux qui ne s'épuisent jamais.                                                                                                                                                                                  |

**Adapter au vaisseau** écrit son résultat dans **Jours cibles**. Il part des jours qui y sont réglés, retire des jours jusqu'à ce que le chargement tienne à la fois dans le poids et dans le volume du vaisseau, puis ajoute des jours tant que cela tient encore.

**Origine**, **Jours cibles** et **Acheter sur le CX** sont tes préférences de profil. Un changement ici est enregistré dans ton compte. L'origine et l'achat s'appliquent aussi aux autres actions XIT, comme celles de Réparer FIO et des paniers du plan.

La quantité par matériau est ce qui complète le stock jusqu'aux jours cibles : consommation nette quotidienne × jours − stock, arrondie au supérieur, jamais en dessous de 0. Tu peux décocher un matériau ou remplacer sa quantité. Les totaux affichent le poids, le volume et le prix. Le prix est une estimation aux prix d'achat Univers · VWAP 30j, pas à ta préférence d'échange, donc il peut différer de ce que tu paies sur l'échange de l'origine.

Dans l'exemple de [Calculs](/help/fio_burn#calculations), avec **Jours cibles** à 20, la quantité est de 30 × 20 − 300 = 300 unités, ce qui porte le stock à 600, soit 20 jours de consommation nette.

**Copier XIT JSON** copie le paquet (« PRUNplanner Burn Supply ») pour Refined PrUn. Avec **Acheter sur le CX**, il achète d'abord sur l'échange de l'origine puis transfère le chargement. Tu choisis la destination quand tu l'exécutes.
