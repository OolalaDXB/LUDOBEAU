import React, { useState, useEffect, useRef, useCallback } from "react";
import Celebration from "./beau-celebration.jsx";

/* ============================================================
   BEAU · Le Souffleur / The Prompter · Tawla (backgammon)
   Bilingue (FR/EN) via la prop `lang`.
   Vous = ivoire · le Souffleur = encre.
   Dés, doubles, prises (barre + rentrée), sortie des pions,
   IA pour le Souffleur, voix éditoriale.
   Index 0..23 = points 1..24.
   Vous (blanc) : 24→1, sortie en bas-droite (idx 0..5).
   Souffleur (encre) : 1→24, sortie en haut-droite (idx 18..23).
   ============================================================ */

const C = {
  bg: "#F1EADD",
  frame: "#DCD0B8",
  frameEdge: "#CDBE9F",
  inlay: "#B07A4E",
  triA: "#ECE3D0",        // triangle clair
  triB: "#95A8A1",        // triangle pétrole
  felt: "#E4DAC4",        // fond du plateau
  ink: "#201E19",         // Souffleur
  bone: "#F5EEDC",        // vous
  terra: "#A8553B",       // accent
  hair: "rgba(32,30,25,0.14)",
  muted: "#6B6557",
  ok: "rgba(168,85,59,0.55)",
};

const STR = {
  fr: {
    eyebrow: "LE SOUFFLEUR · TAWLA",
    lineOpen: "À vous d'ouvrir. Lancez les dés.",
    statusOpen: "À vous · lancez",
    statusWinW: "Tout est sorti · vous gagnez",
    lineWinW: "Tout est sorti. La partie est à vous.",
    statusWinB: "Tout est sorti · le Souffleur gagne",
    lineWinB: "Tout est sorti. À moi, cette fois.",
    statusNoMove: "Aucun coup possible",
    lineNoMove: "Rien à jouer : les portes sont fermées.",
    statusYourMove: "À vous de jouer",
    lineBearW: "Un pion sort. La sortie est une discipline.",
    lineHitW: "Vous me touchez : mon pion file à la barre.",
    statusAiRoll: "Le Souffleur lance les dés",
    lineBearB: "Je sors un pion. Méthodique.",
    lineHitB: "Je vous touche : votre pion repart de la barre.",
    rollDoubleW: (n) => `Double ${n}. Quatre fois le même pas.`,
    rollDoubleB: (n) => `Double ${n} pour moi. Le sort est généreux.`,
    rollW: (a, b) => `${a} et ${b}. À vous de tracer.`,
    rollB: (a, b) => `Je tire ${a} et ${b}.`,
    trayB: (n) => `Le Souffleur · sortis : ${n}/15`,
    trayW: (n) => `Vous · sortis : ${n}/15`,
    ariaPoint: (n) => `point ${n}`,
    ariaBar: "barre",
    ariaOff: "sortie",
    roll: "Lancer les dés",
    rulesBtn: "Règles",
    newGame: "Nouvelle partie",
    rulesTitle: "Le tawla en bref",
    rulesIntro: "C'est une course : sortir vos 15 pions ivoire avant le Souffleur.",
    rulesItems: [
      <>• Lancez les deux dés : chaque dé déplace un pion d'autant de cases. Un <i>double</i> donne quatre déplacements.</>,
      <>• Vos pions avancent toujours vers votre coin de sortie (en bas à droite) ; ceux du Souffleur vont à l'opposé.</>,
      <>• On peut poser un pion sur une case vide, sur une des siennes, ou sur une case où l'adversaire n'a qu'<i>un seul</i> pion. On le « touche » : il file à la barre, au centre.</>,
      <>• Un pion à la barre doit <i>rentrer</i> sur le plateau adverse avant tout autre coup.</>,
      <>• Quand vos 15 pions sont dans votre quart « maison » (les 6 derniers triangles), vous pouvez les <i>sortir</i> : touchez le bac de droite.</>,
      <>• Le premier à tout sortir gagne.</>,
    ],
    rulesHow: <>Pour jouer : <i>Lancer les dés</i> → touchez un pion → les cases possibles s'entourent → touchez la case (ou le bac de sortie).</>,
  },
  en: {
    eyebrow: "THE PROMPTER · TAWLA",
    lineOpen: "Yours to open. Roll the dice.",
    statusOpen: "Your turn · roll",
    statusWinW: "All borne off · you win",
    lineWinW: "Every checker is off. The game is yours.",
    statusWinB: "All borne off · the Prompter wins",
    lineWinB: "Every checker is off. Mine, this time.",
    statusNoMove: "No legal move",
    lineNoMove: "Nothing to play: the doors are shut.",
    statusYourMove: "Your move",
    lineBearW: "A checker comes off. Bearing off is a discipline.",
    lineHitW: "You hit me: my checker goes to the bar.",
    statusAiRoll: "The Prompter rolls",
    lineBearB: "I bear one off. Methodical.",
    lineHitB: "I hit you: your checker starts again from the bar.",
    rollDoubleW: (n) => `Double ${n}s. The same step, four times.`,
    rollDoubleB: (n) => `Double ${n}s for me. Fortune is generous.`,
    rollW: (a, b) => `${a} and ${b}. Yours to trace.`,
    rollB: (a, b) => `I roll ${a} and ${b}.`,
    trayB: (n) => `The Prompter · off: ${n}/15`,
    trayW: (n) => `You · off: ${n}/15`,
    ariaPoint: (n) => `point ${n}`,
    ariaBar: "bar",
    ariaOff: "bear off",
    roll: "Roll the dice",
    rulesBtn: "Rules",
    newGame: "New game",
    rulesTitle: "Tawla in brief",
    rulesIntro: "It's a race: bear off your 15 ivory checkers before the Prompter.",
    rulesItems: [
      <>• Roll both dice: each die moves one checker that many points. <i>Doubles</i> give four moves.</>,
      <>• Your checkers always travel towards your bear-off corner (bottom right); the Prompter's go the other way.</>,
      <>• You may land on an empty point, on one of your own, or on a point where the opponent has <i>a single</i> checker, a blot. You “hit” it: it goes to the bar, in the centre.</>,
      <>• A checker on the bar must <i>re-enter</i> in the opponent's home board before any other move.</>,
      <>• Once all 15 of your checkers are in your home board (the last 6 points), you may <i>bear them off</i>: tap the tray on the right.</>,
      <>• The first to bear off every checker wins.</>,
    ],
    rulesHow: <>To play: <i>Roll the dice</i> → tap a checker → the possible points are ringed → tap the point (or the bear-off tray).</>,
  },
};

