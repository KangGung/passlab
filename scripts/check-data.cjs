#!/usr/bin/env node
// scripts/check-data.cjs
//
// 브라우저 없이 문항·카드 데이터를 점검한다.
// 기본(manifest) 모드: app/data/manifest.js의 files 목록대로
//   blueprint.js → topics.js → manifest.files[...] 순서로 Node vm 샌드박스(window={})에 실행한 뒤
//   PLCore.dataCheck(questions, cards, topics)를 돌리고 표 + 오류/경고 목록을 출력한다.
// --file <path> 모드: 지정한 데이터 파일 1개만 (blueprint.js·topics.js는 항상 같이 로드) 점검한다.
//   (Task 7 배치처럼 아직 manifest에 등록되지 않은 파일을 만들 때 단독 점검용.)
//
// 추가 검사(PLCore.dataCheck에는 없는 것):
//   - 파일 첫 줄 형식(Global 2): "window.PL_QUESTIONS = (window.PL_QUESTIONS || []).concat([" 로 시작하는지(q_*.js),
//     "window.PL_CARDS = (window.PL_CARDS || []).concat([" 로 시작하는지(c_*.js)
//   - topic이 topics.js에 존재하는지 (PLCore.dataCheck의 unknownTopic과 동일 — 중복 방지를 위해 별도 재검사는 생략, 표에만 재노출)
//   - 문항의 cards 참조가 실제 존재하는 카드 ID인지 (없으면 경고만)
//   - answer_text가 있는데 type:"mcq"인 모순 (경고)
//
// 종료 코드: 오류(하드 오류: dataCheck.ok===false 또는 첫 줄 형식 위반)가 있으면 1, 없으면 0.
// 경고(카드 참조 누락·mcq+answer_text 모순)는 허용 — 목록만 출력한다.
//
// 사용법:
//   node scripts/check-data.cjs                   # manifest 전체 점검
//   node scripts/check-data.cjs --file <path>      # 파일 1개 단독 점검

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP_DATA = path.join(ROOT, "app", "data");

const PLCore = require(path.join(ROOT, "app", "core.js"));

function makeSandbox() {
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  return sandbox;
}

function runFileInSandbox(sandbox, filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  vm.runInContext(src, sandbox, { filename: filePath });
}

function firstLine(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const idx = src.indexOf("\n");
  return idx === -1 ? src : src.slice(0, idx);
}

/** 파일명 접두어(q_/c_)로 예상되는 첫 줄을 판정하고, 실제 첫 줄과 비교 */
function checkFirstLineFormat(filePath) {
  const base = path.basename(filePath);
  const line = firstLine(filePath);
  if (/^q_.*\.js$/.test(base)) {
    const expected = "window.PL_QUESTIONS = (window.PL_QUESTIONS || []).concat([";
    return { ok: line === expected, expected: expected, actual: line, base: base };
  }
  if (/^c_.*\.js$/.test(base)) {
    const expected = "window.PL_CARDS = (window.PL_CARDS || []).concat([";
    return { ok: line === expected, expected: expected, actual: line, base: base };
  }
  return null; // manifest.js·blueprint.js·topics.js는 첫 줄 형식 규칙 대상이 아님
}

/** 문항의 cards[] 참조 중 실제 카드 목록에 없는 것(경고) */
function checkCardRefs(questions, cards) {
  const cardIds = new Set((Array.isArray(cards) ? cards : []).map(function (c) { return c && c.id; }));
  const missing = [];
  (Array.isArray(questions) ? questions : []).forEach(function (q) {
    if (!q || !Array.isArray(q.cards)) return;
    q.cards.forEach(function (cid) {
      if (!cardIds.has(cid)) missing.push(q.id + " → " + cid);
    });
  });
  return missing;
}

/** type:"mcq"인데 answer_text가 채워진 모순(경고) */
function checkMcqAnswerTextContradiction(questions) {
  return (Array.isArray(questions) ? questions : [])
    .filter(function (q) { return q && q.type === "mcq" && Array.isArray(q.answer_text) && q.answer_text.length > 0; })
    .map(function (q) { return q.id; });
}

