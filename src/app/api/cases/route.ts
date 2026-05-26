import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────
export type StudentCase = {
  university: string
  result: string
  grant: string
  statsOriginal: string
  gpa: number | null        // normalized to /5 scale
  ielts: number | null
  toefl: number | null
  duolingo: number | null
  sat: number | null
  hskLevel: number | null
  hskScore: number | null
  csca_math: number | null
  csca_physics: number | null
  csca_chinese: number | null
  csca_chemistry: number | null
  direction: string
  activities: string
  note: string
  source: string
}

// ── Static fallback data (from Кейсы_поступления_2026_restructured.xlsx) ─────
const STATIC_CASES: StudentCase[] = [
  { university: "Northwestern Polytechnical University", result: "Поступление", grant: "Grant", statsOriginal: "CSCA Physics 57.5; CSCA Math 87.5; GPA 5/5", gpa: 5.0, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 87.5, csca_physics: 57.5, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Xi'an Jiaotong University", result: "Поступление", grant: "Full tuition", statsOriginal: "Interview good; точные статы не указаны", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "Interview; статы не указаны", source: "internal" },
  { university: "Northwestern Polytechnical University", result: "Поступление", grant: "Full tuition", statsOriginal: "GPA 5/5; IELTS 7.5", gpa: 5.0, ielts: 7.5, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Harbin Institute of Technology", result: "Поступление", grant: "Full tuition", statsOriginal: "IELTS 7; GPA 4; entry exams 80+ each", gpa: 4.0, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "entry exams: 80+", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Pre-admission", grant: "80% tuition waiver", statsOriginal: "GPA 5.0; IELTS 8.0; CSCA 85; Economics", gpa: 5.0, ielts: 8.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 85.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "Economics", activities: "", note: "CSCA (предмет не указан): 85", source: "internal" },
  { university: "Xi'an Jiaotong University", result: "Поступление", grant: "Grant", statsOriginal: "CSCA Math 92.5; IELTS 7; GPA 4.33", gpa: 4.33, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 92.5, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Nanjing University of Posts and Telecommunications", result: "Pre-admission", grant: "Full tuition на 1 год", statsOriginal: "Duolingo 110; GPA 5.0; CSCA Math 55", gpa: 5.0, ielts: null, toefl: null, duolingo: 110.0, sat: null, hskLevel: null, hskScore: null, csca_math: 55.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Zhejiang University", result: "Поступление", grant: "Type B scholarship", statsOriginal: "Business Accounting; IELTS 7; GPA 3.7/4; CSCA Math 80; 2 internships; football awards", gpa: 4.625, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 80.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "Business Accounting", activities: "internships; football awards", note: "", source: "internal" },
  { university: "Jiangsu University", result: "Поступление", grant: "50% scholarship", statsOriginal: "CSCA Physics 92.5; CSCA Math 97.5", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 97.5, csca_physics: 92.5, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "New York University Shanghai", result: "Поступление", grant: "50% tuition", statsOriginal: "IELTS 8; SAT Math 800; GPA 8.94/10; coding experience", gpa: 4.47, ielts: 8.0, toefl: null, duolingo: null, sat: 800.0, hskLevel: null, hskScore: null, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "coding experience", note: "", source: "internal" },
  { university: "Zhejiang University of Finance and Economics", result: "Поступление", grant: "50% scholarship", statsOriginal: "HSK5 225; HSKK 60; CSCA Chinese 84; CSCA Math 40; активности", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: 5.0, hskScore: 225.0, csca_math: 40.0, csca_physics: null, csca_chinese: 84.0, csca_chemistry: null, direction: "", activities: "активности", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Поступление", grant: "Scholarship", statsOriginal: "IELTS 7; GPA 5/5; CSCA Math 85; CSCA Physics 80", gpa: 5.0, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 85.0, csca_physics: 80.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Zhejiang University of Science and Technology", result: "Поступление", grant: "Scholarship", statsOriginal: "CSCA Math 75/100; IELTS 7.5; GPA 3.8-3.9/4; исследования, публикация, активности", gpa: 4.75, ielts: 7.5, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 75.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "исследования; публикация; курсы; активности", note: "", source: "internal" },
  { university: "Nanjing University of Aeronautics and Astronautics", result: "Offer", grant: "Scholarship 10k", statsOriginal: "CSCA Math 60; CSCA Physics 55; TOEFL 94; HSK3", gpa: null, ielts: null, toefl: 94.0, duolingo: null, sat: null, hskLevel: 3.0, hskScore: null, csca_math: 60.0, csca_physics: 55.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Pre-admission", grant: "Неясно", statsOriginal: "CSCA 92.5 и 80; GPA 4.3/5; Duolingo 120", gpa: 4.3, ielts: null, toefl: null, duolingo: 120.0, sat: null, hskLevel: null, hskScore: null, csca_math: 92.5, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "South China Normal University", result: "Pre-admission", grant: "Подавала на грант", statsOriginal: "CSCA Math 42; CSCA Chinese 80", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 42.0, csca_physics: null, csca_chinese: 80.0, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Beijing Institute of Technology", result: "Admitted", grant: "Финансирование не указано", statsOriginal: "IELTS 7; CSCA Math 100; CSCA Physics 85; extracurriculars", gpa: null, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 100.0, csca_physics: 85.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "extracurriculars", note: "", source: "internal" },
  { university: "Nanjing University of Information Science & Technology", result: "Поступление", grant: "Self-paid", statsOriginal: "IELTS 7.0; GPA 4.2; олимпиады; CSCA Math 52.5; CSCA Physics 55", gpa: 4.2, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 52.5, csca_physics: 55.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "олимпиады", note: "", source: "internal" },
  { university: "South China University of Technology", result: "Self-paid", grant: "Self-paid", statsOriginal: "IELTS 7.0; GPA 4.7; CSCA Math 67.5", gpa: 4.7, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 67.5, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Sichuan University", result: "Поступление", grant: "Платка", statsOriginal: "CSCA Physics 55; CSCA Math 60", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 60.0, csca_physics: 55.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Zhejiang Normal University", result: "Self-paid", grant: "Неясно", statsOriginal: "IELTS 6.0; CSCA 40; немецкие олимпиады; GPA 3.9", gpa: 3.9, ielts: 6.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 40.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "олимпиады", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University", result: "Rejection", grant: "—", statsOriginal: "IELTS 7; CSCA Math 100; CSCA Physics 85; extracurriculars", gpa: null, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 100.0, csca_physics: 85.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "extracurriculars", note: "", source: "internal" },
  { university: "Southern University of Science and Technology", result: "Rejection", grant: "—", statsOriginal: "IELTS 7; CSCA Math 100; CSCA Physics 85; extracurriculars", gpa: null, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 100.0, csca_physics: 85.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "extracurriculars", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Rejection", grant: "—", statsOriginal: "IELTS 7; CSCA Math 100; CSCA Physics 85; extracurriculars", gpa: null, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 100.0, csca_physics: 85.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "extracurriculars", note: "", source: "internal" },
  { university: "Northwestern Polytechnical University", result: "Rejection", grant: "—", statsOriginal: "IELTS 7; CSCA Math 100; CSCA Physics 85; extracurriculars", gpa: null, ielts: 7.0, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 100.0, csca_physics: 85.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "extracurriculars", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Rejection", grant: "—", statsOriginal: "CSCA Math 97.5; GPA 5/5; IELTS 7.5; олимпиады по математике/физике", gpa: 5.0, ielts: 7.5, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 97.5, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "олимпиады", note: "", source: "internal" },
  { university: "Hangzhou Dianzi University", result: "Rejection", grant: "—", statsOriginal: "HSK5 200; CSCA Physics 65; CSCA Math 100; SAT 1540; IELTS 8; олимпиады", gpa: null, ielts: 8.0, toefl: null, duolingo: null, sat: 1540.0, hskLevel: 5.0, hskScore: 200.0, csca_math: 100.0, csca_physics: 65.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "олимпиады", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Rejection", grant: "—", statsOriginal: "GPA около 3.8/4; HSK5 210+; CSCA Math 60; CSCA Chinese 80+", gpa: 4.75, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: 5.0, hskScore: 210.0, csca_math: 60.0, csca_physics: null, csca_chinese: 80.0, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Shanghai Electric Power University", result: "Rejection", grant: "—", statsOriginal: "HSK4 206; CSCA average около 55", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: 4.0, hskScore: 206.0, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Harbin Institute of Technology, Shenzhen", result: "Rejection", grant: "—", statsOriginal: "CSCA Math 60; Physics 55; TOEFL 94; HSK3; 840 часов волонтёрства", gpa: null, ielts: null, toefl: 94.0, duolingo: null, sat: null, hskLevel: 3.0, hskScore: null, csca_math: 60.0, csca_physics: 55.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "олонтёрства; награды; проекты", note: "840 часов волонтёрства", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Admitted", grant: "First Class Scholarship", statsOriginal: "SAT 1560; CSCA Math 80; Duolingo 135; IELTS 7.0", gpa: null, ielts: 7.0, toefl: null, duolingo: 135.0, sat: 1560.0, hskLevel: null, hskScore: null, csca_math: 80.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Admitted", grant: "First-Class Scholarship", statsOriginal: "CSCA Math 70; CSCA Physics 75; SAT 1510; IELTS 8.0; grade average 96%", gpa: null, ielts: 8.0, toefl: null, duolingo: null, sat: 1510.0, hskLevel: null, hskScore: null, csca_math: 70.0, csca_physics: 75.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "Canadian math competitions; science fair; lab internship; coding club", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Admitted", grant: "First-Class Scholarship", statsOriginal: "CSCA Math 75; CSCA Physics 75; interview in March", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 75.0, csca_physics: 75.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "Internship; achievements in essays", note: "интервью", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Admitted", grant: "Second-class scholarship: 50% tuition", statsOriginal: "CSCA Math 77.5; CSCA Physics 44.5", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 77.5, csca_physics: 44.5, csca_chinese: null, csca_chemistry: null, direction: "Mechanical Engineering", activities: "", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Accepted", grant: "Third-class scholarship: 25% tuition", statsOriginal: "CSCA 90; SAT 1530", gpa: null, ielts: null, toefl: null, duolingo: null, sat: 1530.0, hskLevel: null, hskScore: null, csca_math: 90.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "", activities: "", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University Global College", result: "Admitted", grant: "No scholarship", statsOriginal: "CSCA Math 92.5; CSCA Physics 67.5; IELTS 7.5", gpa: null, ielts: 7.5, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 92.5, csca_physics: 67.5, csca_chinese: null, csca_chemistry: null, direction: "", activities: "Research paper; F1 projects; 2 AI agents", note: "", source: "internal" },
  { university: "Shanghai Jiao Tong University", result: "Admitted", grant: "First Class Scholarship: full tuition + 2500/month", statsOriginal: "SAT 1520; 9 APs; HSK6; CSCA not taken yet", gpa: null, ielts: null, toefl: null, duolingo: null, sat: 1520.0, hskLevel: 6.0, hskScore: null, csca_math: null, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "Math", activities: "A LOT of APs; interview", note: "", source: "internal" },
  { university: "Fudan University", result: "Pre-admitted", grant: "—", statsOriginal: "CSCA Physics 35%; other stats not found", gpa: null, ielts: null, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: null, csca_physics: 35.0, csca_chinese: null, csca_chemistry: null, direction: "", activities: "Interview", note: "", source: "internal" },
  { university: "Zhejiang University", result: "Admitted", grant: "—", statsOriginal: "IELTS 7.5; GPA 3.1; CSCA 85", gpa: 3.1, ielts: 7.5, toefl: null, duolingo: null, sat: null, hskLevel: null, hskScore: null, csca_math: 85.0, csca_physics: null, csca_chinese: null, csca_chemistry: null, direction: "GCM program", activities: "", note: "", source: "internal" },
  { university: "Zhejiang University", result: "Rejection", grant: "—", statsOriginal: "HSK5; CSCA Chinese 90.5; CSCA Physics 95; CSCA Math 86.5; CSCA Chemistry 78; SAT 1480", gpa: null, ielts: null, toefl: null, duolingo: null, sat: 1480.0, hskLevel: 5.0, hskScore: null, csca_math: 86.5, csca_physics: 95.0, csca_chinese: 90.5, csca_chemistry: 78.0, direction: "Bioengineering", activities: "", note: "", source: "internal" },
]

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseNum(v: string | undefined | null): number | null {
  if (!v) return null
  const cleaned = String(v).replace(',', '.').trim().replace(/\+$/, '')
  if (['', '--', '—', '-'].includes(cleaned)) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
    else { current += ch }
  }
  values.push(current.trim())
  return values
}

function parseCSV(text: string): StudentCase[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return STATIC_CASES
  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())

  return lines.slice(1).flatMap(line => {
    const vals = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim() })
    if (!row['Вуз']) return []

    const gpa = parseNum(row['GPA'])
    const gpaScale = parseNum(row['GPA_scale']) ?? 5
    return [{
      university: row['Вуз'] ?? '',
      result: row['Итог'] ?? '',
      grant: row['Грант'] ?? '',
      statsOriginal: row['Статы (оригинал)'] ?? '',
      gpa: gpa != null ? Math.round((gpa / gpaScale) * 500) / 100 : null,
      ielts: parseNum(row['IELTS']),
      toefl: parseNum(row['TOEFL']),
      duolingo: parseNum(row['Duolingo']),
      sat: parseNum(row['SAT']),
      hskLevel: parseNum(row['HSK_level']),
      hskScore: parseNum(row['HSK_score']),
      csca_math: parseNum(row['CSCA_Math']),
      csca_physics: parseNum(row['CSCA_Physics']),
      csca_chinese: parseNum(row['CSCA_Chinese']),
      csca_chemistry: parseNum(row['CSCA_Chemistry'] ?? ''),
      direction: row['Направление'] ?? '',
      activities: row['Активности'] ?? '',
      note: row['Примечание'] ?? '',
      source: row['Источник'] ?? 'sheet',
    }]
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────
export async function GET() {
  const sheetId = process.env.CASES_SHEET_ID

  if (sheetId) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
      if (res.ok) {
        const csv = await res.text()
        const cases = parseCSV(csv)
        if (cases.length > 0) {
          return NextResponse.json({ cases, source: 'sheet' })
        }
      }
    } catch {
      // fall through to static data
    }
  }

  return NextResponse.json({ cases: STATIC_CASES, source: 'static' })
}
