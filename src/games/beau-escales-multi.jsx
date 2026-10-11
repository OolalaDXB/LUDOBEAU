import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   BEAU · Escales / Ports of Call · MULTIJOUEUR (hot-seat)
   Bilingue (FR/EN) via la prop `lang`.
   Horloge commune : 1 jour = 1 seconde, les jours défilent.
   Un navire parti pour N jours reste EN MER et n'accoste qu'au
   jour de retour ; les autres compagnies jouent entre-temps.
   Recréation libre de Ports of Call. Code & dessins originaux.
   ============================================================ */

const C = {
  bg: "#F1EADD", paper: "#F4EEDF", sea: "#E7E0CD",
  frame: "#DCD0B8", frameEdge: "#CDBE9F",
  ink: "#201E19", terra: "#A8553B", petrol: "#7C938C",
  hair: "rgba(32,30,25,0.14)", line: "rgba(32,30,25,0.30)",
  muted: "#6B6557", good: "#5E7D5A", warn: "#B98A3E", bad: "#B8473A", panel: "#FBF6EA",
};
const COLORS = [
  { key: "ink", hex: "#28251E" },
  { key: "terra", hex: "#A8553B" },
  { key: "petrol", hex: "#4E6E78" },
  { key: "olive", hex: "#6E7A4F" },
];

const PORTS = [
  { id: "sfo", lat: 37.77, lon: -122.42, fr: "San Francisco", en: "San Francisco" },
  { id: "nyc", lat: 40.7, lon: -74.0, fr: "New York", en: "New York" },
  { id: "rio", lat: -22.9, lon: -43.2, fr: "Rio de Janeiro", en: "Rio de Janeiro" },
  { id: "cpt", lat: -33.92, lon: 18.42, fr: "Le Cap", en: "Cape Town" },
  { id: "rtm", lat: 51.9, lon: 4.5, fr: "Rotterdam", en: "Rotterdam" },
  { id: "dxb", lat: 25.27, lon: 55.3, fr: "Dubaï", en: "Dubai" },
  { id: "sin", lat: 1.35, lon: 103.8, fr: "Singapour", en: "Singapore" },
  { id: "yok", lat: 35.44, lon: 139.64, fr: "Yokohama", en: "Yokohama" },
  { id: "syd", lat: -33.87, lon: 151.2, fr: "Sydney", en: "Sydney" },
];
const portById = (id) => PORTS.find((p) => p.id === id);
const SHIPS = [
  { id: "coaster", cap: 4, speed: 14, price: 850000, upkeep: 4000, fr: "Caboteur", en: "Coaster" },
  { id: "freighter", cap: 9, speed: 16, price: 2300000, upkeep: 7000, fr: "Cargo", en: "Freighter" },
  { id: "bulk", cap: 18, speed: 14, price: 4600000, upkeep: 11000, fr: "Vraquier", en: "Bulk carrier" },
  { id: "liner", cap: 14, speed: 22, price: 6800000, upkeep: 14000, fr: "Porte-conteneurs", en: "Container ship" },
];
const shipSpec = (id) => SHIPS.find((s) => s.id === id);
/* identifiants de cargaison ; libellés dans STR[lang].cargo */
const CARGOS = ["containers", "grain", "crude", "cars", "machinery", "textiles", "electronics", "timber", "coal", "coffee"];

