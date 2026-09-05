"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../app/core.js");

/* ------------------------------------------------------------------ *
 * 픽스처: blueprint 리터럴(Task 3의 app/data/blueprint.js와 같은 형태).
 * 테스트가 Task 3 완료 여부에 의존하지 않도록 파일을 require 하지 않고 복사해 둔다.
 * ------------------------------------------------------------------ */
const BP = {
  exam: {
    round: 12, date: "2026-09-19", start: "10:00", minutes: 120,
    total_points: 1000, pass_total: 600, pass_ratio: 0.4,
    mcq_range: [1, 80], short_range: [81, 100], choices: 5, asof: "2026-09-05",
    source: "대한상공회의소 2024 문항유형 및 배점기준"
  },
  subjects: [
    { id: 1, name: "화장품법의 이해", short_name: "화장품법", mcq: 7, short: 3, count: 10, points: 100, pass_points: 40,
      slots: { mcq: { "8": 3, "12": 4, "18": 0 }, short: { "8": 2, "12": 1, "18": 0 } } },
    { id: 2, name: "화장품 제조 및 품질관리", short_name: "제조·품질", mcq: 20, short: 5, count: 25, points: 250, pass_points: 100,
      slots: { mcq: { "8": 11, "12": 8, "18": 1 }, short: { "8": 3, "12": 2, "18": 0 } } },
    { id: 3, name: "유통 화장품 안전관리", short_name: "유통 안전", mcq: 25, short: 0, count: 25, points: 250, pass_points: 100,
      slots: { mcq: { "8": 14, "12": 10, "18": 1 }, short: { "8": 0, "12": 0, "18": 0 } } },
    { id: 4, name: "맞춤형화장품의 이해", short_name: "맞춤형", mcq: 28, short: 12, count: 40, points: 400, pass_points: 160,
      slots: { mcq: { "8": 15, "12": 12, "18": 1 }, short: { "8": 8, "12": 3, "18": 1 } } }
  ],
  points_meaning: { "8": "개념·정의 확인", "12": "적용·비교·절차", "18": "여러 근거 결합 사례 판단" },
  diagnostic: {
    total: 30,
    by_subject: { "1": 3, "2": 8, "3": 7, "4": 12 },
    short_by_subject: { "1": 1, "2": 1, "3": 0, "4": 4 },
    difficulty_mix: { "2": 0.3, "3": 0.5, "4": 0.2 }
  },
  bank_target: { "1": 50, "2": 125, "3": 125, "4": 200 }
};

/* 문항 픽스처 헬퍼 */
function mcq(over) {
  return Object.assign({
    id: "Q-T-001", subject: 1, topic: "1.1.1", level: "D", type: "mcq", qtype: "pick_correct",
    points: 8, difficulty: 2, importance: "M", vg: null,
    stem: "다음 중 옳은 것은?", choices: ["①", "②", "③", "④", "⑤"], answer: 0, shuffle: false,
    answer_text: null, blanks: null, grade: "exact", strict_term: false, unit: null,
    number_tolerance: 0, near_miss: [],
    explanation: "근거", wrong_option_explanations: ["a", "b", "c", "d", "e"],
    key_concept: "개념", memory_sentence: "한 줄 암기", trap: "함정",
    source: { law: "화장품법 제2조", guide: null, asof: "2026-09", confidence: "high" },
    law_effective_date: null, cards: ["C-T-01"], tags: [], verified: true,
    verified_by: null, verified_at: null, history: []
  }, over || {});
}
function short(over) {
  return mcq(Object.assign({
    id: "Q-T-S01", type: "short", qtype: "term", choices: [], answer: null,
    answer_text: ["페녹시에탄올"], wrong_option_explanations: null
  }, over || {}));
}

/* 시도 픽스처 */
function att(over) {
  return Object.assign({
    qid: "Q-T-001", at: "2026-09-05T10:00:00", mode: "study", sid: "s1",
    given: 0, correct: true, sec: 30, conf: 2, why: null, self_marked: false, near_miss: false
  }, over || {});
}

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-9), `${a} ≈ ${b} 아님`);

/* ================================================================== *
 * 1. 날짜
 * ================================================================== */
