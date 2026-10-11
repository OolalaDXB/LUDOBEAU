import React, { useState, useEffect, useCallback } from "react";
import Celebration from "./beau-celebration.jsx";
import { tierOf } from "./souffleur-ai.js";

/* ============================================================
   BEAU · Puissance 4 / Connect Four
   Bilingue (FR/EN) via la prop `lang`.
   À deux (passe-passe) ou contre le Souffleur. 7 × 6.
   ============================================================ */

const C = {
  bg: "#F1EADD",
  frame: "#DCD0B8", frameEdge: "#CDBE9F",
  board: "#D9CCB0",          // panneau du plateau
  hole: "#F3EDDE",           // alvéole vide
  ink: "#201E19",
  terra: "#A8553B",          // joueur 1 / vous
  petrol: "#4E6E78",         // joueur 2 / Souffleur
  hair: "rgba(32,30,25,0.14)", muted: "#6B6557", panel: "#FBF6EA",
};
const ROWS = 6, COLS = 7;
const COLOR = { 1: C.terra, 2: C.petrol };
const ORDER = [3, 2, 4, 1, 5, 0, 6];

const STR = {
  fr: {
    eyebrow: "LE SOUFFLEUR · PUISSANCE 4",
    names: { 1: "Terre", 2: "Pétrole" },
    you: "Toi", prompter: "Souffleur", duo: "À deux",
    gentle: "Doux", cunning: "Malin", again: "Rejouer",
    column: (n) => `colonne ${n}`,
    start: "À toi de jouer. Aligne-en quatre !",
    youWin: "Quatre alignés. Bravo, tu gagnes !",
    aiWin: "Quatre alignés. Le Souffleur l'emporte cette fois.",
    duoWin: (n) => `Quatre alignés. ${n} gagne !`,
    draw: "Plateau plein, personne ne gagne. On rejoue ?",
    yourTurn: "À toi.", thinking: "Le Souffleur réfléchit…",
    turnOf: (n) => `Au tour de ${n}.`,
    youStart: "À toi de commencer.", aiStart: "Le Souffleur commence…",
    starts: (n) => `${n} commence.`,
    soloIntro: "À toi de jouer contre le Souffleur.",
    duoIntro: "À deux : Terre commence.",
  },
  en: {
    eyebrow: "THE PROMPTER · CONNECT FOUR",
    names: { 1: "Terra", 2: "Petrol" },
    you: "You", prompter: "Prompter", duo: "Two players",
    gentle: "Gentle", cunning: "Cunning", again: "Play again",
    column: (n) => `column ${n}`,
    start: "Your move. Line up four!",
    youWin: "Four in a row. Well played, you win!",
    aiWin: "Four in a row. The Prompter takes this one.",
    duoWin: (n) => `Four in a row. ${n} wins!`,
    draw: "The board is full, no one wins. Another round?",
    yourTurn: "Your move.", thinking: "The Prompter is thinking…",
    turnOf: (n) => `${n} to play.`,
    youStart: "You begin.", aiStart: "The Prompter begins…",
    starts: (n) => `${n} begins.`,
    soloIntro: "Your move, against the Prompter.",
    duoIntro: "Two players: Terra begins.",
  },
};

/* ---------- Moteur ---------- */
const empty = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const dropRow = (g, c) => { for (let r = ROWS - 1; r >= 0; r--) if (g[r][c] === 0) return r; return -1; };
const cloneG = (g) => g.map((row) => row.slice());
const full = (g) => g[0].every((v) => v !== 0);

