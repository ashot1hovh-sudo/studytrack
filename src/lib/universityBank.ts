// Shared column lists + row→JSON serializers for the university-bank / shortlist
// admin routes. Lives here (not in a route.ts) because a Next.js route module
// may only export HTTP handlers and a few reserved config fields — exporting a
// helper from route.ts is a build error.

export const BANK_COLUMNS =
  'id,university_name,program,city,link,arwu,china_rank,tuition,exam_requirements,deadline,dorm_cost,notes,verified_at,verified_by'

export const SHORTLIST_ITEM_COLUMNS =
  'id,bank_id,university_name,program,city,link,arwu,china_rank,tuition,exam_requirements,deadline,dorm_cost,notes,added_at'

export function serializeBankRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    universityName: row.university_name,
    program: row.program,
    city: row.city,
    link: row.link,
    arwu: row.arwu,
    chinaRank: row.china_rank,
    tuition: row.tuition,
    examRequirements: row.exam_requirements,
    deadline: row.deadline,
    dormCost: row.dorm_cost,
    notes: row.notes,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
  }
}

export function serializeShortlistItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    bankId: row.bank_id,
    universityName: row.university_name,
    program: row.program,
    city: row.city,
    link: row.link,
    arwu: row.arwu,
    chinaRank: row.china_rank,
    tuition: row.tuition,
    examRequirements: row.exam_requirements,
    deadline: row.deadline,
    dormCost: row.dorm_cost,
    notes: row.notes,
    addedAt: row.added_at,
  }
}
