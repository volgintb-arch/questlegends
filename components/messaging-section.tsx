"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, ArrowLeft, Search, MessageSquare, Trash2, MoreVertical, Pencil } from "lucide-react"
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
  content: string
  createdAt: string
  unreadCount: number
}

export function MessagingSection() {
  const { user, getAuthHeaders } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; role: string } | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [assignedFranchiseeIds, setAssignedFranchiseeIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchConversations()
    fetchAvailableUsers()
    if (user?.role === "uk_employee") {
      fetchAssignedFranchisees()
    }
  }, [user?.role])

  const fetchAssignedFranchisees = async () => {
    try {
      const response = await fetch("/api/franchisees", {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      const franchisees = Array.isArray(data) ? data : []
      setAssignedFranchiseeIds(franchisees.map((f: any) => f.id))
    } catch (error) {
      console.error("[v0] Error fetching assigned franchisees:", error)
    }
  }

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/messages", {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.data) {
        setConversations(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching conversations:", error)
    }
  }

  const fetchMessages = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/messages?partnerId=${partnerId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.data) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      const users = Array.isArray(data) ? data : data.data || []

      let assignedIds: string[] = []
      if (user?.role === "uk_employee") {
        const franchiseesRes = await fetch("/api/franchisees", {
          headers: getAuthHeaders(),
        })
        const franchiseesData = await franchiseesRes.json()
        assignedIds = (Array.isArray(franchiseesData) ? franchiseesData : []).map((f: any) => f.id)
      }

      const filtered = users.filter((u: any) => {
        if (u.id === user?.id) return false

        if (user?.role === "super_admin") {
          return true
        } else if (user?.role === "uk") {
          return u.role === "uk" || u.role === "uk_employee" || u.role === "franchisee" || u.role === "super_admin"
        } else if (user?.role === "uk_employee") {
          if (u.role === "super_admin" || u.role === "uk") {
            return true
          }
          if (u.role === "franchisee" && assignedIds.includes(u.franchiseeId)) {
            return true
          }
          return false
        } else if (user?.role === "franchisee") {
          return (
            u.role === "uk" ||
            u.role === "uk_employee" ||
            u.role === "super_admin" ||
            (u.franchiseeId === user.franchiseeId && ["admin", "employee", "animator", "host", "dj"].includes(u.role))
          )
        } else if (user?.role === "admin") {
          return (
            u.role === "uk" ||
            u.role === "uk_employee" ||
            u.role === "super_admin" ||
            u.franchiseeId === user.franchiseeId
          )
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
  }, [selectedPartner])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPartner) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content: newMessage,
        }),
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
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
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
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

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

  const handleDownloadAttachment = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPartner) return

    setIsLoading(true)
    try {
      console.log("[v0] Uploading file:", file.name, file.size)

      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData, // Send FormData, not raw file
      })

      if (!uploadResponse.ok) {
        throw new Error("File upload failed")
      }

      const { url } = await uploadResponse.json()
      console.log("[v0] File uploaded to:", url)

      // Send message with file attachment
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content: `Прикреплён файл: ${file.name}`,
          fileUrl: url,
          fileName: file.name,
        }),
      })

      if (response.ok) {
        console.log("[v0] Message with attachment sent successfully")
        fetchMessages(selectedPartner.id)
        fetchConversations()
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      alert("Ошибка при загрузке файла. Попробуйте ещё раз.")
    } finally {
      setIsLoading(false)
    }
  }

  const startNewConversation = (targetUser: any) => {
    setSelectedPartner({
      id: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
    })
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      uk: { label: "УК", variant: "default" },
      uk_employee: { label: "Сотрудник УК", variant: "secondary" },
      super_admin: { label: "Супер-админ", variant: "default" },
      franchisee: { label: "Франчайзи", variant: "outline" },
      admin: { label: "Админ", variant: "secondary" },
      employee: { label: "Сотрудник", variant: "outline" },
      animator: { label: "Аниматор", variant: "outline" },
      host: { label: "Ведущий", variant: "outline" },
      dj: { label: "DJ", variant: "outline" },
    }
    return roleMap[role] || { label: role, variant: "outline" as const }
  }

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      uk: "УК",
      uk_employee: "Сотрудник УК",
      super_admin: "Супер-админ",
      franchisee: "Франчайзи",
      admin: "Админ",
      employee: "Сотрудник",
      animator: "Аниматор",
      host: "Ведущий",
      dj: "DJ",
    }
    return roleMap[role] || role
  }

  const groupedUsers = {
    ukTeam: availableUsers.filter((u) => ["uk", "uk_employee", "super_admin"].includes(u.role)),
    franchisees: availableUsers.filter((u) => u.role === "franchisee"),
    myTeam: availableUsers.filter(
      (u) => u.franchiseeId === user?.franchiseeId && ["admin", "employee", "animator", "host", "dj"].includes(u.role),
    ),
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background rounded-lg border">
      {/* Conversations List */}
      <div className={`w-80 border-r flex flex-col ${selectedPartner ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b">
          <h2 className="text-sm font-medium mb-2">Сообщения</h2>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Existing conversations */}
          {conversations.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] text-muted-foreground px-2 mb-1">Диалоги</p>
              {conversations.map((conv) => (
                <button
                  key={conv.partner_id}
                  onClick={() =>
                    setSelectedPartner({
                      id: conv.partner_id,
                      name: conv.partnerName,
                      role: conv.partnerRole,
                    })
                  }
                  className={`w-full p-2 rounded-lg text-left hover:bg-accent transition-colors ${
                    selectedPartner?.id === conv.partner_id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px]">
                        {conv.partnerName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">{conv.partnerName}</span>
                        {conv.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-4 w-4 p-0 text-[9px] flex items-center justify-center"
                          >
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{conv.content}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {groupedUsers.ukTeam.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] text-muted-foreground px-2 mb-1">Управляющая компания</p>
              {groupedUsers.ukTeam
                .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u)}
                    className={`w-full p-2 rounded-lg text-left hover:bg-accent transition-colors ${
                      selectedPartner?.id === u.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{u.name}</span>
                        <Badge {...getRoleBadge(u.role)} className="text-[9px] h-4">
                          {getRoleBadge(u.role).label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {groupedUsers.franchisees.length > 0 &&
            (user?.role === "uk" || user?.role === "uk_employee" || user?.role === "super_admin") && (
              <div className="p-2">
                <p className="text-[10px] text-muted-foreground px-2 mb-1">Франчайзи</p>
                {groupedUsers.franchisees
                  .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startNewConversation(u)}
                      className={`w-full p-2 rounded-lg text-left hover:bg-accent transition-colors ${
                        selectedPartner?.id === u.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block">{u.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4">
                            Франчайзи
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}

          {groupedUsers.myTeam.length > 0 && (user?.role === "franchisee" || user?.role === "admin") && (
            <div className="p-2">
              <p className="text-[10px] text-muted-foreground px-2 mb-1">Моя команда</p>
              {groupedUsers.myTeam
                .filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u)}
                    className={`w-full p-2 rounded-lg text-left hover:bg-accent transition-colors ${
                      selectedPartner?.id === u.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{u.name}</span>
                        <Badge {...getRoleBadge(u.role)} className="text-[9px] h-4">
                          {getRoleBadge(u.role).label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedPartner ? "hidden md:flex" : "flex"}`}>
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedPartner(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-medium text-sm">{selectedPartner.name}</h3>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(selectedPartner.role)}</p>
                </div>
              </div>
              {/* Clear chat button */}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearChat} title="Очистить чат">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwnMessage = msg.senderId === user?.id
                  const isEditing = editingMessageId === msg.id

                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}>
                      <div className={`flex items-start gap-2 max-w-[70%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`rounded-lg p-3 relative ${
                            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="min-w-[200px]"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingMessageId(null)
                                    setEditingText("")
                                  }}
                                >
                                  Отмена
                                </Button>
                                <Button size="sm" onClick={() => handleEditMessage(msg.id)}>
                                  Сохранить
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              {msg.isEdited && <span className="text-xs opacity-70 italic">(изменено)</span>}
                              {msg.fileUrl && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs underline mt-2 inline-flex items-center gap-1"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  Скачать файл
                                </a>
                              )}
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.createdAt).toLocaleString("ru-RU")}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Context menu dropdown */}
                        {isOwnMessage && !isEditing && (
                          <DropdownMenu
                            open={openMenuId === msg.id}
                            onOpenChange={(open) => setOpenMenuId(open ? msg.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMessageId(msg.id)
                                  setEditingText(msg.content)
                                  setOpenMenuId(null)
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="h-8 text-xs"
                />
                <Button
                  size="icon"
                  className="h-8 w-8"
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
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Выберите диалог или начните новый</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
