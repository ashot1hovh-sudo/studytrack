import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/supabase/config'

export function missingSupabaseEnv() {
  return !hasSupabaseConfig()
}

export function setupErrorResponse() {
  return NextResponse.json(
    { error: 'Supabase is not configured. Copy .env.example to .env.local and add your project URL/key.' },
    { status: 500 }
  )
}

export async function getAuthenticatedUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { supabase, user, response: null }
}

export async function getConsultantUser() {
  const auth = await getAuthenticatedUser()
  if (auth.response || !auth.user) return auth

  if (auth.user.email !== 'admin@gmail.com') {
    return {
      ...auth,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return auth
}

const ruMonths = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']

export function formatRuDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatRuShortDate(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function splitDeadlineDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return {
    date: String(date.getDate()).padStart(2, '0'),
    month: ruMonths[date.getMonth()],
  }
}
