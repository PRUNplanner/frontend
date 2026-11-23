La configuration de la base détermine quels prix et quels bonus s'appliquent à ta base, combien de travailleurs sont logés et nourris, et ce qui augmente l'[[efficiency|efficacité]] de tes bâtiments. Dans la disposition Standard, c'est le groupe de parties à gauche d'un plan : **Empire et prix**, **Planète**, **Main-d'œuvre**, **Infrastructures** et **Experts**. Ensemble, elles contiennent tout ce qui concerne la base hors bâtiments de production, et chaque modification ici se répercute directement dans la [Production](/help/plan_production) et les [résultats](/help/plan_results).

## Un nouveau plan {#new-plan}

Un nouveau plan démarre avec ces réglages :

| Réglage                | Valeur de départ                                                 |
| ---------------------- | ---------------------------------------------------------------- |
| Programme COGC         | Le programme actuel de la planète ; **Aucun** si elle n'en a pas |
| **QG de corp.**        | Désactivé                                                        |
| **Permis**             | 1 (surface 500)                                                  |
| Produits de luxe       | Les deux activés pour chaque niveau                              |
| Experts                | Aucun                                                            |
| **Auto** (habitations) | Activé                                                           |
| Empire                 | Voir [Empire et prix](#empire-and-prices)                        |

## Empire et prix {#empire-and-prices}

Un plan calcule avec un seul [[empire|empire]]. Il prend la [[faction|faction]] et les permis de cet empire, ainsi que sa [[exchange-preference|préférence d'échange]] pour chaque prix. C'est donc l'empire qui décide lesquels de tes bâtiments reçoivent un bonus de faction et quelle est sa taille (voir [Bonus de faction](#faction)), ainsi que chaque prix auquel le plan achète et vend.

**Calculer avec l'empire** liste tes empires par nom, et ceux qui contiennent le plan sont précédés du signe « » ». Il n'apparaît pas sur un plan en lecture seule ni quand tu n'as aucun empire.

Quand tu ouvres un plan, il choisit ton empire actuel si le plan en fait partie, sinon le premier empire qui contient le plan. Un plan qui n'est dans aucun empire utilise ton premier empire. Ton empire actuel est l'empire par défaut défini dans ton [Profil](/profile), et changer d'empire sur la page [Empire](/empire) le modifie.

Sur un plan enregistré, choisir un autre empire ne change que la façon dont cette page calcule. Cela n'ajoute pas le plan à cet empire, ne le retire pas d'un autre, et ce n'est pas enregistré. Un nouveau plan rejoint l'empire que tu as choisi lors de son premier enregistrement. Tu définis quels empires contiennent un plan dans [Gestion](/manage).

La note en dessous (« Faction …, permis de l'empire. Le plan est dans … empires. ») nomme la faction dont le bonus s'applique et le nombre d'empires qui contiennent le plan.

**Prix** affiche le nom de la préférence d'échange de l'empire, sous forme de lien vers cette préférence dans [Bourses](/exchanges) pour cette planète. Sans préférence, il indique **Universe · VWAP 30D (aucune préférence)**, c'est-à-dire le [[vwap|VWAP]] sur 30 jours de tous les échanges.

À partir de ce barème, le plan valorise ce qu'il vend au prix de vente. Ce qu'il achète (intrants, consommables de la main-d'œuvre, matériaux de construction), il le valorise au prix d'achat. [Bourses et préférences d'échange](/help/exchanges#how-a-price-is-found) explique comment un prix est trouvé et comment fixer des prix ou les définir par planète.

> [!tip]
> Deux empires avec des préférences d'échange différentes peuvent afficher des bénéfices très différents pour le même plan. Change **Calculer avec l'empire** pour confronter un plan au marché où tu vendrais vraiment.

### Bonus de faction {#faction}

Une faction améliore les bâtiments de ses [[expertise|expertises]]. PRUNplanner applique le bonus comme un facteur sur l'efficacité du bâtiment :

1 + bonus × 2 × (3 − 2 × permis utilisés ÷ permis au total)

Les permis sont ceux de l'empire, tels que définis dans ses réglages. Si tu les utilises tous, tu obtiens 1 + 2 × bonus. En utiliser moins donne davantage.

| Faction     | Expertise et bonus                                                     |
| ----------- | ---------------------------------------------------------------------- |
| Antares     | Électronique 5 %                                                       |
| Benten      | Fabrication 5 %                                                        |
| Hortus      | Agriculture 3 %, Industries alimentaires 2 %                           |
| Moria       | Métallurgie 2 %, Construction 3 %                                      |
| Hors région | Chimie, Raffinage de carburant et Extraction de ressources 2 % chacune |

Par exemple, un empire Antares qui utilise tous ses permis donne aux bâtiments d'Électronique 1 + 0,05 × 2 = 1,10, soit +10 %.

## Planète {#planet}

La partie **Planète** définit ce que la planète apporte à ta base : son programme COGC, un QG de corporation, tes permis et ses ressources.

### Programme COGC {#cogc}

La liste **COGC** choisit le programme [[cogc|COGC]] de la planète. Tu peux choisir **Aucun**, l'un des neuf programmes d'expertise (de l'Agriculture à l'Extraction de ressources) ou l'un des cinq programmes de main-d'œuvre (des Pionniers aux Scientifiques).

Un nouveau plan démarre avec le programme que la planète applique actuellement. Tu peux en choisir un autre pour anticiper, car les résidents votent pour le programme et il peut changer chaque semaine.

Un programme d'expertise multiplie l'efficacité de chaque bâtiment de cette expertise par 1,25 (+25 %). Un programme de main-d'œuvre multiplie l'efficacité de chaque bâtiment qui emploie ce niveau par 1,1 (+10 %). Dans la Production, l'expertise d'un bâtiment passe en vert avec ✓ quand le programme l'améliore.

### QG de corp. {#corp-hq}

Coche **QG de corp.** quand la [[corp-hq|corporation]] dont tu fais partie a son siège social sur cette planète (le QG de ta propre entreprise ne compte pas). Il multiplie l'efficacité de chaque bâtiment de production par 1,1 (+10 %), et il est désactivé par défaut.

### Permis et surface {#permits}

**Permis** (de 1 à 3) définit combien de permis de base tu utilises sur cette planète. La surface à côté vaut 250 + 250 × permis : 500, 750 ou 1 000. Le résultat **Surface** montre combien la base en utilise (voir [Résultats](/help/plan_results#area)). Le [[core-module|module central]] en prend toujours 25, et chaque bâtiment de production, habitation et bâtiment de stockage prend sa propre surface × son nombre.

Dans le jeu, chaque amélioration du niveau du QG de ton entreprise te donne un permis de base de plus. Ce champ ne définit que la surface du plan. Le bonus de faction compte plutôt les permis de l'empire (voir [Bonus de faction](#faction)).

### Ressources {#resources}

**Ressources** affiche une tuile pour chaque ressource de la planète. Le nombre indiqué est ce qu'un extracteur produit par jour à 100 % d'efficacité.

Clique sur une tuile pour commencer à extraire cette ressource. Si le plan n'a pas encore le bon extracteur (EXT pour les minéraux, COL pour les gaz, RIG pour les liquides), PRUNplanner en ajoute un avec une quantité de 1. Il ajoute aussi la recette de cette ressource comme ordre de 1, sauf si l'extracteur l'exécute déjà. Ensuite, tu règles la quantité dans la Production.

Avec **Suggestions de plan** activé et des aperçus disponibles pour la planète, un lien sous les tuiles (« … plans sur … · ce que les autres construisent ici ») ouvre ce que les autres joueurs planifient sur cette planète. Plus de détails dans [Disposition](/help/plan_layout).

### Fertilité {#fertility}

La [[fertility|fertilité]] ne compte que pour les fermes (FRM et ORC). Leur efficacité reçoit le facteur 1 + fertilité × 10 ÷ 33 : une fertilité positive les accélère et une fertilité négative les ralentit. Sur une planète qui n'est pas fertile du tout, les fermes tournent à 0 % et la Production indique « Planète non fertile ».

> [!tip]
> Chaque bâtiment a aussi besoin des [[extra-building-materials|matériaux de construction supplémentaires]] de la planète pour sa surface, sa gravité, sa pression et sa température. Ils sont inclus dans le coût de construction derrière **Amortissement** et dans l'outil Construction : une planète hostile se traduit donc par un amortissement plus long.

## Main-d'œuvre {#workforce}

**Main-d'œuvre** a une entrée pour chaque niveau de [[workforce|main-d'œuvre]] dont le plan a besoin. Chacune affiche :

- « besoin / logés » : les travailleurs dont tes bâtiments ont besoin et les lits que tes habitations fournissent, avec une jauge ;
- l'**Efficacité** du niveau en % ;
- **Produits de luxe** : deux boutons, un par [[luxuries|produit de luxe]], avec son ticker, ✓ quand il est fourni ;
- « … libres » : les lits disponibles, en rouge et négatifs quand le niveau en manque.

Un « … libres » négatif signifie seulement que le niveau a plus de travailleurs que de lits. Ajoute des habitations dans les [Infrastructures](#infrastructure), ou active [Auto](#auto-habs) pour que PRUNplanner les choisisse pour toi.

Les niveaux dont le plan n'a pas besoin restent derrière « Afficher … (non nécessaire) ». Dans les options **Affichage** de la disposition, tu peux afficher la Main-d'œuvre sous forme de tableau (**Niveau**, **Besoin / logés**, **Libres**, **Produits de luxe**, **Efficacité %**) ou avec tous les niveaux ouverts (voir [Disposition](/help/plan_layout)).

### Comment l'efficacité est calculée {#workforce-efficiency}

L'efficacité d'un niveau vaut :

- la part de ses travailleurs qui ont un lit (100 % au maximum),
- × 79,4 % comme base,
- × 12/11 quand son premier produit de luxe est fourni,
- × 15/13 quand son second produit de luxe est fourni.

| Produits de luxe fournis | Efficacité (tous logés) |
| ------------------------ | ----------------------- |
| Aucun                    | 79,4 %                  |
| Premier seulement        | 86,7 %                  |
| Second seulement         | 91,7 %                  |
| Les deux                 | 100 %                   |

Les lits manquants réduisent le premier facteur. Par exemple (chiffres inventés), un plan qui a besoin de 100 Pionniers mais n'a des lits que pour 50 en loge la moitié : sans produits de luxe, le niveau tourne à 50 % × 79,4 % = 39,7 %, et avec les deux produits de luxe à 50 % × 100 % = 50 %.

Le facteur de main-d'œuvre d'un bâtiment est la moyenne des efficacités de ses niveaux, pondérée par le nombre de travailleurs de chaque niveau qu'il emploie.

### Besoins et produits de luxe {#needs}

Les travailleurs logés consomment leurs besoins chaque jour. Les travailleurs sans lit ne consomment rien, mais ils ne travaillent pas non plus. Si tu désactives un produit de luxe, il n'est ni consommé ni acheté, et l'efficacité du niveau baisse. Tout ce qui est consommé apparaît dans les [E/S des matériaux](/help/plan_results#material-io) et compte comme coût.

Consommation pour 100 travailleurs par jour : 200 Pionniers logés boivent donc 2 × 4 = 8 DW par jour :

| Niveau       | Besoins                                  | Luxe 1  | Luxe 2  |
| ------------ | ---------------------------------------- | ------- | ------- |
| Pionnier     | DW 4, RAT 4, OVE 0,5                     | PWO 0,2 | COF 0,5 |
| Colon        | DW 5, RAT 6, EXO 0,5, PT 0,5             | REP 0,2 | KOM 1   |
| Technicien   | DW 7,5, RAT 7, MED 0,5, HMS 0,5, SCN 0,1 | SC 0,1  | ALE 1   |
| Ingénieur    | DW 10, MED 0,5, FIM 7, HSS 0,2, PDA 0,1  | VG 0,2  | GIN 1   |
| Scientifique | DW 10, MED 0,5, MEA 7, LC 0,2, WS 0,05   | NST 0,1 | WIN 1   |

> [!tip]
> Un produit de luxe est rentable quand la production supplémentaire des bâtiments plus rapides vaut plus que le produit de luxe lui-même. Active-le ou désactive-le et observe **Bénéfice / jour** : le coût du produit de luxe et le changement d'efficacité comptent tous les deux.

## Infrastructures {#infrastructure}

**Infrastructures** a un champ pour chaque [[habs|habitation]] (HB1, HBB, HB2, HBC, HB3, HBM, HB4, HBL, HB5) et chaque bâtiment de [[storage|stockage]] (STO, STA, STE, STV, STW).

Lits par habitation :

| Habitation              | Lits                                                            |
| ----------------------- | --------------------------------------------------------------- |
| HB1, HB2, HB3, HB4, HB5 | 100 Pionniers, Colons, Techniciens, Ingénieurs ou Scientifiques |
| HBB                     | 75 Pionniers + 75 Colons                                        |
| HBC                     | 75 Colons + 75 Techniciens                                      |
| HBM                     | 75 Techniciens + 75 Ingénieurs                                  |
| HBL                     | 75 Ingénieurs + 75 Scientifiques                                |

Capacité de stockage, en plus des 1 500 t et 1 500 m³ du [[core-module|module central]] :

| Stockage | Poids    | Volume    |
| -------- | -------- | --------- |
| STO      | 5 000 t  | 5 000 m³  |
| STA      | 2 500 t  | 2 500 m³  |
| STE      | 10 000 t | 10 000 m³ |
| STV      | 2 500 t  | 7 500 m³  |
| STW      | 7 500 t  | 2 500 m³  |

Les habitations et le stockage prennent de la surface et comptent dans le coût de construction derrière **Amortissement**, mais pas dans la dégradation. Ton stockage détermine les jours avant saturation du résultat **Stockage**.

### Auto et l'optimiseur {#auto-habs}

**Auto** choisit les habitations pour toi. Tant qu'il est activé, les champs d'habitation sont verrouillés, mais tu règles toujours le stockage toi-même. Chaque fois que la main-d'œuvre requise par tes bâtiments change, ou que les prix de construction des habitations changent, il choisit l'ensemble d'habitations le moins cher qui loge tout le monde et tient dans la surface libre. Si rien ne tient, il choisit l'ensemble qui demande le moins de surface, même si c'est plus que ce que tu as.

**Auto** est activé pour les nouveaux plans. Les plans enregistrés sans ce réglage démarrent avec Auto désactivé, et sur une copie du plan partagé de quelqu'un d'autre, il démarre aussi désactivé. PRUNplanner retient ton choix pour chaque plan.

Avec **Auto** désactivé, **Le moins cher** et **Le moins de surface** lancent l'optimiseur une fois. Le moins cher trouve le coût de construction le plus bas à tes prix d'achat, sans limite de surface. Le moins de surface trouve la plus petite surface. Si aucun ensemble ne convient, tu obtiens le message « Impossible de trouver une configuration d'habitation pour cette main-d'œuvre. ».

> [!tip]
> Désactive **Auto** quand tu as déjà construit des habitations dans le jeu et que tu veux que le plan leur corresponde. Utilise **Le moins cher** ou **Le moins de surface** une fois pour avoir un point de départ, puis ajuste.

## Experts {#experts}

Les [[experts|experts]] améliorent chaque bâtiment de leur expertise. **Experts** affiche un champ pour chaque expertise utilisée par tes bâtiments, avec les tickers de ces bâtiments, ainsi que pour toute expertise qui a des experts placés. « + … champs de plus » affiche le reste, et **Moins de champs** les masque à nouveau.

Chaque champ accepte de 0 à 5 experts, avec le bonus affiché sous le nom :

| Experts | Bonus   |
| ------- | ------- |
| 1       | 3,06 %  |
| 2       | 6,96 %  |
| 3       | 12,48 % |
| 4       | 19,74 % |
| 5       | 28,4 %  |

Un bâtiment de cette expertise reçoit 1 + bonus comme facteur sur son efficacité. Une base peut accueillir au maximum 6 experts au total. Si tu en saisis plus, un avertissement indique « Le nombre maximal d'experts sur une base est de 6. Tu as actuellement … experts assignés. », mais le plan compte quand même chaque expert saisi.

Dans le jeu, les experts arrivent avec le temps grâce aux bâtiments de cette expertise en activité. Plus tu fais tourner de ces bâtiments, plus ils arrivent vite.

## Comment se construit l'efficacité d'un bâtiment {#efficiency}

L'efficacité d'un bâtiment de production est le produit de ses facteurs. Comme ils se multiplient, un seul facteur à 0, par exemple aucun travailleur logé ou une ferme sur une planète non fertile, arrête le bâtiment quels que soient les autres.

| Facteur                      | Valeur                                                        | Réglé dans                                                     |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Main-d'œuvre                 | Efficacités des niveaux de ses travailleurs, pondérées        | [Main-d'œuvre](#workforce), [Infrastructures](#infrastructure) |
| COGC                         | × 1,25 programme d'expertise, × 1,1 programme de main-d'œuvre | [Programme COGC](#cogc)                                        |
| QG                           | × 1,1                                                         | [QG de corp.](#corp-hq)                                        |
| Experts                      | × (1 + bonus)                                                 | [Experts](#experts)                                            |
| Faction                      | × (1 + bonus × 2 × (3 − 2 × utilisés ÷ total))                | [Empire et prix](#faction)                                     |
| Fertilité (fermes seulement) | × (1 + fertilité × 10 ÷ 33), 0 si non fertile                 | [Fertilité](#fertility)                                        |

Prends un bâtiment de Métallurgie dont les travailleurs sont tous logés et les deux produits de luxe fournis, avec un COGC Métallurgie, 2 experts en Métallurgie et le QG de corp., dans un empire sans bonus de faction en Métallurgie. Il tourne à 1 × 1,25 × 1,0696 × 1,1 = 147,07 %. Survole **Eff.** dans la Production pour voir les facteurs de n'importe quel bâtiment.
