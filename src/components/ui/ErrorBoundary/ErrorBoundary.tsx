import { Component, type ReactNode } from 'react'
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
          <p>오류가 발생했습니다.</p>
          <button className={styles.reloadBtn} onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
