"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  Send,
  Instagram,
  MessageCircle,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Zap,
  Shield,
  Phone,
} from "lucide-react"

type Channel = "telegram" | "whatsapp" | "instagram" | "vk" | "avito"

interface ChannelConfig {
  id: Channel
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description: string
  fields: FieldConfig[]
  instructions: string[]
  webhookInstructions: string[]
}

interface FieldConfig {
  key: string
  label: string
  placeholder: string
  type: "text" | "password"
  required: boolean
  helpText?: string
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "telegram",
    name: "Telegram",
    icon: <Send className="w-6 h-6" />,
    color: "text-[#26A5E4]",
    bgColor: "bg-[#26A5E4]/10 border-[#26A5E4]/20",
    description: "Бот для приема заявок из Telegram",
    fields: [
      {
        key: "bot_token",
        label: "Bot Token",
        placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        type: "password",
        required: true,
        helpText: "Получите у @BotFather командой /newbot",
      },
    ],
    instructions: [
      "Откройте @BotFather в Telegram",
      "Отправьте команду /newbot",
      "Придумайте имя и username бота",
      "Скопируйте полученный Bot Token",
    ],
    webhookInstructions: [
      "Webhook будет установлен автоматически",
      "Бот начнет получать сообщения сразу после подключения",
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <Phone className="w-6 h-6" />,
    color: "text-[#25D366]",
    bgColor: "bg-[#25D366]/10 border-[#25D366]/20",
    description: "WhatsApp Business API для приема заявок",
    fields: [
      {
        key: "phone_number_id",
        label: "Phone Number ID",
        placeholder: "1234567890",
        type: "text",
        required: true,
        helpText: "ID номера из WhatsApp Business API",
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "EAABx...",
        type: "password",
        required: true,
        helpText: "Постоянный токен из Meta Business Suite",
      },
    ],
    instructions: [
      "Создайте приложение в Meta for Developers",
      "Добавьте WhatsApp Business API",
      "Получите Phone Number ID и Access Token",
      "Вставьте данные в поля ниже",
    ],
    webhookInstructions: [
      "Скопируйте Webhook URL (ниже) в настройки WhatsApp",
      "Укажите Verify Token в Meta for Developers",
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <Instagram className="w-6 h-6" />,
    color: "text-[#E4405F]",
    bgColor: "bg-[#E4405F]/10 border-[#E4405F]/20",
    description: "Direct-сообщения из Instagram",
    fields: [
      {
        key: "page_id",
        label: "Instagram Page ID",
        placeholder: "17841400...",
        type: "text",
        required: true,
        helpText: "ID страницы из Meta Business Suite",
      },
      {
        key: "access_token",
        label: "Page Access Token",
        placeholder: "EAABx...",
        type: "password",
        required: true,
        helpText: "Долгосрочный токен страницы из Graph API",
      },
    ],
    instructions: [
      "Подключите Instagram к Facebook Business Page",
      "Создайте приложение в Meta for Developers",
      "Настройте Messenger API для Instagram",
      "Получите Page ID и долгосрочный Access Token",
    ],
    webhookInstructions: [
      "Скопируйте Webhook URL в настройки приложения Meta",
      "Подпишитесь на события messages и messaging_postbacks",
    ],
  },
  {
    id: "vk",
    name: "ВКонтакте",
    icon: <MessageCircle className="w-6 h-6" />,
    color: "text-[#4680C2]",
    bgColor: "bg-[#4680C2]/10 border-[#4680C2]/20",
    description: "Сообщения сообщества ВКонтакте",
    fields: [
      {
        key: "access_token",
        label: "Ключ доступа сообщества",
        placeholder: "vk1.a.xxx...",
        type: "password",
        required: true,
        helpText: "Настройки сообщества > API > Ключи доступа",
      },
      {
        key: "group_id",
        label: "ID сообщества",
        placeholder: "123456789",
        type: "text",
        required: true,
        helpText: "Числовой ID вашего сообщества",
      },
      {
        key: "confirmation_code",
        label: "Строка подтверждения",
        placeholder: "abc123",
        type: "text",
        required: true,
        helpText: "Настройки сообщества > API > Callback API > Строка подтверждения",
      },
    ],
    instructions: [
      "Перейдите в настройки сообщества ВК",
      "Раздел Работа с API > Ключи доступа",
      "Создайте ключ с правами на сообщения",
      "Скопируйте ключ, ID группы и строку подтверждения",
    ],
    webhookInstructions: [
      "Перейдите в Настройки > API > Callback API",
      "Вставьте Webhook URL в поле адреса сервера",
      "Подтвердите сервер (произойдет автоматически)",
    ],
  },
  {
    id: "avito",
    name: "Авито",
    icon: <ShoppingBag className="w-6 h-6" />,
    color: "text-[#00AAFF]",
    bgColor: "bg-[#00AAFF]/10 border-[#00AAFF]/20",
    description: "Сообщения от клиентов с Авито",
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "your-client-id",
        type: "text",
        required: true,
        helpText: "Из раздела API на avito.ru",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        placeholder: "your-client-secret",
        type: "password",
        required: true,
        helpText: "Секретный ключ приложения Авито",
      },
    ],
    instructions: [
      "Перейдите на avito.ru в раздел для профессионалов",
      "Создайте приложение в разделе API",
      "Включите доступ к Messenger API",
      "Скопируйте Client ID и Client Secret",
    ],
    webhookInstructions: [
      "Скопируйте Webhook URL в настройки приложения Авито",
      "Авито начнет пересылать сообщения автоматически",
    ],
  },
]

