export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Ingres</h1>
      <p className="max-w-2xl text-muted-foreground">
        Serverless event attendance and certificate eligibility platform.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/participant"
          className="rounded-lg border p-4 transition hover:border-primary"
        >
          <p className="font-medium">Participant Portal</p>
          <p className="text-sm text-muted-foreground">
            View tickets, attendance, and series progress.
          </p>
        </a>

        <a
          href="/admin"
          className="rounded-lg border p-4 transition hover:border-primary"
        >
          <p className="font-medium">Admin Dashboard</p>
          <p className="text-sm text-muted-foreground">
            Manage events, attendance, participants, and scanning.
          </p>
        </a>
      </div>
    </div>
  )
}
