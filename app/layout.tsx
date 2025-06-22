import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { NotificationProvider } from "@/components/notification-provider"
import { AlertProvider } from "@/contexts/alert-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Keller PLM Dashboard",
  description: "Product Lifecycle Management Dashboard for Keller MEA",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AlertProvider>
            <NotificationProvider>
              {children}
              <Toaster
                position="top-right"
                expand={true}
                richColors
                closeButton
                toastOptions={{
                  style: {
                    background: "white",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                  },
                  className: "notification-toast",
                  duration: 8000,
                }}
              />
            </NotificationProvider>
          </AlertProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
