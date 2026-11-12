import { megaForm } from "./dex.js";

// Reactions: short one-shot animations a Pokémon plays when something happens to its agent.

// Each reaction's animations, in order of preference. Sprites cut whichever of these exist.
export const REACTIONS = {
  wake: ["Wake", "Hop"],
  celebrate: ["Dance", "Hop"],
  startle: ["Hurt", "Shake"],
  charge: ["Charge", "Hop"],
  // By the season (Scenery), now and then while idle. Few sprites have the fitting animation
  // (Eat, LookUp, Shake…), so each ends in one nearly all have (Hop, Rotate, Hurt).
  sniff: ["Eat", "Nod", "Hop"], // spring: the flowers
  bask: ["Laying", "Sit", "DeepBreath", "Hop"], // summer: the sun
  lookUp: ["LookUp", "Rotate"], // autumn: the falling leaves
  shiver: ["Shake", "Cringe", "Hurt"], // winter: the cold
  spar: ["Attack", "Strike", "Swing", "Shoot", "Hop"], // two idle ones spar
  poke: ["Head", "Pull", "Double", "Attack", "Hop"], // it pokes a sleeping one awake
  dizzy: ["Tumble", "LostBalance", "Rotate", "Hurt"], // shaken about while you drag it
  special: ["SpAttack", "Shoot", "Charge", "Attack"],
  hopBack: ["Hop"], // before a battle, they hop apart // a battle's last move: it throws its type
};

// Animations cut facing left and right as well (<name>L, <name>R), so in a battle they go for
// each other instead of bobbing at the viewer.
export const FACING = ["Attack", "Strike", "Swing", "Shoot", "SpAttack", "Charge", "Double", "Head", "Pull", "Hurt", "Shake"];

// Idle now and then, whatever the season: one of these, at random among those its sprite has
// (each about one sprite in four). Hop and Rotate, which nearly all have, only when it has none.
export const FIDGETS = ["Nod", "Sit", "LookUp", "DeepBreath", "Eat", "Twirl", "Pose", "Float", "Appeal", "TailWhip", "Lick", "Sing", "Wiggle"];
const FIDGET_FALLBACK = ["Hop", "Rotate"];

// Spring, summer, autumn, winter (scene.js's seasons): the reaction, and an icon over its head
// that says what it is about, whichever animation it got.
export const SEASON_KINDS = [
  { kind: "sniff", icon: "🌸" },
  { kind: "bask", icon: "☀️" },
  { kind: "lookUp", icon: "🍂" },
  { kind: "shiver", icon: "❄️" },
];
export const SEASON_MS = 2000; // a seasonal reaction plays its animation over again for this long

// The animation to play for a reaction, given the ones this sprite has; null: none fits.
export function reactionAnim(kind, has) {
  for (const name of REACTIONS[kind] ?? []) if (has.has(name)) return name;
  return null;
}

export const LOOK_MS = 1500; // how long it faces you
export const AWAKE_MS = 15000; // after you look at it, it stays up this long before napping again
const NO_ANIM_MS = 600; // a reaction with no fitting animation: a short stand facing you

// m.react = { anim, animUntil, until }: plays `anim` (null: stands facing you) until animUntil,
// then faces you until `until`.
function play(m, kind, now, has, msOf, look) {
  const anim = reactionAnim(kind, has);
  const animUntil = now + (anim ? msOf(anim) : NO_ANIM_MS);
  m.react = { anim, animUntil, until: animUntil + (look ? LOOK_MS : 0) };
}

// Which agent has focus now, and which one just got it (null at startup and when it leaves).
export function focusEdge(prev, list) {
  const addr = list.find((a) => a.focused)?.address ?? null;
  return { addr, react: prev !== undefined && addr !== null && addr !== prev ? addr : null };
}

// You focused its agent: it wakes up if asleep, then looks at you, and stays up a while.
export function onFocus(m, mood, now, has, msOf) {
  if (mood === "sleep") play(m, "wake", now, has, msOf, true);
  else m.react = { anim: null, animUntil: now, until: now + LOOK_MS };
  m.awakeUntil = now + AWAKE_MS;
}

