// Fetches and prepares the art. Nothing Pokémon ships with this mod: on first use it
// downloads sprite sheets and portraits from PMDCollab's SpriteCollab into
// ~/.config/herdr-app/data/pokemon-herd/, and cuts them into GIFs with ImageMagick.
import { exec, appHome } from "herdr";
import * as fs from "fs/promises";
import { REACTIONS, FIDGETS, FACING } from "./react.js";
import { sheetPlan, spriteScale } from "./sheets.js";
import { megasFrom, isStale } from "./megas.js";
import { versionIn } from "./update.js";
// Files moved and removed with Herdr's fs, not mv/rm/mkdir: those are shell built-ins on
// Windows, not programs, so exec can't start them there. (fs has no rename: a move is a copy of
// the bytes, then the part file removed.)
async function moveFile(tmp, dest) {
  await fs.writeFile(dest, await fs.readFile(tmp));
  await fs.unlink(tmp).catch(() => null);
}
const removeFile = (path) => fs.unlink(path).catch(() => null);

import { DATA_REL, REPO, MOD } from "./id.js";
export { DATA_REL };
const DATA = `${appHome()}/${DATA_REL}`;
const PMD = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const PORTRAITS = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait";
// Bump when the GIF recipe changes, so old caches are rebuilt.
const VERSION = 7; // 3: the seasonal reactions' animations; 4: sparring's; 5: fidgets and pokes; 6: dizzy; 7: battles facing left and right

// PMD sheets have one row per facing: 0 down, 1 down-right, 2 right, 3 up-right,
// 4 up, 5 up-left, 6 left, 7 down-left. Walk sideways, stand half-facing the viewer
// (idleR/idleL), or face the viewer square on (idleD and every reaction).
const CUTS = [
  ["walkR", "Walk", 2],
  ["walkL", "Walk", 6],
  ["idleR", "Idle", 1],
  ["idleL", "Idle", 7],
  ["idleD", "Idle", 0],
  ["sleep", "Sleep", 0],
];
const REACT_ANIMS = [...new Set([...Object.values(REACTIONS).flat(), ...FIDGETS])];

const pad = (id) => String(id).padStart(4, "0");

// ImageMagick 7 is `magick`; 6 is `convert` + `identify`. Null when neither runs.
let tools = null;
export async function imageMagick() {
  if (tools) return tools;
  const ok = async (cmd, args) => (await exec(cmd, args).catch(() => null))?.code === 0;
  if (await ok("magick", ["-version"])) tools = { convert: ["magick"], identify: ["magick", "identify"], mogrify: ["magick", "mogrify"] };
  else if (await ok("convert", ["-version"])) tools = { convert: ["convert"], identify: ["identify"], mogrify: ["mogrify"] };
  else tools = false;
  return tools;
}

async function im(kind, args) {
  const t = await imageMagick();
  if (!t) throw new Error("ImageMagick not found");
  const [cmd, ...pre] = t[kind];
  // A time limit: one that hung (it happened, cutting a reaction) held its whole set "loading".
  const r = await exec(cmd, [...pre, ...args], { timeout: 30000 });
  if (r.code !== 0) throw new Error(r.stderr.trim() || `${cmd} failed`);
  return r.stdout.trim();
}

async function curl(pairs) {
  const args = ["-sfL", "--retry", "2", "--connect-timeout", "10"];
  for (const [file, url] of pairs) args.push("-o", file, url);
  const r = await exec("curl", args);
  if (r.code !== 0) throw new Error(`download failed (curl ${r.code})`);
}

// Several downloads at once (curl --parallel); a missing one is left out, not an error. Returns
// which files are there afterwards.
async function curlAll(pairs) {
  if (!pairs.length) return new Set();
  const args = ["-sfL", "--retry", "2", "--connect-timeout", "10", "--parallel", "--parallel-max", "8"];
  for (const [file, url] of pairs) args.push("-o", file, url);
  await exec("curl", args);
  const have = new Set();
  for (const [file] of pairs) if (await fs.exists(file).catch(() => false)) have.add(file);
  return have;
}

