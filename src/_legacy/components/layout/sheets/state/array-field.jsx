import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Helper component for managing array fields
 */
const ArrayField = ({
  label,
  items = [],
  onAdd: handleAdd,
  onRemove,
  onUpdate,
  itemPlaceholder,
}) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <Label className="text-xs">{label}</Label>
      <Button size="sm" onClick={handleAdd}>
        Add {label}
      </Button>
    </div>
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={`${label}`} className="flex gap-2">
          <Input
            value={item}
            onChange={(event) => onUpdate(index, event.target.value)}
            placeholder={itemPlaceholder}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(index)}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  </div>
)

ArrayField.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  itemPlaceholder: PropTypes.string.isRequired,
}
