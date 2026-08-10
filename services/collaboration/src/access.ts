import type { DatabaseSync } from "node:sqlite";

export type CollaborationAccess = {
  actorId: string;
  actorName: string;
  role: "owner" | "editor" | "commenter" | "viewer";
  readOnly: boolean;
};

export function resolveCollaborationAccess(db: DatabaseSync, documentId: string, token: string, now = new Date().toISOString()): CollaborationAccess | null {
  const owner = db.prepare(`
    SELECT users.id AS actor_id, users.email AS actor_name
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    JOIN score_documents ON score_documents.user_id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ? AND sessions.revoked_at IS NULL AND score_documents.id = ?
  `).get(token, now, documentId) as { actor_id: string; actor_name: string } | undefined;
  if (owner) return { actorId: owner.actor_id, actorName: owner.actor_name, role: "owner", readOnly: false };

  const share = db.prepare(`
    SELECT score_shares.id AS actor_id, score_shares.permission, score_shares.label
    FROM score_shares
    WHERE score_shares.share_token = ? AND score_shares.document_id = ? AND score_shares.revoked_at IS NULL
      AND (score_shares.expires_at IS NULL OR score_shares.expires_at > ?)
  `).get(token, documentId, now) as { actor_id: string; permission: string; label: string | null } | undefined;
  if (!share) return null;
  const role = share.permission === "edit" ? "editor" : share.permission === "comment" ? "commenter" : "viewer";
  return {
    actorId: `share:${share.actor_id}`,
    actorName: share.label || (role === "editor" ? "Shared editor" : role === "commenter" ? "Shared commenter" : "Shared viewer"),
    role,
    readOnly: role !== "editor",
  };
}
