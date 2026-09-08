/* PASS LAB app.js — 화면 그리기 + 저장.
   채점·숙달도·세트 구성·합격 판정 계산은 전부 core.js(window.PLCore)가 한다.
   여기서는 다시 계산하지 않는다. */
(function () {
"use strict";

var C = window.PLCore;
var BP = window.PL_BLUEPRINT || { exam: {}, subjects: [], diagnostic: {} };
var TOPICS = window.PL_TOPICS || [];
var MAN = window.PL_MANIFEST || { version: "0", files: [] };

/* ================================================================
 * 0. 작은 도구
 * ================================================================ */
var WEEK = ["일", "월", "화", "수", "목", "금", "토"];
var CIRC = ["①", "②", "③", "④", "⑤"];

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function nowISO() { return new Date().toISOString(); }
function todayStr() { return C.today(); }
function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function pct(v) { return v == null ? "–" : Math.round(v) + "%"; }
function oneLine(s, n) {
  var t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
function fmtExamDate(ds) {
  var d = C.parseDate(ds);
  if (!d) return String(ds || "-");
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
         "(" + WEEK[d.getDay()] + ")";
}
function fmtDT(iso) {
  if (!iso) return "없음";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  var m = Math.floor(sec / 60);
  return m + "분 " + pad2(sec % 60) + "초";
}
function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

var toastTimer = null;
function toast(msg) {
  var t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
}

/* ================================================================
 * 1. 저장 (localStorage, pl.v1.*  — 6개 키)
 * ================================================================ */
var PREFIX = "pl.v1.";
var KEYS = ["settings", "attempts", "mistakes", "cards", "session", "mocks"];

var DEFAULT_SETTINGS = {
  exam_date: "2026-09-19",
  track: "sprint",
  daily_minutes: 120,
  device: "mac",
  last_backup: null,
  user_accepted: {},
  schema: 1,
  diag_done: false
};

var Store = {
  get: function (key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set: function (key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; }
    catch (e) { toast("저장에 실패했습니다 — 브라우저 저장 공간을 확인해 주세요."); return false; }
  },
  del: function (key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} }
};

/* ================================================================
 * 2. 상태
 * ================================================================ */
var S = {
  questions: [], cards: [], byQid: {}, byCid: {},
  subs: [],                       // topics 중 kind==="sub"
  topicName: {},
  loadErrors: [],
  settings: null, attempts: [], mistakes: {}, cardState: {}, mocks: [],
  attByQid: {},
  screen: "home",
  quiz: null,                     // 진행 중 문항 풀이
  summary: null,
  diagResult: null,
  study: { subject: "", topic: "", type: "all", mode: "new", n: 10 },
  mfilter: { stage: "all", subject: "", shortOnly: false },
  openMistake: null,
  // 암기카드
  cardFilter: { subject: "", category: "", onlyAuto: false },
  cardRun: null,                  // 진행 중 카드 세션(카드 상태는 매장 즉시 pl.v1.cards에 저장)
  cardListOpen: false,            // 카드 홈 · 내 메모리 노트 목록 펼침
  importMode: "overwrite",        // 가져오기 방식 — 덮어쓰기 | 병합
  importPreview: null, importStage: 0,
  resetStage: 0,
  dataCheck: null,
  claudeText: null,
  // 모의고사
  mockPlans: null,        // 준비 화면 미리보기 {full,half,mini3} — buildMock 결과
  mockAskStart: null,     // 시작 확인 중인 프리셋 키
  mockAskSubmit: false,   // 제출 확인창 열림
  mockPad: false,         // 번호판 펼침
  mockResult: null,       // 채점 결과 {grade, rec, order, answers, name, date}
  mockExplain: false,     // 결과 화면 해설 목록 열림
  mockExplainQid: null,   // 해설을 펼친 문항
  mockAskDiscard: false,  // 버리기 확인창 열림
  mockCheck: null         // 설정 · 모의고사 가능 여부
};

function loadState() {
  var st = Store.get("settings", null);
  S.settings = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { S.settings[k] = DEFAULT_SETTINGS[k]; });
  if (st && typeof st === "object") {
    Object.keys(st).forEach(function (k) { if (st[k] !== undefined) S.settings[k] = st[k]; });
  }
  // 저장된 값이 기대한 모양(배열/객체)이 아니면 초기값으로 되돌린다
  var broken = [];
  function takeArr(key) {
    var v = Store.get(key, null);
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    broken.push(key);
    return [];
  }
  function takeObj(key) {
    var v = Store.get(key, null);
    if (v == null) return {};
    if (typeof v === "object" && !Array.isArray(v)) return v;
    broken.push(key);
    return {};
  }
  S.attempts = takeArr("attempts");
  S.mistakes = takeObj("mistakes");
  S.cardState = takeObj("cards");
  S.mocks = takeArr("mocks");
  rebuildAttIndex();
  if (broken.length) toast("저장 데이터 일부가 손상되어 초기값으로 대체했습니다.");
}
function rebuildAttIndex() {
  var map = {};
  S.attempts.forEach(function (a) {
    if (!a || !a.qid) return;
    (map[a.qid] || (map[a.qid] = [])).push(a);
  });
  S.attByQid = map;
}
function saveSettings() { Store.set("settings", S.settings); }
function saveAttempts() { Store.set("attempts", S.attempts); }
function saveMistakes() { Store.set("mistakes", S.mistakes); }
function saveCards() { Store.set("cards", S.cardState); }
function saveSession() {
  var Q = S.quiz;
  if (!Q) return;
  Store.set("session", {
    sid: Q.sid, mode: Q.mode, preset: Q.preset, qids: Q.qids, idx: Q.idx,
    answers: Q.answers, startedAt: Q.startedAt, deadlineAt: Q.deadlineAt || null, savedAt: nowISO(),
    stats: Q.stats,
    done: Q.done                 // 이미 채점·기록까지 끝난 qid — 이어하기에서 두 번 세지 않으려고 남긴다
  });
}
function clearSession() { Store.del("session"); }
function mctx() {
  return { todayStr: todayStr(), examDate: S.settings.exam_date, track: S.settings.track };
}

/* ================================================================
 * 3. 데이터 파일 불러오기 (file:// 이라 fetch 대신 <script> 삽입)
 * ================================================================ */
function loadDataFiles(done) {
  var files = (MAN.files || []).slice();
  var ver = MAN.version || "0";
  var i = 0;
  function next() {
    if (i >= files.length) return done();
    var f = files[i++];
    add(f, true);
  }
  function add(f, withVersion) {
    var s = document.createElement("script");
    s.src = "data/" + f + (withVersion ? "?v=" + encodeURIComponent(ver) : "");
    s.async = false;
    s.onload = function () { next(); };
    s.onerror = function () {
      if (withVersion) { add(f, false); return; }   // file://에서 물음표가 막히면 한 번 더
      S.loadErrors.push(f);
      next();
    };
    document.head.appendChild(s);
  }
  next();
}

function indexData() {
  S.questions = (window.PL_QUESTIONS || []).filter(function (q) { return q && q.id; });
  S.cards = (window.PL_CARDS || []).filter(function (c) { return c && c.id; });
  S.byQid = {};
  S.questions.forEach(function (q) { S.byQid[q.id] = q; });
  S.byCid = {};
  S.cards.forEach(function (c) { S.byCid[c.id] = c; });
  S.subs = TOPICS.filter(function (t) { return t && t.kind === "sub"; });
  S.topicName = {};
  TOPICS.forEach(function (t) { if (t && t.id) S.topicName[t.id] = t.name; });
}

/* ================================================================
 * 4. 문항 표시용 도우미
 * ================================================================ */
function subjectOf(id) {
  var s = (BP.subjects || []).filter(function (x) { return Number(x.id) === Number(id); })[0];
  return s || { id: id, name: "과목 " + id, short_name: "과목 " + id, points: 0, pass_points: 0 };
}
function topicLabel(id) { return id ? (S.topicName[id] ? id + " " + S.topicName[id] : id) : ""; }

function choiceOrder(q, sid) {
  var n = (q.choices || []).length, base = [], i;
  for (i = 0; i < n; i++) base.push(i);
  if (!q.shuffle) return base;
  return C.shuffle(base, C.seededRandom(hashStr(String(sid) + "|" + q.id)));
}
function answerText(q) {
  if (!q) return "-";
  if (q.type === "mcq") {
    var i = q.answer;
    if (!(i >= 0 && q.choices && q.choices[i] != null)) return "(정답 정보 없음)";
    return CIRC[i] + " " + q.choices[i];
  }
  if (Array.isArray(q.blanks) && q.blanks.length) {
    return q.blanks.map(function (b, k) {
      return (b.label || (k + 1)) + " " + ((b.accepted || [])[0] || "?");
    }).join(" / ");
  }
  return (Array.isArray(q.answer_text) && q.answer_text[0]) || "(정답 정보 없음)";
}
function givenText(q, given) {
  if (given == null || given === "") return "무응답";
  if (q && q.type === "mcq") {
    var i = Number(given);
    if (!(i >= 0 && q.choices && q.choices[i] != null)) return "무응답";
    return CIRC[i] + " " + q.choices[i];
  }
  if (Array.isArray(given)) {
    var any = given.some(function (v) { return String(v || "").trim() !== ""; });
    if (!any) return "무응답";
    return given.map(function (v, k) {
      var lb = (q && q.blanks && q.blanks[k] && q.blanks[k].label) || (k + 1);
      return lb + " " + (String(v || "").trim() || "(빈칸)");
    }).join(" / ");
  }
  return String(given);
}
function hasAnswerFor(q, a) {
  if (!a) return false;
  if (q.type === "mcq") return a.given != null;
  if (Array.isArray(a.given)) return a.given.some(function (v) { return String(v || "").trim() !== ""; });
  return String(a.given == null ? "" : a.given).trim() !== "";
}
function verifiedChip(q) {
  return q && q.verified === true
    ? '<span class="chip green">검증됨</span>'
    : '<span class="chip gray">미검증 문항</span>';
}
function sourceText(q) {
  var src = (q && q.source) || {};
  var out = [];
  if (src.law) out.push("법령 " + src.law);
  if (src.guide) out.push(src.guide);
  if (q && q.law_effective_date) out.push("시행 " + q.law_effective_date);
  if (src.confidence) out.push("신뢰도 " + src.confidence);
  return out.length ? out.join(" · ") : "근거 표기 없음";
}
var WHYS = [
  ["unknown", "몰랐다"], ["confused", "헷갈렸다"], ["slip", "숫자·용어 착오"],
  ["misread", "잘못 읽었다"], ["guess", "찍었다"]
];
function whyLabel(w) {
  var f = WHYS.filter(function (x) { return x[0] === w; })[0];
  return f ? f[1] : "";
}
var STAGE_LABEL = { "new": "새 오답", reviewing: "복습 중", graduated: "졸업" };
var CONFS = [[2, "확실"], [1, "애매"], [0, "찍음"]];
var RISK = {
  safe: ["green", "괜찮음"], warn: ["amber", "주의"],
  danger: ["red", "위험"], unmeasured: ["gray", "측정 부족"]
};

/* ================================================================
 * 5. 화면 그리기
 * ================================================================ */
var lastScreen = null;

function render(opts) {
  opts = opts || {};
  var main = el("main");
  var html = "";
  switch (S.screen) {
    case "home": html = viewHome(); break;
    case "diag": html = viewQuiz(); break;
    case "diagresult": html = viewDiagResult(); break;
    case "study": html = viewStudySetup(); break;
    case "quiz": html = viewQuiz(); break;
    case "summary": html = viewSummary(); break;
    case "mistakes": html = viewMistakes(); break;
    case "mock": html = viewMockSetup(); break;
    case "mockexam": html = viewMockExam(); break;
    case "mockresult": html = viewMockResult(); break;
    case "cards": html = viewCardsHome(); break;
    case "cardrun": html = viewCardRun(); break;
    case "settings": html = viewSettings(); break;
    default: html = viewHome();
  }
  main.innerHTML = html;
  renderTop();
  renderTabs();
  renderFoot();
  if (opts.top || lastScreen !== S.screen) window.scrollTo(0, 0);
  lastScreen = S.screen;
  afterRender();
}

function afterRender() {
  // 모의고사 시험 화면에서만 초 단위 타이머를 돌린다(떠나면 반드시 멈춘다)
  if (S.screen === "mockexam" && S.quiz && S.quiz.mode === "mock") startMockTimer();
  else stopMockTimer();

  // 단답 입력칸이 있으면 첫 빈 칸에 커서를 둔다(데스크톱만 — 모바일 키보드 강제 팝업 방지)
  if (window.innerWidth >= 900 && (S.screen === "quiz" || S.screen === "diag")) {
    var ins = document.querySelectorAll("#main .shortin");
    for (var i = 0; i < ins.length; i++) {
      if (!ins[i].disabled && !ins[i].value) { ins[i].focus(); break; }
    }
  }
}

function renderTop() {
  var st = S.settings, t = todayStr();
  var dd = C.dday(st.exam_date, t);
  var lb = st.last_backup ? C.dateOf(st.last_backup) : null;
  var stale = !lb || (C.daysBetween(lb, t) >= 2);
  el("topmeta").innerHTML =
    '<span class="chip red">' + esc(ddayText(dd)) + '</span>' +
    '<span class="chip ' + (stale ? "amber" : "gray") + '">백업 ' + esc(st.last_backup ? fmtDT(st.last_backup) : "없음") + '</span>';
}

function renderFoot() {
  var dc = S.questions.length;
  el("foot").innerHTML =
    '<span>문항 ' + dc + ' · 카드 ' + S.cards.length + ' · 데이터 ' + esc(MAN.version || "-") + '</span>' +
    '<span>계산 엔진 core.js</span>';
}

var TABS = [
  { id: "home", screens: ["home", "diag", "diagresult"] },
  { id: "study", screens: ["study", "quiz", "summary"] },
  { id: "mock", screens: ["mock", "mockexam", "mockresult"] },
  { id: "mistakes", screens: ["mistakes"] },
  { id: "cards", screens: ["cards", "cardrun"] },
  { id: "settings", screens: ["settings"] }
];
function renderTabs() {
  var t = todayStr();
  // 만기가 있는 탭에만 빨간 점 — 오답·카드
  var dots = {
    mistakes: C.dueMistakes(S.mistakes, t).length,
    cards: S.cards.length ? C.dueCards(S.cards, S.cardState, t, { limit: false }).due.length : 0
  };
  var btns = el("tabbar").querySelectorAll("button[data-tab]");
  for (var i = 0; i < btns.length; i++) {
    var id = btns[i].getAttribute("data-tab");
    var tab = TABS.filter(function (x) { return x.id === id; })[0];
    var on = tab && tab.screens.indexOf(S.screen) !== -1;
    btns[i].classList.toggle("on", !!on);
    if (dots[id] !== undefined) {
      var n = dots[id];
      var dot = btns[i].querySelector(".dot");
      if (n > 0 && !dot) {
        dot = document.createElement("span"); dot.className = "dot";
        btns[i].appendChild(dot);
      } else if (n === 0 && dot) { dot.parentNode.removeChild(dot); dot = null; }
      if (dot) dot.setAttribute("title", "만기 " + n + "개");
    }
  }
}

function ddayText(dd) {
  if (dd == null) return "시험일 미설정";
  if (dd === 0) return "D-DAY";
  return dd > 0 ? ("D-" + dd) : ("D+" + Math.abs(dd));
}

/* ---------------- 홈 ---------------- */
function viewHome() {
  var st = S.settings, t = todayStr();
  var dd = C.dday(st.exam_date, t);
  var due = C.dueMistakes(S.mistakes, t);
  var plan = C.dailyPlan(st.daily_minutes, dd, due.length);
  var h = "";

  if (S.loadErrors.length) {
    h += '<div class="banner red"><span>문항 파일 ' + S.loadErrors.length + '개를 읽지 못했습니다: ' +
         esc(S.loadErrors.join(", ")) + '. 나머지 문항으로 계속합니다.</span></div>';
  }

  h += '<div class="dday"><b>' + esc(ddayText(dd)) + '</b>' +
       '<span>제' + esc(String((BP.exam && BP.exam.round) || 12)) + '회 · 시험일 ' + esc(fmtExamDate(st.exam_date)) +
       ' ' + esc((BP.exam && BP.exam.start) || "10:00") + '</span></div>';

  // 백업 배너
  var lb = st.last_backup ? C.dateOf(st.last_backup) : null;
  var gap = lb ? C.daysBetween(lb, t) : null;
  if (!lb || gap >= 2) {
    h += '<div class="banner"><span>' +
         (lb ? '백업을 ' + gap + '일 동안 안 했습니다.' : '아직 백업한 적이 없습니다.') +
         ' 기록이 사라지면 되돌릴 수 없습니다.</span>' +
         '<button class="btn sm" data-act="export">백업 내보내기</button></div>';
  }

  // 이어하기 (모의고사면 남은 시간을 같이 보여준다)
  h += resumeBannerHTML(Store.get("session", null), "");

  // 예상 점수 · READINESS
  h += viewExpectedCard();

  // 오늘 할 일 (카드 칸은 실제 만기·상한 — 누르면 카드 홈)
  var hc = cardPlan(plan.cards, null);
  h += '<div class="card"><h2>오늘 할 일 · 하루 ' + esc(String(st.daily_minutes)) + '분</h2>' +
       '<div class="todo">' +
       '<div class="t"><b>' + plan.newQ + '</b><span>새 문제</span></div>' +
       '<div class="t"><b>' + plan.review + '</b><span>복습 만기</span></div>' +
       '<button type="button" class="t" data-act="goto" data-screen="cards"><b>' + hc.queue.length +
       '</b><span>암기카드 →</span></button>' +
       '</div>' +
       '<p class="small muted mt">만기 오답 ' + due.length + '개 · 카드 만기 ' + hc.due.length + '장 · 안 본 카드 ' +
       hc.fresh.length + '장 · 오늘 카드 상한 ' + plan.cards + '장 · 학습 국면 ' + esc(plan.phase) + '</p>' +
       '<hr class="rule"><p class="small muted">짧게 치고 빠지기 — 약한 곳·복습 만기·새 문항을 섞어 냅니다(해설 바로 나옴)</p>' +
       '<div class="acts"><button class="btn" data-act="quick" data-n="10">QUICK 10</button>' +
       '<button class="btn" data-act="quick" data-n="20">QUICK 20</button></div>' +
       '</div>';

  // 큰 버튼
  if (!st.diag_done) {
    h += '<button class="btn primary big" data-act="start-diag">진단 ' +
         esc(String((BP.diagnostic && BP.diagnostic.total) || 30)) + '문항 시작</button>' +
         '<p class="small muted center mt">지금 실력을 재서 어디부터 볼지 정합니다. 해설은 나오지 않습니다.</p>';
  } else {
    h += '<button class="btn primary big" data-act="start-today">오늘의 학습 시작 (' +
         Math.max(1, plan.newQ) + '문항)</button>';
    if (due.length) {
      h += '<button class="btn big mt" data-act="start-due">만기 오답 다시 풀기 (' + due.length + ')</button>';
    }
  }

  // 최근 모의고사
  h += viewRecentMocks();

  // 과목 숙달도 (암기카드 '모름'을 반영한 값 — …WithCards)
  h += '<div class="card"><h2>과목별 숙달도 · 빨간 선 = 과락 40% · 카드 모름 반영</h2>';
  (BP.subjects || []).forEach(function (s) {
    var d = C.subjectMasteryDetailWithCards(s.id, TOPICS, S.questions, S.attByQid, t, S.cardState);
    var v = d.value == null ? 0 : d.value;
    var cls = d.measuring ? "est" : (v >= 60 ? "good" : (v >= 40 ? "warn" : "bad"));
    h += '<div class="subj"><div class="top">' +
         '<span class="nm">' + esc(s.id + ". " + s.name) + '</span>' +
         '<span class="val">' + (d.measuring ? "측정 중" : pct(v)) + '</span></div>' +
         '<div class="bar"><i class="' + cls + '" style="width:' + clamp(v, 0, 100).toFixed(1) + '%"></i><span class="cut"></span></div>' +
         '<div class="barnote"><span>' + esc(s.short_name) + ' · ' + s.points + '점 만점</span>' +
         '<span>세부항목 ' + d.attemptedTopics + '/' + d.totalTopics + ' 풀어봄</span></div>' +
         '</div>';
  });
  h += '</div>';

  // 약한 세부항목 3개
  var weak = S.subs.map(function (tp) {
    var tm = C.topicMasteryWithCards(tp.id, S.questions, S.attByQid, t, S.cardState);
    return { id: tp.id, name: tp.name, subject: tp.subject, v: tm.value, n: tm.n };
  }).filter(function (x) { return x.n >= 1; })
    .sort(function (a, b) { return a.v - b.v; })
    .slice(0, 3);
  h += '<div class="card"><h2>약한 세부항목</h2>';
  if (!weak.length) {
    h += '<p class="small muted">아직 푼 문항이 없어 못 고릅니다. 진단이나 학습을 먼저 해 주세요.</p>';
  } else {
    h += '<ul class="list">';
    weak.forEach(function (x) {
      h += '<li><span class="l">' + esc(x.id + " " + x.name) + '</span>' +
           '<span class="r">' + pct(x.v) + ' · ' + x.n + '문항</span></li>';
    });
    h += '</ul>';
  }
  h += '</div>';

  // 최근 진단 결과
  var ld = st.last_diagnostic;
  if (ld && ld.bySubject) {
    h += '<div class="card"><h2>최근 진단 결과 · ' + esc(ld.date || "") + '</h2>' +
         '<p class="small">' + esc(String(ld.correct)) + '/' + esc(String(ld.total)) +
         ' 정답 · 예상 ' + esc(String(ld.est_total)) + '점 / 1000점</p>' +
         '<p class="tiny muted">' + esc(ld.est_note || "초기 추정") + '</p><div class="row mt">';
    ld.bySubject.forEach(function (b) {
      var r = RISK[b.risk] || RISK.unmeasured;
      h += '<span class="chip ' + r[0] + '">' + esc(String(b.id)) + ' ' + (b.pct == null ? "–" : pct(b.pct)) + '</span>';
    });
    h += '</div></div>';
  }

  // 데이터 상태
  var vr = S.questions.length
    ? Math.round(S.questions.filter(function (q) { return q.verified === true; }).length * 100 / S.questions.length)
    : 0;
  h += '<p class="small muted">문항 ' + S.questions.length + '개 · 검증 ' + vr + '% · 암기카드 ' + S.cards.length + '장' +
       ' <button class="btn sm ghost" data-act="goto" data-screen="settings">데이터 점검</button></p>';
  return h;
}

/* ---------------- 문항(진단·학습 공용) ---------------- */
function viewQuiz() {
  var Q = S.quiz;
  if (!Q || !Q.qids.length) {
    return '<div class="card"><p>진행 중인 문제가 없습니다.</p>' +
           '<button class="btn mt" data-act="go-home">홈으로</button></div>';
  }
  var isDiag = Q.mode === "diag";
  var qid = Q.qids[Q.idx];
  var q = S.byQid[qid];
  if (!q) {
    return '<div class="card"><p>문항 ' + esc(qid) + '을(를) 찾지 못했습니다. 다음 문항으로 넘어가세요.</p>' +
           '<button class="btn mt" data-act="next">다음</button></div>';
  }
  var a = Q.answers[qid] || {};
  var g = Q.graded;
  var revealed = !isDiag && !!g;
  var s = subjectOf(q.subject);
  var total = Q.qids.length;
  var h = "";

  if (isDiag && Q.warnings && Q.warnings.length && Q.idx === 0) {
    h += '<div class="banner"><span>' + esc(Q.warnings.join(" / ")) + '</span></div>';
  }

  h += '<div class="qhead">' +
       '<span class="chip">' + esc(s.short_name) + '</span>' +
       (q.topic ? '<span class="chip gray">' + esc(topicLabel(q.topic)) + '</span>' : "") +
       '<span class="chip">' + esc(String(q.points)) + '점</span>' +
       '<span class="chip">' + (q.type === "short" ? "단답형" : "선다형") + '</span>' +
       verifiedChip(q) +
       '<span class="qcount">' + (Q.idx + 1) + '/' + total + '</span>' +
       '</div>' +
       '<div class="prog"><i style="width:' + ((Q.idx + (revealed ? 1 : 0)) * 100 / total).toFixed(1) + '%"></i></div>';

  h += '<div class="card"><p class="stem">' + esc(q.stem) + '</p>';

  if (q.type === "mcq") {
    h += '<div class="choices">';
    choiceOrder(q, Q.sid).forEach(function (oi, di) {
      var cls = "choice";
      if (a.given === oi) cls += " sel";
      if (revealed) {
        if (oi === q.answer) cls += " ok";
        else if (a.given === oi) cls += " bad";
      }
      var why = "";
      if (revealed && Array.isArray(q.wrong_option_explanations) && q.wrong_option_explanations[oi]) {
        why = '<span class="why">' + esc(q.wrong_option_explanations[oi]) + '</span>';
      }
      h += '<button type="button" class="' + cls + '" data-act="pick" data-i="' + oi + '"' +
           (revealed ? " disabled" : "") + '>' +
           '<span class="k">' + CIRC[di] + '</span>' +
           '<span class="txt">' + esc(q.choices[oi]) + why + '</span></button>';
    });
    h += '</div>';
  } else {
    var attrs = ' type="text" class="shortin" autocomplete="off" autocorrect="off" autocapitalize="none"' +
                ' spellcheck="false" enterkeyhint="done"' + (revealed ? " disabled" : "");
    var hasBlanks = Array.isArray(q.blanks) && q.blanks.length > 0;
    // 열거형(grade:"set")은 쉼표로 나눠 채점한다 — 띄어쓰기는 구분자가 아니다.
    // core.js는 blanks가 있으면 그쪽을 먼저 보므로, 안내도 빈칸이 없을 때만 띄운다.
    var isSet = !hasBlanks && q.grade === "set";
    if (hasBlanks) {
      var gv = Array.isArray(a.given) ? a.given : [];
      q.blanks.forEach(function (b, i) {
        h += '<label class="blankrow"><span class="blab">' + esc(b.label || (i + 1)) + '</span>' +
             '<input' + attrs + ' data-blank="' + i + '" value="' + esc(gv[i] || "") + '"></label>';
      });
    } else {
      h += '<input' + attrs + (isSet ? ' placeholder="예) 가, 나, 다"' : '') + ' data-blank="0" value="' +
           esc(typeof a.given === "string" ? a.given : "") + '">';
    }
    if (isSet) h += '<p class="small muted">쉼표(,)로 구분해 입력하세요</p>';
    if (q.unit) h += '<p class="small muted">단위: ' + esc(q.unit) + ' (숫자만 써도 됩니다)</p>';
    if (!revealed) {
      h += '<button type="button" class="btn mt" data-act="short-done">답 입력 완료</button>';
    }
  }

  // 자신감
  var answered = hasAnswerFor(q, a);
  if (!revealed) {
    h += '<hr class="rule"><p class="small muted">얼마나 확신하나요? (숙달도 계산에 씁니다)</p>' +
         '<div class="confrow">';
    CONFS.forEach(function (c) {
      h += '<button type="button" class="btn sm' + (a.conf === c[0] ? " on" : "") + '" data-act="conf" data-c="' +
           c[0] + '"' + (answered ? "" : " disabled") + '>' + c[1] + '</button>';
    });
    h += '</div>';
  }
  h += '</div>';

  // 해설 패널(학습만)
  if (revealed) h += viewExplain(q, a, g);

  // 버튼
  var ready = answered && a.conf != null;
  h += '<div class="acts">';
  if (isDiag) {
    var last = Q.idx + 1 >= total;
    h += '<button class="btn primary" data-act="' + (last ? "grade-diag" : "next") + '"' +
         (ready ? "" : " disabled") + '>' + (last ? "채점하기" : "다음") + '</button>';
  } else if (!revealed) {
    h += '<button class="btn primary" data-act="submit"' + (ready ? "" : " disabled") + '>제출</button>';
  } else if (!Q.awaitSelf) {
    h += '<button class="btn primary" data-act="next">' +
         (Q.idx + 1 >= total ? "결과 보기" : "다음 문항") + '</button>';
  }
  h += '<button class="btn ghost narrow" data-act="quit">그만하기</button></div>';
  if (!revealed) {
    h += '<p class="small muted center mt" id="quizHint"' + (ready ? ' style="visibility:hidden"' : '') + '>' +
         (answered ? "자신감(확실·애매·찍음)을 골라 주세요." : "답을 먼저 고르거나 입력해 주세요.") + '</p>';
  }
  return h;
}

/* 단답을 타이핑하는 동안에는 화면을 다시 그리지 않는다(한글 조합이 깨지므로).
   대신 버튼의 활성 상태만 직접 맞춘다. */
function syncQuizButtons() {
  var Q = S.quiz;
  if (!Q || Q.graded) return;
  var q = S.byQid[Q.qids[Q.idx]];
  if (!q) return;
  var a = Q.answers[Q.qids[Q.idx]] || {};
  var answered = hasAnswerFor(q, a);
  var ready = answered && a.conf != null;
  var i, list;
  list = document.querySelectorAll('#main [data-act="conf"]');
  for (i = 0; i < list.length; i++) list[i].disabled = !answered;
  list = document.querySelectorAll('#main [data-act="next"],#main [data-act="grade-diag"],#main [data-act="submit"]');
  for (i = 0; i < list.length; i++) list[i].disabled = !ready;
  var hint = el("quizHint");
  if (hint) {
    hint.style.visibility = ready ? "hidden" : "visible";
    hint.textContent = answered ? "자신감(확실·애매·찍음)을 골라 주세요." : "답을 먼저 고르거나 입력해 주세요.";
  }
}

function viewExplain(q, a, g) {
  var Q = S.quiz;
  var h = "";
  var att = (Q.attIndex != null) ? S.attempts[Q.attIndex] : null;

  if (Q.awaitSelf) {
    h += '<div class="verdict ask"><b>? 자기 판정이 필요합니다</b>' +
         '<p>정답과 글자가 달라 자동으로 맞다고 하기 어렵습니다. 뜻이 같은지 직접 판단해 주세요. ' +
         '(같은 뜻으로 처리해도 숙달도는 낮게 잡습니다.)</p>' +
         '<div class="acts"><button class="btn" data-act="selfmark" data-v="1">같은 뜻이에요</button>' +
         '<button class="btn" data-act="selfmark" data-v="0">틀렸어요</button></div></div>';
  } else if (g.correct && att && att.self_marked) {
    h += '<div class="verdict warn"><b>✓ 정답 (자기 판정)</b>' +
         '<p>같은 뜻이라고 직접 판정한 답입니다. 숙달도에는 낮게 반영됩니다.</p></div>';
  } else if (g.correct) {
    h += '<div class="verdict ok"><b>✓ 정답</b></div>';
  } else if (g.nearMiss) {
    h += '<div class="verdict warn"><b>⚠ 표기 오류 (오답 처리)</b>' +
         '<p>정답과 글자 하나 차이입니다. 시험에서는 정확히 써야 하므로 오답으로 기록합니다.</p></div>';
  } else {
    h += '<div class="verdict"><b>✕ 오답</b></div>';
  }

  // 빈칸별 ○×
  if (g.blanks && g.blanks.length) {
    h += '<div class="row mb">';
    g.blanks.forEach(function (b) {
      h += '<span class="chip ' + (b.ok ? "green" : "red") + '">' + esc(b.label) + ' ' + (b.ok ? "✓" : "✕") + '</span>';
    });
    h += '</div>';
  }

  h += '<div class="ansbox">' +
       '<div class="mine' + (g.correct ? " okmine" : "") + '"><small>내 답</small>' + esc(givenText(q, a.given)) + '</div>' +
       '<div class="real"><small>정답</small>' + esc(answerText(q)) + '</div></div>';

  h += explainBody(q);

  // 오답 이유 + 메모
  if (!g.correct && !Q.awaitSelf) {
    h += '<div class="card"><h2>왜 틀렸나요?</h2><div class="reasons">';
    WHYS.forEach(function (w) {
      h += '<button class="btn sm' + (att && att.why === w[0] ? " on" : "") + '" data-act="why" data-w="' +
           w[0] + '">' + w[1] + '</button>';
    });
    h += '</div>';
    var m = S.mistakes[q.id];
    h += '<p class="small muted mt">내 메모 (오답노트에 남습니다)</p>' +
         '<textarea data-memo="' + esc(q.id) + '" placeholder="내가 헷갈린 지점을 한 줄로">' +
         esc((m && m.memo) || "") + '</textarea></div>';
  }

  h += '<div class="acts"><button class="btn ghost" data-act="claude-copy">클로드에게 설명 요청 (복사)</button></div>';
  if (S.claudeText) {
    h += '<div class="card"><h2>아래 글을 복사해서 클로드에 붙여넣으세요</h2>' +
         '<textarea style="min-height:150px" readonly>' + esc(S.claudeText) + '</textarea></div>';
  }
  return h;
}

/* ---------------- 진단 결과 ---------------- */
function viewDiagResult() {
  var R = S.diagResult;
  if (!R) { S.screen = "home"; return viewHome(); }
  var res = R.res;
  var h = '<h2 style="font-size:22px;margin:14px 0 4px">진단 결과</h2>' +
          '<p class="small muted">' + esc(R.date) + ' · ' + R.correct + '/' + R.total + ' 정답</p>';

  h += '<div class="card"><h2>배점 환산 예상 점수</h2>' +
       '<p class="score">' + res.est_total + '<small> / 1000점</small></p>' +
       '<p class="small muted">' + esc(res.est_note) + '. 합격선은 총점 600점 이상 + 과목별 40% 이상입니다.</p></div>';

  h += '<div class="card"><h2>과목별</h2>';
  res.bySubject.forEach(function (b) {
    var r = RISK[b.risk] || RISK.unmeasured;
    h += '<div class="resub"><div class="t">' +
         '<span class="nm">' + esc(b.id + ". " + b.name) + '</span>' +
         '<span class="chip ' + r[0] + '">' + esc(r[1]) + '</span></div>' +
         '<p class="small">정답 ' + b.correct + '/' + b.n + ' (' + (b.pct == null ? "–" : pct(b.pct)) + ') · ' +
         '예상 ' + b.est_points + '점 / ' + b.max + '점 · 과락선 ' + b.pass_points + '점</p>' +
         '<div class="bar"><i class="' + (b.est_points >= b.pass_points ? "good" : "bad") + '" style="width:' +
         clamp(b.est_points * 100 / b.max, 0, 100).toFixed(1) + '%"></i><span class="cut"></span></div>' +
         '</div>';
  });
  h += '</div>';

  h += '<div class="card"><h2>취약 세부항목 5</h2>';
  if (!res.weakTopics.length) h += '<p class="small muted">집계할 문항이 없습니다.</p>';
  else {
    h += '<ul class="list">';
    res.weakTopics.forEach(function (t) {
      h += '<li><span class="l">' + esc(t.id + " " + t.name) + '</span>' +
           '<span class="r">' + t.correct + '/' + t.n + ' · ' + pct(t.pct) + '</span></li>';
    });
    h += '</ul>';
  }
  h += '</div>';

  // 먼저 공부할 것
  var worstSub = res.bySubject.slice().filter(function (b) { return b.n > 0; })
    .sort(function (a, b) { return (a.pct == null ? 999 : a.pct) - (b.pct == null ? 999 : b.pct); })[0];
  var worstTop = res.weakTopics[0];
  h += '<div class="banner blue"><span><b>먼저 공부할 것 — </b>' +
       (worstSub ? esc(worstSub.id + ". " + worstSub.name) : "전 과목") +
       (worstTop ? ' 의 «' + esc(worstTop.id + " " + worstTop.name) + '»' : "") +
       '부터 보세요.</span></div>';

  h += '<div class="acts">' +
       '<button class="btn primary" data-act="goto" data-screen="mistakes">오답노트 보기</button>' +
       '<button class="btn" data-act="go-home">홈으로</button></div>';
  return h;
}

/* ---------------- 학습 준비 ---------------- */
function viewStudySetup() {
  var st = S.study;
  var h = "";
  h += resumeBannerHTML(Store.get("session", null), " 새로 시작하면 지워집니다.");

  // 프리셋 3종 — 문항을 먼저 풀고, 끝나면 연결 암기카드로 이어진다
  h += '<div class="card"><h2>프리셋 · 누르면 바로 시작</h2><div class="presets">';
  ["weakness", "lawnum", "today"].forEach(function (k) {
    var p = C.PRESETS[k];
    h += '<button type="button" class="btn" data-act="preset" data-p="' + k + '">' +
         '<b>' + esc(p.name) + '</b><span>' + esc(p.ko + " · " + p.desc) + '</span></button>';
  });
  h += '</div><p class="small muted mt">문항을 먼저 풀고, 끝나면 연결 암기카드로 이어집니다.</p></div>';

  h += '<div class="card"><h2>무엇을 풀까요?</h2><div class="fields">';
  h += '<div class="field"><label for="f-sub">과목</label><select id="f-sub" data-f="subject">' +
       '<option value=""' + (st.subject === "" ? " selected" : "") + '>전체</option>';
  (BP.subjects || []).forEach(function (s) {
    h += '<option value="' + s.id + '"' + (String(st.subject) === String(s.id) ? " selected" : "") + '>' +
         esc(s.id + ". " + s.short_name) + '</option>';
  });
  h += '</select></div>';

  h += '<div class="field"><label for="f-top">세부항목</label><select id="f-top" data-f="topic"' +
       (st.subject === "" ? " disabled" : "") + '>' +
       '<option value="">' + (st.subject === "" ? "과목을 먼저 고르세요" : "전체") + '</option>';
  if (st.subject !== "") {
    S.subs.filter(function (t) { return String(t.subject) === String(st.subject); })
      .forEach(function (t) {
        h += '<option value="' + esc(t.id) + '"' + (st.topic === t.id ? " selected" : "") + '>' +
             esc(t.id + " " + t.name) + '</option>';
      });
  }
  h += '</select></div>';

  h += '<div class="field"><label for="f-type">유형</label><select id="f-type" data-f="type">' +
       opt("all", "전체", st.type) + opt("mcq", "선다형", st.type) + opt("short", "단답형", st.type) +
       '</select></div>';
  h += '<div class="field"><label for="f-mode">모드</label><select id="f-mode" data-f="mode">' +
       opt("new", "새 문항", st.mode) + opt("due", "복습 만기", st.mode) + opt("mixed", "섞기", st.mode) +
       '</select></div>';
  h += '<div class="field"><label for="f-n">문항 수</label><select id="f-n" data-f="n">' +
       opt("10", "10문항", String(st.n)) + opt("20", "20문항", String(st.n)) +
       '</select></div>';
  h += '</div>';
  h += '<button class="btn primary big mt" data-act="study-start">시작</button></div>';

  var due = C.dueMistakes(S.mistakes, todayStr()).length;
  h += '<p class="small muted">만기 오답 ' + due + '개 · 전체 문항 ' + S.questions.length + '개</p>';
  return h;
}
function opt(v, label, cur) {
  return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? " selected" : "") + '>' + esc(label) + '</option>';
}

