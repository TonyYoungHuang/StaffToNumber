import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Locator, type Page, type Route } from "@playwright/test";
import type { ScoreJson } from "@score/shared";
import { createOmrCandidateFixture, readOmrDocumentState, readScoreCollaborationCommands, type NotationE2EProfile } from "./omr-candidate-fixture";

const appUrl = "http://127.0.0.1:43101";
const apiUrl = "http://127.0.0.1:43102";
const performanceReportPath = path.join(process.cwd(), "artifacts", "performance", "notation-20k.json");
const performanceLimits = {
  firstEditorReadyMs: 15_000,
  lastPageReadyMs: 2_500,
  selectionReadyMs: 750,
  jsHeapUsedBytes: 256 * 1024 * 1024,
  domNodes: 25_000,
  mountedPages: 10,
  mountedSystems: 20,
  hitTargets: 160,
} as const;
const professionalEditorProfiles: Array<{
  profile: Exclude<NotationE2EProfile, "melody">;
  label: string;
  partName: string;
  target: string;
  stepKey: string;
  accidentalKey?: string;
  expectedPitch: { step: string; alter: number; octave: number };
  eventCount: number;
  staffCount: number;
  voiceCount: number;
  fifths: number;
}> = [
  {
    profile: "piano",
    label: "piano grand staff",
    partName: "Piano",
    target: '[data-staff="2"][data-voice="1"]',
    stepKey: "g",
    expectedPitch: { step: "G", alter: 0, octave: 3 },
    eventCount: 8,
    staffCount: 2,
    voiceCount: 1,
    fifths: 0,
  },
  {
    profile: "satb",
    label: "SATB four-voice score",
    partName: "SATB Choir",
    target: '[data-staff="2"][data-voice="2"]',
    stepKey: "a",
    expectedPitch: { step: "A", alter: 0, octave: 3 },
    eventCount: 16,
    staffCount: 2,
    voiceCount: 2,
    fifths: 0,
  },
  {
    profile: "bb-clarinet",
    label: "Bb transposing instrument score",
    partName: "Bb Clarinet (written pitch)",
    target: '[data-staff="1"][data-voice="1"]',
    stepKey: "f",
    accidentalKey: "+",
    expectedPitch: { step: "F", alter: 1, octave: 4 },
    eventCount: 4,
    staffCount: 1,
    voiceCount: 1,
    fifths: 2,
  },
];

