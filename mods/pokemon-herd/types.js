// Each species' first type (PokeAPI, slot 1), one letter per national dex number from #1, in
// the order of TYPES: what its special move throws when it spars.
export const TYPES = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const CODES = "dddbbbcccllllllaaaaaaahheeiihhhhhhrrbbaahhdddlllliiaaccggbbccckkkgggdddccmmmbbcceeaaacchhccnnnmkkcceeddiiggahhiiadaccccccklfeblacccaacebammmmmafeboookkdddbbbcccaaaallllhccerarrkkeeedccmcdddaddlcckppcnkkallaiqrrclllpaabbffcccfcqppciiaaaggfebaaebcmmmkbkdddbbbcccppaalllllcccdddaacckkkllddaaalllaaaggamaapqqqqggeeeelldhhccccbbbkkaiiiddaoahmmcccciimmmmccaannnndkpkfffffcccccoooqqqmfqoocioqkdddbbbcccaaaaalleeeddmmmmllllleccddccannaanpaakhhqqmkaanoooaggiihhhhdcccddpeaidebrldfifakmnfekkkqcbankccpdakdddbbbcccaaaaappddbbcckkaaaeemmmkkiiagggcccggllllllddddciiibbdllppknnccmmhhppaakkkkkkccfffaaellddcccllddqqqeeekknnnoooffflliggoiippaaappblpppllqmdjeooiocaldddbbbcccaaabblllbbrrrddggakkqqqrrrrppmmhhcceemmmmrgemoooqnnnnffjjrpomkbdddbbbcccaaaaalllggbllmmchhiiccddddhhaadddragllnncaamabencanoooekdckkkkmlleqdpkqghhmbeqqdddbbbcccaajjjlllppddaacceemmmdddiijcceebbggnnkkkppppqngfirrgeffmfkeqqeeccqooorghggpeofnkalicgprdddbbbcccaalllleeeaarrdddammmbbbeeeepphhddiimddllkkrrrccjccqqoqmmnnjffccoghaapirdnleifgpbmooonqpppporgecddddhhhdqdbemqah";

export const typeOf = (dex) => TYPES[(CODES.charCodeAt(Number(dex) - 1) || 97) - 97] ?? "normal";

export const TYPE_ICON = {
  normal: "⭐", fire: "🔥", water: "💧", grass: "🍃", electric: "⚡", ice: "❄️", fighting: "👊", poison: "☠️", ground: "⛰️",
  flying: "🌪️", psychic: "🔮", bug: "🕸️", rock: "🪨", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "✨",
};
