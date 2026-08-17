import crypto from "node:crypto";
import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { PRODUCT_NAME } from "@score/shared";

export type ClaimedNotificationDelivery = {
  id: string;
  notificationId: string;
  destination: string;
  attempts: number;
  locale: "zh-CN" | "en";
  classroomName: string;
  title: string;
  body: string;
};

type RecipientRow = { user_id: string; email: string };

export function materializeDueNotificationDeliveries(db: RuntimeDatabaseLike, now: string, limit = 20) {
  const notifications = db.prepare(`
    SELECT id, classroom_id
    FROM score_classroom_notifications
    WHERE archived_at IS NULL AND delivery_prepared_at IS NULL
      AND datetime(published_at) <= datetime(?)
    ORDER BY datetime(published_at), id
    LIMIT ?
  `).all(now, limit) as Array<{ id: string; classroom_id: string }>;
  let deliveriesCreated = 0;

  for (const notification of notifications) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = db.prepare(`
        SELECT id FROM score_classroom_notifications
        WHERE id = ? AND archived_at IS NULL AND delivery_prepared_at IS NULL
          AND datetime(published_at) <= datetime(?)
      `).get(notification.id, now);
      if (!current) {
        db.exec("COMMIT");
        continue;
      }
      const recipients = db.prepare(`
        SELECT DISTINCT recipients.user_id, users.email
        FROM (
          SELECT students.user_id
          FROM score_classroom_students students
          WHERE students.classroom_id = ? AND students.status = 'active' AND students.user_id IS NOT NULL
          UNION
          SELECT guardians.user_id
          FROM score_student_guardians guardians
          JOIN score_classroom_students students ON students.id = guardians.student_id
          WHERE students.classroom_id = ? AND students.status = 'active'
            AND guardians.status = 'active' AND guardians.removed_at IS NULL AND guardians.user_id IS NOT NULL
        ) recipients
        JOIN users ON users.id = recipients.user_id AND users.account_status = 'active'
        JOIN score_notification_preferences preferences ON preferences.user_id = recipients.user_id
          AND preferences.email_classroom_announcements = 1
      `).all(notification.classroom_id, notification.classroom_id) as RecipientRow[];
      const insert = db.prepare(`
        INSERT OR IGNORE INTO score_notification_deliveries (
          id, notification_id, recipient_user_id, channel, destination, status, attempts,
          next_attempt_at, locked_at, provider_message_id, last_error, sent_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'email', ?, 'queued', 0, ?, NULL, NULL, NULL, NULL, ?, ?)
      `);
      for (const recipient of recipients) {
        deliveriesCreated += Number(insert.run(
          crypto.randomUUID(), notification.id, recipient.user_id, recipient.email, now, now, now,
        ).changes);
      }
      db.prepare("UPDATE score_classroom_notifications SET delivery_prepared_at = ? WHERE id = ?")
        .run(now, notification.id);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return { notificationsPrepared: notifications.length, deliveriesCreated };
}
export function claimNextNotificationDelivery(db: RuntimeDatabaseLike, now: string, staleBefore: string) {
  return db.prepare(`
    UPDATE score_notification_deliveries
    SET status = 'processing', attempts = attempts + 1, locked_at = ?, updated_at = ?
    WHERE id = (
      SELECT deliveries.id
      FROM score_notification_deliveries deliveries
      JOIN score_classroom_notifications notifications ON notifications.id = deliveries.notification_id
      JOIN score_notification_preferences preferences ON preferences.user_id = deliveries.recipient_user_id
      WHERE deliveries.channel = 'email' AND notifications.archived_at IS NULL
        AND preferences.email_classroom_announcements = 1
        AND (
          (deliveries.status = 'queued' AND datetime(deliveries.next_attempt_at) <= datetime(?))
          OR (deliveries.status = 'processing' AND datetime(deliveries.locked_at) <= datetime(?))
        )
      ORDER BY datetime(deliveries.next_attempt_at), datetime(deliveries.created_at), deliveries.id
      LIMIT 1
    )
    RETURNING id, notification_id AS notificationId, destination, attempts,
      (SELECT CASE WHEN locale = 'zh-CN' THEN 'zh-CN' ELSE 'en' END FROM score_notification_preferences WHERE user_id = score_notification_deliveries.recipient_user_id) AS locale,
      (SELECT classrooms.name FROM score_classroom_notifications notifications JOIN score_classrooms classrooms ON classrooms.id = notifications.classroom_id WHERE notifications.id = score_notification_deliveries.notification_id) AS classroomName,
      (SELECT title FROM score_classroom_notifications WHERE id = score_notification_deliveries.notification_id) AS title,
      (SELECT body FROM score_classroom_notifications WHERE id = score_notification_deliveries.notification_id) AS body
  `).get(now, now, now, staleBefore) as ClaimedNotificationDelivery | undefined;
}

