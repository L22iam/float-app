import { useState, useEffect } from 'react'
import { CATEGORIES, DAY_NAMES, DAY_NAMES_FULL, getCategoryById } from '../utils/constants'
import { useToast } from '../contexts/ToastContext'
import api from '../api/client'

export default function RecurringExpenses({ onClose, onChanged }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  // Form state
  const [category, setCategory] = useState('other')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [dayOfMonth, setDayOfMonth] = useState(1)

  const fetch_ = async () => {
    try {
      const data = await api.get('/api/recurring')
      setItems(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch_() }, [])

  const handleAdd = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      showToast('Enter a valid amount', 'error')
      return
    }
    try {
      await api.post('/api/recurring', {
        amount: amt,
        category,
        description: description || getCategoryById(category).name,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      })
      showToast('Recurring expense added', 'success')
      setShowForm(false)
      resetForm()
      fetch_()
      onChanged()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggle = async (id) => {
    try {
      await api.patch(`/api/recurring/${id}/toggle`)
      fetch_()
      onChanged()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/recurring/${id}`)
      showToast('Deleted', 'success')
      fetch_()
      onChanged()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const resetForm = () => {
    setCategory('other')
    setAmount('')
    setDescription('')
    setFrequency('weekly')
    setDayOfWeek(0)
    setDayOfMonth(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recurring Expenses</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {items.length === 0 && !showForm && (
                <p className="text-sm text-slate-400 text-center py-8">No recurring expenses yet</p>
              )}

              <div className="space-y-3 mb-6">
                {items.map(item => {
                  const cat = getCategoryById(item.category)
                  return (
                    <div key={item.id} className={`bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.description}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.frequency === 'weekly'
                              ? `Every ${DAY_NAMES_FULL[item.day_of_week]}`
                              : `${item.day_of_month}${ordinal(item.day_of_month)} of month`}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">&euro;{item.amount.toFixed(2)}</p>

                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(item.id)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>

                        {/* Delete */}
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-400 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add form */}
              {showForm ? (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">New Recurring Expense</h3>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          category === cat.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>

                  <input type="text" placeholder="Description" value={description}
                    onChange={e => setDescription(e.target.value)} />

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">&euro;</span>
                    <input type="number" inputMode="decimal" placeholder="Amount" value={amount}
                      onChange={e => setAmount(e.target.value)} className="pl-8" step="0.01" min="0" />
                  </div>

                  {/* Frequency */}
                  <div className="flex gap-2">
                    {['weekly', 'monthly'].map(f => (
                      <button key={f} onClick={() => setFrequency(f)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                          frequency === f
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Day selector */}
                  {frequency === 'weekly' ? (
                    <div className="flex gap-1.5">
                      {DAY_NAMES.map((d, i) => (
                        <button key={i} onClick={() => setDayOfWeek(i)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                            dayOfWeek === i
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Day of month (1-28)</label>
                      <input type="number" min="1" max="28" value={dayOfMonth}
                        onChange={e => setDayOfMonth(parseInt(e.target.value) || 1)} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => { setShowForm(false); resetForm() }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                      Cancel
                    </button>
                    <button onClick={handleAdd}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                >
                  + Add Recurring Expense
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
