import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "../lib/supabase.js";

/* ============================================================
   BEAU · Salle de jeux : stockage
   Le localStorage reste la source immédiate (préfixe beau_).
   Quand un compte BEAU est connecté (Supabase, projet BEAU
   Treasury), les mêmes données sont synchronisées en arrière-plan.
   Sans compte ni configuration, tout reste sur l'appareil.
   ============================================================ */

const K = { name: "beau_name", lang: "beau_lang", bets: "beau_paris", quiz: "beau_quiz" };

const readJSON = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? fallback; } catch (e) { return fallback; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const warn = (where, error) => { if (error) console.warn(`[beau-jeux] ${where}:`, error.message || error); };

/* ---------- Session ---------- */
let currentUser = null;
const listeners = new Set();
const setUser = (u) => { currentUser = u; listeners.forEach((fn) => fn(u)); };

if (supabase) {
  supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
}

export const cloudReady = supabaseReady;
export const getUser = () => currentUser;

export function useAccount() {
  const [user, setU] = useState(currentUser);
  useEffect(() => { listeners.add(setU); setU(currentUser); return () => listeners.delete(setU); }, []);
  return user;
}

export async function signInWithPassword(email, password) {
  if (!supabase) return { error: new Error("offline") };
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}
export async function sendMagicLink(email) {
  if (!supabase) return { error: new Error("offline") };
  /* compte BEAU existant uniquement : on ne crée pas de compte depuis la salle de jeux */
  return supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: window.location.href } });
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }

/* ---------- Identité ---------- */
export const readName = () => { try { return localStorage.getItem(K.name) || ""; } catch (e) { return ""; } };
export const clearName = () => { try { localStorage.removeItem(K.name); } catch (e) {} };
export const readLang = () => { try { const l = localStorage.getItem(K.lang); return l === "fr" || l === "en" ? l : "en"; } catch (e) { return "en"; } };

export function saveName(name) {
  try { localStorage.setItem(K.name, name); } catch (e) {}
  const u = currentUser;
  if (supabase && u) {
    supabase.from("player_profiles").upsert({ user_id: u.id, display_name: name.slice(0, 40), lang: readLang(), updated_at: new Date().toISOString() })
      .then(({ error }) => warn("saveName", error));
  }
}
export function saveLang(lang) {
  try { localStorage.setItem(K.lang, lang); } catch (e) {}
  const u = currentUser;
  if (supabase && u) {
    supabase.from("player_profiles").update({ lang, updated_at: new Date().toISOString() }).eq("user_id", u.id)
      .then(({ error }) => warn("saveLang", error));
  }
}

/* Nom affiché du compte : profil de jeu s'il existe, sinon une proposition
   tirée des métadonnées du compte BEAU (ou du début de l'e-mail). */
export async function fetchAccountName(user) {
  if (!supabase || !user) return { profile: "", suggested: "" };
  const { data, error } = await supabase.from("player_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  warn("fetchAccountName", error);
  const m = user.user_metadata || {};
  const suggested = m.display_name || m.full_name || m.name || m.first_name || (user.email || "").split("@")[0] || "";
  return { profile: data?.display_name || "", suggested };
}

/* ---------- Quiz ---------- */
export const loadQuizHist = () => readJSON(K.quiz, {});
export const saveQuizHist = (h) => writeJSON(K.quiz, h);

export function recordQuizAnswer(weekKey, entry) {
  const u = currentUser;
  if (!supabase || !u) return Promise.resolve();
  return supabase.from("quiz_answers").insert({ user_id: u.id, week_key: weekKey, idx: entry.idx, pick: entry.pick })
    .then(({ error }) => { if (error && error.code !== "23505") warn("recordQuizAnswer", error); });
}

/* Fusionne l'historique du compte et celui de l'appareil, et remonte ce qui manque. */
export async function syncQuizHist(local) {
  const u = currentUser;
  if (!supabase || !u) return local;
  const { data, error } = await supabase.from("quiz_answers").select("week_key, idx, pick").eq("user_id", u.id);
  if (error) { warn("syncQuizHist", error); return local; }
  const merged = { ...local };
  const remote = new Set();
  for (const r of data) { remote.add(r.week_key); merged[r.week_key] = { pick: r.pick, idx: r.idx }; }
  const missing = Object.entries(local).filter(([wk]) => !remote.has(wk) && /^\d{4}-W([1-9]|[1-4]\d|5[0-3])$/.test(wk));
  if (missing.length) {
    const { error: e2 } = await supabase.from("quiz_answers")
      .upsert(missing.map(([wk, v]) => ({ user_id: u.id, week_key: wk, idx: v.idx, pick: v.pick })), { onConflict: "user_id,week_key", ignoreDuplicates: true });
    warn("syncQuizHist/upload", e2);
  }
  return merged;
}

export async function fetchQuizWeekStats(weekKey) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("quiz_week_stats", { p_week_key: weekKey });
  if (error) { warn("fetchQuizWeekStats", error); return null; }
  const counts = [0, 0, 0];
  for (const r of data) counts[r.pick] = Number(r.answers);
  return counts;
}

