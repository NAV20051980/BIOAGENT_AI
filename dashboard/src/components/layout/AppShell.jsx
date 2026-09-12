import { Outlet } from 'react-router-dom'
import Sidebar from '../sidebar/Sidebar.jsx'
import './AppShell.css'

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}
