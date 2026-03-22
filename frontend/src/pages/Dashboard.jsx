import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRefresh } from '../components/Layout'
import { getCategoryById, formatCurrency, formatDate, formatShortDate, getGreeting } from '../utils/constants'
import api from '../api/client'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { refreshTrigger } = useRefresh()

  useEffect(() => {
    setLoading(true)
    api.get('/api/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshTrigger])

  if (loading) return <Skeleton />
  if (!data) return null

  const gradients = {
    on_track: 'from-emerald-500 to-teal-600',
    tight: 'from-amber-500 to-orange-500',
    over_budget: 'from-red-500 to-rose-600',
  }

  return (
    <div className="space-y-6 py-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {getGreeting()}{user?.username ? `, ${user.username}` : ''}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{formatDate(new Date())}</p>
      </div>

      {/* Hero + Stats — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hero Card */}
        <div className={`bg-gradient-to-br ${gradients[data.budget_status]} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden md:col-span-2`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />

          <p className="text-sm opacity-80 relative">Daily budget</p>
          <p className="text-5xl font-bold mt-1 relative tracking-tight">
            {data.daily_budget < 0 ? '-' : ''}{formatCurrency(data.daily_budget)}
          </p>
          <p className="text-sm opacity-80 mt-1 relative">until payday</p>

          <div className="mt-6 relative">
            <div className="flex justify-between text-xs opacity-80 mb-2">
              <span>Day {data.days_elapsed}</span>
              <span>{data.days_remaining} days left</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((data.days_elapsed / Math.max(data.total_days, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats — stacked on the side on desktop */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
          <StatCard label="Available" value={formatCurrency(data.available)} positive={data.available >= 0} />
          <StatCard label="Spent" value={formatCurrency(data.total_spent)} />
          <StatCard label="Committed" value={formatCurrency(data.future_recurring)} />
        </div>
      </div>

      {/* Income Bar */}
      {data.monthly_income > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Budget used</span>
            <span>{formatCurrency(data.total_spent + data.future_recurring)} / {formatCurrency(data.monthly_income)}</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min((data.total_spent / data.monthly_income) * 100, 100)}%` }}
            />
            <div
              className="h-full bg-amber-400/60 transition-all duration-500"
              style={{ width: `${Math.min((data.future_recurring / data.monthly_income) * 100, 100)}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Spent
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400/60" /> Committed
            </span>
          </div>
        </div>
      )}

      {/* Upcoming + Today — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Recurring */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Upcoming this week</h2>
          {data.upcoming_recurring.length > 0 ? (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
              {data.upcoming_recurring.map((item, i) => {
                const cat = getCategoryById(item.category)
                return (
                  <div key={i} className="min-w-[130px] md:min-w-0 bg-white dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-slate-200/60 dark:border-slate-700/60 shrink-0 md:flex md:items-center md:gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="md:flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 md:mt-0 truncate">{item.description}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 md:mt-0">{formatShortDate(item.date)}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 md:mt-0">{formatCurrency(item.amount)}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <p className="text-slate-400 text-sm">No upcoming recurring</p>
            </div>
          )}
        </div>

        {/* Today's Expenses */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Today</h2>
          {data.today_expenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <p className="text-slate-400 text-sm">No expenses today yet</p>
              <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Tap + to add one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.today_expenses.map(exp => {
                const cat = getCategoryById(exp.category)
                return (
                  <div key={exp.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + '18' }}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {exp.description || cat.name}
                      </p>
                      <p className="text-xs text-slate-400">{cat.name}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(exp.amount)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Setup prompt */}
      {data.monthly_income === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Set up your income</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Open Settings from the menu to set your monthly income and start tracking your budget.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, positive }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${
        positive === false ? 'text-red-500' : 'text-slate-900 dark:text-white'
      }`}>
        {value}
      </p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 py-4 animate-pulse">
      <div>
        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-48" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-36 mt-2" />
      </div>
      <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
      </div>
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  )
}
