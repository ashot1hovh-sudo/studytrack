import type { SupabaseClient } from '@supabase/supabase-js'
import { DOCUMENT_TEMPLATES, computeDocumentDeadline } from '@/lib/documentTemplates'

type UniversityRow = { id: number; deadline: string | null }
type DocumentRow = {
  id: number
  template_key: string | null
  target_university_id: number | null
  deadline: string | null
  deadline_manual: boolean | null
  deleted_at: string | null
}

/** Earliest non-null deadline, or null when no university has one yet. */
function earliestDeadline(universities: UniversityRow[]): string | null {
  const dates = universities.map((u) => u.deadline).filter((d): d is string => Boolean(d))
  return dates.length ? dates.sort()[0] : null
}

/**
 * Brings the student's document checklist in line with their universities.
 *
 * Called whenever the set of universities or their deadlines changes. Two jobs:
 *
 *  1. Seed any missing standard documents — the shared set once, plus one
 *     motivation letter per university.
 *  2. Recompute deadlines as (relevant university deadline − lead time),
 *     skipping rows the student has dated themselves.
 *
 * Idempotent by design: it runs on every university change, and the partial
 * unique indexes in supabase-document-templates.sql are the backstop if two
 * requests race.
 */
export async function syncStudentDocuments(admin: SupabaseClient, studentId: string) {
  const { data: universityData, error: universityError } = await admin
    .from('universities')
    .select('id,deadline')
    .eq('student_id', studentId)

  if (universityError) return { error: universityError.message }
  const universities = (universityData ?? []) as UniversityRow[]

  // Deliberately *not* filtering out soft-deleted rows: they are the record of
  // "the student removed this on purpose", and seeding must see them or it
  // recreates what they just deleted. They are excluded from rescheduling
  // further down instead.
  const { data: documentData, error: documentError } = await admin
    .from('documents')
    .select('id,template_key,target_university_id,deadline,deadline_manual,deleted_at')
    .eq('student_id', studentId)

  if (documentError) return { error: documentError.message }
  const documents = (documentData ?? []) as DocumentRow[]

  const earliest = earliestDeadline(universities)
  const deadlineByUniversity = new Map(universities.map((u) => [u.id, u.deadline]))

  const existing = new Set(
    documents
      .filter((d) => d.template_key)
      .map((d) => `${d.template_key}:${d.target_university_id ?? 'shared'}`)
  )

  // --- 1. seed anything missing -------------------------------------------
  const { data: maxOrder } = await admin
    .from('documents')
    .select('order_index')
    .eq('student_id', studentId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextOrder = (maxOrder?.order_index ?? 0) + 1
  const toInsert: Record<string, unknown>[] = []

  for (const template of DOCUMENT_TEMPLATES) {
    const targets =
      template.scope === 'shared' ? [null] : universities.map((u) => u.id)

    for (const target of targets) {
      if (existing.has(`${template.key}:${target ?? 'shared'}`)) continue

      const basis = target == null ? earliest : deadlineByUniversity.get(target) ?? null

      toInsert.push({
        student_id: studentId,
        name: template.name,
        status: 'not_started',
        template_key: template.key,
        lead_time_days: template.leadTimeDays,
        target_university_id: target,
        deadline: computeDocumentDeadline(basis, template.leadTimeDays),
        deadline_manual: false,
        order_index: nextOrder++,
      })
    }
  }

  if (toInsert.length) {
    // A concurrent request may have inserted the same rows; the unique indexes
    // reject the duplicates and the checklist is still correct either way.
    const { error } = await admin.from('documents').insert(toInsert)
    if (error && !error.message.includes('duplicate key')) return { error: error.message }
  }

  // --- 2. recompute deadlines the student hasn't overridden ----------------
  const updates = documents
    .filter((d) => d.template_key && !d.deadline_manual && !d.deleted_at)
    .map((d) => {
      const template = DOCUMENT_TEMPLATES.find((t) => t.key === d.template_key)
      if (!template) return null

      const basis =
        d.target_university_id == null
          ? earliest
          : deadlineByUniversity.get(d.target_university_id) ?? null

      const deadline = computeDocumentDeadline(basis, template.leadTimeDays)
      return deadline === d.deadline ? null : { id: d.id, deadline }
    })
    .filter((u): u is { id: number; deadline: string | null } => u !== null)

  for (const update of updates) {
    await admin
      .from('documents')
      .update({ deadline: update.deadline })
      .eq('id', update.id)
      .eq('student_id', studentId)
  }

  return { seeded: toInsert.length, rescheduled: updates.length }
}
