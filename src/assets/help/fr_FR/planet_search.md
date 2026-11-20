Utilise **Recherche de planètes** pour retrouver une planète que tu connais déjà, ou les meilleurs endroits pour une nouvelle production. C'est le point de départ avant un [[plan|plan]]. Tu filtres toutes les planètes par ressources, conditions, [[cogc|COGC]], infrastructures et [[jumps|sauts]], puis tu compares côte à côte les quelques meilleures. Elle fonctionne sans compte, et les résultats se mettent à jour dès que tu modifies un filtre.

## Où la trouver {#where-to-find-it}

La Recherche de planètes se trouve dans le groupe Planification de la navigation, et sur la page d'accueil. Quand tu n'es pas connecté, une ligne sous le titre indique qu'elle est gratuite et sans compte. Tu n'as besoin de te connecter que pour les distances jusqu'à tes propres plans et pour créer un plan à partir d'un résultat.

D'autres pages y mènent aussi. [Chaînes de production](/help/tools_production_chain) ouvre la Recherche de planètes depuis le sélecteur de planète d'une étape d'extraction et depuis un constat d'emplacement, et la page Empire y renvoie pendant que tu prépares tes premiers plans.

## Nom ou ID {#name-or-id}

Tape une partie d'un nom ou d'un ID dans le champ en haut (**Nom de planète ou de système, ou ID**). La recherche porte sur l'ID naturel de la planète (« OT-580b »), son nom (« Montem »), son nom dans le jeu (« Antares II e ») et le nom de son système, donc « Antares II » liste toutes les planètes de ce système.

Une recherche par nom affiche toutes les planètes qui correspondent, même quand tes filtres en masqueraient certaines. Une note au-dessus des résultats indique alors que tes filtres sont en pause.

- _Appliquer les filtres_ combine à nouveau le nom avec tes filtres. La note indique alors combien de planètes correspondantes les filtres masquent. Elle propose aussi jusqu'à trois modifications qui en afficheraient davantage, chacune avec le nombre de planètes qu'elle ajoute.
- _Tout afficher_ remet les filtres en pause.

Tes filtres sont conservés dans les deux cas. Une fois le nom effacé, la recherche par nom suivante recommence avec les filtres en pause. Si les filtres ne masquent aucune des correspondances, il n'y a pas de note.

> [!tip]
> Tu cherches une planète dont quelqu'un a parlé dans le chat ? Tape son nom. Pas besoin d'effacer tes filtres d'abord.

## Matériaux {#materials}

Tu peux chercher un ou plusieurs groupes de matériaux.

- Chaque groupe correspond à **au moins un de** ou à **tous les** matériaux qu'il contient. Un nouveau groupe commence en **au moins un de**.
- Les groupes se combinent avec **tous les groupes** (par défaut) ou **au moins un groupe**.
- **+ ajouter un matériau…** ajoute un matériau à un groupe, et chaque option indique combien de planètes tu obtiendrais avec. × retire un matériau, **Retirer** retire un groupe entier, et **+ Ajouter un groupe** en ajoute un.

Cela couvre des recherches comme « (FEO et H2O) ou (MAG et O) » : deux groupes **tous les**, combinés avec **au moins un groupe**.

Tu peux donner à chaque matériau une [[extraction|extraction]] quotidienne minimale (« min. … /jour »). C'est le taux quotidien de la planète pour ce matériau, et un plan y construit sa recette EXT, RIG ou COL à partir de lui : un minimum plus élevé garde donc les planètes où chaque extracteur rapporte davantage. Le « (max. …) » à côté est l'extraction quotidienne la plus élevée de ce matériau sur toutes les planètes, pour que tu saches ce qui est possible. Un minimum appartient au matériau, pas au groupe. Si le même matériau figure dans deux groupes, ils partagent un seul minimum.

## Conditions de la planète {#planet-conditions}

