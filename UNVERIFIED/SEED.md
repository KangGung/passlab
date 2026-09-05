# UNVERIFIED — SEED 세트

## 검증 FAIL (S2-V)

검증자 S2-V(출제위원장 겸 감수자), 2026-09-05. 대상: SEED 세트(`app/data/q_seed_a5.js`·`q_seed_cce.js`·`c_seed_cce.js`).
아래 8건은 `sources/law/`·`sources/official/guide4/` 원문 대조에서 근거를 찾지 못했거나 소스와 충돌하여 해당 파일에서 제거했다.
문항 전체 JSON을 그대로 남기므로, 근거를 확보하면 수정 후 되살릴 수 있다.

---

### Q-CCE-05

**FAIL 사유** — 맞춤형화장품판매업 미신고 영업의 제재는 과태료가 아니라 형벌이다. 화장품법 제36조 제1항 제1호의3(제3조의2 제1항 전단 위반)에 따라 3년 이하의 징역 또는 3천만원 이하의 벌금이며, 법 제40조 제1항의 과태료는 상한이 100만원이고 그 각 호에 미신고 영업이 없다(시행령 [별표 2] 개별기준 금액도 50~100만원). 정답 "300만원 과태료"는 지문 전제와 정답이 모두 근거 없음 → 보기·정답을 함께 새로 써야 하므로 FIX 불가.

```json
{
  "id": "Q-CCE-05",
  "subject": 1,
  "topic": "1.1.3",
  "level": "D",
  "type": "short",
  "qtype": "limit_number",
  "points": 8,
  "difficulty": 2,
  "importance": "M",
  "vg": null,
  "stem": "맞춤형화장품 판매업 신고를 하지 않고 영업할 경우 부과되는 최대 과태료는 얼마인가? (단위: 만원)",
  "choices": [],
  "answer": null,
  "shuffle": false,
  "answer_text": [
    "300",
    "300만원",
    "삼백만원"
  ],
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "화장품법 제40조에 따라 맞춤형화장품 판매업 신고를 하지 않고 영업하면 300만원 이하의 과태료가 부과됩니다.",
  "wrong_option_explanations": null,
  "key_concept": "맞춤형화장품 판매업 신고를 하지 않고 영업할 경우 부과되는 최대 과태료는",
  "memory_sentence": "미신고 영업 = 300만원 과태료",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": "화장품법(L001)",
    "guide": null,
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": "2026-04-02",
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q005 변환, 원 status verified-original"
    }
  ]
}
```

---

### Q-CCE-14

**FAIL 사유** — 개봉 후 사용기간(PAO) 표시 심벌의 '열린 용기 모양'이라는 정답이 로컬 소스 어디에도 없다. 화장품법 시행규칙 [별표 4] 제6호 나목은 "개봉 후 사용기간을 나타내는 심벌과 기간을 기재·표시할 수 있다(예시: 개봉 후 사용기간이 12개월 이내인 제품)"까지만 텍스트로 확인되고 심벌 도안은 이미지라 텍스트 추출본에 없으며, 교수학습가이드 4판 전문에도 '심벌/심볼'·'열린 용기' 서술이 없다. 오답 설명('삼각형은 재활용 표시')도 사용 소스에 근거 없음. 별표 4 PDF 도안을 확보한 뒤 재출제 권장.

```json
{
  "id": "Q-CCE-14",
  "subject": 3,
  "topic": "3.4.6",
  "level": "D",
  "type": "mcq",
  "qtype": "definition",
  "points": 8,
  "difficulty": 3,
  "importance": "M",
  "vg": null,
  "stem": "개봉 후 사용기간(PAO, Period After Opening)을 표시하는 기호는?",
  "choices": [
    "모래시계 모양",
    "열린 용기 모양",
    "시계 모양",
    "달력 모양",
    "삼각형 모양"
  ],
  "answer": 1,
  "shuffle": false,
  "answer_text": null,
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "개봉 후 사용기간은 열린 용기(jar) 모양의 기호 안에 개월 수를 표시합니다 (예: 12M).",
  "wrong_option_explanations": [
    "모래시계는 사용기한 기호가 아닙니다.",
    "열린 용기 모양이 PAO 표시 기호입니다(정답).",
    "시계 모양은 사용되지 않습니다.",
    "달력 모양은 사용되지 않습니다.",
    "삼각형은 재활용 표시입니다."
  ],
  "key_concept": "개봉 후 사용기간(PAO, Period After Opening)을 표시",
  "memory_sentence": "PAO = 열린 용기 모양 + 개월수",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": "화장품법(L001)",
    "guide": null,
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": "2026-04-02",
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q014 변환, 원 status verified-original"
    },
    {
      "date": "2026-09-05",
      "note": "topic 매핑: 합격코치 topic3-5가 topics.js 다수 세부항목(3.4.6,3.4.7)에 걸쳐 있어 내용 기준으로 3.4.6 선택"
    }
  ]
}
```

