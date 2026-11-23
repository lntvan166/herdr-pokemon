// Each move's own look (moves.js MORE_MOVES), as fx.js physicalParts and specialParts draw a
// type's first two: parts { at, ms, a, b, color, round?, ring?, ease? }, `at` from when it lands.
// PHYSICAL[name](c): its mark on the target as it lands (c: x, y its middle, g its ground, dir the
// way the blow goes). SPECIAL[name](c): fired from where it stands (c: x0 → x1 at y, from -FLY).
// `c` carries the helpers (P, O, ring, puff, flash, fly, steps, fist), its style `st` and `rnd`. Pure.

import { SIGNATURE_A } from "./fx-sig-a.js";
import { SIGNATURE_B } from "./fx-sig-b.js";
import { SIGNATURE_C } from "./fx-sig-c.js";

export const PHYSICAL = {
  // A plain body blow: a white smack, a few lines.
  "Tackle": ({ x, y, dir, P, O, ring, st }) => [
    P(0, 220, O(x - dir * 6, y, 16, 16, 1), O(x - dir * 6, y, 30, 30, 0), st.hot, { round: true }), ring(0, x - dir * 6, y, 8, 34, "#ffffff", 280),
  ],
  // Throwing its whole weight: a heavy white burst, the ground shaking, recoil sparks back at it.
  "Double-Edge": ({ x, y, g, dir, P, O, ring, puff, rnd }) => {
    const out = [P(0, 320, O(x, y, 20, 20, 1), O(x, y, 60, 60, 0), "#ffffff", { round: true }), ring(0, x, y, 12, 70, "#ffe9c0", 420), ring(60, x, g, 10, 70, "#c8bca8", 420)];
    for (let i = 0; i < 5; i++) out.push(P(40, 360, O(x - dir * 6, y, 4, 4, 1), O(x - dir * (24 + rnd() * 20), y - 16 + rnd() * 32, 3, 3, 0), "#fff2a8", { round: true }));
    return out.concat(puff(80, x, g - 4, 24, "#c8bca8", 380, 0.8));
  },
  // Rolling in wrapped in fire: a wheel of flame, sparks thrown off it.
  "Flame Wheel": ({ x, y, dir, P, O, ring, st, rnd }) => {
    const out = [ring(-60, x - dir * 10, y, 26, 26, st.core, 200, 1), ring(0, x, y, 26, 54, st.mid, 360)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push(P(0, 360, O(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 6, 6, 1), O(x + Math.cos(a) * 30, y + Math.sin(a) * 30 - 6, 3, 3, 0), [st.hot, st.core, st.mid][i % 3], { round: true }));
    }
    return out.concat(P(80, 360, O(x, y, 10, 10, 1), O(x + (rnd() - 0.5) * 10, y - 26, 4, 10, 0), st.hot, { round: true }));
  },
  // A tail of water swung through it: an arc of blue, droplets flung.
  "Aqua Tail": ({ x, y, dir, P, O, st, rnd }) => {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.15 + i * 0.09);
      out.push(P(i * 14, 360, O(x - dir * Math.cos(a) * 22, y - Math.sin(a) * 22 + 10, 6, 6, 1), O(x - dir * Math.cos(a) * 26, y - Math.sin(a) * 26 + 10, 3, 3, 0), i % 2 ? st.hot : st.core, { round: true }));
    }
    for (let i = 0; i < 6; i++) out.push(P(60, 420, O(x, y, 4, 4, 1), O(x + dir * (8 + rnd() * 30), y - 20 + rnd() * 24, 3, 3, 0), st.mid, { round: true }));
    return out;
  },
  // Two vines lashing it, one then the other.
  "Vine Whip": ({ x, y, dir, P, O, st }) => {
    const out = [];
    for (const [k, dy] of [[0, -10], [1, 8]]) for (let i = 0; i < 8; i++) {
      out.push(P(k * 120 + i * 10, 260, O(x - dir * (30 - i * 4), y + dy - Math.sin(i / 2) * 4, 4, 4, 1), O(x - dir * (30 - i * 4), y + dy, 2, 2, 0), i % 2 ? st.core : "#2a7a2a"));
    }
    return out.concat(P(0, 240, O(x, y - 10, 14, 3, 1), O(x, y - 10, 30, 1, 0), st.hot), P(120, 240, O(x, y + 8, 14, 3, 1), O(x, y + 8, 30, 1, 0), st.hot));
  },
  // A charged body slam: a crackle of yellow all round it.
  "Spark": ({ x, y, P, O, ring, steps, st }) => {
    const out = [ring(0, x, y, 10, 40, st.core, 300)];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      out.push(...steps(k * 16, 220, x + Math.cos(a) * 8, y + Math.sin(a) * 8, 3, Math.round(Math.cos(a) * 5) + (k % 2 ? 2 : -2), Math.round(Math.sin(a) * 5), [st.hot, st.core], 2));
    }
    return out.concat(P(0, 200, O(x, y, 18, 18, 0.9), O(x, y, 34, 34, 0), st.hot, { round: true }));
  },
  // Charging in sheathed in lightning: a bright blast, bolts forking off, a jolt back at itself.
  "Wild Charge": ({ x, y, g, dir, P, O, ring, steps, st }) => {
    const out = [P(0, 300, O(x, y, 26, 26, 1), O(x, y, 64, 64, 0), st.hot, { round: true }), ring(0, x, y, 14, 70, st.core, 380)];
    for (let k = 0; k < 4; k++) out.push(...steps(20 + k * 30, 240, x + (k - 1.5) * 10, y - 30, 6, k % 2 ? 2 : -2, 6, [st.hot, st.core], 3));
    return out.concat(...steps(100, 220, x - dir * 18, y, 4, -dir * 4, 0, [st.core], 2), ring(80, x, g, 8, 50, st.glow, 300));
  },
  // A quick shard of ice flicked at it: a glint and splinters.
  "Ice Shard": ({ x, y, dir, P, O, st, rnd }) => {
    const out = [P(-100, 100, O(x - dir * 30, y - 4, 10, 4, 1), O(x - dir * 2, y - 2, 10, 4, 1), st.hot, { ease: "linear" })];
    for (let i = 0; i < 6; i++) out.push(P(0, 320, O(x, y, 4, 4, 1), O(x + dir * (6 + rnd() * 18), y - 14 + rnd() * 28, 2, 2, 0), i % 2 ? st.hot : st.mid));
    return out;
  },
  // Icicles dropped on it from above, shattering.
  "Icicle Crash": ({ x, y, g, P, O, ring, st, rnd }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const xx = x + (i - 1) * 12;
      out.push(P(-160 + i * 40, 160, O(xx, y - 60, 6, 16, 1), O(xx, y - 4, 6, 16, 1), i % 2 ? st.hot : st.core, { ease: "ease-in" }));
      for (let j = 0; j < 3; j++) out.push(P(i * 40, 340, O(xx, y + 4, 4, 4, 1), O(xx + (rnd() - 0.5) * 26, y - 10 + rnd() * 16, 2, 2, 0), st.mid));
    }
    return out.concat(ring(80, x, g, 10, 54, st.glow, 360));
  },
  // A smashing fist: rubble flying, a crack.
  "Rock Smash": ({ x, y, dir, P, O, fist, steps, st, rnd }) => {
    const out = [...fist(st.core, st.glow)];
    out.push(...steps(0, 360, x, y, 4, dir * 3, -3, ["#5a4a3a"]), ...steps(0, 360, x, y, 4, dir * 3, 3, ["#5a4a3a"]));
    for (let i = 0; i < 5; i++) out.push(P(20, 420, O(x, y, 5, 5, 1), O(x + dir * (10 + rnd() * 26), y - 18 + rnd() * 30, 4, 4, 0), i % 2 ? "#a8946a" : "#8a7a5a"));
    return out;
  },
  // A punch that drinks: green motes drawn off it, back the way the fist came.
  "Drain Punch": ({ x, y, dir, P, O, fist, st, rnd }) => {
    const out = [...fist(st.core, "#78c850")];
    for (let i = 0; i < 6; i++) out.push(P(80 + i * 30, 420, O(x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 16, 5, 5, 1), O(x - dir * 60, y - 6 + (rnd() - 0.5) * 10, 3, 3, 0.4), "#78c850", { round: true, ease: "ease-in" }));
    return out;
  },
  // Two purple slashes crossing, poison dripping.
  "Cross Poison": ({ x, y, P, O, steps, st, rnd }) => {
    const out = [...steps(0, 400, x - 12, y - 12, 9, 3, 3, [st.hot, st.core], 3), ...steps(40, 400, x + 12, y - 12, 9, -3, 3, [st.hot, st.core], 3)];
    for (let i = 0; i < 4; i++) out.push(P(80 + i * 40, 420, O(x + (i - 1.5) * 8, y + 6, 4, 4, 1), O(x + (i - 1.5) * 8, y + 22 + rnd() * 6, 3, 6, 0), st.mid, { round: true }));
    return out;
  },
  // Stamping the ground: a ring of shock rolling out along it, dust.
  "Bulldoze": ({ x, g, P, O, ring, puff }) => [
    P(0, 460, O(x, g, 10, 4, 1), O(x, g, 110, 6, 0), "#8a6a3a", { round: true }), ring(0, x, g - 2, 8, 60, "#c8bca8", 420), ring(100, x, g - 2, 8, 80, "#d8c8a8", 460),
    puff(40, x - 20, g - 6, 18, "#c8bca8", 380, 0.8), puff(60, x + 20, g - 6, 18, "#c8bca8", 380, 0.8),
  ],
  // Spinning in like a drill: a whirl of brown rings boring in, grit.
  "Drill Run": ({ x, y, dir, P, O, st, rnd }) => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(P(-120 + i * 30, 200, O(x - dir * (24 - i * 4), y, 6 + i * 3, 18 - i * 2, 1), O(x - dir * (16 - i * 4), y, 4, 4, 0), i % 2 ? st.core : "#5a3a1c", { round: true, ring: true }));
    for (let i = 0; i < 6; i++) out.push(P(20, 360, O(x, y, 3, 3, 1), O(x + dir * (6 + rnd() * 20), y - 14 + rnd() * 28, 3, 3, 0), "#a8783a"));
    return out;
  },
  // A beak's jab: one small sharp point.
  "Peck": ({ x, y, dir, P, O }) => [
    P(-80, 80, O(x - dir * 22, y - 6, 10, 4, 1), O(x - dir * 2, y - 2, 10, 4, 1), "#ffd23f", { ease: "ease-in" }),
    P(0, 200, O(x, y - 2, 6, 6, 1), O(x, y - 2, 18, 18, 0), "#ffffff", { round: true }),
  ],
  // A spinning beak: jabs in a spiral, feathers.
  "Drill Peck": ({ x, y, dir, P, O, ring, rnd }) => {
    const out = [];
    for (let i = 0; i < 4; i++) out.push(P(-120 + i * 30, 90, O(x - dir * 24, y + (i % 2 ? -6 : 6), 12, 4, 1), O(x - dir * 2, y, 8, 3, 1), "#ffd23f", { ease: "ease-in" }));
    out.push(ring(0, x, y, 6, 36, "#ffffff", 300));
    for (let i = 0; i < 4; i++) out.push(P(40, 480, O(x, y, 6, 3, 1), O(x + (rnd() - 0.5) * 40, y + 12 + rnd() * 10, 6, 3, 0), "#e8f0ff"));
    return out;
  },
  // A blade of psychic light: one bright pink crescent through it.
  "Psycho Cut": ({ x, y, dir, P, O, st }) => {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.25 + i * 0.0625);
      out.push(P(i * 12, 300, O(x - dir * Math.cos(a) * 20 + dir * 4, y - Math.sin(a) * 20 + 14, 5, 5, 1), O(x - dir * Math.cos(a) * 28 + dir * 4, y - Math.sin(a) * 28 + 14, 2, 2, 0), i % 2 ? st.hot : st.core, { round: true }));
    }
    return out;
  },
  // A bite of mandibles: two jaws nipping, a green crumb or two.
  "Bug Bite": ({ x, y, P, O, st, rnd }) => {
    const out = [];
    for (const d of [-1, 1]) out.push(P(-100, 100, O(x + d * 16, y - 4, 4, 12, 1), O(x + d * 3, y, 4, 12, 1), st.core, { ease: "ease-in" }));
    for (let i = 0; i < 4; i++) out.push(P(20, 360, O(x, y, 3, 3, 1), O(x + (rnd() - 0.5) * 30, y - 16 + rnd() * 10, 3, 3, 0), st.mid));
    return out;
  },
  // A hit and away: a green swoosh in, a U back.
  "U-turn": ({ x, y, dir, P, O, st }) => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (i / 9);
      out.push(P(i * 16, 260, O(x - dir * 8 + dir * Math.sin(a) * 18, y - Math.cos(a) * 16, 5, 5, 1), O(x - dir * 8 + dir * Math.sin(a) * 18, y - Math.cos(a) * 16, 2, 2, 0), i % 2 ? st.hot : st.core, { round: true }));
    }
    return out;
  },
  // Small rocks lobbed on it, bouncing off.
  "Rock Throw": ({ x, y, P, O, rnd }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const xx = x + (i - 1) * 9;
      out.push(P(-140 + i * 50, 140, O(xx - 10, y - 40, 7, 7, 1), O(xx, y - 6, 7, 7, 1), i % 2 ? "#a8946a" : "#8a7a5a", { ease: "ease-in" }),
        P(i * 50, 320, O(xx, y - 6, 7, 7, 1), O(xx + (rnd() - 0.5) * 30, y + 10, 5, 5, 0), "#8a7a5a"));
    }
    return out;
  },
  // A slide of rocks tumbling down on it, dust.
  "Rock Slide": ({ x, y, g, P, O, puff, rnd }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const xx = x + (rnd() - 0.5) * 34, s = 7 + (i % 3) * 3;
      out.push(P(-200 + i * 40, 200, O(xx - 20, y - 70, s, s, 1), O(xx, g - s / 2, s, s, 1), i % 2 ? "#a8946a" : "#7a6a4a", { ease: "ease-in" }));
    }
    return out.concat(puff(40, x - 12, g - 6, 22, "#c8bca8", 420, 0.8), puff(120, x + 12, g - 6, 22, "#c8bca8", 420, 0.8));
  },
  // A long ghostly lick: a purple tongue across it, and it shivers.
  "Lick": ({ x, y, dir, P, O, st }) => [
    P(-60, 260, O(x - dir * 20, y + 6, 6, 8, 1), O(x + dir * 4, y - 8, 22, 10, 0), "#e070a0", { round: true }),
    P(40, 320, O(x, y, 24, 24, 0.5), O(x, y, 44, 44, 0), st.glow, { round: true }),
  ],
  // Vanishing, then striking from nowhere: a dark hole opening by it, a blow out of it.
  "Phantom Force": ({ x, y, dir, P, O, ring, st }) => [
    P(-260, 220, O(x + dir * 22, y, 2, 30, 1), O(x + dir * 22, y, 26, 34, 0.9), "#120a1e", { round: true }),
    ring(-260, x + dir * 22, y, 10, 30, st.glow, 260),
    P(0, 300, O(x, y, 18, 18, 1), O(x, y, 50, 50, 0), st.core, { round: true }), ring(0, x, y, 10, 56, st.mid, 360),
  ],
  // A rampage: hit after hit, blue-purple flames of fury.
  "Outrage": ({ x, y, P, O, ring, st, rnd }) => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const xx = x + (rnd() - 0.5) * 20, yy = y + (rnd() - 0.5) * 20;
      out.push(P(i * 70, 220, O(xx, yy, 12, 12, 1), O(xx, yy, 34, 34, 0), i % 2 ? st.hot : st.glow, { round: true }), ring(i * 70, xx, yy, 8, 30, st.core, 240));
    }
    for (let i = 0; i < 5; i++) out.push(P(60, 460, O(x + (i - 2) * 7, y + 10, 5, 8, 1), O(x + (i - 2) * 9, y - 26, 3, 10, 0), st.core, { round: true }));
    return out;
  },
  // A bite: teeth top and bottom, quick.
  "Bite": ({ x, y, P, O }) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const xx = x + (i - 1) * 7;
      out.push(P(-90, 90, O(xx, y - 18, 4, 6, 1), O(xx, y - 5, 4, 6, 1), "#ffffff", { ease: "ease-in" }), P(-90, 90, O(xx + 3, y + 14, 4, 6, 1), O(xx + 3, y + 3, 4, 6, 1), "#ffffff", { ease: "ease-in" }));
    }
    return out.concat(P(0, 240, O(x, y, 22, 12, 0.8), O(x, y, 30, 4, 0), "#5a3a6a", { round: true }));
  },
  // Slapped aside: a dark swipe, and something it held knocked flying.
  "Knock Off": ({ x, y, dir, P, O, steps, st }) => [
    ...steps(0, 340, x - dir * 14, y + 10, 8, dir * 4, -2, [st.hot, st.core], 4),
    P(40, 520, O(x, y - 4, 7, 7, 1), O(x + dir * 46, y - 34, 7, 7, 0), "#ffd23f", { round: true, ease: "ease-out" }),
  ],
  // A blade of shadow slashed across it: one long dark streak, a cold glint at its end.
  "Night Slash": ({ x, y, dir, P, O, steps, st }) => [
    ...steps(0, 340, x - dir * 18, y - 16, 10, dir * 4, 3.4, [st.hot, st.core, "#2a1a3a"], 3),
    P(80, 260, O(x + dir * 18, y + 14, 3, 3, 1), O(x + dir * 18, y + 14, 10, 10, 0), "#e8e0ff", { round: true }),
  ],
  // In before it can move: a quick dark jab, a flicker, a snap ring.
  "Sucker Punch": ({ x, y, dir, P, O, ring, fist, st }) => [
    ...fist("#2a1a3a", st.core),
    P(0, 200, O(x - dir * 4, y, 12, 12, 1), O(x - dir * 4, y, 26, 26, 0), st.hot, { round: true }),
    ring(20, x - dir * 4, y, 8, 30, "#c8b8f0", 240),
  ],
  // Its whole body ablaze, thrown into it: a great burst of flame, embers, scorched ground.
  "Flare Blitz": ({ x, y, g, dir, P, O, ring, puff, st, rnd }) => {
    const out = [P(0, 360, O(x, y, 24, 24, 1), O(x, y, 72, 72, 0), st.core, { round: true }), ring(0, x, y, 16, 80, st.hot, 420), ring(80, x, g, 10, 70, "#5a3a2a", 420)];
    for (let i = 0; i < 9; i++) out.push(P(40, 420, O(x, y, 5, 5, 1), O(x + (rnd() - 0.5) * 70, y - 10 - rnd() * 40, 3, 3, 0), [st.hot, st.mid, "#fff2a8"][i % 3], { round: true }));
    return out.concat(puff(60, x - dir * 10, g - 4, 26, "#6a4a3a", 380, 0.7));
  },
  // A steel claw: two short silver scratches, a glint.
  "Metal Claw": ({ x, y, dir, P, O, steps }) => [
    ...steps(0, 360, x - dir * 12, y - 12, 7, dir * 3, 4, ["#ffffff", "#8aa0b8"], 3), ...steps(30, 360, x - dir * 4, y - 12, 7, dir * 3, 4, ["#ffffff", "#8aa0b8"], 3),
    P(60, 260, O(x + dir * 10, y - 14, 2, 10, 1), O(x + dir * 10, y - 14, 1, 2, 0), "#ffffff"), P(60, 260, O(x + dir * 10, y - 14, 10, 2, 1), O(x + dir * 10, y - 14, 2, 1, 0), "#ffffff"),
  ],
  // A hard tail of iron swung down: a heavy grey arc, a clang.
  "Iron Tail": ({ x, y, g, dir, P, O, ring, st }) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (0.5 + i * 0.07);
      out.push(P(-120 + i * 14, 240, O(x + dir * Math.cos(a) * 24, y - Math.sin(a) * 26 + 8, 7, 7, 1), O(x + dir * Math.cos(a) * 24, y - Math.sin(a) * 26 + 8, 3, 3, 0), i % 2 ? st.core : "#ffffff"));
    }
    return out.concat(ring(0, x, y - 6, 8, 46, "#ffffff", 300), ring(40, x, g, 8, 40, st.core, 320));
  },
};

