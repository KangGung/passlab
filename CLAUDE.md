# PASS LAB — 맞춤형화장품조제관리사 합격 연습장

## 북극성
사용자가 문제를 푼다 → 앱이 취약 개념을 찾는다 → 틀린 문제는 자동으로 오답노트가 된다 → 관련 핵심·암기를 즉시 보여준다 → 같은 개념을 다른 방식으로 다시 묻는다 → 적절한 간격 뒤 다시 출제한다 → 시험 직전에는 모르는 것만 압축 반복한다.
QUESTION → ANSWER → FEEDBACK → CONCEPT → MEMORY → RETEST → MASTERY. 보고서가 아니라 **실제로 쓰는 앱**이 목표다.

## 사용자 (2026-09-05 확정 답)
- 비개발자 창업자 1인(지훈님). 한국어, 쉬운 말. 개발 용어는 괄호로 풀어 쓴다.
- **12회 접수 완료 → 스프린트 트랙**(시험 2026-09-19). 교재·강의 없음(`sources/user/` 비어 있음 — 공식 자료·법령만으로 출제). **하루 120분.** 아이폰 사용(GitHub Pages 배포 예정, 배포 전 사용자 확인). 지금까지 공부량 0 → 첫 사용은 진단 30문항.
- 승인을 반복해 묻지 않는다. 치명적 정보가 없는 게 아니면 합리적 가정으로 진행하고 가정은 STATUS.md에 적는다.
- 위험한 명령(삭제·덮어쓰기·외부 게시)만 실행 전에 확인한다.

## 병행 트랙 통합 결정 (2026-09-05)
`../custom-cosmetics-exam/`(9/4 별도 세션이 만든 "조제관리사 합격코치" 앱)은 **부품 공급원**이다. 가져올 것: `data/exam-blueprint.js`의 배점 슬롯표, `tests/*.cjs`의 경계값 테스트 아이디어, `SOURCE_REGISTER.md`·`CONFLICTS.md`(→ `docs/`), 문항 20개·노트 12장(PL 스키마로 변환, `verified:false`로 재검증). 화면·저장 구조는 가져오지 않는다. 그 폴더의 파일은 수정하지 않는다.

## 시험 사실 (2026-09-05 공식 원문 확인 — `sources/official/`)
- 제12회 시험 2026-09-19(토) 10:00~12:00, 발표 10-19. 시행 대한상공회의소 자격평가사업단, 소관 식약처. 접수 8/27~9/2(완료).
- 100문항 120분. 선다형 80(1~80번, **5지선다 ①~⑤** — 예시문항 원문 확인) + 단답형 20(81~100번). 1,000점.
- **배점은 문항별 차등 8·12·18점**(균일 10점 아님 — 상의 「2024 문항유형 및 배점기준」 원문). 슬롯:
  - ① 화장품법의 이해 10문항 100점: 선다 8점×3·12점×4 / 단답 8점×2·12점×1
  - ② 화장품 제조 및 품질관리 25문항 250점: 선다 8×11·12×8·18×1 / 단답 8×3·12×2
  - ③ 유통 화장품 안전관리 25문항 250점: 선다 8×14·12×10·18×1 / 단답 없음
  - ④ 맞춤형화장품의 이해 40문항 400점: 선다 8×15·12×12·18×1 / 단답 8×8·12×3·18×1
  - 합계 8점 56·12점 40·18점 4 = 1,000. 8점 = 개념·정의 확인, 12점 = 적용·비교·절차, 18점 = 여러 근거 결합 사례 판단.
- 합격 = 총점 600 이상 AND 과목별 40% 이상(①40 ②100 ③100 ④160). 과락 있음. 점수는 항상 **문항 points 합산**으로 계산한다(10×문항수 금지).
- 문제은행식 출제로 실제 문항 비공개. 공개 자료 = 식약처 교수학습가이드 개정4판(2025-06-27, 500쪽, `sources/official/교수학습가이드_개정4판.txt`)·출제기준 2023·문항유형 및 배점기준 2024·예시문항 1차 19문항·2차 10문항. 예시문항은 한국생산성본부 저작권 — 문장 복제 금지, 형식 참고만.
- 답안: 선다형 컴퓨터용 사인펜, 단답형 검정 볼펜, 정정은 두 줄(=) 긋고 재기재. 문제지에 배점 표시 여부·출제 법령 기준일은 미확인(S0 공고 확인 항목).
- 법령 기준 = 시험일 시행 중인 것. 화장품법 법률 20901호·시행령 36176호·시행규칙 총리령 2109호(모두 2026-04-02 시행: 화장품의 날·점자/음성/수어영상 코드 표시·직구 화장품 공표). 2025-08-01 천연·유기농 정부 인증제 폐지. **개인정보 보호법 법률 21445호 2026-09-11 시행(시험 8일 전)**, 「화장품 사용할 때의 주의사항 및 알레르기 유발성분 표시에 관한 규정」 2026-56호 2026-08-05 시행(벤조페논-3 주의사항 9/2). 미시행(12회 범위 밖): 21302호(12/31)·21709호(11/27)·21604호(2027-04-29, 일부 맞춤형판매업소 조제관리사 대체). 가이드 4판은 2025-08-01 법령 기준이므로 2026 개정분은 법령 원문으로 보강한다.

