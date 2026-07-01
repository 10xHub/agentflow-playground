import { configureStore, combineReducers } from "@reduxjs/toolkit"
import { render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { listMemoriesMock, searchMemoriesMock } = vi.hoisted(() => ({
  listMemoriesMock: vi.fn(),
  searchMemoriesMock: vi.fn(),
}))

vi.mock("@api/memory.api", () => ({
  listMemories: listMemoriesMock,
  searchMemories: searchMemoriesMock,
  storeMemory: vi.fn(),
  updateMemory: vi.fn(),
  deleteMemory: vi.fn(),
  forgetMemories: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

import ct from "@constants/"
import memoryReducer, { setMode } from "@/services/store/slices/memory.slice"

import MemoryUI from "./memory.ui"

const renderPage = ({ isVerified = true, storeEnabled = true, mode } = {}) => {
  const store = configureStore({
    reducer: combineReducers({
      [ct.store.MEMORY_STORE]: memoryReducer,
      [ct.store.SETTINGS_STORE]: () => ({
        verification: { isVerified },
        graphData: { info: { store: storeEnabled } },
      }),
      [ct.store.CHAT_STORE]: () => ({ activeThreadId: null }),
    }),
  })
  if (mode) {
    store.dispatch(setMode(mode))
  }
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MemoryUI />
      </MemoryRouter>
    </Provider>
  )
}

describe("MemoryUI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMemoriesMock.mockResolvedValue({
      data: { memories: [{ id: "1", content: "remembered fact", memory_type: "episodic" }] },
    })
    searchMemoriesMock.mockResolvedValue({ data: { results: [] } })
  })

  it("shows the not-configured guard when backend is unverified", () => {
    renderPage({ isVerified: false })
    expect(screen.getByText(/backend not configured/i)).toBeInTheDocument()
    expect(listMemoriesMock).not.toHaveBeenCalled()
  })

  it("shows the disabled state when the agent has no memory store", () => {
    renderPage({ storeEnabled: false })
    expect(screen.getByText(/memory store not enabled/i)).toBeInTheDocument()
    expect(listMemoriesMock).not.toHaveBeenCalled()
  })

  it("loads and renders memories on mount when verified", async () => {
    renderPage()
    await waitFor(() => expect(listMemoriesMock).toHaveBeenCalled())
    expect(await screen.findByText("remembered fact")).toBeInTheDocument()
  })

  it("disables current-thread scope when no thread is active", () => {
    renderPage()
    expect(
      screen.getByRole("button", { name: /current thread/i })
    ).toBeDisabled()
  })

  it("shows the search input when in search mode", async () => {
    renderPage({ mode: "search" })
    expect(
      await screen.findByPlaceholderText(/search memories by meaning/i)
    ).toBeInTheDocument()
  })
})
