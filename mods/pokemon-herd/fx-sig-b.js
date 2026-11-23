// More Pokémon's own moves (Gen 8-9 and Hisui), drawn as fx-moves.js SIGNATURE's are: parts
// { at, ms, a, b, color, round?, ring?, ease? }, `at` from when it lands (fx.js signatureParts;
// c: x0 → x1 at y, g the ground, sky above, dir the way it goes, st its type's colours). Pure:
// helpers come in through `c`, random only from its seeded `rnd`.

export const SIGNATURE_B = {
  // Spirit Break: a fist glowing pink gathers its energy and slams in, a pink burst and hearts of light.
  "Spirit Break": ({ x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-420, 260, O(x1 - dir * 30, y, 6, 6, 0.4), O(x1 - dir * 30, y, 22, 22, 1), "#ff7ad0", { round: true }),
      ring(-400, x1 - dir * 30, y, 40, 10, "#ffc0ea", 260, 0.8),
      P(-140, 140, O(x1 - dir * 30, y, 20, 20, 1), O(x1, y, 26, 26, 1), "#ff7ad0", { round: true, ease: "ease-in" }),
      P(-140, 140, O(x1 - dir * 30, y, 10, 10, 1), O(x1, y, 14, 14, 1), "#ffffff", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.4;
      out.push(P(20, 360, O(x1, y, 4, 4, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 22, 3, 3, 0), i % 2 ? "#ffc0ea" : "#ff4fb0", { round: true, ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 56, "#ffe0f4", 300), ring(0, x1, y, 12, 84, "#ff4fb0", 440), ring(80, x1, y, 8, 60, "#ffc0ea", 380));
  },
  // False Surrender: it bows low, then its hair whips up and lashes across it in a dark arc.
  "False Surrender": ({ x0, x1, y, dir, P, O, ring, flash }) => [
    P(-600, 260, O(x0, y - 6, 20, 6, 0.8), O(x0 + dir * 4, y + 6, 22, 4, 0.6), "#3a2a4a", { round: true, ease: "ease-in" }),
    flash(-340, x0, y + 6, 16, "#b0a0c8", 180),
    P(-180, 160, O(x1 - dir * 24, y + 20, 4, 4, 1), O(x1 + dir * 6, y - 18, 10, 10, 1), "#1a1024", { round: true, ease: "ease-out" }),
    P(-180, 160, O(x1 - dir * 30, y + 24, 3, 14, 0.9), O(x1, y - 10, 6, 40, 0.9), "#4a2a5a", { ease: "ease-out" }),
    P(-20, 300, O(x1, y, 60, 5, 1), O(x1, y, 72, 12, 0), "#2a1838"),
    P(-20, 240, O(x1, y, 44, 2, 1), O(x1, y, 54, 1, 0), "#e8d8ff"),
    flash(0, x1, y, 46, "#c8b0e8", 280), ring(20, x1, y, 10, 70, "#5a3a7a", 420),
  ],
  // Overdrive: it strums; a purple-and-yellow shockwave of sound rolls out in rings with sparks.
  "Overdrive": ({ x0, x1, y, dir, dist, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 26, "#ffe84a", 200)];
    for (let i = 0; i < 6; i++) {
      const at = -560 + i * 80;
      out.push(P(at, 520 - i * 20, O(x0 + dir * 8, y, 8, 24, 1), O(x1, y, 30, 70, 0.2), i % 2 ? "#b05aff" : "#ffe84a", { round: true, ring: true, ease: "linear" }));
    }
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * dist * (0.2 + 0.13 * i), dy = (rnd() - 0.5) * 30;
      out.push(P(-300 + i * 40, 160, O(x, y + dy, 2, 10, 1), O(x + dir * 4, y + dy, 1, 14, 0), "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 54, "#fff6b0", 300), ring(0, x1, y, 12, 86, "#b05aff", 440), ring(70, x1, y, 8, 64, "#ffe84a", 380));
  },
  // Eerie Spell: pink psychic sound waves ripple out of it, eerie and slow, and wrap round the other.
  "Eerie Spell": ({ x0, x1, y, P, O, ring, flash }) => {
    const out = [ring(-600, x0, y - 8, 10, 30, "#e080ff", 260)];
    for (let i = 0; i < 5; i++) {
      out.push(P(-560 + i * 100, 480, O(x0, y, 10, 18, 0.9), O(x1, y, 44, 56, 0.4), i % 2 ? "#ff8ae0" : "#b060e0", { round: true, ring: true, ease: "ease-in-out" }));
    }
    for (let i = 0; i < 3; i++) out.push(P(-60 + i * 60, 300, O(x1, y, 70, 50, 0.1), O(x1, y, 18, 14, 0.8), "#ff8ae0", { round: true, ring: true, ease: "ease-in" }));
    return out.concat(flash(0, x1, y, 48, "#ffd0f6", 300), ring(150, x1, y, 10, 74, "#b060e0", 440));
  },
  // Dragon Energy: a huge dragon head of red-and-green energy forms and blasts across as a wide beam.
  "Dragon Energy": ({ x0, x1, y, dir, mid, dist, P, O, ring, flash }) => [
    P(-600, 260, O(x0 + dir * 10, y, 10, 10, 0.4), O(x0 + dir * 14, y - 4, 40, 34, 0.9), "#d02a3a", { round: true }),
    P(-560, 240, O(x0 + dir * 10, y, 6, 6, 0.6), O(x0 + dir * 20, y - 4, 22, 20, 1), "#4ac85a", { round: true }),
    P(-420, 160, O(x0 + dir * 22, y - 10, 4, 4, 1), O(x0 + dir * 22, y - 10, 6, 6, 1), "#fff2a8", { round: true }),
    ring(-420, x0 + dir * 14, y - 4, 60, 20, "#ff6a7a", 260),
    P(-260, 260, O(x0 + dir * 14, y, 20, 30, 1), O(mid, y, dist, 30, 0.95), "#d02a3a", { round: true, ease: "linear" }),
    P(-260, 260, O(x0 + dir * 14, y, 10, 14, 1), O(mid, y, dist, 14, 1), "#7ae88a", { round: true, ease: "linear" }),
    P(-260, 260, O(x0 + dir * 14, y, 4, 4, 1), O(mid, y, dist, 4, 1), "#ffffff", { round: true, ease: "linear" }),
    P(0, 340, O(mid, y, dist, 30, 0.9), O(mid, y, dist, 2, 0), "#8a1a2a", { round: true }),
    flash(0, x1, y, 62, "#fff2a8", 320), ring(0, x1, y, 14, 96, "#d02a3a", 480), ring(80, x1, y, 10, 70, "#4ac85a", 420),
  ],
  // Thunderous Kick: it flickers across in a dark-orange blur and a kick lands with a crack of lightning.
  "Thunderous Kick": ({ x0, x1, y, sky, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-420, x0, y, 20, "#ffb040", 160),
      P(-160, 140, O(x0, y, 10, 6, 0.9), O(x1 - dir * 10, y + 4, 40, 4, 0.2), "#c85a1a", { ease: "ease-in" }),
      P(-60, 60, O(x1 - dir * 20, y - 6, 8, 8, 1), O(x1, y + 4, 12, 12, 1), "#ff8a2a", { round: true, ease: "ease-in" }),
      P(-40, 80, O(x1, sky, 3, 4, 1), O(x1, (sky + y) / 2, 4, y - sky, 1), "#fff0a0", { ease: "ease-in" }),
      P(40, 220, O(x1, (sky + y) / 2, 4, y - sky, 1), O(x1, (sky + y) / 2, 1, y - sky, 0), "#ffffff")];
    for (let i = 0; i < 5; i++) out.push(P(0, 220, O(x1, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 36, 2, 10, 0), i % 2 ? "#ffe84a" : "#ff8a2a"));
    return out.concat(flash(0, x1, y, 52, "#fff0c0", 280), ring(0, x1, y, 10, 78, "#ff8a2a", 420), ring(60, x1, y, 8, 56, "#ffe84a", 360));
  },
  // Fiery Wrath: dark purple flames well up out of the ground under it and roar up round it.
  "Fiery Wrath": ({ x0, x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 26, "#a040c0", 220), P(-460, 260, O(x1, g, 10, 3, 1), O(x1, g, 74, 6, 0.9), "#2a0a3a", { round: true })];
    for (let i = 0; i < 7; i++) {
      const x = x1 + (i - 3) * 9 + (rnd() - 0.5) * 4, h = g - sky - Math.abs(i - 3) * 9 - rnd() * 8;
      out.push(P(-320 + Math.abs(i - 3) * 40, 420, O(x, g, 8, 2, 1), O(x, g - h / 2, 9, h, 0), i % 2 ? "#a040c0" : "#5a1a7a", { ease: "ease-out" }),
        P(-260 + Math.abs(i - 3) * 40, 360, O(x, g, 4, 2, 1), O(x, g - h / 3, 4, h * 0.6, 0), "#ff5ad0", { ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 54, "#e0a0ff", 300), ring(40, x1, g - 2, 10, 84, "#7a2aa0", 460));
  },
  // Freezing Glare: its eyes flash cyan-pink, a thin glare beam shoots across, and the air round it freezes.
  "Freezing Glare": ({ x0, x1, y, dir, mid, dist, P, O, ring, flash }) => {
    const out = [P(-600, 200, O(x0 + dir * 4 - 3, y - 8, 2, 2, 1), O(x0 + dir * 4 - 3, y - 8, 6, 3, 1), "#ff8ae0", { round: true }),
      P(-600, 200, O(x0 + dir * 4 + 3, y - 8, 2, 2, 1), O(x0 + dir * 4 + 3, y - 8, 6, 3, 1), "#ff8ae0", { round: true }),
      flash(-420, x0 + dir * 4, y - 8, 22, "#c0f4ff", 200),
      P(-240, 200, O(x0 + dir * 4, y - 8, 4, 3, 1), O(mid, y - 4, dist, 3, 1), "#9fe8ff", { ease: "linear" }),
      P(-240, 200, O(x0 + dir * 4, y - 8, 8, 8, 0.4), O(mid, y - 4, dist, 9, 0.4), "#ff8ae0", { round: true, ease: "linear" }),
      P(-40, 280, O(mid, y - 4, dist, 3, 1), O(mid, y - 4, dist, 1, 0), "#ffffff")];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(40 + i * 20, 340, O(x1 + Math.cos(a) * 28, y + Math.sin(a) * 18, 6, 6, 0.9), O(x1 + Math.cos(a) * 10, y + Math.sin(a) * 6, 3, 8, 0), i % 2 ? "#e8fbff" : "#6fd2ff", { ease: "ease-in" }));
    }
    out.push(P(60, 500, O(x1, y, 30, 40, 0.5), O(x1, y, 40, 50, 0), "#c8f0ff", { round: true }));
    return out.concat(flash(0, x1, y, 50, "#e8fbff", 300), ring(0, x1, y, 10, 74, "#6fd2ff", 420), ring(60, x1, y, 8, 54, "#ff8ae0", 360));
  },
  // Rage Fist: a fist wrapped in a ghostly purple aura, a spectral copy of it trailing behind, smashes in.
  "Rage Fist": ({ x1, y, dir, P, O, ring, flash }) => [
    P(-480, 280, O(x1 - dir * 36, y, 8, 8, 0.4), O(x1 - dir * 36, y, 28, 28, 0.9), "#5a2a8a", { round: true }),
    ring(-460, x1 - dir * 36, y, 46, 14, "#b07aff", 280, 0.8),
    P(-200, 200, O(x1 - dir * 50, y - 6, 24, 24, 0.5), O(x1 - dir * 10, y, 26, 26, 0.3), "#b07aff", { round: true, ease: "ease-in" }),
    P(-150, 150, O(x1 - dir * 36, y, 18, 18, 1), O(x1, y, 22, 22, 1), "#e8d8ff", { round: true, ease: "ease-in" }),
    P(-150, 150, O(x1 - dir * 36, y, 26, 26, 0.7), O(x1, y, 30, 30, 0.7), "#7a3ac8", { round: true, ring: true, ease: "ease-in" }),
    flash(0, x1, y, 58, "#e8d8ff", 300), ring(0, x1, y, 12, 88, "#7a3ac8", 460), ring(80, x1, y, 8, 62, "#b07aff", 400),
    P(60, 500, O(x1, y, 20, 20, 0.6), O(x1, y - 26, 30, 30, 0), "#5a2a8a", { round: true, ease: "ease-out" }),
  ],
  // Armor Cannon: its armour gathers into a blazing purple-and-orange ball and fires across in a blast.
  "Armor Cannon": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [ring(-600, x0, y, 50, 10, "#ff8a2a", 280), P(-560, 260, O(x0 + dir * 8, y, 6, 6, 0.6), O(x0 + dir * 8, y, 22, 22, 1), "#7a2aa0", { round: true }),
      P(-520, 220, O(x0 + dir * 8, y, 4, 4, 1), O(x0 + dir * 8, y, 14, 14, 1), "#ffb040", { round: true }),
      P(-280, 280, O(x0 + dir * 8, y, 22, 22, 1), O(x1, y, 28, 28, 1), "#ff6a1a", { round: true, ease: "ease-in" }),
      P(-280, 280, O(x0 + dir * 8, y, 12, 12, 1), O(x1, y, 14, 14, 1), "#fff2a8", { round: true, ease: "ease-in" }),
      P(-280, 320, O(x0 + dir * 8, y, 6, 8, 0.8), O((x0 + x1) / 2 - dir * 10, y, Math.abs(x1 - x0), 10, 0), "#a040c0", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 6; i++) out.push(P(20, 380, O(x1, y, 5, 5, 1), O(x1 + (rnd() - 0.5) * 70, y + (rnd() - 0.6) * 44, 3, 3, 0), i % 2 ? "#ffb040" : "#ff4a2a", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 62, "#fff2a8", 320), ring(0, x1, y, 14, 94, "#ff6a1a", 480), ring(80, x1, y, 10, 70, "#a040c0", 420));
  },
  // Bitter Blade: a spectral blade of blue-violet fire sweeps across it, flames licking off the cut.
  "Bitter Blade": ({ x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-460, 280, O(x1 - dir * 30, y - 20, 4, 20, 0.4), O(x1 - dir * 30, y - 20, 6, 40, 1), "#6a5aff", { ease: "ease-out" }),
      P(-180, 160, O(x1 - dir * 30, y - 24, 3, 3, 1), O(x1, y, 70, 5, 1), "#7a6aff", { ease: "ease-out" }),
      P(-180, 160, O(x1 - dir * 30, y - 24, 2, 2, 1), O(x1, y, 60, 2, 1), "#ffffff", { ease: "ease-out" }),
      P(-20, 300, O(x1, y, 70, 5, 1), O(x1, y, 80, 12, 0), "#3a2aa0")];
    for (let i = 0; i < 6; i++) {
      const x = x1 + (i - 2.5) * 11, h = 14 + rnd() * 14;
      out.push(P(20 + i * 20, 380, O(x, y, 6, 3, 1), O(x, y - h / 2, 7, h, 0), i % 2 ? "#ff6a3a" : "#8a7aff", { ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 50, "#d8d0ff", 280), ring(0, x1, y, 10, 74, "#6a5aff", 420), P(80, 380, O(x1, g, 30, 3, 0.8), O(x1, g, 60, 5, 0), "#ff8a4a", { round: true }));
  },
  // Collision Course: it rears into its racing form, charges in a red-orange streak and crashes, a huge prismatic impact.
  "Collision Course": ({ x0, x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-600, 240, O(x0, y, 14, 14, 0.4), O(x0, y, 34, 30, 0.9), "#e8402a", { round: true }), ring(-580, x0, y, 50, 14, "#ffb040", 260),
      P(-300, 300, O(x0, y, 30, 26, 0.9), O(x1, y, 34, 30, 1), "#e8402a", { round: true, ease: "ease-in" }),
      P(-300, 300, O(x0, y, 14, 14, 1), O(x1, y, 18, 18, 1), "#ffe0a0", { round: true, ease: "ease-in" }),
      P(-300, 320, O(x0, y, 8, 4, 0.8), O((x0 + x1) / 2 - dir * 12, y, Math.abs(x1 - x0), 4, 0), "#ffb040", { ease: "ease-in" })];
    const cols = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
    for (let i = 0; i < 6; i++) out.push(ring(20 + i * 30, x1, y, 10, 70 + i * 10, cols[i], 400, 0.8));
    for (let i = 0; i < 6; i++) out.push(P(20, 360, O(x1, g - 2, 5, 5, 1), O(x1 + (rnd() - 0.5) * 90, g - 4 - rnd() * 24, 4, 4, 0), "#b89a70", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 66, "#ffffff", 320), P(40, 420, O(x1, g, 20, 4, 1), O(x1, g, 96, 8, 0), "#c8a070", { round: true }));
  },
  // Electro Drift: it streaks across in a racing line of blue-violet electricity and bursts through it.
  "Electro Drift": ({ x0, x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 24, "#80c8ff", 200),
      P(-300, 260, O(x0, y + 6, 20, 10, 0.9), O(x1, y, 26, 14, 1), "#4a5aff", { round: true, ease: "ease-in" }),
      P(-300, 260, O(x0, y + 6, 10, 5, 1), O(x1, y, 14, 7, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-300, 360, O(x0, y + 6, 8, 3, 0.9), O((x0 + x1) / 2 - dir * 10, y + 4, Math.abs(x1 - x0), 3, 0), "#c040ff", { ease: "ease-in" }),
      P(-280, 360, O(x0, y + 10, 8, 2, 0.9), O((x0 + x1) / 2 - dir * 10, y + 9, Math.abs(x1 - x0), 2, 0), "#40e0ff", { ease: "ease-in" })];
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * Math.abs(x1 - x0) * (0.15 + 0.14 * i), dy = (rnd() - 0.5) * 20;
      out.push(P(-260 + i * 40, 140, O(x, y + dy, 2, 10, 1), O(x, y + dy, 1, 12, 0), i % 2 ? "#40e0ff" : "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 54, "#e0f0ff", 300), ring(0, x1, y, 12, 84, "#4a5aff", 440), ring(60, x1, y, 8, 60, "#c040ff", 380));
  },
  // Ivy Cudgel: its ivy-wound club swings down on it in a green arc, leaves scattering off the blow.
  "Ivy Cudgel": ({ x1, y, g, sky, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-420, 260, O(x1 - dir * 24, sky + 10, 8, 16, 0.6), O(x1 - dir * 20, sky + 6, 12, 22, 1), "#3a8a3a", { round: true }),
      P(-160, 160, O(x1 - dir * 20, sky + 6, 12, 22, 1), O(x1, y, 16, 18, 1), "#4aa04a", { round: true, ease: "ease-in" }),
      P(-160, 200, O(x1 - dir * 26, sky + 2, 4, 4, 0.8), O(x1 - dir * 6, y - 10, 30, 4, 0), "#9be37a", { ease: "ease-in" })];
    for (let i = 0; i < 7; i++) out.push(P(20 + i * 15, 460, O(x1, y, 5, 3, 1), O(x1 + (rnd() - 0.5) * 70, y + (rnd() - 0.3) * 30, 4, 3, 0), i % 2 ? "#7bd65a" : "#2a7a3a", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 52, "#e0ffd0", 280), ring(0, x1, y, 10, 78, "#4aa04a", 420), P(60, 380, O(x1, g, 20, 3, 0.9), O(x1, g, 70, 6, 0), "#8ac86a", { round: true }));
  },
  // Blood Moon: a blood-red full moon rises behind it and fires a red beam of moonlight across.
  "Blood Moon": ({ x0, x1, y, sky, dir, mid, dist, P, O, ring, flash }) => [
    P(-600, 300, O(x0 - dir * 6, y, 10, 10, 0.2), O(x0 - dir * 6, sky + 8, 30, 30, 0.95), "#b0102a", { round: true, ease: "ease-out" }),
    P(-540, 260, O(x0 - dir * 6, y, 6, 6, 0.2), O(x0 - dir * 6, sky + 8, 20, 20, 0.7), "#ff5a5a", { round: true, ease: "ease-out" }),
    ring(-320, x0 - dir * 6, sky + 8, 30, 50, "#ff3a4a", 300, 0.7),
    P(-260, 240, O(x0, y, 6, 12, 1), O(mid, y, dist, 12, 1), "#c8102a", { round: true, ease: "linear" }),
    P(-260, 240, O(x0, y, 4, 4, 1), O(mid, y, dist, 4, 1), "#ffd0d0", { round: true, ease: "linear" }),
    P(0, 340, O(mid, y, dist, 12, 1), O(mid, y, dist, 1, 0), "#6a0a1a", { round: true }),
    P(-20, 400, O(x0 - dir * 6, sky + 8, 30, 30, 0.95), O(x0 - dir * 6, sky + 8, 34, 34, 0), "#b0102a", { round: true }),
    flash(0, x1, y, 58, "#ffd0d0", 320), ring(0, x1, y, 12, 90, "#c8102a", 460), ring(80, x1, y, 8, 64, "#ff8a8a", 400),
  ],
  // Make It Rain: it flings a shower of gold coins that arc across and rain down glinting on the other.
  "Make It Rain": ({ x0, x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 26, "#fff2a8", 220)];
    for (let i = 0; i < 12; i++) {
      const xx = x1 + (rnd() - 0.5) * 56, at = -460 + i * 30;
      out.push(P(at, 200, O(x0, y - 4, 4, 4, 1), O(xx, sky, 5, 5, 1), i % 2 ? "#ffd75e" : "#e8b030", { round: true, ease: "ease-out" }),
        P(at + 200, 240, O(xx, sky, 5, 5, 1), O(xx + (rnd() - 0.5) * 6, g - 2 - rnd() * 20, 5, 2, 0.9), i % 3 ? "#ffd75e" : "#fff6c0", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 52, "#fff6c0", 300), ring(40, x1, g - 2, 10, 80, "#e8b030", 440), ring(100, x1, y, 8, 60, "#ffffff", 360));
  },
  // Tera Starstorm: crystal stars gather above in rainbow light, then rays of starlight rain down on it.
  "Tera Starstorm": ({ x0, x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const cols = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
    const out = [ring(-600, x0, y, 50, 10, "#ffffff", 300), flash(-560, x0, y, 30, "#e8f8ff", 240),
      P(-480, 260, O(x1, sky, 4, 4, 0.2), O(x1, sky, 50, 10, 0.9), "#c8f0ff", { round: true })];
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (i - 2.5) * 11 + (rnd() - 0.5) * 5, at = -300 + i * 40;
      out.push(P(at, 120, O(xx, sky, 3, 4, 1), O(xx, (sky + g) / 2, 4, g - sky, 0.95), cols[i], { ease: "ease-in" }),
        P(at + 120, 260, O(xx, (sky + g) / 2, 4, g - sky, 0.9), O(xx, (sky + g) / 2, 1, g - sky, 0), "#ffffff"),
        P(at + 110, 260, O(xx, g - 2, 5, 5, 1), O(xx, g - 2, 3, 3, 0), "#ffffff", { round: true }));
    }
    return out.concat(flash(0, x1, y, 58, "#ffffff", 320), ring(40, x1, g - 2, 10, 84, "#4fb4ff", 460), ring(100, x1, y, 8, 64, "#b070ff", 400));
  },
  // Gigaton Hammer: a giant pink-and-steel hammer rises high and smashes down on it, the ground cracking.
  "Gigaton Hammer": ({ x1, y, g, sky, dir, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 300, O(x1 - dir * 30, y, 10, 10, 0.6), O(x1 - dir * 14, sky + 6, 26, 18, 1), "#8a9ab0", { round: true, ease: "ease-out" }),
      P(-540, 280, O(x1 - dir * 30, y, 6, 6, 0.6), O(x1 - dir * 14, sky + 6, 14, 8, 1), "#ff8ac8", { round: true, ease: "ease-out" }),
      P(-200, 180, O(x1 - dir * 14, sky + 6, 26, 18, 1), O(x1, y - 4, 32, 22, 1), "#8a9ab0", { round: true, ease: "ease-in" }),
      P(-200, 180, O(x1 - dir * 14, sky + 6, 14, 8, 1), O(x1, y - 4, 18, 10, 1), "#ff8ac8", { round: true, ease: "ease-in" }),
      P(-20, 300, O(x1, y - 4, 32, 22, 1), O(x1, y, 36, 24, 0), "#c8d0e0", { round: true })];
    for (let i = 0; i < 6; i++) out.push(P(30, 380, O(x1, g - 2, 5, 5, 1), O(x1 + (i - 2.5) * 16 + (rnd() - 0.5) * 6, g - 8 - rnd() * 18, 4, 4, 0), "#b8a890", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 60, "#ffffff", 300), ring(0, x1, y, 12, 88, "#8a9ab0", 440), P(20, 460, O(x1, g, 30, 4, 1), O(x1, g, 100, 6, 0), "#6a5a4a"), ring(60, x1, g - 2, 10, 90, "#ff8ac8", 460));
  },
  // Salt Cure: white salt crystals fly in and crust over it, glinting, then settle.
  "Salt Cure": ({ x0, x1, y, P, O, ring, flash, rnd }) => {
    const out = [flash(-600, x0, y, 22, "#ffffff", 200)];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, at = -420 + i * 30, rx = 12 + rnd() * 6, ry = 9 + rnd() * 5;
      out.push(P(at, 260, O(x0, y, 4, 4, 1), O(x1 + Math.cos(a) * rx, y + Math.sin(a) * ry, 6, 6, 1), i % 2 ? "#ffffff" : "#e8e0d0", { ease: "ease-in" }),
        P(at + 260, 380, O(x1 + Math.cos(a) * rx, y + Math.sin(a) * ry, 6, 6, 1), O(x1 + Math.cos(a) * rx, y + Math.sin(a) * ry + 6, 4, 4, 0), "#d8d0c0"));
    }
    return out.concat(flash(0, x1, y, 46, "#ffffff", 300), ring(0, x1, y, 10, 66, "#e8e0d0", 400), P(60, 520, O(x1, y, 30, 30, 0.5), O(x1, y, 34, 34, 0), "#f4f0e8", { round: true }));
  },
  // Population Bomb: the whole family dashes in, a flurry of small white hits one after another.
  "Population Bomb": ({ x1, y, dir, P, O, ring, flash, rnd }) => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const at = -480 + i * 50, xx = x1 + (rnd() - 0.5) * 30, yy = y + (rnd() - 0.5) * 24;
      out.push(P(at - 60, 60, O(xx - dir * 20, yy + 6, 6, 6, 0.8), O(xx, yy, 8, 8, 1), "#f0e8e0", { round: true, ease: "ease-in" }),
        P(at, 160, O(xx, yy, 6, 6, 1), O(xx, yy, 18, 18, 0), i % 2 ? "#ffffff" : "#ffd0d8", { round: true }));
    }
    return out.concat(flash(0, x1, y, 46, "#ffffff", 260), ring(0, x1, y, 10, 70, "#ffd0d8", 400));
  },
  // Spin Out: its wheels spin on the spot, sparks and dust flying, then it rams in with a steel crash.
  "Spin Out": ({ x0, x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [ring(-600, x0, g - 6, 10, 18, "#8a9ab0", 200, 1), ring(-480, x0, g - 6, 10, 18, "#c8d0e0", 200, 1), ring(-360, x0, g - 6, 10, 18, "#8a9ab0", 200, 1)];
    for (let i = 0; i < 6; i++) out.push(P(-600 + i * 50, 220, O(x0, g - 2, 3, 3, 1), O(x0 - dir * (14 + rnd() * 18), g - 4 - rnd() * 16, 2, 2, 0), i % 2 ? "#ffd75e" : "#b8a890", { round: true, ease: "ease-out" }));
    out.push(P(-240, 240, O(x0, y + 4, 22, 22, 0.9), O(x1, y, 26, 26, 1), "#8a9ab0", { round: true, ease: "ease-in" }),
      P(-240, 240, O(x0, y + 4, 10, 10, 1), O(x1, y, 12, 12, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-240, 300, O(x0, g - 2, 6, 3, 0.8), O((x0 + x1) / 2 - dir * 10, g - 2, Math.abs(x1 - x0), 3, 0), "#b8a890", { ease: "ease-in" }));
    for (let i = 0; i < 5; i++) out.push(P(0, 260, O(x1, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 36, 2, 2, 0), "#ffe9a8", { round: true }));
    return out.concat(flash(0, x1, y, 54, "#ffffff", 280), ring(0, x1, y, 12, 82, "#8a9ab0", 440));
  },
  // Order Up: Tatsugiri in its mouth, Dondozo leaps and slams down on it, a splash and a wave out.
  "Order Up": ({ x0, x1, y, g, sky, P, O, ring, flash, rnd }) => {
    const out = [P(-560, 300, O(x0, y, 34, 22, 0.8), O((x0 + x1) / 2, sky + 4, 40, 26, 0.9), "#5a7aa8", { round: true, ease: "ease-out" }),
      P(-540, 280, O(x0, y - 4, 8, 6, 1), O((x0 + x1) / 2, sky, 10, 7, 1), "#ff8a5a", { round: true, ease: "ease-out" }),
      P(-260, 260, O((x0 + x1) / 2, sky + 4, 40, 26, 0.9), O(x1, y - 2, 46, 30, 1), "#5a7aa8", { round: true, ease: "ease-in" }),
      P(-280, 280, O((x0 + x1) / 2, sky, 10, 7, 1), O(x1, y - 14, 10, 7, 1), "#ff8a5a", { round: true, ease: "ease-in" }),
      P(0, 300, O(x1, y - 2, 46, 30, 1), O(x1, y, 50, 32, 0), "#8aa8d0", { round: true })];
    for (let i = 0; i < 8; i++) out.push(P(20, 420, O(x1, g - 2, 4, 4, 1), O(x1 + (rnd() - 0.5) * 90, g - 6 - rnd() * 30, 3, 3, 0), i % 2 ? "#7ab8ff" : "#e8f4ff", { round: true, ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 60, "#e8f4ff", 300), ring(0, x1, g - 2, 12, 96, "#4a8ae0", 480), ring(80, x1, y, 10, 70, "#c08aff", 420));
  },
  // Esper Wing: aura wings flare up pink-violet, it rushes in and the wing slashes across in a glowing arc.
  "Esper Wing": ({ x0, x1, y, dir, P, O, ring, flash }) => [
    P(-600, 260, O(x0 - 6, y - 6, 4, 10, 0.4), O(x0 - 18, y - 16, 14, 26, 0.9), "#e070ff", { round: true }),
    P(-600, 260, O(x0 + 6, y - 6, 4, 10, 0.4), O(x0 + 18, y - 16, 14, 26, 0.9), "#e070ff", { round: true }),
    ring(-480, x0, y, 50, 12, "#ff8ae0", 280),
    P(-260, 220, O(x0, y, 16, 16, 0.9), O(x1 - dir * 10, y, 20, 20, 1), "#c050e0", { round: true, ease: "ease-in" }),
    P(-260, 260, O(x0, y, 6, 3, 0.8), O((x0 + x1) / 2 - dir * 10, y, Math.abs(x1 - x0), 3, 0), "#ffc0f4", { ease: "ease-in" }),
    P(-80, 120, O(x1 - dir * 20, y - 22, 3, 3, 1), O(x1, y, 64, 5, 1), "#ff8ae0", { ease: "ease-out" }),
    P(40, 320, O(x1, y, 64, 5, 1), O(x1, y, 74, 12, 0), "#a040c0"),
    flash(0, x1, y, 50, "#ffd0f6", 300), ring(0, x1, y, 10, 76, "#c050e0", 420), ring(70, x1, y, 8, 56, "#ff8ae0", 360),
  ],
  // Ceaseless Edge: its shell blade slashes it, and dark splinters scatter to the ground round it and stay.
  "Ceaseless Edge": ({ x1, y, g, dir, P, O, ring, flash, rnd }) => {
    const out = [flash(-420, x1 - dir * 30, y, 18, "#c8d8f0", 180),
      P(-180, 140, O(x1 - dir * 28, y - 22, 2, 2, 1), O(x1, y, 66, 4, 1), "#ffffff", { ease: "ease-out" }),
      P(-40, 300, O(x1, y, 66, 4, 1), O(x1, y, 76, 10, 0), "#2a3a5a")];
    for (let i = 0; i < 8; i++) {
      const tx = x1 + (rnd() - 0.5) * 90;
      out.push(P(30 + i * 15, 300, O(x1, y, 3, 6, 1), O(tx, g - 3, 3, 6, 1), i % 2 ? "#3a3a4a" : "#5a6a8a", { ease: "ease-in" }),
        P(330 + i * 15, 340, O(tx, g - 3, 3, 6, 1), O(tx, g - 3, 3, 6, 0), "#3a3a4a"));
    }
    return out.concat(flash(0, x1, y, 48, "#d8e4ff", 280), ring(0, x1, y, 10, 70, "#4a5a7a", 420));
  },
};
