Sur la page [Bourses](/exchanges), tu décides quels prix tes plans utilisent. Définis un échange principal, choisis une base de prix, ajoute des prix fixes pour les matériaux que tu fabriques toi-même, et crée des exceptions pour certaines planètes. Chaque chiffre de bénéfice, de coût et de ROI dans PRUNplanner dépend de ces prix.

Viens ici quand tu veux savoir d'où vient un prix dans tes plans, ou pour le modifier. L'[Aperçu](#overview) montre chaque prix utilisé par tes plans et la règle qui le fixe, et rien de ce que tu modifies n'atteint tes plans avant que tu enregistres.

## Préférences d'échange {#exchange-preferences}

Une [[exchange-preference|préférence d'échange]] définit les prix utilisés par tes plans. Elle choisit l'[[cx|échange]] et la base de prix, et contient les [[fixed-price|prix fixes]] des matériaux que tu obtiens à ton propre coût ou auprès d'un partenaire.

- Une préférence appartient à ton compte. Tu l'attribues à un [[empire|empire]] dans [Gestion](/manage), dans la colonne CX de **Configuration de l'empire**. Un empire a une seule préférence, et une préférence peut servir plusieurs empires.
- Un [[plan|plan]] n'a pas de préférence à lui. Il utilise la préférence de l'empire dans lequel il est ouvert, donc un plan présent dans deux empires peut afficher des prix différents dans chacun.
- Un empire sans préférence (« Aucune ») évalue tout à **Universe · VWAP 30j**.
- Chaque nouveau compte commence avec « My Exchange Preference », réglée sur Univers · VWAP 30j pour l'achat et la vente et attribuée à « My Empire ».

Tu crées, renommes et supprimes les préférences dans [Gestion](/help/management#cx). Cette page modifie les règles d'une préférence à la fois, que tu choisis sous **Changer de préférence**. Sous la liste déroulante, tu vois quels empires l'utilisent, ou qu'aucun empire ne l'utilise.

## La liste des règles {#rules-list}

La colonne de gauche liste les parties de la préférence que tu peux ouvrir. Sur les écrans de moins de 1 024 px, c'est une liste déroulante à la place.

| Entrée                                          | Ce qu'elle affiche                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aperçu**                                      | Chaque prix utilisé par tes plans, voir [Aperçu](#overview)                                                                                                                                     |
| **Toutes les planètes**                         | Ton échange principal et les prix fixes pour toutes les planètes                                                                                                                                |
| **Planètes avec leurs propres règles**          | Les planètes avec une [exception](#planet-exceptions)                                                                                                                                           |
| **Utilisent les règles de toutes les planètes** | Les planètes des empires qui utilisent cette préférence et suivent les règles de toutes les planètes (regroupées par empire quand plusieurs empires utilisent la préférence) |
| **Planètes d'autres empires**                   | Les planètes des empires qui n'utilisent pas cette préférence, affichées une fois que tu as appuyé sur le bouton pour les montrer                                                               |
| **Dans aucun plan**                             | Les planètes avec des règles enregistrées qu'aucun de tes plans n'utilise                                                                                                                       |

**Toutes les planètes** et chaque planète avec des règles enregistrées indiquent combien de règles elles ont, et le nombre passe en orange quand l'entrée a une note d'avertissement. À partir de 10 planètes, un champ **Filtrer les planètes** apparaît.

## Aperçu {#overview}

La page s'ouvre sur l'**Aperçu**. Il liste chaque matériau que les plans des empires utilisant cette préférence achètent ou vendent, le prix qu'il obtient et la règle qui le fixe. Tant que les planètes d'autres empires sont affichées, leurs plans comptent aussi. Il inclut les modifications non enregistrées, donc tu vois l'effet d'une modification avant d'enregistrer. Les matériaux qu'un plan ni n'achète ni ne vend (solde 0) sont omis.

- Le résumé en haut affiche la règle de **Toutes les planètes**, combien de planètes ont leurs propres règles et combien de prix fixes il y a.
- **Rechercher un matériau** et **Afficher les matériaux** (**Tous**, **Fixes**, **Sans prix (0 ȼ)**, **Varie selon la planète**) affinent le tableau.
- Le tableau liste **Matériau**, **Achat ȼ**, **Vente ȼ** et **Utilisé sur** (les trois premières planètes, le reste sous la forme « +n »). Quand des planètes obtiennent des prix différents, tu vois la fourchette et une étiquette « varie selon la planète ». Sur les écrans de moins de 1 024 px, le tableau affiche un côté à la fois, les prix d'achat d'abord, avec un sélecteur pour le côté vente, et omet **Utilisé sur**.
- Une étiquette indique d'où vient chaque prix, par exemple « NC1 · VWAP 30j », **Fixe · toutes les planètes**, **Fixe · cette planète** ou **Aucune donnée de prix**. Les prix de 0 ȼ sans prix fixe sont en orange.
- Déplie une ligne pour voir toute l'échelle de [la façon dont le prix est trouvé](#how-a-price-is-found), pour chaque côté et chaque planète. **Ouvrir la règle** saute à la règle qui l'a fixé.

Pendant que PRUNplanner calcule tes plans, le tableau affiche **Calcul de tes plans…** avec une barre de progression.

### Notes {#notes}

Les notes au-dessus du tableau signalent les règles à examiner. Les avertissements viennent en premier, et **Ouvrir** t'amène à la règle.

| Note                                                                          | Type          | Que faire                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Une règle n'a pas de prix d'achat ou de vente pour certains matériaux         | Avertissement | Ces matériaux comptent pour 0 ȼ. Définis un prix fixe ou choisis un autre échange ou une autre base. |
| Un matériau n'a de prix sur aucun échange                                     | Avertissement | Il compte pour 0 ȼ. Définis un prix fixe si tu en connais un.                                        |
| Un matériau est fixé à 0 ȼ                                                    | Info          | Pas de souci s'il s'agit de ton propre approvisionnement et qu'il ne te coûte rien.                                  |
| Des prix d'achat fixes diffèrent de leur COGM                                 | Info          | Aperçu uniquement. Voir [Prix fixes et COGM](#fixed-prices-and-cogm).                                |
| La règle d'échange d'une planète est identique à celle de toutes les planètes | Info          | Tu peux la retirer.                                                                                                  |
| **Aucun empire n'utilise cette préférence**                                   | Info          | Attribue-la dans la Gestion.                                                                                         |
| Des règles pour des planètes qui ne sont dans aucun plan                      | Info          | Supprime-les sous **Dans aucun plan** si tu n'en as pas besoin.                                                      |

## Comment un prix est trouvé {#how-a-price-is-found}

Pour chaque matériau, PRUNplanner cherche un prix d'achat (pour ce qu'un plan consomme) et un prix de vente (pour ce qu'il produit). Il vérifie ces niveaux dans l'ordre et prend la première règle qui correspond :

1. **Prix fixe de la planète** : un prix fixe défini sur cette planète
2. **Prix fixe de toutes les planètes**
3. **Échange de la planète** : la règle d'échange définie sur cette planète
4. **Échange de toutes les planètes**
5. **Universe · VWAP 30j**, quand aucune règle ci-dessus ne correspond

Ainsi, un prix fixe de toutes les planètes l'emporte sur la règle d'échange d'une planète.

Un exemple : **Toutes les planètes** a NC1 · VWAP 30j pour l'achat et la vente, et un prix d'achat fixe de 45 ȼ pour RAT. Une planète a sa propre règle d'échange, CI1 · Ask, pour l'achat uniquement. Sur cette planète :

- Acheter du RAT donne 45 ȼ : la planète n'a pas de prix fixe à elle, donc le prix fixe de toutes les planètes (niveau 2) correspond en premier.
- Acheter du H2O donne l'Ask de CI1 : aucun prix fixe ne correspond, donc c'est la règle d'échange de la planète (niveau 3) qui s'applique.
- Vendre du RAT donne le VWAP 30j de NC1 : il n'y a pas de prix de vente fixe, et la règle de la planète ne vaut que pour l'achat, donc c'est l'échange de toutes les planètes (niveau 4) qui correspond.

### Achat, vente ou les deux {#buy-sell-or-both}

Une règle peut s'appliquer à l'achat, à la vente ou aux deux. Si un niveau n'a pas de règle pour le côté dont un plan a besoin, PRUNplanner saute ce niveau et vérifie le suivant, jusqu'à Univers · VWAP 30j. Cela arrive par exemple quand un niveau n'a qu'une règle d'achat et que le plan vend le matériau.

### Échanges sans prix {#exchanges-without-a-price}

Quand une règle d'échange correspond mais que son échange n'a pas de prix pour un matériau, le prix est de 0 ȼ. Il ne passe pas au niveau suivant. Cela arrive avec Ask quand personne ne propose le matériau, avec Bid quand personne n'en veut, et avec VWAP quand l'échange n'a eu aucune transaction ces 30 derniers jours. Un matériau sans aucune donnée d'échange affiche **Aucune donnée de prix** et compte aussi pour 0 ȼ.

Un prix de 0 ȼ change les chiffres de ton plan : un matériau qu'il achète à 0 ȼ ne coûte rien, et un matériau qu'il vend à 0 ȼ ne rapporte rien. Le bénéfice d'un plan peut donc paraître meilleur ou pire qu'il ne le serait sur le marché.

La page affiche ces prix en orange et les liste dans les [notes](#notes), pour que tu puisses définir un prix fixe ou choisir un autre échange ou une autre base.

## Base de prix : VWAP, Ask et Bid {#price-basis-vwap-ask-and-bid}

| Base              | Ce que c'est                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VWAP 7j, VWAP 30j | Le [[vwap\|prix moyen pondéré par le volume]] des 7 ou 30 derniers jours. Les transactions de plus gros volume comptent davantage, donc une transaction isolée le fait peu bouger. |
| Ask               | L'offre la moins chère du carnet d'ordres en ce moment : ce que tu paies en achetant tout de suite.                                                                                                                                                                                        |
| Bid               | L'ordre d'achat le plus élevé du carnet d'ordres en ce moment : ce que tu obtiens en vendant tout de suite.                                                                                                                                                                                |

[[ask|Ask]] et [[bid|Bid]] viennent du carnet d'ordres en direct : ils peuvent donc changer à tout moment et manquer pour les matériaux peu échangés. Quand un échange n'a eu aucune transaction ces 7 derniers jours, le VWAP 7j utilise le prix du dernier jour où le matériau a été échangé. Les deux VWAP ne valent 0 que s'il n'y a eu aucune transaction du tout ces 30 derniers jours.

Un exemple de VWAP avec des chiffres inventés : un jour, 100 unités s'échangent pour 5 000 ȼ au total (50 ȼ chacune), et un autre jour 10 unités pour 1 000 ȼ (100 ȼ chacune). Le VWAP est les crédits ÷ les unités, (5 000 + 1 000) ÷ (100 + 10) ≈ 54,55 ȼ. Une simple moyenne des deux prix donnerait 75 ȼ : le petit jour plus cher fait donc bien moins bouger le VWAP.

Ce que la base change pour tes plans : le VWAP est un seul prix pour les deux côtés, donc avec la même règle VWAP pour l'achat et la vente, un matériau obtient le même prix d'achat et de vente. Avec Ask pour l'achat et Bid pour la vente, un plan achète à l'offre la moins chère et vend à l'ordre d'achat le plus élevé, et l'écart entre les deux, l'[[spread|écart]], se voit dans son bénéfice.

L'[[universe|Univers]] combine les quatre échanges et n'a que des prix VWAP. PRUNplanner rafraîchit les prix des échanges environ toutes les 30 minutes.

## Définir une règle d'échange {#exchange-rule}

Le cadre **Prix d'échange** sur **Toutes les planètes** et sur chaque planète définit la règle d'échange. Choisis ensuite l'une de ces options :

- **Identique pour l'achat et la vente** : un échange et une base pour les deux côtés.
- **Achat et vente séparés** : un échange et une base propres à chaque côté. Un côté peut rester **Non défini**, et passe alors au niveau suivant.
- **Utiliser la règle de toutes les planètes** (planètes uniquement) : la planète suit la règle de toutes les planètes, affichée sous la forme « Utilise la règle de toutes les planètes : … ».

Pour chaque côté, tu choisis **Échange pour {side}** (AI1, CI1, IC1, NC1 ou Univers) et **Base de prix pour {side}** (VWAP 7j, VWAP 30j, Ask, Bid). Univers ne propose que les deux VWAP. Quand tu fais passer une planète de la règle de toutes les planètes à sa propre règle, elle démarre avec le choix dont elle héritait.

## Préréglages {#presets}

Deux préréglages remplissent la règle en un clic :

- **Moyenne · VWAP 30j** utilise le VWAP 30j de l'échange pour l'achat et la vente.
- **Échange immédiat · achat à l'Ask, vente au Bid** achète à l'Ask de l'échange et vend à son Bid. Il n'est pas disponible pour Univers, qui n'a pas de carnet d'ordres.

Les préréglages s'appliquent à l'échange de la règle que tu modifies, sinon à l'échange de toutes les planètes, sinon à NC1. Le cadre t'indique lequel (« Préréglages sur NC1 : »).

## Prix fixes et COGM {#fixed-prices-and-cogm}

Les prix fixes conviennent aux matériaux que tu fabriques toi-même et utilises à prix coûtant, ou aux prix convenus avec une corporation ou un partenaire. Ajoutes-en un avec **Ajouter un matériau**, puis saisis un prix d'achat, un prix de vente ou les deux. Laisse un côté vide pour utiliser le prix de l'échange pour ce côté.

Le tableau **Prix fixes** affiche :

| Colonne                  | Signification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Achat ȼ**, **Vente ȼ** | Tes prix fixes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Marché**               | Le prix que le matériau obtiendrait sans le prix fixe (côté achat, sauf si seule la vente est fixée), avec l'écart en %                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **COGM dans tes plans**  | Toutes les planètes uniquement. Pour les matériaux que tes plans fabriquent, le [[cogm\|COGM]] (coût des marchandises fabriquées) le plus bas parmi les plans des empires qui utilisent cette préférence, et dans combien de plans il est fabriqué. « en usage » signale un prix d'achat égal à celui-ci ; sinon, **Utiliser** règle le prix d'achat sur ce COGM (arrondi à 2 décimales). |
| Dernière colonne         | Le bouton × retire la ligne. Sur une planète, **Remplacer** copie un prix de toutes les planètes dans un prix fixe propre à la planète                                                                                                                                                                                                                                                                                                                                                                                                                                  |

À partir de 10 lignes, tu peux rechercher dans le tableau et le trier par **Matériau** ou **% vs marché**.

Dans l'outil COGM d'un plan, **Utiliser comme prix d'achat sur toutes les planètes** règle un prix d'achat fixe de toutes les planètes sur le COGM de _ce plan_, et non sur le plus bas. Voir [Outils du plan](/help/plan_tools#cogm-buy-price).

L'Aperçu affiche une note quand un prix d'achat fixe de toutes les planètes s'écarte de plus de 2 % du COGM le plus bas. Son tableau a un bouton **Utiliser le COGM** par matériau. Par exemple, avec un prix d'achat fixe de 45 ȼ et un COGM le plus bas de 40 ȼ, l'écart est de (45 − 40) ÷ 40 = 12,5 %, donc la note s'affiche. À 40,50 ȼ, il est de 1,25 %, et il n'y a pas de note. Ne t'inquiète pas de cette note : elle est là pour information, et le prix fixe continue de fonctionner tel quel.

> [!tip]
> Un prix d'achat fixe à ton propre COGM fait apparaître, dans les plans qui utilisent le matériau, le bénéfice de toute la chaîne dans le plan qui vend le produit final. Garde-le aligné sur le COGM quand ta production change.

## Exceptions de planète {#planet-exceptions}

La plupart des joueurs utilisent un seul échange principal pour toutes les planètes. Quand une planète a besoin d'autre chose, ouvre-la dans la liste et définis sa propre règle d'échange ou ses propres prix fixes. Sur cette planète, ses règles l'emportent sur celles de toutes les planètes, sauf les prix fixes de toutes les planètes, qui l'emportent toujours sur l'échange de la planète.

Sur une planète, les prix fixes de toutes les planètes sont listés en grisé comme **Prix de toutes les planètes**, et **Remplacer** donne à la planète son propre prix fixe pour ce matériau. En dessous, **Prix sur {planet}** montre ce que les plans de cette planète achètent et vendent et le prix que chacun obtient.

Les planètes avec des règles enregistrées qu'aucun de tes plans n'utilise plus sont listées sous **Dans aucun plan**. Leurs règles restent enregistrées jusqu'à ce que tu les supprimes avec **Supprimer les règles**.

## Enregistrer {#saving}

Tes plans n'utilisent tes modifications qu'une fois que tu les as enregistrées. La barre d'enregistrement en bas compte tes modifications : chaque partie modifiée de la préférence, plus une pour un renommage. **Enregistrer les modifications** les enregistre et recalcule les prix de chaque plan que tu as ouvert, et **Annuler** revient aux règles enregistrées. Comme l'[Aperçu](#overview) affiche déjà les modifications non enregistrées, tu peux essayer une règle, regarder les prix qu'elle donne et l'annuler si ce n'est pas ce que tu voulais. Si tu as des modifications non enregistrées, la page te demande confirmation avant que tu partes ou que tu changes de préférence.

**Renommer…** dans le menu **Plus d'actions** change le nom de la préférence. Tu enregistres le nouveau nom avec la barre d'enregistrement. **Gérer les préférences** ouvre la Gestion.

Si la même préférence a été enregistrée dans un autre onglet ou sur un autre appareil après que tu l'as ouverte, la page te le signale et conserve tes modifications. Au moment d'enregistrer, tu choisis **Écraser** (ta version remplace l'autre) ou **Recharger** (abandonner tes modifications et charger la version enregistrée).

## Import et export CSV {#csv-import-and-export}

**Exporter un CSV** télécharge toutes les règles de la préférence, modifications non enregistrées comprises, sous le nom `PRUNPlannerExchangePreferences.csv`. **Importer un CSV** lit un tel fichier et demande confirmation avant de remplacer toutes les règles de la préférence. Un import reste non enregistré tant que tu ne l'enregistres pas.

Le fichier utilise des points-virgules comme séparateurs et a les colonnes `Location;Type;CX;Ticker;Price` :

| Colonne       | Valeurs                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Location      | `EMPIRE` pour toutes les planètes, ou l'ID naturel d'une planète                                                                                 |
| Type          | `BUY`, `SELL` ou `BOTH`                                                                                                                          |
| CX            | Règles d'échange uniquement : échange et base, par ex. `NC1_30D`, `CI1_7D`, `AI1_ASK`, `IC1_BID`, `UNIVERSE_30D` |
| Ticker, Price | Prix fixes uniquement : le ticker du matériau et son prix                                                                        |

PRUNplanner rejette en bloc un fichier auquel il manque une colonne ou qui contient une ligne invalide, et rien ne change.

```
Location;Type;CX;Ticker;Price
EMPIRE;BOTH;NC1_30D;;
EMPIRE;BUY;;RAT;45
```

## Fiche de marché d'un matériau {#market-card}

Chaque [[ticker|ticker]] de matériau dans PRUNplanner ouvre une fiche de marché. Survole-le (ou mets-le en focus au clavier) et la fiche apparaît. Sur un écran tactile ou une fenêtre étroite, toucher le ticker l'ouvre comme un panneau depuis le bas.

La fiche affiche une ligne par échange plus Univers, avec Ask, Bid, [[spread|Écart]], VWAP 7j et VWAP 30j, la variation du 7j par rapport au 30j, une courbe de prix sur 30 jours et les unités échangées par jour (moyenne sur 30 jours). En dessous, de courtes lignes couvrent la tendance entre les échanges, les carnets d'ordres (unités proposées et demandées) et l'écart entre les prix des échanges. Si un matériau s'échange à moins d'une unité par jour sur les quatre échanges réunis, la fiche le signale comme rarement échangé.

Quand le ticker appartient à un plan, un empire ou une configuration, la fiche indique aussi combien de ce matériau il achète ou vend par jour et sa [[share-of-volume|part du volume quotidien]] : OK en dessous de 10 %, À surveiller à partir de 10 %, Trop gros à partir de 50 %. Ce sont les mêmes limites que dans le [Contrôle du plan](/help/plan_check#market-check). Par exemple, si un plan vend 60 unités par jour et qu'il s'en est échangé 9 000 unités sur l'échange ces 30 derniers jours, cela fait 300 par jour, et la part du plan est de 60 ÷ 300 = 20 % : À surveiller.

- Clique sur le ticker pour épingler la fiche. Échap ou × la ferme. Dans les E/S des matériaux d'un plan et dans le Calculateur de QG, un clic ouvre directement les détails.
- **Détails du marché →** ouvre un tiroir avec le poids et le volume du matériau, la date des données, un tableau par échange (**Prix**, **Carnets d'ordres**, **Volume**), un graphique sur 30 jours et **Santé du marché** (étendue, tendance pondérée par le volume, équilibre du carnet d'ordres, cohésion des prix).
- **Exploration du marché ↗** ouvre le matériau dans [Exploration du marché](/help/tools_market_exploration).

Dans [Profil](/help/profile#preferences), **Fiche de marché** définit comment la fiche s'ouvre : **Au survol** (par défaut) ou **Au clic uniquement**. Avec Au clic uniquement, le survol n'affiche rien et un clic épingle la fiche.
