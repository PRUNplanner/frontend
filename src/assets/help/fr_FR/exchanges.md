## Exchange Preferences {#exchange-preferences}

Une préférence d'échange définit les prix qu'utilisent tes plans : quel échange et quelle base de prix, et des prix fixes pour les matériaux que tu obtiens à prix coûtant ou auprès d'un partenaire. Assigne une préférence à un empire dans Gestion ; tous les plans de cet empire l'utilisent alors.

La page s'ouvre sur l'**Aperçu** : chaque matériau que tes plans achètent ou vendent, le prix retenu et d'où vient ce prix. Déplie une ligne pour voir la cascade complète pour chaque planète. Notes above the table point to rules that need a look.

## How a Price Is Found {#how-a-price-is-found}

Pour chaque matériau, PRUNplanner cherche un prix d'achat (pour ce qu'un plan consomme) et un prix de vente (pour ce qu'il produit). Il vérifie ces niveaux dans l'ordre et prend la première règle qui correspond :

1. **Prix fixe de la planète** : un prix fixe défini sur cette planète
2. **Prix fixe de toutes les planètes**
3. **Échange de la planète** : la règle d'échange définie sur cette planète
4. **Échange de toutes les planètes**
5. **Universe · VWAP 30j**, quand aucune règle ci-dessus ne correspond

Un prix fixe de toutes les planètes l'emporte sur la règle d'échange d'une planète.

### Buy, Sell or Both {#buy-sell-or-both}

Une règle peut s'appliquer à l'achat, à la vente ou aux deux. Si un niveau n'a pas de règle pour le côté dont un plan a besoin (par exemple seulement une règle d'achat alors que le plan vend le matériau), ce niveau est ignoré et le suivant est vérifié, jusqu'à Universe · VWAP 30j.

### Exchanges Without a Price {#exchanges-without-a-price}

Quand une règle d'échange correspond mais que son échange n'a pas de prix pour un matériau (aucune transaction, aucun Ask ou aucun Bid), le prix est de **0 ȼ**. It does not fall through to the next level. La page affiche ces prix en ambre et les liste dans les notes, pour que tu puisses définir un prix fixe ou choisir un autre échange ou une autre base.

## Price Basis: VWAP, Ask and Bid {#price-basis-vwap-ask-and-bid}

PRUNplanner peut utiliser un prix moyen pondéré par le volume (VWAP) sur 7 ou 30 jours. Le VWAP donne plus de poids aux transactions à fort volume ; il reflète donc là où la plupart des échanges ont eu lieu plutôt que des ordres isolés et extrêmes.

Ask et Bid correspondent au carnet d'ordres du jour : l'offre la moins chère et la demande la plus haute. Ils changent chaque jour et peuvent manquer pour les matériaux peu échangés. Universe n'a que des prix VWAP.

## Presets {#presets}

- **Moyenne · VWAP 30j** utilise le VWAP 30j de l'échange pour l'achat et la vente.
- **Échange immédiat · achat à l'Ask, vente au Bid** achète à l'Ask de l'échange et vend à son Bid. Non disponible pour Universe.

Les préréglages s'appliquent à l'échange de la portée, sinon à l'échange de toutes les planètes, sinon à NC1.

## Fixed Prices and COGM {#fixed-prices-and-cogm}

Les prix fixes conviennent aux matériaux que tu fabriques toi-même et utilises à prix coûtant, ou aux prix convenus avec une corporation ou un partenaire. Laisse un côté vide pour utiliser le prix d'échange.

Sur **Toutes les planètes**, le tableau des prix fixes affiche le prix du marché sans le prix fixe et, pour les matériaux que tes plans fabriquent, le COGM (coût de fabrication) le plus bas parmi les plans qui utilisent la préférence. **Utiliser** fixe le prix d'achat à ce COGM. Dans l'outil COGM d'un plan, **Utiliser comme prix d'achat** fait de même. Une note t'avertit quand un prix d'achat fixe s'écarte de plus de 2 % du COGM.

## Planet Exceptions {#planet-exceptions}

La plupart des joueurs utilisent un seul échange principal pour toutes les planètes. Quand une planète a besoin d'autre chose, ouvre-la dans la liste et définis sa propre règle d'échange ou ses propres prix fixes. Ses règles l'emportent sur celles de toutes les planètes sur cette planète, sauf les prix fixes de toutes les planètes, qui l'emportent toujours sur l'échange de la planète.

Les planètes avec des règles enregistrées qu'aucun plan n'utilise plus sont listées sous **Dans aucun plan**. Leurs règles restent enregistrées jusqu'à ce que tu les supprimes.

## Saving {#saving}

Tes plans n'utilisent les modifications qu'une fois enregistrées. La barre d'enregistrement compte les portées modifiées ; Annuler revient aux règles enregistrées. La page te demande confirmation avant de quitter ou de changer de préférence avec des modifications non enregistrées.

## CSV Import and Export {#csv-import-and-export}

**Exporter en CSV** télécharge toutes les règles de la préférence, modifications non enregistrées comprises. **Importer un CSV** lit un tel fichier et demande confirmation avant de remplacer toutes les règles de la préférence. Un import n'est pas enregistré tant que tu ne l'as pas enregistré.
