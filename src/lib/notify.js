import { toast } from "@/components/ui/use-toast"

const describe = (error) => {
  if (error == null) return undefined
  if (typeof error === "string") return error
  return error.message || String(error)
}

/**
 * Destructive toast for a failed user action.
 */
export const notifyError = (title, error) => {
  toast({ variant: "destructive", title, description: describe(error) })
}

/**
 * Plain toast for a completed user action.
 */
export const notifySuccess = (title, description) => {
  toast({ title, description })
}
