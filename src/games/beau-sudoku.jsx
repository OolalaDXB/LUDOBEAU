import React, { useState, useEffect, useCallback, useRef } from "react";
import Celebration from "./beau-celebration.jsx";

/* ============================================================
   BEAU · Sudoku
   Bilingue (FR/EN) via la prop `lang`.
   Génération à solution unique, mode notes, surlignage des
   pairs et des conflits, trois niveaux, voix du Souffleur.
   ============================================================ */

const C = {
  bg: "#F1EADD",
  frame: "#DCD0B8",
  frameEdge: "#CDBE9F",
  cell: "#F3ECDB",
  boxTint: "rgba(149,168,161,0.16)",   // pétrole très pâle
  ink: "#201E19",
  terra: "#A8553B",
  red: "#B8473A",
  hair: "rgba(32,30,25,0.16)",
  line: "rgba(32,30,25,0.55)",
  muted: "#6B6557",
  sel: "rgba(168,85,59,0.18)",
  peer: "rgba(32,30,25,0.055)",
  same: "rgba(168,85,59,0.10)",
};

const LEVELS = { doux: 44, pose: 34, vif: 28 };

const STR = {
  fr: {
    eyebrow: "LE SOUFFLEUR · SUDOKU",
    intro: "Neuf chiffres, neuf certitudes par ligne. À vous de les ranger.",
    drawing: "Le Souffleur trace la grille…",
    solved: "Grille close. Tout est exactement à sa place.",
    slip: "Un doublon se glisse : quelque part, deux fois le même.",
    hintLine: "Je vous en pose un. Le reste vous appartient.",
    notes: "Notes", erase: "Effacer", hint: "Indice",
    doux: "Doux", pose: "Posé", vif: "Vif",
    newGrid: "Nouvelle grille",
  },
  en: {
    eyebrow: "THE PROMPTER · SUDOKU",
    intro: "Nine digits, nine certainties to a row. Yours to put in order.",
    drawing: "The Prompter is drawing the grid…",
    solved: "Grid complete. Everything sits exactly in its place.",
    slip: "A duplicate has slipped in: somewhere, the same digit twice.",
    hintLine: "I'll place one for you. The rest is yours.",
    notes: "Notes", erase: "Erase", hint: "Hint",
    doux: "Gentle", pose: "Steady", vif: "Brisk",
    newGrid: "New grid",
  },
};

/* ---------- Générateur ---------- */
const rc = (i) => [Math.floor(i / 9), i % 9];
function valid(g, idx, v) {
  const [r, c] = rc(idx);
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === v) return false;
    if (g[k * 9 + c] === v) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[(br + i) * 9 + (bc + j)] === v) return false;
  return true;
}
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function fillGrid(g) {
  const idx = g.indexOf(0);
  if (idx === -1) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (valid(g, idx, v)) { g[idx] = v; if (fillGrid(g)) return true; g[idx] = 0; }
  }
  return false;
}
function countSolutions(grid, limit) {
  const g = grid.slice();
  let count = 0;
  (function bt() {
    if (count >= limit) return;
    const idx = g.indexOf(0);
    if (idx === -1) { count++; return; }
    for (let v = 1; v <= 9; v++) {
      if (valid(g, idx, v)) { g[idx] = v; bt(); g[idx] = 0; if (count >= limit) return; }
    }
  })();
  return count;
}
function generate(clues) {
  const full = Array(81).fill(0);
  fillGrid(full);
  const puzzle = full.slice();
  const order = shuffle([...Array(81).keys()]);
  let givens = 81;
  for (const idx of order) {
    if (givens <= clues) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[idx] = backup;
    else givens--;
  }
  return { puzzle, solution: full };
}

