// Synchronization between the local database (Dexie) and YOUR API backend.
import { apiGet, apiPost, apiPatch, apiDelete } from './api'
import { db } from './db'

// Mapping local table -> API endpoint.
const ENDPOINT: Record<string, string> = {
  companies: '/companies',
  contacts: '/contacts',
  applications: '/applications',
  histories_status: '/histories',
  interview: '/interviews',
}

// Tell the interface to refresh the sync queue counter.
function emitChange() {
  try {
    window.dispatchEvent(new Event('tr-sync'))
  } catch {}
}

// ---------- Pull (server -> local) ----------
export async function pullAll() {
  if (!navigator.onLine) return
  try {
    const [companies, contacts, applications, histories, interview, profile] =
      await Promise.all([
        apiGet('/companies'),
        apiGet('/contacts'),
        apiGet('/applications'),
        apiGet('/histories'),
        apiGet('/interviews'),
        apiGet('/profile'),
      ])

    await db.transaction(
      'rw',
      [db.profils, db.companies, db.contacts, db.applications, db.histories_status, db.interview],
      async () => {
        await db.companies.clear(); await db.companies.bulkPut(companies ?? [])
        await db.contacts.clear(); await db.contacts.bulkPut(contacts ?? [])
        await db.applications.clear(); await db.applications.bulkPut(applications ?? [])
        await db.histories_status.clear(); await db.histories_status.bulkPut(histories ?? [])
        await db.interview.clear(); await db.interview.bulkPut(interview ?? [])

        // The profile lives in the users table on the server (field "email"),
        // but locally we keep the field "mail" expected by the app.
        await db.profils.clear()
        if (profile) {
          await db.profils.put({
            id: profile.id,
            full_name: profile.full_name ?? null,
            mail: profile.email ?? null,
            about: profile.about ?? null,
          } as any)
        }
      }
    )
  } catch (e) {
    console.warn('pullAll : synchronisation impossible', e)
  }
}

// Ordre d'envoi : les tables "parentes" d'abord, pour respecter les dépendances.
const TABLE_ORDER: Record<string, number> = {
  companies: 1,       // avant applications et contacts
  applications: 2,    // avant histories_status
  contacts: 3,
  histories_status: 4,
  interview: 5,
  profils: 6,
}

// ---------- Remonter (local -> serveur) ----------
// ---------- Remonter (local -> serveur) ----------
export async function pushOutbox() {
  if (!navigator.onLine) return

  // On traite STRICTEMENT dans l'ordre de création (id croissant).
  // Ainsi une dépendance (entreprise, candidature) part toujours avant
  // ce qui en dépend (candidature, historique).
  const ops = await db.outbox.orderBy('id').toArray()

  for (const op of ops) {
    try {
      if (op.table === 'profils') {
        await apiPatch('/profile', op.payload ?? {})
      } else {
        const base = ENDPOINT[op.table]
        if (!base) throw new Error('Table inconnue : ' + op.table)
        if (op.op === 'insert') {
          await apiPost(base, op.payload)
        } else if (op.op === 'update') {
          await apiPatch(`${base}/${op.rowId}`, op.payload)
        } else if (op.op === 'delete') {
          await apiDelete(`${base}/${op.rowId}`)
        }
      }
      await db.outbox.delete(op.id!)
      emitChange()
    } catch (e) {
      // On s'arrête à la première opération en échec pour préserver l'ordre.
      // Elle (et les suivantes) seront réessayées à la prochaine synchro.
      console.warn('pushOutbox : arrêt sur échec, on réessaiera', op, e)
      break
    }
  }
}

// ---------- Synchronisation complète ----------
export async function syncAll() {
  await pushOutbox()
  await pullAll()
}

let syncing = false
export async function syncSoon() {
  if (!navigator.onLine || syncing) return
  syncing = true
  window.dispatchEvent(new Event('tr-sync-start'))
  try {
    await syncAll()
  } finally {
    syncing = false
    window.dispatchEvent(new Event('tr-sync-end'))
    emitChange()
  }
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count()
}

// ---------- Écritures locales (inchangées) ----------
export async function localInsert(table: string, row: any) {
  await (db as any)[table].put(row)
  await db.outbox.add({ table, op: 'insert', rowId: row.id, payload: row, created_at: Date.now() })
  emitChange()
  void syncSoon()
}

export async function localUpdate(table: string, id: string, changes: any) {
  await (db as any)[table].update(id, changes)
  await db.outbox.add({ table, op: 'update', rowId: id, payload: changes, created_at: Date.now() })
  emitChange()
  void syncSoon()
}

export async function localDelete(table: string, id: string) {
  await (db as any)[table].delete(id)
  await db.outbox.add({ table, op: 'delete', rowId: id, created_at: Date.now() })
  emitChange()
  void syncSoon()
}