---

### Q-CCE-15

**FAIL 사유** — '원료 및 내용물의 보관 온도 15~25℃'라는 규범이 법령·가이드 어디에도 없다. CGMP·안전기준규정에 원료·내용물 보관 온도 수치 규정이 없고, 교수학습가이드 4판 인쇄 p.~(s4.txt 2415행)은 오히려 '표준온도는 20℃, 상온은 15~25℃, 실온은 1~30℃, 미온은 30~40℃, 냉소는 1~15℃'로 정의하여, 문항이 15~25℃를 '실온'이라 부른 것 자체가 소스와 어긋난다(15~25℃는 상온). 보기 5개 중 어느 것도 소스가 뒷받침하지 않아 FIX 불가.

```json
{
  "id": "Q-CCE-15",
  "subject": 3,
  "topic": "3.4.3",
  "level": "D",
  "type": "mcq",
  "qtype": "limit_number",
  "points": 12,
  "difficulty": 3,
  "importance": "M",
  "vg": null,
  "stem": "원료 및 내용물의 보관 온도로 가장 적절한 것은?",
  "choices": [
    "0~5℃",
    "5~10℃",
    "15~25℃",
    "25~30℃",
    "30℃ 이상"
  ],
  "answer": 2,
  "shuffle": false,
  "answer_text": null,
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "화장품 제조 및 품질관리 기준에 따라 특별한 규정이 없는 한 원료 및 내용물은 실온(15~25℃)에서 보관하는 것이 일반적입니다.",
  "wrong_option_explanations": [
    "0~5℃는 냉장 보관이 필요한 특수 원료용입니다.",
    "5~10℃는 냉장 보관이 필요한 특수 원료용입니다.",
    "15~25℃가 일반적인 실온 보관 온도입니다(정답).",
    "25~30℃는 다소 높은 온도입니다.",
    "30℃ 이상은 품질 저하 위험이 있습니다."
  ],
  "key_concept": "원료 및 내용물의 보관 온도로 가장 적절한 것은?",
  "memory_sentence": "실온 보관 = 15~25℃",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": null,
    "guide": "4판(페이지 미상)",
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": null,
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q015 변환, 원 status verified-original"
    },
    {
      "date": "2026-09-05",
      "note": "topic 매핑: 합격코치 topic3-4가 topics.js 다수 세부항목(3.4.1,3.4.2,3.4.3,3.4.4,3.4.5,3.4.8)에 걸쳐 있어 내용 기준으로 3.4.3 선택"
    }
  ]
}
```

---

### Q-CCE-16

**FAIL 사유** — '구리는 설비·기구 재질로 부적합'이라는 정답이 소스로 반증된다. 교수학습가이드 4판 인쇄 p.215(s3.txt 2447행)는 이송 파이프의 재질로 '유리, 스테인리스 스틸 #304 또는 #316, 구리, 알루미늄 등으로 구성'이라고 구리를 명시적으로 열거한다. 또한 보기 ③ '테프론'은 가이드 전문에 한 번도 등장하지 않아 오답 설명도 근거가 없다. 정답이 소스와 충돌하므로 FIX 불가.