// Runs `jobs` (functions returning promises), `n` at a time.
async function pool(jobs, n) {
  const out = [];
  let i = 0;
  const run = async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } };
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, run));
  return out;
}

function parseAnims(xml) {
  const anims = {};
  for (const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const body = m[1];
    const get = (tag) => body.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];
    const name = get("Name");
    if (!name) continue;
    anims[name] = {
      name,
      copyOf: get("CopyOf") ?? null,
      fw: Number(get("FrameWidth")),
      fh: Number(get("FrameHeight")),
      durations: [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((d) => Number(d[1])),
    };
  }
  return anims;
}

// Follows CopyOf ("Idle is the same as Walk") to the animation that owns a sheet.
function resolve(anims, name) {
  let a = anims[name];
  for (let hops = 0; a?.copyOf && hops < 4; hops++) a = anims[a.copyOf];
  return a && a.fw > 0 && a.fh > 0 ? a : null;
}

// One facing of one animation as a looping GIF, pixel-doubled with nearest neighbour.
// Returns its size and the box its visible pixels fill (feet = box bottom).
async function cut(sheet, anim, row, scale, out) {
  const [w, h] = (await im("identify", ["-format", "%w %h", sheet])).split(" ").map(Number);
  const rows = Math.max(1, Math.floor(h / anim.fh));
  const cols = Math.max(1, Math.floor(w / anim.fw));
  const y = Math.min(row, rows - 1) * anim.fh;
  const n = Math.min(cols, anim.durations.length || cols);
  // Durations are game frames (1/60 s); GIF delays are 1/100 s.
  const cs = (anim.durations.length ? anim.durations : [10]).slice(0, n).map((d) => Math.max(2, Math.round((d * 100) / 60)));
  const delay = cs.slice(0, -1).map((c, i) => `t==${i}?${c}:`).join("") + cs[cs.length - 1];
  await im("convert", [
    sheet, "-crop", `${n * anim.fw}x${anim.fh}+0+${y}`, "+repage",
    "-crop", `${anim.fw}x${anim.fh}`, "+repage",
    "-scale", `${scale * 100}%`,
    "-set", "delay", `%[fx:${delay}]`, "-set", "dispose", "Background", "-loop", "0", out,
  ]);
  const box = await im("convert", [out, "-coalesce", "-background", "none", "-flatten", "-format", "%@", "info:"]);
  const m = box.match(/(\d+)x(\d+)\+(-?\d+)\+(-?\d+)/);
  const fw = Math.round(anim.fw * scale); // (1.5x: a half pixel, rounded as ImageMagick does)
  const fh = Math.round(anim.fh * scale);
  const bb = m ? { x: +m[3], y: +m[4], w: +m[1], h: +m[2] } : { x: 0, y: 0, w: fw, h: fh };
  return { w: fw, h: fh, box: bb };
}

// One job at a time per key, whoever asks: every window's strip shares this module, so N windows
// asking for the same sprite set (at start, a new agent) build it once, not N times side by side
// (N × ~180 ImageMagick runs, each writing the same files another was reading).
const inflight = new Map();
const once = (key, fn) => {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
  return inflight.get(key);
};
// The sprite sheets and AnimData.xml, gone once the set is cut (only the GIFs are drawn: the
// sheets were half of a 470 MB cache). A rebuild downloads them again.
async function dropSheets(dir) {
  for (const n of await fs.readdir(dir).catch(() => [])) {
    if (n.endsWith(".png") || n === "AnimData.xml") await fs.unlink(`${dir}/${n}`).catch(() => null);
  }
}

// How tall a Pokémon is drawn in its sheet's first frame (px, at 1x): its frame trimmed of the
// see-through around it.
async function drawnHeight(sheet, anim) {
  const bb = await im("convert", [sheet, "-crop", `${anim.fw}x${anim.fh}+0+0`, "+repage", "-trim", "-format", "%h", "info:"]);
  return Number(bb) || 99;
}

