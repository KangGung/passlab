if (typeof window === "undefined") { globalThis.window = globalThis; }

window.PL_BLUEPRINT = {
  exam: { round: 12, date: "2026-09-19", start: "10:00", minutes: 120, total_points: 1000, pass_total: 600, pass_ratio: 0.4,
          mcq_range: [1, 80], short_range: [81, 100], choices: 5, asof: "2026-09-05",
          source: "대한상공회의소 2024 문항유형 및 배점기준(sources/official/2024_문항유형_및_배점기준.txt)" },
  subjects: [
    { id: 1, name: "화장품법의 이해", short_name: "화장품법", mcq: 7, short: 3, count: 10, points: 100, pass_points: 40,
      slots: { mcq: { "8": 3, "12": 4, "18": 0 }, short: { "8": 2, "12": 1, "18": 0 } } },
    { id: 2, name: "화장품 제조 및 품질관리", short_name: "제조·품질", mcq: 20, short: 5, count: 25, points: 250, pass_points: 100,
      slots: { mcq: { "8": 11, "12": 8, "18": 1 }, short: { "8": 3, "12": 2, "18": 0 } } },
    { id: 3, name: "유통 화장품 안전관리", short_name: "유통 안전", mcq: 25, short: 0, count: 25, points: 250, pass_points: 100,
      slots: { mcq: { "8": 14, "12": 10, "18": 1 }, short: { "8": 0, "12": 0, "18": 0 } } },
    { id: 4, name: "맞춤형화장품의 이해", short_name: "맞춤형", mcq: 28, short: 12, count: 40, points: 400, pass_points: 160,
      slots: { mcq: { "8": 15, "12": 12, "18": 1 }, short: { "8": 8, "12": 3, "18": 1 } } }
  ],
  points_meaning: { "8": "개념·정의 확인", "12": "적용·비교·절차", "18": "여러 근거 결합 사례 판단" },
  diagnostic: { total: 30, by_subject: { "1": 3, "2": 8, "3": 7, "4": 12 }, short_by_subject: { "1": 1, "2": 1, "3": 0, "4": 4 }, difficulty_mix: { "2": 0.3, "3": 0.5, "4": 0.2 } },
  bank_target: { "1": 50, "2": 125, "3": 125, "4": 200 }
};
if (typeof module !== "undefined") module.exports = window.PL_BLUEPRINT;