test("today()는 로컬 기준 YYYY-MM-DD를 만든다", () => {
  assert.equal(C.today(new Date(2026, 8, 5, 23, 30)), "2026-09-05");
  assert.equal(C.today(new Date(2026, 0, 1, 0, 0)), "2026-01-01");
  assert.match(C.today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("addDays()는 월·연 경계를 넘는다", () => {
  assert.equal(C.addDays("2026-09-05", 1), "2026-09-06");
  assert.equal(C.addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(C.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(C.addDays("2026-09-01", -1), "2026-08-31");
  assert.equal(C.addDays("2026-09-05", 0), "2026-09-05");
});

test("daysBetween(a,b) = b − a", () => {
  assert.equal(C.daysBetween("2026-09-05", "2026-09-08"), 3);
  assert.equal(C.daysBetween("2026-09-08", "2026-09-05"), -3);
  assert.equal(C.daysBetween("2026-09-05", "2026-09-05"), 0);
  assert.equal(C.daysBetween("2026-02-28", "2026-03-01"), 1); // 2026 평년
});

test("dday(examDate, today): 시험 당일 0", () => {
  assert.equal(C.dday("2026-09-19", "2026-09-05"), 14);
  assert.equal(C.dday("2026-09-19", "2026-09-19"), 0);
  assert.equal(C.dday("2026-09-19", "2026-09-20"), -1);
});

/* ================================================================== *
 * 2. normalizeShort / SYNONYMS / levenshtein
 * ================================================================== */
test("normalizeShort: (1) 공백 전부 제거", () => {
  assert.equal(C.normalizeShort("  메틸 파라 벤  "), "메틸파라벤");
  assert.equal(C.normalizeShort("\t페녹시\n에탄올 "), "페녹시에탄올");
});

test("normalizeShort: (2)(3) 전각→반각 + 영문 소문자", () => {
  assert.equal(C.normalizeShort("ＡＢＣ１２３"), "abc123");
  assert.equal(C.normalizeShort("SPF"), "spf");
});

test("normalizeShort: (4) 중점·빗금 통일", () => {
  assert.equal(C.normalizeShort("납ㆍ니켈"), "납·니켈");
  assert.equal(C.normalizeShort("납•니켈"), "납·니켈");
  assert.equal(C.normalizeShort("㎍／g"), "㎍/g");
});

test("normalizeShort: (5) 괄호와 괄호 안 내용 제거", () => {
  assert.equal(C.normalizeShort("제조번호(식별번호)"), "제조번호");
  assert.equal(C.normalizeShort("납[Pb]"), "납");
  assert.equal(C.normalizeShort("치오글리콜산(80%)"), "치오글리콜산");
});

test("normalizeShort: (6) 끝 조사·어미 1회 제거", () => {
  assert.equal(C.normalizeShort("제조번호를"), "제조번호");
  assert.equal(C.normalizeShort("책임판매업자는"), "책임판매업자");
  assert.equal(C.normalizeShort("계면활성제이다"), "계면활성제");
  assert.equal(C.normalizeShort("보존제입니다"), "보존제");
  assert.equal(C.normalizeShort("제조번호(식별번호)를"), "제조번호");
});

test("normalizeShort: (7) 단위 통일 %·㎍/g·mg", () => {
  assert.equal(C.normalizeShort("0.5퍼센트"), "0.5%");
  assert.equal(C.normalizeShort("0.5프로"), "0.5%");
  assert.equal(C.normalizeShort("0.5％"), "0.5%");
  assert.equal(C.normalizeShort("10ug/g"), "10㎍/g");
  assert.equal(C.normalizeShort("10마이크로그램/g"), "10㎍/g");
  assert.equal(C.normalizeShort("5밀리그램"), "5mg");
});

test("normalizeShort: (8) 숫자 통일 1.0/1,000/.01", () => {
  assert.equal(C.normalizeShort("1.0"), "1");
  assert.equal(C.normalizeShort("1.00"), "1");
  assert.equal(C.normalizeShort("0.010"), "0.01");
  assert.equal(C.normalizeShort("1,000"), "1000");
  assert.equal(C.normalizeShort("1,000,000"), "1000000");
  assert.equal(C.normalizeShort(".01"), "0.01");
  assert.equal(C.normalizeShort("0.01%"), "0.01%");
});

test("normalizeShort: 빈 값·비문자열 안전", () => {
  assert.equal(C.normalizeShort(""), "");
  assert.equal(C.normalizeShort(null), "");
  assert.equal(C.normalizeShort(undefined), "");
  assert.equal(C.normalizeShort(1000), "1000");
});

test("SYNONYMS 12쌍 + applySynonyms가 두 표기를 첫 표기로 통일", () => {
  assert.ok(Array.isArray(C.SYNONYMS));
  assert.equal(C.SYNONYMS.length, 12);
  assert.deepEqual(C.SYNONYMS[0], ["메칠", "메틸"]);
  assert.equal(C.applySynonyms("메틸파라벤"), C.applySynonyms("메칠파라벤"));
  assert.equal(C.applySynonyms("에칠헥실"), C.applySynonyms("에틸헥실"));
  assert.equal(C.applySynonyms("부칠파라벤"), C.applySynonyms("부틸파라벤"));
  assert.equal(C.applySynonyms("소듐"), C.applySynonyms("나트륨"));
  assert.equal(C.applySynonyms("포타슘"), C.applySynonyms("칼륨"));
  assert.equal(C.applySynonyms("징크옥사이드"), C.applySynonyms("아연옥사이드"));
});

test("applySynonyms: 긴 표기(살리실산·이산화티타늄)가 짧은 표기(산)에 먹히지 않는다", () => {
  assert.equal(C.applySynonyms("살리실릭애씨드"), C.applySynonyms("살리실산"));
  assert.equal(C.applySynonyms("벤조익애씨드"), C.applySynonyms("벤조산"));
  assert.equal(C.applySynonyms("소르빅애씨드"), C.applySynonyms("소르빈산"));
  assert.equal(C.applySynonyms("티타늄디옥사이드"), C.applySynonyms("이산화티타늄"));
});

test("levenshtein 편집거리", () => {
  assert.equal(C.levenshtein("가나다", "가나다"), 0);
  assert.equal(C.levenshtein("가나다", "가나라"), 1);
  assert.equal(C.levenshtein("계면활성제", "게면활성제"), 1);
  assert.equal(C.levenshtein("abc", ""), 3);
  assert.equal(C.levenshtein("", ""), 0);
  assert.equal(C.levenshtein("kitten", "sitting"), 3);
});

/* ================================================================== *
 * 3. 채점 gradeShort / gradeMcq
 * ================================================================== */
test("gradeShort ①: 정확 일치 → stage 1", () => {
  const q = short({ answer_text: ["페녹시에탄올", "phenoxyethanol"] });
  const r = C.gradeShort(q, "  페녹시 에탄올 ");
  assert.equal(r.correct, true);
  assert.equal(r.stage, 1);
  assert.equal(r.nearMiss, false);
  assert.equal(r.needSelfMark, false);
  assert.equal(r.normalized, "페녹시에탄올");
  assert.equal(r.blanks, null);
  assert.equal(C.gradeShort(q, "PHENOXYETHANOL").stage, 1);
});

test("gradeShort ②: 동의어·표기 변형 → stage 2 (정답)", () => {
  const q = short({ answer_text: ["메틸파라벤"] });
  const r = C.gradeShort(q, "메칠파라벤");
  assert.equal(r.correct, true);
  assert.equal(r.stage, 2);
  assert.equal(C.gradeShort(short({ answer_text: ["소듐하이알루로네이트"] }), "나트륨하이알루로네이트").stage, 2);
});

test("gradeShort: strict_term=true면 ②를 건너뛴다", () => {
  const q = short({ answer_text: ["메틸파라벤"], strict_term: true });
  const r = C.gradeShort(q, "메칠파라벤");
  assert.equal(r.correct, false);
  assert.equal(r.stage, 3);          // 5자 이상 한글 + 편집거리 1 → 근사
  assert.equal(r.nearMiss, true);
  const r2 = C.gradeShort(short({ answer_text: ["나트륨"], strict_term: true }), "소듐");
  assert.equal(r2.stage, 4);         // 5자 미만 → 근사 판정 불가
  assert.equal(r2.needSelfMark, true);
});

test("gradeShort ③: 5자 이상 한글 편집거리 1 → stage 3, 0점", () => {
  const q = short({ answer_text: ["계면활성제"] });
  const r = C.gradeShort(q, "게면활성제");
  assert.equal(r.correct, false);
  assert.equal(r.stage, 3);
  assert.equal(r.nearMiss, true);
  assert.equal(r.needSelfMark, false);
  // 4자 이하 한글은 근사 적용 안 함
  assert.equal(C.gradeShort(short({ answer_text: ["보존제"] }), "보전제").stage, 4);
});

test("gradeShort ④: 전혀 다른 답 → stage 4, 자기 판정 필요", () => {
  const r = C.gradeShort(short({ answer_text: ["페녹시에탄올"] }), "글리세린");
  assert.equal(r.correct, false);
  assert.equal(r.stage, 4);
  assert.equal(r.needSelfMark, true);
  assert.equal(r.nearMiss, false);
});

test("gradeShort: unit이 있는데 입력에 다른 단위가 있으면 오답(stage 4)", () => {
  const q = short({ answer_text: ["0.01"], unit: "%" });
  assert.equal(C.gradeShort(q, "0.01%").correct, true);
  assert.equal(C.gradeShort(q, "0.01").correct, true);
  const r = C.gradeShort(q, "0.01mg");
  assert.equal(r.correct, false);
  assert.equal(r.stage, 4);
  assert.equal(r.needSelfMark, true);
});

test("gradeShort: blanks 2개 — 전부 맞아야 정답, 빈칸별 ○×", () => {
  const q = short({
    blanks: [{ label: "㉠", accepted: ["0.01"] }, { label: "㉡", accepted: ["0.001"] }],
    answer_text: null
  });
  const ok = C.gradeShort(q, ["0.010", " 0.001 "]);
  assert.equal(ok.correct, true);
  assert.equal(ok.blanks.length, 2);
  assert.deepEqual(ok.blanks.map(b => b.label), ["㉠", "㉡"]);
  assert.deepEqual(ok.blanks.map(b => b.ok), [true, true]);

  const partial = C.gradeShort(q, ["0.01", "0.1"]);
  assert.equal(partial.correct, false);
  assert.deepEqual(partial.blanks.map(b => b.ok), [true, false]);
  assert.equal(partial.blanks[0].stage, 1);
  assert.equal(partial.blanks[1].stage, 4);
  assert.equal(partial.stage, 4);
});

test("gradeShort: grade='set'은 순서 무관 집합 비교", () => {
  const q = short({ grade: "set", answer_text: ["납", "니켈", "비소"] });
  assert.equal(C.gradeShort(q, "비소, 납/니켈").correct, true);
  assert.equal(C.gradeShort(q, "납 니켈 비소").correct, true);
  assert.equal(C.gradeShort(q, "납, 니켈").correct, false);
  assert.equal(C.gradeShort(q, "납, 니켈, 비소, 수은").correct, false);
  assert.deepEqual(C.gradeShort(q, "비소, 납/니켈").normalized, ["비소", "납", "니켈"]);
});

test("gradeMcq: given === q.answer", () => {
  const q = mcq({ answer: 2 });
  assert.equal(C.gradeMcq(q, 2), true);
  assert.equal(C.gradeMcq(q, 1), false);
  assert.equal(C.gradeMcq(q, null), false);
  assert.equal(C.gradeMcq(q, undefined), false);
  assert.equal(C.gradeMcq(q, "2"), false);
  assert.equal(C.gradeMcq(mcq({ answer: 0 }), 0), true);
});

/* ================================================================== *
 * 4. attemptScore
 * ================================================================== */
test("attemptScore 4케이스: 오답 0 / 확실 1.0 / 애매 0.6 / 찍음 0.15", () => {
  const q = mcq();
  assert.equal(C.attemptScore(att({ correct: false, conf: 2 }), q), 0);
  assert.equal(C.attemptScore(att({ correct: true, conf: 2 }), q), 1.0);
  assert.equal(C.attemptScore(att({ correct: true, conf: 1 }), q), 0.6);
  assert.equal(C.attemptScore(att({ correct: true, conf: 0 }), q), 0.15);
});

test("attemptScore 시간 초과: 선다 >108초, 단답 >135초 → ×0.8", () => {
  const m = mcq(), s = short();
  close(C.attemptScore(att({ sec: 109 }), m), 0.8);
  assert.equal(C.attemptScore(att({ sec: 108 }), m), 1.0);
  assert.equal(C.attemptScore(att({ sec: 120 }), s), 1.0);
  close(C.attemptScore(att({ sec: 136 }), s), 0.8);
  close(C.attemptScore(att({ correct: true, conf: 1, sec: 200 }), m), 0.48);
});

test("attemptScore: self_marked면 0.15 고정(숙달 불인정)", () => {
  const q = mcq();
  assert.equal(C.attemptScore(att({ self_marked: true, conf: 2 }), q), 0.15);
  assert.equal(C.attemptScore(att({ self_marked: true, conf: 2, sec: 300 }), q), 0.15);
  assert.equal(C.attemptScore(att({ self_marked: true, correct: false }), q), 0);
});

/* ================================================================== *
 * 5. 숙달도
 * ================================================================== */
test("questionMastery: 시도 0회면 null", () => {
  assert.equal(C.questionMastery([], mcq(), "2026-09-05"), null);
  assert.equal(C.questionMastery(null, mcq(), "2026-09-05"), null);
});

test("questionMastery: 시도 1회는 상한 70", () => {
  const a = [att({ at: "2026-09-05T10:00:00", correct: true, conf: 2 })];
  assert.equal(C.questionMastery(a, mcq(), "2026-09-05"), 70);
});

test("questionMastery: 찍어서 맞히면 0.15 → 15점", () => {
  const a = [att({ at: "2026-09-05T10:00:00", correct: true, conf: 0 })];
  close(C.questionMastery(a, mcq(), "2026-09-05"), 15);
});

test("questionMastery: 최근 3회 가중 1.0/0.6/0.3, at 오름차순 정렬", () => {
  // 오래된 것부터: 오답 → 애매정답 → 확실정답  (일부러 순서를 섞어 넣는다)
  const a = [
    att({ at: "2026-09-05T12:00:00", correct: true, conf: 2 }),
    att({ at: "2026-09-03T10:00:00", correct: false, conf: 2 }),
    att({ at: "2026-09-04T10:00:00", correct: true, conf: 1 })
  ];
  // (1.0*1.0 + 0.6*0.6 + 0.3*0) / 1.9 * 100 = 71.578...
  close(C.questionMastery(a, mcq(), "2026-09-05"), (1.0 * 1.0 + 0.6 * 0.6 + 0.3 * 0) / 1.9 * 100, 1e-9);
});

test("questionMastery: 시도 2회는 상한 90, 이후 하루 5%씩 감쇠(하한 0.6)", () => {
  const a = [
    att({ at: "2026-08-31T10:00:00", correct: true, conf: 2 }),
    att({ at: "2026-08-31T11:00:00", correct: true, conf: 2 })
  ];
  close(C.questionMastery(a, mcq(), "2026-08-31"), 90);           // 100 → 상한 90
  close(C.questionMastery(a, mcq(), "2026-09-05"), 90 * 0.75);    // 5일 → ×0.75
  close(C.questionMastery(a, mcq(), "2026-09-20"), 90 * 0.6);     // 20일 → 하한 0.6
});

test("isMastered: 80 이상 + 최근 2회 정답 + 찍음 없음 + self_marked 아님", () => {
  const q = mcq();
  const good = [
    att({ at: "2026-09-03T10:00:00", correct: true, conf: 2 }),
    att({ at: "2026-09-04T10:00:00", correct: true, conf: 2 }),
    att({ at: "2026-09-05T10:00:00", correct: true, conf: 2 })
  ];
  assert.equal(C.isMastered(good, q, "2026-09-05"), true);

  const guessed = good.slice(0, 2).concat([att({ at: "2026-09-05T10:00:00", correct: true, conf: 0 })]);
  assert.equal(C.isMastered(guessed, q, "2026-09-05"), false);

  const selfMarked = good.slice(0, 2).concat([att({ at: "2026-09-05T10:00:00", correct: true, conf: 2, self_marked: true })]);
  assert.equal(C.isMastered(selfMarked, q, "2026-09-05"), false);

  const oneWrong = good.slice(0, 2).concat([att({ at: "2026-09-05T10:00:00", correct: false, conf: 2 })]);
  assert.equal(C.isMastered(oneWrong, q, "2026-09-05"), false);

  assert.equal(C.isMastered([good[0]], q, "2026-09-05"), false);  // 1회는 상한 70
  assert.equal(C.isMastered([], q, "2026-09-05"), false);
});

/* 토픽/과목 숙달용 픽스처 */
function threeGood(qid) {
  return [
    att({ qid: qid, at: "2026-09-03T10:00:00", correct: true, conf: 2 }),
    att({ qid: qid, at: "2026-09-04T10:00:00", correct: true, conf: 2 }),
    att({ qid: qid, at: "2026-09-05T10:00:00", correct: true, conf: 2 })
  ];
}

test("topicMastery: 시도 0이면 {value:null, n:0, measuring:true}", () => {
  const qs = [mcq({ id: "A", topic: "1.1.1" }), mcq({ id: "B", topic: "1.1.1" })];
  assert.deepEqual(C.topicMastery("1.1.1", qs, {}, "2026-09-05"), { value: null, n: 0, measuring: true });
});

test("topicMastery: 평균 × min(1, n/4), n<4면 measuring", () => {
  const qs = ["A", "B", "C", "D", "E"].map(id => mcq({ id: id, topic: "1.1.1" }));
  qs.push(mcq({ id: "Z", topic: "1.1.2" }));
  const two = { A: threeGood("A"), B: threeGood("B"), Z: threeGood("Z") };
  const r2 = C.topicMastery("1.1.1", qs, two, "2026-09-05");
  assert.equal(r2.n, 2);
  close(r2.value, 100 * 0.5);
  assert.equal(r2.measuring, true);

  const four = { A: threeGood("A"), B: threeGood("B"), C: threeGood("C"), D: threeGood("D") };
  const r4 = C.topicMastery("1.1.1", qs, four, "2026-09-05");
  assert.equal(r4.n, 4);
  close(r4.value, 100);
  assert.equal(r4.measuring, false);
});

test("subjectMastery: 세부항목 exp_q 가중 평균, 미시도 토픽은 20", () => {
  const topics = [
    { id: "1.1", subject: 1, kind: "major", name: "화장품법" },
    { id: "1.1.1", subject: 1, parent: "1.1", kind: "sub", name: "정의", exp_q: 2, exp_short: 1, importance: "H" },
    { id: "1.1.2", subject: 1, parent: "1.1", kind: "sub", name: "영업", exp_q: 3, exp_short: 0, importance: "H" },
    { id: "2.1.1", subject: 2, parent: "2.1", kind: "sub", name: "타과목", exp_q: 5, exp_short: 0, importance: "M" }
  ];
  const qs = ["A", "B", "C", "D"].map(id => mcq({ id: id, subject: 1, topic: "1.1.1" }));
  const byQid = { A: threeGood("A"), B: threeGood("B"), C: threeGood("C"), D: threeGood("D") };
  // 1.1.1 = 100(exp_q 2), 1.1.2 = 미시도 20(exp_q 3) → (200 + 60) / 5 = 52
  close(C.subjectMastery(1, topics, qs, byQid, "2026-09-05"), 52);
  // 아무 시도도 없으면 전부 20
  close(C.subjectMastery(1, topics, qs, {}, "2026-09-05"), 20);
  close(C.subjectMastery(2, topics, qs, byQid, "2026-09-05"), 20);
});

test("subjectMasteryDetail: UI용 measuring 플래그와 토픽별 내역", () => {
  const topics = [
    { id: "1.1.1", subject: 1, parent: "1.1", kind: "sub", name: "정의", exp_q: 2 },
    { id: "1.1.2", subject: 1, parent: "1.1", kind: "sub", name: "영업", exp_q: 3 }
  ];
  const qs = ["A", "B", "C", "D"].map(id => mcq({ id: id, subject: 1, topic: "1.1.1" }));
  const byQid = { A: threeGood("A"), B: threeGood("B"), C: threeGood("C"), D: threeGood("D") };
  const d = C.subjectMasteryDetail(1, topics, qs, byQid, "2026-09-05");
  close(d.value, 52);
  assert.equal(d.attemptedTopics, 1);
  assert.equal(d.totalTopics, 2);
  assert.equal(d.measuring, false);
  assert.equal(d.byTopic.length, 2);
  const empty = C.subjectMasteryDetail(1, topics, qs, {}, "2026-09-05");
  assert.equal(empty.measuring, true);
});

/* ================================================================== *
 * 6. 오답 단계 전이
 * ================================================================== */
const CTX = { todayStr: "2026-09-05", examDate: "2026-09-19", track: "sprint" };

test("applyAttemptToMistake: 첫 오답 → new, next = 내일", () => {
  const m = C.applyAttemptToMistake(null, att({ correct: false, conf: 2 }), mcq(), CTX);
  assert.deepEqual(m, {
    count: 1, last: "2026-09-05", stage: "new", streak: 0, next: "2026-09-06",
    interval: 1, lastWrong: "2026-09-05", guessed: 0, relapse: false, memo: ""
  });
});

test("applyAttemptToMistake: 찍어서 맞힌 것도 오답 취급, guessed 1", () => {
  const m = C.applyAttemptToMistake(null, att({ correct: true, conf: 0 }), mcq(), CTX);
  assert.equal(m.stage, "new");
  assert.equal(m.guessed, 1);
  assert.equal(m.next, "2026-09-06");
  assert.equal(m.lastWrong, "2026-09-05");
});

test("applyAttemptToMistake: new → reviewing (정답·확실)", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "new", streak: 0, next: "2026-09-05", interval: 1, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "메모" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 1);
  assert.equal(m.interval, 2);
  assert.equal(m.next, "2026-09-07");   // interval 1×2 = 2
  assert.equal(m.lastWrong, "2026-09-04");
  assert.equal(m.memo, "메모");
});

test("applyAttemptToMistake: 정답·애매는 +2일", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "new", streak: 0, next: "2026-09-05", interval: 1, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 1 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.next, "2026-09-07");
  assert.equal(m.interval, 2);
});

test("applyAttemptToMistake: reviewing → graduated (streak 2 + 마지막 오답 3일 경과 + 다른 날)", () => {
  const prev = { count: 1, last: "2026-09-03", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 2, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "graduated");
  assert.equal(m.streak, 2);
  assert.equal(m.next, null);
});

test("applyAttemptToMistake: 마지막 오답 후 3일이 안 지나면 졸업 못 한다", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 2, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 2);
  assert.equal(m.next, "2026-09-09");   // interval 2×2 = 4
  assert.equal(m.interval, 4);
});

