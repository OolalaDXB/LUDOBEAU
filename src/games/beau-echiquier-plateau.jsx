import React, { useState, useEffect, useRef, useCallback } from "react";
import Celebration from "./beau-celebration.jsx";

/* ============================================================
   BEAU · LE SOUFFLEUR — Échiquier quiet-luxury
   Plateau retravaillé : cadre marqueté, coordonnées gravées,
   surface encastrée, matière, indices ciselés.
   Moteur identique : coups légaux, échec/mat/pat, roque,
   en passant, promotion, IA negamax + voix du Souffleur.
   Bilingue (FR/EN) via la prop `lang`.
   ============================================================ */

/* ---------- Textes ---------- */
const STR = {
  fr: {
    eyebrow: "LE SOUFFLEUR · ÉCHECS",
    trayAi: "Le Souffleur", trayYou: "Vous",
    boardLabel: "Échiquier",
    cellLabel: (s, mine, name) => `${s} ${mine ? `votre ${name}` : `${name} du Souffleur`}`,
    pieceNames: { p: "pion", n: "cavalier", b: "fou", r: "tour", q: "dame", k: "roi" },
    capNames: { p: "un pion", n: "un cavalier", b: "un fou", r: "une tour", q: "une dame" },
    rulesTitle: "Les échecs en bref",
    rulesBody: (<>Chaque pièce se déplace à sa façon : le pion avance tout droit (et prend en diagonale), la tour en lignes, le fou en diagonales, la dame dans toutes les directions, le cavalier en « L », le roi d'une case. Le but : mettre le roi adverse en <i>échec et mat</i>, menacé et sans échappatoire. Touchez une pièce, les cases possibles s'affichent en points ; touchez la case d'arrivée. En mode <i>Souffleur</i> vous jouez les blancs (ivoire) ; en mode <i>À deux</i>, chacun joue son tour sur le même écran.</>),
    thinking: "Le Souffleur réfléchit",
    modeSolo: "Souffleur", modeDuo: "À deux",
    levels: { doux: "Doux", pose: "Posé", vif: "Vif" },
    rules: "Règles", undo: "Annuler", newGame: "Nouvelle partie",
    /* lignes d'ouverture */
    openSolo: "Les blancs ouvrent. À vous, je vous regarde faire.",
    openDuo: "Les blancs ouvrent.",
    switchDuo: "À deux : les blancs commencent.",
    switchSolo: "Vous jouez les blancs contre le Souffleur.",
    /* statuts */
    yourMove: "À vous",
    mateWin: "Échec et mat · vous gagnez", mateLoss: "Échec et mat", staleDraw: "Pat · partie nulle",
    checkYou: "Échec · à vous", checkAi: "Échec",
    /* mode à deux */
    sideName: (col) => (col === "w" ? "Les blancs" : "Les noirs"),
    sideShort: (col) => (col === "w" ? "blancs" : "noirs"),
    duoPlays: (s) => `${s} jouent.`,
    duoMate: (s) => `Échec et mat. ${s} l'emportent.`,
    duoStale: "Pat. Partie nulle.",
    duoCheck: (s) => `Échec ! ${s} attaquent le roi.`,
    duoCapture: (s, n) => `${s} prennent ${n}.`,
    duoCastle: (s) => `${s} roquent.`,
    duoPromo: (s) => `${s} promeuvent une dame.`,
    duoStatusMate: (s) => `Mat · ${s} gagnent`,
    duoStatusStale: "Pat · nulle",
    duoStatusCheck: (s) => `Échec · aux ${s}`,
    duoStatusTurn: (s) => `Aux ${s}`,
    /* voix du Souffleur */
    v: {
      mateYou: "Mat. La position ne ment jamais : vous l'aviez vue venir.",
      mateMe: "Mat. J'avais le tempo ; vous aviez l'élégance. Une autre ?",
      stalemate: "Pat. Personne ne perd, ce qui est une autre façon de ne pas gagner.",
      castleYou: "Vous mettez le roi à l'abri. La prudence est une forme de style.",
      castleMe: "Je me retranche. On ne gagne pas en s'exposant.",
      promoYou: "Un pion devient dame. Patience récompensée.",
      promoMe: "Je promeus. La fin de partie a ses droits.",
      queenYou: "La dame tombe. Le centre de gravité vient de basculer.",
      queenMe: "Je prends la dame. Vous le ressentirez bientôt.",
      captureYou: (n) => `Vous prenez ${n}. Net.`,
      captureMe: (n) => `Je prends ${n}. Comptez vos forces.`,
      checkYou: "Échec. Vous m'obligez à répondre.",
      checkMe: "Échec : votre roi devra bouger.",
      centreYou: "Vous occupez le centre. La bonne géométrie d'abord.",
      centreMe: "J'occupe le centre. Tout part de là.",
      knightYou: "Un cavalier avance : le détour est parfois la ligne droite.",
      knightMe: "Mon cavalier cherche l'angle.",
      quietYou: ["Coup posé. Je vous observe.", "Discret. J'aime ça.", "Vous construisez. Patience.", "Rien de spectaculaire, et c'est juste."],
      quietMe: ["Je développe, sans hâte.", "Je place mes pièces. Le calme avant.", "Une amélioration tranquille.", "Je prépare le terrain."],
    },
  },
  en: {
    eyebrow: "THE PROMPTER · CHESS",
    trayAi: "The Prompter", trayYou: "You",
    boardLabel: "Chessboard",
    cellLabel: (s, mine, name) => `${s} ${mine ? `your ${name}` : `the Prompter's ${name}`}`,
    pieceNames: { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" },
    capNames: { p: "a pawn", n: "a knight", b: "a bishop", r: "a rook", q: "a queen" },
    rulesTitle: "Chess in brief",
    rulesBody: (<>Each piece moves in its own way: the pawn advances straight ahead (and captures diagonally), the rook along ranks and files, the bishop along diagonals, the queen in every direction, the knight in an “L”, the king one square. The aim: to put the opposing king in <i>checkmate</i>, attacked with no escape. Touch a piece and its possible squares appear as dots; touch the square you want. In <i>Prompter</i> mode you play White (ivory); in <i>Two players</i> mode, each player takes their turn on the same screen.</>),
    thinking: "The Prompter is thinking",
    modeSolo: "Prompter", modeDuo: "Two players",
    levels: { doux: "Gentle", pose: "Measured", vif: "Sharp" },
    rules: "Rules", undo: "Undo", newGame: "New game",
    openSolo: "White opens. Over to you, I'm watching.",
    openDuo: "White opens.",
    switchDuo: "Two players: White begins.",
    switchSolo: "You play White against the Prompter.",
    yourMove: "Your move",
    mateWin: "Checkmate · you win", mateLoss: "Checkmate", staleDraw: "Stalemate · draw",
    checkYou: "Check · your move", checkAi: "Check",
    sideName: (col) => (col === "w" ? "White" : "Black"),
    sideShort: (col) => (col === "w" ? "White" : "Black"),
    duoPlays: (s) => `${s} plays.`,
    duoMate: (s) => `Checkmate. ${s} wins.`,
    duoStale: "Stalemate. A draw.",
    duoCheck: (s) => `Check! ${s} attacks the king.`,
    duoCapture: (s, n) => `${s} takes ${n}.`,
    duoCastle: (s) => `${s} castles.`,
    duoPromo: (s) => `${s} promotes to a queen.`,
    duoStatusMate: (s) => `Checkmate · ${s} wins`,
    duoStatusStale: "Stalemate · draw",
    duoStatusCheck: (s) => `Check · ${s} to move`,
    duoStatusTurn: (s) => `${s} to move`,
    v: {
      mateYou: "Checkmate. The position never lies: you saw it coming.",
      mateMe: "Checkmate. I had the tempo; you had the elegance. Another?",
      stalemate: "Stalemate. No one loses, which is another way of not winning.",
      castleYou: "You tuck your king away. Prudence is a form of style.",
      castleMe: "I dig in. Nothing is won by standing exposed.",
      promoYou: "A pawn becomes a queen. Patience rewarded.",
      promoMe: "I promote. The endgame has its privileges.",
      queenYou: "The queen falls. The centre of gravity has just shifted.",
      queenMe: "I take your queen. You'll feel it soon enough.",
      captureYou: (n) => `You take ${n}. Clean.`,
      captureMe: (n) => `I take ${n}. Count your forces.`,
      checkYou: "Check. You force my hand.",
      checkMe: "Check: your king will have to move.",
      centreYou: "You take the centre. Sound geometry first.",
      centreMe: "I take the centre. Everything starts there.",
      knightYou: "A knight steps out: sometimes the detour is the straight line.",
      knightMe: "My knight looks for the angle.",
      quietYou: ["A measured move. I'm watching.", "Discreet. I like that.", "You're building. Patience.", "Nothing spectacular, and rightly so."],
      quietMe: ["I develop, unhurried.", "I place my pieces. The calm before.", "A quiet improvement.", "I prepare the ground."],
    },
  },
};

/* ---------- Palette ---------- */
const C = {
  bg: "#F1EADD",
  frame: "#DCD0B8",        // bois clair du cadre
  frameEdge: "#CDBE9F",
  inlay: "#B07A4E",        // filet de marqueterie (chaud)
  light: "#ECE3D0",        // case claire (buis)
  lightHi: "rgba(255,255,255,0.40)",
  dark: "#95A8A1",         // case sombre (pétrole pâle)
  darkHi: "rgba(255,255,255,0.16)",
  ink: "#201E19",          // joueur
  terra: "#A8553B",        // Souffleur
  hair: "rgba(32,30,25,0.14)",
  muted: "#6B6557",
  dot: "rgba(32,30,25,0.32)",
  bone: "#F5EEDC",         // armée claire (ivoire)
};

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/* ---------- Pièces dessinées (SVG) ----------
   Vous = corps ivoire + liseré encre · le Souffleur = encre pleine.
   ViewBox 0..45, base en bas. */
function Piece({ type, color }) {
  const fill = color === "w" ? C.bone : C.ink;
  const stroke = color === "w" ? C.ink : "#100F0C";
  const accent = color === "w" ? C.ink : C.bone;
  const base = (
    <>
      <path d="M14.5 34.5 C14.5 32.8 18 32 22.5 32 C27 32 30.5 32.8 30.5 34.5 C30.5 36.2 27 37 22.5 37 C18 37 14.5 36.2 14.5 34.5 Z" />
      <ellipse cx="22.5" cy="40" rx="12" ry="2.6" />
    </>
  );
  let top = null;
  switch (type) {
    case "p": top = (<>
      <circle cx="22.5" cy="10" r="4.3" />
      <path d="M18.8 14.2 C18 18 16.5 21 15.8 25 C15.4 28 16.4 30 16 32 H29 C28.6 30 29.6 28 29.2 25 C28.5 21 27 18 26.2 14.2 C25 15.3 23.9 15.7 22.5 15.7 C21.1 15.7 20 15.3 18.8 14.2 Z" />
    </>); break;
    case "r": top = (<>
      <path d="M13 13.5 V9 H16.5 V11 H20.5 V9 H24.5 V11 H28.5 V9 H32 V13.5 Z" />
      <path d="M14.5 13.5 H30.5 L29.2 18 H15.8 Z" />
      <path d="M15.6 18 H29.4 C29.4 24 31 29 31.5 32 H13.5 C14 29 15.6 24 15.6 18 Z" />
    </>); break;
    case "n": top = (<>
      <path d="M24 8.5 C20 8 16.6 9.6 14.6 13 L12 16.2 C11 17.7 10.6 19.6 11 21 C11.3 22 12.3 22.1 13.1 21.5 L15.2 20 C14.2 22.6 13.7 24.6 14.2 26 C13.2 27.6 13.2 30 13.7 32 H30.6 C31.6 25.5 31.6 16.6 28.6 12.6 C27.1 10.5 25.9 9 24 8.5 Z" />
      <path d="M24 8.5 L27 4.8 L28.2 9.3 Z" />
      <circle cx="16.4" cy="15.2" r="1.15" fill={accent} stroke="none" />
    </>); break;
    case "b": top = (<>
      <circle cx="22.5" cy="6.2" r="1.9" />
      <path d="M22.5 8 C18 11 16.8 17 18 22 C18.6 25 17 29 16.4 32 H28.6 C28 29 26.4 25 27 22 C28.2 17 27 11 22.5 8 Z" />
      <path d="M20.8 13.5 L24.2 16.5" fill="none" />
    </>); break;
    case "q": top = (<>
      <circle cx="11.5" cy="8.5" r="1.9" /><circle cx="17" cy="6.8" r="1.9" /><circle cx="22.5" cy="5.8" r="2.1" /><circle cx="28" cy="6.8" r="1.9" /><circle cx="33.5" cy="8.5" r="1.9" />
      <path d="M12 9.5 L14.7 19 C17 20.2 28 20.2 30.3 19 L33 9.5 L28.5 14.8 L25 8.7 L22.5 14.8 L20 8.7 L16.5 14.8 Z" />
      <path d="M14.7 19 C15.2 24 16 28 16.2 32 H28.8 C29 28 29.8 24 30.3 19 C28 20.3 25 21 22.5 21 C20 21 17 20.3 14.7 19 Z" />
    </>); break;
    case "k": top = (<>
      <path d="M21.4 2.8 H23.6 V5.4 H26.1 V7.6 H23.6 V11 H21.4 V7.6 H18.9 V5.4 H21.4 Z" />
      <path d="M14 18.5 C16.5 12.8 28.5 12.8 31 18.5 C31 18.5 30 25.5 29 32 H16 C15 25.5 14 18.5 14 18.5 Z" />
      <path d="M14 18.5 C18 16 27 16 31 18.5" fill="none" />
    </>); break;
    default: break;
  }
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true"
      style={{ display: "block", filter: "drop-shadow(0 1.5px 1.5px rgba(32,30,25,0.28))", pointerEvents: "none" }}>
      <g fill={fill} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        {top}{base}
      </g>
    </svg>
  );
}

/* ---------- Tables de position (perspective blanc, rangée 0 = rangée 1) ---------- */
const PST = {
  p: [[0,0,0,0,0,0,0,0],[5,10,10,-20,-20,10,10,5],[5,-5,-10,0,0,-10,-5,5],[0,0,0,20,20,0,0,0],[5,5,10,25,25,10,5,5],[10,10,20,30,30,20,10,10],[50,50,50,50,50,50,50,50],[0,0,0,0,0,0,0,0]],
  n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,5,5,0,-20,-40],[-30,5,10,15,15,10,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,10,15,15,10,0,-30],[-40,-20,0,0,0,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,5,0,0,0,0,5,-10],[-10,10,10,10,10,10,10,-10],[-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,5,10,10,5,0,-10],[-10,0,0,0,0,0,0,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  r: [[0,0,0,5,5,0,0,0],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[5,10,10,10,10,10,10,5],[0,0,0,0,0,0,0,0]],
  q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,5,0,0,0,0,-10],[-10,5,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[-5,0,5,5,5,5,0,-5],[-10,0,5,5,5,5,0,-10],[-10,0,0,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  k: [[20,30,10,0,0,10,30,20],[20,20,0,0,0,0,20,20],[-10,-20,-20,-20,-20,-20,-20,-10],[-20,-30,-30,-40,-40,-30,-30,-20],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30]],
};
const pstVal = (t, r, c, col) => (col === "w" ? PST[t][7 - r][c] : PST[t][r][c]);

/* ---------- État initial ---------- */
function initialBoard() {
  const back = ["r","n","b","q","k","b","n","r"];
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    b[0][c] = { t: back[c], c: "b" };
    b[1][c] = { t: "p", c: "b" };
    b[6][c] = { t: "p", c: "w" };
    b[7][c] = { t: back[c], c: "w" };
  }
  return b;
}
const initialState = () => ({ castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null });

