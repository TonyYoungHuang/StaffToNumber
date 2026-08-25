import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicScores, listPublicScoreFacets, publicScoreLibrary } from "./public-score-library.js";

test("public library records have unique stable slugs and auditable rights sources", () => {
  assert.equal(new Set(publicScoreLibrary.map((score) => score.slug)).size, publicScoreLibrary.length);
  for (const score of publicScoreLibrary) {
    assert.match(score.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.ok(score.sourceUrl.startsWith("https://") || score.sourceUrl.startsWith("/library/"));
    assert.ok(score.assetLicense.length >= 40);
    if (score.assetStatus === "downloadable") {
      assert.equal(score.workRights, "CC0");
      assert.ok(score.localMusicXmlUrl?.endsWith(".musicxml"));
    } else {
      assert.equal(score.localMusicXmlUrl, undefined);
    }
  }
});

test("public library filters across language, instrument, ensemble, and era", () => {
  assert.ok(filterPublicScores({ query: "贝多芬" }).length >= 2);
  assert.ok(filterPublicScores({ instrument: "Piano" }).length >= 3);
  assert.equal(filterPublicScores({ ensemble: "SATB a cappella" }).length, 1);
  assert.ok(filterPublicScores({ era: "Baroque" }).every((score) => score.era === "Baroque"));
  const facets = listPublicScoreFacets();
  assert.ok(facets.instruments.includes("Choir"));
  assert.ok(facets.eras.includes("Renaissance"));
});