interface IntegrationWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  isAdmin: boolean
}

export function IntegrationWizard({ open, onClose, onSuccess, isAdmin }: IntegrationWizardProps) {
  const { getAuthHeaders } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdIntegration, setCreatedIntegration] = useState<{
    id: string
    webhook_url: string
    channel: string
  } | null>(null)
  const [webhookCopied, setWebhookCopied] = useState(false)

  const resetWizard = useCallback(() => {
    setStep(1)
    setSelectedChannel(null)
    setCredentials({})
    setIsSubmitting(false)
    setCreatedIntegration(null)
    setWebhookCopied(false)
  }, [])

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel)
    setCredentials({})
    setStep(2)
  }

  const channelConfig = selectedChannel ? CHANNELS.find((c) => c.id === selectedChannel) : null

  const isStep2Valid = () => {
    if (!channelConfig) return false
    return channelConfig.fields.every((f) => !f.required || (credentials[f.key] && credentials[f.key].trim() !== ""))
  }

  const handleSubmit = async () => {
    if (!selectedChannel || !channelConfig) return

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selectedChannel,
          credentials,
          assignment_strategy: "first_admin",
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedIntegration({
          id: data.integration.id,
          webhook_url: data.integration.webhook_url,
          channel: selectedChannel,
        })
        setStep(3)

        // Для Telegram пытаемся автоустановить webhook
        if (selectedChannel === "telegram" && credentials.bot_token) {
          try {
            await fetch(
              `https://api.telegram.org/bot${credentials.bot_token}/setWebhook?url=${encodeURIComponent(data.integration.webhook_url)}`,
            )
          } catch {
            // Не критично - webhook можно установить вручную
          }
        }
      } else {
        const error = await res.json()
        toast({
          title: "Ошибка создания интеграции",
          description: error.error || "Попробуйте еще раз",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: "Ошибка сети", description: "Проверьте подключение к интернету", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyWebhook = () => {
    if (createdIntegration?.webhook_url) {
      navigator.clipboard.writeText(createdIntegration.webhook_url)
      setWebhookCopied(true)
      setTimeout(() => setWebhookCopied(false), 2000)
      toast({ title: "Webhook URL скопирован" })
    }
  }

  const handleFinish = () => {
    resetWizard()
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with steps */}
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle className="text-base">
              {step === 1 && "Выберите платформу"}
              {step === 2 && `Настройка ${channelConfig?.name}`}
              {step === 3 && "Интеграция подключена"}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-accent" : "bg-muted"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1 mb-3">
            <span className="text-[10px] text-muted-foreground">Платформа</span>
            <span className="text-[10px] text-muted-foreground">Настройка</span>
            <span className="text-[10px] text-muted-foreground">Готово</span>
          </div>
        </div>

        {/* Step 1: Channel selection */}
        {step === 1 && (
          <div className="px-4 pb-4 space-y-2">
            {CHANNELS.map((channel) => (
              <Card
                key={channel.id}
                className={`p-3 cursor-pointer transition-all hover:scale-[1.01] border ${channel.bgColor}`}
                onClick={() => handleSelectChannel(channel.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`${channel.color} shrink-0`}>{channel.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{channel.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{channel.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Credentials form */}
        {step === 2 && channelConfig && (
          <div className="px-4 pb-4 space-y-4">
            {/* Instructions */}
            <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">Как получить данные:</span>
              </div>
              {channelConfig.instructions.map((instruction, i) => (
                <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-accent font-medium shrink-0">{i + 1}.</span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {channelConfig.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key} className="text-xs">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={credentials[field.key] || ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="h-8 text-xs font-mono"
                  />
                  {field.helpText && (
                    <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep(1)
                  setSelectedChannel(null)
                  setCredentials({})
                }}
                className="h-8 text-xs"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Назад
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isStep2Valid() || isSubmitting}
                className="h-8 text-xs flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Подключаем...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    Подключить {channelConfig.name}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success + Webhook */}
        {step === 3 && createdIntegration && channelConfig && (
          <div className="px-4 pb-4 space-y-4">
            {/* Success message */}
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {channelConfig.name} подключен
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Входящие сообщения будут автоматически создавать лиды в CRM
              </p>
            </div>

            {/* Webhook URL */}
            {selectedChannel !== "telegram" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Webhook URL</Label>
                <div className="flex gap-1.5">
                  <Input
                    readOnly
                    value={createdIntegration.webhook_url}
                    className="h-8 text-[10px] font-mono bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhook}
                    className="h-8 px-2 shrink-0 bg-transparent"
                  >
                    {webhookCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>

                {/* Webhook setup instructions */}
                <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                  <span className="text-[10px] font-medium text-foreground">
                    Завершите настройку:
                  </span>
                  {channelConfig.webhookInstructions.map((instruction, i) => (
                    <div key={i} className="flex gap-2 text-[10px] text-muted-foreground">
                      <span className="text-accent font-medium shrink-0">{i + 1}.</span>
                      <span>{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedChannel === "telegram" && (
              <div className="rounded-md bg-accent/10 border border-accent/20 p-3">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium text-foreground">
                    Webhook установлен автоматически
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Бот уже получает сообщения. Все входящие сообщения будут создавать лиды в CRM.
                </p>
              </div>
            )}

            {/* Summary badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                Автосоздание лидов
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                Дедупликация
              </Badge>
            </div>

            {/* Finish button */}
            <Button size="sm" onClick={handleFinish} className="w-full h-8 text-xs">
              <Check className="w-3 h-3 mr-1" />
              Готово
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
