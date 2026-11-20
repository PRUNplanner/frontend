Le contrôle du plan confronte un plan au marché avant que tu ne le construises. Il te dit si tu peux vraiment acheter et vendre ces quantités, de quels prix dépend le bénéfice, et comment le plan se compare à tes autres plans. Tu le trouves dans un onglet d'outil de Production (voir [Disposition du plan](/help/plan_layout#parts)), avec trois vues entre lesquelles tu bascules à côté de son titre : **Contrôle du marché** (par défaut), **Sensibilité aux prix** et **Comparer les plans**. **Comparer les plans** n'apparaît que si tu es connecté.

La vue et la variation de prix que tu choisis restent en place pour cet onglet du navigateur, même quand tu changes de plan ou que tu fermes et rouvres l'outil. Cliquer sur un signalement dans [[material-io|E/S des matériaux]] ouvre une fenêtre, et son **Ouvrir le contrôle du plan →** ouvre le contrôle du plan sur le contrôle du marché.

## Contrôle du marché {#market-check}

Le [[profit|bénéfice]] d'un plan suppose que tu peux acheter et vendre chaque matériau à son prix, en n'importe quelle quantité. Le contrôle du marché montre où ce n'est pas vrai. Il liste chaque matériau que le plan achète ou vend par jour, du pire au meilleur : rouge, puis orange, puis les remarques grises, et par part au sein de chaque groupe.

Un plan qui n'achète et ne vend encore rien affiche « Ce plan n'achète ni ne vend encore rien. » à la place du tableau. Ajoute d'abord des bâtiments et des recettes dans [Production](/help/plan_production), et le contrôle se remplit.

| Colonne                                | Ce qu'elle montre                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Matériau**, **Sens**                 | Le matériau, et si le plan l'achète ou le vend.                                                                                                           |
| **Par jour**                           | Combien le plan achète ou vend par jour.                                                                                                                  |
| **Part du volume quotidien, 30 jours** | La quantité quotidienne du plan ÷ le volume quotidien moyen échangé sur l'échange ces 30 derniers jours. Des repères sur la barre indiquent 10 % et 50 %. |
| **Échangé 30j**                        | Les unités échangées sur l'échange ces 30 derniers jours.                                                                                                 |
| **Bid · ask ȼ**, **Écart**             | Le meilleur [[bid]] et le meilleur [[ask]] en ce moment, et l'[[spread\|écart]] entre les deux en % de l'ask.                                             |
| **Contrôle**                           | Le premier signalement du matériau, ou **ok**.                                                                                                            |

- Pour la [[share-of-volume|part du volume quotidien]], vendre 50 unités par jour sur un marché qui en échange 100 par jour représente une part de 50 %.
- Si tu achètes tout de suite, tu paies l'ask. Si tu vends tout de suite, tu prends le bid.
- PRUNplanner contrôle chaque matériau sur l'échange que ta [[exchange-preference|préférence d'échange]] utilise pour l'acheter ou le vendre, et la légende nomme ces échanges (par exemple « Échanges AI1, NC1 »). Sans préférence d'échange, le contrôle utilise le volume de tous les échanges ensemble. La légende indique alors « aucune préférence CX définie » et, sur ton propre plan, renvoie vers l'endroit où en définir une.
- Avec une préférence d'échange, une ligne signalée nomme la règle de prix qu'elle utilise. Sur ton propre plan, c'est un lien vers la règle dans Bourses (voir [Bourses](/help/exchanges#how-a-price-is-found)).
- **Ce que ça signifie** résume le pire matériau en une phrase. Il compte aussi les matériaux en **Impossible d'échanger comme prévu**, en **Grosse part du marché** ou **Correct**. Son bouton ouvre cette page. Quand rien n'est rouge ni orange, il affiche « Chaque matériau convient à son marché. » Un matériau qui n'a qu'une remarque grise compte ici comme **Correct**, puisque les remarques grises portent sur les données utilisées par le contrôle, pas sur tes quantités.
- Sur un téléphone, le tableau devient des cartes : les 6 premières et toutes celles qui sont signalées, puis « + n matériaux de plus, tout est ok ».

### Aux prix réels {#real-prices}

**Aux prix réels** recalcule le plan comme si tu achetais ce qu'il achète à l'ask et vendais ce qu'il vend au bid, chacun sur son échange. Il affiche **Bénéfice du plan**, **Achat à l'ask, vente au bid**, la **Différence** et le **ROI à l'ask / au bid**.

Il a besoin d'une préférence d'échange. Sans elle, il n'est pas calculé et affiche « Définis une préférence CX pour voir le plan aux prix ask et bid réels. »

