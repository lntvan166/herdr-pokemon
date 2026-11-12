#!/usr/bin/env python3
"""Builds the README's demo GIFs into docs/demo/, drawn from the sprites the mod has already
downloaded (~/.config/herdr-app/data/pokemon-herd/sprites/). Each scene names the sprite sets it
needs; a missing one means: pick that Pokémon (or form) once in the mod's picker, then rerun.

    python3 scripts/make-demos.py            # every scene
    python3 scripts/make-demos.py herd focus # some

The sprites are PMDCollab's SpriteCollab (CC BY-NC 4.0): the README credits them under the GIFs.
Needs ImageMagick 7 (`magick`) and the DejaVu Sans font.
"""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile

SPRITES = os.path.expanduser("~/.config/herdr-app/data/pokemon-herd/sprites")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "demo")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
TICK = 50  # ms per frame
BG, LINE, MUTED, FG = "#16171b", "#2b2d34", "#8b8f98", "#e6e6e6"
DOT = {"idle": "#6b7080", "working": "#e8b062", "done": "#7bc47f", "blocked": "#e5534b"}
ACCENT = "#7aa2f7"
ROW_H = 122  # one row: sprites above the ground line, then two lines for names
GROUND = 80  # ground line's y within a row
NIGHT = {"focus"}  # scenes drawn by night (Scenery); the rest by day
SCENE_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mods", "pokemon-herd", "scene.js")
# The current scene's time of day, its season per row (None: summer; else scene.js's { a, b, t }),
# and the backgrounds drawn so far.
sky = {"night": 0, "light": False, "season": None, "dir": None, "cache": {}, "flakes": {}}
SEASON = {"spring": 0, "summer": 1, "autumn": 2, "winter": 3}
season = lambda name: {"a": SEASON[name], "b": SEASON[name], "t": 0}


def magick(*args):
    subprocess.run(["magick", *args], check=True)


class Anim:
    """One of the mod's GIFs for a sprite set, split into frames, with each frame's duration."""

    cache = {}

    def __init__(self, folder, name, tmp):
        meta = json.load(open(os.path.join(SPRITES, folder, "meta.json")))
        self.cut = meta[name] if name in meta else meta["react"][name.removeprefix("react-")]
        src = os.path.join(SPRITES, folder, f"{name}.gif")
        out = os.path.join(tmp, f"{folder}-{name}")
        os.makedirs(out)
        magick(src, "-coalesce", os.path.join(out, "f%03d.png"))
        self.frames = sorted(os.path.join(out, f) for f in os.listdir(out) if f.startswith("f"))
        delays = subprocess.run(["magick", "identify", "-format", "%T\n", src], check=True, capture_output=True, text=True).stdout.split()
        self.ms = [max(20, int(d) * 10) for d in delays][: len(self.frames)]
        self.total = sum(self.ms)
        self.white = []
        for f in self.frames:  # white silhouettes, for the Mega Evolution glow
            w = f.replace(".png", "-white.png")
            magick(f, "-fill", "white", "-colorize", "100", w)
            self.white.append(w)

    @classmethod
    def get(cls, folder, name, tmp):
        key = (folder, name)
        if key not in cls.cache:
            cls.cache[key] = Anim(folder, name, tmp)
        return cls.cache[key]

    def at(self, t, white=False, once=False):
        t = min(t, self.total - 1) if once else t % self.total
        for i, d in enumerate(self.ms):
            if t < d:
                return (self.white if white else self.frames)[i]
            t -= d
        return self.frames[-1]

    def place(self, cx, ground):
        b = self.cut["box"]
        return round(cx - (b["x"] + b["w"] / 2)), round(ground - (b["y"] + b["h"]))

    def height(self):
        return self.cut["box"]["h"]


class Mon:
    """What one Pokémon shows in a frame."""

    def __init__(self, anim, cx, row, tag, status="idle", t=0, white=False, once=False, bubble=None, zz=False,
                 sparkles=(), bright=False):
        self.__dict__.update(locals())
        del self.__dict__["self"]


_glyphs = {}


def glyph_width(text, size):
    """The drawn width of `text` in DejaVu Sans at `size` (ImageMagick's own measure)."""
    key = (text, size)
    if key not in _glyphs:
        out = subprocess.run(["magick", "-font", FONT, "-pointsize", str(size), f"label:{text}", "-trim", "-format", "%w", "info:"],
                             check=True, capture_output=True, text=True).stdout
        _glyphs[key] = int(out or 0)
    return _glyphs[key]


def tag_lines(mons):
    """As the mod does: standing Pokémon's names on the first line, a walking one's drops to the
    second when it would overlap one there."""
    taken, line = {}, {}
    order = sorted(mons, key=lambda m: "walk" in m.anim.frames[0])
    for m in order:
        w = len(m.tag) * 7 + 12
        span = (m.cx - w / 2 - 4, m.cx + w / 2 + 4)
        for ln in (0, 1):
            spans = taken.setdefault((m.row, ln), [])
            if ln == 1 or all(span[1] < a or span[0] > b for a, b in spans):
                spans.append(span)
                line[id(m)] = ln
                break
    return line


