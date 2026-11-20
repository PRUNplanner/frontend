La [Gestion](/manage) est l'endroit où tu organises ton compte. Tu y crées et supprimes des empires et des préférences d'échange, relies chaque empire à ses prix et décides quels plans appartiennent à quel empire. Tu t'en serviras pour configurer ton premier empire et ta première préférence d'échange, puis pour déplacer des plans entre empires ou supprimer ceux dont tu n'as plus besoin.

## Notions de base {#core-concepts}

PRUNplanner range ta planification dans trois types d'éléments, et chacun a sa propre section sur la page.

### Plans {#plans}

Un [[plan|plan]] est une base : sa planète, ses bâtiments, ses recettes et ses bonus. Tu crées un plan à partir d'une planète dans la [Recherche de planètes](/search). Un plan peut se trouver dans plusieurs empires à la fois, ou dans aucun. Tu peux ainsi le réutiliser dans un empire de tes bases réelles et dans un autre pour une future expansion.

Un plan n'a pas de préférence d'échange à lui. Il utilise la [[exchange-preference|préférence d'échange]] de son empire. S'il est dans plusieurs empires, il utilise celle de l'empire avec lequel il est calculé, que tu choisis sur le plan (voir [Empire et prix](/help/plan_base#empire-and-prices)).

### Empires {#empires}

Un [[empire|empire]] est un groupe de plans, par exemple toutes les bases que tu fais tourner dans le jeu, ou un ensemble que tu veux comparer. Il contient ta [[faction|faction]] et tes [[area-permits|permis]], qui modifient le bonus de production de chaque plan qu'il contient, et il utilise une préférence d'échange pour ses prix. La page [Empire](/help/empire) affiche les chiffres d'un empire.

La faction et les permis comptent parce qu'ils déterminent le bonus de [[faction|faction]] : les bâtiments de l'expertise de ta faction obtiennent un bonus d'autant plus grand que tu utilises peu de tes permis. Par exemple, avec 1 permis utilisé sur 2, PRUNplanner compte 4 fois le bonus de base de la faction, et avec 2 sur 2, deux fois. C'est pourquoi la page te demande de donner à chaque empire ta faction et les bons permis, pour que l'efficacité des plans soit juste.

### CX {#cx}

Une préférence d'échange contient tes règles de prix : quel [[cx|échange]] et quelle base de prix utiliser, et des prix fixes. Une préférence peut servir plusieurs empires, mais un empire n'en utilise qu'une. Tu modifies ses règles sur [Bourses](/help/exchanges).

## Configuration de l'empire {#empire-configuration}

Le tableau **Configuration de l'empire** liste tes empires avec leur faction, leurs permis (utilisés / total), leur nombre de plans et la préférence d'échange dans la colonne CX. Tant que tu n'en as pas, le tableau indique « Aucun empire disponible », et c'est avec **Nouvel empire** que tu commences.

- **Nouvel empire** ouvre un formulaire avec **Nom de l'empire** (obligatoire, jusqu'à 100 caractères), **Faction**, **Permis total** (au moins 2) et **Permis utilisés** (au moins 1, pas plus que le total). **Créer** enregistre l'empire immédiatement.
- Choisis la préférence d'échange de l'empire dans la colonne CX, ou choisis « Aucune » pour obtenir les prix Univers · VWAP 30j. Cette modification attend la barre d'enregistrement.
- Supprimer un empire demande d'abord confirmation. Ses plans ne sont pas supprimés. Ils perdent seulement cet empire.

Tu peux modifier plus tard le nom, la faction et les permis d'un empire sur la page [Empire](/help/empire#configuration).

## Configuration CX {#cx-configuration}

Le tableau **Configuration CX** liste tes préférences d'échange et indique si un empire les utilise (**Oui** avec le nombre d'empires, ou **Non**).

- Le bouton au-dessus du tableau ouvre un formulaire pour une nouvelle préférence. Donne-lui un nom de 100 caractères au plus et appuie sur **Créer**, qui l'enregistre immédiatement.
- Clique sur le nom d'une préférence pour modifier ses règles sur [Bourses](/exchanges).
- Supprimer une préférence demande d'abord confirmation et supprime toutes ses règles. Les empires qui l'utilisaient continuent de fonctionner, mais sans préférence : attribue-leur-en donc une autre. D'ici là, ils obtiennent les prix Univers · VWAP 30j, comme avec « Aucune ».

## Attribution plans ↔ empires {#assignments}

Ce tableau a une ligne par plan et une colonne de cases à cocher par empire. Coche une case pour mettre le plan dans cet empire, et décoche-la pour l'en retirer. Tant que tu n'as pas enregistré, les cases modifiées sont marquées « Sera ajouté à … » ou « Sera retiré de … ».

- **Rechercher un plan ou une planète**, **Dans l'empire** et le filtre des plans non assignés uniquement réduisent les lignes. La case dans l'en-tête de la colonne d'un empire ajoute ou retire tous les plans qu'affichent la recherche et les filtres.
- Chaque ligne a des **Actions**. **Cloner** copie le plan sous le nom « nom (clone) », enregistré immédiatement et dans aucun empire. **Partager…** crée un lien de partage (voir [Partager un plan](/help/plan_sharing#share-link)). **Supprimer…** supprime le plan après confirmation, et tu ne peux pas l'annuler.
- Pour supprimer plusieurs plans, coche-les dans la première colonne et appuie sur **Supprimer la sélection…**. La case dans l'en-tête de cette colonne coche tous les plans qu'affichent la recherche et les filtres, y compris ceux qu'il faudrait faire défiler pour voir. Tu confirmes une seule fois pour tous. Si certains plans ne peuvent pas être supprimés, ils restent cochés et un message indique combien, pour que tu puisses réessayer.
- Si la recherche et les filtres ne laissent aucune ligne, le tableau indique « Aucun plan ne correspond à la recherche et aux filtres. »

Sur téléphone, le tableau se transforme en liste de cartes.

## Enregistrer {#saving}

Les choix de préférence d'échange et les cases d'attribution s'accumulent dans la barre d'enregistrement en bas. Elle compte tes modifications, **Enregistrer les modifications** les enregistre toutes et **Annuler** les abandonne. Après un enregistrement, « Toutes les modifications sont enregistrées » s'affiche quelques secondes. Si l'enregistrement échoue, tes modifications restent et tu peux cliquer sur **Réessayer**. La page te demande confirmation avant que tu partes avec des modifications non enregistrées.

Créer, supprimer et cloner enregistrent immédiatement, sans la barre d'enregistrement.
