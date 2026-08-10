import { randomUUID } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { materializeDueNotificationDeliveries } from "../../services/worker/src/notification-delivery";
import { grantActiveEntitlement } from "./activation-fixture";

const appUrl = "http://127.0.0.1:43101";
const apiUrl = "http://127.0.0.1:43102";
const dbFile = path.join(process.cwd(), ".tmp", "e2e", "app.sqlite");

test("teacher resources and notifications reach the linked student without overstating LMS status", async ({ page, context, request }) => {
  test.setTimeout(90_000);
  const unique = `${Date.now()}-${randomUUID()}`;
  const teacher = await registerUser(request, `teacher-${unique}@example.test`);
  const studentEmail = `student-${unique}@example.test`;
  const student = await registerUser(request, studentEmail);
  const unselectedStudentEmail = `unselected-student-${unique}@example.test`;
  const unselectedStudent = await registerUser(request, unselectedStudentEmail);
  const assistant = await registerUser(request, `assistant-${unique}@example.test`);
  const observer = await registerUser(request, `observer-${unique}@example.test`);
  const organizationAdmin = await registerUser(request, `org-admin-${unique}@example.test`);
  const guardian = await registerUser(request, `guardian-${unique}@example.test`);
  await grantActiveEntitlement(request, teacher.token, "EDU");
  await grantActiveEntitlement(request, assistant.token, "EDU");
  await grantActiveEntitlement(request, observer.token, "EDU");
  await grantActiveEntitlement(request, organizationAdmin.token, "EDU");
  await prepareAuthenticatedApp(page, context, teacher.token);

  await page.goto(`${appUrl}/classrooms`);
  await page.getByLabel("Classroom name").fill("E2E Chamber Choir");
  await page.getByLabel("Description").fill("Release-gate classroom");
  await page.getByRole("button", { name: "Create classroom", exact: true }).click();
  await expect(page.getByText("Classroom created.")).toBeVisible();
  await page.getByLabel("Student name").fill("E2E Student");
  await page.getByLabel("Contact email").fill(studentEmail);
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  await expect(page.getByText("Student added.")).toBeVisible();
  await page.getByLabel("Student name").fill("E2E Unselected Student");
  await page.getByLabel("Contact email").fill(unselectedStudentEmail);
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  await expect(page.locator(".item-title").filter({ hasText: "E2E Unselected Student" })).toBeVisible();
  await page.getByLabel("Bulk roster").fill(`Pending Student\tpending-${unique}@example.test\tP-002`);
  await page.getByRole("button", { name: "Import roster" }).click();
  await expect(page.locator(".item-title").filter({ hasText: "Pending Student" })).toBeVisible();
  await expect(page.getByText("Pending claim", { exact: true })).toBeVisible();
  const studentCard = page.getByText(studentEmail, { exact: true }).locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' list-item ')][1]");
  await studentCard.getByLabel("Guardian name").fill("E2E Guardian");
  await studentCard.getByLabel("Guardian sign-in email").fill(`guardian-${unique}@example.test`);
  await studentCard.getByLabel("Relationship, e.g. parent").fill("Parent");
  await studentCard.getByRole("button", { name: "Invite guardian" }).click();
  await expect(page.getByText("E2E Guardian", { exact: true })).toBeVisible();

  const organizationForm = page.locator("form").filter({ hasText: "Create organization" });
  await organizationForm.getByPlaceholder("Organization name").fill("E2E Music Academy");
  await organizationForm.getByRole("button", { name: "Create organization" }).click();
  await expect(page.locator(".eyebrow").filter({ hasText: "E2E Music Academy" })).toBeVisible();
  const campusForm = page.locator("form").filter({ hasText: "Add campus" });
  await campusForm.getByPlaceholder("Campus name").fill("Downtown Campus");
  await campusForm.getByPlaceholder("Campus code").fill("DT");
  await campusForm.getByRole("button", { name: "Save campus" }).click();
  await expect(page.getByText(/Downtown Campus/u)).toBeVisible();
  const organizationMemberForm = page.locator("form").filter({ hasText: "Invite organization member" });
  await organizationMemberForm.getByPlaceholder("Display name").fill("E2E Organization Admin");
  await organizationMemberForm.getByPlaceholder("Sign-in email").fill(`org-admin-${unique}@example.test`);
  await organizationMemberForm.locator("select").selectOption("admin");
  await organizationMemberForm.getByRole("button", { name: "Invite member" }).click();
  await expect(page.locator(".item-title").filter({ hasText: "E2E Organization Admin" })).toBeVisible();

  const placementForm = page.locator("form").filter({ hasText: "Classroom placement" });
  await placementForm.locator("select").nth(0).selectOption({ label: "E2E Chamber Choir · owner" });
  await placementForm.locator("select").nth(1).selectOption({ label: "E2E Music Academy" });
  await placementForm.locator("select").nth(2).selectOption({ label: "Downtown Campus" });
  await placementForm.getByRole("button", { name: "Save placement" }).click();
  const staffForm = page.locator("form").filter({ hasText: "Assign classroom staff" });
  await staffForm.getByPlaceholder("Display name").fill("E2E Assistant");
  await staffForm.getByPlaceholder("Sign-in email").fill(`assistant-${unique}@example.test`);
  await staffForm.locator("select").selectOption("assistant");
  await staffForm.getByRole("button", { name: "Assign staff" }).click();
  await expect(page.getByText("E2E Assistant", { exact: true })).toBeVisible();
  await staffForm.getByPlaceholder("Display name").fill("E2E Observer");
  await staffForm.getByPlaceholder("Sign-in email").fill(`observer-${unique}@example.test`);
  await staffForm.locator("select").selectOption("observer");
  await staffForm.getByRole("button", { name: "Assign staff" }).click();
  await expect(page.getByText("E2E Observer", { exact: true })).toBeVisible();

  const folderForm = page.locator("form").filter({ hasText: "Create folder" });
  await folderForm.getByPlaceholder("New folder name").fill("Audio");
  await folderForm.getByRole("button", { name: "Create folder" }).click();
  await expect(page.getByText("Folder created.", { exact: true })).toBeVisible();
  await expect(folderForm.getByLabel("Parent folder").locator('option:has-text("Audio")')).toHaveCount(1);
  await folderForm.getByPlaceholder("New folder name").fill("Unit 1");
  await folderForm.getByLabel("Parent folder").selectOption({ label: "Audio" });
  await folderForm.getByRole("button", { name: "Create folder" }).click();
  const resourceForm = page.locator("form").filter({ hasText: "Add resource" });
  await resourceForm.getByPlaceholder("Resource title").fill("Soprano practice track");
  await resourceForm.getByPlaceholder("https://...").fill("https://example.test/soprano-v1.mp3");
  await resourceForm.locator("select").first().selectOption("audio");
  await resourceForm.getByLabel("Resource folder").selectOption({ label: "Audio/Unit 1" });
  await resourceForm.getByPlaceholder("Comma-separated tags").fill("soprano, slow");
  await resourceForm.getByRole("button", { name: "Save resource" }).click();
  await expect(page.getByText("Soprano practice track", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New version" }).click();
  const versionForm = page.locator("form").filter({ hasText: "Publish resource version" });
  await versionForm.getByPlaceholder("https://...").fill("https://example.test/soprano-v2.mp3");
  await versionForm.getByRole("button", { name: "Save resource" }).click();
  await expect(page.getByText("v2", { exact: true })).toBeVisible();
  const folderManager = page.getByLabel("Folder management");
  const audioFolderRow = folderManager.locator(".resource-folder-row").filter({ has: page.locator('span[title="Audio"]') });
  await audioFolderRow.getByRole("button", { name: "Edit", exact: true }).click();
  const audioFolderEdit = folderManager.getByLabel("Rename Audio").locator("xpath=ancestor::form[1]");
  await audioFolderEdit.getByLabel("Rename Audio").fill("Practice");
  await audioFolderEdit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Folder updated; 1 resource versions created.", { exact: true })).toBeVisible();
  await expect(page.locator(".list-item").filter({ hasText: "Soprano practice track" }).first()).toContainText("v3Practice/Unit 1 · audio");
  const unitFolderRow = folderManager.locator(".resource-folder-row").filter({ has: page.locator('span[title="Practice/Unit 1"]') });
  await unitFolderRow.getByRole("button", { name: "Edit", exact: true }).click();
  const unitFolderEdit = folderManager.getByLabel("Parent for Practice/Unit 1").locator("xpath=ancestor::form[1]");
  await unitFolderEdit.getByLabel("Parent for Practice/Unit 1").selectOption("");
  await unitFolderEdit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".list-item").filter({ hasText: "Soprano practice track" }).first()).toContainText("v4Unit 1 · audio");
  const sopranoV4Row = page.locator(".list-item").filter({ hasText: "Soprano practice track" }).first();
  await sopranoV4Row.getByLabel("Move Soprano practice track").selectOption({ label: "Practice" });
  await sopranoV4Row.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByText("Resource moved as immutable v5.", { exact: true })).toBeVisible();
  await expect(page.locator(".list-item").filter({ hasText: "Soprano practice track" }).first()).toContainText("Practice · audio");
  const emptyUnitFolder = folderManager.locator(".resource-folder-row").filter({ has: page.locator('span[title="Unit 1"]') });
  await emptyUnitFolder.getByRole("button", { name: "Archive empty folder" }).click();
  await expect(page.getByText("Archived.", { exact: true })).toBeVisible();
  await expect(folderManager.getByText("Unit 1", { exact: true })).toHaveCount(0);

  const uploadForm = page.locator("form").filter({ hasText: "Add resource" });
  await uploadForm.getByRole("button", { name: "Upload file", exact: true }).click();
  await uploadForm.getByPlaceholder("Resource title").fill("MusicXML handout");
  await uploadForm.getByLabel("Resource visibility").selectOption("selected");
  await uploadForm.getByLabel(/E2E Student \(/u).check();
  await uploadForm.locator('input[type="file"]').setInputFiles({
    name: "handout.musicxml",
    mimeType: "application/vnd.recordare.musicxml+xml",
    buffer: Buffer.from(musicXmlHandout("C4")),
  });
  await uploadForm.getByRole("button", { name: "Upload resource", exact: true }).click();
  await expect(page.locator(".item-title").filter({ hasText: "MusicXML handout" })).toBeVisible();
  const uploadedRow = page.locator(".list-item").filter({ hasText: "MusicXML handout" }).first();
  await uploadedRow.getByRole("button", { name: "New version" }).click();
  const uploadVersionForm = page.locator("form").filter({ hasText: "Publish resource version" });
  await uploadVersionForm.locator('input[type="file"]').setInputFiles({
    name: "handout-v2.musicxml",
    mimeType: "application/vnd.recordare.musicxml+xml",
    buffer: Buffer.from(musicXmlHandout("D4")),
  });
  await uploadVersionForm.getByRole("button", { name: "Upload resource", exact: true }).click();
  await expect(page.locator(".list-item").filter({ hasText: "MusicXML handout" }).first().getByText("v2", { exact: true })).toBeVisible();
  const currentUploadedRow = page.locator(".list-item").filter({ hasText: "MusicXML handout" }).first();
  await currentUploadedRow.getByRole("button", { name: "History" }).click();
  const versionHistory = page.getByLabel("MusicXML handout version history");
  await expect(versionHistory).toBeVisible();
  await expect(versionHistory.locator(".item-title").filter({ hasText: /^v2/u })).toBeVisible();
  await expect(versionHistory.locator(".item-title").filter({ hasText: /^v1/u })).toBeVisible();
  await versionHistory.locator(".list-item").filter({ hasText: "v1" }).getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Restored v1 as new v3.", { exact: true })).toBeVisible();
  await expect(page.locator(".list-item").filter({ hasText: "MusicXML handout" }).first().getByText("v3", { exact: true })).toBeVisible();

  const retentionDb = new DatabaseSync(dbFile);
  try {
    retentionDb.prepare(`
      UPDATE score_classroom_resources SET archived_at = '2025-01-01T00:00:00.000Z'
      WHERE title = 'MusicXML handout' AND version_number < 3
    `).run();
  } finally {
    retentionDb.close();
  }
  const retentionForm = page.locator("form").filter({ hasText: "Version retention" });
  await retentionForm.getByRole("checkbox", { name: "Enable automatic cleanup" }).check();
  await retentionForm.getByLabel("Historical version days").fill("30");
  await retentionForm.getByLabel("Minimum historical versions per group").fill("1");
  await retentionForm.getByRole("button", { name: "Save policy" }).click();
  await expect(page.getByText("Resource version retention policy saved.", { exact: true })).toBeVisible();
  await retentionForm.getByRole("button", { name: "Preview" }).click();
  await expect(retentionForm.getByText(/1 versions, about/u)).toBeVisible();
  await retentionForm.getByRole("button", { name: "Purge eligible" }).click();
  await expect(page.getByText("Purged file content from 1 expired historical versions.", { exact: true })).toBeVisible();
  await page.locator(".list-item").filter({ hasText: "MusicXML handout" }).first().getByRole("button", { name: "History" }).click();
  const retainedHistory = page.getByLabel("MusicXML handout version history");
  await expect(retainedHistory.getByText("Content expired", { exact: true })).toBeVisible();
  await expect(retainedHistory.locator(".list-item").filter({ hasText: "v1" }).getByRole("button", { name: "Restore" })).toHaveCount(0);

  const noticeForm = page.locator("form").filter({ hasText: "Publish notification" });
  await noticeForm.getByPlaceholder("Notification title").fill("Rehearsal starts at seven");
  await noticeForm.locator("textarea").fill("Bring the marked score and arrive ten minutes early.");
  await noticeForm.getByRole("button", { name: "Publish now" }).click();
  await expect(page.locator(".item-title").filter({ hasText: "Rehearsal starts at seven" })).toBeVisible();
  await noticeForm.getByPlaceholder("Notification title").fill("Future seating plan");
  await noticeForm.locator("textarea").fill("This announcement must remain hidden until tomorrow.");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await noticeForm.locator('input[type="datetime-local"]').fill(toLocalDateTime(tomorrow));
  await noticeForm.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByText("scheduled", { exact: true })).toBeVisible();

  const lmsForm = page.locator("form").filter({ hasText: "LTI 1.3 connection" });
  await lmsForm.getByPlaceholder("Course reference").fill("CHOIR-2026");
  await lmsForm.getByRole("button", { name: "Save draft" }).click();
  const savedLmsConnection = page.locator(".list-item").filter({ hasText: "CHOIR-2026" });
  await expect(savedLmsConnection.getByText("draft", { exact: true })).toBeVisible();
  const overview = await request.get(`${apiUrl}/api/education/overview`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  expect(overview.status()).toBe(200);
  const overviewPayload = await overview.json() as { classrooms: Array<{ resourceFolders: Array<{ id: string; path: string }>; lmsConnections: Array<{ status: string }>; resources: Array<{ id: string; title: string; downloadPath: string | null; restoredFromId: string | null; versionNumber: number; visibility: string; selectedStudentIds: string[] }> }> };
  expect(overviewPayload.classrooms[0].lmsConnections[0].status).toBe("draft");
  const uploadedResource = overviewPayload.classrooms[0].resources.find((resource) => resource.title === "MusicXML handout");
  expect(uploadedResource?.downloadPath).toMatch(/^\/api\/education\/resources\//u);
  expect(uploadedResource).toEqual(expect.objectContaining({ versionNumber: 3 }));
  expect(uploadedResource).toEqual(expect.objectContaining({ visibility: "selected" }));
  expect(uploadedResource?.selectedStudentIds).toHaveLength(1);
  expect(uploadedResource?.restoredFromId).toBeTruthy();
  const anonymousDownload = await request.get(`${apiUrl}${uploadedResource!.downloadPath}`);
  expect(anonymousDownload.status()).toBe(401);

  const assistantClasses = await request.get(`${apiUrl}/api/score-classrooms`, { headers: { Authorization: `Bearer ${assistant.token}` } });
  expect(assistantClasses.status()).toBe(200);
  const assistantPayload = await assistantClasses.json() as { classrooms: Array<{ id: string; access: { role: string; canOperate: boolean; canAdmin: boolean } }> };
  expect(assistantPayload.classrooms[0].access).toEqual(expect.objectContaining({ role: "assistant", canOperate: true, canAdmin: false }));
  const classroomId = assistantPayload.classrooms[0].id;
  const practiceFolder = overviewPayload.classrooms[0].resourceFolders.find((folder) => folder.path === "Practice")!;
  const cycleChildResponse = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resource-folders`, {
    headers: { Authorization: `Bearer ${teacher.token}` }, data: { name: "Cycle child", parentId: practiceFolder.id },
  });
  expect(cycleChildResponse.status()).toBe(201);
  const cycleChild = await cycleChildResponse.json() as { folder: { id: string } };
  const cycleMove = await request.patch(`${apiUrl}/api/education/classrooms/${classroomId}/resource-folders/${practiceFolder.id}`, {
    headers: { Authorization: `Bearer ${teacher.token}` }, data: { name: "Practice", parentId: cycleChild.folder.id },
  });
  expect(cycleMove.status()).toBe(409);
  const nonEmptyFolderArchive = await request.delete(`${apiUrl}/api/education/classrooms/${classroomId}/resource-folders/${practiceFolder.id}`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  expect(nonEmptyFolderArchive.status()).toBe(409);
  const assistantResource = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resources`, {
    headers: { Authorization: `Bearer ${assistant.token}` },
    data: { title: "Assistant resource", resourceType: "score", url: "https://example.test/assistant.musicxml" },
  });
  expect(assistantResource.status()).toBe(201);
  const assistantArchive = await request.delete(`${apiUrl}/api/score-classrooms/${classroomId}`, { headers: { Authorization: `Bearer ${assistant.token}` } });
  expect(assistantArchive.status()).toBe(404);
  const observerResource = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resources`, {
    headers: { Authorization: `Bearer ${observer.token}` },
    data: { title: "Forbidden observer resource", resourceType: "score", url: "https://example.test/forbidden.musicxml" },
  });
  expect(observerResource.status()).toBe(404);
  const observerFolder = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resource-folders`, {
    headers: { Authorization: `Bearer ${observer.token}` }, data: { name: "Forbidden folder" },
  });
  expect(observerFolder.status()).toBe(404);
  const observerFolderUpdate = await request.patch(`${apiUrl}/api/education/classrooms/${classroomId}/resource-folders/${practiceFolder.id}`, {
    headers: { Authorization: `Bearer ${observer.token}` }, data: { name: "Forbidden rename", parentId: null },
  });
  expect(observerFolderUpdate.status()).toBe(404);
  const sopranoCurrent = overviewPayload.classrooms[0].resources.find((resource) => resource.title === "Soprano practice track")!;
  const observerMove = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resources/${sopranoCurrent.id}/move`, {
    headers: { Authorization: `Bearer ${observer.token}` }, data: { folderId: null },
  });
  expect(observerMove.status()).toBe(404);
  const observerRead = await request.get(`${apiUrl}/api/education/classrooms/${classroomId}/resources`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(observerRead.status()).toBe(200);
  const observerDownload = await request.get(`${apiUrl}${uploadedResource!.downloadPath}`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(observerDownload.status()).toBe(200);
  expect(await observerDownload.text()).toContain("<step>C</step>");
  const observerHistory = await request.get(`${apiUrl}/api/education/classrooms/${classroomId}/resources/${uploadedResource!.id}/versions`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(observerHistory.status()).toBe(200);
  const observerVersions = await observerHistory.json() as { versions: Array<{ id: string; versionNumber: number; downloadPath: string | null }> };
  expect(observerVersions.versions.map((version) => version.versionNumber)).toEqual([3, 2, 1]);
  const historicalV2 = observerVersions.versions.find((version) => version.versionNumber === 2)!;
  const observerHistoricalDownload = await request.get(`${apiUrl}${historicalV2.downloadPath}`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(observerHistoricalDownload.status()).toBe(200);
  expect(await observerHistoricalDownload.text()).toContain("<step>D</step>");
  const observerRestore = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/resources/${historicalV2.id}/restore`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(observerRestore.status()).toBe(404);
  const adminClasses = await request.get(`${apiUrl}/api/score-classrooms`, { headers: { Authorization: `Bearer ${organizationAdmin.token}` } });
  expect(adminClasses.status()).toBe(200);
  const adminPayload = await adminClasses.json() as { classrooms: Array<{ access: { role: string; canAdmin: boolean } }> };
  expect(adminPayload.classrooms[0].access).toEqual(expect.objectContaining({ role: "organization_admin", canAdmin: true }));
  const adminDetach = await request.patch(`${apiUrl}/api/education/classrooms/${classroomId}/placement`, {
    headers: { Authorization: `Bearer ${organizationAdmin.token}` },
    data: { organizationId: null, campusId: null },
  });
  expect(adminDetach.status()).toBe(400);
  expect(await adminDetach.json()).toEqual(expect.objectContaining({ error: "Only the classroom owner can move or detach this classroom." }));

  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), guardian.token);
  await page.goto(`${appUrl}/student`);
  await expect(page.getByRole("heading", { name: "E2E Chamber Choir" })).toBeVisible();
  await expect(page.getByText("Guardian view · E2E Student", { exact: true })).toBeVisible();
  await expect(page.getByText("Soprano practice track", { exact: true })).toBeVisible();
  const guardianDownload = await request.get(`${apiUrl}${uploadedResource!.downloadPath}`, { headers: { Authorization: `Bearer ${guardian.token}` } });
  expect(guardianDownload.status()).toBe(200);
  expect(guardianDownload.headers()["cache-control"]).toBe("private, no-store");
  expect(guardianDownload.headers()["x-content-type-options"]).toBe("nosniff");
  expect(await guardianDownload.text()).toContain("<step>C</step>");
  await expect(page.locator(".item-title").filter({ hasText: "Rehearsal starts at seven" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByText("Read", { exact: true })).toBeVisible();

  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), student.token);
  await page.goto(`${appUrl}/student`);
  await expect(page.getByRole("heading", { name: "E2E Chamber Choir" })).toBeVisible();
  const emailPreference = page.getByRole("checkbox", { name: "Email me classroom announcements" });
  await expect(emailPreference).not.toBeChecked();
  await emailPreference.check();
  await expect(emailPreference).toBeChecked();
  const preferenceResponse = await request.get(`${apiUrl}/api/education/notification-preferences`, { headers: { Authorization: `Bearer ${student.token}` } });
  expect(await preferenceResponse.json()).toEqual(expect.objectContaining({ preferences: expect.objectContaining({ emailClassroomAnnouncements: true, locale: "en" }) }));
  const emailAnnouncement = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/notifications`, {
    headers: { Authorization: `Bearer ${teacher.token}` },
    data: { title: "Email delivery rehearsal", body: "This announcement should enter the opted-in email outbox." },
  });
  expect(emailAnnouncement.status()).toBe(201);
  const emailAnnouncementPayload = await emailAnnouncement.json() as { id: string };
  const notificationDb = new DatabaseSync(dbFile);
  try {
    materializeDueNotificationDeliveries(notificationDb, new Date().toISOString(), 10_000);
    const delivery = notificationDb.prepare(`
      SELECT deliveries.id, deliveries.status, deliveries.destination
      FROM score_notification_deliveries deliveries
      JOIN score_classroom_notifications notifications ON notifications.id = deliveries.notification_id
      WHERE notifications.id = ?
    `).get(emailAnnouncementPayload.id) as { id: string; status: string; destination: string } | undefined;
    expect(delivery).toEqual(expect.objectContaining({ status: "queued", destination: studentEmail }));
    notificationDb.prepare("UPDATE score_notification_deliveries SET status = 'failed', attempts = 8, last_error = 'test failure' WHERE id = ?").run(delivery!.id);
  } finally {
    notificationDb.close();
  }
  const forbiddenRetry = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/notifications/${emailAnnouncementPayload.id}/retry-failed`, { headers: { Authorization: `Bearer ${observer.token}` } });
  expect(forbiddenRetry.status()).toBe(404);
  const retryDelivery = await request.post(`${apiUrl}/api/education/classrooms/${classroomId}/notifications/${emailAnnouncementPayload.id}/retry-failed`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  expect(await retryDelivery.json()).toEqual({ retried: 1 });
  await expect(page.getByText("Soprano practice track", { exact: true })).toBeVisible();
  const studentDownload = await request.get(`${apiUrl}${uploadedResource!.downloadPath}`, { headers: { Authorization: `Bearer ${student.token}` } });
  expect(studentDownload.status()).toBe(200);
  expect(await studentDownload.text()).toContain("<step>C</step>");
  await expect(page.locator(".item-title").filter({ hasText: "Rehearsal starts at seven" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as read" })).toBeVisible();
  await expect(page.getByText("Future seating plan", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByText("Read", { exact: true })).toBeVisible();
  await expect(page.getByText("0 unread", { exact: true }).first()).toBeVisible();

  await page.getByPlaceholder("Reason for leaving (optional)").fill("Moving to another ensemble");
  await page.getByRole("button", { name: "Request to leave" }).click();
  await expect(page.getByText("Awaiting guardian consent", { exact: true })).toBeVisible();
  const pendingHome = await request.get(`${apiUrl}/api/education/student-home`, { headers: { Authorization: `Bearer ${student.token}` } });
  const pendingPayload = await pendingHome.json() as { classrooms: Array<{ exitRequest: { id: string; status: string } | null }> };
  const exitRequestId = pendingPayload.classrooms[0].exitRequest!.id;
  const outsiderDecision = await request.post(`${apiUrl}/api/education/guardian-exit-requests/${exitRequestId}/decision`, {
    headers: { Authorization: `Bearer ${unselectedStudent.token}` }, data: { decision: "approve" },
  });
  expect(outsiderDecision.status()).toBe(404);

  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), guardian.token);
  await page.goto(`${appUrl}/student`);
  await expect(page.getByText("Moving to another ensemble", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve exit" }).click();
  await expect(page.getByRole("heading", { name: "E2E Chamber Choir" })).toHaveCount(0);

  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), student.token);
  await page.goto(`${appUrl}/student`);
  await expect(page.getByRole("heading", { name: "E2E Chamber Choir" })).toHaveCount(0);

  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), unselectedStudent.token);
  await page.goto(`${appUrl}/student`);
  await expect(page.getByRole("heading", { name: "E2E Chamber Choir" })).toBeVisible();
  await expect(page.getByText("MusicXML handout", { exact: true })).toHaveCount(0);
  const unselectedDownload = await request.get(`${apiUrl}${uploadedResource!.downloadPath}`, { headers: { Authorization: `Bearer ${unselectedStudent.token}` } });
  expect(unselectedDownload.status()).toBe(404);

  const secondClassroom = await request.post(`${apiUrl}/api/score-classrooms`, {
    headers: { Authorization: `Bearer ${teacher.token}` },
    data: { name: "E2E Reuse Classroom", description: "Cross-class resource reuse" },
  });
  expect(secondClassroom.status()).toBe(201);
  const secondClassroomPayload = await secondClassroom.json() as { classroom: { id: string } };
  await page.evaluate((token) => window.localStorage.setItem("score-auth-token", token), teacher.token);
  await page.goto(`${appUrl}/classrooms`);
  const operations = page.getByRole("heading", { name: "Notifications, resources, and LMS" }).locator("xpath=ancestor::section[1]");
  await operations.getByLabel("Current classroom", { exact: true }).selectOption({ label: "E2E Reuse Classroom" });
  await operations.getByLabel("Source classroom").selectOption({ label: "E2E Chamber Choir" });
  await operations.getByLabel("Source resource").selectOption({ label: "MusicXML handout · v3" });
  await operations.getByRole("button", { name: "Reuse resource" }).click();
  await expect(operations.getByText("Resource reused in this classroom.", { exact: true })).toBeVisible();
  await expect(operations.getByText("MusicXML handout", { exact: true })).toBeVisible();
  const reuseOverview = await request.get(`${apiUrl}/api/education/overview`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  const reusePayload = await reuseOverview.json() as { classrooms: Array<{ id: string; resources: Array<{ id: string; fileId: string | null; reusedFromResourceId: string | null; visibility: string; selectedStudentIds: string[] }> }> };
  const targetResource = reusePayload.classrooms.find((classroom) => classroom.id === secondClassroomPayload.classroom.id)!.resources[0]!;
  const sourceResource = reusePayload.classrooms.find((classroom) => classroom.id === classroomId)!.resources.find((resource) => resource.id === uploadedResource!.id)!;
  expect(targetResource.fileId).toBeTruthy();
  expect(targetResource.fileId).toBe(sourceResource.fileId);
  expect(targetResource.reusedFromResourceId).toBe(uploadedResource!.id);
  expect(targetResource.visibility).toBe("staff");
  expect(targetResource.selectedStudentIds).toEqual([]);
});

async function registerUser(request: import("@playwright/test").APIRequestContext, email: string) {
  const response = await request.post(`${apiUrl}/api/auth/register`, { data: { email, password: "E2E-password-2026!" } });
  if (response.status() !== 201) throw new Error(`Could not register education E2E user: ${response.status()} ${await response.text()}`);
  const payload = await response.json() as { token: string; user: { id: string } };
  return { token: payload.token, userId: payload.user.id };
}

async function prepareAuthenticatedApp(page: Page, context: BrowserContext, token: string) {
  await context.addCookies([{ name: "score-locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.route(/^http:\/\/(?:localhost|127\.0\.0\.1):4000\//u, async (route) => {
    const requestUrl = new URL(route.request().url());
    const response = await route.fetch({ url: `${apiUrl}${requestUrl.pathname}${requestUrl.search}` });
    await route.fulfill({ response });
  });
  await page.addInitScript((authToken) => {
    if (!window.localStorage.getItem("score-auth-token")) window.localStorage.setItem("score-auth-token", authToken);
  }, token);
}

function toLocalDateTime(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function musicXmlHandout(pitch: "C4" | "D4") {
  const step = pitch[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Handout</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`;
}
