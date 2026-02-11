"use client"

import type React from "react"
import { MessageSquare, CheckSquare, FileText, ArrowRight, Send, Paperclip } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { FeedEvent } from "./types"
import { formatDate } from "./types"

interface FeedPanelProps {
  events: FeedEvent[]
  messageInput: string
  setMessageInput: (value: string) => void
  activeTab: "note" | "task" | "file"
  setActiveTab: (tab: "note" | "task" | "file") => void
  onAddNote: () => void
  onOpenTaskModal: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function EventItem({ event }: { event: FeedEvent }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">{event.userName?.charAt(0) || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{event.userName}</span>
          <span className="text-[10px] text-muted-foreground">{formatDate(event.createdAt)}</span>
        </div>
        <div className="mt-1">
          {event.type === "stage_change" ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight size={12} />
              <span>Изменил этап: {event.content}</span>
            </div>
          ) : event.type === "task" ? (
            <div className="flex items-center gap-1 text-xs text-blue-500">
              <CheckSquare size={12} />
              <span>{event.content}</span>
            </div>
          ) : event.type === "task_completed" ? (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <CheckSquare size={12} />
              <span>Выполнил задачу: {event.content}</span>
            </div>
          ) : event.type === "file" ? (
            <div className="flex items-center gap-1 text-xs text-purple-500">
              <FileText size={12} />
              <span>Добавил файл: {event.content}</span>
            </div>
          ) : event.type === "note" ? (
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare size={12} className="mr-1" />
              <p className="bg-muted/50 p-2 rounded">{event.content}</p>
            </div>
          ) : (
            <p className="text-xs bg-muted/50 p-2 rounded">{event.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function FeedPanel({
  events,
  messageInput,
  setMessageInput,
  activeTab,
  setActiveTab,
  onAddNote,
  onOpenTaskModal,
  fileInputRef,
  onFileUpload,
}: FeedPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Events Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Нет событий</p>
        ) : (
          events.map((event) => <EventItem key={event.id} event={event} />)
        )}
      </div>

      {/* Input Panel */}
      <div className="border-t p-3">
        <div className="flex gap-2 mb-2">
          <Button
            size="sm"
            variant={activeTab === "note" ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setActiveTab("note")}
          >
            <MessageSquare size={12} className="mr-1" />
            Заметка
          </Button>
          <Button
            size="sm"
            variant={activeTab === "task" ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => {
              setActiveTab("task")
              onOpenTaskModal()
            }}
          >
            <CheckSquare size={12} className="mr-1" />
            Задача
          </Button>
          <Button
            size="sm"
            variant={activeTab === "file" ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={12} className="mr-1" />
            Файл
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileUpload} />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Написать заметку..."
            className="min-h-[60px] text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onAddNote()
              }
            }}
          />
          <Button size="icon" className="h-[60px] w-10" onClick={onAddNote}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
