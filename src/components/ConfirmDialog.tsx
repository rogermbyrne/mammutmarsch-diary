import { useEffect, useRef } from 'react'

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-5" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h2 id="cd-title" className="text-xl font-bold text-forest">{title}</h2>
        <p className="mt-2 text-ink/80">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button ref={btn} type="button" onClick={onConfirm} className={`min-h-[52px] rounded-2xl px-4 font-semibold text-white ${danger ? 'bg-red-700' : 'bg-forest'}`}>{confirmLabel}</button>
          <button type="button" onClick={onCancel} className="min-h-[52px] rounded-2xl px-4 font-semibold text-forest ring-1 ring-forest/20">Cancel</button>
        </div>
      </div>
    </div>
  )
}