/* ---------------- 세션 요약 ---------------- */
function viewSummary() {
  var m = S.summary;
  if (!m) { S.screen = "study"; return viewStudySetup(); }
  var pr = m.preset || {};
  var h = '<h2 style="font-size:22px;margin:14px 0 8px">' + (m.mode === "diag" ? "진단" : "학습") + ' 끝</h2>';
  h += '<div class="card">' +
       (pr.kind === "preset"
          ? '<p class="small mb">프리셋 — <b>' + esc(pr.label) + '</b> ' + esc(pr.ko) +
            ((pr.topics && pr.topics.length)
               ? '<br><span class="muted">집중 세부항목 ' + esc(pr.topics.map(topicLabel).join(" · ")) + '</span>' : "") + '</p>'
          : "") +
       '<div class="todo">' +
       '<div class="t"><b>' + m.n + '</b><span>푼 문항</span></div>' +
       '<div class="t"><b>' + m.correct + '</b><span>정답</span></div>' +
       '<div class="t"><b>' + m.added + '</b><span>오답노트 편입</span></div>' +
       '</div><p class="small muted mt">걸린 시간 ' + esc(fmtDur(m.sec)) +
       ' · 정답률 ' + (m.n ? Math.round(m.correct * 100 / m.n) : 0) + '%' +
       (m.cards ? ' · 연결 암기카드 ' + m.cards + '장이 내 메모리 노트에 담겼습니다' : "") + '</p>' +
       mixText(m.preset) + '</div>';
  if (pr.kind === "preset" && pr.cids && pr.cids.length) {
    h += '<button class="btn primary big" data-act="preset-cards">이어서 암기카드 ' + pr.cids.length + '장 보기</button>' +
         '<p class="small muted center mt">프리셋은 문항 → 카드 순서입니다.</p>';
  }
  h += '<div class="acts">' +
       '<button class="btn' + (pr.kind === "preset" && pr.cids && pr.cids.length ? "" : " primary") +
       '" data-act="study-more">계속 10문항</button>' +
       '<button class="btn" data-act="goto" data-screen="mistakes">오답노트</button>' +
       '<button class="btn ghost" data-act="go-home">홈</button></div>';
  return h;
}

