/**
 * 셀 하나를 RFC4180으로 인용한다. 전부 인용하는 이유 — 조건부로 인용하면
 * "언제 인용해야 하나"를 매번 판단해야 하고, 쉼표·줄바꿈·인용부호를 하나라도
 * 놓치면 열이 밀린다.
 */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
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