```json
{
  "id": "Q-CCE-16",
  "subject": 3,
  "topic": "3.3.4",
  "level": "D",
  "type": "mcq",
  "qtype": "pick_wrong",
  "points": 12,
  "difficulty": 3,
  "importance": "M",
  "vg": null,
  "stem": "화장품 제조에 사용하는 설비 및 기구의 재질로 부적합한 것은?",
  "choices": [
    "스테인리스 스틸",
    "유리",
    "테프론",
    "구리",
    "플라스틱(식품용)"
  ],
  "answer": 3,
  "shuffle": false,
  "answer_text": null,
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "구리는 화학적으로 활성이 높아 화장품 성분과 반응할 수 있어 부적합합니다. 스테인리스 스틸, 유리, 테프론, 식품용 플라스틱은 적합한 재질입니다.",
  "wrong_option_explanations": [
    "스테인리스 스틸은 가장 일반적인 재질입니다.",
    "유리는 화학적으로 안정적입니다.",
    "테프론은 비점착성으로 적합합니다.",
    "구리는 화학 반응 위험이 있어 부적합합니다(정답).",
    "식품용 플라스틱은 적합합니다."
  ],
  "key_concept": "화장품 제조에 사용하는 설비 및 기구의 재질로 부적합한 것은?",
  "memory_sentence": "구리 = 부적합 (반응성)",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": null,
    "guide": "4판(페이지 미상)",
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": null,
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q016 변환, 원 status verified-original"
    },
    {
      "date": "2026-09-05",
      "note": "topic 매핑: 합격코치 topic3-3가 topics.js 다수 세부항목(3.3.1,3.3.2,3.3.3,3.3.4,3.3.5)에 걸쳐 있어 내용 기준으로 3.3.4 선택"
    }
  ]
}
```

---

### Q-CCE-17

**FAIL 사유** — 맞춤형화장품조제관리사 교육 이수 시간 '30시간'은 근거가 없다. 화장품법 시행규칙 제14조 제9항은 '교육시간은 4시간 이상, 8시간 이하로 한다'고 정하며(법 제5조 제7항: 매년), 문항이 인용한 시행규칙 [별표 7]은 행정처분 기준으로 교육 내용을 담고 있지 않다. '30시간'은 법령·교수학습가이드 전문 검색에서 0건. 보기 5개(10·20·30·40·50시간)에 정답이 없어 보기를 전부 새로 써야 하므로 FIX 불가 → 같은 논점은 Q-A5-11(4~8시간)이 대체한다.

```json
{
  "id": "Q-CCE-17",
  "subject": 4,
  "topic": "4.1.2",
  "level": "D",
  "type": "mcq",
  "qtype": "limit_number",
  "points": 8,
  "difficulty": 2,
  "importance": "M",
  "vg": null,
  "stem": "맞춤형화장품조제관리사의 교육 이수 시간은?",
  "choices": [
    "10시간",
    "20시간",
    "30시간",
    "40시간",
    "50시간"
  ],
  "answer": 2,
  "shuffle": false,
  "answer_text": null,
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "화장품법 시행규칙 별표 7에 따라 맞춤형화장품조제관리사는 최소 30시간의 교육을 이수해야 합니다.",
  "wrong_option_explanations": [
    "10시간은 너무 짧습니다.",
    "20시간은 부족합니다.",
    "30시간이 최소 이수 시간입니다(정답).",
    "40시간은 필요 이상입니다.",
    "50시간은 필요 이상입니다."
  ],
  "key_concept": "맞춤형화장품조제관리사의 교육 이수 시간은?",
  "memory_sentence": "조제관리사 교육 = 30시간",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": "화장품법 시행규칙(L003)",
    "guide": null,
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": "2026-04-02",
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q017 변환, 원 status verified-original"
    },
    {
      "date": "2026-09-05",
      "note": "topic 매핑: 합격코치 topic4-1가 topics.js 다수 세부항목(4.1.1,4.1.2,4.1.3,4.1.4,4.1.5)에 걸쳐 있어 내용 기준으로 4.1.2 선택"
    }
  ]
}
```

---

### Q-CCE-20

**FAIL 사유** — '혼합·소분 내역서 3년 보관'의 근거가 없다. 조문 용어부터 '맞춤형화장품 판매내역서'(시행규칙 제12조의2 제3호)이며 해당 호는 '작성·보관할 것'만 정하고 보관 기간을 두지 않는다. 교수학습가이드 4판의 판매내역서 서술(인쇄 p.193·196·259) 어디에도 보관 기간이 없고, 시행규칙에서 3년이 등장하는 곳은 영유아·어린이 제품별 안전성 자료(제10조의2 제2항 제2호)와 책임판매관리자의 품질관리 기록 3년(별표 1, 가이드 인쇄 p.20)으로 대상이 다르다. 정답 숫자 자체가 무근거라 FIX 불가.

