import assert from "node:assert/strict";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { omrWarningReason, plainOmrWarnings } from "./omr-warning-copy";
import { getScoreEntryMessages } from "./score-entry-messages";

test("actual engine and structural messages receive specific plain-language reasons", () => {
  const cases = [
    ["Low Audiveris symbol confidence", "uncertainSymbol"],
    ["Audiveris symbol should be reviewed", "uncertainSymbol"],
    ["Voice 2 totals 3.5/4 duration units.", "rhythm"],
    ["Event duration is zero or invalid.", "duration"],
    ["Printed duration type is missing.", "durationType"],
    ["Time signature could not be validated.", "timeSignature"],
    ["Future engine warning", "unknown"],
  ];
  for (const [issue, expected] of cases) assert.equal(omrWarningReason(issue), expected, issue);
});

test("all nine languages translate known and unknown warnings and deduplicate repeated reasons", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getScoreEntryMessages(locale).omr.reasons;
    const raw = ["Low Audiveris symbol confidence", "Audiveris symbol should be reviewed", "Voice 1 totals 3/4 duration units.", "unrecognised internal warning"];
    const result = plainOmrWarnings(raw, copy);
    assert.deepEqual(result, [copy.uncertainSymbol, copy.rhythm, copy.unknown]);
    assert.ok(result.every(message => !raw.includes(message)), locale);
    assert.deepEqual(plainOmrWarnings([], copy), []);
    if (locale !== "en") assert.notEqual(copy.unknown, getScoreEntryMessages("en").omr.reasons.unknown, locale);
  }
});
