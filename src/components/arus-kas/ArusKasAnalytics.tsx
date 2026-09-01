'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/utils'

interface ArusKasEntry {
  id: string
  user_id: string
  tanggal: string
  kategori: 'uang_masuk' | 'uang_keluar'
  nominal: number
  alasan: string | null
  dompet: 'kebutuhan' | 'tabungan' | 'self_reward' | 'sedekah' | 'paylater' | null
  klasifikasi: 'beli_makanan' | 'cemilan' | 'self_reward' | 'sedekah' | 'laundry' | 'bayar_kos' | 'ojek' | 'jajan' | 'pencuci_muka' | 'sabun' | 'galon_air' | 'pulsa' | 'gas_kompor' | 'pasta_gigi' | 'sembako' | 'obat_nyamuk' | 'lainnya' | null
  created_at: string
}

interface ArusKasAnalyticsProps {
  logs: ArusKasEntry[]
}

const KLASIFIKASI_LABEL: Record<string, string> = {
  beli_makanan: 'Beli Makanan',
  cemilan: 'Cemilan',
  self_reward: 'Self Reward',
  sedekah: 'Sedekah',
  laundry: 'Laundry',
  bayar_kos: 'Bayar Kos',
  ojek: 'Ojek',
  jajan: 'Jajan',
  pencuci_muka: 'Pencuci Muka',
  sabun: 'Sabun',
  galon_air: 'Galon Air',
  pulsa: 'Pulsa',
  gas_kompor: 'Gas Kompor',
  pasta_gigi: 'Pasta Gigi',
  sembako: 'Sembako',
  obat_nyamuk: 'Obat Nyamuk',
  lainnya: 'Lainnya',
}

const PASTEL_DONUT_COLORS = [
  '#FDA4AF',
  '#93C5FD',
  '#FCD34D',
  '#86EFAC',
  '#C4B5FD',
  '#7DD3FC',
  '#FDBA74',
  '#A5B4FC',
  '#F9A8D4',
]

const RADIAN = Math.PI / 180

const renderDonutLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, payload, percent } = props
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const text = payload?.labelValue ?? `${Math.round((payload?.percent ?? percent ?? 0) * 100)}%`
  if (!text) return null
  return (
    <text x={x} y={y} fill="#ffffff" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
      {text}
    </text>
  )
}

function AnalyticsCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col gap-3 min-w-0">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A] leading-tight">
        {title}
      </h3>
      <div className="min-h-[200px]">{children}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center px-4">
      <p className="text-xs text-slate-400">Belum ada data pada periode ini.</p>
    </div>
  )
}

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {children}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-500">{formatRupiah(d.value)}</p>
      <p className="font-medium text-slate-700">{d.percent}%</p>
    </TooltipShell>
  )
}

// Gabungkan kategori langka (mis. "Lainnya") hanya bila slice sudah sangat banyak,
// agar kategori bernilai kecil tetap muncul di legend而不是 semua dimasukkan ke Lainnya
function aggregate(values: { name: string; value: number }[], maxSlices = 12) {
  const sorted = [...values].sort((a, b) => b.value - a.value)
  if (sorted.length <= maxSlices) return sorted
  const top = sorted.slice(0, maxSlices - 1)
  const rest = sorted.slice(maxSlices - 1).reduce((s, v) => s + v.value, 0)
  return [...top, { name: 'Lainnya', value: rest }]
}

export function ArusKasAnalytics({ logs }: ArusKasAnalyticsProps) {
  const keluarByKlasifikasi = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of logs as ArusKasEntry[]) {
      if (l.kategori !== 'uang_keluar') continue
      const key = l.klasifikasi ? (KLASIFIKASI_LABEL[l.klasifikasi] ?? l.klasifikasi) : 'Belum diklasifikasi'
      map.set(key, (map.get(key) || 0) + l.nominal)
    }
    return aggregate([...map.entries()].map(([name, value]) => ({ name, value })))
  }, [logs])

  const masukBySumber = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of logs as ArusKasEntry[]) {
      if (l.kategori !== 'uang_masuk') continue
      const key = (l.alasan && l.alasan.trim()) || 'Tanpa sumber'
      map.set(key, (map.get(key) || 0) + l.nominal)
    }
    return aggregate([...map.entries()].map(([name, value]) => ({ name, value })))
  }, [logs])

  const totalKeluar = keluarByKlasifikasi.reduce((s, v) => s + v.value, 0)
  const totalMasuk = masukBySumber.reduce((s, v) => s + v.value, 0)

  const chartData = (arr: { name: string; value: number }[], total: number) =>
    arr.map(a => ({
      ...a,
      percent: total > 0 ? Math.round((a.value / total) * 100) : 0,
      labelValue: total > 0 ? `${Math.round((a.value / total) * 100)}%` : '',
    }))

  const keluarData = chartData(keluarByKlasifikasi, totalKeluar)
  const masukData = chartData(masukBySumber, totalMasuk)

  const hasKeluar = keluarData.length > 0
  const hasMasuk = masukData.length > 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      {/* Uang keluar per klasifikasi */}
      <AnalyticsCard title="Uang Keluar ke Mana Saja">
        {hasKeluar ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-[46%] min-w-[150px]">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Tooltip content={<PieTooltip />} />
                  <Pie
                    data={keluarData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={0}
                    outerRadius={78}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#ffffff"
                    labelLine={false}
                    label={renderDonutLabel}
                    isAnimationActive
                    animationDuration={500}
                  >
                    {keluarData.map((entry, i) => (
                      <Cell key={entry.name} fill={PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
              {keluarData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate">{r.name}</span>
                  <span className="ml-auto font-medium text-slate-700 whitespace-nowrap">{formatRupiah(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </AnalyticsCard>

      {/* Uang masuk per sumber */}
      <AnalyticsCard title="Sumber Uang Dari Mana Saja">
        {hasMasuk ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-[46%] min-w-[150px]">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Tooltip content={<PieTooltip />} />
                  <Pie
                    data={masukData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={0}
                    outerRadius={78}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#ffffff"
                    labelLine={false}
                    label={renderDonutLabel}
                    isAnimationActive
                    animationDuration={500}
                  >
                    {masukData.map((entry, i) => (
                      <Cell key={entry.name} fill={PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
              {masukData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate">{r.name}</span>
                  <span className="ml-auto font-medium text-slate-700 whitespace-nowrap">{formatRupiah(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </AnalyticsCard>
    </div>
  )
}