test("applyAttemptToMistake: 두 정답이 같은 날이면 졸업 못 한다", () => {
  const prev = { count: 1, last: "2026-09-05", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 2, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 2);
});

test("applyAttemptToMistake: interval 상한 6", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 4, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.interval, 6);
  assert.equal(m.next, "2026-09-11");
});

test("applyAttemptToMistake: graduated에서 재오답 → reviewing + relapse", () => {
  const prev = { count: 2, last: "2026-09-02", stage: "graduated", streak: 3, next: null, interval: 6, lastWrong: "2026-08-28", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: false, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.relapse, true);
  assert.equal(m.count, 3);
  assert.equal(m.streak, 0);
  assert.equal(m.interval, 1);
  assert.equal(m.next, "2026-09-06");
  assert.equal(m.lastWrong, "2026-09-05");
});

test("applyAttemptToMistake: reviewing에서 오답이어도 new로 내려가지 않는다", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 2, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: false, conf: 1 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 0);
  assert.equal(m.count, 2);
  assert.equal(m.relapse, false);
});

test("applyAttemptToMistake: 스프린트 D-3 규칙 — next는 내일 이하", () => {
  const ctx = { todayStr: "2026-09-17", examDate: "2026-09-19", track: "sprint" };  // D-2
  const prev = { count: 1, last: "2026-09-16", stage: "reviewing", streak: 1, next: "2026-09-17", interval: 4, lastWrong: "2026-09-16", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), ctx);
  assert.equal(m.next, "2026-09-18");
  // D-4에서는 상한이 걸리지 않는다
  const ctx2 = { todayStr: "2026-09-15", examDate: "2026-09-19", track: "sprint" };
  const prev2 = Object.assign({}, prev, { last: "2026-09-14", lastWrong: "2026-09-14", next: "2026-09-15" });
  assert.equal(C.applyAttemptToMistake(prev2, att({ correct: true, conf: 2 }), mcq(), ctx2).next, "2026-09-21");
  // 졸업은 next를 null로 유지한다
  const ctx3 = { todayStr: "2026-09-17", examDate: "2026-09-19", track: "sprint" };
  const prev3 = { count: 1, last: "2026-09-15", stage: "reviewing", streak: 1, next: "2026-09-17", interval: 2, lastWrong: "2026-09-10", guessed: 0, relapse: false, memo: "" };
  assert.equal(C.applyAttemptToMistake(prev3, att({ correct: true, conf: 2 }), mcq(), ctx3).next, null);
});

