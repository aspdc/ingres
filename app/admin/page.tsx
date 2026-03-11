import { SectionCard } from "@/components/ui/section-card"

export default function AdminOverviewPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SectionCard
        title="Event Operations"
        description="Create, update, and assign events to series with CSV registration."
      />
      <SectionCard
        title="Attendance Ops"
        description="Mark attendance, correct records, and export attendance sheets."
      />
      <SectionCard
        title="Series Certificates"
        description="Configure certificate rules and monitor participant eligibility."
      />
      <SectionCard
        title="Scanner Workflow"
        description="Use mobile-friendly QR scanning and receive instant scan feedback."
      />
    </div>
  )
}
