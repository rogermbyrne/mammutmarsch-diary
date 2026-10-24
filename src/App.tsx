import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { BottomNav, type Tab } from './components/BottomNav'
import { DiaryView } from './components/DiaryView'
import { PrintSchedule } from './components/PrintSchedule'
import { ProgressView } from './components/ProgressView'
import { SettingsView } from './components/SettingsView'
import { TodayView } from './components/TodayView'
import { WalkSheet } from './components/WalkSheet'
import { SESSION_BY_ID } from './lib/plan'
import { useDiary, useToday } from './lib/useDiary'

export default function App() {
  const diary = useDiary()
  const today = useToday()
  const [tab, setTab] = useState<Tab>('today')
  const [openId, setOpenId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => setToast(msg), [])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const changeTab = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }) }
  const closeSheet = useCallback(() => setOpenId(null), [])

  return (
    <>
      <div className="nav-pad mx-auto min-h-screen w-full max-w-lg overflow-x-hidden print:hidden">
        {diary.error && (
          <div role="alert" className="pt-safe sticky top-0 z-20 flex items-start gap-2 bg-amber-soft p-3 text-sm text-amber-ink">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{diary.error}</span>
            <button type="button" aria-label="Dismiss" onClick={() => diary.setError(undefined)} className="-m-2 p-2"><X size={18} /></button>
          </div>
        )}
        <main>
          {tab === 'today' && <TodayView diary={diary} today={today} onOpen={setOpenId} onGoDiary={() => changeTab('diary')} />}
          {tab === 'diary' && <DiaryView diary={diary} today={today} onOpen={setOpenId} onPrint={() => window.print()} />}
          {tab === 'progress' && <ProgressView diary={diary} today={today} />}
          {tab === 'settings' && <SettingsView diary={diary} onToast={showToast} />}
        </main>
      </div>
      <BottomNav tab={tab} onChange={changeTab} />
      {openId && SESSION_BY_ID[openId] && <WalkSheet key={openId} id={openId} diary={diary} today={today} onClose={closeSheet} />}
      {toast && (
        <div role="status" className="anim-fade fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft print:hidden">
          {toast}
        </div>
      )}
      <PrintSchedule data={diary.data} />
    </>
  )
}
