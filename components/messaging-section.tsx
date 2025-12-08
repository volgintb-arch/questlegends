"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, ArrowLeft, Search, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

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
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchConversations()
    fetchAvailableUsers()
  }, [])

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
      // UK can message franchisees, franchisees can message UK
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      const users = Array.isArray(data) ? data : data.data || []

      // Filter users based on role - UK sees franchisees, franchisees see UK users
      const filtered = users.filter((u: any) => {
        if (user?.role === "uk" || user?.role === "super_admin" || user?.role === "uk_employee") {
          return u.role === "franchisee"
        } else if (user?.role === "franchisee") {
          return u.role === "uk" || u.role === "uk_employee" || u.role === "super_admin"
        }
        return false
      })
      setAvailableUsers(filtered)
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    }
  }

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPartner) return

    // For now, just send file name as message (file upload would need Blob storage)
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
          content: `[Файл: ${file.name}]`,
          fileName: file.name,
        }),
      })

      if (response.ok) {
        fetchMessages(selectedPartner.id)
        fetchConversations()
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
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
    }
    return roleMap[role] || { label: role, variant: "outline" as const }
  }

  const filteredUsers = availableUsers.filter(
    (u) => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.includes(searchQuery),
  )

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

          {/* Available users to message */}
          <div className="p-2">
            <p className="text-[10px] text-muted-foreground px-2 mb-1">
              {user?.role === "franchisee" ? "Управляющая компания" : "Франчайзи"}
            </p>
            {filteredUsers.map((u) => (
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
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedPartner ? "hidden md:flex" : "flex"}`}>
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setSelectedPartner(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px]">
                  {selectedPartner.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selectedPartner.name}</p>
                <Badge {...getRoleBadge(selectedPartner.role)} className="text-[9px] h-4">
                  {getRoleBadge(selectedPartner.role).label}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg p-2 ${
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-xs">{msg.content}</p>
                        <p
                          className={`text-[9px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {format(new Date(msg.createdAt), "HH:mm", { locale: ru })}
                        </p>
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
