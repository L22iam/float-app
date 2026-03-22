import { createContext, useContext, useState, useEffect } from 'react'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import AddExpense from './AddExpense'
import RecurringExpenses from './RecurringExpenses'
import Settings from './Settings'
import BugReporter from './BugReporter'

const RefreshContext = createContext(null)
export function useRefresh() {
  return useContext(RefreshContext)
}

export default function Layout({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [prefilledDate, setPrefilledDate] = useState(null)

  const triggerRefresh = () => setRefreshTrigger(p => p + 1)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const handleMenu = (action) => {
    if (action === 'recurring') setShowRecurring(true)
    else if (action === 'settings') setShowSettings(true)
    else if (action === 'darkMode') setDarkMode(d => !d)
  }

  return (
    <RefreshContext.Provider value={{ refreshTrigger, triggerRefresh, prefilledDate, setPrefilledDate }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
        <TopBar onMenuAction={handleMenu} darkMode={darkMode} />
        <main className="pt-16 px-4 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
          {children}
        </main>
        <BottomNav onAdd={() => setShowAdd(true)} />
        <BugReporter />

        {showAdd && (
          <AddExpense
            defaultDate={prefilledDate}
            onClose={() => { setShowAdd(false); setPrefilledDate(null) }}
            onAdded={() => { setShowAdd(false); setPrefilledDate(null); triggerRefresh() }}
          />
        )}
        {showRecurring && (
          <RecurringExpenses
            onClose={() => setShowRecurring(false)}
            onChanged={triggerRefresh}
          />
        )}
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            onSaved={triggerRefresh}
          />
        )}
      </div>
    </RefreshContext.Provider>
  )
}
