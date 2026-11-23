// More signature moves' own looks (Hisui's, the Forces of Nature's, Paldea's), as fx-moves.js
// SIGNATURE draws them: parts { at, ms, a, b, color, round?, ring?, ease? }, `at` from when it lands.
// Each gets { x0, x1, y, g, sky, dir, dist, mid, st, rnd, P, O, ring, flash } (fx.js signatureParts).
// Pure, seeded by the passed rnd.

export const SIGNATURE_C = {
  // Chloroblast: Hisuian Electrode swells with green light, then a huge chlorophyll beam blasts
  // across and bursts on it, a green dome of light; leaves flung off it.
  "Chloroblast": ({ x0, x1, y, mid, dist, P, O, ring, flash, rnd }) => {
    const out = [ring(-600, x0, y, 50, 10, "#7bd65a", 300), flash(-340, x0, y, 34, "#e8ffc8", 240),
      P(-300, 240, O(x0, y, 10, 18, 1), O(mid, y, dist, 18, 1), "#3fae3a", { round: true, ease: "linear" }),
      P(-300, 240, O(x0, y, 4, 8, 1), O(mid, y, dist, 8, 1), "#e8ffc8", { round: true, ease: "linear" }),
      P(-60, 340, O(mid, y, dist, 18, 1), O(mid, y, dist, 2, 0), "#7bd65a", { round: true }),
      flash(0, x1, y, 64, "#e8ffc8", 340), P(0, 460, O(x1, y, 20, 20, 0.9), O(x1, y, 80, 64, 0), "#3fae3a", { round: true }),
      ring(0, x1, y, 12, 90, "#7bd65a", 480)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.4;
      out.push(P(40, 420, O(x1, y, 5, 3, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 24, 4, 2, 0), i % 2 ? "#a8e070" : "#3fae3a", { round: true, ease: "ease-out" }));
    }
    return out;
  },
  // Mountain Gale: Hisuian Avalugg heaves giant chunks of ice up and over; they crash down on it
  // and shatter into shards and frost.
  "Mountain Gale": ({ x0, x1, y, g, sky, dir, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const at = -520 + i * 90, xx = x1 + (i - 1) * 14, s = 16 - i * 3;
      out.push(P(at, 260, O(x0, y - 6, s * 0.6, s * 0.6, 1), O((x0 + xx) / 2, sky, s, s, 1), i % 2 ? "#c8f0ff" : "#8fd8f0", { ease: "ease-out" }),
        P(at + 260, 260 - i * 30, O((x0 + xx) / 2, sky, s, s, 1), O(xx, y - 4, s, s, 1), i % 2 ? "#c8f0ff" : "#8fd8f0", { ease: "ease-in" }));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd() * 0.3;
      out.push(P(0, 380, O(x1, y, 5, 5, 1), O(x1 + Math.cos(a) * 34 + dir * 4, Math.min(g, y + Math.sin(a) * 26), 3, 3, 0), i % 2 ? "#ffffff" : "#8fd8f0"));
    }
    return out.concat(flash(0, x1, y, 54, "#e8faff", 300), ring(0, x1, y, 12, 80, "#8fd8f0", 440),
      P(60, 420, O(x1, g - 2, 20, 4, 0.9), O(x1, g - 2, 80, 8, 0), "#c8f0ff", { round: true }));
  },
  // Bitter Malice: Hisuian Zoroark's spiteful spirits, pale and cold, drift over and close round it,
  // a chill of frost as they sink in.
  "Bitter Malice": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 26, "#c8b8ff", 220)];
    for (let i = 0; i < 5; i++) {
      const at = -520 + i * 60, dy = (rnd() - 0.5) * 30, a = (i / 5) * Math.PI * 2;
      out.push(P(at, 340, O(x0, y + dy, 8, 10, 0.4), O(x1 - dir * 30, y + dy * 0.6 - 8, 10, 13, 0.9), i % 2 ? "#8a6ab8" : "#d8d0ff", { round: true, ease: "ease-in-out" }),
        P(at + 340, 220, O(x1 - dir * 30, y + dy * 0.6 - 8, 10, 13, 0.9), O(x1 + Math.cos(a) * 6, y + Math.sin(a) * 6, 4, 4, 0.2), i % 2 ? "#8a6ab8" : "#d8d0ff", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 50, "#3a2a5a", 320), ring(0, x1, y, 10, 74, "#c8b8ff", 440), ring(80, x1, y, 8, 54, "#a8e8ff", 380),
      P(60, 480, O(x1, y, 40, 40, 0.5), O(x1, y, 56, 52, 0), "#a8e8ff", { round: true }));
  },
  // Infernal Parade: Hisuian Typhlosion's procession of ghostly fireballs, purple-hearted flames
  // bobbing across one after another and bursting on it.
  "Infernal Parade": ({ x0, x1, y, dir, dist, P, O, ring, flash }) => {
    const out = [ring(-600, x0, y, 40, 8, "#b070ff", 260)];
    for (let i = 0; i < 6; i++) {
      const at = -540 + i * 80, bob = (i % 2 ? 1 : -1) * 8;
      out.push(P(at, 360, O(x0 + dir * 8, y + bob, 8, 8, 1), O(x1, y - bob, 12, 12, 1), i % 2 ? "#ff7a3a" : "#8a3ad8", { round: true, ease: "ease-in-out" }),
        P(at, 360, O(x0 + dir * 8, y + bob, 4, 4, 1), O(x1, y - bob, 5, 5, 1), "#ffd0a0", { round: true, ease: "ease-in-out" }),
        P(at + 360, 220, O(x1, y - bob, 12, 12, 1), O(x1, y - bob - 6, 22, 22, 0), "#b070ff", { round: true }));
    }
    return out.concat(P(-220, 260, O(x0 + dir * dist * 0.5, y, dist * 0.4, 6, 0.3), O(x1, y, 8, 6, 0), "#5a2a8a", { round: true }),
      flash(0, x1, y, 54, "#ffb070", 320), ring(0, x1, y, 12, 80, "#8a3ad8", 440), ring(80, x1, y, 8, 56, "#ff7a3a", 380));
  },
  // Mystical Power: the lake guardians' strange light: a pink glow gathers over it, rings of
  // psychic light fold in, and it bursts in pink and gold.
  "Mystical Power": ({ x0, x1, y, P, O, ring, flash }) => {
    const out = [flash(-600, x0, y - 6, 30, "#ffd0f0", 260), P(-520, 400, O(x1, y, 10, 10, 0), O(x1, y, 44, 44, 0.6), "#ff80c8", { round: true })];
    for (let i = 0; i < 4; i++) out.push(P(-440 + i * 100, 320, O(x1, y, 90, 70, 0.1), O(x1, y, 12, 10, 0.9), i % 2 ? "#ffd75e" : "#ff5ab4", { round: true, ring: true, ease: "ease-in" }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(0, 360, O(x1, y, 4, 4, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 26, 3, 3, 0), i % 2 ? "#ffd75e" : "#ffd0f0", { round: true }));
    }
    return out.concat(flash(0, x1, y, 58, "#fff0fa", 320), ring(0, x1, y, 12, 90, "#ff5ab4", 480), ring(90, x1, y, 8, 64, "#ffd75e", 400));
  },
  // Triple Arrows: Hisuian Decidueye's kick lands, then three arrow-quills fly in behind it, one,
  // two, three, each a strike.
  "Triple Arrows": ({ x0, x1, y, dir, P, O, ring, flash }) => {
    const out = [P(-560, 140, O(x1 - dir * 22, y + 10, 8, 8, 1), O(x1 - dir * 4, y + 4, 14, 14, 1), "#c8a070", { round: true, ease: "ease-in" }),
      flash(-420, x1, y + 4, 30, "#fff2c0", 220), ring(-420, x1, y + 4, 8, 40, "#c8a070", 300)];
    for (const [k, at] of [[0, -220], [1, -110], [2, 0]]) {
      const yy = y + (k - 1) * 10;
      out.push(P(at - 180, 180, O(x0, yy - 6, 14, 2, 1), O(x1 - dir * 6, yy, 18, 2, 1), "#5a8a3a", { ease: "ease-in" }),
        P(at - 180, 180, O(x0 - dir * 8, yy - 6, 4, 4, 1), O(x1 - dir * 14, yy, 4, 4, 1), "#e8e0c0", { ease: "ease-in" }),
        flash(at, x1, yy, 26 + k * 6, k === 2 ? "#ffffff" : "#d8f0b0", 200));
    }
    return out.concat(ring(0, x1, y, 10, 70, "#5a8a3a", 420));
  },
  // Springtide Storm: Enamorus's spring wind, pink gusts swirling across and round it, petals
  // whirling in them.
  "Springtide Storm": ({ x0, x1, y, g, sky, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 420, O(x0, y, 20, 30, 0.6), O(x1, y, 60, g - sky, 0.35), "#ffb0d8", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 3; i++) out.push(ring(-360 + i * 120, x1, y, 20, 70 + i * 10, i % 2 ? "#ffd0e8" : "#ff80c0", 380, 0.7));
    for (let i = 0; i < 10; i++) {
      const at = -500 + i * 50, dy = (rnd() - 0.5) * 50, a = rnd() * Math.PI * 2;
      out.push(P(at, 440, O(x0 + dir * rnd() * dist * 0.3, y + dy, 4, 3, 1), O(x1 + Math.cos(a) * 30, Math.max(sky, Math.min(g, y + Math.sin(a) * 24)), 4, 3, 0), i % 3 ? "#ffb0d8" : "#ffffff", { round: true }));
    }
    return out.concat(flash(0, x1, y, 50, "#fff0f8", 300), ring(60, x1, y, 10, 74, "#ff5ab4", 420));
  },
  // Bleakwind Storm: Tornadus's cold wind, a pale tornado whirling across onto it, frosty specks
  // spun out of it.
  "Bleakwind Storm": ({ x0, x1, y, g, sky, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const at = -540 + i * 60, yy = g - 6 - i * ((g - sky - 10) / 6), w = 14 + i * 6;
      out.push(P(at, 400, O(x0 + dir * 10, yy, w * 0.6, 6, 0.8), O(x1, yy, w, 7, 0.9), i % 2 ? "#c8e8ff" : "#8fb8d8", { round: true, ring: true, ease: "ease-in-out" }),
        P(at + 400, 260, O(x1, yy, w, 7, 0.9), O(x1, yy, w + 14, 9, 0), "#e8f6ff", { round: true, ring: true }));
    }
    for (let i = 0; i < 8; i++) {
      const a = rnd() * Math.PI * 2;
      out.push(P(-200 + i * 30, 360, O(x1, y, 3, 3, 1), O(x1 + Math.cos(a) * 40 + dir * 6, Math.max(sky, Math.min(g, y + Math.sin(a) * 26)), 2, 2, 0), "#ffffff", { round: true }));
    }
    return out.concat(P(-500, 500, O(x0, y, dist * 0.2, 24, 0.0), O(x1, y, 40, g - sky, 0.25), "#a8d0f0", { round: true }),
      flash(0, x1, y, 48, "#f0faff", 300), ring(0, x1, y, 10, 74, "#8fb8d8", 420));
  },
  // Wildbolt Storm: Thundurus's storm: dark clouds over it, then bolts of lightning crash down on
  // it one after another.
  "Wildbolt Storm": ({ x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [P(-600, 280, O(x1, sky, 20, 8, 0), O(x1, sky, 90, 16, 0.85), "#3a3a5a", { round: true }),
      P(80, 400, O(x1, sky, 90, 16, 0.85), O(x1, sky, 100, 18, 0), "#3a3a5a", { round: true })];
    for (let i = 0; i < 5; i++) {
      const xx = x1 + (rnd() - 0.5) * 50, at = -300 + i * 70, top = sky + 4;
      out.push(P(at, 60, O(xx, top, 3, 4, 1), O(xx, (top + g) / 2, 4, g - top, 1), i % 2 ? "#ffe14a" : "#ffffff", { ease: "ease-in" }),
        P(at + 60, 200, O(xx, (top + g) / 2, 4, g - top, 1), O(xx, (top + g) / 2, 1, g - top, 0), "#fff6a0"),
        P(at + 60, 220, O(xx, g - 2, 6, 3, 1), O(xx, g - 2, 24, 5, 0), "#ffe14a", { round: true }));
    }
    return out.concat(flash(0, x1, y, 56, "#fffbe0", 300), ring(0, x1, y, 12, 84, "#ffe14a", 440), ring(80, x1, y, 8, 56, "#7aa2f7", 380));
  },
  // Sandsear Storm: Landorus's scorching sandstorm: hot sand and embers blown across, swirling
  // round it, the air shimmering orange.
  "Sandsear Storm": ({ x0, x1, y, g, sky, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 500, O(x0, y, 20, 26, 0.3), O(x1, y, 70, g - sky, 0.4), "#d8a050", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 12; i++) {
      const at = -540 + i * 40, dy = (rnd() - 0.5) * 44, a = rnd() * Math.PI * 2;
      out.push(P(at, 420, O(x0 + dir * rnd() * dist * 0.3, y + dy, 3, 2, 1), O(x1 + Math.cos(a) * 34, Math.max(sky, Math.min(g, y + Math.sin(a) * 24)), 3, 2, 0), i % 3 ? "#e8c080" : "#ff6a2a"));
    }
    for (let i = 0; i < 3; i++) out.push(ring(-280 + i * 110, x1, y, 22, 74, i % 2 ? "#ff8a3a" : "#c8a060", 360, 0.7));
    return out.concat(flash(0, x1, y, 50, "#ffd8a0", 300), P(40, 420, O(x1, g - 2, 20, 4, 0.9), O(x1, g - 2, 80, 8, 0), "#c8a060", { round: true }));
  },
  // Psyshield Bash: Wyrdeer charges in wrapped in a glowing pink shield and slams into it.
  "Psyshield Bash": ({ x0, x1, y, g, dir, P, O, ring, flash }) => [
    P(-460, 460, O(x0, y, 30, 30, 0.8), O(x1 - dir * 14, y, 34, 34, 0.9), "#ff80d0", { round: true, ring: true, ease: "ease-in" }),
    P(-460, 460, O(x0, y, 26, 26, 0.25), O(x1 - dir * 14, y, 30, 30, 0.35), "#ffd0f0", { round: true, ease: "ease-in" }),
    P(-300, 300, O(x0 - dir * 20, y, 20, 3, 0), O(x1 - dir * 44, y, 30, 3, 0.7), "#ff5ab4", { ease: "ease-in" }),
    P(0, 300, O(x1 - dir * 14, y, 34, 34, 0.9), O(x1 - dir * 14, y, 50, 50, 0), "#ff80d0", { round: true, ring: true }),
    flash(0, x1, y, 54, "#fff0fa", 300), ring(0, x1, y, 12, 84, "#ff5ab4", 440),
    P(40, 400, O(x1, g - 2, 20, 4, 0.8), O(x1, g - 2, 70, 7, 0), "#d8b0e8", { round: true }),
  ],
  // Barb Barrage: Overqwil fires a volley of poison barbs that stick in it, purple splashes on each.
  "Barb Barrage": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const at = -360 + i * 50, dy = (rnd() - 0.5) * 26, hit = at + 220;
      out.push(P(at, 220, O(x0 + dir * 8, y + dy * 0.3, 8, 2, 1), O(x1 - dir * 4, y + dy, 8, 2, 1), i % 2 ? "#b070d8" : "#5a2a7a", { ease: "linear" }),
        P(hit, 260, O(x1, y + dy, 6, 6, 1), O(x1, y + dy, 16, 16, 0), "#c86ae0", { round: true }));
    }
    return out.concat(flash(60, x1, y, 46, "#e8c8ff", 280), ring(60, x1, y, 10, 66, "#8a3ad8", 420));
  },
  // Dire Claw: Sneasler's claws rake it in three purple slashes, poison dripping off the wounds.
  "Dire Claw": ({ x1, y, g, dir, P, O, ring, flash }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const xx = x1 + (i - 1) * 9, at = -160 + i * 30;
      out.push(P(at, 120, O(xx - dir * 10, y - 22, 2, 2, 1), O(xx, y, 3, 46, 1), i === 1 ? "#ffffff" : "#c86ae0", { ease: "ease-out" }),
        P(at + 120, 340, O(xx, y, 3, 46, 1), O(xx, y, 8, 50, 0), "#5a2a7a"),
        P(at + 160, 420, O(xx, y + 16, 3, 4, 1), O(xx, Math.min(g, y + 34), 3, 6, 0), "#8a3ad8", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 48, "#e8c8ff", 280), ring(40, x1, y, 10, 70, "#8a3ad8", 420));
  },
  // Prismatic Laser: Necrozma's prism gathers light, then beams of every colour fire across together
  // and break into a white flare.
  "Prismatic Laser": ({ x0, x1, y, mid, dist, P, O, ring, flash }) => {
    const cols = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
    const out = [ring(-600, x0, y, 46, 8, "#ffffff", 300), flash(-340, x0, y, 30, "#ffffff", 220)];
    cols.forEach((c, i) => {
      const dy = (i - 2.5) * 3;
      out.push(P(-300, 220, O(x0, y + dy * 2, 4, 3, 1), O(mid, y + dy, dist, 3, 1), c, { ease: "linear" }),
        P(-80, 320, O(mid, y + dy, dist, 3, 1), O(mid, y + dy, dist, 1, 0), c));
    });
    return out.concat(P(-300, 220, O(x0, y, 4, 4, 1), O(mid, y, dist, 4, 1), "#ffffff", { round: true, ease: "linear" }),
      flash(0, x1, y, 62, "#ffffff", 340), ring(0, x1, y, 12, 90, "#b070ff", 460), ring(80, x1, y, 8, 64, "#ffe14a", 400));
  },
  // Shadow Bone: Alolan Marowak swings its bone, wreathed in green-blue ghost fire, down on it.
  "Shadow Bone": ({ x1, y, sky, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-300, 300, O(x1 - dir * 30, sky + 6, 4, 22, 1), O(x1 - dir * 4, y, 4, 22, 1), "#efe6d8", { ease: "ease-in" }),
      P(-300, 300, O(x1 - dir * 30, sky + 6, 12, 30, 0.6), O(x1 - dir * 4, y, 14, 32, 0.8), "#5ad8a0", { round: true, ease: "ease-in" }),
      P(-200, 200, O(x1 - dir * 34, sky + 10, 10, 18, 0), O(x1 - dir * 12, y - 6, 10, 18, 0.6), "#8a5ab8", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 5; i++) out.push(P(20 + i * 20, 380, O(x1 + (rnd() - 0.5) * 20, y, 6, 8, 1), O(x1 + (rnd() - 0.5) * 30, y - 20 - rnd() * 14, 3, 6, 0), i % 2 ? "#5ad8a0" : "#8a5ab8", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 50, "#c8ffe8", 300), ring(0, x1, y, 10, 74, "#5ad8a0", 420));
  },
  // Crush Grip: Regigigas's giant hand closes on it, fingers pressing in from all round, then a squeeze.
  "Crush Grip": ({ x1, y, P, O, ring, flash }) => {
    const out = [P(-520, 300, O(x1, y, 20, 20, 0), O(x1, y, 80, 70, 0.35), "#d8c8a0", { round: true })];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      out.push(P(-400, 360, O(x1 + Math.cos(a) * 44, y + Math.sin(a) * 32, 8, 8, 0.4), O(x1 + Math.cos(a) * 14, y + Math.sin(a) * 10, 10, 10, 1), "#efe4c8", { round: true, ease: "ease-in" }));
    }
    return out.concat(P(-40, 260, O(x1, y, 80, 70, 0.35), O(x1, y, 20, 18, 0.9), "#a89870", { round: true, ease: "ease-in" }),
      flash(0, x1, y, 52, "#ffffff", 300), ring(0, x1, y, 10, 80, "#ffe9a8", 440), ring(70, x1, y, 8, 56, "#c8b080", 380));
  },
  // Hydro Steam: Walking Wake's boiling water: a hot jet across, bursting into clouds of steam.
  "Hydro Steam": ({ x0, x1, y, mid, dist, P, O, ring, flash, rnd }) => {
    const out = [P(-280, 260, O(x0, y, 6, 14, 1), O(mid, y, dist, 14, 1), "#2a8cff", { round: true, ease: "linear" }),
      P(-280, 260, O(x0, y, 4, 5, 1), O(mid, y, dist, 5, 1), "#ffd8a0", { round: true, ease: "linear" }),
      P(-20, 300, O(mid, y, dist, 14, 1), O(mid, y, dist, 2, 0), "#8fd3ff", { round: true })];
    for (let i = 0; i < 7; i++) {
      const xx = x1 + (rnd() - 0.5) * 40;
      out.push(P(20 + i * 35, 440, O(xx, y, 12, 10, 0.8), O(xx + (rnd() - 0.5) * 20, y - 24 - rnd() * 14, 30, 22, 0), i % 2 ? "#ffffff" : "#e8eef4", { round: true, ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 52, "#ffffff", 300), ring(0, x1, y, 12, 80, "#4fb4ff", 440));
  },
  // Psyblade: Iron Leaves's glowing psychic blade cuts across it in one bright pink slash.
  "Psyblade": ({ x0, x1, y, dir, P, O, ring, flash }) => [
    flash(-420, x0, y - 6, 24, "#ff80d0", 220),
    P(-360, 260, O(x0 + dir * 8, y - 8, 30, 3, 0.8), O(x1 - dir * 30, y - 8, 30, 3, 0.9), "#ff5ab4", { ease: "ease-in" }),
    P(-120, 120, O(x1 - dir * 28, y - 24, 2, 2, 1), O(x1, y, 72, 4, 1), "#ffffff", { ease: "ease-out" }),
    P(-120, 120, O(x1 - dir * 28, y - 24, 2, 2, 1), O(x1, y, 76, 9, 0.7), "#ff5ab4", { ease: "ease-out" }),
    P(0, 340, O(x1, y, 76, 9, 0.7), O(x1, y, 90, 16, 0), "#ff80d0"),
    P(0, 300, O(x1, y, 72, 4, 1), O(x1, y, 84, 1, 0), "#fff0fa"),
    flash(0, x1, y, 46, "#ffd0f0", 280), ring(40, x1, y, 10, 70, "#ff5ab4", 420),
  ],
  // Matcha Gotcha: Sinistcha fires a cannon of green tea that splashes over it in frothy drops.
  "Matcha Gotcha": ({ x0, x1, y, mid, dist, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-300, 280, O(x0, y, 8, 14, 1), O(mid, y, dist, 14, 1), "#6aa83a", { round: true, ease: "linear" }),
      P(-300, 280, O(x0, y, 4, 6, 1), O(mid, y, dist, 6, 1), "#c8e8a0", { round: true, ease: "linear" }),
      P(-20, 320, O(mid, y, dist, 14, 1), O(mid, y, dist, 2, 0), "#8ac85a", { round: true })];
    for (let i = 0; i < 8; i++) out.push(P(0, 420, O(x1, y, 5, 5, 1), O(x1 + (rnd() - 0.2) * 44 * dir, y - 10 - rnd() * 22, 3, 3, 0), i % 2 ? "#6aa83a" : "#efffd8", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 50, "#efffd8", 300), ring(0, x1, y, 12, 76, "#6aa83a", 440));
  },
  // Syrup Bomb: Dipplin lobs a sticky blob of syrup over; it lands on it and splats, drips
  // running down after.
  "Syrup Bomb": ({ x0, x1, y, g, sky, mid, P, O, ring, flash, rnd }) => {
    const top = sky + 4;
    const out = [P(-500, 250, O(x0, y - 6, 10, 10, 1), O(mid, top, 14, 14, 1), "#d86a2a", { round: true, ease: "ease-out" }),
      P(-250, 250, O(mid, top, 14, 14, 1), O(x1, y - 4, 16, 16, 1), "#d86a2a", { round: true, ease: "ease-in" }),
      P(-250, 250, O(mid, top - 2, 6, 4, 1), O(x1, y - 8, 6, 4, 1), "#ffd09a", { round: true, ease: "ease-in" }),
      P(0, 440, O(x1, y, 20, 14, 1), O(x1, y + 4, 54, 30, 0), "#c85a20", { round: true })];
    for (let i = 0; i < 5; i++) {
      const xx = x1 + (i - 2) * 9 + (rnd() - 0.5) * 4;
      out.push(P(80 + i * 40, 460, O(xx, y + 6, 4, 4, 1), O(xx, Math.min(g, y + 22), 3, 10, 0), "#b84a18", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 44, "#ffd09a", 280), ring(0, x1, y, 10, 66, "#d86a2a", 420));
  },
  // Thunderclap: Raging Bolt's lightning-fast strike: a single bolt cracks down on it from above.
  "Thunderclap": ({ x1, y, g, sky, P, O, ring, flash }) => [
    flash(-160, x1, sky + 4, 30, "#fff6a0", 140),
    P(-80, 50, O(x1, sky + 2, 3, 4, 1), O(x1, (sky + g) / 2, 6, g - sky, 1), "#ffffff", { ease: "ease-in" }),
    P(-80, 50, O(x1 - 6, sky + 2, 2, 4, 0.9), O(x1 - 6, (sky + g) / 2, 10, g - sky, 0.7), "#ffe14a", { ease: "ease-in" }),
    P(0, 220, O(x1, (sky + g) / 2, 6, g - sky, 1), O(x1, (sky + g) / 2, 1, g - sky, 0), "#fff6a0"),
    flash(0, x1, y, 56, "#fffbe0", 280), ring(0, x1, y, 12, 84, "#ffe14a", 400),
    P(20, 300, O(x1, g - 2, 8, 3, 1), O(x1, g - 2, 60, 6, 0), "#ffe14a", { round: true }),
  ],
  // Fickle Beam: Hydrapple's heads fire green-gold dragon beams, the main one and two more from its
  // other heads, crossing on it.
  "Fickle Beam": ({ x0, x1, y, dir, P, O, ring, flash }) => {
    const out = [];
    for (const [k, dy] of [[0, 0], [1, -12], [2, 10]]) {
      const at = -340 + k * 60, sx = x0 + dir * (k ? 4 : 10), sy = y + dy - 6;
      out.push(flash(at - 80, sx, sy, 18, "#ffe14a", 180),
        P(at, 240, O(sx, sy, 4, 4, 1), O((sx + x1) / 2, (sy + y) / 2, Math.abs(x1 - sx), 6 - k, 1), k ? "#7bd65a" : "#ffd75e", { round: true, ease: "linear" }),
        P(at + 240, 280, O((sx + x1) / 2, (sy + y) / 2, Math.abs(x1 - sx), 6 - k, 1), O((sx + x1) / 2, (sy + y) / 2, Math.abs(x1 - sx), 1, 0), k ? "#3fae5a" : "#fff2a8", { round: true }));
    }
    return out.concat(flash(0, x1, y, 56, "#fff2c0", 320), ring(0, x1, y, 12, 84, "#7bd65a", 440), ring(80, x1, y, 8, 60, "#ffd75e", 380));
  },
  // Strange Steam: Galarian Weezing billows pink-white fairy steam over; it rolls round it in clouds.
  "Strange Steam": ({ x0, x1, y, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const at = -560 + i * 55, dy = (rnd() - 0.5) * 24, ex = x1 + (rnd() - 0.5) * 30;
      out.push(P(at, 420, O(x0 + dir * 10, y + dy * 0.4, 12, 10, 0.8), O(ex, y + dy, 28 + rnd() * 10, 22, 0.6), i % 2 ? "#ffd0e8" : "#f4f0f8", { round: true, ease: "ease-out" }),
        P(at + 420, 300, O(ex, y + dy, 30, 22, 0.6), O(ex, y + dy - 10, 40, 30, 0), i % 2 ? "#ffd0e8" : "#f4f0f8", { round: true }));
    }
    for (let i = 0; i < 5; i++) out.push(P(-100 + i * 40, 360, O(x1 + (rnd() - 0.5) * 30, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 50, y - 20 - rnd() * 10, 2, 2, 0), "#ff80c0", { round: true }));
    return out.concat(P(-560, 500, O(x0, y, dist * 0.2, 20, 0.0), O(x1, y, 60, 46, 0.3), "#ffb0d8", { round: true }),
      flash(0, x1, y, 46, "#fff0fa", 300), ring(40, x1, y, 10, 70, "#ff80c0", 420));
  },
  // Meteor Assault: Sirfetch'd charges with its leek held out like a lance, blazing in like a
  // meteor, a fiery trail behind and a huge impact.
  "Meteor Assault": ({ x0, x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 30, "#ffe9a8", 240),
      P(-400, 400, O(x0, y - 4, 14, 14, 1), O(x1 - dir * 6, y, 22, 22, 1), "#ffb43a", { round: true, ease: "ease-in" }),
      P(-400, 400, O(x0 + dir * 8, y - 4, 16, 3, 1), O(x1 + dir * 4, y, 22, 4, 1), "#7bd65a", { ease: "ease-in" }),
      P(-320, 320, O(x0 - dir * 10, y - 4, 10, 8, 0.2), O(x1 - dir * 34, y, 50, 12, 0.7), "#ff6a2a", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd() * 0.3;
      out.push(P(0, 380, O(x1, y, 5, 5, 1), O(x1 + Math.cos(a) * 40, Math.min(g, y + Math.sin(a) * 28), 3, 3, 0), i % 2 ? "#ffd75e" : "#ff6a2a", { round: true }));
    }
    return out.concat(flash(0, x1, y, 62, "#fff2c0", 340), ring(0, x1, y, 12, 94, "#ff8a3a", 480), ring(80, x1, y, 8, 66, "#ffd75e", 400),
      P(40, 420, O(x1, g - 2, 20, 4, 0.9), O(x1, g - 2, 90, 8, 0), "#c8bca8", { round: true }));
  },
};
