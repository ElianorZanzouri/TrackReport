// Centralized list of application statuses.
// Keys must match the SQL type `application_status` exactly.
export const STATUS: Record<string, { label: string; color: string }> = {
  applied: { label: 'Applied', color: '#6B74E8' },
  pending: { label: 'Pending', color: '#8A93A3' },
  contacted: { label: 'First contact', color: '#8B5CF6' },
  screening_interview: { label: 'Screening', color: '#0EA5E9' },
  interview: { label: 'Interview', color: '#F59E0B' },
  hired: { label: 'Hired', color: '#15A34A' },
  rejected: { label: 'Rejected', color: '#9AA0AA' },
}

// Returns a label/color pair without crashing on an unknown value.
export function statusInfo(value: string) {
  return STATUS[value] ?? { label: value, color: '#9AA0AA' }
}