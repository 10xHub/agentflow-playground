import { zodResolver } from "@hookform/resolvers/zod"
import { MessageCircle, Settings, CheckCircle } from "lucide-react"
import PropTypes from "prop-types"
import { useForm } from "react-hook-form"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { fetchStateScheme } from "@/services/store/slices/state.slice"
import ct from "@constants"
import {
  setSettings,
  testPingEndpoint,
  testGraphEndpoint,
} from "@store/slices/settings.slice"

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
 * ConfigurationCard component for dashboard setup
 * @param {object} props - Component props
 * @param {Function} props.onStartChat - Callback when Start Chat is clicked
 * @returns {object} Card component with configuration form
 */
// eslint-disable-next-line max-lines-per-function
const ConfigurationCard = ({ onStartChat = null }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])

  const { verification, name, backendUrl, authToken } = store
  const { isVerified } = verification

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: {
      name: name || "",
      backendUrl: backendUrl || "",
      authToken: authToken || "",
    },
  })

  const handleFormSubmit = (data) => {
    dispatch(setSettings(data))
    dispatch(testPingEndpoint())
    // second dispatch graph
    dispatch(testGraphEndpoint())

    // fetch state schema
    dispatch(fetchStateScheme())

    // here
    if (onStartChat) {
      onStartChat(data)
    }
  }

  const handleStartChat = () => {
    if (isVerified) {
      navigate("/")
    } else {
      toast("Please setup and verify your agent configuration")
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = form

  return (
    <Card className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 ">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Agent Configuration
        </h3>
        {verification.isVerified ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Ready to use</span>
          </div>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            (Not Verified)
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Set up Agent and its backend connection to get started
      </p>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="dashboard-backend-url"
            className="text-sm font-medium"
          >
            Backend URL
          </Label>
          <Input
            id="dashboard-backend-url"
            type="url"
            placeholder="https://api.example.com"
            {...register("backendUrl")}
            className="w-full"
          />
          {errors.backendUrl && (
            <p className="text-xs text-red-500">{errors.backendUrl.message}</p>
          )}
        </div>

        <div className="flex gap-4">
          <div className="space-y-2 w-1/2">
            <Label htmlFor="dashboard-name" className="text-sm font-medium">
              Agent Name
            </Label>
            <Input
              id="dashboard-name"
              type="text"
              placeholder="Agent name"
              {...register("name")}
              className="w-full"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2 w-1/2">
            <Label
              htmlFor="dashboard-auth-token"
              className="text-sm font-medium"
            >
              Auth Token (Optional)
            </Label>
            <Input
              id="dashboard-auth-token"
              type="password"
              placeholder="Bearer token or API key"
              {...register("authToken")}
              className="w-full"
            />
            {errors.authToken && (
              <p className="text-xs text-red-500">{errors.authToken.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            onClick={handleStartChat}
            disabled={!isVerified}
            size="sm"
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Chat
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={!isValid}
            size="sm"
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Save and Verify
          </Button>
        </div>
      </form>
    </Card>
  )
}

ConfigurationCard.propTypes = {
  onStartChat: PropTypes.func,
}

ConfigurationCard.defaultProps = {
  onStartChat: null,
}

export default ConfigurationCard
