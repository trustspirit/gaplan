import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.scss'
import './i18n'
import RecommendPage from '@/pages/recommend/RecommendPage'
import { recommendParams } from './params'

const { requestId, token } = recommendParams(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecommendPage requestId={requestId} token={token} />
  </StrictMode>,
)
