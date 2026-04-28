import { zodResolver } from "@hookform/resolvers/zod"
import { Settings, CheckCircle } from "lucide-react"
import PropTypes from "prop-types"
import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useSelector, useDispatch } from "react-redux"
import { z } from "zod"

import VerificationStepper from "@/components/setup/verification-stepper"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { inferAuthMode } from "@/lib/settings-utils"
import {
  resetVerification,
  setSettings,
  testPingEndpoint,
  testGraphEndpoint,
} from "@/services/store/slices/settings.slice"
import ct from "@constants"
import { fetchStateScheme } from "@store/slices/state.slice"

const authModeOptions = [
  {
    value: "none",
    label: "None",
    description: "Use a public backend with no authentication header.",
  },
  {
    value: "bearer",
    label: "Bearer",
    description: "Send a Bearer token in the Authorization header.",
  },
  {
    value: "basic",
    label: "Basic",
    description: "Send a username and password using Basic auth.",
  },
  {
    value: "header",
    label: "Custom Header",
    description: "Send an API key or other custom auth header.",
  },
]

const credentialsOptions = [
  {
    value: "",
    label: "Default",
    description: "Use the browser default fetch credentials behavior.",
  },
  {
    value: "same-origin",
    label: "Same Origin",
    description: "Send cookies only for same-origin requests.",
  },
  {
    value: "include",
    label: "Include",
    description: "Always include cookies for session-based auth.",
  },
  {
    value: "omit",
    label: "Omit",
    description: "Never send cookies or other credentials.",
  },
]

const settingsSchema = z
  .object({
    name: z.string().optional(),
    backendUrl: z
      .string()
      .url("Please enter a valid URL")
      .min(1, "Backend URL is required"),
    authMode: z.enum(["none", "bearer", "basic", "header"]),
    authToken: z.string().optional(),
    basicUsername: z.string().optional(),
    basicPassword: z.string().optional(),
    headerName: z.string().optional(),
    headerValue: z.string().optional(),
    headerPrefix: z.string().optional(),
    credentials: z.enum(["", "omit", "same-origin", "include"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.authMode === "bearer" && !value.authToken?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authToken"],
        message: "Bearer token is required",
      })
    }

    if (value.authMode === "basic") {
      if (!value.basicUsername?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["basicUsername"],
          message: "Username is required",
        })
      }

      if (!value.basicPassword?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["basicPassword"],
          message: "Password is required",
        })
      }
    }

    if (value.authMode === "header") {
      if (!value.headerName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headerName"],
          message: "Header name is required",
        })
      }

      if (!value.headerValue?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headerValue"],
          message: "Header value is required",
        })
      }
    }
  })

const buildFormValues = (settings = {}) => {
  const authMode =
    settings.authMode || inferAuthMode(settings.auth, settings.authToken)

  return {
    name: settings.name || "",
    backendUrl: settings.backendUrl || "",
    authMode,
    authToken:
      authMode === "bearer"
        ? settings.auth?.token || settings.authToken || ""
        : settings.authToken || "",
    basicUsername:
      settings.auth?.type === "basic" ? settings.auth.username : "",
    basicPassword:
      settings.auth?.type === "basic" ? settings.auth.password : "",
    headerName: settings.auth?.type === "header" ? settings.auth.name : "",
    headerValue: settings.auth?.type === "header" ? settings.auth.value : "",
    headerPrefix:
      settings.auth?.type === "header" ? settings.auth.prefix || "" : "",
    credentials: settings.credentials || "",
  }
}

const buildSettingsPayload = (values) => {
  const authMode = values.authMode || "none"
  const payload = {
    name: values.name?.trim() || "",
    backendUrl: values.backendUrl?.trim() || "",
    authMode,
    authToken: "",
    auth: null,
    credentials: values.credentials || "",
  }

  if (authMode === "bearer") {
    const token = values.authToken?.trim() || ""
    payload.authToken = token
    payload.auth = token
      ? {
          type: "bearer",
          token,
        }
      : null
  }

  if (authMode === "basic") {
    payload.auth = {
      type: "basic",
      username: values.basicUsername?.trim() || "",
      password: values.basicPassword?.trim() || "",
    }
  }

  if (authMode === "header") {
    const prefix = values.headerPrefix?.trim() || ""
    payload.auth = {
      type: "header",
      name: values.headerName?.trim() || "",
      value: values.headerValue?.trim() || "",
      prefix: prefix || null,
    }
  }

  return payload
}

const renderFieldError = (message) => {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-500">{message}</p>
}

