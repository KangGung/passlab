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

test("dateOf: 시각 없는 순수 날짜는 그대로 통과시킨다", () => {
  assert.equal(C.dateOf("2026-09-05"), "2026-09-05");
  assert.equal(C.dateOf(null), null);
  assert.equal(C.dateOf("그냥 글자"), null);
});

test("dateOf: 시각이 붙은 ISO(UTC Z)는 로컬 날짜로 환산한다", () => {
  // 기계의 시간대가 무엇이든 today(로컬)와 같아야 한다
  const iso = "2026-09-05T16:30:00.000Z";
  assert.equal(C.dateOf(iso), C.today(new Date(iso)));
  // Date·타임스탬프 입력도 같은 결과
  assert.equal(C.dateOf(new Date(iso)), C.today(new Date(iso)));
  assert.equal(C.dateOf(new Date(iso).getTime()), C.today(new Date(iso)));
});

test("dateOf: 로컬 자정 직후의 Z 타임스탬프는 '어제'가 아니라 그날로 센다", () => {
  // 로컬 2026-09-06 00:30 → UTC 문자열로 만들어도 로컬 날짜는 09-06이어야 한다
  const localJustAfterMidnight = new Date(2026, 8, 6, 0, 30, 0);
  const z = localJustAfterMidnight.toISOString();          // …Z (UTC)
  assert.equal(C.dateOf(z), "2026-09-06");
  assert.equal(C.dateOf(z), C.today(localJustAfterMidnight));
  // 시각 없는 로컬 표기(Z 없음)도 그대로
  assert.equal(C.dateOf("2026-09-06T00:30:00"), "2026-09-06");
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

test("normalizeShort: 따옴표·낫표 제거 (법령명 「…」)", () => {
  // (a) 낫표
  assert.equal(C.normalizeShort("「화장품법」"), C.normalizeShort("화장품법"));
  assert.equal(C.normalizeShort("「화장품법」"), "화장품법");
  // (b) 겹낫표·큰따옴표·작은따옴표·홑화살괄호·겹화살괄호
  assert.equal(C.normalizeShort("『화장품법』"), "화장품법");
  assert.equal(C.normalizeShort("“화장품법”"), "화장품법");
  assert.equal(C.normalizeShort("‘화장품법’"), "화장품법");
  assert.equal(C.normalizeShort('"화장품법"'), "화장품법");
  assert.equal(C.normalizeShort("'화장품법'"), "화장품법");
  assert.equal(C.normalizeShort("〈화장품법〉"), "화장품법");
  assert.equal(C.normalizeShort("《화장품법》"), "화장품법");
  assert.equal(C.normalizeShort("＂화장품법＂"), "화장품법");   // 전각 따옴표도 (2)에서 반각이 된 뒤 지워진다
  // (c) 낱말 안의 어포스트로피도 지운다 → 밋밋한 표기와 같아진다
  assert.equal(C.normalizeShort("올리브’오일"), C.normalizeShort("올리브오일"));
  assert.equal(C.normalizeShort("l’ascorbic"), C.normalizeShort("lascorbic"));
  // 실제 사례(Q-B2-10 규정명)
  const lawName = "화장품 사용할 때의 주의사항 및 알레르기 유발성분 표시에 관한 규정";
  assert.equal(C.normalizeShort("「" + lawName + "」"), C.normalizeShort(lawName));
  // 괄호 처리는 그대로 — 괄호 안 내용은 계속 지운다
  assert.equal(C.normalizeShort("「화장품법」(법률 제20901호)"), "화장품법");
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
  assert.equal(C.normalizeShort("프로필파라벤"), "프로필파라벤");   // 성분명의 "프로"는 %로 바꾸지 않는다
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

test("gradeShort: 법령명을 낫표로 감싸 써도 정답 (Q-B2-10)", () => {
  const lawName = "화장품 사용할 때의 주의사항 및 알레르기 유발성분 표시에 관한 규정";
  const q = short({ answer_text: [lawName] });
  const r = C.gradeShort(q, "「" + lawName + "」");
  assert.equal(r.correct, true);
  assert.equal(r.stage, 1);
  assert.equal(C.gradeShort(q, "『" + lawName + "』").correct, true);
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
  // 공백은 분리자가 아니다 — 항목 안에 공백이 들어가는 답("화장품의 명칭")을 살리기 위한 맞바꿈
  assert.equal(C.gradeShort(q, "납 니켈 비소").correct, false);
  assert.equal(C.gradeShort(q, "납, 니켈").correct, false);
  assert.equal(C.gradeShort(q, "납, 니켈, 비소, 수은").correct, false);
  assert.deepEqual(C.gradeShort(q, "비소, 납/니켈").normalized, ["비소", "납", "니켈"]);
});

test("gradeShort set: 항목에 공백이 들어가도 채점된다(공백은 분리자가 아니다)", () => {
  const q = short({ grade: "set", answer_text: ["화장품의 명칭", "영업자의 상호", "제조번호", "사용기한"] });
  // (a) 쉼표로 구분한 그대로
  assert.equal(C.gradeShort(q, "화장품의 명칭, 영업자의 상호, 제조번호, 사용기한").correct, true);
  // (b) 순서 무관
  assert.equal(C.gradeShort(q, "사용기한, 제조번호, 영업자의 상호, 화장품의 명칭").correct, true);
  // (c) 하나 빠지면 오답
  assert.equal(C.gradeShort(q, "화장품의 명칭, 영업자의 상호, 제조번호").correct, false);
  // (d) 빗금·모점·쌍반점·줄바꿈도 분리자
  assert.equal(C.gradeShort(q, "화장품의 명칭/영업자의 상호、제조번호;사용기한").correct, true);
  assert.equal(C.gradeShort(q, "화장품의 명칭\n영업자의 상호\n제조번호\n사용기한").correct, true);
  // 항목 안 공백은 normalizeShort가 지우므로 붙여 써도 같다
  assert.equal(C.gradeShort(q, "화장품의명칭,영업자의상호,제조번호,사용기한").correct, true);
  // 없는 항목을 더 쓰면 오답
  assert.equal(C.gradeShort(q, "화장품의 명칭, 영업자의 상호, 제조번호, 사용기한, 가격").correct, false);
  assert.deepEqual(
    C.gradeShort(q, "화장품의 명칭, 영업자의 상호, 제조번호, 사용기한").normalized,
    ["화장품의명칭", "영업자의상호", "제조번호", "사용기한"]
  );
});

test("gradeShort set: answer_text 한 칸에 열거를 몰아 써도 같은 방식으로 쪼갠다", () => {
  const q = short({ grade: "set", answer_text: ["화장품의 명칭, 영업자의 상호, 제조번호"] });
  assert.equal(C.gradeShort(q, "제조번호/영업자의 상호/화장품의 명칭").correct, true);
  assert.equal(C.gradeShort(q, "제조번호, 화장품의 명칭").correct, false);
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
  assert.equal(m.interval, 3);
  assert.equal(m.next, "2026-09-08");   // 사다리 1 → 3
  assert.equal(m.lastWrong, "2026-09-04");
  assert.equal(m.memo, "메모");
});

test("applyAttemptToMistake: 정답·애매는 +2일이고 사다리 칸을 올리지 않는다", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "new", streak: 0, next: "2026-09-05", interval: 1, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 1 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.next, "2026-09-07");   // today + 2
  assert.equal(m.interval, 1);          // 칸 유지
  // 3칸에서 애매하게 맞혀도 칸은 그대로, 다음 복습만 +2일
  const prev3 = Object.assign({}, prev, { stage: "reviewing", streak: 1, interval: 3 });
  const m3 = C.applyAttemptToMistake(prev3, att({ correct: true, conf: 1 }), mcq(), CTX);
  assert.equal(m3.interval, 3);
  assert.equal(m3.next, "2026-09-07");
});

test("applyAttemptToMistake: 오답 재출제 사다리는 1 → 3 → 6 (상한 6)", () => {
  let m = C.applyAttemptToMistake(null, att({ correct: false, conf: 2 }), mcq(), { todayStr: "2026-09-01", examDate: "2026-10-31" });
  assert.equal(m.interval, 1);
  assert.equal(m.next, "2026-09-02");                       // 첫 오답 → +1일
  m = C.applyAttemptToMistake(m, att({ correct: true, conf: 2 }), mcq(), { todayStr: "2026-09-02", examDate: "2026-10-31" });
  assert.equal(m.interval, 3);
  assert.equal(m.next, "2026-09-05");                       // +3일
  m = C.applyAttemptToMistake(m, att({ correct: true, conf: 2 }), mcq(), { todayStr: "2026-09-05", examDate: "2026-10-31" });
  assert.equal(m.stage, "graduated");                       // 오답 후 4일 경과 + 다른 날 → 졸업
  // 졸업이 안 걸리는 경로로 6칸까지 확인
  const base = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m6 = C.applyAttemptToMistake(Object.assign({}, base, { interval: 3 }), att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m6.interval, 6);
  assert.equal(m6.next, "2026-09-11");                      // +6일
});

test("applyAttemptToMistake: reviewing → graduated (streak 2 + 마지막 오답 3일 경과 + 다른 날)", () => {
  const prev = { count: 1, last: "2026-09-03", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 2, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "graduated");
  assert.equal(m.streak, 2);
  assert.equal(m.next, null);
});

test("applyAttemptToMistake: 마지막 오답 후 3일이 안 지나면 졸업 못 한다", () => {
  const prev = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 3, lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 2);
  assert.equal(m.next, "2026-09-11");   // 사다리 3 → 6
  assert.equal(m.interval, 6);
});

test("applyAttemptToMistake: 두 정답이 같은 날이면 졸업 못 한다", () => {
  const prev = { count: 1, last: "2026-09-05", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 3, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 2);
});

test("applyAttemptToMistake: 사다리 상한 6에서 멈춘다", () => {
  const base = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", lastWrong: "2026-09-04", guessed: 0, relapse: false, memo: "" };
  const m3 = C.applyAttemptToMistake(Object.assign({}, base, { interval: 3 }), att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m3.interval, 6);
  assert.equal(m3.next, "2026-09-11");
  const m6 = C.applyAttemptToMistake(Object.assign({}, base, { interval: 6 }), att({ correct: true, conf: 2 }), mcq(), CTX);
  assert.equal(m6.interval, 6);         // 더 올라가지 않는다
  assert.equal(m6.next, "2026-09-11");
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
  const prev = { count: 1, last: "2026-09-04", stage: "reviewing", streak: 1, next: "2026-09-05", interval: 3, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: false, conf: 1 }), mcq(), CTX);
  assert.equal(m.stage, "reviewing");
  assert.equal(m.streak, 0);
  assert.equal(m.count, 2);
  assert.equal(m.relapse, false);
});

