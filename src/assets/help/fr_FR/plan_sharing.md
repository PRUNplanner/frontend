Un lien de partage permet à n'importe qui de consulter l'un de tes [[plan|plans]], avec ou sans compte PRUNplanner. Utilise-le pour montrer une base dans un fil Discord, demander un avis ou transmettre une configuration à un membre de ta corporation. Les personnes qui le consultent peuvent tester des modifications sur leur propre copie et l'enregistrer comme leur propre plan, mais ton plan ne change jamais.

Cette page explique comment créer et arrêter un lien, ce que les gens voient et peuvent faire quand ils l'ouvrent, et à quoi ressemble le lien quand tu le colles dans un chat.

## Partager un plan {#share-link}

Ouvre ton plan et clique sur **Partager le lien** dans l'en-tête. Le bouton apparaît sur tes propres plans une fois qu'ils sont enregistrés. Dans [Gestion](/manage), le menu ⋯ de la ligne d'un plan ouvre la même boîte de dialogue via **Partager…**.

La boîte de dialogue **Partager le plan** fonctionne en deux étapes :

1. Avant que le plan soit partagé, elle explique ce que fait le lien. **Créer un lien pour partager** le crée.
2. Une fois le plan partagé, la boîte de dialogue affiche le lien lui-même, `https://prunplanner.org/shared/…`, et le nombre de fois où il a été consulté. **Copier l'URL** le copie, et **Arrêter de partager** y met fin.

Chaque plan a un seul lien : rouvrir la boîte de dialogue affiche donc le même lien et son nombre de vues. Chaque ouverture du lien compte comme une vue, rechargements compris. Tes propres clics comptent aussi : ouvrir ton propre lien compte comme une vue avant que PRUNplanner ne bascule sur ton plan. Dans Gestion, un petit œil avec le compteur marque chaque plan partagé.

### Ce que voient les visiteurs {#what-viewers-see}

Le lien montre toujours ton plan tel qu'il est enregistré : sa version active, sans les modifications non enregistrées que tu as en cours. Quand tu enregistres le plan ou rends une autre version active ([Versions](/help/plan_saving#versions)), le visiteur suivant voit ce nouvel état.

> [!tip]
> Partage le plan dont tu veux vraiment discuter. Si tu continues à travailler dessus pendant que d'autres le consultent, enregistre une copie (**Enregistrer une copie…** dans le menu d'enregistrement) et partage celle-ci, pour que le lien ne change pas sous leurs yeux.

### Arrêter un lien {#stop-sharing}

**Arrêter de partager** met fin au lien immédiatement, sans confirmation. Toute personne qui l'ouvre ensuite voit « **Ce plan partagé n'est plus disponible** ». Supprimer le plan met aussi fin à son lien. Si tu partages à nouveau le plan plus tard, il reçoit un nouveau lien, et l'ancien reste mort. Les copies que des gens ont déjà enregistrées dans leurs propres plans ne sont pas concernées, car ce sont des plans distincts.

## Ouvrir un plan partagé {#shared-view}

Un lien partagé ouvre la page du plan avec un bandeau en haut : « **Plan partagé** », « Teste des modifications sur ta propre copie. Le plan partagé ne change jamais. ».

### Ta copie de travail {#working-copy}

Ce que tu vois est une copie de travail. Tu peux y modifier tout ce que tu pourrais modifier dans ton propre plan, comme les bâtiments, les recettes, les experts, les habitations ou l'[[empire|empire]] avec lequel il est calculé. Annuler et Rétablir fonctionnent comme d'habitude.

