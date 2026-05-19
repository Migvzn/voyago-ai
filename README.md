# Voyago.ai

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMigvzn%2Fvoyago-ai&env=GEMINI_API_KEY&envDescription=Cl%C3%A9%20Google%20Gemini%20gratuite&envLink=https%3A%2F%2Faistudio.google.com%2Fapp%2Fapikey&project-name=voyago-ai&repository-name=voyago-ai)

Site de voyage avec calculateur de budget et assistant IA **Voya** propulsé par **Google Gemini 2.5 Flash** (gratuit).

Voya extrait les paramètres de voyage du langage naturel français et génère des suggestions concrètes :
3 vols, 3 hôtels, 5 restaurants, 5 activités — avec photos, ratings et redirections vers Skyscanner, Kayak, Booking, Airbnb, TheFork et GetYourGuide.

## Structure

```
voyago-ai/
├── index.html       # Site complet (hero, chat, cartes, calculateur)
├── api/chat.js      # Backend Vercel : traduit Anthropic ↔ Gemini
├── package.json     # Dépendances minimales
└── README.md
```

## Démarrage rapide

### 1. Cloner le projet

```bash
git clone https://github.com/TON-USERNAME/voyago-ai.git
cd voyago-ai
```

### 2. Obtenir une clé Gemini (gratuite)

1. Va sur [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Clique sur **Create API key**
3. Copie la clé (commence par `AIza...`)

### 3. Tester en local

```bash
npm install
npm install -g vercel
echo "GEMINI_API_KEY=ta_clé_ici" > .env
vercel dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Déploiement sur Vercel

### Option A — via le site web (le plus simple)

1. Pousse ton code sur GitHub
2. Va sur [vercel.com/new](https://vercel.com/new)
3. Importe ton repo
4. Dans **Environment Variables**, ajoute :
   - **Name** : `GEMINI_API_KEY`
   - **Value** : ta clé Gemini
5. Clique **Deploy**

### Option B — via la CLI

```bash
npm install -g vercel
vercel login
vercel
# Suis les questions, accepte les paramètres par défaut
vercel env add GEMINI_API_KEY
# Colle ta clé
vercel --prod
```

## Comment ça marche

### Frontend (`index.html`)

Le navigateur envoie une requête au format **Anthropic Messages API** :

```json
POST /api/chat
{
  "model": "gemini-2.5-flash",
  "messages": [{ "role": "user", "content": "Week-end à Rome..." }],
  "max_tokens": 4096
}
```

### Backend (`api/chat.js`)

Le serverless function :
1. Reçoit la requête au format Anthropic
2. La convertit en format Gemini (`contents`, `systemInstruction`, `generationConfig`)
3. Active `responseMimeType: "application/json"` pour forcer une sortie JSON valide
4. Appelle `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
5. Reconvertit la réponse au format Anthropic

Le system prompt définit le rôle de Voya et le schéma JSON exact attendu (voyage + 3 vols + 3 hôtels + 5 restos + 5 activités + budget).

### Affiliés / redirections

Chaque carte renvoie vers une URL de recherche pré-remplie :

| Type | Plateforme | URL |
|---|---|---|
| Vols | Skyscanner, Kayak | `/transport/vols/{from}/{to}/` |
| Hôtels | Booking | `/searchresults.fr.html?ss={hotel}` |
| Locations | Airbnb | `/s/{destination}` |
| Restos | TheFork | `/search/?cityName={ville}` |
| Activités | GetYourGuide | `/s/?q={activité}` |

## Personnalisation

- **Modèle Gemini** : change `GEMINI_MODEL` dans `api/chat.js`
- **Style** : couleurs et typos dans `:root` de `index.html`
- **Suggestions de prompts** : modifie les `<button data-prompt="...">` dans `index.html`
- **System prompt** : édite `SYSTEM_PROMPT` dans `api/chat.js`

## Stack

- **Frontend** : HTML/CSS/JS vanilla, fonts Fraunces + Inter
- **Backend** : Vercel Serverless Functions (Node 18+)
- **IA** : Google Gemini 2.5 Flash (gratuit jusqu'à 1500 requêtes/jour)
- **Hébergement** : Vercel (free tier)

## Licence

MIT — fais-en ce que tu veux.
