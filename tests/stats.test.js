import { test } from "node:test";
import assert from "node:assert/strict";
import { statusChange, record, loadStats, summary, duration, statLine } from "../mods/pokemon-herd/stats.js";

test("a working stretch ending in done is one job with its time", () => {
  let c = statusChange({}, undefined, "working", 1000);
  c = statusChange(c.run, "working", "done", 61000);
  assert.deepEqual([c.ms, c.job, c.task], [60000, 1, 60000]);
});

test("blocked pauses a job: its time counts, the job ends later", () => {
  let c = statusChange({}, "idle", "working", 0);
  c = statusChange(c.run, "working", "blocked", 30000);
  assert.deepEqual([c.ms, c.job], [30000, 0]);
  c = statusChange(c.run, "blocked", "working", 90000); // waiting on you is not work
  c = statusChange(c.run, "working", "idle", 100000);
  assert.deepEqual([c.ms, c.job, c.task], [10000, 1, 40000]);
});

test("idle to done without work is no job", () => {
  const c = statusChange({}, "idle", "done", 5);
  assert.deepEqual([c.ms, c.job], [0, 0]);
});

test("record adds up per species: two agents of one species share it", () => {
  let s = loadStats(null);
  s = record(s, 25, { ms: 60000, job: 1, task: 60000 });
  s = record(s, 25, { ms: 120000, job: 1, task: 120000 });
  s = record(s, 4, { ms: 1000, job: 0, task: 0 });
  assert.deepEqual(s.species["25"], { jobs: 2, ms: 180000, longest: 120000 });
  assert.deepEqual(s.species["4"], { jobs: 0, ms: 1000, longest: 0 });
});

test("loadStats drops malformed entries", () => {
  const s = loadStats({ v: 1, species: { 25: { jobs: 3, ms: 10, longest: 5 }, 4: "x", 7: { jobs: -1, ms: "a" } } });
  assert.deepEqual(s, { v: 1, species: { 25: { jobs: 3, ms: 10, longest: 5 } } });
  assert.deepEqual(loadStats({ v: 9 }), { v: 1, species: {} });
});

test("summary totals and ranks by jobs", () => {
  const s = { v: 1, species: { 25: { jobs: 5, ms: 100, longest: 1 }, 4: { jobs: 9, ms: 50, longest: 1 }, 7: { jobs: 1, ms: 1, longest: 1 }, 1: { jobs: 2, ms: 1, longest: 1 } } };
  const r = summary(s, 3);
  assert.equal(r.jobs, 17);
  assert.equal(r.ms, 152);
  assert.deepEqual(r.top.map((x) => x.dex), [4, 25, 1]);
});

test("duration reads as hours and minutes", () => {
  assert.equal(duration(30000), "<1m");
  assert.equal(duration(35 * 60000), "35m");
  assert.equal(duration((14 * 60 + 20) * 60000), "14h 20m");
  assert.equal(duration(3 * 3600000), "3h");
});

test("statLine: jobs and time, or nothing yet", () => {
  assert.equal(statLine({ jobs: 128, ms: (14 * 60 + 20) * 60000 }), "128 done · 14h 20m");
  assert.equal(statLine({ jobs: 1, ms: 60000 }), "1 done · 1m");
  assert.equal(statLine(undefined), "");
});
