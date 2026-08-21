import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ForbiddenState } from '@/components/ui'
import { ROUTES } from './routes'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return <ForbiddenState action={<Link to={ROUTES.home}>{t('state.goHome')}</Link>} />
}
