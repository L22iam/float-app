import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Register() {
  const { user, register } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [income, setIncome] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !email || !password) {
      showToast('Fill in all required fields', 'error')
      return
    }
    setLoading(true)
    try {
      await register(username, email, password, parseFloat(income) || 0)
      showToast('Welcome to Float!', 'success')
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
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-700/60 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username" autoComplete="username" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Create a password" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Monthly Income</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">&euro;</span>
              <input type="number" inputMode="decimal" value={income}
                onChange={e => setIncome(e.target.value)}
                placeholder="e.g. 2000" className="pl-8" step="0.01" min="0" />
            </div>
            <p className="text-xs text-slate-400 mt-1">You can change this later in settings</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform disabled:opacity-50 mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-500 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
