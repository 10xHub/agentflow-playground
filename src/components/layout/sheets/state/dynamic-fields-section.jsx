import { Database } from "lucide-react"
import PropTypes from "prop-types"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

/**
 * DynamicFieldsSection component displays dynamic fields from the schema
 * @returns {object} Array of Card components for dynamic fields
 */
const DynamicFieldsSection = ({
  dynamicFields,
  getFieldInfo,
  formData,
  handleUpdateField,
}) => {
  return dynamicFields.map((fieldKey) => {
    const fieldInfo = getFieldInfo(fieldKey)
    const value = formData[fieldKey] || ""

    return (
      <Card key={fieldKey} className="p-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Database className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <Label htmlFor={fieldKey} className="text-sm font-medium">
              {fieldInfo?.title || fieldKey}
            </Label>
            {fieldInfo?.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {fieldInfo.description}
              </p>
            )}
          </div>
        </div>
        <textarea
          id={fieldKey}
          value={
            typeof value === "string" ? value : JSON.stringify(value, null, 2)
          }
          onChange={(event) => {
            try {
              // Try to parse as JSON first
              const parsed = JSON.parse(event.target.value)
              handleUpdateField(fieldKey, parsed)
            } catch {
              // If not valid JSON, treat as string
              handleUpdateField(fieldKey, event.target.value)
            }
          }}
          className="w-full p-2 text-xs resize-vertical border border-border/50 rounded-lg bg-background/50"
          placeholder={`Enter ${fieldInfo?.title || fieldKey}...`}
        />
      </Card>
    )
  })
}

DynamicFieldsSection.propTypes = {
  dynamicFields: PropTypes.arrayOf(PropTypes.string).isRequired,
  getFieldInfo: PropTypes.func.isRequired,
  formData: PropTypes.object.isRequired,
  handleUpdateField: PropTypes.func.isRequired,
}

export default DynamicFieldsSection
