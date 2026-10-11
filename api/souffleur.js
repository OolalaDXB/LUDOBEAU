/* ============================================================
   BEAU · Le Souffleur, voix générée par Mistral AI
   Fonction serverless Vercel : POST /api/souffleur
   Corps : { kind, lang, game?, context? }  →  { line }
   kind : quiz | victory | defeat | comment | wager
   La clé MISTRAL_API_KEY reste côté serveur. Sans clé, la route
   répond 503 et les jeux gardent leurs répliques écrites.

   Variables d'environnement (Vercel > Settings > Environment Variables) :
   - MISTRAL_API_KEY   obligatoire pour activer la voix
   - MISTRAL_MODEL     facultatif, défaut "mistral-small-latest"
   - ALLOWED_ORIGINS   facultatif, origines autorisées séparées par des virgules
   ============================================================ */

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const KINDS = ["quiz", "victory", "defeat", "comment", "wager"];
const MAX_CONTEXT = 1500;      // caractères de contexte acceptés
const MAX_TOKENS = 120;        // une ou deux phrases, pas plus
const TIMEOUT_MS = 8000;

/* Garde-fou best effort : quelques appels par minute et par IP, par instance. */
const RATE = { windowMs: 60_000, max: 20 };
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE.max;
}

const PERSONA = {
  fr: `Tu es « le Souffleur », la voix de la salle de jeux de BEAU, une maison de gestion de patrimoine.
Ton registre : quiet luxury. Phrases courtes, élégantes, un brin d'esprit, jamais familier, jamais d'emoji.
Tu vouvoies le joueur. Une ou deux phrases, 220 caractères au plus. Pas de tiret cadratin, pas de guillemets autour de ta réponse.
Tu partages des principes et des repères, jamais un conseil financier personnalisé, jamais de recommandation d'achat ou de vente.
Les mises sont symboliques : BEAU n'est pas une salle de paris, tu n'encourages jamais à miser de l'argent.
Réponds uniquement par la réplique, en français.`,
  en: `You are "the Prompter", the voice of BEAU's games room; BEAU is a wealth management house.
Register: quiet luxury. Short, elegant sentences, a touch of wit, never casual, never emoji.
One or two sentences, 220 characters at most. No em dashes, no quotation marks around your reply.
You share principles and bearings, never personalised financial advice, never a recommendation to buy or sell.
Stakes are symbolic: BEAU is not a betting house, you never encourage wagering money.
Reply with the line only, in British English.`,
};

const TASK = {
  quiz: {
    fr: "Le joueur vient de répondre au dilemme de la semaine. Réagis à son choix avec bienveillance, en le situant par rapport à ton penchant, sans répéter le verdict.",
    en: "The player has just answered the dilemma of the week. React to their choice kindly, placing it against your own leaning, without repeating the verdict.",
  },
  victory: {
    fr: "Le joueur vient de gagner. Salue sa victoire avec panache et sobriété.",
    en: "The player has just won. Salute the victory with panache and restraint.",
  },
  defeat: {
    fr: "Le joueur vient de perdre contre toi. Taquine-le gentiment, avec affection et autodérision, jamais blessant ni condescendant, puis invite-le à prendre sa revanche.",
    en: "The player has just lost to you. Tease them gently, with affection and self-deprecation, never hurtful or condescending, then invite them to take their revenge.",
  },
  comment: {
    fr: "Commente brièvement ce moment de la partie, comme un observateur fin assis à la table.",
    en: "Briefly comment on this moment of the game, like a keen observer seated at the table.",
  },
  wager: {
    fr: "Le joueur vient de sceller une prédiction. Commente-la : est-elle claire et vérifiable le jour dit ? Ne juge pas si elle se réalisera.",
    en: "The player has just sealed a prediction. Comment on it: is it clear and checkable on the day? Do not judge whether it will come true.",
  },
};

function clean(s) {
  return String(s || "")
    .replace(/^["«“\s]+|["»”\s]+$/g, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin || "";
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return res.status(403).json({ error: "origin" });

  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method" }); }
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return res.status(503).json({ error: "souffleur_offline" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "rate_limited" });

  const body = readBody(req);
  const kind = KINDS.includes(body.kind) ? body.kind : null;
  if (!kind) return res.status(400).json({ error: "kind" });
  const lang = body.lang === "en" ? "en" : "fr";
  const game = String(body.game || "").slice(0, 40);
  const context = JSON.stringify(body.context ?? {}).slice(0, MAX_CONTEXT);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(MISTRAL_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: PERSONA[lang] },
          { role: "user", content: `${TASK[kind][lang]}\n${game ? `Jeu / game: ${game}\n` : ""}Contexte / context (JSON): ${context}` },
        ],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "mistral", status: r.status });
    const data = await r.json();
    const line = clean(data?.choices?.[0]?.message?.content);
    if (!line) return res.status(502).json({ error: "empty" });
    return res.status(200).json({ line });
  } catch (e) {
    return res.status(e.name === "AbortError" ? 504 : 502).json({ error: "upstream" });
  } finally {
    clearTimeout(timer);
  }
}
