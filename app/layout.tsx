import { Space_Grotesk } from 'next/font/google'
import type { Metadata } from 'next'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})


export const metadata: Metadata = {
  title: 'Ingres by ASPDC',
  description: 'Smoother attendance for participants and fewer spreadhsheets for ASPDC volunteers',
}

export default function RootLayout({
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
