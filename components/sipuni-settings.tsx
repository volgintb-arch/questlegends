"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Save, Plus, X, Loader2, Phone, Link, Key } from "lucide-react"

export function SipuniSettings() {
  const { getAuthHeaders } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [sipNumbers, setSipNumbers] = useState<string[]>([])
  const [newNumber, setNewNumber] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [hasSettings, setHasSettings] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/sipuni/settings", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setApiKey(data.settings.apiKey || "")
          setSipNumbers(data.settings.sipNumbers || [])
          setIsActive(data.settings.isActive || false)
          setHasSettings(true)
        }
      }
    } catch {
      toast({ title: "Ошибка загрузки настроек", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({ title: "Введите API-ключ", variant: "destructive" })
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch("/api/sipuni/settings", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), sipNumbers }),
      })

      if (res.ok) {
        setHasSettings(true)
        toast({ title: "Настройки сохранены" })
      } else {
        const data = await res.json()
        toast({ title: data.error || "Ошибка сохранения", variant: "destructive" })
      }
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const addNumber = () => {
    const num = newNumber.trim()
    if (!num) return
    if (sipNumbers.includes(num)) {
      toast({ title: "Номер уже добавлен", variant: "destructive" })
      return
    }
    setSipNumbers([...sipNumbers, num])
    setNewNumber("")
  }

  const removeNumber = (num: string) => {
    setSipNumbers(sipNumbers.filter((n) => n !== num))
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/sipuni/webhook`
    : "/api/sipuni/webhook"

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast({ title: "URL скопирован" })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">API-ключ Sipuni</h3>
            <p className="text-xs text-muted-foreground">Ключ из личного кабинета Sipuni</p>
          </div>
          {hasSettings && (
            <Badge className="ml-auto" variant={isActive ? "default" : "secondary"}>
              {isActive ? "Активно" : "Неактивно"}
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API-ключ</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Введите API-ключ Sipuni"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">SIP-номера</h3>
            <p className="text-xs text-muted-foreground">Номера для привязки входящих звонков</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="Например: 100 или +74951234567"
              onKeyDown={(e) => e.key === "Enter" && addNumber()}
            />
            <Button onClick={addNumber} size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {sipNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sipNumbers.map((num) => (
                <Badge key={num} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
                  {num}
                  <button
                    onClick={() => removeNumber(num)}
                    className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Нет добавленных номеров</p>
          )}
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Link className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold">Webhook URL</h3>
            <p className="text-xs text-muted-foreground">Укажите этот URL в настройках HTTP Events в Sipuni</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded-lg break-all">{webhookUrl}</code>
          <Button onClick={copyWebhook} size="sm" variant="outline">
            Копировать
          </Button>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Сохранить настройки
      </Button>
    </div>
  )
}