/* ---------- Utilitaires ---------- */
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opp = (col) => (col === "w" ? "b" : "w");
const cloneBoard = (b) => b.map((row) => row.slice());
function findKing(b, col) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (p && p.t === "k" && p.c === col) return [r, c];
  }
  return null;
}
const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ORTH = [[-1,0],[1,0],[0,-1],[0,1]];

function isAttacked(b, r, c, by) {
  if (by === "w") {
    if (inB(r+1,c-1) && b[r+1][c-1] && b[r+1][c-1].c==="w" && b[r+1][c-1].t==="p") return true;
    if (inB(r+1,c+1) && b[r+1][c+1] && b[r+1][c+1].c==="w" && b[r+1][c+1].t==="p") return true;
  } else {
    if (inB(r-1,c-1) && b[r-1][c-1] && b[r-1][c-1].c==="b" && b[r-1][c-1].t==="p") return true;
    if (inB(r-1,c+1) && b[r-1][c+1] && b[r-1][c+1].c==="b" && b[r-1][c+1].t==="p") return true;
  }
  for (const [dr,dc] of KN) { const rr=r+dr,cc=c+dc; if (inB(rr,cc)) { const p=b[rr][cc]; if (p&&p.c===by&&p.t==="n") return true; } }
  for (const [dr,dc] of KG) { const rr=r+dr,cc=c+dc; if (inB(rr,cc)) { const p=b[rr][cc]; if (p&&p.c===by&&p.t==="k") return true; } }
  for (const [dr,dc] of DIAG) { let rr=r+dr,cc=c+dc; while (inB(rr,cc)) { const p=b[rr][cc]; if (p){ if(p.c===by&&(p.t==="b"||p.t==="q")) return true; break; } rr+=dr; cc+=dc; } }
  for (const [dr,dc] of ORTH) { let rr=r+dr,cc=c+dc; while (inB(rr,cc)) { const p=b[rr][cc]; if (p){ if(p.c===by&&(p.t==="r"||p.t==="q")) return true; break; } rr+=dr; cc+=dc; } }
  return false;
}
function inCheck(b, col) { const k = findKing(b, col); return k ? isAttacked(b, k[0], k[1], opp(col)) : false; }

