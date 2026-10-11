import React, { useEffect, useMemo, useRef } from "react";
import { useSouffleurLine } from "./souffleur-ai.js";

/* ============================================================
   BEAU · Célébration de victoire
   Pop-up commune aux jeux : carte ivoire, sceau de cire.
   variant="win"    : sceau terracotta, confettis de papier.
   variant="defeat" : sceau pétrole, pas de confettis, une pique
                      gentille du Souffleur (liste écrite, ou Mistral).
   <Celebration open lang variant game tier message winner accent onReplay onClose />
   tier (gentle | steady | sharp) choisit le modèle Mistral selon la difficulté.
   ============================================================ */

const C = {
  bg: "#F1EADD", paper: "#F4EEDF", panel: "#FBF6EA",
  ink: "#201E19", terra: "#A8553B", petrol: "#4E6E78",
  sand: "#CDBE9F", hair: "rgba(32,30,25,0.14)", muted: "#6B6557",
};

const STR = {
  fr: {
    eyebrow: "LE SOUFFLEUR SALUE", title: "Victoire", winnerTitle: (n) => `${n} l'emporte`,
    replay: "Rejouer", close: "Voir le plateau",
    defeatEyebrow: "LE SOUFFLEUR SOURIT", defeatTitle: "Le Souffleur l'emporte", revenge: "Prendre ma revanche",
    teases: [
      "Je ne dirai rien à personne. Enfin, presque personne.",
      "Vous m'avez laissé gagner, n'est-ce pas ? C'est très courtois de votre part.",
      "Les marchés ont leurs cycles, vous aussi. Celui-ci était baissier.",
      "J'ai eu de la chance. Beaucoup de chance. Et un soupçon de talent, peut-être.",
      "Ne le prenez pas mal : je joue ici tous les soirs, et je n'ai rien d'autre à faire.",
      "Une défaite portée avec cette élégance, c'est presque une victoire. Presque.",
      "Diversifiez vos coups comme vos placements : on encaisse mieux les secousses.",
      "La patience est une vertu. La revanche, un plaisir. Je vous attends.",
      "Rassurez-vous, la moitié de la salle m'a déjà offert ce même plaisir.",
    ],
    wagerTeases: [
      "Le café est pour vous, je crois. Sans sucre, j'imagine, après ça.",
      "L'avenir a ses humeurs. Il ne vous a simplement pas consulté.",
      "Une conviction scellée, puis démentie : c'est ainsi qu'on apprend. Et qu'on paie le déjeuner.",
    ],
  },
  en: {
    eyebrow: "THE PROMPTER SALUTES", title: "Victory", winnerTitle: (n) => `${n} wins`,
    replay: "Play again", close: "View the board",
    defeatEyebrow: "THE PROMPTER SMILES", defeatTitle: "The Prompter wins", revenge: "Take my revenge",
    teases: [
      "I shan't tell a soul. Well, hardly a soul.",
      "You let me win, didn't you? Terribly gracious of you.",
      "Markets have their cycles, and so do you. This one was bearish.",
      "I was lucky. Very lucky. And perhaps a touch talented.",
      "Don't take it to heart: I play here every evening, and have nothing else to do.",
      "A defeat worn with such elegance is almost a victory. Almost.",
      "Diversify your moves as you would your holdings: the jolts land softer.",
      "Patience is a virtue. Revenge, a pleasure. I shall be waiting.",
      "Take heart, half the room has already given me this very pleasure.",
    ],
    wagerTeases: [
      "The coffee is on you, I believe. No sugar, I imagine, after that.",
      "The future has its moods. It simply didn't consult you.",
      "A sealed conviction, then proven wrong: that is how one learns. And pays for lunch.",
    ],
  },
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PAPER = [C.terra, C.petrol, C.ink, C.sand, C.terra, C.petrol];

const CSS = `
@keyframes beauCelFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes beauCelRise { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes beauCelSeal { 0% { opacity: 0; transform: scale(1.6) rotate(-18deg) } 60% { opacity: 1; transform: scale(.94) rotate(3deg) } 100% { transform: scale(1) rotate(0) } }
@keyframes beauCelFall {
  0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0 }
  8% { opacity: 1 }
  100% { transform: translate3d(var(--drift), 108vh, 0) rotate(var(--spin)); opacity: .9 }
}
.beau-cel-paper { position: absolute; top: 0; border-radius: 1px; animation: beauCelFall var(--dur) cubic-bezier(.25,.6,.45,1) var(--delay) both; }
@media (prefers-reduced-motion: reduce) {
  .beau-cel-paper { display: none; }
  .beau-cel-card, .beau-cel-seal, .beau-cel-back { animation: none !important; }
}
`;

function Seal({ accent, defeat }) {
  const col = accent || (defeat ? C.petrol : C.terra);
  return (
    <svg viewBox="0 0 80 80" width="76" height="76" aria-hidden="true" className="beau-cel-seal" style={S.seal}>
      {/* laurier */}
      <g fill="none" stroke={C.ink} strokeWidth="1.2" strokeLinecap="round" opacity=".55">
        <path d="M22 62 C12 50 12 32 22 20" />
        <path d="M58 62 C68 50 68 32 58 20" />
      </g>
      <g fill={defeat ? C.sand : C.petrol} opacity=".75">
        {[0, 1, 2, 3].map((i) => {
          const y = 56 - i * 10;
          return (
            <g key={i}>
              <ellipse cx={17 + (i === 0 || i === 3 ? 2 : 0)} cy={y} rx="2.4" ry="5" transform={`rotate(-35 ${17 + (i === 0 || i === 3 ? 2 : 0)} ${y})`} />
              <ellipse cx={63 - (i === 0 || i === 3 ? 2 : 0)} cy={y} rx="2.4" ry="5" transform={`rotate(35 ${63 - (i === 0 || i === 3 ? 2 : 0)} ${y})`} />
            </g>
          );
        })}
      </g>
      {/* sceau de cire */}
      <path d="M40 18 C46 18 47 22 52 23 C57 25 56 30 59 34 C62 39 58 42 59 47 C59 53 54 54 51 58 C47 62 43 60 40 62 C37 60 33 62 29 58 C26 54 21 53 21 47 C22 42 18 39 21 34 C24 30 23 25 28 23 C33 22 34 18 40 18 Z" fill={col} />
      <circle cx="40" cy="40" r="13.5" fill="none" stroke="#FBF7EF" strokeWidth="1" opacity=".7" />
      <path d="M40 31 L42.4 37.4 L49 37.4 L43.6 41.4 L45.7 48 L40 44 L34.3 48 L36.4 41.4 L31 37.4 L37.6 37.4 Z" fill="#FBF7EF" />
    </svg>
  );
}

export default function Celebration({ open, lang = "fr", variant = "win", game, tier = null, message, winner, accent, title, onReplay, onClose, replayLabel }) {
  const t = STR[lang] || STR.fr;
  const defeat = variant === "defeat" || variant === "wagerLost";
  const btnRef = useRef(null);

  /* réplique écrite (repli), tirée une fois par ouverture */
  const written = useMemo(() => {
    if (!open) return "";
    if (variant === "defeat") return pick(t.teases);
    if (variant === "wagerLost") return pick(t.wagerTeases);
    return message || "";
  }, [open, variant, lang]); // eslint-disable-line
  const openedAt = useMemo(() => (open ? Date.now() : 0), [open]);
  /* voix Mistral si disponible : remplace la réplique écrite à son arrivée */
  const spoken = useSouffleurLine(
    open ? { kind: defeat ? "defeat" : "victory", lang, tier, game, context: { winner, detail: message, at: openedAt } } : null,
    written,
  );

  /* confettis tirés une fois par ouverture */
  const papers = useMemo(() => {
    if (!open || defeat) return [];
    return Array.from({ length: 64 }, (_, i) => ({
      left: Math.random() * 100,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      color: i % 9 === 0 && accent ? accent : PAPER[i % PAPER.length],
      dur: 3.2 + Math.random() * 2.6,
      delay: Math.random() * 1.4,
      drift: (Math.random() - 0.5) * 140,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
      round: Math.random() < 0.18,
    }));
  }, [open, accent, defeat]);

  useEffect(() => {
    if (!open) return;
    btnRef.current && btnRef.current.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const heading = title || (defeat ? t.defeatTitle : winner ? t.winnerTitle(winner) : t.title);

  return (
    <div style={S.back} className="beau-cel-back" onClick={onClose}>
      <style>{CSS}</style>
      <div style={S.papers} aria-hidden="true">
        {papers.map((p, i) => (
          <span key={i} className="beau-cel-paper" style={{
            left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.h, background: p.color,
            borderRadius: p.round ? "50%" : 1,
            "--dur": `${p.dur}s`, "--delay": `${p.delay}s`, "--drift": `${p.drift}px`, "--spin": `${p.spin}deg`,
          }} />
        ))}
      </div>
      <div role="dialog" aria-modal="true" aria-labelledby="beau-cel-title" className="beau-cel-card" style={S.card} onClick={(e) => e.stopPropagation()}>
        <Seal accent={accent} defeat={defeat} />
        <div style={S.eyebrow}>{defeat ? t.defeatEyebrow : t.eyebrow}</div>
        <div id="beau-cel-title" style={S.title}>{heading}</div>
        <div style={S.hair} />
        {spoken && (
          <div style={S.voice}><span style={S.voiceMark}>—</span><span style={S.voiceText}>{spoken}</span></div>
        )}
        {variant === "wagerLost" && message && <div style={S.detail}>{message}</div>}
        <div style={S.actions}>
          {onReplay && <button ref={btnRef} onClick={onReplay} style={S.primary}>{replayLabel || (variant === "defeat" ? t.revenge : t.replay)}</button>}
          <button ref={onReplay ? undefined : btnRef} onClick={onClose} style={S.ghost}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}

const sans = "ui-sans-serif, system-ui, sans-serif";
const S = {
  back: { position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(241,234,221,0.72)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", animation: "beauCelFade .3s ease both", fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink },
  papers: { position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" },
  card: { position: "relative", width: "min(92vw, 380px)", textAlign: "center", background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "28px 26px 24px", boxShadow: "0 34px 70px -30px rgba(32,30,25,0.55), 0 1px 0 rgba(255,255,255,0.7) inset", animation: "beauCelRise .45s cubic-bezier(.2,.8,.3,1) .05s both" },
  seal: { display: "block", margin: "0 auto 6px", animation: "beauCelSeal .7s cubic-bezier(.3,1.4,.5,1) .2s both" },
  eyebrow: { fontFamily: sans, fontSize: 10, letterSpacing: "0.3em", paddingLeft: "0.3em", color: C.muted, marginTop: 6 },
  title: { fontSize: 38, fontStyle: "italic", lineHeight: 1.05, marginTop: 8 },
  hair: { height: 1, background: C.hair, margin: "16px 0 12px" },
  voice: { display: "flex", gap: 10, alignItems: "baseline", justifyContent: "center", textAlign: "left" },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 18.5, lineHeight: 1.4 },
  detail: { marginTop: 10, fontStyle: "italic", fontSize: 15, color: C.muted },
  actions: { display: "flex", flexDirection: "column", gap: 8, marginTop: 20 },
  primary: { padding: "13px", border: "none", borderRadius: 3, background: C.terra, color: "#FBF7EF", fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" },
  ghost: { padding: "11px", border: `1px solid ${C.hair}`, borderRadius: 3, background: "transparent", color: C.ink, fontFamily: sans, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" },
};
