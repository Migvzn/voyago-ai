// Vercel Serverless Function
// Traduit le format Anthropic Messages API vers Google Gemini 2.5 Flash

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Tu es Voya, l'assistant IA de Voyago.ai, expert en voyages.

Ta mission : extraire les paramètres d'un voyage à partir du langage naturel français et générer des suggestions concrètes et personnalisées.

Tu DOIS toujours répondre en JSON valide avec EXACTEMENT cette structure :

{
  "message": "Une réponse chaleureuse et personnalisée en français (2-3 phrases max)",
  "trip": {
    "destination": "Ville, Pays",
    "origin": "Ville de départ (par défaut Paris)",
    "departureDate": "YYYY-MM-DD",
    "returnDate": "YYYY-MM-DD",
    "travelers": 2,
    "budget": 2000,
    "currency": "EUR",
    "style": "romantique|aventure|culturel|détente|famille|gastronomique"
  },
  "flights": [
    {
      "airline": "Nom compagnie",
      "from": "Code IATA origine",
      "to": "Code IATA destination",
      "departure": "HH:MM",
      "arrival": "HH:MM",
      "duration": "Xh YYm",
      "stops": 0,
      "price": 250,
      "rating": 4.2
    }
  ],
  "hotels": [
    {
      "name": "Nom hôtel",
      "neighborhood": "Quartier",
      "stars": 4,
      "rating": 8.7,
      "reviews": 1234,
      "pricePerNight": 120,
      "image": "https://images.unsplash.com/photo-XXX?w=600&q=80",
      "highlights": ["Petit-déjeuner inclus", "Vue mer", "Spa"]
    }
  ],
  "restaurants": [
    {
      "name": "Nom restaurant",
      "cuisine": "Type de cuisine",
      "neighborhood": "Quartier",
      "rating": 4.5,
      "reviews": 567,
      "priceRange": "€€",
      "image": "https://images.unsplash.com/photo-XXX?w=600&q=80",
      "specialty": "Spécialité phare"
    }
  ],
  "activities": [
    {
      "name": "Nom activité",
      "category": "Musée|Visite|Aventure|Détente|Gastronomie",
      "duration": "2h",
      "rating": 4.7,
      "reviews": 890,
      "price": 35,
      "image": "https://images.unsplash.com/photo-XXX?w=600&q=80",
      "description": "Description courte et attrayante"
    }
  ],
  "budget": {
    "flights": 500,
    "accommodation": 600,
    "food": 400,
    "activities": 300,
    "transport": 100,
    "total": 1900
  }
}

RÈGLES IMPORTANTES :
- Génère TOUJOURS 3 vols, 3 hôtels, 5 restaurants, 5 activités
- Utilise des URLs Unsplash réelles avec photo-IDs valides pour des images d'hôtels/restos/activités
- Les ratings doivent être réalistes (hôtels 7.5-9.5, restos 4.0-4.9, activités 4.3-4.9)
- Les prix doivent correspondre au budget annoncé
- Si l'utilisateur n'a pas donné toutes les infos, fais des hypothèses raisonnables (Paris comme origine, 2 voyageurs, dans 2 mois pour 5 nuits)
- Le total du budget doit être cohérent avec les prix des suggestions
- Réponds UNIQUEMENT avec le JSON, rien d'autre

Photos Unsplash à utiliser (varie selon la destination/contexte) :
- Hôtels luxe: photo-1566073771259-6a8506099945, photo-1564501049412-61c2a3083791, photo-1571896349842-33c89424de2d
- Hôtels boutique: photo-1611892440504-42a792e24d32, photo-1551882547-ff40c63fe5fa, photo-1582719508461-905c673771fd
- Restaurants: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0, photo-1555396273-367ea4eb4db5, photo-1559339352-11d035aa65de, photo-1592861956120-e524fc739696
- Activités/villes: photo-1502602898657-3e91760cbb34 (Paris), photo-1523906834658-6e24ef2386f9 (Venise), photo-1538970272646-f61fabb3a8a2 (Rome), photo-1533929736458-ca588d08c8be (Londres), photo-1513581166391-887a96ddeafd (Barcelone), photo-1499856871958-5b9627545d1a (Lisbonne), photo-1518391846015-55a9cc003b25 (Amsterdam), photo-1480796927426-f609979314bd (Berlin), photo-1542051841857-5f90071e7989 (Tokyo), photo-1538485399081-7c8970b1a2dc (New York)`;

function convertAnthropicToGemini(body) {
  const messages = body.messages || [];
  const contents = [];

  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";
    const text = typeof msg.content === "string"
      ? msg.content
      : (Array.isArray(msg.content)
          ? msg.content.map(c => c.text || "").join("\n")
          : "");
    contents.push({ role, parts: [{ text }] });
  }

  return {
    contents,
    systemInstruction: {
      parts: [{ text: body.system || SYSTEM_PROMPT }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: "application/json"
    }
  };
}

function convertGeminiToAnthropic(geminiResponse, model) {
  const candidate = geminiResponse.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || "";
  const usage = geminiResponse.usageMetadata || {};

  return {
    id: `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text }],
    stop_reason: candidate?.finishReason === "STOP" ? "end_turn" : "max_tokens",
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0
    }
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY non configurée. Ajoute-la dans les variables d'environnement Vercel."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const geminiPayload = convertAnthropicToGemini(body);

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(response.status).json({
        error: "Erreur Gemini API",
        details: errorText
      });
    }

    const geminiData = await response.json();
    const anthropicFormat = convertGeminiToAnthropic(geminiData, body.model || GEMINI_MODEL);

    return res.status(200).json(anthropicFormat);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      message: error.message
    });
  }
}