test("applyAttemptToMistake: 스프린트 D-3 규칙 — next는 내일 이하", () => {
  const ctx = { todayStr: "2026-09-17", examDate: "2026-09-19", track: "sprint" };  // D-2
  const prev = { count: 1, last: "2026-09-16", stage: "reviewing", streak: 1, next: "2026-09-17", interval: 3, lastWrong: "2026-09-16", guessed: 0, relapse: false, memo: "" };
  const m = C.applyAttemptToMistake(prev, att({ correct: true, conf: 2 }), mcq(), ctx);
  assert.equal(m.next, "2026-09-18");
  // D-4에서는 상한이 걸리지 않는다
  const ctx2 = { todayStr: "2026-09-15", examDate: "2026-09-19", track: "sprint" };
  const prev2 = Object.assign({}, prev, { last: "2026-09-14", lastWrong: "2026-09-14", next: "2026-09-15" });
  assert.equal(C.applyAttemptToMistake(prev2, att({ correct: true, conf: 2 }), mcq(), ctx2).next, "2026-09-21");
  // 졸업은 next를 null로 유지한다
  const ctx3 = { todayStr: "2026-09-17", examDate: "2026-09-19", track: "sprint" };
  const prev3 = { count: 1, last: "2026-09-15", stage: "reviewing", streak: 1, next: "2026-09-17", interval: 3, lastWrong: "2026-09-10", guessed: 0, relapse: false, memo: "" };
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

/* ================================================================== *
 * 12. 모의고사 구성 — mockSlots · buildMock
 * ================================================================== */
const nodePath = require("node:path");
const nodeFs = require("node:fs");

/** 실제 데이터 파일(app/data)에서 검증 문항만 읽는다 */
let REAL = null;
function realBank() {
  if (REAL) return REAL;
  globalThis.window = globalThis;
  const dir = nodePath.join(__dirname, "..", "app", "data");
  const bp = require(nodePath.join(dir, "blueprint.js"));
  require(nodePath.join(dir, "topics.js"));
  nodeFs.readdirSync(dir).filter(f => /^q_.*\.js$/.test(f)).sort()
    .forEach(f => require(nodePath.join(dir, f)));
  REAL = {
    bp: bp,
    topics: globalThis.window.PL_TOPICS,
    questions: (globalThis.window.PL_QUESTIONS || []).filter(q => q && q.verified === true)
  };
  return REAL;
}

/** 슬롯을 정확히 채울 수 있는 합성 은행. extra=슬롯마다 여분 문항 수 */
function fullBank(extra) {
  const out = [];
  let k = 0;
  BP.subjects.forEach(s => {
    ["mcq", "short"].forEach(type => {
      Object.keys(s.slots[type]).forEach(p => {
        const need = Number(s.slots[type][p]);
        if (!need) return;
        for (let i = 0; i < need + (Number(extra) || 0); i++) {
          k++;
          const base = {
            id: "Q-F-" + String(k).padStart(3, "0"), subject: s.id,
            topic: s.id + ".t" + Math.ceil(k / 3), points: Number(p),
            difficulty: 3, importance: "M", verified: true
          };
          out.push(type === "mcq" ? mcq(base) : short(base));
        }
      });
    });
  });
  return out;
}

test("mockSlots: full = 블루프린트 슬롯 그대로 100문항·1000점", () => {
  const s = C.mockSlots("full", BP);
  assert.equal(s.preset, "full");
  assert.equal(s.minutes, 120);
  assert.equal(s.count, 100);
  assert.equal(s.points, 1000);
  assert.deepEqual(s.subjects, [1, 2, 3, 4]);
});

test("mockSlots: half = 50문항, 과목 10/20/20 · 선다 43·단답 7", () => {
  const s = C.mockSlots("half", BP);
  assert.equal(s.count, 50);
  assert.equal(s.minutes, 60);
  const bySub = {}, byType = {};
  s.slots.forEach(x => {
    bySub[x.subject] = (bySub[x.subject] || 0) + x.need;
    byType[x.type] = (byType[x.type] || 0) + x.need;
  });
  assert.deepEqual(bySub, { 1: 10, 2: 20, 3: 20 });
  assert.deepEqual(byType, { mcq: 43, short: 7 });
  // 과목② 25→20(0.8배): 선다 11/8/1 → 9/6/1, 단답 3/2 → 2/2
  assert.deepEqual(s.slots.filter(x => x.subject === 2), [
    { subject: 2, type: "mcq", points: 8, need: 9 },
    { subject: 2, type: "mcq", points: 12, need: 6 },
    { subject: 2, type: "mcq", points: 18, need: 1 },
    { subject: 2, type: "short", points: 8, need: 2 },
    { subject: 2, type: "short", points: 12, need: 2 }
  ]);
});

test("mockSlots: mini3 = 과목③ 25문항 그대로, need 0 슬롯은 없다", () => {
  const s = C.mockSlots("mini3", BP);
  assert.equal(s.count, 25);
  assert.equal(s.minutes, 30);
  assert.deepEqual(s.subjects, [3]);
  assert.deepEqual(s.slots, [
    { subject: 3, type: "mcq", points: 8, need: 14 },
    { subject: 3, type: "mcq", points: 12, need: 10 },
    { subject: 3, type: "mcq", points: 18, need: 1 }
  ]);
  assert.ok(s.slots.every(x => x.need > 0));
});

test("MOCK_PRESETS: 3종 프리셋 상수", () => {
  assert.deepEqual(Object.keys(C.MOCK_PRESETS), ["full", "half", "mini3"]);
  assert.equal(C.MOCK_PRESETS.full.minutes, 120);
  assert.equal(C.MOCK_PRESETS.half.name, "하프 모의고사(①②③)");
  assert.deepEqual(C.MOCK_PRESETS.mini3.counts, { 3: 25 });
});

test("buildMock: 완비된 은행이면 full 100문항·1000점·partial 아님", () => {
  const m = C.buildMock("full", fullBank(2), BP, {}, C.seededRandom(7));
  assert.equal(m.qids.length, 100);
  assert.equal(new Set(m.qids).size, 100);
  assert.equal(m.total_points, 1000);
  assert.equal(m.partial, false);
  assert.deepEqual(m.slots_missing, []);
  assert.equal(m.minutes, 120);
  assert.equal(m.preset, "full");
});

test("buildMock: order = 선다(과목1→4) 다음 단답(과목1→4), 번호 = 인덱스+1", () => {
  const bank = fullBank(2);
  const m = C.buildMock("full", bank, BP, {}, C.seededRandom(7));
  assert.equal(m.order.length, 100);
  m.order.forEach((o, i) => {
    assert.equal(o.no, i + 1);
    assert.equal(o.qid, m.qids[i]);
  });
  const types = m.order.map(o => o.type);
  assert.equal(types.indexOf("short"), 80);                       // 1~80 선다, 81~100 단답
  assert.ok(types.slice(0, 80).every(t => t === "mcq"));
  assert.ok(types.slice(80).every(t => t === "short"));
  const subsMcq = m.order.slice(0, 80).map(o => o.subject);
  assert.deepEqual(subsMcq, subsMcq.slice().sort((a, b) => a - b));  // 과목 오름차순
  const subsShort = m.order.slice(80).map(o => o.subject);
  assert.deepEqual(subsShort, subsShort.slice().sort((a, b) => a - b));
  // 과목 안에서는 무작위 → seed가 다르면 순서가 달라진다
  const m2 = C.buildMock("full", bank, BP, {}, C.seededRandom(99));
  assert.notDeepEqual(m.qids, m2.qids);
});

test("buildMock: half은 50문항(선다 43·단답 7)", () => {
  const m = C.buildMock("half", fullBank(2), BP, {}, C.seededRandom(7));
  assert.equal(m.qids.length, 50);
  assert.equal(m.partial, false);
  assert.equal(m.minutes, 60);
  assert.equal(m.order.filter(o => o.type === "mcq").length, 43);
  assert.equal(m.order.filter(o => o.type === "short").length, 7);
  assert.ok(m.order.every(o => o.subject !== 4));
});

test("buildMock: 미출제 우선 → 이미 푼 문항은 뒤로, 같은 seed면 같은 결과", () => {
  const BP1 = {
    exam: { total_points: 1000, pass_total: 600 },
    subjects: [{ id: 1, name: "법", count: 3, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 3, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  const bank = [1, 2, 3, 4, 5].map(i => mcq({ id: "Q-U-" + i, subject: 1, topic: "1.1." + i, points: 8 }));
  const attemptsByQid = {
    "Q-U-1": [att({ qid: "Q-U-1", at: "2026-09-01T10:00:00" })],
    "Q-U-2": [att({ qid: "Q-U-2", at: "2026-09-04T10:00:00" })]
  };
  const m = C.buildMock("full", bank, BP1, { attemptsByQid: attemptsByQid }, C.seededRandom(3));
  assert.deepEqual(m.qids.slice().sort(), ["Q-U-3", "Q-U-4", "Q-U-5"]);   // 미출제 3개
  const m2 = C.buildMock("full", bank, BP1, { attemptsByQid: attemptsByQid }, C.seededRandom(3));
  assert.deepEqual(m2.qids, m.qids);                                     // 결정적
  // 미출제가 2개뿐이면 가장 오래전 출제(Q-U-1)가 먼저 들어온다
  const att3 = Object.assign({}, attemptsByQid, {
    "Q-U-3": [att({ qid: "Q-U-3", at: "2026-09-06T10:00:00" })],
    "Q-U-5": [att({ qid: "Q-U-5", at: "2026-09-05T10:00:00" })]
  });
  const m3 = C.buildMock("full", bank, BP1, { attemptsByQid: att3 }, C.seededRandom(3));
  assert.deepEqual(m3.qids.slice().sort(), ["Q-U-1", "Q-U-2", "Q-U-4"]);   // 미출제 1 + 오래된 순 2
});

test("buildMock: exclude(직전 모의)는 가능하면 피한다", () => {
  const BP1 = {
    exam: { total_points: 1000 },
    subjects: [{ id: 1, name: "법", count: 2, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 2, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  const bank = [1, 2, 3].map(i => mcq({ id: "Q-X-" + i, subject: 1, topic: "1.1." + i, points: 8 }));
  const m = C.buildMock("full", bank, BP1, { exclude: ["Q-X-1"] }, C.seededRandom(5));
  assert.deepEqual(m.qids.slice().sort(), ["Q-X-2", "Q-X-3"]);
  // 후보가 모자라면 exclude도 쓴다(빈 슬롯보다 낫다)
  const m2 = C.buildMock("full", bank, BP1, { exclude: ["Q-X-1", "Q-X-2"] }, C.seededRandom(5));
  assert.equal(m2.qids.length, 2);
  assert.equal(m2.partial, false);
});

test("buildMock: 같은 세부항목 3문항 상한, 대체 없으면 완화하고 경고", () => {
  const BP1 = {
    exam: { total_points: 1000 },
    subjects: [{ id: 1, name: "법", count: 5, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 5, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  // 한 토픽에 6문항뿐 → 5문항을 채우려면 상한을 완화해야 한다
  const bank = [1, 2, 3, 4, 5, 6].map(i => mcq({ id: "Q-C-" + i, subject: 1, topic: "1.1.1", points: 8 }));
  const m = C.buildMock("full", bank, BP1, {}, C.seededRandom(11));
  assert.equal(m.qids.length, 5);
  assert.equal(m.partial, false);
  assert.ok(m.warnings.some(w => w.indexOf("세부항목") !== -1));
  // 토픽이 넉넉하면 상한을 지킨다
  const bank2 = [1, 2, 3, 4, 5, 6].map(i => mcq({ id: "Q-D-" + i, subject: 1, topic: "1.1." + (i <= 3 ? 1 : 2), points: 8 }));
  const m2 = C.buildMock("full", bank2, BP1, {}, C.seededRandom(11));
  const byTopic = {};
  m2.qids.forEach(id => {
    const t = bank2.find(q => q.id === id).topic;
    byTopic[t] = (byTopic[t] || 0) + 1;
  });
  assert.ok(Object.keys(byTopic).every(t => byTopic[t] <= 3), JSON.stringify(byTopic));
  assert.ok(!m2.warnings.some(w => w.indexOf("세부항목") !== -1));
});

test("buildMock: 슬롯이 비면 같은 과목·유형의 다른 배점으로 대체(8↔12 먼저, 18 마지막)", () => {
  const BP1 = {
    exam: { total_points: 1000 },
    subjects: [{ id: 1, name: "법", count: 2, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 2, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  const bank = [
    mcq({ id: "Q-P8", subject: 1, topic: "1.1.1", points: 8 }),
    mcq({ id: "Q-P12", subject: 1, topic: "1.1.2", points: 12 }),
    mcq({ id: "Q-P18", subject: 1, topic: "1.1.3", points: 18 })
  ];
  const m = C.buildMock("full", bank, BP1, {}, C.seededRandom(2));
  assert.deepEqual(m.qids.slice().sort(), ["Q-P12", "Q-P8"]);    // 12점 대체가 18점보다 먼저
  assert.equal(m.total_points, 20);                              // 문항 points 합산(8+12)
  assert.deepEqual(m.slots_filled, [{ subject: 1, type: "mcq", points: 8, need: 2, got: 2 }]);
  assert.deepEqual(m.slots_missing, []);
  assert.equal(m.substituted, 1);
  assert.equal(m.planned_points, 16);
  assert.equal(m.partial, true);                                 // 문항 수는 맞지만 배점이 계획과 다르다
});

test("buildMock: 채울 수 없는 슬롯은 slots_missing에 남고 partial=true", () => {
  const BP1 = {
    exam: { total_points: 1000 },
    subjects: [{ id: 1, name: "법", count: 4, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 2, "12": 0, "18": 0 }, short: { "8": 2, "12": 0, "18": 0 } } }]
  };
  const bank = [mcq({ id: "Q-M1", subject: 1, topic: "1.1.1", points: 8 })];
  const m = C.buildMock("full", bank, BP1, {}, C.seededRandom(2));
  assert.equal(m.partial, true);
  assert.deepEqual(m.qids, ["Q-M1"]);
  assert.deepEqual(m.slots_missing, [
    { subject: 1, type: "mcq", points: 8, need: 2, got: 1 },
    { subject: 1, type: "short", points: 8, need: 2, got: 0 }
  ]);
  assert.ok(m.warnings.length > 0);
});

test("buildMock: 미검증 문항은 모의고사에 넣지 않는다", () => {
  const BP1 = {
    exam: { total_points: 1000 },
    subjects: [{ id: 1, name: "법", count: 2, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 2, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  const bank = [
    mcq({ id: "Q-V1", subject: 1, topic: "1.1.1", points: 8, verified: true }),
    mcq({ id: "Q-V2", subject: 1, topic: "1.1.2", points: 8, verified: false })
  ];
  const m = C.buildMock("full", bank, BP1, {}, C.seededRandom(2));
  assert.deepEqual(m.qids, ["Q-V1"]);
  assert.equal(m.partial, true);
});

/* 2026-09-07 시점 검증 은행(96문항)의 과목·유형·배점 분포 스냅샷.
 * app/data의 실제 문항 수는 검증 배치가 계속 돌아 늘어나므로(테스트가 깨진다)
 * "문항이 부족한 은행" 시나리오는 이 고정 픽스처로 재현한다. */
const BANK96_SHAPE = {
  1: { mcq: { 8: 5, 12: 3, 18: 0 }, short: { 8: 2, 12: 0, 18: 0 } },
  2: { mcq: { 8: 8, 12: 6, 18: 1 }, short: { 8: 6, 12: 2, 18: 0 } },
  3: { mcq: { 8: 12, 12: 10, 18: 2 }, short: { 8: 0, 12: 0, 18: 0 } },
  4: { mcq: { 8: 9, 12: 11, 18: 3 }, short: { 8: 11, 12: 5, 18: 0 } }
};
function bank96() {
  const out = [];
  let k = 0;
  [1, 2, 3, 4].forEach(s => {
    ["mcq", "short"].forEach(type => {
      [8, 12, 18].forEach(p => {
        const cnt = BANK96_SHAPE[s][type][p] || 0;
        for (let i = 0; i < cnt; i++) {
          k++;
          // 세부항목은 3문항씩 흩어 놓는다(같은 세부항목 상한을 건드리지 않는 조건)
          const base = {
            id: "Q-B96-" + String(k).padStart(3, "0"), subject: s,
            topic: s + ".b" + Math.ceil(k / 3), points: p,
            difficulty: 3, importance: "M", verified: true
          };
          out.push(type === "mcq" ? mcq(base) : short(base));
        }
      });
    });
  });
  return out;
}

test("buildMock: 문항이 부족한 은행(96문항 스냅샷) full → partial, 부족 슬롯 정확", () => {
  const bank = bank96();
  assert.equal(bank.length, 96);
  assert.deepEqual([1, 2, 3, 4].map(s => bank.filter(q => q.subject === s).length), [10, 23, 24, 39]);
  const m = C.buildMock("full", bank, BP, {}, C.seededRandom(20260919));
  assert.equal(m.partial, true);
  assert.equal(m.qids.length, 88);                 // 같은 과목·유형 안에서만 대체 가능 → 12문항 부족
  assert.equal(new Set(m.qids).size, 88);
  assert.equal(m.total_points, 908);               // 문항 points 합산(대체로 배점이 바뀐다)
  assert.deepEqual(m.slots_missing, [
    { subject: 1, type: "short", points: 12, need: 1, got: 0 },
    { subject: 2, type: "mcq", points: 8, need: 11, got: 8 },
    { subject: 2, type: "mcq", points: 12, need: 8, got: 6 },
    { subject: 3, type: "mcq", points: 8, need: 14, got: 13 },
    { subject: 4, type: "mcq", points: 8, need: 15, got: 11 },
    { subject: 4, type: "mcq", points: 12, need: 12, got: 11 }
  ]);
  const missing = m.slots_missing.reduce((s, x) => s + (x.need - x.got), 0);
  assert.equal(missing, 12);
  assert.equal(m.order.filter(o => o.type === "short").length, 19);
});

test("buildMock: 실제 app/data 은행으로도 불변식이 성립한다(수치는 검증하지 않는다)", () => {
  const B = realBank();
  assert.ok(B.questions.length > 0, "검증된 문항이 하나도 없다");
  const byId = new Map();
  B.questions.forEach(q => byId.set(q.id, q));
  const m = C.buildMock("full", B.questions, B.bp, {}, C.seededRandom(20260919));

  // ① 중복 없음 · 전부 검증 문항
  assert.equal(new Set(m.qids).size, m.qids.length);
  m.qids.forEach(id => {
    const q = byId.get(id);
    assert.ok(q, id + " 가 은행에 없다");
    assert.equal(q.verified, true, id + " 는 미검증 문항이다");
  });

  // ② order = qids와 같은 순서, 번호는 인덱스+1, 문항 속성 일치
  assert.equal(m.order.length, m.qids.length);
  m.order.forEach((o, i) => {
    const q = byId.get(o.qid);
    assert.equal(o.no, i + 1);
    assert.equal(o.qid, m.qids[i]);
    assert.equal(o.subject, Number(q.subject));
    assert.equal(o.type, q.type === "short" ? "short" : "mcq");
    assert.equal(o.points, Number(q.points));
  });

  // ③ 선다형이 모두 단답형보다 앞, 유형 안에서 과목 오름차순
  const firstShort = m.order.findIndex(o => o.type === "short");
  const cut = firstShort === -1 ? m.order.length : firstShort;
  assert.ok(m.order.slice(0, cut).every(o => o.type === "mcq"));
  assert.ok(m.order.slice(cut).every(o => o.type === "short"));
  const mcqSubs = m.order.slice(0, cut).map(o => o.subject);
  const shortSubs = m.order.slice(cut).map(o => o.subject);
  assert.deepEqual(mcqSubs, mcqSubs.slice().sort((a, b) => a - b));
  assert.deepEqual(shortSubs, shortSubs.slice().sort((a, b) => a - b));

  // ④ 과목·유형별 문항 수가 블루프린트 슬롯을 넘지 않는다
  B.bp.subjects.forEach(s => {
    const inSub = m.order.filter(o => o.subject === s.id);
    assert.ok(inSub.length <= s.count, "과목 " + s.id + " " + inSub.length + " > " + s.count);
    assert.ok(inSub.filter(o => o.type === "mcq").length <= s.mcq);
    assert.ok(inSub.filter(o => o.type === "short").length <= s.short);
  });

  // ⑤ 채운 문항 + 못 채운 슬롯 = 계획된 100문항, partial 플래그 일관
  const shortfall = m.slots_missing.reduce((acc, x) => acc + (x.need - x.got), 0);
  assert.equal(m.planned_count, 100);
  assert.equal(m.qids.length + shortfall, 100);
  assert.equal(m.partial, m.qids.length < m.planned_count || m.total_points !== m.planned_points);
  assert.ok(m.total_points > 0);
  assert.equal(m.minutes, 120);

  // ⑥ 같은 seed면 같은 시험지
  const m2 = C.buildMock("full", B.questions, B.bp, {}, C.seededRandom(20260919));
  assert.deepEqual(m2.qids, m.qids);
});

/* ================================================================== *
 * 13. 모의고사 채점 — gradeMock · mockRecord
 * ================================================================== */
function ansMap(bank, qids, fn) {
  const byId = new Map();
  bank.forEach(q => byId.set(q.id, q));
  const out = {};
  qids.forEach((id, i) => {
    const r = fn(byId.get(id), i);
    if (r) out[id] = r;
  });
  return out;
}
const rightAns = q => ({ given: q.type === "short" ? "페녹시에탄올" : q.answer, conf: 2, sec: 40 });
const wrongAns = q => ({ given: q.type === "short" ? "엉뚱한답" : (q.answer + 1) % 5, conf: 1, sec: 50 });

test("gradeMock: 만점 = 1000점, partial 아님, 과락 없음", () => {
  const bank = fullBank(0);
  const m = C.buildMock("full", bank, BP, {}, C.seededRandom(4));
  assert.equal(m.partial, false);
  const g = C.gradeMock(m, ansMap(bank, m.qids, rightAns), bank, BP);
  assert.equal(g.raw, 1000);
  assert.equal(g.max_included, 1000);
  assert.equal(g.scaled, 1000);
  assert.equal(g.adj, 1000);
  assert.equal(g.partial, false);
  assert.equal(g.pass, true);
  assert.deepEqual(g.fail_subjects, []);
  assert.deepEqual(g.mcq, { n: 80, correct: 80, points: 806 });
  assert.deepEqual(g.short, { n: 20, correct: 20, points: 194, self_marked: 0 });
  assert.deepEqual(g.unanswered, []);
  assert.equal(g.avg_sec, 40);
  assert.deepEqual(g.by_subject.map(x => x.scaled), [100, 250, 250, 400]);
  assert.ok(g.by_subject.every(x => x.pass === true && x.ratio === 1));
});

test("gradeMock: 0점 = 전 과목 과락, 무응답과 오답을 구분한다", () => {
  const bank = fullBank(0);
  const m = C.buildMock("full", bank, BP, {}, C.seededRandom(4));
  const g = C.gradeMock(m, ansMap(bank, m.qids, wrongAns), bank, BP);
  assert.equal(g.raw, 0);
  assert.equal(g.scaled, 0);
  assert.equal(g.pass, false);
  assert.deepEqual(g.fail_subjects, [1, 2, 3, 4]);
  assert.deepEqual(g.unanswered, []);
  assert.equal(g.mcq.correct, 0);
  assert.equal(g.short.correct, 0);
  // 답을 아예 비우면 unanswered
  const g2 = C.gradeMock(m, ansMap(bank, m.qids, (q, i) => (i < 3 ? { given: null, conf: 0, sec: 5 } : rightAns(q))), bank, BP);
  assert.deepEqual(g2.unanswered, m.qids.slice(0, 3));
  assert.equal(g2.raw, 1000 - m.order.slice(0, 3).reduce((s, o) => s + o.points, 0));
});

const G_QS = [
  mcq({ id: "G1", subject: 1, topic: "1.1.1", points: 8 }),
  mcq({ id: "G2", subject: 1, topic: "1.1.2", points: 8 }),
  mcq({ id: "G3", subject: 2, topic: "2.1.1", points: 12 }),
  mcq({ id: "G4", subject: 3, topic: "3.1.1", points: 8 }),
  mcq({ id: "G5", subject: 4, topic: "4.1.1", points: 18 })
];
const G_MOCK = { preset: "full", qids: ["G1", "G2", "G3", "G4", "G5"], partial: true, minutes: 120 };
const G_ANS = {
  G1: { given: 0, conf: 2, sec: 30 },
  G2: { given: 3, conf: 1, sec: 200 },
  G3: { given: 0, conf: 2, sec: 60 },
  G4: { given: 4, conf: 0, sec: 20 },
  G5: { given: 0, conf: 0, sec: 100 }
};

test("gradeMock: partial이면 환산 점수(획득/포함 × 1000), 과목도 같은 방식", () => {
  const g = C.gradeMock(G_MOCK, G_ANS, G_QS, BP);
  assert.equal(g.raw, 38);
  assert.equal(g.max_included, 54);
  assert.equal(g.partial, true);
  assert.equal(g.scaled, 704);                       // round(38/54×1000)
  assert.deepEqual(g.by_subject.map(x => [x.id, x.raw, x.scaled, x.ratio, x.pass]), [
    [1, 8, 50, 0.5, true],
    [2, 12, 250, 1, true],
    [3, 0, 0, 0, false],
    [4, 18, 400, 1, true]
  ]);
  assert.deepEqual(g.fail_subjects, [3]);
  assert.equal(g.pass, false);
});

test("gradeMock: 찍어서 맞힌 문항은 adj에서 0.8배 차감(환산 배율 적용)", () => {
  const g = C.gradeMock(G_MOCK, G_ANS, G_QS, BP);
  assert.deepEqual(g.guessed_correct, ["G5"]);       // 오답·찍음(G4)은 세지 않는다
  assert.equal(g.guessed_points, 18);
  assert.equal(g.adj, 704 - 267);                    // round(0.8×18×1000/54) = 267
  // partial이 아니면 배율 없이 차감
  const g2 = C.gradeMock({ preset: "full", qids: ["G5"], partial: false },
    { G5: { given: 0, conf: 0, sec: 10 } }, [G_QS[4]], { subjects: BP.subjects, exam: { total_points: 18, pass_total: 600 } });
  assert.equal(g2.partial, false);
  assert.equal(g2.scaled, 18);
  assert.equal(g2.adj, 18 - 14);                     // round(0.8×18)=14
});

test("gradeMock: by_topic은 정답률 낮은 순, slowest는 상위 5, avg_sec은 응답 평균", () => {
  const g = C.gradeMock(G_MOCK, G_ANS, G_QS, BP);
  assert.deepEqual(g.by_topic.map(x => [x.id, x.n, x.correct, x.pct]), [
    ["1.1.2", 1, 0, 0], ["3.1.1", 1, 0, 0],
    ["1.1.1", 1, 1, 100], ["2.1.1", 1, 1, 100], ["4.1.1", 1, 1, 100]
  ]);
  assert.deepEqual(g.slowest, [
    { qid: "G2", sec: 200 }, { qid: "G5", sec: 100 }, { qid: "G3", sec: 60 },
    { qid: "G1", sec: 30 }, { qid: "G4", sec: 20 }
  ]);
  assert.equal(g.avg_sec, 82);
  // topics를 넘기면 by_topic에 이름이 붙는다
  const g2 = C.gradeMock(G_MOCK, G_ANS, G_QS, BP, [{ id: "1.1.2", kind: "sub", name: "유형과 종류" }]);
  assert.equal(g2.by_topic[0].name, "유형과 종류");
});

test("gradeMock: 과락 경계 — 환산 후 40%면 통과, 그 아래면 과락", () => {
  // 과목② 포함 만점 246점(8×27 + 12 + 18), pass_points 100/250
  const qs = [];
  for (let i = 0; i < 27; i++) qs.push(mcq({ id: "B8-" + i, subject: 2, topic: "2.1." + i, points: 8 }));
  qs.push(mcq({ id: "B12", subject: 2, topic: "2.2.1", points: 12 }));
  qs.push(mcq({ id: "B18", subject: 2, topic: "2.2.2", points: 18 }));
  const qids = qs.map(q => q.id);
  const mk = { preset: "full", qids: qids, partial: true };
  // 98점 = 8×10 + 18 → 39.84% → round(98/246×250) = 100 → 딱 통과
  const a1 = {};
  qids.forEach(id => { a1[id] = { given: 1, conf: 2, sec: 10 }; });
  ["B8-0", "B8-1", "B8-2", "B8-3", "B8-4", "B8-5", "B8-6", "B8-7", "B8-8", "B8-9", "B18"]
    .forEach(id => { a1[id] = { given: 0, conf: 2, sec: 10 }; });
  const g1 = C.gradeMock(mk, a1, qs, BP);
  assert.equal(g1.max_included, 246);
  assert.equal(g1.by_subject.find(x => x.id === 2).raw, 98);
  assert.equal(g1.by_subject.find(x => x.id === 2).scaled, 100);
  assert.equal(g1.by_subject.find(x => x.id === 2).pass, true);
  assert.equal(g1.fail_subjects.indexOf(2), -1);
  // 8점 하나를 더 틀리면 90점 → 36.6% → 91 → 과락
  const a2 = Object.assign({}, a1, { "B8-9": { given: 1, conf: 2, sec: 10 } });
  const g2 = C.gradeMock(mk, a2, qs, BP);
  assert.equal(g2.by_subject.find(x => x.id === 2).raw, 90);
  assert.equal(g2.by_subject.find(x => x.id === 2).scaled, 91);
  assert.equal(g2.by_subject.find(x => x.id === 2).pass, false);
  assert.ok(g2.fail_subjects.indexOf(2) !== -1);
});

test("gradeMock: 단답 self_marked는 정답으로 인정하고 따로 센다", () => {
  const qs = [short({ id: "S1", subject: 4, topic: "4.1.1", points: 8, answer_text: ["페녹시에탄올"] })];
  const mk = { preset: "full", qids: ["S1"], partial: true };
  const g = C.gradeMock(mk, { S1: { given: "방부제로쓰는그것", conf: 1, sec: 30, self_marked: true } }, qs, BP);
  assert.equal(g.raw, 8);
  assert.deepEqual(g.short, { n: 1, correct: 1, points: 8, self_marked: 1 });
  const g2 = C.gradeMock(mk, { S1: { given: "방부제로쓰는그것", conf: 1, sec: 30 } }, qs, BP);
  assert.equal(g2.raw, 0);
  assert.equal(g2.short.self_marked, 0);
});

test("gradeMock: half 모의는 합격 판정을 하지 않고(pass null) 빠진 과목을 missing_subjects로 알린다", () => {
  const bank = fullBank(0);
  const m = C.buildMock("half", bank, BP, {}, C.seededRandom(4));
  assert.equal(m.partial, false);                    // 계획대로 편성됐다
  assert.equal(m.planned_points, 504);
  const g = C.gradeMock(m, ansMap(bank, m.qids, rightAns), bank, BP);
  assert.equal(g.partial, false);                    // → 환산 없음(계획 만점 504점 기준)
  assert.equal(g.partial_reason, null);
  assert.equal(g.max_included, 504);
  assert.equal(g.max_reference, 504);
  assert.equal(g.scaled, 504);
  assert.equal(g.pass, null);                        // 과목④가 아예 없으니 합격 판정 불가
  assert.deepEqual(g.missing_subjects, [4]);
  assert.deepEqual(g.fail_subjects, []);             // 빠진 과목은 과락이 아니다
  assert.equal(g.by_subject.find(x => x.id === 4).max_included, 0);
  assert.equal(g.by_subject.find(x => x.id === 4).pass, null);
  assert.deepEqual(g.by_subject.slice(0, 3).map(x => x.scaled), [100, 250, 250]);
  assert.ok(g.by_subject.slice(0, 3).every(x => x.pass === true && x.ratio === 1));
  const rec = C.mockRecord(m, g, "sid-h", "2026-09-11");
  assert.equal(rec.pass, null);                      // 기록에도 null로 남긴다(false 아님)
  assert.deepEqual(rec.missing_subjects, [4]);
  assert.equal(rec.max_reference, 504);
});

test("partial 정의 일치: buildMock과 gradeMock이 같은 시험지에서 같은 판단을 한다", () => {
  const B = realBank();
  const cases = [
    { name: "실제 app/data 은행", bank: B.questions, bp: B.bp },
    { name: "96문항 스냅샷", bank: bank96(), bp: BP },
    { name: "완비 은행", bank: fullBank(2), bp: BP },
    { name: "아주 얇은 은행", bank: bank96().slice(0, 12), bp: BP }
  ];
  cases.forEach(c => {
    const m = C.buildMock("full", c.bank, c.bp, {}, C.seededRandom(1234));
    const g = C.gradeMock(m, {}, c.bank, c.bp);
    assert.equal(m.partial, m.qids.length < m.planned_count || m.total_points !== m.planned_points, c.name);
    assert.equal(g.partial, m.partial, c.name + ": partial 불일치");
    assert.equal(g.max_included, m.total_points, c.name);
    assert.equal(g.max_reference, m.planned_points, c.name);
    if (!m.partial) assert.equal(g.partial_reason, null, c.name);
    else assert.ok(["missing", "substituted", "both"].indexOf(g.partial_reason) !== -1, c.name + ": " + g.partial_reason);
  });
  // 프리셋별로도 일치
  ["full", "half", "mini3"].forEach(preset => {
    const bank = fullBank(2);
    const m = C.buildMock(preset, bank, BP, {}, C.seededRandom(3));
    const g = C.gradeMock(m, {}, bank, BP);
    assert.equal(m.partial, false, preset);
    assert.equal(g.partial, false, preset);
    assert.equal(g.max_reference, m.planned_points, preset);
  });
});

test("gradeMock: partial_reason은 부족(missing)·대체(substituted)·둘 다(both)를 구분한다", () => {
  // 부족만: 96문항 스냅샷은 12문항 부족 + 대체 4문항 → both
  const bank = bank96();
  const both = C.gradeMock(C.buildMock("full", bank, BP, {}, C.seededRandom(20260919)), {}, bank, BP);
  assert.equal(both.partial, true);
  assert.equal(both.partial_reason, "both");
  // 대체만: 문항 수는 맞고 배점만 다르다
  const BP1 = {
    exam: { total_points: 16, pass_total: 600 },
    subjects: [{ id: 1, name: "법", count: 2, points: 100, pass_points: 40,
                 slots: { mcq: { "8": 2, "12": 0, "18": 0 }, short: { "8": 0, "12": 0, "18": 0 } } }]
  };
  const b2 = [
    mcq({ id: "R-8", subject: 1, topic: "1.1.1", points: 8 }),
    mcq({ id: "R-12", subject: 1, topic: "1.1.2", points: 12 })
  ];
  const m2 = C.buildMock("full", b2, BP1, {}, C.seededRandom(2));
  assert.equal(m2.substituted, 1);
  const g2 = C.gradeMock(m2, {}, b2, BP1);
  assert.equal(g2.partial, true);
  assert.equal(g2.partial_reason, "substituted");
  // 부족만: 슬롯을 못 채웠고 대체도 없다
  const b3 = [mcq({ id: "R-only", subject: 1, topic: "1.1.1", points: 8 })];
  const m3 = C.buildMock("full", b3, BP1, {}, C.seededRandom(2));
  assert.equal(m3.substituted, 0);
  const g3 = C.gradeMock(m3, {}, b3, BP1);
  assert.equal(g3.partial_reason, "missing");
  // 메타데이터 없는 손수 만든 mock(축소)도 missing으로 본다
  assert.equal(C.gradeMock(G_MOCK, G_ANS, G_QS, BP).partial_reason, "missing");
  // 계획대로면 null
  const full = fullBank(0);
  assert.equal(C.gradeMock(C.buildMock("full", full, BP, {}, C.seededRandom(1)), {}, full, BP).partial_reason, null);
});

test("gradeMock: 총점 판정은 표시 점수(scaled)로 하고, 과락은 과목 환산 점수로 한다", () => {
  // 과목별 만점 비중과 다르게 뽑힌 축소 모의 — 표시 총점과 판정이 어긋나면 안 된다
  const qs = [
    mcq({ id: "P-1", subject: 1, topic: "1.1.1", points: 8 }),
    mcq({ id: "P-2", subject: 2, topic: "2.1.1", points: 8 }),
    mcq({ id: "P-3", subject: 3, topic: "3.1.1", points: 8 }),
    mcq({ id: "P-4", subject: 4, topic: "4.1.1", points: 8 })
  ];
  const mk = { preset: "full", qids: qs.map(q => q.id), partial: true, planned_count: 100, planned_points: 1000 };
  const ok = { given: 0, conf: 2, sec: 10 }, bad = { given: 1, conf: 2, sec: 10 };
  // 4문항 중 3문항 정답(과목③만 오답) → scaled 750, 과목③ 0점 → 과락
  const g = C.gradeMock(mk, { "P-1": ok, "P-2": ok, "P-3": bad, "P-4": ok }, qs, BP);
  assert.equal(g.scaled, 750);
  assert.deepEqual(g.fail_subjects, [3]);
  assert.deepEqual(g.missing_subjects, []);
  assert.equal(g.pass, false);                       // 총점은 넘었지만 과락
  // 전 과목 정답 → scaled 1000, 과락 없음 → pass true (표시값과 판정이 일치)
  const g2 = C.gradeMock(mk, { "P-1": ok, "P-2": ok, "P-3": ok, "P-4": ok }, qs, BP);
  assert.equal(g2.scaled, 1000);
  assert.deepEqual(g2.fail_subjects, []);
  assert.equal(g2.pass, true);
  // 전 과목 오답 → scaled 0 → pass false
  const g3 = C.gradeMock(mk, { "P-1": bad, "P-2": bad, "P-3": bad, "P-4": bad }, qs, BP);
  assert.equal(g3.scaled, 0);
  assert.equal(g3.pass, false);
  assert.deepEqual(g3.fail_subjects, [1, 2, 3, 4]);
});

test("gradeMock: 데이터에 없는 qid는 missing_questions로 알리고 채점에서 뺀다", () => {
  const mk = { preset: "full", qids: ["G1", "없는문항", "G3"], partial: true };
  const g = C.gradeMock(mk, G_ANS, G_QS, BP);
  assert.deepEqual(g.missing_questions, ["없는문항"]);
  assert.equal(g.max_included, 20);                  // 8 + 12 (없는 문항은 만점에서도 뺀다)
  assert.equal(g.raw, 20);
  assert.equal(g.mcq.n, 2);
  assert.deepEqual(g.unanswered, []);                // 없는 문항을 무응답으로 세지 않는다
  assert.deepEqual(C.gradeMock(G_MOCK, G_ANS, G_QS, BP).missing_questions, []);
});

test("gradeMock: 빈 답에 붙은 self_marked는 세지 않는다", () => {
  const qs = [short({ id: "SB", subject: 4, topic: "4.1.1", points: 8, answer_text: ["페녹시에탄올"] })];
  const mk = { preset: "full", qids: ["SB"], partial: true };
  const g = C.gradeMock(mk, { SB: { given: "", conf: 1, sec: 5, self_marked: true } }, qs, BP);
  assert.equal(g.raw, 0);
  assert.deepEqual(g.unanswered, ["SB"]);
  assert.deepEqual(g.short, { n: 1, correct: 0, points: 0, self_marked: 0 });
  const g2 = C.gradeMock(mk, { SB: { given: null, conf: 1, sec: 5, self_marked: true } }, qs, BP);
  assert.equal(g2.short.self_marked, 0);
});

test("gradeMock: 선다 given은 0~4 정수만 정답으로 인정한다(문자열 금지)", () => {
  const qs = [mcq({ id: "N-1", subject: 1, topic: "1.1.1", points: 8, answer: 0 })];
  const mk = { preset: "full", qids: ["N-1"], partial: true };
  assert.equal(C.gradeMock(mk, { "N-1": { given: 0, conf: 2, sec: 10 } }, qs, BP).raw, 8);
  assert.equal(C.gradeMock(mk, { "N-1": { given: "0", conf: 2, sec: 10 } }, qs, BP).raw, 0);
});

test("mockRecord: pl.v1.mocks 한 줄로 접는다(qids 포함 — 다음 모의 exclude용)", () => {
  const g = C.gradeMock(G_MOCK, G_ANS, G_QS, BP);
  const rec = C.mockRecord(G_MOCK, g, "sid-9", "2026-09-11");
  assert.equal(rec.sid, "sid-9");
  assert.equal(rec.date, "2026-09-11");
  assert.equal(rec.preset, "full");
  assert.equal(rec.raw, 38);
  assert.equal(rec.max_included, 54);
  assert.equal(rec.scaled, 704);
  assert.equal(rec.adj, 437);
  assert.equal(rec.pass, false);
  assert.deepEqual(rec.fail_subjects, [3]);
  assert.equal(rec.partial, true);
  assert.deepEqual(rec.subject, [50, 250, 0, 400]);
  assert.deepEqual(rec.mcq, { n: 5, correct: 3, points: 38 });
  assert.deepEqual(rec.short, { n: 0, correct: 0, points: 0, self_marked: 0 });
  assert.equal(rec.guessedCorrect, 1);
  assert.equal(rec.avgSec, 82);
  assert.equal(rec.slowest.length, 5);
  assert.equal(rec.n, 5);
  assert.deepEqual(rec.qids, G_MOCK.qids);
  // 문항 본문은 저장하지 않는다
  assert.ok(JSON.stringify(rec).indexOf("다음 중 옳은 것은") === -1);
});

/* ================================================================== *
 * 14. 예상 점수 · READINESS
 * ================================================================== */
const EX_TOPICS = [1, 2, 3, 4].map(s => ({
  id: s + ".1.1", subject: s, parent: s + ".1", kind: "sub",
  name: "과목" + s + " 세부", exp_q: 4, exp_short: 1, importance: "H"
}));
const EX_QS = [0, 1, 2, 3].map(i => mcq({ id: "E-1-" + i, subject: 1, topic: "1.1.1", points: 8 }));
// 시도 없음 → 전 과목 숙달 20 → 선다 p=0.36, 단답 p=0.17
// ①72×0.36+28×0.17=30.68 ②202×0.36+48×0.17=80.88 ③250×0.36=90 ④282×0.36+118×0.17=121.58
const BASE_E = [31, 81, 90, 122];

test("expectedScore: 모의 0회 = 숙달 기반, band 120, 신뢰 낮음", () => {
  const e = C.expectedScore([], EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.equal(e.n_mocks, 0);
  assert.equal(e.basis, "mastery");
  assert.deepEqual(e.by_subject.map(x => x.E), BASE_E);
  assert.equal(e.E, 324);
  assert.equal(e.mastery_based, 324);
  assert.equal(e.mock_based, 324);          // 모의가 없으면 숙달로 채운다
  assert.equal(e.band, 120);
  assert.equal(e.low, 204);
  assert.equal(e.high, 444);
  assert.ok(e.note.indexOf("초기 추정") !== -1, e.note);
  assert.deepEqual(e.by_subject.map(x => x.max), [100, 250, 250, 400]);
  close(e.by_subject[0].ratio, 0.31);
});

test("expectedScore: 모의 1회 = 0.5 모의 + 0.5 숙달, band 90(찍음 보정 adj 사용)", () => {
  const mocks = [{ sid: "m1", date: "2026-09-06", preset: "full", scaled: 700, adj: 660, subject: [50, 180, 170, 300] }];
  const e = C.expectedScore(mocks, EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.equal(e.n_mocks, 1);
  assert.equal(e.basis, "mixed");
  assert.equal(e.band, 90);
  assert.equal(e.mock_based, 660);          // adj/scaled 배율을 과목 점수에 적용
  assert.deepEqual(e.by_subject.map(x => x.E), [39, 125, 125, 202]);
  assert.equal(e.E, 491);
  assert.equal(e.low, 401);
  assert.equal(e.high, 581);
});

test("expectedScore: 모의 2회 = 0.7 모의 + 0.3 숙달, 최근 가중 0.7·0.3, band 60", () => {
  const mocks = [
    { sid: "m1", date: "2026-09-03", preset: "full", scaled: 600, adj: 600, subject: [40, 150, 150, 260] },
    { sid: "m2", date: "2026-09-06", preset: "full", scaled: 800, adj: 800, subject: [60, 200, 200, 340] }
  ];
  const e = C.expectedScore(mocks, EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.equal(e.n_mocks, 2);
  assert.equal(e.basis, "mock");
  assert.equal(e.band, 60);
  assert.equal(e.mock_based, 740);          // 0.7×최근 + 0.3×직전
  assert.deepEqual(e.by_subject.map(x => x.E), [47, 154, 157, 258]);
  assert.equal(e.E, 616);
  assert.equal(e.low, 556);
});

test("expectedScore: 3회 이상은 최근 3회만 0.6·0.3·0.1로 쓴다", () => {
  const full = (date, v) => ({ sid: date, date: date, preset: "full", scaled: 1000, adj: 1000, subject: v });
  const mocks = [
    full("2026-08-20", [0, 0, 0, 0]),                       // 오래된 것은 무시
    full("2026-09-01", [100, 250, 250, 400]),
    full("2026-09-04", [100, 250, 250, 400]),
    full("2026-09-06", [100, 250, 250, 400])
  ];
  const e = C.expectedScore(mocks, EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.equal(e.n_mocks, 4);
  assert.equal(e.mock_based, 1000);
  assert.deepEqual(e.by_subject.map(x => x.E), [79, 199, 202, 316]);
  assert.equal(e.E, 796);
  assert.equal(e.band, 60);
});

test("expectedScore: half·mini3은 포함 과목만 반영하고 나머지는 숙달로 채운다", () => {
  const mocks = [{ sid: "h1", date: "2026-09-06", preset: "half", scaled: 1000, adj: 1000, subject: [100, 250, 250, 0] }];
  const e = C.expectedScore(mocks, EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.deepEqual(e.by_subject.map(x => x.E), [65, 165, 170, 122]);   // ④는 숙달 그대로(121.58 → 122)
  const m3 = [{ sid: "n1", date: "2026-09-06", preset: "mini3", scaled: 1000, adj: 1000, subject: [0, 0, 250, 0] }];
  const e3 = C.expectedScore(m3, EX_TOPICS, EX_QS, {}, BP, "2026-09-07");
  assert.deepEqual(e3.by_subject.map(x => x.E), [31, 81, 170, 122]);   // ③만 모의 반영
});

test("expectedScore: 시도가 쌓이면 숙달 기반 점수가 오르고, 미검증 문항은 제외된다", () => {
  const atts = {};
  EX_QS.forEach(q => { atts[q.id] = [att({ qid: q.id, at: "2026-09-07T10:00:00", correct: true, conf: 2, sec: 30 })]; });
  const e = C.expectedScore([], EX_TOPICS, EX_QS, atts, BP, "2026-09-07");
  assert.equal(e.by_subject[0].E, 71);                 // 숙달 70 → 72×0.76 + 28×0.595
  close(e.by_subject[0].mastery, 70);
  assert.equal(e.by_subject[0].n, 4);
  assert.deepEqual(e.by_subject.slice(1).map(x => x.E), BASE_E.slice(1));
  // 미검증 문항은 예상 점수 계산에서 빼고, 시도 수도 세지 않는다
  const unver = EX_QS.map(q => Object.assign({}, q, { verified: false }));
  const e2 = C.expectedScore([], EX_TOPICS, unver, atts, BP, "2026-09-07");
  assert.equal(e2.by_subject[0].E, 31);
  assert.equal(e2.by_subject[0].n, 0);
});

test("readiness: SAFE / BORDERLINE / AT RISK 세 분기", () => {
  const bs = ratios => ratios.map((r, i) => ({ id: i + 1, E: 0, max: 100, ratio: r, n: 20 }));
  const safe = C.readiness({ E: 796, low: 736, high: 856, n_mocks: 3, by_subject: bs([0.79, 0.8, 0.81, 0.79]) }, BP);
  assert.equal(safe.label, "SAFE");
  assert.ok(safe.reasons.length > 0);
  const border = C.readiness({ E: 616, low: 556, high: 676, n_mocks: 2, by_subject: bs([0.47, 0.62, 0.63, 0.65]) }, BP);
  assert.equal(border.label, "BORDERLINE");
  const risk = C.readiness({ E: 580, low: 490, high: 670, n_mocks: 1, by_subject: bs([0.31, 0.62, 0.63, 0.65]) }, BP);
  assert.equal(risk.label, "AT RISK");
  assert.ok(risk.reasons.some(x => x.indexOf("600") !== -1), JSON.stringify(risk.reasons));
  // 어느 한 과목만 40% 미달이어도 AT RISK
  const risk2 = C.readiness({ E: 800, low: 740, high: 860, n_mocks: 3, by_subject: bs([0.9, 0.9, 0.39, 0.9]) }, BP);
  assert.equal(risk2.label, "AT RISK");
  assert.ok(risk2.reasons.some(x => x.indexOf("과락") !== -1));
  // 하한만 540 미달이어도 AT RISK
  assert.equal(C.readiness({ E: 700, low: 539, high: 861, n_mocks: 2, by_subject: bs([0.7, 0.7, 0.7, 0.7]) }, BP).label, "AT RISK");
});

test("readiness: 모의 0회면 아무리 좋아도 BORDERLINE이 최대", () => {
  const bs = [0.9, 0.9, 0.9, 0.9].map((r, i) => ({ id: i + 1, E: 0, max: 100, ratio: r, n: 20 }));
  const r = C.readiness({ E: 900, low: 780, high: 1000, n_mocks: 0, by_subject: bs }, BP);
  assert.equal(r.label, "BORDERLINE");
  assert.ok(r.reasons.some(x => x.indexOf("모의") !== -1), JSON.stringify(r.reasons));
});

test("readiness: 경계값 — E 700·하한 620·과목 50%면 SAFE, 하나라도 미달이면 BORDERLINE", () => {
  const bs = ratios => ratios.map((r, i) => ({ id: i + 1, E: 0, max: 100, ratio: r, n: 20 }));
  assert.equal(C.readiness({ E: 700, low: 620, n_mocks: 1, by_subject: bs([0.5, 0.5, 0.5, 0.5]) }, BP).label, "SAFE");
  assert.equal(C.readiness({ E: 699, low: 620, n_mocks: 1, by_subject: bs([0.5, 0.5, 0.5, 0.5]) }, BP).label, "BORDERLINE");
  assert.equal(C.readiness({ E: 700, low: 619, n_mocks: 1, by_subject: bs([0.5, 0.5, 0.5, 0.5]) }, BP).label, "BORDERLINE");
  assert.equal(C.readiness({ E: 700, low: 620, n_mocks: 1, by_subject: bs([0.49, 0.5, 0.5, 0.5]) }, BP).label, "BORDERLINE");
});

test("subjectBadge: 시도 8회 미만은 미측정, 0.55/0.45 경계", () => {
  assert.equal(C.subjectBadge(0.9, 7), "미측정");
  assert.equal(C.subjectBadge(0.1, 0), "미측정");
  assert.equal(C.subjectBadge(0.55, 8), "안전");
  assert.equal(C.subjectBadge(0.6, 20), "안전");
  assert.equal(C.subjectBadge(0.549, 8), "주의");
  assert.equal(C.subjectBadge(0.45, 8), "주의");
  assert.equal(C.subjectBadge(0.449, 8), "위험");
  assert.equal(C.subjectBadge(0, 8), "위험");
});

/* ================================================================== *
 * 15. 적응형 출제
 * ================================================================== */
const A_TODAY = "2026-09-07";
function adaptBank() {
  const topics = [], questions = [];
  [1, 2, 3, 4].forEach(s => {
    for (let k = 1; k <= 3; k++) {
      topics.push({
        id: `${s}.1.${k}`, subject: s, parent: `${s}.1`, kind: "sub",
        name: `과목${s} 세부${k}`, exp_q: 5 - k, exp_short: 0, importance: "M"
      });
      for (let i = 0; i < 5; i++) {
        questions.push(mcq({ id: `A-${s}-${k}-${i}`, subject: s, topic: `${s}.1.${k}`, points: 8 }));
      }
    }
  });
  return { topics: topics, questions: questions };
}
function dueEntry(day) {
  return {
    count: 1, last: "2026-09-04", stage: "reviewing", streak: 0,
    next: day || "2026-09-06", interval: 1, lastWrong: "2026-09-04",
    guessed: 0, relapse: false, memo: ""
  };
}
/** 오답 1회 기록(약점 후보) */
function weakAtts(ids, at) {
  const out = {};
  ids.forEach(id => { out[id] = [att({ qid: id, at: at || "2026-09-06T10:00:00", correct: false, conf: 1, why: "unknown" })]; });
  return out;
}

test("buildAdaptiveSet: 비중 W50/R30/N20 → n=10은 5/3/2, 만기 문항이 먼저 들어간다", () => {
  const B = adaptBank();
  const due = ["A-1-1-0", "A-2-1-0", "A-3-1-0", "A-4-1-0"];
  const weak = ["A-1-2-0", "A-1-2-1", "A-2-2-0", "A-2-2-1", "A-3-2-0", "A-3-2-1", "A-4-2-0", "A-4-2-1"];
  const mistakes = {};
  due.forEach(id => { mistakes[id] = dueEntry(); });
  const atts = Object.assign(weakAtts(weak), weakAtts(due, "2026-09-04T10:00:00"));
  const r = C.buildAdaptiveSet(10, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(21));
  assert.deepEqual(r.mix, { W: 5, R: 3, N: 2 });
  assert.equal(r.qids.length, 10);
  assert.equal(new Set(r.qids).size, 10);
  // 만기 오답 3개(만기일 같으면 qid 순)가 맨 앞
  assert.deepEqual(r.qids.slice(0, 3), ["A-1-1-0", "A-2-1-0", "A-3-1-0"]);
  // 나머지는 약점(시도 있음) + 새 문항(미출제)
  const untried = r.qids.filter(id => !atts[id]);
  assert.equal(untried.length, 2);
  // n=20이면 10/6/4
  const r2 = C.buildAdaptiveSet(20, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(21));
  assert.equal(r2.qids.length, 20);
  assert.equal(new Set(r2.qids).size, 20);
  assert.equal(r2.mix.R, 4);                      // 만기 4개뿐 → 부족분은 W→N으로
  assert.equal(r2.mix.W, 8);                      // 약점 후보 8개뿐
  assert.equal(r2.mix.W + r2.mix.R + r2.mix.N, 20);
});

test("buildAdaptiveSet: 같은 seed면 같은 결과, 다른 seed면 달라진다", () => {
  const B = adaptBank();
  const mistakes = { "A-1-1-0": dueEntry() };
  const atts = weakAtts(["A-1-2-0", "A-2-2-0", "A-3-2-0", "A-4-2-0", "A-1-2-1", "A-2-2-1"]);
  const a = C.buildAdaptiveSet(10, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(5));
  const b = C.buildAdaptiveSet(10, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(5));
  assert.deepEqual(a.qids, b.qids);
  const c = C.buildAdaptiveSet(10, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(777));
  assert.notDeepEqual(a.qids, c.qids);
});

test("buildAdaptiveSet: 만기·약점이 없어도 n개를 채운다(새 문항으로)", () => {
  const B = adaptBank();
  const r = C.buildAdaptiveSet(10, B.questions, B.topics, {}, {}, A_TODAY, C.seededRandom(9));
  assert.equal(r.qids.length, 10);
  assert.equal(r.mix.R, 0);
  assert.equal(r.mix.W, 0);
  assert.equal(r.mix.N, 10);
  assert.equal(new Set(r.qids).size, 10);
});

test("buildAdaptiveSet: 한 과목 60% 상한(가능할 때), 문항이 그 과목뿐이면 완화", () => {
  const B = adaptBank();
  const due = ["A-1-1-0", "A-1-1-1", "A-1-1-2", "A-1-1-3"];
  const weak = ["A-1-2-0", "A-1-2-1", "A-1-2-2", "A-1-2-3", "A-1-2-4", "A-1-3-0", "A-1-3-1", "A-1-3-2"];
  const mistakes = {};
  due.forEach(id => { mistakes[id] = dueEntry(); });
  const atts = Object.assign(weakAtts(weak), weakAtts(due, "2026-09-04T10:00:00"));
  const r = C.buildAdaptiveSet(10, B.questions, B.topics, atts, mistakes, A_TODAY, C.seededRandom(31));
  assert.equal(r.qids.length, 10);
  const s1 = r.qids.filter(id => id.indexOf("A-1-") === 0).length;
  assert.ok(s1 <= 6, "과목① " + s1 + "문항");
  // 은행이 과목①뿐이면 상한을 완화해서라도 n개를 채운다
  const only1 = B.questions.filter(q => q.subject === 1);
  const r2 = C.buildAdaptiveSet(10, only1, B.topics, atts, mistakes, A_TODAY, C.seededRandom(31));
  assert.equal(r2.qids.length, 10);
});

test("buildAdaptiveSet: P 점수 상위 2배수에서 뽑는다 — 최하위 후보는 빠진다", () => {
  const B = adaptBank();
  // 만기 3개(과목②③④) + 미출제 2개는 다른 과목에서, 약점 후보 12개는 모두 과목①
  const mistakes = { "A-2-1-0": dueEntry(), "A-3-1-0": dueEntry(), "A-4-1-0": dueEntry() };
  const hi = [], lo = [];
  for (let k = 1; k <= 3; k++) for (let i = 0; i < 5; i++) {
    const id = `A-1-${k}-${i}`;
    if (hi.length < 10) hi.push(id); else if (lo.length < 2) lo.push(id);
  }
  const qs = B.questions.map(q => (hi.indexOf(q.id) !== -1 ? Object.assign({}, q, { importance: "H" })
    : (lo.indexOf(q.id) !== -1 ? Object.assign({}, q, { importance: "L" }) : q)));
  const atts = {};
  hi.forEach(id => { atts[id] = [att({ qid: id, at: "2026-09-06T10:00:00", correct: false, conf: 1, why: "unknown" })]; });
  lo.forEach(id => { atts[id] = [att({ qid: id, at: "2026-08-28T10:00:00", correct: false, conf: 2, why: "slip" })]; });
  ["A-2-1-0", "A-3-1-0", "A-4-1-0"].forEach(id => { atts[id] = [att({ qid: id, at: "2026-09-04T10:00:00", correct: false, conf: 1 })]; });
  for (let seed = 1; seed <= 6; seed++) {
    const r = C.buildAdaptiveSet(10, qs, B.topics, atts, mistakes, A_TODAY, C.seededRandom(seed));
    assert.equal(r.mix.W, 5);
    lo.forEach(id => assert.equal(r.qids.indexOf(id), -1, "seed " + seed + ": " + id + " 는 P 하위라 빠져야 한다"));
  }
});

test("buildAdaptiveSet: 만기 오답이 모자라면 같은 vg 형제로 채운다", () => {
  const B = adaptBank();
  const qs = [
    mcq({ id: "V-1", subject: 1, topic: "1.1.1", vg: "VG-A" }),
    mcq({ id: "V-2", subject: 1, topic: "1.1.1", vg: "VG-A" }),
    mcq({ id: "V-3", subject: 1, topic: "1.1.1", vg: "VG-A" })
  ].concat(B.questions.filter(q => q.subject !== 1));
  const topics = [{ id: "1.1.1", subject: 1, kind: "sub", name: "정의", exp_q: 3 }].concat(B.topics);
  const mistakes = { "V-1": dueEntry() };
  const atts = { "V-1": [att({ qid: "V-1", at: "2026-09-04T10:00:00", correct: false, conf: 1 })] };
  // n=10 → R 몫 3개인데 만기는 1개 → 같은 vg 형제 2개로 채운다
  const r = C.buildAdaptiveSet(10, qs, topics, atts, mistakes, A_TODAY, C.seededRandom(6));
  assert.equal(r.qids[0], "V-1");
  assert.equal(r.mix.R, 3);
  assert.ok(r.qids.indexOf("V-2") !== -1 && r.qids.indexOf("V-3") !== -1, JSON.stringify(r.qids));
  assert.equal(r.qids.length, 10);
  assert.equal(new Set(r.qids).size, 10);
});

/* ================================================================== *
 * 16. 주간 리포트
 * ================================================================== */
const W_QS = [
  mcq({ id: "W1", subject: 1, topic: "1.1.1" }),
  mcq({ id: "W2", subject: 1, topic: "1.1.2" }),
  mcq({ id: "W3", subject: 2, topic: "2.1.1" }),
  mcq({ id: "W4", subject: 3, topic: "3.1.1" }),
  mcq({ id: "W5", subject: 4, topic: "4.1.1" }),
  mcq({ id: "W6", subject: 4, topic: "4.1.2" })
];
const W_TOPICS = W_QS.map(q => ({ id: q.topic, subject: q.subject, kind: "sub", name: "세부 " + q.topic, exp_q: 3 }));
const W_ATTS = [
  att({ qid: "W1", at: "2026-09-07T09:00:00", correct: true, conf: 2, why: null }),
  att({ qid: "W2", at: "2026-09-07T09:10:00", correct: false, conf: 1, why: "confused" }),
  att({ qid: "W3", at: "2026-09-05T09:00:00", correct: false, conf: 0, why: "guess" }),
  att({ qid: "W4", at: "2026-09-05T09:10:00", correct: true, conf: 0, why: null }),
  att({ qid: "W5", at: "2026-09-01T09:00:00", correct: true, conf: 2, why: null }),
  att({ qid: "W6", at: "2026-08-30T09:00:00", correct: true, conf: 2, why: null })   // 7일 창 밖
];
const W_MOCKS = [
  { sid: "old", date: "2026-08-20", preset: "full", scaled: 400, adj: 380, pass: false },
  { sid: "new", date: "2026-09-06", preset: "half", scaled: 700, adj: 660, pass: false }
];

test("weeklyReport: 최근 7일만 집계(오늘 포함), 과목·토픽·why·conf 분포", () => {
  const r = C.weeklyReport(W_ATTS, W_MOCKS, W_TOPICS, W_QS, "2026-09-07");
  assert.equal(r.days, 7);
  assert.equal(r.n_attempts, 5);
  assert.equal(r.correct_pct, 60);
  assert.deepEqual(r.by_subject, [
    { id: 1, pct: 50, n: 2 }, { id: 2, pct: 0, n: 1 },
    { id: 3, pct: 100, n: 1 }, { id: 4, pct: 100, n: 1 }
  ]);
  assert.deepEqual(r.weak_topics.map(x => [x.id, x.n, x.pct]), [
    ["1.1.2", 1, 0], ["2.1.1", 1, 0], ["1.1.1", 1, 100], ["3.1.1", 1, 100], ["4.1.1", 1, 100]
  ]);
  assert.equal(r.weak_topics[0].name, "세부 1.1.2");
  assert.deepEqual(r.why_dist, { unknown: 0, confused: 1, slip: 0, misread: 0, guess: 1 });
  assert.deepEqual(r.conf_dist, { 2: 2, 1: 1, 0: 2 });
  assert.deepEqual(r.mocks, [{ date: "2026-09-06", preset: "half", scaled: 700, adj: 660, pass: false }]);
});

test("weeklyReport: 약점 토픽은 하위 8개까지, 기록이 없으면 0으로 응답", () => {
  const qs = [], topics = [], atts = [];
  for (let i = 1; i <= 12; i++) {
    qs.push(mcq({ id: "X" + i, subject: 2, topic: "2.9." + i }));
    topics.push({ id: "2.9." + i, subject: 2, kind: "sub", name: "T" + i, exp_q: 2 });
    atts.push(att({ qid: "X" + i, at: "2026-09-06T10:00:00", correct: i > 8, conf: 1, why: "unknown" }));
  }
  const r = C.weeklyReport(atts, [], topics, qs, "2026-09-07");
  assert.equal(r.weak_topics.length, 8);
  assert.ok(r.weak_topics.every(x => x.pct === 0));
  const empty = C.weeklyReport([], [], W_TOPICS, W_QS, "2026-09-07");
  assert.equal(empty.n_attempts, 0);
  assert.equal(empty.correct_pct, 0);
  assert.deepEqual(empty.weak_topics, []);
  assert.deepEqual(empty.why_dist, { unknown: 0, confused: 0, slip: 0, misread: 0, guess: 0 });
  assert.deepEqual(empty.conf_dist, { 2: 0, 1: 0, 0: 0 });
  assert.deepEqual(empty.by_subject, [
    { id: 1, pct: null, n: 0 }, { id: 2, pct: null, n: 0 },
    { id: 3, pct: null, n: 0 }, { id: 4, pct: null, n: 0 }
  ]);
});

/* ================================================================
 * 11. 암기카드 그림(figure) → 인라인 SVG
 * ================================================================ */

/** SVG 안의 <text> 내용을 전부 뽑는다(그림에 실제로 찍힌 글자 확인용) */
function svgTexts(svg) {
  const out = [];
  const re = /<text\b[^>]*>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg))) out.push(m[1]);
  return out;
}
function viewBoxOf(svg) {
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}
/** 그림에 최소 글자 크기(12px) 미만이 없는지 */
function minFontSize(svg) {
  const sizes = [];
  const re = /font-size="([\d.]+)"/g;
  let m;
  while ((m = re.exec(svg))) sizes.push(Number(m[1]));
  return sizes.length ? Math.min.apply(null, sizes) : null;
}

test("figureToSvg(compare): 2열 비교표 — 폭 360·글자 12px 이상·<title>/<desc>·표 글자 그대로", () => {
  const spec = {
    type: "compare", cols: ["등록", "신고"],
    rows: [
      ["대상", "제조업·책임판매업", "맞춤형판매업"],
      ["변경", "30일", "3가지"]
    ]
  };
  const svg = C.figureToSvg(spec);
  assert.ok(svg.startsWith("<svg"), "<svg 로 시작해야 한다");
  assert.ok(svg.endsWith("</svg>"));
  const vb = viewBoxOf(svg);
  assert.equal(vb.w, 360, "viewBox 폭은 360 고정");
  assert.ok(vb.h > 40 && vb.h < 400, "높이는 내용에 맞춰 계산: " + vb.h);
  assert.ok(/<title>/.test(svg) && /<desc>/.test(svg), "접근성 <title>·<desc>");
  assert.ok(/role="img"/.test(svg));
  assert.equal(minFontSize(svg), 12, "글자 최소 12px");
  assert.ok(!/var\(--/.test(svg), "file:// 안전을 위해 CSS 변수를 쓰지 않는다");
  assert.ok(svg.indexOf("#F5F0E6") !== -1, "종이색을 값으로 직접 쓴다");
  const t = svgTexts(svg);
  ["등록", "신고", "대상", "변경", "30일", "3가지"].forEach(function (x) {
    assert.ok(t.indexOf(x) !== -1, "표에 '" + x + "'이(가) 찍혀야 한다: " + JSON.stringify(t));
  });
});

test("figureToSvg(timeline): 좌→우 시간선 — 기간 칩은 황토색, 라벨·기간이 모두 찍힌다", () => {
  const spec = {
    type: "timeline",
    steps: [{ label: "회수계획서", dur: "5일" }, { label: "가등급", dur: "15일" }, { label: "입증 자료", dur: "2년" }]
  };
  const svg = C.figureToSvg(spec);
  assert.equal(viewBoxOf(svg).w, 360);
  assert.ok(minFontSize(svg) >= 12);
  assert.ok(svg.indexOf('fill="#B8821A"') !== -1, "기간 칩은 황토색 #B8821A");
  assert.ok(/<circle/.test(svg), "단계마다 점이 있다");
  const t = svgTexts(svg);
  ["회수계획서", "5일", "가등급", "15일", "입증 자료", "2년"].forEach(function (x) {
    assert.ok(t.indexOf(x) !== -1, "'" + x + "'이(가) 찍혀야 한다: " + JSON.stringify(t));
  });
  assert.ok(/<desc>회수계획서 5일 → 가등급 15일 → 입증 자료 2년<\/desc>/.test(svg), "desc가 순서를 그대로 읽어 준다");
});

test("figureToSvg(groups): 암기법이 끊는 위치 그대로 묶음 칸, 묶음이 늘면 높이도 는다", () => {
  const two = {
    type: "groups",
    groups: [
      { name: "영·목·인", items: ["영유아용", "목욕용", "인체 세정용"] },
      { name: "기·체취", items: ["기초화장용", "체취 방지용"] }
    ]
  };
  const one = { type: "groups", groups: [two.groups[0]] };
  const svgTwo = C.figureToSvg(two), svgOne = C.figureToSvg(one);
  assert.equal(viewBoxOf(svgTwo).w, 360);
  assert.ok(viewBoxOf(svgTwo).h > viewBoxOf(svgOne).h, "묶음이 늘면 높이가 는다");
  assert.ok(minFontSize(svgTwo) >= 12);
  const t = svgTexts(svgTwo);
  ["영·목·인", "영유아용", "목욕용", "인체 세정용", "기·체취", "기초화장용", "체취 방지용"].forEach(function (x) {
    assert.ok(t.indexOf(x) !== -1, "'" + x + "'이(가) 찍혀야 한다: " + JSON.stringify(t));
  });
});

test("figureToSvg(tree): 포함 관계 — 뿌리·가지·잎이 모두 찍히고 연결선이 있다", () => {
  const spec = {
    type: "tree", root: "화장품",
    children: [
      { name: "기능성화장품", children: ["미백", "주름개선"] },
      { name: "맞춤형화장품", children: ["혼합한 것", "소분한 것"] }
    ]
  };
  const svg = C.figureToSvg(spec);
  assert.equal(viewBoxOf(svg).w, 360);
  assert.ok(minFontSize(svg) >= 12);
  assert.ok((svg.match(/<line /g) || []).length >= 4, "뿌리→가로선→가지 연결선");
  const t = svgTexts(svg);
  ["화장품", "기능성화장품", "미백", "주름개선", "맞춤형화장품", "혼합한 것", "소분한 것"].forEach(function (x) {
    assert.ok(t.indexOf(x) !== -1, "'" + x + "'이(가) 찍혀야 한다: " + JSON.stringify(t));
  });
  assert.ok(svg.indexOf("#2A6F46") !== -1, "가지는 초록 #2A6F46");
});

test("figureToSvg: 잘못된 스펙은 Error를 던진다(알 수 없는 type·빈 열/행·행 길이 불일치·raw 형식)", () => {
  assert.throws(() => C.figureToSvg({ type: "pie", data: [1, 2] }), /알 수 없는 type/);
  assert.throws(() => C.figureToSvg({ type: "compare", cols: [], rows: [["a", "b"]] }), /비어 있습니다/);
  assert.throws(() => C.figureToSvg({ type: "compare", cols: ["등록"], rows: [] }), /비어 있습니다/);
  assert.throws(() => C.figureToSvg({ type: "compare", cols: ["등록", "신고"], rows: [["대상", "제조업"]] }), /값 2개/);
  assert.throws(() => C.figureToSvg({ type: "compare", cols: ["등록", "신고"], rows: [["대상", "제조업", "  "]] }), /비어 있습니다/);
  assert.throws(() => C.figureToSvg({ type: "timeline", steps: [] }), /비어 있습니다/);
  assert.throws(() => C.figureToSvg({ type: "timeline", steps: [{ dur: "5일" }] }), /label/);
  assert.throws(() => C.figureToSvg({ type: "groups", groups: [{ name: "가", items: [] }] }), /items/);
  assert.throws(() => C.figureToSvg({ type: "tree", root: "", children: ["가"] }), /root/);
  assert.throws(() => C.figureToSvg({ type: "raw", svg: "<div>그림 아님</div>" }), /raw\.svg/);
  assert.throws(() => C.figureToSvg(null), /객체가 아닙니다/);
  assert.throws(() => C.figureToSvg([]), /객체가 아닙니다/);
  // raw는 예외적으로 그대로 통과시킨다
  assert.equal(C.figureToSvg({ type: "raw", svg: '<svg viewBox="0 0 360 20"></svg>' }),
               '<svg viewBox="0 0 360 20"></svg>');
});

test("figureTexts: 그림에 찍히는 글자를 전부 모은다(카드 back·mnemonic 대조용), raw는 빈 배열", () => {
  assert.deepEqual(
    C.figureTexts({ type: "compare", cols: ["등록", "신고"], rows: [["대상", "제조업", "맞춤형"]] }),
    ["등록", "신고", "대상", "제조업", "맞춤형"]
  );
  assert.deepEqual(
    C.figureTexts({ type: "timeline", steps: [{ label: "회수계획서", dur: "5일" }, { label: "가등급" }] }),
    ["회수계획서", "5일", "가등급"]
  );
  assert.deepEqual(
    C.figureTexts({ type: "groups", groups: [{ name: "영·목", items: ["영유아용", "목욕용"] }] }),
    ["영·목", "영유아용", "목욕용"]
  );
  assert.deepEqual(
    C.figureTexts({ type: "tree", root: "화장품", children: [{ name: "기능성화장품", children: ["미백"] }, "맞춤형화장품"] }),
    ["화장품", "기능성화장품", "미백", "맞춤형화장품"]
  );
  assert.deepEqual(C.figureTexts({ type: "raw", svg: "<svg></svg>" }), []);
  assert.deepEqual(C.figureTexts(null), []);
});

test("figureToSvg: 카드 글자에 <, &, \" 가 있어도 SVG가 깨지지 않는다(escape)", () => {
  const svg = C.figureToSvg({ type: "timeline", steps: [{ label: '5 < 10 & "가"', dur: "1년" }] });
  assert.ok(svg.indexOf("&lt;") !== -1 && svg.indexOf("&amp;") !== -1);
  assert.ok(svg.indexOf('<text x') !== -1);
  // 이스케이프 뒤에도 태그 짝이 맞는다
  assert.equal((svg.match(/<text/g) || []).length, (svg.match(/<\/text>/g) || []).length);
});

/* ================================================================== *
 * 15. 암기카드 — Leitner 스케줄 (S4 Task 1)
 * ================================================================== */
/** 카드 픽스처 */
function card(over) {
  return Object.assign({
    id: "C-T-01", subject: 1, topic: "1.1.1", category: "정의", kind: "definition",
    importance: "M", short_prone: false,
    front: "화장품의 정의는?", back: "인체를 청결·미화하는 물품", mnemonic: "청결·미화",
    source: { law: "화장품법 제2조", guide: "4판 p.3", asof: "2026-09", confidence: "high" },
    related: ["Q-T-001"], verified: true, history: []
  }, over || {});
}
/** 카드 상태 픽스처 */
function cstate(over) { return Object.assign(C.cardStateDefault(), over || {}); }

test("CARD_INTERVALS: 스프린트 0·1·2·4·7 / 일반 1·3·7·14·30", () => {
  assert.deepEqual(C.CARD_INTERVALS.sprint, [0, 1, 2, 4, 7]);
  assert.deepEqual(C.CARD_INTERVALS.regular, [1, 3, 7, 14, 30]);
});

test("cardStateDefault: 안 본 카드는 due null · 매번 새 객체", () => {
  assert.deepEqual(C.cardStateDefault(), { box: 1, due: null, streak: 0, lapses: 0, auto: false, last: null });
  const a = C.cardStateDefault();
  a.box = 5;
  assert.equal(C.cardStateDefault().box, 1);
});

test("reviewCard(알아요): 박스 +1 · due = 오늘 + 새 박스 간격 · 원본 불변", () => {
  const ctx = { track: "sprint", examDate: "2026-12-01" };
  const s = C.cardStateDefault();
  const r1 = C.reviewCard(s, "good", "2026-09-08", ctx);
  assert.equal(r1.box, 2);
  assert.equal(r1.due, "2026-09-09");          // 박스2 = 1일
  assert.equal(r1.streak, 1);
  assert.equal(r1.lapses, 0);
  assert.equal(r1.last, "2026-09-08");
  assert.equal(s.box, 1);                       // 원본 불변
  assert.equal(s.due, null);
  const r2 = C.reviewCard(r1, "good", "2026-09-09", ctx);
  assert.equal(r2.box, 3);
  assert.equal(r2.due, "2026-09-11");          // 박스3 = 2일
  const r3 = C.reviewCard(r2, "good", "2026-09-11", ctx);
  assert.equal(r3.box, 4);
  assert.equal(r3.due, "2026-09-15");          // 박스4 = 4일
  assert.equal(r3.streak, 3);
});

test("reviewCard(알아요): 박스는 5에서 멈추고 5는 +7일", () => {
  const s = { box: 5, due: "2026-08-01", streak: 9, lapses: 1, auto: false, last: "2026-08-01" };
  const r = C.reviewCard(s, "good", "2026-08-05", { examDate: "2026-12-01" });
  assert.equal(r.box, 5);
  assert.equal(r.due, "2026-08-12");
  assert.equal(r.streak, 10);
});

test("reviewCard(모름): 박스① · lapses+1 · streak 0 · 스프린트는 같은 날 재노출", () => {
  const s = { box: 4, due: "2026-09-08", streak: 3, lapses: 1, auto: true, last: "2026-09-04" };
  const r = C.reviewCard(s, "again", "2026-09-08", { examDate: "2026-12-01" });
  assert.equal(r.box, 1);
  assert.equal(r.lapses, 2);
  assert.equal(r.streak, 0);
  assert.equal(r.due, "2026-09-08");           // 간격 0일 = 오늘(같은 세션 끝 재노출)
  assert.equal(r.auto, true);                   // auto는 유지
  assert.equal(r.last, "2026-09-08");
  const g = C.reviewCard(s, "again", "2026-09-08", { track: "regular", examDate: "2026-12-01" });
  assert.equal(g.due, "2026-09-09");           // 일반 트랙 ①은 1일
});

test("reviewCard(애매): 박스 유지 · streak 0 · 내일", () => {
  const s = { box: 3, due: "2026-09-08", streak: 2, lapses: 0, auto: false, last: "2026-09-06" };
  const r = C.reviewCard(s, "hard", "2026-09-08", { examDate: "2026-12-01" });
  assert.equal(r.box, 3);
  assert.equal(r.streak, 0);
  assert.equal(r.lapses, 0);
  assert.equal(r.due, "2026-09-09");
});

test("reviewCard: D-3부터 다음 만기는 내일까지, D-1·시험 당일은 오늘", () => {
  const ctx = { examDate: "2026-09-19" };
  const s = { box: 4, due: "2026-09-16", streak: 3, lapses: 0, auto: false, last: "2026-09-14" };
  assert.equal(C.reviewCard(s, "good", "2026-09-15", ctx).due, "2026-09-22");  // D-4: 상한 없음(박스5 +7)
  assert.equal(C.reviewCard(s, "good", "2026-09-16", ctx).due, "2026-09-17");  // D-3: 내일까지
  assert.equal(C.reviewCard(s, "good", "2026-09-17", ctx).due, "2026-09-18");  // D-2
  assert.equal(C.reviewCard(s, "good", "2026-09-18", ctx).due, "2026-09-18");  // D-1: 오늘
  assert.equal(C.reviewCard(s, "good", "2026-09-19", ctx).due, "2026-09-19");  // 당일
  assert.equal(C.reviewCard(s, "hard", "2026-09-18", ctx).due, "2026-09-18");  // 애매도 D-1엔 오늘
  assert.equal(C.reviewCard(s, "good", "2026-09-16", {}).due, "2026-09-23");   // examDate 없으면 상한 없음
});

test("reviewCard: 상태가 없거나 망가져도 기본값에서 시작한다 · 잘못된 rating은 Error", () => {
  const r = C.reviewCard(null, "good", "2026-09-08", { examDate: "2026-12-01" });
  assert.equal(r.box, 2);
  assert.equal(r.due, "2026-09-09");
  const bad = C.reviewCard({ box: 99, streak: "x", lapses: null }, "again", "2026-09-08", { examDate: "2026-12-01" });
  assert.equal(bad.box, 1);
  assert.equal(bad.lapses, 1);
  assert.equal(bad.streak, 0);
  assert.throws(() => C.reviewCard(C.cardStateDefault(), "ok", "2026-09-08", {}), /rating/);
});

/* ================================================================== *
 * 16. 암기카드 — 오늘 낼 카드 · 자동 편입 · 박스 분포
 * ================================================================== */
const CARDS_A = [
  card({ id: "C-A1", subject: 1, topic: "1.1.1", category: "정의", kind: "definition", importance: "L" }),
  card({ id: "C-A2", subject: 2, topic: "2.1.1", category: "숫자", kind: "number", importance: "H" }),
  card({ id: "C-A3", subject: 3, topic: "3.1.1", category: "숫자", kind: "number", importance: "M" }),
  card({ id: "C-A4", subject: 4, topic: "4.1.1", category: "절차", kind: "procedure", importance: "H" }),
  card({ id: "C-A5", subject: 1, topic: "1.1.2", category: "목록", kind: "list", importance: "H" }),
  card({ id: "C-A6", subject: 2, topic: "2.2.1", category: "목록", kind: "list", importance: "M" })
];
const STATES_A = {
  "C-A1": cstate({ box: 3, due: "2026-09-07", last: "2026-09-04" }),
  "C-A2": cstate({ box: 1, due: "2026-09-08", last: "2026-09-08", auto: true }),
  "C-A3": cstate({ box: 1, due: "2026-09-05", last: "2026-09-05", auto: true }),
  "C-A4": cstate({ box: 2, due: "2026-09-20", last: "2026-09-06" }),
  "C-A5": cstate({ due: null }),
  "C-GONE": cstate({ box: 1, due: "2026-09-01" })
};

test("dueCards: 만기는 박스 낮은 순 → due 오래된 순 / 새 카드는 중요도 H→M→L·과목 순", () => {
  const r = C.dueCards(CARDS_A, STATES_A, "2026-09-08");
  assert.deepEqual(r.due, ["C-A3", "C-A2", "C-A1"]);   // 박스1(09-05) → 박스1(09-08) → 박스3
  assert.deepEqual(r.fresh, ["C-A5", "C-A6"]);          // due null도 "안 본 카드"
  assert.deepEqual(r.todayNew, ["C-A5", "C-A6"]);       // 상한 없으면 새 카드 전부
  assert.deepEqual(r.queue, ["C-A3", "C-A2", "C-A1", "C-A5", "C-A6"]);
  assert.equal(r.limit, null);
});

test("dueCards: 은행에 없는 카드의 남은 상태는 무시한다", () => {
  const r = C.dueCards(CARDS_A, STATES_A, "2026-09-08");
  assert.equal(r.due.indexOf("C-GONE"), -1);
  assert.equal(r.queue.indexOf("C-GONE"), -1);
});

test("dueCards: 필터(과목·카테고리·kind·내 메모리 노트만)", () => {
  const f = (filter) => C.dueCards(CARDS_A, STATES_A, "2026-09-08", { filter: filter });
  assert.deepEqual(f({ subject: 2 }).due, ["C-A2"]);
  assert.deepEqual(f({ subject: 2 }).fresh, ["C-A6"]);
  assert.deepEqual(f({ subject: "2" }).due, ["C-A2"]);       // 문자열도 같게 본다
  assert.deepEqual(f({ kind: "number" }).due, ["C-A3", "C-A2"]);
  assert.deepEqual(f({ kind: "number" }).fresh, []);
  assert.deepEqual(f({ category: "숫자" }).due, ["C-A3", "C-A2"]);
  assert.deepEqual(f({ onlyAuto: true }).due, ["C-A3", "C-A2"]);
  assert.deepEqual(f({ onlyAuto: true }).fresh, []);          // 상태 없는 카드는 auto 아님
  assert.deepEqual(f({ subject: 4 }).due, []);                // 만기 아님
  assert.deepEqual(f({ subject: 4 }).fresh, []);              // 상태는 있고 due도 있으니 새 카드 아님
});

test("dueCards: 하루 상한은 만기부터 채우고 남으면 새 카드", () => {
  const g = (limit) => C.dueCards(CARDS_A, STATES_A, "2026-09-08", { limit: limit });
  assert.deepEqual(g(2).queue, ["C-A3", "C-A2"]);
  assert.deepEqual(g(2).todayNew, []);
  assert.deepEqual(g(4).queue, ["C-A3", "C-A2", "C-A1", "C-A5"]);
  assert.deepEqual(g(4).todayNew, ["C-A5"]);
  assert.deepEqual(g(0).queue, []);
  assert.deepEqual(g(99).queue, ["C-A3", "C-A2", "C-A1", "C-A5", "C-A6"]);
  assert.deepEqual(g(2).due, ["C-A3", "C-A2", "C-A1"]);      // due·fresh 자체는 자르지 않는다
  assert.equal(g(2).limit, 2);
});

test("dueCards: 빈 입력에도 세 목록을 준다", () => {
  const r = C.dueCards(null, null, "2026-09-08");
  assert.deepEqual(r, { due: [], fresh: [], todayNew: [], queue: [], limit: null });
});

test("enrollCardsForMistake: 새 카드는 박스①·auto·오늘 만기로 담긴다", () => {
  const q = mcq({ id: "Q-E-1", cards: ["C-A6", "C-A4"] });
  const out = C.enrollCardsForMistake(q, CARDS_A, {}, "2026-09-08");
  assert.deepEqual(out.enrolled, ["C-A6", "C-A4"]);          // q.cards 순서 그대로
  assert.deepEqual(out.states["C-A6"], { box: 1, due: "2026-09-08", streak: 0, lapses: 0, auto: true, last: null });
  assert.equal(out.states["C-A4"].box, 1);
});

test("enrollCardsForMistake: 기존 상태는 박스①로 내리고 lapses는 올리지 않는다", () => {
  const states = { "C-A1": cstate({ box: 4, due: "2026-09-20", streak: 3, lapses: 2, auto: false, last: "2026-09-06" }) };
  const out = C.enrollCardsForMistake(mcq({ cards: ["C-A1"] }), CARDS_A, states, "2026-09-08");
  const s = out.states["C-A1"];
  assert.equal(s.box, 1);
  assert.equal(s.lapses, 2);          // 카드를 틀린 게 아니므로 안 올린다
  assert.equal(s.streak, 0);
  assert.equal(s.due, "2026-09-08");
  assert.equal(s.auto, true);         // 내 메모리 노트에 담긴 표시
  assert.equal(s.last, null);         // 판정 S4-3: 편입은 벌점이 아니다 → 본 날 기록을 비운다
  assert.equal(states["C-A1"].box, 4);          // 원본 불변
  assert.notEqual(out.states, states);          // 새 객체
  assert.equal(out.states["C-A1"] === states["C-A1"], false);
});

test("enrollCardsForMistake: 연결 카드 없음·은행에 없는 카드·중복은 넘어간다", () => {
  assert.deepEqual(C.enrollCardsForMistake(mcq({ cards: [] }), CARDS_A, {}, "2026-09-08").enrolled, []);
  assert.deepEqual(C.enrollCardsForMistake(mcq({ cards: null }), CARDS_A, {}, "2026-09-08").enrolled, []);
  assert.deepEqual(C.enrollCardsForMistake(null, CARDS_A, {}, "2026-09-08").enrolled, []);
  const out = C.enrollCardsForMistake(mcq({ cards: ["C-A1", "C-A1", "C-NOPE"] }), CARDS_A, {}, "2026-09-08");
  assert.deepEqual(out.enrolled, ["C-A1"]);
  assert.deepEqual(Object.keys(out.states), ["C-A1"]);
});

test("cardBoxSummary: 박스 분포 · 안 본 카드 · 오늘 만기 · 내 메모리 노트 수", () => {
  const s = C.cardBoxSummary(STATES_A, CARDS_A, "2026-09-08");
  assert.deepEqual(s.boxes, { 1: 2, 2: 1, 3: 1, 4: 0, 5: 0 });
  assert.equal(s.unseen, 2);        // C-A5(due null) + C-A6(상태 없음)
  assert.equal(s.dueToday, 3);
  assert.equal(s.autoCount, 2);
  assert.equal(s.total, 6);
  const sum = s.boxes[1] + s.boxes[2] + s.boxes[3] + s.boxes[4] + s.boxes[5] + s.unseen;
  assert.equal(sum, CARDS_A.length);   // 박스 합 + 안 본 카드 = 전체
  const empty = C.cardBoxSummary(null, null, "2026-09-08");
  assert.deepEqual(empty.boxes, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  assert.equal(empty.total, 0);
});

/* ================================================================== *
 * 17. 카드 연동 숙달도 (…WithCards)
 * ================================================================== */
const TPM = [
  { id: "7.1", subject: 7, name: "주요항목", kind: "major" },
  { id: "7.1.1", subject: 7, parent: "7.1", name: "가", kind: "sub", exp_q: 3 },
  { id: "7.1.2", subject: 7, parent: "7.1", name: "나", kind: "sub", exp_q: 1 }
];
const QM = [
  mcq({ id: "Q-M-1", subject: 7, topic: "7.1.1", cards: ["C-A1", "C-A2", "C-A3"] }),
  mcq({ id: "Q-M-2", subject: 7, topic: "7.1.2", cards: [] })
];
const BYQ_M = { "Q-M-1": [att({ qid: "Q-M-1", at: "2026-09-08T10:00:00", correct: true, conf: 2 })] };
const ST_M = {
  "C-A1": cstate({ box: 1, due: "2026-09-08", last: "2026-09-08" }),   // 오늘 모름 → −10
  "C-A2": cstate({ box: 1, due: "2026-09-04", last: "2026-09-04" }),   // 4일 전 → 제외
  "C-A3": cstate({ box: 3, due: "2026-09-10", last: "2026-09-08" })    // 박스③ → 제외
};

test("questionMasteryWithCards: 3일 안에 본 박스① 카드 1장마다 −10", () => {
  const q = QM[0], atts = BYQ_M["Q-M-1"];
  assert.equal(C.questionMastery(atts, q, "2026-09-08"), 70);          // 시도 1회 상한 70
  assert.equal(C.questionMasteryWithCards(atts, q, "2026-09-08", ST_M), 60);
  assert.equal(C.questionMasteryWithCards(atts, q, "2026-09-08", null), 70);
  assert.equal(C.questionMasteryWithCards(atts, q, "2026-09-08", {}), 70);
  assert.equal(C.questionMasteryWithCards([], q, "2026-09-08", ST_M), null);   // 시도 없으면 null 그대로
  // 안 본 카드(last null)는 벌점 없음
  assert.equal(C.questionMasteryWithCards(atts, q, "2026-09-08", { "C-A1": cstate({ box: 1, due: "2026-09-08" }) }), 70);
});

test("questionMasteryWithCards: 하한 0", () => {
  const q = mcq({ id: "Q-M-3", cards: ["C-A1", "C-A2", "C-A3", "C-A4", "C-A5", "C-A6", "C-A7", "C-A8"] });
  const states = {};
  ["C-A1", "C-A2", "C-A3", "C-A4", "C-A5", "C-A6", "C-A7", "C-A8"]
    .forEach((id) => { states[id] = cstate({ box: 1, due: "2026-09-08", last: "2026-09-08" }); });
  const atts = [att({ qid: "Q-M-3", at: "2026-09-08T10:00:00", correct: true, conf: 2 })];
  assert.equal(C.questionMasteryWithCards(atts, q, "2026-09-08", states), 0);   // 70 − 80 → 0
});

test("topicMasteryWithCards: topicMastery와 같은 모양, states 없으면 같은 값", () => {
  const plain = C.topicMastery("7.1.1", QM, BYQ_M, "2026-09-08");
  const withC = C.topicMasteryWithCards("7.1.1", QM, BYQ_M, "2026-09-08", ST_M);
  assert.deepEqual(Object.keys(withC).sort(), ["measuring", "n", "value"]);
  assert.equal(withC.n, 1);
  assert.equal(withC.measuring, true);
  close(plain.value, 17.5);                       // 70 × 1/4
  close(withC.value, 15);                         // 60 × 1/4
  assert.deepEqual(C.topicMasteryWithCards("7.1.1", QM, BYQ_M, "2026-09-08", null), plain);
  assert.deepEqual(C.topicMastery("7.1.1", QM, BYQ_M, "2026-09-08"), plain);   // 기존 함수 불변
  assert.deepEqual(C.topicMasteryWithCards("7.9.9", QM, BYQ_M, "2026-09-08", ST_M), { value: null, n: 0, measuring: true });
});

test("subjectMasteryWithCards / subjectMasteryDetailWithCards: 미시도 토픽 20 · exp_q 가중", () => {
  close(C.subjectMastery(7, TPM, QM, BYQ_M, "2026-09-08"), 18.125);            // (17.5×3 + 20×1)/4
  close(C.subjectMasteryWithCards(7, TPM, QM, BYQ_M, "2026-09-08", ST_M), 16.25); // (15×3 + 20×1)/4
  const d = C.subjectMasteryDetailWithCards(7, TPM, QM, BYQ_M, "2026-09-08", ST_M);
  assert.deepEqual(Object.keys(d).sort(), ["attemptedTopics", "byTopic", "measuring", "totalTopics", "value"]);
  assert.equal(d.byTopic.length, 2);
  assert.equal(d.attemptedTopics, 1);
  assert.equal(d.totalTopics, 2);
  assert.equal(d.measuring, false);
  close(d.byTopic[0].value, 15);
  assert.equal(d.byTopic[1].value, null);
  assert.equal(d.byTopic[1].used, 20);
  // states 없으면 기존 상세와 같다
  assert.deepEqual(C.subjectMasteryDetailWithCards(7, TPM, QM, BYQ_M, "2026-09-08", null),
                   C.subjectMasteryDetail(7, TPM, QM, BYQ_M, "2026-09-08"));
});

/* ================================================================== *
 * 18. 프리셋 3종 — questionPriority · buildPreset
 * ================================================================== */
const TPB = [
  { id: "1.1", subject: 1, name: "화장품법", kind: "major" },
  { id: "1.1.1", subject: 1, parent: "1.1", name: "정의·유형", kind: "sub", exp_q: 3 },
  { id: "1.1.2", subject: 1, parent: "1.1", name: "영업의 종류", kind: "sub", exp_q: 2 },
  { id: "2.1.1", subject: 2, parent: "2.1", name: "원료", kind: "sub", exp_q: 2 },
  { id: "2.1.2", subject: 2, parent: "2.1", name: "제조", kind: "sub", exp_q: 1 },
  { id: "3.1.1", subject: 3, parent: "3.1", name: "안전관리", kind: "sub", exp_q: 1 }
];
const PQ = [
  mcq({ id: "Q-P-11a", subject: 1, topic: "1.1.1", cards: ["C-P-W01"] }),
  mcq({ id: "Q-P-11b", subject: 1, topic: "1.1.1", cards: [] }),
  mcq({ id: "Q-P-11c", subject: 1, topic: "1.1.1", cards: [] }),
  mcq({ id: "Q-P-21a", subject: 2, topic: "2.1.1", qtype: "limit_number", tags: ["숫자"], cards: [] }),
  mcq({ id: "Q-P-21b", subject: 2, topic: "2.1.1", qtype: "calc", cards: [] }),
  mcq({ id: "Q-P-31a", subject: 3, topic: "3.1.1", cards: [] }),
  mcq({ id: "Q-P-31b", subject: 3, topic: "3.1.1", tags: ["표시 기한"], cards: [] }),
  mcq({ id: "Q-P-12a", subject: 1, topic: "1.1.2", cards: [] }),
  mcq({ id: "Q-P-22a", subject: 2, topic: "2.1.2", qtype: "table", cards: [] })
];
const BYQ_P = {
  "Q-P-11a": [att({ qid: "Q-P-11a", at: "2026-09-08T09:00:00", correct: false, conf: 1, given: 1 })],
  "Q-P-11b": [att({ qid: "Q-P-11b", at: "2026-09-08T09:01:00", correct: false, conf: 1, given: 1 })],
  "Q-P-21a": [att({ qid: "Q-P-21a", at: "2026-09-08T09:02:00", correct: false, conf: 0, given: 1 })],
  "Q-P-31a": [att({ qid: "Q-P-31a", at: "2026-09-08T09:03:00", correct: true, conf: 0 })],
  "Q-P-12a": [
    att({ qid: "Q-P-12a", at: "2026-09-06T09:00:00" }),
    att({ qid: "Q-P-12a", at: "2026-09-07T09:00:00" }),
    att({ qid: "Q-P-12a", at: "2026-09-08T09:00:00" })
  ]
};
const MIST_P = {
  "Q-P-11a": { count: 2, last: "2026-09-06", stage: "reviewing", streak: 0, next: "2026-09-07", interval: 1, lastWrong: "2026-09-06", guessed: 0, relapse: false, memo: "" },
  "Q-P-21a": { count: 1, last: "2026-09-07", stage: "new", streak: 0, next: "2026-09-08", interval: 1, lastWrong: "2026-09-07", guessed: 1, relapse: false, memo: "" },
  "Q-P-31a": { count: 1, last: "2026-09-08", stage: "new", streak: 0, next: "2026-09-20", interval: 1, lastWrong: "2026-09-08", guessed: 1, relapse: false, memo: "" },
  "Q-P-12a": { count: 1, last: "2026-09-08", stage: "graduated", streak: 2, next: null, interval: 6, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" },
  "Q-GONE": { count: 1, last: "2026-09-01", stage: "new", streak: 0, next: "2026-09-01", interval: 1, lastWrong: "2026-09-01", guessed: 0, relapse: false, memo: "" }
};
const CARDS_P = [];
for (let i = 1; i <= 12; i++) {
  const sub = i % 3 === 0 ? 3 : (i % 3 === 2 ? 2 : 1);
  CARDS_P.push(card({
    id: "C-P-W" + String(i).padStart(2, "0"),
    subject: sub, topic: sub === 3 ? "3.1.1" : (sub === 2 ? "2.1.1" : "1.1.1"),
    kind: i % 4 === 0 ? "number" : "list",
    importance: i <= 4 ? "H" : "M", category: "약점 카드"
  }));
}
CARDS_P.push(card({ id: "C-P-N1", subject: 2, topic: "2.1.2", kind: "number", importance: "H", category: "숫자" }));
CARDS_P.push(card({ id: "C-P-X1", subject: 1, topic: "1.1.2", kind: "definition", importance: "L", category: "정의" }));
const STATES_P = {
  "C-P-W01": cstate({ box: 1, due: "2026-09-06", last: "2026-09-06", auto: true }),
  "C-P-W02": cstate({ box: 2, due: "2026-09-08", last: "2026-09-05" }),
  "C-P-N1": cstate({ box: 1, due: "2026-09-07", last: "2026-09-07" }),
  "C-P-X1": cstate({ box: 4, due: "2026-09-30", last: "2026-09-01" })
};
function pctx(over) {
  return Object.assign({
    questions: PQ, cards: CARDS_P, topics: TPB, attemptsByQid: BYQ_P, mistakes: MIST_P,
    cardStates: STATES_P, todayStr: "2026-09-08", rng: C.seededRandom(7)
  }, over || {});
}

test("questionPriority: CLAUDE.md P 공식 그대로", () => {
  const ctx = { questions: PQ, topics: TPB, attemptsByQid: BYQ_P, mistakes: {}, todayStr: "2026-09-08" };
  // Q-P-11a 오늘 오답·애매: 3(숙달0) + 2(3일 내 오답) + 0.5(연속1) + 1(애매) + 0.75(중요도M) + 1(exp 3/3)
  close(C.questionPriority(PQ[0], ctx), 8.25, 1e-9);
  // Q-P-11c 미출제: 3 + 0.75 + 1
  close(C.questionPriority(PQ[2], ctx), 4.75, 1e-9);
  // Q-P-22a 미출제, 토픽 exp 1/3
  close(C.questionPriority(PQ[8], ctx), 3 + 0.75 + 1 / 3, 1e-9);
  // 오답노트의 lastWrong으로도 "3일 내 오답"을 본다
  const ctx2 = Object.assign({}, ctx, { attemptsByQid: {}, mistakes: MIST_P });
  close(C.questionPriority(PQ[0], ctx2), 3 + 2 + 0.75 + 1, 1e-9);
});

test("PRESETS: 3종 이름·기본 개수", () => {
  assert.deepEqual(Object.keys(C.PRESETS).sort(), ["lawnum", "today", "weakness"]);
  assert.equal(C.PRESETS.weakness.name, "WEAKNESS ATTACK");
  assert.equal(C.PRESETS.lawnum.name, "LAW & NUMBERS");
  assert.equal(C.PRESETS.today.name, "TODAY'S REVIEW");
  assert.equal(C.PRESETS.weakness.n, 15);
  assert.equal(C.PRESETS.weakness.cards, 10);
});

test("buildPreset(weakness): 숙달 하위 3개 토픽의 문항만 + 그 토픽 카드 10장", () => {
  const r = C.buildPreset("weakness", pctx({ n: 5 }));
  assert.deepEqual(r.topics.slice().sort(), ["1.1.1", "2.1.1", "3.1.1"]);
  assert.equal(r.qids.length, 5);
  assert.equal(new Set(r.qids).size, 5);                        // 중복 없음
  const byId = {};
  PQ.forEach((q) => { byId[q.id] = q; });
  r.qids.forEach((id) => { assert.ok(r.topics.indexOf(byId[id].topic) !== -1, id + " 토픽 밖"); });
  assert.equal(r.cids.length, 10);                              // 카드 상한 10
  assert.equal(new Set(r.cids).size, 10);
  assert.equal(r.cids[0], "C-P-W01");                           // 만기 카드 먼저(박스① 09-06)
  assert.equal(r.cids[1], "C-P-W02");
  const cById = {};
  CARDS_P.forEach((c) => { cById[c.id] = c; });
  r.cids.forEach((id) => { assert.ok(r.topics.indexOf(cById[id].topic) !== -1, id + " 카드 토픽 밖"); });
  assert.equal(r.name, "weakness");
  assert.equal(r.label, "WEAKNESS ATTACK");
  // n이 후보보다 크면 후보 전부(7문항)
  assert.equal(C.buildPreset("weakness", pctx({ n: 99 })).qids.length, 7);
  // 기본 n = 15
  assert.equal(C.buildPreset("weakness", pctx()).qids.length, 7);
});

test("buildPreset(lawnum): 숫자·기한 문항 + kind number 카드, 미출제 먼저", () => {
  const r = C.buildPreset("lawnum", pctx({ n: 3 }));
  assert.equal(r.qids.length, 3);
  assert.deepEqual(r.qids.slice().sort(), ["Q-P-21b", "Q-P-22a", "Q-P-31b"]);   // 미출제 3개 먼저
  const all = C.buildPreset("lawnum", pctx({ n: 10 }));
  assert.deepEqual(all.qids.slice().sort(), ["Q-P-21a", "Q-P-21b", "Q-P-22a", "Q-P-31b"]);
  assert.equal(all.qids[all.qids.length - 1], "Q-P-21a");        // 이미 푼 문항은 뒤로
  const cById = {};
  CARDS_P.forEach((c) => { cById[c.id] = c; });
  assert.ok(r.cids.length > 0);
  r.cids.forEach((id) => { assert.equal(cById[id].kind, "number"); });
  assert.equal(r.cids[0], "C-P-N1");                             // 만기 숫자 카드 먼저
  assert.deepEqual(r.topics, []);
  assert.equal(r.label, "LAW & NUMBERS");
});

test("buildPreset(today): 만기 오답 전부(상한 n) + 만기 카드만", () => {
  const r = C.buildPreset("today", pctx());
  assert.deepEqual(r.qids, ["Q-P-11a", "Q-P-21a"]);               // 만기일 순, 은행에 없는 Q-GONE 제외
  assert.deepEqual(r.cids, ["C-P-W01", "C-P-N1", "C-P-W02"]);     // 새 카드는 넣지 않는다
  assert.deepEqual(C.buildPreset("today", pctx({ n: 1 })).qids, ["Q-P-11a"]);
  assert.deepEqual(C.buildPreset("today", pctx({ cardLimit: 2 })).cids, ["C-P-W01", "C-P-N1"]);
  assert.equal(r.label, "TODAY'S REVIEW");
});

test("buildPreset: 빈 기록·빈 은행에도 견딘다 / 모르는 프리셋은 Error", () => {
  const empty = { questions: PQ, cards: CARDS_P, topics: TPB, attemptsByQid: {}, mistakes: {}, cardStates: {}, todayStr: "2026-09-08" };
  ["weakness", "lawnum", "today"].forEach((k) => {
    const r = C.buildPreset(k, empty);
    assert.ok(Array.isArray(r.qids) && Array.isArray(r.cids) && Array.isArray(r.topics), k);
    assert.equal(new Set(r.qids).size, r.qids.length);
    assert.equal(new Set(r.cids).size, r.cids.length);
  });
  const none = C.buildPreset("weakness", { todayStr: "2026-09-08" });
  assert.deepEqual(none.qids, []);
  assert.deepEqual(none.cids, []);
  assert.throws(() => C.buildPreset("nope", pctx()), /프리셋/);
});

/* ================================================================== *
 * 19. 백업 병합 — mergeBackup
 * ================================================================== */
const LOCAL_BK = {
  settings: { exam_date: "2026-09-19", track: "sprint", daily_minutes: 120, device: "iphone",
              last_backup: "2026-09-07T10:00:00", user_accepted: { intro: true, note: false }, schema: 1 },
  attempts: [att({ qid: "Q-1", at: "2026-09-06T10:00:00" }), att({ qid: "Q-2", at: "2026-09-07T10:00:00" })],
  mistakes: {
    "Q-1": { count: 1, last: "2026-09-07", next: "2026-09-08", stage: "new" },
    "Q-3": { count: 2, last: "2026-09-05", next: "2026-09-06", stage: "reviewing" },
    "Q-5": { count: 1, next: "2026-09-04", stage: "new" }
  },
  cards: {
    "C-1": { box: 2, due: "2026-09-09", streak: 1, lapses: 0, auto: false, last: "2026-09-08" },
    "C-2": { box: 1, due: "2026-09-08", streak: 0, lapses: 1, auto: true, last: "2026-09-06" },
    "C-3": { box: 1, due: "2026-09-05", streak: 0, lapses: 0, auto: true, last: null }
  },
  session: { sid: "s-local", mode: "study", idx: 3 },
  mocks: [{ sid: "m1", date: "2026-09-06", raw: 600 }]
};
const IN_BK = {
  settings: { exam_date: "2026-09-19", track: "regular", device: "mac",
              last_backup: "2026-09-08T09:00:00", user_accepted: { note: true, extra: true }, schema: 1 },
  attempts: [att({ qid: "Q-1", at: "2026-09-06T10:00:00" }), att({ qid: "Q-9", at: "2026-09-05T10:00:00" })],
  mistakes: {
    "Q-1": { count: 3, last: "2026-09-08", next: "2026-09-09", stage: "reviewing" },
    "Q-3": { count: 1, last: "2026-09-01", next: "2026-09-02", stage: "new" },
    "Q-5": { count: 4, next: "2026-09-09", stage: "reviewing" },
    "Q-7": { count: 1, last: "2026-09-08", next: "2026-09-09", stage: "new" }
  },
  cards: {
    "C-1": { box: 5, due: "2026-09-20", streak: 4, lapses: 0, auto: false, last: "2026-09-07" },
    "C-2": { box: 3, due: "2026-09-11", streak: 2, lapses: 1, auto: true, last: "2026-09-09" },
    "C-3": { box: 4, due: "2026-09-12", streak: 2, lapses: 0, auto: false, last: null },
    "C-9": { box: 1, due: "2026-09-08", streak: 0, lapses: 0, auto: true, last: null }
  },
  session: { sid: "s-incoming", mode: "mock", idx: 10 },
  mocks: [{ sid: "m1", date: "2026-09-06", raw: 600 }, { sid: "m2", date: "2026-09-08", raw: 700 }]
};

test("mergeBackup(attempts): (qid,at) 합집합을 시간 순으로", () => {
  const r = C.mergeBackup(LOCAL_BK, IN_BK);
  assert.deepEqual(r.merged.attempts.map((a) => a.qid), ["Q-9", "Q-1", "Q-2"]);
  assert.equal(r.stats.attemptsAdded, 1);           // 같은 (qid,at)은 한 번만
});

test("mergeBackup(mistakes·cards): 항목별 last(없으면 next·due) 더 최근 쪽", () => {
  const r = C.mergeBackup(LOCAL_BK, IN_BK).merged;
  assert.equal(r.mistakes["Q-1"].count, 3);         // incoming이 더 최근(09-08)
  assert.equal(r.mistakes["Q-3"].count, 2);         // local이 더 최근(09-05)
  assert.equal(r.mistakes["Q-5"].count, 4);         // last 없음 → next로 비교(09-09 > 09-04)
  assert.equal(r.mistakes["Q-7"].count, 1);         // 새 항목
  assert.equal(r.cards["C-1"].box, 2);              // local last 09-08 > incoming 09-07
  assert.equal(r.cards["C-2"].box, 3);              // incoming last 09-09
  assert.equal(r.cards["C-3"].box, 4);              // last 없음 → due로 비교(09-12 > 09-05)
  assert.equal(r.cards["C-9"].box, 1);              // 새 항목
  const st = C.mergeBackup(LOCAL_BK, IN_BK).stats;
  assert.equal(st.mistakesUpdated, 3);              // Q-1·Q-5 교체 + Q-7 추가
  assert.equal(st.cardsUpdated, 3);                 // C-2·C-3 교체 + C-9 추가
});

test("mergeBackup(mocks·settings·session)", () => {
  const r = C.mergeBackup(LOCAL_BK, IN_BK);
  assert.deepEqual(r.merged.mocks.map((m) => m.sid), ["m1", "m2"]);
  assert.equal(r.stats.mocksAdded, 1);
  assert.equal(r.merged.settings.track, "sprint");            // 나머지는 local 유지
  assert.equal(r.merged.settings.device, "iphone");
  assert.equal(r.merged.settings.last_backup, "2026-09-08T09:00:00");   // 더 최근 쪽
  assert.deepEqual(r.merged.settings.user_accepted, { intro: true, note: true, extra: true });
  assert.equal(r.merged.session.sid, "s-local");              // 진행 중인 세션은 지키지 않는다 = 안 건드린다
  const noLocal = C.mergeBackup(Object.assign({}, LOCAL_BK, { session: null }), IN_BK);
  assert.equal(noLocal.merged.session.sid, "s-incoming");      // local이 없을 때만 incoming
});

test("mergeBackup: 원본 불변 · 빠진 키도 견딘다", () => {
  const before = JSON.stringify(LOCAL_BK);
  const r = C.mergeBackup(LOCAL_BK, IN_BK);
  assert.equal(JSON.stringify(LOCAL_BK), before);
  assert.equal(r.merged.mistakes["Q-1"] === IN_BK.mistakes["Q-1"], false);   // 복사본
  const empty = C.mergeBackup({}, {});
  assert.deepEqual(empty.merged, { settings: null, attempts: [], mistakes: {}, cards: {}, session: null, mocks: [] });
  assert.deepEqual(empty.stats, { attemptsAdded: 0, mistakesUpdated: 0, cardsUpdated: 0, mocksAdded: 0 });
  const onlyIn = C.mergeBackup(null, IN_BK);
  assert.equal(onlyIn.merged.attempts.length, 2);
  assert.equal(onlyIn.stats.attemptsAdded, 2);
  assert.equal(onlyIn.merged.settings.track, "regular");
  // pl.v1. 접두사가 붙은 백업 파일도 그대로 읽는다
  const prefixed = C.mergeBackup(LOCAL_BK, { "pl.v1.attempts": IN_BK.attempts, "pl.v1.cards": IN_BK.cards });
  assert.equal(prefixed.stats.attemptsAdded, 1);
  assert.equal(prefixed.merged.cards["C-9"].box, 1);
});

/* ================================================================== *
 * 20. 암기노트 내보내기 — memoryNoteText
 * ================================================================== */
test("memoryNoteText: auto 카드 + 박스③ 이하 카드 + 미졸업 오답 한 줄 암기", () => {
  const cards = [
    card({ id: "C-N1", subject: 1, category: "정의", importance: "H",
           front: "화장품 정의는?", back: "인체를 청결·미화하는 물품", mnemonic: "청결·미화",
           source: { law: "화장품법 제2조", guide: "4판 p.3", asof: "2026-09", confidence: "high" } }),
    card({ id: "C-N2", subject: 2, category: "숫자", front: "납 한도는?", back: "20㎍/g 이하", mnemonic: "납 20" }),
    card({ id: "C-N3", subject: 2, category: "숫자", front: "노트에 안 나오는 카드", back: "박스⑤" }),
    card({ id: "C-N4", subject: 3, category: "절차", front: "회수 기한은?", back: "15일" }),
    card({ id: "C-N5", subject: 4, category: "혼합", front: "아직 안 본 카드", back: "상태 없음" })
  ];
  const states = {
    "C-N1": cstate({ box: 1, due: "2026-09-08", last: "2026-09-08", auto: true }),
    "C-N2": cstate({ box: 3, due: "2026-09-10", last: "2026-09-07" }),
    "C-N3": cstate({ box: 5, due: "2026-09-20", last: "2026-09-01" }),
    "C-N4": cstate({ box: 4, due: "2026-09-15", last: "2026-09-02", auto: true })
  };
  const questions = [
    mcq({ id: "Q-N1", subject: 1, memory_sentence: "등록은 제조·책판, 신고는 맞춤형" }),
    mcq({ id: "Q-N2", subject: 2, memory_sentence: "졸업한 문항은 빠진다" }),
    mcq({ id: "Q-N3", subject: 2, memory_sentence: "" })
  ];
  const mistakes = {
    "Q-N1": { count: 2, stage: "reviewing", next: "2026-09-09", last: "2026-09-08" },
    "Q-N2": { count: 1, stage: "graduated", next: null, last: "2026-09-08" },
    "Q-N3": { count: 1, stage: "new", next: "2026-09-09", last: "2026-09-08" }
  };
  const md = C.memoryNoteText(cards, states, questions, mistakes, { todayStr: "2026-09-08", examDate: "2026-09-19" });
  assert.match(md, /^# PASS LAB 암기노트 — 2026-09-08/);
  assert.ok(md.indexOf("D-11") !== -1);
  assert.ok(md.indexOf("화장품 정의는?") !== -1);          // auto·박스①
  assert.ok(md.indexOf("20㎍/g 이하") !== -1);              // 박스③
  assert.ok(md.indexOf("회수 기한은?") !== -1);            // 박스④지만 auto
  assert.equal(md.indexOf("노트에 안 나오는 카드"), -1);   // 박스⑤ · auto 아님
  assert.equal(md.indexOf("아직 안 본 카드"), -1);         // 상태 없음
  assert.ok(md.indexOf("등록은 제조·책판, 신고는 맞춤형") !== -1);
  assert.equal(md.indexOf("졸업한 문항은 빠진다"), -1);    // 졸업 오답 제외
  assert.ok(md.indexOf("화장품법 제2조") !== -1);          // 근거 조문
  assert.ok(md.indexOf("청결·미화") !== -1);               // 암기법
  assert.ok(md.indexOf("① 화장품법의 이해") !== -1);       // 과목별
  assert.ok(md.indexOf("### 숫자") !== -1);                // 카테고리별
});

test("memoryNoteText: maxCards 상한 · 박스 낮은 카드부터 · 빈 입력도 문자열", () => {
  const cards = [], states = {};
  for (let i = 1; i <= 30; i++) {
    const id = "C-X" + String(i).padStart(2, "0");
    cards.push(card({ id: id, subject: (i % 4) + 1, category: "묶음" + (i % 3), front: "앞" + i, back: "뒤" + i }));
    states[id] = cstate({ box: (i % 3) + 1, due: "2026-09-08", last: "2026-09-08" });
  }
  const md = C.memoryNoteText(cards, states, [], {}, { maxCards: 5, todayStr: "2026-09-08" });
  const lines = md.split("\n").filter((l) => l.indexOf("- ") === 0 && l.indexOf("**") !== -1);
  assert.equal(lines.length, 5);
  assert.ok(md.indexOf("카드 5장") !== -1);
  lines.forEach((l) => { assert.ok(l.indexOf("①") !== -1, "박스① 카드부터: " + l); });
  const all = C.memoryNoteText(cards, states, [], {}, { todayStr: "2026-09-08" });
  assert.equal(all.split("\n").filter((l) => l.indexOf("- ") === 0 && l.indexOf("**") !== -1).length, 30);
  assert.equal(typeof C.memoryNoteText(null, null, null, null, null), "string");
  assert.ok(C.memoryNoteText([], {}, [], {}, { todayStr: "2026-09-08" }).indexOf("카드 0장") !== -1);
});

/* 실제 카드 은행(읽기 전용) — 엔진이 통째로 도는지만 본다 --------- */
let REALC = null;
function realCards() {
  if (REALC) return REALC;
  globalThis.window = globalThis;
  const dir = nodePath.join(__dirname, "..", "app", "data");
  nodeFs.readdirSync(dir).filter((f) => /^c_.*\.js$/.test(f)).sort()
    .forEach((f) => require(nodePath.join(dir, f)));
  REALC = (globalThis.window.PL_CARDS || []).slice();
  return REALC;
}

test("실제 카드 은행: 카드 엔진이 전부 돈다(데이터는 읽기만)", () => {
  const cards = realCards();
  assert.ok(cards.length > 0, "카드 은행이 비었다");
  const t = "2026-09-08", ctx = { track: "sprint", examDate: "2026-09-19" };
  const first = C.dueCards(cards, {}, t);
  assert.equal(first.due.length, 0);
  assert.equal(first.fresh.length, cards.length);          // 상태가 없으면 전부 새 카드
  assert.equal(C.cardBoxSummary({}, cards, t).unseen, cards.length);
  const states = {};
  cards.forEach((c, i) => {
    const rating = ["again", "hard", "good"][i % 3];
    states[c.id] = C.reviewCard(states[c.id], rating, t, ctx);
    assert.ok(states[c.id].box >= 1 && states[c.id].box <= 5, c.id);
    assert.match(states[c.id].due, /^\d{4}-\d{2}-\d{2}$/);
  });
  const sum = C.cardBoxSummary(states, cards, t);
  assert.equal(sum.boxes[1] + sum.boxes[2] + sum.boxes[3] + sum.boxes[4] + sum.boxes[5] + sum.unseen, cards.length);
  assert.equal(sum.total, cards.length);
  assert.equal(typeof C.memoryNoteText(cards, states, [], {}, { todayStr: t, examDate: "2026-09-19" }), "string");
});

test("enrollCardsForMistake: 편입만으로는 숙달 벌점(−10)이 붙지 않는다(판정 S4-3)", () => {
  const t = "2026-09-08";
  const q = mcq({ id: "Q-EN-1", cards: ["C-A1"] });
  const atts = [
    att({ qid: "Q-EN-1", at: "2026-09-06T10:00:00", correct: true, conf: 1 }),
    att({ qid: "Q-EN-1", at: "2026-09-08T10:00:00", correct: false, conf: 1, given: 1 })
  ];
  // 이틀 전에 "알아요"로 본 박스④ 카드 — 최근에 봤지만 모른 게 아니다
  const before = { "C-A1": cstate({ box: 4, due: "2026-09-12", streak: 3, lapses: 0, last: "2026-09-06" }) };
  const plain = C.questionMastery(atts, q, t);
  assert.equal(C.questionMasteryWithCards(atts, q, t, before), plain);       // 편입 전 벌점 없음
  const out = C.enrollCardsForMistake(q, CARDS_A, before, t);
  assert.equal(out.states["C-A1"].box, 1);
  assert.equal(out.states["C-A1"].last, null);                              // 본 날 기록을 비운다
  assert.equal(C.questionMasteryWithCards(atts, q, t, out.states), plain);   // 편입해도 그대로(이중 계상 금지)
  // 카드를 실제로 풀어 "모름"이면 그때 −10
  const after = Object.assign({}, out.states, {
    "C-A1": C.reviewCard(out.states["C-A1"], "again", t, { examDate: "2026-09-19" })
  });
  assert.equal(after["C-A1"].last, t);
  close(C.questionMasteryWithCards(atts, q, t, after), Math.max(0, plain - 10));
});

test("memoryNoteText: opts.blueprint가 있으면 과목 이름을 거기서 읽는다", () => {
  const cards = [card({ id: "C-BP1", subject: 1, category: "정의", front: "앞", back: "뒤" })];
  const states = { "C-BP1": cstate({ box: 1, due: "2026-09-08", last: "2026-09-08", auto: true }) };
  const o = { todayStr: "2026-09-08" };
  assert.ok(C.memoryNoteText(cards, states, [], {}, Object.assign({ blueprint: BP }, o))
    .indexOf("## ① 화장품법의 이해") !== -1);
  assert.ok(C.memoryNoteText(cards, states, [], {}, Object.assign({ blueprint: { subjects: [{ id: 1, name: "화장품법의 이해(개정)" }] } }, o))
    .indexOf("## ① 화장품법의 이해(개정)") !== -1);
  // 블루프린트가 없거나 그 과목이 빠져 있으면 상수로 되돌아간다
  assert.ok(C.memoryNoteText(cards, states, [], {}, Object.assign({ blueprint: { subjects: [{ id: 4, name: "다른 과목" }] } }, o))
    .indexOf("## ① 화장품법의 이해") !== -1);
  assert.ok(C.memoryNoteText(cards, states, [], {}, o).indexOf("## ① 화장품법의 이해") !== -1);
  assert.equal(C.SUBJECT_NAMES[1], "화장품법의 이해");
});