test("applyAttemptToMistake: 원본을 변형하지 않는다(불변)", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "new", streak: 0, next: "2026-09-05", interval: 1, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const frozen = JSON.stringify(prev);
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(JSON.stringify(prev), frozen);
  assert.notEqual(m, prev);
});

test("applyAttemptToMistake: self_marked 정답은 단계를 올리지 않는다", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "new", streak: 0, next: "2026-09-05", interval: 1, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2, self_marked: true }), mcq(), CTX);
  assert.equal(m.stage, "new");
  assert.equal(m.streak, 0);
  assert.equal(m.next, "2026-09-05");
  assert.equal(C.applyAttemptToMistake(null, att({ correct: true, conf: 2, self_marked: true }), mcq(), CTX), null);
});

test("dueMistakes: graduated 제외, next ≤ 오늘, 만기일 순", () => {
  const mistakes = {
    A: { stage: "new", next: "2026-09-05" },
    B: { stage: "reviewing", next: "2026-09-04" },
    C: { stage: "reviewing", next: "2026-09-06" },
    D: { stage: "graduated", next: null },
    E: { stage: "graduated", next: "2026-09-01" },
    F: { stage: "new", next: null }
  };
  assert.deepEqual(C.dueMistakes(mistakes, "2026-09-05"), ["B", "A"]);
  assert.deepEqual(C.dueMistakes({}, "2026-09-05"), []);
  assert.deepEqual(C.dueMistakes(null, "2026-09-05"), []);
});

