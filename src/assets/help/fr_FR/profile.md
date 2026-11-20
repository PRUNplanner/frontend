Ton [Profil](/profile) est l'endroit où tu gères ton compte, relies tes données de jeu via FIO et définis les préférences qui décident comment démarrent les outils de PRUNplanner. Cette page couvre aussi la connexion, l'inscription et la réinitialisation du mot de passe. Viens ici quand tu relies FIO pour la première fois, quand tu veux qu'un outil démarre avec d'autres réglages, ou pour changer ton e-mail ou ton mot de passe.

## Ton compte {#account}

### Se connecter et s'inscrire {#login-and-sign-up}

- **Se connecter** avec ton nom d'utilisateur et ton mot de passe. Ensuite, tu arrives sur ton [Empire](/empire), sauf si tu venais d'un lien qui te ramène là où tu étais.
- **Créer un compte** demande un **Nom d'utilisateur** (au moins 3 caractères, sans espace), un **Mot de passe** (au moins 8 caractères, pas uniquement des chiffres, pas un mot de passe courant) et un e-mail facultatif. Pour prouver que tu joues au jeu, tu tapes le nom d'une planète dont l'ID t'est affiché. Ouvre-la dans un buffer de Prosperous Universe pour lire son nom.
- Un nouveau compte commence avec un empire, « My Empire », et une [[exchange-preference|préférence d'échange]] qui lui est attribuée, « My Exchange Preference » (Univers · VWAP 30j). Voir [Ta première base](/help/guide_first_base).

### E-mail et récupération du compte {#email}

Un e-mail est facultatif, et PRUNplanner ne l'utilise que pour réinitialiser ton mot de passe. Sans e-mail, tu ne peux pas réinitialiser un mot de passe oublié.

1. Saisis-le sous **Adresse e-mail** avec ton **Mot de passe actuel**, et appuie sur **Enregistrer**. Ajouter, modifier ou retirer l'adresse demande toujours ton mot de passe actuel.
2. PRUNplanner envoie un code de 8 caractères valable 24 heures. Appuie sur **Saisir le code** et tape-le, ou clique sur le lien de l'e-mail sur n'importe quel appareil. **Envoyer un nouveau code** en envoie un autre.

**Récupération du compte** montre où tu en es : **Non configurée** (pas d'e-mail), **En attente de confirmation** ou **Prête** (les réinitialisations vont à cette adresse). Une nouvelle adresse ne reçoit les réinitialisations qu'une fois confirmée.

Comme un mot de passe oublié ne peut être réinitialisé que via une adresse confirmée, la page Empire affiche un rappel tant que tu as des plans mais pas d'e-mail confirmé. « Pas maintenant » le masque pendant 30 jours, et « Ne plus me le rappeler » le masque définitivement.

### Mot de passe oublié {#password-reset}

Sur le formulaire de connexion, **Mot de passe oublié ?** demande ton adresse e-mail confirmée et y envoie un code. Saisis le code avec un nouveau mot de passe pour le définir.

### Changer ton mot de passe {#change-password}

Ouvre **Changer le mot de passe**, puis saisis ton **Mot de passe actuel** et un **Nouveau mot de passe** (au moins 8 caractères).

> [!warning]
> Changer ou réinitialiser ton mot de passe te déconnecte partout, y compris dans ce navigateur, et désactive toutes les [clés API](/help/api_keys#validity) que tu as créées auparavant. Crée ensuite de nouvelles clés et mets à jour tes feuilles de calcul et tes scripts.

## Connexion FIO {#fio-connection}

[[fio|FIO]] est une extension de navigateur communautaire et gratuite qui lit tes données de jeu. Grâce à elle, PRUNplanner peut afficher ton stock réel dans [Consommation FIO](/help/fio_burn), l'état de tes bâtiments dans [Réparer FIO](/help/fio_repair) et tes stocks dans l'API.

1. Installe l'extension de navigateur FIO et enregistre ton compte FIO depuis le bouton des extensions du jeu.
2. Sur le site de FIO, ouvre tes paramètres et crée une clé API pour PRUNplanner.
3. Saisis la **Clé API FIO** et ton **Nom d'utilisateur PrUn** sous **Connexion FIO** et appuie sur **Enregistrer**.

PRUNplanner vérifie la clé et te prévient si FIO ne l'accepte pas ou si elle appartient à un autre nom d'utilisateur. **Statut FIO** indique ensuite où en est la connexion : non connectée, chargement de tes données, connectée avec l'heure de la dernière mise à jour, connectée mais encore sans données (ouvre le jeu avec l'extension FIO active), clé refusée, ou mises à jour en échec.

Pendant que tu utilises PRUNplanner, tes données FIO ont au plus 30 à 45 minutes environ. Après une semaine d'absence, elles se rafraîchissent quand tu te connectes. FIO lui-même ne connaît que ce que l'extension a vu pendant que tu jouais.

PRUNplanner ne stocke pas tes données FIO (stocks et sites) dans ton navigateur. Il les charge à chaque ouverture de l'app, puis à nouveau toutes les 5 minutes.

## Préférences {#preferences}

PRUNplanner enregistre les préférences dans ton compte dès que tu les modifies, donc elles te suivent sur tous tes appareils. Seules les **Statistiques d'utilisation** sont stockées uniquement dans ce navigateur.

| Préférence                                          | Par défaut                                       | Ce qu'elle fait                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Langue**                                          | Anglais                                          | La langue de l'app. Les traductions viennent de la communauté sur Crowdin.                                                                                                                                                                                                                                      |
| **Palette de couleurs**                             | **Par défaut (vert / rouge)** | **Daltonien (bleu / orange)** change les couleurs bon/mauvais dans toute l'app.                                                                                                                                                                                                                              |
| **Fiche de marché**                                 | **Au survol**                                    | Avec **Au clic uniquement**, survoler un matériau n'affiche rien, et tu cliques dessus pour voir les prix. Voir [Fiche de marché d'un matériau](/help/exchanges#market-card).                                                                                                                                   |
| **Empire par défaut**                               | ton premier empire                               | L'empire sur lequel s'ouvrent la page Empire et Consommation FIO. Changer d'empire là-bas le modifie aussi.                                                                                                                                                                                                     |
| **CX par défaut**                                   | aucune                                           | La préférence d'échange avec laquelle démarrent ces outils : outils ROI, ROI des bases, Calculateur de QG, Coûts d'entretien, Chaînes de production et Réparer FIO. Choisir une préférence dans l'un d'eux la modifie aussi. Sans préférence, ils utilisent Univers · VWAP 30j. |
| **Seuil rouge**                                     | 5                                                | Consommation FIO : rouge quand une base a ce nombre de jours d'approvisionnement restants ou moins.                                                                                                                                                                                                             |
| **Seuil jaune**                                     | 10                                               | Consommation FIO : jaune à ce nombre de jours d'approvisionnement ou moins.                                                                                                                                                                                                                                     |
| **Jours de réapprovisionnement**                    | 20                                               | Consommation FIO : les jours que couvre un réapprovisionnement XIT.                                                                                                                                                                                                                                             |
| **Origine XIT**                                     | **Configurer à l'exécution**                     | D'où partent les chargements XIT de réapprovisionnement et de réparation : un entrepôt de station, ou choisi au moment où le XIT s'exécute.                                                                                                                                                                     |
| **XIT : acheter au CX**             | activé                                           | Acheter le chargement sur l'échange de l'origine (uniquement avec un entrepôt comme origine). Partagé par Consommation FIO et Réparer FIO.                                                                                                                                                   |
| **Réparer tous les (sans plan)** | 60                                               | Réparer FIO : intervalle de réparation en jours pour les bases sans plan associé (1–180).                                                                                                                                                                                                    |
| **Bientôt à réparer**                               | 7                                                | Réparer FIO : jours avant l'échéance qui comptent comme bientôt à réparer (0–60).                                                                                                                                                                                                            |
| **Jours d'arrivée**                                 | 2                                                | Réparer FIO : jours avant qu'un vaisseau de réparation décharge (0–30).                                                                                                                                                                                                                      |
| **Suggestions de plan**                             | activé                                           | Bâtiments et recettes populaires sur la planète, données sur la planète et configuration typique pour les plans vides.                                                                                                                                                                                                          |
| **Statistiques d'utilisation**                      | demandé une fois, dans une bannière              | Permet à PRUNplanner de collecter des événements d'utilisation, des rapports d'erreur et des enregistrements de session. Stocké uniquement dans ce navigateur. Reste désactivé quand ton navigateur envoie Do-Not-Track ou Global Privacy Control.                                              |

Une [[exchange-preference|préférence d'échange]] est ton ensemble de règles qui disent de quel échange et de quelle base de prix viennent les prix, donc **CX par défaut** décide avec quels prix démarrent les outils listés ci-dessus.

Les seuils de consommation sont des _jours d'approvisionnement restants_, pas des quantités en stock. Par exemple, avec **Seuil rouge** à 5 et **Seuil jaune** à 10, une base avec 4 jours restants s'affiche en rouge, une avec 7 jours en jaune, et une avec 12 jours sans couleur. Tu peux aussi les régler sur la page [Consommation FIO](/help/fio_burn#thresholds), et les réglages de réparation sur [Réparer FIO](/help/fio_repair). C'est le même réglage aux deux endroits.

**Paramètres propres aux plans** liste les plans qui ont leurs propres réglages, par exemple des exclusions de fréquence de visite, des bâtiments construits dans le panier de construction, ou l'optimisation automatique désactivée. Tu les modifies dans chaque plan.

## Stockage du navigateur {#browser-storage}

Pour charger vite et ménager le serveur, PRUNplanner garde une copie des données de jeu et de tes données de planification dans ton navigateur et la rafraîchit à intervalles fixes. Le tableau **Stockage du navigateur** montre ce qu'il contient. Tes plans, empires et préférences sont enregistrés dans ton compte, donc cette copie n'est pas le seul endroit où ils existent.

### Catégories de stockage {#storage-categories}

| Catégorie                | Contenu                                                                                           | Rafraîchi                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Données de jeu           | Matériaux, bâtiments, recettes et planètes (depuis FIO)                        | moins souvent que les échanges                     |
| Échanges                 | Prix et chiffres de marché : Ask et Bid depuis FIO, VWAP calculés par PRUNplanner | environ toutes les 30 minutes                      |
| Données de planification | Tes plans, empires, préférences d'échange et plans partagés                                       | une copie de ce qui est enregistré dans ton compte |

Les données FIO ne sont pas conservées dans le stockage du navigateur, même si le tableau liste leurs lignes (voir [Connexion FIO](#fio-connection)).
