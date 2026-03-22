import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      showToast('Fill in all fields', 'error')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Float</span>
        </div>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">
          Know your daily spending power
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-700/60 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-500 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
