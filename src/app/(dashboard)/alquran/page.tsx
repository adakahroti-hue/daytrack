"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, ArrowLeft, Search, BookMarked, ChevronRight, ChevronLeft, Bookmark, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAlquranBookmark } from "@/hooks/useAlquranBookmark"
import { useHeaderControls } from "@/components/layout/HeaderControls"

type SurahMeta = {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
}

type Ayat = {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  tafsir: { ayat: number; teks: string }[]
}

type SurahDetail = {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  ayat: Ayat[]
}

const TOTAL_SURAH = 114
const PAGE = 5
const LIST_CACHE_KEY = "alquran-list-v1"

// Cache client-side: daftar surah (kecil, ~30KB) & detail per surah (ayat+tafsir).
// Bertahan selama tab browser terbuka — pindah tab Alquran→lain→Alquran instan.
function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function cacheSet(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* storage penuh — abaikan, fallback fetch */
  }
}

export default function AlquranPage() {
  const [list, setList] = useState<SurahMeta[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<SurahDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [query, setQuery] = useState("")

  const { alquranMode: mode, setAlquranMode: setMode } = useHeaderControls()

  // Mode mengaji state
  const [curSurah, setCurSurah] = useState(1)
  const [curAyat, setCurAyat] = useState(1) // ayat mulai chunk
  const [fullAyat, setFullAyat] = useState<Ayat[]>([])
  const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(null)
  const [loadingAyat, setLoadingAyat] = useState(false)

  const bookmark = useAlquranBookmark()
  const [bookmarkPos, setBookmarkPos] = useState<{ surah: number; ayat: number } | null>(null)

  useEffect(() => {
    if (bookmark.data) setBookmarkPos(bookmark.data)
  }, [bookmark.data])

  // Default: begitu halaman terbuka, langsung muat posisi terakhir baca (bookmark).
  // Kalau belum ada bookmark, mulai dari Al-Fatihah ayat 1.
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (autoLoaded.current) return
    // bookmark.data === undefined masih loading; null = benar-benar tidak ada
    if (bookmark.isLoading) return
    autoLoaded.current = true
    const b = bookmark.data || { surah: 1, ayat: 1 }
    loadSurahFull(b.surah, b.ayat)
  }, [bookmark.isLoading, bookmark.data])

  useEffect(() => {
    const cached = cacheGet<SurahMeta[]>(LIST_CACHE_KEY)
    if (cached?.length) {
      setList(cached)
      setLoadingList(false)
      return
    }
    fetch("https://equran.id/api/v2/surat")
      .then((r) => r.json())
      .then((j) => {
        setList(j.data || [])
        cacheSet(LIST_CACHE_KEY, j.data || [])
      })
      .finally(() => setLoadingList(false))
  }, [])

  const openSurah = async (nomor: number) => {
    const cacheKey = `alquran-detail-v1-${nomor}`
    const cached = cacheGet<SurahDetail>(cacheKey)
    if (cached) {
      setSelected(nomor)
      setDetail(cached)
      return
    }
    setSelected(nomor)
    setLoadingDetail(true)
    setDetail(null)
    const res = await fetch(`/api/alquran/${nomor}`)
    const json = await res.json()
    setDetail(json.data)
    if (json.data) cacheSet(cacheKey, json.data)
    setLoadingDetail(false)
  }

  const loadSurahFull = async (surah: number, startAyat = 1) => {
    // cek cache dulu — surah yang pernah dibuka langsung tampil
    const cacheKey = `alquran-detail-v1-${surah}`
    const cached = cacheGet<SurahDetail>(cacheKey)
    if (cached) {
      setSurahMeta(cached)
      setFullAyat(cached.ayat || [])
      setCurSurah(surah)
      setCurAyat(startAyat)
      setLoadingAyat(false)
      return
    }
    setLoadingAyat(true)
    const surahRes = await fetch(`/api/alquran/${surah}`).then((r) => r.json())
    setSurahMeta(surahRes.data)
    setFullAyat(surahRes.data.ayat || [])
    if (surahRes.data) cacheSet(cacheKey, surahRes.data)
    setCurSurah(surah)
    setCurAyat(startAyat)
    setLoadingAyat(false)
  }

  const startMengaji = async () => {
    const b = bookmarkPos || { surah: 1, ayat: 1 }
    setMode("mengaji")
    await loadSurahFull(b.surah, b.ayat)
  }

  const goPrev = () => {
    let ns = curSurah
    let na = curAyat - PAGE
    if (na < 1) {
      if (curSurah <= 1) {
        na = 1
      } else {
        ns = curSurah - 1
        // ke akhir surah sebelumnya
        na = Math.max(1, (list.find((s) => s.nomor === ns)?.jumlahAyat || 1) - PAGE + 1)
        loadSurahFull(ns, na)
        return
      }
    }
    setCurAyat(na)
  }

  const goNext = () => {
    const total = surahMeta?.jumlahAyat || fullAyat.length
    let ns = curSurah
    let na = curAyat + PAGE
    if (na > total) {
      if (curSurah >= TOTAL_SURAH) {
        na = total
      } else {
        ns = curSurah + 1
        na = 1
        loadSurahFull(ns, 1)
        return
      }
    }
    setCurAyat(na)
  }

  const jumpToSurah = (surah: number) => {
    loadSurahFull(surah, 1)
  }

  const markAyat = (ayat: number) => {
    const pos = { surah: curSurah, ayat }
    setBookmarkPos(pos)
    bookmark.save.mutate(pos)
  }

  // Prefetch: setelah surah aktif termuat, muat diam-diam surah berikutnya di
  // belakang layar — begitu pengguna klik "Berikutnya" data sudah siap.
  const prefetched = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (loadingAyat || !fullAyat.length) return
    const next = curSurah < TOTAL_SURAH ? curSurah + 1 : null
    if (!next || prefetched.current.has(next)) return
    prefetched.current.add(next)
    fetch(`/api/alquran/${next}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) cacheSet(`alquran-detail-v1-${next}`, j.data)
      })
      .catch(() => {})
  }, [curSurah, loadingAyat, fullAyat.length])

  const filtered = list.filter(
    (s) =>
      s.namaLatin.toLowerCase().includes(query.toLowerCase()) ||
      s.arti.toLowerCase().includes(query.toLowerCase()) ||
      s.nomor.toString() === query
  )

  const chunk = fullAyat.slice(curAyat - 1, curAyat - 1 + PAGE)

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="sm:hidden flex gap-2">
        <ButtonLite active={mode === "pilih"} onClick={() => setMode("pilih")}>
          Pilih Surah
        </ButtonLite>
        <ButtonLite active={mode === "mengaji"} onClick={startMengaji}>
          <BookMarked className="h-4 w-4" /> Mode Mengaji
        </ButtonLite>
      </div>

      {mode === "pilih" ? (
        selected === null ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari surah (nama / arti / nomor)"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
            </div>
            {loadingList ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Memuat daftar surah…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((s) => (
                  <button
                    key={s.nomor}
                    onClick={() => openSurah(s.nomor)}
                    className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">{s.nomor}</span>
                      <span className="text-right text-lg font-arabic text-slate-900" dir="rtl">
                        {s.nama}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{s.namaLatin}</p>
                    <p className="text-xs text-slate-500">
                      {s.arti} · {s.jumlahAyat} ayat · {s.tempatTurun}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Daftar Surah
            </button>
            {loadingDetail || !detail ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Memuat surah…
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-center">
                  <p className="text-xl font-bold text-slate-900" dir="rtl">
                    {detail.nama}
                  </p>
                  <p className="text-sm text-slate-600">
                    {detail.namaLatin} · {detail.arti} · {detail.jumlahAyat} ayat
                  </p>
                </div>
                {detail.ayat.map((a) => (
                  <AyatCard key={a.nomorAyat} a={a} />
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        // MODE MENGAJI
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {surahMeta?.namaLatin} ({surahMeta?.arti})
              </p>
              <p className="text-xs text-slate-500">
                Surah {curSurah} · ayat {curAyat}–{Math.min(curAyat + PAGE - 1, surahMeta?.jumlahAyat || 0)} dari {surahMeta?.jumlahAyat}
              </p>
            </div>
            {bookmarkPos && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <BookMarked className="h-3.5 w-3.5" /> Terakhir: {bookmarkPos.surah}:{bookmarkPos.ayat}
              </span>
            )}
          </div>

          {/* Navigasi surah cepat */}
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {list.slice(0, 30).map((s) => (
              <button
                key={s.nomor}
                onClick={() => jumpToSurah(s.nomor)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs border",
                  curSurah === s.nomor
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {s.nomor}
              </button>
            ))}
            {list.length > 30 && <span className="text-xs text-slate-400 self-center">…</span>}
          </div>

          {loadingAyat ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Memuat…
            </div>
          ) : (
            <div className="space-y-4">
              {chunk.map((a) => (
                <AyatCard
                  key={a.nomorAyat}
                  a={a}
                  highlight={bookmarkPos?.surah === curSurah && bookmarkPos?.ayat === a.nomorAyat}
                  onMark={markAyat}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={goPrev}
              disabled={loadingAyat || (curSurah === 1 && curAyat === 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </button>

            <button
              onClick={goNext}
              disabled={loadingAyat || (curSurah >= TOTAL_SURAH && curAyat + PAGE - 1 >= (surahMeta?.jumlahAyat || 0))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] text-white px-4 py-2 text-sm font-medium hover:bg-[#1E293B] disabled:opacity-50"
            >
              Berikutnya <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AyatCard({
  a,
  highlight,
  onMark,
}: {
  a: Ayat
  highlight?: boolean
  onMark?: (ayat: number) => void
}) {
  const [showTafsir, setShowTafsir] = useState(false)
  const hasTafsir = !!a.tafsir?.[0]?.teks

  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-4 py-4 shadow-sm space-y-2",
        highlight ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
            highlight ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
          )}
        >
          {a.nomorAyat}
        </span>
        <p className="flex-1 text-right text-3xl leading-loose text-slate-900 font-arabic" dir="rtl">
          {a.teksArab}
        </p>
      </div>
      <p className="text-sm italic text-slate-500">{a.teksLatin}</p>
      <p className="text-sm text-slate-800">{a.teksIndonesia}</p>
      {hasTafsir && (
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setShowTafsir(!showTafsir)}
            aria-expanded={showTafsir}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {showTafsir ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showTafsir ? "Sembunyikan Pelajaran" : "Pelajaran dari Ayat"}
          </button>
          {showTafsir && (
            <div className="mt-2 space-y-2 text-sm text-slate-600 leading-relaxed">
              {a.tafsir[0].teks
                .split(/\n+/)
                .map((line: string, i: number) =>
                  line.trim() ? <p key={i}>{line.trim()}</p> : null
                )}
            </div>
          )}
        </div>
      )}
      {onMark && (
        <div className="border-t border-slate-100 pt-2 flex justify-end">
          <button
            onClick={() => onMark(a.nomorAyat)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              highlight
                ? "bg-emerald-500 text-white"
                : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <Bookmark className="h-3.5 w-3.5" /> Tandai sebagai terakhir baca
          </button>
        </div>
      )}
    </div>
  )
}

function ButtonLite({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 text-slate-700 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  )
}
