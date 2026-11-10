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
sky = {"night": 0, "light": False, "dir": None, "cache": {}}  # the current scene's time of day, and backgrounds drawn so far


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
    key = (width, rows, top, h, sky["night"], sky["light"])
    if key in sky["cache"]:
        return sky["cache"][key]
    js = (f"import('file://{os.path.abspath(SCENE_JS)}').then(m => console.log(JSON.stringify("
          f"{{p: m.palette({sky['night']}, {str(sky['light']).lower()}), rows: [...Array({rows}).keys()].map(r => {{ const f = m.features({width}, {GROUND}, r); return {{ ...f, treeParts: f.trees.flatMap(t => m.treeParts(t, {GROUND + 1})) }}; }})}})))")
    data = json.loads(subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True).stdout)
    p = data["p"]
    line = GROUND + 4
    args = ["-size", f"{width}x{h}", f"xc:{BG}"]
    for r, f in enumerate(data["rows"]):
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
        args += ["-fill", p["dark"], "-draw", f"rectangle 0,{y0 + line + 4} {width},{y0 + line + 5}"]
        args += ["-fill", BG, "-draw", f"rectangle 0,{y0 + line + 6} {width},{y0 + ROW_H - 1}"]  # names keep the plain strip
    path = os.path.join(sky["dir"], f"scenery-{len(sky['cache'])}.png")
    magick(*args, path)
    sky["cache"][key] = path
    return path


def draw(path, width, rows, mons, caption=None, caption_color=MUTED, cursor=None, top=44):
    h = top + rows * ROW_H - 18 * (rows == 1)
    args = [scenery(width, rows, top, h)]
    for m in mons:
        ground = top + m.row * ROW_H + GROUND
        x, y = m.anim.place(m.cx, ground)
        args += [m.anim.at(m.t, white=m.white, once=m.once), "-geometry", f"+{x}+{y}", "-composite"]
    args += ["-font", FONT, "-gravity", "northwest"]
    lines = tag_lines(mons)
    for m in mons:
        ground = top + m.row * ROW_H + GROUND
        head = ground - m.anim.height()
        # Its name under its feet, with its status dot.
        tw = len(m.tag) * 7
        tx = min(max(round(m.cx - tw / 2), 14), width - tw - 4)  # pushed in at the edges, as in the mod
        ty = ground + 11 + lines[id(m)] * 18
        args += ["-fill", DOT[m.status], "-draw", f"circle {tx - 8},{ty + 8} {tx - 5},{ty + 8}"]
        args += ["-fill", FG if m.bright else MUTED, "-pointsize", "12", "-annotate", f"+{tx}+{ty}", m.tag]
        if m.zz:
            z = ["z", "zZ", "zZz", "zZ"][(m.t // 700) % 4]
            args += ["-fill", MUTED, "-pointsize", "13", "-annotate", f"+{m.cx - 6}+{head - 22}", z]
        if m.bubble:  # "!" (needs you) or "✓" (done), above its head
            color = DOT["blocked"] if m.bubble == "!" else DOT["done"]
            args += ["-fill", color, "-draw", f"roundrectangle {m.cx - 9},{head - 26} {m.cx + 9},{head - 8} 6,6"]
            gw = glyph_width(m.bubble, 12)  # centre the glyph: "!" is far narrower than "✓"
            args += ["-fill", "#ffffff", "-pointsize", "12", "-annotate", f"+{round(m.cx - gw / 2)}+{head - 25}", m.bubble]
        for sx, sy, size, color in m.sparkles:
            args += ["-fill", color, "-pointsize", str(size), "-annotate", f"+{sx}+{sy}", "✦"]
    if caption:
        args += ["-fill", caption_color, "-pointsize", "13", "-gravity", "north", "-annotate", "+0+8", caption, "-gravity", "northwest"]
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


def preview(tmp):
    """preview.png at the repo root (the herdr.dev gallery card, 1600x900): the herd, big, with
    the mod's name."""
    A = lambda f, n: Anim.get(f, n, tmp)
    t = 1200
    mons = [
        Mon(A("0025", "sleep"), 40, 0, "api", t=t, zz=True),
        Mon(A("0009", "walkR"), 150, 0, "refactor auth", "working", t=t),
        Mon(A("0445", "idleR"), 280, 0, "review", "blocked", t=t, bubble="!"),
        Mon(A("0003", "idleD"), 55, 1, "docs", "done", t=t, bubble="✓"),
        Mon(A("0006-0001", "walkR"), 175, 1, "deploy", "working", t=t),
        Mon(A("0493", "idleL"), 300, 1, "tests", t=t),
    ]
    strip = os.path.join(tmp, "preview-strip.png")
    draw(strip, 360, 2, mons, top=20)
    out = os.path.join(OUT, "..", "..", "preview.png")
    magick("-size", "1600x900", f"xc:{BG}", "(", strip, "-filter", "point", "-resize", "250%", ")", "-gravity", "east", "-geometry", "+90+0", "-composite",
           "-gravity", "northwest", "-font", FONT, "-fill", FG, "-pointsize", "64", "-annotate", "+110+330", "Pokémon herd",
           "-fill", MUTED, "-pointsize", "28", "-annotate", "+114+430", "Every coding agent in Herdr", "-annotate", "+114+472", "is a pixel-art Pokémon.",
           out)
    print(f"{os.path.relpath(out)}: {os.path.getsize(out) // 1024} KB")


SCENES = {"herd": herd, "focus": focus, "reactions": reactions, "variety": variety, "charizard-mega": charizard_mega, "preview": preview}
NEEDS = {"herd": ["0025", "0445", "0003", "0493", "0009", "0006-0001"], "focus": ["0025", "0003", "0493"],
         "reactions": ["0003", "0445"], "variety": ["0025", "0025s", "0037-0001", "0006-0001"],
         "charizard-mega": ["0006", "0006-0001"], "preview": ["0025", "0009", "0445", "0003", "0006-0001", "0493"]}


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
