export function formatDateTime(timestamp: number | null | undefined) {
  if (!timestamp) {
    return "—"
  }
  return new Date(timestamp).toLocaleString()
}

export function toTimestampFromLocalDateTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return null
  }
  return timestamp
}
