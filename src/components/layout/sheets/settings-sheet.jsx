/* eslint-disable max-lines-per-function */
import { zodResolver } from "@hookform/resolvers/zod"
import { Settings, CheckCircle } from "lucide-react"
import PropTypes from "prop-types"
import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useSelector, useDispatch } from "react-redux"
import { z } from "zod"

import VerificationStepper from "@/components/setup/VerificationStepper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import {
  resetVerification,
  setSettings,
  testPingEndpoint,
  testGraphEndpoint,
} from "@/services/store/slices/settings.slice"
import ct from "@constants"
import { fetchStateScheme } from "@store/slices/state.slice"

// Zod validation schema
const settingsSchema = z.object({
  name: z.string().optional(),
  backendUrl: z
    .string()
    .url("Please enter a valid URL")
    .min(1, "Backend URL is required"),
  authToken: z.string().optional(),
})

/**
 * Custom hook for managing settings form with verification
 */
const useSettingsForm = (isOpen, onClose) => {
  const dispatch = useDispatch()
  const { toast } = useToast()

  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])
  const { verification, name, backendUrl, authToken } = store || {}
  const [showStepper, setShowStepper] = useState(false)

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: name || "",
      backendUrl: backendUrl || "",
      authToken: authToken || "",
    },
  })

  const { reset, watch } = form

  // Load current settings into form when sheet opens
  useEffect(() => {
    if (isOpen && store) {
      reset({
        name: store.name || "",
        backendUrl: store.backendUrl || "",
        authToken: store.authToken || "",
      })
    }
  }, [isOpen, store, reset])

  // Handle form submission with verification
  const onSubmit = async (data) => {
    if (!data.backendUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide a backend URL",
        variant: "destructive",
      })
      return
    }

    // Show stepper and start verification
    setShowStepper(true)
    dispatch(setSettings(data))

    // Dispatch ping endpoint test
    dispatch(testPingEndpoint())

    // Dispatch graph endpoint test
    dispatch(testGraphEndpoint())

    // Get state schema
    dispatch(fetchStateScheme())
  }

  const handleCancel = () => {
    form.reset()
    setShowStepper(false)
    dispatch(resetVerification())
    onClose()
  }

  const handleRetryVerification = () => {
    dispatch(resetVerification())
    const currentValues = watch()
    dispatch(setSettings(currentValues))

    // Re-dispatch the async thunks
    dispatch(
      testPingEndpoint({
        backendUrl: currentValues.backendUrl,
        authToken: currentValues.authToken,
      })
    )
    dispatch(
      testGraphEndpoint({
        backendUrl: currentValues.backendUrl,
        authToken: currentValues.authToken,
      })
    )
  }

  return {
    ...form,
    onSubmit,
    handleCancel,
    handleRetryVerification,
    verification,
    showStepper,
  }
}

/**
 * SettingsSheet component displays application settings form with verification
 */
const SettingsSheet = ({ isOpen, onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    onSubmit,
    handleCancel,
    handleRetryVerification,
    verification,
    showStepper,
  } = useSettingsForm(isOpen, onClose)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] flex flex-col h-full"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Settings
            {verification?.isVerified && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Ready to use</span>
              </div>
            )}
          </SheetTitle>
          <SheetDescription>Configure your agent</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="backend-url">Backend URL</Label>
                <Input
                  id="backend-url"
                  type="url"
                  placeholder="https://api.example.com"
                  {...register("backendUrl")}
                  className="w-full"
                />
                {errors.backendUrl && (
                  <p className="text-sm text-red-500">
                    {errors.backendUrl.message}
                  </p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter the base URL for your backend API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-token">
                  Authentication Token (Optional)
                </Label>
                <Input
                  id="auth-token"
                  type="password"
                  placeholder="Bearer token or API key"
                  {...register("authToken")}
                  className="w-full"
                />
                {errors.authToken && (
                  <p className="text-sm text-red-500">
                    {errors.authToken.message}
                  </p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your API authentication token (if required)
                </p>
              </div>

              <SheetFooter className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">Verify & Save</Button>
              </SheetFooter>
            </form>

            {/* Verification Stepper */}
            {showStepper && (
              <div className="pt-4">
                <VerificationStepper
                  isVisible={showStepper}
                  pingStep={{
                    status: verification.pingStep.status,
                    errorMessage: verification.pingStep.errorMessage,
                  }}
                  graphStep={{
                    status: verification.graphStep.status,
                    errorMessage: verification.graphStep.errorMessage,
                  }}
                  isVerifying={verification.isVerifying}
                  onRetry={handleRetryVerification}
                  onComplete={() => {}}
                  canRetry
                  showCompleteButton={false}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

SettingsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default SettingsSheet
