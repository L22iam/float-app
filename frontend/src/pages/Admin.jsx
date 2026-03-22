import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../utils/constants'
import api from '../api/client'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)
  const { user: me } = useAuth()
  const { showToast } = useToast()

  const fetchUsers = async () => {
    try {
      const data = await api.get('/api/admin/users')
      setUsers(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleExpand = async (uid) => {
    if (expanded === uid) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(uid)
    try {
      const data = await api.get(`/api/admin/users/${uid}/dashboard`)
      setDetail(data)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (uid) => {
    if (!confirm('Delete this user and all their data?')) return
    try {
      await api.delete(`/api/admin/users/${uid}`)
      showToast('User deleted', 'success')
      fetchUsers()
      if (expanded === uid) { setExpanded(null); setDetail(null) }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-4 space-y-4 animate-pulse">
        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-36" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>

      <div className="space-y-3">
        {users.map(u => {
          const isExpanded = expanded === u.id
          const status = u.daily_budget <= 0 ? 'over_budget' : u.daily_budget < 10 ? 'tight' : 'on_track'
          const statusColors = {
            on_track: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            tight: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            over_budget: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          }

          return (
            <div key={u.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
              <button
                onClick={() => handleExpand(u.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  u.is_admin ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-slate-400 dark:bg-slate-600'
                }`}>
                  {u.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.username}</p>
                    {u.is_admin && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(u.daily_budget)}<span className="text-xs font-normal text-slate-400">/day</span></p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[status]}`}>
                    {status === 'on_track' ? 'On Track' : status === 'tight' ? 'Tight' : 'Over'}
                  </span>
                </div>

                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isExpanded && detail && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <MiniStat label="Available" value={formatCurrency(detail.available)} />
                    <MiniStat label="Spent" value={formatCurrency(detail.total_spent)} />
                    <MiniStat label="Income" value={formatCurrency(detail.monthly_income)} />
                    <MiniStat label="Days Left" value={detail.days_remaining} />
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min((detail.days_elapsed / Math.max(detail.total_days, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Day {detail.days_elapsed} of {detail.total_days}</p>
                  </div>

                  {u.id !== me?.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Delete User
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