/* ============================================================ */
export default function BeauSudoku({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [cells, setCells] = useState(Array(81).fill(0));
  const [notes, setNotes] = useState(Array(81).fill(null).map(() => []));
  const [selected, setSelected] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [level, setLevel] = useState("doux");
  const [loading, setLoading] = useState(true);
  const [won, setWon] = useState(false);
  const [cele, setCele] = useState(false);
  const [line, setLine] = useState(t.intro);
  const boardRef = useRef(null);

  const newGame = useCallback((lvl) => {
    setLoading(true); setWon(false); setCele(false); setSelected(null);
    setLine(t.drawing);
    setTimeout(() => {
      const { puzzle: pz, solution: sol } = generate(LEVELS[lvl]);
      setPuzzle(pz); setSolution(sol);
      setCells(pz.slice());
      setNotes(Array(81).fill(null).map(() => []));
      setLoading(false);
      setLine(t.intro);
    }, 30);
  }, []);

  useEffect(() => { newGame(level); /* eslint-disable-next-line */ }, []);

  const given = (i) => puzzle && puzzle[i] !== 0;

  // conflits : indices dont la valeur se répète dans la ligne/colonne/bloc
  const conflicts = (() => {
    const set = new Set();
    if (!cells) return set;
    for (let i = 0; i < 81; i++) {
      const v = cells[i]; if (!v) continue;
      const [r, c] = rc(i);
      for (let k = 0; k < 9; k++) {
        const ri = r * 9 + k, ci = k * 9 + c;
        if (ri !== i && cells[ri] === v) { set.add(i); set.add(ri); }
        if (ci !== i && cells[ci] === v) { set.add(i); set.add(ci); }
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        const j = (br + a) * 9 + (bc + b);
        if (j !== i && cells[j] === v) { set.add(i); set.add(j); }
      }
    }
    return set;
  })();

  const checkWin = useCallback((next) => {
    if (!solution) return;
    for (let i = 0; i < 81; i++) if (next[i] !== solution[i]) return;
    setWon(true); setLine(t.solved); setCele(true);
  }, [solution]);

  const place = useCallback((v) => {
    if (selected == null || given(selected) || won) return;
    if (notesMode && v !== 0) {
      setNotes((prev) => {
        const n = prev.map((x) => x.slice());
        const arr = n[selected];
        const k = arr.indexOf(v);
        if (k >= 0) arr.splice(k, 1); else arr.push(v);
        return n;
      });
      setCells((prev) => { const c = prev.slice(); c[selected] = 0; return c; });
      return;
    }
    setCells((prev) => {
      const c = prev.slice(); c[selected] = v; return c;
    });
    setNotes((prev) => { const n = prev.map((x) => x.slice()); n[selected] = []; return n; });
    if (v !== 0) {
      const next = cells.slice(); next[selected] = v;
      if (solution && v !== solution[selected]) setLine(t.slip);
      else { checkWin(next); }
    }
    // eslint-disable-next-line
  }, [selected, notesMode, won, cells, solution, puzzle, checkWin]);

  const hint = () => {
    if (won || !solution) return;
    let idx = selected;
    if (idx == null || given(idx) || cells[idx] === solution[idx]) {
      const empties = [];
      for (let i = 0; i < 81; i++) if (!given(i) && cells[i] !== solution[i]) empties.push(i);
      if (empties.length === 0) return;
      idx = empties[Math.floor(Math.random() * empties.length)];
    }
    setSelected(idx);
    setCells((prev) => { const c = prev.slice(); c[idx] = solution[idx]; return c; });
    setNotes((prev) => { const n = prev.map((x) => x.slice()); n[idx] = []; return n; });
    setLine(t.hintLine);
    const next = cells.slice(); next[idx] = solution[idx]; checkWin(next);
  };

  // clavier
  useEffect(() => {
    const onKey = (e) => {
      if (selected == null) return;
      if (e.key >= "1" && e.key <= "9") { place(parseInt(e.key, 10)); e.preventDefault(); }
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { place(0); e.preventDefault(); }
      else if (e.key.startsWith("Arrow")) {
        let [r, c] = rc(selected);
        if (e.key === "ArrowUp") r = (r + 8) % 9;
        if (e.key === "ArrowDown") r = (r + 1) % 9;
        if (e.key === "ArrowLeft") c = (c + 8) % 9;
        if (e.key === "ArrowRight") c = (c + 1) % 9;
        setSelected(r * 9 + c); e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, place]);

  // décompte par chiffre (pour griser ceux placés 9 fois)
  const counts = Array(10).fill(0);
  for (const v of cells) if (v) counts[v]++;

  const selVal = selected != null ? cells[selected] : 0;
  const selRC = selected != null ? rc(selected) : null;
  const isPeer = (i) => {
    if (!selRC) return false;
    const [r, c] = rc(i), [sr, sc] = selRC;
    return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
  };

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <Celebration open={cele} lang={lang} game="sudoku" message={t.solved} onReplay={() => { setCele(false); newGame(level); }} onClose={() => setCele(false)} />
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.eyebrow}>{t.eyebrow}</div>
          <div style={S.hairline} />
        </header>

        <div style={S.cabinet}>
          <div style={S.boardWrap} ref={boardRef}>
            {loading && <div style={S.loading}>{t.drawing}</div>}
            <div style={{ ...S.grid, opacity: loading ? 0.25 : 1 }}>
              {cells.map((v, i) => {
                const [r, c] = rc(i);
                const box = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0;
                const isSel = selected === i;
                const sameNum = selVal && v === selVal && !isSel;
                const conflict = conflicts.has(i);
                let bg = box ? C.boxTint : "transparent";
                if (isPeer(i) && !isSel) bg = C.peer;
                if (sameNum) bg = C.same;
                if (isSel) bg = C.sel;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    style={{
                      ...S.cell,
                      background: bg,
                      borderRight: c < 8 ? (c % 3 === 2 ? `2px solid ${C.line}` : `1px solid ${C.hair}`) : "none",
                      borderBottom: r < 8 ? (r % 3 === 2 ? `2px solid ${C.line}` : `1px solid ${C.hair}`) : "none",
                      boxShadow: isSel ? `inset 0 0 0 2px ${C.terra}` : "none",
                    }}
                  >
                    {v !== 0 ? (
                      <span style={{
                        ...S.num,
                        color: conflict ? C.red : given(i) ? C.ink : C.terra,
                        fontWeight: given(i) ? 600 : 500,
                      }}>{v}</span>
                    ) : (
                      notes[i] && notes[i].length > 0 && (
                        <span style={S.notes}>
                          {[1,2,3,4,5,6,7,8,9].map((n) => (
                            <span key={n} style={{ ...S.note, visibility: notes[i].includes(n) ? "visible" : "hidden" }}>{n}</span>
                          ))}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* pavé numérique */}
        <div style={S.pad}>
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} onClick={() => place(n)} disabled={counts[n] >= 9}
              style={{ ...S.padBtn, opacity: counts[n] >= 9 ? 0.3 : 1 }}>{n}</button>
          ))}
        </div>

        <div style={S.actions}>
          <button onClick={() => setNotesMode((m) => !m)} style={{ ...S.action, ...(notesMode ? S.actionOn : {}) }}>
            {t.notes}{notesMode ? " ·" : ""}
          </button>
          <button onClick={() => place(0)} style={S.action}>{t.erase}</button>
          <button onClick={hint} style={S.action}>{t.hint}</button>
        </div>

        <div style={S.voice}>
          <span style={S.voiceMark}>—</span>
          <span style={S.voiceText}>{line}</span>
        </div>

        <footer style={S.foot}>
          <div style={S.toggle}>
            <button onClick={() => { setLevel("doux"); newGame("doux"); }} style={{ ...S.toggleBtn, ...(level==="doux"?S.toggleOn:{}) }}>{t.doux}</button>
            <button onClick={() => { setLevel("pose"); newGame("pose"); }} style={{ ...S.toggleBtn, ...(level==="pose"?S.toggleOn:{}) }}>{t.pose}</button>
            <button onClick={() => { setLevel("vif"); newGame("vif"); }} style={{ ...S.toggleBtn, ...(level==="vif"?S.toggleOn:{}) }}>{t.vif}</button>
          </div>
          <button onClick={() => newGame(level)} style={S.solid}>{t.newGrid}</button>
        </footer>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
button { font-family: inherit; }
.sd:focus-visible { outline: 2px solid ${C.terra}; outline-offset: -2px; }
`;

const S = {
  page: {
    minHeight: "100vh",
    background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "28px 14px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink,
  },
  shell: { width: "min(94vw, 470px)" },
  head: { textAlign: "center", marginBottom: 14 },
  brand: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.42em", paddingLeft: "0.42em" },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.28em", color: C.muted, marginTop: 7, paddingLeft: "0.28em" },
  hairline: { height: 1, background: C.hair, margin: "14px auto 0", width: "100%" },

  cabinet: {
    padding: 11,
    background: `linear-gradient(150deg, #E6DBC5 0%, ${C.frame} 55%, ${C.frameEdge} 100%)`,
    borderRadius: 5, border: `1px solid ${C.frameEdge}`,
    boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset, 0 30px 56px -34px rgba(32,30,25,0.55)",
  },
  boardWrap: { position: "relative", background: C.cell, border: `2px solid ${C.line}`, borderRadius: 2, overflow: "hidden" },
  loading: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    fontStyle: "italic", fontSize: 17, color: C.muted, zIndex: 5,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(9, 1fr)", aspectRatio: "1 / 1", width: "100%" },
  cell: {
    position: "relative", border: "none", padding: 0, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", background: "transparent",
    WebkitTapHighlightColor: "transparent",
  },
  num: { fontSize: "min(6.4vw, 27px)", lineHeight: 1, userSelect: "none" },
  notes: {
    display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)",
    width: "100%", height: "100%", padding: "8%",
  },
  note: { fontSize: "min(2.4vw, 10px)", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },

  pad: { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 5 },
  padBtn: {
    aspectRatio: "1 / 1", border: `1px solid ${C.hair}`, borderRadius: 3, background: "#FBF6EA",
    color: C.ink, fontFamily: "'Cormorant Garamond', serif", fontSize: "min(5.2vw, 22px)", cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
  },

  actions: { marginTop: 9, display: "flex", gap: 8, justifyContent: "center" },
  action: {
    flex: 1, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em",
    textTransform: "uppercase", padding: "10px 8px", border: `1px solid ${C.hair}`, borderRadius: 2,
    background: "transparent", color: C.ink, cursor: "pointer",
  },
  actionOn: { background: C.ink, color: C.bg, borderColor: C.ink },

  voice: { marginTop: 14, display: "flex", gap: 10, alignItems: "baseline", padding: "13px 2px 4px", borderTop: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 18, lineHeight: 1.35, color: C.ink },

  foot: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  toggle: { display: "flex", border: `1px solid ${C.hair}`, borderRadius: 2, overflow: "hidden" },
  toggleBtn: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "7px 11px", border: "none", background: "transparent", color: C.muted, cursor: "pointer" },
  toggleOn: { background: C.ink, color: C.bg },
  solid: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "9px 16px", border: "none", background: C.terra, color: "#FBF7EF", cursor: "pointer", borderRadius: 2 },
};
