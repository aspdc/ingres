"use client"

import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import { formatDateTime, toTimestampFromLocalDateTime } from "@/lib/date"
import { SectionCard } from "@/components/ui/section-card"

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AdminAttendancePage() {
  const events = useQuery(api.events.getEvents)
  const [selectedEventId, setSelectedEventId] = useState("")
  const [lookupEmail, setLookupEmail] = useState("")
  const [attendanceId, setAttendanceId] = useState("")
  const [newScannedAt, setNewScannedAt] = useState("")
  const [manualScannedAt, setManualScannedAt] = useState("")

  const attendanceRows = useQuery(
    api.attendance.getAttendance,
    selectedEventId ? { eventId: selectedEventId as never } : "skip",
  )
  const participant = useQuery(
    api.participants.getParticipantByEmailQuery,
    lookupEmail.trim() ? { email: lookupEmail.trim().toLowerCase() } : "skip",
  )
  const attendanceCsv = useQuery(
    api.exports.exportAttendanceCSV,
    selectedEventId ? { eventId: selectedEventId as never } : "skip",
  )

  const markAttendance = useMutation(api.attendance.markAttendance)
  const updateAttendance = useMutation(api.attendance.updateAttendance)
  const removeAttendance = useMutation(api.attendance.deleteAttendance)

  const sortedEvents = useMemo(
    () => (events ? [...events].sort((a, b) => a.start_time - b.start_time) : []),
    [events],
  )

  async function onManualMark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedEventId || !participant?._id) {
      toast.error("Select event and valid participant email")
      return
    }
    const timestamp = manualScannedAt
      ? toTimestampFromLocalDateTime(manualScannedAt)
      : Date.now()
    if (!timestamp) {
      toast.error("Invalid manual scan timestamp")
      return
    }

    try {
      const result = await markAttendance({
        eventId: selectedEventId as never,
        participantId: participant._id,
        scannedAt: timestamp,
      })
      if (result.alreadyRecorded) {
        toast.message("Attendance already recorded")
      } else {
        toast.success("Attendance marked")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance")
    }
  }

  async function onUpdateAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!attendanceId) {
      toast.error("Attendance ID is required")
      return
    }
    const timestamp = toTimestampFromLocalDateTime(newScannedAt)
    if (!timestamp) {
      toast.error("Invalid timestamp")
      return
    }

    try {
      await updateAttendance({
        attendanceId: attendanceId as never,
        scannedAt: timestamp,
      })
      toast.success("Attendance updated")
      setAttendanceId("")
      setNewScannedAt("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update attendance")
    }
  }

  async function onDeleteAttendance(id: string) {
    try {
      await removeAttendance({ attendanceId: id as never })
      toast.success("Attendance removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove attendance")
    }
  }

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Attendance Management"
        description="View attendance records and manually adjust timestamps or entries."
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm">Event</span>
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            >
              <option value="">Select event</option>
              {sortedEvents.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={onManualMark} className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm">Participant email</span>
              <input
                type="email"
                value={lookupEmail}
                onChange={(event) => setLookupEmail(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
                placeholder="participant@example.com"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm">Scan time (optional)</span>
              <input
                type="datetime-local"
                value={manualScannedAt}
                onChange={(event) => setManualScannedAt(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:col-span-2"
            >
              Mark attendance
            </button>
          </form>

          <form onSubmit={onUpdateAttendance} className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm">Attendance ID</span>
              <input
                value={attendanceId}
                onChange={(event) => setAttendanceId(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
                placeholder="attendance document id"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm">New scan time</span>
              <input
                type="datetime-local"
                value={newScannedAt}
                onChange={(event) => setNewScannedAt(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border px-3 py-2 text-sm font-medium hover:border-primary sm:col-span-2"
            >
              Update timestamp
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Attendance ID</th>
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-left">Email</th>
                  <th className="px-2 py-2 text-left">Scanned At</th>
                  <th className="px-2 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {(attendanceRows ?? []).map((row) => (
                  <tr key={row.attendanceId} className="border-b">
                    <td className="px-2 py-2 font-mono text-xs">{row.attendanceId}</td>
                    <td className="px-2 py-2">{row.name}</td>
                    <td className="px-2 py-2">{row.email}</td>
                    <td className="px-2 py-2">{formatDateTime(row.scannedAt)}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onDeleteAttendance(row.attendanceId)}
                        className="rounded-md border px-2 py-1 text-xs hover:border-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="CSV Export" description="Export attendance sheet as CSV.">
        <button
          type="button"
          onClick={() => {
            if (!selectedEventId || !attendanceCsv) {
              toast.error("Select an event first")
              return
            }
            downloadCsv(`attendance-${selectedEventId}.csv`, attendanceCsv)
            toast.success("Attendance CSV downloaded")
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Download className="h-4 w-4" />
          Download attendance CSV
        </button>
      </SectionCard>
    </div>
  )
}
