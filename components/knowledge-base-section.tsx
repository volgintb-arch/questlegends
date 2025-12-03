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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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

      const response = await fetch(`/api/knowledge?${params}`)
      const data = await response.json()

      if (response.ok) {
        setArticles(
          data.articles.map((a: any) => ({
            ...a,
            date: new Date(a.createdAt).toLocaleDateString("ru-RU"),
          })),
        )
      }
    } catch (error) {
      console.error("[v0] Error loading articles:", error)
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
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadArticles()
      }
    } catch (error) {
      console.error("[v0] Error deleting article:", error)
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

  const canManageArticles = role === "uk"

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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {category === "all" ? "Все" : category}
            <span className="ml-2 text-xs opacity-75">({categoryCounts[category as keyof typeof categoryCounts]})</span>
          </Button>
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
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditArticle(article)
                          }}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArticle(article.id)
                          }}
                          className="p-1 text-muted-foreground hover:text-accent transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </Button>
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
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditArticle(article)
                      }}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteArticle(article.id)
                      }}
                      className="p-1 text-muted-foreground hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </Button>
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
              <Button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingArticle(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                    <option>Финансы</option>
                    <option>Поддержка</option>
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
                <Textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary h-32 resize-none"
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
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
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
                  setEditingArticle(null)
                }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveArticle}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Save size={16} />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && editingArticle && canManageArticles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Создать новую статью</h2>
              <Button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                    <option>Финансы</option>
                    <option>Поддержка</option>
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
                <Textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary h-32 resize-none"
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
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
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
                  setShowAddModal(false)
                  setEditingArticle(null)
                }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveArticle}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Save size={16} />
                Сохранить
              </Button>
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
              <Button
                onClick={() => setSelectedArticle(null)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X size={24} />
              </Button>
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
              <Button
                onClick={() => setSelectedArticle(null)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