export const SPECIAL = {
  // Stars, a little stream of them, homing in.
  "Swift": ({ x1, y, P, O, FLY, fly, flash }) => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(fly(-FLY + i * 40, 7, 7, i % 2 ? "#ffd23f" : "#ffffff", {}, (i % 2 ? -1 : 1) * (4 + i * 2)));
    return out.concat(flash(0, x1, y, 22, "#ffd23f"), P(40, 300, O(x1, y, 5, 5, 1), O(x1, y - 20, 5, 5, 0), "#ffffff"));
  },
  // A small ember or two, a puff of flame.
  "Ember": ({ x1, y, fly, flash, st, FLY }) => [
    fly(-FLY, 6, 6, st.core, { round: true }, -2), fly(-FLY + 60, 5, 5, st.mid, { round: true }, 3), flash(0, x1, y, 18, st.mid), flash(60, x1, y - 4, 14, st.hot),
  ],
  // A great blast of fire: a ball rushing in, bursting in the "大" of five flames.
  "Fire Blast": ({ x1, y, P, O, fly, flash, ring, st, FLY }) => {
    const out = [fly(-FLY, 18, 18, st.core, { round: true }), fly(-FLY, 10, 10, st.hot, { round: true }), flash(0, x1, y, 44, st.mid)];
    for (const [dx, dy] of [[0, -1], [-1, 0.3], [1, 0.3], [-0.7, 1], [0.7, 1]]) out.push(P(0, 420, O(x1, y, 8, 8, 1), O(x1 + dx * 28, y + dy * 24, 10, 10, 0), st.core, { round: true }), P(20, 380, O(x1, y, 5, 5, 1), O(x1 + dx * 22, y + dy * 18, 6, 6, 0), st.hot, { round: true }));
    return out.concat(ring(0, x1, y, 12, 60, st.glow, 420));
  },
  // A thin jet of water, a splash.
  "Water Gun": ({ x0, x1, y, dir, P, O, flash, st, rnd, FLY }) => {
    const out = [P(-FLY, FLY, O(x0, y, 4, 3, 1), O((x0 + x1) / 2, y, Math.abs(x1 - x0), 3, 1), st.core, { ease: "linear" }), flash(0, x1, y, 18, st.mid)];
    for (let i = 0; i < 4; i++) out.push(P(0, 320, O(x1, y, 3, 3, 1), O(x1 - dir * (4 + rnd() * 14), y - 12 + rnd() * 10, 3, 3, 0), "#ffffff", { round: true }));
    return out;
  },
  // A huge torrent of water, white-capped, a big splash.
  "Hydro Pump": ({ x0, x1, y, dir, P, O, ring, st, rnd, FLY }) => {
    const mid = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    const out = [P(-FLY, FLY, O(x0, y, 8, 14, 1), O(mid, y, len, 14, 1), st.core, { ease: "linear" }), P(-FLY, FLY, O(x0, y - 3, 6, 4, 1), O(mid, y - 3, len, 4, 1), st.hot, { ease: "linear" }),
      P(0, 260, O(mid, y, len, 14, 1), O(mid + dir * len / 2, y, 4, 2, 0), st.core), ring(0, x1, y, 14, 60, st.mid, 400)];
    for (let i = 0; i < 8; i++) out.push(P(0, 420, O(x1, y, 4, 4, 1), O(x1 + (rnd() - 0.3) * dir * 40, y - 30 + rnd() * 40, 3, 3, 0), "#ffffff", { round: true }));
    return out;
  },
  // Green motes drawn out of it, flowing back to the one using it.
  "Giga Drain": ({ x0, x1, y, P, O, flash, st, rnd }) => {
    const out = [flash(-120, x1, y, 30, st.glow, 300)];
    for (let i = 0; i < 8; i++) out.push(P(-60 + i * 30, 460, O(x1 + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 5, 5, 1), O(x0, y - 4 + (rnd() - 0.5) * 10, 3, 3, 0.4), i % 2 ? st.hot : "#78c850", { round: true, ease: "ease-in" }));
    return out;
  },
  // Light gathered, then a thick beam of sunlight.
  "Solar Beam": ({ x0, x1, y, P, O, ring, flash, FLY }) => {
    const mid = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    return [ring(-FLY - 200, x0, y, 40, 8, "#fff7b0", 200, 0.3), flash(-FLY, x0, y, 26, "#fff2a8", 200),
      P(-FLY + 60, 120, O(x0, y, 4, 14, 1), O(mid, y, len, 14, 1), "#fff2a8", { ease: "linear" }), P(-FLY + 60, 120, O(x0, y, 4, 6, 1), O(mid, y, len, 6, 1), "#ffffff", { ease: "linear" }),
      P(-FLY + 180, FLY + 60, O(mid, y, len, 14, 1), O(mid, y, len, 2, 0), "#c8f070"), flash(0, x1, y, 50, "#fff2a8", 320), ring(0, x1, y, 10, 60, "#9be36a", 380)];
  },
  // A small jolt: one thin zigzag.
  "Thunder Shock": ({ x0, x1, y, dir, P, O, flash, st }) => {
    const n = 5, seg = Math.abs(x1 - x0) / n, out = [];
    for (let i = 0; i < n; i++) out.push(P(-80 + i * 10, 180, O(x0 + dir * seg * (i + 0.5), y + (i % 2 ? -3 : 3), seg + 1, 2, 1), O(x0 + dir * seg * (i + 0.5), y + (i % 2 ? -3 : 3), seg + 1, 1, 0), st.hot));
    return out.concat(flash(0, x1, y, 20, st.core));
  },
  // A gust of snow: flakes drifting across, frost on it.
  "Powder Snow": ({ x1, y, fly, flash, ring, st, rnd, FLY }) => {
    const out = [];
    for (let i = 0; i < 8; i++) out.push(fly(-FLY + i * 25, 4, 4, i % 2 ? "#ffffff" : st.mid, { round: true }, (rnd() - 0.5) * 18, 0.9));
    return out.concat(flash(0, x1, y, 22, st.hot), ring(30, x1, y, 8, 34, st.glow, 300));
  },
  // A great ball of fighting spirit, orange, bursting.
  "Focus Blast": ({ x1, y, fly, flash, ring, st, FLY }) => [
    fly(-FLY, 22, 22, st.glow, { round: true }, 0, 0.6), fly(-FLY, 14, 14, st.core, { round: true }), fly(-FLY, 6, 6, st.hot, { round: true }),
    flash(0, x1, y, 56, st.mid, 300), ring(0, x1, y, 14, 70, st.core, 420), ring(80, x1, y, 10, 50, st.hot, 340),
  ],
  // A splash of acid: a green-purple blob, sizzling.
  "Acid": ({ x1, y, P, O, fly, st, FLY }) => [
    fly(-FLY, 9, 7, "#a0d040", { round: true }), fly(-FLY, 5, 4, st.mid, { round: true }),
    P(0, 400, O(x1, y, 10, 8, 1), O(x1, y + 10, 26, 6, 0), "#a0d040", { round: true }),
    P(60, 380, O(x1 - 6, y, 4, 4, 1), O(x1 - 6, y - 16, 6, 6, 0), st.mid, { round: true, ring: true }), P(120, 380, O(x1 + 6, y, 4, 4, 1), O(x1 + 6, y - 18, 6, 6, 0), st.mid, { round: true, ring: true }),
  ],
  // A wave of poison sludge rolling along the ground over it.
  "Sludge Wave": ({ x0, x1, y, g, dir, P, O, st, rnd, FLY }) => {
    const out = [P(-FLY, FLY, O(x0, g - 6, 8, 12, 0.9), O(x1, g - 14, 30, 30, 1), st.core, { round: true, ease: "linear" }),
      P(-FLY, FLY, O(x0, g - 12, 6, 4, 1), O(x1, g - 28, 24, 6, 1), st.mid, { round: true, ease: "linear" }),
      P(0, 420, O(x1, g - 14, 30, 30, 1), O(x1 + dir * 14, g - 4, 60, 8, 0), st.core, { round: true })];
    for (let i = 0; i < 5; i++) out.push(P(40 + i * 30, 420, O(x1 + (rnd() - 0.5) * 24, y, 5, 5, 1), O(x1 + (rnd() - 0.5) * 30, y - 24, 8, 8, 0), st.mid, { round: true, ring: true }));
    return out;
  },
  // Clumps of mud flung, splattering.
  "Mud Shot": ({ x1, y, dir, P, O, fly, rnd, FLY }) => {
    const out = [fly(-FLY, 8, 7, "#7a5a32", { round: true }, -3), fly(-FLY + 60, 7, 6, "#5a3a1c", { round: true }, 3)];
    for (let i = 0; i < 6; i++) out.push(P(0, 360, O(x1, y, 4, 4, 1), O(x1 - dir * (2 + rnd() * 16), y - 10 + rnd() * 22, 3, 3, 0), i % 2 ? "#7a5a32" : "#5a3a1c", { round: true }));
    return out;
  },
  // A gust of wind: pale curls blowing across.
  "Gust": ({ x0, x1, y, P, O, ring, FLY }) => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(P(-FLY + i * 60, FLY - i * 60, O(x0, y - 8 + i * 8, 10, 6, 0.9), O(x1, y - 8 + i * 8, 16, 10, 0.3), "#e8f8ff", { round: true, ring: true, ease: "linear" }));
    return out.concat(ring(0, x1, y, 8, 40, "#ffffff", 320));
  },
  // A ripple of the mind: pink rings round it, no flight.
  "Confusion": ({ x1, y, ring, flash, st }) => [
    ring(-120, x1, y, 50, 12, st.core, 240), ring(-60, x1, y, 40, 10, st.mid, 220), flash(0, x1, y, 30, st.hot), ring(0, x1, y, 10, 44, st.core, 340),
  ],
  // A rainbow-flickering beam.
  "Psybeam": ({ x0, x1, y, P, O, flash, FLY }) => {
    const mid = (x0 + x1) / 2, len = Math.abs(x1 - x0), out = [];
    ["#ff70c0", "#ffd23f", "#4fb4ff", "#9be36a"].forEach((c, i) => out.push(P(-FLY + i * 40, 160, O(x0, y, 4, 8, 1), O(mid, y, len, 8, 1), c, { ease: "linear" })));
    return out.concat(P(-FLY + 160, FLY - 100, O(mid, y, len, 8, 1), O(mid, y, len, 2, 0), "#ffa0d8"), flash(0, x1, y, 34, "#ffffff"));
  },
  // A buzz of tiny bugs flitting at it.
  "Struggle Bug": ({ x0, x1, y, P, O, flash, st, rnd, FLY }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const dy = (rnd() - 0.5) * 20;
      out.push(P(-FLY + i * 30, FLY - i * 30 + 60, O(x0, y + dy, 4, 3, 1), O(x1 + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 20, 4, 3, 0), i % 2 ? st.core : st.mid, { ease: "ease-in-out" }));
    }
    return out.concat(flash(40, x1, y, 22, st.mid));
  },
  // Old stones risen with a glow, flung at it.
  "Ancient Power": ({ x0, x1, y, P, O, flash, FLY }) => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const dy = -14 + i * 9, yy = y - 26 + (i % 2) * 6;
      out.push(P(-FLY - 160, 160, O(x0 + (i - 1.5) * 8, y + 14, 7, 7, 0), O(x0 + (i - 1.5) * 8, yy, 7, 7, 1), "#c8b080"),
        P(-FLY, FLY, O(x0 + (i - 1.5) * 8, yy, 7, 7, 1), O(x1, y + dy / 3, 7, 7, 1), i % 2 ? "#9a8050" : "#c8b080", { ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 34, "#fff2c0"));
  },
  // A dark curse: purple flames flickering up round it (stronger on one with a status).
  "Hex": ({ x1, y, P, O, ring, st, rnd }) => {
    const out = [ring(-80, x1, y, 54, 14, st.core, 240)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(i * 30, 420, O(x1 + Math.cos(a) * 16, y + Math.sin(a) * 12 + 8, 6, 8, 1), O(x1 + Math.cos(a) * 18, y + Math.sin(a) * 12 - 16 - rnd() * 6, 3, 10, 0), i % 2 ? st.glow : st.mid, { round: true }));
    }
    return out;
  },
  // A small twister: a spinning column of air whipped across.
  "Twister": ({ x0, x1, y, P, O, st, FLY }) => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(P(-FLY, FLY + 160, O(x0, y - 18 + i * 9, 6 + i * 3, 5, 0.9), O(x1, y - 18 + i * 9, 10 + i * 4, 5, 0), i % 2 ? st.mid : "#e8f8ff", { round: true, ring: true, ease: "linear" }));
    return out;
  },
  // A breath of blue-violet fire, fanning out.
  "Dragon Breath": ({ x0, x1, y, dir, P, O, flash, st, rnd, FLY }) => {
    const out = [];
    for (let i = 0; i < 8; i++) out.push(P(-FLY + i * 26, 220, O(x0, y, 5, 5, 1), O(x0 + dir * Math.abs(x1 - x0), y + (rnd() - 0.5) * 16, 16, 14, 0.3), [st.hot, st.mid, st.glow][i % 3], { round: true, ease: "linear" }));
    return out.concat(flash(0, x1, y, 34, st.mid));
  },
  // A snarl: jagged dark sound waves.
  "Snarl": ({ x0, x1, y, P, O, ring, st, FLY }) => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(P(-FLY + i * 70, FLY - i * 70, O(x0, y, 6, 14, 1), O(x1, y, 12, 30, 0.5), i % 2 ? st.hot : st.core, { ring: true, ease: "linear" }));
    return out.concat(ring(0, x1, y, 10, 40, st.glow, 300));
  },
  // A flash off a mirror: a silver glint, then a white burst.
  "Mirror Shot": ({ x0, x1, y, P, O, flash, fly, FLY }) => [
    P(-FLY - 120, 120, O(x0, y - 8, 2, 14, 1), O(x0, y - 8, 1, 2, 0), "#ffffff"), P(-FLY - 120, 120, O(x0, y - 8, 14, 2, 1), O(x0, y - 8, 2, 1, 0), "#ffffff"),
    fly(-FLY, 12, 12, "#c0d0e0", { round: true }), fly(-FLY, 6, 6, "#ffffff", { round: true }), flash(0, x1, y, 44, "#ffffff", 280),
  ],
  // A pink breeze: petals and sparkles drifting.
  "Fairy Wind": ({ x0, x1, y, P, O, fly, flash, st, rnd, FLY }) => {
    const out = [];
    for (let i = 0; i < 6; i++) out.push(fly(-FLY + i * 30, 5, 3, i % 2 ? st.core : "#ffffff", {}, (rnd() - 0.5) * 16, 0.9));
    return out.concat(flash(0, x1, y, 22, st.mid), P(30, 360, O(x1, y, 5, 5, 1), O(x1, y - 20, 5, 5, 0), "#ffd23f"));
  },
  // A kiss blown: a heart floating over, pink motes drawn back.
  "Draining Kiss": ({ x0, x1, y, P, O, flash, st, rnd, FLY }) => {
    const out = [P(-FLY, FLY, O(x0, y - 4, 7, 7, 1), O(x1 - 3, y - 4, 7, 7, 1), st.core, { round: true, ease: "ease-in-out" }), P(-FLY, FLY, O(x0 + 5, y - 4, 7, 7, 1), O(x1 + 3, y - 4, 7, 7, 1), st.core, { round: true, ease: "ease-in-out" }),
      P(-FLY, FLY, O(x0 + 2, y + 1, 7, 7, 1), O(x1, y + 1, 7, 7, 1), st.core, { ease: "ease-in-out" }), flash(0, x1, y, 28, st.mid)];
    for (let i = 0; i < 5; i++) out.push(P(80 + i * 30, 420, O(x1 + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 16, 4, 4, 1), O(x0, y, 3, 3, 0.4), st.mid, { round: true, ease: "ease-in" }));
    return out;
  },
  // A dazzling flash of pink light all round, sparkles.
  "Dazzling Gleam": ({ x0, x1, y, P, O, flash, ring, st, rnd }) => {
    const out = [flash(-160, x0, y, 40, "#ffffff", 260), ring(-160, x0, y, 10, 80, st.core, 320), flash(0, x1, y, 50, st.mid, 320), ring(0, x1, y, 10, 60, "#ffffff", 360)];
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (rnd() - 0.5) * 50, yy = y + (rnd() - 0.5) * 36;
      out.push(P(40 + i * 30, 300, O(xx, yy, 2, 10, 1), O(xx, yy, 1, 2, 0), "#ffffff"), P(40 + i * 30, 300, O(xx, yy, 10, 2, 1), O(xx, yy, 2, 1, 0), "#ffffff"));
    }
    return out;
  },
};

