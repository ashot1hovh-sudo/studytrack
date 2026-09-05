import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  type StudentRow = {
    id: string
    email: string
    full_name: string
    role: string
    age?: number | null
    program?: 'language_year' | 'bachelor' | 'master' | null
  }

  let students: StudentRow[] | null = null
  let studentsError: { message: string } | null = null

  const studentsResult = await supabase
    .from('students')
    .select('id,email,full_name,role,age,program,service_type,subscription_status,pin_code')
    .neq('role', 'consultant')
    .order('created_at', { ascending: false })

  students = studentsResult.data
  studentsError = studentsResult.error

  if (studentsError?.message.includes('students.age') || studentsError?.message.includes('students.program') || studentsError?.message.includes('students.service_type') || studentsError?.message.includes('pin_code')) {
    const fallback = await supabase
      .from('students')
      .select('id,email,full_name,role,service_type,subscription_status')
      .neq('role', 'consultant')
      .order('created_at', { ascending: false })

    students = fallback.data
    studentsError = fallback.error
  }

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 })

  const studentIds = (students ?? []).map((student) => student.id)

  if (studentIds.length === 0) {
    return NextResponse.json({ students: [] })
  }

  // PostgREST turns `.in('student_id', ids)` into a `student_id=in.(…)` query
  // string, so the whole id list rides in the request URL. Past a few hundred
  // students that URL overflows the server's limit and the request dies with
  // "URI too long" (HTTP 414). Batch the ids so each request stays small; the
  // page-level Promise.all still runs the batches concurrently.
  const CHUNK = 100
  const idChunks: string[][] = []
  for (let i = 0; i < studentIds.length; i += CHUNK) idChunks.push(studentIds.slice(i, i + CHUNK))

  async function gatherByStudent<T>(
    table: string,
    columns: string
  ): Promise<{ data: T[] | null; error: { message: string } | null }> {
    const results = await Promise.all(
      idChunks.map((ids) => supabase.from(table).select(columns).in('student_id', ids))
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) return { data: null, error: failed.error }
    return { data: results.flatMap((r) => (r.data ?? []) as T[]), error: null }
  }

  const [{ data: documents, error: documentsError }, { data: universities, error: universitiesError }, { data: deadlines, error: deadlinesError }] =
    await Promise.all([
      gatherByStudent<{ student_id: string; status: string }>('documents', 'student_id,status'),
      gatherByStudent<{ student_id: string }>('universities', 'student_id'),
      gatherByStudent<{ student_id: string; is_urgent: boolean }>('deadlines', 'student_id,is_urgent'),
    ])

  const error = documentsError ?? universitiesError ?? deadlinesError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    students: (students ?? []).map((student) => {
      const studentDocuments = (documents ?? []).filter((document) => document.student_id === student.id)
      return {
        id: student.id,
        email: student.email,
        fullName: student.full_name,
        age: 'age' in student ? student.age : null,
        program: 'program' in student ? student.program : null,
        serviceType: 'service_type' in student ? student.service_type : 'diy',
        subscriptionStatus: 'subscription_status' in student ? student.subscription_status : 'trial',
        pinCode: 'pin_code' in student ? (student as Record<string, unknown>).pin_code as string | null : null,
        documentsTotal: studentDocuments.length,
        documentsCompleted: studentDocuments.filter((document) => document.status === 'completed').length,
        documentsPendingReview: studentDocuments.filter((document) => document.status === 'uploaded').length,
        universitiesTotal: (universities ?? []).filter((university) => university.student_id === student.id).length,
        urgentDeadlines: (deadlines ?? []).filter((deadline) => deadline.student_id === student.id && deadline.is_urgent).length,
      }
    }),
  })
}
