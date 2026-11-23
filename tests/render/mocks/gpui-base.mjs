import { div } from "./gpui-kit.mjs";
export const h_flex = div, v_flex = div, Popover = div;
export const HoverCard = { new: () => div() }; // (its trigger and content: chained, as any)
export const Scrollbar = { vertical: () => div() };
// A virtual list draws its first rows (Herdr calls its renderer in the layout pass).
export const v_virtual_list = (id, n, _h, _key, render) => { render({ start: 0, end: Math.min(n, 8) }); return div().id(id); };
export const Input = Object.assign(() => div(), { new: () => div() });
export class InputState { static new() { let v = ""; return { on() {}, value: () => v, set_value(x) { v = x; }, focus() {} }; } }
