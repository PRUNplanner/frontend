Chaque bénéfice, coût et amortissement dans PRUNplanner dépend des prix que tu choisis. En 15 minutes environ, ce guide te fait parcourir ta [[exchange-preference|préférence d'échange]]. À la fin, tu auras :

- un échange principal et une base de prix pour toutes tes planètes,
- des règles d'achat et de vente séparées, si tu achètes et vends sur des échanges différents,
- des exceptions pour certaines planètes, et des [[fixed-price|prix fixes]] pour ce que tu fabriques toi-même,
- un Aperçu de chaque prix utilisé par tes plans et de la règle qui le fixe.

Il s'adresse à tous ceux qui veulent que leurs plans reflètent leur façon réelle de commercer. Tu as besoin d'un compte. Les pages en lien à la fin de chaque étape vont plus loin.

## 1. Ouvre ta préférence d'échange {#step-1}

Ouvre [Bourses](/exchanges). La page affiche une préférence à la fois, et **Changer de préférence** en choisit une autre. Sous la liste déroulante, tu vois quels [[empire|empires]] l'utilisent.

![Bourses : Changer de préférence et les empires qui l'utilisent à gauche, l'Aperçu des prix utilisés par tes plans à droite](/images/help/guides/cx-prices-overview.webp)

Un nouveau compte a « My Exchange Preference », utilisée par « My Empire » et réglée sur **Universe · VWAP 30j**. Un [[plan|plan]] n'a pas de prix à lui. Il utilise la préférence de l'empire avec lequel il est calculé. Chaque empire utilise une préférence, et plusieurs empires peuvent en partager une. Pour donner une autre préférence à un empire, choisis-la dans la colonne CX de **Configuration de l'empire** dans la [Gestion](/manage).

Pour en savoir plus : [Préférences d'échange](/help/exchanges#exchange-preferences), [Gestion](/help/management#cx-configuration).

## 2. Définis ton échange principal avec un préréglage {#step-2}

1. Ouvre **Toutes les planètes** dans la liste de gauche. Ses règles s'appliquent à chaque planète qui n'a pas les siennes.
2. Dans le cadre **Prix d'échange**, choisis ton échange principal : AI1, CI1, IC1 ou NC1.
3. Clique sur un préréglage :
   - **Moyenne · VWAP 30j** achète et vend au [[vwap|VWAP]] sur 30 jours de cet échange, une moyenne stable de ce qui s'est échangé. [Ta première base](/help/guide_first_base#step-2) détaille un exemple de VWAP.
   - **Échange immédiat · achat à l'Ask, vente au Bid** achète à l'offre la moins chère et vend à l'acheteur le plus offrant à cet instant. C'est le prix d'un échange immédiat.

![Toutes les planètes sur Bourses : le cadre Prix d'échange avec les préréglages, et le tableau Prix fixes en dessous](/images/help/guides/cx-prices-rule.webp)

Le cadre t'indique sur quel échange s'appliquent les préréglages (« Préréglages sur NC1 : »).

Pour aller plus loin : [Préréglages](/help/exchanges#presets).

## 3. Choisis achat, vente ou les deux, et la base de prix {#step-3}

Dans le cadre **Prix d'échange** :

- **Identique pour l'achat et la vente** utilise un échange et une base pour les deux côtés.
- **Achat et vente séparés** donne à chaque côté son propre échange et sa propre base, par exemple acheter sur CI1 et vendre sur NC1. Un côté laissé **Non défini** passe à la règle suivante, jusqu'à Univers · VWAP 30j.

| Base              | Utilise-la quand                                                         |
| ----------------- | ------------------------------------------------------------------------ |
| VWAP 7j, VWAP 30j | Tu veux une moyenne stable. Le 7j suit plus vite les mouvements récents. |
| Ask               | Tu achètes tout de suite, à l'offre la moins chère.                      |
| Bid               | Tu vends tout de suite, à l'acheteur le plus offrant.                    |

L'[[universe|Univers]] n'a que les deux VWAP.

> [!warning]
> Quand l'échange choisi n'a pas de prix pour un matériau (personne ne le propose, personne n'en demande, ou, pour le VWAP, aucune transaction sur cet échange ces 30 derniers jours), il compte pour 0 ȼ. PRUNplanner ne se rabat pas sur un autre échange. La page affiche ces prix en orange et les liste dans ses notes.
>
> Sans transaction ces 7 derniers jours, le VWAP 7j utilise le prix du dernier jour, dans ces 30 jours, où le matériau a été échangé. Si un matériau en orange est acheté ou vendu par tes plans, tu peux définir une règle de planète sur un autre échange pour la planète qui l'utilise (étape 4) ou lui donner un prix fixe (étape 5).

Détails : [Base de prix](/help/exchanges#price-basis-vwap-ask-and-bid), [Achat, vente ou les deux](/help/exchanges#buy-sell-or-both).

## 4. Ajoute des exceptions pour certaines planètes {#step-4}

Si une base vend ailleurs, par exemple parce qu'elle est plus proche d'un autre échange, donne à sa planète sa propre règle.

1. Ouvre la planète dans la liste (sous **Utilisent les règles de toutes les planètes**).
2. Dans son cadre **Prix d'échange**, passe de **Utiliser la règle de toutes les planètes** à **Identique pour l'achat et la vente** ou **Achat et vente séparés**, et définis la règle.

La planète passe alors dans **Planètes avec leurs propres règles**. Sa règle l'emporte sur celle de toutes les planètes, à une exception près : les prix fixes de toutes les planètes l'emportent toujours. La liste des prix sous les règles montre ce que les plans de cette planète achètent et vendent, et à quel prix.

Pour en savoir plus : [Exceptions de planète](/help/exchanges#planet-exceptions), [Comment un prix est trouvé](/help/exchanges#how-a-price-is-found).

## 5. Fixe les prix de ce que tu fabriques toi-même {#step-5}

Un matériau que tu fabriques dans une base et utilises dans une autre ne devrait pas coûter le prix du marché. Il coûte ce que tu paies pour le fabriquer, ton [[cogm|COGM]].

- Dans un plan, ouvre **COGM** sur l'ordre qui fabrique le matériau et clique sur **Utiliser comme prix d'achat sur toutes les planètes** (proposé tant que le matériau n'a pas de prix fixe), puis sur **Enregistrer les modifications**. Cela définit un prix d'achat fixe au COGM de _ce plan_ pour chaque planète de la préférence.
- Ou bien, sur **Toutes les planètes** dans Bourses, ajoute le matériau aux **Prix fixes** avec **Ajouter un matériau** et saisis un prix. Pour les matériaux que tes plans fabriquent, la colonne **COGM dans tes plans** affiche le COGM le plus bas, et **Utiliser** le copie dans le prix d'achat.

Laisse un côté vide pour garder le prix de l'échange pour ce côté.

> [!tip]
> Garde tes prix fixes alignés sur ta production. L'Aperçu signale quand un prix d'achat fixe s'écarte de plus de 2 % du COGM le plus bas, et la boîte de dialogue COGM propose de le mettre à jour.
>
> Par exemple, disons que ton COGM le plus bas pour RAT est de 95 ȼ et son prix d'achat fixe de 100 ȼ. Cela fait un écart de 5 ÷ 95 ≈ 5,3 %, donc l'Aperçu le signale. À 96 ȼ, l'écart serait de 1 ÷ 95 ≈ 1,1 %, et il n'y aurait pas de note.

Pour aller plus loin : [Prix fixes et COGM](/help/exchanges#fixed-prices-and-cogm), [Utiliser le COGM comme prix d'achat](/help/plan_tools#cogm-buy-price).

## 6. Enregistre et vérifie le résultat {#step-6}

1. Appuie sur **Enregistrer les modifications** dans la barre en bas. Tes plans n'utilisent les nouvelles règles qu'une fois enregistrées.
2. Ouvre l'**Aperçu**. Il liste chaque matériau que tes plans achètent ou vendent, son prix et la règle qui le fixe. Lis d'abord les notes en haut, où les avertissements viennent en premier.
3. Ouvre un plan. **Prix** sous **Empire et prix** nomme la préférence. Ouvre ensuite **Contrôle du plan** : **Contrôle du marché** vérifie chaque matériau sur l'échange qu'utilise ta préférence, et **Aux prix réels** montre le bénéfice aux Ask et Bid du jour.

Tu as terminé quand les matériaux que tu échanges n'affichent plus de prix à 0 ȼ en orange et que le bénéfice aux prix réels te convient.

Détails : [Aperçu](/help/exchanges#overview), [Contrôle du plan](/help/plan_check#market-check).

## Ensuite {#next}

- [D'une chaîne à des bases](/help/guide_chain_to_bases) : planifie toute une chaîne à ces prix.
- [Grandir jusqu'à un empire](/help/guide_empire) : vérifie toutes tes bases ensemble.
