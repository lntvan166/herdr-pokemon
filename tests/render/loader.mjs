// Node module hooks for the render tests: "gpui-kit", "gpui-base" and "herdr" (the host's
// modules, only inside Herdr) resolve to the stand-ins in ./mocks.
const M = new URL("./mocks/", import.meta.url);
export async function resolve(spec, ctx, next) {
  if (spec === "./dev.js") throw new Error("dev.js is this machine's only, never in tests");
  if (spec === "gpui-kit" || spec === "gpui-base" || spec === "herdr") return { url: new URL(`${spec}.mjs`, M).href, shortCircuit: true };
  return next(spec, ctx);
}