// Its agent changed status: finished (celebrate, then look at you), needs you (startle),
// or got to work (charge).
export function onStatus(m, prev, next, now, has, msOf) {
  if (prev === next) return;
  if (prev === "working" && (next === "done" || next === "idle")) play(m, "celebrate", now, has, msOf, true);
  else if (next === "blocked") play(m, "startle", now, has, msOf, false);
  else if (next === "working" && (prev === "idle" || prev === "done")) play(m, "charge", now, has, msOf, false);
}

// Idle, it reacts to the season: true when it does (false: no fitting animation, it strolls on).
export function onSeason(m, season, now, has, msOf) {
  const { kind, icon } = SEASON_KINDS[season];
  const anim = reactionAnim(kind, has);
  if (!anim) return false;
  const ms = Math.max(100, msOf(anim));
  const until = now + ms * Math.ceil(SEASON_MS / ms);
  m.react = { anim, animUntil: until, until, icon };
  return true;
}

// The fidget to play: a random one of FIDGETS it has, else Hop or Rotate; null: none at all.
export function fidgetAnim(has, rnd = Math.random) {
  for (const list of [FIDGETS, FIDGET_FALLBACK]) {
    const got = list.filter((n) => has.has(n));
    if (got.length) return got[Math.floor(rnd() * got.length) % got.length];
  }
  return null;
}

// Idle, it fidgets (nods, sits, looks up, twirls…): true when it does.
export function onFidget(m, now, has, msOf, rnd = Math.random) {
  const anim = fidgetAnim(has, rnd);
  if (!anim) return false;
  const ms = Math.max(100, msOf(anim));
  const until = now + ms * Math.max(1, Math.ceil(1500 / ms));
  m.react = { anim, animUntil: until, until };
  return true;
}

// Idle this long and it falls asleep: sooner at night.
export const sleepAfter = (night) => (night > 0.5 ? 60000 : 180000);

// Asleep, unless you looked at it recently.
export const effectiveMood = (mood, m, now) => (mood === "sleep" && now < (m.awakeUntil ?? 0) ? "idle" : mood);

// Which sprite to show: a reaction, walking, facing you (done), turned to you on hover, asleep, standing.
export function pose(m, mood, now, hovered, side) {
  const r = m.react;
  if (r && now < r.until) {
    const st = r.seq ? stepAt(r, now) : r.anim && now < r.animUntil ? r : null;
    if (st?.anim) return r.face ? { sprite: "react", anim: st.anim, face: r.face } : { sprite: "react", anim: st.anim };
    return { sprite: r.face === "r" ? "idleR" : r.face === "l" ? "idleL" : "idleD" };
  }
  if (m.moving) return { sprite: m.dir === "r" ? "walkR" : "walkL" };
  if (mood === "done") return { sprite: "idleD" };
  if (hovered) return { sprite: side === "r" ? "idleR" : "idleL" };
  if (mood === "sleep") return { sprite: "sleep" };
  return { sprite: m.dir === "r" ? "idleR" : "idleL" };
}

// A battle's step playing now, or undefined (between its moves it stands facing the other).
const stepAt = (r, now) => r.seq.find((s) => now >= s.at && now < s.until);

// The icon over its head now: the step's (💢 hit, 💥 knocked back), else the reaction's.
export function reactIcon(m, now) {
  const r = m.react;
  if (!r || now >= r.until) return null;
  return (r.seq && stepAt(r, now)?.icon) || r.icon || null;
}

