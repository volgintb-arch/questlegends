"use client"

import { useState } from "react"
import {
  LayoutGrid,
  HandshakeIcon,
  TrendingUp,
  RussianRuble,
  BookOpen,
  Bell,
  Users,
  Calendar,
  Shield,
  MessageSquare,
  Share2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Rocket,
  Target,
  BarChart3,
} from "lucide-react"
import type { UserRole } from "@/contexts/auth-context"

interface OnboardingSliderProps {
  role: UserRole
  userName: string
  onComplete: () => void | Promise<void>
}

interface Slide {
  icon: React.ElementType
  title: string
  description: string
  features?: string[]
  gradient: string
}

const commonWelcomeSlide = (userName: string): Slide => ({
  icon: Sparkles,
  title: `Добро пожаловать, ${userName}!`,
  description: "Это ваше рабочее пространство в системе «Легенда об Искателях». Давайте познакомимся с основными возможностями.",
  features: [
    "Современный интерфейс с тёмной и светлой темой",
    "Уведомления в реальном времени",
    "Встроенный чат для общения с коллегами",
    "База знаний с обучающими материалами",
  ],
  gradient: "from-purple-500 to-indigo-600",
})

const commonEndSlide: Slide = {
  icon: Rocket,
  title: "Всё готово к работе!",
  description: "Вы ознакомились с основными возможностями. Подробные инструкции по каждому разделу вы найдёте в Базе Знаний.",
  features: [
    "Откройте «База Знаний» для подробных инструкций",
    "Используйте поиск для быстрого нахождения информации",
    "Свяжитесь с коллегами через встроенный чат",
  ],
  gradient: "from-emerald-500 to-teal-600",
}

