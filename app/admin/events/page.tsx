"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  formatDateTime,
  toLocalDateTimeInputValue,
  toTimestampFromLocalDateTime,
} from "@/lib/date"
import { downloadTextFile } from "@/lib/download"
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
  csv: z.string().trim().min(1, "CSV content is required"),
})

const editEventSchema = z
  .object({
    eventId: z.string().trim().min(1, "Event is required"),
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

const addParticipantSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email().transform((value) => value.trim().toLowerCase()),
})

const editParticipantSchema = z.object({
  participantId: z.string().trim().min(1, "Participant is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  attendanceStatus: z.enum(["attended", "not_attended"]),
})

type CreateEventValues = z.infer<typeof createEventSchema>
type ImportCsvValues = z.infer<typeof importCsvSchema>
type EditEventValues = z.infer<typeof editEventSchema>
type AddParticipantValues = z.infer<typeof addParticipantSchema>
type EditParticipantValues = z.infer<typeof editParticipantSchema>

export default function AdminEventsPage() {
  const events = useQuery(api.events.getEvents)
  const series = useQuery(api.series.getSeries)
  const createEvent = useMutation(api.events.createEvent)
  const updateEvent = useMutation(api.events.updateEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)
  const importParticipantsCsv = useMutation(api.events.importParticipantsCSV)
  const registerParticipantForEvent = useMutation(
    api.events.registerParticipantForEvent
  )
  const removeParticipantFromEvent = useMutation(
    api.events.removeParticipantFromEvent
  )
  const setParticipantAttendanceStatus = useMutation(
    api.events.setParticipantAttendanceStatus
  )
  const setBulkParticipantAttendanceStatus = useMutation(
    api.events.setBulkParticipantAttendanceStatus
  )
  const updateParticipant = useMutation(api.participants.updateParticipant)
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("")
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    Id<"participants">[]
  >([])
  const [participantSort, setParticipantSort] = useState<
    "attended_first" | "not_attended_first"
  >("attended_first")
  const participantEditFormRef = useRef<HTMLFormElement | null>(null)

  const eventParticipants = useQuery(
    api.events.getEventParticipants,
    selectedEventId ? { eventId: selectedEventId as Id<"events"> } : "skip"
  )

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
      csv: "name,email",
    },
  })
  const editForm = useForm<EditEventValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      eventId: "",
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      seriesId: "",
    },
  })
  const addParticipantForm = useForm<AddParticipantValues>({
    resolver: zodResolver(addParticipantSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })
  const editParticipantForm = useForm<EditParticipantValues>({
    resolver: zodResolver(editParticipantSchema),
    defaultValues: {
      participantId: "",
      name: "",
      email: "",
      attendanceStatus: "not_attended",
    },
  })

  const sortedEvents = useMemo(
    () =>
      events ? [...events].sort((a, b) => a.start_time - b.start_time) : [],
    [events]
  )
  const selectedEvent =
    sortedEvents.find((item) => item._id === selectedEventId) ?? null
  const selectedParticipant =
    (eventParticipants ?? []).find(
      (item) => item.participantId === selectedParticipantId
    ) ?? null
  const sortedEventParticipants = useMemo(() => {
    const rows = [...(eventParticipants ?? [])]
    return rows.sort((a, b) => {
      if (a.attended === b.attended) {
        return a.name.localeCompare(b.name)
      }
      return participantSort === "attended_first"
        ? Number(b.attended) - Number(a.attended)
        : Number(a.attended) - Number(b.attended)
    })
  }, [eventParticipants, participantSort])
  const allVisibleParticipantIds = useMemo(
    () => sortedEventParticipants.map((item) => item.participantId),
    [sortedEventParticipants]
  )
  const allVisibleSelected =
    allVisibleParticipantIds.length > 0 &&
    allVisibleParticipantIds.every((id) => selectedParticipantIds.includes(id))

  useEffect(() => {
    if (!selectedEvent) {
      return
    }
    editForm.reset({
      eventId: selectedEvent._id,
      name: selectedEvent.name,
      description: selectedEvent.description,
      startTime: toLocalDateTimeInputValue(selectedEvent.start_time),
      endTime: toLocalDateTimeInputValue(selectedEvent.end_time),
      seriesId: selectedEvent.series_id ?? "",
    })
  }, [selectedEvent, editForm])

  useEffect(() => {
    if (!selectedParticipant) {
      return
    }
    editParticipantForm.reset({
      participantId: selectedParticipant.participantId,
      name: selectedParticipant.name,
      email: selectedParticipant.email,
      attendanceStatus: selectedParticipant.attended
        ? "attended"
        : "not_attended",
    })
  }, [selectedParticipant, editParticipantForm])

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
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      )
    }
  }

  async function onDeleteEvent(eventId: string) {
    try {
      await deleteEvent({ eventId: eventId as never })
      toast.success("Event deleted")
      if (selectedEventId === eventId) {
        setSelectedEventId("")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      )
    }
  }

  async function onImportCsv(values: ImportCsvValues) {
    if (!selectedEventId) {
      toast.error("Select an event first")
      return
    }
    try {
      const result = await importParticipantsCsv({
        eventId: selectedEventId as never,
        csv: values.csv,
      })
      toast.success(`Imported ${result.importedCount} participants`)
      importForm.reset({ csv: values.csv })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed")
    }
  }

  async function onEditEvent(values: EditEventValues) {
    const start = toTimestampFromLocalDateTime(values.startTime)
    const end = toTimestampFromLocalDateTime(values.endTime)
    if (!start || !end) {
      toast.error("Invalid event date/time")
      return
    }
    try {
      await updateEvent({
        eventId: values.eventId as Id<"events">,
        name: values.name,
        description: values.description,
        start_time: start,
        end_time: end,
        series_id: values.seriesId
          ? (values.seriesId as Id<"series">)
          : undefined,
      })
      toast.success("Event updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      )
    }
  }

  async function onAddParticipant(values: AddParticipantValues) {
    if (!selectedEventId) {
      toast.error("Select an event first")
      return
    }
    try {
      await registerParticipantForEvent({
        eventId: selectedEventId as Id<"events">,
        name: values.name,
        email: values.email,
      })
      toast.success("Participant added to event")
      addParticipantForm.reset({
        name: "",
        email: "",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add participant"
      )
    }
  }

  async function onEditParticipant(values: EditParticipantValues) {
    if (!selectedEventId) {
      toast.error("Select an event first")
      return
    }
    try {
      await updateParticipant({
        participantId: values.participantId as Id<"participants">,
        name: values.name,
        email: values.email,
      })
      await setParticipantAttendanceStatus({
        eventId: selectedEventId as Id<"events">,
        participantId: values.participantId as Id<"participants">,
        attended: values.attendanceStatus === "attended",
      })
      toast.success("Participant updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update participant"
      )
    }
  }

  async function onRemoveParticipant(participantId: Id<"participants">) {
    if (!selectedEventId) {
      return
    }
    try {
      await removeParticipantFromEvent({
        eventId: selectedEventId as Id<"events">,
        participantId,
      })
      toast.success("Participant removed from event")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove participant"
      )
    }
  }

  async function onBulkUpdateAttendance(attended: boolean) {
    if (!selectedEventId) {
      toast.error("Select an event first")
      return
    }
    const selectedVisibleIds = selectedParticipantIds.filter((id) =>
      allVisibleParticipantIds.includes(id)
    )
    if (selectedVisibleIds.length === 0) {
      toast.error("Select at least one participant")
      return
    }

    try {
      const result = await setBulkParticipantAttendanceStatus({
        eventId: selectedEventId as Id<"events">,
        participantIds: selectedVisibleIds,
        attended,
      })
      if (result.skippedCount > 0) {
        toast.warning(
          `Updated ${result.updatedCount} participants (${result.skippedCount} skipped)`
        )
      } else {
        toast.success(
          attended
            ? `Marked ${result.updatedCount} participants as attended`
            : `Marked ${result.updatedCount} participants as not attended`
        )
      }
      setSelectedParticipantIds([])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update selected participants"
      )
    }
  }

  function toggleParticipantSelection(participantId: Id<"participants">) {
    setSelectedParticipantIds((current) => {
      if (current.includes(participantId)) {
        return current.filter((id) => id !== participantId)
      }
      return [...current, participantId]
    })
  }

  function toggleSelectAllVisible() {
    if (allVisibleParticipantIds.length === 0) {
      return
    }
    setSelectedParticipantIds((current) => {
      const currentSet = new Set(current)
      const shouldSelectAll = !allVisibleParticipantIds.every((id) =>
        currentSet.has(id)
      )
      if (!shouldSelectAll) {
        return current.filter((id) => !allVisibleParticipantIds.includes(id))
      }
      const merged = new Set(current)
      for (const id of allVisibleParticipantIds) {
        merged.add(id)
      }
      return Array.from(merged)
    })
  }

  function handleEditParticipantClick(participantId: Id<"participants">) {
    setSelectedParticipantId(participantId)
    requestAnimationFrame(() => {
      participantEditFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  function toCsvCell(value: string) {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replaceAll('"', '""')}"`
    }
    return value
  }

  function exportParticipantsCsv(type: "present" | "absent" | "all") {
    if (!selectedEventId) {
      toast.error("Select an event first")
      return
    }
    const filteredRows = sortedEventParticipants.filter((row) => {
      if (type === "all") {
        return true
      }
      return type === "present" ? row.attended : !row.attended
    })
    if (filteredRows.length === 0) {
      toast.message(
        type === "present"
          ? "No present participants found"
          : type === "absent"
            ? "No absent participants found"
            : "No participants found"
      )
      return
    }

    const csvRows = [
      "name,email,status,scanned_at",
      ...filteredRows.map((row) =>
        [
          toCsvCell(row.name),
          toCsvCell(row.email),
          row.attended ? "present" : "absent",
          row.scannedAt ? toCsvCell(new Date(row.scannedAt).toISOString()) : "",
        ].join(",")
      ),
    ].join("\n")

    const eventLabel = (selectedEvent?.name ?? selectedEventId)
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
    downloadTextFile({
      filename: `${eventLabel}-${type}-participants.csv`,
      content: csvRows,
      mimeType: "text/csv;charset=utf-8;",
    })
    toast.success(
      type === "present"
        ? "Present participants CSV downloaded"
        : type === "absent"
          ? "Absent participants CSV downloaded"
          : "All participants CSV downloaded"
    )
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Event Directory"
        description="Pick an active event, review schedule, or remove unused events."
      >
        <label className="mb-4 block space-y-1">
          <span className="text-sm">Active event</span>
          <select
            value={selectedEventId}
            onChange={(event) => {
              setSelectedEventId(event.target.value)
              setSelectedParticipantIds([])
            }}
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

        {selectedEvent ? (
          <p className="mb-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            Active event:{" "}
            <span className="font-medium">{selectedEvent.name}</span>
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
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
                  <td className="px-2 py-2">
                    {formatDateTime(item.start_time)}
                  </td>
                  <td className="px-2 py-2">{formatDateTime(item.end_time)}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(item._id)}
                        className="rounded-md border px-2 py-1 text-xs hover:border-primary"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(item._id)}
                        className="rounded-md border px-2 py-1 text-xs hover:border-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Create Event"
        description="Create a new event record."
      >
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
      </SectionCard>

      <SectionCard
        title="Edit Event Details"
        description="Update details for the selected event."
      >
        {!selectedEventId ? (
          <p className="text-sm text-muted-foreground">
            Select an event in step 1 first.
          </p>
        ) : null}

        <form
          onSubmit={editForm.handleSubmit(onEditEvent)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" {...editForm.register("eventId")} />
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Name</span>
            <input
              {...editForm.register("name")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Description</span>
            <textarea
              {...editForm.register("description")}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Start time</span>
            <input
              type="datetime-local"
              {...editForm.register("startTime")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">End time</span>
            <input
              type="datetime-local"
              {...editForm.register("endTime")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Series</span>
            <select
              {...editForm.register("seriesId")}
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
            disabled={!selectedEventId || editForm.formState.isSubmitting}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            Save event changes
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Event Participants"
        description="Add, edit, or remove participant entries for an event."
      >
        <label className="mb-3 block space-y-1">
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

        <form
          onSubmit={addParticipantForm.handleSubmit(onAddParticipant)}
          className="grid gap-2 sm:grid-cols-3"
        >
          <input
            {...addParticipantForm.register("name")}
            placeholder="Participant name"
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          />
          <input
            type="email"
            {...addParticipantForm.register("email")}
            placeholder="Participant email"
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          />
          <button
            type="submit"
            disabled={
              !selectedEventId || addParticipantForm.formState.isSubmitting
            }
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add participant
          </button>
        </form>

        <form
          ref={participantEditFormRef}
          onSubmit={editParticipantForm.handleSubmit(onEditParticipant)}
          className="mt-4 grid gap-2 rounded-md border p-3 sm:grid-cols-4"
        >
          <label className="space-y-1 sm:col-span-4">
            <span className="text-xs">Participant details</span>
            <select
              value={selectedParticipantId}
              onChange={(event) => setSelectedParticipantId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            >
              <option value="">Select participant</option>
              {sortedEventParticipants.map((item) => (
                <option key={item.participantId} value={item.participantId}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <input
            type="hidden"
            {...editParticipantForm.register("participantId")}
          />
          <input
            {...editParticipantForm.register("name")}
            placeholder="Updated name"
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          />
          <input
            type="email"
            {...editParticipantForm.register("email")}
            placeholder="Updated email"
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          />
          <select
            {...editParticipantForm.register("attendanceStatus")}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          >
            <option value="not_attended">Not attended</option>
            <option value="attended">Attended</option>
          </select>
          <button
            type="submit"
            disabled={
              !selectedParticipantId ||
              editParticipantForm.formState.isSubmitting
            }
            className="rounded-md border px-3 py-2 text-sm font-medium hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save participant
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={participantSort}
            onChange={(event) =>
              setParticipantSort(
                event.target.value as "attended_first" | "not_attended_first"
              )
            }
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          >
            <option value="attended_first">Sort: Attended first</option>
            <option value="not_attended_first">Sort: Not attended first</option>
          </select>
          <button
            type="button"
            onClick={() => exportParticipantsCsv("present")}
            className="rounded-md border px-3 py-2 text-sm hover:border-primary"
          >
            Export present CSV
          </button>
          <button
            type="button"
            onClick={() => exportParticipantsCsv("absent")}
            className="rounded-md border px-3 py-2 text-sm hover:border-primary"
          >
            Export absent CSV
          </button>
          <button
            type="button"
            onClick={() => exportParticipantsCsv("all")}
            className="rounded-md border px-3 py-2 text-sm hover:border-primary"
          >
            Export all CSV
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            Selected: {selectedParticipantIds.length}
          </span>
          <button
            type="button"
            onClick={() => onBulkUpdateAttendance(true)}
            disabled={!selectedEventId || selectedParticipantIds.length === 0}
            className="rounded-md border px-3 py-2 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark selected present
          </button>
          <button
            type="button"
            onClick={() => onBulkUpdateAttendance(false)}
            disabled={!selectedEventId || selectedParticipantIds.length === 0}
            className="rounded-md border px-3 py-2 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark selected absent
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="min-w-full border-collapse text-sm select-text">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-2 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all participants"
                  />
                </th>
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Email</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Scanned</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedEventParticipants.map((item, index) => (
                <tr key={item.registrationId} className="border-b">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(
                        item.participantId
                      )}
                      onChange={() =>
                        toggleParticipantSelection(item.participantId)
                      }
                      aria-label={`Select ${item.name}`}
                    />
                  </td>
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2">{item.email}</td>
                  <td className="px-2 py-2">
                    {item.attended ? "Attended" : "Not attended"}
                  </td>
                  <td className="px-2 py-2">
                    {formatDateTime(item.scannedAt)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleEditParticipantClick(item.participantId)
                        }
                        className="rounded-md border px-2 py-1 text-xs hover:border-primary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveParticipant(item.participantId)}
                        className="rounded-md border px-2 py-1 text-xs hover:border-destructive"
                      >
                        Remove
                      </button>
                    </div>
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
        <form
          onSubmit={importForm.handleSubmit(onImportCsv)}
          className="space-y-3"
        >
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
            {importForm.formState.errors.csv?.message}
          </p>
        ) : null}
      </SectionCard>
    </div>
  )
}
