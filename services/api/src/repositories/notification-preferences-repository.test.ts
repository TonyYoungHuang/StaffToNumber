import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { getNotificationPreferences, updateNotificationPreferences } from "./notification-preferences-repository.js";

function createTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_notification_preferences (
      user_id TEXT PRIMARY KEY,
      email_classroom_announcements INTEGER NOT NULL DEFAULT 0,
      locale TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE score_notification_deliveries (
      id TEXT PRIMARY KEY, recipient_user_id TEXT, channel TEXT NOT NULL, status TEXT NOT NULL,
      locked_at TEXT, updated_at TEXT NOT NULL
    );
  `);
  return db;
}

test("notification email delivery is opt-in and preferences update idempotently", () => {
  const db = createTestDb();
  assert.deepEqual(getNotificationPreferences(db, "user-1"), {
    emailClassroomAnnouncements: false,
    locale: "en",
    updatedAt: null,
  });

  const enabled = updateNotificationPreferences(db, {
    userId: "user-1",
    emailClassroomAnnouncements: true,
    locale: "zh-CN",
  });
  assert.equal(enabled.emailClassroomAnnouncements, true);
  assert.equal(enabled.locale, "zh-CN");

  const disabled = updateNotificationPreferences(db, {
    userId: "user-1",
    emailClassroomAnnouncements: false,
    locale: "en",
  });
  assert.equal(disabled.emailClassroomAnnouncements, false);
  assert.equal(disabled.locale, "en");
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_notification_preferences").get() as { count: number }).count, 1);
});

test("opting out cancels pending email deliveries without changing sent history", () => {
  const db = createTestDb();
  updateNotificationPreferences(db, { userId: "user-1", emailClassroomAnnouncements: true, locale: "en" });
  db.prepare("INSERT INTO score_notification_deliveries VALUES ('queued', 'user-1', 'email', 'queued', NULL, 'old'), ('sent', 'user-1', 'email', 'sent', NULL, 'old')").run();
  updateNotificationPreferences(db, { userId: "user-1", emailClassroomAnnouncements: false, locale: "en" });
  const rows = (db.prepare("SELECT id, status FROM score_notification_deliveries ORDER BY id").all() as Array<{ id: string; status: string }>)
    .map((item) => ({ id: item.id, status: item.status }));
  assert.deepEqual(rows, [{ id: "queued", status: "cancelled" }, { id: "sent", status: "sent" }]);
});
