import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { shiftsApi } from "@/lib/api/shifts"
import type { Shift, ShiftFilters } from "@/lib/types"

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: ["shifts", filters],
    queryFn: () => shiftsApi.getShifts(filters),
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ["shifts", id],
    queryFn: () => shiftsApi.getShift(id),
    enabled: !!id,
  })
}

export function usePersonnelShifts(personnelId: string, dateFrom: Date, dateTo: Date) {
  return useQuery({
    queryKey: ["shifts", "personnel", personnelId, dateFrom, dateTo],
    queryFn: () => shiftsApi.getShiftsByPersonnel(personnelId, dateFrom, dateTo),
    enabled: !!personnelId,
  })
}

export function useShiftStats(personnelId: string, dateFrom: Date, dateTo: Date) {
  return useQuery({
    queryKey: ["shifts", "stats", personnelId, dateFrom, dateTo],
    queryFn: () => shiftsApi.getShiftStats(personnelId, dateFrom, dateTo),
    enabled: !!personnelId,
  })
}

export function useCreateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Shift>) => shiftsApi.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
    },
  })
}

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shift> }) => shiftsApi.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
    },
  })
}

export function useDeleteShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => shiftsApi.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
    },
  })
}
