# PASS LAB S4 실행 계획 — 암기카드 학습(Leitner)·자동 편입·프리셋 3종·백업 병합 (2026-09-08, D-11)

> Spec(권위 순): `CLAUDE.md`(학습 알고리즘 상수 — 암기카드 Leitner·하루 학습량·백업 병합) → `01_설계서` §4 M3·§6 → `03_빌드_프롬프트팩_v2.md` ⑦ S4 1항. M1·S3 계획의 Global Constraints 유효(구현자 커밋 금지, 병렬 세션 규칙: 카드 데이터 `c_*.js`는 수정하지 않음 — 이번 S4는 **엔진·화면만**).
> 오늘의 완료 기준(사용자 문장): "카드 탭을 열면 오늘 만기 카드 수와 박스 분포가 보이고, 카드를 넘기며 모름·애매·알아요를 누르면 다음 날 다시 나오고, 문항을 틀리면 그 문항에 연결된 카드가 '내 메모리 노트'로 들어오고, 홈 오늘 할 일에 카드 수가 실제로 뜬다."

## Global Constraints (추가)
16. 카드 상태는 `pl.v1.cards` 하나에만 저장: `{ [cid]: { box:1-5, due:"YYYY-MM-DD", streak, lapses, auto:boolean, last:"YYYY-MM-DD"|null } }`. 카드 본문은 저장하지 않는다.
17. 카드 데이터 파일(`app/data/c_*.js`)·문항 파일은 수정하지 않는다(다른 세션 소유). figure 표시는 기존 `figureBox()`/`cardBlock()` 재사용.
18. 새 localStorage 키 금지. 하루 카드 상한 = `dailyPlan(...).cards`.

---

### Task 1: core.js — Leitner 카드 스케줄·자동 편입·프리셋·백업 병합 (TDD)

파일: `app/core.js`(추가만), `tests/core.test.cjs`(추가). 상수는 CLAUDE.md 그대로.

