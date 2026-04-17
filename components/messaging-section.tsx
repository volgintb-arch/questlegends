"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })

const formatDateSeparator = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Сегодня"
  if (date.toDateString() === yesterday.toDateString()) return "Вчера"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

const getDateKey = (dateStr: string) => new Date(dateStr).toDateString()

const EMOJI_LIST = [
  "😀","😂","🤣","😊","😍","🥰","😘","😎","🤔","😏",
  "😢","😭","😡","🤯","😱","🥳","🤗","🫡","🙏","🤝",
  "👍","👎","❤️","🔥","⭐","✅","🎉","💪","👏","🙌",
  "💯","🚀","💡","📌","📎","📊","🎯","⚡","🏆","🎁",
]

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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Close emoji picker on outside click
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
      console.error("Error fetching conversations:", error)
    }
  }

  const fetchMessages = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/messages?partnerId=${partnerId}`, { headers: getAuthHeaders() })
      const data = await response.json()
      if (data.data) setMessages(data.data)
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const headers = getAuthHeaders()
      const isFranchisee = user?.role === "franchisee" || user?.role === "own_point"
      const fetches: Promise<Response>[] = [fetch("/api/users", { headers })]
      if (isFranchisee) fetches.push(fetch("/api/users?role=uk", { headers }))

      const responses = await Promise.all(fetches)
      const allUsers: any[] = []
      for (const res of responses) {
        const data = await res.json()
        allUsers.push(...(Array.isArray(data) ? data : data.data || []))
      }
      const usersMap = new Map<string, any>()
      for (const u of allUsers) usersMap.set(u.id, u)
      const users = Array.from(usersMap.values())

      let assignedIds: string[] = []
      if (user?.role === "uk_employee") {
        const franchiseesRes = await fetch("/api/franchisees", { headers })
        const franchiseesData = await franchiseesRes.json()
        assignedIds = (Array.isArray(franchiseesData) ? franchiseesData : []).map((f: any) => f.id)
      }

      let assignedUkEmployeeIds: string[] = []
      if (isFranchisee && user?.franchiseeId) {
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
          if (["super_admin", "uk", "uk_employee"].includes(u.role)) return true
          const uFid = u.franchiseeId || u.franchisee?.id
          return uFid && assignedIds.includes(uFid)
        }
        if (user?.role === "franchisee" || user?.role === "own_point") {
          if (u.role === "uk" || u.role === "super_admin") return true
          if (u.role === "uk_employee" && assignedUkEmployeeIds.includes(u.id)) return true
          const uFid = u.franchiseeId || u.franchisee?.id
          return uFid === user.franchiseeId && u.id !== user.id
        }
        if (user?.role === "admin") {
          const uFid = u.franchiseeId || u.franchisee?.id
          return uFid === user.franchiseeId
        }
        return false
      })
      setAvailableUsers(filtered)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner.id)
      const interval = setInterval(() => fetchMessages(selectedPartner.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedPartner]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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
      console.error("Error sending message:", error)
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
      console.error("Error editing message:", error)
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
      console.error("Error deleting message:", error)
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
      console.error("Error clearing chat:", error)
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
        body: JSON.stringify({ receiverId: selectedPartner.id, content: `Файл: ${file.name}`, fileUrl: url, fileName: file.name }),
      })
      if (response.ok) {
        fetchMessages(selectedPartner.id)
        fetchConversations()
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Ошибка при загрузке файла")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      uk: "УК", uk_employee: "Сотрудник УК", super_admin: "УК",
      franchisee: "Франчайзи", own_point: "Собств. точка", admin: "Админ",
      employee: "Сотрудник", animator: "Аниматор", host: "Ведущий", dj: "DJ",
    }
    return map[role] || role
  }

  const getInitials = (name: string) => name?.slice(0, 2).toUpperCase() || "?"

  // Build contact list: conversations first, then grouped contacts
  const contactsWithConv = conversations
    .filter((c) => !searchQuery || c.partnerName?.toLowerCase().includes(searchQuery.toLowerCase()))

  const contactsWithoutConv = availableUsers
    .filter((u) => {
      if (searchQuery && !u.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return !conversations.some((c) => c.partner_id === u.id)
    })

  return (
    <div className="flex h-full overflow-hidden">
      {/* ===== LEFT SIDEBAR ===== */}
      <div
        className={`${selectedPartner ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card`}
        style={{ height: "100%" }}
      >
        {/* Fixed search header */}
        <div className="flex-shrink-0 p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Чат</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-sm rounded-lg bg-muted/40 border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Scrollable contact list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Conversations */}
          {contactsWithConv.length > 0 && (
            <div className="py-1">
              {contactsWithConv.map((conv) => {
                const isActive = selectedPartner?.id === conv.partner_id
                return (
                  <button
                    key={conv.partner_id}
                    onClick={() => setSelectedPartner({ id: conv.partner_id, name: conv.partnerName, role: conv.partnerRole, avatarUrl: conv.partnerAvatar })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      isActive ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      {conv.partnerAvatar && <AvatarImage src={conv.partnerAvatar} />}
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
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">{conv.content}</p>
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

          {/* Other contacts */}
          {contactsWithoutConv.length > 0 && (
            <div className="py-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Контакты
              </p>
              {contactsWithoutConv.map((u) => {
                const isActive = selectedPartner?.id === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedPartner({ id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      isActive ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium truncate block">{u.name}</span>
                      <span className="text-[11px] text-muted-foreground">{getRoleLabel(u.role)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {contactsWithConv.length === 0 && contactsWithoutConv.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Нет контактов
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT: CHAT AREA ===== */}
      <div
        className={`${!selectedPartner ? "hidden md:flex" : "flex"} flex-1 flex-col bg-background`}
        style={{ height: "100%" }}
      >
        {selectedPartner ? (
          <>
            {/* Chat header — fixed */}
            <div className="flex-shrink-0 px-3 py-2.5 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 md:hidden"
                  onClick={() => setSelectedPartner(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 flex-shrink-0">
                  {selectedPartner.avatarUrl && <AvatarImage src={selectedPartner.avatarUrl} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {getInitials(selectedPartner.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{selectedPartner.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{getRoleLabel(selectedPartner.role)}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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

            {/* Messages — scrollable */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3"
            >
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Нет сообщений. Начните диалог!
                </div>
              )}
              {messages.map((msg, idx) => {
                const isOwn = msg.senderId === user?.id
                const isEditing = editingMessageId === msg.id
                const prevMsg = messages[idx - 1]
                const nextMsg = messages[idx + 1]
                const showDateSep = !prevMsg || getDateKey(prevMsg.createdAt) !== getDateKey(msg.createdAt)
                const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId)
                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId
                const isImage = isImageFile(msg.fileName, msg.fileUrl)

                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2.5" : "mb-0.5"} group`}>
                      <div className={`flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : ""} max-w-[85%] sm:max-w-[65%]`}>
                        {/* Avatar placeholder */}
                        {!isOwn && (
                          <div className="w-7 flex-shrink-0 mb-0.5">
                            {showAvatar && (
                              <Avatar className="h-7 w-7">
                                {selectedPartner.avatarUrl && <AvatarImage src={selectedPartner.avatarUrl} />}
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                  {getInitials(selectedPartner.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={`relative px-3 py-1.5 ${
                            isOwn
                              ? `bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"}`
                              : `bg-card border border-border/60 ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"}`
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2 min-w-[200px] py-1">
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditMessage(msg.id)
                                  if (e.key === "Escape") { setEditingMessageId(null); setEditingText("") }
                                }}
                              />
                              <div className="flex gap-2 justify-end">
                                <button className="text-[11px] opacity-70 hover:opacity-100" onClick={() => { setEditingMessageId(null); setEditingText("") }}>Отмена</button>
                                <button className="text-[11px] font-medium" onClick={() => handleEditMessage(msg.id)}>Сохранить</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {isImage && msg.fileUrl && (
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                                  <img src={msg.fileUrl} alt={msg.fileName || "Image"} className="max-w-[240px] max-h-[200px] rounded-lg object-cover" />
                                </a>
                              )}
                              {msg.fileUrl && !isImage && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg mb-1.5 ${isOwn ? "bg-white/10" : "bg-muted/50"}`}
                                >
                                  <FileText className="h-5 w-5 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{msg.fileName || "Файл"}</p>
                                    <p className="text-[10px] opacity-60">Скачать</p>
                                  </div>
                                </a>
                              )}
                              {(!msg.fileUrl || !isImage) && (
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                                {msg.isEdited && <span className="text-[10px] opacity-50 italic">изм.</span>}
                                <span className="text-[10px] opacity-50">{formatTime(msg.createdAt)}</span>
                                {isOwn && (msg.isRead ? <CheckCheck className="h-3 w-3 opacity-60" /> : <Check className="h-3 w-3 opacity-40" />)}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Context menu */}
                        {isOwn && !isEditing && (
                          <DropdownMenu open={openMenuId === msg.id} onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <button className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded hover:bg-muted/50">
                                <MoreVertical className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[130px]">
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

            {/* Input area — fixed at bottom */}
            <div className="flex-shrink-0 px-2 sm:px-3 py-2 border-t border-border bg-card safe-bottom">
              <div className="flex items-end gap-1.5">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                {/* Attach + Emoji */}
                <div className="flex flex-shrink-0">
                  <button
                    className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 w-[260px] grid grid-cols-8 gap-0.5">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-lg transition-colors"
                            onClick={() => { setNewMessage((prev) => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus() }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Text input */}
                <div className="flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    placeholder="Сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="w-full h-10 text-[15px] rounded-2xl bg-muted/30 border-0 px-4 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Send button */}
                <button
                  className={`h-10 w-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                    newMessage.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}
                >
                  <Send className="h-5 w-5" />
                </button>
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
