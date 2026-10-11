/* ============================================================
   BEAU · Le Souffleur, voix générée par Mistral AI
   Supabase Edge Function : POST /functions/v1/souffleur
   Corps : { kind, lang, game?, context? }  →  { line }
   kind : quiz | victory | defeat | comment | wager

   Secrets (Dashboard > Edge Functions > Secrets) :
   - MISTRAL_API_KEY   obligatoire pour activer la voix
   - MISTRAL_MODEL     facultatif, défaut "mistral-small-latest"
   - ALLOWED_ORIGINS   facultatif, origines autorisées séparées par des virgules
   Sans clé, la fonction répond 503 et les jeux gardent leurs répliques écrites.

   Déployée avec verify_jwt = false : la passerelle ne sait pas vérifier
   les clés sb_publishable_. La clé `apikey` est vérifiée ici, contre
   les clés publishable du projet (SUPABASE_PUBLISHABLE_KEYS).
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

function env(name) {
  try { return Deno.env.get(name) || ""; } catch (_e) { return ""; }
}

/* Clés acceptées dans l'en-tête apikey : publishable du projet (+ anon legacy). */
function knownKeys() {
  const keys = [];
  try { keys.push(...Object.values(JSON.parse(env("SUPABASE_PUBLISHABLE_KEYS") || "{}"))); } catch (_e) { /* format inattendu */ }
  if (env("SUPABASE_ANON_KEY")) keys.push(env("SUPABASE_ANON_KEY"));
  return keys.filter(Boolean);
}

function cors(origin) {
  const allowed = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);
  const allow = !allowed.length ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export async function handle(req) {
  const origin = req.headers.get("origin") || "";
  const headers = { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { error: "method" });

  const allowed = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return reply(403, { error: "origin" });

  const keys = knownKeys();
  if (keys.length && !keys.includes(req.headers.get("apikey") || "")) return reply(401, { error: "apikey" });

  const key = env("MISTRAL_API_KEY");
  if (!key) return reply(503, { error: "souffleur_offline" });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply(429, { error: "rate_limited" });

  let body = {};
  try { body = await req.json(); } catch (_e) { return reply(400, { error: "json" }); }
  const kind = KINDS.includes(body.kind) ? body.kind : null;
  if (!kind) return reply(400, { error: "kind" });
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
        model: env("MISTRAL_MODEL") || "mistral-small-latest",
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: PERSONA[lang] },
          { role: "user", content: `${TASK[kind][lang]}\n${game ? `Jeu / game: ${game}\n` : ""}Contexte / context (JSON): ${context}` },
        ],
      }),
    });
    if (!r.ok) return reply(502, { error: "mistral", status: r.status });
    const data = await r.json();
    const line = clean(data?.choices?.[0]?.message?.content);
    if (!line) return reply(502, { error: "empty" });
    return reply(200, { line });
  } catch (e) {
    return reply(e && e.name === "AbortError" ? 504 : 502, { error: "upstream" });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(handle);
