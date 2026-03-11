export function downloadTextFile(params: {
  filename: string
  content: string
  mimeType?: string
}) {
  const blob = new Blob([params.content], {
    type: params.mimeType ?? "text/plain;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = params.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
