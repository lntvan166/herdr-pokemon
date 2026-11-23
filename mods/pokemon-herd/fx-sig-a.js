// More Pokémon's own moves (Galar's fossils and legends, Alola's, Kalos's, Unova's, Hoenn's),
// drawn as fx-moves.js SIGNATURE is: parts { at, ms, a, b, color, round?, ring?, ease? }, `at` from
// when it lands; c: x0 → x1 at y, g the ground, sky above, dir the way it goes, st its colours.
// Each gets P, O, ring, flash and a seeded rnd. Pure.

export const SIGNATURE_A = {
  // Bolt Beak: Dracozolt charges in, its beak crackling yellow, and jabs; sparks burst off where it lands.
  "Bolt Beak": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-480, x0 + dir * 8, y - 4, 22, "#fff27a", 200),
      P(-300, 300, O(x0 + dir * 10, y - 4, 10, 6, 0.8), O(x1 - dir * 8, y, 18, 8, 1), "#ffe14a", { ease: "ease-in" }),
      P(-140, 140, O(x1 - dir * 34, y, 30, 3, 0.6), O(x1 - dir * 6, y, 10, 2, 1), "#ffffff", { ease: "ease-in" })];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.4, r = 20 + rnd() * 14;
      out.push(P(0, 260, O(x1, y, 3, 3, 1), O(x1 + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2, 6, 0), i % 2 ? "#ffe14a" : "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 48, "#fff6b0", 280), ring(0, x1, y, 10, 70, "#ffd23f", 420), ring(80, x1, y, 8, 50, "#7ab0ff", 340));
  },
  // Fishious Rend: Dracovish's great jaws close on it: blue fangs from above and below, water spraying.
  "Fishious Rend": ({ x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const xx = x1 + (i - 1) * 10;
      out.push(P(-220, 200, O(xx, y - 30, 6, 10, 1), O(xx, y - 6, 4, 12, 1), "#e8f6ff", { ease: "ease-in" }),
        P(-220, 200, O(xx, g - 4, 6, 10, 1), O(xx, y + 6, 4, 12, 1), "#e8f6ff", { ease: "ease-in" }),
        P(-20, 260, O(xx, y, 4, 24, 1), O(xx, y, 2, 30, 0), "#2a6ac8"));
    }
    for (let i = 0; i < 6; i++) out.push(P(0, 360, O(x1, y, 4, 4, 1), O(x1 + dir * (6 + rnd() * 24) * (i % 2 ? 1 : -1), y - 10 - rnd() * 22, 3, 3, 0), "#8fd3ff", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 50, "#c8ecff", 300), ring(0, x1, y, 10, 70, "#2a8cff", 420));
  },
  // Aura Wheel: Morpeko rolls in inside a spinning wheel of yellow electric aura, sparks thrown off it.
  "Aura Wheel": ({ x0, x1, y, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [P(-340, 340, O(x0, y, 24, 24, 1), O(x1, y, 28, 28, 1), "#ffd23f", { round: true, ring: true, ease: "ease-in" }),
      P(-340, 340, O(x0, y, 12, 12, 0.5), O(x1, y, 14, 14, 0.7), "#fff27a", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * dist * (i + 1) / 7, at = -340 + (i + 1) * 48;
      out.push(P(at, 240, O(x, y + 10, 3, 3, 1), O(x - dir * (8 + rnd() * 10), y - 6 - rnd() * 12, 2, 5, 0), i % 2 ? "#ffe14a" : "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 50, "#fff6b0", 280), ring(0, x1, y, 14, 76, "#ffd23f", 440), ring(70, x1, y, 10, 56, "#ffffff", 360));
  },
  // Double Iron Bash: Melmetal's hex-nut fists hit twice, a steel clang and a grey ring each time.
  "Double Iron Bash": ({ x0, x1, y, dir, P, O, ring, flash }) => {
    const out = [];
    for (const [k, at] of [[0, -200], [1, 0]]) {
      const yy = y + (k ? 6 : -6);
      out.push(P(at - 160, 160, O(x0 + dir * 12, yy, 14, 14, 0.8), O(x1 - dir * 6, yy, 18, 18, 1), "#9aa8b8", { ease: "ease-in" }),
        P(at - 160, 160, O(x0 + dir * 12, yy, 6, 6, 0.8), O(x1 - dir * 6, yy, 7, 7, 1), "#5a6470", { round: true, ease: "ease-in" }),
        flash(at, x1, yy, 36 + k * 14, "#e8eef4", 240), ring(at, x1, yy, 10, 50 + k * 20, "#b8c4d0", 380));
    }
    return out.concat(ring(80, x1, y, 8, 54, "#ffffff", 340));
  },
  // Plasma Fists: Zeraora's fists, wrapped in blue-white plasma, punch twice; lightning crackles round it.
  "Plasma Fists": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [ring(-560, x0, y, 34, 10, "#8fd3ff", 260)];
    for (const [k, at] of [[0, -160], [1, 0]]) {
      const yy = y + (k ? 6 : -6);
      out.push(P(at - 140, 140, O(x0 + dir * 10, yy, 10, 10, 0.8), O(x1 - dir * 6, yy, 16, 16, 1), "#4fd8ff", { round: true, ease: "ease-in" }),
        P(at - 140, 140, O(x0 + dir * 10, yy, 5, 5, 1), O(x1 - dir * 6, yy, 8, 8, 1), "#ffffff", { round: true, ease: "ease-in" }),
        flash(at, x1, yy, 38, "#c8f4ff", 220));
    }
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (rnd() - 0.5) * 44, yy = y + (rnd() - 0.5) * 32;
      out.push(P(30 + i * 30, 160, O(xx, yy, 2, 12, 1), O(xx, yy, 1, 3, 0), i % 2 ? "#ffe14a" : "#8fd3ff"));
    }
    return out.concat(ring(0, x1, y, 12, 76, "#4fd8ff", 440));
  },
  // Multi-Attack: Silvally charges, its memory's colour streaming off it, and rakes it with its claws.
  "Multi-Attack": ({ x0, x1, y, dir, P, O, ring, flash, st }) => {
    const out = [ring(-560, x0, y, 40, 10, st.core, 280),
      P(-320, 300, O(x0 + dir * 10, y, 12, 12, 0.8), O(x1 - dir * 10, y, 22, 22, 1), st.core, { round: true, ease: "ease-in" }),
      P(-320, 300, O(x0, y, 10, 4, 0.6), O(x1 - dir * 30, y, 50, 3, 0.2), st.mid, { ease: "ease-in" })];
    for (let i = 0; i < 3; i++) {
      const at = -40 + i * 40, dy = (i - 1) * 8;
      out.push(P(at, 100, O(x1 - dir * 10, y - 18 + dy, 2, 2, 1), O(x1 + dir * 10, y + 2 + dy, 3, 36, 1), "#ffffff", { ease: "ease-out" }),
        P(at + 100, 260, O(x1 + dir * 10, y + 2 + dy, 3, 36, 1), O(x1 + dir * 10, y + 2 + dy, 1, 40, 0), st.mid));
    }
    return out.concat(flash(0, x1, y, 48, st.hot, 280), ring(40, x1, y, 10, 70, st.core, 420));
  },
  // Zing Zap: Togedemaru spins in, spikes bristling with electricity, and zaps on contact.
  "Zing Zap": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-300, 300, O(x0, y, 18, 18, 1), O(x1 - dir * 4, y, 18, 18, 1), "#c8c8d0", { round: true, ease: "ease-in" }),
      P(-300, 300, O(x0, y, 26, 26, 0.8), O(x1 - dir * 4, y, 26, 26, 0.9), "#ffe14a", { round: true, ring: true, ease: "ease-in" })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd() * 0.3;
      out.push(P(0, 220, O(x1 + Math.cos(a) * 10, y + Math.sin(a) * 10, 3, 3, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 18, 2, 8, 0), i % 2 ? "#ffe14a" : "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 44, "#fff6b0", 260), ring(0, x1, y, 10, 64, "#ffd23f", 400));
  },
  // Core Enforcer: Zygarde draws a Z of green light across it, and the Z blasts in green and black.
  "Core Enforcer": ({ x0, x1, y, P, O, ring, flash }) => {
    const out = [flash(-580, x0, y, 30, "#7bf08a", 240), ring(-560, x0, y, 44, 8, "#2a9a4a", 260)];
    const top = y - 18, bot = y + 18;
    out.push(P(-360, 110, O(x1 - 22, top, 2, 3, 1), O(x1, top, 44, 3, 1), "#5af07a", { ease: "linear" }),
      P(-250, 110, O(x1 + 20, top + 2, 3, 3, 1), O(x1, y, 4, 40, 1), "#5af07a", { ease: "linear" }),
      P(-140, 110, O(x1 - 22, bot, 2, 3, 1), O(x1, bot, 44, 3, 1), "#5af07a", { ease: "linear" }));
    for (const yy of [top, bot]) out.push(P(-30, 300, O(x1, yy, 44, 3, 1), O(x1, yy, 52, 8, 0), "#1a2a1e"));
    out.push(P(-30, 300, O(x1, y, 4, 40, 1), O(x1, y, 10, 46, 0), "#1a2a1e"));
    return out.concat(flash(0, x1, y, 58, "#c8ffd0", 320), ring(0, x1, y, 12, 88, "#2a9a4a", 460), ring(80, x1, y, 10, 64, "#1a2a1e", 400));
  },
  // Land's Wrath: green earth energy gathers over Zygarde, then slams into the ground under the
  // other, the ground bursting up in a green-gold wave.
  "Land's Wrath": ({ x0, x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(-560 + i * 30, 260, O(x0 + Math.cos(a) * 24, y + Math.sin(a) * 16, 5, 5, 1), O(x0, sky + 8, 4, 4, 0.9), i % 2 ? "#5af07a" : "#c8b060", { round: true, ease: "ease-in" }));
    }
    out.push(P(-300, 200, O(x0, sky + 8, 12, 12, 1), O(x1, sky + 8, 18, 18, 1), "#5af07a", { round: true, ease: "ease-out" }),
      P(-100, 100, O(x1, sky + 8, 16, 16, 1), O(x1, g - 2, 10, 10, 1), "#c8ffd0", { round: true, ease: "ease-in" }));
    for (let i = 0; i < 5; i++) {
      const xx = x1 + (i - 2) * 12, h = 14 + rnd() * 16;
      out.push(P(i * 30, 160, O(xx, g, 8, 2, 1), O(xx, g - h / 2, 7, h, 0.9), i % 2 ? "#8a6a3a" : "#6a8a3a", { ease: "ease-out" }),
        P(i * 30 + 160, 280, O(xx, g - h / 2, 7, h, 0.9), O(xx, g - h / 2, 3, h, 0), "#5a4a2a"));
    }
    return out.concat(flash(0, x1, g - 4, 50, "#c8ffd0", 300), ring(0, x1, g - 2, 10, 96, "#5af07a", 480));
  },
  // Diamond Storm: a whirlwind of diamonds sweeps up round it, glinting white and pink.
  "Diamond Storm": ({ x0, x1, y, g, P, O, ring, flash, rnd }) => {
    const out = [flash(-560, x0, y, 30, "#ffe0f4", 220)];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rnd() * 0.3, at = -320 + i * 26;
      const xa = x1 + Math.cos(a) * 30, ya = g - 4 - i * 2, xb = x1 + Math.cos(a + 2) * 16, yb = y - 20 + rnd() * 10;
      out.push(P(at, 320, O(xa, ya, 5, 7, 1), O(xb, yb, 4, 6, 0.2), i % 3 ? "#e8f4ff" : "#ff9ad8", { ease: "ease-out" }));
    }
    for (let i = 0; i < 5; i++) {
      const xx = x1 + (rnd() - 0.5) * 50, yy = y + (rnd() - 0.5) * 34;
      out.push(P(20 + i * 40, 220, O(xx, yy, 2, 10, 1), O(xx, yy, 1, 2, 0), "#ffffff"), P(20 + i * 40, 220, O(xx, yy, 10, 2, 1), O(xx, yy, 2, 1, 0), "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 48, "#ffe0f4", 300), ring(0, x1, y, 12, 76, "#c8e8ff", 440), ring(60, x1, y, 8, 56, "#ff9ad8", 380));
  },
  // Fleur Cannon: Magearna charges a pink orb and fires a thick pink beam at it.
  "Fleur Cannon": ({ x0, x1, y, mid, dist, P, O, ring, flash }) => [
    ring(-600, x0, y, 44, 8, "#ff9ad8", 280),
    P(-560, 260, O(x0, y, 4, 4, 1), O(x0, y, 20, 20, 1), "#ff70c0", { round: true }),
    P(-300, 260, O(x0, y, 4, 18, 1), O(mid, y, dist, 18, 0.95), "#ff70c0", { round: true, ease: "linear" }),
    P(-300, 260, O(x0, y, 4, 8, 1), O(mid, y, dist, 8, 1), "#ffe0f4", { round: true, ease: "linear" }),
    P(-40, 340, O(mid, y, dist, 18, 0.95), O(mid, y, dist, 1, 0), "#ff9ad8", { round: true }),
    flash(0, x1, y, 56, "#ffe0f4", 320), ring(0, x1, y, 12, 86, "#ff70c0", 460), ring(80, x1, y, 8, 60, "#ffffff", 380),
  ],
  // Light of Ruin: the Eternal Flower's light gathers, then a huge white-pink beam bursts across.
  "Light of Ruin": ({ x0, x1, y, mid, dist, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.3;
      out.push(P(-600 + i * 30, 240, O(x0 + Math.cos(a) * 30, y + Math.sin(a) * 22, 5, 5, 1), O(x0, y, 3, 3, 0.8), i % 2 ? "#ff9ad8" : "#ffffff", { round: true, ease: "ease-in" }));
    }
    out.push(flash(-340, x0, y, 40, "#ffffff", 220),
      P(-300, 240, O(x0, y, 6, 30, 1), O(mid, y, dist, 30, 0.6), "#ff9ad8", { round: true, ease: "linear" }),
      P(-300, 240, O(x0, y, 6, 12, 1), O(mid, y, dist, 12, 1), "#ffffff", { round: true, ease: "linear" }),
      P(-60, 380, O(mid, y, dist, 30, 0.6), O(mid, y, dist + 10, 2, 0), "#ffd0f0", { round: true }));
    return out.concat(flash(0, x1, y, 64, "#ffffff", 340), ring(0, x1, y, 14, 96, "#ff70c0", 500), ring(90, x1, y, 10, 70, "#ffe0f4", 420));
  },
  // Fusion Bolt: Zekrom, wrapped in a giant blue-white thunderbolt, rams into it.
  "Fusion Bolt": ({ x0, x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-560, x0, y, 40, "#c8f4ff", 240),
      P(-320, 320, O(x0, y, 20, 26, 1), O(x1 - dir * 6, y, 30, 30, 1), "#4f8cff", { round: true, ease: "ease-in" }),
      P(-320, 320, O(x0, y, 10, 14, 1), O(x1 - dir * 6, y, 14, 14, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-200, 200, O(x0, y, 10, 4, 0.8), O(x1 - dir * 34, y, 54, 3, 0.4), "#8fd3ff", { ease: "ease-in" })];
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (rnd() - 0.5) * 50, yy = y + (rnd() - 0.5) * 34;
      out.push(P(i * 25, 160, O(xx, yy, 2, 14, 1), O(xx, yy, 1, 3, 0), i % 2 ? "#ffffff" : "#8fd3ff"));
    }
    return out.concat(flash(0, x1, y, 60, "#e8f6ff", 320), ring(0, x1, y, 14, 90, "#4f8cff", 460), ring(70, x1, g - 2, 10, 70, "#8fd3ff", 400));
  },
  // Fusion Flare: Reshiram calls down a huge fireball out of the sky; it bursts over it in flame.
  "Fusion Flare": ({ x0, x1, y, sky, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 30, "#fff2c0", 240),
      P(-560, 220, O(x0, y, 6, 6, 1), O(x1, sky + 10, 24, 24, 1), "#ffd75e", { round: true, ease: "ease-out" }),
      P(-340, 340, O(x1, sky + 10, 24, 24, 1), O(x1, y, 32, 32, 1), "#ff6a2a", { round: true, ease: "ease-in" }),
      P(-340, 340, O(x1, sky + 10, 12, 12, 1), O(x1, y, 16, 16, 1), "#fff2c0", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd() * 0.3;
      out.push(P(0, 340, O(x1, y, 8, 8, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 22, 4, 4, 0), i % 2 ? "#ff6a2a" : "#ffd75e", { round: true, ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 64, "#fff2c0", 340), ring(0, x1, y, 14, 90, "#ff6a2a", 460));
  },
  // Glaciate: a freezing wind blows across it, frost streaks and ice crystals settling round it.
  "Glaciate": ({ x0, x1, y, g, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const yy = y - 18 + i * 6, at = -420 + i * 30;
      out.push(P(at, 380, O(x0 + dir * 6, yy, 6, 2, 0.9), O(x1 + dir * 20, yy + (rnd() - 0.5) * 6, 26, 2, 0), i % 2 ? "#c8f4ff" : "#ffffff", { ease: "linear" }));
    }
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (i - 2.5) * 10, h = 10 + rnd() * 10;
      out.push(P(i * 30, 200, O(xx, g, 6, 2, 1), O(xx, g - h / 2, 5, h, 0.9), i % 2 ? "#8fe8ff" : "#e8f8ff", { ease: "ease-out" }),
        P(i * 30 + 200, 360, O(xx, g - h / 2, 5, h, 0.9), O(xx, g - h / 2, 5, h, 0), "#c8f4ff"));
    }
    return out.concat(P(-420, 420, O(x0, y, 10, 30, 0.3), O(x0 + dir * dist, y, 40, 40, 0.3), "#c8f4ff", { round: true }),
      flash(0, x1, y, 50, "#e8f8ff", 300), ring(0, x1, y, 10, 76, "#8fe8ff", 440));
  },
  // Freeze Shock: Black Kyurem slams a block of ice crackling with electricity onto it.
  "Freeze Shock": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 220, O(x0 + dir * 10, y - 10, 4, 4, 1), O(x0 + dir * 10, y - 10, 22, 22, 0.95), "#8fe8ff"),
      P(-340, 340, O(x0 + dir * 10, y - 10, 22, 22, 0.95), O(x1, y, 26, 26, 1), "#8fe8ff", { ease: "ease-in" }),
      P(-340, 340, O(x0 + dir * 10, y - 10, 26, 26, 0.9), O(x1, y, 30, 30, 0.9), "#ffe14a", { ring: true, ease: "ease-in" })];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.4;
      out.push(P(0, 300, O(x1, y, 6, 6, 1), O(x1 + Math.cos(a) * 30, y + Math.sin(a) * 22, 5, 5, 0), "#c8f4ff", { ease: "ease-out" }),
        P(20 + i * 30, 160, O(x1 + Math.cos(a) * 14, y + Math.sin(a) * 12, 2, 12, 1), O(x1 + Math.cos(a) * 14, y + Math.sin(a) * 12, 1, 3, 0), "#ffe14a"));
    }
    return out.concat(flash(0, x1, y, 54, "#e8f8ff", 300), ring(0, x1, y, 12, 80, "#ffd23f", 440));
  },
  // Ice Burn: White Kyurem's freezing flames, pale blue fire, roll across and engulf it.
  "Ice Burn": ({ x0, x1, y, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [flash(-580, x0, y, 30, "#e8f8ff", 240)];
    for (let i = 0; i < 6; i++) {
      const at = -380 + i * 40, yy = y + (rnd() - 0.5) * 16;
      out.push(P(at, 300, O(x0 + dir * 8, yy, 8, 8, 1), O(x1, yy, 22, 22, 0.8), i % 2 ? "#8fe8ff" : "#e8f8ff", { round: true, ease: "ease-in" }));
    }
    for (let i = 0; i < 5; i++) {
      const xx = x1 + (i - 2) * 10, h = 20 + rnd() * 14;
      out.push(P(i * 30, 300, O(xx, y + 12, 8, 6, 1), O(xx, y + 12 - h, 4, 12, 0), i % 2 ? "#4fd8ff" : "#c8f4ff", { round: true, ease: "ease-out" }));
    }
    return out.concat(P(-380, 380, O(x0, y, 6, 6, 0), O(x0 + dir * dist * 0.6, y, dist * 0.6, 20, 0.25), "#c8f4ff", { round: true }),
      flash(0, x1, y, 56, "#ffffff", 320), ring(0, x1, y, 12, 80, "#4fd8ff", 440));
  },
  // Searing Shot: Victini bursts into flame and fireballs shoot out all round, a ring of them over it.
  "Searing Shot": ({ x0, x1, y, P, O, ring, flash, rnd }) => {
    const out = [flash(-560, x0, y, 40, "#ffd75e", 260), ring(-560, x0, y, 10, 70, "#ff6a2a", 360)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, xx = x1 + Math.cos(a) * 26, yy = y + Math.sin(a) * 18, at = -320 + (i % 4) * 30;
      out.push(P(at, 300, O(x0, y, 6, 6, 1), O(xx, yy, 10, 10, 1), i % 2 ? "#ff6a2a" : "#ffb43a", { round: true, ease: "ease-out" }),
        P(at + 300, 300 + rnd() * 60, O(xx, yy, 10, 10, 1), O(xx, yy - 6, 18, 18, 0), "#ffd75e", { round: true }));
    }
    return out.concat(flash(0, x1, y, 54, "#fff2c0", 300), ring(0, x1, y, 12, 84, "#ff6a2a", 460));
  },
  // Magma Storm: a swirling vortex of magma wraps round it and holds it, embers spun off.
  "Magma Storm": ({ x0, x1, y, g, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 300, O(x0, y, 10, 10, 1), O(x1, g - 6, 20, 10, 1), "#ff6a2a", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 12; i++) {
      const a = i * 1.1, r = 26 - i * 1.2, yy = g - 6 - i * 3.6;
      out.push(P(-260 + i * 30, 260, O(x1 + Math.cos(a) * r, yy, 10, 6, 1), O(x1 + Math.cos(a + 1.4) * r, yy - 4, 6, 4, 0), i % 3 ? "#ff6a2a" : "#ffd75e", { round: true }));
    }
    for (let i = 0; i < 5; i++) out.push(P(120 + i * 40, 320, O(x1, y, 4, 4, 1), O(x1 + (rnd() - 0.5) * 60, y - 10 - rnd() * 20, 2, 2, 0), "#ffb43a", { round: true }));
    return out.concat(P(-200, 700, O(x1, y, 40, 50, 0.5), O(x1, y, 30, 40, 0), "#b03a14", { round: true, ring: true }),
      flash(0, x1, y, 50, "#ffd75e", 300), ring(0, x1, y, 12, 72, "#ff6a2a", 440));
  },
  // Mist Ball: Latias's ball of downy white mist, ringed in red, floats over and bursts in a puff.
  "Mist Ball": ({ x0, x1, y, mid, P, O, ring, flash, rnd }) => {
    const out = [P(-420, 420, O(x0, y, 10, 10, 1), O(x1, y, 22, 22, 1), "#f4f0ff", { round: true, ease: "ease-in-out" }),
      P(-420, 420, O(x0, y, 14, 14, 0.8), O(x1, y, 28, 28, 0.9), "#ff5a6a", { round: true, ring: true, ease: "ease-in-out" }),
      P(-300, 240, O(mid, y - 6, 6, 6, 0.5), O(mid, y - 12, 14, 14, 0), "#e8e0ff", { round: true })];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.4;
      out.push(P(0, 480, O(x1, y, 10, 10, 0.9), O(x1 + Math.cos(a) * 30, y + Math.sin(a) * 20, 16, 16, 0), i % 2 ? "#ffffff" : "#e8e0ff", { round: true, ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 52, "#ffffff", 300), ring(0, x1, y, 12, 72, "#ff5a6a", 420));
  },
  // Luster Purge: Latios's ball of light, ringed in blue, flies over and bursts in a flash of light.
  "Luster Purge": ({ x0, x1, y, P, O, ring, flash, rnd }) => {
    const out = [ring(-600, x0, y, 40, 8, "#4f8cff", 260),
      P(-380, 380, O(x0, y, 10, 10, 1), O(x1, y, 20, 20, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-380, 380, O(x0, y, 14, 14, 0.8), O(x1, y, 26, 26, 0.9), "#4f8cff", { round: true, ring: true, ease: "ease-in" })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = 30 + rnd() * 10;
      out.push(P(0, 300, O(x1, y, 3, 3, 1), O(x1 + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2, 2, 0), i % 2 ? "#c8e8ff" : "#ffffff", { round: true }));
    }
    return out.concat(flash(0, x1, y, 64, "#ffffff", 340), ring(0, x1, y, 14, 90, "#4f8cff", 460), ring(80, x1, y, 10, 64, "#c8e8ff", 380));
  },
  // Dragon Darts: Dragapult fires its two Dreepy, one after the other, purple-green streaks that strike.
  "Dragon Darts": ({ x0, x1, y, dir, P, O, ring, flash }) => {
    const out = [];
    for (const [k, at] of [[0, -160], [1, 0]]) {
      const yy = y + (k ? 6 : -6);
      out.push(P(at - 240, 240, O(x0 + dir * 8, yy, 8, 5, 1), O(x1 - dir * 4, yy, 12, 6, 1), "#4f8a6a", { round: true, ease: "ease-in" }),
        P(at - 240, 240, O(x0, yy, 10, 2, 0.6), O(x1 - dir * 20, yy, 26, 2, 0.4), "#b070ff", { ease: "ease-in" }),
        flash(at, x1, yy, 30 + k * 12, "#e8d8ff", 220), ring(at, x1, yy, 8, 46 + k * 16, "#7a5ab8", 340));
    }
    return out;
  },
  // Apple Acid: Appletun's acid apple juice splashes onto it, sizzling green and gold drops.
  "Apple Acid": ({ x0, x1, y, g, sky, mid, P, O, ring, flash, rnd }) => {
    const top = Math.max(sky + 6, y - 26);
    const out = [P(-420, 210, O(x0, y, 10, 10, 1), O(mid, top, 14, 14, 1), "#7bd65a", { round: true, ease: "ease-out" }),
      P(-210, 210, O(mid, top, 14, 14, 1), O(x1, y - 6, 18, 14, 1), "#7bd65a", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 7; i++) {
      const xx = x1 + (rnd() - 0.5) * 40;
      out.push(P(0, 300, O(x1, y - 6, 4, 4, 1), O(xx, y - 18 - rnd() * 10, 4, 5, 0.6), i % 2 ? "#b8e04a" : "#ffd75e", { round: true, ease: "ease-out" }),
        P(300, 300, O(xx, y - 14, 4, 5, 0.6), O(xx, g - 2, 3, 3, 0), "#7bd65a", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 46, "#d8f8a0", 280), ring(0, x1, y, 10, 64, "#7bd65a", 400), P(120, 480, O(x1, g - 2, 30, 4, 0.8), O(x1, g - 2, 60, 6, 0), "#9ac83a", { round: true }));
  },
  // Grav Apple: Flapple drops a big red apple out of the sky right onto it; it thuds and the ground shakes.
  "Grav Apple": ({ x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [P(-420, 420, O(x1, sky + 10, 16, 16, 1), O(x1, y, 26, 26, 1), "#d8343a", { round: true, ease: "ease-in" }),
      P(-420, 420, O(x1 + 2, sky + 3, 3, 4, 1), O(x1 + 3, y - 15, 4, 8, 1), "#5a3a1a", { ease: "ease-in" }),
      P(-420, 420, O(x1 + 6, sky + 2, 5, 3, 1), O(x1 + 8, y - 14, 8, 4, 1), "#4faa3a", { round: true, ease: "ease-in" }),
      P(0, 320, O(x1, y, 26, 26, 1), O(x1, y + 4, 32, 18, 0), "#d8343a", { round: true })];
    for (let i = 0; i < 5; i++) out.push(P(40, 340, O(x1, g - 2, 4, 3, 1), O(x1 + (i - 2) * 14 + (rnd() - 0.5) * 6, g - 8 - rnd() * 8, 3, 3, 0), "#c8bca8", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 50, "#ffe0d0", 280), ring(0, x1, y, 12, 72, "#d8343a", 420), ring(60, x1, g - 2, 10, 86, "#c8bca8", 440));
  },
};