/* ---------- État initial ---------- */
function initialGame() {
  const board = Array(24).fill(0); // + = vous (blanc), - = Souffleur (encre)
  board[23] = 2;  board[12] = 5;  board[7] = 3;  board[5] = 5;     // blanc
  board[0] = -2;  board[11] = -5; board[16] = -3; board[18] = -5;  // encre
  return { board, bar: { w: 0, b: 0 }, off: { w: 0, b: 0 } };
}
const clone = (g) => ({ board: g.board.slice(), bar: { ...g.bar }, off: { ...g.off } });

/* ---------- Règles ---------- */
const entryIdx = (color, die) => (color === "w" ? 24 - die : die - 1);
const canLand = (g, color, idx) => (color === "w" ? g.board[idx] >= -1 : g.board[idx] <= 1);

function allHome(g, color) {
  if (color === "w") {
    if (g.bar.w > 0) return false;
    for (let i = 6; i < 24; i++) if (g.board[i] > 0) return false;
    return true;
  } else {
    if (g.bar.b > 0) return false;
    for (let i = 0; i < 18; i++) if (g.board[i] < 0) return false;
    return true;
  }
}
const highestWhite = (g) => { for (let i = 23; i >= 0; i--) if (g.board[i] > 0) return i; return -1; };
const lowestBlack  = (g) => { for (let i = 0; i < 24; i++) if (g.board[i] < 0) return i; return -1; };

