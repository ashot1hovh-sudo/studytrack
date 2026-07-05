import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

const LESSON_FILES: Record<string, { file: string; title: string }> = {
  'b1':  { file: 'module-b1.md',  title: 'Оценка шансов' },
  'b2':  { file: 'module-b3_new.md',  title: 'Основной перечень документов для поступления' },
  'b3':  { file: 'module-b4_new.md',  title: 'Школьные документы' },
  'b4':  { file: 'module-b5_new.md',  title: 'Как подготовить справку о несудимости' },
  'b5':  { file: 'module-b6_new.md',  title: 'Как проходить медицинское обследование' },
  'b6':  { file: 'module-b7_new.md',  title: 'Мотивационное письмо' },
  'b7':  { file: 'module-b8_new.md',  title: 'Рекомендательные письма' },
  'b8':  { file: 'module-b9_new.md',  title: 'Как записать видео-визитку' },
  'b9':  { file: 'module-b10_new.md', title: 'Как написать резюме' },
  'b10': { file: 'module-b11_new.md', title: 'Как сделать финансовые документы' },
  'b11': { file: 'module-b12_new.md', title: 'Как подготовиться к интервью' },
  'b12': { file: 'module-b13_new.md', title: 'Как заполнить анкету на сайте вуза' },
  'apply-guide': { file: 'module-apply-guide.md', title: 'Как подать заявку в китайский университет' },
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
