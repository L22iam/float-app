import { useState, useEffect } from 'react'
import { useRefresh } from '../components/Layout'
import { MONTH_NAMES, DAY_NAMES, getCategoryById, formatCurrency, pyDayToJs } from '../utils/constants'
import { useToast } from '../contexts/ToastContext'
import api from '../api/client'

export default function CalendarPage() {
  const [current, setCurrent] = useState(() => new Date())
  const [expenses, setExpenses] = useState([])
  const [recurring, setRecurring] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const { refreshTrigger, triggerRefresh, setPrefilledDate } = useRefresh()
  const { showToast } = useToast()

  const year = current.getFullYear()
  const month = current.getMonth()

  useEffect(() => {
    Promise.all([
      api.get(`/api/expenses?month=${month + 1}&year=${year}`),
      api.get('/api/recurring'),
      api.get('/api/dashboard'),
    ]).then(([exp, rec, dash]) => {
      setExpenses(exp)
      setRecurring(rec)
      setDashboard(dash)
    }).catch(console.error)
  }, [month, year, refreshTrigger])

  // Calendar grid
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = (firstDay.getDay() + 6) % 7 // Monday = 0

  // Group expenses by day number
  const byDay = {}
  expenses.forEach(e => {
    const d = parseInt(e.date.split('-')[2])
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(e)
  })

  // Check recurring for a given day
  const getRecurringForDay = (dayNum) => {
    const d = new Date(year, month, dayNum)
    return recurring.filter(r => {
      if (!r.is_active) return false
      if (r.frequency === 'weekly' && r.day_of_week !== null) {
        return d.getDay() === pyDayToJs(r.day_of_week)
      }
      if (r.frequency === 'monthly' && r.day_of_month !== null) {
        return dayNum === r.day_of_month
      }
      return false
    })
  }

  // Calculate recurring cost for a specific day
  const getRecurringCostForDay = (dayNum) => {
    return getRecurringForDay(dayNum).reduce((sum, r) => sum + r.amount, 0)
  }

  // Build a per-day budget spread for the current pay period
  const buildDayBudgets = () => {
    if (!dashboard || !dashboard.monthly_income) return {}

    const periodStart = new Date(dashboard.period_start + 'T00:00:00')
    const periodEnd = new Date(dashboard.period_end + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Count remaining days from today to period end
    const remaining = Math.max(Math.floor((periodEnd - today) / 86400000), 1)

    // Calculate total future recurring from today to period end
    let totalFutureRecurring = 0
    const dayIt = new Date(today)
    dayIt.setDate(dayIt.getDate() + 1) // start from tomorrow
    while (dayIt < periodEnd) {
      const dayOfWeek = dayIt.getDay()
      const dayOfMonth = dayIt.getDate()
      for (const r of recurring) {
        if (!r.is_active) continue
        if (r.frequency === 'weekly' && r.day_of_week !== null && dayOfWeek === pyDayToJs(r.day_of_week)) {
          totalFutureRecurring += r.amount
        } else if (r.frequency === 'monthly' && r.day_of_month !== null && dayOfMonth === r.day_of_month) {
          totalFutureRecurring += r.amount
        }
      }
      dayIt.setDate(dayIt.getDate() + 1)
    }

    // Free money = available minus future recurring commitments
    // available already has future recurring subtracted in the API,
    // so the daily_budget from API is already the "free" per-day amount.
    // But we want per-day: on days with recurring, show less free money.
    const freePool = dashboard.available + totalFutureRecurring // add back recurring to get gross available
    const baseDailyBudget = freePool / remaining

    const budgets = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      dateObj.setHours(0, 0, 0, 0)

      // Only show budgets for days in the current pay period
      if (dateObj < periodStart || dateObj >= periodEnd) {
        budgets[d] = null
        continue
      }

      if (dateObj < today) {
        // Past day: show what was spent
        const spent = (byDay[d] || []).reduce((s, e) => s + e.amount, 0)
        budgets[d] = { type: 'past', spent, dailyBudget: baseDailyBudget }
      } else {
        // Today or future: show budget minus recurring for that day
        const recCost = getRecurringCostForDay(d)
        const freeBudget = Math.max(baseDailyBudget - recCost, 0)
        const spent = (byDay[d] || []).reduce((s, e) => s + e.amount, 0)
        budgets[d] = {
          type: dateObj.getTime() === today.getTime() ? 'today' : 'future',
          dailyBudget: baseDailyBudget,
          freeBudget: Math.round(freeBudget * 100) / 100,
          recCost,
          spent,
        }
      }
    }
    return budgets
  }

  const dayBudgets = buildDayBudgets()

  const today = new Date()
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isPast = (d) => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1))

  const selectedExpenses = selectedDay ? (byDay[selectedDay] || []) : []
  const selectedRecurring = selectedDay ? getRecurringForDay(selectedDay) : []
  const selectedBudget = selectedDay ? dayBudgets[selectedDay] : null

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/expenses/${id}`)
      setExpenses(prev => prev.filter(e => e.id !== id))
      showToast('Deleted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="py-4 space-y-4">
      {/* Budget summary strip */}
      {dashboard && dashboard.monthly_income > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="flex items-center justify-between relative">
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider font-medium">Daily budget</p>
              <p className="text-3xl font-bold mt-0.5">{formatCurrency(dashboard.daily_budget)}</p>
            </div>
            <div className="text-right">
              {editingIncome ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const val = parseFloat(incomeInput)
                    if (isNaN(val) || val < 0) { showToast('Enter a valid amount', 'error'); return }
                    try {
                      await api.put('/api/settings', { monthly_income: val })
                      setEditingIncome(false)
                      triggerRefresh()
                      showToast('Income updated', 'success')
                    } catch (err) { showToast(err.message, 'error') }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-white/80 text-sm font-medium">&euro;</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    autoFocus
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-24 bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-sm text-white font-bold placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Amount"
                  />
                  <button type="submit"
                    onMouseDown={(e) => e.preventDefault()}
                    className="bg-white/20 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/30 transition-colors">
                    OK
                  </button>
                  <button type="button"
                    onClick={() => setEditingIncome(false)}
                    className="bg-white/10 rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100 transition-opacity">
                    &times;
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setIncomeInput(String(dashboard.monthly_income)); setEditingIncome(true) }}
                  className="text-right group"
                >
                  <p className="text-xs opacity-80">{formatCurrency(dashboard.available)} left</p>
                  <p className="text-xs opacity-80">{dashboard.days_remaining} days to payday</p>
                  <p className="text-[10px] opacity-50 mt-0.5 group-hover:opacity-80 transition-opacity underline decoration-dashed underline-offset-2">
                    tap to edit income
                  </p>
                </button>
              )}
            </div>
          </div>
          {/* Mini progress */}
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((dashboard.days_elapsed / Math.max(dashboard.total_days, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar + Detail — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

      {/* Calendar grid */}
      <div className="md:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-3 md:p-5 border border-slate-200/60 dark:border-slate-700/60">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: startPad }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dayExpenses = byDay[day] || []
            const dayRecurring = getRecurringForDay(day)
            const total = dayExpenses.reduce((s, e) => s + e.amount, 0)
            const hasExpenses = dayExpenses.length > 0
            const hasRecurring = dayRecurring.length > 0
            const selected = selectedDay === day
            const budget = dayBudgets[day]

            // Determine what small amount to show in the cell
            let cellAmount = null
            let cellAmountColor = 'text-slate-400'
            if (budget) {
              if (budget.type === 'past' && hasExpenses) {
                cellAmount = total
                cellAmountColor = total > budget.dailyBudget
                  ? 'text-red-400' : 'text-emerald-500'
              } else if (budget.type === 'today') {
                if (hasExpenses) {
                  cellAmount = total
                  cellAmountColor = total > budget.dailyBudget
                    ? 'text-red-400' : 'text-emerald-500'
                } else {
                  cellAmount = budget.freeBudget
                  cellAmountColor = 'text-emerald-500/60'
                }
              } else if (budget.type === 'future') {
                cellAmount = budget.freeBudget
                cellAmountColor = 'text-slate-400/60'
              }
            }

            return (
              <button
                key={day}
                onClick={() => {
                  const sel = selectedDay === day ? null : day
                  setSelectedDay(sel)
                  if (sel) {
                    const m = String(month + 1).padStart(2, '0')
                    const d = String(day).padStart(2, '0')
                    setPrefilledDate(`${year}-${m}-${d}`)
                  } else {
                    setPrefilledDate(null)
                  }
                }}
                className={`relative flex flex-col items-center py-1 md:py-2 rounded-xl transition-all min-h-[48px] md:min-h-[64px] ${
                  selected
                    ? 'bg-emerald-500 text-white'
                    : isToday(day)
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className={`text-sm font-medium leading-tight ${
                  selected ? 'text-white' :
                  isToday(day) ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                  isPast(day) ? 'text-slate-400 dark:text-slate-500' :
                  'text-slate-700 dark:text-slate-200'
                }`}>
                  {day}
                </span>

                {/* Small amount */}
                {cellAmount !== null && (
                  <span className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                    selected ? 'text-white/80' : cellAmountColor
                  }`}>
                    {cellAmount < 100 ? cellAmount.toFixed(0) : Math.round(cellAmount)}
                  </span>
                )}

                {/* Indicators */}
                <div className="flex gap-0.5 mt-0.5 h-1">
                  {hasExpenses && (
                    <div className={`w-1 h-1 rounded-full ${
                      selected ? 'bg-white/80' :
                      total > (budget?.dailyBudget || 30) ? 'bg-red-400' : total > (budget?.dailyBudget || 30) * 0.5 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                  )}
                  {hasRecurring && (
                    <div className={`w-1 h-1 rounded-full ${selected ? 'bg-white/50' : 'bg-violet-400'}`} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center flex-wrap mt-3">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Under budget
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Over budget
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> Recurring
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="text-slate-400/60 font-semibold text-[9px]">23</span> Free to spend
        </span>
      </div>
      </div>

      {/* Selected day detail — right column on desktop */}
      <div className="md:col-span-2">
      {selectedDay ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 animate-fade-in md:sticky md:top-20">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            {new Date(year, month, selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>

          {/* Day budget breakdown */}
          {selectedBudget && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-medium">Budget</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(selectedBudget.dailyBudget)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-medium">Spent</p>
                <p className={`text-sm font-bold ${selectedBudget.spent > selectedBudget.dailyBudget ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                  {formatCurrency(selectedBudget.spent)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-medium">
                  {selectedBudget.type === 'future' ? 'Free' : 'Left'}
                </p>
                <p className={`text-sm font-bold ${
                  (selectedBudget.dailyBudget - selectedBudget.spent) < 0
                    ? 'text-red-500'
                    : 'text-emerald-500'
                }`}>
                  {formatCurrency(Math.max(selectedBudget.dailyBudget - selectedBudget.spent, 0))}
                </p>
              </div>
            </div>
          )}

          {/* Recurring cost note */}
          {selectedBudget && selectedBudget.recCost > 0 && (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <p className="text-xs text-violet-600 dark:text-violet-400">
                {formatCurrency(selectedBudget.recCost)} committed to recurring &middot; {formatCurrency(selectedBudget.freeBudget)} free to spend
              </p>
            </div>
          )}

          {selectedRecurring.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-violet-500 font-semibold uppercase tracking-wider mb-2">Expected</p>
              {selectedRecurring.map(r => {
                const cat = getCategoryById(r.category)
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">{r.description}</span>
                    <span className="text-sm font-medium text-violet-500">{formatCurrency(r.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {selectedExpenses.length > 0 ? (
            <div>
              {selectedRecurring.length > 0 && (
                <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider mb-2">Actual</p>
              )}
              {selectedExpenses.map(exp => {
                const cat = getCategoryById(exp.category)
                return (
                  <div key={exp.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: cat.color + '18' }}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{exp.description || cat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(exp.amount)}</p>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              <div className="flex justify-between pt-3 mt-1 border-t border-slate-200 dark:border-slate-600">
                <span className="text-sm font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(selectedExpenses.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </div>
          ) : (
            !selectedRecurring.length && (
              <p className="text-sm text-slate-400 text-center py-4">No expenses this day</p>
            )
          )}
        </div>
      ) : (
        <div className="hidden md:flex bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60 items-center justify-center">
          <p className="text-sm text-slate-400">Select a day to see details</p>
        </div>
      )}
      </div>

      </div>
    </div>
  )
}