/* ---------------- 오답노트 ---------------- */
function viewMistakes() {
  var t = todayStr();
  var f = S.mfilter;
  var due = C.dueMistakes(S.mistakes, t);
  var h = "";

  h += '<div class="card"><h2>오답노트</h2>' +
       '<button class="btn primary big" data-act="mn-due"' + (due.length ? "" : " disabled") + '>' +
       '만기 재시험 (' + due.length + ')</button>';
  h += '<div class="fields mt">' +
       '<div class="field"><label for="m-stage">단계</label><select id="m-stage" data-mf="stage">' +
       opt("all", "전체", f.stage) + opt("new", "새 오답", f.stage) +
       opt("reviewing", "복습 중", f.stage) + opt("graduated", "졸업", f.stage) + '</select></div>' +
       '<div class="field"><label for="m-sub">과목</label><select id="m-sub" data-mf="subject">' +
       '<option value=""' + (f.subject === "" ? " selected" : "") + '>전체</option>';
  (BP.subjects || []).forEach(function (s) {
    h += '<option value="' + s.id + '"' + (String(f.subject) === String(s.id) ? " selected" : "") + '>' +
         esc(s.id + ". " + s.short_name) + '</option>';
  });
  h += '</select></div>' +
       '<div class="field"><label class="check"><input type="checkbox" data-mf="shortOnly"' +
       (f.shortOnly ? " checked" : "") + '> 단답형만</label></div></div></div>';

  var rows = Object.keys(S.mistakes).map(function (qid) {
    return { qid: qid, m: S.mistakes[qid], q: S.byQid[qid] };
  }).filter(function (r) {
    if (!r.m) return false;
    if (f.stage !== "all" && (r.m.stage || "new") !== f.stage) return false;
    if (f.subject !== "" && (!r.q || String(r.q.subject) !== String(f.subject))) return false;
    if (f.shortOnly && (!r.q || r.q.type !== "short")) return false;
    return true;
  }).sort(function (a, b) {
    var na = a.m.next || "9999-99-99", nb = b.m.next || "9999-99-99";
    if (na !== nb) return na < nb ? -1 : 1;
    return a.qid < b.qid ? -1 : 1;
  });

  if (!rows.length) {
    h += '<p class="small muted">조건에 맞는 오답이 없습니다.</p>';
    return h;
  }

  rows.forEach(function (r) {
    var q = r.q, m = r.m;
    var open = S.openMistake === r.qid;
    var s = q ? subjectOf(q.subject) : { short_name: "?" };
    var stageCls = m.stage === "graduated" ? "green" : (m.stage === "reviewing" ? "amber" : "red");
    h += '<div class="wn' + (open ? " open" : "") + '">' +
         '<button type="button" class="head" data-act="mn-toggle" data-qid="' + esc(r.qid) + '">' +
         '<div class="q">' + esc(q ? oneLine(q.stem, 60) : "(문항 데이터 없음: " + r.qid + ")") + '</div>' +
         '<div class="row">' +
         '<span class="chip">' + esc(s.short_name) + '</span>' +
         '<span class="chip ' + stageCls + '">' + esc(STAGE_LABEL[m.stage] || m.stage || "새 오답") + '</span>' +
         (q && q.type === "short" ? '<span class="chip gray">단답</span>' : "") +
         '<span class="chip gray">다음 ' + esc(m.next || "졸업") + '</span>' +
         '<span class="chip gray">오답 ' + (m.count || 0) + '회</span>' +
         '</div></button>';
    if (open && q) {
      var atts = (S.attByQid[r.qid] || []);
      var last = atts[atts.length - 1];
      h += '<div class="body">' +
           '<div class="ansbox"><div class="mine"><small>내 최근 답</small>' +
           esc(last ? givenText(q, last.given) : "기록 없음") + '</div>' +
           '<div class="real"><small>정답</small>' + esc(answerText(q)) + '</div></div>';
      if (q.memory_sentence) h += '<div class="ex memory"><h4>한 줄 암기</h4><p>' + esc(q.memory_sentence) + '</p></div>';
      // 연결된 암기카드의 지금 상태(박스·내 메모리 노트)
      var lcs = (q.cards || []).map(function (cid) { return S.byCid[cid]; }).filter(Boolean);
      if (lcs.length) {
        h += '<div class="ex flash"><h4>연결된 암기카드 ' + lcs.length + '장</h4><ul class="list">';
        lcs.forEach(function (c) {
          h += '<li><span class="l">' + esc(oneLine(c.front, 54)) + '</span>' +
               '<span class="r">' + cardChips(c.id) + '</span></li>';
        });
        h += '</ul><div class="acts"><button class="btn sm" data-act="card-of-q" data-qid="' + esc(r.qid) +
             '">이 카드들 바로 보기</button></div></div>';
      }
      // 연결 카드에 그림이 있으면 그림만 보여준다(그림 없는 카드는 지금까지와 동일하게 아무것도 안 나온다)
      var figs = (q.cards || []).map(function (cid) { return S.byCid[cid]; })
                  .filter(Boolean).map(function (c) { return figureBox(c); }).filter(Boolean);
      if (figs.length) h += '<div class="ex flash"><h4>한눈에 보는 그림</h4>' + figs.join("") + '</div>';
      if (last && last.why) h += '<div class="ex"><h4>왜 틀렸나</h4><p>' + esc(whyLabel(last.why)) + '</p></div>';
      if (q.trap) h += '<div class="ex"><h4>함정</h4><p>' + esc(q.trap) + '</p></div>';
      h += '<div class="ex src"><h4>근거</h4><p>' + esc(sourceText(q)) + '</p></div>';
      h += '<p class="small muted">내 메모</p><textarea data-memo="' + esc(r.qid) + '">' +
           esc(m.memo || "") + '</textarea>';
      h += '<div class="acts"><button class="btn" data-act="mn-retry" data-qid="' + esc(r.qid) +
           '">이 문항만 다시 풀기</button></div></div>';
    } else if (open) {
      h += '<div class="body"><p class="small muted">문항 데이터가 없습니다. 데이터 파일을 확인해 주세요.</p></div>';
    }
    h += '</div>';
  });
  return h;
}

/* ================================================================
 * 5-M. 모의고사 — 준비 · 시험 · 결과
 *   채점·편성·예상 점수는 전부 core.js가 한다. 여기서는 화면과 저장만 맡는다.
 * ================================================================ */
var MOCK_ORDER = ["full", "half", "mini3"];
var MARK = ["①", "②", "③", "④"];
var BADGE_CLS = { "안전": "green", "주의": "amber", "위험": "red", "미측정": "gray" };

function deadlineMs(v) {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  var t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}
/* 남은 시간을 mm:ss로 (음수는 00:00) */
function mmss(ms) {
  var sec = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60);
}
function isAnsweredAns(q, a) { return hasAnswerFor(q || { type: "mcq" }, a); }
function countAnswered(qids, answers) {
  var n = 0;
  (qids || []).forEach(function (qid) {
    if (isAnsweredAns(S.byQid[qid], (answers || {})[qid])) n += 1;
  });
  return n;
}
function countFlags(answers) {
  var n = 0;
  Object.keys(answers || {}).forEach(function (k) { if (answers[k] && answers[k].flag) n += 1; });
  return n;
}

/* 진행 중 세션 배너 — 모의고사는 남은 시간을 함께 보여준다 */
function resumeBannerHTML(sess, note) {
  if (!sess || !Array.isArray(sess.qids) || !sess.qids.length) return "";
  if (sess.mode === "mock") {
    var d = deadlineMs(sess.deadlineAt);
    var left = (d == null) ? "" : " (남은 " + mmss(d - Date.now()) + ")";
    var nm = (sess.preset && sess.preset.name) || "모의고사";
    return '<div class="banner blue"><span>보던 <b>' + esc(nm) + '</b>가 남아 있습니다 · ' +
           countAnswered(sess.qids, sess.answers) + '/' + sess.qids.length + ' 답함' +
           (d != null && d <= Date.now() ? ' · <b>시간이 끝났습니다</b>' : "") + '</span>' +
           '<button class="btn sm primary" data-act="mock-resume">이어하기' + esc(left) + '</button></div>';
  }
  if (Number(sess.idx) >= sess.qids.length) return "";
  return '<div class="banner blue"><span>풀던 ' + (sess.mode === "diag" ? "진단" : "학습") +
         '이 남아 있습니다 (' + (Number(sess.idx) + 1) + '/' + sess.qids.length + ').' + esc(note || "") + '</span>' +
         '<button class="btn sm primary" data-act="resume">이어하기</button></div>';
}

/* QUICK 세트 구성 비율 한 줄 */
function mixText(preset) {
  var mix = preset && preset.mix;
  if (!mix) return "";
  return '<p class="small muted">구성 — 약한 문항 ' + (mix.W || 0) + ' · 복습 만기 ' + (mix.R || 0) +
         ' · 새 문항 ' + (mix.N || 0) + '</p>';
}

/* ---------------- 홈: 예상 점수 카드 ---------------- */
function viewExpectedCard() {
  var exp = C.expectedScore(S.mocks, TOPICS, S.questions, S.attByQid, BP, todayStr());
  var rd = C.readiness(exp, BP);
  var cls = rd.label === "SAFE" ? "safe" : (rd.label === "AT RISK" ? "risk" : "warn");
  var h = '<div class="expcard ' + cls + '">' +
          '<div class="e"><b>예상 ' + exp.E + '점</b><span>(±' + exp.band + ') / 1000점</span>' +
          '<span class="lab ' + cls + '">' + esc(rd.label) + '</span></div>' +
          '<p class="small">' + esc(exp.note) + ' · 범위 ' + exp.low + '~' + exp.high + '점 · 합격선 600점</p>' +
          '<p class="tiny muted">검증 문항 기준(미검증 문항은 예상 점수에 넣지 않습니다)</p>' +
          '<div class="row mt">';
  exp.by_subject.forEach(function (b, i) {
    var badge = C.subjectBadge(b.ratio, b.n);
    h += '<span class="chip ' + (BADGE_CLS[badge] || "gray") + '">' + (MARK[i] || b.id) + ' ' +
         Math.round((b.ratio || 0) * 100) + '% ' + esc(badge) + '</span>';
  });
  h += '</div><ul class="list small mt">';
  rd.reasons.slice(0, 3).forEach(function (r) {
    h += '<li><span class="l">' + esc(r) + '</span></li>';
  });
  h += '</ul>' +
       '<div class="acts"><button class="btn sm" data-act="goto" data-screen="mock">모의고사 보기</button></div>' +
       '</div>';
  return h;
}

