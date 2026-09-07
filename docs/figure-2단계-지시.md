# 암기카드 그림 — 2단계 지시 (2026-09-07 검수 후)

시범 4장(C-B1-01~04) 검수 통과. 창업자 승인으로 **나머지 46장 전부 figure 추가**를 진행한다.

## 1단계 검수 결과 (통과)

- `node --test tests/core.test.cjs` 137 통과 · `tests/blueprint.test.cjs` 7 통과 · 실패 0
- `node scripts/check-data.cjs` 오류 0, figure 보유 카드 4/50 인식
- viewBox 360×(92~268), 글자 12~13px, 색 팔레트 준수, 배경 #F5F0E6 명시
- 그림 안 글자·숫자가 전부 해당 카드 back/mnemonic 에서 나옴 (title·desc 는 합성 설명문이라 예외로 정상)

## 2단계에서 고칠 것 2가지

### A. timeline 은 한 과정만 담는다 (C-B1-04 수정 필요)

지금 C-B1-04 는 서로 다른 두 과정을 화살표 하나로 이어 놓았다.

- `0.5 % 이상 → 1년` = 안정성시험 **자료 보관** 기간
- `회수계획서 5일 → 가등급 15일 → 나등급/다등급 30일 → 입증 자료 2년` = **회수 절차**

좌→우 화살표는 "순서"를 뜻하므로 두 과정을 한 줄에 두면 사실이 아닌 인상을 준다.
**규칙:** timeline 의 steps 는 하나의 절차에 속해야 한다. 숫자 카드가 여러 과정을 담으면
① 라벨 붙은 timeline 두 개로 쪼개거나 ② groups 로 바꾼다.
C-B1-04 는 "안정성시험 자료 보관" / "위해화장품 회수" 두 묶음으로 분리할 것.

### B. 라벨 줄바꿈 여유

step 5개 이상 + 긴 라벨(예: `나등급/다등급`)이면 칸 폭이 좁아 3줄까지 내려간다.
높이 계산이 최대 줄 수를 반영하는지 확인하고, 넘칠 것 같으면 step 을 4개 이하로 나눌 것.

## 2단계 작업 순서

1. C-B1-04 를 위 A 규칙대로 수정.
2. `importance: "H"` 카드부터 figure 추가 → 그다음 `"M"`.
3. kind 별 기본 매핑: compare→compare · number→timeline(한 과정일 때만, 아니면 groups) · list→groups(mnemonic 이 끊는 위치 그대로) · definition→tree.
4. 카드마다 `history` 에 `{ date: "2026-09-07", note: "figure 추가" }` 기록.
5. **그림 글자·숫자는 그 카드 back 또는 mnemonic 에 있는 것만.** 새 사실을 만들지 않는다.
6. 그림이 오히려 방해되는 카드(본문이 두 줄뿐, 항목이 2개 이하, 순서·구조가 없는 단순 정의)는 figure 를 넣지 말고 목록으로 남길 것.
7. 끝나면 `node --test tests/core.test.cjs`, `node --test tests/blueprint.test.cjs`, `node scripts/check-data.cjs` 실행해 전부 통과 확인 → `docs/STATUS.md` 갱신 → git commit.

## 하지 말 것

- `git push` 및 gh-pages 배포 (창업자 승인 필요, 별건으로 대기 중)
- 카드 본문(front·back·mnemonic·source) 수정 — 그림이 안 맞으면 **그림을 고친다**
- 외부 CDN·웹폰트·이미지 파일 추가
