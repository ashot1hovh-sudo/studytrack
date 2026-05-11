export type ApplicationStatus = 'applied' | 'response' | 'enrolled' | 'rejected' | 'planned'
export type DocumentStatus = 'not_started' | 'in_progress' | 'completed' | 'uploaded'
export type StageStatus = 'completed' | 'current' | 'pending'

export interface StudentProfile {
  id: string
  email: string
  fullName: string
  role: 'student' | 'parent' | 'consultant'
  age?: number | null
  program?: 'language_year' | 'bachelor' | 'master' | null
  serviceType: 'diy' | 'premium'
  subscriptionStatus: 'trial' | 'active' | 'inactive'
  pinCode?: string | null
}

export interface University {
  id: number
  name: string
  status: ApplicationStatus
  deadline: string
  rawDeadline?: string | null
  portalUrl: string
  price?: string | null
  examRequirements?: string | null
  city?: string | null
  major?: string | null
  consultantNote?: string
  history: { date: string; event: string }[]
}

export interface StudentDocument {
  id: number
  name: string
  status: DocumentStatus
  deadline?: string
  rawDeadline?: string | null
  fileUrl?: string | null
  fileName?: string | null
  uploadedAt?: string | null
  targetUniversityId?: number | null
  targetUniversityName?: string | null
  reviewComment?: string | null
  reviewFileUrl?: string | null
  reviewFileName?: string | null
}

export interface AdminUpload {
  id: number
  name: string
  status: DocumentStatus
  deadline?: string
  fileUrl?: string | null
  fileName?: string | null
  uploadedAt?: string | null
  reviewComment?: string | null
  reviewFileUrl?: string | null
  reviewFileName?: string | null
  student: {
    id: string
    email: string
    fullName: string
  }
}

export interface AdminStudentSummary {
  id: string
  email: string
  fullName: string
  age?: number | null
  program?: 'language_year' | 'bachelor' | 'master' | null
  serviceType: 'diy' | 'premium'
  subscriptionStatus: 'trial' | 'active' | 'inactive'
  pinCode?: string | null
  documentsTotal: number
  documentsCompleted: number
  documentsPendingReview: number
  universitiesTotal: number
  urgentDeadlines: number
}

export interface AdminUniversity {
  id: number
  name: string
  status: ApplicationStatus
  deadline: string
  rawDeadline?: string | null
  portalUrl: string
  consultantNote?: string | null
}

export interface Deadline {
  id: number
  date: string
  month: string
  title: string
  university: string
  context: string
  isUrgent: boolean
}

export interface RoadmapStage {
  id: number
  name: string
  status: StageStatus
  description: string
}

export interface NextAction {
  id: number
  title: string
  deadline?: string
  actionButtonText: string
}