test.describe("OMR candidate review", () => {
  test.describe.configure({ timeout: 60_000 });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("corrects, undoes, redoes, and accepts an Audiveris candidate", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "accept");
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Scan source and recognition diagnostics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "MusicXML staff preview" })).toBeVisible();
    await expect(page.getByText("62%", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Issue symbols").locator("..")).toContainText("4");
    const pageImage = page.locator(".score-source-image-stage img");
    const firstSymbol = page.locator("[data-omr-symbol-id]").first();
    await expect(pageImage).toBeVisible();
    await expect(page.locator("[data-omr-symbol-id]")).toHaveCount(4);
    await expectOmrBoxWithinCssPixelTolerance(pageImage, firstSymbol, { x: 120, y: 260, width: 42, height: 56 }, { width: 1000, height: 1400 }, 4);
    const renderedEvents = page.locator(".score-osmd-event");
    await expect(renderedEvents).toHaveCount(4);
    const initialSourceStageWidth = (await page.locator(".score-source-image-stage").boundingBox())!.width;
    const initialNoteWidth = (await renderedEvents.first().boundingBox())!.width;

    const viewportControls = page.getByRole("group", { name: "Review viewport" });
    await viewportControls.getByRole("button", { name: "Zoom in" }).click();
    await viewportControls.getByRole("button", { name: "Zoom in" }).click();
    await expect(viewportControls.getByRole("status")).toHaveText("150%");
    await expect(page.locator(".score-source-image-stage")).toHaveAttribute("data-review-zoom", "1.5");
    await expect(page.locator(".score-osmd-canvas")).toHaveAttribute("data-review-zoom", "1.5");
    await expect.poll(async () => (await page.locator(".score-source-image-stage").boundingBox())!.width).toBeGreaterThan(initialSourceStageWidth * 1.4);
    await expect.poll(async () => (await renderedEvents.first().boundingBox())!.width).toBeGreaterThan(initialNoteWidth * 1.3);
    await expectSynchronizedHorizontalScroll(page.locator(".score-source-preview"), page.locator(".score-preview-shell"));

    await renderedEvents.nth(2).click();
    const activeSourceSymbol = page.locator("[data-omr-symbol-id].is-active");
    await expect(activeSourceSymbol).toHaveCount(1);
    await expectElementInsideViewport(activeSourceSymbol, page.locator(".score-source-preview"));

    const correctionPanel = page.getByRole("heading", { name: "Note property panel" }).locator("xpath=ancestor::section[1]");
    await correctionPanel.getByLabel("Step").selectOption("G");
    await correctionPanel.getByRole("button", { name: "Save corrected revision" }).click();
    await expect.poll(() => readOmrDocumentState(fixture.documentId).revisions.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByText("Recognition result v2 is not an official revision yet.")).toBeVisible();

    const undo = page.getByRole("button", { name: "Undo correction" });
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.getByText("Created a new current revision from history.")).toBeVisible();

    const redo = page.getByRole("button", { name: "Redo correction" });
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(page.getByText("Created a new current revision from history.")).toBeVisible();

    await page.getByRole("button", { name: "Accept as official revision" }).click();
    await expect(page.getByText("Candidate score review", { exact: true })).toHaveCount(0);

    await expect.poll(() => readOmrDocumentState(fixture.documentId).document?.status).toBe("ready");
    const acceptedState = readOmrDocumentState(fixture.documentId);
    expect(acceptedState.document?.pending_revision_id).toBeNull();
    expect(acceptedState.document?.current_revision_id).not.toBeNull();
    expect(acceptedState.revisions.find((revision) => revision.id === acceptedState.document?.current_revision_id)?.status).toBe("accepted");
    const acceptedScore = JSON.parse(
      acceptedState.revisions.find((revision) => revision.id === acceptedState.document?.current_revision_id)!.score_json,
    ) as { measures: Array<{ events: Array<{ pitch?: { step: string } }> }> };
    expect(acceptedScore.measures[0]!.events[0]!.pitch?.step).toBe("G");
  });

  test("persists an official graphical edit as a canonical collaboration command", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "canonical-command");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);
    const baseRevisionId = readOmrDocumentState(fixture.documentId).document?.current_revision_id;
    expect(baseRevisionId).toBeTruthy();
    expect(baseRevisionId).not.toBe(fixture.initialCandidateRevisionId);

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");

    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(1);
    const [command] = readScoreCollaborationCommands(fixture.documentId);
    expect(command).toMatchObject({
      actor_id: fixture.userId,
      actor_role: "owner",
      base_revision_id: baseRevisionId,
      command_type: "note.patch",
      status: "applied",
      conflict_reason: null,
    });
    expect(command.applied_revision_id).not.toBeNull();
    expect(command.targetScopes).toEqual([`event:${fixture.firstEventId}`]);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    await expect(page.getByText("Saved a new corrected revision.")).toBeVisible();
  });

  test("shows and resolves a same-note canonical command conflict against the latest revision", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "canonical-conflict");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);
    const baseRevisionId = readOmrDocumentState(fixture.documentId).document?.current_revision_id;
    expect(baseRevisionId).toBeTruthy();

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await page.waitForLoadState("networkidle");

    const externalOperationId = `external-conflict-${Date.now()}`;
    const external = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/collaboration/commands`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: {
        operationId: externalOperationId,
        baseRevisionId,
        command: { type: "note.patch", patch: { eventId: fixture.firstEventId, step: "D" } },
      },
    });
    expect(external.status()).toBe(201);
    expect((await external.json()).status).toBe("applied");

    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");
    await expect(editor.getByText("Concurrent edit conflict", { exact: true })).toBeVisible();
    await expect(editor.locator(".item-meta").filter({ hasText: "Reason:" })).toContainText("The same note or measure changed");
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(2);
    const conflict = readScoreCollaborationCommands(fixture.documentId).find((command) => command.status === "conflict");
    expect(conflict?.conflict_reason).toBe("target-overlap");
    expect(conflict?.conflictingCommandIds).toEqual([externalOperationId]);
    expect(readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("D");

    await editor.getByRole("button", { name: "Reapply my edit" }).click();
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(3);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    await expect(editor.getByText("Concurrent edit conflict", { exact: true })).toHaveCount(0);
    await expect(editor.getByText("Reapplied the edit to the latest revision.", { exact: true })).toBeVisible();
    const commands = readScoreCollaborationCommands(fixture.documentId);
    expect(commands.filter((command) => command.status === "applied")).toHaveLength(2);
    expect(commands.filter((command) => command.status === "conflict")).toHaveLength(1);
  });

  test("loads the latest revision without replaying a conflicting local edit", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "canonical-conflict-load-latest");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);
    const baseRevisionId = readOmrDocumentState(fixture.documentId).document?.current_revision_id;
    expect(baseRevisionId).toBeTruthy();

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await page.waitForLoadState("networkidle");

    const external = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/collaboration/commands`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: {
        operationId: `external-load-latest-${Date.now()}`,
        baseRevisionId,
        command: { type: "note.patch", patch: { eventId: fixture.firstEventId, step: "D" } },
      },
    });
    expect(external.status()).toBe(201);

    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");
    await expect(editor.getByText("Concurrent edit conflict", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Load latest version" }).click();

    await expect(editor.getByText("Concurrent edit conflict", { exact: true })).toHaveCount(0);
    await expect(editor.getByText("Loaded the latest server revision.", { exact: true })).toBeVisible();
    await expect(editor.getByLabel("Pitch")).toHaveValue("D");
    expect(readScoreCollaborationCommands(fixture.documentId)).toHaveLength(2);
    expect(readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("D");
  });

  test("queues an official graphical edit offline and syncs it after reconnect", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "canonical-offline-queue");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await page.waitForLoadState("networkidle");

    const collaborationPattern = /\/api\/scores\/[^/]+\/collaboration\/commands$/u;
    const abortCollaboration = (route: Route) => route.abort("internetdisconnected");
    await page.route(collaborationPattern, abortCollaboration);
    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");

    await expect(editor.getByText("Offline edit queue (1)", { exact: true })).toBeVisible();
    await expect(editor.getByText("Network unavailable. Safely queued 1 edit for sync.", { exact: true })).toBeVisible();
    await expect.poll(() => readOfflineCollaborationQueueCount(page)).toBe(1);
    expect(readScoreCollaborationCommands(fixture.documentId)).toHaveLength(0);

    await page.unroute(collaborationPattern, abortCollaboration);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(1);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    await expect.poll(() => readOfflineCollaborationQueueCount(page)).toBe(0);
    await expect(editor.getByText("Offline edit queue (1)", { exact: true })).toHaveCount(0);
    await expect(editor.getByText("Offline edits synced to the server.", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`)).toBeVisible({ timeout: 15_000 });
    expect(readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    expect(await readOfflineCollaborationQueueCount(page)).toBe(0);
  });

  test("undoes and redoes an owner edit while preserving a later disjoint collaborator edit", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "canonical-shared-history");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);

    const shareResponse = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/share-links`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { permission: "edit" },
    });
    expect(shareResponse.status()).toBe(201);
    const editShare = (await shareResponse.json()) as { share: { token: string } };

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(1);
    const ownerRevisionId = readOmrDocumentState(fixture.documentId).document?.current_revision_id;
    expect(ownerRevisionId).toBeTruthy();
    await expect(editor.getByRole("button", { name: "Undo my operation" })).toBeEnabled();

    const collaborator = await request.post(`${apiUrl}/api/scores/shared/${editShare.share.token}/collaboration/commands`, {
      data: {
        operationId: `shared-history-disjoint-${Date.now()}`,
        baseRevisionId: ownerRevisionId,
        command: { type: "note.patch", patch: { eventId: fixture.lastEventId, step: "A" } },
      },
    });
    expect(collaborator.status()).toBe(201);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.lastEventId)).toBe("A");

    await editor.getByRole("button", { name: "Undo my operation" }).click();
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(3);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("C");
    expect(readLatestPitchStep(fixture.documentId, fixture.lastEventId)).toBe("A");
    await expect(editor.getByText("Undid the latest shared edit.", { exact: true })).toBeVisible();
    await expect(editor.getByRole("button", { name: "Redo my operation" })).toBeEnabled();

    await editor.getByRole("button", { name: "Redo my operation" }).click();
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(4);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    expect(readLatestPitchStep(fixture.documentId, fixture.lastEventId)).toBe("A");
    await expect(editor.getByText("Redid the latest shared edit.", { exact: true })).toBeVisible();
  });

  test("allows an edit share to use the graphical editor while a view share stays read-only", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "shared-canonical-command");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);
    const createShare = async (permission: "view" | "edit") => {
      const response = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/share-links`, {
        headers: { Authorization: `Bearer ${fixture.token}` },
        data: { permission },
      });
      expect(response.status()).toBe(201);
      return (await response.json()) as { share: { id: string; token: string } };
    };
    const viewShare = await createShare("view");
    const editShare = await createShare("edit");

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/shared/${viewShare.share.token}`);
    await expect(page.getByRole("heading", { name: "Measure-level graphical editor" })).toHaveCount(0);

    await page.goto(`${appUrl}/scores/shared/${editShare.share.token}`);
    const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(editor).toBeVisible({ timeout: 15_000 });
    const firstNote = editor.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await firstNote.click();
    await editor.press("g");
    await editor.press("Enter");

    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(1);
    const [command] = readScoreCollaborationCommands(fixture.documentId);
    expect(command).toMatchObject({
      actor_id: `share:${editShare.share.id}`,
      actor_role: "editor",
      command_type: "note.patch",
      status: "applied",
    });
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
    await expect(page.getByText("Saved a new corrected revision.")).toBeVisible();

    await editor.getByRole("button", { name: "Undo my operation" }).click();
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(2);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("C");
    await expect(editor.getByRole("button", { name: "Redo my operation" })).toBeEnabled();
    await editor.getByRole("button", { name: "Redo my operation" }).click();
    await expect.poll(() => readScoreCollaborationCommands(fixture.documentId).length).toBe(3);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("G");
  });

  test("posts a note-targeted annotation through a named comment share and lets the owner resolve it", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "shared-annotation-workspace");
    const accepted = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    expect(accepted.status()).toBe(200);
    const shareResponse = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/share-links`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { permission: "comment", label: "Section coach" },
    });
    expect(shareResponse.status()).toBe(201);
    const share = (await shareResponse.json()) as { share: { token: string } };

    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/shared/${share.share.token}`);
    const workspace = page.getByTestId("shared-annotation-workspace");
    await expect(workspace.getByRole("heading", { name: "Commenter workspace" })).toBeVisible({ timeout: 15_000 });
    await expect(workspace.getByRole("button", { name: "Selected note" })).toBeDisabled();
    const scoreNote = page.locator(`[data-score-event-id="${fixture.firstEventId}"]`);
    await expect(scoreNote).toBeVisible({ timeout: 15_000 });
    await scoreNote.click();
    await workspace.getByRole("button", { name: "Selected note" }).click();
    await workspace.getByPlaceholder("Describe a correction, practice point, or question").fill("Check this entrance against the accompaniment.");
    await workspace.getByRole("button", { name: "Post annotation" }).click();
    const annotation = workspace.getByTestId("shared-annotation");
    await expect(annotation).toContainText("Section coach");
    await expect(annotation).toContainText("Link identity");
    await expect(annotation).toContainText("Check this entrance against the accompaniment.");

    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    const ownerCommentItem = page.locator("#project-comments .list-item").filter({ hasText: "Check this entrance against the accompaniment." });
    await expect(ownerCommentItem).toBeVisible({ timeout: 15_000 });
    await expect(ownerCommentItem).toContainText("Section coach");
    await expect(ownerCommentItem).toContainText("Link identity");
    await ownerCommentItem.getByRole("button", { name: "Resolve" }).click();
    await expect(ownerCommentItem).toContainText("Resolved");
  });

  test("changes pitch by dragging a real VexFlow note hit target", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "vexflow-drag");
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
    const hitTargets = page.locator("[data-vexflow-event-id]");
    await expect(hitTargets).toHaveCount(4);
    const firstNote = page.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await expect(firstNote).toBeVisible();
    await expect(firstNote).toHaveAttribute("aria-pressed", "true");
    await firstNote.scrollIntoViewIfNeeded();

    const noteBox = await firstNote.boundingBox();
    expect(noteBox).not.toBeNull();
    const centerX = noteBox!.x + noteBox!.width / 2;
    const centerY = noteBox!.y + noteBox!.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY - 20, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => readOmrDocumentState(fixture.documentId).revisions.length).toBeGreaterThanOrEqual(2);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("E");
    await expect(page.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`)).toHaveAttribute("aria-pressed", "true");
  });

  test("redraws only the edited system of a multi-page VexFlow score", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "incremental-pages", "incremental-pages");
    expect(fixture.eventCount).toBe(16);
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
    const pages = page.locator("[data-vexflow-page-index]");
    await expect(pages).toHaveCount(2);
    const systems = page.locator("[data-vexflow-system-index]");
    await expect(systems).toHaveCount(3);
    await expect(page.locator("[data-vexflow-event-id]")).toHaveCount(16);
    const editedSystem = page.locator('[data-vexflow-system-index="0"]');
    const siblingSystem = page.locator('[data-vexflow-system-index="1"]');
    const secondPageSystem = page.locator('[data-vexflow-system-index="2"]');
    await expect.poll(async () => Number(await editedSystem.getAttribute("data-render-count"))).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number(await siblingSystem.getAttribute("data-render-count"))).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number(await secondPageSystem.getAttribute("data-render-count"))).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(200);
    const editedRenderCount = Number(await editedSystem.getAttribute("data-render-count"));
    const siblingRenderCount = Number(await siblingSystem.getAttribute("data-render-count"));
    const secondPageRenderCount = Number(await secondPageSystem.getAttribute("data-render-count"));

    const firstNote = page.locator(`[data-vexflow-event-id="${fixture.firstEventId}"]`);
    await firstNote.scrollIntoViewIfNeeded();
    const noteBox = await firstNote.boundingBox();
    expect(noteBox).not.toBeNull();
    const centerX = noteBox!.x + noteBox!.width / 2;
    const centerY = noteBox!.y + noteBox!.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY - 20, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => readOmrDocumentState(fixture.documentId).revisions.length).toBeGreaterThanOrEqual(2);
    await expect.poll(() => readLatestPitchStep(fixture.documentId, fixture.firstEventId)).toBe("E");
    await expect.poll(async () => Number(await editedSystem.getAttribute("data-render-count"))).toBeGreaterThan(editedRenderCount);
    await expect(siblingSystem).toHaveAttribute("data-render-count", String(siblingRenderCount));
    await expect(secondPageSystem).toHaveAttribute("data-render-count", String(secondPageRenderCount));
    await expect(page.locator(`[data-vexflow-event-id="${fixture.lastEventId}"]`)).toBeVisible();
  });

  test("virtualizes VexFlow systems while navigating a 100-page score", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "virtualized-pages", "virtualized-pages");
    expect(fixture.eventCount).toBe(400);
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 20_000 });
    const pages = page.locator("[data-vexflow-page-index]");
    await expect(pages).toHaveCount(100);
    await expect.poll(() => page.locator('[data-vexflow-page-rendered="true"]').count()).toBeGreaterThanOrEqual(1);
    expect(await page.locator('[data-vexflow-page-rendered="true"]').count()).toBeLessThan(10);
    expect(await page.locator("[data-vexflow-system-index]").count()).toBeLessThan(10);
    expect(await page.locator("[data-vexflow-event-id]").count()).toBeLessThan(40);

    const lastPage = page.locator('[data-vexflow-page-index="99"]');
    await lastPage.scrollIntoViewIfNeeded();
    await expect(lastPage).toHaveAttribute("data-vexflow-page-rendered", "true", { timeout: 15_000 });
    const lastTarget = page.locator(`[data-vexflow-event-id="${fixture.lastEventId}"]`);
    await expect(lastTarget).toBeVisible();
    const revisionCountBeforeSelection = readOmrDocumentState(fixture.documentId).revisions.length;
    await lastTarget.click();
    await page.waitForTimeout(500);
    expect(readOmrDocumentState(fixture.documentId).revisions).toHaveLength(revisionCountBeforeSelection);
    await expect(lastTarget).toHaveAttribute("aria-pressed", "true");
    expect(await page.locator('[data-vexflow-page-rendered="true"]').count()).toBeLessThan(10);
    expect(await page.locator("[data-vexflow-event-id]").count()).toBeLessThan(40);
  });

  test("meets the 20,000-note browser interaction and memory budget", async ({ page, request, context }) => {
    test.slow();
    test.setTimeout(120_000);
    const fixture = await createOmrCandidateFixture(request, "performance-20k", "performance-20k");
    expect(fixture.eventCount).toBe(20_000);
    await prepareAuthenticatedApp(page, context, fixture.token);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");

    const navigationStartedAt = performance.now();
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Load complete OSMD preview" })).toBeVisible();
    await expect(page.locator('[data-scalable-entity-picker="indexed"][data-item-count="20000"]')).toHaveCount(1);
    await expect(page.locator('[data-scalable-entity-picker="indexed"][data-item-count="5000"]')).toHaveCount(6);
    const pages = page.locator("[data-vexflow-page-index]");
    await expect.poll(() => pages.count(), { timeout: 45_000 }).toBeGreaterThan(100);
    await pages.first().scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('[data-vexflow-page-rendered="true"]').count(), { timeout: 45_000 }).toBeGreaterThanOrEqual(1);
    await expect(page.locator("[data-vexflow-event-id]").first()).toBeVisible({ timeout: 45_000 });
    const firstEditorReadyMs = performance.now() - navigationStartedAt;

    const lastPage = pages.last();
    const lastPageStartedAt = performance.now();
    await lastPage.scrollIntoViewIfNeeded();
    await expect(lastPage).toHaveAttribute("data-vexflow-page-rendered", "true", { timeout: 15_000 });
    const lastTarget = page.locator(`[data-vexflow-event-id="${fixture.lastEventId}"]`);
    await expect(lastTarget).toBeVisible({ timeout: 15_000 });
    const lastPageReadyMs = performance.now() - lastPageStartedAt;

    const selectionStartedAt = performance.now();
    await lastTarget.click();
    await expect(lastTarget).toHaveAttribute("aria-pressed", "true");
    const selectionReadyMs = performance.now() - selectionStartedAt;
    await cdp.send("HeapProfiler.collectGarbage");
    const metrics = await cdp.send("Performance.getMetrics") as { metrics: Array<{ name: string; value: number }> };
    const metric = new Map(metrics.metrics.map((item) => [item.name, item.value]));
    const report = {
      generatedAt: new Date().toISOString(),
      fixture: { measures: 5_000, notes: fixture.eventCount, pages: await pages.count() },
      timingsMs: {
        firstEditorReady: Math.round(firstEditorReadyMs),
        lastPageReady: Math.round(lastPageReadyMs),
        selectionReady: Math.round(selectionReadyMs),
      },
      resources: {
        jsHeapUsedBytes: Math.round(metric.get("JSHeapUsedSize") ?? 0),
        domNodes: Math.round(metric.get("Nodes") ?? 0),
        mountedPages: await page.locator('[data-vexflow-page-rendered="true"]').count(),
        mountedSystems: await page.locator("[data-vexflow-system-index]").count(),
        hitTargets: await page.locator("[data-vexflow-event-id]").count(),
      },
      limits: performanceLimits,
    };
    fs.mkdirSync(path.dirname(performanceReportPath), { recursive: true });
    fs.writeFileSync(performanceReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    expect(report.timingsMs.firstEditorReady).toBeLessThan(performanceLimits.firstEditorReadyMs);
    expect(report.timingsMs.lastPageReady).toBeLessThan(performanceLimits.lastPageReadyMs);
    expect(report.timingsMs.selectionReady).toBeLessThan(performanceLimits.selectionReadyMs);
    expect(report.resources.jsHeapUsedBytes).toBeLessThan(performanceLimits.jsHeapUsedBytes);
    expect(report.resources.domNodes).toBeLessThan(performanceLimits.domNodes);
    expect(report.resources.mountedPages).toBeLessThan(performanceLimits.mountedPages);
    expect(report.resources.mountedSystems).toBeLessThan(performanceLimits.mountedSystems);
    expect(report.resources.hitTargets).toBeLessThan(performanceLimits.hitTargets);
  });

  for (const scenario of professionalEditorProfiles) {
    test(`edits and reloads a ${scenario.label}`, async ({ page, request, context }) => {
      const fixture = await createOmrCandidateFixture(request, `editor-${scenario.profile}`, scenario.profile);
      expect(fixture.eventCount).toBe(scenario.eventCount);
      expect(fixture.staffCount).toBe(scenario.staffCount);
      expect(fixture.voiceCount).toBe(scenario.voiceCount);
      await prepareAuthenticatedApp(page, context, fixture.token);
      await page.goto(`${appUrl}/scores/${fixture.documentId}`);

      await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
      const hitTargets = page.locator("[data-vexflow-event-id]");
      await expect(hitTargets).toHaveCount(scenario.eventCount);
      await expect(page.locator(".vexflow-canvas")).toContainText(scenario.partName);
      for (let staff = 1; staff <= scenario.staffCount; staff += 1) {
        await expect(page.locator(`[data-vexflow-event-id][data-staff="${staff}"]`)).toHaveCount(scenario.eventCount / scenario.staffCount);
      }
      if (scenario.staffCount === 2) {
        await expectDistinctStaffLanes(page);
      }

      const target = page.locator(`[data-vexflow-event-id]${scenario.target}`).first();
      await target.scrollIntoViewIfNeeded();
      const eventId = await target.getAttribute("data-vexflow-event-id");
      expect(eventId).not.toBeNull();
      await target.click();
      await expect(target).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press(scenario.stepKey);
      if (scenario.accidentalKey) {
        await page.keyboard.type(scenario.accidentalKey);
        const editor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
        await expect(editor.getByLabel("Alter")).toHaveValue("1");
      }
      await page.keyboard.press("Enter");

      await expect.poll(() => readOmrDocumentState(fixture.documentId).revisions.length).toBeGreaterThanOrEqual(2);
      await expect.poll(() => readLatestPitch(fixture.documentId, eventId!)).toEqual(scenario.expectedPitch);
      expect(readLatestScore(fixture.documentId).measures[0]!.attributes?.key?.fifths).toBe(scenario.fifths);

      await page.reload();
      const reloadedTarget = page.locator(`[data-vexflow-event-id="${eventId}"]`);
      await expect(reloadedTarget).toBeVisible({ timeout: 15_000 });
      await expect(reloadedTarget).toHaveAttribute("data-staff", scenario.target.match(/data-staff="(\d+)"/)?.[1] ?? "1");
      expect(readLatestPitch(fixture.documentId, eventId!)).toEqual(scenario.expectedPitch);
    });
  }

  test("keeps the SATB VexFlow engraving pixel-stable", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "visual-satb", "satb");
    await page.setViewportSize({ width: 1440, height: 1100 });
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }" });
    await page.evaluate(() => document.fonts.ready);

    const pageCanvas = page.locator('.vexflow-page-canvas[data-vexflow-page-index="0"]');
    await expect(pageCanvas).toHaveAttribute("data-vexflow-page-rendered", "true", { timeout: 15_000 });
    await expect(page.locator("[data-vexflow-event-id]")).toHaveCount(16);
    await expect(pageCanvas).toHaveScreenshot("vexflow-satb-page.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
      threshold: 0.2,
    });
  });

  test("exports an edited SATB revision to MusicXML and reopens an equivalent editable score", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "musicxml-roundtrip", "satb");
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
    const editedTarget = page.locator('[data-vexflow-event-id][data-staff="2"][data-voice="2"]').first();
    await editedTarget.scrollIntoViewIfNeeded();
    await editedTarget.click();
    const editedEventId = await editedTarget.getAttribute("data-vexflow-event-id");
    expect(editedEventId).not.toBeNull();
    await page.keyboard.press("a");
    await page.keyboard.press("Enter");
    await expect.poll(() => readLatestPitch(fixture.documentId, editedEventId!)).toEqual({
      step: "A",
      alter: 0,
      octave: 3,
    });

    await page.getByRole("button", { name: "Accept as official revision" }).click();
    await expect(page.getByText("Candidate score review", { exact: true })).toHaveCount(0);
    await expect.poll(() => readOmrDocumentState(fixture.documentId).document?.status).toBe("ready");
    const exportedSemantics = scoreMusicSemantics(readLatestScore(fixture.documentId));

    const exportResponse = await request.post(`${apiUrl}/api/scores/${fixture.documentId}/export/musicxml`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
    });
    expect(exportResponse.status(), await exportResponse.text()).toBe(201);
    const exportPayload = (await exportResponse.json()) as { file: { id: string; originalName: string; mimeType: string } };
    expect(exportPayload.file.mimeType).toBe("application/vnd.recordare.musicxml+xml");

    const downloadResponse = await request.get(`${apiUrl}/api/files/${exportPayload.file.id}/download`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
    });
    expect(downloadResponse.status(), await downloadResponse.text()).toBe(200);
    expect(downloadResponse.headers()["content-type"]).toContain("application/vnd.recordare.musicxml+xml");
    const exportedMusicXml = await downloadResponse.body();
    expect(exportedMusicXml.toString("utf8")).toContain('<score-partwise version="4.0">');

    const importResponse = await request.post(`${apiUrl}/api/scores/import/musicxml`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      multipart: {
        file: {
          name: exportPayload.file.originalName,
          mimeType: exportPayload.file.mimeType,
          buffer: exportedMusicXml,
        },
      },
    });
    expect(importResponse.status(), await importResponse.text()).toBe(201);
    const importPayload = (await importResponse.json()) as { score: { id: string } };
    const importedScore = readLatestScore(importPayload.score.id);
    expect(scoreMusicSemantics(importedScore)).toEqual(exportedSemantics);

    await page.goto(`${appUrl}/scores/${importPayload.score.id}`);
    await expect(page.getByText("Candidate score review", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-vexflow-event-id]")).toHaveCount(16);
    await expect(page.locator(".vexflow-canvas")).toContainText("SATB Choir");
    await expect(page.locator('[data-vexflow-event-id][data-staff="1"]')).toHaveCount(8);
    await expect(page.locator('[data-vexflow-event-id][data-staff="2"]')).toHaveCount(8);

    const reopenedTarget = page.locator('[data-vexflow-event-id][data-staff="2"][data-voice="2"]').first();
    const revisionCountBeforeSelection = readOmrDocumentState(importPayload.score.id).revisions.length;
    await reopenedTarget.click();
    await page.waitForTimeout(500);
    expect(readOmrDocumentState(importPayload.score.id).revisions).toHaveLength(revisionCountBeforeSelection);
    const graphicalEditor = page.getByRole("heading", { name: "Measure-level graphical editor" }).locator("xpath=ancestor::section[1]");
    await expect(graphicalEditor.getByLabel("Pitch")).toHaveValue("A");
    await expect(graphicalEditor.getByLabel("Octave")).toHaveValue("3");
  });

  test("rejects an Audiveris candidate without creating an official revision", async ({ page, request, context }) => {
    const fixture = await createOmrCandidateFixture(request, "reject");
    await prepareAuthenticatedApp(page, context, fixture.token);
    await page.goto(`${appUrl}/scores/${fixture.documentId}`);

    await expect(page.getByText("Candidate score review", { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Reject candidate" }).click();
    await expect(page.getByText("Candidate score review", { exact: true })).toHaveCount(0);

    await expect.poll(() => readOmrDocumentState(fixture.documentId).document?.status).toBe("candidate");
    const rejectedState = readOmrDocumentState(fixture.documentId);
    expect(rejectedState.document?.pending_revision_id).toBeNull();
    expect(rejectedState.document?.current_revision_id).toBeNull();
    expect(rejectedState.revisions).toHaveLength(1);
    expect(rejectedState.revisions[0]?.id).toBe(fixture.initialCandidateRevisionId);
    expect(rejectedState.revisions[0]?.status).toBe("rejected");
  });
});

async function expectOmrBoxWithinCssPixelTolerance(
  image: Locator,
  symbol: Locator,
  bbox: { x: number; y: number; width: number; height: number },
  coordinateSpace: { width: number; height: number },
  tolerance: number,
) {
  const imageBox = await image.boundingBox();
  const symbolBox = await symbol.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(symbolBox).not.toBeNull();
  const expected = {
    x: imageBox!.x + (bbox.x / coordinateSpace.width) * imageBox!.width,
    y: imageBox!.y + (bbox.y / coordinateSpace.height) * imageBox!.height,
    width: (bbox.width / coordinateSpace.width) * imageBox!.width,
    height: (bbox.height / coordinateSpace.height) * imageBox!.height,
  };
  expect(Math.abs(symbolBox!.x - expected.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(symbolBox!.y - expected.y)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(symbolBox!.width - expected.width)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(symbolBox!.height - expected.height)).toBeLessThanOrEqual(tolerance);
}

async function expectSynchronizedHorizontalScroll(source: Locator, target: Locator) {
  await expect.poll(() => source.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
  await expect.poll(() => target.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
  await source.evaluate((element) => {
    element.scrollLeft = (element.scrollWidth - element.clientWidth) * 0.6;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(async () => {
    const [sourceProgress, targetProgress] = await Promise.all([
      source.evaluate((element) => element.scrollLeft / Math.max(element.scrollWidth - element.clientWidth, 1)),
      target.evaluate((element) => element.scrollLeft / Math.max(element.scrollWidth - element.clientWidth, 1)),
    ]);
    return Math.abs(sourceProgress - targetProgress);
  }).toBeLessThanOrEqual(0.03);
}

async function expectElementInsideViewport(element: Locator, viewport: Locator) {
  const [elementBox, viewportBox] = await Promise.all([element.boundingBox(), viewport.boundingBox()]);
  expect(elementBox).not.toBeNull();
  expect(viewportBox).not.toBeNull();
  expect(elementBox!.x).toBeGreaterThanOrEqual(viewportBox!.x);
  expect(elementBox!.y).toBeGreaterThanOrEqual(viewportBox!.y);
  expect(elementBox!.x + elementBox!.width).toBeLessThanOrEqual(viewportBox!.x + viewportBox!.width);
  expect(elementBox!.y + elementBox!.height).toBeLessThanOrEqual(viewportBox!.y + viewportBox!.height);
}

function readLatestPitchStep(documentId: string, eventId: string) {
  return readLatestPitch(documentId, eventId)?.step ?? null;
}

function readLatestPitch(documentId: string, eventId: string) {
  return readLatestScore(documentId)
    .measures.flatMap((measure) => measure.events)
    .find((event) => event.id === eventId)?.pitch ?? null;
}

function readLatestScore(documentId: string): ScoreJson {
  const latest = readOmrDocumentState(documentId).revisions.at(-1);
  if (!latest) throw new Error(`Score ${documentId} has no revisions.`);
  return JSON.parse(latest.score_json) as ScoreJson;
}

function scoreMusicSemantics(score: ScoreJson) {
  return {
    parts: score.parts.map((part) => ({
      id: part.id,
      name: part.name,
      abbreviation: part.abbreviation ?? null,
      midiProgram: part.midiProgram ?? null,
      staffCount: part.staffCount ?? 1,
      measureCount: part.measureCount,
    })),
    measures: score.measures.map((measure) => ({
      partId: measure.partId,
      number: measure.number,
      sequence: measure.sequence,
      implicit: measure.implicit ?? false,
      attributes: measure.attributes
        ? {
            divisions: measure.attributes.divisions ?? null,
            key: measure.attributes.key ?? null,
            time: measure.attributes.time ?? null,
            staves: measure.attributes.staves ?? 1,
            clefs: measure.attributes.clefs ?? (measure.attributes.clef ? [measure.attributes.clef] : []),
          }
        : null,
      voices: Array.from(
        measure.events.reduce((groups, event) => {
          const key = `${event.staff ?? 1}:${event.voice ?? "1"}`;
          const values = groups.get(key) ?? [];
          values.push({
            type: event.type,
            duration: event.duration,
            durationType: event.durationType ?? null,
            dots: event.dots,
            staff: event.staff ?? 1,
            voice: event.voice ?? "1",
            ...(event.type === "note"
              ? {
                  pitch: event.pitch,
                  chord: event.chord,
                  ties: event.ties,
                  lyrics: event.lyrics,
                }
              : { measureRest: event.measureRest }),
          });
          groups.set(key, values);
          return groups;
        }, new Map<string, Array<Record<string, unknown>>>()),
      ).sort(([left], [right]) => left.localeCompare(right)),
    })),
  };
}

async function expectDistinctStaffLanes(page: Page) {
  const upper = await page.locator('[data-vexflow-event-id][data-staff="1"]').first().boundingBox();
  const lower = await page.locator('[data-vexflow-event-id][data-staff="2"]').first().boundingBox();
  expect(upper).not.toBeNull();
  expect(lower).not.toBeNull();
  expect(lower!.y).toBeGreaterThan(upper!.y + 30);
}

async function readOfflineCollaborationQueueCount(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("score-notation-collaboration", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!database.objectStoreNames.contains("commands")) {
      database.close();
      return 0;
    }
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction("commands", "readonly").objectStore("commands").count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  });
}

async function prepareAuthenticatedApp(page: Page, context: BrowserContext, token: string) {
  await context.addCookies([{ name: "score_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.route(/^http:\/\/(?:localhost|127\.0\.0\.1):4000\//u, async (route) => {
    try {
      const requestUrl = new URL(route.request().url());
      const response = await route.fetch({ url: `http://127.0.0.1:43102${requestUrl.pathname}${requestUrl.search}` });
      await route.fulfill({ response });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Route is already handled")) return;
      throw error;
    }
  });
  await page.addInitScript((authToken) => window.localStorage.setItem("score-auth-token", authToken), token);
}
