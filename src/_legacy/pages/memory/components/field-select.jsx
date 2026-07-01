import PropTypes from "prop-types"

import { Label } from "@/components/ui/label"

/**
 * Small native select styled to match the playground inputs. Used for the
 * memory type / retrieval strategy / distance metric dropdowns.
 */
const FieldSelect = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}) => (
  <div className="space-y-1.5">
    {label && (
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
    )}
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

FieldSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ).isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
}

FieldSelect.defaultProps = {
  label: "",
  placeholder: "",
  disabled: false,
}

export default FieldSelect