// A battle (sparring, teasing, dropping one on another): each strikes once, the other flinching
// as the blow lands, then one of them (at random) lets loose its special move: SpAttack, Shoot or
// Charge facing the other, and its type's icon (`shot`) flies across and knocks the other back
// (💥). `A`, `B`: { has, msOf, icon } for a and b. Both face each other throughout.
// Sets a.react and b.react ({ seq, until, face, shot? }) and lastSpar; returns when it's over.
// `at`: { ax, bx, back } when they first hop back to ax and bx (battleSpots), taking `back` ms
// (a Hop, if it has one), the battle starting after.
export function battle(a, b, A, B, now, rnd = Math.random, at = null) {
  const len = (S, anim, min) => (anim ? Math.max(min, S.msOf(anim)) : NO_ANIM_MS);
  const seq = { a: [], b: [] };
  const [ax, bx] = at ? [at.ax, at.bx] : [a.x, b.x];
  let t = now;
  if (at?.back) {
    seq.a.push({ at: now, until: now + at.back, anim: reactionAnim("hopBack", A.has) });
    seq.b.push({ at: now, until: now + at.back, anim: reactionAnim("hopBack", B.has) });
    t += at.back + 100;
  }
  const strike = (S, D, k, dk) => {
    const anim = reactionAnim("spar", S.has);
    const d = len(S, anim, 500);
    seq[k].push({ at: t, until: t + d, anim });
    const hurt = reactionAnim("startle", D.has);
    const hit = t + Math.round(d * 0.5);
    const hd = len(D, hurt, 400);
    seq[dk].push({ at: hit, until: hit + hd, anim: hurt, icon: "💢" });
    t = Math.max(t + d, hit + hd) + 150;
  };
  strike(A, B, "a", "b");
  strike(B, A, "b", "a");
  const aWins = rnd() < 0.5;
  const [W, L, wk, lk, wx, lx] = aWins ? [A, B, "a", "b", ax, bx] : [B, A, "b", "a", bx, ax];
  const sp = reactionAnim("special", W.has);
  const sd = len(W, sp, 700);
  seq[wk].push({ at: t, until: t + sd, anim: sp });
  const shot = { at: t + Math.round(sd * 0.4), until: t + Math.round(sd * 0.4) + 450, from: wx, to: lx, icon: W.icon };
  const hurt = reactionAnim("startle", L.has);
  const hd = len(L, hurt, 600);
  seq[lk].push({ at: shot.until, until: shot.until + hd, anim: hurt, icon: "💥" });
  const end = Math.max(t + sd, shot.until + hd) + 300;
  a.dir = bx > ax ? "r" : "l";
  b.dir = ax > bx ? "r" : "l";
  a.react = { seq: seq.a, until: end, face: a.dir, ...(aWins ? { shot } : {}) };
  b.react = { seq: seq.b, until: end, face: b.dir, ...(aWins ? {} : { shot }) };
  a.lastSpar = b.lastSpar = now;
  return end;
}

// Where two about to battle stand: BATTLE_GAP apart about their middle, each keeping its side,
// inside lo..hi (pushed in together at an edge). Already that far apart: where they are.
export const BATTLE_GAP = 70;
export function battleSpots(ax, bx, lo, hi) {
  if (Math.abs(ax - bx) >= BATTLE_GAP || hi - lo < BATTLE_GAP) return { ax, bx };
  const side = ax <= bx ? -1 : 1;
  const mid = Math.min(hi - BATTLE_GAP / 2, Math.max(lo + BATTLE_GAP / 2, (ax + bx) / 2));
  return { ax: mid + side * BATTLE_GAP / 2, bx: mid - side * BATTLE_GAP / 2 };
}

// Whether it shows its Mega form now: On always, Auto while its agent works, Off never.
export const megaShown = (pick, status) => !pick.form && !!megaForm(pick.dex) && (pick.mega === "on" || (pick.mega !== "off" && status === "working"));

// Sparring: two idle Pokémon standing still on one row, close but not on top of each other, and
// neither sparred in the last SPAR_GAP. `cands`: [{ addr, x, row, lastSpar }]. The first such
// pair, or null.
export const SPAR_GAP = 10 * 60000;
export function sparPair(cands, now) {
  const ready = cands.filter((c) => now - (c.lastSpar ?? -Infinity) >= SPAR_GAP);
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      const [a, b] = [ready[i], ready[j]];
      const dx = Math.abs(a.x - b.x);
      if (a.row === b.row && dx >= 30 && dx <= 160) return [a, b];
    }
  }
  return null;
}

// Teasing: an idle one standing still walks over to one asleep on its row and pokes it; the
// sleeper wakes with a start and they spar. Neither may have sparred in the last SPAR_GAP.
// `cands`: [{ addr, x, row, mood, lastSpar }] (standing still, not reacting). The nearest such
// pair as [teaser, sleeper], or null.
export function teasePair(cands, now) {
  const ready = cands.filter((c) => now - (c.lastSpar ?? -Infinity) >= SPAR_GAP);
  let best = null;
  for (const a of ready.filter((c) => c.mood === "idle")) {
    for (const b of ready.filter((c) => c.mood === "sleep" && c.row === a.row)) {
      const d = Math.abs(a.x - b.x);
      if (!best || d < best.d) best = { d, pair: [a, b] };
    }
  }
  return best?.pair ?? null;
}

