import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../api/client'

export default function Settings({ onClose, onSaved }) {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [income, setIncome] = useState(String(user?.monthly_income || ''))
  const [payday, setPayday] = useState(String(user?.payday || 20))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const inc = parseFloat(income)
    const pd = parseInt(payday)
    if (isNaN(inc) || inc < 0) {
      showToast('Enter a valid income', 'error')
      return
    }
    if (isNaN(pd) || pd < 1 || pd > 28) {
      showToast('Payday must be 1-28', 'error')
      return
    }
    setSaving(true)
    try {
      const data = await api.put('/api/settings', { monthly_income: inc, payday: pd })
      updateUser(data)
      showToast('Settings saved', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Monthly Income
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">&euro;</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="pl-8 text-lg font-semibold"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Payday (day of month)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={payday}
                onChange={(e) => setPayday(e.target.value)}
                min="1"
                max="28"
              />
              <p className="text-xs text-slate-400 mt-1">Your pay cycle runs from payday to payday</p>
            </div>

            <div className="pt-2">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Account</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.username}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
                {user?.is_admin && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                    Admin
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
