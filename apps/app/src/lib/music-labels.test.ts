import assert from "node:assert/strict";
import test from "node:test";
import { pitchClassLabel, semitoneCount } from "./music-labels";

test("German pitch labels distinguish international B and Bb without changing other notes", () => {
  assert.equal(pitchClassLabel("B", "de"), "H (B)");
  assert.equal(pitchClassLabel("Bb", "de"), "B (B♭)");
  assert.equal(pitchClassLabel("Bb major", "de"), "B (B♭) major");
  assert.equal(pitchClassLabel("F#", "de"), "F#");
  assert.equal(pitchClassLabel("B", "ru"), "B");
});

test("semitone counts use absolute-value plural rules and preserve direction", () => {
  for (const [value, word] of [[1,"полутон"],[2,"полутона"],[5,"полутонов"],[11,"полутонов"],[14,"полутонов"],[21,"полутон"],[-2,"полутона"],[-11,"полутонов"]] as const) {
    assert.equal(semitoneCount(value, "ru"), `${value} ${word}`);
  }
  assert.equal(semitoneCount(1, "de"), "1 Halbton");
  assert.equal(semitoneCount(2, "de", true), "+2 Halbtöne");
  assert.equal(semitoneCount(-1, "en", true), "-1 semitone");
  assert.equal(semitoneCount(1, "es", true), "+1 semitono");
  assert.equal(semitoneCount(0, "es"), "0 semitonos");
  assert.equal(semitoneCount(-2, "en"), "-2 semitones");
});
