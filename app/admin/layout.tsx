import { ReactNode } from "react"

import { AdminNav } from "@/components/admin/nav"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage events, attendance, scanner operations, and series eligibility.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AdminNav />
        </aside>
        <section className="space-y-5">{children}</section>
      </div>
    </main>
  )
}
