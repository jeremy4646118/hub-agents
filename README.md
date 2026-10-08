# Hub agents — guide de mise en ligne

Ce dossier contient la **vraie version** du dashboard : une page web (`public/`) et un petit backend (`api/`) qui parle à Manus à ta place.
Tout se fait depuis un navigateur, sans installer de programme.

## Ce dont tu as besoin
1. Un compte **GitHub** (github.com).
2. Un compte **Vercel** (vercel.com), connecté avec ton GitHub.
3. Une **clé API Manus**, créée dans les réglages « Developers » de Manus.
   ⚠️ Ne la colle jamais dans une conversation, ni dans un fichier de ce dossier.

## Étapes
1. **GitHub** : crée un dépôt **privé** nommé `hub-agents`. Clique « Add file » → « Upload files », puis glisse tout le contenu de ce dossier (en gardant les dossiers `api` et `public`) et valide.
2. **Vercel** : « Add New… » → « Project », choisis le dépôt `hub-agents`, puis « Deploy ». Ne change aucun réglage.
3. **Stockage** : dans ton projet Vercel, onglet « Storage » (ou « Marketplace ») → crée une base **Upstash Redis** (offre gratuite) et connecte-la au projet. Les variables de connexion s'ajoutent toutes seules.
4. **Variables** : dans « Settings » → « Environment Variables », ajoute :
   - `MANUS_API_KEY` : ta clé API Manus ;
   - `DASHBOARD_PASSWORD` : un mot de passe long de ton choix (celui qui protège ton dashboard).
   Puis « Deployments » → « Redeploy ».
5. **Webhook Manus** (pour les liens « Auto » entre agents) : dans les réglages « Developers → Webhooks » de Manus, crée un webhook avec l'adresse
   `https://TON-PROJET.vercel.app/api/webhook`
   (remplace par l'adresse de ton projet). Manus teste l'adresse avant de l'activer.
6. **Ouvre ton site** : saisis le mot de passe. Les skills de ton compte Manus sont chargés automatiquement.

## Premier test (5 minutes)
1. Note ton solde de crédits dans Manus.
2. Dans le dashboard, ouvre l'agent « Scraper Google » et écris un message simple.
3. Vérifie que la réponse arrive, puis que ton solde a baissé (c'est ce qui confirme que l'API consomme bien ton forfait).
4. Crée un lien Scraper → Notion en « Auto » et relance : une tâche doit apparaître chez Notion à la fin de celle du Scraper.

## Comment ça marche
- **Un agent = un projet Manus** (avec ses instructions, réglables dans « ⚙ Réglages du robot »). **Une conversation = une tâche**, prolongée par les messages de suivi.
- **Skills** : à chaque message, le backend envoie les skills de l'agent + les skills communs.
- **Superviseur** : à chaque message, le backend lui transmet la liste de tes agents. Quand il veut déléguer, il termine sa réponse par un bloc `delegate` que la page lit pour lancer la tâche chez le bon agent. Une même délégation n'est jamais exécutée deux fois.
- **Liens** : « À valider » = bouton « Envoyer à… » ; « Auto » = le webhook Manus déclenche la tâche suivante, avec le résultat et un renvoi vers la tâche d'origine. **Garde-fou** : une tâche créée par un lien ne déclenche jamais un autre lien.
- **Confirmations** : si Manus demande une validation (publier sur Instagram, envoyer un mail…), des boutons « Confirmer / Refuser » apparaissent dans le chat.

## À savoir
- **Coût** : chaque message = une tâche Manus. Une délégation à 2 agents = 3 tâches.
- **Mode « Direct (API) »** vers Notion (sans agent Manus) : **pas inclus** dans cette version, c'est la phase suivante.
- **Skills** : je n'ai pas vérifié si la liste envoyée *s'ajoute* à tes skills activés par défaut dans Manus ou les remplace. Le premier test le dira.
- **Instructions** : modifier les instructions d'un agent crée un nouveau projet Manus et démarre une nouvelle conversation (les anciens projets restent visibles dans Manus).
- **Positions des robots** : enregistrées par appareil (navigateur). Agents, liens et skills sont partagés partout.
- **Sécurité** : un seul mot de passe protège l'accès. Si ta clé API a été exposée, régénère-la dans Manus et mets à jour `MANUS_API_KEY`.
- **Hébergement** : d'après les conditions de Vercel, l'offre gratuite « Hobby » est prévue pour un usage personnel non commercial. Vérifie leur page tarifaire : pour un usage professionnel, c'est plutôt l'offre payante. Le code peut être adapté à un autre hébergeur.
- **Statut des tests** : le backend et la page ont été testés avec un faux Manus et un faux stockage. Ils n'ont **pas encore été testés avec ton compte réel** : les premiers essais serviront à corriger ce qui doit l'être.
