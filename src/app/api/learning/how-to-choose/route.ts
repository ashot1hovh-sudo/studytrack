import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getAuthenticatedUser()
  if (response) return response

  const filePath = path.join(process.cwd(), 'src/content/how-to-choose.md')
  const raw = await readFile(filePath, 'utf8')
  // Strip the first # heading — ProtectedLesson already renders the title prop
  const content = raw.replace(/^#[^\n]*\n+/, '')

  return NextResponse.json(
    {
      title: 'Как определиться с программой бакалавриата',
      content,
      userEmail: user.email,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
