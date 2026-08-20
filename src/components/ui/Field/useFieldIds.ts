import { useId } from 'react'

export function useFieldIds(id?: string) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  return {
    fieldId,
    errorId,
    hintId,
    // 힌트를 먼저, 에러를 나중에 읽게 한다
    describedBy: ({ error, hint }: { error?: string; hint?: string }) =>
      [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined,
  }
}
