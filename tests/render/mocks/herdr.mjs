// herdr, enough for the render tests: shared state in a Map (set by the test), props set per
// view, three agents, and a record of the overlays opened and closed.
export const store = new Map();
let P = {};
export const __setProps = (p) => { P = p; };
export const log = { closed: [], opened: [] };
export const reads = {}; // shared(key) calls, by key
export const shared = (k) => { reads[k] = (reads[k] ?? 0) + 1; const v = store.get(k); return v === undefined ? undefined : structuredClone(v); };
export const setShared = (k, v) => { store.set(k, structuredClone(v)); return null; };
const AG = [0, 1, 2].map((i) => ({ address: `t${i}`, pane: `p${i}`, tab: `tab${i}`, space_name: `space${i}`, tab_name: `tab${i}`, status: ["working", "idle", "blocked"][i], focused: i === 0 }));
export const agents = () => AG.map((a) => ({ ...a }));
export const terminals = () => AG.map((a) => ({ address: a.address, cwd: `/tmp/proj${a.address}` }));
export const spaces = () => [{ id: "s0", name: "space0", tabs: AG.map((a) => ({ id: a.tab, name: a.tab_name, named: false, changed_at: Date.now() - 1000 })) }];
export const theme = () => ({ chrome: "#1e1e1e", surface: "#222222", panel: "#1a1a1a", foreground: "#fff", muted: "#999", dim: "#666", border: "#333", blocked: "#f00", done: "#0f0", idle: "#888", working: "#08f", popover: "#111", accent: "#0af", raised: "#333", hover: "#222", selected: "#123", solid: "#fff", solid_foreground: "#000", background: "#000" });
export const settings = () => ({ zoom: 1 });
export const props = () => P;
export const layout = () => ({});
export const run = () => null, playSound = () => null, setAgentOrder = () => null;
export const openOverlay = (o) => { log.opened.push(o); return null; };
export const closeOverlay = (id) => { log.closed.push(id); return null; };
export const nextCommand = () => new Promise(() => {});
export const readTextFile = async () => null;
export const appHome = () => process.env.POKEMON_TEST_HOME ?? "/nonexistent-pokemon-test-home";
export const exec = async () => ({ code: 1, stdout: "", stderr: "test" });
export const window = () => ({ platform: "linux" });
