"use client"

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
        {/* Mobile sidebar overlay - hidden on desktop */}
        <div className="lg:hidden">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
        </div>

        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:flex lg:min-h-screen">
          <Sidebar isOpen={true} onToggle={handleSidebarToggle} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
            <main className="flex-1 p-4">{children}</main>
          </div>
        </div>

        {/* Mobile header + content - hidden on desktop */}
        <div className="lg:hidden flex flex-col min-h-screen">
          <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
          <main className="flex-1 p-3">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  )
}