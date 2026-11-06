import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, hasPaidAccess, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Share pages for single v3 modules (/s/<token>/index.html), for сопровождение
 * families only. The bundles live in private/s/<token>/, outside public/, so
 * Next never serves them as plain static files; every file, including the JS
 * that holds the lesson text, goes through this login check.
 *
 * Who gets in: a consultant, or a premium (сопровождение) account whose access
 * has not expired. They log in with the same email + password as the ЛК.
 * Without a session, index.html becomes a small login form; other files get 401.
 */

const ROOT = path.join(process.cwd(), 'private', 's')
const TOKEN_RE = /^[a-z]+-[0-9a-f]{10}$/

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

const PRIVATE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

type Access = 'ok' | 'login' | 'denied'

async function access(): Promise<Access> {
  if (missingSupabaseEnv()) return 'login'
  const { supabase, user, response } = await getAuthenticatedUser()
  if (response || !user) return 'login'
  const { data: me } = await supabase
    .from('students')
    .select('role,service_type,subscription_status,access_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role === 'consultant') return 'ok'
  if (me?.service_type === 'premium' && hasPaidAccess(me)) return 'ok'
  return 'denied'
}

export async function GET(_req: Request, { params }: { params: { token: string; path?: string[] } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { token } = params
  const rel = (params.path ?? []).join('/') || 'index.html'
  if (!TOKEN_RE.test(token) || !rel || rel.split('/').some((p) => !p || p === '.' || p === '..')) {
    return new NextResponse('Not found', { status: 404 })
  }

  const dir = path.join(ROOT, token)
  const file = path.join(dir, rel)
  if (!file.startsWith(dir + path.sep)) return new NextResponse('Not found', { status: 404 })

  const isPage = rel === 'index.html'
  const a = await access()
  if (a !== 'ok') {
    if (!isPage) return new NextResponse(a === 'login' ? 'Unauthorized' : 'Forbidden', { status: a === 'login' ? 401 : 403, headers: PRIVATE })
    return new NextResponse(a === 'login' ? loginPage() : deniedPage(), {
      status: 200,
      headers: { ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  let body: Buffer
  try {
    body = await readFile(file)
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  return new NextResponse(new Uint8Array(body), { status: 200, headers: { ...PRIVATE, 'Content-Type': type } })
}

const STYLE = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;background:#F8F5EE;color:#1F2A44;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px}
  .card{width:100%;max-width:400px;background:#fff;border-radius:20px;padding:32px 28px;box-shadow:0 10px 40px rgba(31,42,68,.08)}
  h1{font-size:22px;line-height:1.25;margin:0 0 8px}
  p{margin:0 0 20px;color:#5B6478;font-size:15px}
  label{display:block;font-size:13px;font-weight:600;margin:0 0 6px}
  input{width:100%;font:inherit;padding:12px 14px;border:1px solid #DCD6C8;border-radius:12px;margin:0 0 14px;background:#fff;color:inherit}
  input:focus{outline:2px solid #1F2A44;outline-offset:1px}
  button,.btn{display:block;width:100%;font:inherit;font-weight:600;padding:13px;border:0;border-radius:12px;background:#1F2A44;color:#fff;cursor:pointer;text-align:center;text-decoration:none}
  button:disabled{opacity:.6;cursor:default}
  .err{color:#B3261E;font-size:14px;min-height:20px;margin:0 0 10px}
  .muted{margin-top:16px;font-size:13px;text-align:center}
  .muted a{color:#1F2A44}
`

function shell(title: string, inner: string) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title}</title><style>${STYLE}</style></head><body><div class="wrap"><div class="card">${inner}</div></div></body></html>`
}

function loginPage() {
  return shell('Вход — КайКитай', `
    <h1>Войдите, чтобы открыть материал</h1>
    <p>Используйте email и пароль от вашего личного кабинета КайКитай.</p>
    <form id="f" novalidate>
      <label for="e">Email</label>
      <input id="e" type="email" autocomplete="username" required>
      <label for="p">Пароль</label>
      <input id="p" type="password" autocomplete="current-password" required>
      <div class="err" id="m" role="alert"></div>
      <button id="b" type="submit">Войти</button>
    </form>
    <div class="muted">Не помните пароль? Напишите Яне или в <a href="https://t.me/ash_china">поддержку</a>.</div>
    <script>
      var f=document.getElementById('f'),b=document.getElementById('b'),m=document.getElementById('m');
      f.addEventListener('submit',function(ev){
        ev.preventDefault();m.textContent='';
        var email=document.getElementById('e').value.trim(),password=document.getElementById('p').value;
        if(!email||!password){m.textContent='Введите email и пароль';return}
        b.disabled=true;b.textContent='Входим…';
        fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})})
          .then(function(r){return r.json().catch(function(){return {}}).then(function(d){return {ok:r.ok,d:d}})})
          .then(function(x){if(x.ok){location.reload()}else{m.textContent=x.d.error||'Не удалось войти';b.disabled=false;b.textContent='Войти'}})
          .catch(function(){m.textContent='Нет связи с сервером. Попробуйте ещё раз.';b.disabled=false;b.textContent='Войти'});
      });
    </script>`)
}

function deniedPage() {
  return shell('Нет доступа — КайКитай', `
    <h1>Этот материал для сопровождения</h1>
    <p>Он открыт только семьям на сопровождении КайКитай. Если вы на сопровождении и видите это сообщение, напишите Яне.</p>
    <button id="o" type="button">Войти в другой аккаунт</button>
    <script>
      document.getElementById('o').addEventListener('click',function(){
        fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}).finally(function(){location.reload()});
      });
    </script>`)
}
