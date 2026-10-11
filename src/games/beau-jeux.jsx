import React, { useState, useEffect } from "react";

/* ============================================================
   BEAU · JEUX · La salle de jeux du Souffleur
   Hall bilingue (FR/EN) : entrée par le nom, bouton FR/EN,
   grille des sept tables, rendu d'un jeu avec bouton retour.
   Persistance : beau_name, beau_lang (voir storage.js).
   Compte optionnel : relie le nom et synchronise quiz et paris.
   ============================================================ */

import Echecs from "./beau-echiquier-plateau.jsx";
import Tawla from "./beau-tawla.jsx";
import Sudoku from "./beau-sudoku.jsx";
import Escales from "./beau-escales-multi.jsx";
import Puissance4 from "./beau-puissance4.jsx";
import Quiz from "./beau-quiz-souffleur.jsx";
import Pari from "./beau-pari-scelle.jsx";
import {
  readName, saveName, clearName, readLang, saveLang,
  useAccount, fetchAccountName, signInWithPassword, sendMagicLink, signOut, cloudReady,
} from "./storage.js";

const C = {
  bg: "#F1EADD", paper: "#F4EEDF",
  frame: "#DCD0B8", frameEdge: "#CDBE9F",
  ink: "#201E19", terra: "#A8553B", petrol: "#4E6E78",
  hair: "rgba(32,30,25,0.14)", muted: "#6B6557", panel: "#FBF6EA",
};

/* ---------- Emblèmes (SVG) ---------- */
const Emb = ({ children }) => (
  <svg viewBox="0 0 40 40" width="46" height="46" aria-hidden="true" style={{ display: "block" }}>
    <g fill="none" stroke={C.ink} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">{children}</g>
  </svg>
);
const EmbEchecs = () => (
  <Emb>
    <path d="M18.6 6 H21.4 V9 H24 V11 H21.4 V14 H18.6 V11 H16 V9 H18.6 Z" fill={C.terra} stroke={C.terra} />
    <path d="M13 18 C16 13 24 13 27 18 L25.5 30 H14.5 Z" fill={C.paper} />
    <path d="M12 33 H28 L26.5 30 H13.5 Z" fill={C.paper} />
  </Emb>
);
const EmbTawla = () => (
  <Emb>
    <rect x="6" y="7" width="28" height="26" rx="2" fill={C.paper} />
    <path d="M11 7 L14 20 L8 20 Z" fill={C.terra} stroke={C.terra} />
    <path d="M20 7 L23 20 L17 20 Z" fill={C.petrol} stroke={C.petrol} />
    <path d="M14 33 L17 20 L11 20 Z" fill={C.petrol} stroke={C.petrol} />
    <path d="M23 33 L26 20 L20 20 Z" fill={C.terra} stroke={C.terra} />
  </Emb>
);
const EmbSudoku = () => (
  <Emb>
    <rect x="7" y="7" width="26" height="26" rx="1.5" fill={C.paper} />
    <line x1="7" y1="15.7" x2="33" y2="15.7" /><line x1="7" y1="24.3" x2="33" y2="24.3" />
    <line x1="15.7" y1="7" x2="15.7" y2="33" /><line x1="24.3" y1="7" x2="24.3" y2="33" />
    <text x="10.5" y="14" fontSize="6" fill={C.terra} stroke="none" style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>5</text>
    <text x="27.5" y="31.5" fontSize="6" fill={C.terra} stroke="none" style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>2</text>
  </Emb>
);
const EmbEscales = () => (
  <Emb>
    <circle cx="20" cy="20" r="13" fill={C.paper} />
    <path d="M20 9 L22.4 18 L20 16.5 L17.6 18 Z" fill={C.terra} stroke={C.terra} />
    <line x1="20" y1="9" x2="20" y2="31" /><line x1="9" y1="20" x2="31" y2="20" />
    <circle cx="20" cy="20" r="2" fill={C.petrol} stroke={C.petrol} />
  </Emb>
);
const EmbP4 = () => (
  <Emb>
    <rect x="7" y="8" width="26" height="24" rx="2" fill={C.paper} />
    <circle cx="14" cy="15" r="3" fill={C.terra} stroke={C.terra} />
    <circle cx="26" cy="15" r="3" fill="none" />
    <circle cx="14" cy="25" r="3" fill="none" />
    <circle cx="26" cy="25" r="3" fill={C.petrol} stroke={C.petrol} />
    <circle cx="20" cy="20" r="3" fill={C.terra} stroke={C.terra} />
  </Emb>
);
const EmbQuiz = () => (
  <Emb>
    <line x1="20" y1="8" x2="20" y2="30" /><line x1="11" y1="13" x2="29" y2="13" />
    <circle cx="20" cy="8" r="1.8" fill={C.terra} stroke={C.terra} />
    <path d="M11 13 L7.5 21 H14.5 Z" fill={C.paper} />
    <path d="M29 13 L25.5 21 H32.5 Z" fill={C.paper} />
    <line x1="14" y1="31" x2="26" y2="31" />
  </Emb>
);
const EmbPari = () => (
  <Emb>
    <circle cx="20" cy="20" r="11.5" fill={C.paper} />
    <circle cx="20" cy="20" r="7.6" fill="none" stroke={C.terra} strokeWidth="1" />
    <path d="M20 14 L21.5 18.2 L26 18.2 L22.3 20.9 L23.7 25.2 L20 22.6 L16.3 25.2 L17.7 20.9 L14 18.2 L18.5 18.2 Z" fill={C.terra} stroke={C.terra} />
  </Emb>
);

