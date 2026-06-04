import { Component, type ReactNode } from 'react'
import i18n from '@/i18n'
import styles from './ErrorBoundary.module.scss'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className={styles.container}>
          <p>{i18n.t('common.error')}</p>
          <button className={styles.reloadBtn} onClick={() => window.location.reload()}>
            {i18n.t('common.refresh')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