export async function sendNotificationEmail(input: {
  delivery: ClaimedNotificationDelivery;
  apiKey: string;
  from: string;
  replyTo?: string;
  appUrl?: string;
  fetchImpl?: typeof fetch;
}) {
  if (!input.apiKey || !input.from) throw new Error("Email provider is not configured.");
  const isChinese = input.delivery.locale === "zh-CN";
  const subject = `${input.delivery.classroomName}: ${input.delivery.title}`;
  const settingsUrl = input.appUrl ? `${input.appUrl.replace(/\/$/u, "")}/student` : "";
  const footer = isChinese
    ? `此邮件由你在 ${PRODUCT_NAME} 的课堂通知偏好触发。${settingsUrl ? `可在 ${settingsUrl} 修改通知设置。` : ""}`
    : `You received this because classroom email announcements are enabled in ${PRODUCT_NAME}.${settingsUrl ? ` Manage notification settings at ${settingsUrl}.` : ""}`;
  const response = await (input.fetchImpl ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `classroom-notification/${input.delivery.id}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.delivery.destination],
      subject,
      text: `${input.delivery.body}\n\n${footer}`,
      html: `<h1>${escapeHtml(input.delivery.title)}</h1><p>${escapeHtml(input.delivery.body).replaceAll("\n", "<br>")}</p><hr><p>${escapeHtml(footer)}</p>`,
      reply_to: input.replyTo || undefined,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 1000);
    throw new Error(`Email provider returned ${response.status}${detail ? `: ${detail}` : "."}`);
  }
  const payload = await response.json().catch(() => ({})) as { id?: string };
  return { providerMessageId: payload.id ?? null };
}

export function markNotificationDeliverySent(db: RuntimeDatabaseLike, input: { id: string; providerMessageId: string | null; now: string }) {
  db.prepare(`
    UPDATE score_notification_deliveries
    SET status = 'sent', provider_message_id = ?, sent_at = ?, locked_at = NULL,
        last_error = NULL, updated_at = ?
    WHERE id = ? AND status = 'processing'
  `).run(input.providerMessageId, input.now, input.now, input.id);
}

export function markNotificationDeliveryFailed(db: RuntimeDatabaseLike, input: {
  id: string;
  attempts: number;
  error: string;
  now: string;
  maxAttempts: number;
  baseDelayMs: number;
}) {
  const terminal = input.attempts >= input.maxAttempts;
  const delay = input.baseDelayMs * Math.pow(2, Math.max(0, input.attempts - 1));
  const nextAttemptAt = new Date(new Date(input.now).getTime() + delay).toISOString();
  db.prepare(`
    UPDATE score_notification_deliveries
    SET status = ?, next_attempt_at = ?, locked_at = NULL, last_error = ?, updated_at = ?
    WHERE id = ? AND status = 'processing'
  `).run(terminal ? "failed" : "queued", nextAttemptAt, input.error.slice(0, 2000), input.now, input.id);
  return { terminal, nextAttemptAt };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
