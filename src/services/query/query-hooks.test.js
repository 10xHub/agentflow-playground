import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  invalidateQueriesMock,
  fetchStateSchemaMock,
  fetchStateMock,
  putStateMock,
  deleteStateMock,
  listThreadsMock,
  getThreadMock,
  deleteThreadMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn((options) => options),
  useMutationMock: vi.fn((options) => options),
  invalidateQueriesMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  fetchStateSchemaMock: vi.fn(),
  fetchStateMock: vi.fn(),
  putStateMock: vi.fn(),
  deleteStateMock: vi.fn(),
  listThreadsMock: vi.fn(),
  getThreadMock: vi.fn(),
  deleteThreadMock: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock("@api/state.api", () => ({
  fetchStateSchema: fetchStateSchemaMock,
  fetchState: fetchStateMock,
  putState: putStateMock,
  deleteState: deleteStateMock,
}))

vi.mock("../api/thread.api", () => ({
  listThreads: listThreadsMock,
  getThread: getThreadMock,
  deleteThread: deleteThreadMock,
}))

import {
  useDeleteState,
  useFetchState,
  useFetchStateSchema,
  usePutState,
} from "./state.query"
import {
  useDeleteThread,
  useFetchThreadById,
  useFetchThreads,
} from "./thread.query"

describe("query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    })
  })

  it("builds state query options correctly", async () => {
    const schemaQuery = useFetchStateSchema()
    const stateQuery = useFetchState("thread-1")

    expect(schemaQuery.queryKey).toEqual(["STATE_SCHEMA"])
    await schemaQuery.queryFn()
    expect(fetchStateSchemaMock).toHaveBeenCalledOnce()

    expect(stateQuery.queryKey).toEqual(["STATE", "thread-1"])
    expect(stateQuery.enabled).toBe(true)
    await stateQuery.queryFn()
    expect(fetchStateMock).toHaveBeenCalledWith("thread-1")
  })

  it("invalidates related queries after state mutations", async () => {
    const putMutation = usePutState("thread-1")
    const deleteMutation = useDeleteState("thread-1")
    const body = { state: { count: 1 } }

    await putMutation.mutationFn(body)
    expect(putStateMock).toHaveBeenCalledWith("thread-1", body)
    putMutation.onSuccess()

    await deleteMutation.mutationFn()
    expect(deleteStateMock).toHaveBeenCalledWith("thread-1")
    deleteMutation.onSuccess()

    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, ["STATE", "thread-1"])
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(
      2,
      ["THREADS_BY_ID", "thread-1"]
    )
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(3, ["STATE", "thread-1"])
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(
      4,
      ["THREADS_BY_ID", "thread-1"]
    )
  })

  it("builds thread query options and invalidation behavior", async () => {
    const listQuery = useFetchThreads({ search: "weather" })
    const byIdQuery = useFetchThreadById("thread-1")
    const deleteMutation = useDeleteThread()

    expect(listQuery.queryKey).toEqual(["THREADS", { search: "weather" }])
    expect(listQuery.keepPreviousData).toBe(true)
    await listQuery.queryFn()
    expect(listThreadsMock).toHaveBeenCalledWith({ search: "weather" })

    expect(byIdQuery.queryKey).toEqual(["THREADS_BY_ID", "thread-1"])
    await byIdQuery.queryFn()
    expect(getThreadMock).toHaveBeenCalledWith("thread-1")

    await deleteMutation.mutationFn("thread-1")
    expect(deleteThreadMock).toHaveBeenCalledWith("thread-1")
    deleteMutation.onSettled()

    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, ["THREADS"])
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, ["THREADS_BY_ID"])
  })
})