// Coup unique pour un pion depuis `from` (idx ou 'bar') avec le dé `die`
function singleMove(g, color, from, die) {
  if (from === "bar") {
    const to = entryIdx(color, die);
    if (canLand(g, color, to)) return { type: "enter", from, to, die };
    return null;
  }
  if (color === "w") {
    const t = from - die;
    if (t >= 0) { if (canLand(g, "w", t)) return { type: "move", from, to: t, die }; return null; }
    if (!allHome(g, "w")) return null;
    if (t === -1) return { type: "bear", from, to: -1, die };
    if (highestWhite(g) === from) return { type: "bear", from, to: -1, die }; // surpassement
    return null;
  } else {
    const t = from + die;
    if (t <= 23) { if (canLand(g, "b", t)) return { type: "move", from, to: t, die }; return null; }
    if (!allHome(g, "b")) return null;
    if (t === 24) return { type: "bear", from, to: 24, die };
    if (lowestBlack(g) === from) return { type: "bear", from, to: 24, die };
    return null;
  }
}

function allLegalMoves(g, color, dice) {
  const seen = new Set();
  const dset = [...new Set(dice)];
  const moves = [];
  const push = (from) => {
    for (const die of dset) {
      const m = singleMove(g, color, from, die);
      if (m) { const k = `${from}>${m.to}:${die}`; if (!seen.has(k)) { seen.add(k); moves.push(m); } }
    }
  };
  if ((color === "w" ? g.bar.w : g.bar.b) > 0) { push("bar"); return moves; }
  for (let i = 0; i < 24; i++) if (color === "w" ? g.board[i] > 0 : g.board[i] < 0) push(i);
  return moves;
}

function applyMove(g, color, m) {
  const ng = clone(g);
  const sign = color === "w" ? 1 : -1;
  if (m.from === "bar") ng.bar[color] -= 1;
  else ng.board[m.from] -= sign;
  let hit = false;
  if (m.type === "bear") {
    ng.off[color] += 1;
  } else {
    const to = m.to;
    if (color === "w" && ng.board[to] === -1) { ng.board[to] = 0; ng.bar.b += 1; hit = true; }
    if (color === "b" && ng.board[to] === 1) { ng.board[to] = 0; ng.bar.w += 1; hit = true; }
    ng.board[to] += sign;
  }
  return { game: ng, hit };
}

function rollDice() {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  return a === b ? [a, a, a, a] : [a, b];
}

/* ---------- IA du Souffleur ---------- */
function aiSequence(g, dice) {
  let work = clone(g);
  let left = [...dice];
  const seq = [];
  while (left.length) {
    const legal = allLegalMoves(work, "b", left);
    if (legal.length === 0) break;
    let best = null, bestScore = -Infinity;
    for (const m of legal) {
      let s = 0;
      if (m.from === "bar") s += 200;
      if (m.type === "bear") s += 120;
      const to = m.to;
      if (m.type === "move" || m.type === "enter") {
        if (work.board[to] === 1) s += 70;                 // touche un blot blanc
        if (work.board[to] <= -1) s += 30;                 // consolide un point
        if (work.board[to] === 0) s -= 6;                  // laisse un blot
        s += to * 0.6;                                     // progression vers la sortie
      }
      if (s > bestScore) { bestScore = s; best = m; }
    }
    const { game } = applyMove(work, "b", best);
    work = game;
    seq.push(best);
    const di = left.indexOf(best.die);
    left.splice(di, 1);
  }
  return seq;
}

/* ---------- Voix ---------- */
function rollLine(dice, color, t) {
  if (dice.length === 4) return color === "w" ? t.rollDoubleW(dice[0]) : t.rollDoubleB(dice[0]);
  return color === "w" ? t.rollW(dice[0], dice[1]) : t.rollB(dice[0], dice[1]);
}