const PSTR = {
  fr: {
    roomTitle: "La salle de jeux", roomEyebrow: "LE SOUFFLEUR", enterLine: "Entrez votre nom, et prenez place à la table.",
    namePh: "Votre nom", enterBtn: "Entrer",
    hello: (n) => `Bonjour ${n}`, hubEyebrow: "LA SALLE DE JEUX DU SOUFFLEUR", choose: (n) => `Choisissez votre table, ${n}.`,
    footer: "BEAU · une table de jeux, pas une salle d'arcade.", logout: "Changer de nom", back: "‹ Jeux", defaultName: "Armateur",
    accountOpen: "Garder mes parties sur tous mes appareils", accountClose: "Rester sans compte",
    email: "E-mail", password: "Mot de passe", signIn: "Se connecter", magic: "Recevoir un lien de connexion",
    linkSent: "Lien envoyé. Ouvrez-le depuis cet appareil.", signInError: "Connexion impossible. Vérifiez vos identifiants.",
    needEmail: "Indiquez votre e-mail.", connectedAs: (e) => `Compte · ${e}`, signOut: "Se déconnecter",
    accountFine: "Facultatif. Un lien par e-mail suffit : votre nom, vos dilemmes et vos sceaux vous suivent d'un appareil à l'autre.",
  },
  en: {
    roomTitle: "The games room", roomEyebrow: "THE PROMPTER", enterLine: "Enter your name, and take your seat at the table.",
    namePh: "Your name", enterBtn: "Enter",
    hello: (n) => `Hello ${n}`, hubEyebrow: "THE PROMPTER'S GAMES ROOM", choose: (n) => `Choose your table, ${n}.`,
    footer: "BEAU · a games table, not an arcade.", logout: "Change name", back: "‹ Games", defaultName: "Skipper",
    accountOpen: "Keep my games on all my devices", accountClose: "Stay without an account",
    email: "Email", password: "Password", signIn: "Sign in", magic: "Email me a sign-in link",
    linkSent: "Link sent. Open it on this device.", signInError: "Could not sign in. Check your details.",
    needEmail: "Enter your email.", connectedAs: (e) => `Account · ${e}`, signOut: "Sign out",
    accountFine: "Optional. An email link is enough: your name, dilemmas and seals follow you from one device to another.",
  },
};

