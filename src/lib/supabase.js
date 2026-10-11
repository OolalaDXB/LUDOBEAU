import { createClient } from "@supabase/supabase-js";

/* Client Supabase du projet BEAU Treasury (lxlpunmdywbhlwifgcpx).
   Sans variables d'environnement, la salle de jeux reste 100 % locale. */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const supabaseReady = !!supabase;