// Where the teaser stops: beside the sleeper on its own side (the other when that is past the
// edge), TEASE_GAP away.
export const TEASE_GAP = 40;
export function teaseSpot(x, sleeperX, lo, hi) {
  const side = x <= sleeperX ? -1 : 1;
  const spots = [side, -side].map((d) => sleeperX + d * TEASE_GAP);
  return spots.find((s) => s >= lo && s <= hi) ?? Math.min(hi, Math.max(lo, spots[0]));
}

// It got there: it turns to the sleeper and pokes it (😜); the sleeper wakes with a start (💢)
// and stays up a while. Returns when the poke is over, for the spar that follows.
export function onPoke(m, s, now, has, sHas, msOf, sMsOf) {
  m.dir = s.x > m.x ? "r" : "l";
  const anim = reactionAnim("poke", has);
  const ms = anim ? Math.max(100, msOf(anim)) : NO_ANIM_MS;
  const until = now + ms * Math.max(1, Math.ceil(800 / ms));
  m.react = { anim, animUntil: until, until, icon: "😜" };
  s.dir = m.x > s.x ? "r" : "l";
  const wake = reactionAnim("wake", sHas);
  const wUntil = Math.max(until, now + (wake ? sMsOf(wake) : NO_ANIM_MS));
  s.react = { anim: wake, animUntil: wUntil, until: wUntil, icon: "💢" };
  s.awakeUntil = Math.max(s.awakeUntil ?? 0, now + 20000);
  return Math.max(until, wUntil);
}

// Dragged and dropped (by you). Shaken: the pointer turned back at least 4 times in the last
// 1.5 s (`flips`: when it turned). Pure.
export const SHAKE_FLIPS = 4;
export const shaken = (flips, now) => (flips ?? []).filter((t) => now - t <= 1500).length >= SHAKE_FLIPS;

// The one it was dropped on: the nearest other on its row within DROP_REACH px, or null.
// `cands`: [{ addr, x, row }].
export const DROP_REACH = 36;
export function dropTarget(cands, x, row) {
  let best = null;
  for (const c of cands) {
    const d = Math.abs(c.x - x);
    if (c.row === row && d <= DROP_REACH && (!best || d < best.d)) best = { d, c };
  }
  return best?.c ?? null;
}

// Shaken about, it reels for about 2.5 s (💫).
export function onDizzy(m, now, has, msOf) {
  const anim = reactionAnim("dizzy", has);
  const ms = anim ? Math.max(100, msOf(anim)) : NO_ANIM_MS;
  const until = now + ms * Math.max(1, Math.ceil(2500 / ms));
  m.react = { anim, animUntil: until, until, icon: "💫" };
}

// A combo: an agent's Pokémon and its sub-agent's, both working, attack together facing the same
// way, for about two seconds (⚡ over one). At most every COMBO_GAP per pair.
export const COMBO_GAP = 5 * 60000;
export function onCombo(m, dir, now, has, msOf, icon) {
  const anim = reactionAnim("spar", has);
  const ms = anim ? Math.max(100, msOf(anim)) : NO_ANIM_MS;
  const until = now + ms * Math.max(1, Math.ceil(2000 / ms));
  m.dir = dir;
  m.react = { anim, animUntil: until, until, face: dir, ...(icon ? { icon } : {}) };
  m.lastCombo = now;
}

// Asleep, it stirs now and then: wakes (its wake animation), is up a while (it strolls, reacts,
// watches visitors), then sleeps again. Each on its own clock, so they don't all wake at once:
// by day every 1.5 to 4 minutes, at night every 4 to 10; up for 10 to 30 seconds.
export const stirGap = (night, rnd = Math.random) => (night ? 4 + rnd() * 6 : 1.5 + rnd() * 2.5) * 60000;
export const stirFor = (rnd = Math.random) => (10 + rnd() * 20) * 1000;

// It's asleep and its time has come: it wakes for a while (awakeUntil, as when you look at it),
// playing its wake animation. Returns true when it stirred; schedules the next time either way.
export function onStir(m, mood, now, night, has, msOf, rnd = Math.random) {
  if (mood !== "sleep") { m.stirAt = undefined; return false; }
  if (m.stirAt === undefined) { m.stirAt = now + stirGap(night, rnd); return false; }
  if (now < m.stirAt) return false;
  m.stirAt = now + stirGap(night, rnd);
  play(m, "wake", now, has, msOf, false);
  m.awakeUntil = now + stirFor(rnd);
  return true;
}