/* ---------------- 홈: 최근 모의고사 표 ---------------- */
function viewRecentMocks() {
  if (!S.mocks.length) {
    return '<div class="card"><h2>최근 모의고사</h2>' +
           '<p class="small muted">아직 본 모의고사가 없습니다. 한 번만 봐도 예상 점수가 훨씬 정확해집니다.</p>' +
           '<div class="acts"><button class="btn" data-act="goto" data-screen="mock">모의고사 시작하기</button></div></div>';
  }
  var rows = S.mocks.slice(-5).reverse();
  var h = '<div class="card"><h2>최근 모의고사 · ' + S.mocks.length + '회</h2>' +
          '<div class="tablewrap"><table><thead><tr>' +
          '<th>날짜</th><th class="l">종류</th><th>점수</th><th>보정</th><th>판정</th>' +
          '</tr></thead><tbody>';
  rows.forEach(function (m) {
    var pk = m.preset || "full";
    var nm = (C.MOCK_PRESETS[pk] && C.MOCK_PRESETS[pk].name) || pk;
    var verdict = (pk === "full" && (m.pass === true || m.pass === false))
      ? '<span class="chip ' + (m.pass ? "green" : "red") + '">' + (m.pass ? "PASS" : "FAIL") + '</span>'
      : '<span class="chip gray">과목만</span>';
    var ref = Number(m.max_reference) || 1000;      // 하프·미니는 만점이 1000점이 아니다
    h += '<tr><td>' + esc(String(m.date || "-")) + '</td>' +
         '<td class="l">' + esc(nm) + (m.partial ? ' <span class="chip gray">환산</span>' : "") + '</td>' +
         '<td>' + (Number(m.scaled) || 0) + '/' + ref + '</td><td>' + (Number(m.adj) || 0) + '</td>' +
         '<td>' + verdict + '</td></tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

/* ---------------- 모의고사 편성 미리보기 ---------------- */
/* 미리보기와 실제 시험지가 반드시 같아야 하므로, 같은 결과 객체를 그대로 시작에 쓴다. */
function mockPlans() {
  if (S.mockPlans) return S.mockPlans;
  var last = S.mocks[S.mocks.length - 1];
  var exclude = (last && Array.isArray(last.qids)) ? last.qids : [];
  var out = {};
  MOCK_ORDER.forEach(function (k) {
    out[k] = C.buildMock(k, S.questions, BP,
      { attemptsByQid: S.attByQid, exclude: exclude },
      C.seededRandom(hashStr(todayStr() + "|" + k + "|" + S.mocks.length)));
  });
  S.mockPlans = out;
  return out;
}
/* "문항 부족: ②2·③1·④1 → 96문항으로 진행, 점수는 환산" */
function missingSummary(m) {
  if (!m || !m.slots_missing.length) return "";
  var bySub = {};
  m.slots_missing.forEach(function (x) {
    bySub[x.subject] = (bySub[x.subject] || 0) + (x.need - x.got);
  });
  var parts = Object.keys(bySub).sort().map(function (k) {
    return (MARK[Number(k) - 1] || k) + bySub[k];
  }).join("·");
  return "문항 부족: " + parts + " → " + m.qids.length + "문항으로 진행, 점수는 환산";
}

function viewMockSetup() {
  var h = "";
  var sess = Store.get("session", null);
  var hasMock = sess && sess.mode === "mock" && Array.isArray(sess.qids) && sess.qids.length;
  if (hasMock) {
    h += resumeBannerHTML(sess, "");
    if (S.mockAskDiscard) {
      var nAns = countAnswered(sess.qids, sess.answers);
      h += '<div class="banner red"><span><b>정말 버릴까요?</b> 답 ' + nAns + '개가 사라지고 ' +
           '되돌릴 수 없습니다. 채점도 하지 않습니다.</span></div>' +
           '<div class="acts"><button class="btn danger primary" data-act="mock-discard-ok">네, 버립니다</button>' +
           '<button class="btn ghost" data-act="mock-discard-cancel">취소</button></div>';
    } else {
      h += '<div class="row"><button class="btn sm ghost" data-act="mock-discard">이 모의고사 버리기</button></div>';
    }
  }

  h += '<div class="card"><h2>모의고사</h2>' +
       '<p class="small">실제 시험처럼 시간을 재고 풉니다. <b>시험 중에는 정답과 해설이 나오지 않습니다.</b> ' +
       '제출한 뒤에 점수·과락·해설을 한 번에 봅니다.</p></div>';

  var plans = mockPlans();
  MOCK_ORDER.forEach(function (k) {
    var m = plans[k];
    var rec = (k === "half");
    h += '<div class="card"><div class="row between">' +
         '<b style="font-size:17px">' + esc(m.name) + '</b>' +
         (rec ? '<span class="chip amber">오늘 저녁 권장</span>' : "") + '</div>' +
         '<div class="row mt">' +
         '<span class="chip ink">' + m.qids.length + '문항</span>' +
         '<span class="chip">' + m.minutes + '분</span>' +
         '<span class="chip">' + m.total_points + '점</span>' +
         (m.partial ? '<span class="chip amber">환산 점수</span>' : '<span class="chip green">정규 편성</span>') +
         '</div>';

    if (k === "full") h += '<p class="small muted mt">시험과 같은 100문항 · 120분. 네 과목 전부.</p>';
    if (k === "half") h += '<p class="small muted mt">①②③ 세 과목만 50문항 · 60분. ④가 빠져 <b>합격 판정은 하지 않고</b> 과목별 과락만 봅니다.</p>';
    if (k === "mini3") h += '<p class="small muted mt">③ 유통 화장품 안전관리만 25문항 · 30분. 짧게 감을 잡을 때.</p>';

    var miss = missingSummary(m);
    if (miss) h += '<div class="banner"><span>' + esc(miss) + '</span></div>';
    if (m.partial && !miss) {
      h += '<div class="banner"><span>' +
           esc(Number(m.substituted) > 0
                 ? "일부 배점 대체 " + m.substituted + "문항 — 점수는 1000점 만점으로 환산합니다"
                 : "축소 편성 " + m.qids.length + "문항 — 점수는 1000점 만점으로 환산합니다") + '</span></div>';
    } else if (miss && Number(m.substituted) > 0) {
      h += '<p class="tiny muted">배점을 대체한 문항 ' + m.substituted + '개 포함</p>';
    }

    if (S.mockAskStart === k) {
      h += '<div class="banner blue"><span><b>시작하면 타이머가 돕니다.</b> 해설은 제출 후에만 나옵니다. ' +
           '중간에 나가도 시간은 계속 흐릅니다.</span></div>' +
           '<div class="acts"><button class="btn primary" data-act="mock-go" data-preset="' + k + '">네, 시작합니다</button>' +
           '<button class="btn ghost" data-act="mock-cancel">취소</button></div>';
    } else {
      h += '<button class="btn primary big mt" data-act="mock-ask" data-preset="' + k + '"' +
           (m.qids.length ? "" : " disabled") + '>시작</button>';
    }
    h += '</div>';
  });

  h += '<p class="small muted">검증된 문항 ' +
       S.questions.filter(function (q) { return q.verified === true; }).length +
       '개로 편성합니다. 미검증 문항은 모의고사에 넣지 않습니다.</p>';
  return h;
}

/* ---------------- 시험 화면 ---------------- */
/* 시험지 순서 정보 — 저장하지 않고 문항 데이터에서 매번 만든다(밑줄 = 세션에 안 들어감) */
function mockOrder(Q) {
  if (Q._order) return Q._order;
  Q._order = Q.qids.map(function (qid, i) {
    var q = S.byQid[qid] || {};
    return {
      no: i + 1, qid: qid, subject: Number(q.subject) || 0,
      type: q.type === "short" ? "short" : "mcq", points: Number(q.points) || 0
    };
  });
  return Q._order;
}
function shortRange(order) {
  var a = null, b = null;
  order.forEach(function (o) { if (o.type === "short") { if (a == null) a = o.no; b = o.no; } });
  return (a == null) ? null : { from: a, to: b };
}

function padHTML(Q) {
  var order = mockOrder(Q);
  var sr = shortRange(order);
  var h = '<div class="pad">';
  var prevKey = null, shortShown = false;
  order.forEach(function (o, i) {
    var key = o.type + "|" + o.subject;
    if (key !== prevKey) {
      if (o.type === "short" && !shortShown && sr) {
        h += '<p class="padlab short">' + sr.from + '~' + sr.to + ' 단답</p>';
        shortShown = true;
      }
      var seg = order.filter(function (x) { return x.type === o.type && x.subject === o.subject; });
      h += '<p class="padlab">' + (MARK[o.subject - 1] || o.subject) + ' ' +
           esc(subjectOf(o.subject).short_name) + ' · ' + seg[0].no + '~' + seg[seg.length - 1].no + '</p>';
      prevKey = key;
    }
    var a = Q.answers[o.qid] || {};
    var cls = "pn";
    if (isAnsweredAns(S.byQid[o.qid], a)) cls += " on";
    if (a.flag) cls += " flag";
    if (i === Q.idx) cls += " cur";
    h += '<button type="button" class="' + cls + '" data-act="mock-goto" data-i="' + i + '"' +
         ' aria-label="' + o.no + '번' + (a.flag ? " 검토 표시" : "") + '">' + o.no + '</button>';
  });
  h += '</div>';
  return h;
}

function viewMockExam() {
  var Q = S.quiz;
  if (!Q || Q.mode !== "mock" || !Q.qids.length) { S.screen = "mock"; return viewMockSetup(); }
  var total = Q.qids.length;
  var order = mockOrder(Q);
  var cur = order[Q.idx] || order[0];
  var qid = Q.qids[Q.idx];
  var q = S.byQid[qid];
  var a = Q.answers[qid] || {};
  var d = deadlineMs(Q.deadlineAt);
  var left = (d == null) ? null : d - Date.now();
  var warn = (left != null && left <= 10 * 60 * 1000);
  var h = "";

  // 고정 상단 바
  h += '<div class="mockbar">' +
       '<span class="mtime' + (warn ? " warn" : "") + '" id="mockTimer" role="timer" aria-live="off">' +
       (left == null ? "--:--" : mmss(left)) + '</span>' +
       '<span class="mstat">답함 <b id="mockDone">' + countAnswered(Q.qids, Q.answers) + '</b>/' + total + '</span>' +
       '<span class="mstat">⚑ <b id="mockFlag">' + countFlags(Q.answers) + '</b></span>' +
       '<span class="mbtns">' +
       '<button class="btn sm' + (S.mockPad ? " on" : "") + '" data-act="mock-pad">번호판</button>' +
       '<button class="btn sm primary" data-act="mock-submit">제출</button>' +
       '</span></div>';

  if (S.mockAskSubmit) {
    var un = total - countAnswered(Q.qids, Q.answers);
    h += '<div class="banner red"><span>' +
         (un ? '아직 <b>' + un + '문항</b>이 비어 있습니다. 미답 ' + un + '문항은 <b>0점</b>으로 처리됩니다. 제출할까요?'
             : '모두 답했습니다. 제출할까요? 제출하면 <b>되돌릴 수 없습니다.</b>') +
         '</span></div>' +
         '<div class="acts"><button class="btn danger primary" data-act="mock-submit-ok">네, 제출합니다</button>' +
         '<button class="btn ghost" data-act="mock-submit-cancel">더 풀기</button></div>';
  }

  if (S.mockPad) h += padHTML(Q);

  if (!q) {
    return h + '<div class="card"><p>문항 ' + esc(qid) + '을(를) 찾지 못했습니다.</p>' +
           '<div class="acts"><button class="btn" data-act="mock-next">다음</button></div></div>';
  }

  // 문항 (정답·해설·검증 배지는 절대 넣지 않는다)
  h += '<div class="qhead">' +
       '<span class="chip ink">' + cur.no + '번</span>' +
       '<span class="chip">' + esc(subjectOf(q.subject).short_name) + '</span>' +
       '<span class="chip">' + esc(String(q.points)) + '점</span>' +
       '<span class="chip">' + (q.type === "short" ? "단답형" : "선다형") + '</span>' +
       '<span class="qcount">' + cur.no + '/' + total + '</span></div>' +
       '<div class="prog"><i style="width:' + ((Q.idx + 1) * 100 / total).toFixed(1) + '%"></i></div>';

  h += '<div class="card"><p class="stem">' + esc(q.stem) + '</p>';
  if (q.type === "mcq") {
    h += '<div class="choices">';
    choiceOrder(q, Q.sid).forEach(function (oi, di) {
      h += '<button type="button" class="choice' + (a.given === oi ? " sel" : "") +
           '" data-act="mock-pick" data-i="' + oi + '">' +
           '<span class="k">' + CIRC[di] + '</span>' +
           '<span class="txt">' + esc(q.choices[oi]) + '</span></button>';
    });
    h += '</div>';
  } else {
    var attrs = ' type="text" class="shortin" autocomplete="off" autocorrect="off" autocapitalize="none"' +
                ' spellcheck="false" enterkeyhint="done"';
    var hasBlanks = Array.isArray(q.blanks) && q.blanks.length > 0;
    var isSet = !hasBlanks && q.grade === "set";
    if (hasBlanks) {
      var gv = Array.isArray(a.given) ? a.given : [];
      q.blanks.forEach(function (b, i) {
        h += '<label class="blankrow"><span class="blab">' + esc(b.label || (i + 1)) + '</span>' +
             '<input' + attrs + ' data-blank="' + i + '" value="' + esc(gv[i] || "") + '"></label>';
      });
    } else {
      h += '<input' + attrs + (isSet ? ' placeholder="예) 가, 나, 다"' : '') + ' data-blank="0" value="' +
           esc(typeof a.given === "string" ? a.given : "") + '">';
    }
    if (isSet) h += '<p class="small muted">쉼표(,)로 구분해 입력하세요</p>';
    if (q.unit) h += '<p class="small muted">단위: ' + esc(q.unit) + ' (숫자만 써도 됩니다)</p>';
    h += '<button type="button" class="btn mt" data-act="mock-short-done">답 입력 완료</button>';
  }

  h += '<div class="qflags">' +
       '<button type="button" class="btn sm' + (a.flag ? " flagon" : "") + '" data-act="mock-flag">⚑ 검토' +
       (a.flag ? " 표시됨" : "") + '</button>' +
       '<button type="button" class="btn sm' + (a.conf === 0 ? " guesson" : "") + '" data-act="mock-guess">찍음' +
       (a.conf === 0 ? " 표시됨" : "") + '</button>' +
       '</div>' +
       '<p class="tiny muted mt">⚑ 검토 = 나중에 다시 볼 문항 · 찍음 = 확신 없이 고른 답(채점 뒤 보정 점수에 씁니다)</p>' +
       '</div>';

  h += '<div class="acts">' +
       '<button class="btn" data-act="mock-prev"' + (Q.idx === 0 ? " disabled" : "") + '>이전</button>' +
       '<button class="btn primary" data-act="mock-next"' + (Q.idx + 1 >= total ? " disabled" : "") + '>다음</button>' +
       '</div>' +
       '<p class="small muted center mt">해설과 정답은 제출한 뒤에 나옵니다.</p>';
  return h;
}

/* 타이핑 중에는 다시 그리지 않으므로 상단 숫자만 직접 맞춘다 */
function syncMockBar() {
  var Q = S.quiz;
  if (!Q || Q.mode !== "mock") return;
  var d = el("mockDone"), f = el("mockFlag");
  if (d) d.textContent = String(countAnswered(Q.qids, Q.answers));
  if (f) f.textContent = String(countFlags(Q.answers));
}

/* ---------------- 타이머 ---------------- */
var mockTimer = null;
function startMockTimer() {
  if (mockTimer) return;
  mockTimer = setInterval(tickMock, 1000);
  tickMock();
}
function stopMockTimer() {
  if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
}
function tickMock() {
  var Q = S.quiz;
  if (S.screen !== "mockexam" || !Q || Q.mode !== "mock") { stopMockTimer(); return; }
  var d = deadlineMs(Q.deadlineAt);
  if (d == null) return;
  var left = d - Date.now();
  var t = el("mockTimer");
  if (t) {
    t.textContent = mmss(left);
    if (left <= 10 * 60 * 1000) t.classList.add("warn"); else t.classList.remove("warn");
  }
  if (left <= 0) {
    stopMockTimer();
    toast("시간이 끝나 자동으로 제출했습니다.");
    finishMock(true);
  }
}

/* ---------------- 암기카드 그림(figure) ---------------- */
/* 카드에 figure 스펙이 있으면 인라인 SVG로 그린다.
   스펙이 잘못됐거나 figure가 없으면 빈 문자열 → 지금까지와 완전히 같은 화면이 나온다. */
function figureSvg(c) {
  if (!c || !c.figure) return "";
  try { return C.figureToSvg(c.figure); }
  catch (e) { return ""; }
}

/* 접었다 펼 수 있는 그림 상자(기본은 펼침). <details>라 JS 없이도 동작한다. */
function figureBox(c, label) {
  var svg = figureSvg(c);
  if (!svg) return "";
  return '<details class="figbox" open><summary>' + esc(label || "그림으로 보기") + '</summary>' +
         '<div class="fig">' + svg + '</div></details>';
}

/* 카드 한 장의 지금 상태 칩 — 박스 / 내 메모리 노트 */
var BOXM = ["①", "②", "③", "④", "⑤"];
function cardBoxLabel(s) {
  return BOXM[clamp(Math.round(Number(s.box) || 1), 1, 5) - 1];
}
function cardChips(cid) {
  var s = S.cardState[cid];
  var out = "";
  if (s && s.auto === true) {
    out += '<span class="chip amber" title="틀린 문항(또는 찍어서 맞힌 문항)에 연결돼 담긴 카드">내 메모리 노트에 담김</span>';
  }
  out += (s && s.due)
    ? '<span class="chip">박스 ' + cardBoxLabel(s) + '</span>'
    : '<span class="chip gray">안 본 카드</span>';
  return out;
}

/* 연결 카드 한 장: 앞면 → 상태 칩 → (그림) → 뒷면 → 암기법 */
function cardBlock(c) {
  return '<p class="f">' + esc(c.front) + '</p>' +
         '<div class="row mb">' + cardChips(c.id) + '</div>' +
         figureBox(c) +
         '<p class="b">→ ' + esc(c.back) + '</p>' +
         (c.mnemonic ? '<p class="small muted">' + esc(c.mnemonic) + '</p>' : "");
}

/* ---------------- 결과 화면 ---------------- */
function explainBody(q) {
  var h = "";
  if (q.explanation) h += '<div class="ex"><h4>왜 이게 정답인가</h4><p>' + esc(q.explanation) + '</p></div>';
  if (q.memory_sentence) h += '<div class="ex memory"><h4>한 줄 암기</h4><p>' + esc(q.memory_sentence) + '</p></div>';
  if (q.trap) h += '<div class="ex"><h4>함정</h4><p>' + esc(q.trap) + '</p></div>';
  if (q.key_concept) h += '<div class="ex"><h4>핵심 개념</h4><p>' + esc(q.key_concept) + '</p></div>';
  h += '<div class="ex src"><h4>근거</h4><p>' + esc(sourceText(q)) + '</p>' +
       (q.verified === true ? "" : '<p class="mt"><span class="chip gray">미검증 문항 — 근거를 다시 확인해 주세요</span></p>') +
       '</div>';
  var linked = (q.cards || []).map(function (cid) { return S.byCid[cid]; }).filter(Boolean);
  if (linked.length) {
    h += '<div class="ex flash"><h4>연결된 암기카드</h4>';
    linked.forEach(function (c) { h += cardBlock(c); });
    h += '</div>';
  }
  return h;
}

function viewMockResult() {
  var R = S.mockResult;
  if (!R) { S.screen = "mock"; return viewMockSetup(); }
  var g = R.grade, order = R.order, total = order.length;
  var noOf = {};
  order.forEach(function (o) { noOf[o.qid] = o.no; });
  var inMock = {};
  order.forEach(function (o) { inMock[o.subject] = (inMock[o.subject] || 0) + 1; });
  // core 계약: half·mini3는 pass가 null(판정 불가). 필드가 아직 없을 수도 있어 프리셋으로도 막는다.
  var missSubs = Array.isArray(g.missing_subjects) ? g.missing_subjects.map(Number) : null;
  // 판정은 core의 pass가 true/false일 때만. 빠진 과목이 있으면(=pass null) 절대 판정하지 않는다.
  var canJudge = (g.pass === true || g.pass === false) && !(missSubs && missSubs.length);
  var refMax = Number(g.max_reference) || 1000;   // 이 시험지의 기준 만점(하프 504 · 미니 250 …)
  var passTotal = (BP.exam && BP.exam.pass_total) || 600;
  var h = '<h2 style="font-size:22px;margin:14px 0 2px">' + esc(R.name) + ' 결과</h2>' +
          '<p class="small muted">' + esc(R.date) + ' · ' + total + '문항 · 걸린 시간 ' + esc(fmtDur(R.sec)) + '</p>';

  h += '<div class="bigscore"><b>' + g.scaled + '</b><span>/ ' + refMax + '점' +
       (canJudge ? ' · 합격선 ' + passTotal + '점' : '') + '</span></div>';

  if (canJudge) {
    h += '<div class="verdict' + (g.pass ? " ok" : "") + '"><b>' + (g.pass ? "✓ PASS" : "✕ FAIL") + '</b>' +
         '<p>' + (g.pass ? "총점 " + passTotal + "점 이상, 과락 과목 없음."
                        : (g.fail_subjects && g.fail_subjects.length
                            ? "과락 과목: " + esc(g.fail_subjects.map(function (id) {
                                return (MARK[Number(id) - 1] || id) + " " + subjectOf(id).short_name; }).join(", "))
                            : "총점이 합격선 " + passTotal + "점에 못 미칩니다.")) + '</p></div>';
  } else {
    var skipped = (missSubs && missSubs.length)
      ? missSubs.map(function (id) { return (MARK[id - 1] || id) + " " + subjectOf(id).short_name; }).join(", ")
      : "";
    h += '<div class="verdict ask"><b>합격 판정 없음 · 포함 과목의 과락만 표시</b>' +
         '<p>이 모의고사는 일부 과목만 봤습니다' + (skipped ? '(빠진 과목: ' + esc(skipped) + ')' : "") + '. ' +
         '합격 여부는 네 과목을 모두 보는 실전 모의고사에서 확인하세요.</p></div>';
  }

  if (g.partial) {
    var reason = g.partial_reason || "missing";
    var why = reason === "substituted" ? "일부 배점 대체 · <b>환산 점수</b>"
            : (reason === "both" ? total + "문항 축소 + 일부 배점 대체 · <b>환산 점수</b>"
                                 : "문항 부족으로 " + total + "문항 축소 · <b>환산 점수</b>");
    h += '<div class="banner"><span>' + why + '입니다. ' +
         '푼 문항 만점 ' + g.max_included + '점에서 얻은 ' + g.raw + '점을 ' +
         refMax + '점 기준으로 환산했습니다.</span></div>';
  }
  // 계약 4: 세션을 저장한 뒤 데이터 파일이 바뀌어 사라진 문항
  if (Array.isArray(g.missing_questions) && g.missing_questions.length) {
    h += '<div class="banner red"><span>문항 ' + g.missing_questions.length +
         '개가 데이터에서 사라져 채점에서 빠졌습니다(문항 파일이 바뀐 것 같습니다).</span></div>';
  }
  h += '<p class="small">찍어서 맞힌 ' + g.guessed_correct.length + '문항(' + g.guessed_points + '점)을 빼면 <b>' +
       g.adj + '점</b>입니다. 실력에 더 가까운 값입니다.</p>';

  // 과목별
  h += '<div class="card"><h2>과목별 · 빨간 선 = 과락 40%</h2>';
  g.by_subject.forEach(function (b, i) {
    var skippedSub = missSubs ? (missSubs.indexOf(Number(b.id)) !== -1) : !b.max_included;
    if (skippedSub || !b.max_included) {
      h += '<div class="subj"><div class="top"><span class="nm">' + (MARK[i] || b.id) + ' ' + esc(b.name) +
           '</span><span class="val">이번엔 안 봄</span></div></div>';
      return;
    }
    var badge = C.subjectBadge(b.ratio, inMock[b.id] || 0);
    h += '<div class="subj"><div class="top">' +
         '<span class="nm">' + (MARK[i] || b.id) + ' ' + esc(b.name) + '</span>' +
         '<span class="val"><span class="chip ' + (BADGE_CLS[badge] || "gray") + '">' + esc(badge) + '</span></span></div>' +
         '<div class="bar"><i class="' + (b.pass ? "good" : "bad") + '" style="width:' +
         clamp((b.scaled * 100) / (b.max || 1), 0, 100).toFixed(1) + '%"></i><span class="cut"></span></div>' +
         '<div class="barnote"><span' + (b.pass ? "" : ' style="color:var(--red);font-weight:700"') + '>' +
         b.scaled + ' / ' + b.max + '점 (과락선 ' + b.pass_points + '점)' + (b.pass ? "" : " · 과락") + '</span>' +
         '<span>' + (inMock[b.id] || 0) + '문항 출제</span></div></div>';
  });
  h += '</div>';

  // 유형·시간
  h += '<div class="card"><h2>유형과 시간</h2><ul class="list">' +
       '<li><span class="l">선다형</span><span class="r">' + g.mcq.correct + '/' + g.mcq.n + ' · ' +
       (g.mcq.n ? Math.round(g.mcq.correct * 100 / g.mcq.n) : 0) + '% · ' + g.mcq.points + '점</span></li>' +
       '<li><span class="l">단답형</span><span class="r">' + g.short.correct + '/' + g.short.n + ' · ' +
       (g.short.n ? Math.round(g.short.correct * 100 / g.short.n) : 0) + '% · ' + g.short.points + '점</span></li>' +
       '<li><span class="l">평균 풀이 시간</span><span class="r">' + g.avg_sec + '초</span></li>' +
       '</ul>';
  if (g.slowest.length) {
    h += '<p class="small muted mt">가장 오래 걸린 문항</p><div class="row">';
    g.slowest.forEach(function (x) {
      h += '<span class="chip">' + (noOf[x.qid] || "?") + '번 ' + x.sec + '초</span>';
    });
    h += '</div>';
  }
  h += '</div>';

  // 세부항목
  h += '<div class="card"><h2>약한 세부항목 (정답률 낮은 순)</h2>';
  var weak = g.by_topic.slice(0, 8);
  if (!weak.length) h += '<p class="small muted">집계할 문항이 없습니다.</p>';
  else {
    h += '<ul class="list">';
    weak.forEach(function (t) {
      h += '<li><span class="l">' + esc(t.id + " " + t.name) + '</span>' +
           '<span class="r">' + t.correct + '/' + t.n + ' · ' + Math.round(t.pct) + '%</span></li>';
    });
    h += '</ul>';
    var w0 = weak[0];
    h += '<div class="banner blue"><span><b>처방 — </b>' + esc(w0.id + " " + w0.name) +
         ' → 오답노트 만기 재시험 + 연결 암기카드부터 보세요.</span></div>';
  }
  h += '</div>';

  // 미답
  if (g.unanswered.length) {
    h += '<div class="card"><h2>미답 ' + g.unanswered.length + '문항 · 0점 처리</h2><div class="row">';
    g.unanswered.forEach(function (qid) {
      h += '<span class="chip red">' + (noOf[qid] || "?") + '번</span>';
    });
    h += '</div></div>';
  }

  // 버튼
  h += '<div class="acts">' +
       '<button class="btn" data-act="goto" data-screen="mistakes">오답노트 보기</button>' +
       '<button class="btn' + (S.mockExplain ? " on" : "") + '" data-act="mock-expl">문항별 해설 보기</button>' +
       '<button class="btn" data-act="mock-report">약점 리포트 복사</button>' +
       '<button class="btn ghost" data-act="go-home">홈</button></div>';

  if (S.mockExplain) h += viewMockExplain(R, noOf);
  if (S.claudeText) {
    h += '<div class="card"><h2>아래 글을 복사해서 클로드에 붙여넣으세요</h2>' +
         '<textarea style="min-height:180px" readonly>' + esc(S.claudeText) + '</textarea></div>';
  }
  return h;
}

/* 제출 뒤에만 열리는 읽기 전용 해설 */
function viewMockExplain(R, noOf) {
  var blank = {};
  ((R.grade && R.grade.unanswered) || []).forEach(function (qid) { blank[qid] = true; });
  var h = '<div class="card"><h2>문항별 해설 · 번호를 누르세요 (· = 미답)</h2><div class="numlist">';
  R.order.forEach(function (o) {
    var mark = blank[o.qid] ? " ·" : (R.correct[o.qid] === true ? " ✓" : " ✕");
    h += '<button type="button" class="btn sm' + (S.mockExplainQid === o.qid ? " on" : "") +
         '" data-act="mock-expl-q" data-qid="' + esc(o.qid) + '">' + o.no + mark + '</button>';
  });
  h += '</div>';

  var qid = S.mockExplainQid;
  if (!qid) { h += '<p class="small muted">보고 싶은 번호를 누르면 해설이 나옵니다.</p></div>'; return h; }
  var q = S.byQid[qid];
  if (!q) { h += '<p class="small muted">문항 데이터가 없습니다.</p></div>'; return h; }
  var a = R.answers[qid] || {};
  var ok = R.correct[qid] === true;
  h += '<hr class="rule">' +
       '<div class="qhead"><span class="chip ink">' + (noOf[qid] || "?") + '번</span>' +
       '<span class="chip">' + esc(subjectOf(q.subject).short_name) + '</span>' +
       '<span class="chip">' + esc(String(q.points)) + '점</span>' +
       (a.conf === 0 ? '<span class="chip blue">찍음</span>' : "") +
       (a.flag ? '<span class="chip amber">⚑ 검토</span>' : "") + '</div>' +
       '<p class="stem">' + esc(q.stem) + '</p>';
  if (q.type === "mcq") {
    h += '<div class="choices">';
    (q.choices || []).forEach(function (c, oi) {
      var cls = "choice";
      if (oi === q.answer) cls += " ok";
      else if (a.given === oi) cls += " bad";
      h += '<span class="' + cls + '"><span class="k">' + CIRC[oi] + '</span><span class="txt">' + esc(c) +
           (Array.isArray(q.wrong_option_explanations) && q.wrong_option_explanations[oi]
             ? '<span class="why">' + esc(q.wrong_option_explanations[oi]) + '</span>' : "") +
           '</span></span>';
    });
    h += '</div>';
  }
  h += '<div class="verdict' + (ok ? " ok" : (blank[qid] ? " warn" : "")) + '"><b>' +
       (ok ? "✓ 맞음" : (blank[qid] ? "· 미답 (0점 · 시도로 기록하지 않음)" : "✕ 틀림")) + '</b></div>' +
       '<div class="ansbox"><div class="mine' + (ok ? " okmine" : "") + '"><small>내 답</small>' +
       esc(givenText(q, a.given)) + '</div>' +
       '<div class="real"><small>정답</small>' + esc(answerText(q)) + '</div></div>' +
       explainBody(q) + '</div>';
  return h;
}

/* ---------------- 모의고사 동작 ---------------- */
function startMock(key) {
  var m = mockPlans()[key];
  if (!m || !m.qids.length) { toast("편성할 문항이 없습니다."); return; }
  var sess = Store.get("session", null);
  if (sess && sess.mode === "mock" && Array.isArray(sess.qids) && sess.qids.length) {
    toast("진행 중인 모의고사가 있습니다. 먼저 이어하거나 버려 주세요.");
    return;
  }
  stopMockTimer();
  S.quiz = {
    sid: newSid(), mode: "mock",
    preset: {
      kind: "mock", key: m.preset, name: m.name, partial: m.partial === true,
      // 채점에 반드시 필요한 편성 계획 — 없으면 core가 만점을 1000점으로 넘겨짚어
      // 하프·미니 점수가 부풀고 환산 이유도 틀린다. 이어하기에서도 살아남아야 한다.
      planned_count: m.planned_count, planned_points: m.planned_points,
      slots_missing: m.slots_missing, substituted: m.substituted,
      minutes: m.minutes, warnings: m.warnings
    },
    qids: m.qids.slice(), idx: 0, answers: {},
    startedAt: nowISO(), deadlineAt: new Date(Date.now() + m.minutes * 60 * 1000).toISOString(),
    qStart: Date.now(), graded: null, awaitSelf: false, attIndex: null,
    warnings: m.warnings, stats: { correct: 0, added: 0 }, done: {}
  };
  S.mockAskStart = null;
  S.mockAskSubmit = false;
  S.mockPad = false;
  S.claudeText = null;
  saveSession();
  S.screen = "mockexam";
  render({ top: true });
}

function resumeMock() {
  var s = Store.get("session", null);
  if (!s || s.mode !== "mock" || !Array.isArray(s.qids) || !s.qids.length) {
    toast("이어서 볼 모의고사가 없습니다.");
    return false;
  }
  S.quiz = {
    sid: s.sid || newSid(), mode: "mock", preset: s.preset || { kind: "mock", key: "full" },
    qids: s.qids, idx: clamp(Number(s.idx) || 0, 0, s.qids.length - 1),
    answers: s.answers || {}, startedAt: s.startedAt || nowISO(), deadlineAt: s.deadlineAt || null,
    qStart: Date.now(), graded: null, awaitSelf: false, attIndex: null,
    warnings: [], stats: { correct: 0, added: 0 }, done: s.done || {}
  };
  S.claudeText = null;
  S.mockAskSubmit = false;
  var d = deadlineMs(S.quiz.deadlineAt);
  if (d != null && d <= Date.now()) {
    toast("시간이 끝나 자동으로 제출했습니다.");
    finishMock(true);
    return true;
  }
  S.screen = "mockexam";
  render({ top: true });
  return true;
}

/* 문항에 머문 시간을 누적한다(모의고사는 왔다갔다 하므로 덮어쓰지 않는다) */
function mockAddSec() {
  var Q = S.quiz;
  if (!Q || Q.mode !== "mock") return;
  var qid = Q.qids[Q.idx];
  if (!Q.answers[qid]) Q.answers[qid] = { given: null, conf: null, sec: 0, flag: false };
  var used = Math.round((Date.now() - (Q.qStart || Date.now())) / 1000);
  Q.answers[qid].sec = clamp((Q.answers[qid].sec || 0) + Math.max(0, used), 0, 7200);
  Q.qStart = Date.now();
}
function mockAnswer() {
  var Q = S.quiz;
  var qid = Q.qids[Q.idx];
  if (!Q.answers[qid]) Q.answers[qid] = { given: null, conf: null, sec: 0, flag: false };
  return Q.answers[qid];
}
/* 시험 화면의 단답 입력칸을 세션에 담는다 */
function storeMockShort() {
  var Q = S.quiz;
  if (!Q || Q.mode !== "mock" || S.screen !== "mockexam") return;
  var q = S.byQid[Q.qids[Q.idx]];
  if (!q || q.type !== "short") return;
  var vals = readShortInputs();
  if (!vals.length) return;
  var a = mockAnswer();
  a.given = (Array.isArray(q.blanks) && q.blanks.length) ? vals : (vals[0] || "");
  if (isAnsweredAns(q, a) && a.conf == null) a.conf = 2;
  mockAddSec();
  saveSession();
}
function mockGoto(i) {
  var Q = S.quiz;
  if (!Q) return;
  storeMockShort();
  mockAddSec();
  Q.idx = clamp(i, 0, Q.qids.length - 1);
  Q.qStart = Date.now();
  saveSession();
  render({ top: true });
}

function finishMock(auto) {
  var Q = S.quiz;
  if (!Q || Q.mode !== "mock") return;
  stopMockTimer();
  storeMockShort();
  mockAddSec();

  var meta = Q.preset || {};
  var mockObj = {
    preset: meta.key || "full", name: meta.name || "모의고사",
    qids: Q.qids.slice(), partial: meta.partial === true,
    // core는 이 값들로 환산 기준 만점(max_reference)과 환산 이유를 정한다
    planned_count: meta.planned_count,
    planned_points: meta.planned_points,
    slots_missing: meta.slots_missing,
    substituted: meta.substituted
  };
  var g = C.gradeMock(mockObj, Q.answers, S.questions, BP, TOPICS);

  // 문항별 시도 기록(mode "mock" + sid + sec) → 오답·찍음 정답은 오답노트로
  var t = todayStr();
  var correctMap = {};
  Q.qids.forEach(function (qid) {
    var q = S.byQid[qid];
    if (!q) return;
    var a = Q.answers[qid] || {};
    // 미답은 시도로 기록하지 않는다(미답 ≠ 찍음·오답 — 숙달도·오답노트를 더럽히지 않는다).
    // 점수에는 이미 0점으로 들어갔고 결과 화면 '미답 목록'이 따로 알려 준다.
    if (!hasAnswerFor(q, a)) { correctMap[qid] = false; return; }
    var correct, nearMiss = false, r;
    if (q.type === "mcq") correct = C.gradeMcq(q, a.given);
    else { r = C.gradeShort(q, a.given); correct = r.correct === true; nearMiss = !!r.nearMiss; }
    correctMap[qid] = !!correct;
    var att = {
      qid: qid, at: nowISO(), mode: "mock", sid: Q.sid, given: a.given,
      correct: !!correct, sec: a.sec || 0, conf: (a.conf == null ? 0 : a.conf),
      why: null, self_marked: false, near_miss: nearMiss
    };
    S.attempts.push(att);
    var m = C.applyAttemptToMistake(S.mistakes[qid] || null, att, q, mctx());
    if (m) S.mistakes[qid] = m;               // null이면 바꾸지 않는다
    if (!correct || att.conf === 0) enrollCards(q);       // 연결 카드 자동 편입
  });
  saveAttempts(); saveMistakes(); rebuildAttIndex();

  var rec = C.mockRecord(mockObj, g, Q.sid, t);
  S.mocks.push(rec);
  Store.set("mocks", S.mocks);

  S.mockResult = {
    grade: g, rec: rec, order: mockOrder(Q), answers: Q.answers, correct: correctMap,
    preset: mockObj.preset, name: mockObj.name, date: t,
    sec: Math.round((Date.now() - new Date(Q.startedAt).getTime()) / 1000),
    auto: !!auto
  };
  S.quiz = null;
  clearSession();
  S.mockPlans = null;                          // 다음 편성은 이번 문항을 피해서 다시 짠다
  S.mockAskSubmit = false;
  S.mockPad = false;
  S.mockExplain = false;
  S.mockExplainQid = null;
  S.claudeText = null;
  S.screen = "mockresult";
  render({ top: true });
}

/* ⑨-B 주간 약점 리포트 */
function mockReportText() {
  var t = todayStr();
  var w = C.weeklyReport(S.attempts, S.mocks, TOPICS, S.questions, t);
  var exp = C.expectedScore(S.mocks, TOPICS, S.questions, S.attByQid, BP, t);
  var rd = C.readiness(exp, BP);
  var dd = C.dday(S.settings.exam_date, t);
  var bySub = w.by_subject.map(function (b, i) {
    return (MARK[i] || b.id) + " " + subjectOf(b.id).short_name + " " +
           (b.pct == null ? "기록 없음" : Math.round(b.pct) + "%(" + b.n + "문항)");
  }).join(" / ");
  var weak = w.weak_topics.length
    ? w.weak_topics.map(function (x) { return x.id + " " + x.name + " " + Math.round(x.pct) + "%(" + x.n + ")"; }).join(" / ")
    : "기록 없음";
  var why = WHYS.map(function (x) { return x[1] + " " + (w.why_dist[x[0]] || 0); }).join(" / ");
  var conf = "확실 " + w.conf_dist[2] + " / 애매 " + w.conf_dist[1] + " / 찍음 " + w.conf_dist[0];
  var mk = w.mocks.length
    ? w.mocks.map(function (m) {
        var nm = (C.MOCK_PRESETS[m.preset] && C.MOCK_PRESETS[m.preset].name) || m.preset;
        var judged = (m.pass === true || m.pass === false);
        var orig = S.mocks.filter(function (x) {
          return x.date === m.date && (x.preset || "full") === m.preset && Number(x.scaled) === m.scaled;
        })[0];
        var ref = (orig && Number(orig.max_reference)) || 1000;
        return m.date + " " + nm + " " + m.scaled + "/" + ref + "점(보정 " + m.adj + ")" +
               (judged ? (m.pass ? " PASS" : " FAIL") : " 판정 없음");
      }).join(" / ")
    : "지난 7일 기록 없음";

  return "나는 맞춤형화장품조제관리사 12회(" + S.settings.exam_date + ") 수험생이고 오늘은 D-" +
    (dd == null ? "?" : dd) + "야. 아래는 내 학습 앱의 지난 7일 기록이야. " +
    "(1) 과락 위험 과목과 이유 (2) 이번 주 공부 순서 3개(세부항목 단위, 각 예상 소요 시간) " +
    "(3) 단답형 점수를 올릴 구체적 방법 (4) 버릴 것(시간 대비 효율 낮은 항목) 을 알려줘. 하루 " +
    S.settings.daily_minutes + "분 기준으로.\n" +
    "[예상 점수] " + exp.E + "점 (±" + exp.band + ", " + exp.low + "~" + exp.high + ") · " + exp.note + "\n" +
    "[READINESS] " + rd.label + " — " + rd.reasons.join(" / ") + "\n" +
    "[지난 7일] 푼 문항 " + w.n_attempts + "개 · 정답률 " + Math.round(w.correct_pct) + "%\n" +
    "[과목별 예상 정답률] " + bySub + "\n" +
    "[세부항목 정답률 하위 8개] " + weak + "\n" +
    "[오답 이유 분포] " + why + " / [자신감 분포] " + conf + "\n" +
    "[모의고사] " + mk;
}

/* 시작할 때 시간이 이미 끝난 모의고사가 있으면 자동으로 제출한다 */
function autoSubmitExpiredMock() {
  var s = Store.get("session", null);
  if (!s || s.mode !== "mock" || !Array.isArray(s.qids) || !s.qids.length) return false;
  var d = deadlineMs(s.deadlineAt);
  if (d == null || d > Date.now()) return false;
  S.quiz = {
    sid: s.sid || newSid(), mode: "mock", preset: s.preset || { kind: "mock", key: "full" },
    qids: s.qids, idx: clamp(Number(s.idx) || 0, 0, s.qids.length - 1),
    answers: s.answers || {}, startedAt: s.startedAt || nowISO(), deadlineAt: s.deadlineAt,
    qStart: Date.now(), graded: null, awaitSelf: false, attIndex: null,
    warnings: [], stats: { correct: 0, added: 0 }, done: {}
  };
  finishMock(true);
  toast("시간이 끝나 자동으로 제출했습니다.");
  return true;
}

/* ================================================================
 * 5-C. 암기카드 — 카드 홈 · 카드 세션
 *   박스·만기·하루 상한·자동 편입 계산은 전부 core.js가 한다.
 *   여기서는 화면과 pl.v1.cards 저장, 그리고 "모름 카드 세션 끝 재노출"만 맡는다.
 * ================================================================ */
var CARD_RATES = [["again", "모름"], ["hard", "애매"], ["good", "알아요"]];
var NOTE_MAX_CARDS = 60;          // memoryNoteText 기본값과 같게 — 화면 문구에 쓴다
var NOTE_MAX_SENTS = 40;

/* 오늘 할 일 배분(문항·오답·카드) — 카드 화면에서 하루 상한을 구할 때 쓴다 */
function todayPlan() {
  var t = todayStr();
  return C.dailyPlan(S.settings.daily_minutes, C.dday(S.settings.exam_date, t),
                     C.dueMistakes(S.mistakes, t).length);
}
/* 화면 필터 → core가 아는 filter 객체 */
function cardFilterObj() {
  var f = S.cardFilter;
  return {
    subject: f.subject === "" ? null : Number(f.subject),
    category: f.category === "" ? null : f.category,
    onlyAuto: f.onlyAuto === true
  };
}
function cardFilterOn() {
  var f = S.cardFilter;
  return f.subject !== "" || f.category !== "" || f.onlyAuto === true;
}
/* 오늘 낼 카드 — 순서·상한은 core.dueCards가 정한다(여기서 다시 계산하지 않는다).
   limit 생략 = 하루 상한, filter 생략 = 화면 필터, null = 필터 없음 */
function cardPlan(limit, filter) {
  return C.dueCards(S.cards, S.cardState, todayStr(), {
    filter: (filter === undefined) ? cardFilterObj() : filter,
    limit: (limit === undefined) ? todayPlan().cards : limit
  });
}
/* 화면에 보여줄 카드만 골라낸다(표시용 — 과목·카테고리·내 메모리 노트만) */
function cardsForScreen() {
  var f = cardFilterObj();
  return S.cards.filter(function (c) {
    if (f.subject != null && Number(c.subject) !== f.subject) return false;
    if (f.category != null && String(c.category || "") !== f.category) return false;
    if (f.onlyAuto) { var s = S.cardState[c.id]; if (!(s && s.auto === true)) return false; }
    return true;
  });
}
/* 오늘 이미 본 카드 수 — 하루 상한을 넘기지 않으려고 센다(새 저장 키 없이 last로 판단) */
function cardsSeenToday() {
  var t = todayStr(), n = 0;
  Object.keys(S.cardState).forEach(function (cid) {
    var s = S.cardState[cid];
    if (s && s.last === t) n += 1;
  });
  return n;
}
function memoryNote() {
  return C.memoryNoteText(S.cards, S.cardState, S.questions, S.mistakes, {
    todayStr: todayStr(), examDate: S.settings.exam_date, blueprint: BP,
    maxCards: NOTE_MAX_CARDS, maxSentences: NOTE_MAX_SENTS
  });
}

/* ---------------- 카드 홈 ---------------- */
function viewCardsHome() {
  var t = todayStr();
  var dd = C.dday(S.settings.exam_date, t);
  var plan = todayPlan();
  var limit = plan.cards;
  var list = cardsForScreen();
  var sum = C.cardBoxSummary(S.cardState, list, t);
  var dc = cardPlan(limit);
  var n = dc.queue.length;
  var h = "";

  if (!S.cards.length) {
    return '<div class="card"><h2>암기카드</h2>' +
           '<p class="small">카드 데이터를 읽지 못했습니다. app/data 폴더와 manifest.js를 확인해 주세요.</p></div>';
  }

  // D-3부터 마무리 규칙 (시험이 지난 뒤에는 띄우지 않는다)
  if (dd != null && dd >= 0 && dd <= 3) {
    h += '<div class="banner red"><span><b>' + esc(ddayText(dd)) + ' 마무리</b> — D-3부터는 모든 카드가 매일 ' +
         '만기로 잡힙니다. 박스 ①~③은 꼭, ④⑤도 시간이 되면 훑으세요.</span></div>';
  }

  // 오늘 요약
  h += '<div class="card"><h2>오늘 암기카드</h2><div class="todo">' +
       '<div class="t"><b>' + dc.due.length + '</b><span>오늘 만기</span></div>' +
       '<div class="t"><b>' + dc.fresh.length + '</b><span>새 카드</span></div>' +
       '<div class="t"><b>' + sum.autoCount + '</b><span>내 메모리 노트</span></div>' +
       '</div>' +
       '<p class="small muted mt">오늘 상한 ' + limit + '장 (하루 ' + esc(String(S.settings.daily_minutes)) +
       '분 · 국면 ' + esc(plan.phase) + ') · 오늘 본 카드 ' + cardsSeenToday() + '장' +
       (cardFilterOn() ? ' · 아래 숫자는 고른 조건 기준입니다' : "") + '</p></div>';

  // 박스 분포
  var mx = 1;
  [1, 2, 3, 4, 5].forEach(function (i) { if (sum.boxes[i] > mx) mx = sum.boxes[i]; });
  h += '<div class="card"><h2>박스 분포 · ①이 가장 약한 카드</h2><div class="boxdist">';
  [1, 2, 3, 4, 5].forEach(function (i) {
    var v = sum.boxes[i];
    h += '<div class="bx"><b>' + v + '</b>' +
         '<div class="col"><i style="height:' + (v ? Math.max(8, Math.round(v * 100 / mx)) : 0) + '%"></i></div>' +
         '<span>' + BOXM[i - 1] + '</span></div>';
  });
  var iv = C.CARD_INTERVALS[S.settings.track] || C.CARD_INTERVALS.sprint;
  h += '</div><p class="small muted mt">안 본 카드 ' + sum.unseen + '장 · 카드 ' + sum.total + '장' +
       (cardFilterOn() ? ' (전체 ' + S.cards.length + '장 중)' : "") + '</p>' +
       '<p class="tiny muted">알아요를 누르면 다음에 볼 때까지 — ' +
       iv.map(function (d, i) { return BOXM[i] + " " + d + "일"; }).join(" · ") + '</p></div>';

  // 필터
  var cats = {};
  S.cards.forEach(function (c) {
    if (S.cardFilter.subject !== "" && String(c.subject) !== String(S.cardFilter.subject)) return;
    var k = String(c.category || "");
    if (k) cats[k] = (cats[k] || 0) + 1;
  });
  h += '<div class="card"><h2>골라 보기</h2><div class="fields">' +
       '<div class="field"><label for="c-sub">과목</label><select id="c-sub" data-cf="subject">' +
       '<option value=""' + (S.cardFilter.subject === "" ? " selected" : "") + '>전체</option>';
  (BP.subjects || []).forEach(function (s) {
    h += '<option value="' + s.id + '"' + (String(S.cardFilter.subject) === String(s.id) ? " selected" : "") + '>' +
         esc(s.id + ". " + s.short_name) + '</option>';
  });
  h += '</select></div>' +
       '<div class="field"><label for="c-cat">카테고리</label><select id="c-cat" data-cf="category">' +
       '<option value=""' + (S.cardFilter.category === "" ? " selected" : "") + '>전체</option>';
  Object.keys(cats).sort().forEach(function (k) {
    h += '<option value="' + esc(k) + '"' + (S.cardFilter.category === k ? " selected" : "") + '>' +
         esc(oneLine(k, 28)) + ' (' + cats[k] + ')</option>';
  });
  h += '</select></div>' +
       '<div class="field"><label class="check"><input type="checkbox" data-cf="onlyAuto"' +
       (S.cardFilter.onlyAuto ? " checked" : "") + '> 내 메모리 노트만</label></div>' +
       '</div></div>';

  // 시작 버튼
  h += '<button class="btn primary big" data-act="card-start"' + (n ? "" : " disabled") + '>' +
       '오늘 카드 시작 (' + n + '장)</button>';
  h += n
    ? '<p class="small muted center mt">만기 카드를 먼저 내고, 남으면 새 카드를 채웁니다.</p>'
    : '<p class="small muted center mt">지금 낼 카드가 없습니다. 조건을 바꾸거나 내일 다시 오세요.</p>';

  h += '<div class="acts">' +
       '<button class="btn' + (S.cardListOpen ? " on" : "") + '" data-act="card-list">내 메모리 노트 보기 (' +
       sum.autoCount + ')</button>' +
       '<button class="btn" data-act="note-export">암기노트 한 장 내보내기</button>' +
       '<button class="btn ghost narrow" data-act="note-copy">복사</button></div>' +
       '<p class="small muted">암기노트 = 약한 카드(박스 ①~③·내 메모리 노트) 최대 ' + NOTE_MAX_CARDS +
       '장 + 아직 졸업 못 한 오답의 한 줄 암기 최대 ' + NOTE_MAX_SENTS + '개를 마크다운 한 장으로 묶습니다.</p>';

  // 내 메모리 노트 목록
  if (S.cardListOpen) {
    var autos = list.filter(function (c) {
      var s = S.cardState[c.id];
      return s && s.auto === true;
    });
    var af = cardFilterObj();
    af.onlyAuto = true;
    var aq = C.dueCards(S.cards, S.cardState, t, { filter: af, limit: limit });
    h += '<div class="card"><h2>내 메모리 노트 · 틀린 문항(찍어서 맞힌 문항)에 연결돼 담긴 카드</h2>';
    if (!autos.length) {
      h += '<p class="small muted">아직 담긴 카드가 없습니다. 문제를 틀리거나 찍어서 맞히면 그 문항에 연결된 ' +
           '카드가 자동으로 여기 들어옵니다.</p>';
    } else {
      h += '<button class="btn" data-act="card-start-auto"' + (aq.queue.length ? "" : " disabled") + '>' +
           '이 카드들로 시작 (' + aq.queue.length + '장)</button><ul class="list mt">';
      autos.slice(0, 50).forEach(function (c) {
        var s = S.cardState[c.id] || {};
        h += '<li><span class="l">' + esc(oneLine(c.front, 58)) +
             '<br><span class="tiny muted">' + esc(subjectOf(c.subject).short_name) +
             (c.category ? ' · ' + esc(oneLine(c.category, 22)) : "") + '</span></span>' +
             '<span class="r">' + (s.due ? '<span class="chip">박스 ' + cardBoxLabel(s) + '</span>' : "") +
             ' <span class="tiny muted">만기 ' + esc(s.due === t ? "오늘" : (s.due || "-")) + '</span></span></li>';
      });
      h += '</ul>';
      if (autos.length > 50) h += '<p class="tiny muted">외 ' + (autos.length - 50) + '장</p>';
    }
    h += '</div>';
  }

  // 복사가 막힌 브라우저용 — 직접 복사할 글
  if (S.claudeText) {
    h += '<div class="card"><h2>복사가 막혔습니다 — 아래 글을 직접 복사하세요</h2>' +
         '<textarea style="min-height:200px" readonly>' + esc(S.claudeText) + '</textarea></div>';
  }
  return h;
}

/* ---------------- 카드 세션 ---------------- */
function viewCardRun() {
  var R = S.cardRun;
  if (!R || !R.cids.length) { S.screen = "cards"; return viewCardsHome(); }
  if (R.done) return viewCardEnd(R);

  var total = R.cids.length;
  var cid = R.cids[R.idx];
  var c = S.byCid[cid];
  var h = '<div class="qhead">' +
          '<span class="chip ink">' + esc(R.label) + '</span>' +
          (R.idx >= R.baseN ? '<span class="chip amber">다시 보기 · 모름 카드</span>' : "") +
          '<span class="qcount">' + (R.idx + 1) + '/' + total + '</span></div>' +
          '<div class="prog"><i style="width:' + ((R.idx + (R.flipped ? 1 : 0.5)) * 100 / total).toFixed(1) + '%"></i></div>';

  if (!c) {
    return h + '<div class="card"><p>카드 ' + esc(cid) + '을(를) 찾지 못했습니다(데이터가 바뀐 것 같습니다).</p>' +
           '<div class="acts"><button class="btn" data-act="card-skip">다음 카드</button>' +
           '<button class="btn ghost narrow" data-act="card-quit">그만하기</button></div></div>';
  }

  h += '<div class="cardface' + (R.flipped ? " open" : "") + '" data-act="card-flip" role="button" tabindex="0"' +
       ' aria-label="카드 뒤집기">' +
       '<div class="row">' +
       '<span class="chip">' + esc(subjectOf(c.subject).short_name) + '</span>' +
       (c.category ? '<span class="chip gray">' + esc(oneLine(c.category, 20)) + '</span>' : "") +
       cardChips(c.id) +
       '</div>' +
       '<p class="f">' + esc(c.front) + '</p>' +
       (R.flipped ? "" : '<p class="small muted mt">카드를 눌러 뒤집기</p>') +
       '</div>';

  if (R.flipped) {
    h += '<div class="card cback">' +
         figureBox(c) +
         '<p class="b">' + esc(c.back) + '</p>' +
         (c.mnemonic ? '<div class="ex memory mt"><h4>암기법</h4><p>' + esc(c.mnemonic) + '</p></div>' : "") +
         '<p class="tiny muted">근거 ' + esc(sourceText(c)) + '</p>' +
         '</div>';
  }

  h += '<button class="btn big' + (R.flipped ? " ghost" : " primary") + '" data-act="card-flip">' +
       (R.flipped ? "앞면만 보기" : "뒤집기") + '</button>';
  h += '<div class="confrow mt">';
  CARD_RATES.forEach(function (r) {
    h += '<button type="button" class="btn ' + r[0] + '" data-act="card-rate" data-r="' + r[0] + '"' +
         (R.flipped ? "" : " disabled") + '>' + r[1] + '</button>';
  });
  h += '</div>';
  h += R.flipped
    ? '<p class="tiny muted center mt">모름 = 박스①로 내려가고 이 세션 끝에 한 번 더 · 애매 = 박스 유지, 내일 · 알아요 = 다음 박스</p>'
    : '<p class="small muted center mt">먼저 뒤집어서 답을 확인하세요. 답을 본 뒤에만 고를 수 있습니다.</p>';
  h += '<div class="acts"><button class="btn ghost narrow" data-act="card-quit">그만하기</button></div>' +
       '<p class="tiny muted center">고른 결과는 카드마다 바로 저장됩니다.</p>';
  return h;
}

/* 세션 끝 요약 */
function viewCardEnd(R) {
  var t = todayStr();
  var seen = Object.keys(R.seen);
  var dues = [];
  seen.forEach(function (cid) {
    var s = S.cardState[cid];
    if (s && s.due) dues.push(s.due);
  });
  dues.sort();
  var nextDue = dues.length ? dues[0] : null;
  var nextN = nextDue ? dues.filter(function (d) { return d === nextDue; }).length : 0;
  var left = Math.max(0, todayPlan().cards - cardsSeenToday());
  var more = nextCardBatch(Math.min(10, left), R.seen);
  var h = '<h2 style="font-size:22px;margin:14px 0 8px">암기카드 끝 · ' + esc(R.label) + '</h2>';

  h += '<div class="card"><div class="todo">' +
       '<div class="t"><b>' + R.counts.again + '</b><span>모름</span></div>' +
       '<div class="t"><b>' + R.counts.hard + '</b><span>애매</span></div>' +
       '<div class="t"><b>' + R.counts.good + '</b><span>알아요</span></div>' +
       '</div>' +
       '<p class="small muted mt">본 카드 ' + seen.length + '장 · 걸린 시간 ' +
       esc(fmtDur(((R.endedAt || Date.now()) - R.startedAt) / 1000)) +
       (nextDue ? ' · 다음 만기 ' + esc(nextDue === t ? "오늘" : nextDue) + ' ' + nextN + '장' : "") + '</p>' +
       (R.counts.again ? '<p class="small">모름 ' + R.counts.again +
          '장은 박스①로 내려갔습니다. 오늘 안에 한 번 더 보면 좋습니다.</p>' : "") +
       '</div>';

  h += '<div class="acts">' +
       '<button class="btn primary" data-act="card-more"' + (more.length ? "" : " disabled") + '>계속 ' +
       (more.length ? more.length + "장" : "10장") + '</button>' +
       '<button class="btn" data-act="goto" data-screen="cards">카드 홈</button>' +
       '<button class="btn ghost" data-act="go-home">홈</button></div>';
  if (!more.length) {
    h += '<p class="small muted center mt">' +
         (left ? "지금 더 낼 카드가 없습니다." : "오늘 카드 상한 " + todayPlan().cards + "장을 다 채웠습니다.") + '</p>';
  }
  return h;
}

/* 다음 묶음 — 순서는 core가 준 queue를 그대로 쓰고, 이번에 본 카드만 뺀다 */
function nextCardBatch(n, exclude) {
  if (n <= 0) return [];
  var out = [];
  cardPlan(false).queue.forEach(function (cid) {
    if (out.length >= n) return;
    if (exclude && exclude[cid]) return;
    out.push(cid);
  });
  return out;
}

function startCardRun(cids, label) {
  var seen = {};
  var list = (cids || []).filter(function (cid) {
    if (!cid || seen[cid] || !S.byCid[cid]) return false;
    seen[cid] = true;
    return true;
  });
  if (!list.length) { toast("낼 카드가 없습니다."); return false; }
  S.cardRun = {
    cids: list, baseN: list.length, idx: 0, flipped: false, done: false,
    counts: { again: 0, hard: 0, good: 0 }, retried: {}, seen: {},
    label: label || "오늘 카드", startedAt: Date.now(), endedAt: null
  };
  S.claudeText = null;
  S.screen = "cardrun";
  render({ top: true });
  return true;
}

function advanceCard() {
  var R = S.cardRun;
  if (!R) return;
  R.idx += 1;
  R.flipped = false;
  if (R.idx >= R.cids.length) { R.done = true; R.endedAt = Date.now(); }
  render({ top: true });
}

/* 카드 채점 — 새 상태는 core.reviewCard가 만들고, 저장은 pl.v1.cards 한 곳 */
function rateCard(rating) {
  var R = S.cardRun;
  if (!R || R.done || !R.flipped) return;
  var cid = R.cids[R.idx];
  if (!S.byCid[cid]) { advanceCard(); return; }
  var next;
  try { next = C.reviewCard(S.cardState[cid] || null, rating, todayStr(), mctx()); }
  catch (e) { toast("카드를 채점하지 못했습니다."); return; }
  S.cardState[cid] = next;
  saveCards();
  R.counts[rating] = (R.counts[rating] || 0) + 1;
  R.seen[cid] = true;
  // 모름 카드는 이 세션 끝에 한 번 더(스프린트 박스① 간격 0일) — 두 번은 붙이지 않는다
  if (rating === "again" && !R.retried[cid]) { R.retried[cid] = true; R.cids.push(cid); }
  advanceCard();
}

/* 오답·찍음 정답이면 연결 카드를 내 메모리 노트로 편입한다.
   오답 판정은 부르는 쪽(채점 직후)이 한다 — core는 시도를 보지 않는다. */
function enrollCards(q) {
  if (!q) return 0;
  var before = S.cardState;
  var r = C.enrollCardsForMistake(q, S.cards, before, todayStr());
  if (!r.enrolled.length) return 0;
  // 화면에 셀 때는 "이번에 새로 담긴 카드"만 센다(이미 담겨 있던 카드는 두 번 세지 않는다)
  var fresh = r.enrolled.filter(function (cid) {
    var s = before[cid];
    return !(s && s.auto === true);
  }).length;
  S.cardState = r.states;
  saveCards();
  return fresh;
}

/* ---------------- 프리셋 3종 ---------------- */
function startPreset(name) {
  if (!C.PRESETS[name]) { toast("모르는 프리셋입니다."); return; }
  var t = todayStr();
  var plan = todayPlan();
  var meta = C.PRESETS[name];
  var cardLimit = (meta.cards == null) ? plan.cards : Math.min(plan.cards, meta.cards);
  var p;
  try {
    p = C.buildPreset(name, {
      questions: S.questions, cards: S.cards, topics: TOPICS,
      attemptsByQid: S.attByQid, mistakes: S.mistakes, cardStates: S.cardState,
      todayStr: t, rng: C.seededRandom(Date.now() >>> 0),
      // 프리셋 기본 개수(15)를 넘지 않고, 오늘 배분이 더 적으면 그만큼만
      n: Math.max(1, Math.min((name === "today") ? plan.review : plan.newQ, meta.n)),
      cardLimit: cardLimit
    });
  } catch (e) { toast("프리셋을 만들지 못했습니다."); return; }

  var preset = {
    kind: "preset", name: p.name, label: p.label, ko: p.ko,
    cids: p.cids, topics: p.topics, mode: "mixed"
  };
  if (!p.qids.length && !p.cids.length) {
    toast(p.label + " — 지금 낼 문항도 카드도 없습니다.");
    return;
  }
  if (!p.qids.length) {                       // 문항이 없으면 카드부터
    toast(p.label + " — 문항이 없어 카드만 봅니다.");
    startCardRun(p.cids, p.ko);
    return;
  }
  if (startQuiz("drill", p.qids, preset)) {
    toast(p.label + " " + p.qids.length + "문항" + (p.cids.length ? " · 이어서 카드 " + p.cids.length + "장" : ""));
  }
}

/* ---------------- 암기노트 한 장 ---------------- */
function exportMemoryNote() {
  var text = memoryNote();
  var name = "passlab-암기노트-" + todayStr() + ".md";
  downloadBlob(new Blob([text], { type: "text/markdown;charset=utf-8" }), name);
  toast("암기노트를 내려받았습니다: " + name);
}

/* ---------------- 설정 ---------------- */
function viewSettings() {
  var st = S.settings;
  var h = '<div class="card"><h2>시험·학습 설정</h2><div class="fields">' +
          '<div class="field"><label for="s-date">시험일</label>' +
          '<input type="date" id="s-date" data-s="exam_date" value="' + esc(st.exam_date) + '"></div>' +
          '<div class="field"><label for="s-min">하루 공부 시간</label><select id="s-min" data-s="daily_minutes">' +
          [30, 60, 90, 120, 180].map(function (v) { return opt(String(v), v + "분", String(st.daily_minutes)); }).join("") +
          '</select></div>' +
          '<div class="field"><label for="s-dev">쓰는 기기</label><select id="s-dev" data-s="device">' +
          opt("mac", "맥", st.device) + opt("iphone", "아이폰", st.device) +
          '</select></div></div>' +
          '<p class="small muted mt">시험일을 바꾸면 홈의 D-day와 오늘 할 일이 바로 바뀝니다.</p></div>';

  // 백업
  h += '<div class="card"><h2>백업</h2>' +
       '<p class="small">마지막 백업: ' + esc(st.last_backup ? fmtDT(st.last_backup) : "없음") + '</p>' +
       '<div class="acts"><button class="btn primary" data-act="export">백업 내보내기</button>' +
       '<button class="btn" data-act="import-pick">가져오기</button></div>' +
       '<input type="file" id="importFile" accept="application/json,.json" class="hidden">' +
       '<p class="small muted mt">파일 이름은 passlab-진행-' + esc(todayStr()) + '-' + esc(st.device) + '.json 입니다.' +
       (st.device === "iphone" ? " 아이폰에서는 공유 시트로 파일 앱에 저장하세요." : "") + '</p>' +
       '<hr class="rule"><p class="small muted">가져오기 방식</p><div class="row">' +
       '<button class="btn sm' + (S.importMode === "merge" ? "" : " on") + '" data-act="import-mode" data-m="overwrite">덮어쓰기</button>' +
       '<button class="btn sm' + (S.importMode === "merge" ? " on" : "") + '" data-act="import-mode" data-m="merge">병합</button>' +
       '</div><p class="small muted">' +
       (S.importMode === "merge"
          ? '병합 — 두 기기의 기록을 합칩니다. 지금 기록을 지우지 않고, 같은 항목은 더 최근 것만 남깁니다.'
          : '덮어쓰기 — 지금 이 기기의 기록을 모두 지우고 백업 파일로 바꿉니다.') + '</p>';

  if (S.importPreview) {
    var p = S.importPreview;
    h += '<hr class="rule"><div class="banner"><span><b>가져올 파일:</b> ' + esc(p.name) + '<br>' +
         '내보낸 시각 ' + esc(p.exported_at ? fmtDT(p.exported_at) : "알 수 없음") + ' · ' +
         '푼 기록 ' + p.attempts + '개 · 오답 ' + p.mistakes + '개 · 방식 ' +
         (p.mode === "merge" ? "병합" : "덮어쓰기") + '</span></div>';
    if (p.mode === "merge") {
      var ms = p.stats || { attemptsAdded: 0, mistakesUpdated: 0, cardsUpdated: 0, mocksAdded: 0 };
      h += '<div class="banner blue"><span><b>병합하면 이렇게 됩니다</b><br>기록 ' + ms.attemptsAdded +
           '건 추가 · 오답 ' + ms.mistakesUpdated + '개 갱신 · 카드 ' + ms.cardsUpdated + '장 갱신 · 모의 ' +
           ms.mocksAdded + '회 추가</span></div>' +
           '<div class="acts"><button class="btn primary" data-act="merge-confirm">네, 병합합니다</button>' +
           '<button class="btn ghost" data-act="import-cancel">취소</button></div>';
    } else if (S.importStage === 1) {
      h += '<div class="acts"><button class="btn danger" data-act="import-confirm1">이 백업으로 덮어쓰기</button>' +
           '<button class="btn ghost" data-act="import-cancel">취소</button></div>';
    } else {
      h += '<div class="banner red"><span>정말 덮어쓸까요? <b>지금 이 기기의 기록은 모두 사라집니다.</b> ' +
           '되돌릴 수 없습니다.</span></div>' +
           '<div class="acts"><button class="btn danger primary" data-act="import-confirm2">네, 덮어씁니다</button>' +
           '<button class="btn ghost" data-act="import-cancel">취소</button></div>';
    }
  }
  h += '</div>';

  // 초기화
  h += '<div class="card"><h2>전체 초기화</h2>';
  if (S.resetStage === 0) {
    h += '<p class="small">푼 기록·오답노트·설정을 모두 지웁니다. 누르면 먼저 백업 파일을 한 번 내려받습니다.</p>' +
         '<div class="acts"><button class="btn danger" data-act="reset-start">전체 초기화</button></div>';
  } else {
    h += '<div class="banner red"><span>백업 파일을 내려받았습니다. 정말 지우려면 아래 칸에 <b>초기화</b>라고 쓰세요.</span></div>' +
         '<input type="text" id="resetWord" placeholder="초기화" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">' +
         '<div class="acts"><button class="btn danger primary" id="resetGo" data-act="reset-confirm" disabled>초기화 실행</button>' +
         '<button class="btn ghost" data-act="reset-cancel">취소</button></div>';
  }
  h += '</div>';

  // 데이터 점검
  h += '<div class="card"><h2>데이터 점검</h2>' +
       '<div class="acts"><button class="btn" data-act="datacheck">데이터 점검 실행</button></div>';
  if (S.dataCheck) h += renderDataCheck(S.dataCheck);
  if (S.mockCheck) {
    h += '<p class="small muted mt">모의고사 가능 여부</p><ul class="list">';
    S.mockCheck.forEach(function (m) {
      h += '<li><span class="l">' + esc(m.name) + '</span><span class="r">' +
           m.n + '/' + m.planned + '문항 · ' +
           '<span class="chip ' + (m.missing ? "amber" : "green") + '">' +
           (m.missing ? "부족 " + m.missing + " · 환산" : "정규 편성") + '</span></span></li>';
    });
    h += '</ul>';
  }
  h += '</div>';

  // 앱 정보
  h += '<div class="card"><h2>앱 정보</h2><ul class="list">' +
       '<li><span class="l">데이터 버전</span><span class="r">' + esc(MAN.version || "-") + '</span></li>' +
       '<li><span class="l">문항</span><span class="r">' + S.questions.length + '개</span></li>' +
       '<li><span class="l">암기카드</span><span class="r">' + S.cards.length + '장</span></li>' +
       '<li><span class="l">푼 기록</span><span class="r">' + S.attempts.length + '개</span></li>' +
       '<li><span class="l">오답노트</span><span class="r">' + Object.keys(S.mistakes).length + '개</span></li>' +
       '<li><span class="l">데이터 파일 오류</span><span class="r">' +
       (S.loadErrors.length ? esc(S.loadErrors.join(", ")) : "없음") + '</span></li>' +
       '</ul></div>';
  return h;
}

function renderDataCheck(r) {
  var h = '<p class="small mt">전체 ' + r.total + '문항 · 검증 ' + Math.round(r.verifiedRatio * 100) + '% · ' +
          (r.ok ? '<span class="chip green">문제 없음</span>' : '<span class="chip red">확인할 항목 있음</span>') + '</p>';
  h += '<div class="tablewrap"><table><thead><tr>' +
       '<th class="l">과목</th><th>문항</th><th>선다</th><th>단답</th><th>8점</th><th>12점</th><th>18점</th><th>검증</th><th>카드</th>' +
       '</tr></thead><tbody>';
  var tot = { total: 0, mcq: 0, short: 0, p8: 0, p12: 0, p18: 0, v: 0, c: 0 };
  [1, 2, 3, 4].forEach(function (sid) {
    var b = r.bySubject[sid] || { total: 0, mcq: 0, short: 0, points: {}, verified: 0 };
    var cds = (r.cards.bySubject || {})[sid] || 0;
    tot.total += b.total; tot.mcq += b.mcq; tot.short += b.short;
    tot.p8 += b.points[8] || 0; tot.p12 += b.points[12] || 0; tot.p18 += b.points[18] || 0;
    tot.v += b.verified; tot.c += cds;
    h += '<tr><td class="l">' + esc(sid + ". " + subjectOf(sid).short_name) + '</td>' +
         '<td>' + b.total + '</td><td>' + b.mcq + '</td><td>' + b.short + '</td>' +
         '<td>' + (b.points[8] || 0) + '</td><td>' + (b.points[12] || 0) + '</td><td>' + (b.points[18] || 0) + '</td>' +
         '<td>' + b.verified + '</td><td>' + cds + '</td></tr>';
  });
  h += '</tbody><tfoot><tr><td class="l">합계</td><td>' + tot.total + '</td><td>' + tot.mcq + '</td><td>' + tot.short +
       '</td><td>' + tot.p8 + '</td><td>' + tot.p12 + '</td><td>' + tot.p18 + '</td><td>' + tot.v + '</td><td>' + tot.c +
       '</td></tr></tfoot></table></div>';

  var probs = [
    ["중복된 문항 ID", r.duplicates], ["정답 정보 오류", r.badAnswer], ["보기 개수 오류", r.badChoices],
    ["보기별 해설 오류", r.badWrongExpl], ["배점 오류(8·12·18 아님)", r.badPoints],
    ["근거(법령·가이드) 없음", r.missingSource], ["한 줄 암기 없음", r.missingMemory],
    ["세부항목 코드 불명", r.unknownTopic]
  ];
  h += '<p class="small muted mt">확인할 항목</p><ul class="list">';
  probs.forEach(function (p) {
    var n = (p[1] || []).length;
    h += '<li><span class="l">' + esc(p[0]) + (n ? ' <span class="muted small">' +
         esc(p[1].slice(0, 8).join(", ")) + (n > 8 ? " 외 " + (n - 8) : "") + '</span>' : "") + '</span>' +
         '<span class="r"><span class="chip ' + (n ? "red" : "green") + '">' + n + '</span></span></li>';
  });
  h += '</ul>';
  return h;
}

/* ================================================================
 * 6. 동작
 * ================================================================ */
function newSid() { return "S" + Date.now().toString(36); }

function startQuiz(mode, qids, preset, warnings) {
  if (!qids || !qids.length) { toast("조건에 맞는 문항이 없습니다."); return false; }
  var live = Store.get("session", null);
  if (live && live.mode === "mock" && Array.isArray(live.qids) && live.qids.length) {
    toast("모의고사가 진행 중입니다. 모의 탭에서 제출하거나 버린 뒤에 시작해 주세요.");
    return false;
  }
  S.quiz = {
    sid: newSid(), mode: mode, preset: preset || {}, qids: qids, idx: 0, answers: {},
    startedAt: nowISO(), qStart: Date.now(), graded: null, awaitSelf: false,
    attIndex: null, warnings: warnings || [], stats: { correct: 0, added: 0 },
    done: {}
  };
  S.claudeText = null;
  saveSession();
  S.screen = (mode === "diag") ? "diag" : "quiz";
  render({ top: true });
  return true;
}

function startDiagnostic() {
  var seed = Number(todayStr().replace(/-/g, "")) || 20260919;
  var d = C.buildDiagnostic(S.questions, TOPICS, BP, C.seededRandom(seed));
  if (!d.qids.length) { toast("진단에 쓸 문항이 없습니다. 데이터 파일을 확인해 주세요."); return; }
  var warn = d.warnings.slice();
  var total = (BP.diagnostic && BP.diagnostic.total) || 30;
  if (d.qids.length < total) warn.unshift("문항이 부족해 " + d.qids.length + "문항으로 진행합니다.");
  startQuiz("diag", d.qids, { kind: "diagnostic" }, warn);
}

function startStudy(over) {
  var o = over || {};
  var st = S.study;
  var opts = {
    subject: (o.subject !== undefined ? o.subject : (st.subject === "" ? null : Number(st.subject))),
    topic: (o.topic !== undefined ? o.topic : (st.topic === "" ? null : st.topic)),
    type: o.type || st.type,
    n: o.n || Number(st.n) || 10,
    mode: o.mode || st.mode,
    todayStr: todayStr()
  };
  var qids = C.buildStudySet(S.questions, opts, S.attByQid, S.mistakes, C.seededRandom(Date.now() >>> 0));
  if (!qids.length) {
    toast(opts.mode === "due" ? "오늘 만기인 오답이 없습니다." : "조건에 맞는 문항이 없습니다.");
    return;
  }
  startQuiz("study", qids, opts);
}

function resumeSession() {
  var s = Store.get("session", null);
  if (!s || !s.qids || !s.qids.length) { toast("이어서 풀 세션이 없습니다."); return; }
  if (s.mode === "mock") { resumeMock(); return; }
  var Q = {
    sid: s.sid || newSid(), mode: s.mode || "study", preset: s.preset || {},
    qids: s.qids, idx: clamp(Number(s.idx) || 0, 0, s.qids.length - 1),
    answers: s.answers || {}, startedAt: s.startedAt || nowISO(), qStart: Date.now(),
    graded: null, awaitSelf: false, attIndex: null, warnings: [],
    stats: s.stats || { correct: 0, added: 0 },
    done: s.done || {}
  };
  S.quiz = Q;
  S.claudeText = null;

  // 이미 채점까지 끝난 문항은 건너뛴다(제출 → 그만하기 → 이어하기로 같은 문항이 두 번 기록되는 것 방지).
  var i = Q.idx;
  while (i < Q.qids.length && Q.done[Q.qids[i]]) i++;
  if (i >= Q.qids.length) {                       // 전부 끝난 세션이면 요약으로 보낸다
    Q.idx = Q.qids.length - 1;
    if (Q.mode === "diag") { S.quiz = null; clearSession(); S.screen = "home"; toast("이미 끝난 진단입니다."); }
    else { finishStudy(); return; }
    render({ top: true });
    return;
  }
  if (i !== Q.idx) { Q.idx = i; saveSession(); }

  S.screen = (Q.mode === "diag") ? "diag" : "quiz";
  render({ top: true });
}

/* QUICK — 적응형 세트(취약·복습 만기·새 문항)를 즉시 해설 모드로 푼다 */
function startQuick(n) {
  var set = C.buildAdaptiveSet(n, S.questions, TOPICS, S.attByQid, S.mistakes,
                               todayStr(), C.seededRandom(Date.now() >>> 0));
  if (!set.qids.length) { toast("지금 뽑을 문항이 없습니다."); return; }
  if (startQuiz("drill", set.qids, { kind: "quick", n: n, mix: set.mix })) {
    toast("QUICK " + set.qids.length + "문항 — 약한 " + set.mix.W + " · 복습 " + set.mix.R + " · 새 " + set.mix.N);
  }
}

function curAnswer() {
  var Q = S.quiz;
  if (!Q) return null;
  var qid = Q.qids[Q.idx];
  if (!Q.answers[qid]) Q.answers[qid] = { given: null, conf: null, sec: 0, flag: false };
  return Q.answers[qid];
}
function markSec() {
  var Q = S.quiz;
  var a = curAnswer();
  if (!a) return;
  a.sec = clamp(Math.round((Date.now() - Q.qStart) / 1000), 0, 3600);
}

function readShortInputs() {
  var vals = [];
  var ins = document.querySelectorAll("#main .shortin");
  for (var i = 0; i < ins.length; i++) vals.push(ins[i].value);
  return vals;
}
function storeShortAnswer() {
  var Q = S.quiz;
  if (!Q) return;
  // 문항 화면이 떠 있을 때만 입력칸을 읽는다. [그만하기]·탭 이동 뒤에도 S.quiz는 살아 있는데
  // 그때 읽으면 입력칸이 없어 빈 값으로 덮어써서 쓰던 답이 날아간다.
  if (S.screen !== "quiz" && S.screen !== "diag") return;
  var q = S.byQid[Q.qids[Q.idx]];
  if (!q || q.type !== "short") return;
  var vals = readShortInputs();
  if (!vals.length) return;                 // 입력칸이 하나도 없으면 아무것도 건드리지 않는다
  var a = curAnswer();
  if (!a) return;
  a.given = (Array.isArray(q.blanks) && q.blanks.length) ? vals : (vals[0] || "");
  markSec();
  saveSession();
}

function gradeCurrent() {
  var Q = S.quiz, qid = Q.qids[Q.idx], q = S.byQid[qid], a = Q.answers[qid] || {};
  if (q.type === "mcq") {
    return { correct: C.gradeMcq(q, a.given), stage: 1, nearMiss: false, needSelfMark: false, blanks: null };
  }
  return C.gradeShort(q, a.given);
}

function commitAttempt(correct, selfMarked, nearMiss) {
  var Q = S.quiz, qid = Q.qids[Q.idx], q = S.byQid[qid], a = Q.answers[qid] || {};
  var hadMistake = !!S.mistakes[qid];
  var att = {
    qid: qid, at: nowISO(),
    mode: Q.mode === "diag" ? "diag"
        : (Q.mode === "drill" ? "drill"
        : ((Q.preset && Q.preset.mode === "due") ? "review" : "study")),
    sid: Q.sid, given: a.given, correct: !!correct, sec: a.sec || 0,
    conf: (a.conf == null ? 0 : a.conf), why: null,
    self_marked: !!selfMarked, near_miss: !!nearMiss
  };
  S.attempts.push(att);
  Q.attIndex = S.attempts.length - 1;
  var m = C.applyAttemptToMistake(S.mistakes[qid] || null, att, q, mctx());
  if (m) S.mistakes[qid] = m;               // null이면 바꾸지 않는다
  if (!hadMistake && S.mistakes[qid]) Q.stats.added += 1;
  if (correct) Q.stats.correct += 1;
  // 오답·찍음 정답이면 연결 암기카드를 내 메모리 노트로(박스①·오늘 만기)
  if (!correct || att.conf === 0) Q.stats.cards = (Q.stats.cards || 0) + enrollCards(q);
  Q.done[qid] = true;                       // 이 문항은 기록 끝 — 이어하기에서 다시 채점하지 않는다
  saveAttempts(); saveMistakes(); rebuildAttIndex(); saveSession();
}

function submitStudy() {
  var Q = S.quiz;
  if (!Q) return;
  var q = S.byQid[Q.qids[Q.idx]];
  if (!q) { nextQuestion(); return; }
  if (Q.done[Q.qids[Q.idx]]) { nextQuestion(); return; }   // 이미 기록한 문항은 다시 채점하지 않는다
  if (q.type === "short") storeShortAnswer();
  markSec();
  var a = curAnswer();
  if (!hasAnswerFor(q, a) || a.conf == null) { toast("답과 자신감을 먼저 골라 주세요."); return; }
  var g = gradeCurrent();
  Q.graded = g;
  S.claudeText = null;
  if (!g.correct && g.needSelfMark) { Q.awaitSelf = true; }
  else { Q.awaitSelf = false; commitAttempt(g.correct, false, g.nearMiss); }
  saveSession();
  render({ top: true });
}

function nextQuestion() {
  var Q = S.quiz;
  if (!Q) return;
  var q = S.byQid[Q.qids[Q.idx]];
  if (Q.mode === "diag" && q) {
    if (q.type === "short") storeShortAnswer();
    markSec();
    var a = curAnswer();
    if (!hasAnswerFor(q, a) || a.conf == null) { toast("답과 자신감을 먼저 골라 주세요."); return; }
  } else if (Q.awaitSelf && q) {
    // 판정 없이 넘어가면 오답으로 기록한다
    Q.awaitSelf = false;
    commitAttempt(false, false, false);
  }
  if (Q.idx + 1 >= Q.qids.length) {
    if (Q.mode === "diag") finishDiagnostic();
    else finishStudy();
    return;
  }
  Q.idx += 1;
  Q.graded = null; Q.awaitSelf = false; Q.attIndex = null; Q.qStart = Date.now();
  S.claudeText = null;
  saveSession();
  render({ top: true });
}

function finishStudy() {
  var Q = S.quiz;
  S.summary = {
    mode: "study", n: Q.qids.length, correct: Q.stats.correct, added: Q.stats.added,
    cards: Q.stats.cards || 0,
    sec: Math.round((Date.now() - new Date(Q.startedAt).getTime()) / 1000),
    preset: Q.preset
  };
  S.quiz = null;
  clearSession();
  S.screen = "summary";
  render({ top: true });
}

function finishDiagnostic() {
  var Q = S.quiz;
  var t = todayStr();
  var answers = {};
  var correctN = 0;
  Q.qids.forEach(function (qid) {
    var q = S.byQid[qid];
    if (!q) return;
    var a = Q.answers[qid] || {};
    var g, correct, nearMiss = false;
    if (q.type === "mcq") correct = C.gradeMcq(q, a.given);
    else { g = C.gradeShort(q, a.given); correct = g.correct; nearMiss = !!g.nearMiss; }
    if (correct) correctN += 1;
    var att = {
      qid: qid, at: nowISO(), mode: "diag", sid: Q.sid, given: a.given,
      correct: !!correct, sec: a.sec || 0, conf: (a.conf == null ? 0 : a.conf),
      why: null, self_marked: false, near_miss: nearMiss
    };
    S.attempts.push(att);
    var m = C.applyAttemptToMistake(S.mistakes[qid] || null, att, q, mctx());
    if (m) S.mistakes[qid] = m;
    if (!correct || att.conf === 0) enrollCards(q);       // 연결 카드 자동 편입
    answers[qid] = { correct: !!correct, conf: att.conf };
  });
  saveAttempts(); saveMistakes(); rebuildAttIndex();

  var res = C.diagnosticResult(Q.qids, answers, S.questions, BP, TOPICS);
  S.diagResult = { res: res, total: Q.qids.length, correct: correctN, date: t };
  S.settings.diag_done = true;
  S.settings.last_diagnostic = {
    date: t, sid: Q.sid, total: Q.qids.length, correct: correctN,
    est_total: res.est_total, est_note: res.est_note,
    bySubject: res.bySubject.map(function (b) {
      return { id: b.id, name: b.name, pct: b.pct, est_points: b.est_points, max: b.max, risk: b.risk };
    }),
    weakTopics: res.weakTopics
  };
  saveSettings();
  S.quiz = null;
  clearSession();
  S.screen = "diagresult";
  render({ top: true });
}

/* ---------------- 클로드 설명 요청 (⑨-A 템플릿) ---------------- */
function claudeTemplate() {
  var Q = S.quiz;
  if (!Q) return "";
  var qid = Q.qids[Q.idx], q = S.byQid[qid], a = Q.answers[qid] || {};
  var att = (Q.attIndex != null) ? S.attempts[Q.attIndex] : null;
  var choices = (q.choices || []).map(function (c, i) { return CIRC[i] + " " + c; }).join(" / ") || "(단답형)";
  return "나는 맞춤형화장품조제관리사 시험(" + S.settings.exam_date + ") 수험생이야. 아래 문항을 틀렸어. " +
    "초보자에게 설명하듯 (1) 왜 정답이 정답인지 근거 조문과 함께 (2) 내가 고른 보기가 왜 틀렸는지 " +
    "(3) 출제자가 이 개념을 바꿔 물을 수 있는 방식 2가지 (4) 10초 안에 떠올릴 한 줄 암기 를 알려줘. " +
    "법령 수치는 현행 기준으로 확인해서 답해줘.\n" +
    "[문항 ID] " + q.id + " / [과목·세부항목] " + subjectOf(q.subject).name + " " + topicLabel(q.topic) + "\n" +
    "[문제] " + q.stem + "\n" +
    "[보기] " + choices + "\n" +
    "[내 답] " + givenText(q, a.given) + " / [정답] " + answerText(q) +
    " / [내가 고른 이유] " + ((att && whyLabel(att.why)) || "(미선택)") + "\n" +
    "[앱 해설] " + (q.explanation || "");
}
function copyText(text, okMsg) {
  var done = okMsg || "복사했습니다. 클로드에 붙여넣으세요.";
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) toast(done);
    else { S.claudeText = text; toast("복사가 막혔습니다. 아래 글을 직접 복사하세요."); render(); }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { toast(done); })
        .catch(fallback);
      return;
    }
  } catch (e) {}
  fallback();
}

