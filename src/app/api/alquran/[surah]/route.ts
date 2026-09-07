import { NextRequest, NextResponse } from "next/server"

// Proxy ke equran.id — data Alquran resmi (teks Arab, terjemahan, tafsir).
// Di-fetch server-side supaya tidak kena CORS & bisa di-cache.
export const revalidate = 86400 // cache 1 hari

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surah: string }> }
) {
  const { surah } = await params
  try {
    const res = await fetch(`https://equran.id/api/v2/surat/${surah}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: "Gagal mengambil data surah" }, { status: res.status })
    }
    const json = await res.json()
    return NextResponse.json(json, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    })
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
