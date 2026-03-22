import { useState } from 'react'
import { CATEGORIES, getCategoryById, formatShortDate } from '../utils/constants'
import { useToast } from '../contexts/ToastContext'
import api from '../api/client'

const QUICK_AMOUNTS = [5, 10, 15, 20, 30, 40, 50]

function localDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AddExpense({ onClose, onAdded, defaultDate }) {
  const [category, setCategory] = useState('other')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(defaultDate || localDate(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  // Quick date options
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2)

  const quickDates = [
    { label: 'Today', value: localDate(today) },
    { label: 'Yesterday', value: localDate(yesterday) },
    { label: formatShortDate(twoDaysAgo), value: localDate(twoDaysAgo) },
  ]

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      showToast('Enter a valid amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/expenses', {
        amount: amt,
        category,
        description: description || getCategoryById(category).name,
        date,
      })
      showToast('Expense added', 'success')
      onAdded()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Expense</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date — moved to top so it's visible */}
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
            Date
          </label>
          <div className="flex gap-2 mb-2">
            {quickDates.map(qd => (
              <button
                key={qd.value}
                onClick={() => setDate(qd.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  date === qd.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {qd.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mb-5"
          />

          {/* Categories */}
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
            Category
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  category === cat.id
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Amount */}
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
            Amount
          </label>
          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">&euro;</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-lg font-semibold"
              step="0.01"
              min="0"
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(String(amt))}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  amount === String(amt)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                &euro;{amt}
              </button>
            ))}
          </div>

          {/* Note */}
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
            Note (optional)
          </label>
          <input
            type="text"
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mb-5"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
