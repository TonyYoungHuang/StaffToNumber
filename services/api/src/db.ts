import fs from "node:fs";
import path from "node:path";
import { createRuntimeDatabase } from "@score/runtime-database";
import { config } from "./config.js";
import { DATABASE_SCHEMA_VERSION } from "./schema-version.js";

if (config.runtimeDatabasePrimary === "sqlite") fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
fs.mkdirSync(config.storageDir, { recursive: true });

export const db = createRuntimeDatabase({
  primary: config.runtimeDatabasePrimary,
  sqliteFile: config.dbFile,
  postgresUrl: config.postgresUrl,
  postgresSchema: config.postgresSchema,
});
if (db.primary === "sqlite") {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
}

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

function currentSchemaVersion() {
  const row = db.prepare("PRAGMA user_version;").get() as { user_version: number } | undefined;
  return row?.user_version ?? 0;
}

export function initDb() {
  if (db.primary === "postgres") {
    validatePostgresSchema();
    return;
  }
  if (currentSchemaVersion() === DATABASE_SCHEMA_VERSION) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activation_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      entitlement_days INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      redeemed_at TEXT,
      redeemed_by_user_id TEXT,
      FOREIGN KEY (redeemed_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activation_code_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (activation_code_id) REFERENCES activation_codes(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_backend TEXT NOT NULL DEFAULT 'local',
      storage_key TEXT,
      checksum_sha256 TEXT,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS resumable_uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      expected_size_bytes INTEGER NOT NULL,
      session_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploading',
      file_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS resumable_upload_parts (
      upload_id TEXT NOT NULL,
      part_number INTEGER NOT NULL,
      etag TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (upload_id, part_number),
      FOREIGN KEY (upload_id) REFERENCES resumable_uploads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS storage_migration_claims (
      file_id TEXT PRIMARY KEY,
      claimed_by TEXT NOT NULL,
      claimed_at TEXT NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS storage_deletion_queue (
      id TEXT PRIMARY KEY,
      source_file_id TEXT NOT NULL,
      storage_backend TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_key TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      locked_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_dispatch_outbox (
      id TEXT PRIMARY KEY,
      queue_name TEXT NOT NULL,
      job_family TEXT NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      locked_at TEXT,
      dispatched_at TEXT,
      acknowledged_at TEXT,
      broker_job_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      input_file_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      result_kind TEXT NOT NULL,
      error_message TEXT,
      request_id TEXT,
      trace_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      output_file_id TEXT,
      draft_bundle_file_id TEXT,
      preview_text TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (input_file_id) REFERENCES files(id),
      FOREIGN KEY (output_file_id) REFERENCES files(id),
      FOREIGN KEY (draft_bundle_file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      public_token TEXT NOT NULL UNIQUE,
      user_id TEXT,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      customer_email TEXT,
      locale TEXT,
      entitlement_days INTEGER NOT NULL,
      billing_kind TEXT NOT NULL DEFAULT 'one_time',
      organization_id TEXT,
      seat_quantity INTEGER NOT NULL DEFAULT 1,
      idempotency_key_hash TEXT,
      checkout_session_id TEXT,
      transaction_id TEXT,
      checkout_url TEXT,
      amount_minor INTEGER,
      currency TEXT,
      activation_code_id TEXT,
      paid_at TEXT,
      cancelled_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (activation_code_id) REFERENCES activation_codes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS billing_customers (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_customer_id TEXT NOT NULL,
      user_id TEXT,
      organization_id TEXT,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_customer_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id)
    );

    CREATE TABLE IF NOT EXISTS billing_subscriptions (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_subscription_id TEXT NOT NULL,
      customer_id TEXT,
      user_id TEXT,
      organization_id TEXT,
      status TEXT NOT NULL,
      plan_ref TEXT,
      seat_quantity INTEGER NOT NULL DEFAULT 1,
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      canceled_at TEXT,
      ended_at TEXT,
      last_payment_failed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_subscription_id),
      FOREIGN KEY (customer_id) REFERENCES billing_customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id)
    );

    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_invoice_id TEXT NOT NULL,
      subscription_id TEXT,
      status TEXT NOT NULL,
      amount_due_minor INTEGER,
      amount_paid_minor INTEGER,
      amount_refunded_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT,
      hosted_url TEXT,
      due_at TEXT,
      paid_at TEXT,
      failed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_invoice_id),
      FOREIGN KEY (subscription_id) REFERENCES billing_subscriptions(id)
    );

    CREATE TABLE IF NOT EXISTS billing_webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_sha256 TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      received_at TEXT NOT NULL,
      processed_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_event_id)
    );

    CREATE TABLE IF NOT EXISTS billing_seat_assignments (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      user_id TEXT,
      assigned_email TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      revoked_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(subscription_id, assigned_email),
      FOREIGN KEY (subscription_id) REFERENCES billing_subscriptions(id),
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requested_email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS service_runtime (
      service_name TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      message TEXT,
      details_json TEXT,
      last_heartbeat_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_audit_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      outcome TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      request_id TEXT,
      trace_id TEXT,
      method TEXT,
      route_template TEXT,
      network_hash TEXT,
      resource_type TEXT,
      resource_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      locale TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT NOT NULL,
      account_email TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      order_reference TEXT,
      job_reference TEXT,
      source_page TEXT,
      source_context TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS copyright_complaints (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      access_code_hash TEXT NOT NULL,
      locale TEXT NOT NULL,
      claimant_name TEXT NOT NULL,
      claimant_email TEXT NOT NULL,
      organization TEXT,
      rights_basis TEXT NOT NULL,
      original_work_description TEXT NOT NULL,
      allegedly_infringing_urls_json TEXT NOT NULL,
      evidence_urls_json TEXT NOT NULL,
      requested_action TEXT NOT NULL,
      signature TEXT NOT NULL,
      good_faith_declared INTEGER NOT NULL,
      accuracy_declared INTEGER NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      acknowledged_at TEXT,
      response_due_at TEXT NOT NULL,
      resolved_at TEXT,
      action_taken TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS copyright_complaint_events (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      public_message TEXT,
      internal_note TEXT,
      action_taken TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES copyright_complaints(id)
    );

    CREATE TABLE IF NOT EXISTS score_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      current_revision_id TEXT,
      pending_revision_id TEXT,
      source_file_id TEXT,
      settings_json TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS score_revisions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      score_json TEXT NOT NULL,
      musicxml_file_id TEXT,
      created_from TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'accepted',
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (musicxml_file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS score_assets (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      asset_kind TEXT NOT NULL,
      revision_id TEXT,
      params_json TEXT,
      engine_json TEXT,
      checksum_sha256 TEXT,
      stale_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (file_id) REFERENCES files(id),
      FOREIGN KEY (revision_id) REFERENCES score_revisions(id)
    );

    CREATE TABLE IF NOT EXISTS score_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT,
      input_file_id TEXT,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      params_json TEXT,
      result_revision_id TEXT,
      output_file_ids_json TEXT,
      error_message TEXT,
      request_id TEXT,
      trace_id TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      cancel_requested_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (input_file_id) REFERENCES files(id),
      FOREIGN KEY (result_revision_id) REFERENCES score_revisions(id)
    );

    CREATE TABLE IF NOT EXISTS omr_diagnostics (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      document_id TEXT,
      diagnostics_json TEXT NOT NULL,
      confidence REAL,
      source_page_count INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES score_jobs(id),
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );

    CREATE TABLE IF NOT EXISTS score_comments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      share_id TEXT,
      author_name TEXT,
      body TEXT NOT NULL,
      target_json TEXT,
      resolved_at TEXT,
      resolved_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (share_id) REFERENCES score_shares(id),
      FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      share_token TEXT NOT NULL UNIQUE,
      permission TEXT NOT NULL,
      label TEXT,
      expires_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_collaboration_commands (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      base_revision_id TEXT NOT NULL,
      applied_revision_id TEXT,
      command_type TEXT NOT NULL,
      target_scopes_json TEXT NOT NULL,
      command_json TEXT NOT NULL,
      status TEXT NOT NULL,
      conflicting_command_ids_json TEXT NOT NULL,
      conflict_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (base_revision_id) REFERENCES score_revisions(id),
      FOREIGN KEY (applied_revision_id) REFERENCES score_revisions(id)
    );

    CREATE TABLE IF NOT EXISTS score_collaboration_documents (
      document_id TEXT PRIMARY KEY,
      yjs_state BLOB NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );

    CREATE TABLE IF NOT EXISTS score_collaboration_updates (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      update_sha256 TEXT NOT NULL,
      update_size_bytes INTEGER NOT NULL,
      request_id TEXT,
      trace_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );

    CREATE TABLE IF NOT EXISTS score_collaboration_snapshots (
      document_id TEXT PRIMARY KEY,
      snapshot_version INTEGER NOT NULL,
      compaction_count INTEGER NOT NULL,
      source_operation_count INTEGER NOT NULL,
      retained_operation_count INTEGER NOT NULL,
      source_conflict_count INTEGER NOT NULL,
      retained_conflict_count INTEGER NOT NULL,
      current_revision_id TEXT,
      state_sha256 TEXT NOT NULL,
      state_size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );

    CREATE TABLE IF NOT EXISTS score_assignments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      revision_id TEXT,
      share_id TEXT,
      title TEXT NOT NULL,
      instructions TEXT,
      due_at TEXT,
      rubric_json TEXT,
      practice_settings_json TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      FOREIGN KEY (revision_id) REFERENCES score_revisions(id),
      FOREIGN KEY (share_id) REFERENCES score_shares(id)
    );

    CREATE TABLE IF NOT EXISTS score_assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      submitter_contact TEXT,
      note TEXT,
      recording_url TEXT,
      performance_file_id TEXT,
      practice_minutes INTEGER,
      practice_settings_json TEXT,
      performance_analysis_json TEXT,
      status TEXT NOT NULL,
      teacher_feedback TEXT,
      grade_score INTEGER,
      grade_max INTEGER,
      rubric_scores_json TEXT,
      review_token TEXT,
      submitted_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assignment_id) REFERENCES score_assignments(id),
      FOREIGN KEY (document_id) REFERENCES score_documents(id),
      FOREIGN KEY (performance_file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS score_rubric_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      rubric_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_organizations (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_organization_campuses (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      timezone TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id)
    );

    CREATE TABLE IF NOT EXISTS score_organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT,
      invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      accepted_at TEXT,
      removed_at TEXT,
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
      UNIQUE(organization_id, invited_email)
    );

    CREATE TABLE IF NOT EXISTS score_classrooms (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      organization_id TEXT,
      campus_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (owner_user_id) REFERENCES users(id),
      FOREIGN KEY (organization_id) REFERENCES score_organizations(id),
      FOREIGN KEY (campus_id) REFERENCES score_organization_campuses(id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_staff (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      user_id TEXT,
      invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      accepted_at TEXT,
      removed_at TEXT,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
      UNIQUE(classroom_id, invited_email)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_students (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      contact_email TEXT,
      external_ref TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id)
    );

    CREATE TABLE IF NOT EXISTS score_student_guardians (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      user_id TEXT,
      invited_email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      relationship TEXT,
      status TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      accepted_at TEXT,
      removed_at TEXT,
      FOREIGN KEY (student_id) REFERENCES score_classroom_students(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
      UNIQUE(student_id, invited_email)
    );

    CREATE TABLE IF NOT EXISTS score_student_exit_requests (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      requested_by_user_id TEXT,
      status TEXT NOT NULL,
      reason TEXT,
      requested_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      decided_by_guardian_id TEXT,
      decided_at TEXT,
      cancelled_at TEXT,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (student_id) REFERENCES score_classroom_students(id),
      FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
      FOREIGN KEY (decided_by_guardian_id) REFERENCES score_student_guardians(id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_resource_folders (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (parent_id) REFERENCES score_classroom_resource_folders(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_resources (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      folder_id TEXT,
      file_id TEXT,
      source_type TEXT NOT NULL DEFAULT 'external',
      title TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      url TEXT NOT NULL,
      folder_path TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL DEFAULT 'classroom',
      version_group_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT,
      restored_from_id TEXT,
      reused_from_resource_id TEXT,
      retention_hold INTEGER NOT NULL DEFAULT 0,
      content_purged_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (folder_id) REFERENCES score_classroom_resource_folders(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_resource_student_grants (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      version_group_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (student_id) REFERENCES score_classroom_students(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      UNIQUE(version_group_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_resource_retention_policies (
      classroom_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      historical_version_days INTEGER NOT NULL DEFAULT 365,
      minimum_versions_per_group INTEGER NOT NULL DEFAULT 3,
      updated_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id),
      FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_notifications (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TEXT,
      published_at TEXT NOT NULL,
      delivery_prepared_at TEXT,
      archived_at TEXT,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id)
    );

    CREATE TABLE IF NOT EXISTS score_notification_preferences (
      user_id TEXT PRIMARY KEY,
      email_classroom_announcements INTEGER NOT NULL DEFAULT 0,
      locale TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS score_notification_deliveries (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      recipient_user_id TEXT,
      channel TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      locked_at TEXT,
      provider_message_id TEXT,
      last_error TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (notification_id) REFERENCES score_classroom_notifications(id),
      FOREIGN KEY (recipient_user_id) REFERENCES users(id),
      UNIQUE(notification_id, recipient_user_id, channel)
    );

    CREATE TABLE IF NOT EXISTS score_classroom_notification_receipts (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (notification_id) REFERENCES score_classroom_notifications(id),
      FOREIGN KEY (student_id) REFERENCES score_classroom_students(id),
      UNIQUE(notification_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS score_guardian_notification_receipts (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      guardian_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (notification_id) REFERENCES score_classroom_notifications(id),
      FOREIGN KEY (guardian_id) REFERENCES score_student_guardians(id),
      UNIQUE(notification_id, guardian_id)
    );

    CREATE TABLE IF NOT EXISTS score_lms_connections (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT,
      course_ref TEXT NOT NULL,
      status TEXT NOT NULL,
      issuer TEXT,
      client_id TEXT,
      deployment_id TEXT,
      oidc_auth_url TEXT,
      token_url TEXT,
      jwks_url TEXT,
      platform_jwks_json TEXT,
      lti_context_id TEXT,
      nrps_url TEXT,
      ags_lineitems_url TEXT,
      ags_lineitem_url TEXT,
      verified_at TEXT,
      last_roster_sync_at TEXT,
      last_grade_sync_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (classroom_id) REFERENCES score_classrooms(id)
    );

    CREATE TABLE IF NOT EXISTS lti_oidc_states (
      state TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      nonce TEXT NOT NULL,
      target_link_uri TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES score_lms_connections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seo_search_snapshots (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      property_uri TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      imported_by TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      issue_count INTEGER NOT NULL,
      source_metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS seo_search_metrics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      query_text TEXT,
      page_url TEXT NOT NULL,
      country TEXT,
      device TEXT,
      search_appearance TEXT,
      clicks REAL NOT NULL,
      impressions REAL NOT NULL,
      ctr REAL NOT NULL,
      position REAL NOT NULL,
      FOREIGN KEY (snapshot_id) REFERENCES seo_search_snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seo_index_issues (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      page_url TEXT NOT NULL,
      severity TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      verdict TEXT,
      coverage_state TEXT,
      robots_txt_state TEXT,
      indexed_canonical TEXT,
      user_canonical TEXT,
      last_crawl_at TEXT,
      details_json TEXT,
      FOREIGN KEY (snapshot_id) REFERENCES seo_search_snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seo_content_items (
      slug TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      canonical TEXT NOT NULL,
      primary_keyword TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      registered_by TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_content_review_events (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      facts_checked INTEGER NOT NULL,
      duplication_checked INTEGER NOT NULL,
      evidence_checked INTEGER NOT NULL,
      reviewed_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
    CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_provider ON payment_orders(provider);
    CREATE INDEX IF NOT EXISTS idx_billing_customers_user ON billing_customers(user_id, provider);
    CREATE INDEX IF NOT EXISTS idx_billing_customers_organization ON billing_customers(organization_id, provider);
    CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_status ON billing_subscriptions(user_id, status, current_period_end);
    CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org_status ON billing_subscriptions(organization_id, status, current_period_end);
    CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription ON billing_invoices(subscription_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_status ON billing_webhook_events(status, received_at);
    CREATE INDEX IF NOT EXISTS idx_billing_seats_user ON billing_seat_assignments(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_billing_seats_org ON billing_seat_assignments(organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
    CREATE INDEX IF NOT EXISTS idx_support_requests_contact_email ON support_requests(contact_email);
    CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at);
    CREATE INDEX IF NOT EXISTS idx_copyright_complaints_status_due ON copyright_complaints(status, response_due_at);
    CREATE INDEX IF NOT EXISTS idx_copyright_complaints_email ON copyright_complaints(claimant_email);
    CREATE INDEX IF NOT EXISTS idx_copyright_complaint_events_complaint ON copyright_complaint_events(complaint_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_events_created_at ON security_audit_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_events_type_created ON security_audit_events(event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_events_outcome_created ON security_audit_events(outcome, created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_events_request_id ON security_audit_events(request_id);
    CREATE INDEX IF NOT EXISTS idx_score_documents_user_id ON score_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_score_revisions_document_id ON score_revisions(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_assets_document_id ON score_assets(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_jobs_user_id ON score_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_score_jobs_document_id ON score_jobs(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_jobs_status ON score_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_omr_diagnostics_document_id ON omr_diagnostics(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_comments_document_id ON score_comments(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_shares_document_id ON score_shares(document_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_score_shares_share_token ON score_shares(share_token);
    CREATE INDEX IF NOT EXISTS idx_score_collaboration_commands_document_created ON score_collaboration_commands(document_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_score_collaboration_commands_applied_revision ON score_collaboration_commands(applied_revision_id);
    CREATE INDEX IF NOT EXISTS idx_score_collaboration_updates_document_created ON score_collaboration_updates(document_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_score_assignments_document_id ON score_assignments(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_assignment_submissions_assignment_id ON score_assignment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_score_assignment_submissions_document_id ON score_assignment_submissions(document_id);
    CREATE INDEX IF NOT EXISTS idx_score_rubric_templates_user_id ON score_rubric_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_score_classrooms_owner_user_id ON score_classrooms(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_students_classroom_id ON score_classroom_students(classroom_id);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_notification_receipts_student_id ON score_classroom_notification_receipts(student_id);
    CREATE INDEX IF NOT EXISTS idx_score_student_guardians_student_id ON score_student_guardians(student_id);
    CREATE INDEX IF NOT EXISTS idx_score_student_guardians_user_id ON score_student_guardians(user_id);
    CREATE INDEX IF NOT EXISTS idx_score_student_exit_requests_student ON score_student_exit_requests(student_id, requested_at);
    CREATE INDEX IF NOT EXISTS idx_score_student_exit_requests_classroom ON score_student_exit_requests(classroom_id, status, requested_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_score_student_exit_requests_pending
      ON score_student_exit_requests(student_id)
      WHERE status = 'pending_guardian';
    CREATE INDEX IF NOT EXISTS idx_score_guardian_notification_receipts_guardian_id ON score_guardian_notification_receipts(guardian_id);
    CREATE INDEX IF NOT EXISTS idx_seo_search_snapshots_provider_date ON seo_search_snapshots(provider, end_date);
    CREATE INDEX IF NOT EXISTS idx_seo_search_metrics_snapshot_id ON seo_search_metrics(snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_seo_search_metrics_page_url ON seo_search_metrics(page_url);
    CREATE INDEX IF NOT EXISTS idx_seo_index_issues_snapshot_id ON seo_index_issues(snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_seo_index_issues_page_url ON seo_index_issues(page_url);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_content_items_canonical ON seo_content_items(canonical);
    CREATE INDEX IF NOT EXISTS idx_seo_content_review_events_slug_hash ON seo_content_review_events(slug, content_hash, created_at);
  `);

  ensureColumn("jobs", "output_file_id", "TEXT");
  ensureColumn("jobs", "draft_bundle_file_id", "TEXT");
  ensureColumn("jobs", "preview_text", "TEXT");
  ensureColumn("jobs", "broker_job_id", "TEXT");
  ensureColumn("jobs", "request_id", "TEXT");
  ensureColumn("jobs", "trace_id", "TEXT");
  ensureColumn("activation_codes", "batch_id", "TEXT");
  ensureColumn("activation_codes", "note", "TEXT");
  ensureColumn("activation_codes", "expires_at", "TEXT");
  ensureColumn("activation_codes", "created_by", "TEXT");
  ensureColumn("activation_codes", "disabled_at", "TEXT");
  ensureColumn("payment_orders", "customer_email", "TEXT");
  ensureColumn("payment_orders", "user_id", "TEXT");
  ensureColumn("payment_orders", "locale", "TEXT");
  ensureColumn("payment_orders", "entitlement_days", "INTEGER NOT NULL DEFAULT 365");
  ensureColumn("payment_orders", "billing_kind", "TEXT NOT NULL DEFAULT 'one_time'");
  ensureColumn("payment_orders", "organization_id", "TEXT");
  ensureColumn("payment_orders", "seat_quantity", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("payment_orders", "idempotency_key_hash", "TEXT");
  ensureColumn("payment_orders", "checkout_session_id", "TEXT");
  ensureColumn("payment_orders", "transaction_id", "TEXT");
  ensureColumn("payment_orders", "checkout_url", "TEXT");
  ensureColumn("payment_orders", "amount_minor", "INTEGER");
  ensureColumn("payment_orders", "currency", "TEXT");
  ensureColumn("payment_orders", "activation_code_id", "TEXT");
  ensureColumn("payment_orders", "paid_at", "TEXT");
  ensureColumn("payment_orders", "cancelled_at", "TEXT");
  ensureColumn("payment_orders", "failure_reason", "TEXT");
  ensureColumn("support_requests", "reference_code", "TEXT");
  ensureColumn("support_requests", "category", "TEXT");
  ensureColumn("support_requests", "locale", "TEXT NOT NULL DEFAULT 'en'");
  ensureColumn("support_requests", "contact_name", "TEXT");
  ensureColumn("support_requests", "contact_email", "TEXT");
  ensureColumn("support_requests", "account_email", "TEXT");
  ensureColumn("support_requests", "subject", "TEXT");
  ensureColumn("support_requests", "message", "TEXT");
  ensureColumn("support_requests", "order_reference", "TEXT");
  ensureColumn("support_requests", "job_reference", "TEXT");
  ensureColumn("support_requests", "source_page", "TEXT");
  ensureColumn("support_requests", "source_context", "TEXT");
  ensureColumn("support_requests", "status", "TEXT NOT NULL DEFAULT 'open'");
  ensureColumn("support_requests", "created_at", "TEXT");
  ensureColumn("support_requests", "updated_at", "TEXT");
  ensureColumn("score_documents", "settings_json", "TEXT");
  ensureColumn("score_documents", "pending_revision_id", "TEXT");
  ensureColumn("score_revisions", "status", "TEXT NOT NULL DEFAULT 'accepted'");
  ensureColumn("score_assets", "revision_id", "TEXT");
  ensureColumn("score_assets", "params_json", "TEXT");
  ensureColumn("score_assets", "engine_json", "TEXT");
  ensureColumn("score_assets", "checksum_sha256", "TEXT");
  ensureColumn("score_assets", "stale_at", "TEXT");
  ensureColumn("score_jobs", "attempt_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("score_jobs", "progress_percent", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("score_jobs", "cancel_requested_at", "TEXT");
  ensureColumn("score_jobs", "broker_job_id", "TEXT");
  ensureColumn("score_jobs", "request_id", "TEXT");
  ensureColumn("score_jobs", "trace_id", "TEXT");
  ensureColumn("score_collaboration_updates", "request_id", "TEXT");
  ensureColumn("score_collaboration_updates", "trace_id", "TEXT");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_trace_id ON jobs(trace_id);
    CREATE INDEX IF NOT EXISTS idx_score_jobs_trace_id ON score_jobs(trace_id);
    CREATE INDEX IF NOT EXISTS idx_score_collaboration_updates_trace_id ON score_collaboration_updates(trace_id);
  `);
  ensureColumn("score_assignment_submissions", "grade_score", "INTEGER");
  ensureColumn("score_assignment_submissions", "grade_max", "INTEGER");
  ensureColumn("score_assignment_submissions", "practice_settings_json", "TEXT");
  ensureColumn("score_assignment_submissions", "performance_analysis_json", "TEXT");
  ensureColumn("score_assignments", "rubric_json", "TEXT");
  ensureColumn("score_assignments", "practice_settings_json", "TEXT");
  ensureColumn("score_assignment_submissions", "rubric_scores_json", "TEXT");
  ensureColumn("score_assignment_submissions", "review_token", "TEXT");
  ensureColumn("score_assignment_submissions", "performance_file_id", "TEXT");
  ensureColumn("score_assignments", "classroom_id", "TEXT");
  ensureColumn("score_classroom_students", "user_id", "TEXT");
  ensureColumn("score_assignment_submissions", "student_id", "TEXT");
  ensureColumn("score_classrooms", "organization_id", "TEXT");
  ensureColumn("score_classrooms", "campus_id", "TEXT");
  ensureColumn("score_classroom_resources", "folder_path", "TEXT");
  ensureColumn("score_classroom_resources", "folder_id", "TEXT");
  ensureColumn("score_classroom_resources", "file_id", "TEXT");
  ensureColumn("score_classroom_resources", "source_type", "TEXT NOT NULL DEFAULT 'external'");
  ensureColumn("score_lms_connections", "issuer", "TEXT");
  ensureColumn("score_lms_connections", "client_id", "TEXT");
  ensureColumn("score_lms_connections", "deployment_id", "TEXT");
  ensureColumn("score_lms_connections", "oidc_auth_url", "TEXT");
  ensureColumn("score_lms_connections", "token_url", "TEXT");
  ensureColumn("score_lms_connections", "jwks_url", "TEXT");
  ensureColumn("score_lms_connections", "platform_jwks_json", "TEXT");
  ensureColumn("score_lms_connections", "lti_context_id", "TEXT");
  ensureColumn("score_lms_connections", "nrps_url", "TEXT");
  ensureColumn("score_lms_connections", "ags_lineitems_url", "TEXT");
  ensureColumn("score_lms_connections", "ags_lineitem_url", "TEXT");
  ensureColumn("score_lms_connections", "verified_at", "TEXT");
  ensureColumn("score_lms_connections", "last_roster_sync_at", "TEXT");
  ensureColumn("score_lms_connections", "last_grade_sync_at", "TEXT");
  ensureColumn("score_lms_connections", "last_error", "TEXT");
  ensureColumn("score_classroom_resources", "tags_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("score_classroom_resources", "visibility", "TEXT NOT NULL DEFAULT 'classroom'");
  ensureColumn("score_classroom_resources", "version_group_id", "TEXT");
  ensureColumn("score_classroom_resources", "version_number", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("score_classroom_resources", "previous_version_id", "TEXT");
  ensureColumn("score_classroom_resources", "restored_from_id", "TEXT");
  ensureColumn("score_classroom_resources", "reused_from_resource_id", "TEXT");
  ensureColumn("score_classroom_resources", "updated_at", "TEXT");
  ensureColumn("score_classroom_resources", "archived_at", "TEXT");
  ensureColumn("score_classroom_resources", "retention_hold", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("score_classroom_resources", "content_purged_at", "TEXT");
  ensureColumn("files", "storage_backend", "TEXT NOT NULL DEFAULT 'local'");
  ensureColumn("files", "storage_key", "TEXT");
  ensureColumn("files", "checksum_sha256", "TEXT");
  ensureColumn("score_classroom_notifications", "scheduled_at", "TEXT");
  ensureColumn("score_classroom_notifications", "delivery_prepared_at", "TEXT");
  ensureColumn("score_classroom_notifications", "archived_at", "TEXT");
  ensureColumn("score_shares", "label", "TEXT");
  ensureColumn("score_comments", "share_id", "TEXT");
  ensureColumn("score_comments", "author_name", "TEXT");
  ensureColumn("score_comments", "resolved_at", "TEXT");
  ensureColumn("score_comments", "resolved_by_user_id", "TEXT");
  ensureColumn("users", "account_status", "TEXT NOT NULL DEFAULT 'active'");
  ensureColumn("users", "deletion_requested_at", "TEXT");
  ensureColumn("users", "scheduled_deletion_at", "TEXT");

  db.exec(`
    UPDATE score_classroom_resources
    SET version_group_id = id
    WHERE version_group_id IS NULL;
    UPDATE score_classroom_resources
    SET updated_at = created_at
    WHERE updated_at IS NULL;

    INSERT INTO job_dispatch_outbox (
      id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
      locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
    )
    SELECT lower(hex(randomblob(16))), 'score-processing', 'legacy', jobs.id, 'queued', 0,
           jobs.updated_at, NULL, NULL, NULL, NULL, NULL, jobs.updated_at, jobs.updated_at
    FROM jobs
    WHERE jobs.status = 'queued'
      AND NOT EXISTS (
        SELECT 1 FROM job_dispatch_outbox outbox
        WHERE outbox.job_family = 'legacy' AND outbox.job_id = jobs.id
          AND outbox.status IN ('queued', 'processing', 'dispatched')
      );

    INSERT INTO job_dispatch_outbox (
      id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
      locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
    )
    SELECT lower(hex(randomblob(16))), 'score-processing', 'score', score_jobs.id, 'queued', 0,
           score_jobs.updated_at, NULL, NULL, NULL, NULL, NULL, score_jobs.updated_at, score_jobs.updated_at
    FROM score_jobs
    WHERE score_jobs.status = 'queued'
      AND NOT EXISTS (
        SELECT 1 FROM job_dispatch_outbox outbox
        WHERE outbox.job_family = 'score' AND outbox.job_id = score_jobs.id
          AND outbox.status IN ('queued', 'processing', 'dispatched')
      );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_jobs_dispatch_insert
    AFTER INSERT ON jobs
    WHEN NEW.status = 'queued'
    BEGIN
      INSERT INTO job_dispatch_outbox (
        id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
        locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), 'score-processing', 'legacy', NEW.id, 'queued', 0, NEW.updated_at,
        NULL, NULL, NULL, NULL, NULL, NEW.updated_at, NEW.updated_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_jobs_dispatch_retry
    AFTER UPDATE OF status ON jobs
    WHEN NEW.status = 'queued' AND OLD.status <> 'queued'
    BEGIN
      INSERT INTO job_dispatch_outbox (
        id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
        locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), 'score-processing', 'legacy', NEW.id, 'queued', 0, NEW.updated_at,
        NULL, NULL, NULL, NULL, NULL, NEW.updated_at, NEW.updated_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_jobs_dispatch_ack
    AFTER UPDATE OF status ON jobs
    WHEN NEW.status = 'processing' AND OLD.status = 'queued'
    BEGIN
      UPDATE job_dispatch_outbox
      SET status = 'acknowledged', acknowledged_at = NEW.updated_at, locked_at = NULL,
          last_error = NULL, updated_at = NEW.updated_at
      WHERE job_family = 'legacy' AND job_id = NEW.id
        AND status IN ('queued', 'processing', 'dispatched');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_score_jobs_dispatch_insert
    AFTER INSERT ON score_jobs
    WHEN NEW.status = 'queued'
    BEGIN
      INSERT INTO job_dispatch_outbox (
        id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
        locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), 'score-processing', 'score', NEW.id, 'queued', 0, NEW.updated_at,
        NULL, NULL, NULL, NULL, NULL, NEW.updated_at, NEW.updated_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS trg_score_jobs_dispatch_retry
    AFTER UPDATE OF status ON score_jobs
    WHEN NEW.status = 'queued' AND OLD.status <> 'queued'
    BEGIN
      INSERT INTO job_dispatch_outbox (
        id, queue_name, job_family, job_id, status, attempts, next_attempt_at,
        locked_at, dispatched_at, acknowledged_at, broker_job_id, last_error, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), 'score-processing', 'score', NEW.id, 'queued', 0, NEW.updated_at,
        NULL, NULL, NULL, NULL, NULL, NEW.updated_at, NEW.updated_at
      );
    END;


    CREATE TRIGGER IF NOT EXISTS trg_score_jobs_dispatch_ack
    AFTER UPDATE OF status ON score_jobs
    WHEN NEW.status = 'processing' AND OLD.status = 'queued'
    BEGIN
      UPDATE job_dispatch_outbox
      SET status = 'acknowledged', acknowledged_at = NEW.updated_at, locked_at = NULL,
          last_error = NULL, updated_at = NEW.updated_at
      WHERE job_family = 'score' AND job_id = NEW.id
        AND status IN ('queued', 'processing', 'dispatched');
    END;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activation_codes_batch_id ON activation_codes(batch_id);
    CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_checkout_session_id ON payment_orders(checkout_session_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_transaction_id ON payment_orders(transaction_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_idempotency
      ON payment_orders(user_id, provider, idempotency_key_hash)
      WHERE idempotency_key_hash IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_reference_code ON support_requests(reference_code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_score_assignment_submissions_review_token ON score_assignment_submissions(review_token);
    CREATE INDEX IF NOT EXISTS idx_score_organizations_owner ON score_organizations(owner_user_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_score_organization_campuses_org ON score_organization_campuses(organization_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_score_organization_members_user ON score_organization_members(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_score_organization_members_email ON score_organization_members(invited_email, status);
    CREATE INDEX IF NOT EXISTS idx_score_classrooms_organization ON score_classrooms(organization_id, campus_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_staff_user ON score_classroom_staff(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_staff_email ON score_classroom_staff(invited_email, status);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resources_file ON score_classroom_resources(file_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resource_folders_classroom ON score_classroom_resource_folders(classroom_id, parent_id, archived_at, normalized_name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_score_classroom_resource_folders_active_name
      ON score_classroom_resource_folders(classroom_id, ifnull(parent_id, ''), normalized_name)
      WHERE archived_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resources_folder ON score_classroom_resources(classroom_id, folder_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resources_classroom_active ON score_classroom_resources(classroom_id, archived_at, folder_path);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resources_version_group ON score_classroom_resources(version_group_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resources_retention ON score_classroom_resources(classroom_id, archived_at, content_purged_at, version_group_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_storage_deletion_queue_due ON storage_deletion_queue(status, next_attempt_at, locked_at);
    CREATE INDEX IF NOT EXISTS idx_job_dispatch_outbox_due ON job_dispatch_outbox(status, next_attempt_at, locked_at, dispatched_at);
    CREATE INDEX IF NOT EXISTS idx_job_dispatch_outbox_job ON job_dispatch_outbox(job_family, job_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_dispatch_outbox_broker_job ON job_dispatch_outbox(broker_job_id) WHERE broker_job_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resource_grants_classroom ON score_classroom_resource_student_grants(classroom_id, version_group_id);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_resource_grants_student ON score_classroom_resource_student_grants(student_id, version_group_id);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_notifications_classroom_publish ON score_classroom_notifications(classroom_id, archived_at, published_at);
    CREATE INDEX IF NOT EXISTS idx_score_classroom_notifications_delivery_queue ON score_classroom_notifications(delivery_prepared_at, archived_at, published_at);
    CREATE INDEX IF NOT EXISTS idx_score_notification_deliveries_queue ON score_notification_deliveries(channel, status, next_attempt_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_score_notification_deliveries_recipient ON score_notification_deliveries(recipient_user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_lti_connections_registration ON score_lms_connections(issuer, client_id, deployment_id, status);
    CREATE INDEX IF NOT EXISTS idx_lti_oidc_states_expiry ON lti_oidc_states(expires_at, consumed_at);
    CREATE INDEX IF NOT EXISTS idx_score_documents_pending_revision_id ON score_documents(pending_revision_id);
    CREATE INDEX IF NOT EXISTS idx_score_revisions_status ON score_revisions(status);
    CREATE INDEX IF NOT EXISTS idx_score_assets_revision_id ON score_assets(revision_id);
    CREATE INDEX IF NOT EXISTS idx_score_assets_stale_at ON score_assets(stale_at);
    CREATE INDEX IF NOT EXISTS idx_users_account_status_deletion ON users(account_status, scheduled_deletion_at);
  `);
  db.exec(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION};`);
}

function validatePostgresSchema() {
  const requiredTables = [
    "users",
    "sessions",
    "files",
    "score_documents",
    "score_jobs",
    "jobs",
    "billing_subscriptions",
    "job_dispatch_outbox",
    "service_runtime",
  ];
  const rows = db.prepare(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN (${requiredTables.map((table) => `'${table}'`).join(", ")})
  `).all() as Array<{ table_name: string }>;
  const available = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !available.has(table));
  if (missing.length > 0) {
    throw new Error(`PostgreSQL runtime schema is incomplete (${missing.join(", ")}). Run and verify the PostgreSQL migration before starting API traffic.`);
  }
}
