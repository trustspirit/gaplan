import { Component, type ReactNode } from 'react'

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
        <div style={{ padding: '24px', textAlign: 'center', color: '#808081', fontFamily: 'sans-serif' }}>
          <p>오류가 발생했습니다.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '12px', padding: '8px 16px', cursor: 'pointer' }}
          >
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
