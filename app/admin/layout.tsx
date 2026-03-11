import { ReactNode } from "react"

import { AdminNav } from "@/components/admin/nav"
import { Shell } from "@/components/ui/shell"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Shell title="Admin Dashboard" description="Manage events, attendance, and participants.">
      <AdminNav />
      {children}
    </Shell>
  )
}
