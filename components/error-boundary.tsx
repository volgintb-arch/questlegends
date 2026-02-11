"use client"

import React from "react"
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

const isDev = process.env.NODE_ENV === "development"

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, showDetails } = this.state

      return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-card-foreground">
                  Что-то пошло не так
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться назад.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4" />
                  Попробовать снова
                </button>
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  Обновить страницу
                </button>
              </div>

              {isDev && error && (
                <div className="w-full pt-3">
                  <button
                    onClick={this.toggleDetails}
                    className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showDetails ? (
                      <>
                        Скрыть подробности <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Показать подробности <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>

                  {showDetails && (
                    <div className="mt-3 w-full space-y-2 text-left">
                      <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                        <p className="text-xs font-mono font-semibold text-destructive break-words">
                          {error.name}: {error.message}
                        </p>
                      </div>
                      {error.stack && (
                        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
