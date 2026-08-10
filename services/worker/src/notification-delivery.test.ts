import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  claimNextNotificationDelivery,
  markNotificationDeliveryFailed,
  markNotificationDeliverySent,
  materializeDueNotificationDeliveries,
  sendNotificationEmail,
} from "./notification-delivery.js";

function createDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, account_status TEXT NOT NULL);
    CREATE TABLE score_classrooms (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE score_classroom_students (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, user_id TEXT, status TEXT NOT NULL);
    CREATE TABLE score_student_guardians (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, user_id TEXT, status TEXT NOT NULL, removed_at TEXT);
    CREATE TABLE score_notification_preferences (user_id TEXT PRIMARY KEY, email_classroom_announcements INTEGER NOT NULL, locale TEXT NOT NULL);
    CREATE TABLE score_classroom_notifications (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, published_at TEXT NOT NULL, delivery_prepared_at TEXT, archived_at TEXT);
    CREATE TABLE score_notification_deliveries (
      id TEXT PRIMARY KEY, notification_id TEXT NOT NULL, recipient_user_id TEXT, channel TEXT NOT NULL,
      destination TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, next_attempt_at TEXT NOT NULL,
      locked_at TEXT, provider_message_id TEXT, last_error TEXT, sent_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(notification_id, recipient_user_id, channel)
    );
  `);
  db.prepare("INSERT INTO score_classrooms VALUES ('class-1', 'Choir')").run();
  db.prepare("INSERT INTO users VALUES ('student-user', 'student@example.test', 'active'), ('guardian-user', 'guardian@example.test', 'active'), ('optout-user', 'off@example.test', 'active')").run();
  db.prepare("INSERT INTO score_classroom_students VALUES ('student-1', 'class-1', 'student-user', 'active'), ('student-2', 'class-1', 'optout-user', 'active')").run();
  db.prepare("INSERT INTO score_student_guardians VALUES ('guardian-1', 'student-1', 'guardian-user', 'active', NULL), ('guardian-2', 'student-2', 'guardian-user', 'active', NULL)").run();
  db.prepare("INSERT INTO score_notification_preferences VALUES ('student-user', 1, 'en'), ('guardian-user', 1, 'zh-CN'), ('optout-user', 0, 'en')").run();
  return db;
}

test("due announcements create one delivery per opted-in user and claim atomically", () => {
  const db = createDb();
  const now = "2026-07-16T12:00:00.000Z";
  db.prepare("INSERT INTO score_classroom_notifications VALUES ('notice-1', 'class-1', 'Rehearsal', 'Bring your score.', ?, NULL, NULL)").run(now);
  db.prepare("INSERT INTO score_classroom_notifications VALUES ('future', 'class-1', 'Future', 'Not due.', '2026-07-17T12:00:00.000Z', NULL, NULL)").run();
  db.prepare("INSERT INTO score_classroom_notifications VALUES ('cancelled', 'class-1', 'Cancelled', 'Do not send.', ?, NULL, ?)").run(now, now);
  assert.deepEqual(materializeDueNotificationDeliveries(db, now), { notificationsPrepared: 1, deliveriesCreated: 2 });
  assert.deepEqual(materializeDueNotificationDeliveries(db, now), { notificationsPrepared: 0, deliveriesCreated: 0 });
  assert.equal((db.prepare("SELECT count(*) AS count FROM score_notification_deliveries WHERE notification_id IN ('future', 'cancelled')").get() as { count: number }).count, 0);

  const first = claimNextNotificationDelivery(db, now, "2026-07-16T11:45:00.000Z");
  const second = claimNextNotificationDelivery(db, now, "2026-07-16T11:45:00.000Z");
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.id, second.id);
  assert.equal(claimNextNotificationDelivery(db, now, "2026-07-16T11:45:00.000Z"), undefined);
  markNotificationDeliverySent(db, { id: first.id, providerMessageId: "resend-1", now });
  const retry = markNotificationDeliveryFailed(db, { id: second.id, attempts: second.attempts, error: "rate limited", now, maxAttempts: 8, baseDelayMs: 60_000 });
  assert.equal(retry.terminal, false);
  assert.equal((db.prepare("SELECT status FROM score_notification_deliveries WHERE id = ?").get(first.id) as { status: string }).status, "sent");
  assert.equal((db.prepare("SELECT status FROM score_notification_deliveries WHERE id = ?").get(second.id) as { status: string }).status, "queued");
});

test("email delivery uses a stable provider idempotency key and escapes announcement HTML", async () => {
  const db = createDb();
  const now = "2026-07-16T12:00:00.000Z";
  db.prepare("INSERT INTO score_classroom_notifications VALUES ('notice-1', 'class-1', '<Rehearsal>', 'Bring & review.', ?, NULL, NULL)").run(now);
  materializeDueNotificationDeliveries(db, now);
  const delivery = claimNextNotificationDelivery(db, now, "2026-07-16T11:45:00.000Z");
  assert.ok(delivery);
  let request: RequestInit | undefined;
  await sendNotificationEmail({
    delivery,
    apiKey: "test-key",
    from: "Classroom <classroom@example.test>",
    fetchImpl: async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ id: "provider-1" }), { status: 200 });
    },
  });
  assert.equal((request?.headers as Record<string, string>)["Idempotency-Key"], `classroom-notification/${delivery.id}`);
  const payload = JSON.parse(String(request?.body)) as { html: string };
  assert.match(payload.html, /&lt;Rehearsal&gt;/u);
  assert.doesNotMatch(payload.html, /<Rehearsal>/u);
});
