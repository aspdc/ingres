"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import { downloadTextFile } from "@/lib/download"
import { SectionCard } from "@/components/ui/section-card"

const createSeriesSchema = z.object({
  name: z.string().trim().min(1, "Series name is required"),
  description: z.string().trim(),
  minEventsRequired: z
    .number()
    .int()
    .min(1, "Minimum events must be at least 1"),
  requiredEventId: z.string(),
})

const progressLookupSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
})

type CreateSeriesValues = z.infer<typeof createSeriesSchema>
type ProgressLookupValues = z.infer<typeof progressLookupSchema>

export default function AdminSeriesPage() {
  const events = useQuery(api.events.getEvents)
  const series = useQuery(api.series.getSeries)
  const createSeries = useMutation(api.series.createSeries)
  const updateSeries = useMutation(api.series.updateSeries)
  const [selectedSeriesId, setSelectedSeriesId] = useState("")
  const [participantEmail, setParticipantEmail] = useState<string | null>(null)
  const progress = useQuery(
    api.series.getSeriesProgress,
    participantEmail ? { email: participantEmail } : "skip"
  )
  const certificatesCsv = useQuery(
    api.exports.exportCertificatesCSV,
    selectedSeriesId ? { seriesId: selectedSeriesId as never } : {}
  )

  const sortedEvents = useMemo(
    () =>
      events ? [...events].sort((a, b) => a.start_time - b.start_time) : [],
    [events]
  )
  const selectedSeries =
    (series ?? []).find((item) => item._id === selectedSeriesId) ?? null

  const createForm = useForm<CreateSeriesValues>({
    resolver: zodResolver(createSeriesSchema),
    defaultValues: {
      name: "",
      description: "",
      minEventsRequired: 1,
      requiredEventId: "",
    },
  })
  const progressForm = useForm<ProgressLookupValues>({
    resolver: zodResolver(progressLookupSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onCreateSeries(values: CreateSeriesValues) {
    try {
      await createSeries({
        name: values.name,
        description: values.description,
        min_events_required: values.minEventsRequired,
        required_event_id: values.requiredEventId
          ? (values.requiredEventId as never)
          : undefined,
      })
      toast.success("Series created")
      createForm.reset({
        name: "",
        description: "",
        minEventsRequired: 1,
        requiredEventId: "",
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create series"
      )
    }
  }

  async function onUpdateSeries(values: CreateSeriesValues) {
    if (!selectedSeriesId) {
      toast.error("Select a series to update")
      return
    }

    try {
      await updateSeries({
        seriesId: selectedSeriesId as never,
        name: values.name,
        description: values.description,
        min_events_required: values.minEventsRequired,
        required_event_id: values.requiredEventId
          ? (values.requiredEventId as never)
          : undefined,
        clear_required_event: values.requiredEventId === "",
      })
      toast.success("Series updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update series"
      )
    }
  }

  function onLookupProgress(values: ProgressLookupValues) {
    setParticipantEmail(values.email)
  }

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Series Configuration"
        description="Create or update series rules for certificate eligibility."
      >
        <label className="mb-3 block space-y-1">
          <span className="text-sm">Select existing series (optional)</span>
          <select
            value={selectedSeriesId}
            onChange={(event) => {
              const nextId = event.target.value
              setSelectedSeriesId(nextId)
              const item =
                (series ?? []).find((entry) => entry._id === nextId) ?? null
              if (item) {
                createForm.reset({
                  name: item.name,
                  description: item.description,
                  minEventsRequired: item.min_events_required,
                  requiredEventId: item.required_event_id ?? "",
                })
              }
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
          >
            <option value="">Create new series</option>
            {(series ?? []).map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <form className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Series name</span>
            <input
              {...createForm.register("name")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              placeholder="Deep Learning Series"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm">Description</span>
            <textarea
              {...createForm.register("description")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
              rows={2}
              placeholder="Certificate series for DL workshops"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Minimum events required</span>
            <input
              type="number"
              min={1}
              {...createForm.register("minEventsRequired", {
                valueAsNumber: true,
              })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">Required event (optional)</span>
            <select
              {...createForm.register("requiredEventId")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            >
              <option value="">None</option>
              {sortedEvents.map((event) => (
                <option key={event._id} value={event._id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={createForm.handleSubmit(onCreateSeries)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Create series
            </button>
            <button
              type="button"
              onClick={createForm.handleSubmit(onUpdateSeries)}
              disabled={!selectedSeries}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Update selected series
            </button>
          </div>
        </form>
        {Object.values(createForm.formState.errors).length > 0 ? (
          <p className="mt-2 text-xs text-destructive">
            {createForm.formState.errors.name?.message ??
              createForm.formState.errors.minEventsRequired?.message}
          </p>
        ) : null}
      </SectionCard>
      <SectionCard
        title="Eligibility Preview"
        description="Review participant progress and eligibility per series."
      >
        <form
          onSubmit={progressForm.handleSubmit(onLookupProgress)}
          className="mb-3 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="email"
            {...progressForm.register("email")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary"
            placeholder="participant@example.com"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Load progress
          </button>
        </form>
        {progressForm.formState.errors.email ? (
          <p className="mb-2 text-xs text-destructive">
            {progressForm.formState.errors.email.message}
          </p>
        ) : null}

        {!participantEmail ? (
          <p className="text-sm text-muted-foreground">
            Enter an email to preview eligibility.
          </p>
        ) : !progress ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : progress.length === 0 ? (
          <p className="text-sm text-muted-foreground">No progress found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-2 text-left">Series</th>
                  <th className="px-2 py-2 text-left">Attended</th>
                  <th className="px-2 py-2 text-left">Required Event</th>
                  <th className="px-2 py-2 text-left">Eligible</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((item) => (
                  <tr key={item.seriesId} className="border-b">
                    <td className="px-2 py-2">{item.seriesName}</td>
                    <td className="px-2 py-2">
                      {item.attendedCount}/{item.minEventsRequired}
                    </td>
                    <td className="px-2 py-2">
                      {item.requiredEventName
                        ? `${item.requiredEventName} (${item.hasRequiredEvent ? "done" : "missing"})`
                        : "None"}
                    </td>
                    <td className="px-2 py-2">
                      {item.eligible ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Certificate Export"
        description="Download CSV for all series or currently selected series."
      >
        <button
          type="button"
          onClick={() => {
            if (!certificatesCsv) {
              toast.error("Certificate export is loading")
              return
            }
            const filename = selectedSeriesId
              ? `certificates-${selectedSeriesId}.csv`
              : "certificates-all-series.csv"
            downloadTextFile({
              filename,
              content: certificatesCsv,
              mimeType: "text/csv;charset=utf-8;",
            })
            toast.success("Certificate CSV downloaded")
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Download className="h-4 w-4" />
          Download certificates CSV
        </button>
      </SectionCard>
    </div>
  )
}