// Builds (once) and returns a Pokémon's sprite set: { walkR, walkL, idleR, idleL, idleD, sleep,
// react: { <anim>: cut + { ms } } }, each cut { path, w, h, box }. Shiny ones come from
// SpriteCollab's shiny sub-folder; `form` (a folder under sprite/<dex>/) picks a form, e.g. its
// Mega. Cached on disk; meta.json is written last and marks it done.
// Fast the first time: every sheet downloads at once; the six it walks, stands and sleeps with
// are cut together and handed to `onCore` (with no reactions yet) so it can show at once; its
// reactions are cut after, four at a time.
// `form` "female": its female sprite (gender.js femaleSprite), sprite/<dex>/0000/<0000|0001>/0002.
// Every caller's `onCore` hears when its walking, standing and sleeping are cut, not only the first
// one's (a strip asking after the picker waited for the whole set: a Poké Ball if it never came).
const cores = new Map(); // key -> { meta (once cut), fns: [onCore] }
// At most BUILDS_AT_ONCE sets cut at a time, the rest waiting their turn: clicking quickly through
// a line in the picker started a set each (a dozen ImageMagick runs at once), and Herdr gave up
// re-rendering the view ("interrupted"). One already cut (meta.json) loads at once anyway.
export const BUILDS_AT_ONCE = 2;
let building = 0;
const waiting = [];
async function inTurn(f) {
  if (building >= BUILDS_AT_ONCE) await new Promise((r) => waiting.push(r));
  building++;
  try { return await f(); } finally { building--; waiting.shift()?.(); }
}
export const loadSprite = (dex, shiny, form = null, onCore = null) => {
  const key = `sprite|${dex}|${shiny}|${form}`;
  const c = cores.get(key) ?? { meta: null, fns: [] };
  cores.set(key, c);
  if (onCore) { if (c.meta) { try { onCore(c.meta); } catch {} } else c.fns.push(onCore); }
  return once(key, () => inTurn(() => buildSprite(dex, shiny, form, (meta) => {
    c.meta = meta;
    for (const f of c.fns.splice(0)) { try { f(meta); } catch {} }
  })).finally(() => cores.delete(key)));
};
async function buildSprite(dex, shiny, form = null, onCore = null) {
  // A form is a SpriteCollab folder ("0001"); one from the tracker never makes a path of its own.
  if (form && form !== "female" && !/^\d{4}$/.test(form)) throw new Error(`odd form ${form}`);
  const female = form === "female";
  const folder = `${pad(dex)}${female ? "-f" : form ? `-${form}` : ""}${shiny ? "s" : ""}`;
  const dir = `${DATA}/sprites/${folder}`;
  const metaFile = `${dir}/meta.json`;
  if (await fs.exists(metaFile).catch(() => false)) {
    try {
      const meta = JSON.parse(await fs.readFile(metaFile, "utf8"));
      // (One cut at another scale than spriteScale gives now, by its frame's size before: made again.)
      // (`drawn` kept with it, so this is the same measure as when it was cut; one from before has
      // only its box to go by, once.)
      const stale = spriteScale(meta.drawn ?? (meta.walkR?.box?.h ?? 0) / (meta.scale || 2)) !== meta.scale;
      if (meta.version === VERSION && !stale) { dropSheets(dir); return meta; } // (sheets left from before: gone)
    } catch {}
  }
  await fs.mkdir(dir, { recursive: true });
  const base = female ? `${PMD}/${pad(dex)}/0000/${shiny ? "0001" : "0000"}/0002`
    : `${PMD}/${pad(dex)}${form ? `/${form}` : ""}${shiny ? (form ? "/0001" : "/0000/0001") : ""}`;
  await curl([[`${dir}/AnimData.xml`, `${base}/AnimData.xml`]]);
  const anims = parseAnims(await fs.readFile(`${dir}/AnimData.xml`, "utf8"));
  const walk = resolve(anims, "Walk");
  if (!walk) throw new Error("no walking animation");
  const pick = { Walk: walk, Idle: resolve(anims, "Idle") ?? walk };
  pick.Sleep = resolve(anims, "Sleep") ?? pick.Idle;
  const reacts = {};
  for (const name of REACT_ANIMS) {
    const a = resolve(anims, name);
    if (a) reacts[name] = a;
  }
  // The sheets it needs, together; each reaction's on its own, dropped if it can't be had.
  const plan = sheetPlan(pick, reacts);
  const sheet = (n) => [`${dir}/${n}.png`, `${base}/${n}-Anim.png`];
  const have = await curlAll([...plan.core, ...plan.optional].map(sheet));
  if (plan.core.some((n) => !have.has(`${dir}/${n}.png`))) await curl(plan.core.map(sheet)); // again, or the error
  for (const n of plan.optional) {
    if (!have.has(`${dir}/${n}.png`)) for (const [name, anim] of Object.entries(reacts)) if (anim.name === n) delete reacts[name];
  }
  // How big it's drawn: 2x, or less for a big one so it stays under SHOWN_MAX (spriteScale).
  const drawn = await drawnHeight(`${dir}/${walk.name}.png`, walk).catch(() => 30);
  const scale = spriteScale(drawn);
  const meta = { version: VERSION, dex, shiny, scale, drawn, react: {} };
  const rel = `${DATA_REL}/sprites/${folder}`;
  await Promise.all(CUTS.map(async ([key, which, row]) => {
    const anim = pick[which];
    const size = await cut(`${dir}/${anim.name}.png`, anim, row, scale, `${dir}/${key}.gif`);
    meta[key] = { path: `${rel}/${key}.gif`, ...size };
  }));
  if (onCore) { try { onCore({ ...meta, react: {} }); } catch {} }
  // Each reaction, and battle moves also facing right (row 2) and left (row 6).
  const jobs = [];
  for (const [name, anim] of Object.entries(reacts)) {
    const ms = Math.round(((anim.durations.length ? anim.durations : [10]).reduce((t, d) => t + d, 0) * 1000) / 60);
    const rows = [["", 0], ...(FACING.includes(name) ? [["R", 2], ["L", 6]] : [])];
    for (const [side, row] of rows) {
      jobs.push(async () => {
        const f = `react-${name}${side}.gif`;
        // One reaction that can't be cut is left out, not the whole set.
        const sz = await cut(`${dir}/${anim.name}.png`, anim, row, scale, `${dir}/${f}`).catch(() => null);
        if (sz) meta.react[`${name}${side}`] = { path: `${rel}/${f}`, ...sz, ms };
      });
    }
  }
  await pool(jobs, 4);
  await fs.writeFile(metaFile, JSON.stringify(meta));
  await dropSheets(dir);
  return meta;
}