function getSlidesForRole(role: UserRole, userName: string): Slide[] {
  const welcome = commonWelcomeSlide(userName)

  const ukSlides: Slide[] = [
    welcome,
    {
      icon: LayoutGrid,
      title: "Дашборд",
      description: "Главная панель с ключевыми метриками вашего бизнеса.",
      features: [
        "Общая выручка и прибыль по всем франшизам",
        "Количество активных сделок и лидов",
        "Графики динамики за период",
        "Быстрый доступ ко всем разделам",
      ],
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: HandshakeIcon,
      title: "CRM — Управление сделками",
      description: "Kanban-доска для ведения клиентов от первого контакта до завершения сделки.",
      features: [
        "Перетаскивание карточек между статусами",
        "Автоматическое создание лидов из интеграций",
        "История изменений по каждой сделке",
        "Фильтрация по дате, ответственному, источнику",
      ],
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: TrendingUp,
      title: "ERP — Финансовая аналитика",
      description: "Полная картина финансов по всем точкам франшизы.",
      features: [
        "Выручка, расходы, прибыль по каждой франшизе",
        "Сравнение показателей за периоды",
        "Экспорт в Excel с детализацией",
        "Динамика прогресса в процентах",
      ],
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Building2,
      title: "Управление франшизами",
      description: "Контроль и поддержка всех франчайзи в одном месте.",
      features: [
        "Список всех точек с контактами",
        "Финансовые показатели каждой точки",
        "Управление роялти и платежами",
        "Создание новых франчайзи",
      ],
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: Share2,
      title: "Интеграции",
      description: "Подключение каналов для автоматического сбора заявок.",
      features: [
        "Telegram, VK, Instagram, WhatsApp, Avito",
        "Tilda — формы с сайта",
        "Автоматическое создание лидов в CRM",
        "Настройка вебхуков в несколько кликов",
      ],
      gradient: "from-pink-500 to-rose-600",
    },
    {
      icon: Users,
      title: "Пользователи и доступ",
      description: "Управление командой и правами доступа.",
      features: [
        "Создание франчайзи и сотрудников УК",
        "Настройка индивидуальных прав доступа",
        "Просмотр активности пользователей",
        "Блокировка и деактивация аккаунтов",
      ],
      gradient: "from-amber-500 to-orange-600",
    },
    commonEndSlide,
  ]

  const franchiseeSlides: Slide[] = [
    welcome,
    {
      icon: LayoutGrid,
      title: "Дашборд",
      description: "Обзор ключевых показателей вашей точки.",
      features: [
        "Выручка и прибыль за текущий период",
        "Количество проведённых игр",
        "Ближайшие события в расписании",
        "Статус сделок в CRM",
      ],
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: HandshakeIcon,
      title: "CRM — Управление клиентами",
      description: "Ведите клиентов от заявки до проведённой игры.",
      features: [
        "Kanban-доска со статусами сделок",
        "Автозаполнение данных из интеграций",
        "Назначение ответственного сотрудника",
        "Комментарии и история изменений",
      ],
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: RussianRuble,
      title: "Финансы",
      description: "Контроль доходов и расходов вашей точки.",
      features: [
        "Учёт всех финансовых операций",
        "Категоризация расходов",
        "Отчёты за любой период",
        "Информация о роялти",
      ],
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Calendar,
      title: "График работы",
      description: "Планирование смен персонала.",
      features: [
        "Создание и редактирование смен",
        "Назначение аниматоров, ведущих, DJ",
        "Просмотр расписания на неделю/месяц",
        "Уведомления сотрудникам о сменах",
      ],
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: Share2,
      title: "Интеграции",
      description: "Подключите соцсети для автоматического сбора заявок.",
      features: [
        "Telegram, VK, Instagram, WhatsApp",
        "Заявки с сайта через Tilda",
        "Лиды автоматически попадают в CRM",
        "Простая настройка через мастер",
      ],
      gradient: "from-pink-500 to-rose-600",
    },
    commonEndSlide,
  ]

  const adminSlides: Slide[] = [
    welcome,
    {
      icon: LayoutGrid,
      title: "Дашборд",
      description: "Быстрый обзор текущей ситуации на вашей точке.",
      features: [
        "Сводка по текущим сделкам",
        "Ближайшие игры и события",
        "Задачи на сегодня",
      ],
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: HandshakeIcon,
      title: "CRM",
      description: "Работа с клиентами и сделками.",
      features: [
        "Просмотр и редактирование сделок",
        "Перемещение по Kanban-доске",
        "Добавление комментариев",
        "Назначение ответственных",
      ],
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: Calendar,
      title: "График",
      description: "Управление расписанием персонала.",
      features: [
        "Просмотр графика на неделю",
        "Назначение сотрудников на смены",
        "Контроль посещаемости",
      ],
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: Users,
      title: "Пользователи",
      description: "Управление персоналом точки.",
      features: [
        "Добавление сотрудников, аниматоров, ведущих, DJ",
        "Редактирование контактных данных",
        "Управление активностью аккаунтов",
      ],
      gradient: "from-amber-500 to-orange-600",
    },
    commonEndSlide,
  ]

  const personnelSlides: Slide[] = [
    welcome,
    {
      icon: LayoutGrid,
      title: "Дашборд",
      description: "Ваша персональная панель с важной информацией.",
      features: [
        "Ближайшие смены и события",
        "Ваши задачи на сегодня",
        "Быстрый доступ к расписанию",
      ],
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Calendar,
      title: "Мои Смены",
      description: "Ваше персональное расписание.",
      features: [
        "Просмотр назначенных смен",
        "Дата, время и место проведения",
        "Информация о мероприятии",
      ],
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: BookOpen,
      title: "База Знаний",
      description: "Обучающие материалы и инструкции для вашей работы.",
      features: [
        "Статьи и гайды по вашей роли",
        "Видеоматериалы и инструкции",
        "Тесты для проверки знаний",
        "Отслеживание прогресса обучения",
      ],
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: MessageSquare,
      title: "Чат",
      description: "Общение с коллегами и руководством.",
      features: [
        "Личные сообщения",
        "Отправка эмодзи",
        "Редактирование и удаление сообщений",
      ],
      gradient: "from-pink-500 to-rose-600",
    },
    commonEndSlide,
  ]

  switch (role) {
    case "super_admin":
    case "uk":
      return ukSlides
    case "uk_employee":
      return ukSlides.filter(
        (_, i) => i <= 3 || i === ukSlides.length - 1 // welcome, dashboard, crm, erp, end
      )
    case "franchisee":
    case "own_point":
      return franchiseeSlides
    case "admin":
      return adminSlides
    case "employee":
    case "animator":
    case "host":
    case "dj":
      return personnelSlides
    default:
      return [welcome, commonEndSlide]
  }
}

export function OnboardingSlider({ role, userName, onComplete }: OnboardingSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = getSlidesForRole(role, userName)

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const goPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]
  const Icon = slide.icon
  const isLast = currentSlide === slides.length - 1
  const isFirst = currentSlide === 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          Пропустить
        </button>

        {/* Slide content */}
        <div className="p-8 pt-10">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-6 shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-3 gradient-primary-text">{slide.title}</h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6 leading-relaxed">{slide.description}</p>

          {/* Features */}
          {slide.features && slide.features.length > 0 && (
            <ul className="space-y-3 mb-8">
              {slide.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-sm text-foreground/80">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-6 bg-primary"
                      : i < currentSlide
                        ? "bg-primary/40"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              className={`flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                isLast
                  ? "gradient-primary text-white shadow-lg shadow-primary/25"
                  : "gradient-primary text-white"
              }`}
            >
              {isLast ? "Начать работу" : "Далее"}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