/* ---------------- 백업 · 가져오기 · 초기화 ---------------- */
function backupPayload() {
  var p = {
    app: "PASS LAB", schema: 1, exported_at: nowISO(),
    data_version: MAN.version || "", device: S.settings.device || "mac"
  };
  KEYS.forEach(function (k) { p[PREFIX + k] = Store.get(k, null); });
  return p;
}
function backupFileName() {
  return "passlab-진행-" + todayStr() + "-" + (S.settings.device || "mac") + ".json";
}
function markBackedUp() {
  S.settings.last_backup = nowISO();
  saveSettings();
}
function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
}
function doExport(silent) {
  var name = backupFileName();
  var text = JSON.stringify(backupPayload(), null, 2);
  var blob = new Blob([text], { type: "application/json" });

  if (S.settings.device === "iphone" && navigator.share && window.File) {
    try {
      var file = new File([blob], name, { type: "application/json" });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "PASS LAB 백업", text: name })
          .then(function () { markBackedUp(); if (!silent) { toast("백업 파일을 공유했습니다."); render(); } })
          .catch(function () { downloadBlob(blob, name); markBackedUp(); if (!silent) { toast("백업 파일을 내려받았습니다."); render(); } });
        return;
      }
    } catch (e) { /* 아래 다운로드로 */ }
  }
  downloadBlob(blob, name);
  markBackedUp();
  if (!silent) { toast("백업 파일을 내려받았습니다: " + name); render(); }
}
function extractBackup(obj) {
  var out = {};
  KEYS.forEach(function (k) {
    var v = obj[PREFIX + k];
    if (v === undefined) v = obj[k];
    if (v === undefined && obj.data) v = obj.data[k];
    out[k] = v;
  });
  return out;
}
function readImportFile(file) {
  if (!file) return;
  var fr = new FileReader();
  fr.onerror = function () { toast("파일을 읽지 못했습니다."); };
  fr.onload = function () {
    var obj;
    try { obj = JSON.parse(String(fr.result)); }
    catch (e) { toast("JSON 백업 파일이 아닙니다."); return; }
    if (!obj || typeof obj !== "object") { toast("백업 파일 형식이 아닙니다."); return; }
    var d = extractBackup(obj);
    var got = KEYS.some(function (k) { return d[k] !== undefined; });
    if (!got) { toast("이 파일에는 PASS LAB 기록이 없습니다."); return; }
    S.importPreview = {
      name: file.name, data: d, exported_at: obj.exported_at || null,
      attempts: Array.isArray(d.attempts) ? d.attempts.length : 0,
      mistakes: d.mistakes ? Object.keys(d.mistakes).length : 0,
      mode: S.importMode === "merge" ? "merge" : "overwrite",
      merged: null, stats: null
    };
    if (S.importPreview.mode === "merge") {
      var local = {};
      C.BACKUP_KEYS.forEach(function (k) { local[k] = Store.get(k, null); });
      var mg = C.mergeBackup(local, d);          // 합치기 규칙은 전부 core.js
      S.importPreview.merged = mg.merged;
      S.importPreview.stats = mg.stats;
    }
    S.importStage = 1;
    render();
  };
  fr.readAsText(file);
}
function applyImport() {
  var d = S.importPreview.data;
  KEYS.forEach(function (k) {
    if (d[k] === undefined) return;
    if (d[k] === null) Store.del(k);
    else Store.set(k, d[k]);
  });
  loadState();
  S.quiz = null; S.diagResult = null; S.summary = null; S.cardRun = null;
  S.importPreview = null; S.importStage = 0;
  toast("가져오기를 마쳤습니다.");
  S.screen = "home";
  render({ top: true });
}
/* 병합 — 합치기는 core.mergeBackup이 하고, 여기서는 값이 있는 키만 저장한다(지우지 않는다) */
function applyMerge() {
  var p = S.importPreview;
  if (!p || !p.merged) { toast("병합할 내용이 없습니다."); return; }
  C.BACKUP_KEYS.forEach(function (k) {
    var v = p.merged[k];
    if (v === null || v === undefined) return;
    Store.set(k, v);
  });
  loadState();
  S.quiz = null; S.diagResult = null; S.summary = null; S.cardRun = null;
  S.importPreview = null; S.importStage = 0;
  toast("병합을 마쳤습니다. 기록 " + p.stats.attemptsAdded + "건 추가 · 카드 " + p.stats.cardsUpdated + "장 갱신");
  S.screen = "home";
  render({ top: true });
}
function doReset() {
  KEYS.forEach(function (k) { Store.del(k); });
  loadState();
  // 메모리에 남은 세션까지 모두 비운다 — 안 비우면 카드 세션이 살아남아
  // [알아요] 한 번에 방금 지운 pl.v1.cards가 되살아난다.
  S.quiz = null; S.diagResult = null; S.summary = null; S.dataCheck = null;
  S.cardRun = null; S.mockResult = null; S.mockPlans = null;
  S.importPreview = null; S.importStage = 0;
  S.openMistake = null; S.cardListOpen = false; S.claudeText = null;
  stopMockTimer();
  S.resetStage = 0;
  S.screen = "home";
  toast("모두 지웠습니다. 처음 상태입니다.");
  render({ top: true });
}

