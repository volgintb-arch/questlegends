"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Search, HandshakeIcon, TrendingUp, DollarSign, Users, BookOpen, Building2, FileText } from "lucide-react"

interface SearchResult {
  id: string
  type: "deal" | "transaction" | "expense" | "personnel" | "article" | "franchisee"
  title: string
  subtitle?: string
  url: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim()) {
        setLoading(true)
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
          if (response.ok) {
            const data = await response.json()
            setResults(data)
          }
        } catch (error) {
          console.error("Search failed:", error)
          setResults([])
        } finally {
          setLoading(false)
        }
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false)
      setSearch("")
      router.push(url)
    },
    [router],
  )

  const getIcon = (type: string) => {
    switch (type) {
      case "deal":
        return <HandshakeIcon className="w-4 h-4" />
      case "transaction":
        return <TrendingUp className="w-4 h-4" />
      case "expense":
        return <DollarSign className="w-4 h-4" />
      case "personnel":
        return <Users className="w-4 h-4" />
      case "article":
        return <BookOpen className="w-4 h-4" />
      case "franchisee":
        return <Building2 className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deal":
        return "Сделки"
      case "transaction":
        return "Транзакции"
      case "expense":
        return "Расходы"
      case "personnel":
        return "Персонал"
      case "article":
        return "База знаний"
      case "franchisee":
        return "Франшизы"
      default:
        return "Другое"
    }
  }

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = []
      }
      acc[result.type].push(result)
      return acc
    },
    {} as Record<string, SearchResult[]>,
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
      >
        <Search className="w-4 h-4" />
        <span>Поиск...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Поиск по всей системе..." value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">{loading ? "Поиск..." : "Ничего не найдено"}</p>
              {!loading && <p className="text-xs text-muted-foreground/70 mt-1">Попробуйте изменить запрос</p>}
            </div>
          </CommandEmpty>

          {!search && (
            <CommandGroup heading="Подсказки">
              <CommandItem disabled>
                <div className="flex flex-col gap-1">
                  <span className="text-sm">Поиск работает по:</span>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• Клиентам и сделкам</li>
                    <li>• Транзакциям и расходам</li>
                    <li>• Сотрудникам</li>
                    <li>• Статьям базы знаний</li>
                    <li>• Франшизам</li>
                  </ul>
                </div>
              </CommandItem>
            </CommandGroup>
          )}

          {Object.entries(groupedResults).map(([type, items], index) => (
            <div key={type}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={getTypeLabel(type)}>
                {items.map((item) => (
                  <CommandItem key={item.id} value={item.title} onSelect={() => handleSelect(item.url)}>
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0 text-muted-foreground">{getIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        {item.subtitle && <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
