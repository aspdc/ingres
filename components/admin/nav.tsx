"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChartNoAxesColumn, QrCode, ScanLine, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { SignOutButton } from "./sign-out-button"

const adminLinks = [
  { href: "/admin", label: "Overview", icon: ChartNoAxesColumn },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/attendance", label: "Attendance", icon: Users },
  { href: "/admin/scanner", label: "Scanner", icon: ScanLine },
  { href: "/admin/series", label: "Series", icon: QrCode },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-3">
      <nav>
        <ul className="grid gap-1">
          {adminLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t pt-3">
        <SignOutButton />
      </div>
    </div>
  )
}
