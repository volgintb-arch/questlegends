"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, GripVertical, Palette, X, Lock } from "lucide-react"

interface Stage {
  id: string
  name: string
  color: string
  order: number
  isFixed?: boolean
  stageType?: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  color: string
  isDefault: boolean
  stages: Stage[]
}

const COLORS = [
  "#6B7280",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#22C55E",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
]

interface PipelineSettingsProps {
  onPipelineCreated?: (pipelineId: string) => void
}

export function PipelineSettings({ onPipelineCreated }: PipelineSettingsProps) {
  const { getAuthHeaders, user } = useAuth()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState("")
  const [newStageName, setNewStageName] = useState("")
  const [newStageColor, setNewStageColor] = useState("#6B7280")
  const [draggedStage, setDraggedStage] = useState<number | null>(null)

  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    try {
      const res = await fetch("/api/pipelines", { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.data) {
        setPipelines(data.data)
        if (data.data.length > 0 && !selectedPipeline) {
          setSelectedPipeline(data.data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error)
    } finally {
      setLoading(false)
    }
  }

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return

    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPipelineName }),
      })
      const data = await res.json()
      if (data.data) {
        setPipelines([...pipelines, data.data])
        setSelectedPipeline(data.data)
        setNewPipelineName("")
        setShowCreateModal(false)
        if (onPipelineCreated) {
          onPipelineCreated(data.data.id)
        }
      }
    } catch (error) {
      console.error("Error creating pipeline:", error)
    }
  }

  const deletePipeline = async (id: string) => {
    if (!confirm("Удалить воронку? Это действие нельзя отменить.")) return

    try {
      const res = await fetch(`/api/pipelines/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const newPipelines = pipelines.filter((p) => p.id !== id)
        setPipelines(newPipelines)
        if (selectedPipeline?.id === id) {
          setSelectedPipeline(newPipelines[0] || null)
        }
      } else {
        const data = await res.json()
        alert(data.error || "Ошибка удаления")
      }
    } catch (error) {
      console.error("Error deleting pipeline:", error)
    }
  }

  const addStage = async () => {
    if (!selectedPipeline || !newStageName.trim()) return

    try {
      const res = await fetch(`/api/pipelines/${selectedPipeline.id}/stages`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStageName, color: newStageColor }),
      })
      const data = await res.json()
      if (data.data) {
        // Insert before fixed stages
        const nonFixedStages = (selectedPipeline.stages || []).filter((s) => !s.isFixed)
        const fixedStages = (selectedPipeline.stages || []).filter((s) => s.isFixed)
        const updatedPipeline = {
          ...selectedPipeline,
          stages: [...nonFixedStages, data.data, ...fixedStages],
        }
        setSelectedPipeline(updatedPipeline)
        setPipelines(pipelines.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p)))
        setNewStageName("")
        setNewStageColor("#6B7280")
      }
    } catch (error) {
      console.error("Error adding stage:", error)
    }
  }

  const deleteStage = async (stageId: string) => {
    if (!selectedPipeline) return

    const stage = selectedPipeline.stages.find((s) => s.id === stageId)
    if (stage?.isFixed) {
      alert("Нельзя удалить фиксированный этап")
      return
    }

    if (!confirm("Удалить этап?")) return

    try {
      const res = await fetch(`/api/pipelines/${selectedPipeline.id}/stages/${stageId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const updatedPipeline = {
          ...selectedPipeline,
          stages: selectedPipeline.stages.filter((s) => s.id !== stageId),
        }
        setSelectedPipeline(updatedPipeline)
        setPipelines(pipelines.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p)))
      } else {
        const data = await res.json()
        alert(data.error || "Ошибка удаления")
      }
    } catch (error) {
      console.error("Error deleting stage:", error)
    }
  }

  const updateStageOrder = async (stages: Stage[]) => {
    if (!selectedPipeline) return

    const reorderedStages = stages.map((s, i) => ({ ...s, order: i }))

    try {
      await fetch(`/api/pipelines/${selectedPipeline.id}/stages`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ stages: reorderedStages }),
      })

      const updatedPipeline = { ...selectedPipeline, stages: reorderedStages }
      setSelectedPipeline(updatedPipeline)
      setPipelines(pipelines.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p)))
    } catch (error) {
      console.error("Error updating stage order:", error)
    }
  }

  const handleDragStart = (index: number) => {
    const stage = selectedPipeline?.stages[index]
    if (stage?.isFixed) return
    setDraggedStage(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedStage === null || !selectedPipeline) return

    const targetStage = selectedPipeline.stages[index]
    if (targetStage?.isFixed) return

    if (draggedStage !== index) {
      const newStages = [...selectedPipeline.stages]
      const [removed] = newStages.splice(draggedStage, 1)
      newStages.splice(index, 0, removed)
      setSelectedPipeline({ ...selectedPipeline, stages: newStages })
      setDraggedStage(index)
    }
  }

  const handleDragEnd = () => {
    if (selectedPipeline) {
      updateStageOrder(selectedPipeline.stages)
    }
    setDraggedStage(null)
  }

  const updateStageName = async (stageId: string, name: string) => {
    if (!selectedPipeline) return

    const stage = selectedPipeline.stages.find((s) => s.id === stageId)
    if (stage?.isFixed) return

    try {
      await fetch(`/api/pipelines/${selectedPipeline.id}/stages/${stageId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      const updatedPipeline = {
        ...selectedPipeline,
        stages: selectedPipeline.stages.map((s) => (s.id === stageId ? { ...s, name } : s)),
      }
      setSelectedPipeline(updatedPipeline)
      setPipelines(pipelines.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p)))
    } catch (error) {
      console.error("Error updating stage:", error)
    }
  }

  const updateStageColor = async (stageId: string, color: string) => {
    if (!selectedPipeline) return

    try {
      await fetch(`/api/pipelines/${selectedPipeline.id}/stages/${stageId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      })

      const updatedPipeline = {
        ...selectedPipeline,
        stages: selectedPipeline.stages.map((s) => (s.id === stageId ? { ...s, color } : s)),
      }
      setSelectedPipeline(updatedPipeline)
      setPipelines(pipelines.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p)))
    } catch (error) {
      console.error("Error updating stage color:", error)
    }
  }

  const canManage = user?.role === "super_admin" || user?.role === "uk"

  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Воронки продаж</h2>
        {canManage && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                <Plus className="h-3 w-3 mr-1" />
                Создать воронку
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm">Новая воронка</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Название воронки"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Этапы "Завершен" и "Отказ" будут добавлены автоматически
                </p>
                <Button onClick={createPipeline} className="w-full h-8 text-xs">
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pipeline tabs */}
      <div className="flex gap-1 flex-wrap">
        {pipelines.map((pipeline) => (
          <button
            key={pipeline.id}
            onClick={() => setSelectedPipeline(pipeline)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              selectedPipeline?.id === pipeline.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            {pipeline.name}
            {pipeline.isDefault && " ★"}
          </button>
        ))}
      </div>

      {/* Selected pipeline stages */}
      {selectedPipeline && (
        <Card>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium">Этапы: {selectedPipeline.name}</CardTitle>
              {canManage && !selectedPipeline.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => deletePipeline(selectedPipeline.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {/* Stages list */}
            <div className="space-y-1">
              {(selectedPipeline.stages || []).map((stage, index) => (
                <div
                  key={stage.id}
                  draggable={canManage && !stage.isFixed}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-1.5 rounded border bg-background ${
                    draggedStage === index ? "opacity-50" : ""
                  } ${stage.isFixed ? "bg-muted/50" : ""}`}
                >
                  {canManage && !stage.isFixed && (
                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                  )}
                  {stage.isFixed && <Lock className="h-3 w-3 text-muted-foreground" />}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStageName(stage.id, e.target.value)}
                    disabled={!canManage || stage.isFixed}
                    className="h-6 text-xs flex-1 border-0 bg-transparent p-0"
                  />
                  {stage.isFixed && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      {stage.stageType === "completed" ? "Успех" : "Отказ"}
                    </span>
                  )}
                  {canManage && !stage.isFixed && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Palette className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle className="text-xs">Цвет этапа</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-5 gap-2 pt-2">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => updateStageColor(stage.id, color)}
                                className={`w-8 h-8 rounded-full border-2 ${
                                  stage.color === color ? "border-primary" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive"
                        onClick={() => deleteStage(stage.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new stage */}
            {canManage && (
              <div className="flex gap-2 pt-2 border-t">
                <div className="flex items-center gap-1">
                  {COLORS.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStageColor(color)}
                      className={`w-4 h-4 rounded-full border ${
                        newStageColor === color ? "border-primary" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  placeholder="Новый этап"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="h-6 text-xs flex-1"
                />
                <Button onClick={addStage} size="sm" className="h-6 text-xs px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
