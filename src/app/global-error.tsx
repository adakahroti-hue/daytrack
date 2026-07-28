"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <html lang="id"><body /></html>
  }

  return (
    <html lang="id">
      <head>
        <title>Daytrack - Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Terjadi Kesalahan Global</h1>
          <p className="text-muted-foreground">
            Aplikasi mengalami kesalahan tak terduga. Silakan muat ulang halaman.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              Kembali ke Login
            </Button>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