/* ================================================================== *
 * 7. 난수 · 세트 구성
 * ================================================================== */
test("seededRandom(mulberry32): 0~1, 같은 seed 같은 수열", () => {
  const a = C.seededRandom(42), b = C.seededRandom(42), c = C.seededRandom(43);
  const seqA = [a(), a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  seqA.forEach(v => assert.ok(v >= 0 && v < 1, `${v} 범위 밖`));
  assert.notDeepEqual(seqA, [c(), c(), c(), c(), c()]);
});

test("shuffle: 원본 불변, 원소 보존, 같은 seed 같은 순서", () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const s1 = C.shuffle(src, C.seededRandom(7));
  const s2 = C.shuffle(src, C.seededRandom(7));
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(s1, s2);
  assert.deepEqual(s1.slice().sort((x, y) => x - y), src);
  assert.notDeepEqual(s1, C.shuffle(src, C.seededRandom(8)));
});

/* 진단·학습 세트용 합성 문제은행 */
function makeBank() {
  const topics = [];
  const questions = [];
  [1, 2, 3, 4].forEach(s => {
    topics.push({ id: `${s}.1`, subject: s, kind: "major", name: `과목${s} 주요항목` });
    for (let k = 1; k <= 8; k++) {
      topics.push({
        id: `${s}.1.${k}`, subject: s, parent: `${s}.1`, kind: "sub",
        name: `과목${s} 세부${k}`, exp_q: 9 - k, exp_short: k <= 4 ? 1 : 0, importance: "M"
      });
      // 토픽마다 선다 4(난이도 2,3,4,3) + 단답 2(난이도 2,3)
      const spec = [
        { type: "mcq", difficulty: 2 }, { type: "mcq", difficulty: 3 },
        { type: "mcq", difficulty: 4 }, { type: "mcq", difficulty: 3 },
        { type: "short", difficulty: 2 }, { type: "short", difficulty: 3 }
      ];
      spec.forEach((sp, i) => {
        const base = { id: `Q-${s}-${k}-${i}`, subject: s, topic: `${s}.1.${k}`, difficulty: sp.difficulty };
        questions.push(sp.type === "mcq" ? mcq(base) : short(base));
      });
    }
  });
  return { topics, questions };
}

test("buildDiagnostic: 30문항, 과목 3/8/7/12, 단답 1/1/0/4", () => {
  const { topics, questions } = makeBank();
  const r = C.buildDiagnostic(questions, topics, BP, C.seededRandom(2026));
  assert.equal(r.qids.length, 30);
  assert.equal(new Set(r.qids).size, 30, "중복 없음");
  const byId = new Map(questions.map(q => [q.id, q]));
  const picked = r.qids.map(id => byId.get(id));
  assert.ok(picked.every(Boolean), "모든 qid가 문제은행에 있다");
  [[1, 3], [2, 8], [3, 7], [4, 12]].forEach(([s, n]) => {
    assert.equal(picked.filter(q => q.subject === s).length, n, `과목 ${s} 문항 수`);
  });
  [[1, 1], [2, 1], [3, 0], [4, 4]].forEach(([s, n]) => {
    assert.equal(picked.filter(q => q.subject === s && q.type === "short").length, n, `과목 ${s} 단답 수`);
  });
  assert.equal(picked.filter(q => q.type === "short").length, 6);
  assert.deepEqual(r.warnings, []);
});

