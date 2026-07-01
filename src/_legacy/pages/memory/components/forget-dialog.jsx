import PropTypes from "prop-types"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { MEMORY_TYPE_OPTIONS } from "../memory-options"

import FieldSelect from "./field-select"

/**
 * Bulk-forget memories by type and/or category. An empty selection forgets
 * everything in the current scope, so the action is gated behind a typed
 * confirmation.
 */
const ForgetDialog = ({ isOpen, isDeleting, onClose, onForget }) => {
  const [memoryType, setMemoryType] = useState("")
  const [category, setCategory] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const noFilter = !memoryType && !category.trim()
  const confirmed = !noFilter || confirmText.trim().toUpperCase() === "FORGET"

  const handleForget = () => {
    onForget({ memory_type: memoryType, category: category.trim() })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Forget memories</SheetTitle>
          <SheetDescription>
            Bulk-delete memories in the current scope. Leave filters empty to
            forget everything in scope.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <FieldSelect
            id="forget-type"
            label="Type"
            value={memoryType}
            onChange={setMemoryType}
            options={MEMORY_TYPE_OPTIONS}
            placeholder="Any type"
          />
          <div className="space-y-1.5">
            <Label htmlFor="forget-category" className="text-xs">
              Category
            </Label>
            <input
              id="forget-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Any category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {noFilter && (
            <div className="space-y-1.5">
              <Label
                htmlFor="forget-confirm"
                className="text-xs text-destructive"
              >
                Type FORGET to confirm deleting all in-scope memories
              </Label>
              <input
                id="forget-confirm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="flex h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              />
            </div>
          )}
        </div>
        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isDeleting}
            onClick={handleForget}
          >
            {isDeleting ? "Forgetting…" : "Forget"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

ForgetDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isDeleting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onForget: PropTypes.func.isRequired,
}

export default ForgetDialog
