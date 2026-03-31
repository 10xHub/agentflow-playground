import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  fetchStateSchema,
  fetchState,
  putState,
  deleteState,
} from "@api/state.api"

const config = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  retry: 2,
  refetchOnWindowFocus: false,
}

const schemaConfig = {
  staleTime: 30 * 60 * 1000, // 30 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  retry: 2,
  refetchOnWindowFocus: false,
}

export const useFetchStateSchema = () => {
  return useQuery({
    queryKey: ["STATE_SCHEMA"],
    queryFn: fetchStateSchema,
    ...schemaConfig,
  })
}

export const useFetchState = (thread_id) => {
  return useQuery({
    queryKey: ["STATE", thread_id],
    queryFn: () => fetchState(thread_id),
    enabled: !!thread_id,
    ...config,
  })
}

export const usePutState = (thread_id) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["PUT_STATE", thread_id],
    mutationFn: (body) => putState(thread_id, body),
    onSuccess: () => {
      // invalidate state and threads by id so UI refreshes
      queryClient.invalidateQueries(["STATE", thread_id])
      queryClient.invalidateQueries(["THREADS_BY_ID", thread_id])
    },
  })
}

export const useDeleteState = (thread_id) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["DELETE_STATE", thread_id],
    mutationFn: () => deleteState(thread_id),
    onSuccess: () => {
      queryClient.invalidateQueries(["STATE", thread_id])
      queryClient.invalidateQueries(["THREADS_BY_ID", thread_id])
    },
  })
}

export default {
  useFetchStateSchema,
  useFetchState,
  usePutState,
  useDeleteState,
}
