const PENDING_KEY = 'trunk-pending-uploads'

/** Set of client_id values for events that failed to push */
const pendingUploadIds: Set<string> = new Set()

export function getPendingCount(): number {
  return pendingUploadIds.size
}

export function hasPendingId(clientId: string): boolean {
  return pendingUploadIds.has(clientId)
}

export function addPendingId(clientId: string): void {
  pendingUploadIds.add(clientId)
}

export function removePendingId(clientId: string): void {
  pendingUploadIds.delete(clientId)
}

export function getPendingIds(): string[] {
  return [...pendingUploadIds]
}

function loadPendingIds(): void {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => pendingUploadIds.add(id))
      }
    }
  } catch {
    // Ignore parse errors
  }
}

export function savePendingIds(): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify([...pendingUploadIds]))
  } catch {
    // Ignore storage errors for metadata
  }
}

// Load pending IDs eagerly on module init
loadPendingIds()
