// = + - @ 로 시작하거나 탭/CR로 시작하는 셀은 엑셀·시트가 수식으로 실행한다.
// 인용부호로 감싸는 것으로는 막히지 않는다 — 그건 CSV 문법이라 셀 평가 전에 벗겨진다.
// 앞에 작은따옴표를 붙이면 스프레드시트가 강제로 텍스트로 읽는다.
// 이 CSV에는 음수가 없으므로(날짜·요일·유형·제목·시각) '-' 접두 처리로 깨질 값은 없다.
// 검사는 trimStart()한 값에 대해 한다 — 앞에 공백이 있어도 스프레드시트는 그 공백을
// 건너뛰고 다음 문자를 수식 시작으로 읽는 구현이 있다(예: LibreOffice, 재가공 스크립트).
// JS trimStart()는 ES WhiteSpace 생성 규칙에 U+FEFF(ZWNBSP)도 포함하므로, 이 한 줄로
// "앞에 BOM이 붙은 값" 경로도 함께 막힌다 — 별도 처리가 빠진 게 아니라 검토 후 겸사겸사
// 닫힌 것이다. 검사만 trimStart된 값으로 하고, 실제로 앞에 붙이는 건 원본 값 그대로다 —
// 내보낸 셀의 내용이 원본과 달라지면 안 된다.
const FORMULA_LEAD = /^[=+\-@\t\r]/

/**
 * 셀 하나를 RFC4180으로 인용한다. 전부 인용하는 이유 — 조건부로 인용하면
 * "언제 인용해야 하나"를 매번 판단해야 하고, 쉼표·줄바꿈·인용부호를 하나라도
 * 놓치면 열이 밀린다.
 */
function csvCell(value: string): string {
  const guarded = FORMULA_LEAD.test(value.trimStart()) ? `'${value}` : value
  return `"${guarded.replace(/"/g, '""')}"`
}

/** 엑셀이 UTF-8로 읽도록 BOM을 앞에 붙인다. 없으면 한글이 깨진다. */
export function rowsToCsv(rows: string[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
