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
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

        {/* Main content */}
        <div className={sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}>
          {/* Header */}
          <Header onMenuClick={handleSidebarToggle} onSidebarToggle={handleSidebarToggle} />

          {/* Page content */}
          <main className="pt-0 pb-3 lg:pb-4 px-3 lg:px-4">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  )
}