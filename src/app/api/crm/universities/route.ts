import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import explorer from '@/data/universityExplorer.json'

// Flat, unique university list (name + city) built once from the explorer
// dataset: every university across majors[].programs[].universities[] plus the
// non-English-taught list. Names are the canonical spelling to store.
type UniEntry = { name: string; city: string }

let CACHE: UniEntry[] | null = null

function buildList(): UniEntry[] {
  if (CACHE) return CACHE
  const byName = new Map<string, UniEntry>()

  const add = (name: unknown, city: unknown) => {
    const n = String(name ?? '').trim()
    if (!n) return
    const key = n.toLowerCase()
    if (!byName.has(key)) byName.set(key, { name: n, city: String(city ?? '').trim() })
  }

  for (const major of (explorer as any).majors ?? []) {
    for (const program of major.programs ?? []) {
      for (const uni of program.universities ?? []) add(uni.name, uni.city)
    }
  }
  for (const uni of (explorer as any).universitiesNoEnglish ?? []) add(uni.name, uni.city)

  CACHE = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  return CACHE
}

// GET /api/crm/universities?q=<search> — autocomplete over the explorer dataset.
export async function GET(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const q = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
  const all = buildList()

  const results = (q ? all.filter((u) => u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q)) : all).slice(0, 10)

  return NextResponse.json({ universities: results })
}
