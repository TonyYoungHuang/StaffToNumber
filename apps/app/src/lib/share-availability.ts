export function shareAvailability(share: { revokedAt?: string | null; expiresAt?: string | null }, now = Date.now()): "active" | "revoked" | "expired" {
  if (share.revokedAt) return "revoked";
  if (share.expiresAt && !(Date.parse(share.expiresAt) > now)) return "expired";
  return "active";
}
