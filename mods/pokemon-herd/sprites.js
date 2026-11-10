// Fetches and prepares the art. Nothing Pokémon ships with this mod: on first use it
// downloads sprite sheets and portraits from PMDCollab's SpriteCollab into
// ~/.config/herdr-app/data/pokemon-herd/, and cuts them into GIFs with ImageMagick.
import { exec, appHome } from "herdr";
import * as fs from "fs/promises";
import { REACTIONS } from "./react.js";
import { sheetPlan } from "./sheets.js";

import { DATA_REL } from "./id.js";
export { DATA_REL };
const DATA = `${appHome()}/${DATA_REL}`;
const PMD = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const PORTRAITS = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait";
// Bump when the GIF recipe changes, so old caches are rebuilt.
const VERSION = 2;

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
const REACT_ANIMS = [...new Set(Object.values(REACTIONS).flat())];

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
  const r = await exec(cmd, [...pre, ...args]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `${cmd} failed`);
  return r.stdout.trim();
}

async function curl(pairs) {
  const args = ["-sfL", "--retry", "2", "--connect-timeout", "10"];
  for (const [file, url] of pairs) args.push("-o", file, url);
  const r = await exec("curl", args);
  if (r.code !== 0) throw new Error(`download failed (curl ${r.code})`);
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
  const fw = anim.fw * scale;
  const fh = anim.fh * scale;
  const bb = m ? { x: +m[3], y: +m[4], w: +m[1], h: +m[2] } : { x: 0, y: 0, w: fw, h: fh };
  return { w: fw, h: fh, box: bb };
}

// Builds (once) and returns a Pokémon's sprite set: { walkR, walkL, idleR, idleL, idleD, sleep,
// react: { <anim>: cut + { ms } } }, each cut { path, w, h, box }. Shiny ones come from
// SpriteCollab's shiny sub-folder; `form` (a folder under sprite/<dex>/) picks a form, e.g. its
// Mega. Cached on disk; meta.json is written last and marks it done.
export async function loadSprite(dex, shiny, form = null) {
  const folder = `${pad(dex)}${form ? `-${form}` : ""}${shiny ? "s" : ""}`;
  const dir = `${DATA}/sprites/${folder}`;
  const metaFile = `${dir}/meta.json`;
  if (await fs.exists(metaFile).catch(() => false)) {
    try {
      const meta = JSON.parse(await fs.readFile(metaFile, "utf8"));
      if (meta.version === VERSION) return meta;
    } catch {}
  }
  await fs.mkdir(dir, { recursive: true });
  const base = `${PMD}/${pad(dex)}${form ? `/${form}` : ""}${shiny ? (form ? "/0001" : "/0000/0001") : ""}`;
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
  await curl(plan.core.map((n) => [`${dir}/${n}.png`, `${base}/${n}-Anim.png`]));
  for (const n of plan.optional) {
    const ok = await curl([[`${dir}/${n}.png`, `${base}/${n}-Anim.png`]]).then(() => true, () => false);
    if (!ok) for (const [name, anim] of Object.entries(reacts)) if (anim.name === n) delete reacts[name];
  }
  // Big Pokémon (Onix, Gyarados...) have big frames: draw those at 1x.
  const scale = walk.fh > 64 ? 1 : 2;
  const meta = { version: VERSION, dex, shiny, scale, react: {} };
  const rel = `${DATA_REL}/sprites/${folder}`;
  for (const [key, which, row] of CUTS) {
    const anim = pick[which];
    const size = await cut(`${dir}/${anim.name}.png`, anim, row, scale, `${dir}/${key}.gif`);
    meta[key] = { path: `${rel}/${key}.gif`, ...size };
  }
  for (const [name, anim] of Object.entries(reacts)) {
    const file = `react-${name}.gif`;
    const size = await cut(`${dir}/${anim.name}.png`, anim, 0, scale, `${dir}/${file}`);
    const ms = Math.round(((anim.durations.length ? anim.durations : [10]).reduce((t, d) => t + d, 0) * 1000) / 60);
    meta.react[name] = { path: `${rel}/${file}`, ...size, ms };
  }
  await fs.writeFile(metaFile, JSON.stringify(meta));
  return meta;
}

// The picker's icons: SpriteCollab's 40x40 portrait, doubled when ImageMagick is there.
// Fetched one at a time, only for the Pokémon the picker shows.
// A regional form's icon is its own portrait (portrait/<dex>/<form>/).
export const iconPath = (dex, form) => `${DATA_REL}/icons/${dex}${form ? `-${form}` : ""}.png`;

export async function ensureIcon(dex, form) {
  const dir = `${DATA}/icons`;
  const file = `${dir}/${dex}${form ? `-${form}` : ""}.png`;
  if (await fs.exists(file).catch(() => false)) return;
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.part`;
  await curl([[tmp, `${PORTRAITS}/${pad(dex)}${form ? `/${form}` : ""}/Normal.png`]]);
  if (await imageMagick()) await im("mogrify", ["-scale", "200%", tmp]).catch(() => null);
  const r = await exec("mv", ["-f", tmp, file]); // no fs.rename here
  if (r.code !== 0) throw new Error("icon move failed");
}
