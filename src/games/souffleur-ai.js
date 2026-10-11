import { useEffect, useState } from "react";
import { supabaseUrl, supabaseKey } from "../lib/supabase.js";

/* ============================================================
   BEAU · Le Souffleur : voix générée (Mistral AI via la Supabase
   Edge Function « souffleur », projet LudoBeau)
   askSouffleur() renvoie une réplique, ou null si la voix n'est pas
   disponible (pas de clé, hors ligne, délai dépassé). Les jeux gardent
   toujours leur réplique écrite en repli : rien ne casse sans Mistral.
   ============================================================ */

const ENDPOINT = import.meta.env.VITE_SOUFFLEUR_ENDPOINT || (supabaseUrl ? `${supabaseUrl}/functions/v1/souffleur` : "");
const ENABLED = import.meta.env.VITE_SOUFFLEUR_AI !== "off";
const TIMEOUT_MS = 6000;

let offline = !ENABLED || !ENDPOINT;            /* 503/404 : on cesse d'appeler pour la session */
const cache = new Map();           /* même demande, même réplique */

/**
 * @param {{ kind: "quiz"|"victory"|"defeat"|"comment"|"wager", lang: "fr"|"en", game?: string, context?: object }} req
 * @returns {Promise<string|null>}
 */
export async function askSouffleur(req) {
  if (offline) return null;
  const key = JSON.stringify(req);
  if (cache.has(key)) return cache.get(key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      /* clé publishable dans apikey uniquement : la passerelle refuse un sb_ dans Authorization */
      headers: { "Content-Type": "application/json", apikey: supabaseKey },
      body: JSON.stringify(req),
      signal: ctrl.signal,
    });
    if (r.status === 503 || r.status === 404 || r.status === 405) { offline = true; return null; }
    if (!r.ok) return null;
    const { line } = await r.json();
    if (typeof line !== "string" || !line.trim()) return null;
    cache.set(key, line);
    return line;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Réplique du Souffleur pour un composant : affiche `fallback` tout de suite,
 * puis la réplique générée si elle arrive. `req` à null = pas d'appel.
 */
export function useSouffleurLine(req, fallback) {
  const [line, setLine] = useState(fallback);
  const key = req ? JSON.stringify(req) : null;
  useEffect(() => {
    setLine(fallback);
    if (!key) return;
    let live = true;
    askSouffleur(JSON.parse(key)).then((l) => { if (live && l) setLine(l); });
    return () => { live = false; };
  }, [key, fallback]);
  return line;
}
