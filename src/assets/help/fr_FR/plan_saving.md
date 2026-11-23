PRUNplanner protège ton travail sur un [[plan|plan]] avec des enregistrements, des brouillons de modifications non enregistrées, l'annulation, des copies et des versions nommées auxquelles tu peux revenir. Quand le même plan change à deux endroits, il demande avant d'écraser quoi que ce soit. Pour montrer un plan à quelqu'un d'autre, voir [Partager un plan](/help/plan_sharing).

Lis cette page quand tu veux savoir si tes modifications sont en sécurité, comment revenir à un état antérieur d'un plan, ou ce que signifie un message d'enregistrement.

## Enregistrer et annuler {#saving-and-undo}

Nomme ton plan avec le crayon à côté de son nom. Entrée ou un clic ailleurs garde le nom, et Échap annule. Enregistre-le avec **Enregistrer** (**Créer** pour un nouveau plan) ou Ctrl+S (Cmd+S sur Mac).

- **Enregistrer** n'apparaît que s'il y a quelque chose à enregistrer, et reste désactivé tant que le plan n'a pas de nom.
- Un nouveau plan reçoit sa propre adresse une fois créé, et tes empires et tes liens utilisent celle-ci. D'ici là, PRUNplanner n'en conserve rien, pas même un [brouillon](#drafts).
- Annuler, Rétablir, l'état du plan et Enregistrer sont réunis dans une seule commande. Sur téléphone, Annuler et Rétablir restent dans l'en-tête, et l'état avec Enregistrer se trouve au-dessus de la navigation du bas.

L'état t'indique où en est le plan :

| État                                      | Signification                                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| « Enregistré … »                          | Enregistré à ce moment-là, suivi du nom de la version quand elle en a un.                                            |
| **Modifications non enregistrées**        | Tu as modifié quelque chose depuis le dernier enregistrement. Un point orange le signale.                            |
| « Non enregistré · brouillon conservé … » | Non enregistré, mais conservé dans un [brouillon](#drafts).                                                          |
| **Enregistrement…**                       | L'enregistrement est en cours.                                                                                       |
| **Échec de l'enregistrement**             | L'enregistrement n'a pas abouti. Tes modifications sont conservées, alors clique sur **Réessayer l'enregistrement**. |
| **Brouillon non enregistré**              | Tes modifications non enregistrées ne sont pas conservées dans un brouillon. Clique dessus pour réessayer.           |
| « Donne un nom à ton plan pour le créer » | Un nouveau plan a d'abord besoin d'un nom.                                                                           |

Clique sur l'état d'un plan enregistré pour ouvrir ses [versions](#versions).

> [!tip]
> **Recharger la version enregistrée**, l'icône à côté d'Enregistrer, te ramène au plan tel qu'il a été enregistré pour la dernière fois et abandonne le brouillon. Si tu as des modifications non enregistrées, il demande d'abord.

### Brouillons {#drafts}

Une fois un plan créé, PRUNplanner conserve ses modifications non enregistrées dans un brouillon environ 3 secondes après chaque modification. Un rechargement, un onglet fermé ou un plantage ne les fera pas perdre.

Un brouillon n'est pas un enregistrement. Il est conservé avec ton compte, mais tes empires et le lien de partage du plan continuent d'utiliser la version enregistrée jusqu'à ce que tu enregistres. C'est pourquoi la liste des versions marque un brouillon « pas encore dans un empire ».

Quand tu rouvres le plan, il s'affiche toujours comme enregistré. Un message (« Tu as des modifications non enregistrées du … ») propose **Restaurer**. Ta modification suivante, ou l'ouverture d'une version, ferme le message, et tes nouvelles modifications remplacent le brouillon. Si tu veux récupérer ces modifications, clique sur **Restaurer** avant de modifier quoi que ce soit.

La page ne t'avertit avant que tu partes que lorsque le brouillon ne peut pas contenir tes modifications. C'est le cas quand le plan n'est pas encore créé, que la dernière modification date de moins de 3 secondes environ, ou que le brouillon a échoué.

### Annuler et Rétablir {#undo}

Tu peux annuler n'importe quelle modification avec **Annuler** et **Rétablir**, ou avec Ctrl+Z et Ctrl+Maj+Z (Cmd sur Mac). Les raccourcis ne fonctionnent pas dans un champ de texte.

L'historique contient les 50 dernières modifications. Il repart de zéro quand tu ouvres, enregistres ou recharges le plan, et quand tu abandonnes des modifications. Pendant que tu personnalises la disposition, les raccourcis annulent plutôt les modifications de disposition (voir [Disposition](/help/plan_layout)).

## Enregistrer une copie {#save-as-copy}

Pour un plan enregistré et nommé, la flèche à côté d'Enregistrer (**Options d'enregistrement**) contient **Enregistrer une copie…**. Cela ouvre **Enregistrer sous** :

- **Nom** part du nom du plan suivi de « (copie) ».
- Si tu as des empires, une liste d'empires part de l'empire avec lequel le plan est calculé, et la copie y est ajoutée.
- **Créer** enregistre le plan tel qu'il est maintenant, modifications non enregistrées comprises, comme un nouveau plan et l'ouvre dans un nouvel onglet. Ton original garde son état et ses modifications non enregistrées.

> [!tip]
> Une copie te permet d'essayer une autre disposition de la même base et de garder les deux. Nomme clairement les copies, car ce sont désormais des plans distincts.

## Versions {#versions}

Chaque enregistrement conserve une version du plan. Clique sur l'état d'un plan enregistré pour ouvrir **Versions**.

- **Nommées uniquement** est activé par défaut. La liste affiche tes versions nommées et la version active, avec « … sans nom masquées » en bas. Décoche-le pour les voir toutes.
- **Active** marque la version qu'est ton plan actuellement.
- Si tu as des modifications non enregistrées, la première ligne les affiche comme **Modifications non enregistrées**, avec « Brouillon conservé … · pas encore dans un empire » ou « Non conservé dans un brouillon ».
- **Avant l'historique des versions** est le plan tel qu'il était avant l'existence des versions. **Modifiée par le support** marque une modification faite par le support de PRUNplanner.
- Les versions nommées restent. PRUNplanner garde les 10 dernières versions sans nom, et les plus anciennes disparaissent.

Par exemple, quand un plan est créé puis enregistré 14 fois sans nom, les 10 plus récentes de ces 15 versions sans nom restent et les 5 plus anciennes disparaissent, tandis que chaque version nommée reste. Pour garder un état du plan pour de bon, donne un nom à sa version.

### Nommer des versions {#naming-versions}

Ouvre **Options d'enregistrement** (ou appuie sur Ctrl+Alt+S, Cmd+Option+S sur Mac), tape un nom dans **Nom de la version (facultatif)** et appuie sur Entrée ou sur **Enregistrer avec un nom**. Un nom peut faire jusqu'à 80 caractères. Cela fonctionne pour tout plan enregistré et nommé, même sans rien de non enregistré, et nomme le plan tel qu'il est maintenant.

Pour nommer une version plus tard, ou en renommer une, utilise **Nommer cette version** dans son menu ⋯. Un nom vide retire le nom.

Un plan contient au plus 20 versions nommées. À la limite, retire le nom de l'une d'elles ou supprime-en une avant d'en nommer une autre.

### Aperçu, comparaison et restauration {#preview}

L'œil sur une version l'affiche en lecture seule. Une bannière t'indique quelle version tu regardes, et les tuiles de résultats affichent ses chiffres. De là :

- **Comparer avec l'actuel** liste ce qui diffère de ton plan actuel.
- **Restaurer** la charge comme modifications non enregistrées. Annuler revient en arrière, et enregistrer en fait la version active.
- **Ouvrir comme nouveau plan** la copie dans un nouveau plan dans un nouvel onglet, nommé d'après le plan avec le nom ou la date de la version. La copie n'est dans aucun empire.
- **Retour à l'actuel** te ramène à ton plan tel qu'il était.

### Rendre active et supprimer {#make-active}

**Rendre active**, dans le menu ⋯ d'une version ou dans la bannière d'aperçu, fait passer le plan à cette version en une étape. Tes empires et le lien de partage du plan l'utilisent aussitôt. Elle s'ajoute en haut comme nouvelle version (« Restaurée depuis … »), et celle que tu as choisie reste à sa place. Les éventuelles modifications non enregistrées sont abandonnées une fois que tu confirmes.

**Supprimer**, dans le même menu, retire une version pour de bon, après confirmation. Tu ne peux pas supprimer la version active.

**Abandonner les modifications** dans **Options d'enregistrement** abandonne tes modifications non enregistrées et revient à la version enregistrée, après confirmation.

## Conflits d'enregistrement {#conflicts}

Le même plan peut être ouvert dans deux onglets ou sur deux appareils. PRUNplanner n'écrase jamais l'un avec l'autre sans demander.

Si un autre onglet de ce navigateur enregistre le plan et que tu n'as pas de modifications non enregistrées ici, cet onglet charge le nouvel enregistrement. Si tu as des modifications non enregistrées, un message indique « Enregistré dans un autre onglet. Tes modifications sont conservées. » avec **Recharger**.

Si tu enregistres après que le plan a été enregistré ailleurs (un autre onglet ou un autre appareil), **Enregistré dans un autre onglet** s'ouvre. Pas d'inquiétude, à l'ouverture de cette fenêtre, rien n'a encore été écrasé. Elle liste ce qui a changé là-bas et ce que tu as changé, et propose :

| Option                             | Ce qu'elle fait                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Enregistrer comme nouveau plan** | Enregistre tes modifications comme une copie (« … (copie) ») dans l'empire du plan et l'ouvre. L'original garde l'autre version. |
| **Écraser**                        | Remplace l'autre version par la tienne.                                                                                          |
| **Recharger**                      | Abandonne tes modifications et charge la version enregistrée.                                                                    |
| **Continuer à modifier**           | Ferme la fenêtre sans rien enregistrer pour l'instant.                                                                           |

Si le plan a été supprimé ailleurs, **Supprimé dans un autre onglet** ne propose que **Enregistrer comme nouveau plan**.

Les brouillons ont leurs propres vérifications :

- **Brouillon enregistré ailleurs** veut dire qu'un autre onglet ou appareil a conservé un brouillon plus récent de ce plan. L'enregistrement automatique se met en pause jusqu'à ce que tu choisisses **Garder les miennes** ou **Charger l'autre brouillon**. **Décider plus tard** ferme la fenêtre et laisse l'enregistrement automatique en pause.
- **Modifications non enregistrées sur une ancienne version** veut dire que tu as laissé des modifications non enregistrées et que le plan a été enregistré à nouveau depuis. Choisis **Garder mes modifications** (par-dessus l'enregistrement plus récent), **Utiliser la version enregistrée** (supprime tes modifications non enregistrées) ou **Décider plus tard**.

> [!tip]
> Tu travailles sur un plan depuis deux appareils ? Enregistre avant de changer d'appareil. L'autre appareil n'a alors qu'à recharger, et tu n'as jamais besoin de la fenêtre de conflit.
