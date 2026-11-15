import { useEffect, useState } from 'react'
import {
  subscribeToVisitRequests,
  subscribeToVisitRequest,
  subscribeToRecommendations,
} from '@/services/visitRequestService'
import type { AppUser, VisitRecommendation, VisitRequest } from '@/types'

export function useVisitRequests(user: Pick<AppUser, 'role' | 'uid' | 'assignedSeventyUid'>) {
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { role, uid, assignedSeventyUid } = user

  useEffect(() => {
    setLoading(true)
    setError(false)
    return subscribeToVisitRequests(
      { role, uid, assignedSeventyUid },
      (list) => {
        setRequests(list)
        setLoading(false)
      },
      () => {
        setError(true)
        setLoading(false)
      },
    )
  }, [role, uid, assignedSeventyUid])

  return { requests, loading, error }
}

/** 요청 하나와 그 추천들을 실시간으로. 회장이 추천을 내면 칠십인 화면에 바로 뜬다. */
export function useVisitRequest(requestId: string | undefined) {
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [recommendations, setRecommendations] = useState<VisitRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!requestId) return
    setLoading(true)
    setError(false)
    const fail = () => {
      setError(true)
      setLoading(false)
    }
    const unsubRequest = subscribeToVisitRequest(
      requestId,
      (r) => {
        setRequest(r)
        setLoading(false)
      },
      fail,
    )
    const unsubRecs = subscribeToRecommendations(requestId, setRecommendations, fail)
    return () => {
      unsubRequest()
      unsubRecs()
    }
  }, [requestId])

  return { request, recommendations, loading, error }
}
