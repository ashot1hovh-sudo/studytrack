'use client'

import './crm.css'
import { AppProvider, useApp } from '@/context/AppContext'
import Login from '@/components/Login'
import CrmApp from '@/sections/crm/CrmApp'

function CrmGate() {
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

  // Consultant-only tool. A non-consultant who somehow reaches this route sees a
  // dead end, never the data (the API is gated too).
  if (user?.role !== 'consultant') {
    return (
      <div className="crm-scope">
        <div className="center-screen">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Доступ только для команды</h1>
            <p style={{ color: 'rgb(var(--gray))', fontSize: 14 }}>
              Эта страница доступна только консультантам KayKitay.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <CrmApp />
}

export default function CrmPage() {
  return (
    <AppProvider>
      <CrmGate />
    </AppProvider>
  )
}