def scenery(width, rows, top, h):
    """The mod's Scenery behind the rows, from scene.js itself (same colours, same seeded hills,
    clouds, stars and tufts), drawn once per strip size and time of day."""
    seasons = [(sky["season"] or [None] * rows)[r] if sky["season"] else None for r in range(rows)]
    key = (width, rows, top, h, sky["night"], sky["light"], json.dumps(seasons))
    if key in sky["cache"]:
        return sky["cache"][key]
    js = (f"import('file://{os.path.abspath(SCENE_JS)}').then(m => console.log(JSON.stringify("
          f"{json.dumps(seasons)}.map((s, r) => {{ const f = m.features({width}, {GROUND}, r); return {{ ...f, p: m.palette({sky['night']}, {str(sky['light']).lower()}, s), treeParts: f.trees.flatMap(t => m.treeParts(t, {GROUND + 1})) }}; }}))))")
    data = json.loads(subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True).stdout)
    line = GROUND + 4
    args = ["-size", f"{width}x{h}", f"xc:{BG}"]
    flakes = []
    for r, f in enumerate(data):
        p = f["p"]
        y0 = top + r * ROW_H
        args += ["-fill", p["sky"], "-draw", f"rectangle 0,{y0} {width},{y0 + line + 5}"]
        if p["stars"] > 0.05:
            for st in f["stars"]:
                if st["y"] < line - 20:
                    sz = 2 if st["bright"] else 1
                    a = round(255 * p["stars"] * p["starAlpha"])
                    args += ["-fill", ("#ffeebb" if st["bright"] else "#cfd8ff") + f"{a:02x}", "-draw", f"rectangle {st['x']},{y0 + st['y']} {st['x'] + sz - 1},{y0 + st['y'] + sz - 1}"]
            m = f["moon"]
            args += ["-fill", f"#e9e5c8{round(255 * p['stars'] * 0.85):02x}", "-draw", f"circle {m['x'] + 5},{y0 + m['y'] + 5} {m['x'] + 10},{y0 + m['y'] + 5}"]
        if p["clouds"] > 0.05:
            a = round(255 * p["clouds"] * p["cloudAlpha"])
            for c in f["clouds"]:
                if c["y"] + 10 < line - 24:
                    x, y, w = c["x"], y0 + c["y"], c["w"]
                    args += ["-fill", f"#ffffff{a:02x}", "-draw", f"roundrectangle {x},{y + 4} {x + w},{y + 11} 4,4",
                             "-draw", f"roundrectangle {x + round(w * .25)},{y} {x + round(w * .7)},{y + 8} 5,5"]
        for hl in f["hills"]:
            args += ["-fill", p["hill"], "-draw", f"ellipse {round(hl['cx'])},{y0 + line} {round(hl['rx'])},{round(hl['ry'])} 0,360"]
        for x, y, w, hh, c, round_ in f["treeParts"]:
            shape = f"roundrectangle {x},{y0 + y} {x + w - 1},{y0 + y + hh - 1} {w / 2},{hh / 2}" if round_ else f"rectangle {x},{y0 + y} {x + w - 1},{y0 + y + hh - 1}"
            args += ["-fill", p[c], "-draw", shape]
        args += ["-fill", p["grass"], "-draw", f"rectangle 0,{y0 + line - 3} {width},{y0 + line + 3}"]
        for u in f["tufts"]:
            args += ["-fill", p["dark"] if u["dark"] else p["grass"], "-draw", f"rectangle {u['x']},{y0 + line - 3 - u['h']} {u['x']},{y0 + line - 4}"]
        if p["flowers"] > 0.05:
            for w in f["flowers"]:
                c = ("#f2a6c8" if w["pink"] else "#f4e27a") + f"{round(255 * p['flowers'] * 0.75):02x}"
                args += ["-fill", c, "-draw", f"rectangle {w['x']},{y0 + line - 4} {w['x'] + 1},{y0 + line - 3}"]
        if p["snow"] > 0.05 or p["leaves"] > 0.05:  # snow, or autumn leaves (every other flake)
            snowy = p["snow"] >= p["leaves"]
            flakes.append((y0, f["flakes"] if snowy else f["flakes"][::2], snowy, round(255 * (p["snow"] * 0.55 if snowy else p["leaves"] * 0.7))))
        args += ["-fill", p["dark"], "-draw", f"rectangle 0,{y0 + line + 4} {width},{y0 + line + 5}"]
        args += ["-fill", BG, "-draw", f"rectangle 0,{y0 + line + 6} {width},{y0 + ROW_H - 1}"]  # names keep the plain strip
    path = os.path.join(sky["dir"], f"scenery-{len(sky['cache'])}.png")
    magick(*args, path)
    sky["cache"][key] = path
    sky["flakes"][path] = flakes
    return path


def snow(background, t):
    """Falling snow over a background, at t ms: scene.js's snowAt, frame by frame."""
    out = []
    for y0, flakes, snowy, a in sky["flakes"].get(background, []):
        sec, line = t / 1000, GROUND + 4 - 2
        for i, f in enumerate(flakes):
            x = math.floor(f["x"] + math.sin(sec * 0.8 + f["phase"]) * f["drift"])
            y = y0 + math.floor((f["y"] + f["speed"] * sec) % line)
            c = "#ffffff" if snowy else ("#d9822b" if i % 2 else "#b0461f")
            out += ["-fill", f"{c}{a:02x}", "-draw", f"rectangle {x},{y} {x + 1},{y + 1}"]
    return out


