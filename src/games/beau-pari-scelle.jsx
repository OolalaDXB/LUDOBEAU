import React, { useState, useEffect } from "react";
import { loadBets, saveBets, syncBets, pushBetSeal, pushBetReveal, pushBetOutcome, deleteBetRemote, fetchWagerWall, useAccount, cloudReady } from "./storage.js";

/* ============================================================
   BEAU · Le pari scellé / The sealed wager
   Bilingue (FR/EN) via la prop `lang`. Commit-reveal : fonctionne
   sans serveur ; avec un compte, le sceau est publié et la
   révélation vérifiée par la base (voir storage.js).
   ============================================================ */

const C = {
  bg: "#F1EADD", paper: "#F4EEDF", panel: "#FBF6EA",
  ink: "#201E19", terra: "#A8553B", petrol: "#4E6E78",
  hair: "rgba(32,30,25,0.14)", muted: "#6B6557", good: "#4E6E78", bad: "#A8553B",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
@keyframes sealIn { from { transform: scale(0.9); opacity: 0 } to { transform: scale(1); opacity: 1 } }
`;

const STR = {
  fr: {
    title: "Le pari scellé", eyebrow: "UNE CONVICTION, FIGÉE DANS LE TEMPS",
    tabNew: "Nouveau", tabMine: "Mes paris", tabVerify: "Vérifier",
    voiceIdle: "Une conviction ? Engagez-la. On verra, le moment venu, qui avait l'œil juste.",
    needPred: "Écrivez d'abord votre prédiction : une phrase claire, vérifiable le jour dit.",
    needDate: "Fixez une échéance : la date où l'on saura.",
    sealedLine: "Scellé. Votre prédiction est figée. Personne ne peut la lire ni la modifier tant que vous ne la révélez pas.",
    revealedLine: "Révélé. La preuve copiée contient tout pour confirmer que rien n'a bougé depuis le jour du scellement.",
    okLine: "Authentique. La prédiction correspond exactement au sceau, sans aucune retouche.",
    koLine: "Sceau non concordant. Le texte a été modifié après coup, ou la preuve est corrompue.",
    labelPred: "Votre prédiction", phPred: "Ex. : l'or dépassera 3 000 $ l'once avant la fin de l'année.",
    labelDeadline: "Échéance", labelStake: "Mise (symbolique)", phStake: "un déjeuner, l'honneur…",
    sealBtn: "Sceller le pari", sealing: "Scellement…",
    fineNew: "Mises symboliques : l'honneur, un café. BEAU n'est pas une salle de paris. Rien ne quitte votre appareil.",
    empty: "Aucun pari pour l'instant. Le premier engagement se prend dans l'onglet « Nouveau ».",
    sealed: "Scellé", revealed: "Révélé", deadlineReached: "échéance atteinte · ", stake: "Mise : ", seal: "Sceau ",
    outcome: "Issue : ", shareSeal: "Partager le sceau", revealShare: "Révéler & partager la preuve", recopy: "Re-copier la preuve",
    won: "Gagné", lost: "Perdu", del: "Supprimer",
    labelToken: "Coller une preuve (commence par BEAU1:)", verifyBtn: "Vérifier l'authenticité",
    authentic: "✓ Authentique · rien n'a été retouché", notMatch: "✗ Non concordant",
    badFormat: "Format non reconnu. Collez une preuve commençant par BEAU1:", incomplete: "Preuve incomplète.",
    vPred: "Prédiction", vSealed: "Scellé le", vDeadline: "Échéance", vStake: "Mise", vSeal: "Sceau",
    fineVerify: "Le pari et son sel vous parviennent dans la preuve. BEAU recalcule le sceau et confirme qu'il correspond mot pour mot.",
    copiedSeal: "Sceau copié. Partagez-le.", copiedProof: "Preuve copiée. Votre ami peut la vérifier dans l'onglet Vérifier.",
    shareSealMsg: (h, d, s) => `Pari scellé · BEAU\nSceau : ${h}\nÉchéance : ${d}${s ? `\nMise : ${s}` : ""}\nLe contenu sera révélé le moment venu, et vérifiable.`,
    fineCloud: "Mises symboliques : l'honneur, un café. BEAU n'est pas une salle de paris. Seul le sceau rejoint votre compte ; la prédiction reste sur cet appareil jusqu'à ce que vous la révéliez.",
    tabWall: "Le mur", wallLine: "Les paris révélés de la salle. Chacun a été vérifié contre son sceau.",
    wallEmpty: "Aucun pari révélé pour l'instant.", wallBy: (n) => `par ${n}`, wallOffline: "Le mur s'affiche quand la salle est reliée à sa base.",
    elsewhere: "Scellé sur un autre appareil : la prédiction s'y trouve, révélez-la depuis là-bas.",
    locale: "fr-FR", dash: "—",
  },
  en: {
    title: "The sealed wager", eyebrow: "A CONVICTION, FIXED IN TIME",
    tabNew: "New", tabMine: "My wagers", tabVerify: "Verify",
    voiceIdle: "A conviction? Commit to it. When the day comes, we'll see who had the keener eye.",
    needPred: "Write your prediction first: one clear sentence, checkable on the day.",
    needDate: "Set a deadline: the date we'll know.",
    sealedLine: "Sealed. Your prediction is locked. No one can read or change it until you reveal it.",
    revealedLine: "Revealed. The copied proof holds everything needed to confirm nothing moved since you sealed it.",
    okLine: "Authentic. The prediction matches the seal exactly, untouched.",
    koLine: "Seal mismatch. The text was altered afterwards, or the proof is corrupted.",
    labelPred: "Your prediction", phPred: "e.g. gold will pass $3,000 an ounce before year's end.",
    labelDeadline: "Deadline", labelStake: "Stake (symbolic)", phStake: "a lunch, your honour…",
    sealBtn: "Seal the wager", sealing: "Sealing…",
    fineNew: "Symbolic stakes: your honour, a coffee. BEAU is not a betting house. Nothing leaves your device.",
    empty: "No wagers yet. The first commitment is made in the “New” tab.",
    sealed: "Sealed", revealed: "Revealed", deadlineReached: "deadline reached · ", stake: "Stake: ", seal: "Seal ",
    outcome: "Outcome: ", shareSeal: "Share the seal", revealShare: "Reveal & share the proof", recopy: "Re-copy the proof",
    won: "Won", lost: "Lost", del: "Delete",
    labelToken: "Paste a proof (starts with BEAU1:)", verifyBtn: "Verify authenticity",
    authentic: "✓ Authentic · nothing was altered", notMatch: "✗ Mismatch",
    badFormat: "Unrecognised format. Paste a proof starting with BEAU1:", incomplete: "Incomplete proof.",
    vPred: "Prediction", vSealed: "Sealed on", vDeadline: "Deadline", vStake: "Stake", vSeal: "Seal",
    fineVerify: "The wager and its salt reach you inside the proof. BEAU recomputes the seal and confirms it matches word for word.",
    copiedSeal: "Seal copied. Share it.", copiedProof: "Proof copied. Your friend can verify it in the Verify tab.",
    shareSealMsg: (h, d, s) => `Sealed wager · BEAU\nSeal: ${h}\nDeadline: ${d}${s ? `\nStake: ${s}` : ""}\nThe content will be revealed in time, and verifiable.`,
    fineCloud: "Symbolic stakes: your honour, a coffee. BEAU is not a betting house. Only the seal reaches your account; the prediction stays on this device until you reveal it.",
    tabWall: "The wall", wallLine: "The room's revealed wagers. Each one was checked against its seal.",
    wallEmpty: "No revealed wagers yet.", wallBy: (n) => `by ${n}`, wallOffline: "The wall appears once the room is linked to its database.",
    elsewhere: "Sealed on another device: the prediction lives there, reveal it from there.",
    locale: "en-GB", dash: "—",
  },
};

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function makeSalt() {
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const canonical = (p, d, c, s) => `${p.trim()}\u241F${d}\u241F${c}\u241F${s}`;
function b64enc(obj) { return "BEAU1:" + btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function b64dec(tok) { return JSON.parse(decodeURIComponent(escape(atob(tok.trim().replace(/^BEAU1:/, ""))))); }

const shortSeal = (h) => h.slice(0, 8) + "·" + h.slice(8, 16) + "·" + h.slice(-8);
function copy(text, done) { try { navigator.clipboard.writeText(text).then(() => done && done(), () => done && done()); } catch (e) { done && done(); } }

export default function BeauPariScelle({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const fmtDate = (iso) => { if (!iso) return "—"; return new Date(iso).toLocaleDateString(t.locale, { day: "2-digit", month: "long", year: "numeric" }); };

  const [tab, setTab] = useState("new");
  const [bets, setBets] = useState(loadBets);
  const [pred, setPred] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stake, setStake] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [verifyTok, setVerifyTok] = useState("");
  const [verifyRes, setVerifyRes] = useState(null);
  const [line, setLine] = useState(t.voiceIdle);
  const [wall, setWall] = useState(null);
  const user = useAccount();

  useEffect(() => { saveBets(bets); }, [bets]);
  /* compte connecté : réconciliation des sceaux et révélations */
  useEffect(() => {
    if (!user) return;
    let live = true;
    syncBets(loadBets()).then((merged) => { if (live) setBets(merged); });
    return () => { live = false; };
  }, [user]);
  useEffect(() => {
    if (tab !== "wall" || !cloudReady) return;
    let live = true;
    setWall(null);
    fetchWagerWall().then((rows) => { if (live) setWall(rows || []); });
    return () => { live = false; };
  }, [tab]);
  useEffect(() => { setLine((cur) => (cur === STR.fr.voiceIdle || cur === STR.en.voiceIdle) ? t.voiceIdle : cur); }, [lang]); // eslint-disable-line
  const toast = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2200); };

  const seal = async () => {
    if (!pred.trim()) { setLine(t.needPred); return; }
    if (!deadline) { setLine(t.needDate); return; }
    setBusy(true);
    const createdAt = new Date().toISOString();
    const salt = makeSalt();
    const hash = await sha256Hex(canonical(pred, deadline, createdAt, salt));
    const bet = { id: createdAt + "-" + salt.slice(0, 4), pred: pred.trim(), deadline, stake: stake.trim(), createdAt, salt, hash, revealed: false, outcome: null };
    setBets((b) => [bet, ...b]);
    pushBetSeal(bet);
    setPred(""); setStake(""); setBusy(false); setTab("mine");
    setLine(t.sealedLine);
  };
  const shareSeal = (bet) => copy(t.shareSealMsg(bet.hash, fmtDate(bet.deadline), bet.stake), () => toast(t.copiedSeal));
  const revealShare = (bet) => {
    if (!bet.pred || !bet.salt) { setLine(t.elsewhere); return; }
    if (!bet.revealed) pushBetReveal(bet);
    const tok = b64enc({ p: bet.pred, d: bet.deadline, c: bet.createdAt, s: bet.salt, h: bet.hash, m: bet.stake });
    setBets((b) => b.map((x) => (x.id === bet.id ? { ...x, revealed: true } : x)));
    copy(tok, () => toast(t.copiedProof));
    setLine(t.revealedLine);
  };
  const setOutcome = (bet, o) => { setBets((b) => b.map((x) => (x.id === bet.id ? { ...x, outcome: o } : x))); pushBetOutcome({ ...bet, outcome: o }); };
  const remove = (bet) => { setBets((b) => b.filter((x) => x.id !== bet.id)); deleteBetRemote(bet); };

  const doVerify = async () => {
    setVerifyRes(null);
    let o;
    try { o = b64dec(verifyTok); } catch (e) { setVerifyRes({ ok: false, reason: t.badFormat }); return; }
    if (!o || !o.p || !o.h) { setVerifyRes({ ok: false, reason: t.incomplete }); return; }
    const recomputed = await sha256Hex(canonical(o.p, o.d, o.c, o.s));
    const ok = recomputed === o.h;
    setVerifyRes({ ok, pred: o.p, deadline: o.d, createdAt: o.c, stake: o.m, seal: o.h });
    setLine(ok ? t.okLine : t.koLine);
  };

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.brand}>BEAU</div>
          <div style={S.title}>{t.title}</div>
          <div style={S.eyebrow}>{t.eyebrow}</div>
          <div style={S.hair} />
        </header>

        <div style={S.tabs}>
          <button onClick={() => setTab("new")} style={{ ...S.tab, ...(tab === "new" ? S.tabOn : {}) }}>{t.tabNew}</button>
          <button onClick={() => setTab("mine")} style={{ ...S.tab, ...(tab === "mine" ? S.tabOn : {}) }}>{t.tabMine}{bets.length ? ` · ${bets.length}` : ""}</button>
          <button onClick={() => setTab("verify")} style={{ ...S.tab, ...(tab === "verify" ? S.tabOn : {}) }}>{t.tabVerify}</button>
          {cloudReady && <button onClick={() => setTab("wall")} style={{ ...S.tab, ...(tab === "wall" ? S.tabOn : {}) }}>{t.tabWall}</button>}
        </div>

        <div style={S.voice}><span style={S.voiceMark}>{t.dash}</span><span style={S.voiceText}>{line}</span></div>

        {tab === "new" && (
          <div style={S.card}>
            <label style={S.label}>{t.labelPred}</label>
            <textarea value={pred} onChange={(e) => setPred(e.target.value)} rows={3} placeholder={t.phPred} style={S.textarea} />
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>{t.labelDeadline}</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>{t.labelStake}</label>
                <input value={stake} onChange={(e) => setStake(e.target.value)} placeholder={t.phStake} style={S.input} />
              </div>
            </div>
            <button onClick={seal} disabled={busy} style={S.seal}>{busy ? t.sealing : t.sealBtn}</button>
            <div style={S.fine}>{user ? t.fineCloud : t.fineNew}</div>
          </div>
        )}

        {tab === "mine" && (
          <div style={S.list}>
            {bets.length === 0 && <div style={S.empty}>{t.empty}</div>}
            {bets.map((bet) => {
              const past = bet.deadline && new Date(bet.deadline) <= new Date();
              return (
                <div key={bet.id} style={S.bet}>
                  <div style={S.betTop}>
                    <span style={{ ...S.badge, ...(bet.revealed ? S.badgeRev : {}) }}>{bet.revealed ? t.revealed : t.sealed}</span>
                    <span style={S.betDate}>{past ? t.deadlineReached : ""}{fmtDate(bet.deadline)}</span>
                  </div>
                  {bet.pred ? <div style={S.betPred}>{bet.pred}</div> : <div style={S.fine}>{t.elsewhere}</div>}
                  {bet.stake && <div style={S.betStake}>{t.stake}{bet.stake}</div>}
                  <div style={S.sealLine} title={bet.hash}>{t.seal}{shortSeal(bet.hash)}</div>
                  {bet.outcome && <div style={{ ...S.outcome, color: bet.outcome === "won" ? C.good : C.bad }}>{t.outcome}{bet.outcome === "won" ? t.won : t.lost}</div>}
                  <div style={S.betActions}>
                    <button onClick={() => shareSeal(bet)} style={S.ghost}>{t.shareSeal}</button>
                    {bet.pred && <button onClick={() => revealShare(bet)} style={S.ghost}>{bet.revealed ? t.recopy : t.revealShare}</button>}
                    {past && !bet.outcome && (<>
                      <button onClick={() => setOutcome(bet, "won")} style={S.win}>{t.won}</button>
                      <button onClick={() => setOutcome(bet, "lost")} style={S.lose}>{t.lost}</button>
                    </>)}
                    <button onClick={() => remove(bet)} style={S.del}>{t.del}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "verify" && (
          <div style={S.card}>
            <label style={S.label}>{t.labelToken}</label>
            <textarea value={verifyTok} onChange={(e) => setVerifyTok(e.target.value)} rows={3} placeholder="BEAU1:…" style={S.textarea} />
            <button onClick={doVerify} style={S.seal}>{t.verifyBtn}</button>
            {verifyRes && (
              <div style={{ ...S.verify, borderColor: verifyRes.ok ? C.good : C.bad }}>
                <div style={{ ...S.verdict, color: verifyRes.ok ? C.good : C.bad }}>{verifyRes.ok ? t.authentic : t.notMatch}</div>
                {verifyRes.reason && <div style={S.fine}>{verifyRes.reason}</div>}
                {verifyRes.pred && (<>
                  <div style={S.vRow}><span style={S.vKey}>{t.vPred}</span><span>{verifyRes.pred}</span></div>
                  <div style={S.vRow}><span style={S.vKey}>{t.vSealed}</span><span>{fmtDate(verifyRes.createdAt)}</span></div>
                  <div style={S.vRow}><span style={S.vKey}>{t.vDeadline}</span><span>{fmtDate(verifyRes.deadline)}</span></div>
                  {verifyRes.stake && <div style={S.vRow}><span style={S.vKey}>{t.vStake}</span><span>{verifyRes.stake}</span></div>}
                  <div style={S.vRow}><span style={S.vKey}>{t.vSeal}</span><span style={S.mono}>{shortSeal(verifyRes.seal)}</span></div>
                </>)}
              </div>
            )}
            <div style={S.fine}>{t.fineVerify}</div>
          </div>
        )}

        {tab === "wall" && (
          <div style={S.list}>
            <div style={{ ...S.fine, textAlign: "center" }}>{cloudReady ? t.wallLine : t.wallOffline}</div>
            {wall === null && cloudReady && <div style={S.empty}>…</div>}
            {wall && wall.length === 0 && <div style={S.empty}>{t.wallEmpty}</div>}
            {wall && wall.map((w) => (
              <div key={w.seal_hash} style={S.bet}>
                <div style={S.betTop}>
                  <span style={{ ...S.badge, ...S.badgeRev }}>{t.revealed}</span>
                  <span style={S.betDate}>{fmtDate(w.deadline)}</span>
                </div>
                <div style={S.betPred}>{w.prediction}</div>
                <div style={S.betStake}>{t.wallBy(w.display_name)}{w.stake ? ` · ${t.stake}${w.stake}` : ""}</div>
                <div style={S.sealLine} title={w.seal_hash}>{t.seal}{shortSeal(w.seal_hash)}</div>
                {w.outcome && <div style={{ ...S.outcome, color: w.outcome === "won" ? C.good : C.bad }}>{t.outcome}{w.outcome === "won" ? t.won : t.lost}</div>}
              </div>
            ))}
          </div>
        )}

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
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.muted, marginTop: 9, paddingLeft: "0.3em" },
  hair: { height: 1, background: C.hair, margin: "16px auto 0" },
  tabs: { display: "flex", gap: 6, justifyContent: "center", margin: "18px 0 4px" },
  tab: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 14px", border: `1px solid ${C.hair}`, borderRadius: 999, background: "transparent", color: C.muted, cursor: "pointer" },
  tabOn: { background: C.ink, color: C.bg, borderColor: C.ink },
  voice: { display: "flex", gap: 10, alignItems: "baseline", padding: "14px 2px", margin: "8px 0 14px", borderBottom: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 },
  voiceText: { fontStyle: "italic", fontSize: 19, lineHeight: 1.35 },
  card: { background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 },
  label: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted },
  textarea: { width: "100%", boxSizing: "border-box", padding: "12px 13px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.paper, fontSize: 18, color: C.ink, fontFamily: "'Cormorant Garamond', serif", resize: "vertical", lineHeight: 1.4 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.paper, fontSize: 17, color: C.ink, fontFamily: "'Cormorant Garamond', serif" },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  seal: { marginTop: 4, padding: "13px", border: "none", borderRadius: 3, background: C.terra, color: "#FBF7EF", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer" },
  fine: { fontSize: 14.5, fontStyle: "italic", color: C.muted, lineHeight: 1.4 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  empty: { fontStyle: "italic", color: C.muted, fontSize: 18, textAlign: "center", padding: "26px 10px" },
  bet: { background: C.panel, border: `1px solid ${C.hair}`, borderRadius: 6, padding: "16px 16px", animation: "sealIn 0.3s ease" },
  betTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  badge: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 999, background: "rgba(168,85,59,0.12)", color: C.terra },
  badgeRev: { background: "rgba(78,110,120,0.14)", color: C.petrol },
  betDate: { fontSize: 14.5, fontStyle: "italic", color: C.muted },
  betPred: { fontSize: 20, lineHeight: 1.3, margin: "2px 0" },
  betStake: { fontSize: 15.5, fontStyle: "italic", color: C.muted, marginTop: 2 },
  sealLine: { fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: C.muted, marginTop: 8, letterSpacing: "0.02em" },
  outcome: { fontSize: 16, fontStyle: "italic", marginTop: 4 },
  betActions: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 },
  ghost: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 11px", border: `1px solid ${C.hair}`, borderRadius: 2, background: "transparent", color: C.ink, cursor: "pointer" },
  win: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 11px", border: "none", borderRadius: 2, background: C.petrol, color: "#FBF7EF", cursor: "pointer" },
  lose: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 11px", border: "none", borderRadius: 2, background: C.terra, color: "#FBF7EF", cursor: "pointer" },
  del: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 11px", border: "none", borderRadius: 2, background: "transparent", color: C.muted, cursor: "pointer", marginLeft: "auto" },
  verify: { marginTop: 8, padding: "14px 14px", borderWidth: 1, borderStyle: "solid", borderColor: C.hair, borderRadius: 4, background: C.paper, display: "flex", flexDirection: "column", gap: 6 },
  verdict: { fontSize: 21, fontStyle: "italic" },
  vRow: { display: "flex", gap: 10, fontSize: 16.5, lineHeight: 1.35 },
  vKey: { minWidth: 92, color: C.muted, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", paddingTop: 4 },
  mono: { fontFamily: "ui-monospace, monospace", fontSize: 12 },
  flash: { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.bg, padding: "10px 18px", borderRadius: 999, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 12, letterSpacing: "0.04em", boxShadow: "0 12px 30px -12px rgba(32,30,25,0.6)" },
};
