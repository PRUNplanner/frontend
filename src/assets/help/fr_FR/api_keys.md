Avec une clé API, une feuille de calcul, un tableau de bord, un script ou un assistant IA peut lire tes données PRUNplanner sans ton mot de passe. Sur la page [Clés API](/apikey) (**API** dans le menu du compte), tu crées et révoques des clés, tu connectes un [assistant IA](/help/mcp) et tu génères des URL, des formules Google Sheets et des extraits curl et Python prêts à coller.

## À quoi servent les clés {#what-keys-are-for}

L'API REST de PRUNplanner fournit tes données de planification (plans, empires, préférences d'échange, les [[material-io|E/S des matériaux]] de tes empires), ton stockage [[fio|FIO]], les données du jeu (matériaux, recettes, bâtiments, planètes) et des chiffres de marché comme le [[vwap|VWAP]]. Usages typiques :

- importer les E/S des matériaux de ton empire dans une feuille Google Sheets qui se recalcule toute seule,
- alimenter ton propre tableau de bord avec les prix des échanges ou ton stockage FIO,
- faire tes propres analyses sur l'ensemble de tes plans.

Les données publiques du jeu et les prix des échanges ne nécessitent pas de clé. Tout ce qui t'appartient, si.

Chaque clé a un **Accès** : **Lecture seule** ou **Lecture et écriture**. Voir [Accès](#access) pour ce que chacun permet.

Tu trouveras la référence complète sur [api.prunplanner.org/docs](https://api.prunplanner.org/docs). Son bouton Authorize accepte une clé : tu peux donc essayer des appels dans le navigateur.

## Créer une clé {#create}

1. Appuie sur **Créer nouvelle clé**.
2. Saisis un **Nom de la clé** qui te rappellera plus tard où tu l'utilises, par exemple le nom de la feuille. Limite-le à 50 caractères. Un nom plus long échoue avec une erreur générale.
3. Choisis l'**Accès** : **Lecture seule** (déjà sélectionné) ou **Lecture et écriture**. La ligne en dessous indique ce que la clé pourra faire.
4. Appuie sur **Créer**. La clé apparaît une seule fois, sous **Votre clé sécrète (Sauvegarde la maintenant !)**, avec son accès.
5. **Copier la clé** et conserve-la en lieu sûr, par exemple dans un gestionnaire de mots de passe. **Utiliser dans le générateur d'URL** la reporte dans le générateur d'URL ci-dessous, pour cette visite uniquement.
6. Appuie sur **J'ai enregistré ma clé**.

> [!warning]
> PRUNplanner ne peut pas réafficher la clé, car il n'en garde qu'une forme hachée, qui permet de vérifier une clé mais pas de la reconstituer. Si tu la perds, révoque-la et crée-en une nouvelle.

## Gérer les clés {#manage-keys}

**Clés API PRUNplanner** liste tes clés avec leur **Nom**, **Préfixe**, **Accès**, **Créée** et **Dernièrement utilisée**. Le préfixe est la première partie de la clé, non secrète, celle avant le point : il te permet de les distinguer. Dernièrement utilisée affiche **Jamais** tant que la clé n'a pas servi. Ensuite, la valeur se met à jour au plus une fois toutes les 5 minutes : une requête envoyée il y a un instant peut donc ne pas encore apparaître.

**Révoquer** supprime une clé après confirmation. Les scripts et les feuilles qui l'utilisent cessent de fonctionner immédiatement.

## Accès {#access}

Chaque clé lit tes données. Le fait qu'elle puisse aussi les modifier dépend de l'accès choisi lors de sa création :

| Accès                   | Lit tes plans, empires et autres données | Les crée, modifie et supprime   |
| ----------------------- | ---------------------------------------- | ------------------------------- |
| **Lecture seule**       | oui                                      | non                             |
| **Lecture et écriture** | oui                                      | oui, avec la clé dans l'en-tête |

Les nouvelles clés sont en **Lecture seule** sauf si tu choisis **Lecture et écriture**. Une feuille, un tableau de bord ou tout ce que tu construis avec le générateur d'URL ne fait que lire : une clé en lecture seule suffit. Ne donne l'accès **Lecture et écriture** à une clé que si un de tes scripts modifie tes données. Les clés créées avant l'introduction des accès sont en **Lecture et écriture**, pour que les scripts qui les utilisent continuent de fonctionner.

Tu ne peux pas changer l'accès d'une clé après coup. Pour le changer, crée une nouvelle clé avec l'accès voulu, bascule ta feuille ou ton script dessus, et révoque l'ancienne.

Certaines choses sont impossibles avec une clé, quel que soit son accès. Elles exigent que tu sois connecté à PRUNplanner :

- lister, créer ou révoquer des clés,
- changer ton e-mail, ton mot de passe, ton nom d'utilisateur PrUn ou ta clé API FIO,
- demander ou confirmer la vérification de l'e-mail.

Une clé peut lire ton profil, mais ta clé API FIO revient vide : c'est ta clé pour FIO, et un script n'en a pas besoin.

Quand une clé tente quelque chose qui ne lui est pas permis, la réponse est _403 Forbidden_ avec un `code` qui en donne la raison :

- `api_key_read_only` : une clé en **Lecture seule** a tenté de modifier des données.
- `api_key_in_url` : une clé envoyée comme `?api_key=` a tenté de modifier des données. Envoie-la dans l'en-tête `Authorization`.
- `api_key_not_allowed` : une clé a tenté l'une des actions de compte ci-dessus. Connecte-toi pour le faire.

Rien n'est modifié dans ce cas.

## Utiliser une clé {#using-keys}

Envoie la clé avec chaque requête, de l'une de ces deux façons :

| Façon                | Exemple                                 | À utiliser pour                                                  |
| -------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| En-tête              | `Authorization: Api-Key <YOUR_KEY>`     | Scripts, curl, tableaux de bord                                  |
| Paramètre de requête | `?api_key=<YOUR_KEY>` à la fin de l'URL | `IMPORTDATA` de Google Sheets, outils qui n'acceptent qu'une URL |

Toute personne qui voit une URL voit la clé qu'elle contient, par exemple toutes celles qui peuvent ouvrir ta feuille. C'est pourquoi une clé dans une URL ne peut que lire, même une clé en **Lecture et écriture**. Utilise une clé en lecture seule distincte par feuille ou script, pour pouvoir en révoquer une sans casser les autres.

Les deux façons fonctionnent pour toutes les requêtes qu'une clé peut faire, sauf que les modifications exigent l'en-tête. Si une requête contient les deux, PRUNplanner utilise l'en-tête.

## Assistants IA {#ai-assistants}

Une clé permet aussi de connecter un assistant IA comme Claude, ChatGPT/Codex, Copilot ou Cursor au serveur MCP de PRUNplanner, pour qu'il lise et calcule tes plans et tes empires avec le moteur de PRUNplanner. La carte **Assistants IA (MCP)** de cette page donne l'adresse du serveur, l'en-tête et le téléchargement pour Claude Desktop. [Assistants IA (MCP)](/help/mcp) explique ce que l'assistant peut faire et comment configurer chaque client.

Une clé en **Lecture seule** suffit pour les questions et les scénarios ; l'assistant n'a besoin de **Lecture et écriture** que pour enregistrer à ta place.

## Générateur d'URL {#url-builder}

Le **Générateur d'URL** écrit la requête pour toi. Choisis les **Données** et le **Format** (CSV ou JSON, quand les deux existent), puis remplis les champs dont l'endpoint a besoin. Il peut s'agir de **Empire**, **Plan** ou **Préférence CX** (de ton compte), **Planète** (un ID naturel comme OT-580b), **Matériau**, **Échange** (AI1, CI1, IC1, NC1 ou UNIVERSE) ou **Jours** (dernier jour, 7, 14 ou 31).

| Groupe                                    | Données                                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prêt pour Sheets (CSV et JSON)            | **E/S de matériaux de l'empire**, **E/S de matériaux des plans (empire)**, **Liste des plans de l'empire**, **Stockage FIO**, **Prix des échanges** (sans clé)               |
| Tes données de planification (JSON)       | **Tous les plans**, **Un plan**, **Tous les empires**, **Un empire**, **Préférences CX**, **Une préférence CX**                                                              |
| Données publiques du jeu (JSON, sans clé) | **Matériaux**, **Recettes**, **Bâtiments**, **Une planète**, **Rapport de population d'une planète**, **Historique du marché**, **Historique du marché, tous les matériaux** |

Copie ensuite ce dont tu as besoin :

- **Google Sheets** : une formule `=IMPORTDATA("…")`, pour le CSV uniquement. Colle-la dans une cellule.
- **URL** : l'adresse avec la clé en `?api_key=`.
- **curl** et **Python** : avec la clé dans l'en-tête. L'extrait Python lit la version CSV quand elle existe.

Tant que tu n'as pas renseigné ta clé, les extraits affichent `<YOUR_KEY>` à sa place.

> [!tip]
> **E/S de matériaux de l'empire** et **E/S de matériaux des plans (empire)** renvoient les chiffres du dernier calcul de cet empire par PRUNplanner, qui a lieu quand tu l'ouvres sur la page [Empire](/empire). La colonne `updated_at` indique quand. Ouvre l'empire après avoir modifié ses plans, et ta feuille suit.

## Limites de requêtes {#rate-limits}

Si tu dépasses ces limites, la requête reçoit la réponse _429 Too Many Requests_. Attends une minute et réessaie.

Ces limites sont bien au-dessus d'un usage normal : les 240 par minute représentent environ quatre fois, et la limite du stockage FIO environ deux fois, la minute la plus chargée d'un usage normal.

| Requêtes                                                  | Limite         | Comptée par                                            |
| --------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| Tout ce que tu demandes avec une clé ou en étant connecté | 240 par minute | compte                                                 |
| **Stockage FIO**                                          | 30 par minute  | compte                                                 |
| **Historique du marché** (un matériau)                    | 120 par minute | adresse IP, ou compte quand la requête contient ta clé |
| **Historique du marché, tous les matériaux**              | 30 par minute  | adresse IP, ou compte quand la requête contient ta clé |

L'historique du marché ne nécessite pas de clé, mais en envoyer une compte tes requêtes sur ton compte plutôt que sur ton adresse IP : ceux qui partagent cette adresse (par exemple un hébergeur de feuilles de calcul) n'épuisent donc pas ta limite. Une clé invalide ou révoquée y est ignorée : la requête passe quand même, comptée par adresse IP.

Une feuille qui rafraîchit beaucoup de cellules `IMPORTDATA` à la fois peut atteindre une limite. Une seule requête pour beaucoup de lignes, comme **Historique du marché, tous les matériaux**, vaut mieux qu'une requête par matériau.

Par exemple, si 40 requêtes **Stockage FIO** arrivent en une minute, les 30 premières passent et les 10 autres reçoivent une 429.

## Validité {#validity}

Les clés n'ont pas de date d'expiration. Une clé cesse de fonctionner quand :

- tu la révoques,
- tu changes ou réinitialises ton mot de passe (toutes les clés créées avant cessent immédiatement de fonctionner : crée-en de nouvelles et mets à jour tes feuilles et tes scripts),
- ton compte est désactivé.

Ainsi, si quelqu'un a appris ton mot de passe et créé une clé avec, changer ton mot de passe bloque aussi cette clé.

Une requête avec une clé qui ne fonctionne plus reçoit une _401_ avec « Invalid API Key ». Les clés arrêtées par un changement de mot de passe restent visibles dans la liste, et tu peux les révoquer pour faire le ménage.

> [!warning]
> Traite une clé comme ton mot de passe. Ne la mets pas dans des dépôts publics et ne la partage pas avec des services en qui tu n'as pas confiance. Si une clé a pu fuiter, révoque-la et crée-en une nouvelle.
