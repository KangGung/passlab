#!/usr/bin/env node
// scripts/convert-seeds.cjs
//
// Task 6: A5 표본 12문항(work/A_도메인설계_결과.md) + 합격코치 20문항·12노트
// (../custom-cosmetics-exam/data/questions.js·notes.js)를 PL 스키마로 변환해
//   app/data/q_seed_a5.js   (12문항)
//   app/data/q_seed_cce.js  (20문항)
//   app/data/c_seed_cce.js  (12카드)
//   app/data/manifest.js    (버전 20260905a, 위 3파일만 나열 — Task 9가 배치 파일 추가)
// 을 (재)생성한다. 원본 파일은 읽기만 한다.
//
// 재실행 가능: 이 스크립트를 다시 실행하면 위 4개 파일을 덮어쓴다. 다른 파일은 건드리지 않는다.
// Node 내장 모듈(fs, path, vm)만 사용. npm install 불필요.
//
// 사용법: node scripts/convert-seeds.cjs

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP_DATA = path.join(ROOT, "app", "data");
const CCE_DIR = path.resolve(ROOT, "..", "custom-cosmetics-exam", "data");

/* ================================================================
 * 0. 공용 유틸
 * ================================================================ */

/** window.PL_* 를 정의하는 .js 파일을 vm 샌드박스에서 실행해 window 객체를 반환 */
function loadWindowModule(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: filePath });
  return sandbox.window;
}

/** 합격코치 questions.js/notes.js를 브리프가 지정한 방식으로 로드: new Function("window","global", src)(g,g) */
function loadCceGlobal(fileName) {
  const filePath = path.join(CCE_DIR, fileName);
  const src = fs.readFileSync(filePath, "utf8");
  const g = {};
  // eslint-disable-next-line no-new-func
  const fn = new Function("window", "global", src);
  fn(g, g);
  return g;
}

const topicsWindow = loadWindowModule(path.join(APP_DATA, "topics.js"));
const TOPICS = topicsWindow.PL_TOPICS;

function topicById(id) {
  return TOPICS.find(function (t) { return t.id === id; });
}

/** legacy_codes(A1/00 부록 구코드) → 신규 topic id 역색인. 값은 배열(복수 후보 가능) */
const legacyMap = new Map();
TOPICS.forEach(function (t) {
  (t.legacy_codes || []).forEach(function (code) {
    if (!legacyMap.has(code)) legacyMap.set(code, []);
    legacyMap.get(code).push(t.id);
  });
});

/** cce_topics(합격코치 topicN-M) → 신규 topic id 역색인 */
const cceMap = new Map();
TOPICS.forEach(function (t) {
  (t.cce_topics || []).forEach(function (code) {
    if (!cceMap.has(code)) cceMap.set(code, []);
    cceMap.get(code).push(t.id);
  });
});

/** 과목 sid의 주요항목 majorPrefix(예 "3.4") 아래 첫 세부항목(kind:"sub") id */
function firstSubOfMajor(subject, majorPrefix) {
  const subs = TOPICS
    .filter(function (t) { return t.kind === "sub" && Number(t.subject) === Number(subject) && String(t.id).indexOf(majorPrefix + ".") === 0; })
    .sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
  return subs.length ? subs[0].id : null;
}

const TODAY = "2026-09-05";

/* ================================================================
 * 1. A5 표본 12문항 (work/A_도메인설계_결과.md 283~657줄 ```json 블록)
 * ================================================================ */