const GAMES = [
  { id: "echecs", emblem: EmbEchecs, comp: Echecs, fr: { name: "Échecs", desc: "À deux, ou contre le Souffleur.", tag: "1–2 joueurs" }, en: { name: "Chess", desc: "Two players, or against the Prompter.", tag: "1–2 players" } },
  { id: "tawla", emblem: EmbTawla, comp: Tawla, fr: { name: "Tawla", desc: "Le backgammon, règles incluses.", tag: "1 joueur" }, en: { name: "Tawla", desc: "Backgammon, rules included.", tag: "1 player" } },
  { id: "sudoku", emblem: EmbSudoku, comp: Sudoku, fr: { name: "Sudoku", desc: "Grilles à solution unique.", tag: "1 joueur" }, en: { name: "Sudoku", desc: "Unique-solution grids.", tag: "1 player" } },
  { id: "escales", emblem: EmbEscales, comp: Escales, fr: { name: "Escales", desc: "Armateur en mer, à plusieurs.", tag: "2–4 joueurs" }, en: { name: "Ports of Call", desc: "Shipowner at sea, for several.", tag: "2–4 players" } },
  { id: "p4", emblem: EmbP4, comp: Puissance4, fr: { name: "Puissance 4", desc: "À deux ou contre le Souffleur.", tag: "1–2 joueurs" }, en: { name: "Connect Four", desc: "Two players or against the Prompter.", tag: "1–2 players" } },
  { id: "quiz", emblem: EmbQuiz, comp: Quiz, fr: { name: "Quiz du Souffleur", desc: "Un dilemme patrimonial par semaine.", tag: "hebdomadaire" }, en: { name: "The Prompter's Quiz", desc: "One wealth dilemma each week.", tag: "weekly" } },
  { id: "pari", emblem: EmbPari, comp: Pari, fr: { name: "Le pari scellé", desc: "Engagez-vous, scellez, partagez.", tag: "vérifiable" }, en: { name: "The Sealed Wager", desc: "Commit, seal, share.", tag: "verifiable" } },
];

function LangToggle({ lang, onChange }) {
  return (
    <div style={S.lang}>
      <button onClick={() => onChange("fr")} style={{ ...S.langBtn, ...(lang === "fr" ? S.langOn : {}) }} aria-pressed={lang === "fr"}>FR</button>
      <button onClick={() => onChange("en")} style={{ ...S.langBtn, ...(lang === "en" ? S.langOn : {}) }} aria-pressed={lang === "en"}>EN</button>
    </div>
  );
}

/* Connexion facultative (Supabase Auth du projet LudoBeau) : mot de passe ou lien e-mail. */
function AccountForm({ P }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!cloudReady) return null;
  if (!open) return <button onClick={() => setOpen(true)} style={S.linkBtn}>{P.accountOpen}</button>;
  const go = async () => {
    if (!email.trim()) { setMsg(P.needEmail); return; }
    setBusy(true); setMsg("");
    const { error } = await signInWithPassword(email, pw);
    setBusy(false);
    if (error) setMsg(P.signInError);
  };
  const link = async () => {
    if (!email.trim()) { setMsg(P.needEmail); return; }
    setBusy(true); setMsg("");
    const { error } = await sendMagicLink(email);
    setBusy(false);
    setMsg(error ? P.signInError : P.linkSent);
  };
  return (
    <div style={S.account}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={P.email} autoComplete="email" style={S.inputSm} />
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} placeholder={P.password} autoComplete="current-password" style={S.inputSm} />
      <button onClick={go} disabled={busy} style={S.petrolBtn}>{P.signIn}</button>
      <button onClick={link} disabled={busy} style={S.linkBtn}>{P.magic}</button>
      {msg && <div style={S.accountMsg}>{msg}</div>}
      <div style={S.accountFine}>{P.accountFine}</div>
      <button onClick={() => { setOpen(false); setMsg(""); }} style={S.linkBtn}>{P.accountClose}</button>
    </div>
  );
}

