"use client"

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { HeaderControlsProvider } from '@/components/layout/HeaderControls'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mobile: sidebar open/closed (overlay drawer)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Desktop: sidebar collapsed/expanded
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HeaderControlsProvider>
        <div className="min-h-screen bg-background">
          {/* Mobile overlay backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar — single instance, handles both mobile drawer and desktop collapse */}
          <Sidebar
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            desktopCollapsed={desktopCollapsed}
            onToggleDesktop={() => setDesktopCollapsed(!desktopCollapsed)}
          />

          {/* Main content — offset by sidebar width on desktop only */}
          <div
            className={
              "flex min-h-screen flex-col transition-[padding] duration-300 " +
              (desktopCollapsed ? "lg:pl-16" : "lg:pl-64")
            }
          >
            <Header onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 p-4">
              {children}
            </main>
          </div>
        </div>
      </HeaderControlsProvider>
    </QueryClientProvider>
  )
}
