import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import Medicines from './pages/Medicines'
import Diary from './pages/Diary'
import Schedule from './pages/Schedule'
import Clinics from './pages/Clinics'
import {
  requestNotificationPermission,
  rescheduleAllReminders,
  checkLowStockOnOpen,
} from './utils/notifications'

export default function App() {
  useEffect(() => {
    // Request notification permission on first load
    requestNotificationPermission()
    // Reschedule all medicine reminders
    rescheduleAllReminders()
    // Alert for any low stock medicines
    checkLowStockOnOpen()
  }, [])

  return (
    <BrowserRouter basename="/tbcare-app">
      <div className="min-h-screen w-full bg-slate-50 pb-16">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/meds"     element={<Medicines />} />
          <Route path="/diary"    element={<Diary />}     />
          <Route path="/schedule" element={<Schedule />}  />
          <Route path="/clinics"  element={<Clinics />}   />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}