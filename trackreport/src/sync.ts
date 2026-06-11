// Synchronisation entre la base locale (Dexie) et Supabase.
//  - pullAll  : descend les données du serveur vers le local
//  - pushOutbox : remonte les écritures locales en attente vers le serveur
//  - local*   : écrit en local + met l'opération en file d'attente
import { supabase } from './supabaseClient'
import { db } from './db'

// ---------- Descendre (serveur -> local) ----------
export async function pullAll() {
  if (!navigator.onLine) return
  try {
    const [profils, companies, contacts, applications, histories, interview] =
      await Promise.all([
        supabase.from('profils').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('contacts').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('histories_status').select('*'),
        supabase.from('interview').select('*'),
      ])

    await db.transaction(
      'rw',
      [db.profils, db.companies, db.contacts, db.applications, db.histories_status, db.interview],
      async () => {
        if (profils.data) { await db.profils.clear(); await db.profils.bulkPut(profils.data as any) }
        if (companies.data) { await db.companies.clear(); await db.companies.bulkPut(companies.data as any) }
        if (contacts.data) { await db.contacts.clear(); await db.contacts.bulkPut(contacts.data as any) }
        if (applications.data) { await db.applications.clear(); await db.applications.bulkPut(applications.data as any) }
        if (histories.data) { await db.histories_status.clear(); await db.histories_status.bulkPut(histories.data as any) }
        if (interview.data) { await db.interview.clear(); await db.interview.bulkPut(interview.data as any) }
      }
    )
  } catch (e) {
    console.warn('pullAll : synchronisation impossible', e)
  }
}

// ---------- Remonter (local -> serveur) ----------
export async function pushOutbox() {
  if (!navigator.onLine) return

  const ops = await db.outbox.orderBy('id').toArray()
  for (const op of ops) {
    try {
      if (op.op === 'insert') {
        // upsert = idempotent (si l'opération est rejouée, pas de doublon)
        const { error } = await supabase.from(op.table).upsert(op.payload)
        if (error) throw error
      } else if (op.op === 'update') {
        const { error } = await supabase
          .from(op.table)
          .update(op.payload)
          .eq('id', op.rowId)
        if (error) throw error
      } else if (op.op === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.rowId)
        if (error) throw error
      }
      await db.outbox.delete(op.id!)
    } catch (e) {
      // Probablement hors ligne : on s'arrête, on réessaiera plus tard.
      console.warn('pushOutbox : envoi interrompu, on réessaiera', e)
      break
    }
  }
}

// ---------- Synchronisation complète ----------
// On remonte d'abord les écritures locales, PUIS on redescend le serveur.
export async function syncAll() {
  await pushOutbox()
  await pullAll()
}

let syncing = false
export async function syncSoon() {
  if (!navigator.onLine || syncing) return
  syncing = true
  try {
    await syncAll()
  } finally {
    syncing = false
  }
}

// ---------- Écritures locales (avec mise en file d'attente) ----------
export async function localInsert(table: string, row: any) {
  await (db as any)[table].put(row)
  await db.outbox.add({
    table,
    op: 'insert',
    rowId: row.id,
    payload: row,
    created_at: Date.now(),
  })
  void syncSoon()
}

export async function localUpdate(table: string, id: string, changes: any) {
  await (db as any)[table].update(id, changes)
  await db.outbox.add({
    table,
    op: 'update',
    rowId: id,
    payload: changes,
    created_at: Date.now(),
  })
  void syncSoon()
}

export async function localDelete(table: string, id: string) {
  await (db as any)[table].delete(id)
  await db.outbox.add({
    table,
    op: 'delete',
    rowId: id,
    created_at: Date.now(),
  })
  void syncSoon()
}