function printReport(label, result, extra) {
  console.log("=== 데이터 점검: " + label + " ===");
  console.log("전체 문항 수: " + result.total + " / 카드 수: " + result.cards.total);
  console.log("");
  console.log("과목 | 문항 | 선다 | 단답 | 8점 | 12점 | 18점 | 검증%  | 카드");
  [1, 2, 3, 4].forEach(function (sid) {
    const S = result.bySubject[sid] || { total: 0, mcq: 0, short: 0, points: { 8: 0, 12: 0, 18: 0 }, verified: 0 };
    const pct = S.total ? ((S.verified / S.total) * 100).toFixed(0) : "0";
    const cardN = (result.cards.bySubject && result.cards.bySubject[sid]) || 0;
    console.log(
      "  " + sid + "   | " + S.total + "   | " + S.mcq + "   | " + S.short + "   | " +
      S.points[8] + "   | " + S.points[12] + "   | " + S.points[18] + "   | " +
      pct + "%   | " + cardN
    );
  });
  console.log("");
  console.log("전체 verified 비율: " + (result.verifiedRatio * 100).toFixed(1) + "%");
  console.log("");

  const hardChecks = [
    ["중복 id", result.duplicates],
    ["잘못된 answer(mcq 0~4 범위 밖 / short 정답 없음)", result.badAnswer],
    ["choices 규격 위반(mcq는 5개, short는 빈 배열이어야 함)", result.badChoices],
    ["wrong_option_explanations 5개 아님(mcq)", result.badWrongExpl],
    ["points가 8/12/18이 아님", result.badPoints],
    ["source(law/guide) 둘 다 없음", result.missingSource],
    ["memory_sentence 없음", result.missingMemory],
    ["topic이 topics.js에 없음(unknownTopic)", result.unknownTopic]
  ];
  const firstLineErrors = extra.firstLineErrors || [];
  let hardErrorCount = 0;
  console.log("--- 오류 (하드) ---");
  hardChecks.forEach(function (pair) {
    const name = pair[0], list = pair[1];
    if (list.length) {
      hardErrorCount += list.length;
      console.log("  [오류] " + name + " (" + list.length + "건): " + list.join(", "));
    }
  });
  if (firstLineErrors.length) {
    hardErrorCount += firstLineErrors.length;
    firstLineErrors.forEach(function (e) {
      console.log("  [오류] 첫 줄 형식 위반: " + e.base);
      console.log("    기대: " + e.expected);
      console.log("    실제: " + e.actual);
    });
  }
  if (hardErrorCount === 0) console.log("  없음");

  console.log("");
  console.log("--- 경고 (허용, 참고용) ---");
  let warnCount = 0;
  if (extra.missingCardRefs && extra.missingCardRefs.length) {
    warnCount += extra.missingCardRefs.length;
    console.log("  [경고] cards 참조가 존재하지 않는 카드 ID를 가리킴 (" + extra.missingCardRefs.length + "건): " + extra.missingCardRefs.join(", "));
  }
  if (extra.mcqAnswerTextContradiction && extra.mcqAnswerTextContradiction.length) {
    warnCount += extra.mcqAnswerTextContradiction.length;
    console.log("  [경고] type:mcq인데 answer_text가 채워져 있음 (" + extra.mcqAnswerTextContradiction.length + "건): " + extra.mcqAnswerTextContradiction.join(", "));
  }
  if (warnCount === 0) console.log("  없음");
  console.log("");

  const ok = hardErrorCount === 0;
  console.log(ok ? "결과: OK (오류 0)" : "결과: 오류 " + hardErrorCount + "건");
  return ok;
}

function runManifestMode() {
  const manifestPath = path.join(APP_DATA, "manifest.js");
  const blueprintPath = path.join(APP_DATA, "blueprint.js");
  const topicsPath = path.join(APP_DATA, "topics.js");

  const sandbox = makeSandbox();
  runFileInSandbox(sandbox, blueprintPath);
  runFileInSandbox(sandbox, topicsPath);
  runFileInSandbox(sandbox, manifestPath);

  const manifest = sandbox.window.PL_MANIFEST;
  if (!manifest || !Array.isArray(manifest.files)) {
    console.error("오류: app/data/manifest.js에서 PL_MANIFEST.files를 읽지 못함");
    process.exit(1);
  }
  console.log("manifest version: " + manifest.version + " / files: " + manifest.files.join(", "));
  console.log("");

  const firstLineErrors = [];
  manifest.files.forEach(function (f) {
    const fp = path.join(APP_DATA, f);
    const chk = checkFirstLineFormat(fp);
    if (chk && !chk.ok) firstLineErrors.push(chk);
    runFileInSandbox(sandbox, fp);
  });

  const questions = sandbox.window.PL_QUESTIONS || [];
  const cards = sandbox.window.PL_CARDS || [];
  const topics = sandbox.window.PL_TOPICS || [];

  const result = PLCore.dataCheck(questions, cards, topics);
  const extra = {
    firstLineErrors: firstLineErrors,
    missingCardRefs: checkCardRefs(questions, cards),
    mcqAnswerTextContradiction: checkMcqAnswerTextContradiction(questions)
  };
  const ok = printReport("manifest (" + manifest.files.length + "개 파일)", result, extra);
  process.exit(ok ? 0 : 1);
}

function runFileMode(fileArg) {
  const blueprintPath = path.join(APP_DATA, "blueprint.js");
  const topicsPath = path.join(APP_DATA, "topics.js");
  const targetPath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);

  const sandbox = makeSandbox();
  runFileInSandbox(sandbox, blueprintPath);
  runFileInSandbox(sandbox, topicsPath);

  const firstLineErrors = [];
  const chk = checkFirstLineFormat(targetPath);
  if (chk && !chk.ok) firstLineErrors.push(chk);
  runFileInSandbox(sandbox, targetPath);

  const questions = sandbox.window.PL_QUESTIONS || [];
  const cards = sandbox.window.PL_CARDS || [];
  const topics = sandbox.window.PL_TOPICS || [];

  const result = PLCore.dataCheck(questions, cards, topics);
  const extra = {
    firstLineErrors: firstLineErrors,
    missingCardRefs: checkCardRefs(questions, cards),
    mcqAnswerTextContradiction: checkMcqAnswerTextContradiction(questions)
  };
  const ok = printReport("파일 단독: " + path.relative(ROOT, targetPath), result, extra);
  process.exit(ok ? 0 : 1);
}

function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    runFileMode(args[fileIdx + 1]);
  } else {
    runManifestMode();
  }
}

main();
