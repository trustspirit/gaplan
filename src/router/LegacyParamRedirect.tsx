import { Navigate, generatePath, useParams } from 'react-router-dom'

/**
 * 옛 자식 경로를 파라미터를 보존한 채 새 위치로 보낸다.
 *
 * `LEGACY_REDIRECTS`(문자열 → 문자열)로는 `:planId`를 다룰 수 없어서 이 컴포넌트가
 * 필요하다. `to`는 `from`과 **같은 이름의** 파라미터를 써야 한다 —
 * `LEGACY_PARAM_REDIRECTS`의 테스트가 그걸 강제한다.
 */
export function LegacyParamRedirect({ to }: { to: string }) {
  const params = useParams()
  // useParams는 값이 undefined일 수 있다고 보지만, 이 컴포넌트는 from 패턴이
  // 매칭된 뒤에만 렌더되므로 패턴의 파라미터는 모두 채워져 있다. generatePath가
  // undefined를 받지 않으므로 빈 항목만 걸러 넘긴다.
  const filled: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) filled[key] = value
  }
  return <Navigate to={generatePath(to, filled)} replace />
}
