import React, { useState, useEffect } from "react";
import { useSouffleurLine } from "./souffleur-ai.js";
import { loadQuizHist, saveQuizHist, recordQuizAnswer, syncQuizHist, fetchQuizWeekStats, fetchQuizLeaderboard, useAccount, cloudReady } from "./storage.js";

/* ============================================================
   BEAU · Le quiz du Souffleur / The Prompter's quiz
   Bilingue (FR/EN) via la prop `lang`. Un dilemme par semaine.
   Des principes, jamais des conseils personnalisés.
   ============================================================ */

const C = {
  bg: "#F1EADD", paper: "#F4EEDF", panel: "#FBF6EA",
  ink: "#201E19", terra: "#A8553B", petrol: "#4E6E78",
  hair: "rgba(32,30,25,0.14)", muted: "#6B6557",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
@keyframes rise { from { transform: translateY(6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
`;

const UI = {
  fr: {
    title: "Le quiz du Souffleur", weeklyEyebrow: (w) => `DILEMME DE LA SEMAINE · ${w}`, randomEyebrow: "AU HASARD DES DILEMMES",
    voicePre: "Un dilemme, trois chemins. Choisissez, puis je vous dirai ce que j'en pense.",
    voicePost: "Voici mon penchant. Vous restez libre, naturellement.",
    leanTag: "penchant du Souffleur",
    streakNone: "Premier dilemme", streak: (n) => `${n} dilemme${n > 1 ? "s" : ""} médité${n > 1 ? "s" : ""}`,
    challenge: "Défier un ami", another: "Un autre, au hasard", backToWeek: "Revenir à la semaine",
    fine: "Le Souffleur partage des principes et des repères, jamais un conseil financier personnalisé. Vos décisions vous appartiennent.",
    challengeMsg: (q, opts) => `Dilemme du Souffleur · BEAU\n« ${q} »\n${opts.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join("\n")}\nVotre verdict ?`,
    copied: "Dilemme copié. Défiez un ami.",
    room: (p) => `${p} % de la salle`, roomTotal: (n) => `${n} réponse${n > 1 ? "s" : ""} cette semaine`,
    board: "Classement", boardTitle: "Les plus assidus", boardEmpty: "Personne encore. Soyez le premier.",
    boardStreak: (n) => `${n} sem. d'affilée`, boardAnswered: (n) => `${n} médité${n > 1 ? "s" : ""}`, close: "Fermer",
    syncHint: "Connectez-vous depuis l'entrée de la salle pour garder votre historique sur tous vos appareils.",
  },
  en: {
    title: "The Prompter's quiz", weeklyEyebrow: (w) => `DILEMMA OF THE WEEK · ${w}`, randomEyebrow: "DILEMMAS AT RANDOM",
    voicePre: "One dilemma, three paths. Choose, then I'll tell you what I make of it.",
    voicePost: "Here is where I lean. You remain free, of course.",
    leanTag: "the Prompter leans here",
    streakNone: "First dilemma", streak: (n) => `${n} dilemma${n > 1 ? "s" : ""} pondered`,
    challenge: "Challenge a friend", another: "Another, at random", backToWeek: "Back to the week",
    fine: "The Prompter shares principles and bearings, never personalised financial advice. Your decisions are your own.",
    challengeMsg: (q, opts) => `The Prompter's dilemma · BEAU\n“${q}”\n${opts.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join("\n")}\nYour verdict?`,
    copied: "Dilemma copied. Challenge a friend.",
    room: (p) => `${p}% of the room`, roomTotal: (n) => `${n} answer${n > 1 ? "s" : ""} this week`,
    board: "Leaderboard", boardTitle: "The most assiduous", boardEmpty: "No one yet. Be the first.",
    boardStreak: (n) => `${n} wk${n > 1 ? "s" : ""} in a row`, boardAnswered: (n) => `${n} pondered`, close: "Close",
    syncHint: "Sign in from the games room entrance to keep your history across devices.",
  },
};

/* banque bilingue : lean partagé, texte par langue */
const BANK = [
  { lean: 1,
    fr: { q: "Les marchés cèdent 20 % en quelques séances. Que fait, le plus souvent, l'investisseur aguerri à long horizon ?",
      options: ["Vendre pour stopper l'hémorragie", "Ne rien changer à son plan", "Renforcer si l'horizon le permet"],
      verdict: "Le Souffleur penche pour « ne rien changer ». Vendre dans la panique transforme une baisse passagère en perte définitive ; historiquement, les meilleures séances suivent de près les pires. Mais tout dépend de votre horizon et de votre capacité à dormir la nuit." },
    en: { q: "Markets fall 20% in a few sessions. What, most often, does the seasoned long-horizon investor do?",
      options: ["Sell to stop the bleeding", "Change nothing in the plan", "Add more if the horizon allows"],
      verdict: "The Prompter leans toward “change nothing.” Selling in panic turns a passing dip into a permanent loss; historically, the best sessions sit right beside the worst. But it all depends on your horizon and whether you can sleep at night." } },
  { lean: 2,
    fr: { q: "Un crédit immobilier à 1,8 % court encore dix ans, et vous disposez d'une somme. Rembourser par anticipation, ou investir ?",
      options: ["Rembourser : la dette pèse", "Investir : viser plus que 1,8 %", "Ça dépend"],
      verdict: "« Ça dépend » est la seule réponse honnête. Mathématiquement, si un placement raisonnable rapporte plus que 1,8 % net, on garde la dette. Mais le rendement n'est pas garanti, la dette si. Et la tranquillité d'esprit a une valeur que le tableur ignore." },
    en: { q: "A mortgage at 1.8% still runs ten years, and you have a lump sum. Repay early, or invest?",
      options: ["Repay: debt weighs", "Invest: aim above 1.8%", "It depends"],
      verdict: "“It depends” is the only honest answer. Mathematically, if a reasonable investment nets more than 1.8%, you keep the debt. But returns aren't guaranteed, the debt is. And peace of mind has a value the spreadsheet ignores." } },
  { lean: 2,
    fr: { q: "Deux fonds identiques. L'un prélève 0,3 % de frais par an, l'autre 1,5 %. Sur trente ans, l'écart final est…",
      options: ["Négligeable", "Notable", "Considérable"],
      verdict: "Considérable. 1,2 % de frais par an, capitalisés sur trente ans, peuvent absorber un tiers du capital final. Les frais sont la seule variable que vous maîtrisez vraiment : le Souffleur les surveille de près." },
    en: { q: "Two identical funds. One charges 0.3% a year, the other 1.5%. Over thirty years, the final gap is…",
      options: ["Negligible", "Notable", "Considerable"],
      verdict: "Considerable. 1.2% in annual fees, compounded over thirty years, can swallow a third of the final capital. Fees are the one variable you truly control: the Prompter watches them closely." } },
  { lean: 1,
    fr: { q: "Avant d'investir le moindre euro, quelle est la première fondation à poser ?",
      options: ["Choisir les bons titres", "Un matelas de sécurité liquide", "Optimiser la fiscalité"],
      verdict: "Le matelas d'abord. Quelques mois de dépenses, disponibles immédiatement, évitent de vendre ses placements au pire moment quand la vie surprend. On bâtit la toiture après les fondations, pas avant." },
    en: { q: "Before investing a single euro, what is the first foundation to lay?",
      options: ["Pick the right stocks", "A liquid safety cushion", "Optimise the tax angle"],
      verdict: "The cushion first. A few months of expenses, instantly available, spare you from selling investments at the worst moment when life surprises you. You build the roof after the foundations, not before." } },
  { lean: 1,
    fr: { q: "« Acheter au plus bas » : stratégie ou mirage ?",
      options: ["Stratégie, avec de la patience", "Mirage : nul ne sonne la cloche", "Les deux"],
      verdict: "Surtout un mirage. Personne ne sonne la cloche au point bas, et l'attente coûte souvent plus que la baisse évitée. Le temps passé sur le marché bat, en général, le temps à choisir le moment d'entrer." },
    en: { q: "“Buy the dip at the bottom”: strategy or mirage?",
      options: ["Strategy, with patience", "Mirage: no one rings the bell", "Both"],
      verdict: "Mostly a mirage. No one rings a bell at the low, and waiting often costs more than the drop avoided. Time in the market generally beats timing the market." } },
  { lean: 1,
    fr: { q: "L'inflation tourne autour de 3 %. Laisser dormir une grosse réserve en compte courant, c'est…",
      options: ["Prudent", "Une érosion silencieuse", "Sans importance"],
      verdict: "Une érosion silencieuse. À 3 % l'an, le pouvoir d'achat d'une somme inerte fond d'environ un quart en dix ans. Garder du liquide pour la sécurité, oui ; en garder trop, c'est payer une assurance hors de prix." },
    en: { q: "Inflation runs near 3%. Leaving a large reserve idle in a current account is…",
      options: ["Prudent", "A silent erosion", "Of no consequence"],
      verdict: "A silent erosion. At 3% a year, the purchasing power of idle money melts by about a quarter in ten years. Keeping cash for safety, yes; keeping too much is paying for overpriced insurance." } },
  { lean: 1,
    fr: { q: "La diversification, pour le Souffleur, c'est avant tout…",
      options: ["Multiplier les lignes", "Répartir des risques non corrélés", "Suivre les modes"],
      verdict: "Répartir des risques qui ne montent pas et ne chutent pas ensemble. Détenir vingt valeurs du même secteur n'est pas se diversifier, c'est se concentrer en croyant le contraire." },
    en: { q: "Diversification, for the Prompter, is above all…",
      options: ["Holding many lines", "Spreading uncorrelated risks", "Following the fashions"],
      verdict: "Spreading risks that don't rise and fall together. Holding twenty names in the same sector isn't diversifying, it's concentrating while believing the opposite." } },
  { lean: 1,
    fr: { q: "On vous propose un rendement « garanti » bien supérieur au marché, sans risque apparent. Réflexe ?",
      options: ["Saisir l'occasion vite", "Se méfier et vérifier", "Demander à un ami"],
      verdict: "Se méfier, toujours. Rendement élevé et risque nul ne coexistent pas durablement ; quand l'un est promis sans l'autre, c'est souvent qu'un risque est caché, ou que c'est une fable. Le Souffleur n'aime pas les contes trop beaux." },
    en: { q: "You're offered a “guaranteed” return well above the market, with no apparent risk. Reflex?",
      options: ["Seize it quickly", "Be wary and verify", "Ask a friend"],
      verdict: "Be wary, always. High return and zero risk don't coexist for long; when one is promised without the other, a risk is usually hidden, or it's a fable. The Prompter distrusts tales too good to be true." } },
  { lean: 1,
    fr: { q: "L'effet de levier (emprunter pour investir) fait quoi, au juste ?",
      options: ["Multiplie les gains", "Multiplie gains ET pertes", "Réduit le risque"],
      verdict: "Il amplifie dans les deux sens. Le levier flatte quand tout monte et punit durement quand ça tourne, y compris jusqu'à devoir vendre au plus mauvais moment. Outil puissant, à manier les yeux ouverts." },
    en: { q: "Leverage (borrowing to invest) does what, exactly?",
      options: ["Multiplies gains", "Multiplies gains AND losses", "Reduces risk"],
      verdict: "It amplifies both ways. Leverage flatters when everything rises and punishes hard when it turns, even forcing a sale at the worst moment. A powerful tool, to be handled with open eyes." } },
  { lean: 1,
    fr: { q: "Votre portefeuille a une devise étrangère qui pèse lourd. Le risque de change, c'est…",
      options: ["Un détail", "Un vrai facteur à mesurer", "Une opportunité sûre"],
      verdict: "Un vrai facteur. Une performance brillante dans une devise peut s'effacer une fois reconvertie. Le change n'est ni à fuir ni à ignorer : il se mesure, et parfois se couvre, selon vos besoins réels." },
    en: { q: "Your portfolio carries a heavy weight in a foreign currency. Currency risk is…",
      options: ["A detail", "A real factor to measure", "A sure opportunity"],
      verdict: "A real factor. A brilliant return in one currency can vanish once converted back. Currency is neither to flee nor to ignore: it's measured, and sometimes hedged, according to your real needs." } },
  { lean: 0,
    fr: { q: "Après trois belles années, on est tenté de croire que ça continuera. Ce biais s'appelle…",
      options: ["Le biais de récence", "La prudence", "La lucidité"],
      verdict: "Le biais de récence : projeter le passé proche sur l'avenir. Les arbres ne montent pas jusqu'au ciel ; les meilleures années passées ne sont pas une promesse. Le Souffleur relit ses convictions, surtout quand tout va bien." },
    en: { q: "After three fine years, one is tempted to believe it will continue. This bias is called…",
      options: ["Recency bias", "Prudence", "Clear-sightedness"],
      verdict: "Recency bias: projecting the recent past onto the future. Trees don't grow to the sky; the best past years are no promise. The Prompter rereads his convictions, especially when all is going well." } },
  { lean: 1,
    fr: { q: "Pour faire travailler les intérêts composés, l'ingrédient décisif est…",
      options: ["Le bon timing", "Le temps", "Un gros capital de départ"],
      verdict: "Le temps, avant tout. Les intérêts composés récompensent la durée plus que la mise initiale ou le moment d'entrée : commencer tôt et laisser faire bat souvent commencer fort et s'impatienter." },
    en: { q: "To put compound interest to work, the decisive ingredient is…",
      options: ["The right timing", "Time", "A large starting capital"],
      verdict: "Time, above all. Compound interest rewards duration more than the initial sum or the entry point: starting early and letting it run often beats starting big and growing impatient." } },
];

/* semaine ISO : le jeudi de la semaine donne l'année (fin décembre peut être la W1 suivante) */
function isoWeekYear(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / 86400000 + 1) / 7) };
}
const isoWeek = (d) => isoWeekYear(d).week;
const weekKey = () => { const { year, week } = isoWeekYear(new Date()); return `${year}-W${week}`; };
const weeklyIndex = () => isoWeek(new Date()) % BANK.length;