Un matériau garde son prix du plan dans trois cas : personne ne le propose ni ne place de bid en ce moment, aucun échange n'est défini pour lui, ou il est valorisé à la moyenne [[universe|Univers]], qui n'a ni ask ni bid. La section liste ces matériaux. Un matériau avec un [[fixed-price|prix fixe]] dans ta préférence d'échange reçoit bien l'ask ou le bid ici.

Voici un exemple avec des chiffres inventés. Disons que le plan vend 100 unités par jour à un prix du plan de 50 ȼ, et que le meilleur bid en ce moment est de 45 ȼ. Vendre au bid rapporte 100 × 5 = 500 ȼ de moins par jour. Si c'est le seul prix qui change, la **Différence** est de −500 ȼ par jour.

> [!tip]
> Les prix du plan viennent en général de moyennes comme le [[vwap|VWAP]]. Aux prix réels montre ton bénéfice si tu échanges tout de suite au lieu d'attendre que tes ordres soient exécutés. Une grosse différence signifie que le bénéfice du plan dépend d'un commerce patient.

## Ce que signifient les signalements {#flags}

Les seuils des signalements sont fixes :

| Signalement                               | Niveau         | Quand                                                                                                    |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| _Pas de prix_                             | rouge          | Le plan n'a pas de prix pour le matériau et le compte à 0 ȼ.                                             |
| _Aucun échange en 7 jours_                | rouge          | Aucune transaction sur l'échange ces 7 derniers jours, ou l'échange n'a pas de données pour lui.         |
| _Aucune offre_                            | rouge          | Tu l'achètes, et personne ne le vend sur l'échange en ce moment.                                         |
| _Aucun acheteur_                          | rouge          | Tu le vends, et personne ne place de bid dessus sur l'échange en ce moment.                              |
| _Plus grand que le marché_                | rouge          | Le plan échange 50 % ou plus du volume quotidien.                                                        |
| _Grande part du marché_                   | orange         | Le plan échange 10 % ou plus du volume quotidien. Tes ordres feront probablement bouger le prix.         |
| _Tous les échanges, aucun échange défini_ | remarque grise | Pas de préférence d'échange, donc tous les échanges sont comptés. Affiché une fois au-dessus du tableau. |
| _Données de plus de 2 jours_              | remarque grise | Les dernières données de l'échange datent de plus de 2 jours.                                            |

