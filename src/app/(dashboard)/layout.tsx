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
        {!isMobile && (
          <div className="hidden lg:flex lg:min-h-screen">
            <Sidebar isOpen={true} onToggle={handleSidebarToggle} />
            <div className="flex-1 flex flex-col min-w-0">
              <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
              <main className="flex-1 p-4">{children}</main>
            </div>
          </div>
        )}

        {/* Mobile: Header + content (sidebar is overlay above) */}
        {isMobile && (
          <div className="lg:hidden flex flex-col min-h-screen">
            <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
            <main className="flex-1 p-3">{children}</main>
          </div>
        )}
      </div>
    </QueryClientProvider>
  )
}