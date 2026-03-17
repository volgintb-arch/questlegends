"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  Search,
  FileText,
  ChevronRight,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Video,
  BookOpen,
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  Play,
  File,
  ImageIcon,
  FileSpreadsheet,
  ExternalLink,
  Upload,
  Download,
  ClipboardCheck,
  Award,
  RotateCcw,
  GraduationCap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { FileIcon } from "@/components/ui/file-icon"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KnowledgeFile {
  id: string
  name: string
  url: string
  type: string
  mimeType?: string
  size?: number
}

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
  files?: KnowledgeFile[]
  type: "article" | "video" | "guide" | "faq"
  videoUrl?: string
  isCompleted?: boolean
  completedAt?: string
  hasQuiz?: boolean
  targetRole?: string // franchisee, admin, animator, dj, host
}

interface QuizQuestionData {
  id: string
  text: string
  options: string[]
  correctIndex?: number
  order: number
}

interface QuizData {
  id: string
  articleId: string
  title: string
  passingScore: number
  questions: QuizQuestionData[]
}

interface QuizAttemptData {
  id: string
  score: number
  passed: boolean
  createdAt: string
}

interface EditingQuestion {
  text: string
  options: string[]
  correctIndex: number
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
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Quiz state
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptData[]>([])
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; correctAnswers: number[] } | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [editingQuizTitle, setEditingQuizTitle] = useState("")
  const [editingQuizScore, setEditingQuizScore] = useState(70)
  const [editingQuestions, setEditingQuestions] = useState<EditingQuestion[]>([
    { text: "", options: ["", "", "", ""], correctIndex: 0 },
  ])

  // Staff quiz stats (for franchisee and UK)
  const [showStaffStats, setShowStaffStats] = useState(false)
  const [staffStats, setStaffStats] = useState<any[]>([])
  const [staffStatsDetail, setStaffStatsDetail] = useState<{ stats: any; users: any[] } | null>(null)
  const [staffStatsLoading, setStaffStatsLoading] = useState(false)

  const { getAuthHeaders, user } = useAuth()

  const categories = ["all", "Управление", "Продажи", "Финансы", "Поддержка", "Безопасность", "Обучение"]

  const categoryCounts = articles.reduce<Record<string, number>>(
    (acc, article) => {
      acc.all = (acc.all || 0) + 1
      if (article.category) {
        acc[article.category] = (acc[article.category] || 0) + 1
      }
      return acc
    },
    { all: 0, Управление: 0, Продажи: 0, Финансы: 0, Поддержка: 0, Безопасность: 0, Обучение: 0 },
  )

  const filteredArticles = articles.filter((article) => {
    if (selectedCategory !== "all" && article.category !== selectedCategory) return false
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group filtered articles by category for display
  const groupedArticles = filteredArticles.reduce<Record<string, KnowledgeArticle[]>>((acc, article) => {
    const cat = article.category || "Без категории"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(article)
    return acc
  }, {})

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

  const getFileIcon = (mimeType?: string, name?: string) => {
    if (mimeType?.startsWith("image/") || name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <ImageIcon size={16} className="text-green-500" />
    }
    if (mimeType?.includes("pdf") || name?.endsWith(".pdf")) {
      return <FileText size={16} className="text-red-500" />
    }
    if (mimeType?.includes("spreadsheet") || name?.match(/\.(xlsx|xls|csv)$/i)) {
      return <FileSpreadsheet size={16} className="text-green-600" />
    }
    return <File size={16} className="text-muted-foreground" />
  }

  const targetRoleLabels: Record<string, string> = {
    franchisee: "Франчайзи",
    admin: "Администратор",
    animator: "Аниматор",
    dj: "Диджей",
    host: "Ведущий",
  }

  const canManageArticles = role === "uk" || role === "super_admin" || role === "uk_employee"
  const isUkUser = user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee"

  const canOnlyView = role === "franchisee" || role === "admin" || role === "employee"

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

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
            files: a.files || [],
            isCompleted: a.isCompleted || false,
            completedAt: a.completedAt,
            hasQuiz: a.hasQuiz || false,
            targetRole: a.targetRole || null,
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
    setSelectedArticle(null)
    setShowEditModal(true)
    setShowCreateDialog(true)
  }

  const handleAddNewArticle = () => {
    setEditingArticle({
      id: "", // Empty id means new article
      title: "",
      category: categories[1],
      author: user?.name || "Текущий пользователь",
      date: new Date().toLocaleDateString("ru-RU"),
      views: 0,
      helpful: 0,
      content: "",
      tags: [],
      type: "article",
      files: [],
      videoUrl: "",
      targetRole: undefined,
    })
    setShowAddModal(true)
    setShowCreateDialog(true)
  }

  const handleSaveArticle = async () => {
    if (!editingArticle || !editingArticle.title || !editingArticle.content) {
      return
    }

    setIsLoading(true)
    try {
      const isNew = !editingArticle.id
      const endpoint = isNew ? "/api/knowledge" : `/api/knowledge/${editingArticle.id}`
      const method = isNew ? "POST" : "PUT"

      // Prepare files with all necessary fields
      const preparedFiles = (editingArticle.files || []).map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        type: f.type || "other",
        mimeType: f.mimeType,
        size: f.size,
      }))

      const payload = {
        title: editingArticle.title,
        category: editingArticle.category,
        content: editingArticle.content,
        type: editingArticle.type || "article",
        tags: editingArticle.tags || [],
        videoUrl: editingArticle.videoUrl || null,
        files: preparedFiles,
        targetRole: editingArticle.targetRole || null,
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await loadArticles()
        setShowCreateDialog(false)
        setEditingArticle(null)
      } else {
        const errorData = await response.json()
        console.error("Failed to save article:", errorData)
      }
    } catch (error) {
      console.error("Error saving article:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту статью?")) return

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadArticles()
          if (selectedArticle?.id === id) {
            setSelectedArticle(null)
          }
        } else {
          alert(`Ошибка при удалении: ${result.error || "Неизвестная ошибка"}`)
        }
      }
    } catch (error) {
      console.error("Error deleting article:", error)
      alert("Ошибка при удалении статьи")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editingArticle) return

    const file = e.target.files[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Ошибка загрузки файла")
      }

      const uploadData = await uploadResponse.json()

      const newFile: KnowledgeFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        url: uploadData.url,
        type: "other",
        size: file.size,
        mimeType: file.type,
      }

      setEditingArticle({
        ...editingArticle,
        files: [...(editingArticle.files || []), newFile],
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Ошибка при загрузке файла")
    } finally {
      setUploadingFile(false)
      e.target.value = ""
    }
  }

  const handleFileDelete = (fileId: string) => {
    if (!editingArticle) return
    setEditingArticle({
      ...editingArticle,
      files: editingArticle.files?.filter((f) => f.id !== fileId) || [],
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleMarkAsCompleted = async () => {
    if (!selectedArticle) return

    try {
      const response = await fetch(`/api/knowledge/${selectedArticle.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.ok) {
        setSelectedArticle({
          ...selectedArticle,
          isCompleted: true,
          completedAt: new Date().toISOString(),
        })
        await loadArticles()
      }
    } catch (error) {
      console.error("Error marking article as completed:", error)
    }
  }

  const handleViewArticle = async (article: KnowledgeArticle) => {
    try {
      await fetch(`/api/knowledge/${article.id}/view`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
    } catch (error) {
      console.error("Error incrementing view:", error)
    }
    setSelectedArticle(article)
    loadQuiz(article.id)
  }

  const loadQuiz = async (articleId: string) => {
    try {
      const response = await fetch(`/api/knowledge/${articleId}/quiz`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setQuiz(data.quiz)
        setQuizAttempts(data.userAttempts || [])
      } else {
        setQuiz(null)
        setQuizAttempts([])
      }
    } catch {
      setQuiz(null)
      setQuizAttempts([])
    }
  }

  const handleStartQuiz = () => {
    if (!quiz) return
    setQuizAnswers(new Array(quiz.questions.length).fill(-1))
    setQuizResult(null)
    setShowQuizDialog(true)
  }

  const handleSubmitQuiz = async () => {
    if (!quiz || !selectedArticle) return
    if (quizAnswers.some((a) => a === -1)) return

    setQuizLoading(true)
    try {
      const response = await fetch(`/api/knowledge/${selectedArticle.id}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ answers: quizAnswers }),
      })
      if (response.ok) {
        const data = await response.json()
        setQuizResult({ score: data.attempt.score, passed: data.attempt.passed, correctAnswers: data.correctAnswers })
        setQuizAttempts((prev) => [data.attempt, ...prev])
        if (data.attempt.passed) {
          setSelectedArticle({ ...selectedArticle, isCompleted: true, completedAt: new Date().toISOString() })
          await loadArticles()
        }
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleOpenQuizEditor = () => {
    if (quiz) {
      setEditingQuizTitle(quiz.title)
      setEditingQuizScore(quiz.passingScore)
      setEditingQuestions(
        quiz.questions.map((q) => ({
          text: q.text,
          options: [...q.options],
          correctIndex: q.correctIndex ?? 0,
        })),
      )
    } else {
      setEditingQuizTitle(selectedArticle?.title ? `Тест: ${selectedArticle.title}` : "")
      setEditingQuizScore(70)
      setEditingQuestions([{ text: "", options: ["", "", "", ""], correctIndex: 0 }])
    }
    setShowQuizEditor(true)
  }

  const handleSaveQuiz = async () => {
    if (!selectedArticle) return
    const validQuestions = editingQuestions.filter((q) => q.text.trim() && q.options.some((o) => o.trim()))
    if (!editingQuizTitle.trim() || validQuestions.length === 0) return

    setQuizLoading(true)
    try {
      const response = await fetch(`/api/knowledge/${selectedArticle.id}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          title: editingQuizTitle,
          passingScore: editingQuizScore,
          questions: validQuestions.map((q) => ({
            text: q.text,
            options: q.options.filter((o) => o.trim()),
            correctIndex: q.correctIndex,
          })),
        }),
      })
      if (response.ok) {
        setShowQuizEditor(false)
        await loadQuiz(selectedArticle.id)
        await loadArticles()
      }
    } catch (error) {
      console.error("Error saving quiz:", error)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!selectedArticle || !confirm("Удалить тест? Все результаты будут потеряны.")) return
    try {
      await fetch(`/api/knowledge/${selectedArticle.id}/quiz`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      setQuiz(null)
      setQuizAttempts([])
      await loadArticles()
    } catch (error) {
      console.error("Error deleting quiz:", error)
    }
  }

  const loadStaffStats = async (articleId?: string) => {
    setStaffStatsLoading(true)
    try {
      const params = articleId ? `?articleId=${articleId}` : ""
      const response = await fetch(`/api/knowledge/quiz-stats${params}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        if (articleId) {
          setStaffStatsDetail(data)
        } else {
          setStaffStats(data.stats || [])
          setStaffStatsDetail(null)
        }
      }
    } catch (error) {
      console.error("Error loading staff stats:", error)
    } finally {
      setStaffStatsLoading(false)
    }
  }

  const canViewStaffStats = role === "uk" || role === "super_admin" || role === "uk_employee" || role === "franchisee"

  const handleRemoveFile = (fileId: string) => {
    if (!editingArticle) return
    setEditingArticle({
      ...editingArticle,
      files: (editingArticle.files || []).filter((f) => f.id !== fileId),
    })
  }

  const isDirectVideoUrl = (url: string): boolean => {
    if (!url) return false
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"]
    const lowerUrl = url.toLowerCase()
    return videoExtensions.some((ext) => lowerUrl.includes(ext)) || lowerUrl.includes("/vod/")
  }

  const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null

    if (isDirectVideoUrl(url)) {
      return null
    }

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch?.[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`
    }

    // Boomstream
    if (url.includes("/embed/")) {
      return url
    }
    const boomPatterns = [
      /boomstream\.ru\/video\/([a-zA-Z0-9_-]+)/,
      /play\.boomstream\.com\/(?:embed\/)?([a-zA-Z0-9_-]+)/,
      /boomstream\.com\/([a-zA-Z0-9_-]+)/,
    ]
    for (const pattern of boomPatterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return `https://play.boomstream.com/${match[1]}`
      }
    }

    // VK Video
    const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/)
    if (vkMatch) {
      return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}`
    }

    return url
  }

  const canPreviewInBrowser = (file: KnowledgeFile): boolean => {
    const previewableMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
    ]
    const previewableExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mp3", ".wav"]

    if (file.mimeType && previewableMimeTypes.some((t) => file.mimeType?.includes(t))) {
      return true
    }
    return previewableExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  }

  const getFileDownloadUrl = (file: KnowledgeFile): string => {
    return file.id.startsWith("file-") ? file.url : `/api/knowledge/files/${file.id}`
  }

  const getFileExtension = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase() || ""
    return ext
  }

  const renderArticleContent = (article: KnowledgeArticle) => {
    const isHtml = article.content?.includes("<") && article.content?.includes(">")

    return (
      <div className="space-y-6">
        {/* Article text content */}
        {isHtml ? (
          <div className="article-content text-sm leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: article.content }} />
        ) : (
          <div className="prose prose-sm max-w-none">
            {(article.content || "").split(/\n\n+/).map((paragraph, i) => (
              <div key={i} className="mb-4">
                {paragraph.split("\n").map((line, j) => (
                  <p key={j} className="leading-relaxed text-foreground mb-1">{line}</p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Video section */}
        {article.videoUrl && (
          <div className="space-y-3">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Видеоматериал
            </h4>
            <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
              {isDirectVideoUrl(article.videoUrl) ? (
                <video
                  src={article.videoUrl}
                  controls
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full"
                  playsInline
                >
                  Ваш браузер не поддерживает воспроизведение видео
                </video>
              ) : (
                <iframe
                  src={getVideoEmbedUrl(article.videoUrl) || article.videoUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}

        {/* Files section */}
        {article.files && article.files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Прикрепленные документы ({article.files.length})
            </h4>
            <div className="grid gap-3">
              {article.files.map((file) => {
                const fileUrl = getFileDownloadUrl(file)
                const ext = getFileExtension(file.name).toUpperCase()

                return (
                  <div key={file.id} className="border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileIcon
                          filename={file.name}
                          mimeType={file.mimeType}
                          className="h-10 w-10 text-muted-foreground"
                        />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {ext && (
                              <Badge variant="outline" className="text-xs">
                                {ext}
                              </Badge>
                            )}
                            {file.size && file.size > 0 && (
                              <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Скачать
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

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
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge variant="secondary">{selectedArticle.category}</Badge>
                  {selectedArticle.targetRole && (
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      Для: {targetRoleLabels[selectedArticle.targetRole] || selectedArticle.targetRole}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">{selectedArticle.date}</span>
                  <span className="text-sm text-muted-foreground">{selectedArticle.author}</span>
                  {selectedArticle.isCompleted && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle size={12} className="mr-1" />
                      Изучено
                    </Badge>
                  )}
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

          {renderArticleContent(selectedArticle)}

          {selectedArticle.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{selectedArticle.views} просмотров</span>
              <span>{selectedArticle.helpful} нашли полезным</span>
            </div>

            {canOnlyView && !selectedArticle.isCompleted && (
              <Button onClick={handleMarkAsCompleted} className="bg-green-600 hover:bg-green-700">
                <CheckCircle size={16} className="mr-2" />
                Отметить как изученное
              </Button>
            )}

            {selectedArticle.isCompleted && selectedArticle.completedAt && (
              <span className="text-sm text-green-600">
                Изучено {new Date(selectedArticle.completedAt).toLocaleDateString("ru-RU")}
              </span>
            )}
          </div>
        </div>

        {/* Quiz Section */}
        {quiz && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <GraduationCap size={24} className="text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">{quiz.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {quiz.questions.length} вопрос(ов) &bull; Проходной балл: {quiz.passingScore}%
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStartQuiz} size="sm">
                  <ClipboardCheck size={16} className="mr-2" />
                  Пройти тест
                </Button>
                {canManageArticles && (
                  <>
                    <Button onClick={handleOpenQuizEditor} variant="outline" size="sm">
                      <Edit2 size={16} className="mr-2" />
                      Редактировать
                    </Button>
                    <Button onClick={handleDeleteQuiz} variant="destructive" size="sm">
                      <Trash2 size={16} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {quizAttempts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Ваши попытки:</h4>
                <div className="space-y-1">
                  {quizAttempts.slice(0, 5).map((attempt) => (
                    <div key={attempt.id} className="flex items-center gap-3 text-sm py-1">
                      {attempt.passed ? (
                        <Award size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                      <span className={attempt.passed ? "text-green-600 font-medium" : "text-red-600"}>
                        {attempt.score}% — {attempt.passed ? "Пройден" : "Не пройден"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(attempt.createdAt).toLocaleDateString("ru-RU")}{" "}
                        {new Date(attempt.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!quiz && canManageArticles && selectedArticle && selectedArticle.targetRole !== "franchisee" && (
          <div className={`bg-card border border-dashed rounded-lg p-6 text-center ${selectedArticle.targetRole ? "border-orange-400" : "border-border"}`}>
            <GraduationCap size={32} className={`mx-auto mb-2 ${selectedArticle.targetRole ? "text-orange-500" : "text-muted-foreground"}`} />
            <p className={`mb-3 ${selectedArticle.targetRole ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
              {selectedArticle.targetRole
                ? `Тест обязателен для роли "${targetRoleLabels[selectedArticle.targetRole]}". Создайте тест.`
                : "К этой статье ещё не создан тест"}
            </p>
            <Button onClick={handleOpenQuizEditor} variant="outline">
              <Plus size={16} className="mr-2" />
              Создать тест
            </Button>
          </div>
        )}

        {/* Quiz Taking Dialog */}
        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{quiz?.title || "Тест"}</DialogTitle>
              <DialogDescription>
                Ответьте на все вопросы. Проходной балл: {quiz?.passingScore}%
              </DialogDescription>
            </DialogHeader>

            {quizResult ? (
              <div className="space-y-6">
                <div className={`text-center p-6 rounded-lg ${quizResult.passed ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                  {quizResult.passed ? (
                    <Award size={48} className="mx-auto text-green-500 mb-3" />
                  ) : (
                    <X size={48} className="mx-auto text-red-500 mb-3" />
                  )}
                  <h3 className="text-2xl font-bold mb-1">{quizResult.score}%</h3>
                  <p className={`text-lg font-medium ${quizResult.passed ? "text-green-600" : "text-red-600"}`}>
                    {quizResult.passed ? "Тест пройден!" : "Тест не пройден"}
                  </p>
                </div>

                {quiz && (
                  <div className="space-y-4">
                    {quiz.questions.map((q, i) => {
                      const isCorrect = quizAnswers[i] === quizResult.correctAnswers[i]
                      return (
                        <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? "border-green-300 bg-green-50 dark:bg-green-950/30" : "border-red-300 bg-red-50 dark:bg-red-950/30"}`}>
                          <p className="font-medium mb-2">{i + 1}. {q.text}</p>
                          <div className="space-y-1">
                            {q.options.map((opt, j) => (
                              <div key={j} className={`text-sm px-3 py-1.5 rounded ${
                                j === quizResult.correctAnswers[i]
                                  ? "bg-green-200 dark:bg-green-800 font-medium"
                                  : j === quizAnswers[i] && !isCorrect
                                    ? "bg-red-200 dark:bg-red-800 line-through"
                                    : ""
                              }`}>
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Закрыть</Button>
                  {!quizResult.passed && (
                    <Button onClick={handleStartQuiz}>
                      <RotateCcw size={16} className="mr-2" />
                      Попробовать ещё раз
                    </Button>
                  )}
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-6">
                {quiz?.questions.map((q, i) => (
                  <div key={q.id} className="space-y-3">
                    <p className="font-medium">{i + 1}. {q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => (
                        <label key={j} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                          quizAnswers[i] === j ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}>
                          <input
                            type="radio"
                            name={`question-${i}`}
                            checked={quizAnswers[i] === j}
                            onChange={() => {
                              const newAnswers = [...quizAnswers]
                              newAnswers[i] = j
                              setQuizAnswers(newAnswers)
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Отмена</Button>
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={quizAnswers.some((a) => a === -1) || quizLoading}
                  >
                    {quizLoading ? "Проверка..." : "Отправить ответы"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quiz Editor Dialog */}
        <Dialog open={showQuizEditor} onOpenChange={setShowQuizEditor}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{quiz ? "Редактировать тест" : "Создать тест"}</DialogTitle>
              <DialogDescription>Добавьте вопросы и укажите правильные ответы</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Название теста</Label>
                  <Input
                    value={editingQuizTitle}
                    onChange={(e) => setEditingQuizTitle(e.target.value)}
                    placeholder="Название теста"
                  />
                </div>
                <div>
                  <Label>Проходной балл (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={editingQuizScore}
                    onChange={(e) => setEditingQuizScore(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {editingQuestions.map((q, qi) => (
                  <div key={qi} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Вопрос {qi + 1}</Label>
                      {editingQuestions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQuestions((prev) => prev.filter((_, i) => i !== qi))}
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={q.text}
                      onChange={(e) => {
                        const updated = [...editingQuestions]
                        updated[qi] = { ...updated[qi], text: e.target.value }
                        setEditingQuestions(updated)
                      }}
                      placeholder="Текст вопроса"
                      rows={2}
                    />
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Варианты ответа (отметьте правильный)</Label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`edit-q-${qi}`}
                            checked={q.correctIndex === oi}
                            onChange={() => {
                              const updated = [...editingQuestions]
                              updated[qi] = { ...updated[qi], correctIndex: oi }
                              setEditingQuestions(updated)
                            }}
                            className="accent-green-500"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const updated = [...editingQuestions]
                              const newOptions = [...updated[qi].options]
                              newOptions[oi] = e.target.value
                              updated[qi] = { ...updated[qi], options: newOptions }
                              setEditingQuestions(updated)
                            }}
                            placeholder={`Вариант ${oi + 1}`}
                            className="flex-1"
                          />
                          {q.options.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = [...editingQuestions]
                                const newOptions = updated[qi].options.filter((_, i) => i !== oi)
                                const newCorrect = updated[qi].correctIndex >= oi && updated[qi].correctIndex > 0
                                  ? updated[qi].correctIndex - 1
                                  : updated[qi].correctIndex
                                updated[qi] = { ...updated[qi], options: newOptions, correctIndex: Math.min(newCorrect, newOptions.length - 1) }
                                setEditingQuestions(updated)
                              }}
                            >
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...editingQuestions]
                            updated[qi] = { ...updated[qi], options: [...updated[qi].options, ""] }
                            setEditingQuestions(updated)
                          }}
                        >
                          <Plus size={14} className="mr-1" />
                          Добавить вариант
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    setEditingQuestions((prev) => [...prev, { text: "", options: ["", "", "", ""], correctIndex: 0 }])
                  }
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Добавить вопрос
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuizEditor(false)}>Отмена</Button>
              <Button onClick={handleSaveQuiz} disabled={quizLoading}>
                {quizLoading ? "Сохранение..." : "Сохранить тест"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileIcon size={20} />
                {previewFile?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto">
              {previewFile && (
                <>
                  {previewFile.mimeType?.startsWith("image/") ||
                  previewFile.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={`/api/knowledge/files/${previewFile.id}`}
                      alt={previewFile.name}
                      className="max-w-full h-auto"
                    />
                  ) : previewFile.mimeType?.includes("pdf") || previewFile.name.endsWith(".pdf") ? (
                    <iframe
                      src={`${`/api/knowledge/files/${previewFile.id}`}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-[70vh]"
                      style={{ border: "none" }}
                    />
                  ) : previewFile.mimeType?.startsWith("video/") || previewFile.name.match(/\.(mp4|webm)$/i) ? (
                    <video controls className="w-full" controlsList="nodownload">
                      <source
                        src={`/api/knowledge/files/${previewFile.id}`}
                        type={previewFile.mimeType || "video/mp4"}
                      />
                    </video>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Предпросмотр недоступен для этого типа файла</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
        <div className="flex gap-2">
          {canViewStaffStats && (
            <Button
              variant="outline"
              onClick={() => {
                loadStaffStats()
                setShowStaffStats(true)
              }}
              className="flex items-center gap-2"
            >
              <GraduationCap size={18} />
              <span className="hidden sm:inline">Результаты тестов</span>
            </Button>
          )}
          {canManageArticles && (
            <Button onClick={handleAddNewArticle} className="flex items-center gap-2">
              <Plus size={18} />
              <span className="hidden sm:inline">Добавить статью</span>
            </Button>
          )}
        </div>
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

      {/* Articles Grid — grouped by category */}
      {!loading && filteredArticles.length > 0 && (
        <div className="space-y-8">
          {(selectedCategory !== "all"
            ? [{ category: selectedCategory, items: filteredArticles }]
            : categories.filter((c) => c !== "all" && groupedArticles[c]?.length).map((c) => ({ category: c, items: groupedArticles[c] }))
          ).map(({ category: groupCategory, items }) => (
            <div key={groupCategory}>
              {selectedCategory === "all" && (
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{groupCategory}</h2>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleViewArticle(article)}
                    className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all group cursor-pointer relative"
                  >
                    {article.isCompleted && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle size={12} className="mr-1" />
                          Изучено
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <div className="mt-1">{getTypeIcon(article.type)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors pr-20">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {selectedCategory !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{article.date}</span>
                          {article.videoUrl && (
                            <Badge variant="outline" className="text-xs">
                              <Play size={10} className="mr-1" />
                              Видео
                            </Badge>
                          )}
                          {article.files && article.files.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <File size={10} className="mr-1" />
                              {article.files.length} файл(ов)
                            </Badge>
                          )}
                          {article.targetRole && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              {targetRoleLabels[article.targetRole] || article.targetRole}
                            </Badge>
                          )}
                          {article.hasQuiz && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              <GraduationCap size={10} className="mr-1" />
                              Тест
                            </Badge>
                          )}
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

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.content?.replace(/<[^>]*>/g, "") || ""}</p>

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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle?.id ? "Редактировать статью" : "Создать статью"}</DialogTitle>
            <DialogDescription>Заполните информацию о статье базы знаний</DialogDescription>
          </DialogHeader>

          {editingArticle && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Название</Label>
                  <Input
                    value={editingArticle.title || ""}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    placeholder="Название статьи"
                  />
                </div>
                <div>
                  <Label>Категория</Label>
                  <Select
                    value={editingArticle.category || ""}
                    onValueChange={(value) => setEditingArticle({ ...editingArticle, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Тип контента</Label>
                <Select
                  value={editingArticle.type || "article"}
                  onValueChange={(value) =>
                    setEditingArticle({ ...editingArticle, type: value as KnowledgeArticle["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Статья</SelectItem>
                    <SelectItem value="video">Видео</SelectItem>
                    <SelectItem value="guide">Руководство</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Для кого статья</Label>
                <Select
                  value={editingArticle.targetRole || "none"}
                  onValueChange={(value) =>
                    setEditingArticle({ ...editingArticle, targetRole: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите целевую роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Для всех</SelectItem>
                    <SelectItem value="franchisee">Франчайзи</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="animator">Аниматор</SelectItem>
                    <SelectItem value="dj">Диджей</SelectItem>
                    <SelectItem value="host">Ведущий</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Для франчайзи тестирование не требуется. Для остальных ролей — тест обязателен.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Ссылка на видео</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=... или https://play.boomstream.com/..."
                  value={editingArticle?.videoUrl || ""}
                  onChange={(e) => setEditingArticle((prev) => (prev ? { ...prev, videoUrl: e.target.value } : null))}
                />
                <p className="text-xs text-muted-foreground">
                  Поддерживаются: YouTube, Boomstream, VK Video, прямые ссылки на видео (.mp4, .webm)
                </p>
              </div>

              <div>
                <Label>Содержание</Label>
                <RichTextEditor
                  content={editingArticle.content || ""}
                  onChange={(html) => setEditingArticle({ ...editingArticle, content: html })}
                  placeholder="Содержание статьи"
                />
              </div>

              <div>
                <Label>Теги (через запятую)</Label>
                <Input
                  value={editingArticle.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="обучение, персонал, стандарты"
                />
              </div>

              <div className="space-y-3">
                <Label>Прикрепленные документы</Label>

                {/* Existing files */}
                {editingArticle.files && editingArticle.files.length > 0 && (
                  <div className="space-y-2">
                    {editingArticle.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                          {file.size && file.size > 0 && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload document */}
                <div className="border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Загрузить документ</p>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Выбрать файл
                      <input
                        type="file"
                        className="hidden"
                        accept=".doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>
                    {uploadingFile && <span className="text-sm text-muted-foreground">Загрузка...</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Поддерживаемые форматы: PDF, Word (.doc, .docx). Максимальный размер: 10 МБ.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveArticle}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Quiz Stats Dialog */}
      <Dialog open={showStaffStats} onOpenChange={setShowStaffStats}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Результаты тестирования сотрудников</DialogTitle>
            <DialogDescription>
              {staffStatsDetail ? "Детальная статистика по тесту" : "Сводная информация по всем тестам"}
            </DialogDescription>
          </DialogHeader>

          {staffStatsLoading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : staffStatsDetail ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => { loadStaffStats(); setStaffStatsDetail(null) }}>
                <ArrowLeft size={16} className="mr-2" />
                Назад к списку
              </Button>

              {staffStatsDetail.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{staffStatsDetail.stats.totalAttempts}</p>
                    <p className="text-xs text-muted-foreground">Попыток</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{staffStatsDetail.stats.passCount}</p>
                    <p className="text-xs text-muted-foreground">Пройден</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{staffStatsDetail.stats.failCount}</p>
                    <p className="text-xs text-muted-foreground">Не пройден</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{staffStatsDetail.stats.passingScore}%</p>
                    <p className="text-xs text-muted-foreground">Проходной балл</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Результаты по сотрудникам</h4>
                {staffStatsDetail.users.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Ещё никто не проходил этот тест</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {staffStatsDetail.users.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{u.userName}</p>
                          <p className="text-xs text-muted-foreground">{u.userPhone}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${u.passed ? "text-green-600" : "text-red-600"}`}>
                            {u.score}%
                          </span>
                          <Badge variant={u.passed ? "default" : "destructive"} className={u.passed ? "bg-green-500" : ""}>
                            {u.passed ? "Пройден" : "Не пройден"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {staffStats.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Тесты ещё не созданы</p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {staffStats.map((s: any) => (
                    <div
                      key={s.quizId}
                      onClick={() => loadStaffStats(s.articleId)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{s.articleTitle}</p>
                        <p className="text-xs text-muted-foreground">{s.quizTitle}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{s.totalAttempts} попыток</span>
                        <span className="text-green-600">{s.passCount} пройдено</span>
                        <span className="text-red-600">{s.failCount} не пройдено</span>
                        <span className="text-muted-foreground">ср. {s.avgScore}%</span>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
