import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { incidentsApi } from "@/lib/api/incidents"
import type { Incident, IncidentFilters } from "@/lib/types"

export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => incidentsApi.getIncidents(filters),
  })
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incidents", id],
    queryFn: () => incidentsApi.getIncident(id),
    enabled: !!id,
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Incident>) => incidentsApi.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
    },
  })
}

export function useUpdateIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Incident> }) => incidentsApi.updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
    },
  })
}

export function useResolveIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      incidentsApi.resolveIncident(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
    },
  })
}
