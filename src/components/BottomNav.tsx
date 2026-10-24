import { BarChart3, BookOpen, Settings, Sun } from 'lucide-react'

export type Tab = 'today' | 'diary' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', Icon: Sun },
  { id: 'diary', label: 'Diary', Icon: BookOpen },
  { id: 'progress', label: 'Progress', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-forest/10 bg-white/95 backdrop-blur print:hidden" aria-label="Main">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? 'text-forest' : 'text-ink/50'}`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-sage' : ''}`}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
