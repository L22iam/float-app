import { useLocation, useNavigate } from 'react-router-dom'

function NavBtn({ active, onClick, label, children }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[64px]">
      <div className={active ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}>
        {children}
      </div>
      <span className={`text-[10px] font-medium ${active ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
        {label}
      </span>
    </button>
  )
}

export default function BottomNav({ onAdd }) {
  const loc = useLocation()
  const nav = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-700/60 z-40 safe-bottom">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-around h-16 px-4">
        <NavBtn active={loc.pathname === '/'} onClick={() => nav('/')} label="Home">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </NavBtn>

        <button
          onClick={onAdd}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-3.5 -mt-8 shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        <NavBtn active={loc.pathname === '/calendar'} onClick={() => nav('/calendar')} label="Calendar">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </NavBtn>
      </div>
    </nav>
  )
}
