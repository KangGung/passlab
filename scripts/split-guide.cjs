#!/usr/bin/env node
// scripts/split-guide.cjs
// 식약처 교수학습가이드 개정4판(sources/official/교수학습가이드_개정4판.txt, 500쪽)을
// 과목별 파일(sources/official/guide4/s0_front.txt ~ s4.txt)로 자르고,
// 절 제목 색인(sources/official/guide4/INDEX.md)을 만든다.
//
// 재실행 가능: 원본 txt는 읽기만 하고, guide4/ 아래 파일만 새로 쓴다(덮어쓰기).
// Node 내장 모듈만 사용(fs, path) — npm install 불필요.
//
// 사용법: node scripts/split-guide.cjs

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_PATH = path.join(ROOT, 'sources', 'official', '교수학습가이드_개정4판.txt');
const OUT_DIR = path.join(ROOT, 'sources', 'official', 'guide4');

// ── 과목 경계를 찾는 데 쓰는 Chapter 헤더 패턴 ────────────────────────────
// 원문에 ChapterⅡ는 "ChapterⅡⅠ"로 오타 표기되어 있지만, "ChapterⅡ" 부분 문자열은
// 그대로 들어있으므로 정규식은 오타 영향을 받지 않는다.
const CHAPTER_RE = {
  1: /ChapterⅠ/,
  2: /ChapterⅡ/,
  3: /ChapterⅢ/,
  4: /ChapterⅣ/,
};

// ── 인쇄 페이지 번호(가이드 자체 쪽번호)를 페이지 본문에서 찾는 패턴 ──────
// 짝수쪽: "N 맞춤형화장품조제관리사 교수·학습 가이드"
// 홀수쪽: "ChapterX ... N" (Chapter 이름 뒤에 인쇄 쪽번호)
const PRINTED_PAGE_PLAIN_RE = /^\s*(\d+)\s+맞춤형화장품조제관리사\s+교수·학습\s+가이드\s*$/;
const CHAPTER_HEADER_HINT_RE = /Chapter[ⅠⅡⅢⅣ]+/;
const TRAILING_NUMBER_RE = /(\d+)\s*$/;

// ── INDEX.md용 절 제목 패턴 (브리프 지정) ────────────────────────────────
// 예: " 2.1.1. 화장품 원료의 종류" (3단계) 또는 " 3.1. 작업소 위생관리" (2단계, 상위 항목 반복 헤더 포함)
const SECTION_TITLE_RE = /^\s*(\d\.\d+\.(?:\d+\.)?)\s+(\S.*)$/;

// 각 출력 파일 안에서 페이지 경계를 다시 찾을 때 쓰는, 우리가 직접 삽입한 마커 패턴
const MARKER_RE = /^=== p\.(\d+)(?: \(인쇄 (\d+)\))? ===$/;

function readSource() {
  return fs.readFileSync(SRC_PATH, 'utf8');
}

// form feed(\f, U+000C)를 기준으로 페이지를 나눈다.
// 원본 마지막 글자가 단독 \f로 끝나는 경우(뒤에 내용이 전혀 없음)는
// 실제 501번째 페이지가 아니라 추출 과정의 흔적(artifact)이므로 페이지 경계로 세지 않고 버린다.
// (grep -c "\f" 로 세면 499줄이 나오는 이유: 한 줄에 \f가 2개 붙어 있는 경우가 1곳 있어
//  "줄" 기준 카운트와 "글자" 기준 카운트가 다르다. 이 스크립트는 글자(각 \f) 기준으로 페이지를
//  나누되, 맨 끝의 내용 없는 \f 1개만 제외해 정확히 500페이지가 되도록 한다.)
function splitIntoPages(raw) {
  const FF = '\f';
  const indices = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === FF) indices.push(i);
  }
  const rawFfCount = indices.length;

  let droppedTrailing = false;
  let content = raw;
  if (indices.length > 0 && indices[indices.length - 1] === raw.length - 1) {
    indices.pop();
    droppedTrailing = true;
    content = raw.slice(0, -1);
  }

  // 각 페이지 조각은 (직전 페이지의 \f 바로 뒤)부터 (다음 \f 바로 앞)까지다.
  // \f는 원문에서 항상 줄의 첫 글자로만 나타나므로(직전 줄바꿈 바로 다음),
  // 마지막 페이지를 제외한 모든 페이지 조각은 반드시 '\n'으로 끝난다.
  // → 아래에서 "마커줄 + '\n' + 페이지조각"을 그냥 문자열로 이어붙이기만 해도
  //    빈 줄이 끼거나 줄바꿈이 누락되는 일이 없다.
  const pages = [];
  let start = 0;
  for (const idx of indices) {
    pages.push(content.slice(start, idx));
    start = idx + 1;
  }
  pages.push(content.slice(start));

  return { pages, rawFfCount, usedFfCount: indices.length, droppedTrailing };
}