/**
 * Custom hook for managing settings form with verification
 */
const useSettingsForm = (isOpen, onClose) => {
  const dispatch = useDispatch()
  const { toast } = useToast()

  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])
  const { verification } = store || {}
  const [showStepper, setShowStepper] = useState(false)

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: buildFormValues(store),
  })

  const { reset, watch } = form

  useEffect(() => {
    if (isOpen && store) {
      reset(buildFormValues(store))
    }
  }, [isOpen, store, reset])

  const runVerification = (payload) => {
    setShowStepper(true)
    dispatch(setSettings(payload))
    dispatch(testPingEndpoint())
    dispatch(testGraphEndpoint())
    dispatch(fetchStateScheme())
  }

  const onSubmit = async (data) => {
    if (!data.backendUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide a backend URL",
        variant: "destructive",
      })
      return
    }

    runVerification(buildSettingsPayload(data))
  }

  const handleCancel = () => {
    reset(buildFormValues(store))
    setShowStepper(false)
    dispatch(resetVerification())
    onClose()
  }

  const handleRetryVerification = () => {
    dispatch(resetVerification())
    const currentValues = watch()
    runVerification(buildSettingsPayload(currentValues))
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
    watch,
    setValue,
    formState: { errors },
    onSubmit,
    handleCancel,
    handleRetryVerification,
    verification,
    showStepper,
  } = useSettingsForm(isOpen, onClose)

  const authMode = watch("authMode")
  const credentialsMode = watch("credentials")

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[560px] flex flex-col h-full"
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
          <SheetDescription>
            Configure your backend and choose how the client authenticates.
          </SheetDescription>
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
                {renderFieldError(errors.backendUrl?.message)}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter the base URL for your backend API.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Authentication</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Match the auth mode supported by the new client library.
                  </p>
                </div>

                <Tabs
                  value={authMode}
                  onValueChange={(value) =>
                    setValue("authMode", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <TabsList className="grid w-full grid-cols-2 h-auto gap-1 sm:grid-cols-4">
                    {authModeOptions.map((option) => (
                      <TabsTrigger
                        key={option.value}
                        value={option.value}
                        className="px-2 py-2 text-xs sm:text-sm"
                      >
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="none" className="space-y-3">
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      {authModeOptions[0].description}
                    </div>
                  </TabsContent>

                  <TabsContent value="bearer" className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {authModeOptions[1].description}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="auth-token">Bearer Token</Label>
                      <Input
                        id="auth-token"
                        type="password"
                        placeholder="your-token"
                        {...register("authToken")}
                      />
                      {renderFieldError(errors.authToken?.message)}
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Sent as <code>Authorization: Bearer your-token</code>.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="basic" className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {authModeOptions[2].description}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="basic-username">Username</Label>
                        <Input
                          id="basic-username"
                          placeholder="service-user"
                          {...register("basicUsername")}
                        />
                        {renderFieldError(errors.basicUsername?.message)}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="basic-password">Password</Label>
                        <Input
                          id="basic-password"
                          type="password"
                          placeholder="service-password"
                          {...register("basicPassword")}
                        />
                        {renderFieldError(errors.basicPassword?.message)}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="header" className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {authModeOptions[3].description}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="header-name">Header Name</Label>
                        <Input
                          id="header-name"
                          placeholder="X-API-Key"
                          {...register("headerName")}
                        />
                        {renderFieldError(errors.headerName?.message)}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="header-prefix">Optional Prefix</Label>
                        <Input
                          id="header-prefix"
                          placeholder="Bearer"
                          {...register("headerPrefix")}
                        />
                        {renderFieldError(errors.headerPrefix?.message)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="header-value">Header Value</Label>
                      <Input
                        id="header-value"
                        type="password"
                        placeholder="secret-key"
                        {...register("headerValue")}
                      />
                      {renderFieldError(errors.headerValue?.message)}
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Example: <code>X-API-Key: secret-key</code> or{" "}
                        <code>Authorization: Bearer token</code>.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Credentials</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Use <code>include</code> when your backend relies on cookies
                    or session auth.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {credentialsOptions.map((option) => {
                    const isActive = credentialsMode === option.value

                    return (
                      <button
                        key={option.value || "default"}
                        type="button"
                        onClick={() =>
                          setValue("credentials", option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          isActive
                            ? "border-slate-900 bg-slate-100 text-slate-950 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-50"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {option.label}
                        </div>
                        <p className="mt-1 text-xs leading-5">
                          {option.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <SheetFooter className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">Verify & Save</Button>
              </SheetFooter>
            </form>

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