// A sprite's white silhouette (the same GIF, every pixel white, its see-through kept): what a
// Pokémon flashes as a blow lands, made once beside it ("<name>-w.gif"). `rel`: its path as
// meta.json has it.
export const whitePath = (rel) => rel.replace(/\.gif$/, "-w.gif");
export const ensureWhite = (rel) => once(`ensureWhite|${[rel].join("|")}`, () => ensureWhiteNow(rel));
async function ensureWhiteNow(rel) {
  const src = `${appHome()}/${rel}`, out = `${appHome()}/${whitePath(rel)}`;
  if (await fs.exists(out).catch(() => false)) return;
  const tmp = out.replace(/\.gif$/, ".part.gif");
  await im("convert", [src, "-coalesce", "-fill", "white", "-colorize", "100", "-set", "dispose", "Background", tmp]);
  await moveFile(tmp, out);
}

// An Alpha's ring on the ground: an ellipse, a bright red rim round a pale red inside, drawn once
// (a box with round ends looked like a pill, not a ring). Returns its path as drawn.
export const RING_REL = `${DATA_REL}/art/alpha-ring.png`;
export async function ensureRing() {
  const file = `${DATA}/art/alpha-ring.png`;
  if (await fs.exists(file).catch(() => false)) return RING_REL;
  if (!(await imageMagick())) throw new Error("ImageMagick not found");
  await fs.mkdir(`${DATA}/art`, { recursive: true });
  const tmp = `${file}.part.png`;
  await im("convert", ["-size", "240x48", "xc:none", "-fill", "#ff5a5a50", "-stroke", "#ff4040", "-strokewidth", "5",
    "-draw", "ellipse 120,24 114,19 0,360", tmp]);
  await moveFile(tmp, file);
  return RING_REL;
}