function findPrintedPage(pageText) {
  const lines = pageText.split('\n');
  for (const line of lines) {
    let m = line.match(PRINTED_PAGE_PLAIN_RE);
    if (m) return m[1];
    if (CHAPTER_HEADER_HINT_RE.test(line)) {
      m = line.match(TRAILING_NUMBER_RE);
      if (m) return m[1];
    }
  }
  return null;
}

function findFirstPageWithChapter(pages, re) {
  for (let i = 0; i < pages.length; i++) {
    if (re.test(pages[i])) return i + 1; // 1-indexed PDF 페이지 번호
  }
  return null;
}

function buildMarkerLine(pageNum, printedPage) {
  if (printedPage) return `=== p.${pageNum} (인쇄 ${printedPage}) ===`;
  return `=== p.${pageNum} ===`;
}

function main() {
  const raw = readSource();
  const { pages, rawFfCount, usedFfCount, droppedTrailing } = splitIntoPages(raw);
  const numPages = pages.length;

  const printedPages = pages.map(findPrintedPage);

  const firstCh1 = findFirstPageWithChapter(pages, CHAPTER_RE[1]);
  const firstCh2 = findFirstPageWithChapter(pages, CHAPTER_RE[2]);
  const firstCh3 = findFirstPageWithChapter(pages, CHAPTER_RE[3]);
  const firstCh4 = findFirstPageWithChapter(pages, CHAPTER_RE[4]);

  if (!firstCh1 || !firstCh2 || !firstCh3 || !firstCh4) {
    throw new Error(
      `Chapter 헤더를 모두 찾지 못함: ch1=${firstCh1} ch2=${firstCh2} ch3=${firstCh3} ch4=${firstCh4}`
    );
  }

  // 과목별 페이지 범위 (1-indexed, inclusive). 경계는 해당 Chapter 헤더가
  // 처음 나오는 페이지의 "시작"으로 잡는다(브리프 지정).
  const subjects = [
    { key: 's0_front', from: 1, to: firstCh1 - 1 },
    { key: 's1', from: firstCh1, to: firstCh2 - 1 },
    { key: 's2', from: firstCh2, to: firstCh3 - 1 },
    { key: 's3', from: firstCh3, to: firstCh4 - 1 },
    { key: 's4', from: firstCh4, to: numPages },
  ];

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const indexRows = []; // { code, title, file, line, pdfPage, kind }
  const fileStats = []; // { file, lines, pageFrom, pageTo, sectionCount }

  for (const subj of subjects) {
    const isFront = subj.key === 's0_front';

    // 1) 페이지 조각을 그대로 이어붙여 파일 텍스트를 만든다(줄 배열로 쪼갰다 합치지 않음 —
    //    그 과정에서 빈 줄이 끼는 실수를 피하기 위해 일부러 순수 문자열 이어붙이기만 쓴다).
    let text = '';
    for (let p = subj.from; p <= subj.to; p++) {
      const pageIdx = p - 1;
      text += buildMarkerLine(p, printedPages[pageIdx]) + '\n' + pages[pageIdx];
    }

    const outPath = path.join(OUT_DIR, `${subj.key}.txt`);
    fs.writeFileSync(outPath, text, 'utf8');

    // 2) 방금 실제로 파일에 쓴 텍스트를 다시 줄 단위로 훑어서 절 제목·페이지를 찾는다.
    //    (파일에 쓴 결과를 그대로 다시 읽는 방식이라 줄 번호가 항상 정확하다.)
    const outLines = text.split('\n');
    let currentPage = subj.from;
    let sectionCount = 0;
    for (let i = 0; i < outLines.length; i++) {
      const line = outLines[i];
      const markerM = line.match(MARKER_RE);
      if (markerM) {
        currentPage = Number(markerM[1]);
        continue;
      }
      const secM = line.match(SECTION_TITLE_RE);
      if (secM) {
        sectionCount++;
        indexRows.push({
          code: secM[1],
          title: secM[2].trim(),
          file: `guide4/${subj.key}.txt`,
          line: i + 1, // 1-indexed
          pdfPage: currentPage,
          kind: isFront ? '목차' : '본문',
        });
      }
    }

    const lineCount = (text.match(/\n/g) || []).length + (text.endsWith('\n') ? 0 : 1);
    fileStats.push({
      file: `${subj.key}.txt`,
      lines: lineCount,
      pageFrom: subj.from,
      pageTo: subj.to,
      sectionCount,
    });
  }

  writeIndex(indexRows, fileStats);

  // ── 콘솔 리포트 ──────────────────────────────────────────────────────
  console.log('=== split-guide.cjs 실행 결과 ===');
  console.log(`원본 raw FF 글자 수: ${rawFfCount}, 사용한 FF(페이지 경계): ${usedFfCount}, 끝 trailing FF 제거: ${droppedTrailing}`);
  console.log(`총 페이지 수: ${numPages}`);
  console.log(`Chapter 첫 등장 PDF 페이지: Ⅰ=${firstCh1} Ⅱ=${firstCh2} Ⅲ=${firstCh3} Ⅳ=${firstCh4}`);
  console.log('과목별 파일 통계:');
  for (const s of fileStats) {
    console.log(`  ${s.file}: ${s.lines}줄, PDF p.${s.pageFrom}~p.${s.pageTo} (${s.pageTo - s.pageFrom + 1}쪽), 절 제목 매치 ${s.sectionCount}개`);
  }
  const totalLines = fileStats.reduce((a, s) => a + s.lines, 0);
  console.log(`합계 줄 수: ${totalLines}`);
  console.log(`INDEX.md 행 수: ${indexRows.length}`);
}

