export function formatDateTime(timestamp: number | null | undefined) {
  if (!timestamp) {
    return "—"
  }
  return new Date(timestamp).toLocaleString()
}

export function toLocalDateTimeInputValue(timestamp: number | null | undefined) {
  if (!timestamp) {
    return ""
  }
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function toTimestampFromLocalDateTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return null
  }
  return timestamp
}
