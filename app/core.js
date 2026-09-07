/* PASS LAB core — 순수 로직(브라우저·Node 공용). DOM·localStorage를 만지지 않는다. */
(function (root) {
  "use strict";
  const PLCore = {};

  /* ================================================================
   * 1. 날짜 유틸 (모두 로컬 시각 기준, 문자열은 "YYYY-MM-DD")
   * ================================================================ */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /** 로컬 기준 오늘 날짜 문자열 */
  function today(now) {
    const d = now instanceof Date ? now : (now == null ? new Date() : new Date(now));
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /** "YYYY-MM-DD" → 로컬 자정 Date */
  function parseDate(dateStr) {
    if (dateStr instanceof Date) return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
    const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  /** attempts의 at(ISO 문자열·타임스탬프·Date) → 로컬 "YYYY-MM-DD"
   *  시각이 붙은 ISO 문자열(특히 …Z, UTC)은 반드시 로컬 날짜로 환산한다.
   *  앞 10글자를 그냥 잘라 쓰면 KST 00:00~09:00에 푼 기록이 "어제"가 된다. */
  function dateOf(at) {
    if (at == null) return null;
    if (at instanceof Date) return today(at);
    if (typeof at === "number") return today(new Date(at));
    const s = String(at).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;      // 시각 없는 순수 날짜만 그대로
    const d = new Date(s);
    if (!isNaN(d.getTime())) return today(d);          // 시각이 있으면 로컬 날짜로
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;   // 파싱 불가 시 최후 보루
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    if (!d) return null;
    d.setDate(d.getDate() + (Number(n) || 0));
    return today(d);
  }

  /** b − a (일) */
  function daysBetween(a, b) {
    const da = parseDate(a), db = parseDate(b);
    if (!da || !db) return null;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  }

  /** 시험까지 남은 일수. 시험 당일 0 */
  function dday(examDate, todayStr) {
    return daysBetween(todayStr || today(), examDate);
  }

  /* ================================================================
   * 2. 단답형 정규화 · 동의어 · 편집거리
   * ================================================================ */
  const UNIT_TAIL = /(?:\d(?:퍼센트|프로)|밀리그램|마이크로그램)$/;
  const JOSA = ["입니다", "이다", "으로", "은", "는", "이", "가", "을", "를", "의", "에", "로", "임", "함"];

  /** 단답 정규화 8단계(설계서 순서 그대로) */
  function normalizeShort(s) {
    if (s == null) return "";
    let t = String(s);

    // (1) 앞뒤·중간 공백 전부 제거
    t = t.replace(/\s+/g, "");

    // (2) 전각 영숫자·기호 → 반각
    t = t.replace(/[！-～]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });

    // (3) 영문 소문자
    t = t.toLowerCase();

    // (4) 중점·빗금 통일
    t = t.replace(/[·ㆍ•∙･・]/g, "·").replace(/／/g, "/");

    // (5) 괄호와 괄호 안 내용 제거
    t = t.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "")
         .replace(/（[^）]*）/g, "").replace(/【[^】]*】/g, "");

    // (6) 끝 조사·어미 제거 (한 번만, 뒤에서)
    //     단, 뒤에 오는 단위 낱말(0.5프로 등)을 자르지 않는다.
    if (!UNIT_TAIL.test(t)) for (let i = 0; i < JOSA.length; i++) {
      const j = JOSA[i];
      if (t.length > j.length && t.slice(-j.length) === j) { t = t.slice(0, -j.length); break; }
    }

    // (7) 단위 통일
    t = t.replace(/마이크로그램\/g/g, "㎍").replace(/ug\/g/g, "㎍").replace(/㎍\/g/g, "㎍");
    if (t.indexOf("㎍") !== -1 && t.indexOf("㎍/g") === -1) t = t.replace(/㎍(?!\/g)/g, "㎍/g");
    t = t.replace(/퍼센트/g, "%").replace(/(\d)프로(?![가-힣a-z])/g, "$1%").replace(/％/g, "%");
    t = t.replace(/밀리그램/g, "mg");

    // (8) 숫자 통일
    let prev;
    do { prev = t; t = t.replace(/(\d),(?=\d{3}(?!\d))/g, "$1"); } while (t !== prev);
    t = t.replace(/(\d*\.\d*?)0+(?!\d)/g, "$1").replace(/(\d)\.(?!\d)/g, "$1");
    t = t.replace(/(^|[^\d])\.(\d)/g, function (m, p1, p2) { return p1 + "0." + p2; });
    t = t.replace(/(\d*\.\d*?)0+(?!\d)/g, "$1").replace(/(\d)\.(?!\d)/g, "$1");

    return t;
  }

  /** 표기 변형 쌍. 각 쌍의 두 표기를 첫 표기로 통일한다. */
  const SYNONYMS = [
    ["메칠", "메틸"], ["에칠", "에틸"], ["부칠", "부틸"], ["프로필", "프로필"],
    ["애씨드", "산"], ["소듐", "나트륨"], ["포타슘", "칼륨"], ["징크", "아연"],
    ["티타늄디옥사이드", "이산화티타늄"], ["살리실릭애씨드", "살리실산"],
    ["벤조익애씨드", "벤조산"], ["소르빅애씨드", "소르빈산"]
  ];
  // 짧은 표기("산")가 긴 표기("살리실산")를 먼저 먹지 않도록 긴 것부터 치환한다.
  const SYNONYMS_ORDERED = SYNONYMS.slice().sort(function (a, b) { return b[1].length - a[1].length; });

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function applySynonyms(s) {
    let t = String(s == null ? "" : s);
    for (let i = 0; i < SYNONYMS_ORDERED.length; i++) {
      const pair = SYNONYMS_ORDERED[i];
      if (pair[0] === pair[1]) continue;
      t = t.replace(new RegExp(escapeRe(pair[1]), "g"), pair[0]);
    }
    return t;
  }

  /** 편집거리(Levenshtein) */
  function levenshtein(a, b) {
    a = String(a == null ? "" : a);
    b = String(b == null ? "" : b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    let cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }

  PLCore.today = today;
  PLCore.parseDate = parseDate;
  PLCore.dateOf = dateOf;
  PLCore.addDays = addDays;
  PLCore.daysBetween = daysBetween;
  PLCore.dday = dday;
  PLCore.normalizeShort = normalizeShort;
  PLCore.SYNONYMS = SYNONYMS;
  PLCore.applySynonyms = applySynonyms;
  PLCore.levenshtein = levenshtein;

  /* ================================================================
   * 3. 단답형·선다형 채점
   * ================================================================ */
  // 숫자 뒤에 붙는 단위 토큰(긴 것부터). q.unit이 있을 때만 검사한다.
  const UNIT_RE = /\d\s*(㎍\/g|개\/g|mg\/g|mg|kg|ppm|시간|개월|%|ml|일|년|분|g|l|℃)/g;

  function unitsIn(s) {
    const out = [];
    let m;
    UNIT_RE.lastIndex = 0;
    while ((m = UNIT_RE.exec(s)) !== null) out.push(m[1]);
    return out;
  }

  function stripUnit(s, unit) {
    if (!unit) return s;
    return s.split(unit).join("");
  }

  function hasHangul(s) { return /[가-힣]/.test(s); }

  /** 정규화된 입력 1개를 정규화된 정답 후보들과 4단으로 대조 */
  function matchOne(normInput, normAnswers, strictTerm) {
    if (!normInput) return { stage: 4, correct: false };
    for (let i = 0; i < normAnswers.length; i++) {
      if (normInput === normAnswers[i]) return { stage: 1, correct: true };
    }
    if (strictTerm !== true) {
      const si = applySynonyms(normInput);
      for (let i = 0; i < normAnswers.length; i++) {
        if (si === applySynonyms(normAnswers[i])) return { stage: 2, correct: true };
      }
    }
    if (normInput.length >= 5 && hasHangul(normInput)) {
      for (let i = 0; i < normAnswers.length; i++) {
        if (levenshtein(normInput, normAnswers[i]) <= 1) return { stage: 3, correct: false, nearMiss: true };
      }
    }
    return { stage: 4, correct: false, needSelfMark: true };
  }

  // 열거형(grade:"set") 답의 분리자: 쉼표·모점·빗금·쌍반점·줄바꿈.
  // **공백은 분리자가 아니다** — "화장품의 명칭"처럼 항목 안에 공백이 들어가는 답이 있기 때문이다.
  // 항목 안 공백은 normalizeShort가 지우므로 "화장품의 명칭"과 "화장품의명칭"은 같게 채점된다.
  const SET_SPLIT_RE = /[,、\/;\r\n]+/;

  function splitSet(raw) {
    return String(raw == null ? "" : raw)
      .split(SET_SPLIT_RE)
      .map(function (x) { return normalizeShort(x.trim()); })
      .filter(function (x) { return x.length > 0; });
  }

  /**
   * 단답형 채점.
   * @returns {{correct:boolean, stage:number, nearMiss:boolean, blanks:Array|null,
   *            needSelfMark:boolean, normalized:(string|string[])}}
   */
  function gradeShort(q, input) {
    q = q || {};

    /* 복수 빈칸: 빈칸별 ○×, 전부 맞아야 정답 */
    if (Array.isArray(q.blanks) && q.blanks.length) {
      const given = Array.isArray(input) ? input : [input];
      const blanks = [];
      const normalized = [];
      let stage = 1;
      for (let i = 0; i < q.blanks.length; i++) {
        const b = q.blanks[i] || {};
        const ni = normalizeShort(given[i]);
        const answers = (b.accepted || []).map(normalizeShort);
        const r = matchOne(ni, answers, q.strict_term);
        blanks.push({ label: b.label != null ? b.label : String(i + 1), ok: r.correct === true, stage: r.stage });
        normalized.push(ni);
        if (r.stage > stage) stage = r.stage;
      }
      const correct = blanks.every(function (b) { return b.ok; });
      return {
        correct: correct,
        stage: correct ? Math.min(stage, 2) : stage,
        nearMiss: blanks.some(function (b) { return b.stage === 3; }),
        needSelfMark: !correct && blanks.some(function (b) { return b.stage === 4; }),
        blanks: blanks,
        normalized: normalized
      };
    }

    const answersRaw = Array.isArray(q.answer_text) ? q.answer_text : [];

    /* 열거형: 순서 무관 집합 비교 */
    if (q.grade === "set") {
      const inTokens = splitSet(input);
      // answer_text도 같은 방식으로 쪼갠다(한 칸에 "가, 나, 다"를 몰아 써도 되게)
      const ansTokens = [];
      answersRaw.forEach(function (a) {
        splitSet(a).forEach(function (tok) { ansTokens.push(tok); });
      });
      const eq = function (a, b) {
        if (a.length !== b.length) return false;
        const bb = b.slice();
        for (let i = 0; i < a.length; i++) {
          const k = bb.indexOf(a[i]);
          if (k === -1) return false;
          bb.splice(k, 1);
        }
        return true;
      };
      let stage = 4, correct = false;
      if (eq(inTokens, ansTokens)) { stage = 1; correct = true; }
      else if (q.strict_term !== true && eq(inTokens.map(applySynonyms), ansTokens.map(applySynonyms))) { stage = 2; correct = true; }
      return {
        correct: correct, stage: stage, nearMiss: false,
        needSelfMark: !correct, blanks: null, normalized: inTokens
      };
    }

    /* 단일 답 */
    let ni = normalizeShort(input);
    const normalized = ni;
    let answers = answersRaw.map(normalizeShort);

    if (q.unit) {
      const found = unitsIn(ni);
      const wrongUnit = found.some(function (u) { return u !== q.unit; });
      if (wrongUnit) {
        return { correct: false, stage: 4, nearMiss: false, needSelfMark: true, blanks: null, normalized: normalized };
      }
      ni = stripUnit(ni, q.unit);
      answers = answers.map(function (a) { return stripUnit(a, q.unit); });
    }

    const r = matchOne(ni, answers, q.strict_term);
    return {
      correct: r.correct === true,
      stage: r.stage,
      nearMiss: r.nearMiss === true,
      needSelfMark: r.needSelfMark === true,
      blanks: null,
      normalized: normalized
    };
  }

  /** 선다형 채점 */
  function gradeMcq(q, given) {
    return given === (q ? q.answer : undefined) && given !== null && given !== undefined;
  }

  /** 시도 1회 점수 0~1 */
  function attemptScore(a, q) {
    if (!a || a.correct !== true) return 0;
    if (a.self_marked === true) return 0.15;
    let s = a.conf === 2 ? 1.0 : (a.conf === 1 ? 0.6 : 0.15);
    const limit = (q && q.type === "short") ? 135 : 108;
    if (typeof a.sec === "number" && a.sec > limit) s = s * 0.8;
    return s;
  }

  PLCore.gradeShort = gradeShort;
  PLCore.gradeMcq = gradeMcq;
  PLCore.attemptScore = attemptScore;

  /* ================================================================
   * 4. 숙달도 (attempts에서 매번 다시 계산)
   * ================================================================ */
  function timeOf(a) {
    if (!a || a.at == null) return 0;
    if (a.at instanceof Date) return a.at.getTime();
    if (typeof a.at === "number") return a.at;
    const t = Date.parse(a.at);
    return isNaN(t) ? 0 : t;
  }

  function sortedAtts(atts) {
    return (Array.isArray(atts) ? atts.slice() : []).sort(function (x, y) { return timeOf(x) - timeOf(y); });
  }

  const MASTERY_WEIGHTS = [1.0, 0.6, 0.3];

  /** 문항 숙달도 0~100. 시도가 없으면 null */
  function questionMastery(atts, q, todayStr) {
    const list = sortedAtts(atts);
    if (!list.length) return null;
    const recent = list.slice(-3).reverse();           // 최근 것부터
    let num = 0, den = 0;
    for (let i = 0; i < recent.length; i++) {
      num += MASTERY_WEIGHTS[i] * attemptScore(recent[i], q);
      den += MASTERY_WEIGHTS[i];
    }
    let v = (num / den) * 100;
    if (list.length === 1) v = Math.min(v, 70);
    else if (list.length === 2) v = Math.min(v, 90);
    const lastDate = dateOf(list[list.length - 1].at);
    const d = lastDate ? daysBetween(lastDate, todayStr || today()) : 0;
    if (d > 0) v = v * Math.max(0.6, 1 - 0.05 * d);
    return v;
  }

  /** 숙달 = 80 이상 + 최근 2회 정답 + 그 2회 찍음·자기판정 없음 */
  function isMastered(atts, q, todayStr) {
    const list = sortedAtts(atts);
    if (list.length < 2) return false;
    const m = questionMastery(list, q, todayStr);
    if (m === null || m < 80) return false;
    return list.slice(-2).every(function (a) {
      return a.correct === true && a.conf !== 0 && a.self_marked !== true;
    });
  }

  /** 세부항목 숙달 = 시도 문항 숙달 평균 × min(1, n/4) */
  function topicMastery(topicId, questions, attemptsByQid, todayStr) {
    const map = attemptsByQid || {};
    const vals = [];
    const qs = Array.isArray(questions) ? questions : [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q || q.topic !== topicId) continue;
      const a = map[q.id];
      if (!a || !a.length) continue;
      const m = questionMastery(a, q, todayStr);
      if (m === null) continue;
      vals.push(m);
    }
    const n = vals.length;
    if (n === 0) return { value: null, n: 0, measuring: true };
    let sum = 0;
    for (let i = 0; i < n; i++) sum += vals[i];
    return { value: (sum / n) * Math.min(1, n / 4), n: n, measuring: n < 4 };
  }

  /** 과목 숙달 상세(UI용): 값 + 토픽별 내역 + 측정 중 여부 */
  function subjectMasteryDetail(subjectId, topics, questions, attemptsByQid, todayStr) {
    const subs = (Array.isArray(topics) ? topics : []).filter(function (t) {
      return t && t.kind === "sub" && Number(t.subject) === Number(subjectId);
    });
    const byTopic = [];
    let num = 0, den = 0, attempted = 0;
    for (let i = 0; i < subs.length; i++) {
      const t = subs[i];
      const tm = topicMastery(t.id, questions, attemptsByQid, todayStr);
      const w = (typeof t.exp_q === "number" && t.exp_q > 0) ? t.exp_q : 1;
      const used = tm.value === null ? 20 : tm.value;
      if (tm.n > 0) attempted++;
      byTopic.push({ id: t.id, name: t.name, exp_q: w, value: tm.value, used: used, n: tm.n, measuring: tm.measuring });
      num += used * w;
      den += w;
    }
    return {
      value: den > 0 ? num / den : null,
      byTopic: byTopic,
      attemptedTopics: attempted,
      totalTopics: subs.length,
      measuring: attempted === 0
    };
  }

  /** 과목 숙달 = 세부항목 숙달의 exp_q 가중 평균(미시도 토픽 20) */
  function subjectMastery(subjectId, topics, questions, attemptsByQid, todayStr) {
    return subjectMasteryDetail(subjectId, topics, questions, attemptsByQid, todayStr).value;
  }

  PLCore.questionMastery = questionMastery;
  PLCore.isMastered = isMastered;
  PLCore.topicMastery = topicMastery;
  PLCore.subjectMastery = subjectMastery;
  PLCore.subjectMasteryDetail = subjectMasteryDetail;

  /* ================================================================
   * 5. 오답 단계 전이 (new → reviewing → graduated)
   * ================================================================ */
  // 오답 재출제 사다리(CLAUDE.md 「학습 알고리즘 상수」): 첫 오답 +1일 → +3일 → +6일.
  // 정답·확실이면 한 칸 오르고(1 → 3 → 6), 6에서 멈춘다.
  // 정답·애매는 칸을 올리지 않는다 — interval은 그대로 두고 다음 복습만 today+2로 잡는다.
  // 이 위에 스프린트 D-3 상한(next ≤ 내일)이 따로 걸린다.
  const MISTAKE_LADDER = [1, 3, 6];
  const MISTAKE_MAX_INTERVAL = 6;

  /**
   * 시도 1회를 오답 기록에 반영해 **새 객체**를 만든다(원본 불변).
   * @param {object|null} m   기존 mistakes[qid] (없으면 null)
   * @param {object} a        attempts 항목
   * @param {object} q        문항
   * @param {{todayStr:string, examDate:string, track:string}} ctx
   */
  function applyAttemptToMistake(m, a, q, ctx) {
    ctx = ctx || {};
    const t = ctx.todayStr || today();
    const correct = !!(a && a.correct === true);
    const conf = a ? a.conf : undefined;
    const selfMarked = !!(a && a.self_marked === true);

    // 스프린트 D-3 규칙: 시험 3일 전부터 다음 복습일은 내일 이하
    function capNext(next) {
      if (!next || !ctx.examDate) return next;
      const dd = dday(ctx.examDate, t);
      if (dd == null || dd > 3) return next;
      const limit = addDays(t, 1);
      return next > limit ? limit : next;
    }

    // 자기 판정으로 "같은 뜻"이라 한 정답: 숙달 불인정 → 단계도 올리지 않는다
    if (correct && selfMarked) {
      return m ? Object.assign({}, m, { last: t }) : null;
    }

    // 오답 또는 (정답 AND 찍음)
    if (!correct || conf === 0) {
      const guessedNow = (correct && conf === 0) ? 1 : 0;
      if (!m) {
        return {
          count: 1, last: t, stage: "new", streak: 0, next: capNext(addDays(t, 1)),
          interval: 1, lastWrong: t, guessed: guessedNow, relapse: false, memo: ""
        };
      }
      const wasGraduated = m.stage === "graduated";
      return Object.assign({}, m, {
        count: (m.count || 0) + 1,
        last: t,
        stage: wasGraduated ? "reviewing" : (m.stage || "new"),
        streak: 0,
        next: capNext(addDays(t, 1)),
        interval: 1,
        lastWrong: t,
        guessed: (m.guessed || 0) + guessedNow,
        relapse: wasGraduated ? true : (m.relapse === true),
        memo: m.memo || ""
      });
    }

    // 정답·확실 / 정답·애매
    if (!m) return null;                       // 오답 이력이 없으면 오답노트를 만들지 않는다
    const streak = (m.streak || 0) + 1;
    const gap = m.lastWrong ? daysBetween(m.lastWrong, t) : null;
    const differentDay = m.last !== t;         // 두 정답이 서로 다른 날인가
    if (m.stage === "reviewing" && streak >= 2 && gap != null && gap >= 3 && differentDay) {
      return Object.assign({}, m, { last: t, stage: "graduated", streak: streak, next: null, memo: m.memo || "" });
    }
    const rung = Math.max(1, Number(m.interval) || 1);
    const nextRung = MISTAKE_LADDER.find(function (v) { return v > rung; });
    const step = conf === 2 ? (nextRung || MISTAKE_MAX_INTERVAL) : 2;   // 애매는 항상 +2일
    const stage = m.stage === "new" ? "reviewing" : (m.stage || "reviewing");
    return Object.assign({}, m, {
      last: t,
      stage: stage,
      streak: streak,
      interval: conf === 2 ? step : rung,      // 애매는 사다리 칸을 유지한다
      next: stage === "graduated" ? null : capNext(addDays(t, step)),
      memo: m.memo || ""
    });
  }

  /** 오늘 만기인 오답 qid 목록(졸업 제외, 만기일 순) */
  function dueMistakes(mistakes, todayStr) {
    const t = todayStr || today();
    const map = mistakes || {};
    const out = Object.keys(map).filter(function (qid) {
      const e = map[qid];
      return !!e && e.stage !== "graduated" && !!e.next && e.next <= t;
    });
    out.sort(function (x, y) {
      const nx = map[x].next, ny = map[y].next;
      if (nx !== ny) return nx < ny ? -1 : 1;
      return x < y ? -1 : (x > y ? 1 : 0);
    });
    return out;
  }

  PLCore.applyAttemptToMistake = applyAttemptToMistake;
  PLCore.dueMistakes = dueMistakes;

  /* ================================================================
   * 6. 난수 · 세트 구성
   * ================================================================ */
  /** mulberry32 — 같은 seed면 같은 수열 */
  function seededRandom(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** 원본을 건드리지 않는 Fisher-Yates */
  function shuffle(arr, rng) {
    const r = typeof rng === "function" ? rng : Math.random;
    const out = (Array.isArray(arr) ? arr : []).slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /**
   * 진단 30문항 구성.
   * 과목별 문항 수·단답 수·난이도 비율은 blueprint.diagnostic에서 읽는다.
   * 같은 세부항목 최대 2문항, exp_q 큰 토픽부터 1개씩 순회.
   * @returns {{qids:string[], warnings:string[]}}
   */
  function buildDiagnostic(questions, topics, blueprint, rng) {
    const r = typeof rng === "function" ? rng : seededRandom(20260919);
    const bp = blueprint || {};
    const diag = bp.diagnostic || {};
    const bySub = diag.by_subject || { "1": 3, "2": 8, "3": 7, "4": 12 };
    const shortBySub = diag.short_by_subject || {};
    const mix = diag.difficulty_mix || { "2": 0.3, "3": 0.5, "4": 0.2 };
    const allQ = Array.isArray(questions) ? questions : [];
    const allT = Array.isArray(topics) ? topics : [];
    const subjectIds = (bp.subjects || []).length
      ? bp.subjects.map(function (s) { return s.id; })
      : Object.keys(bySub).map(Number).sort(function (a, b) { return a - b; });

    const used = new Set();
    const qids = [];
    const warnings = [];

    subjectIds.forEach(function (sid) {
      const need = Number(bySub[String(sid)] || 0);
      if (!need) return;
      const needShort = Number(shortBySub[String(sid)] || 0);

      let topicOrder = allT
        .filter(function (t) { return t && t.kind === "sub" && Number(t.subject) === Number(sid); })
        .slice()
        .sort(function (a, b) {
          const d = (Number(b.exp_q) || 0) - (Number(a.exp_q) || 0);
          return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
        })
        .map(function (t) { return t.id; });
      if (!topicOrder.length) {
        topicOrder = Array.from(new Set(allQ
          .filter(function (q) { return q && Number(q.subject) === Number(sid); })
          .map(function (q) { return q.topic; })));
      }

      const byTopic = new Map();
      allQ.forEach(function (q) {
        if (!q || Number(q.subject) !== Number(sid) || used.has(q.id)) return;
        if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
        byTopic.get(q.topic).push(q);
      });

      // 난이도 쿼터 2/3/4 ≈ 30/50/20
      let d2 = Math.round(need * (mix["2"] != null ? mix["2"] : 0.3));
      let d3 = Math.round(need * (mix["3"] != null ? mix["3"] : 0.5));
      let d4 = need - d2 - d3;
      if (d4 < 0) { d3 += d4; d4 = 0; }
      if (d3 < 0) { d2 += d3; d3 = 0; }
      const quota = { 2: d2, 3: d3, 4: d4 };

      function distRank(d) {
        const dv = Number(d) || 3;
        let best = 99;
        [2, 3, 4].forEach(function (k) { if (quota[k] > 0) best = Math.min(best, Math.abs(dv - k)); });
        return best === 99 ? Math.abs(dv - 3) : best;
      }

      const perTopic = new Map();
      const picked = [];

      function takeFrom(topicId, wantType, relax) {
        let cands = (byTopic.get(topicId) || []).filter(function (q) {
          return !used.has(q.id) && (!wantType || q.type === wantType);
        });
        if (!cands.length) return null;
        cands = shuffle(cands, r);                       // seed에 따라 결정적으로 섞는다
        if (!relax) {
          cands = cands.filter(function (q) { return (quota[Number(q.difficulty)] || 0) > 0; });
          if (!cands.length) return null;
        } else {
          cands = cands.slice().sort(function (a, b) { return distRank(a.difficulty) - distRank(b.difficulty); });
        }
        return cands[0];
      }

      function fill(wantType, target) {
        for (let relax = 0; relax <= 1; relax++) {
          let progressed = true;
          while (picked.length < target && progressed) {
            progressed = false;
            for (let i = 0; i < topicOrder.length && picked.length < target; i++) {
              const tid = topicOrder[i];
              if ((perTopic.get(tid) || 0) >= 2) continue;   // 같은 세부항목 최대 2문항
              const q = takeFrom(tid, wantType, relax);
              if (!q) continue;
              used.add(q.id);
              picked.push(q);
              perTopic.set(tid, (perTopic.get(tid) || 0) + 1);
              const d = Number(q.difficulty);
              if (quota[d] > 0) quota[d] -= 1;
              progressed = true;
            }
          }
        }
      }

      fill("short", Math.min(needShort, need));
      const gotShort = picked.filter(function (q) { return q.type === "short"; }).length;
      fill("mcq", need);
      fill(null, need);

      if (gotShort < needShort) {
        warnings.push("과목 " + sid + " 단답 부족: 필요 " + needShort + ", 확보 " + gotShort + " (선다로 대체)");
      }
      if (picked.length < need) {
        warnings.push("과목 " + sid + " 문항 부족: 필요 " + need + ", 확보 " + picked.length);
      }
      picked.forEach(function (q) { qids.push(q.id); });
    });

    const total = Number(diag.total || 0);
    if (total && qids.length < total) {
      warnings.push("진단 " + total + "문항 미달: 확보 " + qids.length);
    }
    return { qids: qids, warnings: warnings };
  }

  /**
   * 학습 세트 구성.
   * @param {object} opts { subject|null, topic|null, type:"all|mcq|short", n:10, mode:"new|due|mixed", todayStr? }
   * @returns {string[]} qid 배열(중복 없음)
   */
  function buildStudySet(questions, opts, attemptsByQid, mistakes, rng) {
    const o = opts || {};
    const n = Number(o.n) > 0 ? Number(o.n) : 10;
    const mode = o.mode || "new";
    const type = o.type || "all";
    const r = typeof rng === "function" ? rng : seededRandom(20260919);
    const byQid = attemptsByQid || {};

    const pool = (Array.isArray(questions) ? questions : []).filter(function (q) {
      if (!q) return false;
      if (o.subject != null && Number(q.subject) !== Number(o.subject)) return false;
      if (o.topic != null && q.topic !== o.topic) return false;
      if (type === "mcq" && q.type !== "mcq") return false;
      if (type === "short" && q.type !== "short") return false;
      return true;
    });
    const inPool = new Set(pool.map(function (q) { return q.id; }));

    const isTried = function (id) { return !!(byQid[id] && byQid[id].length); };
    const untried = shuffle(pool.filter(function (q) { return !isTried(q.id); }), r).map(function (q) { return q.id; });
    const tried = shuffle(pool.filter(function (q) { return isTried(q.id); }), r).map(function (q) { return q.id; });
    const due = dueMistakes(mistakes, o.todayStr).filter(function (id) { return inPool.has(id); });

    const out = [];
    const seen = new Set();
    const push = function (list, limit) {
      for (let i = 0; i < list.length && out.length < limit; i++) {
        const id = list[i];
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
    };

    if (mode === "due") {
      push(due, n);
    } else if (mode === "mixed") {
      push(due, Math.min(n, Math.ceil(n / 2)));
      push(untried, n);
      push(due, n);
      push(tried, n);
    } else {
      push(untried, n);
      push(tried, n);
    }
    return out;
  }

  PLCore.seededRandom = seededRandom;
  PLCore.shuffle = shuffle;
  PLCore.buildDiagnostic = buildDiagnostic;
  PLCore.buildStudySet = buildStudySet;

  /* ================================================================
   * 7. 합격 판정 · 진단 결과
   * ================================================================ */
  function slotPoints(slot) {
    let sum = 0;
    Object.keys(slot || {}).forEach(function (p) { sum += Number(p) * Number(slot[p] || 0); });
    return sum;
  }

  /**
   * 합격 판정. 총점 600 이상 AND 과목별 40% 이상.
   * @param {Object} subjectPoints { 1:n, 2:n, 3:n, 4:n }
   */
  function judgePass(subjectPoints, blueprint) {
    const bp = blueprint || {};
    const subs = bp.subjects || [];
    const sp = subjectPoints || {};
    const bySubject = subs.map(function (s) {
      const raw = sp[s.id] != null ? sp[s.id] : sp[String(s.id)];
      const points = Number(raw) || 0;
      return {
        id: s.id, points: points, max: s.points,
        pass_points: s.pass_points, pass: points >= s.pass_points
      };
    });
    let total = 0;
    bySubject.forEach(function (x) { total += x.points; });
    const failSubjects = bySubject.filter(function (x) { return !x.pass; }).map(function (x) { return x.id; });
    const passTotal = (bp.exam && bp.exam.pass_total != null) ? bp.exam.pass_total : 600;
    return {
      total: total,
      pass: total >= passTotal && failSubjects.length === 0,
      failSubjects: failSubjects,
      bySubject: bySubject
    };
  }

  const DIAG_NOTE = "진단 30문항 기준 초기 추정(신뢰 낮음)";

  /**
   * 진단 결과 집계.
   * @param {string[]} qids
   * @param {Object} answers { qid: { correct, conf } }
   */
  function diagnosticResult(qids, answers, questions, blueprint, topics) {
    const bp = blueprint || {};
    const subs = bp.subjects || [];
    const ans = answers || {};
    const byId = new Map();
    (Array.isArray(questions) ? questions : []).forEach(function (q) { if (q) byId.set(q.id, q); });
    const tName = new Map();
    (Array.isArray(topics) ? topics : []).forEach(function (t) { if (t) tName.set(t.id, t.name); });

    const subjectAgg = {};
    const topicAgg = {};
    (Array.isArray(qids) ? qids : []).forEach(function (id) {
      const q = byId.get(id);
      if (!q) return;
      const a = ans[id];
      if (!a) return;
      const ok = a.correct === true;
      const sid = Number(q.subject);
      if (!subjectAgg[sid]) subjectAgg[sid] = { n: 0, correct: 0, mcqN: 0, mcqC: 0, shortN: 0, shortC: 0 };
      const S = subjectAgg[sid];
      S.n += 1; if (ok) S.correct += 1;
      if (q.type === "short") { S.shortN += 1; if (ok) S.shortC += 1; }
      else { S.mcqN += 1; if (ok) S.mcqC += 1; }
      if (!topicAgg[q.topic]) topicAgg[q.topic] = { n: 0, correct: 0 };
      topicAgg[q.topic].n += 1;
      if (ok) topicAgg[q.topic].correct += 1;
    });

    let estTotal = 0;
    const bySubject = subs.map(function (s) {
      const S = subjectAgg[s.id] || { n: 0, correct: 0, mcqN: 0, mcqC: 0, shortN: 0, shortC: 0 };
      const slots = s.slots || {};
      const mcqPts = slotPoints(slots.mcq);
      const shortPts = slotPoints(slots.short);
      const totalPts = (mcqPts + shortPts) || Number(s.points) || 0;
      const mcqShare = totalPts ? mcqPts / totalPts : 1;
      const shortShare = totalPts ? shortPts / totalPts : 0;
      const mcqRate = S.mcqN ? S.mcqC / S.mcqN : 0;
      // 단답을 한 문항도 안 물었으면 선다 정답률로 대신한다(과소 추정 방지)
      const shortRate = S.shortN ? S.shortC / S.shortN : mcqRate;
      const est = S.n ? Math.round(Number(s.points) * (mcqRate * mcqShare + 0.85 * shortRate * shortShare)) : 0;
      const pct = S.n ? (S.correct * 100) / S.n : null;
      const risk = S.n < 3 ? "unmeasured" : (pct >= 55 ? "safe" : (pct >= 45 ? "warn" : "danger"));
      estTotal += est;
      return {
        id: s.id, name: s.name, n: S.n, correct: S.correct, pct: pct,
        est_points: est, max: s.points, pass_points: s.pass_points, risk: risk
      };
    });

    const weakTopics = Object.keys(topicAgg)
      .filter(function (id) { return topicAgg[id].n >= 1; })
      .map(function (id) {
        const T = topicAgg[id];
        return { id: id, name: tName.get(id) || id, n: T.n, correct: T.correct, pct: (T.correct * 100) / T.n };
      })
      .sort(function (a, b) { return (a.pct - b.pct) || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)); })
      .slice(0, 5);

    return { bySubject: bySubject, weakTopics: weakTopics, est_total: estTotal, est_note: DIAG_NOTE };
  }

  /* ================================================================
   * 8. 데이터 점검
   * ================================================================ */
  const VALID_POINTS = [8, 12, 18];

  function dataCheck(questions, cards, topics) {
    const qs = Array.isArray(questions) ? questions : [];
    const cs = Array.isArray(cards) ? cards : [];
    const topicIds = new Set();
    (Array.isArray(topics) ? topics : []).forEach(function (t) { if (t && t.id) topicIds.add(t.id); });

    const bySubject = {};
    function ensure(sid) {
      if (!bySubject[sid]) bySubject[sid] = { total: 0, mcq: 0, short: 0, points: { 8: 0, 12: 0, 18: 0 }, verified: 0 };
      return bySubject[sid];
    }
    [1, 2, 3, 4].forEach(ensure);

    const cardsBySubject = {};
    [1, 2, 3, 4].forEach(function (s) { cardsBySubject[s] = 0; });

    const seen = new Map();
    const duplicates = [], badAnswer = [], badChoices = [], badWrongExpl = [], badPoints = [],
          missingSource = [], missingMemory = [], unknownTopic = [];
    let verified = 0;

    qs.forEach(function (q) {
      if (!q) return;
      const S = ensure(Number(q.subject));
      S.total += 1;
      if (q.type === "short") S.short += 1; else S.mcq += 1;
      if (S.points[Number(q.points)] != null) S.points[Number(q.points)] += 1;
      if (q.verified === true) { S.verified += 1; verified += 1; }

      const c = (seen.get(q.id) || 0) + 1;
      seen.set(q.id, c);
      if (c === 2) duplicates.push(q.id);

      if (q.type === "mcq") {
        if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 4)) badAnswer.push(q.id);
        if (!Array.isArray(q.choices) || q.choices.length !== 5) badChoices.push(q.id);
        if (!Array.isArray(q.wrong_option_explanations) || q.wrong_option_explanations.length !== 5) badWrongExpl.push(q.id);
      } else {
        const hasText = Array.isArray(q.answer_text) && q.answer_text.length > 0;
        const hasBlanks = Array.isArray(q.blanks) && q.blanks.length > 0;
        if (!hasText && !hasBlanks) badAnswer.push(q.id);
        if (Array.isArray(q.choices) && q.choices.length > 0) badChoices.push(q.id);
      }
      if (VALID_POINTS.indexOf(Number(q.points)) === -1) badPoints.push(q.id);
      const src = q.source || {};
      if (!src.law && !src.guide) missingSource.push(q.id);
      if (!q.memory_sentence || !String(q.memory_sentence).trim()) missingMemory.push(q.id);
      if (!q.topic || !topicIds.has(q.topic)) unknownTopic.push(q.id);
    });

    cs.forEach(function (c) {
      if (!c) return;
      const sid = Number(c.subject);
      cardsBySubject[sid] = (cardsBySubject[sid] || 0) + 1;
    });

    const ok = !duplicates.length && !badAnswer.length && !badChoices.length && !badWrongExpl.length &&
               !badPoints.length && !missingSource.length && !missingMemory.length && !unknownTopic.length;

    return {
      total: qs.length,
      bySubject: bySubject,
      duplicates: duplicates,
      badAnswer: badAnswer,
      badChoices: badChoices,
      badWrongExpl: badWrongExpl,
      badPoints: badPoints,
      missingSource: missingSource,
      missingMemory: missingMemory,
      unknownTopic: unknownTopic,
      cards: { total: cs.length, bySubject: cardsBySubject },
      verifiedRatio: qs.length ? verified / qs.length : 0,
      ok: ok
    };
  }

  /* ================================================================
   * 9. 하루 학습량
   * ================================================================ */
  // 국면별 (문제 / 오답 / 카드) 비중 %
  const PHASES = [
    { phase: "early", minD: 11, q: 60, review: 25, cards: 15 },
    { phase: "mid",   minD: 6,  q: 35, review: 40, cards: 25 },
    { phase: "late",  minD: 3,  q: 15, review: 55, cards: 30 },
    { phase: "cram",  minD: -Infinity, q: 0, review: 60, cards: 40 }
  ];
  const MIN_NEW_Q = 1.7;      // 새 문항 1개 평균 분(선다 1.6·단답 2.0)
  const MIN_REVIEW = 1.5;     // 오답 재풀이 1개
  const MIN_CARD = 0.25;      // 암기카드 1장

  /** 오늘 할 일 배분 */
  function dailyPlan(dailyMinutes, ddayNum, dueCount) {
    const minutes = Math.max(0, Number(dailyMinutes) || 0);
    const d = Number(ddayNum);
    const due = Math.max(0, Number(dueCount) || 0);
    let p = PHASES[PHASES.length - 1];
    for (let i = 0; i < PHASES.length; i++) {
      if (d >= PHASES[i].minD) { p = PHASES[i]; break; }
    }
    return {
      newQ: Math.floor((minutes * p.q / 100) / MIN_NEW_Q),
      review: Math.min(due, Math.floor((minutes * p.review / 100) / MIN_REVIEW)),
      cards: Math.floor((minutes * p.cards / 100) / MIN_CARD),
      phase: p.phase
    };
  }

  PLCore.judgePass = judgePass;
  PLCore.diagnosticResult = diagnosticResult;
  PLCore.dataCheck = dataCheck;
  PLCore.dailyPlan = dailyPlan;

  root.PLCore = PLCore;
  if (typeof module !== "undefined") module.exports = PLCore;
})(typeof window !== "undefined" ? window : globalThis);
