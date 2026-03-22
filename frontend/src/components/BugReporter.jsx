import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../api/client'

export default function BugReporter() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('write') // 'write' or 'list'
  const [message, setMessage] = useState('')
  const [bugs, setBugs] = useState([])
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const { showToast } = useToast()

  const fetchBugs = async () => {
    try {
      const data = await api.get('/api/bugs')
      setBugs(data)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (open && view === 'list') fetchBugs()
  }, [open, view])

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await api.post('/api/bugs', { message: message.trim() })
      setMessage('')
      showToast('Bug reported, thanks!', 'success')
      setView('list')
      fetchBugs()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async (id) => {
    try {
      await api.patch(`/api/bugs/${id}/resolve`)
      fetchBugs()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/bugs/${id}`)
      fetchBugs()
      showToast('Deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const timeAgo = (iso) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 bg-slate-700 dark:bg-slate-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.135c-.117-1.693-.86-3.28-2.055-4.36m-5 9.055c-2.883 0-5.647.508-8.207 1.44a23.91 23.91 0 001.152-6.135c.117-1.693.86-3.28 2.055-4.36M12 12.75V9m0 0c0-1.036.291-2.005.795-2.828M12 9a3.75 3.75 0 00-.795-2.828m.795 2.828a3.726 3.726 0 01-.795-2.828M12 9c0-1.036-.291-2.005-.795-2.828" />
        </svg>
        {bugs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {bugs.filter(b => b.status === 'open').length || ''}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[60vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex gap-1">
            <button
              onClick={() => setView('write')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                view === 'write'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Report
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                view === 'list'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Bugs
            </button>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {view === 'write' ? (
          /* Write mode */
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Found something off? Describe it below.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What went wrong?"
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Submit Bug Report'}
            </button>
          </div>
        ) : (
          /* List mode */
          <div className="overflow-y-auto flex-1">
            {bugs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No bugs reported yet</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {bugs.map(bug => (
                  <div key={bug.id} className={`px-4 py-3 ${bug.status === 'resolved' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words">
                          {bug.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">{bug.username}</span>
                          <span className="text-[11px] text-slate-300 dark:text-slate-600">&middot;</span>
                          <span className="text-[11px] text-slate-400">{timeAgo(bug.created_at)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            bug.status === 'open'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {bug.status}
                          </span>
                        </div>
                      </div>
                      {user?.is_admin && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleResolve(bug.id)}
                            title={bug.status === 'open' ? 'Mark resolved' : 'Reopen'}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(bug.id)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