/* ============================================================ */
export default function BeauTawla({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const [game, setGame] = useState(initialGame);
  const [turn, setTurn] = useState("w");
  const [dice, setDice] = useState([]);       // dés restants
  const [shown, setShown] = useState([]);     // dés affichés (le tirage)
  const [rolled, setRolled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [targets, setTargets] = useState([]);
  const [line, setLine] = useState(t.lineOpen);
  const [status, setStatus] = useState(t.statusOpen);
  const [over, setOver] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [cele, setCele] = useState(null); /* null | "win" | "defeat" */
  useEffect(() => { if (!over) setCele(null); }, [over]);

  const recomputeTargets = useCallback((g, sel, dl) => {
    if (sel === null) return [];
    const out = [];
    for (const die of [...new Set(dl)]) {
      const m = singleMove(g, "w", sel, die);
      if (m) out.push(m);
    }
    return out;
  }, []);

  const endTurn = useCallback((g) => {
    setSelected(null); setTargets([]);
    if (g.off.w === 15) { setOver(true); setStatus(t.statusWinW); setLine(t.lineWinW); setCele("win"); return; }
    if (g.off.b === 15) { setOver(true); setStatus(t.statusWinB); setLine(t.lineWinB); setCele("defeat"); return; }
    setTurn((t) => (t === "w" ? "b" : "w"));
    setDice([]); setShown([]); setRolled(false);
  }, []);

  /* --- tour du joueur --- */
  const playerRoll = () => {
    if (turn !== "w" || rolled || over) return;
    const d = rollDice();
    setShown(d); setDice(d); setRolled(true);
    setLine(rollLine(d, "w", t));
    const legal = allLegalMoves(game, "w", d);
    if (legal.length === 0) { setStatus(t.statusNoMove); setLine(t.lineNoMove); setTimeout(() => endTurn(game), 900); }
    else setStatus(t.statusYourMove);
  };

  const doPlayerMove = (m) => {
    const { game: ng, hit } = applyMove(game, "w", m);
    const ndice = dice.slice();
    ndice.splice(ndice.indexOf(m.die), 1);
    setGame(ng);
    if (m.type === "bear") setLine(t.lineBearW);
    else if (hit) setLine(t.lineHitW);
    setDice(ndice);
    const legal = allLegalMoves(ng, "w", ndice);
    if (ndice.length === 0 || legal.length === 0) { setTimeout(() => endTurn(ng), 260); }
    else { setSelected(null); setTargets([]); }
  };

  const onPoint = (idx) => {
    if (turn !== "w" || over || !rolled || thinking) return;
    if (game.bar.w > 0 && selected !== "bar") return; // doit rentrer d'abord
    if (selected === null || selected === "bar") {
      if (game.board[idx] > 0) {
        const t = recomputeTargets(game, idx, dice);
        if (t.length) { setSelected(idx); setTargets(t); }
      }
      return;
    }
    const tgt = targets.find((t) => t.to === idx && (t.type === "move" || t.type === "enter"));
    if (tgt) { doPlayerMove(tgt); return; }
    if (game.board[idx] > 0) {
      const t = recomputeTargets(game, idx, dice);
      if (t.length) { setSelected(idx); setTargets(t); } else { setSelected(null); setTargets([]); }
    } else { setSelected(null); setTargets([]); }
  };

  const onBar = () => {
    if (turn !== "w" || over || !rolled || thinking || game.bar.w === 0) return;
    const t = recomputeTargets(game, "bar", dice);
    setSelected("bar"); setTargets(t);
  };

  const onOff = () => {
    if (turn !== "w" || over || !rolled || thinking || selected === null) return;
    const tgt = targets.find((t) => t.type === "bear");
    if (tgt) doPlayerMove(tgt);
  };

  /* --- tour du Souffleur --- */
  useEffect(() => {
    if (turn !== "b" || over) return;
    setThinking(true);
    setStatus(t.statusAiRoll);
    const t0 = setTimeout(() => {
      const d = rollDice();
      setShown(d);
      setLine(rollLine(d, "b", t));
      const seq = aiSequence(game, d);
      if (seq.length === 0) { setTimeout(() => { setThinking(false); endTurn(game); }, 800); return; }
      let work = clone(game);
      let i = 0;
      const step = () => {
        if (i >= seq.length) { setThinking(false); endTurn(work); return; }
        const m = seq[i++];
        const { game: ng, hit } = applyMove(work, "b", m);
        work = ng;
        setGame(ng);
        if (m.type === "bear") setLine(t.lineBearB);
        else if (hit) setLine(t.lineHitB);
        setTimeout(step, 620);
      };
      setTimeout(step, 520);
    }, 560);
    return () => clearTimeout(t0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over]);

  const newGame = () => {
    setGame(initialGame()); setTurn("w"); setDice([]); setShown([]); setRolled(false);
    setSelected(null); setTargets([]); setOver(false); setThinking(false);
    setLine(t.lineOpen); setStatus(t.statusOpen);
  };

  /* ---------- rendu ---------- */
  const isTarget = (idx) => targets.some((t) => t.to === idx && (t.type === "move" || t.type === "enter"));
  const canBear = targets.some((t) => t.type === "bear");

  const Checkers = ({ count, color, dir }) => {
    const n = Math.abs(count);
    if (n === 0) return null;
    const show = Math.min(n, 5);
    const discs = [];
    for (let i = 0; i < show; i++) {
      const last = i === show - 1 && n > 5;
      discs.push(
        <span key={i} style={{ ...S.disc, ...(color === "w" ? S.discW : S.discB) }}>
          {last && <span style={{ ...S.discNum, color: color === "w" ? C.ink : C.bone }}>{n}</span>}
        </span>
      );
    }
    return <span style={{ ...S.stack, flexDirection: dir === "top" ? "column" : "column-reverse" }}>{discs}</span>;
  };

  const Point = ({ idx, pos, colIndex }) => {
    const v = game.board[idx];
    const triLight = colIndex % 2 === 0;
    const sel = selected === idx;
    const tgt = isTarget(idx);
    return (
      <button onClick={() => onPoint(idx)} className="pt" style={S.point} aria-label={t.ariaPoint(idx + 1)}>
        <span style={{
          ...S.tri,
          ...(pos === "top" ? S.triTop : S.triBot),
          background: triLight ? C.triA : C.triB,
          opacity: 0.96,
        }} />
        {tgt && <span style={{ ...S.tgtRing, ...(pos === "top" ? { top: 4 } : { bottom: 4 }) }} />}
        {sel && <span style={S.selWash} />}
        <Checkers count={v} color={v > 0 ? "w" : "b"} dir={pos} />
      </button>
    );
  };

  const Die = ({ n, tone }) => (
    <span style={{ ...S.die, background: tone === "w" ? C.bone : C.ink }}>
      {PIPS[n].map((on, i) => (
        <span key={i} style={{ ...S.pip, background: on ? (tone === "w" ? C.ink : C.bone) : "transparent" }} />
      ))}
    </span>
  );

  const topLeft = [12, 13, 14, 15, 16, 17];
  const topRight = [18, 19, 20, 21, 22, 23];
  const botLeft = [11, 10, 9, 8, 7, 6];
  const botRight = [5, 4, 3, 2, 1, 0];

  const quadrant = (top, bot) => (
    <div style={S.quad}>
      <div style={S.row}>{top.map((idx, i) => <Point key={idx} idx={idx} pos="top" colIndex={i} />)}</div>
      <div style={S.row}>{bot.map((idx, i) => <Point key={idx} idx={idx} pos="bot" colIndex={i} />)}</div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <Celebration open={!!cele} lang={lang} game="tawla" variant={cele || "win"} message={cele === "defeat" ? t.lineWinB : t.lineWinW} onReplay={() => { setCele(null); newGame(); }} onClose={() => setCele(null)} />
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.eyebrow}>{t.eyebrow}</div>
          <div style={S.hairline} />
        </header>

        {/* score sortie */}
        <div style={S.tray}>
          <span style={S.trayLabel}>{t.trayB(game.off.b)}</span>
          <span style={S.trayLabel}>{t.trayW(game.off.w)}</span>
        </div>

        {/* plateau */}
        <div style={S.cabinet}>
          <div style={S.boardInner}>
            {quadrant(topLeft, botLeft)}

            {/* barre centrale */}
            <button onClick={onBar} className="bar" style={S.bar} aria-label={t.ariaBar}>
              <span style={{ ...S.barHalf, justifyContent: "flex-start" }}>
                {Array.from({ length: Math.min(game.bar.b, 4) }).map((_, i) => (
                  <span key={i} style={{ ...S.disc, ...S.discB }} />
                ))}
                {game.bar.b > 4 && <span style={{ ...S.discNum, color: C.bone }}>{game.bar.b}</span>}
              </span>
              <span style={{ ...S.barHalf, justifyContent: "flex-end" }}>
                {game.bar.w > 4 && <span style={{ ...S.discNum, color: C.ink }}>{game.bar.w}</span>}
                {Array.from({ length: Math.min(game.bar.w, 4) }).map((_, i) => (
                  <span key={i} style={{ ...S.disc, ...S.discW, ...(selected === "bar" ? S.discSel : {}) }} />
                ))}
              </span>
            </button>

            {quadrant(topRight, botRight)}

            {/* sortie */}
            <button onClick={onOff} className="off" style={{ ...S.off, boxShadow: canBear ? `inset 0 0 0 2px ${C.terra}` : "none" }} aria-label={t.ariaOff}>
              <span style={S.offHalf}>
                <span style={S.offCount}>{game.off.b}</span>
              </span>
              <span style={S.offHalf}>
                <span style={{ ...S.offCount, color: C.muted }}>{game.off.w}</span>
              </span>
            </button>
          </div>
        </div>

        {/* dés + voix */}
        <div style={S.diceRow}>
          <div style={S.diceBox}>
            {shown.length === 0
              ? <span style={S.diceEmpty}>—</span>
              : shown.map((n, i) => {
                  const used = turn === "w" && rolled && !diceContains(dice, shown, i);
                  return <span key={i} style={{ opacity: used ? 0.28 : 1 }}><Die n={n} tone={turn} /></span>;
                })}
          </div>
          {turn === "w" && !rolled && !over && (
            <button onClick={playerRoll} style={S.solid}>{t.roll}</button>
          )}
        </div>

        <div style={S.voice}>
          <span style={S.voiceMark}>—</span>
          <span style={S.voiceText}>{line}</span>
        </div>

        {showRules && (
          <div style={S.rules}>
            <b style={S.rulesH}>{t.rulesTitle}</b>
            {t.rulesIntro}
            <div style={S.rulesList}>
              {t.rulesItems.map((item, i) => <div key={i}>{item}</div>)}
            </div>
            {t.rulesHow}
          </div>
        )}

        <footer style={S.foot}>
          <span style={{ ...S.status, color: thinking ? C.terra : C.muted }} className={thinking ? "pulse" : ""}>{status}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowRules((v)=>!v)} style={S.ghost}>{t.rulesBtn}</button>
            <button onClick={newGame} style={S.ghost}>{t.newGame}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* dés utilisés : un dé affiché est "consommé" s'il n'est plus dans `dice` (gère les doublons) */
function diceContains(remaining, shown, index) {
  const counts = {};
  for (const d of remaining) counts[d] = (counts[d] || 0) + 1;
  // reconstruit l'ordre d'affichage : marque present tant qu'il reste un exemplaire
  const seenBefore = shown.slice(0, index).filter((x) => x === shown[index]).length;
  return (counts[shown[index]] || 0) > seenBefore;
}

const PIPS = {
  1: [0,0,0,0,1,0,0,0,0],
  2: [1,0,0,0,0,0,0,0,1],
  3: [1,0,0,0,1,0,0,0,1],
  4: [1,0,1,0,0,0,1,0,1],
  5: [1,0,1,0,1,0,1,0,1],
  6: [1,0,1,1,0,1,1,0,1],
};

/* ---------- CSS ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
.pt, .bar, .off { cursor: pointer; }
.pt:focus-visible, .bar:focus-visible, .off:focus-visible { outline: 2px solid ${C.terra}; outline-offset: -2px; }
.pulse { animation: bpulse 1.6s ease-in-out infinite; }
@keyframes bpulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .pulse { animation: none } }
`;

const S = {
  page: {
    minHeight: "100vh",
    background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "28px 14px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink,
  },
  shell: { width: "min(94vw, 600px)" },
  head: { textAlign: "center", marginBottom: 14 },
  brand: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.42em", paddingLeft: "0.42em" },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.28em", color: C.muted, marginTop: 7, paddingLeft: "0.28em" },
  hairline: { height: 1, background: C.hair, margin: "14px auto 0", width: "100%" },

  tray: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 8px" },
  trayLabel: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted },

  cabinet: {
    padding: 11,
    background: `linear-gradient(150deg, #E6DBC5 0%, ${C.frame} 55%, ${C.frameEdge} 100%)`,
    borderRadius: 5, border: `1px solid ${C.frameEdge}`,
    boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset, 0 34px 60px -34px rgba(32,30,25,0.6)",
  },
  boardInner: {
    display: "flex", alignItems: "stretch",
    height: "min(70vw, 420px)",
    background: C.felt, borderRadius: 3,
    boxShadow: "inset 0 2px 8px rgba(32,30,25,0.28), inset 0 0 0 1px rgba(32,30,25,0.16)",
    overflow: "hidden",
  },
  quad: { flex: 6, display: "flex", flexDirection: "column" },
  row: { flex: 1, display: "flex" },
  point: {
    position: "relative", flex: 1, border: "none", background: "transparent", padding: 0,
    display: "flex", alignItems: "stretch", justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },
  tri: { position: "absolute", left: "12%", width: "76%", zIndex: 0 },
  triTop: { top: 0, height: "88%", clipPath: "polygon(0 0, 100% 0, 50% 100%)" },
  triBot: { bottom: 0, height: "88%", clipPath: "polygon(50% 0, 0 100%, 100% 100%)" },

  stack: { position: "relative", display: "flex", alignItems: "center", gap: 1, padding: "3px 0", zIndex: 2, width: "100%" },
  disc: {
    width: "min(7vw, 40px)", height: "min(7vw, 40px)", borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 2px rgba(32,30,25,0.35), inset 0 1px 1px rgba(255,255,255,0.25)",
  },
  discW: { background: `radial-gradient(circle at 35% 30%, #FFFDF6, ${C.bone})`, border: `1.5px solid ${C.ink}` },
  discB: { background: `radial-gradient(circle at 35% 30%, #3A372F, ${C.ink})`, border: `1.5px solid rgba(0,0,0,0.4)` },
  discSel: { boxShadow: `0 0 0 2px ${C.terra}, 0 1px 2px rgba(32,30,25,0.35)` },
  discNum: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11, fontWeight: 700 },

  tgtRing: { position: "absolute", left: "50%", transform: "translateX(-50%)", width: "min(5vw,26px)", height: "min(5vw,26px)", borderRadius: "50%", border: `2px solid ${C.ok}`, zIndex: 3, pointerEvents: "none" },
  selWash: { position: "absolute", inset: 0, background: "rgba(168,85,59,0.10)", zIndex: 1, pointerEvents: "none" },

  bar: {
    flex: 1.1, border: "none", padding: "6px 0", display: "flex", flexDirection: "column",
    background: `linear-gradient(180deg, #CBBC9C, #BBAA86)`,
    boxShadow: "inset 1px 0 0 rgba(32,30,25,0.18), inset -1px 0 0 rgba(32,30,25,0.18)",
    alignItems: "center",
  },
  barHalf: { flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },

  off: {
    flex: 1.1, border: "none", marginLeft: 4, display: "flex", flexDirection: "column",
    background: "rgba(32,30,25,0.06)", boxShadow: "inset 0 0 0 1px rgba(32,30,25,0.16)", borderRadius: 2,
  },
  offHalf: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  offCount: { fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: "italic", color: C.ink },

  diceRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, minHeight: 44, gap: 12 },
  diceBox: { display: "flex", gap: 8, alignItems: "center" },
  diceEmpty: { color: C.muted, fontStyle: "italic", fontSize: 20 },
  die: {
    width: 34, height: 34, borderRadius: 6, padding: 5,
    display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)", gap: 1,
    boxShadow: "0 2px 4px rgba(32,30,25,0.3), inset 0 1px 1px rgba(255,255,255,0.25)",
    border: "1px solid rgba(32,30,25,0.25)",
  },
  pip: { width: 6, height: 6, borderRadius: "50%", margin: "auto" },

  voice: { marginTop: 12, display: "flex", gap: 10, alignItems: "baseline", padding: "13px 2px 4px", borderTop: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 19, lineHeight: 1.35, color: C.ink },
  rules: { marginTop: 12, padding: "14px 16px", background: "rgba(168,85,59,0.06)", border: `1px solid ${C.hair}`, borderRadius: 4, fontSize: 16.5, lineHeight: 1.5, color: C.ink },
  rulesH: { display: "block", fontSize: 18, marginBottom: 6 },
  rulesList: { margin: "8px 0", display: "flex", flexDirection: "column", gap: 5 },

  foot: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  status: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase" },
  ghost: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 14px", border: `1px solid ${C.hair}`, background: "transparent", color: C.ink, cursor: "pointer", borderRadius: 2 },
  solid: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "10px 18px", border: "none", background: C.terra, color: "#FBF7EF", cursor: "pointer", borderRadius: 2 },
};
