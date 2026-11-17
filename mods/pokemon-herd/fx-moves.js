// Each move's own look (moves.js MORE_MOVES), as fx.js physicalParts and specialParts draw a
// type's first two: parts { at, ms, a, b, color, round?, ring?, ease? }, `at` from when it lands.
// PHYSICAL[name](c): its mark on the target as it lands (c: x, y its middle, g its ground, dir the
// way the blow goes). SPECIAL[name](c): fired from where it stands (c: x0 → x1 at y, from -FLY).
// `c` carries the helpers (P, O, ring, puff, flash, fly, steps, fist), its style `st` and `rnd`. Pure.

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
};
