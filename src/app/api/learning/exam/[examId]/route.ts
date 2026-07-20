import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

/**
 * Exam guides — a FREE module, so this checks authentication only.
 *
 * Deliberately not using getEntitledUser: these are acquisition content. The
 * paid lessons live behind /api/learning/module/[lessonId], which does gate on
 * entitlement; keeping the two on separate routes means a free page can never
 * be turned into a hole in the paywall by editing one shared handler.
 */
const EXAMS: Record<string, { title: string; file: string }> = {
  ielts: { title: 'IELTS', file: 'exam-ielts.md' },
  toefl: { title: 'TOEFL iBT', file: 'exam-toefl.md' },
  csca: { title: 'CSCA', file: 'exam-csca.md' },
  duolingo: { title: 'Duolingo English Test', file: 'exam-duolingo.md' },
}

export async function GET(_request: Request, { params }: { params: { examId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getAuthenticatedUser()
  if (response) return response

  // Whitelist lookup, never a path built from the parameter — otherwise
  // ../../ in the URL reads arbitrary files off the server.
  const exam = EXAMS[params.examId]
  if (!exam) return NextResponse.json({ error: 'Экзамен не найден' }, { status: 404 })

  const filePath = path.join(process.cwd(), 'src/content/exams', exam.file)
  const content = await readFile(filePath, 'utf8')

  return NextResponse.json(
    { title: exam.title, content, userEmail: user.email },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