/* ================================================================
 * 7. 이벤트
 * ================================================================ */
var ACTIONS = {
  tab: function (t) {
    var id = t.getAttribute("data-tab");
    var map = { home: "home", study: "study", mock: "mock", mistakes: "mistakes", cards: "cards", settings: "settings" };
    // 시험 화면을 떠날 때는 쓰던 답을 먼저 저장한다(세션은 남는다)
    if (S.screen === "mockexam") { storeMockShort(); mockAddSec(); saveSession(); }
    if (id === "mock" && S.quiz && S.quiz.mode === "mock") { S.screen = "mockexam"; render({ top: true }); return; }
    // 보던 카드 세션이 있으면 카드 탭은 그 자리로 돌아간다
    if (id === "cards" && S.cardRun && !S.cardRun.done) { S.screen = "cardrun"; render({ top: true }); return; }
    S.screen = map[id] || "home";
    S.mockAskStart = null;
    S.mockAskDiscard = false;
    S.claudeText = null;
    render({ top: true });
  },
  goto: function (t) { S.screen = t.getAttribute("data-screen"); render({ top: true }); },
  "go-home": function () { S.screen = "home"; render({ top: true }); },
  "start-diag": function () { startDiagnostic(); },
  "start-today": function () {
    var t = todayStr();
    var due = C.dueMistakes(S.mistakes, t);
    var plan = C.dailyPlan(S.settings.daily_minutes, C.dday(S.settings.exam_date, t), due.length);
    startStudy({ subject: null, topic: null, type: "all", mode: "mixed", n: Math.max(1, plan.newQ) });
  },
  "start-due": function () { startStudy({ subject: null, topic: null, type: "all", mode: "due", n: 20 }); },
  resume: function () { resumeSession(); },
  quit: function () { if (S.quiz) saveSession(); S.screen = "home"; render({ top: true }); },

  pick: function (t) {
    var Q = S.quiz;
    if (!Q || Q.graded) return;
    var a = curAnswer();
    a.given = Number(t.getAttribute("data-i"));
    markSec();
    saveSession();
    render();
  },
  conf: function (t) {
    var Q = S.quiz;
    if (!Q || Q.graded) return;
    var q = S.byQid[Q.qids[Q.idx]];
    if (q && q.type === "short") storeShortAnswer();
    var a = curAnswer();
    a.conf = Number(t.getAttribute("data-c"));
    markSec();
    saveSession();
    render();
  },
  "short-done": function () { storeShortAnswer(); render(); toast("답을 저장했습니다. 자신감을 골라 주세요."); },
  submit: function () { submitStudy(); },
  next: function () { nextQuestion(); },
  "grade-diag": function () { nextQuestion(); },
  selfmark: function (t) {
    var Q = S.quiz;
    if (!Q || !Q.awaitSelf) return;
    var same = t.getAttribute("data-v") === "1";
    Q.awaitSelf = false;
    Q.graded.correct = same;
    commitAttempt(same, same, false);
    render();
  },
  why: function (t) {
    var Q = S.quiz;
    if (!Q || Q.attIndex == null) return;
    var w = t.getAttribute("data-w");
    var att = S.attempts[Q.attIndex];
    att.why = (att.why === w) ? null : w;
    saveAttempts(); rebuildAttIndex();
    render();
  },
  "claude-copy": function () { copyText(claudeTemplate()); },

  "study-start": function () { startStudy(); },
  "study-more": function () {
    var p = (S.summary && S.summary.preset) || {};
    startStudy({ subject: p.subject, topic: p.topic, type: p.type || "all", mode: p.mode || "new", n: 10 });
  },

  "mn-toggle": function (t) {
    var qid = t.getAttribute("data-qid");
    S.openMistake = (S.openMistake === qid) ? null : qid;
    render();
  },
  "mn-retry": function (t) {
    var qid = t.getAttribute("data-qid");
    if (!S.byQid[qid]) { toast("문항 데이터가 없습니다."); return; }
    startQuiz("study", [qid], { mode: "single" });
  },
  "mn-due": function () { startStudy({ subject: null, topic: null, type: "all", mode: "due", n: 20 }); },

  export: function () { doExport(false); },
  "import-pick": function () { var f = el("importFile"); if (f) f.click(); },
  "import-confirm1": function () { S.importStage = 2; render(); },
  "import-confirm2": function () { applyImport(); },
  "import-cancel": function () { S.importPreview = null; S.importStage = 0; render(); },
  "import-mode": function (t) {
    var m = t.getAttribute("data-m") === "merge" ? "merge" : "overwrite";
    if (S.importMode === m) return;
    S.importMode = m;
    S.importPreview = null; S.importStage = 0;    // 방식이 바뀌면 미리보기를 다시 만든다
    render();
  },
  "merge-confirm": function () { applyMerge(); },
  "reset-start": function () { doExport(true); S.resetStage = 1; toast("백업 파일을 먼저 내려받았습니다."); render(); },
  "reset-confirm": function () {
    var w = el("resetWord");
    if (!w || w.value.trim() !== "초기화") { toast("'초기화'라고 정확히 써 주세요."); return; }
    doReset();
  },
  "reset-cancel": function () { S.resetStage = 0; render(); },
  datacheck: function () {
    S.dataCheck = C.dataCheck(S.questions, S.cards, TOPICS);
    S.mockCheck = MOCK_ORDER.map(function (k) {
      var m = C.buildMock(k, S.questions, BP, { attemptsByQid: S.attByQid },
                          C.seededRandom(hashStr("check|" + k)));
      var miss = 0;
      m.slots_missing.forEach(function (x) { miss += (x.need - x.got); });
      return { key: k, name: m.name, n: m.qids.length, planned: m.planned_count, missing: miss, partial: m.partial };
    });
    render();
    toast("데이터 점검을 끝냈습니다.");
  },

  /* ---------- QUICK ---------- */
  quick: function (t) { startQuick(Number(t.getAttribute("data-n")) || 10); },

  /* ---------- 암기카드 ---------- */
  "card-start": function () { startCardRun(cardPlan().queue, "오늘 카드"); },
  "card-start-auto": function () {
    var f = cardFilterObj();
    f.onlyAuto = true;
    startCardRun(C.dueCards(S.cards, S.cardState, todayStr(), { filter: f, limit: todayPlan().cards }).queue,
                 "내 메모리 노트");
  },
  "card-of-q": function (t) {
    var q = S.byQid[t.getAttribute("data-qid")];
    if (!q) { toast("문항 데이터가 없습니다."); return; }
    startCardRun(q.cards || [], "오답 연결 카드");
  },
  "card-list": function () { S.cardListOpen = !S.cardListOpen; S.claudeText = null; render(); },
  "card-flip": function () {
    var R = S.cardRun;
    if (!R || R.done) return;
    R.flipped = !R.flipped;
    render();
  },
  "card-rate": function (t) { rateCard(t.getAttribute("data-r")); },
  "card-skip": function () { advanceCard(); },
  "card-quit": function () { S.cardRun = null; S.screen = "cards"; render({ top: true }); },
  "card-more": function () {
    var R = S.cardRun;
    var left = Math.max(0, todayPlan().cards - cardsSeenToday());
    var more = nextCardBatch(Math.min(10, left), R && R.seen);
    if (!more.length) { toast("지금 더 낼 카드가 없습니다."); return; }
    startCardRun(more, (R && R.label) || "오늘 카드");
  },
  "note-export": function () { exportMemoryNote(); },
  "note-copy": function () { copyText(memoryNote(), "암기노트를 복사했습니다. 메모 앱에 붙여넣으세요."); },

  /* ---------- 프리셋 ---------- */
  preset: function (t) { startPreset(t.getAttribute("data-p")); },
  "preset-cards": function () {
    var p = (S.summary && S.summary.preset) || {};
    if (!p.cids || !p.cids.length) { toast("이어 볼 카드가 없습니다."); return; }
    startCardRun(p.cids, p.ko || "프리셋 카드");
  },

  /* ---------- 모의고사 ---------- */
  "mock-ask": function (t) { S.mockAskStart = t.getAttribute("data-preset"); render(); },
  "mock-cancel": function () { S.mockAskStart = null; render(); },
  "mock-go": function (t) { startMock(t.getAttribute("data-preset")); },
  "mock-resume": function () { resumeMock(); },
  "mock-discard": function () { S.mockAskDiscard = true; render(); },
  "mock-discard-cancel": function () { S.mockAskDiscard = false; render(); },
  "mock-discard-ok": function () {
    clearSession();
    S.quiz = null;
    S.mockPlans = null;
    S.mockAskDiscard = false;
    stopMockTimer();
    toast("진행 중이던 모의고사를 버렸습니다.");
    render();
  },
  "mock-pad": function () { S.mockPad = !S.mockPad; render(); },
  "mock-goto": function (t) { mockGoto(Number(t.getAttribute("data-i")) || 0); },
  "mock-prev": function () { var Q = S.quiz; if (Q) mockGoto(Q.idx - 1); },
  "mock-next": function () { var Q = S.quiz; if (Q) mockGoto(Q.idx + 1); },
  "mock-pick": function (t) {
    var Q = S.quiz;
    if (!Q || Q.mode !== "mock") return;
    var a = mockAnswer();
    a.given = Number(t.getAttribute("data-i"));       // 정수 0~4 (채점은 엄격 비교)
    if (a.conf == null) a.conf = 2;                   // 찍음을 누르지 않으면 '확실'로 본다
    mockAddSec();
    saveSession();
    render();
  },
  "mock-short-done": function () { storeMockShort(); render(); toast("답을 저장했습니다."); },
  "mock-flag": function () {
    var Q = S.quiz;
    if (!Q || Q.mode !== "mock") return;
    storeMockShort();
    var a = mockAnswer();
    a.flag = !a.flag;
    mockAddSec();
    saveSession();
    render();
  },
  "mock-guess": function () {
    var Q = S.quiz;
    if (!Q || Q.mode !== "mock") return;
    storeMockShort();
    var a = mockAnswer();
    a.conf = (a.conf === 0) ? 2 : 0;
    mockAddSec();
    saveSession();
    render();
  },
  "mock-submit": function () { S.mockAskSubmit = true; render({ top: true }); },
  "mock-submit-cancel": function () { S.mockAskSubmit = false; render(); },
  "mock-submit-ok": function () { finishMock(false); },
  "mock-expl": function () { S.mockExplain = !S.mockExplain; render(); },
  "mock-expl-q": function (t) {
    var qid = t.getAttribute("data-qid");
    S.mockExplainQid = (S.mockExplainQid === qid) ? null : qid;
    render();
  },
  "mock-report": function () { copyText(mockReportText()); }
};

