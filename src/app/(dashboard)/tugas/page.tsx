'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TugasHariIniPage from './hari-ini/page'

function TugasContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || 'hari-ini'

  if (view === 'semua') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Semua Tugas</h1>
            <p className="text-muted-foreground">Seluruh daftar tugas Anda</p>
          </div>
        </div>
      </div>
    )
  }

  return <TugasHariIniPage />
}

export default function TugasPage() {
  return (
    <Suspense fallback={null}>
      <TugasContent />
    </Suspense>
  )
}
