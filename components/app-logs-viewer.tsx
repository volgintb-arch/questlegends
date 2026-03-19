"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Filter,
  Globe,
  Webhook,
  Share2,
  Shield,
  Clock,
  Monitor,
  Server,
} from "lucide-react"

interface LogEntry {
  id: string
  level: string
  source: string
  message: string
  stack: string | null
  url: string | null
  method: string | null
  statusCode: number | null
  userId: string | null
  metadata: any
  createdAt: string
}

interface LogStats {
  level: string
  source: string
  date: string
  count: string
}

const LEVEL_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; bg: string; label: string }> = {
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Ошибка" },
  warn: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Предупреждение" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Инфо" },
  debug: { icon: Bug, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", label: "Дебаг" },
}

const SOURCE_CONFIG: Record<string, { icon: typeof Server; label: string }> = {
  api: { icon: Server, label: "API" },
  webhook: { icon: Webhook, label: "Вебхук" },
  integration: { icon: Share2, label: "Интеграция" },
  auth: { icon: Shield, label: "Авторизация" },
  cron: { icon: Clock, label: "Cron" },
  system: { icon: Monitor, label: "Система" },
  client: { icon: Globe, label: "Клиент" },
}

export function AppLogsViewer() {
  const { getAuthHeaders } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>("")
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Expanded log
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Tab
  const [tab, setTab] = useState<"logs" | "audit">("logs")

  // Audit log
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" })
      if (levelFilter) params.set("level", levelFilter)
      if (sourceFilter) params.set("source", sourceFilter)
      if (searchQuery) params.set("search", searchQuery)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const res = await fetch(`/api/app-logs?${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e)
    } finally {
      setLoading(false)
    }
  }, [page, levelFilter, sourceFilter, searchQuery, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/app-logs?action=stats&days=7", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats(data.data || [])
      }
    } catch {} // eslint-disable-line react-hooks/exhaustive-deps
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res = await fetch(`/api/audit-log?page=${auditPage}&limit=50`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.data || [])
        setAuditTotalPages(data.pagination?.totalPages || 1)
        setAuditTotal(data.pagination?.total || 0)
      }
    } catch (e) {
      console.error("Failed to fetch audit logs:", e)
    } finally {
      setAuditLoading(false)
    }
  }, [auditPage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "logs") {
      fetchLogs()
      fetchStats()
    } else {
      fetchAuditLogs()
    }
  }, [tab, fetchLogs, fetchStats, fetchAuditLogs])

  const handleCleanLogs = async () => {
    if (!confirm("Удалить логи старше 30 дней?")) return
    try {
      const res = await fetch("/api/app-logs?action=clean&days=30", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        alert(`Удалено ${data.deleted} записей`)
        fetchLogs()
        fetchStats()
      }
    } catch {}
  }

  // Compute summary stats
  const errorCount7d = stats.filter(s => s.level === "error").reduce((sum, s) => sum + Number(s.count), 0)
  const warnCount7d = stats.filter(s => s.level === "warn").reduce((sum, s) => sum + Number(s.count), 0)
  const infoCount7d = stats.filter(s => s.level === "info").reduce((sum, s) => sum + Number(s.count), 0)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Логи приложения</h1>
          <p className="text-sm text-muted-foreground">Мониторинг ошибок и событий системы</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchLogs(); fetchStats() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-sm hover:bg-accent/50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button
            onClick={handleCleanLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-sm hover:bg-red-500/10 text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            Очистить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-card rounded-lg w-fit">
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "logs" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ошибки и логи
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "audit" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Аудит действий
        </button>
      </div>

      {tab === "logs" ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-xs text-muted-foreground">Ошибки (7д)</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{errorCount7d}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-yellow-400" />
                <span className="text-xs text-muted-foreground">Предупреждения (7д)</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{warnCount7d}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Info size={16} className="text-blue-400" />
                <span className="text-xs text-muted-foreground">Инфо (7д)</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{infoCount7d}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по тексту ошибки..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-background/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showFilters ? "bg-primary/10 text-primary" : "glass-card hover:bg-accent/50"
                }`}
              >
                <Filter size={14} />
                Фильтры
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <select
                  value={levelFilter}
                  onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg bg-background/50 border border-border text-sm"
                >
                  <option value="">Все уровни</option>
                  <option value="error">Ошибки</option>
                  <option value="warn">Предупреждения</option>
                  <option value="info">Инфо</option>
                  <option value="debug">Дебаг</option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg bg-background/50 border border-border text-sm"
                >
                  <option value="">Все источники</option>
                  <option value="api">API</option>
                  <option value="webhook">Вебхук</option>
                  <option value="integration">Интеграция</option>
                  <option value="auth">Авторизация</option>
                  <option value="cron">Cron</option>
                  <option value="system">Система</option>
                  <option value="client">Клиент</option>
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg bg-background/50 border border-border text-sm"
                  placeholder="С даты"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg bg-background/50 border border-border text-sm"
                  placeholder="По дату"
                />

                {(levelFilter || sourceFilter || dateFrom || dateTo) && (
                  <button
                    onClick={() => { setLevelFilter(""); setSourceFilter(""); setDateFrom(""); setDateTo(""); setPage(1) }}
                    className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Log list */}
          <div className="space-y-2">
            {loading && logs.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                Загрузка логов...
              </div>
            ) : logs.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                Логи не найдены
              </div>
            ) : (
              logs.map((log) => {
                const levelCfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
                const sourceCfg = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.system
                const LevelIcon = levelCfg.icon
                const SourceIcon = sourceCfg.icon
                const isExpanded = expandedId === log.id

                return (
                  <div
                    key={log.id}
                    className={`glass-card rounded-xl border ${levelCfg.bg} transition-all`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="w-full p-3 sm:p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <LevelIcon size={16} className={`${levelCfg.color} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${levelCfg.bg} ${levelCfg.color}`}>
                              {levelCfg.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <SourceIcon size={10} />
                              {sourceCfg.label}
                            </span>
                            {log.method && log.url && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {log.method} {log.url.length > 60 ? log.url.substring(0, 60) + "..." : log.url}
                              </span>
                            )}
                            {log.statusCode && (
                              <span className={`text-xs font-mono ${log.statusCode >= 500 ? "text-red-400" : log.statusCode >= 400 ? "text-yellow-400" : "text-green-400"}`}>
                                {log.statusCode}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-mono truncate">{log.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(log.createdAt)}</p>
                        </div>
                        {(log.stack || log.metadata) && (
                          isExpanded ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/50">
                        {log.stack && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Stack Trace:</p>
                            <pre className="text-xs font-mono bg-background/50 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                        {log.metadata && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Метаданные:</p>
                            <pre className="text-xs font-mono bg-background/50 rounded-lg p-3 overflow-x-auto max-h-40">
                              {JSON.stringify(typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.userId && (
                          <p className="text-xs text-muted-foreground">User ID: <span className="font-mono">{log.userId}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Всего: {total} записей
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg glass-card text-sm disabled:opacity-50 hover:bg-accent/50 transition-colors"
                >
                  Назад
                </button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg glass-card text-sm disabled:opacity-50 hover:bg-accent/50 transition-colors"
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Audit Log Tab */
        <>
          <div className="space-y-2">
            {auditLoading ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                Загрузка...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                Записи аудита не найдены
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="glass-card rounded-xl p-3 sm:p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Shield size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.entityType}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{log.userName}</span>
                        <span className="text-muted-foreground"> ({log.userRole})</span>
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                          {JSON.stringify(log.details).substring(0, 120)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Всего: {auditTotal}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                  disabled={auditPage <= 1}
                  className="px-3 py-1.5 rounded-lg glass-card text-sm disabled:opacity-50 hover:bg-accent/50 transition-colors"
                >
                  Назад
                </button>
                <span className="text-sm text-muted-foreground">{auditPage} / {auditTotalPages}</span>
                <button
                  onClick={() => setAuditPage(Math.min(auditTotalPages, auditPage + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className="px-3 py-1.5 rounded-lg glass-card text-sm disabled:opacity-50 hover:bg-accent/50 transition-colors"
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