```json
{
  "id": "Q-CCE-20",
  "subject": 4,
  "topic": "4.7.1",
  "level": "D",
  "type": "short",
  "qtype": "limit_number",
  "points": 8,
  "difficulty": 2,
  "importance": "M",
  "vg": null,
  "stem": "혼합·소분 내역서는 최소 몇 년간 보관해야 하는가?",
  "choices": [],
  "answer": null,
  "shuffle": false,
  "answer_text": [
    "3",
    "3년",
    "삼년"
  ],
  "blanks": null,
  "grade": "exact",
  "strict_term": false,
  "unit": null,
  "number_tolerance": 0,
  "near_miss": [],
  "explanation": "화장품법 시행규칙에 따라 혼합·소분 내역서는 작성일로부터 최소 3년간 보관해야 합니다.",
  "wrong_option_explanations": null,
  "key_concept": "혼합·소분 내역서는 최소 몇 년간 보관해야 하는가?",
  "memory_sentence": "내역서 보관 = 3년",
  "trap": "(미기재 — 검증 시 보완)",
  "source": {
    "law": "화장품법 시행규칙(L003)",
    "guide": null,
    "asof": "2026-09",
    "confidence": "mid"
  },
  "law_effective_date": "2026-04-02",
  "cards": [],
  "tags": [],
  "verified": false,
  "verified_by": null,
  "verified_at": null,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 q020 변환, 원 status verified-original"
    }
  ]
}
```

---

### C-CCE-10

**FAIL 사유** — '원료 및 내용물의 일반적인 보관 온도 15~25℃(실온)'의 근거가 없다. 법령·CGMP에 원료·내용물 보관 온도 수치 규정이 없고, 교수학습가이드 4판(s4.txt 2415행)은 '표준온도 20℃ / 상온 15~25℃ / 실온 1~30℃ / 미온 30~40℃ / 냉소 1~15℃'로 정의해 15~25℃를 '실온'이라 한 뒷면 서술이 소스와 충돌한다(15~25℃는 상온). 참고: 이 온도 용어 정의표 자체는 좋은 카드 후보이므로 별도 신규 카드로 작성 권장.

```json
{
  "id": "C-CCE-10",
  "subject": 3,
  "topic": "3.4.3",
  "category": "안전",
  "kind": "number",
  "importance": "M",
  "short_prone": false,
  "front": "원료 및 내용물의 일반적인 보관 온도는?",
  "back": "15~25℃ (실온) - 특별한 규정이 없는 한 실온 보관",
  "mnemonic": "실온 보관 = 15~25℃",
  "source": {
    "law": null,
    "guide": "4판(페이지 미상)",
    "asof": "2026-09",
    "confidence": "mid"
  },
  "related": [],
  "verified": false,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 note010 카드 변환"
    },
    {
      "date": "2026-09-05",
      "note": "topic 매핑: 합격코치 topic3-4가 topics.js 다수 세부항목(3.4.1,3.4.2,3.4.3,3.4.4,3.4.5,3.4.8)에 걸쳐 있어 내용 기준으로 3.4.3 선택"
    }
  ]
}
```

---

### C-CCE-12

**FAIL 사유** — '혼합·소분 내역서 작성일로부터 3년 보관'의 근거가 없다. 조문 용어는 '맞춤형화장품 판매내역서'(시행규칙 제12조의2 제3호)이고 해당 호는 보관 기간을 정하지 않는다. 교수학습가이드 4판의 판매내역서 서술(인쇄 p.193·196·259)에도 기간이 없다.

```json
{
  "id": "C-CCE-12",
  "subject": 4,
  "topic": "4.7.1",
  "category": "규정",
  "kind": "list",
  "importance": "M",
  "short_prone": true,
  "front": "혼합·소분 내역서의 보관 기간은?",
  "back": "작성일로부터 최소 3년간 보관",
  "mnemonic": "내역서 보관 = 3년",
  "source": {
    "law": "화장품법 시행규칙(L003)",
    "guide": null,
    "asof": "2026-09",
    "confidence": "mid"
  },
  "related": [],
  "verified": false,
  "history": [
    {
      "date": "2026-09-05",
      "note": "합격코치 note012 카드 변환"
    }
  ]
}
```
