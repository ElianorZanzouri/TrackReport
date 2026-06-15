// Local database (IndexedDB via Dexie). Mirrors Supabase tables
// + an outbox queue for writes done offline.
import Dexie, { type Table } from 'dexie'

export type Profil = {
  id: string
  full_name: string | null
  mail: string | null
  about: string | null
}
export type Company = {
  id: string
  user_id: string
  company_name: string
  domain: string | null
  notes: string | null
  created_at?: string
}
export type Contact = {
  id: string
  user_id: string
  company_id: string
  name: string
  position: string | null
  mail: string | null
  phone: string | null
  notes: string | null
  created_at?: string
}
export type Application = {
  id: string
  user_id: string
  company_id: string | null
  position: string
  description: string | null
  date_update: string | null
  status_actuel: string
  created_at?: string
}
export type HistoryStatus = {
  id: string
  user_id: string
  application_id: string
  status: string
  date_updated: string
  reason: string | null
}
export type Interview = {
  id: string
  user_id: string
  question: string
  answer: string | null
  category: string | null
  tags: string[] | null
  created_at?: string
}

// An operation waiting to be sent to Supabase.
export type OutboxOp = {
  id?: number // auto-incrément
  table: string
  op: 'insert' | 'update' | 'delete'
  rowId: string
  payload?: any
  created_at: number
}

class TrackReportDB extends Dexie {
  profils!: Table<Profil, string>
  companies!: Table<Company, string>
  contacts!: Table<Contact, string>
  applications!: Table<Application, string>
  histories_status!: Table<HistoryStatus, string>
  interview!: Table<Interview, string>
  outbox!: Table<OutboxOp, number>

  constructor() {
    super('trackreport')
    this.version(1).stores({
      profils: 'id',
      companies: 'id, user_id, company_name',
      contacts: 'id, user_id, company_id',
      applications: 'id, user_id, company_id, created_at',
      histories_status: 'id, application_id, date_updated',
      interview: 'id, user_id, created_at',
    })
    // Version 2 : on ajoute la file d'attente.
    this.version(2).stores({
      outbox: '++id, table, rowId',
    })
  }
}

export const db = new TrackReportDB()