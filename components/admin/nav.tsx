import { SignOutButton } from "./sign-out-button"

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/scanner", label: "Scanner" },
]

export function AdminNav() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="overflow-x-auto pb-1">
        <ul className="flex min-w-max gap-2">
          {adminLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex rounded-md border px-3 py-1.5 text-sm transition hover:border-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <SignOutButton />
    </div>
  )
}
