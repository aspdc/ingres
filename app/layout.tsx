import { Space_Grotesk } from "next/font/google"
import type { Metadata } from "next"
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import "./globals.css"
import { ConvexClientProvider } from "./ConvexClientProvider"
import { Toaster } from "sonner"

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ingres by ASPDC",
  description:
    "Smoother attendance for participants and fewer spreadhsheets for ASPDC volunteers",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.className} overflow-x-hidden antialiased select-none`}
    >
      <body>
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            {children}
            <Toaster richColors closeButton />
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
