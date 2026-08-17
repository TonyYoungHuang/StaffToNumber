import type { RuntimeDatabaseLike } from "@score/runtime-database";

export type NotificationPreferences = {
  emailClassroomAnnouncements: boolean;
  locale: "zh-CN" | "en";
  updatedAt: string | null;
};

type PreferenceRow = {
  email_classroom_announcements: number;
  locale: string;
  updated_at: string;
};

function mapPreferences(row: PreferenceRow | undefined): NotificationPreferences {
  return {
    emailClassroomAnnouncements: row?.email_classroom_announcements === 1,
    locale: row?.locale === "zh-CN" ? "zh-CN" : "en",
    updatedAt: row?.updated_at ?? null,
  };
}
export function getNotificationPreferences(db: RuntimeDatabaseLike, userId: string) {
  const row = db.prepare(`
    SELECT email_classroom_announcements, locale, updated_at
    FROM score_notification_preferences
    WHERE user_id = ?
  `).get(userId) as PreferenceRow | undefined;
  return mapPreferences(row);
}

export function updateNotificationPreferences(db: RuntimeDatabaseLike, input: {
  userId: string;
  emailClassroomAnnouncements: boolean;
  locale: "zh-CN" | "en";
}) {
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO score_notification_preferences (
        user_id, email_classroom_announcements, locale, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email_classroom_announcements = excluded.email_classroom_announcements,
        locale = excluded.locale,
        updated_at = excluded.updated_at
    `).run(input.userId, input.emailClassroomAnnouncements ? 1 : 0, input.locale, now, now);
    if (!input.emailClassroomAnnouncements) {
      db.prepare(`
        UPDATE score_notification_deliveries
        SET status = 'cancelled', locked_at = NULL, updated_at = ?
        WHERE recipient_user_id = ? AND channel = 'email' AND status IN ('queued', 'processing')
      `).run(now, input.userId);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getNotificationPreferences(db, input.userId);
}
