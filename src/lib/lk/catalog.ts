// The list Iana picks universities from in the ЛК editor: the platform's
// university catalogue (the same files as v1 «Вузы»). Anything not found here
// is typed in by hand (ref.kind = 'free'). The synced university database
// will be added here when it ships. Server-only.

import universities from '@/data/universities.json'
import explorer from '@/data/universityExplorer.json'
import type { Tone } from './types'

export type CatalogUni = {
  kind: 'sync' | 'catalog'
  key: string
  name: string
  nameRu: string | null
  nameCn: string | null
  city: string
  tone?: Tone
  art?: string
}

type ExplorerUni = { name: string; city?: string }
type Explorer = { universitiesNoEnglish?: ExplorerUni[]; majors?: { programs?: { universities?: ExplorerUni[] }[] }[] }
type LegacyUni = { nameEn: string; nameRu?: string; nameCn?: string; city?: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export async function getLkCatalog(): Promise<CatalogUni[]> {
  const out: CatalogUni[] = []
  const seen = new Set<string>()
  const add = (u: CatalogUni) => {
    const k = norm(u.name)
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(u)
  }

  for (const u of universities as LegacyUni[]) {
    add({ kind: 'catalog', key: u.nameEn, name: u.nameEn, nameRu: u.nameRu ?? null, nameCn: u.nameCn ?? null, city: u.city ?? '' })
  }
  const ex = explorer as Explorer
  for (const m of ex.majors ?? []) for (const p of m.programs ?? []) for (const u of p.universities ?? []) {
    add({ kind: 'catalog', key: u.name, name: u.name, nameRu: null, nameCn: null, city: u.city ?? '' })
  }
  for (const u of ex.universitiesNoEnglish ?? []) {
    add({ kind: 'catalog', key: u.name, name: u.name, nameRu: null, nameCn: null, city: u.city ?? '' })
  }
  return out
}