export default function BeauJeux() {
  const [lang, setLang] = useState(readLang);
  const [name, setName] = useState(readName);
  const [entered, setEntered] = useState(() => !!readName());
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState(null);
  const user = useAccount();
  const P = PSTR[lang] || PSTR.fr;

  /* compte connecté : le nom du profil fait foi ; à défaut, on y rattache le nom local */
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchAccountName(user).then(({ profile, suggested }) => {
      if (!live) return;
      const n = profile || readName() || suggested;
      if (!n) return;
      setName(n); setEntered(true);
      if (n !== profile || n !== readName()) saveName(n);
    });
    return () => { live = false; };
  }, [user]);

  const changeLang = (l) => { setLang(l); saveLang(l); };
  const enter = () => { const n = (draft || P.defaultName).trim(); setName(n); setEntered(true); saveName(n); };
  const logout = () => { setEntered(false); setActive(null); setDraft(name); clearName(); };
  const leaveAccount = async () => { await signOut(); setEntered(false); setActive(null); setDraft(""); clearName(); };

  if (!entered) {
    return (
      <div style={S.portal}>
        <style>{CSS}</style>
        <div style={S.portalCard}>
          <div style={S.brandBig}>BEAU</div>
          <div style={S.portalTitle}>{P.roomTitle}</div>
          <div style={S.eyebrow}>{P.roomEyebrow}</div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}><LangToggle lang={lang} onChange={changeLang} /></div>
          <div style={S.hairline} />
          <div style={S.portalLine}><span style={S.voiceMark}>—</span> {P.enterLine}</div>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enter(); }} placeholder={P.namePh} maxLength={40} style={S.input} autoFocus />
          <button onClick={enter} style={S.enterBtn}>{P.enterBtn}</button>
          <AccountForm P={P} />
        </div>
      </div>
    );
  }

  if (active) {
    const G = GAMES.find((g) => g.id === active);
    const Comp = G.comp;
    return (
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <style>{CSS}</style>
        <button onClick={() => setActive(null)} style={S.back}>{P.back}</button>
        <Comp key={active + lang} lang={lang} />
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.langCorner}><LangToggle lang={lang} onChange={changeLang} /></div>
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.title}>{P.hello(name)}</div>
          <div style={S.eyebrow}>{P.hubEyebrow}</div>
          <div style={S.hairline} />
        </header>

        <div style={S.intro}>
          <span style={S.voiceMark}>—</span>
          <span style={S.introText}>{P.choose(name)}</span>
        </div>

        <div style={S.grid}>
          {GAMES.map((g) => {
            const E = g.emblem;
            const L = g[lang] || g.fr;
            return (
              <button key={g.id} onClick={() => setActive(g.id)} style={S.card} className="card">
                <div style={S.emblemWrap}><E /></div>
                <div style={S.cardName}>{L.name}</div>
                <div style={S.cardDesc}>{L.desc}</div>
                <div style={S.cardTag}>{L.tag}</div>
              </button>
            );
          })}
        </div>

        <footer style={S.foot}>
          <span>{P.footer}</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {user && <span style={S.connected}>{P.connectedAs(user.email || name)}</span>}
            <button onClick={logout} style={S.pill}>{P.logout}</button>
            {user && <button onClick={leaveAccount} style={S.pill}>{P.signOut}</button>}
          </span>
        </footer>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
