"use client"

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useIsMobile } from '@/hooks/useMediaQuery'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      })
  )

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // On mobile, sidebar is an overlay controlled by sidebarOpen
  // On desktop, sidebar is always visible (sidebarOpen controls collapse)
  const isSidebarVisible = isMobile ? sidebarOpen : true

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Mobile: Sidebar overlay */}
        {isMobile && (
          <>
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
          </>
        )}

        {/* Desktop: Sidebar + main content side by side */}
        <div className={isMobile ? '' : (sidebarOpen ? 'lg:pl-64' : 'lg:pl-16')}>
          {/* Header - always rendered */}
          <Header
            onMenuClick={handleSidebarToggle}
            onSidebarToggle={handleSidebarToggle}
          />

          {/* Page content */}
          <main className="pt-0 pb-4 px-3 lg:px-4">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  )
}