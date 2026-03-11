"use client"

import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import { formatDateTime, toTimestampFromLocalDateTime } from "@/lib/date"
import { SectionCard } from "@/components/ui/section-card"

export default function AdminEventsPage() {
  const events = useQuery(api.events.getEvents)
  const series = useQuery(api.series.getSeries)
  const createEvent = useMutation(api.events.createEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)
  const importParticipantsCsv = useMutation(api.events.importParticipantsCSV)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [seriesId, setSeriesId] = useState("")
  const [csvEventId, setCsvEventId] = useState("")
  const [csv, setCsv] = useState("name,email")

  const sortedEvents = useMemo(
    () => (events ? [...events].sort((a, b) => a.start_time - b.start_time) : []),
    [events],
  )

  async function onCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const start = toTimestampFromLocalDateTime(startTime)
    const end = toTimestampFromLocalDateTime(endTime)
    if (!start || !end) {
      toast.error("Invalid event date/time")
      return
    }

    try {
      await createEvent({
        name: name.trim(),
        description: description.trim(),
        start_time: start,
        end_time: end,
        series_id: seriesId ? (seriesId as never) : undefined,
      })
      toast.success("Event created")
      setName("")
      setDescription("")
      setStartTime("")
      setEndTime("")
      setSeriesId("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event")
    }
  }

  async function onDeleteEvent(eventId: string) {
    try {
      await deleteEvent({ eventId: eventId as never })
      toast.success("Event deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    }
  }

  async function onImportCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!csvEventId) {
      toast.error("Select an event for CSV import")
      return
    }
    try {
      const result = await importParticipantsCsv({
        eventId: csvEventId as never,
        csv,
      })
      toast.success(`Imported ${result.importedCount} participants`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed")
    }
  }

  return (
    <div className="grid gap-4">
      <SectionCard title="Event Management" description="Create and remove events.">
        <form onSubmit={onCreateEvent} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              placeholder="DL1"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              rows={2}
              placeholder="Deep Learning Session 1"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Start time</span>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">End time</span>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Series (optional)</span>
            <select
              value={seriesId}
              onChange={(event) => setSeriesId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            >
              <option value="">No series</option>
              {(series ?? []).map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:col-span-2"
          >
            Create event
          </button>
        </form>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Event</th>
                <th className="px-2 py-2 text-left">Start</th>
                <th className="px-2 py-2 text-left">End</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2">{formatDateTime(item.start_time)}</td>
                  <td className="px-2 py-2">{formatDateTime(item.end_time)}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(item._id)}
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
      </SectionCard>

      <SectionCard
        title="CSV Participant Import"
        description="Upload participants for one event in a single mutation."
      >
        <form onSubmit={onImportCsv} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm">Event</span>
            <select
              value={csvEventId}
              onChange={(event) => setCsvEventId(event.target.value)}
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
          <label className="block space-y-1">
            <span className="text-sm">CSV</span>
            <textarea
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              rows={8}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Import participants
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