Choisis des planètes **Rocheuse** et/ou **Gazeuse**, et indique si elles doivent être **Fertile** (permettre l'agriculture). Une nouvelle recherche commence avec les planètes rocheuses uniquement. Une surface reste toujours cochée.

La [[fertility|fertilité]] ne compte que pour les fermes (FRM et ORC). Sur une planète qui n'en a pas, PRUNplanner met leur efficacité à 0, donc elles n'y produisent rien.

La gravité, la pression et la température ne comptent qu'à travers les [[extra-building-materials|matériaux de construction supplémentaires]] qu'elles exigent. Sous **Accepter les matériaux de construction supplémentaires**, coche ceux que tu es prêt à faire venir :

| Matériau | Nécessaire pour        |
| -------- | ---------------------- |
| MGC      | **Gravité faible**     |
| BL       | **Gravité élevée**     |
| SEA      | **Pression basse**     |
| HSE      | **Pression élevée**    |
| INS      | **Température basse**  |
| TSH      | **Température élevée** |

Ces matériaux comptent parce qu'un plan sur cette planète les ajoute à la construction de chaque bâtiment : ils augmentent donc son coût de construction. Par exemple, un bâtiment d'une surface de 20 a besoin de 20 × 4 = 80 MCG sur une planète rocheuse, et sur une planète à basse température de 20 × 10 = 200 INS en plus.

La Recherche de planètes masque les planètes qui exigent un matériau que tu n'as pas coché. Si aucun n'est coché, tu ne vois que les planètes qui n'en exigent aucun. Le matériau de surface (MCG sur les planètes rocheuses, AEF sur les gazeuses) est toujours nécessaire et ne fait pas partie de ce filtre.

## COGC et infrastructures {#cogc-and-infrastructure}

**Programme COGC actif** garde les planètes qui font tourner l'un des programmes cochés en ce moment, c'est-à-dire au moment où tu as ouvert la page. La liste contient tous les programmes : les programmes publicitaires de chaque industrie et les programmes de main-d'œuvre de chaque niveau.

Un programme compte parce qu'il accélère la production dans un plan : un programme publicitaire accélère de 25 % les bâtiments de son expertise, et un programme de main-d'œuvre accélère de 10 % les bâtiments qui emploient ce niveau. Dans le jeu, les résidents (les joueurs qui ont une base sur la planète) votent pour le programme, et le programme gagnant tourne pendant une semaine : le programme que tu vois ici peut donc changer plus tard.

**Infrastructures** est un filtre à part, et plus strict. Une planète doit avoir chacun des bâtiments cochés.

| Code | Bâtiment                        |
| ---- | ------------------------------- |
| LM   | **Marché local**                |
| COGC | **Chambre de Commerce Globale** |
| WAR  | **Entrepôt**                    |
| ADM  | **Centre d'administration**     |
| SHY  | **Chantier naval**              |

Les pastilles affichent le code. Survole-en une pour voir le nom.

## Décomptes et Tous {#counts-and-any}

Le nombre à côté d'une option non cochée t'indique combien de planètes tu obtiendrais en la cochant. Tu retrouves les mêmes décomptes dans la liste d'ajout de matériaux, à côté des échanges et à côté de tes plans.

Conditions de la planète, Accepter les matériaux de construction supplémentaires, Programme COGC actif et Infrastructures ont chacun un bouton _Tous_ dans leur en-tête. Il règle la section sur l'état qui masque le moins de planètes, et indique combien de planètes cela donne :

- Conditions de la planète : les deux surfaces, fertilité non exigée.
- Accepter les matériaux de construction supplémentaires : tous acceptés.
- Programme COGC actif : aucun coché.
- Infrastructures : aucune cochée.

Quand la section est déjà dans cet état, le bouton est mis en évidence et ne peut pas être cliqué.

## Distance {#distance}

Sous **Distance**, choisis des **Échanges** et/ou des plans de l'un de tes [[empire|empires]]. Une planète doit se trouver à **Sauts max.** au plus de chacun de tes choix. Les sauts se comptent entre systèmes stellaires, donc toutes les planètes d'un système ont la même distance, et une planète sans itinéraire de sauts vers un choix ne passe pas. Par exemple, avec NC1 et l'un de tes plans choisis et Sauts max. à 5, une planète à 3 sauts de NC1 et à 6 de ton plan est masquée. Sauts max. va de 0 à 30 et commence à 10. Il ne compte qu'une fois que tu as choisi quelque chose.

- **Plans de l'empire** choisit l'empire dont tu peux sélectionner les plans. Il part de l'empire qui contient la plupart des plans de ta recherche, sinon de ton empire actuel ou par défaut. Changer d'empire retire les plans que tu avais choisis.
- La liste des plans a un champ de filtre où tu peux taper un nom de plan, un ID de planète ou un nom de planète.
- Chaque plan choisi apparaît comme une pastille que tu peux retirer, et a sa propre colonne de sauts dans les résultats.

AI1, CI1, IC1 et NC1 ont aussi leurs propres colonnes de sauts, et tu peux les masquer sous **Colonnes**.

Les distances jusqu'à tes propres plans nécessitent une connexion. Quand tu n'es pas connecté, la section l'indique et propose **Se connecter**. La Recherche de planètes retire les plans d'un lien partagé par quelqu'un d'autre, car ce ne sont pas les tiens.

> [!tip]
> Pour trouver une deuxième base près de la première, choisis son plan sous Distance et règle Sauts max. sur 2 ou 3. Quand rien ne correspond, les suggestions au-dessus des résultats proposent quelques sauts de plus.

## Filtres actifs et Réinitialiser {#active-filters-and-reset}

Chaque filtre actif apparaît comme une pastille au-dessus des résultats, et × sur une pastille retire uniquement ce filtre. Tu obtiens une pastille par groupe de matériaux (une seule pour tous les groupes quand ils se combinent avec **au moins un groupe**) et une par bâtiment d'infrastructure. Il y a une pastille pour tous les programmes COGC, une pour les matériaux supplémentaires acceptés et une pour tous les choix de distance ensemble. La surface a une pastille quand elle n'est pas « rocheuse uniquement ». Sauts max. seul ne crée pas de pastille.

**Réinitialiser** en haut à droite revient aux filtres de départ et à l'ordre par défaut. Il conserve tes épingles de comparaison, la vue et tes colonnes. Sur téléphone, il se trouve dans le menu « ⋯ ».

Quand aucune planète ne correspond, la page indique **Aucune planète ne correspond à ces filtres. Essaie l'une de ces options :** et propose jusqu'à trois modifications, chacune avec le nombre de planètes qu'elle donnerait, la plus large en premier :

- retirer l'une de tes pastilles ;
- **Inclure les planètes gazeuses** ;
- **Accepter tous les matériaux de construction supplémentaires** ;
- un Sauts max. plus élevé (3 de plus, jusqu'à 30), quand tu as choisi une distance.

Pas d'inquiétude, cela veut seulement dire que tes filtres, ensemble, ne laissent aucune planète. Clique sur une suggestion pour l'appliquer.

Si deux modifications donnent le même résultat, une seule s'affiche. La note d'une recherche par nom peut aussi proposer « N'importe quelle surface, fertile ou non », « N'importe quel programme COGC » et « N'importe quelle infrastructure ».

## Panneau des filtres {#filter-panel}

L'en-tête du panneau compte tes filtres actifs. Sur les écrans de 1 024 px et plus, le panneau se trouve à côté des résultats. La double flèche en haut le réduit en une barre étroite et le déploie à nouveau. En dessous de 1 440 px, il démarre réduit à chaque visite, pour laisser la place aux résultats. À partir de 1 440 px, le navigateur se souvient si tu l'as réduit.

Sur les petits écrans, le bouton _Filtres_ ouvre les filtres dans un tiroir, et _Afficher n planètes_ en bas le referme.

## Résultats {#results}

L'en-tête au-dessus des résultats indique « n planètes sur total ». À côté, tu bascules entre **Liste**, **Matrice** et **Graphique**. Les longues listes se chargent par 100 lignes à mesure que tu fais défiler.

## Liste et Matrice {#list-and-matrix}

La **Liste** affiche les matériaux recherchés sous forme de tuiles à côté des autres ressources. Elle contient aussi la fertilité, les matériaux de construction supplémentaires, le COGC et les infrastructures, ainsi que les colonnes de sauts.

La **Matrice** donne à chaque matériau trouvé dans les résultats sa propre colonne. Les matériaux recherchés viennent en premier (par ordre alphabétique), puis un séparateur bleu, puis les autres. La teinte d'une cellule s'intensifie avec l'extraction quotidienne, comparée au maximum de ce matériau sur toutes les planètes. Une bande de couleur en haut indique la catégorie du matériau. Survole un en-tête pour voir « sur n des total résultats », ou une cellule pour sa valeur et sa part du maximum.

> [!tip]
> La Matrice est le moyen le plus rapide de repérer les planètes qui ont deux ou trois ressources utiles à la fois. Cherche un matériau, puis parcours les autres colonnes.

## Graphique {#chart}

Le **Graphique** place les résultats selon la distance et la production.

- **Horizontal (X)** : les sauts jusqu'à tes choix de Distance, ou jusqu'au plus éloigné si tu en as choisi plusieurs. Sans choix, ce sont les sauts jusqu'à un échange, celui qui est globalement le plus proche des planètes affichées (le moins de sauts au total). L'axe le nomme, par ex. « sauts vers IC1 · échange le plus proche ».
- **Vertical (Y)** : l'extraction quotidienne d'un matériau recherché. Avec deux matériaux recherchés ou plus, un sélecteur choisit lequel (le premier par défaut). Sans matériau recherché, Y est la fertilité.
- **Taille du point** : la fertilité, à l'échelle de la plage indiquée dans la légende. Cela ne s'applique que si tu cherches un matériau.

Les planètes **meilleur compromis** sont celles qu'aucun autre résultat ne bat sur les deux critères : aucun n'est à la fois plus proche _et_ plus riche. Le graphique les met en évidence et les relie par une ligne pointillée. Tout ce qui se trouve en dessous et à droite de cette ligne est battu par l'une d'elles.

Par exemple, disons que la planète A est à 2 sauts avec 10 /jour, B à 4 sauts avec 25 /jour, et C à 5 sauts avec 20 /jour. A et B sont des meilleurs compromis : aucun résultat n'est plus proche que A, et aucun dans un rayon de 4 sauts n'est plus riche que B. C n'en est pas un, car B est à la fois plus proche et plus riche.

**Colorer par** bascule entre **Meilleur compromis** et **COGC**. Avec COGC, les six programmes actifs les plus courants ont leur propre couleur, et les autres partagent une seule couleur : « autre programme COGC ou aucun », ou « aucun programme COGC » quand aucun autre programme ne tourne.

Sur les écrans de 1 024 px et plus, survole un point pour voir ses détails, clique dessus pour l'épingler dans la comparaison, et double-clique pour créer un plan (si tu n'es pas connecté, tu te connectes d'abord). Sur les écrans tactiles et étroits, touche un point pour voir ses détails.

La liste à côté du graphique classe les mêmes planètes selon Y, avec « + » et ☆ sur chaque ligne. Le graphique affiche jusqu'à 300 résultats, les premiers selon le tri actuel, donc c'est **Tri** qui décide quelles planètes y figurent. Sous le graphique, la page compte les planètes qu'elle n'a pas pu placer : sans itinéraire, sans le matériau ou non fertiles.

## Lire les résultats {#reading-the-results}

- **Tuiles de matériaux** : la barre de couleur compare l'extraction quotidienne de la planète au maximum de ce matériau sur toutes les planètes. Rouge en dessous d'un quart, puis orange, puis jaune, et vert au-dessus de trois quarts. Survole la barre pour voir la valeur, le maximum et le pourcentage. Par exemple, si la planète la plus riche a 40 FEO /jour, une planète à 25 est à 25 ÷ 40 = 62,5 %, donc sa barre est jaune.
- **Fert. %** : la fertilité telle que le jeu l'affiche, ou « — » quand la planète n'est pas fertile. Le tri place les planètes non fertiles en dernier.
- **Matériaux de construction supplémentaires** (l'icône de construction) : les matériaux dont une base sur cette planète a besoin. Elle liste toujours MCG (« Surface rocheuse ») ou AEF (« Surface gazeuse »). Survole l'un d'eux pour voir pourquoi, par ex. « Gravité faible ».
- **COGC · Infra** : le programme COGC actif (« — » s'il n'y en a pas) et les infrastructures de la planète sous la forme LM, COGC, WAR, ADM et SHY.
- **Colonnes de sauts** : « — » veut dire qu'il n'y a pas d'itinéraire de sauts. Survole-le pour lire « Vaisseau de colonisation requis ».

## Parcelles {#plots}

Chaque base occupe une [[plots|parcelle]] de sa planète, tout comme les QG et les [[planetary-projects|projets planétaires]] (COGC, entrepôt, marché local et les autres).

- Une planète dont toutes les parcelles sont prises et sans [[ghost-sites|sites fantômes]] porte une icône ⊘ rouge à côté de son nom, que la colonne Parcelles soit affichée ou non. Survole-la pour voir les détails et la date.
- La colonne **Parcelles** est masquée par défaut ; affiche-la dans **Colonnes**. Elle indique les parcelles libres sur le total de la planète, tel que FIO a vu la planète pour la dernière fois (survole pour voir la date), et marque une planète pleine en rouge **Complète**.
- Certaines planètes autorisent les sites fantômes. Une planète pleine qui les autorise affiche **Complète · sites fantômes** en orange, et l'infobulle compte les sites fantômes jusqu'ici.
- **parcelles inconnues** veut dire que PRUNplanner n'a pas encore lu les parcelles de la planète.
- Trie par cette colonne pour voir en premier les planètes qui ont le plus de parcelles libres. Les planètes aux parcelles inconnues passent en dernier.

Les planètes pleines gardent leur place dans les résultats. Les parcelles ne sont pas un filtre.

> [!warning]
> Les sites fantômes sont réservés aux nouveaux joueurs. Dans le jeu, ils apparaissent sur les planètes de départ. Un nouveau joueur qui commence là peut encore s'installer une fois toutes les parcelles prises. Si ta planète de départ était ailleurs, tu ne peux pas t'installer sur une planète **Complète · sites fantômes**.

## Tri {#sorting}

Clique sur un en-tête de colonne pour trier par celle-ci, et clique à nouveau pour inverser. Les matériaux, la fertilité et les parcelles se trient du plus haut au plus bas. Le nom et les sauts se trient du plus bas au plus haut.

Maj+clic sur un autre en-tête l'ajoute comme critère de départage, jusqu'à quatre colonnes (les en-têtes affichent alors 1, 2, 3). Par exemple, « sauts NC1, puis FEO /jour » liste les planètes les plus riches en FEO à chaque distance. Maj+clic sur une colonne déjà dans la chaîne l'inverse, et une seconde fois la retire.

Le menu **Tri** fait la même chose sans clavier : **Trier par**, **Puis par**, **Les plus bas d'abord** et **Les plus hauts d'abord**. Si tu n'as pas défini ton propre tri, le menu affiche l'ordre par défaut : le premier matériau recherché (du plus haut au plus bas), sinon les sauts jusqu'au premier choix de distance, sinon le nom. Quand une colonne triée disparaît, comme un matériau que tu ne cherches plus ou un plan que tu as désélectionné, la page abandonne ce tri.

## Colonnes {#columns}

Le menu **Colonnes** masque et affiche des colonnes : **Fertilité**, **Parcelles**, **Autres ressources** (Liste uniquement), **Matériaux de construction supplémentaires**, **COGC · Infrastructures** et les quatre colonnes de sauts vers les échanges. Il n'apparaît pas dans le Graphique.

Dans la Matrice, il liste aussi chaque matériau trouvé sauf les matériaux recherchés (qui s'affichent toujours), chacun avec le nombre de résultats qui l'ont. **Toutes** et **Aucune** les affichent ou les masquent d'un coup.

**Réinitialiser** dans le menu revient aux colonnes par défaut, c'est-à-dire toutes sauf Parcelles.

## Comparer {#compare}

Sur les écrans de 1 024 px et plus, épingle jusqu'à quatre planètes avec ☆ pour les comparer côte à côte dans le volet en bas. Son en-tête réduit et déploie le tableau.

Ces lignes sont colorées du meilleur au pire, avec la meilleure valeur en gras :

- la fertilité ;
- l'extraction quotidienne de chaque matériau recherché ;
- les sauts jusqu'à chacun de tes choix de distance ;
- **Travailleurs {tier} libres** pour chacun des cinq niveaux : les travailleurs libres moins les postes déjà ouverts, d'après le dernier [[popr|rapport de population]] de la planète, que le jeu publie chaque semaine.

Par exemple, 1 000 techniciens libres avec 400 postes ouverts s'affichent comme 600. Le chiffre ne descend jamais en dessous de 0, même quand il y a plus de postes ouverts que de travailleurs libres.

Une planète sans valeur est classée la pire. Les autres lignes (matériaux de construction supplémentaires, autres ressources, COGC, infrastructures et les sauts vers AI1 / CI1 / IC1 / NC1) sont du texte simple, et une ligne où les planètes diffèrent est teintée en bleu.

Les épingles font partie du lien, mais le volet ne s'affiche que sur les grands écrans.

> [!tip]
> Les lignes des travailleurs libres t'indiquent combien de travailleurs une nouvelle base pourrait embaucher sur chaque planète, d'après son dernier rapport de population.

## Enregistrer et partager {#saving-and-sharing}

- **Copier le lien** : la barre d'adresse contient toujours toute la recherche (filtres, tri, vue et épingles de comparaison), donc le lien partage exactement ce que tu vois.
- **Enregistrer la recherche** : enregistre les filtres et la vue actuels sous un nom dans ce navigateur. Le nom part des libellés des pastilles, ou de « Toutes les planètes ». Une recherche enregistrée ne garde ni le tri ni les épingles.
- **Enregistrées** charge une recherche enregistrée. Dans **Gérer**, tu peux les renommer, les charger ou les supprimer. La suppression ne demande pas de confirmation.
- « + » sur une ligne ouvre un nouveau plan pour cette planète dans un nouvel onglet, pour que ta recherche reste en place. Sans compte, « + » te demande d'abord de te connecter, puis ouvre le plan.

Sur téléphone, les recherches enregistrées, **Copier le lien** et **Réinitialiser** se trouvent dans le menu « ⋯ ».

### Ce dont ce navigateur se souvient {#what-the-browser-remembers}

Certaines choses restent uniquement dans ce navigateur, pas dans ton compte : tes recherches enregistrées, les colonnes et matériaux masqués, l'affichage ou non de la colonne Parcelles, le panneau des filtres réduit (1 440 px et plus) et la dernière vue. Une visite sans lien s'ouvre dans ta dernière vue. Un lien s'ouvre dans sa propre vue.

> [!tip]
> Pour garder une recherche sur un autre appareil ou la partager avec ta corporation, utilise **Copier le lien** plutôt que **Enregistrer la recherche**.

### Paramètres du lien {#link-parameters}

Un lien ne contient que ce qui diffère des valeurs par défaut. Tu peux aussi en écrire un à la main :

| Paramètre | Signification                                    | Exemple                       |
| --------- | ------------------------------------------------ | ----------------------------- |
| `q`       | nom ou ID                                        | `q=Montem`                    |
| `m`       | groupes de matériaux                             | `m=any:FEO\|MAG,all:H2O`      |
| `g`       | les groupes se combinent avec au moins un groupe | `g=any`                       |
| `d`       | minimum par jour                                 | `d=FEO:15`                    |
| `cogc`    | programmes COGC                                  | `cogc=ADVERTISING_METALLURGY` |
| `infra`   | infrastructures                                  | `infra=LM,WAR`                |
| `fert`    | fertiles uniquement                              | `fert=1`                      |
| `surf`    | surfaces, r et/ou g                              | `surf=rg`                     |
| `x`       | matériaux supplémentaires acceptés               | `x=INS,SEA`                   |
| `ref`     | choix de distance                                | `ref=cx:NC1`                  |
| `j`       | sauts max.                       | `j=5`                         |
| `sort`    | chaîne de tri                                    | `sort=mat:FEO:desc`           |
| `view`    | `matrix` ou `chart`                              | `view=chart`                  |
| `pin`     | épingles de comparaison                          | `pin=OT-580b`                 |

La page ignore les valeurs qu'elle ne reconnaît pas.

## Quand les planètes ne se chargent pas {#errors}

Si le chargement échoue, la page indique « Impossible de charger les planètes. Recharge la page pour réessayer. » et affiche un bouton **Réessayer**. Après trop de requêtes, elle te demande d'attendre quelques secondes avant de réessayer.
