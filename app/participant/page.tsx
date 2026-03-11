"use client"

import { FormEvent, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { QRCodeSVG } from "qrcode.react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { formatDateTime } from "@/lib/date"
import { SectionCard } from "@/components/ui/section-card"
import { Shell } from "@/components/ui/shell"

export default function ParticipantPage() {
  const [emailInput, setEmailInput] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null)

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

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = emailInput.trim().toLowerCase()
    setEmail(normalized || null)
    setSelectedEventId(null)
  }

  return (
    <Shell
      title="Participant Portal"
      description="Find your event tickets, attendance history, and series progress."
    >
      <div className="grid gap-4">
        <SectionCard title="Ticket Access" description="Enter your email to retrieve events.">
          <form onSubmit={handleLookup} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Proceed
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Attendance Table"
          description="Attended, missed, and upcoming events."
        >
          {!email ? (
            <p className="text-sm text-muted-foreground">Enter an email to load your events.</p>
          ) : !events ? (
            <p className="text-sm text-muted-foreground">Loading events...</p>
          ) : safeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered events found.</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium">Event</th>
                      <th className="px-2 py-2 text-left font-medium">Status</th>
                      <th className="px-2 py-2 text-left font-medium">Scan Time</th>
                      <th className="px-2 py-2 text-left font-medium">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeEvents.map((eventItem) => (
                      <tr key={eventItem.eventId} className="border-b">
                        <td className="px-2 py-2">{eventItem.eventName}</td>
                        <td className="px-2 py-2">{eventItem.status}</td>
                        <td className="px-2 py-2">{formatDateTime(eventItem.scannedAt)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:border-primary"
                            onClick={() => setSelectedEventId(eventItem.eventId)}
                          >
                            Show QR
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedEventId ? (
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    QR ticket for {selectedEventName ?? "event"}
                  </p>
                  {!ticket ? (
                    <p className="text-sm text-muted-foreground">Loading ticket...</p>
                  ) : ticket.registered !== true ? (
                    <p className="text-sm text-muted-foreground">
                      You are not registered for this event.
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <QRCodeSVG value={ticket.token ?? ""} size={220} />
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
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
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
      </div>
    </Shell>
  )
}