/* ---------- textes FR / EN ---------- */
const STR = {
  fr: {
    locale: "fr-FR",
    eyebrow: "LE SOUFFLEUR · ESCALES · HOT-SEAT",
    mapLabel: "carte marine",
    colors: { ink: "Encre", terra: "Terre", petrol: "Pétrole", olive: "Olive" },
    defaultName: (c) => `Compagnie ${c}`,
    cargo: { containers: "Conteneurs", grain: "Céréales", crude: "Pétrole brut", cars: "Automobiles", machinery: "Machines", textiles: "Textile", electronics: "Électronique", timber: "Bois", coal: "Charbon", coffee: "Café" },
    events: {
      storm: { t: "Tempête", d: "Le baromètre s'effondre. La coque encaisse, on perd du temps." },
      engine: { t: "Avarie machine", d: "La salle des machines tousse. Réparation de fortune, jours perdus." },
      calm: { t: "Mer d'huile", d: "Calme plat. Traversée sereine, l'équipage souffle." },
      rescue: { t: "Sauvetage", d: "Un radeau à la dérive : on récupère les naufragés. L'honneur de la mer." },
      pirates: { t: "Pirates", d: "Une vedette suspecte nous serre. On s'en tire, mais cela coûte." },
    },
    /* voix du Souffleur */
    vLobby: "Combien de compagnies prennent la mer ?",
    vSeasonEnd: (n) => `Fin de saison. ${n} l'emporte aux points.`,
    vDocking: "Votre navire entre au port. Coupez les gaz dans la zone.",
    vTurn: "En port. Choisissez votre fret.",
    vPassArrive: "Un navire entre au port. Passez l'appareil à son armateur.",
    vPassPort: "Un navire est libre. Passez l'appareil.",
    vSailing: "Les navires font route. Les jours défilent…",
    vSetupFirst: "Compagnie 1 : nom et port d'attache. Même capital pour tous.",
    vSetupNext: (n) => `Compagnie ${n} : nom et port d'attache.`,
    vDispatch: (port, d, day) => `Cap sur ${port}, ${d} j. Retour prévu au jour ${day}.`,
    vLayUp: "Un jour à quai pour guetter un meilleur fret.",
    vNoYardFunds: "Pas de quoi payer le chantier.",
    vRepaired: "Coque remise à neuf. Deux jours au chantier.",
    vNoFunds: "Fonds insuffisants.",
    vNewShip: "Nouveau bâtiment à quai.",
    vLate: "Livraison en retard : l'affréteur rogne le fret.",
    vDelivered: "À quai, fret livré, caisse renflouée.",
    vTargetWin: (n, v) => `${n} l'emporte : ${v} de valeur.`,
    /* lobby */
    lobbyTitle: "Nombre de compagnies",
    nPlayers: (n) => `${n} joueurs`,
    rules: (target) => (<>Une horloge commune tourne : <b>1 jour = 1 seconde</b>. Un navire parti pour N jours reste en mer et n'accoste qu'à son jour de retour ; pendant ce temps les autres compagnies jouent. Enchaîner des trajets courts permet donc de jouer plus souvent. Premier à {target} de valeur, ou la plus grosse fortune au terme de la saison.</>),
    /* fondation */
    companyOf: (i, n) => `Compagnie ${i} / ${n}`,
    phName: "Nom de la compagnie",
    homePort: "Port d'attache",
    foundNote: (cash, ship) => (<>Capital de départ : <b>{cash}</b>, identique pour toutes les compagnies.<br />Navire de fondation : <b>{ship}</b>. Les meilleurs bâtiments s'achètent ensuite chez le courtier, à armes égales.</>),
    foundNext: "Fonder · compagnie suivante",
    foundLast: "Fonder et lever l'ancre",
    /* passage de main */
    day: "Jour",
    passArrive: "votre navire entre au port",
    passPort: (p) => `au port de ${p}`,
    ready: "Je suis prêt",
    seeStandings: "Voir le classement",
    /* traversée */
    sailNote: "Les navires font route…",
    skipSail: "Avance rapide jusqu'à la prochaine escale",
    /* en port */
    cash: "Caisse", worth: "Valeur",
    freightTitle: (p) => `Bourse de fret · ${p}`,
    dUnit: "j", knots: "nds", perDay: "/j",
    wait: "Attendre (1 j)", broker: "Courtier", repair: "Réparer",
    /* courtier */
    brokerTitle: (v) => `Courtier · revente actuelle : ${v}`,
    aboard: "À bord", change: "Changer", backToPort: "Retour au port",
    /* accostage */
    dockTitle: (p) => `Accostage à ${p}`,
    dockHint: "Coupez les gaz quand le navire est dans la zone centrale.",
    dockBtn: "Accoster",
    /* escale */
    arrivalTitle: (p) => `Escale · ${p}`,
    delivered: (late) => `Fret livré${late ? " (retard −50%)" : ""}`,
    costs: (d, b) => `Frais (${d} j, Beaufort ${b})`,
    tugs: "Remorqueurs (accostage brutal)",
    bonus: "Prime accostage parfait",
    net: "Résultat net",
    wear: (w) => `Usure (−${w}%)`,
    hull: (h) => `coque ${h}%`,
    cont: "Continuer",
    /* classement / fin */
    standingsTitle: (d) => `Classement · jour ${d}`,
    atSea: (d) => `en mer · escale j.${d}`,
    freeAt: (p, d) => `${p} · libre j.${d}`,
    resume: "Reprendre",
    winsWith: (v, d) => `l'emporte avec ${v} · jour ${d}`,
    newGame: "Nouvelle partie",
    objective: (v, d) => `Objectif : ${v} · saison ${d} j · 1 j = 1 s`,
    restart: "Recommencer",
  },
  en: {
    locale: "en-GB",
    eyebrow: "THE PROMPTER · PORTS OF CALL · HOT-SEAT",
    mapLabel: "nautical chart",
    colors: { ink: "Ink", terra: "Terra", petrol: "Petrol", olive: "Olive" },
    defaultName: (c) => `${c} Line`,
    cargo: { containers: "Containers", grain: "Grain", crude: "Crude oil", cars: "Vehicles", machinery: "Machinery", textiles: "Textiles", electronics: "Electronics", timber: "Timber", coal: "Coal", coffee: "Coffee" },
    events: {
      storm: { t: "Storm", d: "The barometer plummets. The hull takes a beating; time is lost." },
      engine: { t: "Engine failure", d: "The engine room splutters. A makeshift repair, days lost." },
      calm: { t: "Glassy sea", d: "Flat calm. A serene crossing; the crew catches its breath." },
      rescue: { t: "Rescue", d: "A raft adrift: we take the castaways aboard. The honour of the sea." },
      pirates: { t: "Pirates", d: "A suspicious launch closes in. We slip away, but it costs us." },
    },
    vLobby: "How many companies put to sea?",
    vSeasonEnd: (n) => `End of season. ${n} wins on points.`,
    vDocking: "Your ship is coming into harbour. Cut the engines inside the zone.",
    vTurn: "In port. Choose your freight.",
    vPassArrive: "A ship is coming into harbour. Hand the device to her owner.",
    vPassPort: "A ship is free. Pass the device on.",
    vSailing: "The ships are under way. The days slip by…",
    vSetupFirst: "Company 1: name and home port. Equal capital for all.",
    vSetupNext: (n) => `Company ${n}: name and home port.`,
    vDispatch: (port, d, day) => `Course set for ${port}, ${d} days. Due in on day ${day}.`,
    vLayUp: "A day alongside, watching for better freight.",
    vNoYardFunds: "Not enough to pay the yard.",
    vRepaired: "Hull restored as new. Two days in the yard.",
    vNoFunds: "Insufficient funds.",
    vNewShip: "A new vessel alongside.",
    vLate: "Late delivery: the charterer trims the freight.",
    vDelivered: "Alongside, cargo delivered, coffers refilled.",
    vTargetWin: (n, v) => `${n} wins, worth ${v}.`,
    lobbyTitle: "Number of companies",
    nPlayers: (n) => `${n} players`,
    rules: (target) => (<>A shared clock is running: <b>1 day = 1 second</b>. A ship sent out for N days stays at sea and only berths on her day of return; meanwhile, the other companies play. Short passages therefore let you play more often. First to {target} in value wins, or the largest fortune when the season ends.</>),
    companyOf: (i, n) => `Company ${i} / ${n}`,
    phName: "Company name",
    homePort: "Home port",
    foundNote: (cash, ship) => (<>Starting capital: <b>{cash}</b>, the same for every company.<br />Founding ship: <b>{ship}</b>. Finer vessels can then be bought from the broker, on equal terms.</>),
    foundNext: "Found · next company",
    foundLast: "Found and weigh anchor",
    day: "Day",
    passArrive: "your ship is coming into harbour",
    passPort: (p) => `in port at ${p}`,
    ready: "I'm ready",
    seeStandings: "View the standings",
    sailNote: "The ships are under way…",
    skipSail: "Fast-forward to the next port of call",
    cash: "Cash", worth: "Worth",
    freightTitle: (p) => `Freight exchange · ${p}`,
    dUnit: "d", knots: "kn", perDay: "/d",
    wait: "Wait (1 d)", broker: "Broker", repair: "Repair",
    brokerTitle: (v) => `Broker · current resale: ${v}`,
    aboard: "Aboard", change: "Trade in", backToPort: "Back to port",
    dockTitle: (p) => `Berthing at ${p}`,
    dockHint: "Cut the engines when the ship is in the centre zone.",
    dockBtn: "Berth",
    arrivalTitle: (p) => `Port of call · ${p}`,
    delivered: (late) => `Freight delivered${late ? " (late −50%)" : ""}`,
    costs: (d, b) => `Running costs (${d} d, Beaufort ${b})`,
    tugs: "Tugs (rough berthing)",
    bonus: "Perfect berthing bonus",
    net: "Net result",
    wear: (w) => `Wear (−${w}%)`,
    hull: (h) => `hull ${h}%`,
    cont: "Continue",
    standingsTitle: (d) => `Standings · day ${d}`,
    atSea: (d) => `at sea · due day ${d}`,
    freeAt: (p, d) => `${p} · free day ${d}`,
    resume: "Resume",
    winsWith: (v, d) => `wins with ${v} · day ${d}`,
    newGame: "New game",
    objective: (v, d) => `Target: ${v} · season ${d} d · 1 d = 1 s`,
    restart: "Start over",
  },
};

const R_NM = 3440;
function distanceNm(a, b) {
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R_NM * Math.asin(Math.sqrt(s)));
}
const proj = (p) => ({ x: p.lon + 180, y: 90 - p.lat });
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtMoney = (n, locale) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString(locale);

