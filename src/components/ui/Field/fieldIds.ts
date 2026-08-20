/**
 * 필드 보조 텍스트 id의 유일한 소유자. useFieldIds(aria-describedby를 만든다)와
 * Field(그 id를 가진 노드를 그린다)가 같은 템플릿을 각자 들고 있으면 한쪽만
 * 바뀌었을 때 aria-describedby가 존재하지 않는 노드를 가리키게 된다.
 */
export function fieldIds(fieldId: string) {
  return {
    errorId: `${fieldId}-error`,
    hintId: `${fieldId}-hint`,
  }
}