export async function fetchQuizLeaderboard(limit = 20) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("quiz_leaderboard", { p_limit: limit });
  if (error) { warn("fetchQuizLeaderboard", error); return null; }
  return data;
}

/* ---------- Pari scellé ---------- */
/* Côté serveur : seul le sceau est écrit au scellement. La prédiction
   et le sel ne quittent l'appareil qu'à la révélation (wager_reveals),
   où la base recalcule l'empreinte avant d'accepter. */
export const loadBets = () => readJSON(K.bets, []);
export const saveBets = (b) => writeJSON(K.bets, b);

const sealRow = (u, bet) => ({ user_id: u.id, client_id: bet.id, deadline: bet.deadline, sealed_at: bet.createdAt, seal_hash: bet.hash, stake: bet.stake || null, outcome: bet.outcome || null });

async function remoteWagerId(u, bet) {
  const { data, error } = await supabase.from("wagers").select("id").eq("user_id", u.id).eq("client_id", bet.id).maybeSingle();
  warn("remoteWagerId", error);
  return data?.id || null;
}

export async function pushBetSeal(bet) {
  const u = currentUser;
  if (!supabase || !u) return;
  const { error } = await supabase.from("wagers").upsert(sealRow(u, bet), { onConflict: "user_id,client_id", ignoreDuplicates: true });
  warn("pushBetSeal", error);
}

export async function pushBetReveal(bet) {
  const u = currentUser;
  if (!supabase || !u || !bet.pred || !bet.salt) return;
  await pushBetSeal(bet);
  const id = await remoteWagerId(u, bet);
  if (!id) return;
  const { error } = await supabase.from("wager_reveals").insert({ wager_id: id, prediction: bet.pred, salt: bet.salt });
  if (error && error.code !== "23505") warn("pushBetReveal", error);
}

export async function pushBetOutcome(bet) {
  const u = currentUser;
  if (!supabase || !u) return;
  const { error } = await supabase.from("wagers").update({ outcome: bet.outcome }).eq("user_id", u.id).eq("client_id", bet.id);
  warn("pushBetOutcome", error);
}

export async function deleteBetRemote(bet) {
  const u = currentUser;
  if (!supabase || !u) return;
  const { error } = await supabase.from("wagers").delete().eq("user_id", u.id).eq("client_id", bet.id);
  warn("deleteBetRemote", error);
}

/* Réconcilie l'appareil et le compte : remonte les sceaux et révélations
   locales manquantes, rapatrie les paris scellés ailleurs. */
export async function syncBets(local) {
  const u = currentUser;
  if (!supabase || !u) return local;
  const { data, error } = await supabase.from("wagers")
    .select("client_id, deadline, sealed_at, seal_hash, stake, revealed, outcome, wager_reveals(prediction, salt)")
    .eq("user_id", u.id);
  if (error) { warn("syncBets", error); return local; }

  const byId = new Map(data.map((w) => [w.client_id, w]));
  const merged = local.map((bet) => {
    const w = byId.get(bet.id);
    if (!w) return bet;
    const rev = Array.isArray(w.wager_reveals) ? w.wager_reveals[0] : w.wager_reveals;
    return {
      ...bet,
      revealed: bet.revealed || w.revealed,
      outcome: bet.outcome || w.outcome || null,
      pred: bet.pred || rev?.prediction || bet.pred,
      salt: bet.salt || rev?.salt || bet.salt,
    };
  });

  const localIds = new Set(local.map((b) => b.id));
  for (const w of data) {
    if (localIds.has(w.client_id)) continue;
    const rev = Array.isArray(w.wager_reveals) ? w.wager_reveals[0] : w.wager_reveals;
    merged.push({
      id: w.client_id, deadline: w.deadline, createdAt: w.sealed_at, hash: w.seal_hash, stake: w.stake || "",
      revealed: w.revealed, outcome: w.outcome, pred: rev?.prediction || null, salt: rev?.salt || null,
      elsewhere: !rev, /* scellé sur un autre appareil : contenu inconnu ici */
    });
  }
  merged.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  /* remontées en arrière-plan */
  for (const bet of local) {
    const w = byId.get(bet.id);
    if (!w) { bet.revealed ? pushBetReveal(bet) : pushBetSeal(bet); continue; }
    if (bet.revealed && !w.revealed) pushBetReveal(bet);
    if (bet.outcome && bet.outcome !== w.outcome) pushBetOutcome(bet);
  }
  return merged;
}

export async function fetchWagerWall(limit = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("wager_wall", { p_limit: limit });
  if (error) { warn("fetchWagerWall", error); return null; }
  return data;
}
