window.PL_CARDS = (window.PL_CARDS || []).concat([
  {
    id: "C-B6-01", subject: 4, topic: "4.2.1", category: "표피의 층구조와 각화", kind: "procedure",
    importance: "H", short_prone: true,
    front: "표피를 아래에서 위로 5개 층 순서대로 말하면? 그리고 각화(keratinization) 과정은 몇 단계인가?",
    back: "기저층 → 유극층 → 과립층 → 투명층 → 각질층. 각화는 ①세포 분열 ②유극세포에서 피부장벽 단백질 합성·정비 ③과립세포에서의 자기분해 ④각질세포에서의 재구축의 4단계이며 마지막 단계에서 각질층이 형성된다(4판 p.271~272).",
    mnemonic: "기·유·과·투·각 — '기유과 투각'",
    figure: {
      type: "raw",
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 186' width='100%' role='img' aria-label='표피 층 구조' font-family='-apple-system, Apple SD Gothic Neo, system-ui, sans-serif'><title>표피 층 구조</title><desc>아래에서 위로 기저층 · 유극층 · 과립층 · 투명층 · 각질층. 각화 4단계를 거쳐 맨 위에 각질층이 만들어진다.</desc><rect x='0' y='0' width='360' height='186' fill='#F5F0E6'/><line x1='48' y1='172' x2='48' y2='18' stroke='#B8821A' stroke-width='2'/><path d='M44 22 L52 22 L48 12 Z' fill='#B8821A'/><text x='24' y='92' font-size='12' fill='#B8821A' text-anchor='middle' font-weight='700'>각화</text><text x='24' y='108' font-size='12' fill='#B8821A' text-anchor='middle' font-weight='700'>4단계</text><rect x='68' y='10' width='284' height='30' rx='8' fill='#F5F0E6' stroke='#2A6F46' stroke-width='2'/><text x='210' y='30' font-size='13' fill='#1D1B17' text-anchor='middle' font-weight='700'>각질층</text><rect x='68' y='44' width='284' height='30' rx='8' fill='#F5F0E6' stroke='#1D1B17' stroke-width='1.5'/><text x='210' y='64' font-size='13' fill='#1D1B17' text-anchor='middle'>투명층</text><rect x='68' y='78' width='284' height='30' rx='8' fill='#F5F0E6' stroke='#1D1B17' stroke-width='1.5'/><text x='210' y='98' font-size='13' fill='#1D1B17' text-anchor='middle'>과립층</text><rect x='68' y='112' width='284' height='30' rx='8' fill='#F5F0E6' stroke='#1D1B17' stroke-width='1.5'/><text x='210' y='132' font-size='13' fill='#1D1B17' text-anchor='middle'>유극층</text><rect x='68' y='146' width='284' height='30' rx='8' fill='#F5F0E6' stroke='#1D1B17' stroke-width='1.5'/><text x='210' y='166' font-size='13' fill='#1D1B17' text-anchor='middle'>기저층</text></svg>"
    },
    source: { law: null, guide: "4판 p.271~272", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-01", "Q-B6-03"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }, { date: "2026-09-07", note: "figure(raw) 추가 — 표피는 '쌓인 층'이라 compare·timeline·groups·tree 네 스펙으로는 아래에서 위로 포개진 모양을 못 그린다. 그래서 raw SVG로 5개 층을 세로로 쌓고 왼쪽에 각화 방향 화살표를 붙였다. 글자는 back에 있는 것만 사용" }]
  },
  {
    id: "C-B6-02", subject: 4, topic: "4.2.1", category: "각질층 보습 숫자", kind: "number",
    importance: "H", short_prone: true,
    front: "각질층의 pH는? 세포간지질의 양적 순서는? 자연보습인자(NMF)의 아미노산은 무엇이 분해된 것인가?",
    back: "각질층 pH 4.5~5.5(약산성). 세포간지질은 세라마이드 50 %, 콜레스테롤 25 %, 자유지방산 15 % 순. NMF의 수용성 아미노산은 필라그린(filaggrin)이 단백질분해효소에 의해 분해된 것이다(4판 p.272).",
    mnemonic: "약산성 4.5~5.5 / 세라 50 · 콜레 25 · 지방산 15 / NMF는 필라그린이 잘린 것",
    figure: {
      type: "groups",
      groups: [
        { name: "각질층 pH", items: ["4.5~5.5", "약산성"] },
        { name: "세포간지질", items: ["세라마이드 50 %", "콜레스테롤 25 %", "자유지방산 15 %"] },
        { name: "NMF", items: ["필라그린"] }
      ]
    },
    source: { law: null, guide: "4판 p.272", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-02", "Q-B6-03", "Q-B6-05"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }, { date: "2026-09-07", note: "figure(groups) 추가 — 각질층 pH · 세포간지질 3성분 비율 · NMF 유래를 세 묶음으로. 글자는 back·mnemonic에 있는 것만 사용" }]
  },
  {
    id: "C-B6-03", subject: 4, topic: "4.2.1", category: "표피 vs 진피", kind: "compare",
    importance: "H", short_prone: false,
    front: "진피는 피부의 몇 %를 차지하고 주된 세포는 무엇인가? 멜라닌형성세포는 어디에 있나?",
    back: "진피는 피부의 90 % 이상을 차지하고 표피보다 두꺼우며(두께 비는 가이드가 p.273 10~40배, p.270 15~40배로 달리 적어 시험 숫자로 외우지 않는다), 유두진피와 망상진피로 나뉜다. 주된 세포는 섬유아세포(콜라겐·엘라스틴·히알루론산 생산)이고 대식세포·비만세포도 있다. 멜라닌형성세포는 표피에 있는 세포의 약 5 %로 대부분 기저층에 위치한다(4판 p.272~273).",
    mnemonic: "진피 90 % · 섬유아세포 / 멜라닌형성세포 5 %는 표피 기저층",
    figure: {
      type: "groups",
      groups: [
        { name: "진피", items: ["피부의 90 % 이상", "유두진피", "망상진피", "섬유아세포", "콜라겐·엘라스틴·히알루론산 생산", "대식세포", "비만세포"] },
        { name: "멜라닌형성세포", items: ["표피에 있는 세포의 약 5 %", "기저층"] }
      ]
    },
    source: { law: null, guide: "4판 p.272~273", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-04"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }, { date: "2026-09-05", note: "검증 수정(S2-V): '표피 두께의 10~40배' 단정을 가이드 내부 불일치(p.270 15~40배) 병기로 바꿈" }, { date: "2026-09-07", note: "figure(groups) 추가 — 진피의 비율·구성과, 표피에 있는 멜라닌형성세포를 갈라 놓음(90 %와 5 %의 분모가 달라 한 표로 비교하지 않음). 글자는 back·mnemonic에 있는 것만 사용" }]
  },
  {
    id: "C-B6-04", subject: 4, topic: "4.2.2", category: "모발 성장주기 숫자", kind: "number",
    importance: "H", short_prone: true,
    front: "모발 성장주기 3기의 수명과 전체 모발 중 비율은?",
    back: "성장기 수명 3~6년·약 88 %, 퇴행기 2~3주·약 1 %, 휴지기 3~4개월·약 11 %. 성장 속도는 0.2~0.5 mm/일이다(월 성장량은 같은 문단에 '1~1.5 cm/월'과 '한 달에 1.2~1.5 cm'가 함께 적혀 있어 외우지 않는다)(4판 p.276).",
    mnemonic: "88 : 1 : 11 (성장기·퇴행기·휴지기)",
    source: { law: null, guide: "4판 p.276", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-06"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }, { date: "2026-09-05", note: "검증 수정(S2-V): 월 성장량 1.2~1.5 cm 단정을 가이드 내부 불일치(1~1.5 cm/월) 병기로 바꿈" }]
  },
  {
    id: "C-B6-05", subject: 4, topic: "4.2.2", category: "모발 구조 용어", kind: "definition",
    importance: "M", short_prone: true,
    front: "모근부와 모간부는 각각 어떤 구조로 이루어지고, 모간부 3층의 구성비는?",
    back: "모근부 = 모구부·모유두·모모세포·내모근초/외모근초(뿌리 쪽). 모간부 = 모표피(전체 두발의 10~15 %)·모피질(85~90 %, 멜라닌 색소 존재)·모수질(중심부 공동, 가는 두발엔 없기도 함). 모표피는 에피·엑소·엔도큐티클 3층이다(4판 p.275~276, 279~280).",
    mnemonic: "뿌리는 구·유두·모모·근초 / 줄기는 표피 10~15 · 피질 85~90 · 수질",
    source: { law: null, guide: "4판 p.275~280", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-07", "Q-B6-08"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }]
  },
  {
    id: "C-B6-06", subject: 4, topic: "4.2.3", category: "피부·모발 상태 분석 기기", kind: "list",
    importance: "H", short_prone: true,
    front: "수분·피지·탄력·주름·색소침착·모발은 각각 어떤 방법이나 기기로 분석하나?",
    back: "수분 corneometer(그 밖에 TEWL 측정, 전기적 저항·정전·전도), 피지 sebumeter(테이프를 30초간 눌러 수집, μg/cm2), 탄력 음압을 가한 뒤 회복 정도 측정(cutometer·dermaflex·reviscometer), 주름 replica 분석법·3차원 표면 형태 측정, 색소침착 우즈램프(자외선A 365 nm)·피부 색소 측정기, 모발 trichoscopy(특수 현미경)(4판 p.281~282).",
    mnemonic: "수-corneo / 피지-sebu(30초) / 탄력-음압 / 주름-replica / 색소-우즈램프 365 / 모발-trichoscopy",
    source: { law: null, guide: "4판 p.281~282", asof: "2026-09", confidence: "high" },
    related: ["Q-B6-09", "Q-B6-10"],
    verified: true,
    history: [{ date: "2026-09-05", note: "신규 B6" }]
  }
]);
