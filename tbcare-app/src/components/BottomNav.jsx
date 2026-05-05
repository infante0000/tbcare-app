import { NavLink } from 'react-router-dom'
import {
  Home,
  Pill,
  BookOpen,
  CalendarDays,
  MapPin,
} from 'lucide-react'

const tabs = [
  { to: '/',        label: 'Home',      Icon: Home         },
  { to: '/meds',    label: 'Medicines', Icon: Pill         },
  { to: '/diary',   label: 'Diary',     Icon: BookOpen     },
  { to: '/schedule',label: 'Schedule',  Icon: CalendarDays },
  { to: '/clinics', label: 'Clinics',   Icon: MapPin       },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-1 text-xs transition-colors
            ${isActive ? 'text-sky-500' : 'text-gray-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={isActive ? 'font-medium' : ''}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}