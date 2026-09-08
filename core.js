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
  // 따옴표·낫표류. 법령명을 「…」·『…』로 감싸 쓰는 일이 흔해서 통째로 지운다.
  // (괄호와 달리 안의 내용은 남긴다 — 괄호는 (5)에서 내용까지 지운다.)
  const QUOTE_RE = /[「」『』“”‘’"'〈〉《》]/g;
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

    // (2-1) 따옴표·낫표 제거 (「화장품법」 → 화장품법). 전각 따옴표는 (2)에서 반각이 된 뒤 여기서 지워진다.
    t = t.replace(QUOTE_RE, "");

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

  /* ================================================================
   * 10. 모의고사 — 프리셋 · 슬롯 축소 · 편성
   * ================================================================ */
  const MOCK_PRESETS = {
    full:  { name: "실전 모의고사", minutes: 120, subjects: [1, 2, 3, 4], scale: 1 },
    half:  { name: "하프 모의고사(①②③)", minutes: 60, subjects: [1, 2, 3], counts: { 1: 10, 2: 20, 3: 20 } },
    mini3: { name: "3과목 미니", minutes: 30, subjects: [3], counts: { 3: 25 } }
  };
  const POINT_KEYS = ["8", "12", "18"];
  const TOPIC_CAP = 3;              // 한 모의고사에 같은 세부항목 최대 3문항

  /** 최대잉여법 정수 배분 — 비율을 최대한 지키면서 합을 target에 정확히 맞춘다 */
  function apportion(cells, target) {
    const t = Math.max(0, Math.round(Number(target) || 0));
    let total = 0;
    cells.forEach(function (c) { total += c.weight; });
    const out = cells.map(function (c) { return { points: c.points, need: 0, frac: 0, weight: c.weight }; });
    if (!t || total <= 0) return out;
    let used = 0;
    out.forEach(function (c, i) {
      const raw = cells[i].weight * t / total;
      c.need = Math.floor(raw);
      c.frac = raw - c.need;
      used += c.need;
    });
    let rest = t - used;
    const order = out.slice().sort(function (a, b) {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.points - b.points;
    });
    for (let i = 0; rest > 0 && order.length; i++, rest--) order[i % order.length].need += 1;
    return out;
  }

  /**
   * 프리셋의 배점 슬롯표.
   * full = 블루프린트 슬롯 그대로. half·mini3 = 과목별 목표 문항수에 비례 축소
   * (과목 안 mcq/short 비율 유지 → 유형 안에서 8·12·18 슬롯 비율 유지, 합은 정확히 맞춤).
   * @returns {{preset,name,minutes,subjects:number[],slots:Array<{subject,type,points,need}>,count,points}}
   */
  function mockSlots(presetKey, blueprint) {
    const key = MOCK_PRESETS[presetKey] ? presetKey : "full";
    const p = MOCK_PRESETS[key];
    const bp = blueprint || {};
    const slots = [];
    (bp.subjects || []).forEach(function (s) {
      if (p.subjects.indexOf(Number(s.id)) === -1) return;
      const sl = s.slots || {};
      const cells = {};
      const n = { mcq: 0, short: 0 };
      ["mcq", "short"].forEach(function (type) {
        cells[type] = POINT_KEYS.map(function (k) {
          const w = Number((sl[type] || {})[k] || 0);
          n[type] += w;
          return { points: Number(k), weight: w };
        });
      });
      const nAll = n.mcq + n.short;
      const want = (p.counts && p.counts[String(s.id)] != null) ? Number(p.counts[String(s.id)]) : nAll;
      let target = { mcq: n.mcq, short: n.short };
      if (nAll && want !== nAll) {
        if (!n.short) target = { mcq: want, short: 0 };
        else if (!n.mcq) target = { mcq: 0, short: want };
        else {
          const m = Math.round(want * n.mcq / nAll);
          target = { mcq: m, short: want - m };
        }
      }
      ["mcq", "short"].forEach(function (type) {
        apportion(cells[type], target[type]).forEach(function (c) {
          if (c.need > 0) slots.push({ subject: Number(s.id), type: type, points: c.points, need: c.need });
        });
      });
    });
    let count = 0, points = 0;
    slots.forEach(function (s) { count += s.need; points += s.need * s.points; });
    return {
      preset: key, name: p.name, minutes: p.minutes, subjects: p.subjects.slice(),
      slots: slots, count: count, points: points
    };
  }

  /** 대체 배점 순서: 8↔12를 먼저, 18은 마지막 */
  function substitutePoints(target) {
    const t = Number(target);
    return POINT_KEYS.map(Number).filter(function (v) { return v !== t; })
      .sort(function (a, b) {
        const la = a === 18 ? 1 : 0, lb = b === 18 ? 1 : 0;
        if (la !== lb) return la - lb;
        const da = Math.abs(a - t), db = Math.abs(b - t);
        if (da !== db) return da - db;
        return a - b;
      });
  }

  /**
   * 모의고사 편성.
   * @param {string} presetKey "full|half|mini3"
   * @param {Array} questions 전체 문항(verified:true만 쓴다)
   * @param {object} blueprint
   * @param {{attemptsByQid?:object, exclude?:string[]}} opts
   *        attemptsByQid = { qid: [attempt…] } (키 이름 이것만 쓴다), exclude = 직전 모의 qids(가능하면 회피)
   * @param {function} rng
   */
  function buildMock(presetKey, questions, blueprint, opts, rng) {
    const o = opts || {};
    const r = typeof rng === "function" ? rng : seededRandom(20260919);
    const plan = mockSlots(presetKey, blueprint);
    const byQid = o.attemptsByQid || {};
    const exclude = new Set(Array.isArray(o.exclude) ? o.exclude : []);
    const pool = (Array.isArray(questions) ? questions : []).filter(function (q) {
      return q && q.id && q.verified === true;
    });

    // 동순위 tie-break를 seed로 결정적으로 만든다
    const shuffledIdx = new Map();
    shuffle(pool, r).forEach(function (q, i) { shuffledIdx.set(q.id, i); });

    const rankOf = new Map();
    pool.forEach(function (q) {
      const atts = byQid[q.id] || [];
      let last = 0;
      for (let i = 0; i < atts.length; i++) { const t = timeOf(atts[i]); if (t > last) last = t; }
      rankOf.set(q.id, { ex: exclude.has(q.id) ? 1 : 0, tried: atts.length ? 1 : 0, last: last });
    });

    // 과목·유형·배점별 후보(미출제 우선 → 가장 오래전 출제 순, exclude는 뒤로)
    const groups = new Map();
    const gkey = function (sid, type, pts) { return sid + "|" + type + "|" + pts; };
    pool.forEach(function (q) {
      const k = gkey(Number(q.subject), q.type === "short" ? "short" : "mcq", Number(q.points));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(q);
    });
    groups.forEach(function (list) {
      list.sort(function (a, b) {
        const ra = rankOf.get(a.id), rb = rankOf.get(b.id);
        if (ra.ex !== rb.ex) return ra.ex - rb.ex;
        if (ra.tried !== rb.tried) return ra.tried - rb.tried;
        if (ra.last !== rb.last) return ra.last - rb.last;
        return shuffledIdx.get(a.id) - shuffledIdx.get(b.id);
      });
    });

    const slots = plan.slots.map(function (s) {
      return { subject: s.subject, type: s.type, points: s.points, need: s.need, picks: [] };
    });
    const used = new Set();
    const topicCount = new Map();
    let relaxed = 0;

    function take(slot, pointsList, cap) {
      for (let pi = 0; pi < pointsList.length; pi++) {
        const list = groups.get(gkey(slot.subject, slot.type, pointsList[pi])) || [];
        for (let i = 0; i < list.length && slot.picks.length < slot.need; i++) {
          const q = list[i];
          if (used.has(q.id)) continue;
          const tc = topicCount.get(q.topic) || 0;
          if (cap !== Infinity && tc >= cap) continue;
          if (tc >= TOPIC_CAP) relaxed += 1;
          used.add(q.id);
          topicCount.set(q.topic, tc + 1);
          slot.picks.push(q);
        }
        if (slot.picks.length >= slot.need) return;
      }
    }

    // ① 배점 일치 + 세부항목 상한 → ② 배점 일치 + 상한 완화
    // → ③ 다른 배점 + 상한 → ④ 다른 배점 + 상한 완화 → 그래도 비면 slots_missing
    slots.forEach(function (s) { take(s, [s.points], TOPIC_CAP); });
    slots.forEach(function (s) { take(s, [s.points], Infinity); });
    slots.forEach(function (s) { take(s, substitutePoints(s.points), TOPIC_CAP); });
    slots.forEach(function (s) { take(s, substitutePoints(s.points), Infinity); });

    const slots_filled = slots.map(function (s) {
      return { subject: s.subject, type: s.type, points: s.points, need: s.need, got: s.picks.length };
    });
    const slots_missing = slots_filled.filter(function (s) { return s.got < s.need; })
      .map(function (s) { return { subject: s.subject, type: s.type, points: s.points, need: s.need, got: s.got }; });
    // 슬롯 배점과 다른 배점으로 대체한 문항 수
    let substituted = 0;
    slots.forEach(function (s) {
      s.picks.forEach(function (q) { if (Number(q.points) !== s.points) substituted += 1; });
    });

    // 배열 순서 = 시험지 순서: 선다형(과목 1→4, 과목 안은 무작위) → 단답형(과목 1→4)
    const picked = [];
    slots.forEach(function (s) { s.picks.forEach(function (q) { picked.push(q); }); });
    const subjectsAsc = plan.subjects.slice().sort(function (a, b) { return a - b; });
    const ordered = [];
    ["mcq", "short"].forEach(function (type) {
      subjectsAsc.forEach(function (sid) {
        const inSub = picked.filter(function (q) {
          return (q.type === "short" ? "short" : "mcq") === type && Number(q.subject) === sid;
        });
        shuffle(inSub, r).forEach(function (q) { ordered.push(q); });
      });
    });

    let total_points = 0;
    ordered.forEach(function (q) { total_points += Number(q.points) || 0; });

    // partial = 시험지가 계획(슬롯표)과 다르다. gradeMock과 같은 정의를 쓴다.
    const partial = ordered.length < plan.count || total_points !== plan.points;

    const warnings = [];
    slots_missing.forEach(function (s) {
      warnings.push("과목 " + s.subject + " " + (s.type === "short" ? "단답" : "선다") + " " +
        s.points + "점 슬롯 부족: 필요 " + s.need + ", 확보 " + s.got);
    });
    if (relaxed > 0) {
      warnings.push("문항이 부족해 같은 세부항목 " + TOPIC_CAP + "문항 상한을 완화했습니다(" + relaxed + "문항)");
    }
    if (ordered.length < plan.count) {
      warnings.push("축소 편성(" + ordered.length + "/" + plan.count + "문항) — 점수는 환산 점수로 계산합니다");
    }
    if (substituted > 0) {
      warnings.push("배점이 다른 문항으로 대체 " + substituted + "문항 — 총점 " + total_points +
        "점(계획 " + plan.points + "점), 점수는 환산 점수로 계산합니다");
    }

    return {
      preset: plan.preset, name: plan.name,
      qids: ordered.map(function (q) { return q.id; }),
      order: ordered.map(function (q, i) {
        return {
          no: i + 1, qid: q.id, subject: Number(q.subject),
          type: q.type === "short" ? "short" : "mcq", points: Number(q.points) || 0, topic: q.topic || null
        };
      }),
      slots_filled: slots_filled,
      slots_missing: slots_missing,
      substituted: substituted,
      partial: partial,
      total_points: total_points,
      planned_count: plan.count,
      planned_points: plan.points,
      minutes: plan.minutes,
      warnings: warnings
    };
  }

  PLCore.MOCK_PRESETS = MOCK_PRESETS;
  PLCore.mockSlots = mockSlots;
  PLCore.buildMock = buildMock;

  /* ================================================================
   * 11. 모의고사 채점 · 기록
   * ================================================================ */
  const GUESS_PENALTY = 0.8;        // 찍어서 맞힌 문항 배점의 80%를 보정 점수에서 뺀다

  /**
   * 모의고사 채점.
   * @param {{qids:string[],partial?:boolean,preset?:string}|string[]} mock
   * @param {Object} answers { qid: { given, conf, sec, flag, self_marked } }
   *        선다형 given은 0~4 정수여야 한다(문자열 "0"은 오답 처리). 단답형 given은 문자열(복수 빈칸은 배열).
   * @param {Array} questions
   * @param {Object} blueprint
   * @param {Array} [topics] by_topic에 이름을 붙일 때만 필요
   */
  function gradeMock(mock, answers, questions, blueprint, topics) {
    const bp = blueprint || {};
    const subs = bp.subjects || [];
    const bpTotal = (bp.exam && bp.exam.total_points != null) ? Number(bp.exam.total_points) : 1000;
    const qids = Array.isArray(mock) ? mock.slice()
      : ((mock && Array.isArray(mock.qids)) ? mock.qids.slice() : []);
    const ans = answers || {};
    const byId = new Map();
    (Array.isArray(questions) ? questions : []).forEach(function (q) { if (q && q.id) byId.set(q.id, q); });
    const tName = new Map();
    (Array.isArray(topics) ? topics : []).forEach(function (t) { if (t && t.id) tName.set(t.id, t.name); });

    const subjAgg = {};
    const topicAgg = {};
    const mcqAgg = { n: 0, correct: 0, points: 0 };
    const shortAgg = { n: 0, correct: 0, points: 0, self_marked: 0 };
    const guessed_correct = [];
    const missing_questions = [];
    const unanswered = [];
    const secList = [];
    let raw = 0, max_included = 0, guessed_points = 0, secSum = 0, secN = 0, n_included = 0;

    function isBlank(given) {
      if (given == null) return true;
      if (typeof given === "string") return given.trim() === "";
      if (Array.isArray(given)) {
        return given.every(function (x) { return x == null || String(x).trim() === ""; });
      }
      return false;
    }

    qids.forEach(function (id) {
      const q = byId.get(id);
      if (!q) { missing_questions.push(id); return; }   // 문항 데이터가 없으면 채점에서 제외하고 알려준다
      n_included += 1;
      const pts = Number(q.points) || 0;
      const sid = Number(q.subject);
      const isShort = q.type === "short";
      const a = ans[id] || null;
      const blank = !a || isBlank(a.given);

      if (!subjAgg[sid]) subjAgg[sid] = { raw: 0, max: 0 };
      subjAgg[sid].max += pts;
      max_included += pts;
      if (blank) unanswered.push(id);

      let ok = false;
      if (!blank) {
        if (isShort) {
          const r = gradeShort(q, a.given);
          ok = r.correct === true || a.self_marked === true;
        } else {
          ok = gradeMcq(q, a.given) === true;
        }
      }
      if (ok) { raw += pts; subjAgg[sid].raw += pts; }

      const bucket = isShort ? shortAgg : mcqAgg;
      bucket.n += 1;
      if (ok) { bucket.correct += 1; bucket.points += pts; }
      // 빈 답에 붙은 self_marked는 세지 않는다(자기 판정은 답을 쓴 뒤에만 뜬다)
      if (isShort && !blank && a.self_marked === true) shortAgg.self_marked += 1;
      if (ok && a && a.conf === 0) { guessed_correct.push(id); guessed_points += pts; }

      const tid = q.topic || "(미지정)";
      if (!topicAgg[tid]) topicAgg[tid] = { n: 0, correct: 0 };
      topicAgg[tid].n += 1;
      if (ok) topicAgg[tid].correct += 1;

      if (a && typeof a.sec === "number" && isFinite(a.sec)) {
        secSum += a.sec; secN += 1;
        secList.push({ qid: id, sec: a.sec });
      }
    });

    // partial = 시험지가 계획과 다르다(buildMock과 같은 정의). 계획 만점은 mock.planned_points 우선.
    const meta = (mock && !Array.isArray(mock)) ? mock : {};
    const plannedPoints = (meta.planned_points != null) ? Number(meta.planned_points) : bpTotal;
    const plannedCount = (meta.planned_count != null) ? Number(meta.planned_count) : null;
    const partial = meta.partial === true || max_included !== plannedPoints;
    // 환산은 계획 만점 기준(full 프리셋은 1000점이라 브리프의 ×1000과 같다)
    const factor = (partial && max_included > 0) ? (plannedPoints / max_included) : 1;
    const scaled = max_included > 0 ? (partial ? Math.round(raw * factor) : raw) : 0;
    const adj = scaled - Math.round(GUESS_PENALTY * guessed_points * factor);

    // 환산 이유: 문항이 모자랐나(missing) / 배점이 다른 문항으로 대체됐나(substituted)
    const substitutedN = Number(meta.substituted) || 0;
    let shortfall = null;
    if (Array.isArray(meta.slots_missing)) {
      shortfall = meta.slots_missing.reduce(function (acc, x) {
        return acc + ((Number(x.need) || 0) - (Number(x.got) || 0));
      }, 0);
    } else if (plannedCount != null) {
      shortfall = Math.max(0, plannedCount - n_included);
    }
    let lacked = (shortfall != null) ? (shortfall > 0) : (max_included !== plannedPoints && !substitutedN);
    if (partial && !lacked && !substitutedN) lacked = true;      // 설명 못 하는 차이는 부족으로 본다
    const partial_reason = !partial ? null
      : ((lacked && substitutedN) ? "both" : (substitutedN ? "substituted" : "missing"));

    // 과목 점수는 언제나 환산한다: raw_s / 포함 배점_s × 과목 만점.
    // (한 과목만 축소돼도 과락 판정이 흔들리지 않게 하려면 과목별 정규화가 필요하다.)
    const by_subject = subs.map(function (s) {
      const S = subjAgg[s.id] || { raw: 0, max: 0 };
      const sMax = Number(s.points) || 0;
      const included = S.max > 0;
      const sScaled = included ? Math.round(S.raw * sMax / S.max) : 0;
      return {
        id: s.id, name: s.name, raw: S.raw, max: sMax, max_included: S.max,
        scaled: sScaled, pass_points: s.pass_points,
        pass: included ? (sScaled >= Number(s.pass_points || 0)) : null,
        ratio: (included && sMax > 0) ? sScaled / sMax : 0
      };
    });
    const missing_subjects = by_subject.filter(function (x) { return x.max_included === 0; })
      .map(function (x) { return x.id; });
    const fail_subjects = by_subject.filter(function (x) { return x.max_included > 0 && x.pass === false; })
      .map(function (x) { return x.id; });
    const passTotal = (bp.exam && bp.exam.pass_total != null) ? Number(bp.exam.pass_total) : 600;
    // 총점 판정은 화면에 보여 주는 값(scaled)으로 한다. 과목이 빠진 프리셋은 판정 불가(null).
    const pass = missing_subjects.length ? null
      : (scaled >= passTotal && fail_subjects.length === 0);

    const by_topic = Object.keys(topicAgg).map(function (id) {
      const T = topicAgg[id];
      return { id: id, name: tName.get(id) || id, n: T.n, correct: T.correct, pct: (T.correct * 100) / T.n };
    }).sort(function (a, b) {
      if (a.pct !== b.pct) return a.pct - b.pct;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });

    const slowest = secList.slice().sort(function (a, b) {
      if (b.sec !== a.sec) return b.sec - a.sec;
      return a.qid < b.qid ? -1 : (a.qid > b.qid ? 1 : 0);
    }).slice(0, 5);

    return {
      raw: raw, max_included: max_included, max_reference: plannedPoints,
      scaled: scaled, adj: adj,
      pass: pass, fail_subjects: fail_subjects, missing_subjects: missing_subjects,
      partial: partial, partial_reason: partial_reason,
      by_subject: by_subject,
      mcq: mcqAgg, short: shortAgg,
      guessed_correct: guessed_correct, guessed_points: guessed_points,
      by_topic: by_topic,
      avg_sec: secN ? Math.round(secSum / secN) : 0,
      slowest: slowest,
      unanswered: unanswered,
      missing_questions: missing_questions
    };
  }

  /** 채점 결과를 pl.v1.mocks 한 줄로 접는다(문항 본문은 담지 않는다) */
  function mockRecord(mock, grade, sid, dateStr) {
    const g = grade || {};
    const m = (mock && !Array.isArray(mock)) ? mock : {};
    const mcq = g.mcq || { n: 0, correct: 0, points: 0 };
    const short = g.short || { n: 0, correct: 0, points: 0, self_marked: 0 };
    return {
      sid: sid != null ? sid : (m.sid || null),
      date: dateStr || today(),
      preset: m.preset || "full",
      raw: Number(g.raw) || 0,
      max_included: Number(g.max_included) || 0,
      max_reference: Number(g.max_reference) || 0,
      scaled: Number(g.scaled) || 0,
      adj: Number(g.adj) || 0,
      pass: g.pass === null ? null : g.pass === true,
      fail_subjects: (g.fail_subjects || []).slice(),
      missing_subjects: (g.missing_subjects || []).slice(),
      partial: g.partial === true,
      partial_reason: g.partial_reason != null ? g.partial_reason : null,
      subject: (g.by_subject || []).map(function (x) { return x.scaled; }),
      mcq: { n: mcq.n, correct: mcq.correct, points: mcq.points },
      short: { n: short.n, correct: short.correct, points: short.points, self_marked: short.self_marked },
      guessedCorrect: (g.guessed_correct || []).length,
      avgSec: Number(g.avg_sec) || 0,
      slowest: (g.slowest || []).slice(),
      n: (mcq.n || 0) + (short.n || 0),
      qids: Array.isArray(m.qids) ? m.qids.slice() : []
    };
  }

  PLCore.gradeMock = gradeMock;
  PLCore.mockRecord = mockRecord;

  /* ================================================================
   * 12. 예상 점수 · READINESS
   * ================================================================ */
  // 최근 모의 가중(1회 / 2회 / 3회 이상)과 신뢰 구간 폭
  const MOCK_RECENCY = { 1: [1.0], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
  const SUBJ_MARK = ["①", "②", "③", "④"];

  /** 과목 슬롯의 선다·단답 배점 합(슬롯이 없으면 전부 선다로 본다) */
  function subjectSlotPoints(s) {
    const sl = (s && s.slots) || {};
    const m = slotPoints(sl.mcq);
    const sh = slotPoints(sl.short);
    if (!m && !sh) return { mcq: Number(s && s.points) || 0, short: 0 };
    return { mcq: m, short: sh };
  }

  /**
   * 예상 점수(/1000).
   * 숙달 기반 = Σ 슬롯(배점 × p), 선다 p = 0.20+0.80×m/100, 단답 p = 0.85×m/100 (미측정 m=20).
   * 모의 기반 = 최근 모의 3회까지 가중 평균한 과목 점수 × (adj/scaled) 배율.
   *            half·mini3에 빠진 과목은 숙달 기반으로 채운다.
   * 혼합 = 0회 숙달 100%(band 120) / 1회 0.5·0.5(band 90) / 2회 이상 모의 0.7·숙달 0.3(band 60).
   * 미검증(verified≠true) 문항은 계산에서 뺀다.
   */
  function expectedScore(mocks, topics, questions, attemptsByQid, blueprint, todayStr) {
    const bp = blueprint || {};
    const subs = bp.subjects || [];
    const t = todayStr || today();
    const byQid = attemptsByQid || {};
    const pool = (Array.isArray(questions) ? questions : []).filter(function (q) {
      return q && q.verified === true;
    });

    const mastery = {};
    subs.forEach(function (s) {
      const rawM = subjectMastery(s.id, topics, pool, byQid, t);
      const m = (rawM == null || isNaN(rawM)) ? 20 : rawM;
      const pts = subjectSlotPoints(s);
      let n = 0;
      pool.forEach(function (q) {
        if (Number(q.subject) !== Number(s.id)) return;
        const a = byQid[q.id];
        if (a && a.length) n += 1;
      });
      mastery[s.id] = {
        m: m, n: n,
        E: pts.mcq * (0.20 + 0.80 * m / 100) + pts.short * (0.85 * m / 100)
      };
    });

    // 최신순 정렬(날짜 같으면 나중에 저장된 것이 최신)
    const list = (Array.isArray(mocks) ? mocks : []).filter(function (x) { return x && typeof x === "object"; });
    const sorted = list.map(function (rec, i) { return { rec: rec, i: i }; })
      .sort(function (a, b) {
        const da = String(a.rec.date || ""), db = String(b.rec.date || "");
        if (da !== db) return da < db ? 1 : -1;
        return b.i - a.i;
      })
      .map(function (x) { return x.rec; });
    const n_mocks = sorted.length;
    const weights = MOCK_RECENCY[Math.min(3, n_mocks)] || [];

    const mockAgg = {};
    sorted.slice(0, weights.length).forEach(function (rec, i) {
      const w = weights[i];
      const preset = MOCK_PRESETS[rec.preset] || MOCK_PRESETS.full;
      const scaled = Number(rec.scaled) || 0;
      const adjv = Number(rec.adj);
      const factor = (scaled > 0 && isFinite(adjv)) ? Math.max(0, adjv / scaled) : 1;
      const arr = Array.isArray(rec.subject) ? rec.subject : [];
      subs.forEach(function (s, idx) {
        if (preset.subjects.indexOf(Number(s.id)) === -1) return;
        const v = Number(arr[idx]);
        if (!isFinite(v)) return;
        if (!mockAgg[s.id]) mockAgg[s.id] = { num: 0, den: 0 };
        mockAgg[s.id].num += w * v * factor;
        mockAgg[s.id].den += w;
      });
    });

    const mixW = n_mocks === 0 ? 0 : (n_mocks === 1 ? 0.5 : 0.7);
    const band = n_mocks === 0 ? 120 : (n_mocks === 1 ? 90 : 60);
    const basis = n_mocks === 0 ? "mastery" : (n_mocks === 1 ? "mixed" : "mock");

    let E = 0, mastery_based = 0, mock_based = 0;
    const by_subject = subs.map(function (s) {
      const M = mastery[s.id];
      const agg = mockAgg[s.id];
      const mockV = (agg && agg.den > 0) ? (agg.num / agg.den) : M.E;
      const eS = Math.round(mixW * mockV + (1 - mixW) * M.E);
      const max = Number(s.points) || 0;
      E += eS;
      mastery_based += Math.round(M.E);
      mock_based += Math.round(mockV);
      return {
        id: s.id, name: s.name, E: eS, max: max, ratio: max ? eS / max : 0,
        n: M.n, mastery: M.m
      };
    });

    const clamp = function (v) { return Math.max(0, Math.min(1000, Math.round(v))); };
    const note = n_mocks === 0 ? "초기 추정 · 신뢰 낮음"
      : (n_mocks === 1 ? "모의 1회 + 숙달 혼합 · 신뢰 보통"
        : "최근 모의 " + Math.min(3, n_mocks) + "회 가중 + 숙달 보정");

    return {
      E: E, band: band, low: clamp(E - band), high: clamp(E + band),
      basis: basis, n_mocks: n_mocks, by_subject: by_subject,
      mastery_based: mastery_based, mock_based: mock_based, note: note
    };
  }

  /**
   * 합격 준비도 판정.
   * SAFE = 모의 ≥1회 AND E ≥700 AND 하한 ≥620 AND 전 과목 50% 이상
   * AT RISK = E <600 OR 하한 <540 OR 어느 과목 40% 미달 / 그 외 BORDERLINE(모의 0회면 최대 BORDERLINE)
   */
  function readiness(exp, blueprint) {
    const e = exp || {};
    const subs = (blueprint || {}).subjects || [];
    const bsList = Array.isArray(e.by_subject) ? e.by_subject : [];
    const E = Number(e.E) || 0;
    const low = Number(e.low) || 0;
    const n = Number(e.n_mocks) || 0;

    const nameOf = function (id, i) {
      const hit = subs.filter(function (x) { return Number(x.id) === Number(id); })[0];
      const mark = SUBJ_MARK[(Number(id) || (i + 1)) - 1] || String(id);
      return mark + " " + ((hit && (hit.short_name || hit.name)) || "과목 " + id);
    };
    const pct = function (r) { return Math.round((Number(r) || 0) * 100); };

    const danger = [], weak = [];
    bsList.forEach(function (b, i) {
      const r = Number(b.ratio) || 0;
      if (r < 0.4) danger.push(nameOf(b.id, i) + " " + pct(r) + "% — 과락 위험(40% 미달)");
      else if (r < 0.5) weak.push(nameOf(b.id, i) + " " + pct(r) + "% — 과락선 근접");
    });

    let label;
    if (E < 600 || low < 540 || danger.length) label = "AT RISK";
    else if (n >= 1 && E >= 700 && low >= 620 && bsList.length &&
             bsList.every(function (b) { return (Number(b.ratio) || 0) >= 0.5; })) label = "SAFE";
    else label = "BORDERLINE";

    const reasons = [];
    if (n === 0) reasons.push("모의고사 0회 — 실전 점수가 없어 추정입니다(1회만 봐도 판정이 정확해집니다)");
    if (E < 600) reasons.push("예상 총점 " + E + "점 — 합격선 600점 미달");
    else if (E < 700) reasons.push("예상 총점 " + E + "점 — 합격선은 넘지만 여유가 100점 미만");
    else reasons.push("예상 총점 " + E + "점 — 합격선보다 " + (E - 600) + "점 위");
    if (low < 540) reasons.push("하한 " + low + "점 — 컨디션이 나쁜 날이면 불합격권");
    else if (low < 620) reasons.push("하한 " + low + "점 — 나쁜 날에는 합격선에 붙습니다");
    else reasons.push("하한 " + low + "점 — 나쁜 날에도 합격선 위");
    danger.forEach(function (x) { reasons.push(x); });
    weak.forEach(function (x) { reasons.push(x); });
    if (label === "SAFE" && !weak.length && !danger.length) reasons.push("전 과목 50% 이상 — 과락 위험 없음");

    return { label: label, reasons: reasons };
  }

  /** 과목 배지: 시도 8문항 미만이면 "미측정" */
  function subjectBadge(ratio, n) {
    if ((Number(n) || 0) < 8) return "미측정";
    const r = Number(ratio) || 0;
    if (r >= 0.55) return "안전";
    if (r >= 0.45) return "주의";
    return "위험";
  }

  PLCore.expectedScore = expectedScore;
  PLCore.readiness = readiness;
  PLCore.subjectBadge = subjectBadge;

  /* ================================================================
   * 13. 적응형 출제 · 주간 리포트
   * ================================================================ */
  const ADAPT_SHARE = { W: 0.5, R: 0.3 };      // 취약 50 / 복습 만기 30 / 새 문항 나머지 20
  const SUBJECT_SHARE_CAP = 0.6;               // 한 세트에서 한 과목이 차지할 수 있는 최대 비중
  const TIME_TARGET = { mcq: 72, short: 90 };  // 목표 풀이 시간(초). 1.5배 초과면 P 가점

  /**
   * 적응형 학습 세트.
   * W(취약) = 토픽 숙달<60 또는 문항 숙달<50인 **시도한** 문항 중 P 상위 2배수에서 무작위
   * R(복습) = 오늘 만기 오답(부족하면 같은 vg 형제로 채움)
   * N(새것) = 미출제 문항을 토픽 예상 문항수 가중 추첨
   * 부족분은 R → W → N → 가장 오래전 출제 순으로 채우고, 그래도 모자라면 과목 상한을 푼다.
   * @returns {{qids:string[], mix:{W:number,R:number,N:number}}}
   */
  function buildAdaptiveSet(n, questions, topics, attemptsByQid, mistakes, todayStr, rng) {
    const want = Math.max(0, Math.floor(Number(n) || 0));
    const r = typeof rng === "function" ? rng : seededRandom(20260919);
    const t = todayStr || today();
    const byQid = attemptsByQid || {};
    const mist = mistakes || {};
    const pool = (Array.isArray(questions) ? questions : []).filter(function (q) { return q && q.id; });
    if (!want || !pool.length) return { qids: [], mix: { W: 0, R: 0, N: 0 } };

    const byId = new Map();
    pool.forEach(function (q) { byId.set(q.id, q); });
    const topicById = new Map();
    let maxExp = 1;
    (Array.isArray(topics) ? topics : []).forEach(function (tp) {
      if (!tp || tp.kind !== "sub") return;
      topicById.set(tp.id, tp);
      const e = Number(tp.exp_q) || 0;
      if (e > maxExp) maxExp = e;
    });

    const targetR = Math.round(want * ADAPT_SHARE.R);
    const targetW = Math.round(want * ADAPT_SHARE.W);
    const targetN = want - targetW - targetR;
    const cap = Math.max(1, Math.ceil(want * SUBJECT_SHARE_CAP));

    const shuffledIdx = new Map();
    shuffle(pool, r).forEach(function (q, i) { shuffledIdx.set(q.id, i); });

    const tmCache = new Map(), qmCache = new Map();
    function topicM(tid) {
      if (!tmCache.has(tid)) tmCache.set(tid, topicMastery(tid, pool, byQid, t));
      return tmCache.get(tid);
    }
    function qM(q) {
      if (!qmCache.has(q.id)) qmCache.set(q.id, questionMastery(byQid[q.id] || [], q, t));
      return qmCache.get(q.id);
    }
    function lastAt(q) {
      const atts = byQid[q.id] || [];
      let last = 0;
      for (let i = 0; i < atts.length; i++) { const x = timeOf(atts[i]); if (x > last) last = x; }
      return last;
    }
    /** 미출제 우선 → 가장 오래전 출제 순 → seed 순 */
    function orderCandidates(list) {
      return list.slice().sort(function (a, b) {
        const la = lastAt(a), lb = lastAt(b);
        const ta = la ? 1 : 0, tb = lb ? 1 : 0;
        if (ta !== tb) return ta - tb;
        if (la !== lb) return la - lb;
        return shuffledIdx.get(a.id) - shuffledIdx.get(b.id);
      });
    }

    /** 취약 우선순위 P (CLAUDE.md 「적응형 출제」) */
    function adaptiveP(q) {
      const atts = sortedAtts(byQid[q.id] || []);
      const m = qM(q);
      let p = 3 * (1 - (m == null ? 0 : m) / 100);

      let wrongRecent = false;
      const rec = mist[q.id];
      if (rec && rec.lastWrong) {
        const d = daysBetween(rec.lastWrong, t);
        if (d != null && d >= 0 && d <= 3) wrongRecent = true;
      }
      if (!wrongRecent) {
        for (let i = atts.length - 1; i >= 0; i--) {
          if (atts[i].correct === true) continue;
          const d = daysBetween(dateOf(atts[i].at), t);
          if (d != null && d >= 0 && d <= 3) wrongRecent = true;
          break;
        }
      }
      if (wrongRecent) p += 2;

      let streak = 0;
      for (let i = atts.length - 1; i >= 0; i--) {
        if (atts[i].correct === true) break;
        streak += 1;
      }
      p += 1.5 * Math.min(streak, 3) / 3;

      const last = atts[atts.length - 1];
      if (last && (last.conf === 0 || last.conf === 1)) p += 1;

      let secSum = 0, secN = 0;
      atts.forEach(function (a) {
        if (typeof a.sec === "number" && isFinite(a.sec)) { secSum += a.sec; secN += 1; }
      });
      const limit = (q.type === "short" ? TIME_TARGET.short : TIME_TARGET.mcq) * 1.5;
      if (secN && (secSum / secN) > limit) p += 1;

      p += 1.5 * (q.importance === "H" ? 1 : (q.importance === "M" ? 0.5 : 0));
      const tp = topicById.get(q.topic);
      p += (Number(tp && tp.exp_q) || 0) / maxExp;
      return p;
    }

    const chosen = { R: [], W: [], N: [] };
    const used = new Set();
    const subjectCount = {};
    function count() { return chosen.R.length + chosen.W.length + chosen.N.length; }
    function deficit() { return want - count(); }
    function canTake(q, respectCap) {
      if (used.has(q.id)) return false;
      if (!respectCap) return true;
      return (subjectCount[Number(q.subject)] || 0) < cap;
    }
    function take(bucket, q) {
      used.add(q.id);
      subjectCount[Number(q.subject)] = (subjectCount[Number(q.subject)] || 0) + 1;
      chosen[bucket].push(q.id);
    }
    function pickWeightedFrom(list, respectCap, bucket, limitFn) {
      while (limitFn() > 0 && list.length) {
        let total = 0;
        const w = list.map(function (q) {
          const tp = topicById.get(q.topic);
          const v = Math.max(0.1, Number(tp && tp.exp_q) || 1);
          total += v;
          return v;
        });
        let x = r() * total;
        let idx = list.length - 1;
        for (let i = 0; i < list.length; i++) { x -= w[i]; if (x <= 0) { idx = i; break; } }
        const q = list.splice(idx, 1)[0];
        if (canTake(q, respectCap)) take(bucket, q);
      }
    }

    /* R — 오늘 만기 오답 */
    const dueIds = dueMistakes(mist, t).filter(function (id) { return byId.has(id); });
    dueIds.forEach(function (id) {
      if (chosen.R.length >= targetR) return;
      const q = byId.get(id);
      if (canTake(q, true)) take("R", q);
    });
    /* R 부족분 — 같은 vg(변형 그룹) 형제 문항 우선 */
    if (chosen.R.length < targetR) {
      const vgs = [];
      dueIds.concat(Object.keys(mist)).forEach(function (id) {
        const q = byId.get(id);
        if (q && q.vg && vgs.indexOf(q.vg) === -1) vgs.push(q.vg);
      });
      if (vgs.length) {
        orderCandidates(pool.filter(function (q) {
          return q.vg && vgs.indexOf(q.vg) !== -1 && !used.has(q.id);
        })).forEach(function (q) {
          if (chosen.R.length >= targetR) return;
          if (canTake(q, true)) take("R", q);
        });
      }
    }

    /* W — 취약 문항(시도 있음, 숙달 아님) */
    const wCands = pool.filter(function (q) {
      if (used.has(q.id)) return false;
      const atts = byQid[q.id] || [];
      if (!atts.length) return false;                     // 미출제는 N 몫
      if (isMastered(atts, q, t)) return false;
      const tm = topicM(q.topic);
      const qm = qM(q);
      return (tm && tm.value != null && tm.value < 60) || (qm != null && qm < 50);
    });
    if (targetW > 0 && wCands.length) {
      const ranked = wCands.map(function (q) { return { q: q, p: adaptiveP(q) }; })
        .sort(function (a, b) {
          if (b.p !== a.p) return b.p - a.p;
          return shuffledIdx.get(a.q.id) - shuffledIdx.get(b.q.id);
        })
        .slice(0, targetW * 2)
        .map(function (x) { return x.q; });
      shuffle(ranked, r).forEach(function (q) {
        if (chosen.W.length >= targetW) return;
        if (canTake(q, true)) take("W", q);
      });
    }

    /* N — 미출제 문항, 토픽 예상 문항수 가중 추첨 */
    function untriedLeft() {
      return pool.filter(function (q) {
        return !used.has(q.id) && !((byQid[q.id] || []).length);
      });
    }
    pickWeightedFrom(untriedLeft(), true, "N", function () { return targetN - chosen.N.length; });

    /* 부족분: R → W → N → 가장 오래전 출제 */
    function topUp(respectCap) {
      if (deficit() > 0) {
        orderCandidates(dueIds.map(function (id) { return byId.get(id); })
          .filter(function (q) { return q && !used.has(q.id); })).forEach(function (q) {
            if (deficit() <= 0) return;
            if (canTake(q, respectCap)) take("R", q);
          });
      }
      if (deficit() > 0) {
        orderCandidates(wCands.filter(function (q) { return !used.has(q.id); })).forEach(function (q) {
          if (deficit() <= 0) return;
          if (canTake(q, respectCap)) take("W", q);
        });
      }
      if (deficit() > 0) pickWeightedFrom(untriedLeft(), respectCap, "N", deficit);
      if (deficit() > 0) {
        orderCandidates(pool.filter(function (q) { return !used.has(q.id); })).forEach(function (q) {
          if (deficit() <= 0) return;
          if (!canTake(q, respectCap)) return;
          const tried = ((byQid[q.id] || []).length) > 0;
          take(tried ? (mist[q.id] ? "R" : "W") : "N", q);
        });
      }
    }
    topUp(true);
    if (deficit() > 0) topUp(false);

    return {
      qids: chosen.R.concat(chosen.W, chosen.N),
      mix: { W: chosen.W.length, R: chosen.R.length, N: chosen.N.length }
    };
  }

  /* 주간 리포트 -------------------------------------------------- */
  const WHY_KEYS = ["unknown", "confused", "slip", "misread", "guess"];
  const REPORT_SUBJECTS = [1, 2, 3, 4];
  const WEAK_TOPIC_LIMIT = 8;

  /**
   * 최근 7일(오늘 포함) 집계. ⑨-B 주간 리포트 템플릿 채움용.
   * pct는 반올림하지 않은 백분율(표시할 때 UI가 반올림한다). 기록이 없는 과목은 pct null.
   */
  function weeklyReport(attempts, mocks, topics, questions, todayStr) {
    const t = todayStr || today();
    const days = 7;
    const byId = new Map();
    (Array.isArray(questions) ? questions : []).forEach(function (q) { if (q && q.id) byId.set(q.id, q); });
    const tName = new Map();
    (Array.isArray(topics) ? topics : []).forEach(function (tp) { if (tp && tp.id) tName.set(tp.id, tp.name); });

    const why_dist = {};
    WHY_KEYS.forEach(function (k) { why_dist[k] = 0; });
    const conf_dist = { 2: 0, 1: 0, 0: 0 };
    const subjAgg = {}, topicAgg = {};
    let n_attempts = 0, correct = 0;

    (Array.isArray(attempts) ? attempts : []).forEach(function (a) {
      if (!a) return;
      const d = daysBetween(dateOf(a.at), t);
      if (d == null || d < 0 || d >= days) return;
      n_attempts += 1;
      const ok = a.correct === true;
      if (ok) correct += 1;
      if (a.why && why_dist[a.why] != null) why_dist[a.why] += 1;
      if (a.conf === 2 || a.conf === 1 || a.conf === 0) conf_dist[a.conf] += 1;
      const q = byId.get(a.qid);
      if (!q) return;
      const sid = Number(q.subject);
      if (!subjAgg[sid]) subjAgg[sid] = { n: 0, c: 0 };
      subjAgg[sid].n += 1;
      if (ok) subjAgg[sid].c += 1;
      const tid = q.topic || "(미지정)";
      if (!topicAgg[tid]) topicAgg[tid] = { n: 0, c: 0 };
      topicAgg[tid].n += 1;
      if (ok) topicAgg[tid].c += 1;
    });

    const by_subject = REPORT_SUBJECTS.map(function (sid) {
      const S = subjAgg[sid] || { n: 0, c: 0 };
      return { id: sid, pct: S.n ? (S.c * 100) / S.n : null, n: S.n };
    });

    const weak_topics = Object.keys(topicAgg).map(function (id) {
      const T = topicAgg[id];
      return { id: id, name: tName.get(id) || id, pct: (T.c * 100) / T.n, n: T.n };
    }).sort(function (a, b) {
      if (a.pct !== b.pct) return a.pct - b.pct;
      if (b.n !== a.n) return b.n - a.n;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    }).slice(0, WEAK_TOPIC_LIMIT);

    const mocksOut = (Array.isArray(mocks) ? mocks : []).filter(function (m) {
      if (!m) return false;
      const d = daysBetween(m.date, t);
      return d != null && d >= 0 && d < days;
    }).sort(function (a, b) {
      return String(a.date) < String(b.date) ? -1 : (String(a.date) > String(b.date) ? 1 : 0);
    }).map(function (m) {
      return {
        date: m.date, preset: m.preset || "full",
        scaled: Number(m.scaled) || 0, adj: Number(m.adj) || 0,
        pass: m.pass === null ? null : m.pass === true
      };
    });

    return {
      days: days, n_attempts: n_attempts,
      correct_pct: n_attempts ? (correct * 100) / n_attempts : 0,
      by_subject: by_subject, weak_topics: weak_topics,
      why_dist: why_dist, conf_dist: conf_dist, mocks: mocksOut
    };
  }

  PLCore.buildAdaptiveSet = buildAdaptiveSet;
  PLCore.weeklyReport = weeklyReport;

  /* ================================================================
   * 11. 암기카드 그림(figure) → 인라인 SVG
   *  - 카드에는 SVG를 직접 쓰지 않고 "스펙"(compare·timeline·groups·tree)만 넣는다.
   *  - 폭 360 고정, 높이는 내용에 맞춰 계산. 글자 최소 12px.
   *  - 색은 CSS 변수가 아니라 값으로 직접 쓴다(file:// 로 열어도 안전).
   *  - 애니메이션 없음. <title>·<desc>로 접근성 확보.
   *  - 그림에 넣는 글자는 카드 back·mnemonic에 이미 있는 것만 쓴다
   *    (그 검사는 scripts/check-data.cjs가 figureTexts()로 한다).
   * ================================================================ */
  const FIG_W = 360;                 // viewBox 폭(고정)
  const FIG_PAD = 8;                 // 바깥 여백
  const FIG_FS = 12;                 // 최소 글자 크기
  const FIG_LH = 16;                 // 줄 간격
  const FIG_FONT = "-apple-system, 'Apple SD Gothic Neo', system-ui, sans-serif";
  const FIGURE_COLORS = {
    paper: "#F5F0E6", ink: "#1D1B17", green: "#2A6F46", red: "#B9331F", ochre: "#B8821A"
  };
  const FIGURE_TYPES = ["compare", "timeline", "groups", "tree", "raw"];

  function figErr(msg) { throw new Error("figure: " + msg); }
  function r1(n) { return Math.round(Number(n) * 10) / 10; }

  function figEsc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** 한글·한자·전각은 글자폭 1em, 그 외는 약 0.56em으로 잡는다(시스템 글꼴 근사) */
  function figIsWide(ch) {
    const c = ch.charCodeAt(0);
    return (c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0x303E) ||
           (c >= 0x3041 && c <= 0x33FF) || (c >= 0x3400 && c <= 0x4DBF) ||
           (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0xA000 && c <= 0xA4CF) ||
           (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
           (c >= 0xFE30 && c <= 0xFE6F) || (c >= 0xFF00 && c <= 0xFF60) ||
           (c >= 0xFFE0 && c <= 0xFFE6);
  }

  function figTextWidth(s, fs) {
    const str = String(s == null ? "" : s);
    let w = 0;
    for (let i = 0; i < str.length; i++) w += figIsWide(str[i]) ? fs : fs * 0.56;
    return w;
  }

  /** 줄바꿈 후보 조각으로 자른다. 띄어쓰기 + "/"·"·" 뒤에서도 끊을 수 있게 한다. */
  function figTokens(str) {
    const out = [];
    String(str).split(/\s+/).forEach(function (w, wi) {
      const parts = w.match(/[^/·]+[/·]?|[/·]/g) || [w];
      parts.forEach(function (p, pi) { out.push({ t: p, sp: pi === 0 && wi > 0 }); });
    });
    return out;
  }

  /** maxW 안에 들어가도록 줄바꿈. 조각이 한 줄보다 길면 글자 단위로 자른다. */
  function figWrap(s, maxW, fs) {
    const str = String(s == null ? "" : s).trim();
    if (!str) return [""];
    const lines = [];
    let cur = "";
    figTokens(str).forEach(function (tok) {
      const cand = cur ? cur + (tok.sp ? " " : "") + tok.t : tok.t;
      if (figTextWidth(cand, fs) <= maxW) { cur = cand; return; }
      if (cur) { lines.push(cur); cur = ""; }
      if (figTextWidth(tok.t, fs) <= maxW) { cur = tok.t; return; }
      let piece = "";
      for (let i = 0; i < tok.t.length; i++) {
        const next = piece + tok.t[i];
        if (piece && figTextWidth(next, fs) > maxW) { lines.push(piece); piece = tok.t[i]; }
        else piece = next;
      }
      cur = piece;
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  function figText(lines, x, y, fs, opt) {
    const o = opt || {};
    const anchor = o.anchor || "start";
    const fill = o.fill || FIGURE_COLORS.ink;
    const lh = o.lh || FIG_LH;
    const bold = o.bold ? ' font-weight="700"' : "";
    let out = "";
    (Array.isArray(lines) ? lines : [lines]).forEach(function (ln, i) {
      out += '<text x="' + r1(x) + '" y="' + r1(y + i * lh) + '" font-size="' + fs +
             '" fill="' + fill + '" text-anchor="' + anchor + '"' + bold + '>' + figEsc(ln) + '</text>';
    });
    return out;
  }

  function figRect(x, y, w, h, opt) {
    const o = opt || {};
    return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) +
           '" rx="' + (o.rx == null ? 8 : o.rx) + '" fill="' + (o.fill || "none") +
           '" stroke="' + (o.stroke || FIGURE_COLORS.ink) + '" stroke-width="' + (o.sw == null ? 1 : o.sw) + '"/>';
  }

  function figLine(x1, y1, x2, y2, opt) {
    const o = opt || {};
    return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) +
           '" stroke="' + (o.stroke || FIGURE_COLORS.ink) + '" stroke-width="' + (o.sw == null ? 1 : o.sw) + '"/>';
  }

  function figStr(v, what) {
    if (typeof v !== "string" || !v.trim()) figErr(what + "이(가) 비어 있습니다");
    return v.trim();
  }
  function figArr(v, what) {
    if (!Array.isArray(v) || v.length === 0) figErr(what + "이(가) 비어 있습니다");
    return v;
  }

  /* ---- compare: 2~3열 비교표 ---- */
  function figCompare(spec) {
    const cols = figArr(spec.cols, "compare.cols").map(function (c, i) { return figStr(c, "compare.cols[" + i + "]"); });
    if (cols.length > 3) figErr("compare.cols는 3열까지만 지원합니다");
    const rows = figArr(spec.rows, "compare.rows");
    rows.forEach(function (r, i) {
      if (!Array.isArray(r) || r.length !== cols.length + 1) {
        figErr("compare.rows[" + i + "]는 항목 이름 1개 + 값 " + cols.length + "개여야 합니다");
      }
      r.forEach(function (cell, j) { figStr(cell, "compare.rows[" + i + "][" + j + "]"); });
    });

    const headFill = [FIGURE_COLORS.green, FIGURE_COLORS.ochre, FIGURE_COLORS.ink];
    const tableX = FIG_PAD, tableW = FIG_W - FIG_PAD * 2;
    const labelW = 88, colW = (tableW - labelW) / cols.length;
    const cellPad = 6;

    const headLines = cols.map(function (c) { return figWrap(c, colW - cellPad * 2, FIG_FS); });
    const headH = Math.max.apply(null, headLines.map(function (L) { return L.length; })) * FIG_LH + 10;

    const bodyLines = rows.map(function (r) {
      return r.map(function (cell, j) {
        const w = (j === 0 ? labelW : colW) - cellPad * 2;
        return figWrap(cell, w, FIG_FS);
      });
    });
    const rowH = bodyLines.map(function (L) {
      return Math.max.apply(null, L.map(function (x) { return x.length; })) * FIG_LH + 10;
    });

    const tableH = headH + rowH.reduce(function (a, b) { return a + b; }, 0);
    const H = FIG_PAD * 2 + tableH;

    let s = "";
    s += figRect(tableX, FIG_PAD, tableW, tableH, { rx: 10, sw: 1.5 });
    // 머리글 배경
    s += '<path d="M' + r1(tableX + 10) + ' ' + FIG_PAD + ' H' + r1(tableX + tableW - 10) +
         ' a10,10 0 0 1 10,10 V' + r1(FIG_PAD + headH) + ' H' + r1(tableX) + ' V' + r1(FIG_PAD + 10) +
         ' a10,10 0 0 1 10,-10 Z" fill="#EDE6D8"/>';
    s += figRect(tableX, FIG_PAD, tableW, tableH, { rx: 10, sw: 1.5 });

    cols.forEach(function (c, j) {
      const cx = tableX + labelW + colW * j + colW / 2;
      s += figText(headLines[j], cx, FIG_PAD + FIG_LH, FIG_FS,
                   { anchor: "middle", bold: true, fill: headFill[j] || FIGURE_COLORS.ink });
    });

    let y = FIG_PAD + headH;
    s += figLine(tableX, y, tableX + tableW, y, { sw: 1.5 });
    bodyLines.forEach(function (L, i) {
      const h = rowH[i];
      L.forEach(function (lines, j) {
        const isLabel = j === 0;
        const x = isLabel ? tableX + cellPad : tableX + labelW + colW * (j - 1) + colW / 2;
        s += figText(lines, x, y + FIG_LH, FIG_FS,
                     { anchor: isLabel ? "start" : "middle", bold: isLabel, fill: FIGURE_COLORS.ink });
      });
      y += h;
      if (i < bodyLines.length - 1) s += figLine(tableX, y, tableX + tableW, y, { stroke: "#CFC6B3" });
    });

    // 세로 구분선(바깥 테두리는 제외)
    for (let j = 0; j < cols.length; j++) {
      const x = tableX + labelW + colW * j;
      s += figLine(x, FIG_PAD, x, FIG_PAD + tableH, { stroke: "#CFC6B3" });
    }
    return { h: H, body: s };
  }

  /* ---- timeline: 좌→우 시간선, 기간은 황토색 칩 ---- */
  function figTimeline(spec) {
    const steps = figArr(spec.steps, "timeline.steps").map(function (st, i) {
      if (!st || typeof st !== "object") figErr("timeline.steps[" + i + "]가 객체가 아닙니다");
      return { label: figStr(st.label, "timeline.steps[" + i + "].label"), dur: st.dur ? String(st.dur).trim() : "" };
    });
    const n = steps.length;
    const laneW = (FIG_W - FIG_PAD * 2) / n;
    const chipH = 18, chipTop = FIG_PAD;
    const axisY = chipTop + chipH + 12;
    const labelTop = axisY + 18;
    const labelMaxW = laneW - 6;

    const labelLines = steps.map(function (st) { return figWrap(st.label, labelMaxW, FIG_FS); });
    const maxLines = Math.max.apply(null, labelLines.map(function (L) { return L.length; }));
    const H = labelTop + maxLines * FIG_LH - 4 + FIG_PAD;
    const cx = function (i) { return FIG_PAD + laneW * i + laneW / 2; };

    let s = "";
    s += figLine(cx(0), axisY, cx(n - 1), axisY, { sw: 1.5 });
    for (let i = 0; i < n - 1; i++) {
      const mx = (cx(i) + cx(i + 1)) / 2;
      s += '<path d="M' + r1(mx - 3) + ' ' + r1(axisY - 4) + ' L' + r1(mx + 4) + ' ' + r1(axisY) +
           ' L' + r1(mx - 3) + ' ' + r1(axisY + 4) + ' Z" fill="' + FIGURE_COLORS.ink + '"/>';
    }
    steps.forEach(function (st, i) {
      const x = cx(i);
      if (st.dur) {
        const w = Math.min(laneW - 2, figTextWidth(st.dur, FIG_FS) + 16);
        s += '<rect x="' + r1(x - w / 2) + '" y="' + chipTop + '" width="' + r1(w) + '" height="' + chipH +
             '" rx="9" fill="' + FIGURE_COLORS.ochre + '"/>';
        s += figText([st.dur], x, chipTop + 13, FIG_FS, { anchor: "middle", bold: true, fill: FIGURE_COLORS.paper });
        s += figLine(x, chipTop + chipH, x, axisY - 5, { stroke: FIGURE_COLORS.ochre });
      }
      s += '<circle cx="' + r1(x) + '" cy="' + r1(axisY) + '" r="5" fill="' + FIGURE_COLORS.paper +
           '" stroke="' + FIGURE_COLORS.green + '" stroke-width="2.5"/>';
      s += figText(labelLines[i], x, labelTop, FIG_FS, { anchor: "middle", fill: FIGURE_COLORS.ink });
    });
    return { h: H, body: s };
  }

  /* ---- groups: 암기법이 끊는 위치 그대로 묶음 칸 ---- */
  function figGroups(spec) {
    const groups = figArr(spec.groups, "groups.groups").map(function (g, i) {
      if (!g || typeof g !== "object") figErr("groups.groups[" + i + "]가 객체가 아닙니다");
      return {
        name: figStr(g.name, "groups.groups[" + i + "].name"),
        items: figArr(g.items, "groups.groups[" + i + "].items").map(function (it, j) {
          return figStr(it, "groups.groups[" + i + "].items[" + j + "]");
        })
      };
    });

    const boxX = FIG_PAD, boxW = FIG_W - FIG_PAD * 2, inX = boxX + 8, inW = boxW - 16;
    const chipPad = 7, chipGap = 6, rowGap = 6, headH = 18, boxGap = 8;

    // 칩을 줄 단위로 배치
    const laid = groups.map(function (g) {
      const rows = [];
      let row = [], rowW = 0;
      g.items.forEach(function (it) {
        const lines = figWrap(it, inW - chipPad * 2, FIG_FS);
        const w = Math.min(inW, Math.max.apply(null, lines.map(function (l) { return figTextWidth(l, FIG_FS); })) + chipPad * 2);
        const h = lines.length * FIG_LH + 6;
        if (row.length && rowW + chipGap + w > inW) { rows.push(row); row = []; rowW = 0; }
        row.push({ lines: lines, w: w, h: h });
        rowW += (rowW ? chipGap : 0) + w;
      });
      if (row.length) rows.push(row);
      const rowHs = rows.map(function (r) { return Math.max.apply(null, r.map(function (c) { return c.h; })); });
      const bodyH = rowHs.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, rows.length - 1) * rowGap;
      return { name: g.name, rows: rows, rowHs: rowHs, h: 8 + headH + 4 + bodyH + 8 };
    });

    const H = FIG_PAD * 2 + laid.reduce(function (a, g) { return a + g.h; }, 0) + Math.max(0, laid.length - 1) * boxGap;

    let s = "", y = FIG_PAD;
    laid.forEach(function (g) {
      s += figRect(boxX, y, boxW, g.h, { rx: 10, sw: 1.5, stroke: FIGURE_COLORS.ochre });
      s += figText([g.name], inX, y + 8 + 13, FIG_FS, { bold: true, fill: FIGURE_COLORS.ochre });
      let cy = y + 8 + headH + 4;
      g.rows.forEach(function (row, ri) {
        let cxp = inX;
        row.forEach(function (c) {
          s += '<rect x="' + r1(cxp) + '" y="' + r1(cy) + '" width="' + r1(c.w) + '" height="' + r1(c.h) +
               '" rx="6" fill="' + FIGURE_COLORS.paper + '" stroke="' + FIGURE_COLORS.ink + '" stroke-width="1"/>';
          s += figText(c.lines, cxp + chipPad, cy + 15, FIG_FS, { fill: FIGURE_COLORS.ink });
          cxp += c.w + chipGap;
        });
        cy += g.rowHs[ri] + rowGap;
      });
      y += g.h + boxGap;
    });
    return { h: H, body: s };
  }

  /* ---- tree: 포함 관계 ---- */
  function figTree(spec) {
    const rootName = figStr(spec.root, "tree.root");
    const kids = figArr(spec.children, "tree.children").map(function (c, i) {
      if (typeof c === "string") return { name: figStr(c, "tree.children[" + i + "]"), children: [] };
      if (!c || typeof c !== "object") figErr("tree.children[" + i + "]가 문자열도 객체도 아닙니다");
      return {
        name: figStr(c.name, "tree.children[" + i + "].name"),
        children: (Array.isArray(c.children) ? c.children : []).map(function (g, j) {
          return figStr(typeof g === "string" ? g : (g && g.name), "tree.children[" + i + "].children[" + j + "]");
        })
      };
    });
    if (kids.length > 3) figErr("tree.children는 3개까지만 지원합니다");

    const n = kids.length;
    const laneW = (FIG_W - FIG_PAD * 2) / n;
    const rootFS = 13;
    const rootLines = figWrap(rootName, FIG_W - FIG_PAD * 2 - 24, rootFS);
    const rootH = rootLines.length * FIG_LH + 10;
    const rootW = Math.min(FIG_W - FIG_PAD * 2,
      Math.max.apply(null, rootLines.map(function (l) { return figTextWidth(l, rootFS); })) + 26);
    const rootY = FIG_PAD, midX = FIG_W / 2;
    const busY = rootY + rootH + 10;
    const kidTop = busY + 10;
    const kidW = laneW - 10;

    const kidLay = kids.map(function (k) {
      const nameLines = figWrap(k.name, kidW - 12, FIG_FS);
      const nameH = nameLines.length * FIG_LH + 8;
      const leaves = k.children.map(function (g) {
        const lines = figWrap(g, kidW - 14, FIG_FS);
        return { lines: lines, h: lines.length * FIG_LH + 6 };
      });
      const leafH = leaves.reduce(function (a, l) { return a + l.h; }, 0) + Math.max(0, leaves.length - 1) * 5;
      return { nameLines: nameLines, nameH: nameH, leaves: leaves, h: nameH + (leaves.length ? 8 + leafH : 0) };
    });
    const H = kidTop + Math.max.apply(null, kidLay.map(function (k) { return k.h; })) + FIG_PAD;
    const cx = function (i) { return FIG_PAD + laneW * i + laneW / 2; };

    let s = "";
    s += figRect(midX - rootW / 2, rootY, rootW, rootH, { rx: 9, sw: 2, fill: FIGURE_COLORS.paper });
    s += figText(rootLines, midX, rootY + FIG_LH - 1, rootFS, { anchor: "middle", bold: true });
    s += figLine(midX, rootY + rootH, midX, busY, { sw: 1.5 });
    if (n > 1) s += figLine(cx(0), busY, cx(n - 1), busY, { sw: 1.5 });
    kids.forEach(function (k, i) {
      const L = kidLay[i], x = cx(i) - kidW / 2;
      s += figLine(cx(i), busY, cx(i), kidTop, { sw: 1.5 });
      s += figRect(x, kidTop, kidW, L.nameH, { rx: 8, sw: 1.5, stroke: FIGURE_COLORS.green, fill: FIGURE_COLORS.paper });
      s += figText(L.nameLines, cx(i), kidTop + FIG_LH - 2, FIG_FS,
                   { anchor: "middle", bold: true, fill: FIGURE_COLORS.green });
      let ly = kidTop + L.nameH + 8;
      L.leaves.forEach(function (lf) {
        s += '<rect x="' + r1(x + 4) + '" y="' + r1(ly) + '" width="' + r1(kidW - 8) + '" height="' + r1(lf.h) +
             '" rx="6" fill="none" stroke="' + FIGURE_COLORS.ochre + '" stroke-width="1"/>';
        s += figText(lf.lines, cx(i), ly + 15, FIG_FS, { anchor: "middle", fill: FIGURE_COLORS.ink });
        ly += lf.h + 5;
      });
    });
    return { h: H, body: s };
  }

  /** 스펙에 들어 있는 "보이는 글자" 전부 (검사·접근성 문구용) */
  function figureTexts(spec) {
    if (!spec || typeof spec !== "object") return [];
    const out = [];
    if (typeof spec.title === "string" && spec.title.trim()) out.push(spec.title.trim());
    const push = function (v) { if (typeof v === "string" && v.trim()) out.push(v.trim()); };
    if (spec.type === "compare") {
      (spec.cols || []).forEach(push);
      (spec.rows || []).forEach(function (r) { (Array.isArray(r) ? r : []).forEach(push); });
    } else if (spec.type === "timeline") {
      (spec.steps || []).forEach(function (st) { if (st) { push(st.label); push(st.dur); } });
    } else if (spec.type === "groups") {
      (spec.groups || []).forEach(function (g) { if (g) { push(g.name); (g.items || []).forEach(push); } });
    } else if (spec.type === "tree") {
      push(spec.root);
      (spec.children || []).forEach(function (c) {
        if (typeof c === "string") { push(c); return; }
        if (!c) return;
        push(c.name);
        (c.children || []).forEach(function (g) { push(typeof g === "string" ? g : (g && g.name)); });
      });
    }
    return out;
  }

  /** 접근성 문구: 제목 한 줄 + 설명 한 줄 (카드 글자 + 구조 설명어로만 만든다) */
  function figureAria(spec) {
    const t = spec.type;
    if (typeof spec.title === "string" && spec.title.trim()) {
      return { title: spec.title.trim(), desc: (spec.desc && String(spec.desc).trim()) || figureTexts(spec).join(", ") };
    }
    if (t === "compare") {
      return { title: (spec.cols || []).join(" 대 ") + " 비교표",
               desc: (spec.rows || []).map(function (r) { return r[0] + ": " + r.slice(1).join(" / "); }).join(" · ") };
    }
    if (t === "timeline") {
      return { title: "시간 순서 그림",
               desc: (spec.steps || []).map(function (s) { return s.label + (s.dur ? " " + s.dur : ""); }).join(" → ") };
    }
    if (t === "groups") {
      return { title: (spec.groups || []).map(function (g) { return g.name; }).join(" / ") + " 묶음 그림",
               desc: (spec.groups || []).map(function (g) { return g.name + ": " + (g.items || []).join(", "); }).join(" · ") };
    }
    if (t === "tree") {
      return { title: spec.root + " 포함 관계 그림",
               desc: (spec.children || []).map(function (c) {
                 if (typeof c === "string") return c;
                 return c.name + (c.children && c.children.length ? "(" + c.children.join(", ") + ")" : "");
               }).join(" · ") };
    }
    return { title: "그림", desc: "" };
  }

  /** 스펙 → 인라인 SVG 문자열. 스펙이 잘못되면 Error를 던진다. */
  function figureToSvg(spec) {
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) figErr("스펙이 객체가 아닙니다");
    if (FIGURE_TYPES.indexOf(spec.type) === -1) figErr('알 수 없는 type "' + spec.type + '"');
    if (spec.type === "raw") {
      const raw = spec.svg;
      if (typeof raw !== "string" || !/^\s*<svg[\s>]/.test(raw)) figErr("raw.svg는 <svg 로 시작하는 문자열이어야 합니다");
      return raw;
    }
    const built = spec.type === "compare" ? figCompare(spec)
                : spec.type === "timeline" ? figTimeline(spec)
                : spec.type === "groups" ? figGroups(spec)
                : figTree(spec);
    const H = Math.round(built.h);
    const a = figureAria(spec);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + FIG_W + ' ' + H +
           '" width="100%" role="img" aria-label="' + figEsc(a.title) + '" font-family="' + FIG_FONT + '">' +
           '<title>' + figEsc(a.title) + '</title><desc>' + figEsc(a.desc) + '</desc>' +
           '<rect x="0" y="0" width="' + FIG_W + '" height="' + H + '" fill="' + FIGURE_COLORS.paper + '"/>' +
           built.body + '</svg>';
  }

  PLCore.FIGURE_COLORS = FIGURE_COLORS;
  PLCore.FIGURE_TYPES = FIGURE_TYPES;
  PLCore.figureToSvg = figureToSvg;
  PLCore.figureTexts = figureTexts;
  PLCore.figureAria = figureAria;

  /* ================================================================
   * 15. 암기카드 — Leitner 5박스 스케줄 (CLAUDE.md 「학습 알고리즘 상수」)
   * ================================================================ */
  // 박스 ①~⑤ → 인덱스 0~4. 스프린트(시험 임박)는 ① 0일(같은 세션 끝 재노출)부터 ⑤ 7일까지.
  const CARD_INTERVALS = { sprint: [0, 1, 2, 4, 7], regular: [1, 3, 7, 14, 30] };
  const CARD_RATINGS = ["again", "hard", "good"];   // 모름 · 애매 · 알아요
  const CARD_BOX_MAX = 5;

  /** 아직 한 번도 안 본 카드의 기본 상태(due null = 늘 "새 카드") */
  function cardStateDefault() {
    return { box: 1, due: null, streak: 0, lapses: 0, auto: false, last: null };
  }

  function cardBox(v) {
    const n = Math.round(Number(v));
    if (!isFinite(n)) return 1;
    return Math.min(CARD_BOX_MAX, Math.max(1, n));
  }
  function nonNegInt(v) {
    const n = Math.round(Number(v));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function cardIntervals(track) {
    return CARD_INTERVALS[track] || CARD_INTERVALS.sprint;
  }

  /** D-3 규칙: 시험 3일 전부터 다음 만기는 내일까지, D-1·시험 당일은 오늘 */
  function capCardDue(due, todayStr, examDate) {
    if (!due || !examDate) return due;
    const dd = dday(examDate, todayStr);
    if (dd == null || dd > 3) return due;
    const limit = dd <= 1 ? todayStr : addDays(todayStr, 1);
    return due > limit ? limit : due;
  }

  /**
   * 카드 한 장 채점 → **새 상태**(원본 불변).
   * @param {object|null} state  기존 pl.v1.cards[cid] (없으면 기본 상태)
   * @param {"again"|"hard"|"good"} rating  모름 · 애매 · 알아요
   * @param {string} todayStr
   * @param {{track?:string, examDate?:string}} ctx
   */
  function reviewCard(state, rating, todayStr, ctx) {
    if (CARD_RATINGS.indexOf(rating) === -1) {
      throw new Error('reviewCard: 알 수 없는 rating "' + rating + '" (again|hard|good)');
    }
    const c = ctx || {};
    const t = todayStr || today();
    const iv = cardIntervals(c.track);
    const base = Object.assign(cardStateDefault(), (state && typeof state === "object") ? state : null);
    const box = cardBox(base.box);
    let next;
    if (rating === "again") {          // 모름 → 박스①로 떨어뜨리고 다시 센다
      next = { box: 1, streak: 0, lapses: nonNegInt(base.lapses) + 1, due: addDays(t, iv[0]) };
    } else if (rating === "hard") {    // 애매 → 박스 유지, 내일 다시
      next = { box: box, streak: 0, lapses: nonNegInt(base.lapses), due: addDays(t, 1) };
    } else {                           // 알아요 → 박스 +1(상한 5), 새 박스 간격만큼 쉼
      const nb = Math.min(CARD_BOX_MAX, box + 1);
      next = { box: nb, streak: nonNegInt(base.streak) + 1, lapses: nonNegInt(base.lapses), due: addDays(t, iv[nb - 1]) };
    }
    next.due = capCardDue(next.due, t, c.examDate);
    next.last = t;
    next.auto = base.auto === true;
    return Object.assign({}, base, next);
  }

  PLCore.CARD_INTERVALS = CARD_INTERVALS;
  PLCore.cardStateDefault = cardStateDefault;
  PLCore.reviewCard = reviewCard;

  /* 오늘 낼 카드 · 자동 편입 · 박스 분포 ----------------------------- */
  const CARD_IMPORTANCE_RANK = { H: 0, M: 1, L: 2 };

  function cardsArray(cards) {
    return Array.isArray(cards) ? cards.filter(function (c) { return c && c.id; }) : [];
  }
  function impRank(v) {
    const r = CARD_IMPORTANCE_RANK[v];
    return r == null ? 3 : r;
  }
  function cmpStr(a, b) {
    const x = String(a == null ? "" : a), y = String(b == null ? "" : b);
    return x < y ? -1 : (x > y ? 1 : 0);
  }
  /** opts.filter = { subject, category, kind, onlyAuto, topic, topics } (빈 값은 "전체") */
  function matchCardFilter(c, s, f) {
    if (!f) return true;
    if (f.subject != null && f.subject !== "" && Number(c.subject) !== Number(f.subject)) return false;
    if (f.category != null && f.category !== "" && String(c.category || "") !== String(f.category)) return false;
    if (f.kind != null && f.kind !== "" && String(c.kind || "") !== String(f.kind)) return false;
    if (f.topic != null && f.topic !== "" && String(c.topic || "") !== String(f.topic)) return false;
    if (Array.isArray(f.topics) && f.topics.length && f.topics.indexOf(c.topic) === -1) return false;
    if (f.onlyAuto === true && !(s && s.auto === true)) return false;
    return true;
  }

  /**
   * 오늘 낼 카드.
   * due   = 상태가 있고 만기가 오늘 이하(박스 낮은 순 → 만기 오래된 순 → id)
   * fresh = 아직 안 본 카드(상태 없음 또는 due null. 중요도 H→M→L → 과목 → 토픽 → id)
   * queue = 하루 상한(opts.limit)을 만기부터 채우고 남으면 새 카드로 채운 **오늘의 출제 순서**
   * todayNew = 그중 새 카드 몫. due·fresh 자체는 상한으로 자르지 않는다(화면 숫자용).
   */
  function dueCards(cards, states, todayStr, opts) {
    const t = todayStr || today();
    const o = opts || {};
    const st = states || {};
    const list = cardsArray(cards).filter(function (c) { return matchCardFilter(c, st[c.id], o.filter); });
    const due = [], fresh = [];
    list.forEach(function (c) {
      const s = st[c.id];
      if (s && s.due) { if (s.due <= t) due.push(c); }
      else fresh.push(c);
    });
    due.sort(function (a, b) {
      const sa = st[a.id], sb = st[b.id];
      const ba = cardBox(sa.box), bb = cardBox(sb.box);
      if (ba !== bb) return ba - bb;
      if (sa.due !== sb.due) return sa.due < sb.due ? -1 : 1;
      return cmpStr(a.id, b.id);
    });
    fresh.sort(function (a, b) {
      const ia = impRank(a.importance), ib = impRank(b.importance);
      if (ia !== ib) return ia - ib;
      const na = Number(a.subject) || 0, nb = Number(b.subject) || 0;
      if (na !== nb) return na - nb;
      const ct = cmpStr(a.topic, b.topic);
      return ct !== 0 ? ct : cmpStr(a.id, b.id);
    });
    const dueIds = due.map(function (c) { return c.id; });
    const freshIds = fresh.map(function (c) { return c.id; });
    const limit = (o.limit == null || o.limit === false) ? null : Math.max(0, Math.floor(Number(o.limit) || 0));
    let queue, todayNew;
    if (limit == null) {
      todayNew = freshIds.slice();
      queue = dueIds.concat(todayNew);
    } else {
      queue = dueIds.slice(0, limit);
      todayNew = freshIds.slice(0, Math.max(0, limit - queue.length));
      queue = queue.concat(todayNew);
    }
    return { due: dueIds, fresh: freshIds, todayNew: todayNew, queue: queue, limit: limit };
  }

  /**
   * 문항을 틀렸을 때(또는 찍어서 맞혔을 때) 연결 카드를 "내 메모리 노트"로 편입.
   * 부르는 쪽이 오답·찍음 여부를 판단한다(이 함수는 시도를 보지 않는다).
   * 이미 상태가 있으면 박스①·오늘 만기로 내리고 lapses는 올리지 않는다(카드를 틀린 게 아니다).
   * @returns {{states:object, enrolled:string[]}} states는 새 객체(원본 불변)
   */
  function enrollCardsForMistake(q, cards, states, todayStr) {
    const t = todayStr || today();
    const st = (states && typeof states === "object") ? states : {};
    const ids = (q && Array.isArray(q.cards)) ? q.cards : [];
    const known = Array.isArray(cards)
      ? cardsArray(cards).reduce(function (m, c) { m[c.id] = true; return m; }, {})
      : null;
    const out = Object.assign({}, st);
    const enrolled = [];
    ids.forEach(function (cid) {
      if (!cid || enrolled.indexOf(cid) !== -1) return;
      if (known && !known[cid]) return;
      const prev = out[cid];
      out[cid] = Object.assign(cardStateDefault(), (prev && typeof prev === "object") ? prev : null,
        { box: 1, due: t, streak: 0, auto: true });
      enrolled.push(cid);
    });
    return { states: out, enrolled: enrolled };
  }

  /** 카드 홈 요약. 박스 합 + unseen = total */
  function cardBoxSummary(states, cardsAll, todayStr) {
    const t = todayStr || today();
    const st = states || {};
    const list = cardsArray(cardsAll);
    const boxes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let unseen = 0, dueToday = 0, autoCount = 0;
    list.forEach(function (c) {
      const s = st[c.id];
      if (s && s.auto === true) autoCount += 1;
      if (!s || !s.due) { unseen += 1; return; }
      boxes[cardBox(s.box)] += 1;
      if (s.due <= t) dueToday += 1;
    });
    return { boxes: boxes, unseen: unseen, dueToday: dueToday, autoCount: autoCount, total: list.length };
  }

  PLCore.dueCards = dueCards;
  PLCore.enrollCardsForMistake = enrollCardsForMistake;
  PLCore.cardBoxSummary = cardBoxSummary;

  /* 카드 연동 숙달도 — 카드 "모름"은 관련 문항 mastery −10 --------- */
  const CARD_PENALTY = 10;        // 박스①에 있는 카드 1장당 −10
  const CARD_PENALTY_DAYS = 3;    // 최근 3일 안에 본 카드만 센다(오래된 건 이미 잊은 게 아니라 안 본 것)

  /** 문항에 연결된 카드 중 "최근에 모름 처리된"(박스① + last 3일 이내) 장수 × 10 */
  function cardPenalty(q, states, todayStr) {
    if (!states || !q || !Array.isArray(q.cards) || !q.cards.length) return 0;
    const t = todayStr || today();
    const seen = {};
    let n = 0;
    q.cards.forEach(function (cid) {
      if (!cid || seen[cid]) return;
      seen[cid] = true;
      const s = states[cid];
      if (!s || cardBox(s.box) !== 1 || !s.last) return;
      const d = daysBetween(s.last, t);
      if (d != null && d >= 0 && d <= CARD_PENALTY_DAYS) n += 1;
    });
    return n * CARD_PENALTY;
  }

  /** questionMastery − 카드 벌점(하한 0). 시도가 없으면 null 그대로 */
  function questionMasteryWithCards(atts, q, todayStr, states) {
    const m = questionMastery(atts, q, todayStr);
    if (m === null) return null;
    return Math.max(0, m - cardPenalty(q, states, todayStr));
  }

  /** topicMastery와 같은 모양 + 카드 벌점 반영(states 없으면 topicMastery와 같은 값) */
  function topicMasteryWithCards(topicId, questions, attemptsByQid, todayStr, states) {
    const map = attemptsByQid || {};
    const vals = [];
    const qs = Array.isArray(questions) ? questions : [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q || q.topic !== topicId) continue;
      const a = map[q.id];
      if (!a || !a.length) continue;
      const m = questionMasteryWithCards(a, q, todayStr, states);
      if (m === null) continue;
      vals.push(m);
    }
    const n = vals.length;
    if (n === 0) return { value: null, n: 0, measuring: true };
    let sum = 0;
    for (let i = 0; i < n; i++) sum += vals[i];
    return { value: (sum / n) * Math.min(1, n / 4), n: n, measuring: n < 4 };
  }

  /** subjectMasteryDetail와 같은 모양 + 카드 벌점 반영 */
  function subjectMasteryDetailWithCards(subjectId, topics, questions, attemptsByQid, todayStr, states) {
    const subs = (Array.isArray(topics) ? topics : []).filter(function (t) {
      return t && t.kind === "sub" && Number(t.subject) === Number(subjectId);
    });
    const byTopic = [];
    let num = 0, den = 0, attempted = 0;
    for (let i = 0; i < subs.length; i++) {
      const t = subs[i];
      const tm = topicMasteryWithCards(t.id, questions, attemptsByQid, todayStr, states);
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

  function subjectMasteryWithCards(subjectId, topics, questions, attemptsByQid, todayStr, states) {
    return subjectMasteryDetailWithCards(subjectId, topics, questions, attemptsByQid, todayStr, states).value;
  }

  PLCore.questionMasteryWithCards = questionMasteryWithCards;
  PLCore.topicMasteryWithCards = topicMasteryWithCards;
  PLCore.subjectMasteryWithCards = subjectMasteryWithCards;
  PLCore.subjectMasteryDetailWithCards = subjectMasteryDetailWithCards;

  /* ================================================================
   * 16. 프리셋 3종 — 약점 공격 · 법령/숫자 · 오늘 복습
   * ================================================================ */
  const PRESETS = {
    weakness: { key: "weakness", name: "WEAKNESS ATTACK", ko: "약점 공격", n: 15, cards: 10,
                desc: "숙달 하위 3개 세부항목만 집중" },
    lawnum:   { key: "lawnum", name: "LAW & NUMBERS", ko: "법령·숫자", n: 15, cards: 10,
                desc: "숫자·기한·한도 문항 + 숫자 카드" },
    today:    { key: "today", name: "TODAY'S REVIEW", ko: "오늘 복습", n: 15, cards: null,
                desc: "오늘 만기 오답 + 오늘 만기 카드" }
  };
  const PRESET_WEAK_TOPICS = 3;
  const LAWNUM_QTYPES = ["limit_number", "calc", "table", "blank"];
  const LAWNUM_TAGS = ["숫자", "기한", "한도"];
  const UNTRIED_TOPIC_MASTERY = 20;    // 미시도 토픽은 20으로 본다(과목 숙달과 같은 규칙)

  /**
   * 취약 우선순위 P (CLAUDE.md 「적응형 출제」).
   * buildAdaptiveSet 안의 adaptiveP와 같은 공식이다(그쪽은 세트 구성용 캐시를 따로 쓴다).
   * @param {object} q
   * @param {{topics?:Array, attemptsByQid?:object, mistakes?:object, todayStr?:string, cache?:object}} ctx
   */
  function questionPriority(q, ctx) {
    if (!q) return 0;
    const c = ctx || {};
    const t = c.todayStr || today();
    const byQid = c.attemptsByQid || {};
    const mist = c.mistakes || {};
    const cache = c.cache || {};
    if (!cache.qm) cache.qm = {};
    if (!cache.tp) {
      const map = {};
      let maxExp = 1;
      (Array.isArray(c.topics) ? c.topics : []).forEach(function (tp) {
        if (!tp || tp.kind !== "sub") return;
        map[tp.id] = tp;
        const e = Number(tp.exp_q) || 0;
        if (e > maxExp) maxExp = e;
      });
      cache.tp = { map: map, maxExp: maxExp };
    }

    const atts = sortedAtts(byQid[q.id] || []);
    let m = cache.qm[q.id];
    if (m === undefined) { m = questionMastery(atts, q, t); cache.qm[q.id] = m; }
    let p = 3 * (1 - (m == null ? 0 : m) / 100);

    let wrongRecent = false;
    const rec = mist[q.id];
    if (rec && rec.lastWrong) {
      const d = daysBetween(rec.lastWrong, t);
      if (d != null && d >= 0 && d <= 3) wrongRecent = true;
    }
    if (!wrongRecent) {
      for (let i = atts.length - 1; i >= 0; i--) {
        if (atts[i].correct === true) continue;
        const d = daysBetween(dateOf(atts[i].at), t);
        if (d != null && d >= 0 && d <= 3) wrongRecent = true;
        break;
      }
    }
    if (wrongRecent) p += 2;

    let streak = 0;
    for (let i = atts.length - 1; i >= 0; i--) {
      if (atts[i].correct === true) break;
      streak += 1;
    }
    p += 1.5 * Math.min(streak, 3) / 3;

    const last = atts[atts.length - 1];
    if (last && (last.conf === 0 || last.conf === 1)) p += 1;

    let secSum = 0, secN = 0;
    atts.forEach(function (a) {
      if (typeof a.sec === "number" && isFinite(a.sec)) { secSum += a.sec; secN += 1; }
    });
    const tlimit = (q.type === "short" ? TIME_TARGET.short : TIME_TARGET.mcq) * 1.5;
    if (secN && (secSum / secN) > tlimit) p += 1;

    p += 1.5 * (q.importance === "H" ? 1 : (q.importance === "M" ? 0.5 : 0));
    const tp = cache.tp.map[q.topic];
    p += (Number(tp && tp.exp_q) || 0) / cache.tp.maxExp;
    return p;
  }

  /**
   * 프리셋 세트(문항 + 카드).
   * @param {"weakness"|"lawnum"|"today"} name
   * @param {{questions:Array, cards:Array, topics:Array, attemptsByQid:object, mistakes:object,
   *          cardStates:object, todayStr:string, rng?:function, n?:number, cardLimit?:number}} ctx
   * @returns {{name:string, label:string, ko:string, qids:string[], cids:string[], topics:string[]}}
   */
  function buildPreset(name, ctx) {
    const meta = PRESETS[name];
    if (!meta) throw new Error('buildPreset: 알 수 없는 프리셋 "' + name + '"');
    const c = ctx || {};
    const t = c.todayStr || today();
    const questions = (Array.isArray(c.questions) ? c.questions : []).filter(function (q) { return q && q.id; });
    const cards = cardsArray(c.cards);
    const topics = Array.isArray(c.topics) ? c.topics : [];
    const byQid = c.attemptsByQid || {};
    const mist = c.mistakes || {};
    const states = c.cardStates || {};
    const rng = typeof c.rng === "function" ? c.rng : seededRandom(20260919);
    const n = (c.n == null || c.n === "") ? meta.n : Math.max(0, Math.floor(Number(c.n) || 0));
    const cardLimit = (c.cardLimit == null || c.cardLimit === "")
      ? meta.cards : Math.max(0, Math.floor(Number(c.cardLimit) || 0));

    const pctx = { topics: topics, attemptsByQid: byQid, mistakes: mist, todayStr: t, cache: {} };
    const shuffledIdx = {};
    shuffle(questions, rng).forEach(function (q, i) { shuffledIdx[q.id] = i; });
    function tried(q) { return ((byQid[q.id] || []).length) > 0; }
    /** P 높은 순(동점은 seed 순). untriedFirst면 미출제 문항을 먼저 */
    function rank(list, untriedFirst) {
      return list.slice().sort(function (a, b) {
        if (untriedFirst) {
          const ta = tried(a) ? 1 : 0, tb = tried(b) ? 1 : 0;
          if (ta !== tb) return ta - tb;
        }
        const pa = questionPriority(a, pctx), pb = questionPriority(b, pctx);
        if (pb !== pa) return pb - pa;
        return shuffledIdx[a.id] - shuffledIdx[b.id];
      }).map(function (q) { return q.id; });
    }
    function out(qids, cids, tps) {
      return { name: meta.key, label: meta.name, ko: meta.ko, qids: qids, cids: cids, topics: tps };
    }

    if (name === "weakness") {
      const hasQ = {};
      questions.forEach(function (q) { hasQ[q.topic] = true; });
      const weak = topics
        .filter(function (tp) { return tp && tp.kind === "sub" && hasQ[tp.id]; })
        .map(function (tp) {
          const tm = topicMasteryWithCards(tp.id, questions, byQid, t, states);
          return { id: tp.id, value: tm.value == null ? UNTRIED_TOPIC_MASTERY : tm.value, exp: Number(tp.exp_q) || 0 };
        })
        .sort(function (a, b) {
          if (a.value !== b.value) return a.value - b.value;      // 숙달 낮은 순
          if (b.exp !== a.exp) return b.exp - a.exp;              // 같으면 예상 문항수 많은 쪽
          return cmpStr(a.id, b.id);
        })
        .slice(0, PRESET_WEAK_TOPICS)
        .map(function (x) { return x.id; });
      const qids = rank(questions.filter(function (q) { return weak.indexOf(q.topic) !== -1; }), false).slice(0, n);
      const dc = dueCards(cards, states, t, { filter: { topics: weak }, limit: cardLimit });
      return out(qids, dc.queue, weak);
    }

    if (name === "lawnum") {
      const isLawNum = function (q) {
        if (LAWNUM_QTYPES.indexOf(q.qtype) !== -1) return true;
        const tags = Array.isArray(q.tags) ? q.tags : [];
        return tags.some(function (g) {
          const s = String(g == null ? "" : g);
          return LAWNUM_TAGS.some(function (k) { return s.indexOf(k) !== -1; });
        });
      };
      const qids = rank(questions.filter(isLawNum), true).slice(0, n);
      const dc = dueCards(cards, states, t, { filter: { kind: "number" }, limit: cardLimit });
      return out(qids, dc.queue, []);
    }

    // today — 오늘 만기 오답 + 오늘 만기 카드(새 카드는 넣지 않는다)
    const byId = {};
    questions.forEach(function (q) { byId[q.id] = q; });
    const qids = dueMistakes(mist, t).filter(function (id) { return !!byId[id]; }).slice(0, n);
    const dc = dueCards(cards, states, t, { limit: cardLimit });
    const cids = cardLimit == null ? dc.due.slice() : dc.due.slice(0, cardLimit);
    return out(qids, cids, []);
  }

  PLCore.PRESETS = PRESETS;
  PLCore.questionPriority = questionPriority;
  PLCore.buildPreset = buildPreset;

  /* ================================================================
   * 17. 백업 병합 (pl.v1.* 6개 키)
   * ================================================================ */
  const BACKUP_KEYS = ["settings", "attempts", "mistakes", "cards", "session", "mocks"];
  const BACKUP_PREFIX = "pl.v1.";

  /** 백업 파일이 "settings" · "pl.v1.settings" · data.settings 어느 모양이어도 읽는다 */
  function backupValue(obj, k) {
    if (!obj || typeof obj !== "object") return undefined;
    if (obj[k] !== undefined) return obj[k];
    if (obj[BACKUP_PREFIX + k] !== undefined) return obj[BACKUP_PREFIX + k];
    if (obj.data && typeof obj.data === "object" && obj.data[k] !== undefined) return obj.data[k];
    return undefined;
  }
  function attemptKey(a) { return String(a && a.qid) + "|" + String(a && a.at); }
  function mockKey(m) {
    if (m && m.sid) return "sid:" + m.sid;
    return "d:" + String(m && m.date) + ":" + String(m && m.raw);
  }
  /** 항목이 얼마나 최신인가 — last, 없으면 next(오답)·due(카드) */
  function entryRecency(e) {
    if (!e || typeof e !== "object") return "";
    return String(e.last || e.next || e.due || "");
  }
  function copyEntry(e) { return (e && typeof e === "object") ? Object.assign({}, e) : e; }
  /** 동의 기록은 지우지 않는다 — 참인 쪽을 남기고 새 키는 더한다 */
  function mergeAccepted(a, b) {
    const A = (a && typeof a === "object") ? a : {};
    const B = (b && typeof b === "object") ? b : {};
    const out = Object.assign({}, A);
    Object.keys(B).forEach(function (k) { if (out[k] === undefined || !out[k]) out[k] = B[k]; });
    return out;
  }
  /** 오답·카드 지도 병합 → { map, updated } */
  function mergeEntryMap(localMap, inMap) {
    const A = (localMap && typeof localMap === "object") ? localMap : {};
    const B = (inMap && typeof inMap === "object") ? inMap : {};
    const out = {};
    let updated = 0;
    Object.keys(A).forEach(function (k) { out[k] = copyEntry(A[k]); });
    Object.keys(B).forEach(function (k) {
      const b = B[k];
      if (!b || typeof b !== "object") return;
      const a = A[k];
      if (!a || typeof a !== "object") { out[k] = copyEntry(b); updated += 1; return; }
      if (entryRecency(b) > entryRecency(a)) { out[k] = copyEntry(b); updated += 1; }
    });
    return { map: out, updated: updated };
  }

  /**
   * 백업 병합(가져오기 "병합" 모드). local = 지금 기기, incoming = 백업 파일.
   * attempts (qid,at) 합집합 / mistakes·cards 항목별 최신 쪽 / mocks sid 합집합 /
   * settings는 last_backup·user_accepted만 병합(나머지 local) / session은 진행 중인 local 우선.
   * @returns {{merged:object, stats:{attemptsAdded:number,mistakesUpdated:number,cardsUpdated:number,mocksAdded:number}}}
   */
  function mergeBackup(local, incoming) {
    const L = local || {}, I = incoming || {};
    const arr = function (v) { return Array.isArray(v) ? v : []; };

    /* attempts — (qid, at) 합집합, 시간 순 */
    const seenAtt = {};
    const attempts = [];
    arr(backupValue(L, "attempts")).forEach(function (a) {
      if (!a) return;
      const k = attemptKey(a);
      if (seenAtt[k]) return;
      seenAtt[k] = true;
      attempts.push(Object.assign({}, a));
    });
    let attemptsAdded = 0;
    arr(backupValue(I, "attempts")).forEach(function (a) {
      if (!a) return;
      const k = attemptKey(a);
      if (seenAtt[k]) return;
      seenAtt[k] = true;
      attempts.push(Object.assign({}, a));
      attemptsAdded += 1;
    });
    attempts.sort(function (x, y) {
      const dx = timeOf(x), dy = timeOf(y);
      if (dx !== dy) return dx - dy;
      return cmpStr(x.qid, y.qid);
    });

    /* mistakes · cards — 항목별 더 최근 쪽 */
    const mi = mergeEntryMap(backupValue(L, "mistakes"), backupValue(I, "mistakes"));
    const cd = mergeEntryMap(backupValue(L, "cards"), backupValue(I, "cards"));

    /* mocks — sid 합집합, 날짜 순 */
    const seenMock = {};
    const mocks = [];
    arr(backupValue(L, "mocks")).forEach(function (m) {
      if (!m) return;
      const k = mockKey(m);
      if (seenMock[k]) return;
      seenMock[k] = true;
      mocks.push(Object.assign({}, m));
    });
    let mocksAdded = 0;
    arr(backupValue(I, "mocks")).forEach(function (m) {
      if (!m) return;
      const k = mockKey(m);
      if (seenMock[k]) return;
      seenMock[k] = true;
      mocks.push(Object.assign({}, m));
      mocksAdded += 1;
    });
    mocks.sort(function (x, y) {
      const c = cmpStr(x.date, y.date);
      return c !== 0 ? c : cmpStr(x.sid, y.sid);
    });

    /* settings — last_backup·user_accepted만 병합 */
    const ls = backupValue(L, "settings"), is = backupValue(I, "settings");
    let settings = null;
    if (ls && typeof ls === "object") {
      settings = Object.assign({}, ls);
      if (is && typeof is === "object") {
        if (String(is.last_backup || "") > String(ls.last_backup || "")) settings.last_backup = is.last_backup;
        const ua = mergeAccepted(ls.user_accepted, is.user_accepted);
        if (Object.keys(ua).length || ls.user_accepted !== undefined) settings.user_accepted = ua;
      }
    } else if (is && typeof is === "object") {
      settings = Object.assign({}, is);
    }

    /* session — 진행 중인 local을 건드리지 않는다. local이 없을 때만 incoming */
    const lsn = backupValue(L, "session");
    const isn = backupValue(I, "session");
    let session = null;
    if (lsn) session = copyEntry(lsn);
    else if (isn) session = copyEntry(isn);

    return {
      merged: {
        settings: settings, attempts: attempts, mistakes: mi.map,
        cards: cd.map, session: session, mocks: mocks
      },
      stats: {
        attemptsAdded: attemptsAdded, mistakesUpdated: mi.updated,
        cardsUpdated: cd.updated, mocksAdded: mocksAdded
      }
    };
  }

  PLCore.BACKUP_KEYS = BACKUP_KEYS;
  PLCore.mergeBackup = mergeBackup;

  /* ================================================================
   * 18. 암기노트 한 장 내보내기(마크다운)
   * ================================================================ */
  const SUBJECT_NAMES = { 1: "화장품법의 이해", 2: "화장품 제조 및 품질관리", 3: "유통 화장품 안전관리", 4: "맞춤형화장품의 이해" };
  const BOX_MARK = ["①", "②", "③", "④", "⑤"];
  const NOTE_MAX_CARDS = 60;
  const NOTE_MAX_SENTENCES = 40;
  const NOTE_BOX_MAX = 3;        // 박스③ 이하 = 아직 안 외운 것
  const NOTE_LAW_LEN = 40;

  function subjectLabel(sid) {
    const n = Number(sid);
    const mark = SUBJ_MARK[n - 1] || "";
    const name = SUBJECT_NAMES[n];
    if (!name) return "기타 과목";
    return (mark ? mark + " " : "") + name;
  }
  function oneLine(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function shortLaw(src) {
    const law = (src && src.law) ? oneLine(src.law) : "";
    if (!law) return "";
    return law.length > NOTE_LAW_LEN ? law.slice(0, NOTE_LAW_LEN - 1) + "…" : law;
  }

  /**
   * 암기노트 한 장(마크다운 문자열).
   * 담는 것: auto(내 메모리 노트) 카드 + 박스③ 이하 카드 + 미졸업 오답의 memory_sentence.
   * @param {Array} cards 카드 은행 / @param {object} states pl.v1.cards
   * @param {Array} questions 문항 은행 / @param {object} mistakes pl.v1.mistakes
   * @param {{maxCards?:number, maxSentences?:number, todayStr?:string, examDate?:string}} opts
   */
  function memoryNoteText(cards, states, questions, mistakes, opts) {
    const o = opts || {};
    const t = o.todayStr || today();
    const st = states || {};
    const mist = mistakes || {};
    const maxCards = o.maxCards == null ? NOTE_MAX_CARDS : Math.max(0, Math.floor(Number(o.maxCards) || 0));
    const maxSent = o.maxSentences == null ? NOTE_MAX_SENTENCES : Math.max(0, Math.floor(Number(o.maxSentences) || 0));

    const picked = cardsArray(cards).filter(function (c) {
      const s = st[c.id];
      if (!s) return false;                                   // 아직 안 본 카드는 넣지 않는다
      return s.auto === true || cardBox(s.box) <= NOTE_BOX_MAX;
    }).sort(function (a, b) {
      const sa = st[a.id], sb = st[b.id];
      const ba = cardBox(sa.box), bb = cardBox(sb.box);
      if (ba !== bb) return ba - bb;                          // 박스 낮은(약한) 카드부터
      const aa = sa.auto === true ? 0 : 1, ab = sb.auto === true ? 0 : 1;
      if (aa !== ab) return aa - ab;                          // 내 메모리 노트 먼저
      const ia = impRank(a.importance), ib = impRank(b.importance);
      if (ia !== ib) return ia - ib;
      const na = Number(a.subject) || 0, nb = Number(b.subject) || 0;
      if (na !== nb) return na - nb;
      return cmpStr(a.id, b.id);
    }).slice(0, maxCards);

    const sents = (Array.isArray(questions) ? questions : []).filter(function (q) {
      if (!q || !q.id) return false;
      const m = mist[q.id];
      return !!m && m.stage !== "graduated" && !!oneLine(q.memory_sentence);
    }).sort(function (a, b) {
      const ca = Number(mist[a.id].count) || 0, cb = Number(mist[b.id].count) || 0;
      if (cb !== ca) return cb - ca;                          // 많이 틀린 것부터
      return cmpStr(a.id, b.id);
    }).slice(0, maxSent);

    const dd = o.examDate ? dday(o.examDate, t) : null;
    const autoN = picked.filter(function (c) { return st[c.id].auto === true; }).length;
    const out = [];
    out.push("# PASS LAB 암기노트 — " + t + (dd == null ? "" : " (D-" + dd + ")"));
    out.push("");
    out.push("카드 " + picked.length + "장 · 오답 한 줄 암기 " + sents.length + "개 (내 메모리 노트 " + autoN + "장)");

    /* 카드 — 과목 → 카테고리 */
    const groups = {};
    const subjKeys = [];
    picked.forEach(function (c) {
      const key = String(Number(c.subject) || 0);
      if (!groups[key]) { groups[key] = { cats: {}, order: [] }; subjKeys.push(key); }
      const cat = oneLine(c.category) || "기타";
      if (!groups[key].cats[cat]) { groups[key].cats[cat] = []; groups[key].order.push(cat); }
      groups[key].cats[cat].push(c);
    });
    subjKeys.sort(function (a, b) { return Number(a) - Number(b); });
    subjKeys.forEach(function (key) {
      const g = groups[key];
      out.push("");
      out.push("## " + subjectLabel(key));
      g.order.forEach(function (cat) {
        out.push("");
        out.push("### " + cat);
        g.cats[cat].forEach(function (c) {
          const s = st[c.id];
          const mark = BOX_MARK[cardBox(s.box) - 1] + (s.auto === true ? "★" : "");
          out.push("- " + mark + " **" + oneLine(c.front) + "** → " + oneLine(c.back));
          const bits = [];
          const law = shortLaw(c.source);
          if (law) bits.push("근거 " + law);
          const mn = oneLine(c.mnemonic);
          if (mn) bits.push("암기 " + mn);
          if (bits.length) out.push("  - " + bits.join(" · "));
        });
      });
    });

    /* 오답 한 줄 암기 — 과목별 */
    if (sents.length) {
      out.push("");
      out.push("## 오답 한 줄 암기");
      const sg = {};
      const sk = [];
      sents.forEach(function (q) {
        const key = String(Number(q.subject) || 0);
        if (!sg[key]) { sg[key] = []; sk.push(key); }
        sg[key].push(q);
      });
      sk.sort(function (a, b) { return Number(a) - Number(b); });
      sk.forEach(function (key) {
        out.push("");
        out.push("### " + subjectLabel(key));
        sg[key].forEach(function (q) {
          out.push("- " + oneLine(q.memory_sentence) + " (" + q.id + ")");
        });
      });
    }
    out.push("");
    return out.join("\n");
  }

  PLCore.SUBJECT_NAMES = SUBJECT_NAMES;
  PLCore.memoryNoteText = memoryNoteText;

  root.PLCore = PLCore;
  if (typeof module !== "undefined") module.exports = PLCore;
})(typeof window !== "undefined" ? window : globalThis);
