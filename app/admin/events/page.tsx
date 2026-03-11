"use client"

import { useMemo } from "react"
import { useMutation, useQuery } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import { formatDateTime, toTimestampFromLocalDateTime } from "@/lib/date"
import { SectionCard } from "@/components/ui/section-card"

const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim(),
    startTime: z.iso.datetime({ local: true, precision: -1 }),
    endTime: z.iso.datetime({ local: true, precision: -1 }),
    seriesId: z.string(),
  })
  .refine((value) => value.startTime < value.endTime, {
    path: ["endTime"],
    message: "End time must be after start time",
  })

const importCsvSchema = z.object({
  eventId: z.string().trim().min(1, "Event is required"),
  csv: z.string().trim().min(1, "CSV content is required"),
})

type CreateEventValues = z.infer<typeof createEventSchema>
type ImportCsvValues = z.infer<typeof importCsvSchema>

export default function AdminEventsPage() {
  const events = useQuery(api.events.getEvents)
  const series = useQuery(api.series.getSeries)
  const createEvent = useMutation(api.events.createEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)
  const importParticipantsCsv = useMutation(api.events.importParticipantsCSV)
  const createForm = useForm<CreateEventValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      seriesId: "",
    },
  })
  const importForm = useForm<ImportCsvValues>({
    resolver: zodResolver(importCsvSchema),
    defaultValues: {
      eventId: "",
      csv: "name,email",
    },
  })

  const sortedEvents = useMemo(
    () => (events ? [...events].sort((a, b) => a.start_time - b.start_time) : []),
    [events],
  )

  async function onCreateEvent(values: CreateEventValues) {
    const start = toTimestampFromLocalDateTime(values.startTime)
    const end = toTimestampFromLocalDateTime(values.endTime)
    if (!start || !end) {
      toast.error("Invalid event date/time")
      return
    }

    try {
      await createEvent({
        name: values.name.trim(),
        description: values.description.trim(),
        start_time: start,
        end_time: end,
        series_id: values.seriesId ? (values.seriesId as never) : undefined,
      })
      toast.success("Event created")
      createForm.reset()
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

  async function onImportCsv(values: ImportCsvValues) {
    try {
      const result = await importParticipantsCsv({
        eventId: values.eventId as never,
        csv: values.csv,
      })
      toast.success(`Imported ${result.importedCount} participants`)
      importForm.reset({
        eventId: values.eventId,
        csv: values.csv,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed")
    }
  }

  return (
    <div className="grid gap-4">
      <SectionCard title="Event Management" description="Create and remove events.">
        <form
          onSubmit={createForm.handleSubmit(onCreateEvent)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Name</span>
            <input
              {...createForm.register("name")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              placeholder="DL1"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Description</span>
            <textarea
              {...createForm.register("description")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              rows={2}
              placeholder="Deep Learning Session 1"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Start time</span>
            <input
              type="datetime-local"
              {...createForm.register("startTime")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">End time</span>
            <input
              type="datetime-local"
              {...createForm.register("endTime")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Series (optional)</span>
            <select
              {...createForm.register("seriesId")}
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
            disabled={createForm.formState.isSubmitting}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:col-span-2"
          >
            Create event
          </button>
        </form>
        {Object.values(createForm.formState.errors).length > 0 ? (
          <p className="mt-2 text-xs text-destructive">
            {createForm.formState.errors.name?.message ??
              createForm.formState.errors.startTime?.message ??
              createForm.formState.errors.endTime?.message}
          </p>
        ) : null}

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
        <form onSubmit={importForm.handleSubmit(onImportCsv)} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm">Event</span>
            <select
              {...importForm.register("eventId")}
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
              {...importForm.register("csv")}
              rows={8}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={importForm.formState.isSubmitting}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Import participants
          </button>
        </form>
        {Object.values(importForm.formState.errors).length > 0 ? (
          <p className="mt-2 text-xs text-destructive">
            {importForm.formState.errors.eventId?.message ??
              importForm.formState.errors.csv?.message}
          </p>
        ) : null}
      </SectionCard>
    </div>
  )
}
