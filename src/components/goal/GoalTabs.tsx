import { cn } from "@/lib/utils"

export type GoalTab = "roadmap" | "progress" | "insight"

export function GoalTabs({
  active,
  onChange,
}: {
  active: GoalTab
  onChange: (t: GoalTab) => void
}) {
  const tabs: { key: GoalTab; label: string }[] = [
    { key: "roadmap", label: "Roadmap" },
    { key: "progress", label: "Progress Harian" },
    { key: "insight", label: "Insight" },
  ]
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
