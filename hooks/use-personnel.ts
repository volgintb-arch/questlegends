import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { personnelApi } from "@/lib/api/personnel"
import type { Personnel, PersonnelFilters } from "@/lib/types"

export function usePersonnel(filters?: PersonnelFilters) {
  return useQuery({
    queryKey: ["personnel", filters],
    queryFn: () => personnelApi.getAll(filters),
  })
}

export function usePersonnelMember(id: string) {
  return useQuery({
    queryKey: ["personnel", id],
    queryFn: () => personnelApi.getById(id),
    enabled: !!id,
  })
}

export function useCreatePersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Personnel>) => personnelApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] })
    },
  })
}

export function useUpdatePersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Personnel> }) => personnelApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] })
      queryClient.invalidateQueries({ queryKey: ["personnel", variables.id] })
    },
  })
}

export function useDeletePersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => personnelApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] })
    },
  })
}
