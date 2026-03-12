"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { CheckCircle2, Eye, EyeOff, QrCode, TableProperties } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { formatDateTime } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { Shell } from "@/components/ui/shell"

const participantLookupSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
})

type ParticipantLookupValues = z.infer<typeof participantLookupSchema>

export default function ParticipantPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null)
  const [activeView, setActiveView] = useState<"participation" | "tickets" | "series">(
    "participation",
  )
  const lookupForm = useForm<ParticipantLookupValues>({
    resolver: zodResolver(participantLookupSchema),
    defaultValues: { email: "" },
  })

  const events = useQuery(
    api.events.getParticipantEvents,
    email ? { email } : "skip",
  )
  const seriesProgress = useQuery(
    api.series.getSeriesProgress,
    email ? { email } : "skip",
  )
  const ticket = useQuery(
    api.qr.getParticipantTicket,
    email && selectedEventId ? { email, eventId: selectedEventId } : "skip",
  )
  const safeEvents = useMemo(
    () => (events ?? []).filter((event): event is NonNullable<typeof event> => event !== null),
    [events],
  )

  const selectedEventName = useMemo(() => {
    if (!selectedEventId || !safeEvents) {
      return null
    }
    return safeEvents.find((event) => event.eventId === selectedEventId)?.eventName ?? null
  }, [safeEvents, selectedEventId])
  const attendedCount = useMemo(
    () => safeEvents.filter((event) => event.status === "Attended").length,
    [safeEvents],
  )

  function handleLookup(values: ParticipantLookupValues) {
    setEmail(values.email || null)
    setSelectedEventId(null)
    setActiveView("participation")
  }

  return (
    <Shell
      title="Ingres by ASPDC"
      description="Find your event tickets, attendance history, and series progress for ASPDC events"
      headerAction={
        <Button asChild variant="outline">
          <Link href="/admin">Admin</Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        <SectionCard title="Ticket Access" description="Enter your email to retrieve events.">
          <form
            onSubmit={lookupForm.handleSubmit(handleLookup)}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="email"
              {...lookupForm.register("email")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={lookupForm.formState.isSubmitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Proceed
            </button>
          </form>
          {lookupForm.formState.errors.email ? (
            <p className="mt-2 text-xs text-destructive">
              {lookupForm.formState.errors.email.message}
            </p>
          ) : null}
        </SectionCard>

        {email ? (
          <SectionCard
            title="Portal Navigation"
            description="Switch between participation history, QR tickets, and series progress."
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveView("participation")}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                  activeView === "participation"
                    ? "bg-primary text-primary-foreground"
                    : "hover:border-primary"
                }`}
              >
                <TableProperties className="h-4 w-4" />
                Participation
              </button>
              <button
                type="button"
                onClick={() => setActiveView("tickets")}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                  activeView === "tickets"
                    ? "bg-primary text-primary-foreground"
                    : "hover:border-primary"
                }`}
              >
                <QrCode className="h-4 w-4" />
                Tickets
              </button>
              <button
                type="button"
                onClick={() => setActiveView("series")}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                  activeView === "series"
                    ? "bg-primary text-primary-foreground"
                    : "hover:border-primary"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Series progress
              </button>
            </div>
          </SectionCard>
        ) : null}

        {activeView !== "series" ? (
          <SectionCard
            title="Participation Details"
            description="Attended, missed, and upcoming events with optional ticket access."
          >
            {!email ? (
              <p className="text-sm text-muted-foreground">Enter an email to load your events.</p>
            ) : !events ? (
              <p className="text-sm text-muted-foreground">Loading events...</p>
            ) : safeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registered events found.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border px-2 py-1">Total events: {safeEvents.length}</span>
                  <span className="rounded-full border px-2 py-1">Attended: {attendedCount}</span>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-2 py-2 text-left font-medium">Event</th>
                        <th className="px-2 py-2 text-left font-medium">Status</th>
                        <th className="px-2 py-2 text-left font-medium">Scan Time</th>
                        {activeView === "tickets" ? (
                          <th className="px-2 py-2 text-left font-medium">Ticket</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {safeEvents.map((eventItem) => {
                        const isSelected = selectedEventId === eventItem.eventId
                        return (
                          <tr key={eventItem.eventId} className="border-b">
                            <td className="px-2 py-2">{eventItem.eventName}</td>
                            <td className="px-2 py-2">{eventItem.status}</td>
                            <td className="px-2 py-2">{formatDateTime(eventItem.scannedAt)}</td>
                            {activeView === "tickets" ? (
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:border-primary"
                                  onClick={() =>
                                    setSelectedEventId(isSelected ? null : eventItem.eventId)
                                  }
                                >
                                  {isSelected ? (
                                    <>
                                      <EyeOff className="h-3.5 w-3.5" />
                                      Hide QR
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3.5 w-3.5" />
                                      Show QR
                                    </>
                                  )}
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {activeView === "tickets" && selectedEventId ? (
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        QR ticket for {selectedEventName ?? "event"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(null)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:border-primary"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Hide QR
                      </button>
                    </div>
                    {!ticket ? (
                      <p className="text-sm text-muted-foreground">Loading ticket...</p>
                    ) : ticket.registered !== true ? (
                      <p className="text-sm text-muted-foreground">
                        You are not registered for this event.
                      </p>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <QRCodeSVG value={ticket.token ?? ""} size={280} includeMargin />
                        <p className="text-center text-xs text-muted-foreground">
                          Valid until {formatDateTime(ticket.event?.endTime)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeView === "series" ? (
          <SectionCard
            title="Series Progress"
            description="Track certificate eligibility for each series."
          >
            {!email ? (
              <p className="text-sm text-muted-foreground">Enter an email to load progress.</p>
            ) : !seriesProgress ? (
              <p className="text-sm text-muted-foreground">Loading series progress...</p>
            ) : seriesProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No series progress found.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-2 text-left font-medium">Series</th>
                      <th className="px-2 py-2 text-left font-medium">Attendance</th>
                      <th className="px-2 py-2 text-left font-medium">Required Event</th>
                      <th className="px-2 py-2 text-left font-medium">Eligible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seriesProgress.map((item) => (
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
                        <td className="px-2 py-2">{item.eligible ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>
    </Shell>
  )
}
