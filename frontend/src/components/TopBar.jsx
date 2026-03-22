import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function TopBar({ onMenuAction, darkMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const item = (label, onClick, danger) => (
    <button
      onClick={() => { onClick(); setOpen(false) }}
      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
        danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg z-40 border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Float</span>
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4" r="2" />
              <circle cx="10" cy="10" r="2" />
              <circle cx="10" cy="16" r="2" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-fade-in overflow-hidden">
              {item('Recurring Expenses', () => onMenuAction('recurring'))}
              {item('Settings', () => onMenuAction('settings'))}
              {user?.is_admin && item('Admin Panel', () => navigate('/admin'))}
              {item(darkMode ? 'Light Mode' : 'Dark Mode', () => onMenuAction('darkMode'))}
              <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
              {item('Log Out', () => { logout(); navigate('/login') }, true)}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
