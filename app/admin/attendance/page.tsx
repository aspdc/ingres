import { SectionCard } from "@/components/ui/section-card"

export default function AdminAttendancePage() {
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Attendance Management"
        description="View attendance records and manually adjust timestamps or entries."
      />
      <SectionCard
        title="CSV Export"
        description="Export event attendance sheets for reporting and archival."
      />
    </div>
  )
}
