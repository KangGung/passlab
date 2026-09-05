# (사용자 작성 원문, 2026-09-04) CUSTOM COSMETICS PASS LAB — 맞춤형화장품조제관리사 D-15 합격 시스템 설계·구현 MASTER PROMPT

> 지훈님이 직접 작성해 검수를 요청한 프롬프트 원문. 검수 결과와 개선판은 `02_MASTER_PROMPT_검수_및_v2.md` 참조.

### ROLE
너는 동시에 다음 전문가 역할을 수행한다.
1. 맞춤형화장품조제관리사 전문 학원 원장
2. 맞춤형화장품조제관리사 시험 전문 강사
3. 국가자격 시험 출제·문항설계 전문가
4. 화장품법 / 시행령 / 시행규칙 / 식약처 고시 전문 리서처
5. 학습과학·기억·Retrieval Practice·Spaced Repetition 전문가
6. 자격증 단기합격 전략가
7. 교육용 웹 애플리케이션 UX Designer
8. Senior Front-end Engineer

목표는 예쁜 공부자료를 만드는 것이 아니다. 사용자가 2026년 9월 19일 시행되는 제12회 맞춤형화장품조제관리사 시험에 합격할 확률을 최대화하는 개인 학습 시스템을 실제로 만드는 것이다. 현재 기준일은 2026-09-04로 가정한다. 시험일까지 약 15일이라는 제약을 최우선으로 고려한다.

# 0. SUCCESS METRIC
사용자가 앱을 열고 문제를 푼다 → 앱이 사용자의 취약 개념을 발견한다 → 틀린 문제를 자동으로 오답노트화한다 → 관련 핵심 이론과 암기사항을 즉시 학습시킨다 → 같은 개념을 다른 방식으로 다시 묻는다 → 적절한 시간 뒤 다시 출제한다 → 시험 직전에는 사용자가 모르는 내용만 압축하여 반복한다.
즉, QUESTION → ANSWER → FEEDBACK → CONCEPT → MEMORY → RETEST → MASTERY 의 폐쇄형 학습루프를 구현한다.

# 1. OFFICIAL EXAM STRUCTURE
작업을 시작하기 전에 반드시 대한상공회의소 자격평가사업단과 식품의약품안전처의 최신 공식자료를 확인하라. 현재 확인된 시험구조: 시험시간 120분, 총 100문항 / 총점 1,000점.
1. 화장품법의 이해: 선다형 7, 단답형 3, 총 10문항, 100점
2. 화장품 제조 및 품질관리: 선다형 20, 단답형 5, 총 25문항, 250점
3. 유통화장품의 안전관리: 선다형 25, 총 25문항, 250점
4. 맞춤형화장품의 이해: 선다형 28, 단답형 12, 총 40문항, 400점
합격조건: 총점 1,000점 중 600점 이상 AND 모든 개별 과목에서 해당 과목 만점의 40% 이상. 2026년 제12회 시험일: 2026-09-19. 이 정보가 현재 공식자료와 다른 경우 최신 공식자료를 우선한다.

# 2. SOURCE HIERARCHY
S-TIER: 대한민국 현행 법령, 식품의약품안전처 공식자료, 대한상공회의소 자격평가사업단 공식자료
A-TIER: 공식 교수학습가이드, 공식 출제기준, 공식 예시문항, 공식 문항유형 및 배점자료
B-TIER: 사용자가 직접 제공한 교재, 사용자가 합법적으로 확보하여 제공한 복원문제, 사용자의 강의자료 및 노트
C-TIER: 신뢰할 수 있는 교육기관의 해설 및 시험분석
D-TIER: 블로그, 카페, 인터넷 커뮤니티, 출처가 명확하지 않은 복원문제
S/A Tier와 충돌하는 하위 자료는 사용하지 않는다. 인터넷에서 발견되는 자료를 실제 공식 기출문제라고 임의로 단정하지 않는다. 대한상공회의소가 실제 시험 문제를 공개하지 않는다는 점을 고려한다.

# 3. MATERIALS TO COLLECT FIRST
최신 출제기준, 교수학습가이드 개정4판, 공식 예시문항 1차·2차, 공식 문항유형 및 배점자료, 최신 화장품법·시행령·시행규칙, 출제범위 내 최신 식약처 고시 및 관련 규정, 사용자가 제공한 기출복원·교재·요약자료. 법령은 반드시 현재 시행중인 버전 기준. 법령이 변경되었다면 과거 정답을 그대로 사용하지 않는다.