/* ---------- Coups pseudo-légaux ---------- */
function pseudoMoves(b, col, st) {
  const moves = [];
  const dir = col === "w" ? -1 : 1;
  const startRank = col === "w" ? 6 : 1;
  const promoRank = col === "w" ? 0 : 7;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p || p.c !== col) continue;
    const add = (tr, tc, flags = {}) => moves.push({ from: [r, c], to: [tr, tc], t: p.t, ...flags });
    if (p.t === "p") {
      if (inB(r+dir,c) && !b[r+dir][c]) {
        if (r+dir===promoRank) add(r+dir,c,{promo:"q"}); else add(r+dir,c);
        if (r===startRank && !b[r+2*dir][c]) add(r+2*dir,c,{double:true});
      }
      for (const dc of [-1,1]) {
        const tr=r+dir, tc=c+dc; if (!inB(tr,tc)) continue;
        const tp=b[tr][tc];
        if (tp && tp.c!==col) { if (tr===promoRank) add(tr,tc,{promo:"q"}); else add(tr,tc); }
        else if (st.ep && st.ep[0]===tr && st.ep[1]===tc) add(tr,tc,{ep:true});
      }
    } else if (p.t === "n") {
      for (const [dr,dc] of KN) { const tr=r+dr,tc=c+dc; if (inB(tr,tc)&&(!b[tr][tc]||b[tr][tc].c!==col)) add(tr,tc); }
    } else if (p.t === "k") {
      for (const [dr,dc] of KG) { const tr=r+dr,tc=c+dc; if (inB(tr,tc)&&(!b[tr][tc]||b[tr][tc].c!==col)) add(tr,tc); }
      const rank = col==="w"?7:0;
      const cK = col==="w"?st.castling.wK:st.castling.bK;
      const cQ = col==="w"?st.castling.wQ:st.castling.bQ;
      if (r===rank && c===4 && !inCheck(b,col)) {
        if (cK && !b[rank][5] && !b[rank][6] && b[rank][7] && b[rank][7].t==="r" && !isAttacked(b,rank,5,opp(col)) && !isAttacked(b,rank,6,opp(col))) add(rank,6,{castle:"K"});
        if (cQ && !b[rank][3] && !b[rank][2] && !b[rank][1] && b[rank][0] && b[rank][0].t==="r" && !isAttacked(b,rank,3,opp(col)) && !isAttacked(b,rank,2,opp(col))) add(rank,2,{castle:"Q"});
      }
    } else {
      const dirs = p.t==="b"?DIAG:p.t==="r"?ORTH:DIAG.concat(ORTH);
      for (const [dr,dc] of dirs) {
        let tr=r+dr,tc=c+dc;
        while (inB(tr,tc)) { const tp=b[tr][tc]; if (!tp) add(tr,tc); else { if (tp.c!==col) add(tr,tc); break; } tr+=dr; tc+=dc; }
      }
    }
  }
  return moves;
}

