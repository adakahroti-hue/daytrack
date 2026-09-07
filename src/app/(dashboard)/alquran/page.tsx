"use client"

import { useEffect, useState } from "react"
import { BookOpen, ArrowLeft, Search, BookMarked, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAlquranBookmark } from "@/hooks/useAlquranBookmark"

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

export default function AlquranPage() {
  const [list, setList] = useState<SurahMeta[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [mode, setMode] = useState<"pilih" | "mengaji">("pilih")
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<SurahDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [query, setQuery] = useState("")

  // Mode mengaji state
  const [curSurah, setCurSurah] = useState(1)
  const [curAyat, setCurAyat] = useState(1)
  const [ayatData, setAyatData] = useState<Ayat | null>(null)
  const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(null)
  const [loadingAyat, setLoadingAyat] = useState(false)

  const bookmark = useAlquranBookmark()

  useEffect(() => {
    fetch("https://equran.id/api/v2/surat")
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoadingList(false))
  }, [])

  const openSurah = async (nomor: number) => {
    setSelected(nomor)
    setLoadingDetail(true)
    setDetail(null)
    const res = await fetch(`/api/alquran/${nomor}`)
    const json = await res.json()
    setDetail(json.data)
    setLoadingDetail(false)
  }

  const loadAyat = async (surah: number, ayat: number) => {
    setLoadingAyat(true)
    setAyatData(null)
    const [metaRes, surahRes] = await Promise.all([
      fetch(`https://equran.id/api/v2/surat/${surah}`).then((r) => r.json()),
      fetch(`/api/alquran/${surah}`).then((r) => r.json()),
    ])
    const meta: SurahMeta = metaRes.data
    const surahDetail: SurahDetail = surahRes.data
    const found = surahDetail.ayat.find((a) => a.nomorAyat === ayat) || surahDetail.ayat[0]
    setSurahMeta(meta)
    setAyatData(found || null)
    setLoadingAyat(false)
  }

  const startMengaji = async () => {
    const b = bookmark.data || { surah: 1, ayat: 1 }
    setCurSurah(b.surah)
    setCurAyat(b.ayat)
    setMode("mengaji")
    await loadAyat(b.surah, b.ayat)
  }

  const nextAyat = async () => {
    let ns = curSurah
    let na = curAyat + 1
    if (curAyat >= (surahMeta?.jumlahAyat || 1)) {
      if (curSurah >= TOTAL_SURAH) return // sudah selesai semua
      ns = curSurah + 1
      na = 1
    }
    setCurSurah(ns)
    setCurAyat(na)
    await loadAyat(ns, na)
    bookmark.save.mutate({ surah: ns, ayat: na })
  }

  const filtered = list.filter(
    (s) =>
      s.namaLatin.toLowerCase().includes(query.toLowerCase()) ||
      s.arti.toLowerCase().includes(query.toLowerCase()) ||
      s.nomor.toString() === query
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-slate-700" /> Alquran
          </h1>
          <p className="mt-1 text-sm text-slate-500">Baca Alquran 30 juz lengkap dengan terjemahan dan tafsir.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLite active={mode === "pilih"} onClick={() => setMode("pilih")}>
            Pilih Surah
          </ButtonLite>
          <ButtonLite active={mode === "mengaji"} onClick={startMengaji}>
            <BookMarked className="h-4 w-4" /> Mode Mengaji
          </ButtonLite>
        </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {surahMeta?.namaLatin} ({surahMeta?.arti})
              </p>
              <p className="text-xs text-slate-500">
                Surah {curSurah} · Ayat {curAyat} dari {surahMeta?.jumlahAyat}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <BookMarked className="h-3.5 w-3.5" /> Terakhir baca tersimpan
            </span>
          </div>

          {loadingAyat || !ayatData ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Memuat ayat…
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-sm space-y-3 text-center">
              <p className="text-xs font-semibold text-slate-400">Ayat {ayatData.nomorAyat}</p>
              <p className="text-3xl leading-loose text-slate-900 font-arabic" dir="rtl">
                {ayatData.teksArab}
              </p>
              <p className="text-sm italic text-slate-500">{ayatData.teksLatin}</p>
              <p className="text-sm text-slate-800">{ayatData.teksIndonesia}</p>
              {ayatData.tafsir?.[0]?.teks && (
                <div className="border-t border-slate-100 pt-2 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">
                    Pelajaran dari Ayat
                  </p>
                  <p
                    className="text-sm text-slate-600 leading-relaxed text-left"
                    dangerouslySetInnerHTML={{ __html: ayatData.tafsir[0].teks }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={nextAyat}
              disabled={loadingAyat || (curSurah >= TOTAL_SURAH && curAyat >= (surahMeta?.jumlahAyat || 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#1E293B] disabled:opacity-50"
            >
              Ayat Berikutnya <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AyatCard({ a }: { a: Ayat }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-2">
      <div className="flex items-start gap-3">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {a.nomorAyat}
        </span>
        <p className="flex-1 text-right text-2xl leading-loose text-slate-900 font-arabic" dir="rtl">
          {a.teksArab}
        </p>
      </div>
      <p className="text-sm italic text-slate-500">{a.teksLatin}</p>
      <p className="text-sm text-slate-800">{a.teksIndonesia}</p>
      {a.tafsir?.[0]?.teks && (
        <div className="border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">
            Pelajaran dari Ayat
          </p>
          <p
            className="text-sm text-slate-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: a.tafsir[0].teks }}
          />
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