def draw(path, width, rows, mons, caption=None, caption_color=MUTED, cursor=None, top=44, t=0):
    h = top + rows * ROW_H - 18 * (rows == 1)
    bg = scenery(width, rows, top, h)
    args = [bg] + snow(bg, t)
    for m in mons:
        ground = top + m.row * ROW_H + GROUND
        x, y = m.anim.place(m.cx, ground)
        args += [m.anim.at(m.t, white=m.white, once=m.once), "-geometry", f"+{x}+{y}", "-composite"]
    # Text sits on its baseline (gravity none), so names line up whatever their letters; glyphs in
    # bubbles are centred on the bubble (gravity center, offsets from the image's centre).
    args += ["-font", FONT, "-gravity", "none"]
    lines = tag_lines(mons)
    W, H = width, top + rows * ROW_H - 18 * (rows == 1)
    centred = lambda x, y: f"{round(x - W / 2):+d}{round(y - H / 2):+d}"
    for m in mons:
        ground = top + m.row * ROW_H + GROUND
        # Bubbles and "zZ" stay inside its row's sky, as in the mod (at least 2 px from its top).
        head = max(ground - m.anim.height(), top + m.row * ROW_H + 28)
        # Its name under its feet, with its status dot.
        # Dot and name centred together under it (the name's real width), pushed in at the edges.
        tw = glyph_width(m.tag, 12)
        tx = min(max(round(m.cx - (tw + 11) / 2) + 11, 14), width - tw - 4)
        ty = ground + 11 + lines[id(m)] * 18
        args += ["-fill", DOT[m.status], "-draw", f"circle {tx - 8},{ty + 7} {tx - 5},{ty + 7}"]
        args += ["-fill", FG if m.bright else MUTED, "-pointsize", "12", "-annotate", f"+{tx}+{ty + 11}", m.tag]
        if m.zz:
            z = ["z", "zZ", "zZz", "zZ"][(m.t // 700) % 4]
            args += ["-fill", MUTED, "-pointsize", "13", "-annotate", f"+{m.cx - 6}+{head - 12}", z]
        if m.bubble:  # "!" (needs you) or "✓" (done), above its head
            color = DOT["blocked"] if m.bubble == "!" else DOT["done"]
            args += ["-fill", color, "-draw", f"roundrectangle {m.cx - 9},{head - 26} {m.cx + 9},{head - 8} 6,6"]
            args += ["-fill", "#ffffff", "-pointsize", "12", "-gravity", "center", "-annotate", centred(m.cx, head - 17), m.bubble, "-gravity", "none"]
        for sx, sy, size, color in m.sparkles:
            args += ["-fill", color, "-pointsize", str(size), "-annotate", f"+{sx}+{sy + size}", "✦"]
    if caption:
        args += ["-fill", caption_color, "-pointsize", "13", "-gravity", "north", "-annotate", "+0+8", caption, "-gravity", "none"]
    if cursor:  # a mouse pointer, its tip at (x, y); pressed: a little ring
        x, y, pressed = cursor
        pts = f"{x},{y} {x},{y + 16} {x + 4},{y + 12} {x + 7},{y + 18} {x + 9},{y + 17} {x + 6},{y + 11} {x + 11},{y + 11}"
        args += ["-fill", "#ffffff", "-stroke", "#000000", "-strokewidth", "1", "-draw", f"polygon {pts}", "-stroke", "none"]
        if pressed:
            args += ["-fill", "none", "-stroke", ACCENT, "-strokewidth", "2", "-draw", f"circle {x},{y} {x + 9},{y}", "-stroke", "none"]
    magick(*args, path)


def sparkle_ring(t, cx, top, spread=46):
    k = t / TICK
    spots = [(-spread, -6), (spread - 6, 4), (-spread + 16, 30), (spread - 12, 40), (-6, -18), (spread + 6, 26)]
    out = []
    for i, (dx, dy) in enumerate(spots):
        if (k + i * 2) % 6 < 4:
            out.append((cx + dx, top + dy, 14 if (k + i) % 4 < 2 else 10, "#ffffff" if i % 2 else "#ffe9a8"))
    return out


class Scene:
    def __init__(self, name, tmp, width, rows):
        self.name, self.tmp, self.width, self.rows = name, tmp, width, rows
        self.frames = []

    def add(self, mons, **kw):
        p = os.path.join(self.tmp, f"{self.name}-{len(self.frames):04d}.png")
        draw(p, self.width, self.rows, mons, **kw)
        self.frames.append(p)

    def save(self):
        os.makedirs(OUT, exist_ok=True)
        out = os.path.join(OUT, f"{self.name}.gif")
        magick("-delay", str(TICK // 10), "-loop", "0", *self.frames, "-layers", "Optimize", out)
        print(f"{os.path.relpath(out)}: {len(self.frames)} frames, {len(self.frames) * TICK / 1000:.1f} s, {os.path.getsize(out) // 1024} KB")


# ---- scenes -------------------------------------------------------------------------------

def herd(tmp):
    """The hero: a 2-row herd in a sidebar. Names under feet; one walks off the right edge of the
    top row and carries on along the bottom row."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("herd", tmp, 360, 2)
    for i in range(160):  # 8 s
        t = i * TICK
        mons = [
            Mon(A("0025", "sleep"), 40, 0, "api", t=t, zz=True),
            Mon(A("0445", "idleR"), 245, 0, "review", t=t),
            Mon(A("0003", "sleep"), 50, 1, "docs", t=t, zz=True),
            Mon(A("0493", "idleL"), 300, 1, "tests", t=t),
        ]
        # Blastoise works: walks right along the top row, off the edge, in from the left below.
        x = 120 + t / 1000 * 46
        if x < 400:
            mons.append(Mon(A("0009", "walkR"), x, 0, "refactor auth", "working", t=t))
        else:
            mons.append(Mon(A("0009", "walkR"), x - 440, 1, "refactor auth", "working", t=t))
        # Mega Charizard X works too, strolling left and right on the bottom row.
        x2 = 190 + 50 * ((t % 4000) / 2000 if t % 4000 < 2000 else 2 - (t % 4000) / 2000) - 25
        walk = "walkR" if t % 4000 < 2000 else "walkL"
        mons.append(Mon(A("0006-0001", walk), x2, 1, "deploy", "working", t=t))
        s.add(mons, caption="every agent is a Pokémon", caption_color=MUTED)
    s.save()


def focus(tmp):
    """Click an agent: its sleeping Pokémon wakes up and looks at you."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("focus", tmp, 360, 1)
    wake, look, sleep = A("0025", "react-Wake"), A("0025", "idleD"), A("0025", "sleep")
    others = lambda t: [Mon(A("0003", "sleep"), 60, 0, "docs", t=t, zz=True), Mon(A("0493", "sleep"), 300, 0, "tests", t=t, zz=True)]
    for i in range(110):  # 5.5 s
        t = i * TICK
        cur = None
        if t < 1500:  # the pointer moves to Pikachu
            k = t / 1500
            cur = (round(330 - (330 - 186) * k), round(30 + (100 - 30) * k), False)
            pika = Mon(sleep, 180, 0, "api", t=t, zz=True)
            cap = "asleep: its agent has been idle a while"
        elif t < 1700:  # click
            cur = (186, 100, True)
            pika = Mon(sleep, 180, 0, "api", t=t, zz=True, bright=True)
            cap = "you click it (or focus its pane)…"
        elif t < 1700 + wake.total:
            cur = (186, 100, False)
            pika = Mon(wake, 180, 0, "api", t=t - 1700, once=True, bright=True)
            cap = "…it wakes up"
        else:
            cur = (186, 100, False) if t < 3000 else None
            pika = Mon(look, 180, 0, "api", t=t, bright=True)
            cap = "and looks at you"
        s.add(others(t) + [pika], caption=cap, caption_color=FG if t >= 1500 else MUTED, cursor=cur)
    s.save()


def reactions(tmp):
    """An agent finishes: its Pokémon celebrates. One needs you: it startles and calls."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("reactions", tmp, 360, 1)
    dance, hurt = A("0003", "react-Dance"), A("0445", "react-Hurt")
    for i in range(130):  # 6.5 s
        t = i * TICK
        # Venusaur works until 1.5 s, then dances (done) and faces you with a ✓.
        if t < 1500:
            v = Mon(A("0003", "walkR"), 50 + t / 1000 * 30, 0, "docs", "working", t=t)
        elif t < 1500 + 2 * dance.total:
            v = Mon(dance, 95, 0, "docs", "done", t=t - 1500, bubble="✓")
        else:
            v = Mon(A("0003", "idleD"), 95, 0, "docs", "done", t=t, bubble="✓")
        # Garchomp idles until 3.2 s, then startles (blocked) and calls with a "!".
        if t < 3200:
            g = Mon(A("0445", "idleL"), 265, 0, "review", t=t)
        elif t < 3200 + 3 * hurt.total:
            g = Mon(hurt, 265, 0, "review", "blocked", t=t - 3200, bubble="!")
        else:
            g = Mon(A("0445", "idleL"), 265, 0, "review", "blocked", t=t, bubble="!")
        cap = "done: it celebrates" if t < 3200 else "needs you: it startles and calls"
        s.add([v, g], caption=cap, caption_color=FG)
    s.save()


def variety(tmp):
    """974 Pokémon, a shiny now and then, regional forms, Mega Evolution."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("variety", tmp, 440, 1)
    for i in range(80):  # 4 s
        t = i * TICK
        shiny = A("0025s", "idleD")
        mons = [
            Mon(A("0025", "idleD"), 55, 0, "Pikachu", t=t),
            Mon(shiny, 160, 0, "✦ Pikachu", t=t, sparkles=sparkle_ring(t, 160, 44 + GROUND - shiny.height(), 30)),
            Mon(A("0037-0001", "idleD"), 270, 0, "Vulpix (Alola)", t=t),
            Mon(A("0006-0001", "idleD"), 380, 0, "Mega Charizard X", t=t),
        ]
        s.add(mons, caption="974 Pokémon · shiny 1 in 64 · regional forms · Mega", caption_color=FG)
    s.save()


def charizard_mega(tmp):
    """Charizard asleep; its agent starts working; it Mega Evolves and walks off to work."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("charizard-mega", tmp, 360, 1)
    sleep, charge, idle = A("0006", "sleep"), A("0006", "react-Charge"), A("0006", "idleD")
    mega_idle, mega_walk = A("0006-0001", "idleD"), A("0006-0001", "walkR")
    cx, t = 110, 0
    while t < 2400:
        s.add([Mon(sleep, cx, 0, "deploy", t=t, zz=True)], caption="idle")
        t += TICK
    t0 = t
    while t < t0 + 700:
        a = charge if t - t0 < charge.total else idle
        s.add([Mon(a, cx, 0, "deploy", "working", t=t - t0)], caption="its agent starts working", caption_color=FG)
        t += TICK
    t0 = t
    while t < t0 + 1800:
        k = (t - t0) / 1800
        period = max(TICK, int(400 * (1 - k)))
        a = mega_idle if ((t - t0) // period) % 2 else idle
        sp = sparkle_ring(t - t0, cx, 44 + GROUND - a.height()) if k > 0.6 else ()
        s.add([Mon(a, cx, 0, "deploy", "working", t=t - t0, white=True, sparkles=sp)], caption="…what?", caption_color=FG)
        t += TICK
    t0 = t
    while t < t0 + 1200:
        sp = sparkle_ring(t - t0, cx, 44 + GROUND - mega_idle.height())
        s.add([Mon(mega_idle, cx, 0, "deploy", "working", t=t - t0, sparkles=sp)], caption="Mega Evolution!", caption_color=ACCENT)
        t += TICK
    t0 = t
    while t < t0 + 3400:
        s.add([Mon(mega_walk, cx + (t - t0) / 1000 * 42, 0, "deploy", "working", t=t - t0)],
              caption="Mega while it works, back when it's done")
        t += TICK
    s.save()


def seasons(tmp):
    """The four seasons going by (in the mod, 3 hours each), each blending into the next."""
    A = lambda f, n: Anim.get(f, n, tmp)
    s = Scene("seasons", tmp, 480, 1)
    names, each, blend = ["spring", "summer", "autumn", "winter"], 2600, 400
    for i in range(4 * each // TICK):
        t = i * TICK
        k, into = t // each, t % each
        a = SEASON[names[k]]
        mix = max(0, (into - (each - blend)) / blend)
        sky["season"] = [{"a": a, "b": (a + 1) % 4, "t": round(mix * 4) / 4}]  # a few blend steps
        sway = lambda lo, hi, ms: lo + (hi - lo) * ((t % ms) / (ms / 2) if t % ms < ms / 2 else 2 - (t % ms) / (ms / 2))
        right = lambda ms: t % ms < ms / 2
        mons = [  # each in its own stretch, so names never cross
            Mon(A("0025", "walkR" if right(5000) else "walkL"), sway(45, 165, 5000), 0, "api", "working", t=t),
            Mon(A("0009", "sleep"), 250, 0, "docs", t=t, zz=True),
            Mon(A("0006-0001", "walkL" if right(4000) else "walkR"), sway(430, 350, 4000), 0, "deploy", "working", t=t),
        ]
        s.add(mons, caption=f"{names[k]} · a season every 3 hours", caption_color=FG, t=t)
    sky["season"] = None
    s.save()


def party(tmp):
    """party.gif: the Party panel (and Better Sidebar's cards): each agent as its Pokémon's card,
    the name large, the edge in its status colour, "review" pulsing because it needs you."""
    icons = os.path.expanduser("~/.config/herdr-app/data/pokemon-herd/icons")
    bold = FONT.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")
    raised, border, heart = "#24262c", "#3a3d45", "#e5484d"
    # tag, dex, Pokémon, status, hearts, progress (None: no bar), note: as cardOf() would say.
    cards = [
        ("auth", 4, "Charmander", "working", 2, 0.6, "6/10 jobs"),
        ("review", 94, "Gengar", "blocked", 1, None, ""),
        ("api", 25, "Pikachu", "working", 3, None, "needs a Thunder Stone"),
        ("docs", 133, "Eevee", "done", 5, 0.3, "3/10 jobs"),
        ("tests", 448, "Lucario", "idle", 4, None, ""),
    ]
    W, CH, GAP, TOP = 280, 60, 6, 34
    H = TOP + len(cards) * (CH + GAP) + 8
    frames = []
    n = 16
    for f in range(n):
        pulse = 0.5 - 0.5 * math.cos(2 * math.pi * f / n)  # 0 → 1 → 0 over the loop
        args = ["-size", f"{W}x{H}", f"xc:{BG}", "-font", FONT, "-gravity", "none",
                "-fill", MUTED, "-pointsize", "11.5", "-annotate", "+16+21", "Party",
                "-fill", "#6b7080", "-annotate", f"+{W - 22}+21", str(len(cards))]
        for i, (tag, dex, name, status, hearts, prog, note) in enumerate(cards):
            x0, y0 = 8, TOP + i * (CH + GAP)
            x1, y1 = W - 8, y0 + CH
            edge = None if status == "idle" else DOT[status]
            if status == "blocked":  # a faint edge with the full one pulsing over it
                a = round(0x55 + (0xff - 0x55) * pulse)
                edge = DOT["blocked"] + f"{a:02x}"
            args += ["-fill", raised, "-stroke", edge or raised, "-strokewidth", "2",
                     "-draw", f"roundrectangle {x0},{y0} {x1},{y1} 10,10", "-stroke", "none"]
            args += [os.path.join(icons, f"{dex}.png"), "-geometry", f"40x40+{x0 + 10}+{y0 + 10}", "-composite"]
            tx = x0 + 60
            args += ["-font", bold, "-fill", FG, "-pointsize", "14", "-annotate", f"+{tx}+{y0 + 22}", tag, "-font", FONT]
            # Its status at the end of the name's line.
            sx = x1 - 16
            if status == "working":
                op = 0.35 + 0.65 * (0.5 - 0.5 * math.cos(2 * math.pi * f / n))
                args += ["-fill", DOT["working"] + f"{round(op * 255):02x}", "-draw", f"circle {sx},{y0 + 17} {sx + 4},{y0 + 17}"]
            elif status == "blocked":
                args += ["-fill", DOT["blocked"] + "40", "-draw", f"roundrectangle {sx - 7},{y0 + 10} {sx + 7},{y0 + 24} 4,4",
                         "-fill", DOT["blocked"], "-font", bold, "-pointsize", "10.5", "-annotate", f"+{sx - 2}+{y0 + 21}", "!", "-font", FONT]
            elif status == "done":
                args += ["-fill", DOT["done"], "-font", bold, "-pointsize", "12", "-annotate", f"+{sx - 4}+{y0 + 22}", "✓", "-font", FONT]
            else:
                args += ["-fill", border, "-draw", f"circle {sx},{y0 + 17} {sx + 3},{y0 + 17}"]
            # Its Pokémon, and hearts.
            args += ["-fill", MUTED, "-pointsize", "11", "-annotate", f"+{tx}+{y0 + 39}", name,
                     "-fill", heart if hearts else border, "-annotate", f"+{x1 - 34}+{y0 + 39}", "♥",
                     "-fill", MUTED, "-annotate", f"+{x1 - 22}+{y0 + 39}", str(hearts)]
            if prog is not None:
                bw = x1 - 12 - tx - 70
                args += ["-fill", border, "-draw", f"roundrectangle {tx},{y0 + 47} {tx + bw},{y0 + 50} 1,1",
                         "-fill", ACCENT, "-draw", f"roundrectangle {tx},{y0 + 47} {tx + round(bw * prog)},{y0 + 50} 1,1",
                         "-fill", "#6b7080", "-pointsize", "10.5", "-annotate", f"+{tx + bw + 8}+{y0 + 52}", note]
            elif note:
                args += ["-fill", "#6b7080", "-pointsize", "10.5", "-annotate", f"+{tx}+{y0 + 53}", note]
        p = os.path.join(tmp, f"party-{f:04d}.png")
        magick(*args, p)
        frames.append(p)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, "party.gif")
    magick("-delay", "6", "-loop", "0", *frames, "-layers", "Optimize", out)
    print(f"{os.path.relpath(out)}: {len(frames)} frames, {os.path.getsize(out) // 1024} KB")


def bright_sky(width, height, horizon, tmp, name):
    """A bright day like the mod's Sky: Bright (scene.js palette and features): sky bands down to
    the horizon, the sun, white clouds, hills, trees, grass; dark soil below. Returns a PNG path."""
    js = (f"import('file://{os.path.abspath(SCENE_JS)}').then(m => {{ const f = m.features({width}, {horizon}, 0); "
          f"console.log(JSON.stringify({{ ...f, p: m.palette(0, false, null, 'bright'), treeParts: f.trees.flatMap(t => m.treeParts(t, {horizon + 1})) }})); }})")
    f = json.loads(subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True).stdout)
    p = f["p"]
    line = horizon + 4
    args = ["-size", f"{width}x{height}", f"xc:{BG}"]
    bands = p["bands"]
    bh = line / len(bands)
    for i, c in enumerate(bands):
        args += ["-fill", c, "-draw", f"rectangle 0,{round(i * bh)} {width},{round((i + 1) * bh) + 1}"]
    # The sun, high on the right, with a soft ring.
    sx, sy = round(width * 0.84), round(line * 0.22)
    args += ["-fill", "#fff6c855", "-draw", f"circle {sx},{sy} {sx + 17},{sy}", "-fill", "#ffe680", "-draw", f"circle {sx},{sy} {sx + 11},{sy}"]
    for c in f["clouds"]:
        x, y, w = c["x"], c["y"] * 0.6 + 4, c["w"] * 1.4
        if (x + w > sx - 22 and x < sx + 22 and y < sy + 18) or (x < width * 0.75 and y < line * 0.42):
            continue  # clear of the sun and of the title
        args += ["-fill", "#ffffffe6", "-draw", f"roundrectangle {x},{y + 5} {x + w},{y + 13} 4,4",
                 "-draw", f"roundrectangle {x + round(w * .22)},{y} {x + round(w * .7)},{y + 9} 5,5"]
    for hl in f["hills"]:
        args += ["-fill", p["hill"], "-draw", f"ellipse {round(hl['cx'])},{line} {round(hl['rx'] * 1.3)},{round(hl['ry'] * 1.5)} 0,360"]
    for x, y, w, hh, c, round_ in f["treeParts"]:
        shape = f"roundrectangle {x},{y} {x + w - 1},{y + hh - 1} {w / 2},{hh / 2}" if round_ else f"rectangle {x},{y} {x + w - 1},{y + hh - 1}"
        args += ["-fill", p[c], "-draw", shape]
    args += ["-fill", p["grass"], "-draw", f"rectangle 0,{line - 3} {width},{line + 3}"]
    for u in f["tufts"]:
        args += ["-fill", p["dark"] if u["dark"] else p["grass"], "-draw", f"rectangle {u['x']},{line - 3 - u['h']} {u['x']},{line - 4}"]
    args += ["-fill", p["dark"], "-draw", f"rectangle 0,{line + 4} {width},{line + 5}"]
    args += ["-fill", BG, "-draw", f"rectangle 0,{line + 6} {width},{height}"]  # names on the strip's own dark
    path = os.path.join(tmp, f"{name}-sky.png")
    magick(*args, path)
    return path


FIRE = {"orange": ["#ff9a3c", "#ff8a2a", "#ff7a1a", "#ff5a14", "#ffb43a", "#fff2a8"],
        "blue": ["#4fb4ff", "#3aa0ff", "#2a8cff", "#1f6fe0", "#6fd2ff", "#e8fbff"]}  # Mega Charizard X burns blue


def fireball(x, y, k=1.0, color="orange"):
    """A pixel fireball flying right, its trail behind it (ImageMagick draw args)."""
    c = FIRE[color]
    out = []
    for dx, r, col in [(-22, 2, c[0] + "66"), (-15, 3, c[1] + "99"), (-8, 4, c[2] + "cc")]:
        out += ["-fill", col, "-draw", f"circle {x + dx},{y} {x + dx + r * k},{y}"]
    out += ["-fill", c[3], "-draw", f"circle {x},{y} {x + 7 * k},{y}",
            "-fill", c[4], "-draw", f"circle {x + 1},{y} {x + 1 + 4.5 * k},{y}",
            "-fill", c[5], "-draw", f"circle {x + 2},{y} {x + 2 + 2 * k},{y}"]
    return out


def star(cx, cy, r, color):
    """A four-pointed sparkle (ImageMagick draw args)."""
    return ["-fill", color, "-draw", f"polygon {cx},{cy - r * 2} {cx + r * .5},{cy - r * .5} {cx + r * 2},{cy} {cx + r * .5},{cy + r * .5} {cx},{cy + r * 2} {cx - r * .5},{cy + r * .5} {cx - r * 2},{cy} {cx - r * .5},{cy - r * .5}"]


def burst(x, y, r=12):
    """A hit: a spiky star, yellow round white."""
    pts = []
    for i in range(16):
        a = math.pi * 2 * i / 16
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{x + math.cos(a) * rr:.1f},{y + math.sin(a) * rr:.1f}")
    small = [f"{x + math.cos(math.pi * 2 * i / 16) * (r * 0.55 if i % 2 == 0 else r * 0.25):.1f},{y + math.sin(math.pi * 2 * i / 16) * (r * 0.55 if i % 2 == 0 else r * 0.25):.1f}" for i in range(16)]
    return ["-fill", "#ffd23a", "-draw", "polygon " + " ".join(pts), "-fill", "#ffffff", "-draw", "polygon " + " ".join(small)]


def preview(tmp):
    """preview.png at the repo root (the herdr.dev gallery card, 1600x900). The card shows it about
    245 px wide (a 6.5x shrink), so it carries little and big: a 320x180 pixel scene at 5x on a
    bright day (a battle: Mega Charizard X's blue fire flying at Lucario; Pikachu asleep; a shiny Gengar
    sparkling), and the name in large type over the sky. Small sprites or thin text turn to mush
    at that size."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 320, 180, 5
    horizon = 150
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "preview")
    zard, luc = A("0006-0001", "react-SpAttackR"), A("0448", "react-HurtL")
    pika, geng = A("0025", "sleep"), A("0094s", "idleL")
    X = {"pika": 40, "zard": 126, "luc": 210, "geng": 284}
    scene = [("pika", pika, X["pika"], 300), ("zard", zard, X["zard"], 250), ("luc", luc, X["luc"], 300), ("geng", geng, X["geng"], 0)]
    args = [sky_png]
    heads = {}
    for key, an, cx, t in scene:
        x, y = an.place(cx, ground)
        args += [an.at(t), "-geometry", f"+{x}+{y}", "-composite"]
        heads[key] = (cx, ground - an.height())
    # Charizard's special move: a fireball halfway, and the hit on Lucario.
    args += fireball(X["zard"] + 52, ground - 26, color="blue")
    # Mega Evolved as its agent got to work: sparkles round it.
    for dx, dy, r, c in [(-30, -40, 2.4, "#ffffff"), (-38, -14, 1.8, "#bfe6ff"), (6, -52, 2, "#bfe6ff"), (-24, -64, 1.6, "#ffffff")]:
        args += star(X["zard"] + dx, ground + dy, r, c)
    args += burst(X["luc"] - 12, ground - 34, 10)
    # The shiny's sparkles.
    gx, gy = heads["geng"]
    for dx, dy, r, c in [(-20, 4, 3, "#ffffff"), (18, 10, 2.5, "#ffe9a8"), (-14, 30, 2, "#ffe9a8"), (22, 34, 3, "#ffffff")]:
        cx, cy = gx + dx, gy + dy
        args += ["-fill", c, "-draw", f"polygon {cx},{cy - r * 2} {cx + r * .5},{cy - r * .5} {cx + r * 2},{cy} {cx + r * .5},{cy + r * .5} {cx},{cy + r * 2} {cx - r * .5},{cy + r * .5} {cx - r * 2},{cy} {cx - r * .5},{cy - r * .5}"]
    base = os.path.join(tmp, "preview-base.png")
    magick(*args, base)
    out = os.path.join(OUT, "..", "..", "preview.png")
    BOLD = FONT.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")
    big = ["-filter", "point", "-resize", f"{Z * 100}%"]
    text = ["-gravity", "northwest", "-font", BOLD]
    # The name, white with a dark drop shadow; the line under it.
    text += ["-fill", "#0b2a4a88", "-pointsize", "128", "-annotate", "+66+52", "Pokémon herd",
             "-fill", "#ffffff", "-pointsize", "128", "-annotate", "+58+44", "Pokémon herd",
             "-font", FONT, "-fill", "#0b2a4a99", "-pointsize", "50", "-annotate", "+64+212", "Every coding agent becomes a Pokémon",
             "-fill", "#ffffff", "-pointsize", "50", "-annotate", "+62+208", "Every coding agent becomes a Pokémon"]
    # Over each head: zZ (asleep), the agents' names on the soil.
    py = (ground - pika.height()) * Z
    text += ["-font", BOLD, "-fill", "#ffffff", "-pointsize", "54", "-annotate", f"+{X['pika'] * Z + 10}+{py - 100}", "zZ"]
    names = [("api", X["pika"], "idle"), ("deploy", X["zard"], "working"), ("tests", X["luc"], "blocked"), ("review", X["geng"], "done")]
    for tag, cx, st in names:
        tw = glyph_width(tag, 44)
        x0 = cx * Z - (tw + 40) // 2
        y0 = (ground + 8) * Z
        text += ["-fill", DOT[st], "-draw", f"circle {x0 + 14},{y0 + 30} {x0 + 26},{y0 + 30}",
                 "-font", FONT, "-fill", FG, "-pointsize", "44", "-annotate", f"+{x0 + 40}+{y0 + 4}", tag]
    magick(base, *big, *text, out)
    print(f"{os.path.relpath(out)}: {os.path.getsize(out) // 1024} KB")


def battle(tmp):
    """README's hero: a battle on a bright day. Mega Charizard X and Lucario face off; each strikes,
    the other flinches; then its special move, a blue fireball, knocks Lucario back. Pikachu sleeps
    through it; a shiny Gengar watches. 270x130 at 2x, names under their feet."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 270, 118, 2
    horizon = 88
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "battle")
    zx, lx = 92, 188
    names = [("api", 34, "idle"), ("deploy", zx, "working"), ("tests", lx, "working"), ("review", 238, "done")]
    frames = []
    for i in range(130):  # 6.5 s
        t = i * TICK
        def play(folder, name, start):
            return A(folder, name), t - start
        # Charizard: idle, strike (1.0 s), flinch (1.9 s), special move (2.7 s), idle.
        if 1000 <= t < 1600: z = play("0006-0001", "react-AttackR", 1000)
        elif 2150 <= t < 2700: z = play("0006-0001", "react-HurtR", 2150)
        elif 2800 <= t < 3500: z = play("0006-0001", "react-SpAttackR", 2800)
        else: z = play("0006-0001", "idleR", 0)
        if 1300 <= t < 1900: l = play("0448", "react-HurtL", 1300)
        elif 1900 <= t < 2500: l = play("0448", "react-AttackL", 1900)
        elif 3350 <= t < 4300: l = play("0448", "react-HurtL", 3350)
        else: l = play("0448", "idleL", 0)
        cast = [(A("0025", "sleep"), t, 34), (*z, zx), (*l, lx), (A("0094s", "idleL"), t, 238)]
        args = [sky_png]
        for an, tt, cx in cast:
            x, y = an.place(cx, ground)
            args += [an.at(max(0, tt)), "-geometry", f"+{x}+{y}", "-composite"]
        if 1300 <= t < 1500: args += burst(lx - 8, ground - 26, 7)
        if 2150 <= t < 2350: args += burst(zx + 8, ground - 26, 7)
        if 3000 <= t < 3350:  # the fireball, across
            f = (t - 3000) / 350
            args += fireball(round(zx + 44 + f * (lx - zx - 58)), ground - 22, 0.9, "blue")
        if 3350 <= t < 3700: args += burst(lx - 8, ground - 26, 10 if t < 3500 else 7)
        # The shiny's sparkles, twinkling.
        for j, (dx, dy, r) in enumerate([(-15, -38, 2.2), (12, -30, 1.8), (-12, -14, 1.6), (15, -10, 2.2)]):
            if (i // 3 + j) % 4 < 2:
                cx, cy = 238 + dx, ground + dy
                args += ["-fill", "#ffffff" if j % 2 else "#ffe9a8", "-draw", f"polygon {cx},{cy - r * 2} {cx + r * .5},{cy - r * .5} {cx + r * 2},{cy} {cx + r * .5},{cy + r * .5} {cx},{cy + r * 2} {cx - r * .5},{cy + r * .5} {cx - r * 2},{cy} {cx - r * .5},{cy - r * .5}"]
        args += ["-filter", "point", "-resize", f"{Z * 100}%"]
        # zZ over Pikachu; names on the strip's dark.
        z_text = ["z", "zZ", "zZz", "zZ"][(t // 700) % 4]
        args += ["-font", FONT, "-gravity", "none", "-fill", "#ffffff", "-pointsize", "18", "-annotate", f"+{34 * Z + 22}+{(ground - 50) * Z}", z_text]
        for tag, cx, st in names:
            tw = glyph_width(tag, 14)
            x0 = cx * Z - (tw + 14) // 2
            y0 = (ground + 6) * Z
            args += ["-fill", DOT[st], "-draw", f"circle {x0 + 4},{y0 + 10} {x0 + 8},{y0 + 10}", "-fill", FG, "-pointsize", "14", "-annotate", f"+{x0 + 14}+{y0 + 15}", tag]
        p = os.path.join(tmp, f"battle-{i:04d}.png")
        magick(*args, p)
        frames.append(p)
    out = os.path.join(OUT, "battle.gif")
    magick("-delay", str(TICK // 10), "-loop", "0", *frames, "-layers", "Optimize", out)
    print(f"{os.path.relpath(out)}: {len(frames)} frames, {os.path.getsize(out) // 1024} KB")


SCENES = {"herd": herd, "focus": focus, "reactions": reactions, "variety": variety, "charizard-mega": charizard_mega, "seasons": seasons, "preview": preview, "party": party, "battle": battle}
NEEDS = {"herd": ["0025", "0445", "0003", "0493", "0009", "0006-0001"], "focus": ["0025", "0003", "0493"],
         "reactions": ["0003", "0445"], "variety": ["0025", "0025s", "0037-0001", "0006-0001"],
         "charizard-mega": ["0006", "0006-0001"], "seasons": ["0025", "0009", "0006-0001"], "preview": ["0025", "0006-0001", "0448", "0094s"], "party": [], "battle": ["0025", "0006-0001", "0448", "0094s"]}


def main():
    if not shutil.which("magick"):
        sys.exit("needs ImageMagick 7 (magick)")
    names = sys.argv[1:] or list(SCENES)
    missing = sorted({f for n in names for f in NEEDS[n] if not os.path.exists(os.path.join(SPRITES, f, "meta.json"))})
    if missing:
        sys.exit(f"missing sprite sets in {SPRITES}: {', '.join(missing)} (pick them once in the mod's picker)")
    tmp = tempfile.mkdtemp(prefix="pokemon-demos-")
    try:
        sky["dir"] = tmp
        for n in names:
            sky["night"] = 1 if n in NIGHT else 0
            SCENES[n](tmp)
    finally:
        shutil.rmtree(tmp)


if __name__ == "__main__":
    main()
