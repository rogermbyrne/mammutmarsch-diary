import { Component, type ReactNode } from 'react'
import { STORAGE_KEY } from '../lib/storage'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    const download = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? '{}'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
        a.download = 'mammutmarsch-diary-rescue.json'
        a.click()
      } catch { /* ignore */ }
    }
    return (
      <div className="min-h-screen bg-paper p-6 pt-16 text-ink">
        <h1 className="text-2xl font-bold text-forest">Oops, something went wrong</h1>
        <p className="mt-3">Your saved walks are safe on this device. Try reloading the app.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button className="rounded-2xl bg-forest px-5 py-4 font-semibold text-white" onClick={() => location.reload()}>Reload</button>
          <button className="rounded-2xl border border-forest/30 px-5 py-4 font-semibold text-forest" onClick={download}>Download a backup of my data</button>
        </div>
      </div>
    )
  }
}
