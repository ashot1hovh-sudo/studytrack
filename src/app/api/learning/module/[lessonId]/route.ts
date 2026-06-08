import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

const LESSON_FILES: Record<string, { file: string; title: string }> = {
  'b1':  { file: 'module-b1.md',  title: 'Оценка шансов' },
  'b2':  { file: 'module-b3_new.md',  title: 'Основной перечень документов для поступления' },
  'b3':  { file: 'module-b4.md',  title: 'Школьные документы' },
  'b4':  { file: 'module-b5.md',  title: 'Как подготовить справку о несудимости' },
  'b5':  { file: 'module-b6.md',  title: 'Как проходить медицинское обследование' },
  'b6':  { file: 'module-b7.md',  title: 'Мотивационное письмо' },
  'b7':  { file: 'module-b8.md',  title: 'Рекомендательные письма' },
  'b8':  { file: 'module-b9.md',  title: 'Как записать видео-визитку' },
  'b9':  { file: 'module-b10.md', title: 'Как написать резюме' },
  'b10': { file: 'module-b11.md', title: 'Как сделать финансовые документы' },
  'b11': { file: 'module-b12.md', title: 'Как подготовиться к интервью' },
}

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string } }
) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getAuthenticatedUser()
  if (response) return response

  const lesson = LESSON_FILES[params.lessonId]
  if (!lesson) {
    return NextResponse.json({ error: 'Урок не найден' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'src/content/modules', lesson.file)
  const content = await readFile(filePath, 'utf8')

  return NextResponse.json(
    { title: lesson.title, content, userEmail: user.email },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
