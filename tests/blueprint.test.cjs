"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const BLUEPRINT = require(path.join(__dirname, "..", "app", "data", "blueprint.js"));
const TOPICS = require(path.join(__dirname, "..", "app", "data", "topics.js"));

function slotCount(slots) {
  return Object.values(slots).reduce((a, b) => a + b, 0);
}
function slotPoints(slots) {
  return Object.entries(slots).reduce((sum, [pts, cnt]) => sum + Number(pts) * cnt, 0);
}

test("(1) 과목 count 합 100, points 합 1000", () => {
  const countSum = BLUEPRINT.subjects.reduce((a, s) => a + s.count, 0);
  const pointsSum = BLUEPRINT.subjects.reduce((a, s) => a + s.points, 0);
  assert.equal(countSum, 100);
  assert.equal(pointsSum, 1000);
});

test("(2) 각 과목 슬롯 합 = mcq/short 수, 슬롯 배점 합 = 과목 points", () => {
  for (const s of BLUEPRINT.subjects) {
    assert.equal(slotCount(s.slots.mcq), s.mcq, `subject ${s.id} mcq slot count`);
    assert.equal(slotCount(s.slots.short), s.short, `subject ${s.id} short slot count`);
    const totalPoints = slotPoints(s.slots.mcq) + slotPoints(s.slots.short);
    assert.equal(totalPoints, s.points, `subject ${s.id} slot points sum`);
  }
});

test("(3) pass_points = points × 0.4", () => {
  for (const s of BLUEPRINT.subjects) {
    assert.equal(s.pass_points, Math.round(s.points * BLUEPRINT.exam.pass_ratio));
  }
});

test("(4) 전체 슬롯 8점 56 · 12점 40 · 18점 4", () => {
  let p8 = 0, p12 = 0, p18 = 0;
  for (const s of BLUEPRINT.subjects) {
    p8 += s.slots.mcq["8"] + s.slots.short["8"];
    p12 += s.slots.mcq["12"] + s.slots.short["12"];
    p18 += s.slots.mcq["18"] + s.slots.short["18"];
  }
  assert.equal(p8, 56);
  assert.equal(p12, 40);
  assert.equal(p18, 4);
});

test("(5) topics 세부항목 exp_q 과목 합 = 10/25/25/40, exp_short 합 = 3/5/0/12", () => {
  const expected_q = { 1: 10, 2: 25, 3: 25, 4: 40 };
  const expected_short = { 1: 3, 2: 5, 3: 0, 4: 12 };
  const sums = {};
  for (const t of TOPICS) {
    if (t.kind !== "sub") continue;
    sums[t.subject] = sums[t.subject] || { q: 0, s: 0 };
    sums[t.subject].q += t.exp_q;
    sums[t.subject].s += t.exp_short;
  }
  for (const subj of [1, 2, 3, 4]) {
    assert.equal(sums[subj].q, expected_q[subj], `subject ${subj} exp_q sum`);
    assert.equal(sums[subj].s, expected_short[subj], `subject ${subj} exp_short sum`);
  }
});

test("(6) 모든 sub의 parent가 존재, id 중복 없음", () => {
  const ids = TOPICS.map((t) => t.id);
  const idSet = new Set(ids);
  assert.equal(idSet.size, ids.length, "id 중복 없어야 함");
  for (const t of TOPICS) {
    if (t.kind !== "sub") continue;
    assert.ok(t.parent, `${t.id} has parent field`);
    assert.ok(idSet.has(t.parent), `${t.id}의 parent ${t.parent} 가 존재해야 함`);
  }
});

test("(7) diagnostic 합 30, short 합 6", () => {
  const total = Object.values(BLUEPRINT.diagnostic.by_subject).reduce((a, b) => a + b, 0);
  const shortTotal = Object.values(BLUEPRINT.diagnostic.short_by_subject).reduce((a, b) => a + b, 0);
  assert.equal(total, 30);
  assert.equal(BLUEPRINT.diagnostic.total, 30);
  assert.equal(shortTotal, 6);
});