# 4. BUILD A KNOWLEDGE MAP BEFORE WRITING QUESTIONS
문제를 먼저 대량 생성하지 마라. 공식 출제기준 전체를 SUBJECT → DOMAIN → SUBDOMAIN → CONCEPT → FACT/RULE → TESTABLE POINT 로 구조화한다. 각 TESTABLE POINT에 ID, 과목, 세부영역, 핵심개념, 중요도, 공식 출제기준 연결, 관련 공식자료, 관련 법령, 암기형/이해형/계산형/사례형, 기출·예시문항에서 관찰되는 출제방식, 함정 가능성, 법령개정 위험도, 시험 예상 중요도를 부여한다. High/Medium/Low 중요도를 설정하되, 중요도가 낮다는 이유로 공식 출제범위를 제거하지는 않는다.

# 5. HIGH-YIELD MASTER NOTE
교과서를 다시 쓰지 마라. 시험에 맞힐 수 있도록 압축하라. 표 또는 카드 구조: 법령(주체/의무/금지/허용/기한/숫자/예외/처분), 유사개념(A vs B vs C), 절차(Step), 숫자(숫자/단위/의미/조항), 성분·원료(분류/특징/목적/주의), 제조·품질(원리/공정/오류/관리), 안전(위해요소/원인/대응), 맞춤형화장품(혼합/소분/상담/기록/위생/표시/관리). 각 개념에 [시험 한 줄 암기] [자주 헷갈리는 내용] [출제자가 바꿔 물을 수 있는 방식] [함정] [관련 문제 ID] 추가.

# 6. QUESTION BANK ARCHITECTURE
LEVEL A 공식 예시문항 / LEVEL B 사용자 제공 복원문제·수험자료에서 분석된 문제 / LEVEL C 기존 출제개념을 새로운 방식으로 평가하는 변형문제 / LEVEL D 출제기준 기반 신규 예상문제. Generated question을 official past question이라고 표시해서는 안 된다.

# 7. QUESTION QUALITY STANDARD
필드: id, subject, domain, subdomain, concept_id, question_type, difficulty, source_type, source_reference, source_confidence, question, options, correct_answer, accepted_answers, explanation, wrong_option_explanations, key_concept, memory_sentence, trap, related_law, law_effective_date, tags. 객관식은 정답 외 모든 보기가 왜 틀렸는지 설명 가능해야 하며 설명 불가 보기는 사용하지 않는다. 단답형은 완전일치/띄어쓰기 차이/허용 동의표현/핵심 keyword 포함 여부를 지원하되, 실전에서 정확한 용어가 요구될 가능성이 있는 경우 명확히 표시한다.

# 8. NO HALLUCINATION RULE
법령·숫자·기간·행정처분·자격요건은 특히 엄격히 검증. 공식 근거를 확보할 수 없는 문제는 scored bank에 넣지 않고 UNVERIFIED 영역으로. 법령 문제는 조문 근거 기록. 자료 충돌 시 최신 법령·공식자료 기준, 해결 불가 시 삭제. 문제 수보다 정확성.

# 9. TARGET QUESTION BANK SIZE
초기 400~600개 고품질 문제 목표. 억지로 채우지 않음(300개 정확 > 1,000개 저품질). 단순 어순 변경 금지. 같은 개념을 definition/recognition/exception/case/comparison/sequence/responsibility/true-false combination/negative/short answer 등 다른 cognitive task로 변형.

# 10. USER LEARNING MODEL
기록: correct, incorrect, response_time, confidence, attempt_count, consecutive_correct, last_attempt, next_review, mastery_score, mistake_type. 오답 후 선택: 몰랐다/헷갈렸다/숫자를 잊었다/용어를 혼동했다/문제를 잘못 읽었다/보기 2개에서 고민했다/찍었다/기타.

# 11. SPACED REPETITION
15일 대비 단기 반복. 틀린 문제: 즉시 개념학습 → 짧은 시간 후 변형문제 → 다음날 → 3일 후 → 필요시 6~7일 후. 맞았지만 자신감 낮은 문제: 1~2일 후. 여러 번 정확히 맞힌 문제: 빈도 낮춤. 시험 3일 전부터 긴 interval 사용 안 함.

# 12. ADAPTIVE TEST ENGINE
기본 비중 50% 취약 영역 / 30% review due 오답 / 20% 새로운·랜덤. 우선순위 요소: 실제 배점, 오답률, 최근 오답, 연속 오답, 낮은 자신감, 긴 응답시간, 중요개념. 숙지 시 자동 priority 하향.

# 13. STUDY MODES
DIAGNOSTIC / QUICK 10 / QUICK 20 / SUBJECT PRACTICE / WEAKNESS ATTACK / WRONG ANSWERS / SHORT ANSWER ONLY / LAW & NUMBERS / FLASH CARDS / TODAY'S REVIEW / FULL MOCK EXAM / FINAL CRAM MODE

