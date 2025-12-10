"use client"

import { useState, useEffect } from "react"
import {
  Search,
  FileText,
  ChevronRight,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Video,
  BookOpen,
  HelpCircle,
  ArrowLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { KBFileManager } from "./kb-file-manager"
import { useAuth } from "@/contexts/auth-context"

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
  files?: any[]
  type: "article" | "video" | "guide" | "faq"
}

interface KnowledgeBaseSectionProps {
  role: string
}

export function KnowledgeBaseSection({ role }: KnowledgeBaseSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)

  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)

  const { getAuthHeaders } = useAuth()

  const categories = ["all", "Управление", "Продажи", "Финансы", "Поддержка", "Безопасность"]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video size={20} className="text-primary" />
      case "guide":
        return <BookOpen size={20} className="text-primary" />
      case "faq":
        return <HelpCircle size={20} className="text-primary" />
      default:
        return <FileText size={20} className="text-primary" />
    }
  }

  useEffect(() => {
    loadArticles()
  }, [selectedCategory, searchQuery])

  const loadArticles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== "all") params.set("category", selectedCategory)
      if (searchQuery) params.set("search", searchQuery)

      const response = await fetch(`/api/knowledge?${params}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (response.ok) {
        setArticles(
          (data.articles || []).map((a: any) => ({
            ...a,
            date: a.createdAt
              ? new Date(a.createdAt).toLocaleDateString("ru-RU")
              : new Date().toLocaleDateString("ru-RU"),
            tags: a.tags || [],
            views: a.views || 0,
            helpful: a.helpful || 0,
            type: a.type || "article",
          })),
        )
      }
    } catch (error) {
      console.error("[v0] Error loading articles:", error)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    setShowEditModal(true)
  }

  const handleAddNewArticle = () => {
    setEditingArticle({
      id: `KB-${Date.now()}`,
      title: "",
      category: categories[1],
      author: "Текущий пользователь",
      date: new Date().toLocaleDateString("ru-RU"),
      views: 0,
      helpful: 0,
      content: "",
      tags: [],
      type: "article",
      files: [],
    })
    setShowAddModal(true)
  }

  const handleSaveArticle = async () => {
    if (!editingArticle) return

    try {
      const isNewArticle = !articles.some((a) => a.id === editingArticle.id)

      const response = await fetch(isNewArticle ? "/api/knowledge" : `/api/knowledge/${editingArticle.id}`, {
        method: isNewArticle ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(editingArticle),
      })

      if (response.ok) {
        await loadArticles()
        setShowEditModal(false)
        setShowAddModal(false)
        setEditingArticle(null)
      }
    } catch (error) {
      console.error("[v0] Error saving article:", error)
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту статью?")) return

    try {
      console.log("[v0] Deleting article:", id)
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Delete response:", result)
        if (result.success) {
          console.log("[v0] Article deleted successfully")
          await loadArticles()
        } else {
          console.error("[v0] Delete failed:", result.error)
          alert(`Ошибка при удалении: ${result.error || "Неизвестная ошибка"}`)
        }
      } else {
        const errorText = await response.text()
        console.error("[v0] Delete HTTP error:", response.status, errorText)
        alert(`Ошибка при удалении: ${response.status}`)
      }
    } catch (error) {
      console.error("[v0] Error deleting article:", error)
      alert("Ошибка при удалении статьи")
    }
  }

  const handleFileAdd = (file: any) => {
    if (!editingArticle) return
    setEditingArticle({
      ...editingArticle,
      files: [...(editingArticle.files || []), file],
    })
  }

  const handleFileDelete = (fileId: string) => {
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
    (article) =>
      (selectedCategory === "all" || article.category === selectedCategory) &&
      (searchQuery === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const categoryCounts = {
    all: articles.length,
    ...Object.fromEntries(categories.slice(1).map((cat) => [cat, articles.filter((a) => a.category === cat).length])),
  }

  const canManageArticles = role === "uk" || role === "super_admin" || role === "uk_employee"

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => setSelectedArticle(null)}
          variant="ghost"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
          Назад к списку
        </Button>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getTypeIcon(selectedArticle.type)}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{selectedArticle.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary">{selectedArticle.category}</Badge>
                  <span className="text-sm text-muted-foreground">{selectedArticle.date}</span>
                  <span className="text-sm text-muted-foreground">{selectedArticle.author}</span>
                </div>
              </div>
            </div>
            {canManageArticles && (
              <div className="flex gap-2">
                <Button onClick={() => handleEditArticle(selectedArticle)} variant="outline" size="sm">
                  <Edit2 size={16} className="mr-2" />
                  Редактировать
                </Button>
                <Button
                  onClick={() => {
                    handleDeleteArticle(selectedArticle.id)
                    setSelectedArticle(null)
                  }}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 size={16} className="mr-2" />
                  Удалить
                </Button>
              </div>
            )}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{selectedArticle.content}</p>
          </div>

          {selectedArticle.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
            <span>{selectedArticle.views} просмотров</span>
            <span>{selectedArticle.helpful} нашли полезным</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">База Знаний</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Документация, руководства и FAQ</p>
        </div>
        {canManageArticles && (
          <Button onClick={handleAddNewArticle} className="flex items-center gap-2">
            <Plus size={18} />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Поиск в базе знаний..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => setSelectedCategory(category)}
            variant={selectedCategory === category ? "default" : "secondary"}
            size="sm"
          >
            {category === "all" ? "Все" : category}
            <span className="ml-2 text-xs opacity-75">
              ({categoryCounts[category as keyof typeof categoryCounts] || 0})
            </span>
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Загрузка статей...</p>
        </div>
      )}

      {/* Articles Grid */}
      {!loading && filteredArticles.length > 0 && (
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
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditArticle(article)
                      }}
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteArticle(article.id)
                      }}
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.content}</p>

              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex gap-3">
                  <span>{article.views} просмотров</span>
                  <span>{article.helpful} полезных</span>
                </div>
                <ChevronRight size={16} className="group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredArticles.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <AlertCircle size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Нет статей по данному запросу</p>
        </div>
      )}

      {/* Edit Modal */}
      {(showEditModal || showAddModal) && editingArticle && canManageArticles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {showAddModal ? "Новая статья" : "Редактировать статью"}
              </h2>
              <Button
                onClick={() => {
                  setShowEditModal(false)
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                variant="ghost"
                size="sm"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Название</label>
                <Input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  placeholder="Введите название статьи"
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
                    {categories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
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
                <Textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  placeholder="Введите содержание статьи"
                  className="min-h-[200px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Теги (через запятую)</label>
                <Input
                  type="text"
                  value={editingArticle.tags.join(", ")}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="тег1, тег2, тег3"
                />
              </div>

              <KBFileManager
                articleId={editingArticle.id}
                files={editingArticle.files || []}
                onFileAdd={handleFileAdd}
                onFileDelete={handleFileDelete}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowEditModal(false)
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Отмена
              </Button>
              <Button onClick={handleSaveArticle} className="flex-1">
                <Save size={16} className="mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
