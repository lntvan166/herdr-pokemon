// Keeps the strip alive: one agent's update throwing must not stop the others, nor the timer.
import { MOD } from "./id.js";

const QUIET = 60000; // the same message is logged at most once a minute

// Logs `err` unless the same message was logged less than a minute ago.
export function logOnce(err, log, now, seen) {
  const key = String(err?.message ?? err); // keyed by message: stacks differ per call site
  const last = seen.get(key);
  if (last !== undefined && now - last < QUIET) return;
  seen.set(key, now);
  log(`${MOD}: ${err?.stack ?? key}`);
}

// Runs fn on each item, catching and logging a throw; returns how many threw.
export function forEachSafe(items, fn, log, now, seen) {
  let fails = 0;
  items.forEach((item, i) => {
    try {
      fn(item, i);
    } catch (e) {
      fails++;
      logOnce(e, log, now, seen);
    }
  });
  return fails;
}
