import { ReactNode } from "react"

export function Shell({
  title,
  description,
  headerAction,
  children,
}: {
  title: string
  description?: string
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>
      {children}
    </main>
  )
}
