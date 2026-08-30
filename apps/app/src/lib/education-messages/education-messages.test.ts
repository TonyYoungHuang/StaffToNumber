import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { EDUCATION_MESSAGE_CATALOGS, getEducationMessages } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

function componentSource(name: string): string {
  return readFileSync(new URL(`../../components/${name}.tsx`, import.meta.url), "utf8");
}

test("education catalogs cover identical non-empty keys and templates in all nine locales", () => {
  assert.deepEqual(Object.keys(EDUCATION_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(EDUCATION_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getEducationMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} education keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty education message`);
    }
    assert.match(catalog.operations.retriedEmails, /\{count\}/u, `${locale} retried-email template`);
    assert.match(catalog.operations.rosterSynced, /\{imported\}/u, `${locale} roster imported template`);
    assert.match(catalog.operations.rosterSynced, /\{skipped\}/u, `${locale} roster skipped template`);
    assert.match(catalog.operations.versionRestored, /\{from\}/u, `${locale} restore source template`);
    assert.match(catalog.operations.versionRestored, /\{to\}/u, `${locale} restore target template`);
    assert.match(catalog.operations.folderUpdated, /\{count\}/u, `${locale} folder-update template`);
    assert.match(catalog.operations.resourceMoved, /\{version\}/u, `${locale} moved-version template`);
    assert.match(catalog.operations.retention.previewSummary, /\{count\}/u, `${locale} retention-count template`);
    assert.match(catalog.operations.retention.previewSummary, /\{size\}/u, `${locale} retention-size template`);
    assert.match(catalog.operations.library.renameAria, /\{path\}/u, `${locale} folder rename ARIA template`);
    assert.match(catalog.operations.resource.moveAria, /\{title\}/u, `${locale} resource move ARIA template`);
  }
});

test("classroom, organization, operations, student, validation, status, metadata, and ARIA copy is localized", () => {
  assert.equal(getEducationMessages("zh-TW").classrooms.rosterAria, "課堂名冊");
  assert.equal(getEducationMessages("ja").student.submissionStatuses.reviewed, "確認済み");
  assert.equal(getEducationMessages("ko").organization.staffRoleAria, "수업 교직원 역할");
  assert.equal(getEducationMessages("fr").operations.notification.retryFailed, "Réessayer les e-mails en échec");
  assert.equal(getEducationMessages("es").pages.student.metadataTitle, "Mis clases");
  assert.equal(getEducationMessages("de").shared.statuses.scheduled, "Geplant");
  assert.equal(getEducationMessages("ru").operations.history.restore, "Восстановить");

  const english = getEducationMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getEducationMessages(locale);
    assert.notEqual(catalog.pages.classrooms.metadataTitle, english.pages.classrooms.metadataTitle, `${locale} classroom metadata`);
    assert.notEqual(catalog.classrooms.loading, english.classrooms.loading, `${locale} classroom loading state`);
    assert.notEqual(catalog.organization.statusAria, english.organization.statusAria, `${locale} organization ARIA`);
    assert.notEqual(catalog.operations.notification.empty, english.operations.notification.empty, `${locale} notification empty state`);
    assert.notEqual(catalog.operations.retention.note, english.operations.retention.note, `${locale} retention explanation`);
    assert.notEqual(catalog.student.noAssignments, english.student.noAssignments, `${locale} assignment empty state`);
    assert.notEqual(catalog.student.exitRejected, english.student.exitRejected, `${locale} classroom-exit state`);
  }
});

test("education fixed roles, statuses, resources, visibility, submissions, and LMS providers have safe mappings", () => {
  const messages = getEducationMessages("en");
  assert.deepEqual(Object.keys(messages.shared.roles), ["owner", "admin", "teacher", "assistant", "observer", "student", "guardian"]);
  assert.deepEqual(Object.keys(messages.shared.statuses), ["invited", "active", "archived", "removed", "pending", "published", "scheduled", "cancelled", "draft", "verified"]);
  assert.deepEqual(Object.keys(messages.shared.resourceTypes), ["score", "audio", "video", "document"]);
  assert.deepEqual(Object.keys(messages.shared.resourceSources), ["external", "file"]);
  assert.deepEqual(Object.keys(messages.shared.resourceVisibilities), ["classroom", "selected", "staff"]);
  assert.deepEqual(Object.keys(messages.student.submissionStatuses), ["pending", "submitted", "reviewed"]);
  assert.deepEqual(Object.keys(messages.operations.lms.providers), ["manual", "canvas", "moodle", "google-classroom"]);
});

test("education clients receive only the server-selected catalog and preserve raw backend and user content", () => {
  const classrooms = componentSource("ClassroomsManager");
  const organization = componentSource("EducationOrganizationManager");
  const operations = componentSource("EducationOperationsPanel");
  const student = componentSource("StudentHome");
  const client = readFileSync(new URL("./client.tsx", import.meta.url), "utf8");
  const classroomsPage = readFileSync(new URL("../../app/classrooms/page.tsx", import.meta.url), "utf8");
  const studentPage = readFileSync(new URL("../../app/student/page.tsx", import.meta.url), "utf8");

  for (const source of [classrooms, organization, operations, student, client]) {
    assert.doesNotMatch(source, /EDUCATION_MESSAGE_CATALOGS/u);
    assert.doesNotMatch(source, /from\s+["'][^"']*education-messages["']/u);
  }
  for (const source of [classrooms, organization, operations, student]) {
    assert.match(source, /useEducationMessages\(\)/u);
    assert.doesNotMatch(source, /result\.error\s*\|\|/u);
    assert.doesNotMatch(source, /userFacingError/u);
  }
  assert.match(client, /import type \{ EducationMessages \}/u);
  assert.match(classroomsPage, /getEducationMessages\(locale\)/u);
  assert.match(classroomsPage, /<EducationMessagesProvider locale=\{locale\} messages=\{messages\}>/u);
  assert.match(studentPage, /getEducationMessages\(locale\)/u);
  assert.match(studentPage, /<EducationMessagesProvider locale=\{locale\} messages=\{messages\}>/u);
  assert.match(classroomsPage, /generateMetadata/u);
  assert.match(studentPage, /generateMetadata/u);

  assert.match(classrooms, /setStatus\(result\.error\)/u);
  assert.match(organization, /organizationResult\.error/u);
  assert.match(operations, /setStatus\(result\.error\)/u);
  assert.match(operations, /\{connection\.lastError\}/u);
  assert.match(student, /setError\(result\.error\)/u);

  for (const original of ["classroom.name", "classroom.description", "student.displayName", "guardian.displayName"]) {
    assert.ok(classrooms.includes(original), `missing verbatim roster content ${original}`);
  }
  for (const original of ["item.name", "item.displayName", "item.invitedEmail"]) {
    assert.ok(organization.includes(original), `missing verbatim organization content ${original}`);
  }
  for (const original of ["item.title", "item.folderPath", "item.originalName", "item.tags.join", "item.body", "connection.courseRef"]) {
    assert.ok(operations.includes(original), `missing verbatim operations content ${original}`);
  }
  for (const original of ["classroom.name", "assignment.title", "assignment.instructions", "assignment.teacherFeedback", "resource.title", "notification.title", "notification.body"]) {
    assert.ok(student.includes(original), `missing verbatim student content ${original}`);
  }
});

test("education endpoints, payloads, roster, retention, upload, notification, LMS, and exit semantics stay intact", () => {
  const classrooms = componentSource("ClassroomsManager");
  const organization = componentSource("EducationOrganizationManager");
  const operations = componentSource("EducationOperationsPanel");
  const student = componentSource("StudentHome");

  for (const endpoint of ["/api/score-classrooms", "/students/bulk", "/guardians"]) {
    assert.ok(classrooms.includes(endpoint), `missing classroom endpoint ${endpoint}`);
  }
  assert.match(classrooms, /JSON\.stringify\(\{ students \}\)/u);
  for (const endpoint of ["/api/education/organizations", "/api/score-classrooms", "/placement"]) {
    assert.ok(organization.includes(endpoint), `missing organization endpoint ${endpoint}`);
  }
  assert.match(organization, /body: JSON\.stringify\(placement\)/u);

  for (const endpoint of [
    "/api/education/overview", "/notifications/${id}/retry-failed", "/lms/${connectionId}/sync-roster", "/resource-retention",
    "/resource-retention/preview", "/resource-retention/purge", "/retention-hold", "/versions/upload?${query}", "/resources/upload?${query}",
    "/versions", "/restore", "/resource-folders", "/resources/reuse", "/move",
  ]) assert.ok(operations.includes(endpoint), `missing operations endpoint ${endpoint}`);
  assert.match(operations, /body: JSON\.stringify\(retentionDraft\)/u);
  assert.match(operations, /body: JSON\.stringify\(\{ retentionHold: !item\.retentionHold \}\)/u);
  assert.match(operations, /formData\.append\("file", resourceFile\)/u);
  assert.match(operations, /JSON\.stringify\(\{ name: folderDraft\.name, parentId: folderDraft\.parentId \|\| null \}\)/u);
  assert.match(operations, /JSON\.stringify\(\{ folderId: folderId \|\| null \}\)/u);
  assert.match(operations, /accept="\.pdf,\.png,\.jpg,\.jpeg,\.webp,\.tif,\.tiff,\.musicxml,\.xml,\.mxl,\.json,\.mid,\.midi,\.wav,\.mp3,\.aac,\.flac,\.ogg,\.aiff,\.m4a,\.mp4,\.mov,\.webm"/u);
  assert.match(operations, /maxLength=\{160\}/u);
  assert.match(operations, /maxLength=\{4000\}/u);
  assert.match(operations, /min=\{30\} max=\{3650\}/u);
  assert.match(operations, /min=\{1\} max=\{20\}/u);

  for (const endpoint of [
    "/api/education/student-home", "/api/education/notification-preferences", "/student-notifications/${notificationId}/read",
    "/student-classrooms/${classroom.id}/exit-requests", "/student-exit-requests/${classroom.exitRequest.id}",
    "/guardian-exit-requests/${classroom.exitRequest.id}/decision",
  ]) assert.ok(student.includes(endpoint), `missing student endpoint ${endpoint}`);
  assert.match(student, /JSON\.stringify\(\{ reason: exitReasons\[classroom\.studentId\]\?\.trim\(\) \|\| null \}\)/u);
  assert.match(student, /JSON\.stringify\(\{ decision \}\)/u);
  assert.match(student, /maxLength=\{500\}/u);

  const binaryBackendLocale = /locale === "zh-CN" \? "zh-CN" : "en"/gu;
  assert.equal(student.match(binaryBackendLocale)?.length, 1, "notification backend locale contract must remain binary");
  const withoutBackendLocale = student.replace(binaryBackendLocale, "BACKEND_NOTIFICATION_LOCALE");
  assert.doesNotMatch(withoutBackendLocale, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  for (const source of [classrooms, organization, operations]) {
    assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  }
});

test("education uses centralized Intl helpers for dates, numbers, grades, counts, and file sizes", () => {
  const classrooms = componentSource("ClassroomsManager");
  const operations = componentSource("EducationOperationsPanel");
  const student = componentSource("StudentHome");
  for (const source of [classrooms, operations, student]) {
    assert.doesNotMatch(source, /\.toLocaleString\(/u);
    assert.doesNotMatch(source, /\.toLocaleDateString\(/u);
    assert.doesNotMatch(source, /\.toFixed\(/u);
  }
  assert.match(classrooms, /formatDateTime/u);
  assert.match(classrooms, /formatNumber/u);
  assert.match(operations, /formatDateTime/u);
  assert.match(operations, /formatNumber/u);
  assert.match(operations, /formatBytes\(retentionPreview\.totalBytes, locale\)/u);
  assert.match(student, /formatDateTime/u);
  assert.match(student, /formatNumber/u);
});

test("education localization files remain TypeScript-only with extensionless local imports", () => {
  const sourceFiles = [
    ...readdirSync(new URL(".", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(entry.name, import.meta.url)),
    ...readdirSync(new URL("./locales/", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(`./locales/${entry.name}`, import.meta.url)),
  ];
  for (const file of sourceFiles) {
    assert.doesNotMatch(file.pathname, /\.(?:js|d\.ts)$/u, file.pathname);
    assert.doesNotMatch(readFileSync(file, "utf8"), /from\s+["'][^"']+\.js["']/u, file.pathname);
  }
});
