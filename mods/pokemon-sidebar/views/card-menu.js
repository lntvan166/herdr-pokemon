// An agent's card, right-clicked (when Pokerdr gives it a Pokémon): the tab's own items first (as
// Herdr's menu: Rename, New tab, Close), then its Pokémon's, done by Pokerdr (shared
// "agent-card-open" { address, kind, at }: its card in the Box, its menu, another Pokémon).
// props { view: "card-menu", address, tab, space, overlay }. ↑/↓ move, Enter runs, Esc closes.
import { View, div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { run, props, closeOverlay, theme, setShared } from "herdr";
import { MenuOption, MenuLabel, Icon } from "./ui.js";

const ask = (address, kind) => setShared("agent-card-open", { address, kind, at: Date.now() });
export function cardItems(p) {
  return [
    ["Rename tab", "settings", () => run("tab.rename", { id: p.tab })],
    ["New tab", "plus", () => run("tab.new", { space: p.space })],
    ["Close tab", "closed", () => run("tab.close", { id: p.tab })],
    null, // (its Pokémon's, under a line and their label)
    ["Its card in the Box", "layers", () => ask(p.address, "box")],
    ["Its menu: items, moves…", "sliders", () => ask(p.address, "mon")],
    ["Choose another Pokémon", "tag", () => ask(p.address, "pick")],
  ];
}
export const CARD_MENU_H = 5 * 2 + 6 * 31 + 6 + 25 + 9 + 4; // (its gaps too: Close was cut) // (its six items and the line between)

export class CardMenu {
  init(_given, cx) {
    this.at = 0;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }
  choose(it) {
    closeOverlay(props()?.overlay);
    it[2]();
  }
  render(cx) {
    const t = theme();
    const list = cardItems(props() ?? {});
    const real = list.filter(Boolean);
    return v_flex().id("card-menu").track_focus(this.handle).w_full().min_h(0).p(5).gap(1).bg(t.popover).text_color(t.foreground)
      .on_key_down((e, cx) => {
        if (e.key === "down") this.at = (this.at + 1) % real.length;
        else if (e.key === "up") this.at = (this.at + real.length - 1) % real.length;
        else if (e.key === "enter") this.choose(real[this.at]);
        else if (e.key === "escape") closeOverlay(props()?.overlay);
        else return;
        cx.notify();
      })
      .children(list.flatMap((it, i) => (it
        ? [MenuOption({ id: `card-menu-${i}`, icon: it[1], label: it[0], selected: false, onClick: () => this.choose(it) })
          .when(real.indexOf(it) === this.at, (el) => el.bg(t.hover))]
        : [div().h(1).mx(6).my(4).bg(t.border), MenuLabel("Pokémon")])));
  }
}