function lineFrom(g, r, c, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

/* ---------- IA ---------- */
function evaluate(g, ai) {
  const opp = ai === 1 ? 2 : 1;
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (g[r][3] === ai) score += 3;
  const windows = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 3 < COLS) windows.push([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
    if (r + 3 < ROWS) windows.push([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
    if (r + 3 < ROWS && c + 3 < COLS) windows.push([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
    if (r + 3 < ROWS && c - 3 >= 0) windows.push([[r,c],[r+1,c-1],[r+2,c-2],[r+3,c-3]]);
  }
  for (const w of windows) {
    let a = 0, o = 0;
    for (const [r, c] of w) { if (g[r][c] === ai) a++; else if (g[r][c] === opp) o++; }
    if (a && o) continue;
    if (a === 3) score += 100; else if (a === 2) score += 10; else if (a === 1) score += 1;
    if (o === 3) score -= 120; else if (o === 2) score -= 10;
  }
  return score;
}
// score du point de vue du joueur courant (négamax + alpha-bêta)
function negamaxScore(g, depth, alpha, beta, player, ai) {
  if (full(g)) return 0;
  const moves = ORDER.filter((c) => g[0][c] === 0);
  if (depth === 0) {
    const e = evaluate(g, ai);
    return player === ai ? e : -e;
  }
  let best = -Infinity;
  for (const c of moves) {
    const r = dropRow(g, c);
    g[r][c] = player;
    const win = lineFrom(g, r, c, player);
    let val;
    if (win) val = 100000 + depth;
    else val = -negamaxScore(g, depth - 1, -beta, -alpha, player === 1 ? 2 : 1, ai);
    g[r][c] = 0;
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function bestMove(grid, ai, depth) {
  const g = cloneG(grid);
  const moves = ORDER.filter((c) => g[0][c] === 0);
  // 1) gagner tout de suite ; 2) bloquer la menace adverse
  for (const c of moves) { const r = dropRow(g, c); g[r][c] = ai; const w = lineFrom(g, r, c, ai); g[r][c] = 0; if (w) return c; }
  const opp = ai === 1 ? 2 : 1;
  for (const c of moves) { const r = dropRow(g, c); g[r][c] = opp; const w = lineFrom(g, r, c, opp); g[r][c] = 0; if (w) return c; }
  let best = moves[0], bestVal = -Infinity;
  for (const c of moves) {
    const r = dropRow(g, c);
    g[r][c] = ai;
    const win = lineFrom(g, r, c, ai);
    const val = win ? 1e9 : -negamaxScore(g, depth - 1, -Infinity, Infinity, opp, ai);
    g[r][c] = 0;
    if (val > bestVal) { bestVal = val; best = c; }
  }
  return best;
}

/* ============================================================ */
export default function BeauPuissance4({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const [grid, setGrid] = useState(empty);
  const [turn, setTurn] = useState(1);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState(0);
  const [cele, setCele] = useState(null);
  useEffect(() => { if (!over) setCele(null); }, [over]);
  const [winCells, setWinCells] = useState([]);
  const [mode, setMode] = useState("solo");     // solo | duo
  const [level, setLevel] = useState("doux");   // doux | malin
  const [starter, setStarter] = useState(1);
  const [score, setScore] = useState({ 1: 0, 2: 0 });
  const [thinking, setThinking] = useState(false);
  const [hover, setHover] = useState(null);
  const [line, setLine] = useState(t.start);

  const isWin = (r, c) => winCells.some(([wr, wc]) => wr === r && wc === c);

  const place = useCallback((g, c, p) => {
    const r = dropRow(g, c);
    if (r < 0) return null;
    const ng = cloneG(g);
    ng[r][c] = p;
    const wl = lineFrom(ng, r, c, p);
    return { ng, r, c, wl };
  }, []);

  const finish = (ng, p, wl) => {
    setGrid(ng);
    if (wl) {
      setOver(true); setWinner(p); setWinCells(wl);
      setScore((s) => ({ ...s, [p]: s[p] + 1 }));
      if (mode === "duo") setCele({ winner: t.names[p], accent: COLOR[p] });
      else setCele(p === 1 ? { accent: COLOR[1] } : { defeat: true });
      setLine(mode === "solo" ? (p === 1 ? t.youWin : t.aiWin) : t.duoWin(t.names[p]));
    } else if (full(ng)) {
      setOver(true); setWinner(0); setLine(t.draw);
    } else {
      const nx = p === 1 ? 2 : 1;
      setTurn(nx);
      setLine(mode === "solo" ? (nx === 1 ? t.yourTurn : t.thinking) : t.turnOf(t.names[nx]));
    }
  };

  const human = (c) => {
    if (over || thinking) return;
    if (mode === "solo" && turn !== 1) return;
    const res = place(grid, c, turn);
    if (!res) return;
    finish(res.ng, turn, res.wl);
  };

  /* tour du Souffleur */
  useEffect(() => {
    if (mode !== "solo" || over || turn !== 2) return;
    setThinking(true);
    const id = setTimeout(() => {
      let c;
      const moves = ORDER.filter((col) => grid[0][col] === 0);
      if (level === "doux" && Math.random() < 0.35) c = moves[Math.floor(Math.random() * moves.length)];
      else c = bestMove(grid, 2, level === "malin" ? 6 : 3);
      const res = place(grid, c, 2);
      if (res) finish(res.ng, 2, res.wl);
      setThinking(false);
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [turn, over, mode]);

  const newGame = (keepScore = true) => {
    const s = starter === 1 ? 2 : 1;
    setStarter(s);
    setGrid(empty()); setOver(false); setWinner(0); setWinCells([]); setTurn(s); setThinking(false);
    if (!keepScore) setScore({ 1: 0, 2: 0 });
    setLine(mode === "solo" ? (s === 1 ? t.youStart : t.aiStart) : t.starts(t.names[s]));
  };
  const switchMode = (m) => {
    setMode(m); setGrid(empty()); setOver(false); setWinner(0); setWinCells([]); setTurn(1); setStarter(1); setThinking(false); setScore({ 1: 0, 2: 0 });
    setLine(m === "solo" ? t.soloIntro : t.duoIntro);
  };

  const colFull = (c) => grid[0][c] !== 0;

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <Celebration open={!!cele} lang={lang} tier={mode === "solo" ? tierOf(level) : null} game="connect-four" variant={cele && cele.defeat ? "defeat" : "win"} winner={cele && cele.winner} accent={cele && cele.accent} message={line} onReplay={() => { setCele(null); newGame(true); }} onClose={() => setCele(null)} />
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.eyebrow}>{t.eyebrow}</div>
          <div style={S.hairline} />
        </header>

        {/* score */}
        <div style={S.scoreRow}>
          <div style={{ ...S.scoreChip, ...(turn === 1 && !over ? S.scoreActive : {}) }}>
            <span style={{ ...S.sdot, background: C.terra }} />
            <span>{mode === "solo" ? t.you : t.names[1]}</span><b style={S.scoreN}>{score[1]}</b>
          </div>
          <div style={{ ...S.scoreChip, ...(turn === 2 && !over ? S.scoreActive : {}) }}>
            <span style={{ ...S.sdot, background: C.petrol }} />
            <span>{mode === "solo" ? t.prompter : t.names[2]}</span><b style={S.scoreN}>{score[2]}</b>
          </div>
        </div>

        {/* plateau */}
        <div style={S.cabinet}>
          <div style={S.board}>
            {Array.from({ length: COLS }).map((_, c) => (
              <button
                key={c}
                onClick={() => human(c)}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                disabled={over || colFull(c) || (mode === "solo" && turn !== 1) || thinking}
                style={S.col}
                aria-label={t.column(c + 1)}
              >
                {Array.from({ length: ROWS }).map((__, r) => {
                  const v = grid[r][c];
                  const win = isWin(r, c);
                  return (
                    <span key={r} style={S.holeWrap}>
                      <span style={S.hole}>
                        {v !== 0 && (
                          <span style={{ ...S.disc, background: COLOR[v], "--fall": r + 1, ...(win ? S.discWin : {}) }} />
                        )}
                      </span>
                    </span>
                  );
                })}
                {hover === c && !over && !colFull(c) && !(mode === "solo" && turn !== 1) && (
                  <span style={{ ...S.preview, background: COLOR[turn] }} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={S.voice}>
          <span style={S.voiceMark}>—</span>
          <span style={{ ...S.voiceText }} className={thinking ? "pulse" : ""}>{line}</span>
        </div>

        <footer style={S.foot}>
          <div style={S.toggle}>
            <button onClick={() => switchMode("solo")} style={{ ...S.tBtn, ...(mode === "solo" ? S.tOn : {}) }}>{t.prompter}</button>
            <button onClick={() => switchMode("duo")} style={{ ...S.tBtn, ...(mode === "duo" ? S.tOn : {}) }}>{t.duo}</button>
          </div>
          {mode === "solo" && (
            <div style={S.toggle}>
              <button onClick={() => setLevel("doux")} style={{ ...S.tBtn, ...(level === "doux" ? S.tOn : {}) }}>{t.gentle}</button>
              <button onClick={() => setLevel("malin")} style={{ ...S.tBtn, ...(level === "malin" ? S.tOn : {}) }}>{t.cunning}</button>
            </div>
          )}
          <button onClick={() => newGame(true)} style={S.solid}>{t.again}</button>
        </footer>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
button { font-family: inherit; }
.pulse { animation: bp 1.5s ease-in-out infinite; }
@keyframes bp { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes drop { 0% { transform: translateY(calc(var(--fall) * -112%)); } 60% { transform: translateY(0); } 75% { transform: translateY(-7%); } 100% { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce){ @keyframes drop { from,to { transform:none } } }
`;

const S = {
  page: { minHeight: "100vh", background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 14px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink },
  shell: { width: "min(94vw, 460px)" },
  head: { textAlign: "center", marginBottom: 12 },
  brand: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.42em", paddingLeft: "0.42em" },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.26em", color: C.muted, marginTop: 7, paddingLeft: "0.26em" },
  hairline: { height: 1, background: C.hair, margin: "13px auto 0", width: "100%" },

  scoreRow: { display: "flex", gap: 8, marginBottom: 10 },
  scoreChip: { flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 3, fontSize: 16 },
  scoreActive: { boxShadow: `inset 0 0 0 2px ${C.frameEdge}` },
  sdot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  scoreN: { marginLeft: "auto", fontSize: 20, fontStyle: "italic" },

  cabinet: { padding: 12, background: `linear-gradient(150deg, #E6DBC5 0%, ${C.frame} 55%, ${C.frameEdge} 100%)`, borderRadius: 6, border: `1px solid ${C.frameEdge}`, boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset, 0 30px 56px -34px rgba(32,30,25,0.55)" },
  board: { display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 0, background: C.board, borderRadius: 5, padding: 7, boxShadow: "inset 0 2px 8px rgba(32,30,25,0.22)" },
  col: { position: "relative", border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, WebkitTapHighlightColor: "transparent" },
  holeWrap: { width: "100%", aspectRatio: "1 / 1", padding: "7%", display: "flex", alignItems: "center", justifyContent: "center" },
  hole: { width: "100%", height: "100%", borderRadius: "50%", background: C.hole, boxShadow: "inset 0 2px 4px rgba(32,30,25,0.28)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  disc: { width: "100%", height: "100%", borderRadius: "50%", animation: "drop 0.45s cubic-bezier(.34,1.2,.64,1) both", boxShadow: "inset 0 2px 3px rgba(255,255,255,0.25), inset 0 -3px 4px rgba(0,0,0,0.18)" },
  discWin: { boxShadow: `0 0 0 3px ${C.panel}, 0 0 0 5px rgba(32,30,25,0.35), inset 0 2px 3px rgba(255,255,255,0.3)` },
  preview: { position: "absolute", top: "1%", left: "50%", transform: "translateX(-50%)", width: "70%", aspectRatio: "1/1", borderRadius: "50%", opacity: 0.35, pointerEvents: "none" },

  voice: { marginTop: 13, display: "flex", gap: 10, alignItems: "baseline", padding: "13px 2px 4px", borderTop: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 19, lineHeight: 1.35, color: C.ink },

  foot: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  toggle: { display: "flex", border: `1px solid ${C.hair}`, borderRadius: 2, overflow: "hidden" },
  tBtn: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 12px", border: "none", background: "transparent", color: C.muted, cursor: "pointer" },
  tOn: { background: C.ink, color: C.bg },
  solid: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 16px", border: "none", background: C.terra, color: "#FBF7EF", cursor: "pointer", borderRadius: 2 },
};
