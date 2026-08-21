import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ForbiddenState } from '@/components/ui'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return <ForbiddenState action={<Link to="/dashboard">{t('state.goHome')}</Link>} />
}