function onClick(e) {
  var t = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
  if (!t) return;
  if (t.disabled) return;
  var act = t.getAttribute("data-act");
  if (ACTIONS[act]) { e.preventDefault(); ACTIONS[act](t, e); }
}

function onChange(e) {
  var t = e.target;
  if (!t) return;
  if (t.id === "importFile") { readImportFile(t.files && t.files[0]); return; }
  if (t.hasAttribute && t.hasAttribute("data-f")) {
    var f = t.getAttribute("data-f");
    S.study[f] = (f === "n") ? Number(t.value) : t.value;
    if (f === "subject") S.study.topic = "";
    render();
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-cf")) {
    var cf = t.getAttribute("data-cf");
    S.cardFilter[cf] = (t.type === "checkbox") ? t.checked : t.value;
    if (cf === "subject") S.cardFilter.category = "";   // 과목이 바뀌면 카테고리 목록도 바뀐다
    render();
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-mf")) {
    var mf = t.getAttribute("data-mf");
    S.mfilter[mf] = (t.type === "checkbox") ? t.checked : t.value;
    render();
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-s")) {
    // 검증 먼저, 저장은 그다음 — 잘못된 값이 S.settings에 들어가면
    // 다음 saveAll()/markBackedUp()이 그대로 저장해 버린다.
    var k = t.getAttribute("data-s");
    var raw = t.value;
    var val;
    if (k === "exam_date") {
      var d = C.parseDate(raw);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) || !d || C.today(d) !== String(raw)) {
        t.value = S.settings.exam_date || "";       // 화면을 지금 설정값으로 되돌린다
        toast("날짜를 확인해 주세요.");
        return;
      }
      val = String(raw);
    } else if (k === "daily_minutes") {
      var mins = Number(raw);
      if (!isFinite(mins) || mins <= 0) {
        t.value = String(S.settings.daily_minutes);
        toast("하루 공부 시간을 확인해 주세요.");
        return;
      }
      val = mins;
    } else if (k === "device") {
      if (raw !== "mac" && raw !== "iphone") {
        t.value = String(S.settings.device);
        toast("쓰는 기기를 확인해 주세요.");
        return;
      }
      val = raw;
    } else {
      val = raw;
    }
    S.settings[k] = val;
    saveSettings();
    toast("설정을 저장했습니다.");
    render();
    return;
  }
}

