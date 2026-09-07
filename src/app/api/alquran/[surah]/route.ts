import { NextRequest, NextResponse } from "next/server"

// Proxy ke equran.id — data Alquran resmi (teks Arab, terjemahan) + tafsir per ayat.
// Di-fetch server-side supaya tidak kena CORS & bisa di-cache.
export const revalidate = 86400 // cache 1 hari

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surah: string }> }
) {
  const { surah } = await params
  try {
    const [surahRes, tafsirRes] = await Promise.all([
      fetch(`https://equran.id/api/v2/surat/${surah}`, { next: { revalidate: 86400 } }),
      fetch(`https://equran.id/api/v2/tafsir/${surah}`, { next: { revalidate: 86400 } }),
    ])

    if (!surahRes.ok) {
      return NextResponse.json({ error: "Gagal mengambil data surah" }, { status: surahRes.status })
    }

    const surahJson = await surahRes.json()
    const surahData = surahJson.data

    // Gabungkan tafsir ke tiap ayat (jika endpoint tafsir tersedia)
    let tafsirMap: Record<number, string> = {}
    if (tafsirRes.ok) {
      const tafsirJson = await tafsirRes.json()
      const list = tafsirJson.data?.tafsir || []
      for (const t of list) tafsirMap[t.ayat] = t.teks
    }

    if (Array.isArray(surahData.ayat)) {
      surahData.ayat = surahData.ayat.map((a: any) => ({
        ...a,
        tafsir: tafsirMap[a.nomorAyat] ? [{ ayat: a.nomorAyat, teks: tafsirMap[a.nomorAyat] }] : [],
      }))
    }

    return NextResponse.json(
      { data: surahData },
      {
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      }
    )
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