const workMdPath = path.join(ROOT, "work", "A_도메인설계_결과.md");
const workMd = fs.readFileSync(workMdPath, "utf8");
const jsonBlocks = [];
{
  const re = /```json\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(workMd)) !== null) jsonBlocks.push(m[1]);
}
const a5BlockText = jsonBlocks.find(function (b) { return b.indexOf("Q-S1-0001") !== -1; });
if (!a5BlockText) throw new Error("work/A_도메인설계_결과.md 에서 A5 12문항 ```json 블록을 찾지 못함");
const A5_RAW = JSON.parse(a5BlockText);
if (A5_RAW.length !== 12) throw new Error("A5 원본 문항 수가 12가 아님: " + A5_RAW.length);

// 구코드(topic)가 topics.js legacy_codes에서 여러 후보로 걸리는 경우(주요항목 단위 코드라
// 자동 유일화가 안 됨) — 내용(법령 근거·소재)을 대조해 확정한 수기 예외표.
// 근거는 .superpowers/sdd/2026-09-05-m1-mvp-plan/task-6-report.md 매핑표 참조.
const A5_TOPIC_OVERRIDE = {
  "Q-S3-0001": "3.4.2", // 구 "3.4"(6개 세부항목 걸침) → 비의도적 유래물질 안전관리 기준
  "Q-S3-0002": "3.4.2", // 구 "3.4" → 내용량 기준(같은 규정 제6조)
  "Q-S3-0003": "3.2.3", // 구 "3.2"(6개 세부항목 걸침) → 법 시행규칙 제12조의2(혼합·소분 위생관리 규정)와 법령 근거 일치
  "Q-S4-0001": "4.2.1", // 구 "4.2"(3개 세부항목 걸침) → 피부의 생리 구조
  "Q-S4-0002": "4.2.2", // 구 "4.2" → 모발의 생리 구조
  "Q-S4-0003": "4.6.5", // 구 "4.6"(5개 세부항목 걸침) → 시행규칙 제12조의2 준수사항 절차
  "Q-S4-0004": "4.1.2"  // 구 "4.1"(5개 세부항목 걸침) → 맞춤형화장품 주요 규정(교육시간)
};

function resolveA5Topic(q) {
  const old = q.topic;
  if (A5_TOPIC_OVERRIDE[q.id]) {
    const candidates = legacyMap.get(old) || [];
    return {
      topic: A5_TOPIC_OVERRIDE[q.id],
      note: "topic 매핑: 구코드 " + old + "가 topics.js 다수 세부항목(" + candidates.join(",") + ")에 걸쳐 있어 내용(법령 근거) 기준으로 " + A5_TOPIC_OVERRIDE[q.id] + " 선택"
    };
  }
  const candidates = legacyMap.get(old) || [];
  if (candidates.length === 1) return { topic: candidates[0], note: null };
  if (candidates.length === 0) {
    const major = String(old).split(".").slice(0, 2).join(".");
    const fallback = firstSubOfMajor(q.subject, major) || firstSubOfMajor(q.subject, String(old).split(".")[0]);
    return { topic: fallback, note: "topic 추정(구코드 " + old + " topics.js에서 미발견, 과목 " + q.subject + "의 첫 세부항목으로 대체)" };
  }
  // 여기 도달하면 위 override 표에 없는 새로운 다중후보 코드 — 첫 후보 사용 + 경고 note
  return {
    topic: candidates[0],
    note: "topic 추정(다수 후보 " + candidates.join(",") + " 중 첫 값 자동 선택 — 수기 확인 필요, override 표에 추가할 것)"
  };
}

const CONF_MAP = { high: "high", medium: "mid", mid: "mid", low: "low" };
function normConfidence(raw) { return CONF_MAP[raw] || "mid"; }

function toArray5FromWrongOpt(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length === 5 ? v : v.slice(0, 5).concat(new Array(Math.max(0, 5 - v.length)).fill(""));
  const out = [];
  for (let i = 0; i < 5; i++) out.push(v[String(i)] != null ? v[String(i)] : "");
  return out;
}

function a5Points(difficulty, qtype) {
  const d = Number(difficulty);
  if (d <= 2) return 8;
  if (d === 3) return 12;
  // d >= 4
  return ["case", "calc", "table", "match"].indexOf(qtype) !== -1 ? 18 : 12;
}

const A5_QUESTIONS = A5_RAW.map(function (q, i) {
  const newId = "Q-A5-" + String(i + 1).padStart(2, "0");
  const topicResolved = resolveA5Topic(q);
  const points = a5Points(q.difficulty, q.qtype);
  const isMcq = q.type === "mcq";

  const history = (Array.isArray(q.history) ? q.history.slice() : []).map(function (h) {
    return { date: h.date, note: h.note };
  });
  history.push({ date: TODAY, note: "원 id " + q.id + " (A5 표본, work/A_도메인설계_결과.md) → " + newId + "로 재번호" });
  if (topicResolved.note) history.push({ date: TODAY, note: topicResolved.note });
  const wasVerifiedTrue = q.verified === true;
  if (wasVerifiedTrue) {
    history.push({ date: TODAY, note: "A5 원문 verified:true였음 → verified:false로 하향(검증 태스크가 다시 올림)" });
  }
  // key_concept: A5 원본에 없는 필드 — stem 앞 40자로 파생(합격코치 변환 규칙과 동일 관례 적용)
  const keyConcept = String(q.stem || "").slice(0, 40);

  return {
    id: newId,
    subject: q.subject,
    topic: topicResolved.topic,
    level: "D",
    type: q.type,
    qtype: q.qtype,
    points: points,
    difficulty: q.difficulty,
    importance: "M",
    vg: null,
    stem: q.stem,
    choices: isMcq ? (q.choices || []) : [],
    answer: isMcq ? q.answer : null,
    shuffle: false,
    answer_text: isMcq ? null : (q.answer_text || null),
    blanks: q.blanks || null,
    grade: "exact",
    strict_term: q.strict_term === true,
    unit: q.unit != null ? q.unit : null,
    number_tolerance: 0,
    near_miss: Array.isArray(q.near_miss) ? q.near_miss : [],
    explanation: q.explanation,
    wrong_option_explanations: isMcq ? toArray5FromWrongOpt(q.wrong_option_explanations) : null,
    key_concept: keyConcept,
    memory_sentence: q.memory_sentence || "",
    trap: q.trap || "",
    source: {
      law: (q.source && q.source.law) || null,
      guide: (q.source && q.source.guide) || null,
      asof: (q.source && q.source.asof) || "2026-09",
      confidence: normConfidence(q.source_confidence)
    },
    law_effective_date: q.law_effective_date != null ? q.law_effective_date : null,
    cards: Array.isArray(q.cards) ? q.cards : [],
    tags: Array.isArray(q.tags) ? q.tags : [],
    verified: false,
    verified_by: null,
    verified_at: null,
    history: history
  };
});

/* ================================================================
 * 2. 합격코치 20문항 + 12노트
 * ================================================================ */

const cceQuestionsMod = loadCceGlobal("questions.js");
const cceNotesMod = loadCceGlobal("notes.js");
const CCE_QUESTIONS_RAW = cceQuestionsMod.ExamQuestions.QUESTIONS;
const CCE_NOTES_RAW = cceNotesMod.ExamNotes.NOTES;
if (CCE_QUESTIONS_RAW.length !== 20) throw new Error("합격코치 문항 수가 20이 아님: " + CCE_QUESTIONS_RAW.length);
if (CCE_NOTES_RAW.length !== 12) throw new Error("합격코치 노트 수가 12가 아님: " + CCE_NOTES_RAW.length);

// docs/SOURCE_REGISTER.md 의 공식 명칭(코드별). S001은 guide 필드로 별도 처리(브리프 지정).
const SOURCE_TITLES = {
  L001: "화장품법",
  L002: "화장품법 시행령",
  L003: "화장품법 시행규칙",
  L004: "개인정보 보호법",
  R001: "맞춤형화장품조제관리사 자격시험 운영에 관한 규정",
  R002: "맞춤형화장품판매업자의 준수사항에 관한 규정",
  R003: "화장품 안전기준 등에 관한 규정",
  R004: "화장품 사용할 때의 주의사항 및 알레르기 유발성분 표시에 관한 규정",
  R005: "우수화장품 제조 및 품질관리기준",
  R006: "화장품 안전성 정보관리 규정",
  R007: "기능성화장품 심사에 관한 규정"
};

function cceSourceRefToSource(sourceRefs, asof) {
  const code = Array.isArray(sourceRefs) && sourceRefs.length ? sourceRefs[0] : null;
  if (!code) return { law: null, guide: null, asof: asof, confidence: "mid" };
  if (code === "S001") return { law: null, guide: "4판(페이지 미상)", asof: asof, confidence: "mid" };
  const title = SOURCE_TITLES[code];
  return { law: title ? (title + "(" + code + ")") : code, guide: null, asof: asof, confidence: "mid" };
}

// cce_topics 코드 → 신규 topic id. 같은 코드가 topics.js의 여러 세부항목에 걸쳐 있는 경우
// (원 합격코치 앱의 토픽 분류가 더 성긴 경우가 대부분) 내용을 대조해 확정한 수기 표.
// 근거는 task-6-report.md 매핑표 참조.
const CCE_TOPIC_OVERRIDE = {
  "topic1-1": "1.1.1",  // 정의(1.1.1) vs 유형·종류(1.1.2) 중 "정의" 문항 → 1.1.1
  "topic1-2": "1.1.3",  // 유일 후보(영업의 종류)
  "topic1-3": "1.1.4",  // 품질 요소(1.1.4) vs 사후관리 기준(1.1.5) — 표시의무 근거 질문, 근접값 없어 추정에 가까움
  "topic1-4": "1.2.1",  // 유일 후보
  "topic1-5": "1.2.2",  // 동의 없이 처리 가능한 사유(제15조) — 1.2.2 법조문(제15조)과 정확히 일치
  "topic2-1": "2.1.2",  // 원료의 종류(2.1.1) vs 성분의 특성(2.1.2) — 보습제 "특성" 문항 → 2.1.2
  "topic2-2": "2.1.3",  // 유일 후보
  "topic2-3": "2.1.4",  // 제조의 원리(2.1.4) vs 제조공정 및 특성(2.1.5) — 유화 "원리" 문항 → 2.1.4
  "topic2-4": "2.2.1",  // 유일 후보(미생물 한도 기준)
  "topic2-5": "2.2.2",  // 유일 후보
  "topic2-6": "2.3.1",  // 유일 후보
  "topic2-7": "2.3.2",  // 유일 후보
  "topic2-8": "2.4.1",  // 미사용(예비) — 2.4.1/2.4.2/2.4.3 중 첫 값
  "topic2-9": "2.5.1",  // 유일 후보
  "topic3-1": "3.1.5",  // 5개 세부항목 걸침 — 소독제 "사용법" 문항 → 3.1.5
  "topic3-2": "3.2.1",  // 6개 세부항목 걸침 — 위생 "기준" 문항 → 3.2.1
  "topic3-3": "3.3.4",  // 5개 세부항목 걸침 — 설비 "재질" 문항 → 3.3.4
  "topic3-4": "3.4.3",  // 6개 세부항목 걸침 — 보관 "관리기준" 문항 → 3.4.3
  "topic3-5": "3.4.6",  // 개봉 후 사용기간 확인·판정(3.4.6) vs 변질 상태 확인(3.4.7) — PAO 기호 문항 → 3.4.6
  "topic3-6": "3.5.1",  // 미사용(예비) — 6개 세부항목 중 첫 값
  "topic4-1": "4.1.2",  // 5개 세부항목 걸침 — 교육시간(규정) 문항 → 4.1.2
  "topic4-2": "4.2.3",  // 피부(4.2.1)·모발(4.2.2)·상태분석(4.2.3) — 피부타입 "분석" 문항 → 4.2.3
  "topic4-3": "4.3.1",  // 유일 후보
  "topic4-4": "4.4.1",  // 미사용(예비) — 3개 세부항목 중 첫 값
  "topic4-5": "4.5.1",  // 유일 후보
  "topic4-6": "4.6.1",  // 유일 후보
  "topic4-7": "4.6.2",  // 유일 후보
  "topic4-8": "4.6.3",  // 유일 후보
  "topic4-9": "4.6.5",  // 안전기준·위생관리(4.6.4) vs 판매업 준수사항(4.6.5) — 준수사항 일반 문항 → 4.6.5
  "topic4-10": "4.7.1"  // 유일 후보(원 앱 분류를 그대로 존중 — 내용상 4.6.5에 더 가까울 수 있음, note 남김)
};

function resolveCceTopic(subject, cceCode) {
  if (CCE_TOPIC_OVERRIDE[cceCode]) {
    const candidates = cceMap.get(cceCode) || [];
    const ambiguous = candidates.length > 1;
    return {
      topic: CCE_TOPIC_OVERRIDE[cceCode],
      note: ambiguous
        ? "topic 매핑: 합격코치 " + cceCode + "가 topics.js 다수 세부항목(" + candidates.join(",") + ")에 걸쳐 있어 내용 기준으로 " + CCE_TOPIC_OVERRIDE[cceCode] + " 선택"
        : null
    };
  }
  const candidates = cceMap.get(cceCode) || [];
  if (candidates.length === 1) return { topic: candidates[0], note: null };
  if (candidates.length === 0) {
    const fallback = firstSubOfMajor(subject, String(subject) + ".1") || null;
    return { topic: fallback, note: "topic 추정(cce_topics " + cceCode + " topics.js에서 미발견, 과목 " + subject + "의 첫 세부항목으로 대체)" };
  }
  return { topic: candidates[0], note: "topic 추정(다수 후보 " + candidates.join(",") + " 중 첫 값 자동 선택 — 수기 확인 필요, override 표에 추가할 것)" };
}

function cceDifficulty(d) { return d === "easy" ? 2 : (d === "hard" ? 4 : 3); }

function cceQtype(stem, type, correctAnswerText) {
  const s = String(stem || "");
  if (/아닌\s*것|않은\s*것|부적합한\s*것/.test(s)) return "pick_wrong";
  if (/옳은\s*것|해당하는\s*것/.test(s)) return "pick_correct";
  if (type === "short") {
    const a = String(correctAnswerText || "").trim();
    const stripped = a.replace(/(만원|시간|개월|년|일|%|℃)$/, "");
    return /^\d+(\.\d+)?$/.test(stripped) ? "limit_number" : "term";
  }
  return /^\d/.test(String(correctAnswerText || "").trim()) ? "limit_number" : "definition";
}

const CCE_QUESTIONS = CCE_QUESTIONS_RAW.map(function (q, i) {
  const newId = "Q-CCE-" + String(i + 1).padStart(2, "0");
  const subject = Number(String(q.subjectId).replace(/\D/g, ""));
  const topicResolved = resolveCceTopic(subject, q.topicId);
  const isMcq = q.type === "single-choice";
  const type = isMcq ? "mcq" : "short";
  const correctAnswerText = isMcq
    ? (Array.isArray(q.choices) ? q.choices[q.answerIndex] : null)
    : (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers[0] : null);
  const qtype = cceQtype(q.stem, type, correctAnswerText);
  const asof = "2026-09";

  const history = [{ date: TODAY, note: "합격코치 " + q.id + " 변환, 원 status verified-original" }];
  if (topicResolved.note) history.push({ date: TODAY, note: topicResolved.note });

  return {
    id: newId,
    subject: subject,
    topic: topicResolved.topic,
    level: "D",
    type: type,
    qtype: qtype,
    points: q.points,
    difficulty: cceDifficulty(q.difficulty),
    importance: "M",
    vg: null,
    stem: q.stem,
    choices: isMcq ? (q.choices || []) : [],
    answer: isMcq ? q.answerIndex : null,
    shuffle: false,
    answer_text: isMcq ? null : (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : null),
    blanks: null,
    grade: "exact",
    strict_term: false,
    unit: null,
    number_tolerance: 0,
    near_miss: [],
    explanation: q.explanation || "",
    wrong_option_explanations: isMcq ? (Array.isArray(q.distractorReasons) ? q.distractorReasons : null) : null,
    key_concept: String(q.stem || "").slice(0, 40),
    memory_sentence: q.memoryPoint || "",
    trap: "(미기재 — 검증 시 보완)",
    source: cceSourceRefToSource(q.sourceRefs, asof),
    law_effective_date: q.lawSnapshotDate != null ? q.lawSnapshotDate : null,
    cards: [],
    tags: [],
    verified: false,
    verified_by: null,
    verified_at: null,
    history: history
  };
});

/* ================================================================
 * 3. 합격코치 12노트 → 12카드
 * ================================================================ */

const CATEGORY_KO = { definition: "정의", regulation: "규정", ingredient: "성분", safety: "안전", manufacturing: "제조", quality: "품질" };

function cardKind(category, back) {
  if (category === "definition") return "definition";
  if (category === "regulation") return "list";
  if (category === "manufacturing" || category === "quality") return "procedure";
  if (category === "ingredient" || category === "safety") return /\d/.test(String(back || "")) ? "number" : "list";
  return "list";
}

const CCE_CARDS = CCE_NOTES_RAW.map(function (n, i) {
  const newId = "C-CCE-" + String(i + 1).padStart(2, "0");
  const subject = Number(String(n.subjectId).replace(/\D/g, ""));
  const topicResolved = resolveCceTopic(subject, n.topicId);
  const back = n.back || "";

  const history = [{ date: TODAY, note: "합격코치 " + n.id + " 카드 변환" }];
  if (topicResolved.note) history.push({ date: TODAY, note: topicResolved.note });

  return {
    id: newId,
    subject: subject,
    topic: topicResolved.topic,
    category: CATEGORY_KO[n.category] || n.category,
    kind: cardKind(n.category, back),
    importance: "M",
    short_prone: back.length <= 30,
    front: n.front,
    back: back,
    mnemonic: n.memoryTip || "",
    source: cceSourceRefToSource(n.sourceRefs, "2026-09"),
    related: [],
    verified: false,
    history: history
  };
});

/* ================================================================
 * 4. 파일 쓰기 (concat 형식, Global 2)
 * ================================================================ */

function writeConcatFile(filePath, globalName, items) {
  const body = JSON.stringify(items, null, 2);
  const content = "window." + globalName + " = (window." + globalName + " || []).concat(" + body + ");\n";
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

const outA5 = writeConcatFile(path.join(APP_DATA, "q_seed_a5.js"), "PL_QUESTIONS", A5_QUESTIONS);
const outCceQ = writeConcatFile(path.join(APP_DATA, "q_seed_cce.js"), "PL_QUESTIONS", CCE_QUESTIONS);
const outCceC = writeConcatFile(path.join(APP_DATA, "c_seed_cce.js"), "PL_CARDS", CCE_CARDS);

const manifestContent =
  "// app/data/manifest.js — 읽을 데이터 파일 목록(순서대로 concat) + 버전 꼬리표.\n" +
  "// Task 9가 Task 7/8을 거친 배치 파일(q_b*.js/c_b*.js 등)을 files에 추가하고 version을 올린다.\n" +
  'window.PL_MANIFEST = { version: "20260905a", files: ["q_seed_a5.js", "q_seed_cce.js", "c_seed_cce.js"] };\n';
const outManifest = path.join(APP_DATA, "manifest.js");
fs.writeFileSync(outManifest, manifestContent, "utf8");

console.log("생성 완료:");
[outA5, outCceQ, outCceC, outManifest].forEach(function (p) { console.log("  " + path.relative(ROOT, p)); });
console.log("A5 문항: " + A5_QUESTIONS.length + " / 합격코치 문항: " + CCE_QUESTIONS.length + " / 합격코치 카드: " + CCE_CARDS.length);
