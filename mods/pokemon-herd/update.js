// Is there a newer release on GitHub? An installed copy never updates by itself, so once a day the
// strip reads id.js from the repo and compares its VERSION with this one's. Pure.

// The VERSION in the text of an id.js, or null.
export const versionIn = (text) => /VERSION\s*=\s*"(\d+(?:\.\d+)*)"/.exec(String(text ?? ""))?.[1] ?? null;

// remote is newer than local, comparing each dotted number in turn.
export function isNewer(remote, local) {
  if (!remote || !local) return false;
  const [a, b] = [remote, local].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}
