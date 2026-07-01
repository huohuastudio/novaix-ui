import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  resetKeys?: unknown[]
  fallback?: (error: Error | null, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError) return
    const prev = prevProps.resetKeys ?? []
    const curr = this.props.resetKeys ?? []
    if (prev.length !== curr.length || prev.some((k, i) => k !== curr[i])) {
      this.setState({ hasError: false, error: null })
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.handleReset)
    }

    return <ErrorFallback error={this.state.error} />
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
          <span className="text-destructive text-lg font-semibold">!</span>
        </div>
        <h2 className="text-base font-medium mb-1">页面出现了问题</h2>
        <p className="text-sm text-muted-foreground mb-2">
          渲染过程中发生了意外错误，请尝试刷新页面
        </p>
        {import.meta.env.DEV && error && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-6 break-all">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.assign('/')}>
            <ArrowLeft />
            返回首页
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            <RotateCcw />
            刷新页面
          </Button>
        </div>
      </div>
    </div>
  )
}
