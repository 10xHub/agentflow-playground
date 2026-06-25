import { Database, DatabaseZap } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  loadMemories,
  searchMemories,
  createMemory,
  editMemory,
  removeMemory,
  forgetMemories,
  setMode,
  setScope,
  setSelected,
  setSearchField,
  clearError,
} from "@/services/store/slices/memory.slice"
import ct from "@constants"

import ForgetDialog from "./components/forget-dialog"
import MemoryDetail from "./components/memory-detail"
import MemoryForm from "./components/memory-form"
import MemoryList from "./components/memory-list"
import MemorySearchControls from "./components/memory-search-controls"
import MemoryToolbar from "./components/memory-toolbar"

const NotConfigured = ({ onBack }) => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
    <Database className="h-10 w-10 text-muted-foreground" />
    <div>
      <h2 className="text-lg font-semibold">Backend not configured</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure and verify a backend in Settings to inspect agent memory.
      </p>
    </div>
    <Button variant="outline" onClick={onBack}>
      Back to chat
    </Button>
  </div>
)

NotConfigured.propTypes = {
  onBack: PropTypes.func.isRequired,
}

const MemoryDisabled = ({ onBack }) => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
    <DatabaseZap className="h-10 w-10 text-muted-foreground" />
    <div className="max-w-md">
      <h2 className="text-lg font-semibold">Memory store not enabled</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This agent&apos;s graph has no memory store configured, so there are no
        memories to inspect. Add a store (e.g. Qdrant or Mem0) to your graph and
        re-verify the backend to use this page.
      </p>
    </div>
    <Button variant="outline" onClick={onBack}>
      Back to chat
    </Button>
  </div>
)

MemoryDisabled.propTypes = {
  onBack: PropTypes.func.isRequired,
}

const MemoryUI = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { toast } = useToast()

  const memory = useSelector((state) => state[ct.store.MEMORY_STORE])
  const isVerified = useSelector(
    (state) => state[ct.store.SETTINGS_STORE]?.verification?.isVerified ?? false
  )
  // The graph metadata (cached during verification) reports whether the agent
  // actually has a memory store configured.
  const storeEnabled = useSelector(
    (state) => state[ct.store.SETTINGS_STORE]?.graphData?.info?.store === true
  )
  const activeThreadId = useSelector(
    (state) => state[ct.store.CHAT_STORE]?.activeThreadId
  )

  const [editor, setEditor] = useState(null) // null | "add" | "edit"
  const [forgetOpen, setForgetOpen] = useState(false)

  const { mode, scope, items, selectedId, search, status, mutationStatus } =
    memory
  const isLoading = status === "loading"
  const threadAvailable = Boolean(activeThreadId)
  const selectedMemory = items.find((item) => item.id === selectedId) || null

  const goBack = () => navigate(ct.route.ROOT)

  // Load on mount and whenever scope/mode change (search only auto-runs when a
  // query is already present, e.g. after a scope switch).
  useEffect(() => {
    if (!isVerified || !storeEnabled) {
      return
    }
    if (mode === "browse") {
      dispatch(loadMemories())
    } else if (search.query.trim()) {
      dispatch(searchMemories())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified, storeEnabled, mode, scope, dispatch])

  // Surface errors as toasts, then clear so they don't re-fire.
  useEffect(() => {
    if (memory.error) {
      toast({
        title: "Memory error",
        description: memory.error,
        variant: "destructive",
      })
      dispatch(clearError())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory.error])

  if (!isVerified) {
    return <NotConfigured onBack={goBack} />
  }

  if (!storeEnabled) {
    return <MemoryDisabled onBack={goBack} />
  }

  const handleSubmitForm = async (payload) => {
    const isEdit = editor === "edit"
    const action = isEdit
      ? editMemory({
          memoryId: selectedMemory.id,
          content: payload.content,
          metadata: payload.metadata,
        })
      : createMemory(payload)
    const result = await dispatch(action)
    if (!result.error) {
      setEditor(null)
      toast({ title: isEdit ? "Memory updated" : "Memory stored" })
    }
  }

  const handleDelete = async (memoryId) => {
    const result = await dispatch(removeMemory(memoryId))
    if (!result.error) {
      toast({ title: "Memory deleted" })
    }
  }

  const handleForget = async (payload) => {
    const result = await dispatch(forgetMemories(payload))
    if (!result.error) {
      toast({ title: "Memories forgotten" })
    }
    setForgetOpen(false)
  }

  const showScore = mode === "search"

  return (
    <div className="flex h-full flex-col">
      <MemoryToolbar
        mode={mode}
        scope={scope}
        threadAvailable={threadAvailable}
        isLoading={isLoading}
        onModeChange={(value) => {
          setEditor(null)
          dispatch(setMode(value))
        }}
        onScopeChange={(value) => dispatch(setScope(value))}
        onRefresh={() =>
          dispatch(mode === "search" ? searchMemories() : loadMemories())
        }
        onAdd={() => {
          dispatch(setSelected(null))
          setEditor("add")
        }}
        onForget={() => setForgetOpen(true)}
        onBack={goBack}
      />

      {mode === "search" && (
        <div className="border-b px-4 py-3">
          <MemorySearchControls
            search={search}
            isLoading={isLoading}
            onChange={(field, value) =>
              dispatch(setSearchField({ field, value }))
            }
            onSubmit={() => dispatch(searchMemories())}
          />
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="min-h-0 border-r">
          <MemoryList
            items={items}
            selectedId={selectedId}
            showScore={showScore}
            isLoading={isLoading}
            onSelect={(id) => {
              setEditor(null)
              dispatch(setSelected(id))
            }}
          />
        </div>
        <div className="min-h-0">
          {editor ? (
            <div className="p-4">
              <MemoryForm
                mode={editor}
                initial={editor === "edit" ? selectedMemory : null}
                isSaving={mutationStatus === "saving"}
                onCancel={() => setEditor(null)}
                onSubmit={handleSubmitForm}
              />
            </div>
          ) : (
            <MemoryDetail
              memory={selectedMemory}
              isDeleting={mutationStatus === "deleting"}
              onEdit={() => setEditor("edit")}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      <ForgetDialog
        isOpen={forgetOpen}
        isDeleting={mutationStatus === "deleting"}
        onClose={() => setForgetOpen(false)}
        onForget={handleForget}
      />
    </div>
  )
}

export default MemoryUI