Le rouge est un cercle plein (_impossible d'échanger comme prévu_), l'orange un triangle, le gris un anneau. _Aucune offre_ et _Aucun acheteur_ ont besoin d'un vrai échange, donc ils n'apparaissent jamais quand tous les échanges sont comptés. Les écarts apparaissent dans le tableau mais ne sont jamais signalés.

Les volumes, le bid et l'ask viennent des données d'échange que PRUNplanner charge depuis [[fio|FIO]]. Elles ont au plus environ 35 minutes : PRUNplanner les rafraîchit environ toutes les 30 minutes, et le serveur peut fournir une copie vieille de 5 minutes au plus.

Tu peux aussi surveiller les parts pendant que tu modifies les quantités et les recettes. Passe la valeur des E/S des matériaux de ȼ à %, et elles affichent le Δ de chaque matériau en part du volume quotidien moyen des 7 et 30 derniers jours (**Part 7j**, **Part 30j**), en orange à partir de 10 % et en rouge à partir de 50 %. Sur **Toute la base**, les E/S des matériaux affichent aussi les icônes de signalement, et leur résumé (« 2 matériaux ne peuvent pas être échangés comme prévu, … ») renvoie vers **Contrôle du plan →**. L'onglet Contrôle du plan porte un point tant que le plan a des signalements de marché.

> [!tip]
> Un signalement rouge ou orange sur un produit ne veut pas dire que le plan est mauvais. Il veut dire que tu vends plus que ce que le marché absorbe. Moins de bâtiments, un deuxième produit ou un autre échange peuvent régler ça : essaie-les et regarde la part baisser.

## Ce que le volume CX ne voit pas {#cx-volume}

Le volume vient uniquement des échanges de marchandises ([[cx|CX]]). PRUNplanner ne compte pas les ventes sur les marchés locaux, les contrats entre joueurs ni les transactions au sein d'une corporation, donc un matériau peut être plus facile à vendre que ne le laisse penser son volume CX.

## Empire {#empire}

Les E/S des matériaux de l'[[empire]] font le même contrôle sur le flux net de l'empire. Ce qu'un plan produit et qu'un autre utilise se compense, et seul le reste arrive sur le marché. Les E/S des matériaux de chaque plan signalent toujours ses propres quantités.

Des pastilles au-dessus du tableau comptent les matériaux signalés par niveau, comme « 3 ne peuvent pas être échangés comme prévu », « 2 grande part du marché » et « 1 autre remarque ». Clique sur l'une d'elles pour ne voir que les matériaux de ce niveau, et clique à nouveau pour les voir tous. Plus de détails dans [Empire](/help/empire).

## Sensibilité aux prix {#sensitivity}

La sensibilité aux prix montre de quels prix dépend le bénéfice. Choisis **Modifier chaque prix de** ±10 %, ±20 % (par défaut), ±30 % ou ±50 %.

Chaque matériau que le plan achète ou vend reçoit une ligne, tant que son prix fait bouger le bénéfice. PRUNplanner recalcule le plan une fois par matériau avec ce prix doublé, et la variation du bénéfice est l'impact du matériau. Si un matériau est aussi un matériau de construction, il fait aussi bouger le coût de [[degradation|dégradation]], et cela compte dans sa ligne. Les [[production-fees|frais de production]] ne dépendent pas des prix. Le bénéfice varie de façon linéaire avec n'importe quel prix pris seul, donc ce seul recalcul donne l'effet du % que tu choisis dans **Modifier chaque prix de**.

Tant que le plan n'achète ou ne vend rien dont le prix fait bouger le bénéfice, la vue affiche « Ajoute de la production pour voir de quels prix ce plan dépend. »

| Colonne                                        | Ce qu'elle montre                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Matériau**, **Sens**                         | Le matériau, et **acheter** ou **vente**.                                                                                                                                         |
| **Le bénéfice baisse ← · → Le bénéfice monte** | Une barre pour la variation du bénéfice quand ce seul prix bouge du % choisi, tout le reste inchangé. Survole-la pour voir la valeur par jour et le bénéfice aux deux extrémités. |
| **Fourchette de bénéfice ȼ/jour**              | Le bénéfice avec le prix baissé et monté du % choisi.                                                                                                                             |
| **Seuil de rentabilité**                       | La variation de prix à laquelle le bénéfice du plan atteint 0.                                                                                                                    |

PRUNplanner trie les lignes par impact, et la ligne centrale des barres est le bénéfice d'aujourd'hui. Il affiche les 10 premières et résume le reste en une ligne, « + n matériaux de plus … font varier le bénéfice de moins de ±… », avec un bouton **Tout afficher ({n})** pour les lister.

**Seuil de rentabilité** passe au rouge dans ±60 % et à l'orange dans ±200 %. Il affiche **jamais** quand le prix devrait tomber sous 0. Il affiche **> +500 %** quand le prix devrait monter de plus de 500 %. Pas d'inquiétude pour **jamais** sur un matériau que tu vends alors que le plan fait un bénéfice : cela veut dire que le plan reste rentable même si ce prix tombe à 0.

Voici comment les chiffres s'articulent, avec des valeurs inventées. Un plan rapporte 2 000 ȼ par jour, et son produit principal, qu'il ne fait que vendre et n'utilise pas pour construire, rapporte 8 000 ȼ par jour. Doubler ce prix ajoute 8 000 ȼ par jour. À ±20 %, la **Fourchette de bénéfice ȼ/jour** du produit va de 2 000 − 1 600 = 400 à 2 000 + 1 600 = 3 600. Son **Seuil de rentabilité** est de −2 000 ÷ 8 000 = −25 % : si ce prix baisse d'un quart, le plan ne rapporte plus rien. Il s'affiche en rouge, parce que −25 % est dans ±60 %.

### Ce que ça signifie {#sensitivity-means}

**Ce que ça signifie** prend le matériau le plus sensible et t'indique :

- le bénéfice après une variation du % choisi dans le sens défavorable, et la variation de prix au seuil de rentabilité (ou que le plan reste rentable même à un prix de 0, ou qu'aucune variation de ce seul prix ne l'amène à l'équilibre) ;
- « Bénéfice si … » et « ROI si … » : le bénéfice et le ROI après cette variation ;
- **Tous les coûts +{pct} %** : le bénéfice si chaque coût augmente du % choisi, en comptant les matériaux achetés, la dégradation et les frais de production ;
- **Le plus sensible** : les 3 premiers matériaux ;
- d'où viennent les prix : la préférence d'échange du plan, ou la moyenne Univers sur 30 jours quand il n'en a pas.

> [!tip]
> Un seuil de rentabilité proche de 0 % sur ton produit principal signifie qu'une petite baisse de prix efface le bénéfice. Avant de construire, vérifie ce matériau dans [Exploration du marché](/market-exploration) et fixe un prix auquel tu crois dans ta préférence d'échange.

### Prix cible {#target-price}

**Prix cible** trouve le prix d'un matériau qui donne le bénéfice que tu veux, avec tous les autres prix inchangés.

- **Matériau** liste les matériaux du tableau et démarre sur le matériau vendu qui a le plus d'impact.
- **Bénéfice cible, ȼ/jour** démarre au bénéfice d'aujourd'hui, arrondi à la dizaine de milliers supérieure.
- La réponse indique « {ticker} doit se vendre à » ou « {ticker} doit être acheté à » un prix. Quand aucun prix au-dessus de 0 ne peut atteindre la cible, elle indique que tu ne peux pas atteindre ce bénéfice en changeant ce prix.
- **Prix du plan aujourd'hui** ainsi que le bid et l'ask actuels de l'échange s'affichent pour comparaison.
- Dès que tu changes le matériau ou la cible, tu vois aussi le prix le plus bas et le plus haut de l'échange sur les 30 jours jusqu'à son dernier jour avec des transactions. Cela utilise les plus bas et plus hauts quotidiens des jours avec transactions, et pour tous les échanges, cela couvre les quatre. Une note t'avertit quand le prix qu'il te faudrait est au-dessus ou en dessous de tout ce qui a été payé sur ces 30 jours.

## Comparer les plans {#compare}

**Comparer les plans** place ce plan à côté d'un autre de tes plans. Tu dois être connecté.

**Comparer avec** liste tes autres plans, **Cette planète** d'abord, puis **Autres planètes**. Il démarre sur le premier plan de cette liste et retient ton choix pour ce plan tant que l'onglet est ouvert. Si tu n'as pas encore d'autre plan, il affiche « Tu n'as pas encore d'autre plan à comparer. »

PRUNplanner prend ce plan tel qu'il est à l'écran, modifications non enregistrées comprises. Il calcule l'autre plan tel qu'enregistré, avec son propre empire, et le valorise avec la préférence d'échange de cet empire (ou la moyenne Univers sur 30 jours). Une ligne à côté de **Comparer avec** indique laquelle.

Les chiffres des deux plans sont côte à côte, chacun avec une barre :

| Chiffre                      | Ce que c'est                                                        |
| ---------------------------- | ------------------------------------------------------------------- |
| **Bénéfice quotidien**       | Le bénéfice par jour.                                               |
| **Valeur produite**          | Ce que le plan vend par jour.                                       |
| **Coût quotidien**           | Ce que le plan achète par jour.                                     |
| **Dégradation**              | 1/180 du coût de construction des bâtiments de production par jour. |
| **Frais de production**      | Les frais par jour.                                                 |
| **Coût du plan**             | Le coût de construction.                                            |
| **ROI**                      | Le nombre de jours avant que le coût de construction soit amorti.   |
| **Retour sur la différence** | Voir [plus bas](#payback-difference).                               |
| **Bénéfice / Surface**       | Le bénéfice par unité de surface.                                   |
| **Surface utilisée**         | La surface qu'utilise le plan.                                      |

**Différence** est l'autre plan moins celui-ci. Elle est verte ou rouge selon ce qui est mieux pour toi : plus de bénéfice et de valeur produite, des coûts plus bas et un ROI plus court comptent comme favorables, et la surface est neutre.

**Verdict** résume tout en une phrase. Il indique combien ce plan rapporte de plus ou de moins par jour, combien de jours plus tôt ou plus tard il est amorti, le plus gros gain de l'autre plan et ses deux plus gros coûts par matériau, et si son coût de construction supplémentaire est amorti.

**Ce qui change** liste les ȼ / jour par matériau, l'autre plan moins celui-ci, du plus grand au plus petit. Si l'autre plan faisait passer un matériau à un signalement de marché plus grave, ce matériau est marqué avec sa part.

Le glossaire en dit plus sur le [[roi|ROI]] et l'[[payback|amortissement]].

> [!tip]
> Enregistre une copie de ton plan, change une seule chose dans la copie (une recette, un nombre de bâtiments, la planète), puis compare les deux. Le Verdict et Ce qui change montrent exactement ce que vaut le changement.

### Retour sur la différence {#payback-difference}

C'est le coût de construction supplémentaire de l'autre plan divisé par son bénéfice supplémentaire par jour, en jours : « {cost} ȼ de plus à construire ÷ {profit} ȼ/jour de bénéfice en plus ». **jamais** signifie qu'il coûte plus cher à construire et ne rapporte pas plus. Quand l'autre plan ne coûte pas plus cher à construire, tu vois « – ».

Par exemple (chiffres inventés), si l'autre plan coûte 200 000 ȼ de plus à construire et rapporte 2 000 ȼ de plus par jour, son coût de construction supplémentaire est amorti en 200 000 ÷ 2 000 = 100 jours.
