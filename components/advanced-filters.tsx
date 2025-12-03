"use client"

import { useState } from "react"
import { Filter, X, Calendar, DollarSign, Users, MapPin, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface FilterConfig {
  location?: string
  stage?: string
  priority?: string
  status?: string
  category?: string
  role?: string
  dateFrom?: string
  dateTo?: string
  timePeriod?: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "thisYear" | "custom"
  participantsMin?: number
  participantsMax?: number
  amountMin?: number
  amountMax?: number
  search?: string
}

interface AdvancedFiltersProps {
  type: "deals" | "transactions" | "expenses" | "personnel"
  filters: FilterConfig
  onFiltersChange: (filters: FilterConfig) => void
  locations?: Array<{ id: string; name: string }>
}

export function AdvancedFilters({ type, filters, onFiltersChange, locations = [] }: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterConfig>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleResetFilters = () => {
    const emptyFilters: FilterConfig = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const handleRemoveFilter = (key: keyof FilterConfig) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const getStageOptions = () => {
    if (type === "deals") {
      return [
        { value: "Лиды", label: "Лиды" },
        { value: "Переговоры", label: "Переговоры" },
        { value: "Предложение", label: "Предложение" },
        { value: "Подписано", label: "Подписано" },
      ]
    }
    return []
  }

  const getStatusOptions = () => {
    if (type === "transactions") {
      return [
        { value: "completed", label: "Завершена" },
        { value: "pending", label: "Ожидает" },
        { value: "cancelled", label: "Отменена" },
      ]
    }
    if (type === "expenses") {
      return [
        { value: "pending", label: "Ожидает" },
        { value: "approved", label: "Одобрено" },
        { value: "rejected", label: "Отклонено" },
      ]
    }
    if (type === "personnel") {
      return [
        { value: "active", label: "Активен" },
        { value: "on_leave", label: "В отпуске" },
        { value: "inactive", label: "Неактивен" },
      ]
    }
    return []
  }

  const getCategoryOptions = () => {
    if (type === "expenses") {
      return [
        { value: "Аренда", label: "Аренда" },
        { value: "Коммунальные услуги", label: "Коммунальные услуги" },
        { value: "Маркетинг", label: "Маркетинг" },
        { value: "Оборудование", label: "Оборудование" },
        { value: "Прочее", label: "Прочее" },
      ]
    }
    return []
  }

  const getRoleOptions = () => {
    if (type === "personnel") {
      return [
        { value: "Аниматор", label: "Аниматор" },
        { value: "Ведущий", label: "Ведущий" },
        { value: "DJ", label: "DJ" },
        { value: "Администратор", label: "Администратор" },
      ]
    }
    return []
  }

  const getPriorityOptions = () => {
    return [
      { value: "low", label: "Низкий" },
      { value: "medium", label: "Средний" },
      { value: "high", label: "Высокий" },
    ]
  }

  const calculatePresetDates = (period: string) => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    switch (period) {
      case "today":
        return {
          dateFrom: startOfDay.toISOString().split("T")[0],
          dateTo: startOfDay.toISOString().split("T")[0],
        }
      case "yesterday":
        const yesterday = new Date(startOfDay)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          dateFrom: yesterday.toISOString().split("T")[0],
          dateTo: yesterday.toISOString().split("T")[0],
        }
      case "last7days":
        const last7 = new Date(startOfDay)
        last7.setDate(last7.getDate() - 7)
        return {
          dateFrom: last7.toISOString().split("T")[0],
          dateTo: startOfDay.toISOString().split("T")[0],
        }
      case "thisMonth":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        return {
          dateFrom: startOfMonth.toISOString().split("T")[0],
          dateTo: startOfDay.toISOString().split("T")[0],
        }
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        return {
          dateFrom: lastMonth.toISOString().split("T")[0],
          dateTo: endOfLastMonth.toISOString().split("T")[0],
        }
      case "thisYear":
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return {
          dateFrom: startOfYear.toISOString().split("T")[0],
          dateTo: startOfDay.toISOString().split("T")[0],
        }
      default:
        return {}
    }
  }

  const handleTimePeriodChange = (period: string) => {
    const dates = calculatePresetDates(period)
    setLocalFilters({
      ...localFilters,
      timePeriod: period as any,
      ...dates,
    })
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 relative bg-transparent">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Фильтры</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Расширенные фильтры</SheetTitle>
            <SheetDescription>Настройте фильтры для точного поиска</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Location Filter */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Локация
                </Label>
                <Select
                  value={localFilters.location}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, location: value })}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Выберите локацию" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(type === "transactions" || type === "expenses") && (
              <div className="space-y-2">
                <Label htmlFor="timePeriod" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Период времени
                </Label>
                <Select value={localFilters.timePeriod || "custom"} onValueChange={handleTimePeriodChange}>
                  <SelectTrigger id="timePeriod">
                    <SelectValue placeholder="Выберите период" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Сегодня</SelectItem>
                    <SelectItem value="yesterday">Вчера</SelectItem>
                    <SelectItem value="last7days">Последние 7 дней</SelectItem>
                    <SelectItem value="thisMonth">Этот месяц</SelectItem>
                    <SelectItem value="lastMonth">Прошлый месяц</SelectItem>
                    <SelectItem value="thisYear">Этот год</SelectItem>
                    <SelectItem value="custom">Произвольный период</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stage Filter (for deals) */}
            {type === "deals" && (
              <div className="space-y-2">
                <Label htmlFor="stage" className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Стадия
                </Label>
                <Select
                  value={localFilters.stage}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, stage: value })}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Выберите стадию" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStageOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority Filter (for deals) */}
            {type === "deals" && (
              <div className="space-y-2">
                <Label htmlFor="priority">Приоритет</Label>
                <Select
                  value={localFilters.priority}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Выберите приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPriorityOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status Filter */}
            {(type === "transactions" || type === "expenses" || type === "personnel") && (
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={localFilters.status}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Filter (for expenses) */}
            {type === "expenses" && (
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={localFilters.category}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role Filter (for personnel) */}
            {type === "personnel" && (
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Роль
                </Label>
                <Select
                  value={localFilters.role}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === "transactions" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Количество участников
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="participantsMin" className="text-xs">
                        От
                      </Label>
                      <Input
                        id="participantsMin"
                        type="number"
                        placeholder="0"
                        value={localFilters.participantsMin || ""}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            participantsMin: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participantsMax" className="text-xs">
                        До
                      </Label>
                      <Input
                        id="participantsMax"
                        type="number"
                        placeholder="∞"
                        value={localFilters.participantsMax || ""}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            participantsMax: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Date Range Filter */}
            {(type === "transactions" || type === "expenses") && localFilters.timePeriod === "custom" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Произвольный период
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="text-xs">
                        С
                      </Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={localFilters.dateFrom || ""}
                        onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateTo" className="text-xs">
                        По
                      </Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={localFilters.dateTo || ""}
                        onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Amount Range Filter */}
            {(type === "deals" || type === "transactions" || type === "expenses") && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Сумма (₽)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amountMin" className="text-xs">
                        От
                      </Label>
                      <Input
                        id="amountMin"
                        type="number"
                        placeholder="0"
                        value={localFilters.amountMin || ""}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            amountMin: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountMax" className="text-xs">
                        До
                      </Label>
                      <Input
                        id="amountMax"
                        type="number"
                        placeholder="∞"
                        value={localFilters.amountMax || ""}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            amountMax: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={handleResetFilters}>
              Сбросить
            </Button>
            <Button className="flex-1" onClick={handleApplyFilters}>
              Применить
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              Локация: {locations.find((l) => l.id === filters.location)?.name}
              <button onClick={() => handleRemoveFilter("location")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.stage && (
            <Badge variant="secondary" className="gap-1">
              Стадия: {filters.stage}
              <button onClick={() => handleRemoveFilter("stage")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              Приоритет: {filters.priority}
              <button onClick={() => handleRemoveFilter("priority")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Статус: {filters.status}
              <button onClick={() => handleRemoveFilter("status")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Категория: {filters.category}
              <button onClick={() => handleRemoveFilter("category")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.role && (
            <Badge variant="secondary" className="gap-1">
              Роль: {filters.role}
              <button onClick={() => handleRemoveFilter("role")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              Период: {filters.dateFrom || "..."} - {filters.dateTo || "..."}
              <button
                onClick={() => {
                  handleRemoveFilter("dateFrom")
                  handleRemoveFilter("dateTo")
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(filters.participantsMin || filters.participantsMax) && (
            <Badge variant="secondary" className="gap-1">
              Участники: {filters.participantsMin || 0} - {filters.participantsMax || "∞"}
              <button
                onClick={() => {
                  handleRemoveFilter("participantsMin")
                  handleRemoveFilter("participantsMax")
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.timePeriod && filters.timePeriod !== "custom" && (
            <Badge variant="secondary" className="gap-1">
              Период:{" "}
              {filters.timePeriod === "today"
                ? "Сегодня"
                : filters.timePeriod === "yesterday"
                  ? "Вчера"
                  : filters.timePeriod === "last7days"
                    ? "Последние 7 дней"
                    : filters.timePeriod === "thisMonth"
                      ? "Этот месяц"
                      : filters.timePeriod === "lastMonth"
                        ? "Прошлый месяц"
                        : filters.timePeriod === "thisYear"
                          ? "Этот год"
                          : ""}
              <button onClick={() => handleRemoveFilter("timePeriod")} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </>
  )
}