## 자료 신뢰 계층
S: 현행 법령(law.go.kr) · 식약처 · 대한상공회의소 공식자료 / A: 교수학습가이드 · 출제기준 · 공식 예시문항 · 문항유형·배점자료 / B: 사용자가 제공한 교재(현재 없음) / C: 신뢰할 수 있는 교육기관 해설 / D: 블로그·카페·출처 불명 복원문제.
- S/A와 충돌하는 하위 자료는 쓰지 않는다. 인터넷 자료를 "실제 기출"이라 단정하지 않는다. 생성 문항을 기출로 표시하지 않는다.
- 시판 문제집·학원 복원문제 문장을 복제하지 않는다(논점만 참고, 문장은 새로 쓴다).
- 법령·숫자·기간·처분·자격요건은 조문 근거 없이는 채점용 문항에 넣지 않는다 → `UNVERIFIED/`로 보낸다. 문제 수보다 정확성.

## 기술 규칙
- Vanilla HTML/CSS/JS. 프레임워크·빌드도구·npm 설치·서버·계정·유료 API·외부 CDN·웹폰트 없음. 시스템 글꼴 사용. 테스트는 Node 내장 `node:test`만.
- 파일: `app/index.html + app.js + core.js + style.css`(엔진) + `app/data/*.js`. **로컬 파일(file://)은 fetch로 JSON을 못 읽으므로 데이터는 `window.PL_*` 전역 변수에 덧붙이는(concat) .js 파일로 만들고 `manifest.js` 목록대로 `<script src="…?v=버전">`을 삽입해 읽는다.** `core.js`는 DOM을 만지지 않는 순수 함수 모음이라 Node 테스트가 가능해야 한다(`module.exports` 병기).
- 진행 기록은 localStorage 키 `pl.v1.*` 6개(settings·attempts·mistakes·cards·session·mocks)로 나눠 저장. 문항 본문은 저장하지 않고 data에서 매번 읽는다.
- 백업: Export(파일명 `passlab-진행-YYYY-MM-DD-기기.json`, 6개 키 묶음) / Import(M1은 덮어쓰기 확인 2회, M3부터 병합) / Reset은 자동 백업 1회 후 '초기화' 입력.
- 단답형 입력: [답 입력 완료] 버튼이 주, Enter는 보조. `keydown`에서 `e.isComposing || e.keyCode===229`면 무시하고 제출은 `setTimeout(…,0)`으로 미뤄 최종 값을 읽는다. 입력창은 `autocomplete=off autocorrect=off autocapitalize=none spellcheck=false enterkeyhint=done`.
- 자동저장: 답 선택·변경 즉시 + 문항 이동 + `visibilitychange(hidden)`/`pagehide`. 진행 중 세션은 `pl.v1.session` 1개, 다시 열면 홈 상단 [이어하기].
- 백업을 2일 이상 안 하면 홈 상단 배너 경고.
- 5지선다 보기는 ①~⑤ 고정. 보기 순서 섞기는 `shuffle:true` 문항만.
- 모바일 우선(390px)·데스크톱 모두. 화려한 효과 금지. 정답/오답은 색 + 아이콘(✓ ✕) 병기. 디자인 톤 = 종이 시험지 × 채점 펜(종이색 배경 #F5F0E6, 잉크 #1D1B17, 정답 초록 #2A6F46, 오답 빨강 #B9331F, 주의 황토 #B8821A).
- 앱 안에 "데이터 점검" 버튼: 과목별 문항 수, 배점(8/12/18)·유형별 수, 중복 ID, 정답 인덱스 범위, 근거 누락, verified 비율을 표로.
- 매 세션 끝: `docs/STATUS.md` 갱신(완료·미완료·가정·다음 할 일) + git commit.

## 폴더 (조제관리사시험/ 기준)
app/                          # 배포 단위(GitHub Pages에 그대로 올라감)
  index.html  app.js  core.js  style.css
  data/manifest.js            # 읽을 데이터 파일 목록 + 버전 꼬리표
  data/blueprint.js           # 시험 구조·배점 슬롯(window.PL_BLUEPRINT)
  data/topics.js              # 출제기준 세부항목 맵(window.PL_TOPICS)
  data/q_*.js                 # 문항 배치(덧붙이기 형식)
  data/c_*.js                 # 암기카드 배치
scripts/check-data.cjs        # Node 데이터 점검(브라우저 없이)
tests/*.test.cjs              # node:test
sources/official/             # 공식 원문(PDF/HWP + txt), guide4/ 과목별 분할
sources/law/                  # 법령 조문 텍스트(첫 줄에 시행일)
sources/user/                 # 사용자 교재(현재 없음)
UNVERIFIED/                   # 근거 확보 실패 문항
docs/STATUS.md  docs/S0_report.md  docs/verify/  docs/운영가이드.md  docs/plans/
mockup/  work/  00~05_*.md     # 설계 단계 문서(수정하지 않음)

## 데이터 스키마 (필드명 고정)
문항 파일 첫 줄: `window.PL_QUESTIONS = (window.PL_QUESTIONS || []).concat([ … ]);`
{ id:"Q-S3-0042", subject:3, topic:"3.4.2", level:"D",            // level: A 공식예시 | B 사용자자료 | C 변형 | D 신규예상
  type:"mcq"|"short", qtype:"limit_number|definition|pick_correct|pick_wrong|case|calc|match|order|blank|term|table",
  points:8|12|18, difficulty:1-5, importance:"H|M|L", vg:"VG-…"|null,   // vg: 변형 그룹(형제 문항)
  stem:"…", choices:["…"×5]|[], answer:0-4|null, shuffle:false,
  answer_text:["정답 표시용","허용표기"…]|null, blanks:[{label:"㉠",accepted:[…]}]|null,
  grade:"exact|keywords|set", strict_term:false, unit:null|"%|㎍/g|일|시간|개/g", number_tolerance:0, near_miss:[],
  explanation:"정답 근거", wrong_option_explanations:["①…","②…","③…","④…","⑤…"]|null,
  key_concept:"…", memory_sentence:"시험 한 줄 암기", trap:"…",
  source:{ law:"규정명 조·별표"|null, guide:"4판 p.NNN"|null, asof:"2026-09", confidence:"high|mid|low" }, law_effective_date:"YYYY-MM-DD"|null,
  cards:["C-…"], tags:["…"], verified:false, verified_by:null, verified_at:null,
  history:[{date:"2026-09-05",note:"신규"}] }
암기카드(`window.PL_CARDS = (window.PL_CARDS || []).concat([ … ]);`):
{ id:"C-SAFE-014", subject:3, topic:"3.4.2", category:"안전관리 기준 숫자", kind:"number|list|definition|compare|procedure", importance:"H|M|L", short_prone:true,
  front:"…", back:"…", mnemonic:"…", source:{…}, related:["Q-…"], verified:false, history:[…] }
진행 기록(localStorage):
  pl.v1.settings  { exam_date:"2026-09-19", track:"sprint", daily_minutes:120, device:"iphone|mac", last_backup:null, user_accepted:{}, schema:1 }
  pl.v1.attempts  [{ qid, at, mode:"diag|study|drill|mock|review|cram", sid, given, correct, sec, conf:2|1|0 (확실|애매|찍음), why:"unknown|confused|slip|misread|guess"|null, self_marked:false, near_miss:false }]
  pl.v1.mistakes  { [qid]:{ count, last, stage:"new|reviewing|graduated", streak, next, interval, lastWrong, guessed, relapse, memo } }
  pl.v1.cards     { [cid]:{ box:1-5, due, streak, lapses, auto } }
  pl.v1.session   { sid, mode, preset, qids:[…], idx, answers:{qid:{given,conf,sec,flag}}, startedAt, deadlineAt|null, savedAt }
  pl.v1.mocks     [{ sid, date, raw, adj, pass, fail_subjects:[…], subject:[…4], answers:{…} }]

## 학습 알고리즘 상수 (모두 attempts에서 매번 다시 계산)
- 문항 숙달도 mastery(0~100): 최근 3회 시도, 가중 1.0/0.6/0.3. 시도 점수 s = 정답·확실 1.0 / 정답·애매 0.6 / **정답·찍음 0.15** / 오답 0. 시간 초과(선다 >108초, 단답 >135초)면 s×0.8. 시도 1회면 상한 70, 2회면 90. 마지막 시도 후 d일 경과 시 ×max(0.6, 1−0.05d).
- 숙달(mastered) = mastery ≥ 80 AND 최근 2회 연속 정답 AND 그 2회에 찍음 없음.
- 토픽 숙달 = 시도 문항 mastery 평균 × min(1, 시도 문항 수/4). 과목 숙달 = 토픽 숙달의 예상 문항수 가중 평균(미시도 토픽 20). 전체 = 과목 숙달 × 배점 가중.
- 오답 단계: new(첫 오답 또는 찍음 정답) → reviewing(재시험 1회 정답, 찍음 아님) → graduated(연속 2회 정답(찍음 없음) AND 마지막 오답 후 3일 경과 AND 그중 1회는 오답 다음 날 이후 세션). 졸업 후 재오답 → reviewing + relapse.
- 오답 재출제 간격: 첫 오답 → 같은 세션 끝 변형 문항 1개 → +1일 → +3일 → +6일. 정답·애매 +2일. 정답·찍음 +1일(오답 취급). **D-3(9/16)부터 상한 1일.**
- 암기카드 Leitner 5박스 간격(스프린트): ① 0일 ② 1일 ③ 2일 ④ 4일 ⑤ 7일. 모름 → ①, 애매 → 유지, 알아요 → +1. 문항 오답·찍음 정답 시 연결 카드 박스①로 자동 편입.
- 적응형 출제: 취약 50 / 복습 만기 30 / 새 문항 20. P = 3(1−mastery/100) + 2[3일 내 오답] + 1.5·min(연속 오답,3)/3 + 1[애매·찍음] + 1[시간 초과] + 1.5·중요도(H1/M0.5/L0) + 1·(토픽 예상 문항수/최대).
- 진단 30문항: ①3 ②8 ③7 ④12, 단답 ①1 ②1 ③0 ④4, 난이도 2:3:4 = 30:50:20, 예상 문항수 상위 토픽부터 1개씩. 결과 = 과목별 정답률(문항 수 기준)과 **배점 환산 예상점수**(과목 만점 × 정답률, 단답은 ×0.85 보수).
- 모의고사 100문항(M2): 배점 슬롯표대로 points 기준 채움, 슬롯이 비면 경고.
- 예상 점수(/1000): Σ(슬롯 문항수 × 배점 × p), 선다 p = 0.20 + 0.80×(토픽 숙달/100), 단답 p = 0.85×(토픽 숙달/100). 모의 기반 보정 = 원점수 − 0.8×찍어서 맞힌 문항 배점 합.
- READINESS(M2): SAFE = 모의 ≥1회 AND E ≥700 AND 하한 ≥620 AND 전 과목 ≥50% / AT RISK = E <600 OR 하한 <540 OR 어느 과목 <40% / 그 외 BORDERLINE.
- 하루 학습량(120분 기준): 선다 1.6분·단답 2.0분·오답 재풀이 1.5분·카드 0.25분. 국면 비중(문제/오답/카드) D-15~11 60/25/15 → D-10~6 35/40/25 → D-5~3 15/55/30 → D-2~1 0/60/40.
- 단답형 채점 4단: ⓪ 정규화(공백 제거 → 전각→반각 → 영문 소문자 → 중점·빗금 통일 → 괄호 보조표기 제거 → 끝 조사·어미 제거(은/는/이/가/을/를/의/에/로/이다/임) → 단위 통일(%·퍼센트·프로→%, ㎍/g·ug/g→㎍/g) → 숫자 통일(1.0=1=1.00, 1,000→1000)) → ① 정확 일치 → ② 동의어·표기 변형(메칠↔메틸·에칠↔에틸·부칠↔부틸·애씨드↔산·소듐↔나트륨·포타슘↔칼륨; strict_term=true면 건너뜀) → ③ 근사(5자 이상 한글 편집거리 ≤1) = **0점·'표기 오류' 기록** → ④ 자기 판정 [내 답이 같은 뜻인가?] = self_marked, 숙달 불인정. 복수 빈칸은 전부 일치만 정답, 연습에서는 빈칸별 ○×.

## 콘텐츠 규칙
- 배치 = 출제기준 세부항목 1개(또는 인접 2개). 문항 10~15 + 카드 5~10. 생성 전에 해당 소스(가이드 장·법령 조문)를 먼저 읽고 읽은 파일을 보고서에 적는다.
- 목표 분포(시험 배점 ×5): ①50 ②125 ③125 ④200 = 500. 단답형 ≥25%, ④ 단답 ≥60. 배점 비중은 시험과 같게(8점 약 55%·12점 약 40%·18점 약 5%). 같은 개념은 qtype을 바꿔 변형(어순만 바꾸기 금지).
- 선다형: 5개 보기 모두 "왜 틀렸나/맞나" 설명 가능해야 한다. 설명 불가 보기는 쓰지 않는다.
- 생성 세션(에이전트) ≠ 검증 세션(에이전트). `verified:true`는 검증 패스를 통과한 문항만. 앱은 미검증 문항을 "미검증" 표시하고 예상 점수(M2)에는 넣지 않는다. 진단·학습에는 사용 가능.
- 생성 문항은 level "D"(공식 예시문항을 참고해 형식만 따른 것도 D). 기출·예시문항 문장 복제 금지.
