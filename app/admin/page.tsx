import { SectionCard } from "@/components/ui/section-card"

export default function AdminOverviewPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SectionCard title="Event Operations" description="Manage events and CSV registrations.">
        <a href="/admin/events" className="text-sm text-primary underline underline-offset-4">
          Open Events
        </a>
      </SectionCard>
      <SectionCard
        title="Attendance Ops"
        description="Mark, edit, remove attendance and export sheets."
      >
        <a
          href="/admin/attendance"
          className="text-sm text-primary underline underline-offset-4"
        >
          Open Attendance
        </a>
      </SectionCard>
      <SectionCard
        title="Series Certificates"
        description="Configure rules and export certificate eligibility CSV."
      >
        <a href="/admin/series" className="text-sm text-primary underline underline-offset-4">
          Open Series
        </a>
      </SectionCard>
      <SectionCard
        title="Scanner Workflow"
        description="Use camera scan with instant attendance feedback."
      >
        <a href="/admin/scanner" className="text-sm text-primary underline underline-offset-4">
          Open Scanner
        </a>
      </SectionCard>
    </div>
  )
}