button { font-family: inherit; }
.card { transition: transform .15s ease, box-shadow .15s ease; }
.card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -20px rgba(32,30,25,0.5); }
`;

const sans = "ui-sans-serif, system-ui, sans-serif";
const serif = "'Cormorant Garamond', Georgia, serif";
const bgGrad = `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`;

const S = {
  portal: { minHeight: "100vh", background: bgGrad, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: serif, color: C.ink },
  portalCard: { width: "min(92vw, 380px)", textAlign: "center", background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "34px 26px 28px", boxShadow: "0 30px 56px -34px rgba(32,30,25,0.5)" },
  brandBig: { fontFamily: sans, fontSize: 16, fontWeight: 600, letterSpacing: "0.5em", paddingLeft: "0.5em" },
  portalTitle: { fontSize: 32, fontStyle: "italic", marginTop: 10, lineHeight: 1 },
  portalLine: { fontStyle: "italic", fontSize: 17, color: C.muted, margin: "16px 0 18px" },
  input: { width: "100%", padding: "13px 14px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.paper, fontSize: 18, color: C.ink, fontFamily: serif, textAlign: "center" },
  enterBtn: { width: "100%", marginTop: 12, padding: "13px", border: "none", borderRadius: 3, background: C.terra, color: "#FBF7EF", fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" },

  account: { marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.hair}`, display: "flex", flexDirection: "column", gap: 8 },
  inputSm: { width: "100%", padding: "10px 12px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.paper, fontSize: 16, color: C.ink, fontFamily: serif },
  petrolBtn: { width: "100%", padding: "11px", border: "none", borderRadius: 3, background: C.petrol, color: "#FBF7EF", fontFamily: sans, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer" },
  linkBtn: { marginTop: 10, border: "none", background: "transparent", color: C.petrol, fontFamily: serif, fontStyle: "italic", fontSize: 16, cursor: "pointer", textDecoration: "underline", textDecorationColor: C.hair, textUnderlineOffset: 3 },
  accountMsg: { fontStyle: "italic", fontSize: 15.5, color: C.terra },
  accountFine: { fontStyle: "italic", fontSize: 14, color: C.muted, lineHeight: 1.35 },

  lang: { display: "inline-flex", gap: 2, border: `1px solid ${C.hair}`, borderRadius: 999, padding: 2, background: "rgba(251,246,234,0.7)" },
  langBtn: { fontFamily: sans, fontSize: 10, letterSpacing: "0.12em", padding: "5px 11px", border: "none", borderRadius: 999, background: "transparent", color: C.muted, cursor: "pointer" },
  langOn: { background: C.ink, color: C.bg },
  langCorner: { position: "absolute", top: 18, right: 18 },

  page: { position: "relative", minHeight: "100vh", background: bgGrad, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 16px 44px", fontFamily: serif, color: C.ink },
  shell: { width: "min(92vw, 720px)" },
  head: { textAlign: "center", marginBottom: 18 },
  brand: { fontFamily: sans, fontSize: 14, fontWeight: 600, letterSpacing: "0.46em", paddingLeft: "0.46em" },
  title: { fontSize: 36, fontStyle: "italic", marginTop: 10, lineHeight: 1 },
  eyebrow: { fontFamily: sans, fontSize: 10, letterSpacing: "0.3em", color: C.muted, marginTop: 9, paddingLeft: "0.3em" },
  hairline: { height: 1, background: C.hair, margin: "18px auto 0", width: "100%" },

  intro: { display: "flex", gap: 10, alignItems: "baseline", justifyContent: "center", margin: "16px 0 22px" },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1, fontStyle: "normal" },
  introText: { fontStyle: "italic", fontSize: 19, color: C.ink },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12 },
  card: { textAlign: "left", cursor: "pointer", border: `1px solid ${C.hair}`, borderRadius: 5, background: C.panel, padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset", color: C.ink },
  emblemWrap: { marginBottom: 8 },
  cardName: { fontSize: 21, fontWeight: 500, lineHeight: 1.1 },
  cardDesc: { fontSize: 15.5, color: C.muted, lineHeight: 1.3, minHeight: 40 },
  cardTag: { fontFamily: sans, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.terra, marginTop: 4 },

  foot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 26, fontStyle: "italic", fontSize: 15, color: C.muted },
  connected: { fontFamily: sans, fontStyle: "normal", fontSize: 9.5, letterSpacing: "0.1em", color: C.petrol },
  pill: { fontFamily: sans, fontStyle: "normal", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", padding: "7px 12px", border: `1px solid ${C.hair}`, borderRadius: 999, background: "transparent", color: C.muted, cursor: "pointer" },

  back: { position: "fixed", top: 14, left: 14, zIndex: 50, fontFamily: sans, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 14px", border: `1px solid ${C.hair}`, borderRadius: 999, background: "rgba(251,246,234,0.92)", backdropFilter: "blur(6px)", color: C.ink, cursor: "pointer", boxShadow: "0 6px 18px -10px rgba(32,30,25,0.5)" },
};