/* ---------- Application immuable ---------- */
function applyMove(b, st, m) {
  const nb = cloneBoard(b);
  const piece = nb[m.from[0]][m.from[1]];
  const col = piece.c;
  let captured = nb[m.to[0]][m.to[1]];
  nb[m.to[0]][m.to[1]] = m.promo ? { t: m.promo, c: col } : piece;
  nb[m.from[0]][m.from[1]] = null;
  if (m.ep) { const capR = col==="w"?m.to[0]+1:m.to[0]-1; captured = nb[capR][m.to[1]]; nb[capR][m.to[1]] = null; }
  if (m.castle) { const rank=m.from[0]; if (m.castle==="K"){ nb[rank][5]=nb[rank][7]; nb[rank][7]=null; } else { nb[rank][3]=nb[rank][0]; nb[rank][0]=null; } }
  const ns = { castling: { ...st.castling }, ep: null };
  if (m.double) ns.ep = [(m.from[0]+m.to[0])/2, m.from[1]];
  if (piece.t==="k") { if (col==="w"){ ns.castling.wK=false; ns.castling.wQ=false; } else { ns.castling.bK=false; ns.castling.bQ=false; } }
  const touch = (r,c) => { if (r===7&&c===0) ns.castling.wQ=false; if (r===7&&c===7) ns.castling.wK=false; if (r===0&&c===0) ns.castling.bQ=false; if (r===0&&c===7) ns.castling.bK=false; };
  touch(m.from[0],m.from[1]); touch(m.to[0],m.to[1]);
  return { board: nb, state: ns, captured };
}
function legalMoves(b, col, st) {
  const res = [];
  for (const m of pseudoMoves(b, col, st)) { const { board: nb } = applyMove(b, st, m); if (!inCheck(nb, col)) res.push(m); }
  return res;
}

