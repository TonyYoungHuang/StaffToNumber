import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAudioUrlImportBody } from "../routes/scores.js";

test("audio URL import requires an explicit copyright basis and confirmation", () => {
  assert.throws(() => normalizeAudioUrlImportBody({ url: "https://www.youtube.com/watch?v=example" }), /own, licensed, or.*public-domain/i);
  assert.throws(
    () => normalizeAudioUrlImportBody({ url: "https://www.youtube.com/watch?v=example", rightsBasis: "licensed" }),
    /Confirm that you have the right/i,
  );
  const result = normalizeAudioUrlImportBody({
    url: "https://www.youtube.com/watch?v=example",
    title: "Licensed lesson source",
    rightsBasis: "licensed",
    rightsConfirmed: true,
    transcriptionProfile: "monophonic",
  });
  assert.equal(result.rightsBasis, "licensed");
  assert.equal(result.transcriptionProfile, "monophonic");
  assert.match(result.rightsConfirmedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("audio URL import blocks loopback and private network targets", () => {
  for (const url of ["http://localhost/audio.mp3", "http://127.0.0.1/audio.mp3", "http://10.0.0.4/audio.mp3", "http://[::1]/audio.mp3"]) {
    assert.throws(() => normalizeAudioUrlImportBody({ url, rightsBasis: "owned", rightsConfirmed: true }), /private network/i);
  }
});
