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
    .select('id,email,full_name,role,age,program')
    .neq('email', 'admin@gmail.com')
    .order('created_at', { ascending: false })

  students = studentsResult.data
  studentsError = studentsResult.error

  if (studentsError?.message.includes('students.age') || studentsError?.message.includes('students.program')) {
    const fallback = await supabase
      .from('students')
      .select('id,email,full_name,role')
      .neq('email', 'admin@gmail.com')
      .order('created_at', { ascending: false })

    students = fallback.data
    studentsError = fallback.error
  }

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 })

  const studentIds = (students ?? []).map((student) => student.id)

  if (studentIds.length === 0) {
    return NextResponse.json({ students: [] })
  }

  const [{ data: documents, error: documentsError }, { data: universities, error: universitiesError }, { data: deadlines, error: deadlinesError }] =
    await Promise.all([
      supabase.from('documents').select('student_id,status').in('student_id', studentIds),
      supabase.from('universities').select('student_id').in('student_id', studentIds),
      supabase.from('deadlines').select('student_id,is_urgent').in('student_id', studentIds),
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
        documentsTotal: studentDocuments.length,
        documentsCompleted: studentDocuments.filter((document) => document.status === 'completed').length,
        documentsPendingReview: studentDocuments.filter((document) => document.status === 'uploaded').length,
        universitiesTotal: (universities ?? []).filter((university) => university.student_id === student.id).length,
        urgentDeadlines: (deadlines ?? []).filter((deadline) => deadline.student_id === student.id && deadline.is_urgent).length,
      }
    }),
  })
}
