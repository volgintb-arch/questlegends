"use client"

import type React from "react"

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
  LinkIcon,
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
  url: string // Now stores Google/Yandex Drive link instead of Blob URL
  type: "google" | "yandex" | "other"
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

  const [newFileLink, setNewFileLink] = useState("")
  const [newFileName, setNewFileName] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { getAuthHeaders, user } = useAuth()

  const categories = ["all", "Управление", "Продажи", "Финансы", "Поддержка", "Безопасность", "Обучение"]

  const categoryCounts = {
    all: 0,
    Управление: 0,
    Продажи: 0,
    Финансы: 0,
    Поддержка: 0,
    Безопасность: 0,
    Обучение: 0,
  }

  const filteredArticles = articles.filter((article) => {
    if (selectedCategory !== "all" && article.category !== selectedCategory) return false
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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

  const canManageArticles = role === "uk" || role === "super_admin" || role === "uk_employee"
  const isUkUser = user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee"

  const canOnlyView = role === "franchisee" || role === "admin" || role === "employee"

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
            files: a.files || [],
            isCompleted: a.isCompleted || false,
            completedAt: a.completedAt,
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
    setShowCreateDialog(true) // Use the new dialog
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
        size: file.size, // Store original size
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
  }

  const getFileEmbedInfo = (url: string): { embedUrl: string; type: "google" | "yandex" | "other" } => {
    // Google Drive
    // Format: https://drive.google.com/file/d/FILE_ID/view
    // Embed: https://drive.google.com/file/d/FILE_ID/preview
    const googleMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (googleMatch) {
      return {
        embedUrl: `https://drive.google.com/file/d/${googleMatch[1]}/preview`,
        type: "google",
      }
    }

    // Google Docs
    // Format: https://docs.google.com/document/d/DOC_ID/edit
    // Embed: https://docs.google.com/document/d/DOC_ID/preview
    const googleDocsMatch = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/)
    if (googleDocsMatch) {
      return {
        embedUrl: `https://docs.google.com/${googleDocsMatch[1]}/d/${googleDocsMatch[2]}/preview`,
        type: "google",
      }
    }

    // Yandex Disk
    // Format: https://disk.yandex.ru/i/XXXX or https://yadi.sk/i/XXXX
    // For Yandex we use their public embed
    const yandexMatch = url.match(/(?:disk\.yandex\.ru|yadi\.sk)\/i\/([a-zA-Z0-9_-]+)/)
    if (yandexMatch) {
      return {
        embedUrl: `https://disk.yandex.ru/i/${yandexMatch[1]}?iframe=true`,
        type: "yandex",
      }
    }

    // Yandex Disk d/ format
    const yandexDMatch = url.match(/(?:disk\.yandex\.ru|yadi\.sk)\/d\/([a-zA-Z0-9_-]+)/)
    if (yandexDMatch) {
      return {
        embedUrl: `https://disk.yandex.ru/d/${yandexDMatch[1]}?iframe=true`,
        type: "yandex",
      }
    }

    return { embedUrl: url, type: "other" }
  }

  const handleAddFileLink = () => {
    if (!newFileLink || !newFileName || !editingArticle) return

    const { embedUrl, type } = getFileEmbedInfo(newFileLink)

    const newFile: KnowledgeFile = {
      id: `file-${Date.now()}`,
      name: newFileName,
      url: embedUrl,
      type: type,
    }

    setEditingArticle({
      ...editingArticle,
      files: [...(editingArticle.files || []), newFile],
    })

    setNewFileLink("")
    setNewFileName("")
  }

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

  const getBoomstreamEmbedUrl = (url: string): string | null => {
    if (!url) return null

    // Если это прямая ссылка на видеофайл - не преобразуем для iframe
    if (isDirectVideoUrl(url)) {
      return null
    }

    // Поддержка форматов:
    // https://boomstream.ru/video/xxxxx
    // https://play.boomstream.com/xxxxx
    // https://play.boomstream.com/embed/xxxxx
    // https://boomstream.com/xxxxx

    // Если уже embed URL - возвращаем как есть
    if (url.includes("/embed/")) {
      return url
    }

    // Извлекаем ID видео
    const patterns = [
      /boomstream\.ru\/video\/([a-zA-Z0-9_-]+)/,
      /play\.boomstream\.com\/(?:embed\/)?([a-zA-Z0-9_-]+)/,
      /boomstream\.com\/([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return `https://play.boomstream.com/${match[1]}`
      }
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

  const renderFileViewer = (file: KnowledgeFile) => {
    // Use proxy URL for internal files, otherwise use direct URL
    const fileUrl = file.id.startsWith("file-") ? file.url : `/api/knowledge/files/${file.id}`

    // Construct the URL for external links like Google Drive/Yandex Disk
    const embedSrc = file.type === "google" || file.type === "yandex" ? file.url : fileUrl

    return (
      <div key={file.id} className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 flex items-center justify-between">
          <span className="font-medium text-sm">{file.name}</span>
          <a
            href={file.url.replace("/preview", "/view").replace("?iframe=true", "")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Открыть в новой вкладке
          </a>
        </div>
        <div className="aspect-[4/3] bg-muted">
          <iframe
            src={embedSrc} // Use constructed embedSrc
            className="w-full h-full border-0"
            allow="autoplay"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    )
  }

  const renderArticleContent = (article: KnowledgeArticle) => {
    return (
      <div className="space-y-6">
        {/* Article text content */}
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{article.content}</p>
        </div>

        {/* Video section */}
        {article.videoUrl && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Video className="h-4 w-4" />
              Видео
            </h4>
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
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
                  src={getBoomstreamEmbedUrl(article.videoUrl) || article.videoUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}

        {/* Files section */}
        {article.files && article.files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Прикрепленные файлы ({article.files.length})
            </h4>
            <div className="grid gap-4">
              {article.files.map((file) => {
                const originalUrl = file.url.replace("/preview", "/view").replace("?iframe=true", "")

                if (file.type === "yandex") {
                  return (
                    <div key={file.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-6 flex flex-col items-center justify-center gap-4">
                        <FileIcon
                          fileName={file.name}
                          mimeType={file.mimeType}
                          className="h-16 w-16 text-muted-foreground"
                        />
                        <div className="text-center">
                          <p className="font-medium">{file.name}</p>
                          <Badge variant="outline" className="mt-1">
                            Яндекс Диск
                          </Badge>
                        </div>
                        <a
                          href={originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Открыть файл
                        </a>
                        <p className="text-xs text-muted-foreground">Файл откроется на Яндекс Диске в новой вкладке</p>
                      </div>
                    </div>
                  )
                }

                if (file.type === "google") {
                  return (
                    <div key={file.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon fileName={file.name} mimeType={file.mimeType} className="h-4 w-4" />
                          <span className="font-medium text-sm">{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Google Drive
                          </Badge>
                        </div>
                        <a
                          href={originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Открыть в новой вкладке
                        </a>
                      </div>
                      <div className="aspect-[4/3] bg-muted">
                        <iframe
                          src={file.url}
                          className="w-full h-full border-0"
                          allow="autoplay"
                          sandbox="allow-scripts allow-same-origin allow-popups"
                        />
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={file.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileIcon
                          fileName={file.name}
                          mimeType={file.mimeType}
                          className="h-8 w-8 text-muted-foreground"
                        />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          {file.size && file.size > 0 && (
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          )}
                        </div>
                      </div>
                      <a
                        href={originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Открыть
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
    const embedUrl = selectedArticle.videoUrl ? getBoomstreamEmbedUrl(selectedArticle.videoUrl) : null

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
                      src={previewFile.proxyUrl || `/api/knowledge/files/${previewFile.id}`}
                      alt={previewFile.name}
                      className="max-w-full h-auto"
                    />
                  ) : previewFile.mimeType?.includes("pdf") || previewFile.name.endsWith(".pdf") ? (
                    <iframe
                      src={`${previewFile.proxyUrl || `/api/knowledge/files/${previewFile.id}`}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-[70vh]"
                      style={{ border: "none" }}
                    />
                  ) : previewFile.mimeType?.startsWith("video/") || previewFile.name.match(/\.(mp4|webm)$/i) ? (
                    <video controls className="w-full" controlsList="nodownload">
                      <source
                        src={previewFile.proxyUrl || `/api/knowledge/files/${previewFile.id}`}
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
        {canManageArticles && (
          <Button onClick={handleAddNewArticle} className="flex items-center gap-2">
            <Plus size={18} />
            <span className="hidden sm:inline">Добавить статью</span>
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
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle?.id ? "Редактировать статью" : "Создать статью"}</DialogTitle>
            <DialogDescription>Заполните информацию о статье базы знаний</DialogDescription>
          </DialogHeader>

          {editingArticle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label>Ссылка на видео (Boomstream)</Label>
                <Input
                  placeholder="https://play.boomstream.com/... или прямая ссылка на .mp4"
                  value={editingArticle?.videoUrl || ""}
                  onChange={(e) => setEditingArticle((prev) => (prev ? { ...prev, videoUrl: e.target.value } : null))}
                />
                <p className="text-xs text-muted-foreground">
                  Поддерживаются: прямые ссылки на видео (.mp4), ссылки Boomstream (play.boomstream.com)
                </p>
              </div>

              <div>
                <Label>Содержание</Label>
                <Textarea
                  value={editingArticle.content || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  placeholder="Содержание статьи (поддерживается HTML)"
                  rows={10}
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
                <Label>Прикрепленные файлы (Google Drive / Яндекс Диск)</Label>

                {/* Existing files */}
                {editingArticle.files && editingArticle.files.length > 0 && (
                  <div className="space-y-2">
                    {editingArticle.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {file.type === "google" ? "Google" : file.type === "yandex" ? "Яндекс" : "Ссылка"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new file link */}
                <div className="border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Добавить файл</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Название файла"
                    />
                    <Input
                      value={newFileLink}
                      onChange={(e) => setNewFileLink(e.target.value)}
                      placeholder="Ссылка на Google Drive или Яндекс Диск"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFileLink}
                    disabled={!newFileLink || !newFileName}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить файл
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Поддерживаются ссылки на Google Drive и Яндекс Диск. Файлы будут отображаться прямо в статье.
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
    </div>
  )
}
