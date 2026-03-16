"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Paperclip,
  ArrowLeft,
  Search,
  MessageSquare,
  Trash2,
  MoreVertical,
  Pencil,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  X,
  Smile,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  fileUrl?: string
  fileName?: string
  isRead: boolean
  createdAt: string
  senderName?: string
  isEdited?: boolean
}

interface Conversation {
  partner_id: string
  partnerName: string
  partnerRole: string
  partnerAvatar?: string
  content: string
  createdAt: string
  unreadCount: number
}

const isImageFile = (fileName?: string, fileUrl?: string) => {
  if (!fileName && !fileUrl) return false
  const name = (fileName || fileUrl || "").toLowerCase()
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

const formatDateSeparator = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Сегодня"
  if (date.toDateString() === yesterday.toDateString()) return "Вчера"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function MessagingSection() {
  const { user, getAuthHeaders } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; role: string; avatarUrl?: string } | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Популярные эмодзи
  const EMOJI_LIST = [
    "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔", "😏",
    "😢", "😭", "😡", "🤯", "😱", "🥳", "🤗", "🫡", "🙏", "🤝",
    "👍", "👎", "❤️", "🔥", "⭐", "✅", "🎉", "💪", "👏", "🙌",
    "💯", "🚀", "💡", "📌", "📎", "📊", "🎯", "⚡", "🏆", "🎁",
  ]

  // Закрыть emoji picker при клике снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showEmojiPicker])

  useEffect(() => {
    fetchConversations()
    fetchAvailableUsers()
  }, [user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/messages", { headers: getAuthHeaders() })
      const data = await response.json()
      if (data.data) setConversations(data.data)
    } catch (error) {
      console.error("[v0] Error fetching conversations:", error)
    }
  }

  const fetchMessages = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/messages?partnerId=${partnerId}`, { headers: getAuthHeaders() })
      const data = await response.json()
      if (data.data) setMessages(data.data)
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const headers = getAuthHeaders()
      const isFranchiseeOrAdmin = user?.role === "franchisee" || user?.role === "own_point" || user?.role === "admin"

      // Franchisee/admin: fetch own staff + UK users (who are not in the same franchiseeId query)
      const fetches: Promise<Response>[] = [fetch("/api/users", { headers })]
      if (isFranchiseeOrAdmin) {
        // Also fetch UK-level users so franchisee can see assigned UK employee
        fetches.push(fetch("/api/users?role=uk", { headers }))
      }

      const responses = await Promise.all(fetches)
      const allUsers: any[] = []
      for (const res of responses) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.data || []
        allUsers.push(...list)
      }
      // Deduplicate by id
      const usersMap = new Map<string, any>()
      for (const u of allUsers) usersMap.set(u.id, u)
      const users = Array.from(usersMap.values())

      let assignedIds: string[] = []
      if (user?.role === "uk_employee") {
        const franchiseesRes = await fetch("/api/franchisees", { headers })
        const franchiseesData = await franchiseesRes.json()
        assignedIds = (Array.isArray(franchiseesData) ? franchiseesData : []).map((f: any) => f.id)
      }

      // For franchisee: find which UK employees are assigned to this franchisee
      let assignedUkEmployeeIds: string[] = []
      if (isFranchiseeOrAdmin && user?.franchiseeId) {
        try {
          const assignRes = await fetch("/api/franchise-assignments", { headers })
          if (assignRes.ok) {
            const assignData = await assignRes.json()
            const assignments = Array.isArray(assignData) ? assignData : assignData.data || []
            assignedUkEmployeeIds = assignments
              .filter((a: any) => a.franchiseeId === user.franchiseeId)
              .map((a: any) => a.userId)
          }
        } catch {}
      }

      const filtered = users.filter((u: any) => {
        if (u.id === user?.id) return false
        if (user?.role === "super_admin" || user?.role === "uk") return true
        if (user?.role === "uk_employee") {
          if (u.role === "super_admin" || u.role === "uk" || u.role === "uk_employee") return true
          const uFranchiseeId = u.franchiseeId || u.franchisee?.id
          if (uFranchiseeId && assignedIds.includes(uFranchiseeId)) return true
          return false
        }
        if (user?.role === "franchisee" || user?.role === "own_point") {
          const uFranchiseeId = u.franchiseeId || u.franchisee?.id
          // Show UK owner always
          if (u.role === "uk" || u.role === "super_admin") return true
          // Show assigned UK employee
          if (u.role === "uk_employee" && assignedUkEmployeeIds.includes(u.id)) return true
          // Show own staff (admin, employee, etc.)
          if (uFranchiseeId === user.franchiseeId && u.id !== user.id) return true
          return false
        }
        if (user?.role === "admin") {
          const uFranchiseeId = u.franchiseeId || u.franchisee?.id
          if (u.role === "uk" || u.role === "super_admin") return true
          if (u.role === "uk_employee" && assignedUkEmployeeIds.includes(u.id)) return true
          if (uFranchiseeId === user.franchiseeId) return true
          return false
        }
        return false
      })
      setAvailableUsers(filtered)
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    }
  }

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner.id)
      const interval = setInterval(() => fetchMessages(selectedPartner.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedPartner]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPartner) return
    setIsLoading(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ receiverId: selectedPartner.id, content: newMessage }),
      })
      if (response.ok) {
        setNewMessage("")
        fetchMessages(selectedPartner.id)
        fetchConversations()
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingText }),
      })
      if (response.ok) {
        setMessages(messages.map((m) => (m.id === messageId ? { ...m, content: editingText, isEdited: true } : m)))
        setEditingMessageId(null)
        setEditingText("")
      }
    } catch (error) {
      console.error("[v0] Error editing message:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Удалить это сообщение?")) return
    try {
      const response = await fetch(`/api/messages/${messageId}`, { method: "DELETE", headers: getAuthHeaders() })
      if (response.ok) {
        setMessages(messages.filter((m) => m.id !== messageId))
        setOpenMenuId(null)
        fetchConversations()
      }
    } catch (error) {
      console.error("[v0] Error deleting message:", error)
    }
  }

  const handleClearChat = async () => {
    if (!selectedPartner) return
    if (!confirm(`Очистить всю переписку с ${selectedPartner.name}?`)) return
    try {
      const response = await fetch(`/api/messages?partnerId=${selectedPartner.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        setMessages([])
        fetchConversations()
      }
    } catch (error) {
      console.error("[v0] Error clearing chat:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPartner) return
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadResponse = await fetch("/api/upload", { method: "POST", headers: getAuthHeaders(), body: formData })
      if (!uploadResponse.ok) throw new Error("File upload failed")
      const { url } = await uploadResponse.json()

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content: `Прикреплён файл: ${file.name}`,
          fileUrl: url,
          fileName: file.name,
        }),
      })
      if (response.ok) {
        fetchMessages(selectedPartner.id)
        fetchConversations()
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      alert("Ошибка при загрузке файла. Попробуйте ещё раз.")
    } finally {
      setIsLoading(false)
    }
  }

  const startNewConversation = (targetUser: any) => {
    setSelectedPartner({ id: targetUser.id, name: targetUser.name, role: targetUser.role, avatarUrl: targetUser.avatarUrl })
  }

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      uk: "УК", uk_employee: "Сотрудник УК", super_admin: "УК",
      franchisee: "Франчайзи", admin: "Админ", employee: "Сотрудник",
      animator: "Аниматор", host: "Ведущий", dj: "DJ",
    }
    return map[role] || role
  }

  const getRoleColor = (role: string) => {
    if (["uk", "uk_employee", "super_admin"].includes(role)) return "bg-primary/20 text-primary border-primary/30"
    if (role === "franchisee") return "bg-amber-500/20 text-amber-600 border-amber-500/30"
    return "bg-muted text-muted-foreground border-border"
  }

  const getInitials = (name: string) => name?.slice(0, 2).toUpperCase() || "?"

  const groupedUsers = {
    ukTeam: availableUsers.filter((u) => ["uk", "uk_employee", "super_admin"].includes(u.role)),
    franchisees: availableUsers.filter((u) => u.role === "franchisee"),
    myTeam: availableUsers.filter(
      (u) => (u.franchiseeId || u.franchisee?.id) === user?.franchiseeId && ["admin", "employee", "animator", "host", "dj"].includes(u.role),
    ),
  }

  // Group messages by date for date separators
  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString()

  const renderUserItem = (u: any, showBadge = true) => {
    const isActive = selectedPartner?.id === u.id
    const existingConv = conversations.find((c) => c.partner_id === u.id)

    return (
      <button
        key={u.id}
        onClick={() => startNewConversation(u)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          isActive
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/50 border border-transparent"
        }`}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
            {getInitials(u.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{u.name}</span>
            {existingConv && existingConv.unreadCount > 0 && (
              <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {existingConv.unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${getRoleColor(u.role)}`}>
                {getRoleLabel(u.role)}
              </span>
            )}
            {existingConv && (
              <p className="text-[11px] text-muted-foreground truncate flex-1">{existingConv.content}</p>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] glass-card rounded-xl overflow-hidden">
      {/* Conversations Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col bg-card/30 ${selectedPartner ? "hidden md:flex" : "flex"}`}>
        {/* Search Header */}
        <div className="p-3 sm:p-4 border-b border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Чат</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск контактов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl bg-muted/30"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Active conversations first */}
            {conversations.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Диалоги
                </p>
                {conversations
                  .filter((c) => !searchQuery || c.partnerName?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((conv) => {
                    const isActive = selectedPartner?.id === conv.partner_id
                    return (
                      <button
                        key={conv.partner_id}
                        onClick={() => setSelectedPartner({ id: conv.partner_id, name: conv.partnerName, role: conv.partnerRole, avatarUrl: conv.partnerAvatar })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {conv.partnerAvatar && <AvatarImage src={conv.partnerAvatar} alt={conv.partnerName} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {getInitials(conv.partnerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{conv.partnerName}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {formatTime(conv.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground truncate">{conv.content}</p>
                            {conv.unreadCount > 0 && (
                              <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Available contacts */}
            {groupedUsers.ukTeam.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Управляющая компания
                </p>
                {groupedUsers.ukTeam
                  .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => renderUserItem(u, false))}
              </div>
            )}

            {groupedUsers.franchisees.length > 0 &&
              (user?.role === "uk" || user?.role === "uk_employee" || user?.role === "super_admin") && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                    Франчайзи
                  </p>
                  {groupedUsers.franchisees
                    .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((u) => renderUserItem(u, false))}
                </div>
              )}

            {groupedUsers.myTeam.length > 0 && (user?.role === "franchisee" || user?.role === "admin") && (
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Моя команда
                </p>
                {groupedUsers.myTeam
                  .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => renderUserItem(u))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-background/50 ${!selectedPartner ? "hidden md:flex" : "flex"}`}>
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-border/30 glass-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setSelectedPartner(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  {selectedPartner.avatarUrl && <AvatarImage src={selectedPartner.avatarUrl} alt={selectedPartner.name} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {getInitials(selectedPartner.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{selectedPartner.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{getRoleLabel(selectedPartner.role)}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleClearChat} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Очистить чат
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-6 py-4 space-y-1">
                {messages.map((msg, idx) => {
                  const isOwnMessage = msg.senderId === user?.id
                  const isEditing = editingMessageId === msg.id
                  const prevMsg = messages[idx - 1]
                  const showDateSep = !prevMsg || getDateKey(prevMsg.createdAt) !== getDateKey(msg.createdAt)
                  const showAvatar = !isOwnMessage && (!messages[idx + 1] || messages[idx + 1].senderId !== msg.senderId)
                  const isLastInGroup = !messages[idx + 1] || messages[idx + 1].senderId !== msg.senderId
                  const isImage = isImageFile(msg.fileName, msg.fileUrl)

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showDateSep && (
                        <div className="flex justify-center my-4">
                          <span className="text-[11px] text-muted-foreground bg-muted/50 backdrop-blur-sm px-3 py-1 rounded-full border border-border/30">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"} group`}>
                        <div className={`flex items-end gap-1.5 ${isOwnMessage ? "flex-row-reverse" : ""} max-w-[85%] sm:max-w-[70%]`}>
                          {/* Avatar */}
                          {!isOwnMessage && (
                            <div className="w-7 flex-shrink-0">
                              {showAvatar && (
                                <Avatar className="h-7 w-7">
                                  {selectedPartner.avatarUrl && <AvatarImage src={selectedPartner.avatarUrl} alt={selectedPartner.name} />}
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                    {getInitials(selectedPartner.name)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`relative px-3 py-2 ${
                              isOwnMessage
                                ? `bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
                                : `bg-card border border-border/50 ${isLastInGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <Input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditMessage(msg.id)
                                    if (e.key === "Escape") { setEditingMessageId(null); setEditingText("") }
                                  }}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingMessageId(null); setEditingText("") }}>
                                    <X className="h-3 w-3 mr-1" /> Отмена
                                  </Button>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => handleEditMessage(msg.id)}>
                                    <Check className="h-3 w-3 mr-1" /> OK
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Image thumbnail */}
                                {isImage && msg.fileUrl && (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
                                    <img
                                      src={msg.fileUrl}
                                      alt={msg.fileName || "Image"}
                                      className="max-w-[240px] max-h-[200px] rounded-lg object-cover"
                                    />
                                  </a>
                                )}

                                {/* File attachment (non-image) */}
                                {msg.fileUrl && !isImage && (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${
                                      isOwnMessage ? "bg-white/10" : "bg-muted/50"
                                    }`}
                                  >
                                    <FileText className="h-5 w-5 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate">{msg.fileName || "Файл"}</p>
                                      <p className="text-[10px] opacity-70">Скачать</p>
                                    </div>
                                  </a>
                                )}

                                {/* Message text */}
                                {(!msg.fileUrl || !isImage) && (
                                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                )}

                                {/* Meta: time, edited, read status */}
                                <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                  {msg.isEdited && (
                                    <span className="text-[10px] opacity-60 italic mr-1">изм.</span>
                                  )}
                                  <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                                  {isOwnMessage && (
                                    msg.isRead
                                      ? <CheckCheck className="h-3 w-3 opacity-70" />
                                      : <Check className="h-3 w-3 opacity-50" />
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Context menu */}
                          {isOwnMessage && !isEditing && (
                            <DropdownMenu
                              open={openMenuId === msg.id}
                              onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[140px]">
                                <DropdownMenuItem onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); setOpenMenuId(null) }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Изменить
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="px-3 sm:px-4 py-3 border-t border-border/30 bg-card/30">
              <div className="flex items-end gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="relative" ref={emojiPickerRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full flex-shrink-0"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50 bg-popover border rounded-xl shadow-lg p-2 w-[280px] grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted/80 text-lg transition-colors"
                          onClick={() => { setNewMessage((prev) => prev + emoji); setShowEmojiPicker(false) }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="pr-2 h-10 text-sm rounded-2xl bg-muted/30"
                  />
                </div>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Выберите диалог</p>
              <p className="text-xs text-muted-foreground">или начните новый разговор</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
