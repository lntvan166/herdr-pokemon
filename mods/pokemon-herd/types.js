// Each species' first type (PokeAPI, slot 1), one letter per national dex number from #1, in
// the order of TYPES: what its special move throws when it spars.
export const TYPES = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const CODES = "dddbbbcccllllllaaaaaaahheeiihhhhhhrrbbaahhdddlllliiaaccggbbccckkkgggdddccmmmbbcceeaaacchhccnnnmkkcceeddiiggahhiiadaccccccklfeblacccaacebammmmmafeboookkdddbbbcccaaaallllhccerarrkkeeedccmcdddaddlcckppcnkkallaiqrrclllpaabbffcccfcqppciiaaaggfebaaebcmmmkbkdddbbbcccppaalllllcccdddaacckkkllddaaalllaaaggamaapqqqqggeeeelldhhccccbbbkkaiiiddaoahmmcccciimmmmccaannnndkpkfffffcccccoooqqqmfqoocioqkdddbbbcccaaaaalleeeddmmmmllllleccddccannaanpaakhhqqmkaanoooaggiihhhhdcccddpeaidebrldfifakmnfekkkqcbankccpdakdddbbbcccaaaaappddbbcckkaaaeemmmkkiiagggcccggllllllddddciiibbdllppknnccmmhhppaakkkkkkccfffaaellddcccllddqqqeeekknnnoooffflliggoiippaaappblpppllqmdjeooiocaldddbbbcccaaabblllbbrrrddggakkqqqrrrrppmmhhcceemmmmrgemoooqnnnnffjjrpomkbdddbbbcccaaaaalllggbllmmchhiiccddddhhaadddragllnncaamabencanoooekdckkkkmlleqdpkqghhmbeqqdddbbbcccaajjjlllppddaacceemmmdddiijcceebbggnnkkkppppqngfirrgeffmfkeqqeeccqooorghggpeofnkalicgprdddbbbcccaalllleeeaarrdddammmbbbeeeepphhddiimddllkkrrrccjccqqoqmmnnjffccoghaapirdnleifgpbmooonqpppporgecddddhhhdqdbemqah";

export const typeOf = (dex) => TYPES[(CODES.charCodeAt(Number(dex) - 1) || 97) - 97] ?? "normal";

export const TYPE_ICON = {
  normal: "⭐", fire: "🔥", water: "💧", grass: "🍃", electric: "⚡", ice: "❄️", fighting: "👊", poison: "☠️", ground: "⛰️",
  flying: "🌪️", psychic: "🔮", bug: "🕸️", rock: "🪨", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "✨",
};

// Each type's colour, as the games' type badges (and its text: dark on the light ones).
export const TYPE_COLOR = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", grass: "#7ac74c", electric: "#f7d02c", ice: "#96d9d6",
  fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a",
  rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc", dark: "#705746", steel: "#b7b7ce", fairy: "#d685ad",
};
const LIGHT = new Set(["normal", "electric", "ice", "ground", "steel", "grass", "bug", "rock"]);
export const typeText = (t) => (LIGHT.has(t) ? "#1d1d1f" : "#ffffff");
export const typeLabel = (t) => t[0].toUpperCase() + t.slice(1);
