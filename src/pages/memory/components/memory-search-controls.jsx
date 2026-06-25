import { Search } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  MEMORY_TYPE_OPTIONS,
  RETRIEVAL_STRATEGY_OPTIONS,
  DISTANCE_METRIC_OPTIONS,
} from "../memory-options"

import FieldSelect from "./field-select"

const MemorySearchControls = ({ search, onChange, onSubmit, isLoading }) => {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [filtersError, setFiltersError] = useState(null)

  const handleFiltersChange = (text) => {
    if (!text.trim()) {
      setFiltersError(null)
      onChange("filters", {})
      return
    }
    try {
      onChange("filters", JSON.parse(text))
      setFiltersError(null)
    } catch {
      setFiltersError("Invalid JSON")
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={search.query}
          onChange={(event) => onChange("query", event.target.value)}
          placeholder="Search memories by meaning…"
          aria-label="Search query"
        />
        <Button type="submit" disabled={isLoading || !search.query.trim()}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FieldSelect
          id="search-type"
          label="Type"
          value={search.memory_type}
          onChange={(value) => onChange("memory_type", value)}
          options={MEMORY_TYPE_OPTIONS}
          placeholder="Any type"
        />
        <FieldSelect
          id="search-strategy"
          label="Strategy"
          value={search.retrieval_strategy}
          onChange={(value) => onChange("retrieval_strategy", value)}
          options={RETRIEVAL_STRATEGY_OPTIONS}
          placeholder="Default"
        />
        <div className="space-y-1.5">
          <Label htmlFor="search-category" className="text-xs">
            Category
          </Label>
          <Input
            id="search-category"
            value={search.category}
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="Any"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="search-limit" className="text-xs">
            Limit
          </Label>
          <Input
            id="search-limit"
            type="number"
            min={1}
            value={search.limit}
            onChange={(event) =>
              onChange("limit", Number(event.target.value) || 1)
            }
          />
        </div>
      </div>
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="text-xs text-muted-foreground underline">
          {advancedOpen ? "Hide advanced" : "Advanced"}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 grid gap-3 sm:grid-cols-2">
          <FieldSelect
            id="search-distance"
            label="Distance metric"
            value={search.distance_metric}
            onChange={(value) => onChange("distance_metric", value)}
            options={DISTANCE_METRIC_OPTIONS}
            placeholder="Default"
          />
          <div className="space-y-1.5">
            <Label htmlFor="search-threshold" className="text-xs">
              Score threshold
            </Label>
            <Input
              id="search-threshold"
              type="number"
              step="0.01"
              value={search.score_threshold}
              onChange={(event) =>
                onChange("score_threshold", Number(event.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="search-filters" className="text-xs">
              Filters (JSON)
            </Label>
            <Input
              id="search-filters"
              defaultValue={
                Object.keys(search.filters || {}).length
                  ? JSON.stringify(search.filters)
                  : ""
              }
              onChange={(event) => handleFiltersChange(event.target.value)}
              placeholder='{ "tag": "x" }'
              className="font-mono text-xs"
            />
            {filtersError && (
              <p className="text-xs text-destructive">{filtersError}</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  )
}

MemorySearchControls.propTypes = {
  search: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export default MemorySearchControls
