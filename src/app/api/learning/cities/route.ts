import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getAuthenticatedUser()
  if (response) return response

  const filePath = path.join(process.cwd(), 'src/content/cities-guide.md')
  const content = await readFile(filePath, 'utf8')

  return NextResponse.json(
    {
      title: 'Лучшие города для учёбы в Китае',
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
