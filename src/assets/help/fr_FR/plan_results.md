Les résultats te disent ce que rapporte ta base, combien de temps il faut pour l'amortir, si ses travailleurs sont logés, et comment se portent sa surface et son stockage. Ce sont les cinq tuiles en haut d'un plan (dans la disposition Standard), plus le tableau des E/S des matériaux avec ses totaux, et ils se mettent à jour à chaque modification.

C'est ce que tu regardes pour juger un plan : ce que la base rapporterait, et où elle manque de quelque chose. Un chiffre en rouge sur la tuile **Main-d'œuvre** ou **Surface** signale un manque de lits ou de surface.

## Tuiles de résultats {#tiles}

Chaque tuile est un bouton. Clique dessus pour ouvrir la partie d'où vient son chiffre, et si cette partie est masquée dans ta disposition, elle s'ouvre dans une boîte de dialogue.

| Tuile               | Affiche                                                                      | Ouvre                                            |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| **Bénéfice / jour** | Les recettes moins le coût par jour                                          | **Bénéfice** (l'outil Répartition des bénéfices) |
| **Amortissement**   | Le nombre de jours avant que le bénéfice ait payé la base                    | **Construction**                                 |
| **Main-d'œuvre**    | L'efficacité de main-d'œuvre la plus basse, les lits par catégorie           | **Main-d'œuvre**                                 |
| **Surface**         | La surface utilisée sur la surface dont tu disposes, le bénéfice par surface | **Planète**                                      |
| **Stockage**        | Le nombre de jours avant que le stockage de la base soit plein               | **Visites**                                      |

Chaque chiffre utilise les prix de l'empire avec lequel le plan est calculé (voir [Empire et prix](/help/plan_base#empire-and-prices)).

### Bénéfice / jour {#profit}

**Bénéfice / jour** est le [[profit|bénéfice]] de la base : les recettes moins le coût, par jour. La ligne en dessous indique « Recettes … · coût … dont … de dégradation et … de frais de production ».

_Les recettes_ sont la valeur de chaque matériau que la base produit en plus grande quantité qu'elle n'en utilise (un Δ positif dans les [E/S des matériaux](#material-io)), au prix de vente.

_Le coût_ additionne trois choses :

- chaque matériau que la base utilise en plus grande quantité qu'elle n'en produit, au prix d'achat, y compris les consommables de ta [[workforce|main-d'œuvre]] ;
- la [[degradation|dégradation]], qui vaut 1/180 du coût de construction des _bâtiments de production_ par jour. Le [[core-module|module central]], les [[habs|habitations]] et le [[storage|stockage]] ne comptent pas ici ;
- les [[production-fees|frais de production]] (voir [plus bas](#production-fees)).

La dégradation représente l'usure de tes bâtiments. Par exemple (chiffres inventés), des bâtiments de production qui coûtent 900 000 ȼ à construire ajoutent 900 000 ÷ 180 = 5 000 ȼ de dégradation par jour.

Un matériau que la base produit et utilise aussi ne compte qu'une fois, pour sa quantité nette. Si le plan produit 100 RAT et que ses travailleurs en mangent 60, seuls les 40 en trop sont vendus.

> [!tip]
> Bénéfice / jour est le même chiffre que la ligne en gras **Bénéfice / jour** dans les [totaux des E/S des matériaux](#totals). Clique sur la tuile pour le voir décomposé en ses parties dans l'outil Bénéfice (voir [Outils du plan](/help/plan_tools)).

### Frais de production {#production-fees}

La planète facture des frais pour chaque ordre de production, et PRUNplanner les compte par bâtiment. Dans le jeu, les gouverneurs de la planète fixent ces frais par expertise et par catégorie de main-d'œuvre, et les frais sont payés au lancement d'un ordre de production. PRUNplanner prend les frais de la planète pour l'expertise du bâtiment dans chaque catégorie de main-d'œuvre, puis en fait la moyenne sur les travailleurs du bâtiment, pondérée par leur nombre.

Par jour, un bâtiment paie ces frais × son efficacité × son nombre. Un bâtiment plus rapide fait tourner plus d'ordres, donc il paie plus, et un bâtiment qui ne fait rien tourner ne paie rien. Une planète sans frais, ou un bâtiment sans expertise, ne coûte aucun frais.

Par exemple (chiffres inventés), prends un bâtiment avec 10 pionniers et 30 colons sur une planète qui facture 20 ȼ pour les pionniers et 40 ȼ pour les colons dans son expertise. Ses frais sont de (10 × 20 + 30 × 40) ÷ 40 = 35 ȼ par jour à 100 %. Deux de ces bâtiments à 120 % d'efficacité paient 35 × 1,2 × 2 = 84 ȼ par jour.

Les frais ne sont pas un matériau, donc ils n'apparaissent pas comme lignes dans les E/S des matériaux. Tu les trouves dans la ligne du bénéfice, dans les [totaux](#totals), dans le **ȼ / jour** du sélecteur de recettes et dans la boîte de dialogue COGM (voir [Production et recettes](/help/plan_production#cogm)).

### Amortissement {#payback}

**Amortissement** est le coût de construction de la base divisé par son bénéfice par jour, en jours (par exemple « 212,40 j »). Il affiche « jamais » quand la base ne fait pas de bénéfice.

Par exemple (chiffres inventés), une base qui coûte 1 000 000 ȼ à construire et rapporte 5 000 ȼ par jour est amortie en 1 000 000 ÷ 5 000 = 200 jours. Si tu vois « jamais », pas d'inquiétude : cela veut seulement dire que le bénéfice par jour est de 0 ou moins à ces prix, donc la base ne récupérerait pas son coût de construction. La tuile **Bénéfice / jour** montre pourquoi.

La ligne en dessous est le coût de construction (« … **ȼ coût de construction** »). C'est chaque matériau de construction au prix d'achat, pour les bâtiments de production, le module central (une fois), et chaque bâtiment d'habitation et de stockage. Il inclut les matériaux supplémentaires que demande l'environnement de la planète (voir [[extra-building-materials|matériaux de construction supplémentaires]]).

> [!tip]
> L'amortissement compte les habitations et le stockage, mais pas la dégradation de Bénéfice / jour. Une base avec beaucoup d'habitations peut s'amortir lentement même si son bénéfice quotidien a l'air correct. Ouvre **Construction** pour voir ce qu'il te reste à acheter.

### Main-d'œuvre {#workforce}

Le chiffre **Main-d'œuvre** est l'efficacité la plus basse parmi les catégories de main-d'œuvre dont le plan a besoin, par exemple « 86,7 % ». Il affiche « — » quand aucun bâtiment n'a besoin de travailleurs, et passe au rouge quand une catégorie a moins de lits que de travailleurs.

Le rouge compte parce que les travailleurs sans lit font baisser l'efficacité de production, et avec elle ce que tes bâtiments produisent. Ajouter assez d'habitations pour cette catégorie dans **Infrastructures** règle le problème. Avec **Auto** activé, PRUNplanner les choisit pour toi.

La ligne en dessous liste chaque catégorie nécessaire sous la forme travailleurs nécessaires / lits, par exemple « PIO 260/650 · COL 550/1 450 », avec en rouge une catégorie qui manque de lits. Une deuxième ligne liste les experts que tu as placés, par exemple « Agri 1 · Chim 4 ». Survole-la pour voir la liste complète.

[Configuration de la base](/help/plan_base#workforce) explique comment l'efficacité est calculée et comment la modifier.

### Surface {#area}

**Surface** affiche la surface utilisée sur la surface dont tu disposes, avec une jauge. Le chiffre utilisé passe au rouge quand la base a besoin de plus que ce que tes permis donnent.

- Surface disponible = 250 + 250 × permis (réglé dans **Planète**, voir [Configuration de la base](/help/plan_base#permits)).
- Surface utilisée = 25 pour le module central + la surface de chaque bâtiment de production, d'habitation et de stockage.

Par exemple, avec 2 permis, tu disposes de 250 + 2 × 250 = 750 de surface. Quand le chiffre utilisé est rouge, tu peux augmenter les **Permis** dans **Planète** (jusqu'à 3) ou retirer des bâtiments jusqu'à ce que la base tienne.

En dessous, « **ȼ bénéfice / surface** » est le bénéfice par jour divisé par la surface utilisée, ou 0 quand rien n'utilise de surface. Le **ȼ / surface** du sélecteur de recettes divise par une disposition standard pour que les recettes se comparent d'un bâtiment à l'autre. Celui-ci utilise ta vraie base.

Ensuite, un chiffre « Empire » montre le même rapport pour tout l'empire avec lequel le plan est calculé : le bénéfice total par jour de l'empire ÷ la surface totale qu'utilisent tous ses plans. C'est un chiffre pondéré par la surface, pas une moyenne des chiffres des plans. Il ne s'affiche qu'une fois que tu as ouvert la page de cet empire dans [Empire](/empire) dans cet onglet du navigateur, et enregistrer un plan l'efface jusqu'à ce que tu rouvres la page de l'empire.

> [!tip]
> Un plan au-dessus du chiffre de l'empire rapporte plus par surface que ton empire en moyenne. C'est bon signe quand tu choisis la prochaine base à construire avec un nombre de permis limité.

### Stockage {#storage}

**Stockage** affiche le nombre de jours avant que le stockage de la base soit plein (« **jours avant plein** »). PRUNplanner le calcule séparément pour le poids et pour le volume, en divisant la capacité de stockage par la _plus grande_ des deux quantités, ce qui entre et ce qui sort par jour. La tuile affiche le plus petit des deux résultats. Elle te dit combien de temps la base peut tenir entre deux vaisseaux avant que son stockage soit plein.

La capacité correspond aux 1 500 t et 1 500 m³ du module central plus tes bâtiments de stockage (voir [Infrastructures](/help/plan_base#infrastructure)). La ligne sous le chiffre indique « … t entrée · … t sortie / jour », et tu peux la survoler pour voir la même chose en m³. Elle affiche « — » quand rien n'entre ni ne sort.

Par exemple (chiffres inventés), une base sans bâtiment de stockage contient 1 500 t et 1 500 m³. Si elle reçoit 60 t et expédie 100 t par jour, le poids tient 1 500 ÷ 100 = 15 jours. Si elle reçoit 50 m³ et expédie 75 m³, le volume tient 1 500 ÷ 75 = 20 jours. La tuile affiche 15 jours.

La tuile utilise l'ensemble des E/S des matériaux. Elle ne suit pas les « matériaux exclus » que tu règles dans l'outil Visites, donc elle peut afficher un nombre de jours différent de **Visites** lui-même. Plus de détails dans [Outils du plan](/help/plan_tools).

## E/S des matériaux {#material-io}

Les [[material-io|E/S des matériaux]] listent chaque matériau que la base produit ou utilise, par jour :

- **Entrée** : ce que la base utilise (intrants de production et consommables de la main-d'œuvre).
- **Sortie** : ce que la base produit.
- **Δ** : Sortie − Entrée. Un Δ positif est exporté (vendu), un Δ négatif est importé (acheté).

Trois commandes au-dessus du tableau choisissent ce que tu vois. Elles ne sont pas enregistrées, donc la page s'ouvre toujours sur Toute la base, Tout et ȼ. Toute la base est la vue à partir de laquelle le bénéfice est calculé, donc son Δ est ce que la base achèterait et vendrait.

| Sélecteur       | Options                                                          | Ce qu'il fait                                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quels matériaux | **Toute la base** (par défaut), **Production**, **Main-d'œuvre** | Toute la base fait le solde de la production et de la main-d'œuvre ensemble. Production n'affiche que les intrants et produits des bâtiments, Main-d'œuvre que ce que consomment tes travailleurs. |
| Sens            | **Tout** (par défaut), **Exportations**, **Importations**        | Exportations garde les lignes avec un Δ positif, Importations celles avec un Δ négatif.                                                                                                            |
| Valeur          | ȼ (par défaut), t, m³, %                                         | La dernière colonne : **ȼ / jour** (le Δ au prix de vente pour les exportations, au prix d'achat pour les importations), **Δ t**, **Δ m³**, ou **Part 7j** et **Part 30j**.                        |

La vue % affiche le Δ en part du volume quotidien moyen échangé sur les 7 et 30 derniers jours. Elle te dit si le marché peut absorber ce que tu vends ou fournir ce que tu achètes (voir [Contrôle du plan](/help/plan_check#flags)).

Clique sur un en-tête de colonne pour trier dessus. Avec **Toute la base**, un signalement après la tuile d'un matériau marque un avertissement de marché. Clique dessus pour ouvrir le contrôle du plan sur sa vue marché, décrite dans [Contrôle du plan](/help/plan_check#market-check).

### Totaux {#totals}

La partie des totaux des E/S des matériaux additionne le tableau par jour :

- **Exportations** : la valeur de toutes les lignes avec un Δ positif.
- **Importations** : la valeur de toutes les lignes avec un Δ négatif, en nombre négatif.
- Avec **Toute la base** uniquement : **Dégradation**, **Frais de production** et **Bénéfice / jour** (en gras).

Les totaux suivent le choix Toute la base, Production ou Main-d'œuvre, mais pas le choix Tout, Exportations ou Importations. Avec Toute la base, Exportations + Importations + Dégradation + Frais de production = Bénéfice / jour, le même chiffre que la tuile.

> [!tip]
> Passe les E/S des matériaux sur **Main-d'œuvre** pour voir ce que coûte par jour l'alimentation de tes travailleurs. Désactiver un produit de luxe dans Main-d'œuvre le fait baisser, mais fait aussi baisser l'efficacité des travailleurs (voir [Configuration de la base](/help/plan_base#workforce)).

### Télécharger en CSV {#csv}

**Plus** dans l'en-tête du plan contient **Télécharger les E/S des matériaux (CSV)**. Le fichier a une ligne par matériau avec les colonnes ticker, input, output, delta, value, weight et volume, toutes par jour. La valeur est en ȼ, et le poids et le volume portent sur le Δ. Un fichier CSV s'ouvre dans n'importe quel tableur, pour que tu puisses travailler les chiffres en dehors de PRUNplanner.

Le téléchargement couvre le choix actuel Toute la base, Production ou Main-d'œuvre et ignore le choix Tout, Exportations ou Importations. Le fichier porte le nom du plan, ou l'ID de la planète tant que le plan n'a pas de nom, suivi de « -material-io.csv ».
