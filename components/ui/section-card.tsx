import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-medium sm:text-lg">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  )
}
