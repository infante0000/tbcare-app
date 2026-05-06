import { NavLink } from 'react-router-dom'
import {
  Home, Pill, BookOpen, CalendarDays, History, Settings,
} from 'lucide-react'

const tabs = [
  { to: '/',         label: 'Home',     Icon: Home         },
  { to: '/meds',     label: 'Medicines',Icon: Pill         },
  { to: '/diary',    label: 'Diary',    Icon: BookOpen     },
  { to: '/schedule', label: 'Schedule', Icon: CalendarDays },
  { to: '/history',  label: 'History',  Icon: History      },
  { to: '/settings', label: 'Settings', Icon: Settings     },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors
            ${isActive
              ? 'text-sky-500'
              : 'text-gray-400 dark:text-slate-500'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}