// A Pokémon's own move, drawn in place of its type's signature scene (fx.js signatureParts, `at`
// from when it lands; c: x0 → x1 at y, g the ground, sky above, st its type's colours).
export const SIGNATURE = {
  // Judgment: Arceus gathers light (a golden ring), orbs rise off it, then pillars of light in the
  // judged type's colours come down on the other, one after another, and burst on the ground.
  "Judgment": ({ x0, x1, y, g, sky, P, O, ring, flash, st, rnd }) => {
    const out = [ring(-520, x0, y - 6, 54, 12, "#ffd75e", 320, 0.9), flash(-480, x0, y - 6, 40, "#fff2c0", 300)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(-460 + i * 20, 260, O(x0 + Math.cos(a) * 10, y - 6 + Math.sin(a) * 6, 6, 6, 1), O(x0 + Math.cos(a) * 18, sky - 10, 4, 4, 0.2), i % 2 ? "#ffd75e" : st.hot, { round: true, ease: "ease-in" }));
    }
    for (let i = 0; i < 7; i++) {
      const xx = x1 + (i - 3) * 9 + (rnd() - 0.5) * 6, at = -200 + i * 45, top = sky - 20;
      out.push(P(at, 160, O(xx, top, 4, 4, 1), O(xx, (top + g) / 2, 6, g - top, 1), i % 2 ? st.core : st.mid, { ease: "ease-in" }),
        P(at + 160, 260, O(xx, (top + g) / 2, 6, g - top, 0.9), O(xx, (top + g) / 2, 2, g - top, 0), "#ffffff"),
        P(at + 150, 300, O(xx, g - 2, 6, 3, 1), O(xx, g - 2, 22, 4, 0), st.glow, { round: true }));
    }
    out.push(flash(0, x1, y, 54, st.hot, 320), ring(0, x1, y, 12, 70, "#ffd75e", 420), ring(80, x1, g - 2, 10, 80, st.core, 460));
    return out;
  },
  // Psystrike: Mewtwo's psychic waves press in on it from both sides, ring after ring, then burst.
  "Psystrike": ({ x1, y, P, O, ring, flash, st }) => {
    const out = [flash(-560, x1, y, 30, st.mid, 200)];
    for (let i = 0; i < 4; i++) {
      out.push(P(-500 + i * 110, 300, O(x1, y, 96, 70, 0.1), O(x1, y, 14, 12, 0.9), i % 2 ? st.hot : st.core, { round: true, ring: true, ease: "ease-in" }));
      out.push(P(-500 + i * 110, 300, O(x1 - 44, y, 3, 30, 0.2), O(x1 - 8, y, 3, 18, 0.9), st.glow, { ease: "ease-in" }), P(-500 + i * 110, 300, O(x1 + 44, y, 3, 30, 0.2), O(x1 + 8, y, 3, 18, 0.9), st.glow, { ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 50, st.hot, 300), ring(0, x1, y, 12, 96, st.core, 520), ring(90, x1, y, 8, 70, st.mid, 420));
  },
  // Roar of Time: Dialga roars; time ripples out of it in blue rings, warping the air, and a shockwave hits.
  "Roar of Time": ({ x0, x1, y, g, mid, dist, P, O, ring, flash }) => {
    const out = [flash(-600, x0, y - 6, 30, "#c8f0ff", 240)];
    for (let i = 0; i < 6; i++) out.push(ring(-560 + i * 80, x0, y, 10, 40 + dist * 1.6, i % 2 ? "#4f8cff" : "#9fe8ff", 560, 0.85));
    out.push(P(-420, 420, O(x0, y, 20, 40, 0.0), O(mid, y, dist + 30, 56, 0.25), "#3a5ac8", { round: true }),
      P(0, 360, O(mid, y, dist + 30, 56, 0.25), O(x1, y, 40, 70, 0), "#3a5ac8", { round: true }));
    for (let i = 0; i < 4; i++) out.push(P(-200 + i * 30, 220, O(x1 - 30 + i * 20, y - 30, 2, 2, 0), O(x1 - 30 + i * 20, y + 10, 2, 28, 0.8), "#c8f0ff", { ease: "ease-in" }));
    return out.concat(flash(0, x1, y, 56, "#ffffff", 300), ring(0, x1, y, 12, 90, "#4f8cff", 480), ring(80, x1, g - 2, 10, 80, "#9fe8ff", 440));
  },
  // Kowtow Cleave (Kingambit's): it bows, then its blade comes down and across the target, an X of
  // shadow and steel with a gold glint where they cross, the ground cut under it.
  "Kowtow Cleave": ({ x0, x1, y, P, O, flash, ring }) => {
    const out = [flash(-420, x0, y + 6, 18, "#e8c84a", 200)];
    for (const [k, sgn] of [[0, 1], [1, -1]]) {
      const at = -160 + k * 110;
      out.push(P(at, 140, O(x1 - 26, y - 22 * sgn, 2, 2, 1), O(x1, y, 64, 4, 1), k ? "#8aa0b8" : "#ffffff", { ease: "ease-out" }),
        P(at + 140, 320, O(x1, y, 64, 4, 1), O(x1, y, 74, 10, 0), "#3a2a4a"));
    }
    return out.concat(flash(60, x1, y, 30, "#ffe9a8", 260), ring(80, x1, y, 8, 66, "#e8c84a", 420), P(120, 340, O(x1, y + 26, 70, 3, 0.9), O(x1, y + 26, 96, 1, 0), "#e8e0ff"));
  },
  // Spacial Rend: space itself tears across it in pink slashes, light leaking from the rips.
  "Spacial Rend": ({ x0, x1, y, P, O, flash, ring, rnd }) => {
    const out = [ring(-560, x0, y, 40, 8, "#ff80d0", 300, 0.9), flash(-300, x0, y, 26, "#ffd0f0", 200)];
    for (let i = 0; i < 4; i++) {
      const at = -200 + i * 70, dy = (i - 1.5) * 10 + (rnd() - 0.5) * 4, w = 56 - i * 6;
      out.push(P(at, 120, O(x1 - 30, y + dy - 10, 2, 2, 1), O(x1, y + dy, w, 3, 1), i % 2 ? "#ff5ab4" : "#ffffff", { ease: "ease-out" }),
        P(at + 120, 340, O(x1, y + dy, w, 3, 1), O(x1, y + dy, w + 10, 9, 0), "#ff9ad8"),
        P(at + 120, 340, O(x1, y + dy, w * 0.6, 2, 0.9), O(x1, y + dy, w * 0.6, 14, 0), "#2a0838"));
    }
    return out.concat(flash(0, x1, y, 50, "#ffd0f0", 300), ring(60, x1, y, 10, 70, "#ff5ab4", 400));
  },
  // Shadow Force: the user vanishes into the dark; a portal opens beside the target and it strikes out of it.
  "Shadow Force": ({ x0, x1, y, dir, P, O, flash, ring, st }) => [
    P(-600, 240, O(x0, y, 30, 30, 0.9), O(x0, y, 2, 2, 0), "#120a1e", { round: true, ease: "ease-in" }),
    ring(-600, x0, y, 30, 4, st.core, 240, 0.8),
    P(-360, 280, O(x1 - dir * 16, y, 2, 4, 1), O(x1 - dir * 16, y, 18, 52, 0.95), "#120a1e", { round: true }),
    P(-360, 280, O(x1 - dir * 16, y, 2, 4, 1), O(x1 - dir * 16, y, 22, 58, 0.8), st.glow, { round: true, ring: true }),
    P(-80, 80, O(x1 - dir * 16, y, 10, 10, 1), O(x1, y, 30, 30, 1), st.mid, { round: true, ease: "ease-in" }),
    P(0, 360, O(x1 - dir * 16, y, 18, 52, 0.95), O(x1 - dir * 16, y, 2, 6, 0), "#120a1e", { round: true }),
    flash(0, x1, y, 48, st.hot, 280), ring(0, x1, y, 10, 70, st.core, 420),
    P(0, 300, O(x1, y, 50, 4, 0.9), O(x1, y, 70, 1, 0), "#efe6ff"),
  ],
  // Origin Pulse: Kyogre's blue light gathers into orbs above, then beams of it rain down on the other.
  "Origin Pulse": ({ x0, x1, y, g, sky, P, O, flash, ring, rnd }) => {
    const out = [ring(-600, x0, y, 50, 8, "#4fd8ff", 300), flash(-560, x0, y, 30, "#c8f4ff", 260)];
    for (let i = 0; i < 6; i++) {
      const xx = x1 + (i - 2.5) * 12 + (rnd() - 0.5) * 6, at = -420 + i * 60;
      out.push(P(at, 200, O(x0, y, 4, 4, 1), O(xx, sky, 8, 8, 1), "#8fe8ff", { round: true, ease: "ease-out" }),
        P(at + 200, 120, O(xx, sky, 3, 4, 1), O(xx, (sky + g) / 2, 4, g - sky, 0.9), i % 2 ? "#2a8cff" : "#4fd8ff", { ease: "ease-in" }),
        P(at + 320, 220, O(xx, (sky + g) / 2, 4, g - sky, 0.8), O(xx, (sky + g) / 2, 1, g - sky, 0), "#ffffff"));
    }
    return out.concat(flash(0, x1, y, 54, "#c8f4ff", 320), ring(40, x1, g - 2, 10, 80, "#2a8cff", 440));
  },
  // Precipice Blades: Groudon's red-hot stone blades burst out of the ground in a line up to it.
  "Precipice Blades": ({ x0, x1, g, y, dir, dist, P, O, flash }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * dist * (0.25 + 0.15 * i), h = 16 + i * 6, at = -420 + i * 70;
      out.push(P(at, 140, O(x, g, 10, 2, 1), O(x - dir * 2, g - h / 2, 9, h, 1), i % 2 ? "#8a3a1a" : "#b04a24", { ease: "ease-out" }),
        P(at + 140, 320, O(x - dir * 2, g - h / 2, 9, h, 1), O(x - dir * 2, g - h / 2, 4, h, 0), "#5a2a14"),
        P(at, 200, O(x, g, 3, 2, 1), O(x - dir * 3, g - h - 4, 3, 12, 0), "#ff6a2a", { ease: "ease-out" }));
    }
    return out.concat(P(-80, 420, O(x1, g, 20, 4, 0.9), O(x1, g, 80, 8, 0), "#ff8a3a", { round: true }), flash(0, x1, y, 48, "#ffb070", 300));
  },
  // Dragon Ascent: Rayquaza soars off the top and dives on it as a green streak out of the sky.
  "Dragon Ascent": ({ x0, x1, y, sky, dir, P, O, flash, ring }) => [
    P(-600, 260, O(x0, y, 10, 10, 1), O(x0 - dir * 10, sky - 20, 6, 6, 0.6), "#7bd68a", { round: true, ease: "ease-in" }),
    P(-600, 260, O(x0, y, 3, 20, 0.6), O(x0 - dir * 10, sky, 2, 40, 0), "#ffffff", { ease: "ease-in" }),
    P(-220, 220, O(x1 - dir * 40, sky - 16, 12, 12, 1), O(x1, y, 16, 16, 1), "#ffffff", { round: true, ease: "ease-in" }),
    P(-220, 220, O(x1 - dir * 48, sky - 22, 10, 10, 0.8), O(x1 - dir * 8, y - 10, 10, 10, 0.8), "#3fae5a", { round: true, ease: "ease-in" }),
    P(-180, 280, O(x1 - dir * 52, sky - 26, 6, 6, 0.6), O(x1 - dir * 18, y - 22, 6, 6, 0), "#9be3a0", { round: true, ease: "ease-in" }),
    flash(0, x1, y, 52, "#e8ffe8", 300), ring(0, x1, y, 10, 80, "#3fae5a", 440), ring(70, x1, y, 8, 60, "#ffffff", 360),
  ],
  // Aeroblast: a spiralling vortex beam of air drilling across to it.
  "Aeroblast": ({ x0, x1, y, mid, dist, dir, P, O, flash, ring, st }) => {
    const out = [ring(-560, x0, y, 30, 6, st.glow, 260)];
    out.push(P(-320, 260, O(x0, y, 4, 10, 1), O(mid, y, dist, 10, 0.9), st.hot, { round: true, ease: "linear" }),
      P(-60, 300, O(mid, y, dist, 10, 0.9), O(mid, y, dist, 1, 0), "#c8e8ff", { round: true }));
    for (let i = 0; i < 7; i++) {
      const x = x0 + dir * dist * (i + 1) / 8, at = -320 + i * 35;
      out.push(P(at, 260, O(x, y, 6, 16, 0.9), O(x + dir * 8, y, 10, 24, 0), i % 2 ? "#a8d8f0" : "#7ab0ff", { round: true, ring: true }));
    }
    return out.concat(flash(0, x1, y, 46, "#ffffff", 280), ring(0, x1, y, 10, 70, "#a8d8f0", 420));
  },
  // Sacred Fire: a column of rainbow-tinted holy flame roars up round it.
  "Sacred Fire": ({ x1, y, g, sky, P, O, flash, ring }) => {
    const out = [P(-420, 200, O(x1, g, 10, 3, 1), O(x1, g, 60, 6, 0.9), "#ffd75e", { round: true })];
    const cols = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
    for (let i = 0; i < 6; i++) {
      const x = x1 + (i - 2.5) * 6, h = g - sky - Math.abs(i - 2.5) * 8;
      out.push(P(-260 + Math.abs(i - 2.5) * 30, 380, O(x, g, 7, 2, 1), O(x, g - h / 2, 8, h, 0), cols[i], { ease: "ease-out" }));
    }
    out.push(P(-200, 420, O(x1, g, 14, 4, 1), O(x1, (sky + g) / 2, 18, g - sky, 0), "#fff2a8", { ease: "ease-out" }));
    return out.concat(flash(0, x1, y, 54, "#fff2a8", 320), ring(60, x1, y, 10, 80, "#ffb43a", 440));
  },
  // Blue Flare: blue flames close round it and engulf it.
  "Blue Flare": ({ x0, x1, y, g, P, O, flash, ring, rnd }) => {
    const out = [flash(-600, x0, y, 30, "#6fd2ff", 260), ring(-520, x1, y, 90, 30, "#1f6fe0", 300, 0.7)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, at = -300 + i * 25;
      out.push(P(at, 300, O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 22, 8, 10, 1), O(x1 + Math.cos(a) * 4, y + Math.sin(a) * 3, 10, 14, 0.9), i % 2 ? "#4fb4ff" : "#1f6fe0", { round: true, ease: "ease-in" }));
    }
    for (let i = 0; i < 5; i++) {
      const x = x1 + (i - 2) * 9, h = 26 + rnd() * 16;
      out.push(P(-20 + Math.abs(i - 2) * 30, 420, O(x, g, 8, 2, 1), O(x, g - h / 2, 10, h, 0), i % 2 ? "#6fd2ff" : "#e8fbff", { ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 56, "#e8fbff", 320), ring(0, x1, y, 12, 84, "#4fb4ff", 460));
  },
  // Bolt Strike: Zekrom wraps itself in white-blue lightning and charges into it.
  "Bolt Strike": ({ x0, x1, y, dir, P, O, flash, ring, rnd }) => {
    const out = [P(-600, 300, O(x0, y, 10, 10, 0.4), O(x0, y, 34, 34, 0.9), "#4f8cff", { round: true }), ring(-560, x0, y, 50, 14, "#ffffff", 260)];
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2;
      out.push(P(-560 + i * 50, 140, O(x0 + Math.cos(a) * 18, y + Math.sin(a) * 14, 2, 10, 1), O(x0 + Math.cos(a) * 18, y + Math.sin(a) * 14, 1, 10, 0), "#ffffff"));
    }
    out.push(P(-260, 260, O(x0, y, 34, 34, 0.9), O(x1, y, 30, 30, 1), "#4f8cff", { round: true, ease: "ease-in" }),
      P(-260, 260, O(x0, y, 16, 16, 1), O(x1, y, 16, 16, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-260, 300, O(x0, y, 6, 3, 0.8), O((x0 + x1) / 2 - dir * 10, y, Math.abs(x1 - x0), 3, 0), "#c8e0ff", { ease: "ease-in" }));
    for (let i = 0; i < 4; i++) out.push(P(0, 260, O(x1, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 40, 2, 12, 0), "#ffffff"));
    return out.concat(flash(0, x1, y, 56, "#ffffff", 300), ring(0, x1, y, 12, 86, "#4f8cff", 440));
  },
  // Oblivion Wing: Yveltal's red-black beam across, its life drained back in crimson motes.
  "Oblivion Wing": ({ x0, x1, y, mid, dist, P, O, flash, ring, rnd }) => {
    const out = [P(-600, 300, O(x0, y, 6, 6, 0.4), O(x0, y, 40, 22, 0.8), "#2a0a14", { round: true }), ring(-540, x0, y, 50, 10, "#e02a3a", 280)];
    out.push(P(-260, 220, O(x0, y, 6, 10, 1), O(mid, y, dist, 10, 1), "#e02a3a", { round: true, ease: "linear" }),
      P(-260, 220, O(x0, y, 4, 4, 1), O(mid, y, dist, 4, 1), "#ffd0d8", { round: true, ease: "linear" }),
      P(0, 300, O(mid, y, dist, 10, 1), O(mid, y, dist, 1, 0), "#7a0a1a", { round: true }));
    for (let i = 0; i < 6; i++) out.push(P(80 + i * 35, 400, O(x1 + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 4, 4, 1), O(x0, y, 3, 3, 0.3), "#ff4a5a", { round: true, ease: "ease-in" }));
    return out.concat(flash(0, x1, y, 48, "#ff8a9a", 280), ring(0, x1, y, 10, 70, "#e02a3a", 420));
  },
  // Thousand Arrows: arrows of earth shoot up from the ground, then fall on it from the sky.
  "Thousand Arrows": ({ x0, x1, y, g, sky, P, O, flash, rnd }) => {
    const out = [P(-600, 240, O(x0, g, 10, 3, 1), O(x0, g, 50, 6, 0), "#d8a860", { round: true })];
    for (let i = 0; i < 4; i++) out.push(P(-580 + i * 30, 240, O(x0 + (i - 1.5) * 6, g, 3, 6, 1), O(x0 + (i - 1.5) * 10, sky - 20, 2, 10, 0.4), "#a8783a", { ease: "ease-out" }));
    for (let i = 0; i < 9; i++) {
      const xx = x1 + (rnd() - 0.5) * 44, at = -260 + i * 30;
      out.push(P(at, 200, O(xx, sky - 10, 2, 10, 1), O(xx, g - 4, 3, 12, 1), i % 2 ? "#8a5a34" : "#d8b070", { ease: "ease-in" }));
    }
    return out.concat(P(0, 420, O(x1, g, 20, 4, 0.9), O(x1, g, 76, 8, 0), "#c8bca8", { round: true }), flash(0, x1, y, 44, "#f6e6c0", 280));
  },
  // Sunsteel Strike: Solgaleo blazes like a sun and charges, a golden comet with a white core.
  "Sunsteel Strike": ({ x0, x1, y, dir, dist, mid, P, O, flash, ring }) => [
    ring(-600, x0, y, 60, 14, "#ffd75e", 300), P(-580, 300, O(x0, y, 8, 8, 0.5), O(x0, y, 36, 36, 1), "#ffb43a", { round: true }),
    P(-280, 280, O(x0, y, 36, 36, 1), O(x1, y, 30, 30, 1), "#ffb43a", { round: true, ease: "ease-in" }),
    P(-280, 280, O(x0, y, 16, 16, 1), O(x1, y, 16, 16, 1), "#ffffff", { round: true, ease: "ease-in" }),
    P(-260, 320, O(x0, y, 8, 18, 0.7), O(mid - dir * 8, y, dist, 18, 0), "#ffe14a", { round: true, ease: "ease-in" }),
    flash(0, x1, y, 60, "#fff2a8", 320), ring(0, x1, y, 12, 90, "#ffd75e", 460), ring(80, x1, y, 10, 70, "#ff8a2a", 400),
  ],
  // Moongeist Beam: Lunala opens its wings into a crescent and fires a lunar purple beam.
  "Moongeist Beam": ({ x0, x1, y, mid, dist, P, O, flash, ring }) => [
    P(-600, 300, O(x0, y - 4, 10, 10, 0.3), O(x0, y - 4, 44, 44, 0.9), "#7a50e0", { round: true, ring: true }),
    P(-560, 280, O(x0, y - 4, 6, 6, 1), O(x0, y - 4, 24, 24, 1), "#e8e0ff", { round: true }),
    P(-260, 240, O(x0, y, 6, 12, 1), O(mid, y, dist, 12, 1), "#6a3ad8", { round: true, ease: "linear" }),
    P(-260, 240, O(x0, y, 4, 4, 1), O(mid, y, dist, 4, 1), "#efe6ff", { round: true, ease: "linear" }),
    P(-20, 320, O(mid, y, dist, 12, 1), O(mid, y, dist, 1, 0), "#b090ff", { round: true }),
    P(-280, 300, O(x0, y - 4, 24, 24, 1), O(x0, y - 4, 4, 4, 0), "#e8e0ff", { round: true }),
    flash(0, x1, y, 52, "#efe6ff", 300), ring(0, x1, y, 12, 80, "#7a50e0", 440),
  ],
  // Photon Geyser: Necrozma's light gathers in it, then a geyser of light bursts straight up out of it.
  "Photon Geyser": ({ x0, x1, y, g, sky, P, O, flash, ring, rnd }) => {
    const out = [ring(-600, x0, y, 50, 6, "#fff2a8", 280), P(-420, 220, O(x0, y, 6, 6, 1), O(x1, y, 8, 8, 1), "#ffffff", { round: true, ease: "ease-in" })];
    out.push(P(-200, 200, O(x1, y, 4, 4, 0.4), O(x1, y, 22, 22, 1), "#ffe14a", { round: true }),
      P(0, 140, O(x1, y, 8, 10, 1), O(x1, (sky - 20 + g) / 2, 18, g - sky + 20, 1), "#fff2a8", { ease: "ease-out" }),
      P(140, 360, O(x1, (sky - 20 + g) / 2, 18, g - sky + 20, 1), O(x1, (sky - 20 + g) / 2, 2, g - sky + 20, 0), "#ffffff"));
    for (let i = 0; i < 6; i++) out.push(P(40 + i * 25, 380, O(x1 + (rnd() - 0.5) * 10, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 50, sky - 10, 3, 3, 0), i % 2 ? "#ffe14a" : "#ff70c0", { round: true }));
    return out.concat(flash(0, x1, y, 56, "#ffffff", 320), ring(0, x1, g - 2, 10, 80, "#ffd75e", 440));
  },
  // Behemoth Blade: Zacian swings a giant sword in one glowing arc across it.
  "Behemoth Blade": ({ x0, x1, y, sky, g, dir, P, O, flash, ring }) => [
    P(-600, 280, O(x0, y - 10, 3, 4, 1), O(x0 + dir * 6, y - 20, 6, 40, 1), "#d0e8ff"), P(-600, 280, O(x0, y, 6, 6, 0.4), O(x0, y - 10, 30, 30, 0.6), "#4fb4ff", { round: true }),
    P(-180, 180, O(x1 - dir * 30, sky, 6, 50, 1), O(x1 + dir * 6, g - 8, 60, 6, 1), "#e8f4ff", { ease: "ease-in" }),
    P(-180, 180, O(x1 - dir * 30, sky, 12, 56, 0.4), O(x1 + dir * 6, g - 8, 70, 12, 0.5), "#4fb4ff", { round: true, ease: "ease-in" }),
    P(0, 360, O(x1, y, 80, 4, 1), O(x1, y, 96, 1, 0), "#ffffff"), P(0, 360, O(x1, y, 4, 60, 0.9), O(x1, y, 1, 70, 0), "#c0d0e0"),
    flash(0, x1, y, 54, "#ffffff", 300), ring(40, x1, y, 10, 80, "#4fb4ff", 420),
  ],
  // Behemoth Bash: Zamazenta raises a great shield and slams it into it.
  "Behemoth Bash": ({ x0, x1, y, dir, P, O, flash, ring }) => [
    P(-600, 300, O(x0 + dir * 12, y, 4, 10, 0.5), O(x0 + dir * 12, y, 16, 34, 1), "#c03a4a", { round: true }),
    P(-600, 300, O(x0 + dir * 12, y, 2, 6, 0.5), O(x0 + dir * 12, y, 8, 22, 1), "#ffd75e", { round: true }),
    P(-300, 300, O(x0 + dir * 12, y, 16, 34, 1), O(x1 - dir * 10, y, 20, 40, 1), "#c03a4a", { round: true, ease: "ease-in" }),
    P(-300, 300, O(x0 + dir * 12, y, 8, 22, 1), O(x1 - dir * 10, y, 10, 26, 1), "#ffd75e", { round: true, ease: "ease-in" }),
    P(0, 300, O(x1 - dir * 10, y, 20, 40, 1), O(x1 - dir * 10, y, 20, 40, 0), "#c03a4a", { round: true }),
    flash(0, x1, y, 56, "#ffffff", 300), ring(0, x1, y, 14, 90, "#c0d0e0", 460), ring(60, x1, y, 10, 64, "#ffd75e", 380),
  ],
  // Dynamax Cannon: a huge red beam from Eternatus's core, the whole strip lit red.
  "Dynamax Cannon": ({ x0, x1, y, mid, dist, P, O, flash, ring }) => [
    P(-600, 300, O(x0, y, 6, 6, 0.4), O(x0, y, 40, 40, 1), "#ff2a4a", { round: true }), ring(-560, x0, y, 70, 14, "#ff6a8a", 280),
    P(-260, 180, O(x0, y, 10, 24, 1), O(mid, y, dist, 24, 1), "#e0102a", { round: true, ease: "linear" }),
    P(-260, 180, O(x0, y, 6, 10, 1), O(mid, y, dist, 10, 1), "#ffd0d8", { round: true, ease: "linear" }),
    P(-80, 380, O(mid, y, dist, 24, 1), O(mid, y, dist, 2, 0), "#ff2a4a", { round: true }),
    P(-260, 500, O(mid, y, dist + 40, 70, 0.15), O(mid, y, dist + 60, 80, 0), "#ff2a4a", { round: true }),
    P(-300, 300, O(x0, y, 40, 40, 1), O(x0, y, 10, 10, 0), "#ff2a4a", { round: true }),
    flash(0, x1, y, 64, "#ffd0d8", 340), ring(0, x1, y, 14, 100, "#ff2a4a", 480),
  ],
  // Astral Barrage: a swarm of ghostly spirits flying over in waves and diving into it.
  "Astral Barrage": ({ x0, x1, y, sky, P, O, flash, ring, rnd }) => {
    const out = [P(-600, 260, O(x0, y, 8, 8, 0.3), O(x0, y, 30, 30, 0.8), "#5a3ab8", { round: true })];
    for (let i = 0; i < 10; i++) {
      const at = -480 + i * 40, sy = sky + rnd() * (y - sky), ex = x1 + (rnd() - 0.5) * 26, ey = y + (rnd() - 0.5) * 20;
      out.push(P(at, 380 - i * 10, O(x0 + (rnd() - 0.5) * 20, sy, 7, 7, 0.9), O(ex, ey, 6, 6, 1), i % 2 ? "#b090ff" : "#7ad8ff", { round: true, ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 52, "#efe6ff", 300), ring(0, x1, y, 10, 80, "#9a70ff", 440));
  },
  // Doom Desire: a star wish made, a long beat, then a beam of light comes down on it from above.
  "Doom Desire": ({ x0, x1, y, g, sky, P, O, flash, ring }) => [
    P(-600, 200, O(x0, y - 14, 4, 4, 1), O(x0, sky - 14, 8, 8, 0), "#ffd75e", { round: true, ease: "ease-out" }),
    P(-600, 200, O(x0, y - 14, 2, 10, 1), O(x0, y - 14, 1, 2, 0), "#ffffff"), P(-600, 200, O(x0, y - 14, 10, 2, 1), O(x0, y - 14, 2, 1, 0), "#ffffff"),
    P(-300, 240, O(x1, sky - 10, 4, 4, 0), O(x1, sky - 10, 18, 18, 1), "#fff2c0", { round: true }),
    P(-60, 120, O(x1, sky, 4, 4, 1), O(x1, (sky + g) / 2, 20, g - sky, 1), "#ffffff", { ease: "ease-in" }),
    P(60, 380, O(x1, (sky + g) / 2, 20, g - sky, 1), O(x1, (sky + g) / 2, 2, g - sky, 0), "#d0dce8"),
    flash(0, x1, y, 60, "#ffffff", 340), ring(0, x1, y, 12, 90, "#ffd75e", 460), ring(80, x1, g - 2, 10, 80, "#d0dce8", 420),
  ],
  // Psycho Boost: Deoxys's psychic energy swirls into a ball, flies over and bursts in a violet blast.
  "Psycho Boost": ({ x0, x1, y, P, O, flash, ring }) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(P(-600 + i * 20, 260, O(x0 + Math.cos(a) * 26, y + Math.sin(a) * 18, 5, 5, 0.9), O(x0, y, 3, 3, 1), i % 2 ? "#ff70c0" : "#b070ff", { round: true, ease: "ease-in" }));
    }
    out.push(P(-300, 300, O(x0, y, 14, 14, 1), O(x1, y, 20, 20, 1), "#c060ff", { round: true, ease: "ease-in" }),
      P(-300, 300, O(x0, y, 6, 6, 1), O(x1, y, 10, 10, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-300, 300, O(x0, y, 24, 24, 0.8), O(x1, y, 30, 30, 0.8), "#ff70c0", { round: true, ring: true, ease: "ease-in" }));
    return out.concat(flash(0, x1, y, 60, "#ffa0d8", 320), ring(0, x1, y, 12, 90, "#c060ff", 460), ring(70, x1, y, 10, 70, "#ffffff", 380));
  },
  // Seed Flare: Shaymin's flowers glow, then a green-white shockwave rolls out over it.
  "Seed Flare": ({ x0, x1, y, g, dist, P, O, flash, ring }) => [
    P(-600, 300, O(x0, y, 6, 6, 0.4), O(x0, y, 26, 26, 1), "#e8ffd0", { round: true }), ring(-560, x0, y, 50, 10, "#7bd65a", 300),
    P(-300, 300, O(x0, y, 26, 26, 1), O(x0, y, dist * 2 + 20, 60, 0.6), "#9be36a", { round: true, ring: true, ease: "ease-out" }),
    P(-300, 300, O(x0, y, 20, 20, 0.8), O(x0, y, dist * 2, 50, 0.3), "#e8ffd0", { round: true, ease: "ease-out" }),
    P(0, 320, O(x0, y, dist * 2 + 20, 60, 0.6), O(x0, y, dist * 2 + 60, 80, 0), "#3fae3a", { round: true, ring: true }),
    P(0, 400, O(x1, g, 20, 4, 0.9), O(x1, g, 70, 8, 0), "#9be36a", { round: true }),
    flash(0, x1, y, 54, "#ffffff", 300),
  ],
  // V-create: Victini's brow flares into a fiery V and it hurtles into it.
  "V-create": ({ x0, x1, y, dir, P, O, flash, ring }) => [
    P(-600, 260, O(x0, y - 8, 4, 4, 1), O(x0 - dir * 6, y - 16, 4, 20, 1), "#ff5a14"), P(-600, 260, O(x0, y - 8, 4, 4, 1), O(x0 + dir * 6, y - 16, 4, 20, 1), "#ff5a14"),
    P(-340, 340, O(x0 - dir * 6, y - 4, 6, 26, 1), O(x1 - dir * 10, y - 4, 10, 40, 1), "#ff8a2a", { ease: "ease-in" }),
    P(-340, 340, O(x0 + dir * 6, y - 4, 6, 26, 1), O(x1 + dir * 10, y - 4, 10, 40, 1), "#ff8a2a", { ease: "ease-in" }),
    P(-340, 340, O(x0, y + 8, 10, 10, 1), O(x1, y + 10, 14, 14, 1), "#fff2a8", { round: true, ease: "ease-in" }),
    P(0, 360, O(x1 - dir * 10, y - 4, 10, 40, 1), O(x1 - dir * 22, y - 14, 14, 50, 0), "#ff5a14"),
    P(0, 360, O(x1 + dir * 10, y - 4, 10, 40, 1), O(x1 + dir * 22, y - 14, 14, 50, 0), "#ff5a14"),
    flash(0, x1, y, 60, "#fff2a8", 320), ring(0, x1, y, 12, 90, "#ffb43a", 460),
  ],
  // Secret Sword: Keldeo's horn becomes a long blade of light and slashes it.
  "Secret Sword": ({ x0, x1, y, dir, P, O, flash, ring }) => [
    P(-600, 300, O(x0 + dir * 6, y - 8, 2, 2, 1), O(x0 + dir * 22, y - 8, 30, 3, 1), "#e0f0ff", { ease: "ease-out" }),
    P(-600, 300, O(x0 + dir * 6, y - 8, 4, 4, 0.5), O(x0 + dir * 22, y - 8, 36, 8, 0.6), "#4fb4ff", { round: true, ease: "ease-out" }),
    P(-300, 300, O(x0 + dir * 22, y - 8, 30, 3, 1), O(x1, y, 30, 3, 1), "#e0f0ff", { ease: "ease-in" }),
    P(-120, 120, O(x1 - dir * 20, y - 20, 4, 4, 1), O(x1 + dir * 20, y + 20, 4, 60, 1), "#ffffff", { ease: "ease-in" }),
    P(0, 360, O(x1, y, 60, 3, 1), O(x1, y, 70, 1, 0), "#ffffff"), P(0, 360, O(x1, y, 40, 10, 0.8), O(x1, y, 60, 2, 0), "#ff7a4a"),
    flash(0, x1, y, 50, "#e0f0ff", 300), ring(30, x1, y, 10, 70, "#d8452a", 420),
  ],
  // Relic Song: Meloetta's ancient song drifts over in rings of notes that hum round it.
  "Relic Song": ({ x0, x1, y, P, O, flash, ring, rnd }) => {
    const out = [ring(-600, x0, y - 8, 8, 40, "#9be3a0", 360)];
    for (let i = 0; i < 6; i++) {
      const at = -540 + i * 70, dy = (rnd() - 0.5) * 24, c = i % 2 ? "#7bd6c0" : "#ffd75e";
      out.push(P(at, 480, O(x0, y - 10 + dy, 4, 4, 1), O(x1, y - 10 + dy * 0.5, 4, 4, 0.8), c, { round: true, ease: "ease-in-out" }),
        P(at, 480, O(x0 + 2, y - 15 + dy, 1, 8, 1), O(x1 + 2, y - 15 + dy * 0.5, 1, 8, 0.8), c, { ease: "ease-in-out" }));
    }
    for (let i = 0; i < 3; i++) out.push(ring(i * 90, x1, y, 10, 50 + i * 10, i % 2 ? "#7bd6c0" : "#ffd75e", 400, 0.8));
    return out.concat(flash(0, x1, y, 40, "#ffffff", 280));
  },
  // Techno Blast: the cannon on Genesect's back charges a ball of drive light and fires it.
  "Techno Blast": ({ x0, x1, y, dir, P, O, flash, ring }) => [
    P(-600, 300, O(x0 - dir * 4, y - 12, 4, 4, 0.4), O(x0 - dir * 4, y - 12, 14, 14, 1), "#c060ff", { round: true }),
    ring(-600, x0 - dir * 4, y - 12, 34, 6, "#ffffff", 280),
    P(-300, 300, O(x0 - dir * 4, y - 12, 14, 14, 1), O(x1, y, 18, 18, 1), "#c060ff", { round: true, ease: "ease-in" }),
    P(-300, 300, O(x0 - dir * 4, y - 12, 6, 6, 1), O(x1, y, 8, 8, 1), "#ffffff", { round: true, ease: "ease-in" }),
    P(-280, 320, O(x0 - dir * 4, y - 12, 4, 2, 0.8), O((x0 + x1) / 2, (y - 12 + y) / 2, Math.abs(x1 - x0), 2, 0), "#d890ff", { ease: "ease-in" }),
    flash(0, x1, y, 54, "#f6e0ff", 300), ring(0, x1, y, 12, 84, "#c060ff", 440), ring(70, x1, y, 8, 60, "#ffffff", 360),
  ],
  // Hyperspace Hole: a ring portal opens beside it and a strike comes out of nowhere.
  "Hyperspace Hole": ({ x0, x1, y, dir, P, O, flash, ring }) => [
    P(-600, 260, O(x0, y, 20, 20, 0.6), O(x0, y, 4, 4, 0), "#f04aa0", { round: true, ring: true }),
    P(-400, 300, O(x1 + dir * 18, y, 2, 2, 1), O(x1 + dir * 18, y, 28, 40, 1), "#f04aa0", { round: true, ring: true }),
    P(-400, 300, O(x1 + dir * 18, y, 2, 2, 1), O(x1 + dir * 18, y, 22, 34, 0.95), "#1a0828", { round: true }),
    P(-100, 100, O(x1 + dir * 18, y, 10, 10, 1), O(x1, y, 24, 24, 1), "#ffa0d8", { round: true, ease: "ease-in" }),
    P(0, 320, O(x1 + dir * 18, y, 28, 40, 1), O(x1 + dir * 18, y, 2, 2, 0), "#f04aa0", { round: true, ring: true }),
    P(0, 320, O(x1 + dir * 18, y, 22, 34, 0.95), O(x1 + dir * 18, y, 2, 2, 0), "#1a0828", { round: true }),
    flash(0, x1, y, 48, "#ffffff", 280), ring(0, x1, y, 10, 70, "#ff70c0", 420),
  ],
  // Steam Eruption: the ground under it bursts in a geyser of hot water and steam.
  "Steam Eruption": ({ x0, x1, y, g, sky, P, O, flash, rnd }) => {
    const out = [P(-600, 300, O(x0, y, 6, 6, 0.3), O(x0, y, 30, 24, 0.7), "#e8f4ff", { round: true }), P(-360, 300, O(x1, g, 10, 3, 0.9), O(x1, g, 50, 6, 0.9), "#2a8cff", { round: true })];
    out.push(P(-60, 160, O(x1, g, 14, 4, 1), O(x1, (sky + g) / 2, 20, g - sky, 1), "#4fb4ff", { ease: "ease-out" }),
      P(-60, 160, O(x1, g, 6, 4, 1), O(x1, (sky + g) / 2, 8, g - sky, 1), "#ffffff", { ease: "ease-out" }),
      P(100, 360, O(x1, (sky + g) / 2, 20, g - sky, 1), O(x1, (sky + g) / 2, 4, g - sky, 0), "#8fd3ff"));
    for (let i = 0; i < 7; i++) out.push(P(40 + i * 30, 440, O(x1 + (rnd() - 0.5) * 16, sky + 6, 10, 8, 0.8), O(x1 + (rnd() - 0.5) * 50, sky - 10 - rnd() * 10, 24, 16, 0), "#f0f4f8", { round: true }));
    return out.concat(flash(0, x1, y, 48, "#ffffff", 280));
  },
  // Spectral Thief: Marshadow slips into its shadow and lunges up out of it.
  "Spectral Thief": ({ x0, x1, y, g, dir, P, O, flash, ring }) => [
    P(-600, 260, O(x0, g, 20, 5, 0.8), O(x1 - dir * 4, g, 26, 6, 0.9), "#120a1e", { round: true, ease: "ease-in-out" }),
    P(-600, 200, O(x0, y, 20, 26, 0.6), O(x0, g, 20, 4, 0), "#2a1a3e", { round: true, ease: "ease-in" }),
    P(-160, 160, O(x1 - dir * 4, g, 10, 4, 1), O(x1, y, 20, 26, 1), "#3a2a58", { round: true, ease: "ease-out" }),
    P(-160, 200, O(x1 - dir * 4, g, 6, 4, 1), O(x1, y - 6, 8, 30, 0), "#7ad870", { round: true, ease: "ease-out" }),
    P(0, 300, O(x1, y, 20, 26, 1), O(x1, y, 2, 2, 0), "#3a2a58", { round: true }),
    P(0, 320, O(x1 - dir * 4, g, 26, 6, 0.9), O(x1 - dir * 4, g, 4, 2, 0), "#120a1e", { round: true }),
    flash(0, x1, y, 46, "#efe6ff", 280), ring(0, x1, y, 10, 70, "#5a3ab8", 420),
  ],
  // Volt Tackle: Pikachu wraps itself in crackling electricity and charges in.
  "Volt Tackle": ({ x0, x1, y, dir, dist, mid, P, O, flash, ring, rnd }) => {
    const out = [P(-600, 300, O(x0, y, 10, 10, 0.4), O(x0, y, 30, 30, 0.9), "#ffe14a", { round: true }), ring(-560, x0, y, 46, 12, "#ffffff", 260)];
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      out.push(P(-560 + i * 60, 140, O(x0 + Math.cos(a) * 16, y + Math.sin(a) * 12, 2, 10, 1), O(x0 + Math.cos(a) * 16, y + Math.sin(a) * 12, 1, 10, 0), "#ffffff"));
    }
    out.push(P(-260, 260, O(x0, y, 30, 30, 0.9), O(x1, y, 28, 28, 1), "#ffc400", { round: true, ease: "ease-in" }),
      P(-260, 260, O(x0, y, 12, 12, 1), O(x1, y, 14, 14, 1), "#ffffff", { round: true, ease: "ease-in" }),
      P(-240, 300, O(x0, y - 6, 4, 2, 1), O(mid - dir * 8, y - 6, dist, 2, 0), "#fff07a", { ease: "ease-in" }),
      P(-240, 300, O(x0, y + 6, 4, 2, 1), O(mid - dir * 8, y + 6, dist, 2, 0), "#fff07a", { ease: "ease-in" }));
    for (let i = 0; i < 5; i++) out.push(P(0, 260, O(x1, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 40, 2, 10, 0), i % 2 ? "#ffffff" : "#ffe14a"));
    return out.concat(flash(0, x1, y, 54, "#ffffff", 300), ring(0, x1, y, 12, 84, "#ffc400", 440));
  },
  // Night Daze: a crimson-black pulse swells from Zoroark and swallows it.
  "Night Daze": ({ x0, x1, y, dist, P, O, flash, ring }) => {
    const w = dist * 2 + 20, h = Math.min(60, dist * 0.5 + 24);
    return [P(-600, 260, O(x0, y, 6, 6, 0.5), O(x0, y, 24, 24, 0.9), "#c0304a", { round: true }),
      P(-340, 340, O(x0, y, 10, 10, 0.7), O(x0, y, w, h, 0.4), "#1a0e1e", { round: true, ease: "ease-out" }),
      P(-340, 340, O(x0, y, 10, 10, 1), O(x0, y, w + 4, h + 4, 0.9), "#c0304a", { round: true, ring: true, ease: "ease-out" }),
      P(-280, 340, O(x0, y, 8, 8, 1), O(x0, y, w - 20, h - 10, 0.5), "#ff4a6a", { round: true, ring: true, ease: "ease-out" }),
      P(0, 360, O(x0, y, w, h, 0.4), O(x0, y, w + 30, h + 14, 0), "#1a0e1e", { round: true }),
      P(0, 360, O(x0, y, w + 4, h + 4, 0.9), O(x0, y, w + 36, h + 20, 0), "#c0304a", { round: true, ring: true }),
      flash(0, x1, y, 46, "#ff8a9a", 280), ring(0, x1, y, 10, 60, "#7a1a2a", 400)];
  },
  // Spirit Shackle: Decidueye looses a shadow arrow that pins the target's shadow to the ground.
  "Spirit Shackle": ({ x0, x1, y, g, dir, mid, dist, P, O, flash, ring }) => [
    P(-600, 260, O(x0, y - 4, 2, 2, 1), O(x0 - dir * 8, y - 4, 20, 2, 1), "#b090ff", { ease: "ease-out" }),
    P(-300, 260, O(x0, y - 4, 18, 3, 1), O(x1, g - 4, 18, 3, 1), "#efe6ff", { ease: "ease-in" }),
    P(-300, 300, O(x0, y - 4, 6, 6, 0.6), O(mid, (y + g) / 2, dist, 2, 0), "#7a50e0", { ease: "ease-in" }),
    P(-40, 360, O(x1, g, 10, 4, 0.5), O(x1, g, 30, 6, 0.9), "#120a1e", { round: true }),
    P(320, 300, O(x1, g, 30, 6, 0.9), O(x1, g, 30, 6, 0), "#120a1e", { round: true }),
    P(0, 600, O(x1, g - 6, 3, 14, 1), O(x1, g - 6, 3, 14, 0), "#9a70ff"),
    flash(0, x1, g - 4, 30, "#efe6ff", 260), ring(0, x1, g - 2, 8, 50, "#9a70ff", 400), ring(40, x1, y, 10, 60, "#5a3ab8", 400),
  ],
  // Darkest Lariat: Incineroar spins with arms out, a dark whirling lariat that hits it.
  "Darkest Lariat": ({ x0, x1, y, P, O, flash, ring }) => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4, x = x0 + (x1 - x0) * t, at = -560 + i * 110;
      out.push(P(at, 200, O(x, y, 34, 4, 1), O(x, y, 4, 4, 0.9), i % 2 ? "#c0304a" : "#5a4a70", { round: true }),
        P(at, 220, O(x, y, 30, 14, 0.7), O(x, y, 40, 18, 0), "#2a2038", { round: true, ring: true }));
    }
    return out.concat(flash(0, x1, y, 50, "#ff8a3a", 280), ring(0, x1, y, 12, 80, "#c0304a", 440), ring(60, x1, y, 8, 60, "#7a5aa0", 380));
  },
  // Sparkling Aria: Primarina sings up a flock of bubbles that float over and burst on it.
  "Sparkling Aria": ({ x0, x1, y, P, O, flash, ring, rnd }) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const at = -600 + i * 50, ex = x1 + (rnd() - 0.5) * 36, ey = y + (rnd() - 0.5) * 26, d = 6 + rnd() * 6;
      out.push(P(at, 480 - i * 30, O(x0, y - 6, 3, 3, 0.9), O(ex, ey, d, d, 0.9), i % 2 ? "#8fd3ff" : "#ffb0e0", { round: true, ring: true, ease: "ease-in-out" }),
        P(at + 480 - i * 30, 200, O(ex, ey, d, d, 0.9), O(ex, ey, d * 2, d * 2, 0), "#ffffff", { round: true, ring: true }));
    }
    return out.concat(flash(0, x1, y, 44, "#c8f4ff", 280));
  },
  // Drum Beating: Rillaboom's drum booms; roots burst out of the ground and lash it.
  "Drum Beating": ({ x0, x1, y, g, dir, dist, P, O, flash, ring }) => {
    const out = [ring(-600, x0, y, 8, 50, "#9be36a", 300), ring(-480, x0, y, 8, 50, "#9be36a", 300)];
    for (let i = 0; i < 5; i++) {
      const x = x0 + dir * dist * (0.4 + 0.15 * i), h = 14 + i * 5, at = -360 + i * 60;
      out.push(P(at, 160, O(x, g, 4, 2, 1), O(x + dir * 3, g - h / 2, 5, h, 1), "#6a4a24", { ease: "ease-out" }),
        P(at + 160, 300, O(x + dir * 3, g - h / 2, 5, h, 1), O(x + dir * 3, g - h / 2, 2, h, 0), "#3fae3a"));
    }
    return out.concat(P(-60, 160, O(x1, g, 5, 2, 1), O(x1, y, 6, g - y + 10, 1), "#6a4a24", { ease: "ease-out" }), P(100, 300, O(x1, y, 6, g - y + 10, 1), O(x1, y, 2, g - y + 10, 0), "#3fae3a"),
      flash(0, x1, y, 46, "#e8ffd0", 280), P(0, 400, O(x1, g, 16, 4, 0.8), O(x1, g, 60, 8, 0), "#a8946a", { round: true }));
  },
  // Pyro Ball: Cinderace kicks up a pebble, it catches fire, and it's booted over in a blazing arc.
  "Pyro Ball": ({ x0, x1, y, g, mid, P, O, flash, ring }) => [
    P(-600, 200, O(x0, g - 2, 4, 4, 1), O(x0, y - 18, 8, 8, 1), "#a89070", { round: true, ease: "ease-out" }),
    P(-450, 150, O(x0, y - 18, 8, 8, 1), O(x0, y - 12, 12, 12, 1), "#ff5a14", { round: true }),
    P(-300, 150, O(x0, y - 12, 12, 12, 1), O(mid, y - 34, 14, 14, 1), "#ff5a14", { round: true, ease: "ease-out" }),
    P(-150, 150, O(mid, y - 34, 14, 14, 1), O(x1, y, 14, 14, 1), "#ff5a14", { round: true, ease: "ease-in" }),
    P(-300, 150, O(x0, y - 12, 6, 6, 1), O(mid, y - 34, 7, 7, 1), "#fff2a8", { round: true, ease: "ease-out" }),
    P(-150, 150, O(mid, y - 34, 7, 7, 1), O(x1, y, 7, 7, 1), "#fff2a8", { round: true, ease: "ease-in" }),
    P(-260, 200, O(x0, y - 10, 8, 8, 0.6), O(mid, y - 30, 10, 10, 0), "#ffb43a", { round: true }),
    P(-110, 200, O(mid, y - 30, 8, 8, 0.6), O(x1, y - 4, 10, 10, 0), "#ffb43a", { round: true }),
    flash(0, x1, y, 54, "#fff2a8", 300), ring(0, x1, y, 12, 80, "#ff8a2a", 440),
  ],
  // Snipe Shot: Inteleon takes aim (a sight on it) and fires one thin, precise jet of water.
  "Snipe Shot": ({ x0, x1, y, mid, dist, P, O, flash, ring }) => [
    P(-600, 360, O(x1, y, 40, 40, 0.2), O(x1, y, 14, 14, 0.9), "#8fd3ff", { round: true, ring: true, ease: "ease-in" }),
    P(-600, 360, O(x1, y, 30, 1, 0.2), O(x1, y, 20, 1, 0.9), "#ffffff"), P(-600, 360, O(x1, y, 1, 30, 0.2), O(x1, y, 1, 20, 0.9), "#ffffff"),
    P(-120, 120, O(x0, y, 4, 2, 1), O(mid, y, dist, 2, 1), "#ffffff", { ease: "linear" }),
    P(-120, 120, O(x0, y, 4, 4, 0.7), O(mid, y, dist, 4, 0.7), "#2a8cff", { ease: "linear" }),
    P(0, 260, O(mid, y, dist, 3, 1), O(mid, y, dist, 1, 0), "#8fd3ff"),
    flash(0, x1, y, 36, "#ffffff", 240), ring(0, x1, y, 6, 50, "#2a8cff", 360),
  ],
  // Flower Trick: a bouquet tossed at it bursts in a ring of petals round it.
  "Flower Trick": ({ x0, x1, y, mid, P, O, flash, ring }) => {
    const out = [P(-400, 200, O(x0, y, 8, 8, 1), O(mid, y - 26, 10, 10, 1), "#ff80c8", { round: true, ease: "ease-out" }),
      P(-200, 200, O(mid, y - 26, 10, 10, 1), O(x1, y, 12, 12, 1), "#ff80c8", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      out.push(P(0, 420, O(x1, y, 5, 4, 1), O(x1 + Math.cos(a) * 34, y + Math.sin(a) * 24, 5, 4, 0), i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#ff80c8" : "#7bd65a", { round: true, ease: "ease-out" }));
    }
    return out.concat(flash(0, x1, y, 44, "#ffd0ee", 280), ring(0, x1, y, 10, 64, "#ff80c8", 400));
  },
  // Torch Song: Skeledirge sings flames that rise in notes and rain down on it.
  "Torch Song": ({ x0, x1, y, sky, P, O, flash, ring, rnd }) => {
    const out = [ring(-600, x0, y - 8, 8, 40, "#ffb43a", 320)];
    for (let i = 0; i < 6; i++) {
      const at = -540 + i * 60, top = sky + rnd() * 10, xx = x1 + (i - 2.5) * 8;
      out.push(P(at, 260, O(x0, y - 10, 5, 5, 1), O((x0 + xx) / 2, top, 7, 7, 1), i % 2 ? "#ff5a14" : "#ffb43a", { round: true, ease: "ease-out" }),
        P(at + 260, 220, O((x0 + xx) / 2, top, 7, 7, 1), O(xx, y, 9, 9, 1), i % 2 ? "#ff5a14" : "#ffb43a", { round: true, ease: "ease-in" }),
        P(at + 260, 220, O((x0 + xx) / 2 + 3, top - 5, 1, 8, 1), O(xx + 3, y - 5, 1, 8, 0), "#fff2a8", { ease: "ease-in" }));
    }
    return out.concat(flash(0, x1, y, 50, "#fff2a8", 300));
  },
  // Aqua Step: Quaquaval dances over in splashes and lands a watery kick.
  "Aqua Step": ({ x0, x1, y, g, dir, dist, P, O, flash, ring, rnd }) => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const x = x0 + dir * dist * (i + 1) / 5, at = -560 + i * 120;
      out.push(P(at, 240, O(x, g - 2, 6, 3, 1), O(x, g - 4, 26, 8, 0), "#4fb4ff", { round: true, ring: true }));
      for (let k = 0; k < 2; k++) out.push(P(at, 280, O(x, g - 2, 3, 3, 1), O(x + (k ? 10 : -10), g - 14 - rnd() * 6, 3, 3, 0), "#8fd3ff", { round: true, ease: "ease-out" }));
    }
    return out.concat(P(-80, 80, O(x1 - dir * 20, y - 10, 10, 10, 1), O(x1, y, 16, 16, 1), "#2a8cff", { round: true, ease: "ease-in" }),
      flash(0, x1, y, 46, "#ffffff", 280), ring(0, x1, y, 10, 70, "#4fb4ff", 420), ring(60, x1, y, 8, 50, "#8fd3ff", 360));
  },
  // Headlong Rush: Great Tusk charges headlong, the ground shaking and dust kicking up behind it.
  "Headlong Rush": ({ x0, x1, y, g, dir, dist, P, O, flash, ring }) => {
    const out = [P(-480, 480, O(x0, y, 20, 20, 0.9), O(x1, y, 24, 24, 1), "#a8783a", { round: true, ease: "ease-in" })];
    for (let i = 0; i < 5; i++) {
      const x = x0 + dir * dist * (i / 5), at = -480 + i * 96;
      out.push(P(at, 300, O(x, g - 2, 8, 6, 0.9), O(x - dir * 8, g - 10, 22, 14, 0), "#d8b070", { round: true }));
    }
    return out.concat(P(0, 420, O(x1, g, 20, 4, 0.9), O(x1, g, 90, 8, 0), "#c8bca8", { round: true }),
      flash(0, x1, y, 54, "#f6e6c0", 300), ring(0, x1, y, 12, 84, "#a8783a", 440));
  },
  // Stone Axe: Kleavor's axe-blade chops it and leaves rock splinters floating round it.
  "Stone Axe": ({ x1, y, sky, dir, P, O, flash, ring, rnd }) => {
    const out = [P(-260, 260, O(x1 - dir * 30, sky, 8, 8, 1), O(x1, y, 14, 14, 1), "#9a8050", { ease: "ease-in" }),
      P(-120, 120, O(x1 - dir * 16, y - 20, 4, 4, 1), O(x1 + dir * 14, y + 16, 4, 50, 1), "#efe4c8", { ease: "ease-in" }),
      P(0, 300, O(x1, y, 4, 50, 1), O(x1, y, 1, 56, 0), "#ffffff")];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd() * 0.5, xx = x1 + Math.cos(a) * 22, yy = y + Math.sin(a) * 16;
      out.push(P(0, 160, O(x1, y, 4, 4, 1), O(xx, yy, 6, 5, 1), i % 2 ? "#9a8050" : "#c8b080", { ease: "ease-out" }),
        P(160, 520, O(xx, yy, 6, 5, 1), O(xx, yy - 4, 6, 5, 0), i % 2 ? "#9a8050" : "#c8b080"));
    }
    return out.concat(flash(0, x1, y, 44, "#efe4c8", 260), ring(0, x1, y, 10, 60, "#c8b080", 400));
  },
  // Wicked Blow: Single Strike Urshifu's one dark fist, driven home, darkness bursting out of it
  // in jagged spikes (always a critical hit: a gold glint as it lands).
  "Wicked Blow": ({ x0, x1, y, dir, P, O, flash, ring }) => {
    const out = [P(-300, 300, O(x0 + dir * 10, y, 12, 12, 0.6), O(x1 - dir * 6, y, 22, 22, 1), "#3a2a4a", { round: true, ease: "ease-in" }),
      P(-140, 140, O(x1 - dir * 30, y, 30, 4, 0.7), O(x1 - dir * 4, y, 10, 2, 1), "#8a5ab8", { ease: "ease-in" })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = i % 2 ? 26 : 38;
      out.push(P(0, 300, O(x1, y, 5, 5, 1), O(x1 + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 3, 3, 0), i % 2 ? "#8a5ab8" : "#2a1a38"));
    }
    return out.concat(flash(0, x1, y, 56, "#2a1a38", 320), ring(0, x1, y, 10, 80, "#8a5ab8", 440),
      P(40, 260, O(x1 + dir * 4, y - 10, 4, 4, 1), O(x1 + dir * 4, y - 10, 14, 14, 0), "#ffd75e", { round: true }));
  },
  // Surging Strikes: Rapid Strike Urshifu's three quick blows of water, each a splash and a ring,
  // a swirl of water round it after.
  "Surging Strikes": ({ x0, x1, y, dir, P, O, flash, ring, rnd }) => {
    const out = [P(-420, 260, O(x0 + dir * 10, y, 10, 10, 0.7), O(x1 - dir * 8, y, 16, 16, 1), "#2a8cff", { round: true, ease: "ease-in" })];
    for (const [k, at] of [[0, -180], [1, -90], [2, 0]]) {
      const yy = y + (k - 1) * 8;
      out.push(flash(at, x1, yy, 30 + k * 8, k === 2 ? "#ffffff" : "#8fd3ff", 200), ring(at, x1, yy, 8, 40 + k * 10, "#4fb4ff", 300));
      for (let i = 0; i < 3; i++) out.push(P(at, 320, O(x1, yy, 4, 4, 1), O(x1 + dir * (10 + rnd() * 18), yy - 14 + rnd() * 20, 3, 3, 0), "#8fd3ff", { round: true }));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push(P(60 + i * 30, 300, O(x1 + Math.cos(a) * 18, y + Math.sin(a) * 14, 5, 5, 1), O(x1 + Math.cos(a + 1) * 26, y + Math.sin(a + 1) * 20, 3, 3, 0), i % 2 ? "#4fb4ff" : "#ffd75e", { round: true }));
    }
    return out;
  },
  ...SIGNATURE_A, ...SIGNATURE_B, ...SIGNATURE_C, // (Gen 5-9's own moves: fx-sig-a/b/c.js)
};
