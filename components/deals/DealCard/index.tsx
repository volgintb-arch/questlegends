"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { GripVertical } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { format } from "date-fns"

import type { DealData, DealTask, FeedEvent, DealFile, Employee, DealCardAmoCRMProps } from "./types"
import { Header } from "./Header"
import { ClientInfo } from "./ClientInfo"
import { FinancialInfo } from "./FinancialInfo"
import { TasksSection } from "./TasksSection"
import { FilesSection } from "./FilesSection"
import { FeedPanel } from "./FeedPanel"
import { TaskCreateModal, TaskDetailsModal, DeleteTaskDialog, DeleteDealDialog } from "./Modals"

export type { DealData, DealCardAmoCRMProps, DealTask, FeedEvent, DealFile, Employee }

export function DealCardAmoCRM({ deal, isOpen, onClose, onUpdate, stages = [] }: DealCardAmoCRMProps) {
  const { user, getAuthHeaders } = useAuth()
  const [dealData, setDealData] = useState<DealData>(deal)
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [tasks, setTasks] = useState<DealTask[]>([])
  const [files, setFiles] = useState<DealFile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [responsibleUsers, setResponsibleUsers] = useState<string[]>([])
  const [leftWidth, setLeftWidth] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [activeTab, setActiveTab] = useState<"note" | "task" | "file">("note")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DealTask | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showDeleteTaskDialog, setShowDeleteTaskDialog] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined)
  const [deadlineTime, setDeadlineTime] = useState<string>("12:00")
  const [newTask, setNewTask] = useState({ title: "", description: "", assigneeId: "", deadline: "", type: "general" })
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Data Loading ----
  useEffect(() => {
    if (isOpen && deal.id) {
      setDealData(deal)
      loadDealDetails()
      loadEvents()
      loadTasks()
      loadFiles()
      loadEmployees()
      loadResponsibleUsers()
    }
  }, [isOpen, deal])

  const loadDealDetails = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false) {
          setDealData((prev) => ({ ...prev, ...data }))
        }
      }
    } catch (e) {
      console.error("Error loading deal details:", e)
    }
  }

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/events`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const allEvents = data.events || []
        setEvents(
          allEvents.sort(
            (a: FeedEvent, b: FeedEvent) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        )
      }
    } catch (e) {
      console.error("Error loading events:", e)
    }
  }

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error("Error loading tasks:", e)
    }
  }

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/files`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setFiles(data.data || [])
      }
    } catch (e) {
      console.error("Error loading files:", e)
    }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const allUsers = data.data || data.users || []
        setEmployees(allUsers.filter((u: any) => ["super_admin", "uk", "uk_employee"].includes(u.role)))
      }
    } catch (e) {
      console.error("Error loading employees:", e)
    }
  }

  const loadResponsibleUsers = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/responsible`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setResponsibleUsers(data.responsibleIds || [])
      }
    } catch (e) {
      console.error("Error loading responsible users:", e)
    }
  }

  // ---- Actions ----
  const toggleResponsibleUser = async (userId: string) => {
    const updated = responsibleUsers.includes(userId)
      ? responsibleUsers.filter((id) => id !== userId)
      : [...responsibleUsers, userId]
    setResponsibleUsers(updated)
    try {
      await fetch(`/api/deals/${deal.id}/responsible`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ responsibleIds: updated }),
      })
    } catch (e) {
      console.error("Error updating responsible users:", e)
    }
  }

  const saveDeal = useCallback(
    async (updates: Partial<DealData>) => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/deals/${deal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(updates),
        })
        if (res.ok) {
          const updated = { ...dealData, ...updates }
          setDealData(updated)
          onUpdate(updated)
        }
      } catch (e) {
        console.error("Error saving deal:", e)
      } finally {
        setIsSaving(false)
      }
    },
    [deal.id, dealData, getAuthHeaders, onUpdate],
  )

  const handleDeleteDeal = async () => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE", headers: getAuthHeaders() })
      if (res.ok) {
        setShowDeleteDialog(false)
        onClose()
        onUpdate(dealData)
      }
    } catch (e) {
      console.error("Error deleting deal:", e)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, { method: "DELETE", headers: getAuthHeaders() })
      if (res.ok) {
        await loadTasks()
        await loadEvents()
        setShowDeleteTaskDialog(false)
        setTaskToDelete(null)
        setShowTaskDetails(false)
        setSelectedTask(null)
      }
    } catch (e) {
      console.error("Error deleting task:", e)
    }
  }

  const handleAddNote = async () => {
    if (!messageInput.trim()) return
    try {
      const res = await fetch(`/api/deals/${deal.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: "note", content: messageInput }),
      })
      if (res.ok) {
        setMessageInput("")
        await loadEvents()
      }
    } catch (e) {
      console.error("Error adding note:", e)
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(newTask),
      })
      if (res.ok) {
        setNewTask({ title: "", description: "", assigneeId: "", deadline: "", type: "general" })
        setShowTaskModal(false)
        await loadTasks()
        await loadEvents()
      }
    } catch (e) {
      console.error("Error creating task:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "completed" }),
      })
      if (res.ok) {
        await loadTasks()
        await loadEvents()
      }
    } catch (e) {
      console.error("Error completing task:", e)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadResponse.ok) throw new Error("Failed to upload file to storage")
      const uploadedFile = await uploadResponse.json()
      const saveResponse = await fetch(`/api/deals/${deal.id}/files`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, url: uploadedFile.url, type: file.type, size: file.size }),
      })
      if (!saveResponse.ok) throw new Error("Failed to save file reference")
      await loadFiles()
      await loadEvents()
      if (e.target) e.target.value = ""
    } catch (error: any) {
      console.error("Error uploading file:", error.message)
      alert(`Ошибка загрузки файла: ${error.message}`)
    }
  }

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Failed to download file")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Ошибка при скачивании файла")
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Удалить файл?")) return
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE", headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Failed to delete file")
      const filesRes = await fetch(`/api/deals/${deal.id}/files`, { headers: getAuthHeaders() })
      if (filesRes.ok) {
        const data = await filesRes.json()
        setFiles(data.data || [])
      }
      loadEvents()
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Ошибка при удалении файла")
    }
  }

  const handleStageChange = async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    if (stage) await saveDeal({ stageId, stage: stage.name })
  }

  // ---- Resizer ----
  const handleMouseDown = () => setIsDragging(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(Math.max(newWidth, 30), 70))
    }
    const handleMouseUp = () => setIsDragging(false)
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    if (deadlineDate) {
      const dateStr = format(deadlineDate, "yyyy-MM-dd")
      setNewTask((prev) => ({ ...prev, deadline: `${dateStr}T${deadlineTime}` }))
    }
  }, [deadlineDate, deadlineTime])

  const canDelete = user?.role === "super_admin" || user?.role === "uk" || user?.role === "uk_employee"

  if (!isOpen) return null

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-6xl sm:max-w-6xl p-0 overflow-hidden">
          <Header
            dealData={dealData}
            setDealData={setDealData}
            isEditingTitle={isEditingTitle}
            setIsEditingTitle={setIsEditingTitle}
            isSaving={isSaving}
            canDelete={canDelete}
            onDelete={() => setShowDeleteDialog(true)}
            onClose={onClose}
            saveDeal={saveDeal}
          />

          <div ref={containerRef} className="flex flex-1 overflow-hidden">
            {/* Left Panel */}
            <div className="overflow-y-auto p-4 space-y-4" style={{ width: `${leftWidth}%` }}>
              <ClientInfo
                dealData={dealData}
                setDealData={setDealData}
                stages={stages}
                editingField={editingField}
                setEditingField={setEditingField}
                saveDeal={saveDeal}
                handleStageChange={handleStageChange}
              />
              <FinancialInfo
                dealData={dealData}
                setDealData={setDealData}
                editingField={editingField}
                setEditingField={setEditingField}
                saveDeal={saveDeal}
                employees={employees}
                responsibleUsers={responsibleUsers}
                toggleResponsibleUser={toggleResponsibleUser}
              />
              <TasksSection
                tasks={tasks}
                onAddTask={() => setShowTaskModal(true)}
                onTaskComplete={handleTaskComplete}
                onOpenTaskDetails={(task) => {
                  setSelectedTask(task)
                  setShowTaskDetails(true)
                }}
                onDeleteTask={(taskId) => {
                  setTaskToDelete(taskId)
                  setShowDeleteTaskDialog(true)
                }}
              />
              <FilesSection
                files={files}
                fileInputRef={fileInputRef}
                onDownloadFile={handleDownloadFile}
                onDeleteFile={handleDeleteFile}
              />
            </div>

            {/* Resizer */}
            <div
              className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center"
              onMouseDown={handleMouseDown}
            >
              <GripVertical size={12} className="text-muted-foreground" />
            </div>

            {/* Right Panel */}
            <FeedPanel
              events={events}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onAddNote={handleAddNote}
              onOpenTaskModal={() => setShowTaskModal(true)}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
            />
          </div>
        </SheetContent>
      </Sheet>

      <TaskCreateModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        newTask={newTask}
        setNewTask={setNewTask}
        employees={employees}
        deadlineDate={deadlineDate}
        setDeadlineDate={setDeadlineDate}
        deadlineTime={deadlineTime}
        setDeadlineTime={setDeadlineTime}
        onCreateTask={handleCreateTask}
        onClose={() => setShowTaskModal(false)}
      />

      <TaskDetailsModal
        open={showTaskDetails}
        onOpenChange={setShowTaskDetails}
        task={selectedTask}
        onComplete={handleTaskComplete}
        onDelete={(taskId) => {
          setTaskToDelete(taskId)
          setShowDeleteTaskDialog(true)
        }}
      />

      <DeleteTaskDialog
        open={showDeleteTaskDialog}
        onOpenChange={setShowDeleteTaskDialog}
        onConfirm={() => taskToDelete && handleDeleteTask(taskToDelete)}
        onCancel={() => setTaskToDelete(null)}
      />

      <DeleteDealDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        dealName={dealData.contactName || dealData.clientName}
        onConfirm={handleDeleteDeal}
      />
    </>
  )
}
