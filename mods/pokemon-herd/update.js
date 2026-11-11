// Is there a newer release on GitHub? An installed copy never updates by itself, so once a day the
// strip reads id.js from the repo and compares its VERSION with this one's. Pure.

// Versions are semver ("1.2.3"). Before 1.0.0 they were dates ("2026.11.11.4"); id.js keeps one
// such date in a comment ahead of the real one, which copies from then read first and find newer.

// The semver VERSION an id.js exports, or null (a date-style one counts as none).
export const versionIn = (text) => /export const VERSION\s*=\s*"(\d{1,3}\.\d+\.\d+)"/.exec(String(text ?? ""))?.[1] ?? null;

const SEMVER = /^\d{1,3}\.\d+\.\d+$/; // a date ("2026.11.12") has a four-digit first part

// remote is newer than local: major, then minor, then patch. Anything not semver (a date cached
// from before 1.0.0) is never newer.
export function isNewer(remote, local) {
  if (!SEMVER.test(remote ?? "") || !SEMVER.test(local ?? "")) return false;
  const [a, b] = [remote, local].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}