// The Mega Evolution symbol, as the games show it over a Pokémon Mega Evolving: a ring in the
// rainbow's colours, a white drop of light inside (the symbol's DNA-like curl, simplified). Drawn
// once (64 px). Returns its path as drawn.
export const MEGA_MARK_REL = `${DATA_REL}/art/mega-mark-v1.png`;
export async function ensureMegaMark() {
  const file = `${DATA}/art/mega-mark-v1.png`;
  if (await fs.exists(file).catch(() => false)) return MEGA_MARK_REL;
  if (!(await imageMagick())) throw new Error("ImageMagick not found");
  await fs.mkdir(`${DATA}/art`, { recursive: true });
  const tmp = `${file}.part.png`;
  const colors = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
  const arcs = colors.flatMap((c, k) => ["-stroke", c, "-strokewidth", "6", "-fill", "none", "-draw", `arc 6,6 58,58 ${k * 60 - 90},${k * 60 - 28}`]);
  await im("convert", ["-size", "64x64", "xc:none", ...arcs,
    "-stroke", "none", "-fill", "#ffffffee", "-draw", "circle 32,32 32,14",
    "-fill", "#b070ff", "-draw", "path 'M 32,18 C 44,30 42,44 32,46 C 22,44 20,30 32,18 Z'",
    "-fill", "#ffffff", "-draw", "circle 32,38 32,34", tmp]);
  await moveFile(tmp, file);
  return MEGA_MARK_REL;
}

// The picker's icons: SpriteCollab's 40x40 portrait, doubled when ImageMagick is there.
// Fetched one at a time, only for the Pokémon the picker shows.
// A regional form's icon is its own portrait (portrait/<dex>/<form>/).
export const iconPath = (dex, form) => `${DATA_REL}/icons/${dex}${form ? `-${form}` : ""}.png`;

// Every icon already downloaded, by key ("25", "26-0001"): read once, so the picker can draw those
// at once instead of blank till each is checked (scrolling blinked).
export async function cachedIcons() {
  const names = await fs.readdir(`${DATA}/icons`).catch(() => []);
  return new Set(names.filter((n) => n.endsWith(".png")).map((n) => n.slice(0, -4)));
}

export const ensureIcon = (dex, form) => once(`ensureIcon|${[dex, form].join("|")}`, () => ensureIconNow(dex, form));
async function ensureIconNow(dex, form) {
  const dir = `${DATA}/icons`;
  const file = `${dir}/${dex}${form ? `-${form}` : ""}.png`;
  if (await fs.exists(file).catch(() => false)) return;
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.part`;
  await curl([[tmp, `${PORTRAITS}/${pad(dex)}${form ? `/${form}` : ""}/Normal.png`]]);
  if (await imageMagick()) await im("mogrify", ["-scale", "200%", tmp]).catch(() => null);
  await moveFile(tmp, file);
}

// Item and badge art from PokeAPI's sprites ("items/fire-stone", "badges/3"), downloaded once.
// Items are 30 px of pixel art: saved at 2x, sharp (ImageMagick's -scale, no smoothing).
const POKEAPI = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
export const artPath = (key) => `${DATA_REL}/art/${key.replace("/", "-")}.png`;
export const ensureArt = (key) => once(`ensureArt|${[key].join("|")}`, () => ensureArtNow(key));
async function ensureArtNow(key) {
  const dir = `${DATA}/art`;
  const file = `${dir}/${key.replace("/", "-")}.png`;
  if (await fs.exists(file).catch(() => false)) return;
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.part`;
  await curl([[tmp, `${POKEAPI}/${key}.png`]]);
  if (key.startsWith("items/") && (await imageMagick())) await im("mogrify", ["-scale", "200%", tmp]).catch(() => null);
  await moveFile(tmp, file);
}