function makeFreights(fromId, shipCap) {
  const from = portById(fromId);
  const others = PORTS.filter((p) => p.id !== fromId);
  const n = ri(4, 5);
  const list = [];
  for (let i = 0; i < n; i++) {
    const to = pick(others);
    const dist = distanceNm(from, to);
    const cargo = pick(CARGOS);
    const volume = ri(2, Math.max(3, shipCap));
    const rate = rnd(7, 13);
    const pay = Math.round(volume * dist * rate);
    const baseDays = Math.max(2, Math.round(dist / (16 * 24)));
    const deadline = Math.max(baseDays + 1, Math.round(baseDays * rnd(1.35, 1.9)));
    list.push({ to: to.id, cargo, volume, pay, dist, deadline });
  }
  return list;
}
function computeVoyage(fromId, toId, shipId) {
  const from = portById(fromId), to = portById(toId), spec = shipSpec(shipId);
  const dist = distanceNm(from, to);
  let beaufort = ri(2, 7);
  if (Math.random() < 0.22) beaufort = ri(8, 11);
  let days = Math.max(2, Math.round(dist / (spec.speed * 24)));
  let extraDays = 0, stormWear = 0, runExtra = 0, event = null;
  if (beaufort >= 8) { extraDays = ri(1, 3); stormWear = ri(8, 16); event = "storm"; }
  else if (Math.random() < 0.18) event = pick(["engine", "calm", "rescue", "pirates"]);
  if (event === "engine") { extraDays += ri(1, 2); runExtra += 40000; }
  if (event === "pirates") { runExtra += ri(30000, 90000); stormWear += ri(2, 6); }
  const totalDays = days + extraDays;
  const baseWear = Math.round(days * 0.4 + 3);
  const runCost = spec.upkeep * totalDays + runExtra;
  return { dist, beaufort, days, extraDays, totalDays, event, baseWear, stormWear, runCost };
}

const TARGET = 18000000;
const SEASON_DAYS = 365;     // une saison = un an ; le jeu suit l'horloge
const START_CASH = 2500000;