var memoTimer = null;
var memoPending = null;
function flushMemo() {
  if (!memoPending) return;
  var qid = memoPending.qid, val = memoPending.val;
  memoPending = null;
  if (S.mistakes[qid]) { S.mistakes[qid].memo = val; saveMistakes(); }
}
function onInput(e) {
  var t = e.target;
  if (!t) return;
  if (t.id === "resetWord") {
    var go = el("resetGo");
    if (go) go.disabled = (t.value.trim() !== "초기화");
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-memo")) {
    memoPending = { qid: t.getAttribute("data-memo"), val: t.value };
    clearTimeout(memoTimer);
    memoTimer = setTimeout(flushMemo, 400);
    return;
  }
  if (t.classList && t.classList.contains("shortin")) {
    // 자동 저장(다시 그리지 않는다 — 조합 중인 글자를 깨뜨리지 않기 위해)
    if (S.screen === "mockexam") { storeMockShort(); syncMockBar(); return; }
    if (S.quiz && !S.quiz.graded) { storeShortAnswer(); syncQuizButtons(); }
    return;
  }
}

function onKeydown(e) {
  var t = e.target;
  if (!t || !t.classList) return;
  // 카드 앞면(role="button")은 엔터·스페이스로도 뒤집힌다
  if (t.classList.contains("cardface")) {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar" &&
        e.keyCode !== 13 && e.keyCode !== 32) return;
    e.preventDefault();
    if (ACTIONS["card-flip"]) {
      ACTIONS["card-flip"](t, e);
      var face = document.querySelector("#main .cardface");   // 다시 그린 뒤에도 초점을 카드에 둔다
      if (face) face.focus();
    }
    return;
  }
  if (!t.classList.contains("shortin")) return;
  if (e.isComposing || e.keyCode === 229) return;           // 한글 조합 중이면 무시
  if (e.key !== "Enter" && e.keyCode !== 13) return;
  e.preventDefault();
  setTimeout(function () {                                   // 최종 값이 들어온 다음에 처리
    var ins = document.querySelectorAll("#main .shortin");
    for (var i = 0; i < ins.length; i++) {
      if (ins[i] === t && ins[i + 1] && !ins[i + 1].value.trim()) { ins[i + 1].focus(); return; }
    }
    if (S.screen === "mockexam") { storeMockShort(); syncMockBar(); toast("답을 저장했습니다."); return; }
    storeShortAnswer();
    var Q = S.quiz;
    if (!Q) return;
    var a = Q.answers[Q.qids[Q.idx]] || {};
    if (a.conf == null) { render(); toast("자신감(확실·애매·찍음)을 골라 주세요."); return; }
    if (Q.mode === "diag") nextQuestion();
    else submitStudy();
  }, 0);
}

function saveAll() {
  if (!S.settings) return;
  flushMemo();
  saveSettings();
  saveAttempts();
  saveMistakes();
  saveCards();
  if (S.quiz) {
    if (S.quiz.mode === "mock") { storeMockShort(); mockAddSec(); }
    else if (S.quiz.graded === null) storeShortAnswer();
    saveSession();
  }
}

/* ================================================================
 * 8. 시작
 * ================================================================ */
function init() {
  indexData();
  loadState();

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveAll();
  });
  window.addEventListener("pagehide", saveAll);
  window.addEventListener("beforeunload", saveAll);

  S.screen = "home";
  if (!autoSubmitExpiredMock()) render({ top: true });

  if (!S.questions.length) {
    el("main").insertAdjacentHTML("afterbegin",
      '<div class="banner red"><span>문항 데이터를 하나도 읽지 못했습니다. app/data 폴더와 manifest.js를 확인해 주세요.</span></div>');
  }
}

function boot() {
  if (!C) {
    el("main").innerHTML = '<div class="banner red"><span>계산 엔진(core.js)을 읽지 못했습니다. 파일 위치를 확인해 주세요.</span></div>';
    return;
  }
  loadDataFiles(init);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})();