// A species' cry (PokeAPI's cries, Ogg Vorbis), turned into an MP3 for playSound with ffmpeg.
// Null when it can't be had (no ffmpeg, no network): the caller stays quiet.
const CRIES = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";
export const cryPath = (dex) => `${DATA_REL}/cries/${dex}.mp3`;
let ffmpeg = null; // null: not checked yet
export async function ensureCry(dex) {
  const dir = `${DATA}/cries`;
  const file = `${dir}/${dex}.mp3`;
  if (await fs.exists(file).catch(() => false)) return cryPath(dex);
  ffmpeg ??= (await exec("ffmpeg", ["-version"]).catch(() => null))?.code === 0;
  if (!ffmpeg) return null;
  await fs.mkdir(dir, { recursive: true });
  const ogg = `${dir}/${dex}.ogg`;
  await curl([[ogg, `${CRIES}/${dex}.ogg`]]);
  const r = await exec("ffmpeg", ["-loglevel", "error", "-y", "-i", ogg, "-q:a", "5", file]);
  await removeFile(ogg);
  return r.code === 0 ? cryPath(dex) : null;
}

// The same cry, soft (a quarter of the volume, easing in): for a rare wild one walking in, so it
// says so without making you jump. "<dex>-q.mp3" beside it.
export async function ensureQuietCry(dex) {
  const loud = await ensureCry(dex);
  if (!loud) return null;
  const rel = `${DATA_REL}/cries/${dex}-q.mp3`, file = `${DATA}/cries/${dex}-q.mp3`;
  if (await fs.exists(file).catch(() => false)) return rel;
  const r = await exec("ffmpeg", ["-loglevel", "error", "-y", "-i", `${DATA}/cries/${dex}.mp3`, "-af", "volume=0.25,afade=t=in:d=0.25", "-q:a", "5", file]);
  return r.code === 0 ? rel : null;
}

// The Megas drawn since this release: SpriteCollab's tracker, read at most once a day and boiled
// down to data/pokemon-herd/megas.json ({ v: 2, at, megas }).
const TRACKER = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/tracker.json";
const MEGAS_FILE = `${DATA}/megas.json`;

// The saved list, or null when there is none yet.
export async function savedMegas() {
  try {
    const saved = JSON.parse(await fs.readFile(MEGAS_FILE, "utf8"));
    return saved?.v === 2 && typeof saved.megas === "object" ? saved : null; // v1 had one Mega each
  } catch {
    return null;
  }
}

// Fetches the tracker again when the saved list is a day old; returns the new megas, or null when
// it wasn't due. A failed fetch keeps the old list and waits another day.
export const refreshMegas = (saved, now = Date.now()) => once("megas", () => refreshMegasNow(saved, now)); // one download (10 MB) for every window
async function refreshMegasNow(saved, now = Date.now()) {
  if (!isStale(saved?.at, now)) return null;
  await fs.mkdir(DATA, { recursive: true });
  const tmp = `${DATA}/tracker.json.part`;
  let megas = saved?.megas ?? {};
  try {
    await curl([[tmp, TRACKER]]);
    const fresh = megasFrom(JSON.parse(await fs.readFile(tmp, "utf8")));
    if (Object.keys(fresh).length) megas = fresh; // an empty or odd tracker never wipes the list
  } finally {
    await removeFile(tmp);
    await fs.writeFile(MEGAS_FILE, JSON.stringify({ v: 2, at: now, megas }));
  }
  return megas;
}

// The newest release's VERSION on GitHub (read from its id.js at most once a day, kept in
// data/pokemon-herd/latest.json), or null when not known. A failed read keeps the last one.
// `fresh`: read it now, whenever it was last read (Settings, on opening).
const LATEST_FILE = `${DATA}/latest.json`;
export async function latestVersion(now = Date.now(), fresh = false) {
  let saved = null;
  try {
    saved = JSON.parse(await fs.readFile(LATEST_FILE, "utf8"));
  } catch {}
  if (!fresh && !isStale(saved?.at, now)) return saved?.version ?? null;
  await fs.mkdir(DATA, { recursive: true });
  const tmp = `${DATA}/id.js.part`;
  let version = saved?.version ?? null;
  try {
    await curl([[tmp, `https://raw.githubusercontent.com/${REPO}/main/mods/pokemon-herd/id.js`]]);
    version = versionIn(await fs.readFile(tmp, "utf8")) ?? version;
  } catch {
    // offline or rate-limited: try again tomorrow
  } finally {
    await removeFile(tmp);
    await fs.writeFile(LATEST_FILE, JSON.stringify({ at: now, version }));
  }
  return version;
}


