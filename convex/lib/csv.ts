import { invariant } from "./errors"

export type CsvParticipantRow = {
  name: string
  email: string
}

function splitCsvLine(line: string) {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function parseParticipantsCsv(csvText: string): CsvParticipantRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  invariant(lines.length > 0, "CSV is empty")
  const [header, ...rows] = lines
  const [colA, colB] = splitCsvLine(header).map((col) => col.toLowerCase())
  invariant(colA === "name" && colB === "email", "CSV headers must be: name,email")
  invariant(rows.length > 0, "CSV has no participant rows")

  return rows.map((line, index) => {
    const [name = "", email = ""] = splitCsvLine(line)
    invariant(name.trim().length > 0, `Row ${index + 2}: name is required`)
    invariant(email.trim().length > 0, `Row ${index + 2}: email is required`)
    return { name: name.trim(), email: email.trim().toLowerCase() }
  })
}

function escapeCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return ""
  }
  const stringValue = String(value)
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }
  return stringValue
}

export function toCsv(rows: Array<Record<string, string | number | boolean | null>>) {
  if (rows.length === 0) {
    return ""
  }

  const headers = Object.keys(rows[0])
  const lines = [headers.join(",")]

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","))
  }

  return `${lines.join("\n")}\n`
}
