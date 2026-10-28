import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { createMemory, editMemory } from "@/store/memory-slice"

import MemoryForm from "./memory-form"

const editInitial = (mem) => ({
  content: mem.content,
  memory_type: mem.type,
  category: mem.cat,
  metadata: mem.meta,
})

/**
 * Wires the memory form to the create and edit thunks; closes on success.
 */
const MemoryFormPane = ({ mode, mem = null, onClose }) => {
  const dispatch = useDispatch()
  const busy = useSelector((s) => s.memory.busy)
  const edit = mode === "edit" && mem
  const submit = async (values) => {
    const ok = await dispatch(
      edit ? editMemory(mem.id, values) : createMemory(values)
    )
    if (ok) onClose()
  }
  return (
    <MemoryForm
      key={`${mode}-${mem?.id}`}
      mode={edit ? "edit" : "create"}
      busy={busy}
      initial={edit ? editInitial(mem) : null}
      onCancel={onClose}
      onSubmit={submit}
    />
  )
}

MemoryFormPane.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]).isRequired,
  mem: PropTypes.shape({ id: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
}

export default MemoryFormPane
