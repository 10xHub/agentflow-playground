import { CheckCircle, Loader2, XCircle } from "lucide-react"
import PropTypes from "prop-types"
import React from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/**
 * StepStatus enum for step states
 */
const StepStatus = {
  PENDING: "pending",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
}

/**
 * Individual Step Component
 */
const VerificationStep = ({
  title,
  description,
  status,
  errorMessage = "",
  isLast = false,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case StepStatus.LOADING:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case StepStatus.SUCCESS:
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case StepStatus.ERROR:
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white" />
        )
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case StepStatus.LOADING:
        return "border-blue-500"
      case StepStatus.SUCCESS:
        return "border-green-500"
      case StepStatus.ERROR:
        return "border-red-500"
      default:
        return "border-gray-300"
    }
  }

  return (
    <div className="flex items-start space-x-4">
      {/* Step Icon with Connector */}
      <div className="flex flex-col items-center">
        <div className={`p-1 rounded-full border-2 ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 h-12 mt-2 ${
              status === StepStatus.SUCCESS ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`font-medium ${
            status === StepStatus.ERROR
              ? "text-red-700 dark:text-red-400"
              : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
        {status === StepStatus.ERROR && errorMessage && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Actions component for the stepper
 */
const StepperActions = ({
  hasErrors,
  canRetry,
  isVerifying,
  allStepsComplete,
  showCompleteButton,
  onRetry,
  onComplete,
}) => {
  const handleRetry = () => {
    if (onRetry) onRetry()
  }

  const handleComplete = () => {
    if (onComplete) onComplete()
  }

  return (
    <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      {hasErrors && canRetry && !isVerifying && (
        <Button variant="outline" onClick={handleRetry} size="sm">
          Retry Verification
        </Button>
      )}

      {allStepsComplete && showCompleteButton && (
        <Button onClick={handleComplete} size="sm">
          Continue to Chat
        </Button>
      )}

      {isVerifying && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying...</span>
        </div>
      )}
    </div>
  )
}

/**
 * Main Verification Stepper Component
 */

/* eslint-disable complexity */
const VerificationStepper = ({
  isVisible,
  pingStep = { status: StepStatus.PENDING, errorMessage: "" },
  graphStep = { status: StepStatus.PENDING, errorMessage: "" },
  isVerifying = false,
  onRetry = () => {},
  onComplete = () => {},
  canRetry = true,
  showCompleteButton = false,
}) => {
  const allStepsComplete =
    pingStep.status === StepStatus.SUCCESS &&
    graphStep.status === StepStatus.SUCCESS

  const hasErrors =
    pingStep.status === StepStatus.ERROR ||
    graphStep.status === StepStatus.ERROR

  const handleRetry = () => onRetry()
  const handleComplete = () => onComplete()

  if (!isVisible) return null

  return (
    <Card className="p-6 mt-4 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Backend Verification
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Verifying connection to your backend services
        </p>
      </div>

      <div className="space-y-6">
        <VerificationStep
          title="Backend Connection"
          description="Testing basic connectivity with v1/graph endpoint"
          status={pingStep.status}
          errorMessage={pingStep.errorMessage}
        />

        <VerificationStep
          title="Graph Data Access"
          description="Retrieving graph configuration from v1/graph endpoint"
          status={graphStep.status}
          errorMessage={graphStep.errorMessage}
          isLast
        />
      </div>

      <StepperActions
        hasErrors={hasErrors}
        canRetry={canRetry}
        isVerifying={isVerifying}
        allStepsComplete={allStepsComplete}
        showCompleteButton={showCompleteButton}
        onRetry={handleRetry}
        onComplete={handleComplete}
      />

      {/* Success Message */}
      {allStepsComplete && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            ✅ Backend verification completed successfully! Your agent is ready
            to use.
          </p>
        </div>
      )}
    </Card>
  )
}
/* eslint-enable complexity */

VerificationStep.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  status: PropTypes.oneOf(Object.values(StepStatus)).isRequired,
  errorMessage: PropTypes.string,
  isLast: PropTypes.bool,
}

VerificationStep.defaultProps = {
  errorMessage: "",
  isLast: false,
}

StepperActions.propTypes = {
  hasErrors: PropTypes.bool.isRequired,
  canRetry: PropTypes.bool.isRequired,
  isVerifying: PropTypes.bool.isRequired,
  allStepsComplete: PropTypes.bool.isRequired,
  showCompleteButton: PropTypes.bool.isRequired,
  onRetry: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
}

VerificationStepper.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  pingStep: PropTypes.shape({
    status: PropTypes.oneOf(Object.values(StepStatus)).isRequired,
    errorMessage: PropTypes.string,
  }),
  graphStep: PropTypes.shape({
    status: PropTypes.oneOf(Object.values(StepStatus)).isRequired,
    errorMessage: PropTypes.string,
  }),
  isVerifying: PropTypes.bool,
  onRetry: PropTypes.func,
  onComplete: PropTypes.func,
  canRetry: PropTypes.bool,
  showCompleteButton: PropTypes.bool,
}

VerificationStepper.defaultProps = {
  pingStep: { status: StepStatus.PENDING, errorMessage: "" },
  graphStep: { status: StepStatus.PENDING, errorMessage: "" },
  isVerifying: false,
  onRetry: () => {},
  onComplete: () => {},
  canRetry: true,
  showCompleteButton: false,
}

export { StepStatus }
export default VerificationStepper
