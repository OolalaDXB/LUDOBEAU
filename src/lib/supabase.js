import { createClient } from "@supabase/supabase-js";

/* Client Supabase du projet LudoBeau (fhqismpcrrvptsbqtrcu).
   La clé publishable est publique par conception : la sécurité repose
   sur les règles RLS de la base. Les variables VITE_* la remplacent
   si besoin (autre projet, préproduction). */
const DEFAULT_URL = "https://fhqismpcrrvptsbqtrcu.supabase.co";
const DEFAULT_KEY = "sb_publishable_2XjenDmZLizD7_KXnlreeQ_e_3XKJgy";

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const supabaseReady = !!supabase;
