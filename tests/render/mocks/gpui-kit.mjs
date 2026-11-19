// gpui-kit, enough to run a view's render in Node: every element takes any builder call and
// returns itself; `when` runs its branch; handlers set on an element with an id are kept in
// `handlers` ("<id>:<event>"), so a test can click it.
export const handlers = {};
export const stats = { els: 0 };
export const lefts = {}; // "<id>": the last left(x) set on it, for where a test finds it drawn
export const tops = {}; // "<id>": the last top(y)
function mk() {
  stats.els++;
  let id = null;
  const p = new Proxy({}, {
    get(_t, k) {
      if (k === "then") return undefined;
      if (k === "when") return (c, f) => (c ? f(p) : p);
      if (k === "id") return (x) => { id = x; return p; };
      if (k === "left") return (x) => { if (id != null) lefts[id] = x; return p; };
      if (k === "top") return (y) => { if (id != null) tops[id] = y; return p; };
      if (k === "children") return (arr) => { for (const c of arr ?? []) void c; return p; };
      if (k === "on_click" || k === "on_item_click" || k === "on_mouse_down" || k === "on_hover") {
        return (...a) => { const f = a[a.length - 1]; if (id != null) handlers[`${id}:${k}${a.length > 1 ? `:${a[0]}` : ""}`] = f; return p; };
      }
      return () => p;
    },
  });
  return p;
}
export const div = () => mk();
export const image = () => mk();
export const svg = () => mk();
export class View {}
