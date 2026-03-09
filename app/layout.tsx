import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"
import "./globals.css"
import { Geist_Mono, Ubuntu as V0_Font_Ubuntu, Geist_Mono as V0_Font_Geist_Mono } from 'next/font/google'

// Initialize fonts
const _ubuntu = V0_Font_Ubuntu({ subsets: ['latin'], weight: ["300","400","500","700"] })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })

export const metadata: Metadata = {
  title: "Легенда об Искателях",
  description: "Система управления квест-франшизой",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