test("buildDiagnostic: 같은 세부항목 최대 2문항", () => {
  const { topics, questions } = makeBank();
  const r = C.buildDiagnostic(questions, topics, BP, C.seededRandom(1));
  const byId = new Map(questions.map(q => [q.id, q]));
  const count = {};
  r.qids.forEach(id => { const t = byId.get(id).topic; count[t] = (count[t] || 0) + 1; });
  Object.keys(count).forEach(t => assert.ok(count[t] <= 2, `${t} = ${count[t]} (>2)`));
});

test("buildDiagnostic: 난이도 2/3/4 ≈ 30/50/20", () => {
  const { topics, questions } = makeBank();
  const r = C.buildDiagnostic(questions, topics, BP, C.seededRandom(99));
  const byId = new Map(questions.map(q => [q.id, q]));
  const picked = r.qids.map(id => byId.get(id));
  const s4 = picked.filter(q => q.subject === 4);
  assert.equal(s4.filter(q => q.difficulty === 2).length, 4);   // round(12×0.3)
  assert.equal(s4.filter(q => q.difficulty === 3).length, 6);   // round(12×0.5)
  assert.equal(s4.filter(q => q.difficulty === 4).length, 2);   // 나머지
});

test("buildDiagnostic: 결정성 — 같은 seed면 같은 결과, 다른 seed면 달라진다", () => {
  const { topics, questions } = makeBank();
  const a = C.buildDiagnostic(questions, topics, BP, C.seededRandom(2026));
  const b = C.buildDiagnostic(questions, topics, BP, C.seededRandom(2026));
  const c = C.buildDiagnostic(questions, topics, BP, C.seededRandom(7));
  assert.deepEqual(a.qids, b.qids);
  assert.notDeepEqual(a.qids, c.qids);
});

test("buildDiagnostic: 문항·단답 부족 시 있는 만큼 채우고 경고", () => {
  const { topics, questions } = makeBank();
  // 과목 1은 선다 2문항만, 과목 4는 단답을 전부 뺀다
  const thin = questions.filter(q => {
    if (q.subject === 1) return q.type === "mcq" && /-(1|2)-0$/.test(q.id);
    if (q.subject === 4) return q.type === "mcq";
    return true;
  });
  const r = C.buildDiagnostic(thin, topics, BP, C.seededRandom(3));
  const byId = new Map(thin.map(q => [q.id, q]));
  const picked = r.qids.map(id => byId.get(id));
  assert.equal(picked.filter(q => q.subject === 1).length, 2);
  assert.equal(picked.filter(q => q.subject === 4).length, 12);
  assert.equal(picked.filter(q => q.subject === 4 && q.type === "short").length, 0);
  assert.ok(r.qids.length < 30);
  assert.ok(r.warnings.length >= 2, `경고 ${r.warnings.length}건`);
  assert.ok(r.warnings.some(w => /단답/.test(w)), "단답 부족 경고");
  assert.ok(r.warnings.some(w => /문항/.test(w)), "문항 부족 경고");
});

/* ------------------------------------------------------------------ */
test("buildStudySet: 과목·세부항목·유형 필터와 개수", () => {
  const { questions } = makeBank();
  const r = C.buildStudySet(questions, { subject: 2, topic: null, type: "short", n: 5, mode: "new" }, {}, {}, C.seededRandom(1));
  assert.equal(r.length, 5);
  assert.equal(new Set(r).size, 5);
  const byId = new Map(questions.map(q => [q.id, q]));
  r.forEach(id => {
    assert.equal(byId.get(id).subject, 2);
    assert.equal(byId.get(id).type, "short");
  });
  const t = C.buildStudySet(questions, { subject: 3, topic: "3.1.2", type: "all", n: 10, mode: "new" }, {}, {}, C.seededRandom(1));
  assert.equal(t.length, 6);                       // 그 토픽에 6문항뿐
  t.forEach(id => assert.equal(byId.get(id).topic, "3.1.2"));
});

test("buildStudySet mode=new: 미시도 문항을 먼저 넣는다", () => {
  const { questions } = makeBank();
  const pool = questions.filter(q => q.topic === "1.1.1");     // 6문항
  const byQid = {};
  pool.slice(0, 4).forEach(q => { byQid[q.id] = [att({ qid: q.id })]; });   // 4개는 이미 풀었다
  const r = C.buildStudySet(pool, { subject: null, topic: null, type: "all", n: 3, mode: "new" }, byQid, {}, C.seededRandom(5));
  assert.equal(r.length, 3);
  const untriedIds = pool.slice(4).map(q => q.id);
  assert.equal(r.filter(id => untriedIds.includes(id)).length, 2, "미시도 2개가 먼저");
});

test("buildStudySet mode=due: 만기 오답만", () => {
  const { questions } = makeBank();
  const mistakes = {
    "Q-1-1-0": { stage: "new", next: "2026-09-04" },
    "Q-1-1-1": { stage: "reviewing", next: "2026-09-05" },
    "Q-1-1-2": { stage: "reviewing", next: "2026-09-30" },   // 아직 아님
    "Q-1-1-3": { stage: "graduated", next: null },
    "Q-9-9-9": { stage: "new", next: "2026-09-01" }          // 문제은행에 없음
  };
  const r = C.buildStudySet(questions, { subject: null, topic: null, type: "all", n: 10, mode: "due", todayStr: "2026-09-05" }, {}, mistakes, C.seededRandom(1));
  assert.deepEqual(r, ["Q-1-1-0", "Q-1-1-1"]);
});

test("buildStudySet mode=mixed: 만기 오답 먼저 절반, 나머지는 미시도", () => {
  const { questions } = makeBank();
  const mistakes = {};
  ["Q-1-1-0", "Q-1-1-1", "Q-1-1-2", "Q-1-1-3", "Q-1-1-4", "Q-1-1-5", "Q-1-2-0", "Q-1-2-1"]
    .forEach(id => { mistakes[id] = { stage: "reviewing", next: "2026-09-01" }; });
  const byQid = {};
  Object.keys(mistakes).forEach(id => { byQid[id] = [att({ qid: id, correct: false })]; });
  const r = C.buildStudySet(questions, { subject: 1, topic: null, type: "all", n: 10, mode: "mixed", todayStr: "2026-09-05" }, byQid, mistakes, C.seededRandom(11));
  assert.equal(r.length, 10);
  assert.equal(new Set(r).size, 10);
  const dueIds = Object.keys(mistakes);
  assert.equal(r.filter(id => dueIds.includes(id)).length, 5, "만기 5개(절반)");
  assert.equal(r.filter(id => !byQid[id]).length, 5, "나머지 5개는 미시도");
});