function writeIndex(rows, fileStats) {
  const lines = [];
  lines.push('# guide4 절 제목 색인 (자동 생성 — scripts/split-guide.cjs)');
  lines.push('');
  lines.push('과목 경계(파일)는 Chapter 헤더가 처음 나오는 PDF 페이지 시작 기준. 절 코드 패턴: `^\\s*\\d\\.\\d+\\.(\\d+\\.)?\\s+\\S` (예: ` 2.1.1. 화장품 원료의 종류`).');
  lines.push('');
  lines.push('같은 코드가 여러 번 나오는 이유는 두 가지다.');
  lines.push('1) 페이지 상단 반복 헤더(목차·본문): 원문 각 페이지 상단에 그 페이지가 속한 절(2~3단계 코드) 제목이 반복 헤더로 인쇄되어 있어, 같은 코드가 그 절이 걸쳐 있는 페이지 수만큼 반복 등장한다.');
  lines.push('2) 부록·체크리스트 표에서 여러 열이 한 줄로 합쳐져 잡힌 2단계 코드 행(약 114행, `○`·`⊙`·`‣`·"N)" 같은 표 기호·항목번호 포함): s4.txt의 부록/체크리스트 영역(약 p.331~495)은 PDF 표를 텍스트로 뽑는 과정에서 여러 칸이 한 줄로 뭉쳐, 코드 정규식이 진짜 절 제목이 아니라 "코드 + 표 항목 문구 + ○/⊙ 체크 표시"를 통째로 잡은 경우가 섞여 있다(예: `3.4. | 41) 보관 중인 원료 및 내용물 출고 기준 ○ ○`). 이런 노이즈 행은 전부 2단계 코드(X.Y.)에서만 나오고 3단계 코드(X.Y.Z.)에는 섞이지 않는다.');
  lines.push('');
  lines.push('아래 표는 발견된 모든 줄을 그대로 실었고(요약·중복 제거하지 않음), `구분` 열이 `목차`인 것은 s0_front.txt(머리말·목차 영역), `본문`인 것은 s1~s4.txt(실제 본문) 안에서 발견된 것이다.');
  lines.push('');
  lines.push('**사용 팁**: 세부항목을 찾을 때는 3단계 코드(예 `2.3.1.`)로 grep하면 위 표 노이즈 없이 정확한 절만 나온다. 2단계 코드(예 `3.4.`)로 찾으면 반복 헤더와 부록 표 노이즈가 섞여 나올 수 있다.');
  lines.push('');

  // 과목별 절 못 잡힌 경우 여기 적어야 하는데(추정 금지), 실제로는 4과목 모두 잡혔음(아래 요약 참고).
  const bySubjectPrefix = { s1: '1.', s2: '2.', s3: '3.', s4: '4.' };
  const missing = [];
  for (const [file, prefix] of Object.entries(bySubjectPrefix)) {
    const found = rows.some((r) => r.file === `guide4/${file}.txt` && r.code.startsWith(prefix));
    if (!found) missing.push(`${file}.txt (접두사 ${prefix})`);
  }
  if (missing.length) {
    lines.push(`**⚠️ 절 제목이 안 잡힌 과목: ${missing.join(', ')} — 추정으로 채우지 않음.**`);
  } else {
    lines.push('4개 과목 파일(s1~s4) 모두에서 절 제목 패턴이 잡혔다(아래 표·요약 참고).');
  }
  lines.push('');

  lines.push('## 파일별 요약');
  lines.push('');
  lines.push('| 파일 | 줄 수 | PDF 페이지 범위 | 절 제목 매치 수 |');
  lines.push('|---|---|---|---|');
  for (const s of fileStats) {
    lines.push(`| ${s.file} | ${s.lines} | p.${s.pageFrom}~p.${s.pageTo} | ${s.sectionCount} |`);
  }
  lines.push('');

  lines.push('## 절 제목 전체 목록');
  lines.push('');
  lines.push('| 코드 | 제목 | 파일 | 줄 번호 | PDF 페이지 | 구분 |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    const safeTitle = r.title.replace(/\|/g, '\\|');
    lines.push(`| ${r.code} | ${safeTitle} | ${r.file} | ${r.line} | p.${r.pdfPage} | ${r.kind} |`);
  }
  lines.push('');

  fs.writeFileSync(path.join(OUT_DIR, 'INDEX.md'), lines.join('\n'), 'utf8');
}

main();
