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
        {/* Mobile sidebar overlay */}
        <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

        {/* Desktop layout: sidebar + header/content side by side */}
        <div className="hidden lg:flex lg:min-h-screen">
          {/* Desktop sidebar - always visible on lg+ */}
          <Sidebar isOpen={true} onToggle={handleSidebarToggle} />

          {/* Header + main content */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
            <main className="flex-1 p-4">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile layout: header + content (sidebar is overlay) */}
        <div className="lg:hidden flex flex-col min-h-screen">
          <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />
          <main className="flex-1 p-3">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  )
}