// A trainer's look (trainers.js: our own pixel art, coloured by its class), cut once into GIFs
// beside the sprites: walking (step, stand, step, stand) and standing, facing right and left,
// at TRAINER_SCALE. Returns { walkR, walkL, standR, standL } paths as main.js draws them, and
// the size, or null without ImageMagick.
export const TRAINER_SCALE = 2;
export const ensureTrainer = (cls) => once(`trainer|${cls}`, () => ensureTrainerNow(cls));
async function ensureTrainerNow(cls) {
  const { classOf, framesOf, pixelsOf, TRAINER_W, TRAINER_H } = await import("./trainers.js");
  const dir = `${DATA}/trainers/${cls}`;
  const rel = `${DATA_REL}/trainers/${cls}`;
  // A picture drawn for it, shipped with the mod (art/trainers/<class>.png: standing, facing left,
  // see-through): that, and the same facing right (flipped once); its size as drawn.
  const own = `mods/${MOD}/art/trainers/${cls}.png`;
  if (await fs.exists(`${appHome()}/${own}`).catch(() => false)) {
    if (!(await imageMagick())) return null;
    const size = (await im("identify", ["-format", "%w %h", `${appHome()}/${own}`])).split(" ").map(Number);
    await fs.mkdir(dir, { recursive: true });
    const right = `${dir}/own-right.png`;
    if (!(await fs.exists(right).catch(() => false))) { await im("convert", [`${appHome()}/${own}`, "-flop", `${right}.part.png`]); await moveFile(`${right}.part.png`, right); }
    return { custom: true, standL: own, walkL: own, standR: `${rel}/own-right.png`, walkR: `${rel}/own-right.png`, w: size[0], h: size[1] };
  }
  const out = { walkR: `${rel}/walkR.gif`, walkL: `${rel}/walkL.gif`, standR: `${rel}/standR.gif`, standL: `${rel}/standL.gif`, w: TRAINER_W * TRAINER_SCALE, h: TRAINER_H * TRAINER_SCALE };
  if (await fs.exists(`${dir}/standL.gif`).catch(() => false)) return out;
  if (!(await imageMagick())) return null;
  await fs.mkdir(dir, { recursive: true });
  const colors = classOf(cls).colors;
  const frames = framesOf();
  for (const [name, rows] of Object.entries(frames)) {
    const draws = Object.entries(pixelsOf(rows, colors)).flatMap(([c, pts]) => ["-fill", c, "-draw", pts.map(([x, y]) => `point ${x},${y}`).join(" ")]);
    await im("convert", ["-size", `${TRAINER_W}x${TRAINER_H}`, "xc:none", ...draws, "-scale", `${TRAINER_SCALE * 100}%`, `${dir}/${name}.png`]);
  }
  const f = (n) => `${dir}/${n}.png`;
  await im("convert", ["-delay", "16", "-dispose", "Background", f("step1"), f("stand"), f("step2"), f("stand"), "-loop", "0", `${dir}/walkR.part.gif`]);
  await moveFile(`${dir}/walkR.part.gif`, `${dir}/walkR.gif`);
  await im("convert", [`${dir}/walkR.gif`, "-coalesce", "-flop", `${dir}/walkL.part.gif`]);
  await moveFile(`${dir}/walkL.part.gif`, `${dir}/walkL.gif`);
  await im("convert", [f("stand"), `${dir}/standR.part.gif`]);
  await moveFile(`${dir}/standR.part.gif`, `${dir}/standR.gif`);
  await im("convert", [f("stand"), "-flop", `${dir}/standL.part.gif`]);
  await moveFile(`${dir}/standL.part.gif`, `${dir}/standL.gif`);
  for (const n of Object.keys(frames)) await removeFile(f(n));
  return out;
}