export default function BeauQuizSouffleur({ lang = "fr" }) {
  const u = UI[lang] || UI.fr;
  const user = useAccount();
  const [hist, setHist] = useState(loadQuizHist);
  const [idx, setIdx] = useState(weeklyIndex);
  const [weekly, setWeekly] = useState(true);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash] = useState("");
  const [room, setRoom] = useState(null);
  const [board, setBoard] = useState(null);
  const [roomTick, setRoomTick] = useState(0);

  useEffect(() => { saveQuizHist(hist); }, [hist]);
  /* compte connecté : fusion de l'historique de l'appareil et du compte */
  useEffect(() => {
    if (!user) return;
    let live = true;
    syncQuizHist(loadQuizHist()).then((merged) => { if (live) setHist(merged); });
    return () => { live = false; };
  }, [user]);
  const raw = BANK[idx];
  const item = raw[lang] || raw.fr;
  const wk = weekKey();
  const answeredThisWeek = !!hist[wk];
  const streak = Object.keys(hist).length;

  useEffect(() => {
    if (weekly && answeredThisWeek) { setPicked(hist[wk].pick); setRevealed(true); }
  }, [weekly, answeredThisWeek]); // eslint-disable-line

  /* répartition de la salle, une fois la réponse de la semaine donnée */
  useEffect(() => {
    if (!cloudReady || !weekly || !revealed) { setRoom(null); return; }
    let live = true;
    fetchQuizWeekStats(wk).then((c) => { if (live) setRoom(c); });
    return () => { live = false; };
  }, [weekly, revealed, wk, roomTick, user]);
  /* réaction du Souffleur au choix (Mistral si branché, sinon la phrase écrite) */
  const postLine = useSouffleurLine(
    revealed && picked != null ? { kind: "quiz", lang, game: "quiz", context: { question: item.q, options: item.options, pick: item.options[picked], leaning: item.options[raw.lean], verdict: item.verdict } } : null,
    u.voicePost,
  );
  const roomTotal = room ? room.reduce((a, b) => a + b, 0) : 0;
  const openBoard = () => { setBoard("loading"); fetchQuizLeaderboard().then((rows) => setBoard(rows || [])); };

  const choose = (i) => {
    if (revealed) return;
    setPicked(i); setRevealed(true);
    if (weekly) { setHist((h) => ({ ...h, [wk]: { pick: i, idx } })); recordQuizAnswer(wk, { pick: i, idx }).then(() => setRoomTick((n) => n + 1)); }
  };
  const randomOne = () => { let n = idx; while (n === idx) n = Math.floor(Math.random() * BANK.length); setIdx(n); setWeekly(false); setPicked(null); setRevealed(false); };
  const backToWeek = () => { setIdx(weeklyIndex()); setWeekly(true); setPicked(null); setRevealed(false); };
  const challenge = () => {
    try { navigator.clipboard.writeText(u.challengeMsg(item.q, item.options)).then(() => { setFlash(u.copied); setTimeout(() => setFlash(""), 2200); }); } catch (e) {}
  };

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.title}>{u.title}</div>
          <div style={S.eyebrow}>{weekly ? u.weeklyEyebrow(wk) : u.randomEyebrow}</div>
          <div style={S.hair} />
        </header>

        <div style={S.voice}>
          <span style={S.voiceMark}>—</span>
          <span style={S.voiceText}>{revealed ? postLine : u.voicePre}</span>
        </div>

        <div style={S.card}>
          <div style={S.q}>{item.q}</div>
          <div style={S.opts}>
            {item.options.map((o, i) => {
              const isPick = picked === i;
              const isLean = revealed && raw.lean === i;
              return (
                <button key={i} onClick={() => choose(i)} disabled={revealed}
                  style={{ ...S.opt, ...(isPick ? S.optPick : {}), ...(isLean ? S.optLean : {}) }}>
                  <span style={S.optLetter}>{String.fromCharCode(65 + i)}</span>
                  <span>{o}</span>
                  {(isLean || (room && roomTotal > 0)) && (
                    <span style={S.optSide}>
                      {isLean && <span style={S.leanTag}>{u.leanTag}</span>}
                      {room && roomTotal > 0 && <span style={S.roomPct}>{u.room(Math.round((room[i] / roomTotal) * 100))}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {room && roomTotal > 0 && <div style={S.roomTotal}>{u.roomTotal(roomTotal)}</div>}
          {revealed && (
            <div style={S.verdict}><span style={S.vMark}>—</span><span style={S.vText}>{item.verdict}</span></div>
          )}
        </div>

        <div style={S.foot}>
          <span style={S.streak}>{streak > 0 ? u.streak(streak) : u.streakNone}</span>
          <div style={S.actions}>
            {revealed && <button onClick={challenge} style={S.ghost}>{u.challenge}</button>}
            {cloudReady && <button onClick={openBoard} style={S.ghost}>{u.board}</button>}
            {weekly ? <button onClick={randomOne} style={S.ghost}>{u.another}</button>
                    : <button onClick={backToWeek} style={S.ghost}>{u.backToWeek}</button>}
          </div>
        </div>

        {board && (
          <div style={S.board}>
            <div style={S.boardHead}><span style={S.boardTitle}>{u.boardTitle}</span><button onClick={() => setBoard(null)} style={S.ghost}>{u.close}</button></div>
            {board === "loading" ? <div style={S.boardEmpty}>…</div>
              : board.length === 0 ? <div style={S.boardEmpty}>{u.boardEmpty}</div>
              : board.map((r, i) => (
                <div key={i} style={S.boardRow}>
                  <span style={S.boardRank}>{i + 1}</span>
                  <span style={S.boardName}>{r.display_name}</span>
                  <span style={S.boardMeta}>{u.boardStreak(Number(r.streak))} · {u.boardAnswered(Number(r.answered))}</span>
                </div>
              ))}
          </div>
        )}

        <div style={S.fine}>{u.fine}</div>
        {cloudReady && !user && <div style={S.fine}>{u.syncHint}</div>}
        {flash && <div style={S.flash}>{flash}</div>}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`, display: "flex", justifyContent: "center", padding: "44px 16px", color: C.ink, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  shell: { width: "min(94vw, 560px)" },
  head: { textAlign: "center", marginBottom: 14 },
  brand: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: "0.46em", paddingLeft: "0.46em" },
  title: { fontSize: 38, fontStyle: "italic", marginTop: 10, lineHeight: 1 },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.28em", color: C.muted, marginTop: 9, paddingLeft: "0.28em" },
  hair: { height: 1, background: C.hair, margin: "16px auto 0" },
  voice: { display: "flex", gap: 10, alignItems: "baseline", padding: "14px 2px", margin: "6px 0 14px", borderBottom: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 19, lineHeight: 1.35 },
  card: { background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "22px 20px" },
  q: { fontSize: 23, lineHeight: 1.35, marginBottom: 16 },
  opts: { display: "flex", flexDirection: "column", gap: 9 },
  opt: { position: "relative", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderWidth: 1, borderStyle: "solid", borderColor: C.hair, borderRadius: 4, background: C.paper, color: C.ink, fontSize: 18.5, fontFamily: "'Cormorant Garamond', serif", cursor: "pointer", transition: "all 0.15s" },
  optPick: { borderColor: C.ink, boxShadow: "inset 0 0 0 1px " + C.ink },
  optLean: { background: "rgba(78,110,120,0.10)", borderColor: C.petrol },
  optLetter: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11, letterSpacing: "0.1em", color: C.muted, width: 16 },
  optSide: { marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  roomPct: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.06em", color: C.muted, whiteSpace: "nowrap" },
  roomTotal: { marginTop: 10, fontStyle: "italic", fontSize: 14.5, color: C.muted, textAlign: "right" },
  board: { marginTop: 16, background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "14px 16px", animation: "rise 0.3s ease" },
  boardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  boardTitle: { fontStyle: "italic", fontSize: 21 },
  boardEmpty: { fontStyle: "italic", color: C.muted, fontSize: 16.5, padding: "8px 0" },
  boardRow: { display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: `1px solid ${C.hair}` },
  boardRank: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11, color: C.terra, width: 18 },
  boardName: { fontSize: 18.5 },
  boardMeta: { marginLeft: "auto", fontStyle: "italic", fontSize: 14.5, color: C.muted, textAlign: "right" },
  leanTag: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: C.petrol },
  verdict: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.hair}`, animation: "rise 0.3s ease" },
  vMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  vText: { fontStyle: "italic", fontSize: 18.5, lineHeight: 1.5 },
  foot: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 16 },
  streak: { fontStyle: "italic", fontSize: 16, color: C.muted },
  actions: { display: "flex", gap: 8 },
  ghost: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 13px", border: `1px solid ${C.hair}`, borderRadius: 999, background: "transparent", color: C.ink, cursor: "pointer" },
  fine: { fontSize: 14.5, fontStyle: "italic", color: C.muted, lineHeight: 1.4, marginTop: 16, textAlign: "center" },
  flash: { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.bg, padding: "10px 18px", borderRadius: 999, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 12, letterSpacing: "0.04em", boxShadow: "0 12px 30px -12px rgba(32,30,25,0.6)" },
};