- `CARD_INTERVALS = { sprint:[0,1,2,4,7], regular:[1,3,7,14,30] }` (박스 1~5 → 인덱스 0~4, 일 단위).
- `cardStateDefault()` → `{ box:1, due:null, streak:0, lapses:0, auto:false, last:null }`. due null = 아직 안 본 카드(항상 "새 카드"로 출제 가능).
- `reviewCard(state, rating, todayStr, ctx)` (`rating`: `"again"`(모름) | `"hard"`(애매) | `"good"`(알아요); `ctx = { track:"sprint", examDate }`) → 새 상태(불변): 모름 → box 1, lapses+1, streak 0, due = today + interval[0](=오늘: 같은 세션 끝에 재노출) / 애매 → box 유지, streak 0, due = today+1 / 알아요 → box+1(상한 5), streak+1, due = today + interval[box−1]. **D-3(dday ≤3)부터 상한 1일**, D-1이면 due = today. `last = today`.
- `dueCards(cards, states, todayStr, opts)` → `{ due:[cid…], fresh:[cid…], todayNew:[cid…] }`: due = state 있고 due ≤ today(box 낮은 순 → due 오래된 순), fresh = state 없음(importance H → M → L, subject 순), `opts.filter = { subject, category, kind, onlyAuto }`. `opts.limit`(하루 상한)로 due 우선 채우고 남으면 fresh.
- `enrollCardsForMistake(q, cards, states, todayStr)` → 문항 오답·찍음 정답 시 `q.cards`의 카드들을 box 1·`auto:true`·`due:today`로 편입(이미 상태 있으면 box 1로 내리고 auto 유지, lapses는 안 올림). 반환 `{ states, enrolled:[cid] }`.
- `cardBoxSummary(states, cardsAll)` → `{ boxes:{1:n,…,5:n}, unseen:n, dueToday:n, autoCount:n }`.
- **숙달 연동**: `questionMasteryWithCards(atts, q, todayStr, states)` = `questionMastery` − 10 × (연결 카드 중 box 1이고 `last`가 3일 이내인 카드 수), 하한 0. `topicMastery`·`subjectMastery`는 변경하지 않되, 새 함수 `topicMasteryWithCards(...)`를 같은 시그니처+states로 제공(UI가 선택 호출). (스펙 문구 "카드 '모름'은 관련 문항 mastery −10" 구현.)
- **프리셋 빌더**: `buildPreset(name, ctx)` with `ctx = { questions, cards, topics, attemptsByQid, mistakes, cardStates, todayStr, rng, n }`:
  - `"weakness"`(WEAKNESS ATTACK): 토픽 숙달 하위 3개 토픽의 문항만, `buildAdaptiveSet`의 W 우선순위 P로 n개(기본 15) + 그 토픽의 카드 due/fresh 상위 10장 → `{ qids, cids, topics:[…] }`.
  - `"lawnum"`(LAW & NUMBERS): `qtype ∈ {limit_number, calc, table, blank}` 또는 tags에 "숫자"/"기한"/"한도" 포함 문항 n개(미출제·취약 우선) + `kind:"number"` 카드 due/fresh 10장.
  - `"today"`(TODAY'S REVIEW): `dueMistakes` 전부(상한 n) + `dueCards.due` 전부(하루 상한).
- **백업 병합**: `mergeBackup(local, incoming)` → 6키 병합: attempts = (qid,at) 합집합 정렬 / mistakes·cards = 항목별 `last`(없으면 `next`/`due`) 더 최근 쪽 / mocks = sid 합집합 / settings = incoming의 `last_backup`·`user_accepted` 병합, 나머지 local 유지 / session = local 유지(진행 중) 단 local 없고 incoming 있으면 incoming. 반환 `{ merged, stats:{ attemptsAdded, mistakesUpdated, cardsUpdated, mocksAdded } }`.
- **암기노트 내보내기 데이터**: `memoryNoteText(cards, states, questions, mistakes, opts)` → 마크다운 문자열: `auto:true` 카드 + box ≤3 카드 + 미졸업 오답의 `memory_sentence`를 과목·카테고리별로 정리(카드 front → back 한 줄, 근거 조문 짧게). `opts.maxCards`(기본 60).

TDD 최소: reviewCard 3등급 전이·상한 5·D-3 상한·D-1 / dueCards 정렬·필터·limit / enroll(신규·기존·lapses 불변) / boxSummary / masteryWithCards −10 하한 0 / buildPreset 3종(문항+카드 반환, n 상한, 중복 없음) / mergeBackup 4키 규칙 + stats / memoryNoteText 포함 항목. 검증: `node --test tests/*.test.cjs` 전부 통과(기존 144 유지), export 수 ≥ 50.

---

### Task 2: 화면 — 카드 탭·카드 세션·자동 편입 표시·프리셋 버튼·홈 연동·백업 병합 UI

Task 1 함수만 호출. `app/app.js`·`app/index.html`·`app/style.css`만 수정. 카드 탭(`data-tab="cards"`) 활성화(배지 제거).

1. **카드 홈**(`cards`): 상단 요약(오늘 만기 N · 새 카드 M · 내 메모리 노트 K) / 박스 분포 5칸(막대·숫자) / 필터(과목·카테고리 select·[내 메모리 노트만] 토글) / [오늘 카드 시작 (n장)] — n = min(due+fresh, `dailyPlan.cards`) / [내 메모리 노트 보기](auto 카드 목록) / [암기노트 한 장 내보내기](`memoryNoteText` → 다운로드 `passlab-암기노트-YYYY-MM-DD.md` + 클립보드 복사 옵션) / D-3부터 안내 "매일 박스 ①~③ 전부, ④⑤는 D-1에 한 번".
2. **카드 세션**(`cardrun`): 진행 `k/n` / 카드 앞면(front 크게, 카테고리·과목·박스 배지) / [뒤집기](탭 또는 버튼) → 뒷면: figure(`figureBox` 재사용, 열림) + back + mnemonic(강조) + source / 3버튼 [모름] [애매] [알아요](뒷면에서만 활성) → `reviewCard` → `pl.v1.cards` 저장 → 다음. 모름 카드는 세션 끝에 한 번 더(인터벌 0일 규칙). 세션 끝 요약(모름/애매/알아요 수, 다음 만기) → [계속 10장] [카드 홈].
3. **자동 편입**: 학습·진단·QUICK·모의 채점에서 오답·찍음 정답 시 `enrollCardsForMistake` 호출 → 저장; 해설 패널의 연결 카드에 "내 메모리 노트에 담김" 칩; 오답노트 상세에 연결 카드 상태(박스) 표시.
4. **프리셋**: 학습 준비 화면 상단에 버튼 3개 — [WEAKNESS ATTACK 약점 공격] [LAW & NUMBERS 법령·숫자] [TODAY'S REVIEW 오늘 복습] → `buildPreset` → 문항은 기존 학습 세션(mode "drill"), 카드는 세션 끝에 이어서 카드 세션으로 연결(문항 → 카드 순). 결과 요약에 프리셋 이름.
5. **홈 연동**: 오늘 할 일 카드 칸 "9/8부터" → 실제 `dueCards` 수·상한, 클릭 시 카드 홈. 과목 숙달도 바는 `topicMasteryWithCards` 기반으로 전환(카드 모름 반영).
6. **백업 가져오기 병합**: 설정 [가져오기]에 모드 선택(덮어쓰기 / 병합). 병합 = `mergeBackup` → 미리보기 stats("기록 n건 추가, 카드 m장 갱신") → 확인 1회 → 저장.
7. **검증(헤드리스 390)**: 카드 탭 열기 → 요약 숫자 / 세션 시작 → 뒤집기 → 알아요 → `pl.v1.cards` 상태 box 2·due 내일 / 모름 → box 1·세션 끝 재노출 / 학습에서 오답 1개 → 연결 카드가 카드 홈 "내 메모리 노트" 수에 반영 / 프리셋 3개 각각 시작 가능 / 홈 카드 칸 숫자 / 병합 가져오기 미리보기 / 콘솔 오류 0 / 390 스크롤 없음 / `node --test` 유지. 스크린샷 `docs/qa/s4_*.png`. 데몬 localStorage 정리.

---

### Task 3: 등록·문서 — manifest version `20260908c`, `docs/STATUS.md` S4 절, `docs/운영가이드.md` "암기카드 쓰는 법·프리셋·병합 가져오기" 절, 운영 카드 탭 잠금 문구 제거 확인. 배포는 사용자 확인 후.
