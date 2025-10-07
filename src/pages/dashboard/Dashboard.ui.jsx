import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import ConfigurationCard from "@/components/dashboard/ConfigurationCard"
import AnimatedGradientText from "@/components/magicui/animated-gradient-text"
import VerificationStepper from "@/components/setup/VerificationStepper"
import ct from "@constants"

const DashboardUI = () => {
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])

  const { verification } = store

  const [showStepper, setShowStepper] = useState(false)

  useEffect(() => {
    // only true
    if (verification.isVerifying) {
      setShowStepper(verification.isVerifying)
    }
  }, [verification.isVerifying])

  return (
    <div className="bg-gradient-to-br p-8">
      <div className="max-w-4xl mx-auto">
        {/* Animated Header Section */}
        <div className="text-center mb-12 space-y-6">
          <AnimatedGradientText
            className="text-3xl font-bold"
            speed={2}
            colorFrom="#6366f1"
            colorTo="#8b5cf6"
          >
            PyAgenity Playground
          </AnimatedGradientText>
          <div className="text-xs text-muted-foreground">
            PyAgenity is a Python framework for building, orchestrating, and
            managing multi-agent systems. Designed for flexibility and
            scalability, PyAgenity enables developers to create intelligent
            agents that collaborate, communicate, and solve complex tasks
            together.
          </div>

          {/* <TypingAnimation
            className="text-sm text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            duration={50}
            delay={1000}
          >
            PyAgenity is a Python framework for building, orchestrating, and
            managing multi-agent systems. Designed for flexibility and
            scalability, PyAgenity enables developers to create intelligent
            agents that collaborate, communicate, and solve complex tasks
            together.
          </TypingAnimation> */}
        </div>

        {/* Configuration Card - spans full width */}
        <div className="mb-6">
          <ConfigurationCard />
        </div>

        {showStepper && (
          <div className="mt-6">
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
              onRetry={() => {
                console.log("Retry verification")
              }}
              onComplete={() => {
                console.log("Verification complete")
              }}
              canRetry
              showCompleteButton={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardUI
