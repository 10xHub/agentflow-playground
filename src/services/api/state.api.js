import api from "./index"

export const fetchStateSchema = async () => {
  return await api.get("/v1/graph:StateSchema")
}

export const fetchState = async (thread_id) => {
  return await api.get(`/v1/threads/${thread_id}/state`)
}

export const putState = async (thread_id, body) => {
  // body should conform to StateSchema (see openapi.json)
  return await api.put(`/v1/threads/${thread_id}/state`, body)
}

export const deleteState = async (thread_id) => {
  return await api.delete(`/v1/threads/${thread_id}/state`)
}
