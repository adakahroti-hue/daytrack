"use client"

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Header */}
          <Header onMenuClick={() => setMobileNavOpen(true)} />

          {/* Page content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>

        {/* Mobile Navigation Drawer */}
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>
    </QueryClientProvider>
  )
}