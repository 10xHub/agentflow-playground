import { ArrowLeft, Plus, RefreshCw, Trash } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SCOPE_ACTIVE_CLASS = "bg-primary text-primary-foreground"
const SCOPE_INACTIVE_CLASS = "text-muted-foreground"

const ScopeToggle = ({ scope, threadAvailable, onChange }) => (
  <div className="flex items-center gap-1 rounded-md border p-0.5">
    <button
      type="button"
      onClick={() => onChange("all")}
      className={`rounded px-2 py-1 text-xs ${
        scope === "all" ? SCOPE_ACTIVE_CLASS : SCOPE_INACTIVE_CLASS
      }`}
    >
      All
    </button>
    <button
      type="button"
      disabled={!threadAvailable}
      title={threadAvailable ? "" : "Open a thread to scope by conversation"}
      onClick={() => onChange("thread")}
      className={`rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
        scope === "thread" ? SCOPE_ACTIVE_CLASS : SCOPE_INACTIVE_CLASS
      }`}
    >
      Current thread
    </button>
  </div>
)

ScopeToggle.propTypes = {
  scope: PropTypes.string.isRequired,
  threadAvailable: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
}

const MemoryToolbar = ({
  mode,
  scope,
  threadAvailable,
  isLoading,
  onModeChange,
  onScopeChange,
  onRefresh,
  onAdd,
  onForget,
  onBack,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back to chat
      </Button>
      <Tabs value={mode} onValueChange={onModeChange}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
      </Tabs>
      <ScopeToggle
        scope={scope}
        threadAvailable={threadAvailable}
        onChange={onScopeChange}
      />
    </div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        Refresh
      </Button>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add
      </Button>
      <Button variant="outline" size="sm" onClick={onForget}>
        <Trash className="h-4 w-4" /> Forget
      </Button>
    </div>
  </div>
)

MemoryToolbar.propTypes = {
  mode: PropTypes.string.isRequired,
  scope: PropTypes.string.isRequired,
  threadAvailable: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onModeChange: PropTypes.func.isRequired,
  onScopeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onForget: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
}

export default MemoryToolbar
