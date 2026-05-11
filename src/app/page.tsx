'use client'

import { AppProvider, useApp } from '@/context/AppContext'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/sections/Dashboard'
import Login from '@/components/Login'
import AdminDashboard from '@/sections/AdminDashboard'

function AppContent() {
  const { isAuthenticated, isAuthLoading, user } = useApp()

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-study-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-study-lightgray border-t-study-brown animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  if (user?.role === 'consultant') {
    return <AdminDashboard />
  }

  return (
    <div className="flex min-h-screen bg-study-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 min-h-screen">
        <Dashboard />
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