- La copie n'existe que dans cet onglet du navigateur. Quitter la page l'abandonne sans confirmation. Si tu es connecté, tu gardes tes modifications avec **Enregistrer dans mes plans** (voir [Réinitialiser, copier, enregistrer](#shared-actions)).
- Les habitations restent telles que le propriétaire les a réglées. L'optimisation automatique est désactivée tant que tu n'actives pas **Auto** dans les Infrastructures.
- Les outils travaillent sur ta copie. Les quantités construites dans [Construction](/help/plan_tools#construction) et les matériaux exclus dans [Visites](/help/plan_tools#visits) ne durent que le temps de la visite, et Réparation masque sa partie FIO. Tout stock [[fio|FIO]] utilisé par les outils est le tien.
- Si tu n'es pas connecté, tu vois le plan dans la disposition Standard et sans l'onglet POPR. Si tu es connecté, tu le vois dans ta propre disposition.
- Si tu ouvres un lien vers ton propre plan, PRUNplanner ouvre directement le plan.

### Prix {#shared-prices}

Sous le titre du bandeau, une note indique quels prix utilisent les chiffres : « Prix : … » suivi de « La personne qui l'a partagé peut voir des chiffres différents. ».

- **Si tu es connecté**, PRUNplanner calcule la copie avec ton empire par défaut (ou ton premier empire) : les prix suivent donc la [[exchange-preference|préférence d'échange]] de cet empire (« tes réglages d'échange : {name} »). Un empire sans préférence utilise la moyenne sur 30 jours de l'[[universe|Univers]].
- **Si tu n'es pas connecté**, les prix sont la moyenne sur 30 jours de l'Univers.

> [!tip]
> Tu compares tes chiffres avec le propriétaire ? Dis-lui quelle préférence d'échange tu utilises, ou vérifiez tous les deux les chiffres avec la même préférence. Le bénéfice et l'amortissement peuvent beaucoup varier d'un échange à l'autre.

### Comparer avec la version partagée {#vs-shared}

Dès que ta copie diffère du plan partagé, le bandeau indique « **Modifié par rapport à la version partagée** ». Une ligne sous l'en-tête liste ce qui a changé, après « **vs partagé :** » :

| Chiffre                          | Affiché comme                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Bénéfice                         | la variation en ȼ / jour, en vert quand il a augmenté, en rouge quand il a baissé           |
| [[roi\|ROI]]                     | l'amortissement avant → après, en vert quand il a raccourci                                 |
| Surface, Main-d'œuvre, Bâtiments | la variation de la surface utilisée, des travailleurs nécessaires et du nombre de bâtiments |

Par exemple (chiffres inventés), si le plan partagé rapporte 10 000 ȼ par jour et ta copie 12 000 ȼ, Bénéfice affiche la hausse de 2 000 ȼ/jour en vert.

La ligne ne liste que les chiffres qui ont changé. Dans la Production, les bâtiments modifiés sont marqués **nouveau**, **quantité modifiée** ou **recette modifiée**, et les recettes que le bâtiment partagé n'avait pas sont marquées **nouveau**. Les bâtiments supprimés restent dans la liste, barrés, avec la mention **retiré**.

### Réinitialiser, copier, enregistrer {#shared-actions}

- **Revenir à la version partagée** abandonne tes modifications et revient au plan partagé.
- **Copier les modifications** place un résumé dans ton presse-papiers, prêt à coller dans Discord. Il contient le nom et la planète du plan, une ligne par modification, le bénéfice et l'amortissement avant → après, les prix utilisés et le lien. Il est coupé à 2 000 caractères, avec « …et {n} de plus » pour le reste. Un message confirme : « **Modifications copiées, colle-les dans Discord** ».
- **Enregistrer dans mes plans** (ou Ctrl+S, ⌘+S sur Mac) enregistre ta copie, avec tes modifications, comme un nouveau plan à toi. La boîte de dialogue demande un **Nom** (elle propose le nom du plan suivi de « (Copy) ») et, si tu as des empires, un **Empire**. **Créer** l'enregistre et ouvre ton nouveau plan. Le plan du propriétaire et son lien restent inchangés.
- Si tu n'es pas connecté, **Inscris-toi pour l'enregistrer** et **Se connecter** apparaissent à la place.

> [!tip]
> Tu veux suggérer une amélioration pour la base de quelqu'un ? Fais la modification dans la copie, vérifie la ligne « vs partagé : », puis **Copier les modifications** et colle le résumé dans le fil. La personne voit exactement ce que tu as changé et l'effet sur le bénéfice et l'amortissement, avec le lien pour l'ouvrir elle-même.

## Aperçus de lien {#link-previews}

Colle un lien de partage dans Discord, ou dans une autre application de chat qui affiche des aperçus de liens, et il se déploie en une carte pour le plan. La carte est en anglais.

- **Titre** : la planète, puis le nom du plan, par exemple « Montem (OT-580b) · Iron base ».
- **Texte** : qui l'a partagé, le bénéfice par jour, l'amortissement quand le plan s'amortit (« pays back in 42 days »), le programme COGC du plan et les produits qu'il fabrique. Puis la base de prix du produit principal (par exemple « CI1 30-day average », ou « own prices » pour un [[fixed-price|prix fixe]]) et la date de ces prix. Elle se termine par « Open it to see the whole base and try changes, no account needed. ».
- **Image** : la planète et le nom du plan, qui l'a partagé, le bénéfice par jour en gros chiffres, l'amortissement, la surface utilisée sur la surface disponible, et jusqu'à quatre produits avec leurs quantités par jour.

La carte utilise les chiffres que PRUNplanner a stockés lors du dernier enregistrement du plan. Créer un lien depuis la page du plan stocke aussi les chiffres actuels si le plan n'a pas de modifications non enregistrées. Chaque enregistrement donne au lien une nouvelle carte.

Parfois, aucun chiffre n'est stocké, par exemple pour un plan enregistré pour la dernière fois avant l'existence des aperçus, ou juste après que tu as rendu active une version plus ancienne. La carte affiche alors la planète, le COGC, le nombre de bâtiments et ce que fabrique le plan, sans bénéfice ni amortissement. Enregistre le plan une fois pour les ajouter.

> [!tip]
> Enregistre le plan avant de publier son lien. La carte affiche les chiffres du dernier enregistrement : un lien publié avec des modifications non enregistrées affiche donc les anciens chiffres.