test("buildStudySet: 같은 seed면 같은 세트", () => {
  const { questions } = makeBank();
  const opts = { subject: 4, topic: null, type: "all", n: 10, mode: "new" };
  assert.deepEqual(
    C.buildStudySet(questions, opts, {}, {}, C.seededRandom(20)),
    C.buildStudySet(questions, opts, {}, {}, C.seededRandom(20))
  );
});

/* ================================================================== *
 * 8. 합격 판정
 * ================================================================== */
test("judgePass 경계 8조합 (총 600 / 과목 40%)", () => {
  const cases = [
    // [subjectPoints,                       총점,  합격, 과락 과목]
    [{ 1: 40, 2: 100, 3: 100, 4: 360 }, 600, true, []],
    [{ 1: 40, 2: 100, 3: 100, 4: 359 }, 599, false, []],
    [{ 1: 39, 2: 150, 3: 150, 4: 400 }, 739, false, [1]],
    [{ 1: 40, 2: 150, 3: 150, 4: 400 }, 740, true, []],
    [{ 1: 100, 2: 99, 3: 150, 4: 400 }, 749, false, [2]],
    [{ 1: 100, 2: 250, 3: 99, 4: 400 }, 849, false, [3]],
    [{ 1: 100, 2: 250, 3: 250, 4: 159 }, 759, false, [4]],
    [{ 1: 40, 2: 100, 3: 100, 4: 160 }, 400, false, []]   // 과락은 없지만 총점 미달
  ];
  cases.forEach(([sp, total, pass, fails]) => {
    const r = C.judgePass(sp, BP);
    assert.equal(r.total, total, JSON.stringify(sp));
    assert.equal(r.pass, pass, JSON.stringify(sp));
    assert.deepEqual(r.failSubjects, fails, JSON.stringify(sp));
  });
});

test("judgePass: bySubject 형태와 만점 1000", () => {
  const r = C.judgePass({ 1: 100, 2: 250, 3: 250, 4: 400 }, BP);
  assert.equal(r.total, 1000);
  assert.equal(r.pass, true);
  assert.equal(r.bySubject.length, 4);
  assert.deepEqual(r.bySubject[0], { id: 1, points: 100, max: 100, pass_points: 40, pass: true });
  assert.deepEqual(r.bySubject[3], { id: 4, points: 400, max: 400, pass_points: 160, pass: true });
  const empty = C.judgePass({}, BP);
  assert.equal(empty.total, 0);
  assert.equal(empty.pass, false);
  assert.deepEqual(empty.failSubjects, [1, 2, 3, 4]);
});

/* ================================================================== *
 * 9. 진단 결과
 * ================================================================== */
const DIAG_TOPICS = [
  { id: "1.1.1", subject: 1, parent: "1.1", kind: "sub", name: "화장품의 정의 및 유형", exp_q: 2 },
  { id: "1.1.2", subject: 1, parent: "1.1", kind: "sub", name: "영업의 종류", exp_q: 3 },
  { id: "3.1.1", subject: 3, parent: "3.1", kind: "sub", name: "작업장 위생", exp_q: 4 }
];
const DIAG_QS = [
  mcq({ id: "D1", subject: 1, topic: "1.1.1" }),
  mcq({ id: "D2", subject: 1, topic: "1.1.2" }),
  short({ id: "D3", subject: 1, topic: "1.1.1" }),
  mcq({ id: "D4", subject: 3, topic: "3.1.1" }),
  mcq({ id: "D5", subject: 3, topic: "3.1.1" })
];

test("diagnosticResult: est_points = round(만점 × (선다정답률×선다비중 + 0.85×단답정답률×단답비중))", () => {
  const answers = {
    D1: { correct: true, conf: 2 }, D2: { correct: false, conf: 1 }, D3: { correct: true, conf: 2 },
    D4: { correct: true, conf: 1 }, D5: { correct: false, conf: 0 }
  };
  const r = C.diagnosticResult(["D1", "D2", "D3", "D4", "D5"], answers, DIAG_QS, BP, DIAG_TOPICS);
  const s1 = r.bySubject.find(x => x.id === 1);
  // 선다 2문항 중 1개(0.5), 단답 1문항 중 1개(1.0). 선다 비중 72/100, 단답 28/100
  // 100 × (0.5×0.72 + 0.85×1×0.28) = 59.8 → 60
  assert.equal(s1.n, 3);
  assert.equal(s1.correct, 2);
  close(s1.pct, 200 / 3);
  assert.equal(s1.est_points, 60);
  assert.equal(s1.max, 100);
  assert.equal(s1.pass_points, 40);
  assert.equal(s1.name, "화장품법의 이해");
  assert.equal(s1.risk, "safe");

  // 과목 3은 단답 슬롯이 없으므로 선다만: 250 × 0.5 = 125
  const s3 = r.bySubject.find(x => x.id === 3);
  assert.equal(s3.est_points, 125);
  assert.equal(s3.risk, "unmeasured");     // n=2 (<3)

  // 진단에 없는 과목
  const s2 = r.bySubject.find(x => x.id === 2);
  assert.equal(s2.n, 0);
  assert.equal(s2.est_points, 0);
  assert.equal(s2.pct, null);
  assert.equal(s2.risk, "unmeasured");

  assert.equal(r.bySubject.length, 4);
  assert.equal(r.est_total, 185);
  assert.equal(r.est_note, "진단 30문항 기준 초기 추정(신뢰 낮음)");
});

test("diagnosticResult: weakTopics는 정답률 낮은 순 최대 5개, n≥1", () => {
  const answers = {
    D1: { correct: true, conf: 2 }, D2: { correct: false, conf: 1 }, D3: { correct: true, conf: 2 },
    D4: { correct: true, conf: 1 }, D5: { correct: false, conf: 0 }
  };
  const r = C.diagnosticResult(["D1", "D2", "D3", "D4", "D5"], answers, DIAG_QS, BP, DIAG_TOPICS);
  assert.deepEqual(r.weakTopics.map(t => t.id), ["1.1.2", "3.1.1", "1.1.1"]);
  assert.deepEqual(r.weakTopics[0], { id: "1.1.2", name: "영업의 종류", n: 1, correct: 0, pct: 0 });
  assert.ok(r.weakTopics.length <= 5);
});

test("diagnosticResult risk 경계: 55 safe / 45~55 warn / 45 미만 danger / n<3 unmeasured", () => {
  function run(nq, ncorrect) {
    const qs = [], answers = {}, qids = [];
    for (let i = 0; i < nq; i++) {
      const id = "R" + i;
      qs.push(mcq({ id: id, subject: 2, topic: "2.1.1" }));
      answers[id] = { correct: i < ncorrect, conf: 2 };
      qids.push(id);
    }
    const topics = [{ id: "2.1.1", subject: 2, parent: "2.1", kind: "sub", name: "T", exp_q: 1 }];
    return C.diagnosticResult(qids, answers, qs, BP, topics).bySubject.find(x => x.id === 2);
  }
  assert.equal(run(20, 11).risk, "safe");     // 55
  assert.equal(run(20, 12).risk, "safe");     // 60
  assert.equal(run(20, 10).risk, "warn");     // 50
  assert.equal(run(20, 9).risk, "warn");      // 45
  assert.equal(run(20, 8).risk, "danger");    // 40
  assert.equal(run(2, 2).risk, "unmeasured"); // n<3
});

