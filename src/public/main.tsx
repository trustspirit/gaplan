import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.scss'
import './i18n'
import PublicSchedulePage from '@/pages/public/PublicSchedulePage'
import { tokenFromPathname } from './token'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicSchedulePage token={tokenFromPathname(window.location.pathname)} />
  </StrictMode>,
)