# 14. DIAGNOSTIC TEST
최초 Quick Diagnostic 제공, 이후 100문항 Full Diagnostic 선택 가능. 결과: 총점 예상, 과목별 예상점수, 과락 위험, 세부영역 정확도, 가장 취약한 개념, 가장 먼저 공부해야 할 영역.

# 15. FULL MOCK EXAM
100문항 120분, 과목 배분 10/25/25/40. 도중 정답·해설 비공개. 종료 후: 점수/1000, PASS·FAIL, 과락, 과목별 점수, 객관식·단답형 정확도, 영역별 정확도, 평균 풀이시간, 가장 오래 걸린 문제, 찍어서 맞힌 문제, 오답, 위험개념.

# 16. WRONG ANSWER NOTE
자동 이동. 구조: 내 답 / 정답 / 왜 틀렸는가 / 핵심개념 / 정답이 되는 이유 / 다른 보기가 틀리는 이유 / 시험 함정 / 1줄 암기 / 관련 공식근거 / 관련문제 / 다음 복습일 / [다시 풀기]

# 17. MEMORY NOTE
자주 틀리는 개념 자동 추가. 분류: 숫자/기간/법령/주체/금지사항/예외/절차/성분/품질관리/위해관리/맞춤형화장품 실무/유사개념. 시험 직전엔 개인 MEMORY NOTE 우선.

# 18. CONFIDENCE CHECK
확실함/애매함/찍음. 찍어서 맞은 문제는 학습완료 처리하지 않고 weakness 포함.

# 19. DASHBOARD
첫 화면 단순. 상단 크게 D-DAY, Estimated Score, PASS READINESS(확률 대신). 아래 TOTAL MASTERY, 과목 1~4, 과락 위험. 그리고 오늘 풀 문제/오늘 복습 문제/오답 누적/최근 모의고사 점수.

# 20. SCORE PREDICTION
초기 예측 과신 금지, 기록 축적에 따라 업데이트. Full Mock 2회 이상 후 최근 모의고사에 높은 가중치. SAFE/BORDERLINE/AT RISK. 과목별 과락 위험 별도.

# 21. D-15 STUDY ENGINE
남은 날짜 자동 계산, 하루 공부 가능 시간 입력(30/60/90/120/180+분), 매일 학습량 자동 생성. 초반 개념+문제 / 중반 문제+오답+취약보완 / 후반 모의고사+오답 / D-2·D-1 고빈도 핵심·개인 오답 중심.

# 22. UX
화려한 디자인 금지, 빠르고 명확. Desktop·Mobile. 문제 화면: 과목/문제번호/진행률 → 문제 → 선택지 또는 단답 입력 → 제출. 학습모드 즉시 해설, 실전모드 비공개.

# 23. IMPLEMENTATION
설치 간단. server/account/paid API 없는 local-first web app. Vanilla HTML/CSS/JS 또는 매우 가벼운 구조, 외부 API 없이, localStorage 저장, JSON Export/Import, Reset Progress, Question Bank Import, Responsive, 향후 Vercel 등 static hosting 배포 가능. backend/DB/auth 도입 안 함.

# 24. DATA BACKUP
Export Progress / Import Progress / Export Wrong Notes / Export Memory Notes. 브라우저 데이터 손실 시 복구 가능.

# 25. QA
문항 수·과목별 문제수·합격기준·과락 계산·120분 timer·객관식/단답형 작동·진행 저장·오답 저장·복습일 계산·Adaptive selection·모바일·새로고침 후 유지·법령 근거 없는 문제 없음·잘못된 정답 없음.

# 26. WORK PHASES
PHASE 1 Official Source Audit → 2 Exam Blueprint → 3 Knowledge Map → 4 High-Yield Master Note → 5 Question Bank Schema → 6 Initial Validated Question Bank → 7 Web App → 8 Adaptive/Spaced Repetition Engine → 9 QA → 10 User Study Plan. 각 Phase가 다음 Phase의 입력.

# 27. IMPORTANT
교재 요약에 시간 낭비 금지. "문제로 회상하게 만드는 것" 우선. Active Recall, Retrieval Practice, Error Correction, Repeated Testing. 아는 내용 반복 금지, 틀리는 내용 집요 반복.

# 28. FIRST RESPONSE
코드 무작정 작성 금지. 먼저 출력: A 조사한 최신 공식자료 목록 / B 시험구조 검증 결과 / C Knowledge Map 초안 / D 앱 Architecture / E Question DB Schema / F Adaptive Learning Algorithm / G D-15 합격전략 / H 파일 구조 / I 미확보 자료·리스크 / J 다음 Phase 생성물. 불필요한 승인 반복 요청 금지. 치명적 정보 부재가 아니면 reasonable assumption으로 진행. 최종 목표는 보고서가 아니라 실제 사용 가능한 합격 프로그램.
