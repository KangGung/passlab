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
  importPreview: null, importStage: 0,
  resetStage: 0,
  dataCheck: null,
  claudeText: null
};

function loadState() {
  var st = Store.get("settings", null);
  S.settings = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { S.settings[k] = DEFAULT_SETTINGS[k]; });
  if (st && typeof st === "object") {
    Object.keys(st).forEach(function (k) { if (st[k] !== undefined) S.settings[k] = st[k]; });
  }
  S.attempts = Store.get("attempts", []) || [];
  if (!Array.isArray(S.attempts)) S.attempts = [];
  S.mistakes = Store.get("mistakes", {}) || {};
  S.cardState = Store.get("cards", {}) || {};
  S.mocks = Store.get("mocks", []) || [];
  rebuildAttIndex();
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
function saveSession() {
  var Q = S.quiz;
  if (!Q) return;
  Store.set("session", {
    sid: Q.sid, mode: Q.mode, preset: Q.preset, qids: Q.qids, idx: Q.idx,
    answers: Q.answers, startedAt: Q.startedAt, deadlineAt: null, savedAt: nowISO(),
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
    case "mock": html = viewLocked("실전 모의고사", "9/7 저녁 하프 모의고사부터 열립니다."); break;
    case "cards": html = viewLocked("암기카드", "암기카드는 9/8부터 열립니다."); break;
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
  { id: "mock", screens: ["mock"] },
  { id: "mistakes", screens: ["mistakes"] },
  { id: "cards", screens: ["cards"] },
  { id: "settings", screens: ["settings"] }
];
function renderTabs() {
  var due = C.dueMistakes(S.mistakes, todayStr()).length;
  var btns = el("tabbar").querySelectorAll("button[data-tab]");
  for (var i = 0; i < btns.length; i++) {
    var id = btns[i].getAttribute("data-tab");
    var tab = TABS.filter(function (x) { return x.id === id; })[0];
    var on = tab && tab.screens.indexOf(S.screen) !== -1;
    btns[i].classList.toggle("on", !!on);
    if (id === "mistakes") {
      var dot = btns[i].querySelector(".dot");
      if (due > 0 && !dot) {
        dot = document.createElement("span"); dot.className = "dot";
        dot.setAttribute("title", "만기 " + due + "개"); btns[i].appendChild(dot);
      } else if (due === 0 && dot) { dot.parentNode.removeChild(dot); }
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

  // 이어하기
  var sess = Store.get("session", null);
  if (sess && sess.qids && sess.idx < sess.qids.length) {
    h += '<div class="banner blue"><span>풀던 ' + (sess.mode === "diag" ? "진단" : "학습") +
         '이 남아 있습니다 (' + (Number(sess.idx) + 1) + '/' + sess.qids.length + ').</span>' +
         '<button class="btn sm primary" data-act="resume">이어하기</button></div>';
  }

  // 오늘 할 일
  h += '<div class="card"><h2>오늘 할 일 · 하루 ' + esc(String(st.daily_minutes)) + '분</h2>' +
       '<div class="todo">' +
       '<div class="t"><b>' + plan.newQ + '</b><span>새 문제</span></div>' +
       '<div class="t"><b>' + plan.review + '</b><span>복습 만기</span></div>' +
       '<div class="t"><em>9/8부터</em><span>암기카드</span></div>' +
       '</div>' +
       '<p class="small muted mt">만기 오답 ' + due.length + '개 · 학습 국면 ' + esc(plan.phase) + '</p>' +
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

  // 과목 숙달도
  h += '<div class="card"><h2>과목별 숙달도 · 빨간 선 = 과락 40%</h2>';
  (BP.subjects || []).forEach(function (s) {
    var d = C.subjectMasteryDetail(s.id, TOPICS, S.questions, S.attByQid, t);
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
    var tm = C.topicMastery(tp.id, S.questions, S.attByQid, t);
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
         '<p class="small">' + ld.correct + '/' + ld.total + ' 정답 · 예상 ' + ld.est_total + '점 / 1000점</p>' +
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

  if (q.explanation) h += '<div class="ex"><h4>왜 이게 정답인가</h4><p>' + esc(q.explanation) + '</p></div>';
  if (q.memory_sentence) h += '<div class="ex memory"><h4>한 줄 암기</h4><p>' + esc(q.memory_sentence) + '</p></div>';
  if (q.trap) h += '<div class="ex"><h4>함정</h4><p>' + esc(q.trap) + '</p></div>';
  if (q.key_concept) h += '<div class="ex"><h4>핵심 개념</h4><p>' + esc(q.key_concept) + '</p></div>';
  h += '<div class="ex src"><h4>근거</h4><p>' + esc(sourceText(q)) + '</p>' +
       (q.verified === true ? "" : '<p class="mt"><span class="chip gray">미검증 문항 — 근거를 다시 확인해 주세요</span></p>') +
       '</div>';

  // 연결 카드
  var linked = (q.cards || []).map(function (cid) { return S.byCid[cid]; }).filter(Boolean);
  if (linked.length) {
    h += '<div class="ex flash"><h4>연결된 암기카드</h4>';
    linked.forEach(function (c) {
      h += '<p class="f">' + esc(c.front) + '</p><p class="b">→ ' + esc(c.back) + '</p>' +
           (c.mnemonic ? '<p class="small muted">' + esc(c.mnemonic) + '</p>' : "");
    });
    h += '</div>';
  }

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
  var sess = Store.get("session", null);
  if (sess && sess.qids && sess.idx < sess.qids.length) {
    h += '<div class="banner blue"><span>풀던 ' + (sess.mode === "diag" ? "진단" : "학습") +
         '이 남아 있습니다 (' + (Number(sess.idx) + 1) + '/' + sess.qids.length +
         '). 새로 시작하면 지워집니다.</span>' +
         '<button class="btn sm primary" data-act="resume">이어하기</button></div>';
  }

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
  var h = '<h2 style="font-size:22px;margin:14px 0 8px">' + (m.mode === "diag" ? "진단" : "학습") + ' 끝</h2>';
  h += '<div class="card"><div class="todo">' +
       '<div class="t"><b>' + m.n + '</b><span>푼 문항</span></div>' +
       '<div class="t"><b>' + m.correct + '</b><span>정답</span></div>' +
       '<div class="t"><b>' + m.added + '</b><span>오답노트 편입</span></div>' +
       '</div><p class="small muted mt">걸린 시간 ' + esc(fmtDur(m.sec)) +
       ' · 정답률 ' + (m.n ? Math.round(m.correct * 100 / m.n) : 0) + '%</p></div>';
  h += '<div class="acts">' +
       '<button class="btn primary" data-act="study-more">계속 10문항</button>' +
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

/* ---------------- 잠금 화면 ---------------- */
function viewLocked(title, msg) {
  return '<div class="locked"><div class="lk">준비 중</div><h3>' + esc(title) + '</h3>' +
         '<p>' + esc(msg) + '</p>' +
         '<p class="small">지금은 홈·학습·오답노트로 공부해 주세요.</p>' +
         '<div class="acts" style="justify-content:center"><button class="btn narrow" data-act="go-home">홈으로</button></div></div>';
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
       (st.device === "iphone" ? " 아이폰에서는 공유 시트로 파일 앱에 저장하세요." : "") + '</p>';

  if (S.importPreview) {
    var p = S.importPreview;
    h += '<hr class="rule"><div class="banner"><span><b>가져올 파일:</b> ' + esc(p.name) + '<br>' +
         '내보낸 시각 ' + esc(p.exported_at ? fmtDT(p.exported_at) : "알 수 없음") + ' · ' +
         '푼 기록 ' + p.attempts + '개 · 오답 ' + p.mistakes + '개</span></div>';
    if (S.importStage === 1) {
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
    mode: Q.mode === "diag" ? "diag" : ((Q.preset && Q.preset.mode === "due") ? "review" : "study"),
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
function copyText(text) {
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) toast("복사했습니다. 클로드에 붙여넣으세요.");
    else { S.claudeText = text; toast("복사가 막혔습니다. 아래 글을 직접 복사하세요."); render(); }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { toast("복사했습니다. 클로드에 붙여넣으세요."); })
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
      mistakes: d.mistakes ? Object.keys(d.mistakes).length : 0
    };
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
  S.quiz = null; S.diagResult = null; S.summary = null;
  S.importPreview = null; S.importStage = 0;
  toast("가져오기를 마쳤습니다.");
  S.screen = "home";
  render({ top: true });
}
function doReset() {
  KEYS.forEach(function (k) { Store.del(k); });
  loadState();
  S.quiz = null; S.diagResult = null; S.summary = null; S.dataCheck = null;
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
    S.screen = map[id] || "home";
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
  "reset-start": function () { doExport(true); S.resetStage = 1; toast("백업 파일을 먼저 내려받았습니다."); render(); },
  "reset-confirm": function () {
    var w = el("resetWord");
    if (!w || w.value.trim() !== "초기화") { toast("'초기화'라고 정확히 써 주세요."); return; }
    doReset();
  },
  "reset-cancel": function () { S.resetStage = 0; render(); },
  datacheck: function () {
    S.dataCheck = C.dataCheck(S.questions, S.cards, TOPICS);
    render();
    toast("데이터 점검을 끝냈습니다.");
  }
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
  if (t.hasAttribute && t.hasAttribute("data-mf")) {
    var mf = t.getAttribute("data-mf");
    S.mfilter[mf] = (t.type === "checkbox") ? t.checked : t.value;
    render();
    return;
  }
  if (t.hasAttribute && t.hasAttribute("data-s")) {
    var k = t.getAttribute("data-s");
    S.settings[k] = (k === "daily_minutes") ? Number(t.value) : t.value;
    if (k === "exam_date" && !C.parseDate(t.value)) { toast("날짜를 확인해 주세요."); return; }
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
    if (S.quiz && !S.quiz.graded) { storeShortAnswer(); syncQuizButtons(); }
    return;
  }
}

function onKeydown(e) {
  var t = e.target;
  if (!t || !t.classList || !t.classList.contains("shortin")) return;
  if (e.isComposing || e.keyCode === 229) return;           // 한글 조합 중이면 무시
  if (e.key !== "Enter" && e.keyCode !== 13) return;
  e.preventDefault();
  setTimeout(function () {                                   // 최종 값이 들어온 다음에 처리
    var ins = document.querySelectorAll("#main .shortin");
    for (var i = 0; i < ins.length; i++) {
      if (ins[i] === t && ins[i + 1] && !ins[i + 1].value.trim()) { ins[i + 1].focus(); return; }
    }
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
  if (S.quiz) { if (S.quiz.graded === null) storeShortAnswer(); saveSession(); }
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
  render({ top: true });

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