/* ---------- Évaluation & recherche ---------- */
function evalWhite(b) {
  let s = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) { const p=b[r][c]; if (!p) continue; const v=VAL[p.t]+pstVal(p.t,r,c,p.c); s += p.c==="w"?v:-v; }
  return s;
}
const evalSTM = (b, col) => (col==="w"?1:-1)*evalWhite(b);
const MATE = 1000000;
function orderMoves(b, moves) {
  return moves.map((m) => { const tp=b[m.to[0]][m.to[1]]; const score=(tp?10*VAL[tp.t]-VAL[m.t]:0)+(m.promo?800:0); return {m,score}; })
    .sort((a,z)=>z.score-a.score).map((x)=>x.m);
}
function quiesce(b, col, alpha, beta, st, qd) {
  const stand = evalSTM(b, col);
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;
  if (qd === 0) return alpha;
  let caps = pseudoMoves(b, col, st).filter((m)=>b[m.to[0]][m.to[1]]||m.ep);
  caps = orderMoves(b, caps);
  for (const m of caps) {
    const { board: nb, state: ns } = applyMove(b, st, m);
    if (inCheck(nb, col)) continue;
    const sc = -quiesce(nb, opp(col), -beta, -alpha, ns, qd-1);
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}
function negamax(b, col, depth, alpha, beta, st) {
  if (depth === 0) return quiesce(b, col, alpha, beta, st, 4);
  const moves = orderMoves(b, legalMoves(b, col, st));
  if (moves.length === 0) return inCheck(b, col) ? -MATE - depth : 0;
  let best = -Infinity;
  for (const m of moves) {
    const { board: nb, state: ns } = applyMove(b, st, m);
    const sc = -negamax(nb, opp(col), depth-1, -beta, -alpha, ns);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
function bestMove(b, col, st, depth) {
  const moves = orderMoves(b, legalMoves(b, col, st));
  if (moves.length === 0) return null;
  let best=null, bestScore=-Infinity, alpha=-Infinity;
  for (const m of moves) {
    const { board: nb, state: ns } = applyMove(b, st, m);
    const sc = -negamax(nb, opp(col), depth-1, -Infinity, -alpha, ns);
    if (sc > bestScore) { bestScore = sc; best = m; }
    if (sc > alpha) alpha = sc;
  }
  return best;
}

/* ---------- Notation & voix du Souffleur ---------- */
const FILES = "abcdefgh";
const sq = (r, c) => FILES[c] + (8 - r);
function souffleurLine(b, st, m, mover, info, t) {
  const v = t.v;
  if (info.mate) return mover==="w" ? v.mateYou : v.mateMe;
  if (info.stalemate) return v.stalemate;
  if (m.castle) return mover==="w" ? v.castleYou : v.castleMe;
  if (m.promo) return mover==="w" ? v.promoYou : v.promoMe;
  if (info.captured && info.capturedType === "q") return mover==="w" ? v.queenYou : v.queenMe;
  if (info.captured) { const names=t.capNames; return mover==="w" ? v.captureYou(names[info.capturedType]) : v.captureMe(names[info.capturedType]); }
  if (info.check) return mover==="w" ? v.checkYou : v.checkMe;
  const center = ["d4","d5","e4","e5"].includes(sq(m.to[0], m.to[1]));
  if (center) return mover==="w" ? v.centreYou : v.centreMe;
  if (m.t === "n") return mover==="w" ? v.knightYou : v.knightMe;
  const quiet = mover==="w" ? v.quietYou : v.quietMe;
  return quiet[(m.to[0]+m.to[1]+m.from[1]) % quiet.length];
}

/* ============================================================ */
export default function BeauEchiquier({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const [board, setBoard] = useState(initialBoard);
  const [gstate, setGstate] = useState(initialState);
  const [turn, setTurn] = useState("w");
  const [selected, setSelected] = useState(null);
  const [legalFor, setLegalFor] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [line, setLine] = useState(t.openSolo);
  const [status, setStatus] = useState(t.yourMove);
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState(false);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [depth, setDepth] = useState(2); // conservé pour compat
  const [level, setLevel] = useState("doux");
  const [mode, setMode] = useState("solo"); // solo | duo
  const [showRules, setShowRules] = useState(false);
  const [cele, setCele] = useState(null);
  const histRef = useRef([]);
  useEffect(() => { if (!over) setCele(null); }, [over]);

  const allLegal = useCallback((b, col, st) => legalMoves(b, col, st), []);

  const finishAfterMove = useCallback((nb, ns, mover, m, capturedPiece) => {
    const nextCol = opp(mover);
    const next = allLegal(nb, nextCol, ns);
    const check = inCheck(nb, nextCol);
    const info = { check, mate: next.length===0&&check, stalemate: next.length===0&&!check, captured: !!capturedPiece, capturedType: capturedPiece?capturedPiece.t:null };
    if (mode === "duo") {
      const side = t.sideName(mover);
      const names = t.capNames;
      let l = t.duoPlays(side);
      if (info.mate) l = t.duoMate(side);
      else if (info.stalemate) l = t.duoStale;
      else if (info.check) l = t.duoCheck(side);
      else if (info.captured) l = t.duoCapture(side, names[info.capturedType]);
      else if (m.castle) l = t.duoCastle(side);
      else if (m.promo) l = t.duoPromo(side);
      setLine(l);
      if (next.length === 0) { setOver(true); setStatus(check ? t.duoStatusMate(t.sideShort(mover)) : t.duoStatusStale); }
      if (info.mate) setCele({ winner: side });
      else setStatus(check ? t.duoStatusCheck(t.sideShort(nextCol)) : t.duoStatusTurn(t.sideShort(nextCol)));
      return;
    }
    setLine(souffleurLine(nb, ns, m, mover, info, t));
    if (next.length === 0) { setOver(true); setStatus(check ? (mover==="w"?t.mateWin:t.mateLoss) : t.staleDraw); }
    if (info.mate && mover === "w") setCele({});
    else setStatus(check ? (nextCol==="w"?t.checkYou:t.checkAi) : nextCol==="w"?t.yourMove:t.thinking);
  }, [allLegal, mode, t]);

  const pushHistory = useCallback(() => {
    histRef.current.push({
      board: cloneBoard(board),
      gstate: { castling: { ...gstate.castling }, ep: gstate.ep ? [...gstate.ep] : null },
      turn, lastMove, line, status, over, captured: { w: [...captured.w], b: [...captured.b] },
    });
  }, [board, gstate, turn, lastMove, line, status, over, captured]);

  const commitMove = useCallback((m, mover) => {
    pushHistory();
    const { board: nb, state: ns, captured: cap } = applyMove(board, gstate, m);
    setBoard(nb); setGstate(ns); setLastMove({ from: m.from, to: m.to });
    if (cap) setCaptured((prev)=>({ ...prev, [mover]: [...prev[mover], cap.t] }));
    finishAfterMove(nb, ns, mover, m, cap);
    setTurn(opp(mover)); setSelected(null); setLegalFor([]);
  }, [board, gstate, pushHistory, finishAfterMove]);

  const onCell = (r, c) => {
    if (over || thinking) return;
    if (mode === "solo" && turn !== "w") return;
    const me = turn;
    const p = board[r][c];
    if (selected) {
      const mv = legalFor.find((m)=>m.to[0]===r&&m.to[1]===c);
      if (mv) { commitMove(mv, me); return; }
      if (p && p.c === me) { setSelected([r,c]); setLegalFor(allLegal(board, me, gstate).filter((m)=>m.from[0]===r&&m.from[1]===c)); return; }
      setSelected(null); setLegalFor([]); return;
    }
    if (p && p.c === me) { setSelected([r,c]); setLegalFor(allLegal(board, me, gstate).filter((m)=>m.from[0]===r&&m.from[1]===c)); }
  };

  useEffect(() => {
    if (mode !== "solo" || turn !== "b" || over) return;
    setThinking(true);
    const id = setTimeout(() => {
      let m;
      if (level === "doux") {
        const moves = legalMoves(board, "b", gstate);
        m = (Math.random() < 0.5 && moves.length)
          ? moves[Math.floor(Math.random() * moves.length)]
          : bestMove(board, "b", gstate, 1);
      } else if (level === "vif") {
        m = bestMove(board, "b", gstate, 3);
      } else {
        m = bestMove(board, "b", gstate, 2);
      }
      if (m) commitMove(m, "b");
      setThinking(false);
    }, 420);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, mode]);

  const newGame = () => {
    histRef.current = [];
    setBoard(initialBoard()); setGstate(initialState()); setTurn("w");
    setSelected(null); setLegalFor([]); setLastMove(null); setOver(false); setThinking(false);
    setCaptured({ w: [], b: [] });
    if (mode === "duo") { setLine(t.openDuo); setStatus(t.duoStatusTurn(t.sideShort("w"))); }
    else { setLine(t.openSolo); setStatus(t.yourMove); }
  };
  const switchMode = (m) => {
    setMode(m); histRef.current = [];
    setBoard(initialBoard()); setGstate(initialState()); setTurn("w");
    setSelected(null); setLegalFor([]); setLastMove(null); setOver(false); setThinking(false);
    setCaptured({ w: [], b: [] });
    if (m === "duo") { setLine(t.switchDuo); setStatus(t.duoStatusTurn(t.sideShort("w"))); }
    else { setLine(t.switchSolo); setStatus(t.yourMove); }
  };
  const undo = () => {
    if (thinking) return;
    const h = histRef.current; if (h.length === 0) return;
    let snap;
    if (h.length >= 2) { snap = h[h.length-2]; histRef.current = h.slice(0, h.length-2); }
    else { snap = h[h.length-1]; histRef.current = []; }
    setBoard(snap.board); setGstate(snap.gstate); setTurn(snap.turn); setLastMove(snap.lastMove);
    setLine(snap.line); setStatus(snap.status); setOver(snap.over); setCaptured(snap.captured);
    setSelected(null); setLegalFor([]);
  };

  const targetMove = (r, c) => legalFor.find((m)=>m.to[0]===r&&m.to[1]===c);
  const isCapTarget = (r, c) => { const m = targetMove(r,c); return m && (board[r][c] || m.ep); };
  const isMoveTarget = (r, c) => { const m = targetMove(r,c); return m && !(board[r][c] || m.ep); };
  const isSel = (r, c) => selected && selected[0]===r && selected[1]===c;
  const isLast = (r, c) => lastMove && ((lastMove.from[0]===r&&lastMove.from[1]===c)||(lastMove.to[0]===r&&lastMove.to[1]===c));

  const capRow = (arr, army) => arr.length===0
    ? <span style={{ opacity: 0.3, fontSize: 16 }}>—</span>
    : arr.map((t,i)=>(<span key={i} style={{ width: 16, height: 16, display: "inline-flex" }}><Piece type={t} color={army} /></span>));

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <Celebration open={!!cele} lang={lang} winner={cele && cele.winner} message={line} onReplay={() => { setCele(null); newGame(); }} onClose={() => setCele(null)} />
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.eyebrow}>{t.eyebrow}</div>
          <div style={S.hairline} />
        </header>

        <div style={S.tray}>
          <span style={S.trayLabel}>{t.trayAi}</span>
          <span style={S.trayCaps}>{capRow(captured.b, "w")}</span>
        </div>

        {/* ----- LE PLATEAU ----- */}
        <div style={S.cabinet}>
          <div style={S.frameInner}>
            <div style={S.surfaceRow}>
              <div style={S.ranks}>
                {[8,7,6,5,4,3,2,1].map((n)=>(<span key={n} style={S.coord}>{n}</span>))}
              </div>
              <div style={S.surfaceCol}>
                <div style={S.surface}>
                  <div style={S.grid} role="grid" aria-label={t.boardLabel}>
                    {board.map((row, r) => row.map((p, c) => {
                      const dark = (r + c) % 2 === 1;
                      let boxShadow = "none";
                      if (isSel(r, c)) boxShadow = `inset 0 0 0 3px ${C.terra}`;
                      else if (isCapTarget(r, c)) boxShadow = `inset 0 0 0 3px ${C.terra}99`;
                      else if (isLast(r, c)) boxShadow = `inset 0 0 0 2px ${C.terra}4D`;
                      return (
                        <button
                          key={`${r}-${c}`}
                          onClick={() => onCell(r, c)}
                          className="cell"
                          style={{
                            ...S.cell,
                            background: dark
                              ? `linear-gradient(140deg, ${C.darkHi}, rgba(0,0,0,0.05)), ${C.dark}`
                              : `linear-gradient(140deg, ${C.lightHi}, rgba(0,0,0,0.018)), ${C.light}`,
                            boxShadow,
                          }}
                          aria-label={p ? t.cellLabel(sq(r, c), p.c==="w", t.pieceNames[p.t]) : sq(r, c)}
                        >
                          {isMoveTarget(r, c) && <span style={{ ...S.ring }} />}
                          {p && (
                            <span style={S.pieceBox}><Piece type={p.t} color={p.c} /></span>
                          )}
                        </button>
                      );
                    }))}
                  </div>
                </div>
                <div style={S.files}>
                  {FILES.split("").map((f)=>(<span key={f} style={S.coord}>{f}</span>))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={S.tray}>
          <span style={S.trayLabel}>{t.trayYou}</span>
          <span style={S.trayCaps}>{capRow(captured.w, "b")}</span>
        </div>

        <div style={S.voice}>
          <span style={S.voiceMark}>—</span>
          <span style={S.voiceText}>{line}</span>
        </div>

        {showRules && (
          <div style={S.rules}>
            <b style={S.rulesH}>{t.rulesTitle}</b>
            {t.rulesBody}
          </div>
        )}

        <footer style={S.foot}>
          <span style={{ ...S.status, color: thinking ? C.terra : C.muted }} className={thinking ? "pulse" : ""}>
            {thinking ? t.thinking : status}
          </span>
          <div style={S.controls}>
            <div style={S.toggle}>
              <button onClick={() => switchMode("solo")} style={{ ...S.toggleBtn, ...(mode==="solo"?S.toggleOn:{}) }}>{t.modeSolo}</button>
              <button onClick={() => switchMode("duo")} style={{ ...S.toggleBtn, ...(mode==="duo"?S.toggleOn:{}) }}>{t.modeDuo}</button>
            </div>
            {mode === "solo" && (
              <div style={S.toggle}>
                <button onClick={() => setLevel("doux")} style={{ ...S.toggleBtn, ...(level==="doux"?S.toggleOn:{}) }}>{t.levels.doux}</button>
                <button onClick={() => setLevel("pose")} style={{ ...S.toggleBtn, ...(level==="pose"?S.toggleOn:{}) }}>{t.levels.pose}</button>
                <button onClick={() => setLevel("vif")} style={{ ...S.toggleBtn, ...(level==="vif"?S.toggleOn:{}) }}>{t.levels.vif}</button>
              </div>
            )}
            <button onClick={() => setShowRules((v)=>!v)} style={S.ghost}>{t.rules}</button>
            <button onClick={undo} style={S.ghost} disabled={thinking || histRef.current.length===0}>{t.undo}</button>
            <button onClick={newGame} style={S.solid}>{t.newGame}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ---------- CSS ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
.cell:focus-visible { outline: 3px solid ${C.terra}; outline-offset: -3px; z-index: 3; }
.cell:hover { filter: brightness(1.015); }
.pulse { animation: bpulse 1.6s ease-in-out infinite; }
@keyframes bpulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .pulse { animation: none } }
`;

const COORD = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontStyle: "italic",
  fontSize: 13,
  color: "rgba(32,30,25,0.5)",
  lineHeight: 1,
};

const S = {
  page: {
    minHeight: "100vh",
    background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "32px 16px",
    fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink,
  },
  shell: { width: "min(92vw, 540px)" },
  head: { textAlign: "center", marginBottom: 16 },
  brand: { fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.42em", paddingLeft: "0.42em" },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.28em", color: C.muted, marginTop: 7, paddingLeft: "0.28em" },
  hairline: { height: 1, background: C.hair, margin: "15px auto 0", width: "100%" },

  tray: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 2px", minHeight: 24 },
  trayLabel: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted },
  trayCaps: { display: "flex", gap: 1, alignItems: "center", minHeight: 18 },

  /* le meuble : cadre marqueté surélevé */
  cabinet: {
    padding: 12,
    background: `linear-gradient(150deg, #E6DBC5 0%, ${C.frame} 55%, ${C.frameEdge} 100%)`,
    borderRadius: 5,
    border: `1px solid ${C.frameEdge}`,
    boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset, 0 36px 64px -34px rgba(32,30,25,0.6), 0 4px 14px -8px rgba(32,30,25,0.35)",
  },
  /* liseré intérieur du cadre */
  frameInner: {
    padding: "10px 12px 8px",
    borderRadius: 3,
    background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.04))",
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.35)`,
  },
  surfaceRow: { display: "flex", alignItems: "stretch", gap: 8 },
  ranks: { display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center", width: 14 },
  surfaceCol: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },

  /* la surface de jeu : encastrée, filet de marqueterie */
  surface: {
    padding: 3,
    background: C.inlay,
    borderRadius: 2,
    boxShadow: "inset 0 2px 7px rgba(32,30,25,0.30), 0 0 0 1px rgba(32,30,25,0.18)",
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)",
    width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 1,
  },
  files: { display: "flex", justifyContent: "space-around", alignItems: "center", height: 14 },
  coord: { ...COORD },

  cell: {
    position: "relative", border: "none", padding: 0, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
    transition: "filter 120ms ease",
  },
  pieceBox: {
    width: "78%", height: "78%", display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none", zIndex: 2,
  },
  piece: {
    fontSize: "min(8.4vw, 48px)", lineHeight: 1,
    textShadow: "0 1px 1.5px rgba(32,30,25,0.22)",
    userSelect: "none", pointerEvents: "none",
  },
  pieceWrap: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, pointerEvents: "none" },
  pieceOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textShadow: "none" },
  ring: {
    position: "absolute", width: "26%", height: "26%", borderRadius: "50%",
    border: `2px solid ${C.dot}`, pointerEvents: "none",
  },

  voice: { marginTop: 14, display: "flex", gap: 10, alignItems: "baseline", padding: "14px 2px 4px", borderTop: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 19, lineHeight: 1.35, color: C.ink },
  rules: { marginTop: 12, padding: "14px 16px", background: "rgba(174,90,63,0.06)", border: `1px solid ${C.hair}`, borderRadius: 4, fontSize: 16.5, lineHeight: 1.5, color: C.ink },
  rulesH: { display: "block", fontSize: 18, marginBottom: 6 },

  foot: { marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  status: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase" },
  controls: { display: "flex", alignItems: "center", gap: 8 },
  toggle: { display: "flex", border: `1px solid ${C.hair}`, borderRadius: 2, overflow: "hidden" },
  toggleBtn: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "7px 12px", border: "none", background: "transparent", color: C.muted, cursor: "pointer" },
  toggleOn: { background: C.ink, color: C.bg },
  ghost: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 14px", border: `1px solid ${C.hair}`, background: "transparent", color: C.ink, cursor: "pointer", borderRadius: 2 },
  solid: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 14px", border: "none", background: C.terra, color: "#FBF7EF", cursor: "pointer", borderRadius: 2 },
};