/* ============================================================ */
export default function BeauEscalesMulti({ lang = "fr" }) {
  const t = STR[lang] || STR.fr;
  const money = (n) => fmtMoney(n, t.locale);
  const portName = (id) => portById(id)[lang] || portById(id).fr;
  const shipName = (id) => shipSpec(id)[lang] || shipSpec(id).fr;
  const colorName = (c) => t.colors[c.key];
  const [phase, setPhase] = useState("lobby");
  const [nPlayers, setNPlayers] = useState(2);
  const [players, setPlayers] = useState([]);
  const [setupIdx, setSetupIdx] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [draftPort, setDraftPort] = useState(null);
  const [current, setCurrent] = useState(0);
  const [clock, setClock] = useState(1);
  const [pending, setPending] = useState({ who: 0, kind: "port" });
  const [sailTarget, setSailTarget] = useState(1);
  const [arrival, setArrival] = useState(null);
  const [line, setLine] = useState(t.vLobby);
  const [winner, setWinner] = useState(null);

  const playersRef = useRef(players); useEffect(() => { playersRef.current = players; });
  const clockRef = useRef(clock); useEffect(() => { clockRef.current = clock; });
  const sailNextRef = useRef({ who: 0, kind: "port" });
  const prevActor = useRef(null);
  const navigating = useRef(false);

  const P = players[current];
  const spec = P && P.ship ? shipSpec(P.ship.id) : null;
  const resale = (sh) => Math.round(shipSpec(sh.id).price * (0.5 + 0.4 * sh.hull / 100));
  const netWorth = (pl) => pl.cash + (pl.ship ? resale(pl.ship) : 0);

  const shipPosOf = (p) => {
    if (p.status === "sea" && p.voyage) {
      const a = proj(portById(p.voyage.departPort)), b = proj(portById(p.voyage.toPort));
      const k = Math.max(0, Math.min(1, (clock - p.voyage.departDay) / Math.max(1, p.voyage.arriveDay - p.voyage.departDay)));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    return proj(portById(p.port));
  };

  /* ---- planification événementielle (calendrier) ---- */
  const endSeason = (ps) => {
    const w = [...ps].sort((a, b) => netWorth(b) - netWorth(a))[0];
    setWinner(w); setPhase("over"); setLine(t.vSeasonEnd(w.name));
  };
  const beginPending = (who, kind) => {
    prevActor.current = who;
    setCurrent(who);
    if (kind === "arrive") { setPhase("docking"); setLine(t.vDocking); }
    else { setPhase("turn"); setLine(t.vTurn); }
  };
  const triggerEvent = (ps, who, kind, day) => {
    setClock(day);
    setPending({ who, kind });
    if (prevActor.current === who) beginPending(who, kind);
    else {
      setPhase("pass");
      setLine(kind === "arrive" ? t.vPassArrive : t.vPassPort);
    }
  };
  const schedule = (ps) => {
    let best = Infinity, who = -1, kind = null;
    ps.forEach((p, i) => {
      const key = p.status === "sea" ? p.voyage.arriveDay : p.readyDay;
      if (key < best) { best = key; who = i; kind = p.status === "sea" ? "arrive" : "port"; }
    });
    if (best > SEASON_DAYS) { endSeason(ps); return; }
    if (clockRef.current < best) {
      sailNextRef.current = { who, kind };
      navigating.current = true;
      setSailTarget(best); setPhase("sailing");
      setLine(t.vSailing);
    } else {
      triggerEvent(ps, who, kind, best);
    }
  };

  const finishSail = () => {
    if (!navigating.current) return;
    navigating.current = false;
    const sn = sailNextRef.current;
    triggerEvent(playersRef.current, sn.who, sn.kind, sailTarget);
  };
  const skipSail = () => { setClock(sailTarget); finishSail(); };

  /* horloge : 1 jour / seconde */
  useEffect(() => {
    if (phase !== "sailing") return;
    const id = setInterval(() => {
      setClock((prev) => {
        const next = prev + 1;
        if (next >= sailTarget) { clearInterval(id); setTimeout(finishSail, 20); return sailTarget; }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [phase, sailTarget]);

  /* ---- lobby / setup ---- */
  const startSetup = (n) => {
    setNPlayers(n);
    setPlayers(Array.from({ length: n }, (_, i) => ({ color: COLORS[i], name: "", port: null, cash: START_CASH, status: "port", readyDay: 1, voyage: null, ship: null, freights: [] })));
    setSetupIdx(0); setDraftName(t.defaultName(colorName(COLORS[0]))); setDraftPort(null);
    prevActor.current = null;
    setPhase("setup"); setLine(t.vSetupFirst);
  };
  const foundCompany = () => {
    const starter = "coaster";
    const cap = shipSpec(starter).cap;
    const pl = { color: COLORS[setupIdx], name: draftName || t.defaultName(colorName(COLORS[setupIdx])), port: draftPort, cash: START_CASH, status: "port", readyDay: 1, voyage: null, ship: { id: starter, hull: 100 }, freights: makeFreights(draftPort, cap) };
    const np = players.map((p, i) => (i === setupIdx ? pl : p));
    setPlayers(np);
    if (setupIdx < nPlayers - 1) {
      const ni = setupIdx + 1;
      setSetupIdx(ni); setDraftName(t.defaultName(colorName(COLORS[ni]))); setDraftPort(null);
      setLine(t.vSetupNext(ni + 1));
    } else {
      setClock(1); clockRef.current = 1; prevActor.current = null;
      schedule(np);
    }
  };

  /* ---- décision en port ---- */
  const dispatch = (f) => {
    const v = computeVoyage(P.port, f.to, P.ship.id);
    const departDay = clock;
    const arriveDay = departDay + v.totalDays;
    const newP = { ...P, status: "sea", voyage: { departPort: P.port, toPort: f.to, cargo: f, departDay, arriveDay, v } };
    const np = players.map((p, i) => (i === current ? newP : p));
    setPlayers(np);
    setLine(t.vDispatch(portName(f.to), v.totalDays, arriveDay));
    schedule(np);
  };
  const layUp = () => {
    const newP = { ...P, cash: P.cash - spec.upkeep, readyDay: clock + 1, freights: makeFreights(P.port, spec.cap) };
    const np = players.map((p, i) => (i === current ? newP : p));
    setPlayers(np);
    setLine(t.vLayUp);
    schedule(np);
  };
  const repairCost = P && P.ship ? Math.round((100 - P.ship.hull) / 100 * shipSpec(P.ship.id).price * 0.18) : 0;
  const repair = () => {
    if (!P.ship || P.ship.hull >= 100 || P.cash < repairCost) { if (P.cash < repairCost) setLine(t.vNoYardFunds); return; }
    const newP = { ...P, cash: P.cash - repairCost, ship: { ...P.ship, hull: 100 }, readyDay: clock + 2 };
    const np = players.map((p, i) => (i === current ? newP : p));
    setPlayers(np);
    setLine(t.vRepaired);
    schedule(np);
  };

  /* ---- courtier ---- */
  const buyShip = (shipId) => {
    const s = shipSpec(shipId);
    const net = P.ship ? s.price - resale(P.ship) : s.price;
    if (P.cash < net) { setLine(t.vNoFunds); return; }
    const newP = { ...P, cash: P.cash - net, ship: { id: shipId, hull: 100 }, freights: makeFreights(P.port, s.cap) };
    setPlayers((ps) => ps.map((p, i) => (i === current ? newP : p)));
    setPhase("turn"); setLine(t.vNewShip);
  };

  /* ---- accostage (mini-jeu) ---- */
  const [dockPos, setDockPos] = useState(50);
  const dockDir = useRef(1); const dockRaf = useRef(null);
  useEffect(() => {
    if (phase !== "docking") return;
    let last; const speed = 0.055;
    const loop = (ts) => {
      if (last == null) last = ts; const dt = ts - last; last = ts;
      setDockPos((p) => { let np = p + dockDir.current * speed * dt; if (np >= 100) { np = 100; dockDir.current = -1; } if (np <= 0) { np = 0; dockDir.current = 1; } return np; });
      dockRaf.current = requestAnimationFrame(loop);
    };
    dockRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(dockRaf.current);
  }, [phase]);
  const dockNow = () => {
    cancelAnimationFrame(dockRaf.current);
    const d = Math.abs(dockPos - 50);
    let dockWear = 0, tug = 0, bonus = 0, q;
    if (d <= 7) { q = "parfait"; bonus = 0.03; }
    else if (d <= 18) { q = "correct"; dockWear = 3; }
    else { q = "brutal"; dockWear = 12; tug = 60000; }
    resolveArrival(dockWear, tug, bonus, q);
  };

  const resolveArrival = (dockWear, tug, bonus, dockQuality) => {
    const vg = P.voyage, v = vg.v, f = vg.cargo;
    const late = v.totalDays > f.deadline;
    let pay = late ? Math.round(f.pay * 0.5) : f.pay;
    pay = Math.round(pay * (1 + bonus));
    const wear = v.baseWear + v.stormWear + dockWear;
    const newHull = Math.max(0, P.ship.hull - wear);
    const net = pay - v.runCost - tug;
    const newCash = P.cash + net;
    const newP = { ...P, cash: newCash, ship: { ...P.ship, hull: newHull }, port: vg.toPort, status: "port", readyDay: clock, voyage: null, freights: makeFreights(vg.toPort, spec.cap) };
    const np = players.map((p, i) => (i === current ? newP : p));
    setPlayers(np);
    setArrival({ late, pay, runCost: v.runCost, tug, bonus, net, wear, newHull, beaufort: v.beaufort, days: v.totalDays, event: v.event, dockQuality, toPort: vg.toPort });
    setLine(late ? t.vLate : t.vDelivered);
    setPhase("arrival");
    if (netWorth(newP) >= TARGET) setWinner(newP);
  };
  const afterArrival = () => {
    setArrival(null);
    const me = players[current];
    if (me && netWorth(me) >= TARGET) { setWinner(me); setPhase("over"); setLine(t.vTargetWin(me.name, money(TARGET))); return; }
    schedule(players);
  };

  const restart = () => {
    setPhase("lobby"); setPlayers([]); setWinner(null); setArrival(null);
    setClock(1); prevActor.current = null; navigating.current = false;
    setLine(t.vLobby);
  };

  /* ---------- Carte ---------- */
  const Map = ({ routeOf }) => (
    <svg viewBox="0 0 360 180" style={S.map} aria-label={t.mapLabel}>
      <rect x="0" y="0" width="360" height="180" fill={C.sea} />
      {[30,60,90,120,150,180,210,240,270,300,330].map((x)=>(<line key={"v"+x} x1={x} y1="0" x2={x} y2="180" stroke={C.line} strokeWidth="0.3" opacity="0.4" />))}
      {[30,60,90,120,150].map((y)=>(<line key={"h"+y} x1="0" y1={y} x2="360" y2={y} stroke={C.line} strokeWidth="0.3" opacity="0.4" />))}
      <line x1="0" y1="90" x2="360" y2="90" stroke={C.line} strokeWidth="0.6" opacity="0.55" />
      {/* routes des navires en mer */}
      {players.map((pl, i) => {
        if (pl.status !== "sea" || !pl.voyage) return null;
        const a = proj(portById(pl.voyage.departPort)), b = proj(portById(pl.voyage.toPort));
        return <line key={"r" + i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={pl.color.hex} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />;
      })}
      {PORTS.map((p) => { const q = proj(p); return (
        <g key={p.id}>
          <circle cx={q.x} cy={q.y} r="1.6" fill={C.ink} />
          <text x={q.x + 3} y={q.y + 2.6} fontSize="5.2" fill={C.ink} opacity="0.75" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{portName(p.id)}</text>
        </g>); })}
      {/* navires de toutes les compagnies */}
      {players.map((pl, i) => {
        if (!pl.ship) return null;
        const q = shipPosOf(pl);
        const active = i === current && (phase === "turn" || phase === "docking" || phase === "arrival");
        return (
          <g key={"s" + i} transform={`translate(${q.x},${q.y})`}>
            <circle r={active ? "2.7" : "2.1"} fill={C.paper} stroke={pl.color.hex} strokeWidth={active ? "1.3" : "0.9"} />
            <circle r="0.9" fill={pl.color.hex} />
          </g>
        );
      })}
    </svg>
  );

  const Header = (
    <header style={S.head}>
      <div style={S.brand}>BEAU</div>
      <div style={S.eyebrow}>{t.eyebrow}</div>
      <div style={S.hairline} />
    </header>
  );
  const Voice = (<div style={S.voice}><span style={S.voiceMark}>—</span><span style={S.voiceText}>{line}</span></div>);
  const Clock = (
    <div style={S.clock}><span style={S.clockK}>{t.day}</span><span style={S.clockN}>{clock}</span><span style={S.clockK}>/ {SEASON_DAYS}</span></div>
  );
  const TurnBar = P && P.ship && P.port && (
    <div style={{ ...S.turnbar, borderColor: P.color.hex }}>
      <span style={{ ...S.dot, background: P.color.hex }} />
      <span style={S.turnName}>{P.name}</span>
      <span style={S.turnMeta}>{portName(P.port)}</span>
    </div>
  );
  const Stats = P && (
    <div style={S.stats}>
      <span><b style={S.k}>{t.cash}</b> {money(P.cash)}</span>
      <span><b style={S.k}>{t.worth}</b> {money(netWorth(P))}</span>
    </div>
  );
  const ShipBar = P && P.ship && (
    <div style={S.shipbar}>
      <span>{shipName(P.ship.id)}</span>
      <span style={S.hullWrap}>
        <span style={S.hullTrack}><span style={{ ...S.hullFill, width: `${P.ship.hull}%`, background: P.ship.hull > 55 ? C.good : P.ship.hull > 30 ? C.warn : C.bad }} /></span>
        <span style={S.hullPct}>{P.ship.hull}%</span>
      </span>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.shell}>
        {Header}

        {phase === "lobby" && (
          <div style={S.cabinet}>
            <div style={S.sectionTitle}>{t.lobbyTitle}</div>
            <div style={S.lobbyRow}>
              {[2, 3, 4].map((n) => (<button key={n} onClick={() => startSetup(n)} style={S.lobbyBtn}>{t.nPlayers(n)}</button>))}
            </div>
            <div style={S.rules}>{t.rules(money(TARGET))}</div>
          </div>
        )}

        {phase === "setup" && (
          <div style={S.cabinet}>
            <div style={{ ...S.turnbar, borderColor: COLORS[setupIdx].hex }}>
              <span style={{ ...S.dot, background: COLORS[setupIdx].hex }} />
              <span style={S.turnName}>{t.companyOf(setupIdx + 1, nPlayers)}</span>
            </div>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={t.phName} style={S.input} />
            <div style={S.sectionTitle}>{t.homePort}</div>
            <div style={S.portGrid}>
              {PORTS.map((p) => (
                <button key={p.id} onClick={() => setDraftPort(p.id)} style={{ ...S.portBtn, ...(draftPort === p.id ? S.portSel : {}) }}>{portName(p.id)}</button>
              ))}
            </div>
            <div style={S.foundNote}>{t.foundNote(money(START_CASH), shipName("coaster"))}</div>
            <button onClick={foundCompany} disabled={!draftPort} style={{ ...S.dockBtn, opacity: draftPort ? 1 : 0.4 }}>
              {setupIdx < nPlayers - 1 ? t.foundNext : t.foundLast}
            </button>
          </div>
        )}

        {phase === "pass" && players[pending.who] && (
          <div style={S.cabinet}>
            <div style={S.passWrap}>
              <span style={{ ...S.passDot, background: players[pending.who].color.hex }} />
              <div style={S.passName}>{players[pending.who].name}</div>
              <div style={S.passMeta}>{t.day} {clock} · {pending.kind === "arrive" ? t.passArrive : t.passPort(portName(players[pending.who].port))}</div>
              <button onClick={() => beginPending(pending.who, pending.kind)} style={S.dockBtn}>{t.ready}</button>
              <button onClick={() => setPhase("standings")} style={{ ...S.ghost, marginTop: 10 }}>{t.seeStandings}</button>
            </div>
          </div>
        )}

        {phase === "sailing" && (
          <div style={S.cabinet}>
            {Clock}
            <Map />
            <div style={S.sailNote}>{t.sailNote}</div>
            <button onClick={skipSail} style={S.action}>{t.skipSail}</button>
          </div>
        )}

        {phase === "turn" && P && (
          <div style={S.cabinet}>
            {TurnBar}{Clock}{Stats}{ShipBar}
            <Map />
            <div style={S.sectionTitle}>{t.freightTitle(portName(P.port))}</div>
            <div style={S.freightList}>
              {P.freights.map((f, i) => {
                const tooBig = f.volume > spec.cap;
                return (
                  <button key={i} onClick={() => !tooBig && dispatch(f)} disabled={tooBig} style={{ ...S.freightRow, opacity: tooBig ? 0.4 : 1 }}>
                    <span style={S.frDest}>{portName(f.to)}</span>
                    <span style={S.frCargo}>{t.cargo[f.cargo]} · {f.volume} kt</span>
                    <span style={S.frMeta}>{f.dist.toLocaleString(t.locale)} nm · ≤ {f.deadline} {t.dUnit}</span>
                    <span style={S.frPay}>{money(f.pay)}</span>
                  </button>
                );
              })}
            </div>
            <div style={S.harborActions}>
              <button onClick={layUp} style={S.action}>{t.wait}</button>
              <button onClick={() => setPhase("broker")} style={S.action}>{t.broker}</button>
              <button onClick={repair} disabled={P.ship.hull >= 100} style={{ ...S.action, opacity: P.ship.hull >= 100 ? 0.4 : 1 }}>{t.repair}{P.ship.hull < 100 ? ` (${money(repairCost)})` : ""}</button>
            </div>
          </div>
        )}

        {phase === "broker" && P && (
          <div style={S.cabinet}>
            {TurnBar}{Clock}{Stats}{ShipBar}
            <div style={S.sectionTitle}>{t.brokerTitle(money(resale(P.ship)))}</div>
            <div style={S.shipList}>
              {SHIPS.map((s) => {
                const owned = s.id === P.ship.id; const net = s.price - resale(P.ship);
                return (
                  <div key={s.id} style={S.shipCard}>
                    <div style={S.shipName}>{shipName(s.id)}{owned ? " ·" : ""}</div>
                    <div style={S.shipSpecs}>{s.cap} kt · {s.speed} {t.knots} · {money(s.upkeep)}{t.perDay}</div>
                    <div style={S.shipPrice}>{money(s.price)}</div>
                    <button onClick={() => buyShip(s.id)} disabled={owned || P.cash < net} style={{ ...S.buyBtn, opacity: owned || P.cash < net ? 0.4 : 1 }}>{owned ? t.aboard : t.change}</button>
                  </div>
                );
              })}
            </div>
            <div style={S.harborActions}><button onClick={() => setPhase("turn")} style={S.action}>{t.backToPort}</button></div>
          </div>
        )}

        {phase === "docking" && P && P.voyage && (
          <div style={S.cabinet}>
            {TurnBar}{Clock}{Stats}{ShipBar}
            <Map />
            <div style={S.sectionTitle}>{t.dockTitle(portName(P.voyage.toPort))}</div>
            <div style={S.dockBar}><span style={S.dockZone} /><span style={{ ...S.dockMarker, left: `calc(${dockPos}% - 2px)`, background: P.color.hex }} /></div>
            <div style={S.dockHint}>{t.dockHint}</div>
            <button onClick={dockNow} style={S.dockBtn}>{t.dockBtn}</button>
          </div>
        )}

        {phase === "arrival" && arrival && P && (
          <div style={S.cabinet}>
            {TurnBar}{Clock}{Stats}{ShipBar}
            <div style={S.sectionTitle}>{t.arrivalTitle(portName(arrival.toPort))}</div>
            {arrival.event && (<div style={S.eventCard}><b>{t.events[arrival.event].t}.</b> {t.events[arrival.event].d}</div>)}
            <div style={S.ledger}>
              <Row k={t.delivered(arrival.late)} v={money(arrival.pay)} good />
              <Row k={t.costs(arrival.days, arrival.beaufort)} v={money(-arrival.runCost)} />
              {arrival.tug > 0 && <Row k={t.tugs} v={money(-arrival.tug)} />}
              {arrival.bonus > 0 && <Row k={t.bonus} v={`+${Math.round(arrival.bonus * 100)}%`} good />}
              <div style={S.ledgerSep} />
              <Row k={t.net} v={money(arrival.net)} bold good={arrival.net >= 0} />
              <Row k={t.wear(arrival.wear)} v={t.hull(arrival.newHull)} />
            </div>
            <button onClick={afterArrival} style={S.dockBtn}>{t.cont}</button>
          </div>
        )}

        {phase === "standings" && (
          <div style={S.cabinet}>
            <div style={S.sectionTitle}>{t.standingsTitle(clock)}</div>
            <div style={S.standList}>
              {[...players].sort((a, b) => netWorth(b) - netWorth(a)).map((pl, rank) => (
                <div key={pl.name + rank} style={S.standRow}>
                  <span style={{ ...S.dot, background: pl.color.hex }} />
                  <span style={S.standName}>{pl.name}</span>
                  <span style={S.standPort}>{pl.status === "sea" ? t.atSea(pl.voyage.arriveDay) : t.freeAt(portName(pl.port), pl.readyDay)}</span>
                  <span style={S.standVal}>{money(netWorth(pl))}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setPhase("pass")} style={S.dockBtn}>{t.resume}</button>
          </div>
        )}

        {phase === "over" && winner && (
          <div style={S.cabinet}>
            <div style={S.passWrap}>
              <span style={{ ...S.passDot, background: winner.color.hex }} />
              <div style={S.passName}>{winner.name}</div>
              <div style={S.passMeta}>{t.winsWith(money(netWorth(winner)), clock)}</div>
            </div>
            <div style={S.standList}>
              {[...players].sort((a, b) => netWorth(b) - netWorth(a)).map((pl, rank) => (
                <div key={pl.name + rank} style={S.standRow}>
                  <span style={{ ...S.dot, background: pl.color.hex }} />
                  <span style={S.standName}>{rank + 1}. {pl.name}</span>
                  <span style={S.standVal}>{money(netWorth(pl))}</span>
                </div>
              ))}
            </div>
            <button onClick={restart} style={S.dockBtn}>{t.newGame}</button>
          </div>
        )}

        {Voice}

        <footer style={S.foot}>
          <span style={S.objective}>{t.objective(money(TARGET), SEASON_DAYS)}</span>
          <button onClick={restart} style={S.ghost}>{t.restart}</button>
        </footer>
      </div>
    </div>
  );
}

function Row({ k, v, good, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 16 }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span style={{ color: good ? C.good : C.ink, fontWeight: bold ? 600 : 400 }}>{v}</span>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
* { box-sizing: border-box; }
button { font-family: inherit; } input { font-family: inherit; }
`;

const S = {
  page: { minHeight: "100vh", background: `radial-gradient(120% 120% at 50% 0%, #F6F0E4 0%, ${C.bg} 60%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "26px 14px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.ink },
  shell: { width: "min(94vw, 520px)" },
  head: { textAlign: "center", marginBottom: 12 },
  brand: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.42em", paddingLeft: "0.42em" },
  eyebrow: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 9.5, letterSpacing: "0.24em", color: C.muted, marginTop: 7, paddingLeft: "0.24em" },
  hairline: { height: 1, background: C.hair, margin: "13px auto 0", width: "100%" },

  cabinet: { padding: 14, background: `linear-gradient(150deg, #E6DBC5 0%, ${C.frame} 55%, ${C.frameEdge} 100%)`, borderRadius: 5, border: `1px solid ${C.frameEdge}`, boxShadow: "0 1px 0 rgba(255,255,255,0.55) inset, 0 30px 56px -34px rgba(32,30,25,0.55)" },
  map: { width: "100%", display: "block", borderRadius: 3, border: `1px solid ${C.line}`, background: C.sea, boxShadow: "inset 0 1px 4px rgba(32,30,25,0.18)" },

  lobbyRow: { display: "flex", gap: 8 },
  lobbyBtn: { flex: 1, padding: "16px 8px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.panel, color: C.ink, fontSize: 18, cursor: "pointer" },
  rules: { marginTop: 14, fontSize: 16, color: C.muted, fontStyle: "italic", lineHeight: 1.45 },
  foundNote: { margin: "16px 2px 14px", fontSize: 15.5, color: C.muted, fontStyle: "italic", lineHeight: 1.5 },
  input: { width: "100%", padding: "11px 12px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.panel, fontSize: 17, color: C.ink, marginBottom: 4 },

  clock: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, padding: "2px 0 12px" },
  clockK: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted },
  clockN: { fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontStyle: "italic", color: C.terra, lineHeight: 1 },

  turnbar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 10, background: C.panel, borderRadius: 3, border: "2px solid", borderLeftWidth: 4 },
  dot: { width: 11, height: 11, borderRadius: "50%", flexShrink: 0, display: "inline-block" },
  turnName: { fontSize: 17, fontWeight: 500, flex: 1 },
  turnMeta: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted },

  stats: { display: "flex", justifyContent: "space-between", padding: "2px 2px 10px", fontSize: 16 },
  k: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginRight: 6, fontWeight: 600 },
  shipbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 10, background: C.panel, borderRadius: 3, border: `1px solid ${C.hair}`, fontSize: 16 },
  hullWrap: { display: "flex", alignItems: "center", gap: 7 },
  hullTrack: { width: 80, height: 5, background: "rgba(32,30,25,0.12)", borderRadius: 3, overflow: "hidden" },
  hullFill: { height: "100%", display: "block" },
  hullPct: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, color: C.muted },

  sectionTitle: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, margin: "14px 2px 9px" },
  portGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 },
  portBtn: { padding: "11px 10px", border: `1px solid ${C.hair}`, borderRadius: 3, background: C.panel, color: C.ink, fontSize: 16, cursor: "pointer", textAlign: "left" },
  portSel: { boxShadow: `inset 0 0 0 2px ${C.terra}`, background: "#fff" },

  shipList: { display: "flex", flexDirection: "column", gap: 7 },
  shipCard: { display: "grid", gridTemplateColumns: "1.3fr 1.4fr auto auto", alignItems: "center", gap: 8, padding: "10px 12px", background: C.panel, borderRadius: 3, border: `1px solid ${C.hair}` },
  shipName: { fontSize: 17 }, shipSpecs: { fontSize: 13, color: C.muted, fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  shipPrice: { fontSize: 15, textAlign: "right" },
  buyBtn: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 12px", border: "none", borderRadius: 2, background: C.terra, color: "#FBF7EF", cursor: "pointer" },

  freightList: { display: "flex", flexDirection: "column", gap: 6 },
  freightRow: { display: "grid", gridTemplateColumns: "1.1fr 1.3fr 1.2fr auto", alignItems: "center", gap: 8, padding: "10px 12px", background: C.panel, borderRadius: 3, border: `1px solid ${C.hair}`, cursor: "pointer", textAlign: "left" },
  frDest: { fontSize: 16, fontWeight: 500 }, frCargo: { fontSize: 14, fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  frMeta: { fontSize: 12, color: C.muted, fontFamily: "ui-sans-serif, system-ui, sans-serif" }, frPay: { fontSize: 16, color: C.terra, textAlign: "right", fontWeight: 600 },

  harborActions: { display: "flex", gap: 8, marginTop: 11 },
  action: { flex: 1, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "11px 8px", border: `1px solid ${C.hair}`, borderRadius: 2, background: "transparent", color: C.ink, cursor: "pointer" },

  sailNote: { textAlign: "center", fontStyle: "italic", fontSize: 17, color: C.muted, margin: "12px 0 10px" },

  dockBar: { position: "relative", height: 34, background: C.sea, borderRadius: 4, border: `1px solid ${C.line}`, overflow: "hidden", marginTop: 4 },
  dockZone: { position: "absolute", left: "43%", width: "14%", top: 0, bottom: 0, background: "rgba(94,125,90,0.30)", borderLeft: `1px solid ${C.good}`, borderRight: `1px solid ${C.good}` },
  dockMarker: { position: "absolute", top: 2, bottom: 2, width: 4, borderRadius: 2 },
  dockHint: { fontSize: 14, color: C.muted, fontStyle: "italic", margin: "8px 2px 12px" },
  dockBtn: { width: "100%", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", padding: "13px", border: "none", borderRadius: 3, background: C.terra, color: "#FBF7EF", cursor: "pointer", marginTop: 8 },

  passWrap: { textAlign: "center", padding: "26px 10px 18px" },
  passDot: { width: 20, height: 20, borderRadius: "50%", display: "inline-block", marginBottom: 12 },
  passName: { fontSize: 30, fontWeight: 500 },
  passMeta: { fontSize: 16, color: C.muted, fontStyle: "italic", margin: "6px 0 22px" },

  eventCard: { padding: "11px 13px", background: "rgba(124,147,140,0.16)", borderRadius: 3, fontSize: 16, marginBottom: 10, borderLeft: `2px solid ${C.petrol}` },
  ledger: { padding: "4px 2px", marginBottom: 6 }, ledgerSep: { height: 1, background: C.hair, margin: "6px 0" },

  standList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4 },
  standRow: { display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", background: C.panel, borderRadius: 3, border: `1px solid ${C.hair}` },
  standName: { fontSize: 16, fontWeight: 500, flex: 1 },
  standPort: { fontSize: 12, color: C.muted, fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  standVal: { fontSize: 16, color: C.terra, fontWeight: 600 },

  voice: { marginTop: 13, display: "flex", gap: 10, alignItems: "baseline", padding: "13px 4px 4px", borderTop: `1px solid ${C.hair}` },
  voiceMark: { color: C.terra, fontSize: 20, lineHeight: 1 }, voiceText: { fontStyle: "italic", fontSize: 18, lineHeight: 1.35, color: C.ink },

  foot: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  objective: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted },
  ghost: { fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 14px", border: `1px solid ${C.hair}`, background: "transparent", color: C.ink, cursor: "pointer", borderRadius: 2 },
};
