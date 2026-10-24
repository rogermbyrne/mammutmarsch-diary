import { Download, HardDrive, Info, RotateCcw, Share, Upload, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { exportPayload, validateData, type AppData } from '../lib/storage'
import type { Diary } from '../lib/useDiary'
import { ConfirmDialog } from './ConfirmDialog'
import { Card, SectionTitle } from './ui'

export function SettingsView({ diary, onToast }: { diary: Diary; onToast: (msg: string) => void }) {
  const { data } = diary
  const [name, setName] = useState(data.displayName)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const completedCount = Object.values(data.entries).filter((e) => e.completed).length

  const doExport = () => {
    try {
      const blob = new Blob([exportPayload(data)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      a.href = url
      a.download = `mammutmarsch-diary-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      onToast('Backup file downloaded')
    } catch {
      onToast('Sorry, the export did not work on this device')
    }
  }

  const onFile = async (file: File | undefined) => {
    setImportError(null)
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('That file is too large to be a diary backup.')
      const text = await file.text()
      let json: unknown
      try { json = JSON.parse(text) } catch { throw new Error('That file is not a valid backup (it is not JSON).') }
      setPendingImport(validateData(json))
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-[1.7rem] font-extrabold text-forest">Settings</h1>

      <SectionTitle>Your name</SectionTitle>
      <Card className="p-4">
        <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-forest"><User size={16} /> Display name</label>
        <div className="mt-2 flex gap-2">
          <input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your first name"
            className="h-12 min-w-0 flex-1 rounded-xl border border-ink/15 bg-paper px-3" />
          <button type="button" onClick={() => { diary.setName(name.trim()); onToast('Name saved') }}
            className="h-12 shrink-0 rounded-xl bg-forest px-5 font-semibold text-white">Save</button>
        </div>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card className="p-4">
        <div className="flex gap-3 rounded-2xl bg-sage/60 p-3 text-sm text-forest">
          <HardDrive className="mt-0.5 shrink-0" size={18} />
          <p>Your diary is saved automatically <strong>on this device, in this browser</strong>. It is not uploaded anywhere and does <strong>not</strong> sync to other phones or computers. Export a backup now and then to keep it safe.</p>
        </div>
        <p className="mt-3 text-sm text-ink/70">{completedCount} completed {completedCount === 1 ? 'walk' : 'walks'} saved{data.updatedAt ? `, last change ${new Date(data.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.</p>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={doExport} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-forest font-semibold text-white">
            <Download size={18} /> Export backup (JSON)
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl font-semibold text-forest ring-1 ring-forest/25">
            <Upload size={18} /> Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="import-input" />
          {importError && <p role="alert" className="rounded-xl bg-amber-soft p-3 text-sm font-medium text-amber-ink">{importError}</p>}
          <button type="button" onClick={() => setConfirmReset(true)} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl font-semibold text-red-700 ring-1 ring-red-700/30">
            <RotateCcw size={18} /> Reset all data
          </button>
        </div>
      </Card>

      <SectionTitle>Put it on your home screen</SectionTitle>
      <Card className="p-4 text-sm text-ink/80">
        <p className="flex gap-2"><Share className="mt-0.5 shrink-0 text-leaf" size={18} /> In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. The diary then opens full-screen like an app and works offline.</p>
        <p className="mt-2 flex gap-2"><Info className="mt-0.5 shrink-0 text-leaf" size={18} /> Always open the diary the same way (home screen icon, or Safari) so you see the same saved data.</p>
      </Card>

      <p className="mt-8 text-center text-xs text-ink/50">My Mammutmarsch Diary · No ads, no tracking, no account.</p>

      {pendingImport && (
        <ConfirmDialog
          title="Replace your diary?"
          message={`This backup has ${Object.values(pendingImport.entries).filter((e) => e.completed).length} completed walks. Importing will replace everything currently saved on this device.`}
          confirmLabel="Yes, import backup"
          onConfirm={() => { diary.replaceAll(pendingImport); setName(pendingImport.displayName); setPendingImport(null); onToast('Backup imported') }}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Reset all data?"
          message="This deletes every completed walk, note and setting on this device. Consider exporting a backup first. This cannot be undone."
          confirmLabel="Delete everything"
          danger
          onConfirm={() => { diary.reset(); setName(''); setConfirmReset(false); onToast('All data reset') }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
