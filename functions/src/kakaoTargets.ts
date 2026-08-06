export interface SecretaryDoc {
  uid: string
  assignedSeventyUid?: string
  kakaoConnected?: boolean
}

// assignedSeventyUid는 집행서기에게만 있는 필드이므로(src/types/user.ts) 역할 필터가 따로 필요 없다.
export function filterTargetSecretaries(
  candidates: SecretaryDoc[],
  seventyUid: string | undefined,
): string[] {
  if (!seventyUid) return []
  return candidates
    .filter((c) => c.assignedSeventyUid === seventyUid && c.kakaoConnected === true)
    .map((c) => c.uid)
}
