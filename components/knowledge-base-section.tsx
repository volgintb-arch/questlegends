"use client"

import { useState } from "react"
import {
  Search,
  FileText,
  Play,
  ChevronRight,
  Book,
  Lightbulb,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { KBFileManager } from "./kb-file-manager"

interface KnowledgeArticle {
  id: string
  title: string
  category: string
  author: string
  date: string
  views: number
  helpful: number
  content: string
  tags: string[]
  type: "article" | "video" | "guide" | "faq"
  files?: Array<{ id: string; name: string; size: string; type: string; uploadedAt: string }>
}

interface KnowledgeBaseSectionProps {
  role: "uk" | "franchisee" | "admin"
}

export function KnowledgeBaseSection({ role }: KnowledgeBaseSectionProps) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [articles, setArticles] = useState<KnowledgeArticle[]>([
    {
      id: "KB-001",
      title: "Как подключить нового франчайзи",
      category: "Управление",
      author: "Иван Петров",
      date: "2025-10-15",
      views: 234,
      helpful: 89,
      content: "Полная инструкция по подключению нового франчайзинговго партнера...",
      tags: ["франчайзи", "настройка", "новичок"],
      type: "guide",
      files: [],
    },
    {
      id: "KB-002",
      title: "Основы системы CRM",
      category: "Продажи",
      author: "Мария Сидорова",
      date: "2025-11-10",
      views: 567,
      helpful: 156,
      content: "Видеоурок по работе с системой управления взаимоотношениями с клиентами...",
      tags: ["CRM", "продажи", "видео"],
      type: "video",
      files: [],
    },
    {
      id: "KB-003",
      title: "Разрешение распространенных ошибок",
      category: "Поддержка",
      author: "Петр Иванов",
      date: "2025-11-20",
      views: 892,
      helpful: 234,
      content: "Часто задаваемые вопросы и решения для типичных проблем...",
      tags: ["ошибки", "поддержка", "FAQ"],
      type: "faq",
      files: [],
    },
    {
      id: "KB-004",
      title: "Полное руководство по финансовому учету",
      category: "Финансы",
      author: "Анна Волкова",
      date: "2025-09-05",
      views: 445,
      helpful: 123,
      content: "Детальное описание всех операций в модуле ERP...",
      tags: ["финансы", "учет", "ERP"],
      type: "article",
      files: [],
    },
    {
      id: "KB-005",
      title: "Оптимизация процессов продаж",
      category: "Продажи",
      author: "Мария Сидорова",
      date: "2025-11-01",
      views: 723,
      helpful: 198,
      content: "Стратегии и практики для увеличения конверсии...",
      tags: ["продажи", "оптимизация", "стратегия"],
      type: "guide",
      files: [],
    },
    {
      id: "KB-006",
      title: "Безопасность данных и конфиденциальность",
      category: "Безопасность",
      author: "Алексей Смирнов",
      date: "2025-10-20",
      views: 312,
      helpful: 87,
      content: "Политика безопасности и передовые практики защиты информации...",
      tags: ["безопасность", "конфиденциальность", "политика"],
      type: "article",
      files: [],
    },
  ])

  const categories = ["all", "Управление", "Продажи", "Поддержка", "Финансы", "Безопасность"]

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play size={16} className="text-blue-500" />
      case "guide":
        return <Book size={16} className="text-green-500" />
      case "faq":
        return <Lightbulb size={16} className="text-yellow-500" />
      default:
        return <FileText size={16} className="text-purple-500" />
    }
  }

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    setShowEditModal(true)
  }

  const handleAddNewArticle = () => {
    setEditingArticle({
      id: `KB-${Date.now()}`,
      title: "Новая статья",
      category: "Управление",
      author: user.name,
      date: new Date().toISOString().split("T")[0],
      views: 0,
      helpful: 0,
      content: "",
      tags: [],
      type: "article",
      files: [],
    })
    setShowAddModal(true)
  }

  const handleSaveArticle = () => {
    if (!editingArticle) return

    const isNewArticle = !articles.some((a) => a.id === editingArticle.id)

    if (isNewArticle) {
      setArticles((prev) => [editingArticle, ...prev])
    } else {
      setArticles((prev) => prev.map((a) => (a.id === editingArticle.id ? editingArticle : a)))
    }

    setShowAddModal(false)
    setShowEditModal(false)
    setEditingArticle(null)
  }

  const handleDeleteArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  const handleAddFile = (file: any) => {
    if (!editingArticle) return
    setEditingArticle({
      ...editingArticle,
      files: [...(editingArticle.files || []), file],
    })
  }

  const handleDeleteFile = (fileId: string) => {
    if (!editingArticle) return
    setEditingArticle({
      ...editingArticle,
      files: editingArticle.files?.filter((f) => f.id !== fileId) || [],
    })
  }

  const handleViewArticle = (article: KnowledgeArticle) => {
    setSelectedArticle(article)
  }

  const filteredArticles = articles.filter(
    (a) =>
      (filterCategory === "all" || a.category === filterCategory) &&
      (searchTerm === "" ||
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))),
  )

  const categoryCounts = {
    all: articles.length,
    ...Object.fromEntries(categories.slice(1).map((cat) => [cat, articles.filter((a) => a.category === cat).length])),
  }

  const canManageArticles = role === "uk"

  const getRoleTitle = () => {
    if (role === "franchisee") return "Справка и рекомендации"
    return `База знаний ${user.franchiseeName}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">База Знаний</h1>
          <p className="text-sm text-muted-foreground mt-1">{getRoleTitle()}</p>
        </div>

        {canManageArticles && (
          <button
            onClick={handleAddNewArticle}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span className="text-sm">Добавить статью</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск в базе знаний..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilterCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {category === "all" ? "Все" : category}
            <span className="ml-2 text-xs opacity-75">({categoryCounts[category as keyof typeof categoryCounts]})</span>
          </button>
        ))}
      </div>

      {/* Featured Articles */}
      {filteredArticles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Популярные статьи</h3>
          <div className="space-y-2">
            {filteredArticles.slice(0, 3).map((article) => (
              <div
                key={article.id}
                onClick={() => handleViewArticle(article)}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(article.type)}
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {article.title}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-xs text-muted-foreground">{article.views} просмотров</span>
                      <span className="text-xs text-green-500">{article.helpful} полезных голосов</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageArticles && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditArticle(article)
                          }}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArticle(article.id)
                          }}
                          className="p-1 text-muted-foreground hover:text-accent transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <ChevronRight
                      size={20}
                      className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Articles Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Все статьи</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleViewArticle(article)}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-1">{getTypeIcon(article.type)}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                  </div>
                </div>
                {canManageArticles && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditArticle(article)
                      }}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteArticle(article.id)
                      }}
                      className="p-1 text-muted-foreground hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.content}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex gap-3">
                  <span>{article.views} просмотров</span>
                  <span>{article.helpful} полезных</span>
                </div>
                <span>{article.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <AlertCircle size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Нет статей по данному поиску</p>
        </div>
      )}

      {showEditModal && editingArticle && canManageArticles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Редактировать статью</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingArticle(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Название</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Категория</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option>Управление</option>
                    <option>Продажи</option>
                    <option>Поддержка</option>
                    <option>Финансы</option>
                    <option>Безопасность</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Тип</label>
                  <select
                    value={editingArticle.type}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="article">Статья</option>
                    <option value="guide">Руководство</option>
                    <option value="video">Видео</option>
                    <option value="faq">FAQ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Содержание</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary h-32 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Теги (через запятую)</label>
                <input
                  type="text"
                  value={editingArticle.tags.join(", ")}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <KBFileManager
                articleId={editingArticle.id}
                files={editingArticle.files || []}
                onFileAdd={handleAddFile}
                onFileDelete={handleDeleteFile}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingArticle(null)
                }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveArticle}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Save size={16} />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && editingArticle && canManageArticles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Создать новую статью</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Название</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Категория</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option>Управление</option>
                    <option>Продажи</option>
                    <option>Поддержка</option>
                    <option>Финансы</option>
                    <option>Безопасность</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Тип</label>
                  <select
                    value={editingArticle.type}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="article">Статья</option>
                    <option value="guide">Руководство</option>
                    <option value="video">Видео</option>
                    <option value="faq">FAQ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Содержание</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary h-32 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Теги (через запятую)</label>
                <input
                  type="text"
                  value={editingArticle.tags.join(", ")}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <KBFileManager
                articleId={editingArticle.id}
                files={editingArticle.files || []}
                onFileAdd={handleAddFile}
                onFileDelete={handleDeleteFile}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveArticle}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Save size={16} />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(selectedArticle.type)}
                  <h2 className="text-2xl font-bold text-foreground">{selectedArticle.title}</h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>{selectedArticle.author}</span>
                  <span>{selectedArticle.date}</span>
                  <Badge variant="secondary">{selectedArticle.category}</Badge>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Content */}
              <div className="prose prose-invert max-w-none">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedArticle.content}</p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Files */}
              {selectedArticle.files && selectedArticle.files.length > 0 && (
                <div className="space-y-2 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Файлы</h3>
                  <div className="space-y-2">
                    {selectedArticle.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-background border border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText size={18} className="text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.size} • {file.uploadedAt}
                            </p>
                          </div>
                        </div>
                        <a
                          href="#"
                          className="text-xs px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors flex-shrink-0"
                        >
                          Скачать
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 border-t border-border pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedArticle.views}</p>
                  <p className="text-xs text-muted-foreground mt-1">Просмотров</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{selectedArticle.helpful}</p>
                  <p className="text-xs text-muted-foreground mt-1">Полезных голосов</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {selectedArticle.helpful > 0 && selectedArticle.views > 0
                      ? Math.round((selectedArticle.helpful / selectedArticle.views) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Полезность</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-8 border-t border-border pt-6">
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
