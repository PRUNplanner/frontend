Les termes du jeu et de la planification qu'utilise PRUNplanner, par ordre alphabétique de l'anglais. Le premier paragraphe de chaque entrée est la courte définition que tu vois en survolant le terme dans un article. La suite explique comment PRUNplanner le calcule ou l'affiche, et où en lire plus.

## Surface et permis {#area-permits}

La surface utilisable d'une base vaut 250 plus 250 par permis qu'elle utilise, donc un permis donne les 500 de surface habituels. Le module central en prend toujours 25.

Chaque bâtiment prend de la surface, et un plan montre combien est utilisée et combien reste libre. Dans le jeu, chaque amélioration de niveau du QG te donne un permis de base de plus. Chaînes de production planifie des bases de 1 à 3 permis, donc 500, 750 ou 1 000 de surface. Voir [Chaînes de production](/help/tools_production_chain#bases).

## Ask {#ask}

Le prix le plus bas qu'un vendeur demande actuellement sur un échange. Si tu achètes tout de suite, tu paies l'ask. Pas d'ask signifie que personne ne vend le matériau là-bas pour l'instant.

Contrôle du plan affiche « Aucune offre » quand un plan achète un matériau sur un échange sans ask. Ta préférence d'échange peut utiliser l'ask comme base de prix. Voir [Contrôle du plan](/help/plan_check#flags) et [Base de prix](/help/exchanges#price-basis-vwap-ask-and-bid).

## Bid {#bid}

Le prix le plus haut qu'un acheteur propose actuellement sur un échange. Si tu vends tout de suite, tu prends le bid. Pas de bid signifie que personne n'achète le matériau là-bas pour l'instant.

Contrôle du plan affiche « Aucun acheteur » quand un plan vend un matériau sur un échange sans bid. Ta préférence d'échange peut utiliser le bid comme base de prix. Voir [Contrôle du plan](/help/plan_check#flags).

## Consommation (burn) {#burn}

Le nombre de jours que dure le stock d'un matériau dans une base : le stock dans ton stockage FIO ÷ ce que la base consomme par jour. Un matériau que la base produit autant qu'elle en utilise ne s'épuise jamais.

Consommation FIO colore un matériau en rouge à 5 jours ou moins et en jaune à 10 jours ou moins par défaut. Tu peux changer les deux seuils sur la page Consommation FIO ou dans ton profil. La consommation a besoin de tes données FIO. Voir [Consommation FIO](/help/fio_burn#calculations).

Par exemple, une base qui a 300 unités d'un matériau en stock, en utilise 40 par jour et en produit 10 par jour en consomme 30 net par jour, donc le stock dure 300 ÷ 30 = 10 jours. Aux seuils par défaut (rouge à 5, jaune à 10 jours), c'est jaune, pas encore rouge.

## Sous-produit {#byproduct}

Un second produit d'une recette, fabriqué en même temps que le matériau pour lequel la recette tourne.

Par défaut, Chaînes de production utilise d'abord un sous-produit pour les besoins de la chaîne elle-même et vend le reste. Voir [Chaînes de production](/help/tools_production_chain#settings).

## Soutes {#cargo-bays}

Les tailles de vaisseau que ROI des bases utilise pour vérifier si la cargaison d'une base tient en une visite de vaisseau, données en poids et en volume.

| Vaisseau | Poids   | Volume   |
| -------- | ------- | -------- |
| TCB      | 100 t   | 100 m³   |
| VSC      | 250 t   | 250 m³   |
| SCB      | 500 t   | 500 m³   |
| MCB      | 1 000 t | 1 000 m³ |
| LCB      | 2 000 t | 2 000 m³ |
| WCB      | 3 000 t | 1 000 m³ |
| VCB      | 1 000 t | 3 000 m³ |
| HCB      | 5 000 t | 5 000 m³ |

Le préréglage débutant de ROI des bases utilise le SCB comme vaisseau de départ. Voir [ROI des bases](/help/tools_base_roi#settings).

## COGC {#cogc}

Le programme de la Chambre de Commerce Globale qui tourne sur une planète. Un programme publicitaire accélère de 25 % les bâtiments d'une expertise, et un programme de main-d'œuvre accélère de 10 % les bâtiments qui emploient cette catégorie de main-d'œuvre.

Dans le jeu, les résidents (les joueurs qui ont une base sur la planète) votent pour le programme, et le programme gagnant tourne pendant une semaine. Tu choisis le programme dans les réglages de planète d'un plan, et Recherche de planètes peut filtrer dessus. Voir [Recherche de planètes](/help/planet_search#cogc-and-infrastructure).

## COGM {#cogm}

Coût des biens fabriqués (cost of goods manufactured) : ce que coûte une unité du produit d'une recette dans un plan, à partir des prix des intrants, de la main-d'œuvre, de l'usure, des frais de production, de la durée et de l'efficacité.

Le coût d'un cycle est la part du cycle dans l'usure et le coût de main-d'œuvre quotidiens du bâtiment, plus ses intrants et ses frais de production. La part, c'est la durée du cycle à l'efficacité du bâtiment ÷ 24 h.

Un exemple inventé : une recette tourne 12 h à 100 % d'efficacité, donc sa part est 12 ÷ 24 = 0,5. Le bâtiment a coûté 18 000 ȼ à construire, donc son usure est de 18 000 ÷ 180 = 100 ȼ par jour, et la part du cycle est de 50 ȼ. Sa main-d'œuvre coûte 400 ȼ par jour, donc la part du cycle est de 200 ȼ. Avec 1 000 ȼ d'intrants et 50 ȼ de frais, le cycle coûte 50 + 200 + 1 000 + 50 = 1 300 ȼ. S'il produit 10 unités, le COGM est de 1 300 ÷ 10 = 130 ȼ par unité.

Quand une recette a plusieurs produits, PRUNplanner répartit le coût selon la quantité, ou l'impute en entier à chaque produit. Un COGM peut aussi devenir un prix fixe dans ta préférence d'échange. Voir [Outils du plan](/help/plan_tools) et [Prix fixes et COGM](/help/exchanges#fixed-prices-and-cogm).

Si le même cycle produisait 10 unités d'un produit et 5 d'un sous-produit, la répartition impute 1 300 ÷ 15 ≈ 86,67 ȼ à chaque unité des deux. L'imputation en entier donne 1 300 ÷ 10 = 130 ȼ par unité au premier produit et 1 300 ÷ 5 = 260 ȼ par unité au sous-produit.

## Panier de construction {#construction-cart}

Un outil du plan qui liste les matériaux qu'il te reste à acheter pour les bâtiments du plan, une fois déduits les bâtiments déjà présents sur la base.

Les bâtiments présents viennent de tes données FIO, ou tu les saisis toi-même. Tu obtiens la liste sous forme de tableau ou d'action XIT. Voir [Outils du plan](/help/plan_tools).

## Module central {#core-module}

Le bâtiment central de chaque base. Il prend 25 de surface de la base, et les plans le comptent toujours parmi les bâtiments à construire.

On l'appelle aussi CM.

## QG de corp. {#corp-hq}

Le siège social de la corporation dont tu fais partie, quand il se trouve sur la planète du plan. Ce n'est pas le QG de ta propre société. Il accélère de 10 % chaque bâtiment du plan.

Active-le dans les réglages de planète d'un plan. Voir [Configuration de la base](/help/plan_base). Le siège social de ta propre société est une autre chose, traitée sous Niveau du QG.

## Crédits (ȼ) {#currency}

L'argent du jeu. PRUNplanner affiche chaque prix, coût et bénéfice en crédits, notés ȼ.

Les frais de production sont fixés dans la monnaie de la planète. PRUNplanner les ajoute aux coûts à un pour un, en ȼ.

## CX {#cx}

Un échange de marchandises (commodity exchange), l'un des marchés du jeu tenus par les joueurs, chacun avec son propre carnet d'ordres. Les prix et les volumes de PRUNplanner couvrent AI1, CI1, IC1 et NC1.

AI1 se trouve à Antares, CI1 à Benten, IC1 à Hortus et NC1 à Moria. Marché en direct affiche aussi CI2 (Arclight) et NC2 (Hubur), et les actions XIT peuvent partir de leurs entrepôts. Les échanges hors du CX, sur les marchés locaux ou par contrat, ne figurent pas dans ces données. Voir [Bourses](/help/exchanges).

## Dégradation {#degradation}

Les bâtiments s'usent avec le temps. Les plans le comptent comme un coût quotidien de 1 ⁄ 180 du coût de construction des bâtiments de production.

Par exemple, des bâtiments de production qui coûtent 180 000 ȼ à construire ajoutent 180 000 ÷ 180 = 1 000 ȼ par jour au coût du plan.

La dégradation compte dans le coût et le bénéfice d'un plan, et dans le COGM. On l'appelle aussi usure. Voir Réparation pour le fonctionnement de l'état et des coûts de réparation.

## Efficacité {#efficiency}

La vitesse de production d'un bâtiment comparée à la durée de base de sa recette. À 100 %, il fait tourner une recette en sa durée de base, et à 125 % en 80 % de cette durée.

L'efficacité d'un bâtiment est le produit de ses facteurs : fertilité (fermes uniquement), QG de corp., COGC, experts, main-d'œuvre et faction. Un plan affiche chaque facteur pour chaque bâtiment. Voir [Configuration de la base](/help/plan_base).

Par exemple, un bâtiment avec le programme publicitaire COGC de son expertise (× 1,25), un QG de corp. (× 1,1) et des travailleurs entièrement logés avec les deux produits de luxe (× 1), sans autre facteur, tourne à 1,25 × 1,1 × 1 = 1,375, soit 137,5 %. Une recette avec une durée de base de 10 h prend alors 10 ÷ 1,375 ≈ 7,3 h.

## Empire {#empire}

Un groupe nommé de tes plans, avec une faction et un nombre de permis. La faction et les permis donnent à chaque plan son bonus de faction, et la préférence d'échange de l'empire fixe les prix de tous ses plans.

Un plan peut appartenir à plusieurs empires, et ses chiffres dépendent de l'empire dans lequel tu l'ouvres. Tu crées et modifies les empires dans Gestion. Voir [Gestion](/help/management#empires).

## Préférence d'échange {#exchange-preference}

Tes règles pour les prix qu'utilisent les plans : quel échange et quelle base de prix (VWAP 7j, VWAP 30j, ask ou bid), plus des prix fixes pour des matériaux précis. Tu en attribues une à un empire.

Une règle peut s'appliquer à l'achat, à la vente ou aux deux, et à toutes les planètes ou à une seule. PRUNplanner utilise la première règle qui correspond, dans cet ordre : un prix fixe pour la planète, un prix fixe pour toutes les planètes, une règle d'échange pour la planète, une règle d'échange pour toutes les planètes. Si aucune ne correspond, il utilise Univers VWAP 30j. On l'appelle aussi préférence CX ou CX par défaut. Voir [Comment un prix est trouvé](/help/exchanges#how-a-price-is-found).

## Expertise {#expertise}

Le domaine d'un bâtiment de production : Agriculture, Chimie, Construction, Électronique, Industries alimentaires, Raffinage de carburant, Fabrication, Métallurgie ou Extraction de ressources.

Les experts, les programmes publicitaires COGC et les bonus de faction agissent chacun sur les bâtiments d'une expertise.

## Experts {#experts}

Des spécialistes d'une base qui accélèrent ses bâtiments d'une expertise. Ils arrivent avec le temps en faisant tourner les bâtiments de production de cette expertise, et plus il y a de bâtiments, plus ils arrivent vite.

| Experts | Accélération |
| ------- | ------------ |
| 1       | 3,06 %       |
| 2       | 6,96 %       |
| 3       | 12,48 %      |
| 4       | 19,74 %      |
| 5       | 28,4 %       |

Un plan accepte au plus 5 experts par expertise, et avertit quand une base en a plus de 6 au total. Voir [Configuration de la base](/help/plan_base).

## Matériaux de construction supplémentaires {#extra-building-materials}

Des matériaux qu'une planète ajoute à la construction de chaque bâtiment, à cause de sa surface, de sa gravité, de sa pression ou de sa température.

| Planète                | Matériau supplémentaire |
| ---------------------- | ----------------------- |
| Surface rocheuse       | MCG                     |
| Gazeuse (sans surface) | AEF                     |
| Faible gravité         | MGC                     |
| Forte gravité          | BL                      |
| Basse pression         | SEA                     |
| Haute pression         | HSE                     |
| Basse température      | INS                     |
| Haute température      | TSH                     |

Ils augmentent le coût de construction d'un plan. Recherche de planètes les affiche pour chaque planète. Voir [Recherche de planètes](/help/planet_search#reading-the-results).

## Extraction {#extraction}

Prélever une ressource d'une planète avec un EXT (minéraux), un RIG (liquides) ou un COL (gaz). La quantité par cycle dépend du taux quotidien de la planète pour cette ressource.

Un cycle rapporte le taux quotidien de la planète × une part de la journée (12 h pour EXT, 4,8 h pour RIG, 6 h pour COL), arrondi au supérieur en unités entières. Il dure le temps qu'il faut pour cette quantité au taux quotidien. Un cycle peut donc durer un peu plus que sa part, et la production par jour correspond au taux de la planète.

Par exemple, avec un taux quotidien de 7 pour un minéral, un cycle EXT rapporte 7 × 12 ÷ 24 = 3,5, arrondi à 4 unités, et dure 4 ÷ 7 de journée, environ 13,7 h. Quatre unités toutes les 13,7 h font bien les 7 par jour de la planète.

## Faction {#faction}

La faction de ta société, réglée par empire. Les bâtiments de l'expertise de la faction reçoivent un bonus qui augmente quand tu utilises moins de tes permis.

| Faction        | Bonus de base                                                          |
| -------------- | ---------------------------------------------------------------------- |
| Antares        | Électronique 5 %                                                       |
| Benten         | Fabrication 5 %                                                        |
| Hortus         | Agriculture 3 %, Industries alimentaires 2 %                           |
| Moria          | Métallurgie 2 %, Construction 3 %                                      |
| Hors région    | Chimie, Raffinage de carburant et Extraction de ressources 2 % chacune |
| Aucune faction | aucun                                                                  |

PRUNplanner multiplie le bonus de base par 2 × (3 − 2 × permis utilisés ÷ permis au total), d'après les permis de l'empire. Avec tous les permis utilisés, c'est × 2, donc Antares donne 10 % en Électronique. Avec un tiers d'entre eux utilisés, c'est environ × 4,67.

## Fertilité {#fertility}

Une propriété de la planète que seules les fermes (FRM et ORC) utilisent. Une fertilité plus élevée les rend plus rapides, et une planète sans fertilité ne peut pas les faire tourner.

Le facteur de fertilité d'une ferme vaut 1 + fertilité × 10 ⁄ 33. Recherche de planètes peut filtrer par fertilité. Voir [Recherche de planètes](/help/planet_search#planet-conditions).

## FIO {#fio}

L'API communautaire qui reflète les données du jeu. Avec ton nom d'utilisateur FIO et ta clé API dans ton profil, PRUNplanner lit aussi ton stockage, tes sites et tes vaisseaux.

Les données de jeu et d'échange de PRUNplanner viennent de FIO. Consommation FIO, Réparer FIO et les paniers du plan utilisent tes propres données FIO. Voir [Profil](/help/profile).

## Prix fixe {#fixed-price}

Un prix que tu fixes toi-même pour un matériau dans une préférence d'échange, à l'achat, à la vente ou aux deux, sur toutes les planètes ou une seule. Il l'emporte sur les règles d'échange.

Utilise-le pour les matériaux que tu produis toi-même ou que tu obtiens d'un partenaire. Voir [Prix fixes et COGM](/help/exchanges#fixed-prices-and-cogm).

## Sites fantômes {#ghost-sites}

Des bases sur une planète au-delà de son nombre de parcelles. Sur les planètes de départ, un nouveau joueur qui y commence peut encore s'installer une fois toutes les parcelles prises. Personne d'autre ne le peut.

Dans le jeu, les sites fantômes existent sur les planètes de départ pour les nouveaux joueurs. Un nouveau joueur qui y commence peut s'installer même quand toutes les parcelles sont prises. Si ta planète de départ est ailleurs, tu ne peux pas t'installer sur une telle planète une fois qu'elle n'a plus de parcelle libre. Recherche de planètes marque une planète pleine qui permet les sites fantômes « Complète · sites fantômes ». Voir [Parcelles](/help/planet_search#plots).

## Habitations {#habs}

Les bâtiments d'habitation qui logent la main-d'œuvre d'une base. HB1 à HB5 logent chacun une catégorie, tandis que HBB, HBC, HBM et HBL logent des catégories mixtes.

Un logement insuffisant réduit l'efficacité de la main-d'œuvre. Un plan peut dimensionner automatiquement ses habitations selon la main-d'œuvre, et c'est activé pour les nouveaux plans. Voir [Configuration de la base](/help/plan_base).

## Niveau du QG {#hq-level}

Le niveau du siège social de ta propre société. Chaque amélioration de niveau du QG te donne un permis de base de plus.

Le Calculateur de QG liste et chiffre les matériaux d'un niveau à un autre. Sa plage s'arrête au niveau 50, mais c'est la plage du calculateur, pas une limite du jeu. ROI des bases peut ajouter l'amélioration pour un permis de plus au coût d'une base. Voir [Calculateur de QG](/help/tools_hq_upgrade_calculator).

## Sauts {#jumps}

Le nombre de sauts de système à système sur la route la plus courte entre deux lieux.

Recherche de planètes calcule les sauts dans ton navigateur, vers les échanges et vers tes plans. Un « — » signifie qu'il n'existe pas de route par sauts, et qu'un vaisseau de colonisation est nécessaire. Voir [Distance](/help/planet_search#distance).

## Produits de luxe {#luxuries}

Deux consommables facultatifs par catégorie de main-d'œuvre, comme PWO et COF pour les Pionniers. Les fournir augmente l'efficacité de la main-d'œuvre, au prix de leur consommation quotidienne.

Les travailleurs logés sans produits de luxe travaillent à environ 79 %. Le premier produit de luxe porte cela à environ 87 %, le second à environ 92 %, et les deux ensemble à 100 %. Les produits de luxe que tu n'actives pas ne sont pas consommés. Voir [Configuration de la base](/help/plan_base).

## Capacité du marché {#market-capacity}

Dans ROI des bases, combien de bases comme celle-ci le marché peut absorber : le volume échangé par jour sur l'échange (le total des 7 derniers jours ÷ 7, jours sans transaction compris) ÷ ce qu'une base vend ou consomme par jour.

Par exemple, s'il s'échange 1 000 unités d'un produit par jour sur l'échange et qu'une base en vend 250 par jour, la capacité est de 1 000 ÷ 250 = 4 bases.

ROI des bases la vérifie pour chaque produit et chaque intrant de recette sur 7 jours, et c'est la plus faible qui compte. En dessous de 1, une seule base produit ou consomme plus que ce que le marché échange. Voir [ROI des bases](/help/tools_base_roi#metrics).

## Teneur de marché {#market-maker}

Des ordres du jeu lui-même, pas de joueurs, qui achètent ou vendent certains biens de niveau 1 à prix fixes. Pour ces biens, leur prix sert de plancher ou de plafond.

Les joueurs signalent des teneurs de marché sur des biens comme les produits agricoles, les préfabriqués de base et les consommables, et disent que le jeu a déjà modifié leurs prix. Les transactions avec les teneurs de marché comptent dans le VWAP de l'échange comme n'importe quelle autre transaction. PRUNplanner n'utilise pas les prix d'achat et de vente propres aux teneurs de marché que FIO rapporte.

## E/S des matériaux {#material-io}

Ce qu'un plan ou un empire consomme et produit par matériau et par jour, et la différence (Δ).

Tu peux l'afficher en ȼ, en t, en m³ ou en part du marché. Voir [Résultats du plan](/help/plan_results).

## Configuration optimale {#optimal-setup}

La base de 500 de surface sur laquelle les outils ROI comparent les recettes : des bâtiments de production plus les habitations et le stockage dont ils ont besoin, avec 5 experts et le COGC correspondant, sur une planète aux conditions normales.

Le bénéfice par surface sur cette configuration te permet de comparer les bâtiments entre eux. Voir [ROI recette](/help/tools_roi_overview).

## Amortissement {#payback}

Le nombre de jours qu'il faut au bénéfice quotidien d'un plan pour payer sa construction : coût de construction ÷ bénéfice par jour. Un plan qui ne fait pas de bénéfice n'est jamais amorti.

La Rentabilité de ROI des bases peut aussi compter un stock tampon, l'amélioration du QG et le temps jusqu'à l'arrivée des experts. Voir [ROI des bases](/help/tools_base_roi#metrics).

Par exemple, un plan qui coûte 1 200 000 ȼ à construire et fait 30 000 ȼ de bénéfice par jour est amorti en 1 200 000 ÷ 30 000 = 40 jours. La Rentabilité de ROI des bases ajoute ses coûts supplémentaires au coût de construction. Avec un nombre d'experts fixe, sans stock tampon et avec une amélioration du QG à 300 000 ȼ, la même base devient rentable après 1 500 000 ÷ 30 000 = 50 jours.

## Plan {#plan}

Une base sur une planète telle que PRUNplanner la calcule : bâtiments et recettes, habitations et stockage, experts, produits de luxe de la main-d'œuvre, programme COGC, QG de corp. et permis.

Les chiffres d'un plan dépendent de l'empire dans lequel tu l'ouvres (faction et permis) et de la préférence d'échange de cet empire. Voir [Disposition du plan](/help/plan_layout).

## Projets planétaires {#planetary-projects}

Des bâtiments à l'échelle de la planète : LM (marché local), COGC, WAR (entrepôt), ADM (centre administratif) et SHY (chantier naval). Chacun prend une parcelle de la planète.

Recherche de planètes les affiche comme infrastructures et peut filtrer dessus. Voir [Recherche de planètes](/help/planet_search#cogc-and-infrastructure).

## Parcelles {#plots}

Les emplacements de construction d'une planète. Chaque base en prend un, tout comme les QG de corporation et les projets planétaires.

Les parcelles libres sont le total des parcelles de la planète moins les sites qui ne sont pas des sites fantômes. Recherche de planètes les affiche dans sa colonne Parcelles, telles que FIO a vu la planète pour la dernière fois. Voir [Parcelles](/help/planet_search#plots).

## POPR {#popr}

Rapport de population (population report) : les chiffres d'une planète sur sa population, comme les travailleurs et les travailleurs disponibles par catégorie, et ses infrastructures. Le jeu le publie chaque semaine.

L'outil POPR d'un plan affiche le dernier rapport de sa planète. Voir [Outils du plan](/help/plan_tools).

## Frais de production {#production-fees}

Des frais que le gouverneur de la planète fixe par expertise et par catégorie de main-d'œuvre, payés pour chaque ordre de production sur la durée de base de la recette. Les bâtiments plus rapides font tourner plus d'ordres, donc ils paient plus par jour.

PRUNplanner les compte par jour comme les frais pondérés par la main-d'œuvre du bâtiment × l'efficacité du bâtiment. Ils comptent dans les plans, la Répartition des bénéfices, Empire, ROI des bases et Chaînes de production, et dans le COGM. Voir [Résultats du plan](/help/plan_results).

## Bénéfice {#profit}

Les recettes quotidiennes d'un plan moins son coût quotidien. Les recettes sont ce qu'il vend. Le coût est ce qu'il achète, plus l'usure et les frais de production.

PRUNplanner valorise les matériaux vendus aux prix de vente, et les matériaux achetés et les consommables de la main-d'œuvre aux prix d'achat, tous tirés de la préférence d'échange de l'empire. L'usure vaut 1 ⁄ 180 du coût de construction des bâtiments de production par jour. Voir [Résultats du plan](/help/plan_results).

## Recette {#recipe}

Une étape de production d'un bâtiment, où des intrants se transforment en produits sur une durée de base. Un bâtiment fait tourner ses recettes l'une après l'autre.

## Réparation {#repair}

Les bâtiments perdent de leur état avec le temps, et de l'efficacité avec. Réparer un bâtiment coûte une partie de ses matériaux de construction, et plus tu attends, plus cela coûte cher.

PRUNplanner modélise un coût de réparation qui augmente chaque jour jusqu'au jour 180, où il coûte autant qu'un bâtiment neuf, et une efficacité qui baisse vers 33 %. Voir [Réparer FIO](/help/fio_repair).

## ROI {#roi}

Retour sur investissement (return on investment). PRUNplanner l'affiche en jours d'amortissement : coût de construction ÷ bénéfice par jour.

ROI recette, ROI ressource et ROI des bases classent les recettes, les ressources et les bases selon ce critère. Voir [ROI recette](/help/tools_roi_overview).

## Part du volume {#share-of-volume}

Ce qu'un plan ou un empire achète ou vend d'un matériau par jour ÷ ce qui s'en est échangé par jour sur l'échange, en moyenne sur 30 jours.

Contrôle du plan signale une part en orange à partir de 10 % et en rouge à partir de 50 %. Voir [Contrôle du marché](/help/plan_check#market-check).

Par exemple, si un plan achète 50 unités par jour et qu'il s'en est échangé 6 000 unités sur l'échange ces 30 derniers jours, cela fait 200 par jour, donc la part est de 50 ÷ 200 = 25 %, en orange.

## Plan partagé {#shared-plan}

Un lien vers l'un de tes plans. Toute personne qui l'a voit le plan et peut essayer des changements sur sa propre copie. Ton plan ne change jamais.

Le lien cesse de fonctionner quand tu arrêtes le partage ou supprimes le plan. Voir [Partager un plan](/help/plan_sharing).

## Écart (spread) {#spread}

L'écart entre l'ask et le bid sur un échange, en part de l'ask : (ask − bid) ÷ ask. Un écart large signifie qu'échanger tout de suite coûte plus cher.

Par exemple, un ask de 100 ȼ et un bid de 80 ȼ donnent un écart de (100 − 80) ÷ 100 = 20 %.

Contrôle du plan affiche l'écart mais ne le signale pas. Voir [Contrôle du plan](/help/plan_check#market-check).

## Stockage {#storage}

Les bâtiments de stockage : STO, STA, STE, STV et STW. Leur capacité en poids et en volume fixe combien de jours d'importations et d'exportations quotidiennes de la base ils peuvent contenir.

Le stockage d'un plan fixe sa fréquence de visite. Voir [Outils du plan](/help/plan_tools).

## Panier d'approvisionnement {#supply-cart}

Un outil du plan qui liste les consommables et les intrants dont une base a besoin pour un nombre de jours (20 par défaut), moins ce que contient son stockage FIO.

Tu obtiens la liste sous forme de tableau ou d'action XIT. XIT initial expédie aussi les intrants que le plan produit lui-même, pour le premier approvisionnement. Voir [Outils du plan](/help/plan_tools).

## Marché étroit {#thin-market}

Dans Chaînes de production, un matériau acheté dont la chaîne a besoin à hauteur de 10 % ou plus de ce qui s'échange par jour sur l'échange, ou qui ne s'est pas échangé depuis 30 jours.

Voir [Avertissements](/help/tools_production_chain#warnings).

## Ticker {#ticker}

Le code court d'un matériau ou d'un bâtiment, comme dans le jeu : DW pour l'eau potable, PP1 pour l'usine de préfabriqués.

La recherche, les filtres et les actions XIT utilisent les tickers.

## Univers {#universe}

La moyenne de PRUNplanner sur les quatre échanges AI1, CI1, IC1 et NC1. Ce n'est pas un endroit où l'on peut échanger.

PRUNplanner utilise le VWAP 30j Univers pour chaque prix qu'aucune règle de ta préférence d'échange ne couvre, et pour chaque prix d'un empire qui n'en a pas. Voir [Comment un prix est trouvé](/help/exchanges#how-a-price-is-found).

## Entretien {#upkeep}

Ce que coûte le fonctionnement. Dans Chaînes de production, c'est le coût quotidien des consommables de la main-d'œuvre. Dans Coûts d'entretien, ce sont les matériaux que les bâtiments planétaires consomment pour couvrir les besoins de la population.

Les besoins de la population sont la sécurité, la santé, le confort, la culture et l'éducation. Voir [Coûts d'entretien](/help/tools_upkeep_price_calculator).

## Fréquence de visite {#visitation}

Un outil du plan qui montre combien de jours il faut pour que le stockage de la base se remplisse avec ce qu'elle importe et exporte par jour. C'est la fréquence à laquelle un vaisseau doit passer.

Tu peux exclure des matériaux du calcul. Voir [Outils du plan](/help/plan_tools).

## VWAP {#vwap}

Prix moyen pondéré par le volume (volume-weighted average price) : les crédits échangés pour un matériau sur un échange ÷ les unités échangées, sur les 7 ou 30 derniers jours.

Par exemple, si 100 unités s'échangent à 10 ȼ un jour sur un échange (1 000 ȼ) et 300 unités à 12 ȼ un autre jour (3 600 ȼ), le VWAP sur ces jours est de 4 600 ÷ 400 = 11,5 ȼ. Le jour le plus actif pèse davantage, donc il est au-dessus de la simple moyenne de 11 ȼ.

Sans échange sur les 7 derniers jours, le VWAP 7j utilise le prix du dernier jour où le matériau s'est échangé, tant que ce jour se situe dans les 30 derniers jours. Après 30 jours sans échange, les deux valent 0. Voir [Base de prix](/help/exchanges#price-basis-vwap-ask-and-bid).

Un VWAP de 0 signifie que le matériau ne s'est pas échangé sur cet échange depuis 30 jours. Un plan qui utilise ce prix le compte à 0 ȼ, et Contrôle du plan le signale par « Pas de prix ». Voir [Contrôle du plan](/help/plan_check#flags).

## Main-d'œuvre {#workforce}

Les travailleurs dont les bâtiments ont besoin, en cinq catégories : Pionniers, Colons, Techniciens, Ingénieurs et Scientifiques. Les habitations les logent, et ils consomment chaque jour de la nourriture, de l'eau et d'autres biens.

Les travailleurs logés sans produits de luxe travaillent à environ 79 % d'efficacité. Un logement insuffisant la réduit en proportion. Voir [Configuration de la base](/help/plan_base).

## XIT {#xit}

Un paquet d'actions que PRUNplanner construit, comme des achats sur le CX, des transferts de matériaux ou des réparations, pour que Refined PrUn l'exécute dans le jeu avec XIT ACT. PRUNplanner ne fait jamais d'échanges à ta place.

Consommation FIO, Réparer FIO et les paniers du plan construisent des actions XIT. Après un vol de réparation XIT, tu lances BRA dans le jeu, la commande qui répare tous les bâtiments d'une base. Voir [Réparer FIO](/help/fio_repair#prices).
