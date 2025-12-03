import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dealsApi } from "@/lib/api/deals"
import type { Deal, DealFilters } from "@/lib/types"

export function useDeals(filters?: DealFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["deals", filters, page, limit],
    queryFn: () => dealsApi.getAll(filters, page, limit),
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: () => dealsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Deal>) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deal> }) => dealsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deals", variables.id] })
    },
  })
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => dealsApi.updateStage(id, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deals", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })
}