/* ================================================================== *
 * 10. 데이터 점검
 * ================================================================== */
const DC_TOPICS = [
  { id: "1.1", subject: 1, kind: "major", name: "화장품법" },
  { id: "1.1.1", subject: 1, parent: "1.1", kind: "sub", name: "정의", exp_q: 2 },
  { id: "3.1.1", subject: 3, parent: "3.1", kind: "sub", name: "작업장", exp_q: 4 }
];

test("dataCheck: 정상 데이터는 ok:true, 과목별 집계와 검증 비율", () => {
  const qs = [
    mcq({ id: "A1", subject: 1, topic: "1.1.1", points: 8, verified: true }),
    mcq({ id: "A2", subject: 1, topic: "1.1.1", points: 12, verified: false }),
    short({ id: "A3", subject: 1, topic: "1.1.1", points: 18, verified: true }),
    mcq({ id: "B1", subject: 3, topic: "3.1.1", points: 8, verified: false })
  ];
  const cards = [
    { id: "C1", subject: 1, topic: "1.1.1" },
    { id: "C2", subject: 3, topic: "3.1.1" },
    { id: "C3", subject: 3, topic: "3.1.1" }
  ];
  const r = C.dataCheck(qs, cards, DC_TOPICS);
  assert.equal(r.ok, true);
  assert.equal(r.total, 4);
  assert.deepEqual(r.bySubject[1], { total: 3, mcq: 2, short: 1, points: { 8: 1, 12: 1, 18: 1 }, verified: 2 });
  assert.deepEqual(r.bySubject[3], { total: 1, mcq: 1, short: 0, points: { 8: 1, 12: 0, 18: 0 }, verified: 0 });
  assert.deepEqual(r.bySubject[2], { total: 0, mcq: 0, short: 0, points: { 8: 0, 12: 0, 18: 0 }, verified: 0 });
  assert.equal(r.cards.total, 3);
  assert.equal(r.cards.bySubject[3], 2);
  close(r.verifiedRatio, 0.5);
  ["duplicates", "badAnswer", "badChoices", "badWrongExpl", "badPoints", "missingSource", "missingMemory", "unknownTopic"]
    .forEach(k => assert.deepEqual(r[k], [], k));
});

test("dataCheck: 중복 ID·필드 오류를 전부 잡는다", () => {
  const qs = [
    mcq({ id: "X1", topic: "1.1.1" }),
    mcq({ id: "X1", topic: "1.1.1" }),                                   // 중복
    mcq({ id: "X2", topic: "1.1.1", answer: 5 }),                        // 정답 인덱스 범위 밖
    short({ id: "X3", topic: "1.1.1", answer_text: null, blanks: null }),// 단답 정답 없음
    mcq({ id: "X4", topic: "1.1.1", choices: ["1", "2", "3", "4"] }),    // 보기 4개
    mcq({ id: "X5", topic: "1.1.1", wrong_option_explanations: ["a", "b", "c"] }),
    mcq({ id: "X6", topic: "1.1.1", points: 10 }),                       // 배점 이상
    mcq({ id: "X7", topic: "1.1.1", source: { law: null, guide: null, asof: "2026-09", confidence: "low" } }),
    mcq({ id: "X8", topic: "1.1.1", memory_sentence: "  " }),
    mcq({ id: "X9", topic: "9.9.9" })                                    // 없는 토픽
  ];
  const r = C.dataCheck(qs, [], DC_TOPICS);
  assert.equal(r.ok, false);
  assert.deepEqual(r.duplicates, ["X1"]);
  assert.deepEqual(r.badAnswer, ["X2", "X3"]);
  assert.deepEqual(r.badChoices, ["X4"]);
  assert.deepEqual(r.badWrongExpl, ["X5"]);
  assert.deepEqual(r.badPoints, ["X6"]);
  assert.deepEqual(r.missingSource, ["X7"]);
  assert.deepEqual(r.missingMemory, ["X8"]);
  assert.deepEqual(r.unknownTopic, ["X9"]);
  assert.equal(r.verifiedRatio, 1);
});

test("dataCheck: 빈 데이터도 터지지 않는다", () => {
  const r = C.dataCheck([], [], DC_TOPICS);
  assert.equal(r.total, 0);
  assert.equal(r.verifiedRatio, 0);
  assert.equal(r.cards.total, 0);
  assert.equal(r.ok, true);
});

/* ================================================================== *
 * 11. 하루 학습량
 * ================================================================== */
test("dailyPlan: 120분·D-14 → 새 문항 42, phase early", () => {
  const p = C.dailyPlan(120, 14, 100);
  assert.equal(p.newQ, 42);          // floor(120×0.60 / 1.7)
  assert.equal(p.review, 20);        // floor(120×0.25 / 1.5)
  assert.equal(p.cards, 72);         // floor(120×0.15 / 0.25)
  assert.equal(p.phase, "early");
});

test("dailyPlan: 국면 4개 + D-16 이상은 첫 국면", () => {
  assert.equal(C.dailyPlan(120, 30, 0).phase, "early");
  assert.equal(C.dailyPlan(120, 16, 0).phase, "early");
  assert.equal(C.dailyPlan(120, 11, 0).phase, "early");
  assert.equal(C.dailyPlan(120, 10, 0).phase, "mid");
  assert.equal(C.dailyPlan(120, 6, 0).phase, "mid");
  assert.equal(C.dailyPlan(120, 5, 0).phase, "late");
  assert.equal(C.dailyPlan(120, 3, 0).phase, "late");
  assert.equal(C.dailyPlan(120, 2, 0).phase, "cram");
  assert.equal(C.dailyPlan(120, 1, 0).phase, "cram");
  assert.equal(C.dailyPlan(120, 0, 0).phase, "cram");
});

test("dailyPlan: 국면별 비중과 dueCount 상한", () => {
  assert.deepEqual(C.dailyPlan(120, 8, 3), { newQ: 24, review: 3, cards: 120, phase: "mid" });
  assert.deepEqual(C.dailyPlan(120, 4, 50), { newQ: 10, review: 44, cards: 144, phase: "late" });
  assert.deepEqual(C.dailyPlan(120, 1, 50), { newQ: 0, review: 48, cards: 192, phase: "cram" });
  assert.deepEqual(C.dailyPlan(60, 14, 100), { newQ: 21, review: 10, cards: 36, phase: "early" });
  assert.deepEqual(C.dailyPlan(0, 14, 100), { newQ: 0, review: 0, cards: 0, phase: "early" });
});
