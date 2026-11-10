// What each species has done: jobs finished, time spent working, its longest job. Counted per
// species (two agents that are both Pikachu add to Pikachu's), so closing a pane loses nothing.
// Kept in shared state as { v: 1, species: { <dex>: { jobs, ms, longest } } }.

// Its agent went from `prev` to `next` at `now`. `run` is that agent's job in progress
// ({ since: when it last started working, taskMs: work so far in this job }). Returns the new run
// and what to add: `ms` worked, `job` 1 when a job just finished, `task` that job's whole time.
// Waiting on you (blocked) pauses a job; done or idle after some work ends it.
export function statusChange(run, prev, next, now) {
  const r = { since: run?.since ?? null, taskMs: run?.taskMs ?? 0 };
  let ms = 0;
  if (prev === "working" && next !== "working" && r.since !== null) {
    ms = Math.max(0, now - r.since);
    r.taskMs += ms;
    r.since = null;
  }
  if (next === "working" && prev !== "working") r.since = now;
  let job = 0, task = 0;
  if ((next === "done" || next === "idle") && r.taskMs > 0) {
    job = 1;
    task = r.taskMs;
    r.taskMs = 0;
  }
  return { run: r, ms, job, task };
}

const count = (v) => (Number.isFinite(v) && v >= 0 ? v : null);

export function loadStats(raw) {
  const species = {};
  if (raw && raw.v === 1 && raw.species && typeof raw.species === "object") {
    for (const [dex, s] of Object.entries(raw.species)) {
      if (!s || typeof s !== "object") continue;
      const [jobs, ms, longest] = [count(s.jobs), count(s.ms), count(s.longest)];
      if (jobs === null || ms === null) continue;
      species[dex] = { jobs, ms, longest: longest ?? 0 };
    }
  }
  return { v: 1, species };
}

// The stats with one change from statusChange added to species `dex`.
export function record(stats, dex, { ms, job, task }) {
  const s = stats.species[dex] ?? { jobs: 0, ms: 0, longest: 0 };
  const next = { jobs: s.jobs + job, ms: s.ms + ms, longest: Math.max(s.longest, task) };
  return { ...stats, species: { ...stats.species, [dex]: next } };
}

// Totals, and the `n` species with the most jobs.
export function summary(stats, n) {
  const all = Object.entries(stats.species).map(([dex, s]) => ({ dex: Number(dex), ...s }));
  return {
    jobs: all.reduce((t, s) => t + s.jobs, 0),
    ms: all.reduce((t, s) => t + s.ms, 0),
    top: all.filter((s) => s.jobs > 0).sort((a, b) => b.jobs - a.jobs || b.ms - a.ms).slice(0, n),
  };
}

export function duration(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "<1m";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// "128 done · 14h 20m", or "" before its first job.
export const statLine = (s) => (s && (s.jobs || s.ms) ? `${s.jobs} done · ${duration(s.ms)}` : "");
