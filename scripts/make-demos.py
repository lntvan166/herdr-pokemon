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
    """preview.png at the repo root (the herdr.dev gallery card, 1600x1000: the gallery frames it
    16:10, and crops a 16:9 one's sides). The card shows it small,
    so it carries little and big: on a bright day (a 320x180 pixel scene at 5x), the name and what
    it is in large type; a battle that is a catch (Mega Charizard X's blue fire hits a wild
    legendary, Mewtwo, gold sparkles round it and ₽400 over its head, as a Poké Ball flies at
    it); Pikachu asleep, a shiny Mega Gengar; and the Shop as it really is (docs/demo/shop.png,
    a screenshot of the Bag's Shop tab, cropped to the list and the buy panel)."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 320, 200, 5
    horizon = 170
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "preview")
    zard, mew = A("0006-0001", "react-SpAttackR"), A("0150", "react-HurtL")
    pika, geng = A("0025", "sleep"), A("0094-0001s", "idleL")
    X = {"pika": 30, "zard": 96, "mew": 172, "geng": 284}
    scene = [("pika", pika, X["pika"], 300), ("zard", zard, X["zard"], 250), ("mew", mew, X["mew"], 120), ("geng", geng, X["geng"], 0)]
    args = [sky_png]
    heads = {}
    for key, an, cx, t in scene:
        x, y = an.place(cx, ground)
        args += [an.at(t), "-geometry", f"+{x}+{y}", "-composite"]
        heads[key] = (cx, ground - an.height())
    # Charizard's special move: a fireball, and the hit on Mewtwo.
    args += fireball(X["zard"] + 44, ground - 26, color="blue")
    for dx, dy, r, c in [(-30, -40, 2.4, "#ffffff"), (-38, -14, 1.8, "#bfe6ff"), (6, -52, 2, "#bfe6ff")]:
        args += star(X["zard"] + dx, ground + dy, r, c)
    args += burst(X["mew"] - 14, ground - 32, 9)
    # The legendary's gold sparkles.
    mx, my = heads["mew"]
    for dx, dy, r in [(-26, 6, 2.6), (24, 14, 2.2), (-30, 34, 1.8), (28, 40, 2.6)]:
        args += star(mx + dx, my + dy, r, "#ffd75e")
    # The shiny's sparkles.
    gx, gy = heads["geng"]
    for dx, dy, r, c in [(-20, 4, 3, "#ffffff"), (18, 10, 2.5, "#ffe9a8"), (22, 34, 3, "#ffffff")]:
        args += star(gx + dx, gy + dy, r, c)
    # The ball's arc, in dots, from the trainer's side of the field.
    for i, (bx, by) in enumerate([(112, 112), (120, 106), (128, 102), (136, 100)]):
        args += ["-fill", "#ffffff", "-draw", f"circle {bx},{by} {bx + 1.2 - i * 0.1},{by}"]
    base = os.path.join(tmp, "preview-base.png")
    magick(*args, base)
    out = os.path.join(OUT, "..", "..", "preview.png")
    BOLD = FONT.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")
    ART = os.path.expanduser("~/.config/herdr-app/data/pokemon-herd/art")
    art = lambda name: os.path.join(ART, f"items-{name}.png")
    big = ["-filter", "point", "-resize", f"{Z * 100}%"]
    text = ["-gravity", "northwest", "-font", BOLD]
    # The name, white with a dark drop shadow; what it is under it.
    text += ["-fill", "#0b2a4a88", "-pointsize", "128", "-annotate", "+66+40", "Pokerdr",
             "-fill", "#ffffff", "-pointsize", "128", "-annotate", "+58+32", "Pokerdr",
             "-font", FONT, "-fill", "#0b2a4a99", "-pointsize", "46", "-annotate", "+64+196", "Catch 'em while your agents code",
             "-fill", "#ffffff", "-pointsize", "46", "-annotate", "+62+192", "Catch 'em while your agents code"]
    # What there is to do, as pills: an item's picture and a word or two.
    pills = [("poke-ball", "Catch"), ("master-ball", "Legendaries"), (None, "974 Pokémon")]
    x0 = 62
    for icon, word in pills:
        tw = glyph_width(word, 36)
        w = tw + (98 if icon else 48)
        text += ["-fill", "#ffffffe6", "-draw", f"roundrectangle {x0},{270} {x0 + w},{332} 31,31",
                 "-font", FONT, "-fill", "#18406b", "-pointsize", "36", "-annotate", f"+{x0 + (78 if icon else 24)}+{279}", word]
        if icon:
            text += ["(", art(icon), "-filter", "point", "-resize", "80%", ")", "-geometry", f"+{x0 + 12}+{277}", "-composite"]
        x0 += w + 16
    # The ball in the air, big, and ₽400 over the legendary's head (gold, as on the strip).
    text += ["(", art("poke-ball"), "-filter", "point", "-resize", "130%", ")", "-geometry", f"+{145 * Z - 39}+{100 * Z - 39}", "-composite"]
    # Its health, knocked down to the amber by Charizard (weakened, it's easier to catch).
    hx, hy = mx * Z - 90, (my - 6) * Z
    text += ["-fill", "#00000088", "-draw", f"roundrectangle {hx},{hy} {hx + 180},{hy + 26} 8,8",
             "-fill", "#e8b062", "-draw", f"roundrectangle {hx + 5},{hy + 5} {hx + 5 + 62},{hy + 21} 5,5"]
    pw = round(glyph_width("₽400", 44) * 1.12) + 40 # bold is wider than the measure
    px, py = mx * Z - pw // 2, (my - 22) * Z
    text += ["-fill", "#00000080", "-draw", f"roundrectangle {px},{py} {px + pw},{py + 64} 14,14",
             "-font", BOLD, "-fill", "#f2c94c", "-pointsize", "44", "-annotate", f"+{px + 18}+{py + 6}", "₽400"]
    # zZ over Pikachu; the agents' names on the soil (the wild one says so).
    zy = (ground - pika.height()) * Z
    text += ["-font", BOLD, "-fill", "#ffffff", "-pointsize", "54", "-annotate", f"+{X['pika'] * Z + 10}+{zy - 100}", "zZ"]
    names = [("api", X["pika"], "idle"), ("deploy", X["zard"], "working"), ("wild Mewtwo", X["mew"], None), ("review", X["geng"], "done")]
    for tag, cx, st in names:
        tw = glyph_width(tag, 44)
        x1 = cx * Z - (tw + 40) // 2
        y1 = (ground + 8) * Z
        if st:
            text += ["-fill", DOT[st], "-draw", f"circle {x1 + 14},{y1 + 30} {x1 + 26},{y1 + 30}"]
        text += ["-font", FONT, "-fill", "#f2c94c" if not st else FG, "-pointsize", "44", "-annotate", f"+{x1 + (40 if st else 20)}+{y1 + 4}", tag]
    # The Shop, as it really is: a card with rounded corners and a soft shadow, top right.
    shop = os.path.join(os.path.dirname(OUT), "demo", "shop.png")
    card = os.path.join(tmp, "shop-card.png")
    cw = 500
    ch = round(490 * cw / 600)
    magick(shop, "-resize", f"{cw}x", "(", "+clone", "-alpha", "extract", "-fill", "black", "-colorize", "100",
           "-fill", "white", "-draw", f"roundrectangle 0,0 {cw - 1},{ch - 1} 22,22", ")", "-alpha", "off", "-compose", "CopyOpacity", "-composite", card)
    cx0, cy0 = 1600 - cw - 44, 36
    text += ["-fill", "#0b2a4a55", "-draw", f"roundrectangle {cx0 + 10},{cy0 + 14} {cx0 + cw + 10},{cy0 + ch + 14} 24,24",
             card, "-geometry", f"+{cx0}+{cy0}", "-composite"]
    magick(base, *big, *text, out)
    print(f"{os.path.relpath(out)}: {os.path.getsize(out) // 1024} KB")


def battle(tmp):
    """README's hero: a battle on a bright day. Mega Charizard X and Lucario face off; each strikes,
    the other flinches; then its special move, a blue fireball, knocks Lucario back. Pikachu sleeps
    through it; a shiny Mega Gengar watches. 270x130 at 2x, names under their feet."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 296, 118, 2
    horizon = 88
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "battle")
    zx, lx = 94, 186
    gx = 252
    names = [("api", 34, "idle"), ("deploy", zx, "working"), ("tests", lx, "working"), ("review", gx, "done")]
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
        # Knocked back by each blow (fx.js knockOf): a strike lightly, the fireball hard, shaking.
        p_strike, p_fire = fx("power(1, false)"), fx("power(2)")
        kl, sl = knock(t - 3350, p_fire) if t >= 3350 else knock(t - 1300, p_strike)
        kz, sz = knock(t - 2150, p_strike)
        cast = [(A("0025", "sleep"), t, 34, 0), (*z, zx - kz, sz), (*l, lx + kl, sl), (A("0094-0001s", "idleL"), t, gx, 0)]
        args = [sky_png]
        for an, tt, cx, dy in cast:
            x, y = an.place(round(cx), ground)
            args += [an.at(max(0, tt)), "-geometry", f"+{x}+{y + round(dy)}", "-composite"]
        STRIKE = "{ glow: '#fff6c8', core: '#ffd23a', mid: '#fff2a8', hot: '#ffffff', look: 'star' }"
        FIRE = "moveStyle('fire', true)"
        if 1300 <= t < 1770: args += fx_burst(STRIKE, p_strike, lx - 6, ground - 26, t - 1300, 3)
        if 2150 <= t < 2620: args += fx_burst(STRIKE, p_strike, zx + 6, ground - 28, t - 2150, 5)
        if 3000 <= t < 3350:  # the fireball, across (fx.js shotParts)
            f = (t - 3000) / 350
            args += fx_shot(FIRE, 1, zx + 14 * FXK + f * (lx - zx - 26 * FXK), ground - 26, t)
        if 3350 <= t < 3820: args += fx_burst(FIRE, p_fire, lx - 6, ground - 26, t - 3350, 9)
        # The shiny's sparkles, twinkling.
        for j, (dx, dy, r) in enumerate([(-15, -38, 2.2), (12, -30, 1.8), (-12, -14, 1.6), (15, -10, 2.2)]):
            if (i // 3 + j) % 4 < 2:
                cx, cy = gx + dx * 1.6, ground + dy - 6
                args += ["-fill", "#ffffff" if j % 2 else "#ffe9a8", "-draw", f"polygon {cx},{cy - r * 2} {cx + r * .5},{cy - r * .5} {cx + r * 2},{cy} {cx + r * .5},{cy + r * .5} {cx},{cy + r * 2} {cx - r * .5},{cy + r * .5} {cx - r * 2},{cy} {cx - r * .5},{cy - r * .5}"]
        args += ["-filter", "point", "-resize", f"{Z * 100}%"]
        # The games' word over Lucario (Mega Charizard X's fire on steel); zZ over Pikachu; names.
        if t >= 3350: args += fx_word(2, lx * Z, (ground - 64) * Z, t - 3350, W * Z)
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

ART_DIR = os.path.expanduser("~/.config/herdr-app/data/pokemon-herd/art")


def hp_bar(cx, top, hp, blink_on=True):
    """A health bar (as on the strip) centred on cx: green, amber, red."""
    color = "#46c46a" if hp > 0.5 else "#e8b062" if hp > 0.2 else "#e5484d"
    args = ["-fill", "#00000099", "-draw", f"rectangle {cx - 16},{top} {cx + 16},{top + 4}"]
    if blink_on:
        args += ["-fill", color, "-draw", f"rectangle {cx - 15},{top + 1} {cx - 15 + max(1, round(30 * hp))},{top + 3}"]
    return args


def say(text, cx, y, W, size=14, color="#ffffff"):
    """A line in a dark pill, centred on cx (scaled image coordinates)."""
    tw = round(glyph_width(text, size) * 1.05)
    x0 = max(4, min(W - tw - 24, cx - tw // 2 - 10))
    return ["-fill", "#000000b0", "-draw", f"roundrectangle {x0},{y} {x0 + tw + 20},{y + size + 12} 7,7",
            "-font", FONT, "-fill", color, "-pointsize", str(size), "-annotate", f"+{x0 + 10}+{y + size + 3}", text]


FX_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mods", "pokemon-herd", "fx.js")
_fx = {}


def fx(expr):
    """A value worked out by the mod's own fx.js (so the demos show what the strip draws): `expr`
    in JavaScript, with fx.js's exports in scope, as JSON."""
    if expr not in _fx:
        js = f"import('file://{os.path.abspath(FX_JS)}').then(m => {{ with (m) console.log(JSON.stringify({expr})); }})"
        _fx[expr] = json.loads(subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True).stdout)
    return _fx[expr]


FXK = 0.7  # the effects' px to this world's (sprites drawn 1:1 here, then ×2)


def ease_out(u):
    u = min(max(u, 0), 1)
    return 1 - (1 - u) ** 2


def hexa(color, a):
    return f"{color}{max(0, min(255, round(255 * a))):02x}"


def fx_shot(style_expr, dir_, x, y, t):
    """A move in flight at (x, y): fx.js shotParts (its type's look, a glow, a tail), flickering."""
    args = []
    for p in fx(f"shotParts({style_expr}, {dir_})"):
        a = p.get("opacity", 1)
        if p.get("flicker"):
            a *= 0.775 + 0.225 * math.sin(2 * math.pi * t / max(100, p["flicker"]))
        px, py, w, h = x + p["x"] * FXK, y + p["y"] * FXK, p["w"] * FXK / 2, p["h"] * FXK / 2
        if p.get("ring"):
            args += ["-fill", "none", "-stroke", hexa(p["color"], a), "-strokewidth", "1.2", "-draw", f"ellipse {px:.1f},{py:.1f} {w:.1f},{h:.1f} 0,360", "-stroke", "none"]
        elif p.get("round"):
            args += ["-fill", hexa(p["color"], a), "-draw", f"ellipse {px:.1f},{py:.1f} {w:.1f},{h:.1f} 0,360"]
        else:
            args += ["-fill", hexa(p["color"], a), "-draw", f"rectangle {px - w:.1f},{py - h:.1f} {px + w:.1f},{py + h:.1f}"]
    return args


def fx_burst(style_expr, power, x, y, t, seed=1):
    """Where a blow lands, `t` ms after: fx.js burstParts (a flash, a ring, sparks flying out)."""
    b = fx(f"burstParts({style_expr}, {power}, {seed})")
    args = []
    u = t / 220
    if u < 1:
        d = (b["flash"]["from"] + (b["flash"]["to"] - b["flash"]["from"]) * ease_out(u)) * FXK / 2
        args += ["-fill", hexa(b["flash"]["color"], 0.95 * (1 - u * u)), "-draw", f"ellipse {x},{y} {d:.1f},{d:.1f} 0,360"]
    u = t / 360
    if u < 1:
        d = (b["ring"]["from"] + (b["ring"]["to"] - b["ring"]["from"]) * ease_out(u)) * FXK / 2
        args += ["-fill", "none", "-stroke", hexa(b["ring"]["color"], 0.8 * (1 - u * u)), "-strokewidth", "1.5",
                 "-draw", f"ellipse {x},{y} {d:.1f},{d:.1f} 0,360", "-stroke", "none"]
    for sp in b["sparks"]:
        u = t / 420
        if u >= 1:
            continue
        k = ease_out(t / 380)
        sx, sy, r = x + sp["dx"] * k * FXK, y + sp["dy"] * k * FXK, sp["size"] * FXK / 2
        col = hexa(sp["color"], 1 - u * u)
        args += ["-fill", col, "-draw", (f"ellipse {sx:.1f},{sy:.1f} {r:.1f},{r:.1f} 0,360" if sp["round"] else f"rectangle {sx - r:.1f},{sy - r:.1f} {sx + r:.1f},{sy + r:.1f}")]
    return args


def knock(t, power):
    """How far a Pokémon hit `t` ms ago stands from its spot (fx.js knockOf: out fast, back slow), and
    its shake (up, down) for a big one."""
    k = fx(f"knockOf({power})")
    out, back, shake_ms = fx("[KNOCK_OUT, KNOCK_BACK, SHAKE_MS]")
    if t < 0 or t >= out + back:
        return 0, 0
    off = k["px"] * FXK * (ease_out(t / 70) if t < out else 1 - ease_out((t - out) / back))
    dy = (2 if (t // 50) % 2 else -2) * FXK if k["shake"] and t < shake_ms else 0
    return off, dy


def fx_word(eff, cx, head_y, t, W):
    """The games' word over a Pokémon hit `t` ms ago (fx.js effectWord), popping up, fading (scaled
    image coordinates)."""
    w = fx(f"effectWord({eff})")
    if not w or t < 0 or t >= 1300:
        return []
    rise = round(8 * (1 - ease_out(t / 160)))
    a = min(1, t / 120) if t < 900 else max(0, 1 - (t - 900) / 260)
    text, color = w
    tw = round(glyph_width(text, 12) * 1.08)
    x0 = max(4, min(W - tw - 16, cx - tw // 2 - 6))
    y0 = head_y - 26 + rise
    return ["-fill", hexa("#000000", 0.72 * a), "-draw", f"roundrectangle {x0},{y0} {x0 + tw + 12},{y0 + 18} 6,6",
            "-font", FONT.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"), "-fill", hexa(color, a), "-pointsize", "12",
            "-annotate", f"+{x0 + 6}+{y0 + 14}", text, "-font", FONT]


def catch(tmp):
    """README: battle to catch, as the strip plays it (fx.js). Mega Charizard X is dropped by a wild
    Venusaur and steps off; its blue fire flies over (fire on grass: super effective), a flash,
    sparks, Venusaur knocked back; Venusaur fires leaves back (not very effective); a second fireball
    puts it in the red; a Poké Ball arcs in, it flashes into the ball, three wobbles: Gotcha."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 296, 118, 2
    horizon = 88
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "catch")
    vx0, vx = 330, 206
    zx0, zx = 172, vx - 84  # dropped close, it steps off to 84 px (fx.js wildSpot, FX_GAP)
    ball = os.path.join(tmp, "catch-ball.png")
    magick(os.path.join(ART_DIR, "items-poke-ball.png"), "-filter", "point", "-resize", "12x12", ball)
    FIRE, LEAF = "moveStyle('fire', true)", "MOVE.grass"
    p_fire, p_leaf = fx("power(2)"), fx("power(0.5)")
    # Rounds: [when it attacks, its shot's launch and landing, the hit back's launch and landing].
    rounds = [(1900, 2180, 2440, 3340, 3600), (4300, 4580, 4840, 5740, 6000)]
    hp_v = [(2440, 0.45), (4840, 0.14)]
    THROW = 6500
    up, down, into, first_shake, every, wob = fx("[THROW_UP, THROW_DOWN, INTO_BALL, SHAKE_FROM, SHAKE_EVERY, WOBBLE]")
    done = THROW + first_shake + 3 * every
    frames = []
    for i in range(round((done + 1100) / TICK)):
        t = i * TICK
        vhit = max([h for (_, _, h, _, _) in rounds if h <= t], default=None)
        zhit = max([h for (*_, h) in rounds if h <= t], default=None)
        # Venusaur: walks in, stands facing Charizard; flinches when hit, fires back.
        x = vx if t >= 1500 else round(vx0 + (vx - vx0) * t / 1500)
        v = None
        if t < 1500: v = (A("0003", "walkL"), t)
        for (a0, l0, h0, bl, bh) in rounds:
            if h0 <= t < h0 + 600: v = (A("0003", "react-HurtL"), t - h0)
            elif bl - 250 <= t < bl + 450: v = (A("0003", "react-ShootL"), t - bl + 250)
        v = v or (A("0003", "idleL"), t)
        # Charizard: walks up to it, is dropped close, steps off, then its special move each round.
        if t < 1500: cx_z, z = 80 + (zx0 - 80) * t / 1500, (A("0006-0001", "walkR"), t)
        elif t < 1600: cx_z, z = zx0, (A("0006-0001", "idleR"), t)
        elif t < 1900: cx_z, z = zx0 + (zx - zx0) * ease_out((t - 1600) / 300), (A("0006-0001", "idleR"), t)
        else:
            cx_z, z = zx, (A("0006-0001", "idleR"), t)
            for (a0, l0, h0, bl, bh) in rounds:
                if a0 <= t < a0 + 700: z = (A("0006-0001", "react-SpAttackR"), t - a0)
                elif bh <= t < bh + 600: z = (A("0006-0001", "react-HurtR"), t - bh)
        kv, sv = knock(t - vhit, p_fire) if vhit is not None else (0, 0)
        kz, sz = knock(t - zhit, p_leaf) if zhit is not None else (0, 0)
        args = [sky_png]
        cast = [(*z, cx_z - kz, sz)] + ([(*v, x + kv, sv)] if t < THROW + up + down else [])
        for an, tt, cx, dy in cast:
            px, py = an.place(round(cx), ground)
            args += [an.at(max(0, tt)), "-geometry", f"+{px}+{py + round(dy)}", "-composite"]
        # The Pokémon flashing into the ball.
        if THROW + up + down <= t < THROW + first_shake and (i // 2) % 2 == 0:
            px, py = A("0003", "idleL").place(vx, ground)
            args += [A("0003", "idleL").at(t), "-geometry", f"+{px}+{py}", "-composite"]
        mid_v, mid_z = ground - 24, ground - 28
        for (a0, l0, h0, bl, bh) in rounds:
            if l0 <= t < h0:
                f = (t - l0) / (h0 - l0)
                args += fx_shot(FIRE, 1, zx + 14 * FXK + f * (vx - zx - 26 * FXK), mid_z, t)
            if h0 <= t < h0 + 470: args += fx_burst(FIRE, p_fire, vx - 6, mid_v, t - h0, h0)
            if bl <= t < bh:
                f = (t - bl) / (bh - bl)
                args += fx_shot(LEAF, -1, vx - 14 * FXK - f * (vx - zx - 26 * FXK), mid_v, t)
            if bh <= t < bh + 470: args += fx_burst(LEAF, p_leaf, zx + 6, mid_z, t - bh, bh)
        # Health: Venusaur's once hit, Charizard's once hit back.
        vhp = 1
        for at, hp in hp_v:
            if t >= at: vhp = hp
        if 2440 <= t < THROW: args += hp_bar(vx, ground - 64, vhp, not (vhp < 0.2 and (i // 4) % 2))
        if t >= 3600: args += hp_bar(zx, ground - 64, 0.9 if t < 6000 else 0.8)
        # The ball: up from the left, over, down onto it; it drops to the ground and wobbles thrice.
        tb = t - THROW
        if 0 <= tb:
            fx0, peak, hit_y = vx - 170, ground - 76, ground - 26
            if tb < up:
                f = tb / up
                bx, by = fx0 + (((fx0 + vx) / 2) - fx0) * f, (ground - 8) + (peak - (ground - 8)) * ease_out(f)
            elif tb < up + down:
                f = (tb - up) / down
                bx, by = (fx0 + vx) / 2 + (vx - (fx0 + vx) / 2) * f, peak + (hit_y - peak) * f * f
            elif tb < first_shake:
                bx, by = vx, hit_y
            else:
                f = min(1, (tb - first_shake) / 150)
                bx, by = vx, hit_y + (ground - 6 - hit_y) * f * f
                k = (tb - first_shake) // every
                if k < 3 and (tb - first_shake) % every < wob:
                    bx += 2 * math.sin((tb - first_shake) % every / 110 * 2 * math.pi)
            args += [ball, "-geometry", f"+{round(bx - 6)}+{round(by - 6)}", "-composite"]
            if up + down <= tb < up + down + 470: args += fx_burst("MOVE.normal", 0.5, vx, hit_y, tb - up - down, 7)
            if t >= done and t < done + 520: args += fx_burst("{ glow: '#ffe9a8', core: '#ffd75e', mid: '#fff2c0', hot: '#ffffff', look: 'star' }", 0.9, vx, ground - 6, t - done, 11)
        if t >= done + 400:
            for j, (dx, dy) in enumerate([(-14, -14), (12, -18), (16, -4), (-16, -2)]):
                if (i // 3 + j) % 3:
                    args += star(vx + dx, ground - 8 + dy, 2, "#ffe9a8")
        args += ["-filter", "point", "-resize", f"{Z * 100}%"]
        # The games' words over each, and what happened, on a line at the top.
        for (a0, l0, h0, bl, bh) in rounds:
            if t >= h0: args += fx_word(2, vx * Z, (ground - 64) * Z, t - h0, W * Z)
            if t >= bh: args += fx_word(0.5, zx * Z, (ground - 64) * Z, t - bh, W * Z)
        r = rounds
        # (How effective each hit was: the word over its head, as on the strip.)
        if r[1][2] + 1300 <= t < THROW: args += say("In the red: throw now!", vx * Z, 8, W * Z, color="#ff8a80")
        elif THROW + first_shake <= t < done: args += say(["Shake…", "Shake… shake…", "Shake… shake… shake…"][min(2, (t - THROW - first_shake) // every)], vx * Z, 8, W * Z)
        elif t >= done: args += say("✦ Gotcha! Venusaur → Box", vx * Z, 8, W * Z, color="#f2c94c")
        for tag, cx, st in [("deploy", cx_z, "working"), ("wild Venusaur", min(x, vx0 - 20), None)]:
            if st is None and t >= THROW + up + down: continue
            tw = glyph_width(tag, 14)
            x0 = round(cx * Z - (tw + 14) / 2)
            y0 = (ground + 6) * Z
            if st: args += ["-fill", DOT[st], "-draw", f"circle {x0 + 4},{y0 + 10} {x0 + 8},{y0 + 10}"]
            args += ["-fill", FG if st else "#f2c94c", "-pointsize", "14", "-annotate", f"+{x0 + 14}+{y0 + 15}", tag]
        p = os.path.join(tmp, f"catch-{i:04d}.png")
        magick(*args, p)
        frames.append(p)
    out = os.path.join(OUT, "catch.gif")
    magick("-delay", str(TICK // 10), "-loop", "0", *frames, "-layers", "Optimize", out)
    print(f"{os.path.relpath(out)}: {len(frames)} frames, {os.path.getsize(out) // 1024} KB")


def rare(tmp):
    """README: the rare ones, walking: a shiny Pikachu (sparkling), an Alpha Gengar (bigger, a red
    ring breathing under it, α, ₽150), a legendary Mewtwo (gold ✦, ₽400). Names under them."""
    A = lambda f, n: Anim.get(f, n, tmp)
    W, H, Z = 296, 118, 2
    horizon = 88
    ground = horizon + 4
    sky_png = bright_sky(W, H, horizon, tmp, "rare")
    px, gx, mx = 50, 150, 246
    pika, geng, mew = A("0025s", "walkL"), A("0094", "walkL"), A("0150", "walkL")
    frames = []
    for i in range(60):  # 3 s, a loop
        t = i * TICK
        args = [sky_png]
        # The Alpha's red ring, breathing, under its feet.
        a = 0.5 + 0.45 * abs(((i % 28) / 14) - 1)
        args += ["-fill", f"rgba(255,90,90,{a * 0.5:.2f})", "-stroke", f"rgba(255,70,70,{a:.2f})", "-strokewidth", "2",
                 "-draw", f"ellipse {gx},{ground - 1} 32,5 0,360", "-stroke", "none"]
        for an, cx, big in [(pika, px, 1), (geng, gx, 1.4), (mew, mx, 1)]:
            frame = an.at(t)
            if big != 1:
                scaled = os.path.join(tmp, f"rare-big-{i}.png")
                magick(frame, "-filter", "point", "-resize", f"{round(big * 100)}%", scaled)
                b = an.cut["box"]
                args += [scaled, "-geometry", f"+{round(cx - (b['x'] + b['w'] / 2) * big)}+{round(ground - (b['y'] + b['h']) * big)}", "-composite"]
            else:
                x, y = an.place(cx, ground)
                args += [frame, "-geometry", f"+{x}+{y}", "-composite"]
        # Shiny sparkles round Pikachu, gold ones round Mewtwo.
        for j, (dx, dy, r) in enumerate([(-16, -40, 2.2), (14, -32, 1.8), (-14, -14, 1.6), (16, -10, 2.2)]):
            if (i // 3 + j) % 4 < 2: args += star(px + dx, ground + dy, r, "#ffffff" if j % 2 else "#ffe9a8")
            if (i // 4 + j) % 4 < 2: args += star(mx + dx * 1.3, ground + dy * 1.2, r, "#ffd75e")
        # Red motes rising beside the Alpha.
        for j, (dx, ph) in enumerate([(-28, 0), (26, 9), (-18, 17), (20, 25)]):
            y = ground - 10 - ((i + ph) % 34) * 1.6
            if (i + ph) % 34 < 26: args += ["-fill", "#e5484d", "-draw", f"rectangle {gx + dx},{round(y)} {gx + dx + 1},{round(y) + 1}"]
        args += ["-filter", "point", "-resize", f"{Z * 100}%"]
        # α by the Alpha; purses over the Alpha and the legendary; what each is, on the soil.
        args += ["-fill", "#e5484d", "-draw", f"roundrectangle {(gx - 46) * Z},{(ground - 70) * Z} {(gx - 46) * Z + 22},{(ground - 70) * Z + 22} 5,5",
                 "-font", FONT.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"), "-fill", "#ffffff", "-pointsize", "15", "-annotate", f"+{(gx - 46) * Z + 6}+{(ground - 70) * Z + 17}", "α"]
        args += say("₽150", gx * Z + 40, 6, W * Z, 13, "#f2c94c") + say("₽400", mx * Z - 10, 6, W * Z, 13, "#f2c94c")
        for tag, cx, col in [("Shiny", px, "#ffffff"), ("α Alpha", gx, "#ff8a80"), ("✦ Legendary", mx, "#f2c94c")]:
            tw = glyph_width(tag, 14)
            args += ["-font", FONT, "-fill", col, "-pointsize", "14", "-annotate", f"+{cx * Z - tw // 2}+{(ground + 6) * Z + 15}", tag]
        p = os.path.join(tmp, f"rare-{i:04d}.png")
        magick(*args, p)
        frames.append(p)
    out = os.path.join(OUT, "rare.gif")
    magick("-delay", str(TICK // 10), "-loop", "0", *frames, "-layers", "Optimize", out)
    print(f"{os.path.relpath(out)}: {len(frames)} frames, {os.path.getsize(out) // 1024} KB")


SCENES = {"herd": herd, "focus": focus, "reactions": reactions, "variety": variety, "charizard-mega": charizard_mega, "seasons": seasons, "preview": preview, "party": party, "battle": battle, "catch": catch, "rare": rare}
NEEDS = {"herd": ["0025", "0445", "0003", "0493", "0009", "0006-0001"], "focus": ["0025", "0003", "0493"],
         "reactions": ["0003", "0445"], "variety": ["0025", "0025s", "0037-0001", "0006-0001"],
         "charizard-mega": ["0006", "0006-0001"], "seasons": ["0025", "0009", "0006-0001"], "preview": ["0025", "0006-0001", "0448", "0094-0001s"], "party": [], "battle": ["0025", "0006-0001", "0448", "0094-0001s"],
         "catch": ["0006-0001", "0003"], "rare": ["0025s", "0094", "0150"]}


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
