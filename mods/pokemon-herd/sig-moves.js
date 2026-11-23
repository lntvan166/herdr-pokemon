// More Pokémon's own moves (moves.js EXCLUSIVE, merged): Gen 5-9 signature moves, as the games'
// (PokeAPI: type, power, accuracy, who learns it). `dex`: every form of those; `keys`: only these
// fighter keys ("646f0001": Black Kyurem; "646": Kyurem itself, no form). `acc`: its accuracy (null:
// never misses). Rules as the games': `crit` "high" (1 in 8); `seBoost` (×4/3 when super effective:
// Collision Course, Electro Drift); `fickle` (1 in 3 twice as strong: Fickle Beam); `sun` (×1.5 in
// the sun: Hydro Steam). A multi-hit one: all its hits' power (Dragon Darts 2 × 50).
// Left out: Ruination (half its health, not a power), Glacial Lance (no Ice Rider Calyrex here),
// Victory Dance and Jungle Healing (no damage), and those many learn (Sacred Sword, Wave Crash…).
export const SIG_MOVES = {
  "Bolt Beak": { type: "electric", power: 85, physical: true, dex: [880, 881], acc: 100 },
  "Fishious Rend": { type: "water", power: 85, physical: true, dex: [882, 883], acc: 100 },
  "Aura Wheel": { type: "electric", power: 110, physical: true, dex: [877], acc: 100 },
  "Double Iron Bash": { type: "steel", power: 120, physical: true, dex: [809], acc: 100 },
  "Plasma Fists": { type: "electric", power: 100, physical: true, dex: [807], acc: 100 },
  "Multi-Attack": { type: "normal", power: 120, physical: true, dex: [773], acc: 100 },
  "Zing Zap": { type: "electric", power: 80, physical: true, dex: [777, 871], acc: 100 },
  "Core Enforcer": { type: "dragon", power: 100, physical: false, dex: [718], acc: 100 },
  "Land's Wrath": { type: "ground", power: 90, physical: true, dex: [718], acc: 100 },
  "Diamond Storm": { type: "rock", power: 100, physical: true, dex: [719], acc: 95 },
  "Fleur Cannon": { type: "fairy", power: 130, physical: false, dex: [801], acc: 90 },
  "Light of Ruin": { type: "fairy", power: 140, physical: false, dex: [670], keys: ["670f0005"], acc: 90 },
  "Fusion Bolt": { type: "electric", power: 100, physical: true, dex: [644, 646], keys: ["644", "646f0001"], acc: 100 },
  "Fusion Flare": { type: "fire", power: 100, physical: false, dex: [643, 646], keys: ["643", "646f0002"], acc: 100 },
  "Glaciate": { type: "ice", power: 65, physical: false, dex: [646], keys: ["646"], acc: 95 },
  "Freeze Shock": { type: "ice", power: 140, physical: true, dex: [646], keys: ["646f0001"], acc: 90 },
  "Ice Burn": { type: "ice", power: 140, physical: false, dex: [646], keys: ["646f0002"], acc: 90 },
  "Searing Shot": { type: "fire", power: 100, physical: false, dex: [494], acc: 100 },
  "Magma Storm": { type: "fire", power: 100, physical: false, dex: [485], acc: 75 },
  "Mist Ball": { type: "psychic", power: 95, physical: false, dex: [380], acc: 100 },
  "Luster Purge": { type: "psychic", power: 95, physical: false, dex: [381], acc: 100 },
  "Dragon Darts": { type: "dragon", power: 100, physical: true, dex: [887], acc: 100 },
  "Apple Acid": { type: "grass", power: 80, physical: false, dex: [842], acc: 100 },
  "Grav Apple": { type: "grass", power: 80, physical: true, dex: [841], acc: 100 },
  "Spirit Break": { type: "fairy", power: 75, physical: true, dex: [861, 1006], acc: 100 },
  "False Surrender": { type: "dark", power: 80, physical: true, dex: [860, 861], acc: null },
  "Overdrive": { type: "electric", power: 80, physical: false, dex: [849], acc: 100 },
  "Eerie Spell": { type: "psychic", power: 80, physical: false, dex: [199], keys: ["199f0001"], acc: 100 },
  "Dragon Energy": { type: "dragon", power: 150, physical: false, dex: [895], acc: 100 },
  "Thunderous Kick": { type: "fighting", power: 90, physical: true, dex: [145], keys: ["145f0001"], acc: 100 },
  "Fiery Wrath": { type: "dark", power: 90, physical: false, dex: [146], keys: ["146f0001"], acc: 100 },
  "Freezing Glare": { type: "psychic", power: 90, physical: false, dex: [144], keys: ["144f0001"], acc: 100 },
  "Rage Fist": { type: "ghost", power: 100, physical: true, dex: [57, 979], acc: 100 }, // (50, +50 a hit taken: as after one)
  "Armor Cannon": { type: "fire", power: 120, physical: false, dex: [936], acc: 100 },
  "Bitter Blade": { type: "fire", power: 90, physical: true, dex: [937], acc: 100 },
  "Collision Course": { type: "fighting", power: 100, physical: true, dex: [1007], acc: 100, seBoost: true },
  "Electro Drift": { type: "electric", power: 100, physical: false, dex: [1008], acc: 100, seBoost: true },
  "Ivy Cudgel": { type: "grass", power: 100, physical: true, dex: [1017], acc: 100, crit: "high" },
  "Blood Moon": { type: "normal", power: 140, physical: false, dex: [901], keys: ["901f0001"], acc: 100 },
  "Make It Rain": { type: "steel", power: 120, physical: false, dex: [1000], acc: 100 },
  "Tera Starstorm": { type: "normal", power: 120, physical: false, dex: [1024], acc: 100 },
  "Gigaton Hammer": { type: "steel", power: 160, physical: true, dex: [959], acc: 100 },
  "Salt Cure": { type: "rock", power: 40, physical: true, dex: [933, 934], acc: 100 },
  "Population Bomb": { type: "normal", power: 120, physical: true, dex: [924, 925], acc: 90 }, // (up to 10 × 20)
  "Spin Out": { type: "steel", power: 100, physical: true, dex: [965, 966], acc: 100 },
  "Order Up": { type: "dragon", power: 80, physical: true, dex: [977], acc: 100 },
  "Esper Wing": { type: "psychic", power: 80, physical: false, dex: [628], keys: ["628f0001"], acc: 100, crit: "high" },
  "Ceaseless Edge": { type: "dark", power: 65, physical: true, dex: [503], keys: ["503f0001"], acc: 90, crit: "high" },
  "Chloroblast": { type: "grass", power: 150, physical: false, dex: [101], keys: ["101f0001"], acc: 95 },
  "Mountain Gale": { type: "ice", power: 100, physical: true, dex: [713], keys: ["713f0001"], acc: 85 },
  "Bitter Malice": { type: "ghost", power: 75, physical: false, dex: [570, 571], keys: ["570f0001", "571f0001"], acc: 100 },
  "Infernal Parade": { type: "ghost", power: 60, physical: false, dex: [157], keys: ["157f0001"], acc: 100 },
  "Mystical Power": { type: "psychic", power: 70, physical: false, dex: [480, 481, 482], acc: 90 },
  "Triple Arrows": { type: "fighting", power: 90, physical: true, dex: [724], keys: ["724f0001"], acc: 100, crit: "high" },
  "Springtide Storm": { type: "fairy", power: 100, physical: false, dex: [905], acc: 80 },
  "Bleakwind Storm": { type: "flying", power: 100, physical: false, dex: [641], acc: 80 },
  "Wildbolt Storm": { type: "electric", power: 100, physical: false, dex: [642], acc: 80 },
  "Sandsear Storm": { type: "ground", power: 100, physical: false, dex: [645], acc: 80 },
  "Psyshield Bash": { type: "psychic", power: 70, physical: true, dex: [234, 899], acc: 90 },
  "Barb Barrage": { type: "poison", power: 60, physical: true, dex: [211, 904], acc: 100 },
  "Dire Claw": { type: "poison", power: 80, physical: true, dex: [903], acc: 100, crit: "high" },
  "Prismatic Laser": { type: "psychic", power: 160, physical: false, dex: [800], acc: 100 },
  "Shadow Bone": { type: "ghost", power: 85, physical: true, dex: [105], keys: ["105f0001"], acc: 100 },
  "Crush Grip": { type: "normal", power: 120, physical: true, dex: [486], acc: 100 }, // (at its full health)
  "Hydro Steam": { type: "water", power: 80, physical: false, dex: [1009], acc: 100, sun: true },
  "Psyblade": { type: "psychic", power: 80, physical: true, dex: [1010], acc: 100 },
  "Matcha Gotcha": { type: "grass", power: 80, physical: false, dex: [1013], acc: 90 },
  "Syrup Bomb": { type: "grass", power: 60, physical: false, dex: [1011, 1019], acc: 85 },
  "Thunderclap": { type: "electric", power: 70, physical: false, dex: [1021], acc: 100 },
  "Fickle Beam": { type: "dragon", power: 80, physical: false, dex: [1019], acc: 100, fickle: true },
  "Strange Steam": { type: "fairy", power: 90, physical: false, dex: [110], keys: ["110f0001"], acc: 95 },
  "Meteor Assault": { type: "fighting", power: 150, physical: true, dex: [865], acc: 100 },
};
// What they do besides, as the games' (spar.js SIDE_EFFECTS): the other's stat −1, a status, a flinch.
export const SIG_SIDE = {
  "Zing Zap": ["flinch", 0.3], "Double Iron Bash": ["flinch", 0.3], "Fiery Wrath": ["flinch", 0.2], "Mountain Gale": ["flinch", 0.3],
  "Searing Shot": ["brn", 0.3], "Freeze Shock": ["par", 0.3], "Ice Burn": ["brn", 0.3], "Freezing Glare": ["frz", 0.1],
  "Infernal Parade": ["brn", 0.3], "Sandsear Storm": ["brn", 0.2], "Wildbolt Storm": ["par", 0.2], "Matcha Gotcha": ["brn", 0.2],
  "Barb Barrage": ["psn", 0.5], "Dire Claw": ["psn", 0.5],
  "Thunderous Kick": ["def", 1], "Glaciate": ["spe", 1], "Apple Acid": ["spd", 1], "Grav Apple": ["def", 1], "Spirit Break": ["spa", 1],
  "Mist Ball": ["spa", 0.5], "Luster Purge": ["spd", 0.5], "Shadow Bone": ["def", 0.2], "Bitter Malice": ["atk", 1], "Syrup Bomb": ["spe", 1],
  "Bleakwind Storm": ["spe", 0.3], "Springtide Storm": ["atk", 0.3], "Triple Arrows": ["def", 0.5],
};
// Its own stats, as it strikes (move-stages.js SELF_STAGES): [chance, [[stat, by]]].
export const SIG_SELF = {
  "Aura Wheel": [1, [["spe", 1]]], "Diamond Storm": [0.5, [["def", 2]]], "Fleur Cannon": [1, [["spa", -2]]],
  "Make It Rain": [1, [["spa", -1]]], "Armor Cannon": [1, [["def", -1], ["spd", -1]]], "Spin Out": [1, [["spe", -2]]],
  "Esper Wing": [1, [["spe", 1]]], "Mystical Power": [1, [["spa", 1]]], "Psyshield Bash": [1, [["def", 1]]],
};
export const SIG_RECOIL = { "Light of Ruin": 0.5 };
export const SIG_DRAIN = { "Bitter Blade": 0.5, "Matcha Gotcha": 0.5 };
