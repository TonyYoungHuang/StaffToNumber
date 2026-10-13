import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { SCORE_TASKS, readScoreTaskIntent, scoreTaskDocumentPath, scoreTaskEntryPath, scoreTaskForSource, type ScoreTaskIntent } from "@score/shared";
import { resolveAuthReturnPath } from "./auth-return";
import { GUEST_IMPORT_OWNER_ID, loadImportDraft, resumeImportDraft, saveGuestImportDraft, saveImportDraft, type ImportDraft } from "./import-draft";
import { getScoreTaskMessages } from "./score-task-messages";

test("tool intent, locale and chosen target survive entry, login and document paths", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const [source, task, anchor] of [
      ["sheet-music-scanner", "scan", "visual-editor"],
      ["transpose-score", "transpose", "transpose-score"],
      ["staff-to-jianpu", "jianpu", "jianpu-preview"],
      ["jianpu-to-staff", "jianpu-input", "visual-editor"],
      ["score-editor", "edit", "visual-editor"],
      ["score-to-audio", "play", "playback-practice"],
      ["musicxml-midi", "export", "export-center"],
    ] as const) {
      const intent: ScoreTaskIntent = { task, source, locale, targetTonic: "Bb", targetMode: "minor", semitones: -2 };
      const entry = scoreTaskEntryPath(intent);
      assert.equal(resolveAuthReturnPath(entry), entry);
      assert.deepEqual(readScoreTaskIntent(new URL(entry, "https://app.example").searchParams), intent);
      assert.equal(scoreTaskForSource(source), task);
      for (const ensemble of [false, true]) {
        const destination = new URL(scoreTaskDocumentPath("score 1", intent, ensemble), "https://app.example");
        assert.equal(destination.pathname, `/scores/score%201${ensemble ? "/ensemble" : ""}`);
        assert.equal(destination.hash, `#${anchor}`);
        assert.deepEqual(readScoreTaskIntent(destination.searchParams), intent);
      }
    }
  }
});

test("untrusted task parameters never become navigation or unsupported targets", () => {
  assert.equal(readScoreTaskIntent(new URLSearchParams("task=https://evil.example")), null);
  assert.equal(scoreTaskForSource("unknown-feature"), null);
  for (const source of ["constructor", "toString", "__proto__"]) assert.equal(scoreTaskForSource(source), null);
  assert.deepEqual(readScoreTaskIntent(new URLSearchParams("task=transpose&source=sheet-music-scanner&locale=xx&semitones=99&targetTonic=H&targetMode=unknown")), { task: "transpose" });
  for (const raw of ["1.5", "NaN", "-25", "25", "1e1", "Infinity"]) {
    assert.equal(readScoreTaskIntent(new URLSearchParams({ task: "transpose", semitones: raw }))?.semitones, undefined);
  }
  assert.equal(scoreTaskDocumentPath("project-1", null), "/scores/project-1");
});

test("all nine locales have native task continuation and target templates", () => {
  const english = getScoreTaskMessages("en");
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getScoreTaskMessages(locale);
    for (const task of SCORE_TASKS) {
      assert.ok(copy.tasks[task]?.trim(), `${locale}: ${task}`);
      if (locale !== "en") assert.notEqual(copy.tasks[task], english.tasks[task], `${locale}: ${task}`);
    }
    for (const key of ["body", "chooseFile", "existing", "target", "shift"] as const) {
      assert.ok(copy[key]?.trim(), `${locale}: ${key}`);
      if (locale !== "en") assert.notEqual(copy[key], english[key], `${locale}: ${key}`);
    }
    assert.match(copy.target, /\{target\}/u);
    assert.match(copy.shift, /\{value\}/u);
  }
});

// Exercise app draft ownership/resume logic without depending on a browser process.
async function withDraftStore(run: (entries: Map<string, ImportDraft>) => Promise<void>, failPut = false) {
  const previous = globalThis.indexedDB;
  const entries = new Map<string, ImportDraft>();
  globalThis.indexedDB = { open() {
    const open = { result: { close() {}, transaction() {
      const transaction = { objectStore() { return {
        get(key: string) { return { result: entries.get(key) }; },
        put(value: ImportDraft, key: string) { if (failPut) throw new Error("Storage unavailable"); entries.set(key, value); return { result: key }; },
        delete(key: string) { entries.delete(key); return { result: undefined }; },
      }; }, oncomplete: undefined as (() => void) | undefined };
      queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    } }, onsuccess: undefined as (() => void) | undefined };
    queueMicrotask(() => open.onsuccess?.());
    return open;
  } } as unknown as IDBFactory;
  try { await run(entries); } finally { globalThis.indexedDB = previous; }
}

test("login claims a selected guest file, text and task before an older user draft", async () => {
  await withDraftStore(async entries => {
    const now = Date.now();
    const intent: ScoreTaskIntent = { task: "transpose", source: "transpose-score", locale: "zh-CN", targetTonic: "F", targetMode: "major" };
    await saveImportDraft({ ownerId: "user-1", file: null, title: "old", text: "", mode: "jianpu", createdAt: now - 1000 });
    const file = new File(["original score"], "score.musicxml", { type: "application/xml" });
    await saveGuestImportDraft({ file, title: "source", text: "1=C", mode: "file", createdAt: now, intent });
    const draft = await resumeImportDraft("user-1");
    assert.equal(draft?.ownerId, "user-1");
    assert.equal(draft?.file?.name, "score.musicxml");
    assert.equal(await draft?.file?.text(), "original score");
    assert.equal(draft?.text, "1=C");
    assert.deepEqual(draft?.intent, intent);
    assert.equal(entries.has(GUEST_IMPORT_OWNER_ID), false);
    assert.deepEqual((await loadImportDraft("user-1"))?.intent, intent);
  });
});

test("resume keeps a newer signed-in draft and expires old guest files", async () => {
  await withDraftStore(async entries => {
    const now = Date.now();
    await saveImportDraft({ ownerId: "user-1", file: null, title: "new", text: "1 2 3", mode: "jianpu", createdAt: now });
    await saveGuestImportDraft({ file: null, title: "old", text: "old", mode: "jianpu", createdAt: now - 1000 });
    assert.equal((await resumeImportDraft("user-1"))?.title, "new");
    assert.equal(entries.has(GUEST_IMPORT_OWNER_ID), false);
    await saveGuestImportDraft({ file: null, title: "expired", text: "", mode: "file", createdAt: now - 86400001 });
    assert.equal(await loadImportDraft(GUEST_IMPORT_OWNER_ID), null);
    assert.equal(entries.has(GUEST_IMPORT_OWNER_ID), false);
    assert.equal(await loadImportDraft("another-user"), null);
  });
});

test("storage failures reject draft saving so the visible recovery action can run", async () => {
  await withDraftStore(async () => {
    await assert.rejects(saveGuestImportDraft({ file: null, title: "", text: "1 2", mode: "jianpu", createdAt: Date.now() }), /Storage unavailable/u);
  }, true);
});
