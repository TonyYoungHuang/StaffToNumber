import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthReturnPath } from "./auth-return";

test("accepts supported authenticated app return paths", () => {
  assert.equal(resolveAuthReturnPath("/checkout"), "/checkout");
  assert.equal(resolveAuthReturnPath("/scores#free-scan"), "/scores#free-scan");
  assert.equal(resolveAuthReturnPath("/scores/project-1?tab=edit#measure-4"), "/scores/project-1?tab=edit#measure-4");
  assert.equal(resolveAuthReturnPath(["/billing", "/dashboard"]), "/billing");
  for (const route of ["/jobs?filter=processing#original", "/student?classroom=one#assignment", "/classrooms/one?tab=assignments#score"]) assert.equal(resolveAuthReturnPath(route), route);
});

test("rejects decoded controls and encoded open redirects without losing large valid B2 contexts", () => {
  for (const path of ["/%2f%2fevil.example", "/%5cevil.example", "/%252f%252fevil.example", "/scores?tab=%00", "/scores?tab=%09", "/scores?tab=%0a", "/scores?tab=%0d", "/scores?tab=%1f", "/scores?tab=%7f", "/scores?tab=%250a", "/scores?tab=%5c", "/scores\u0001"]) {
    assert.equal(resolveAuthReturnPath(path), null, path);
  }
  const query = new URLSearchParams({ plan: "single-score", billing: "one_time", passMode: "top_up", continue: "1", next: "/scores/one?tab=edit#export-center", returnState: JSON.stringify({ version: 1, intent: "restore_view", revisionId: "r".repeat(6000) }) });
  const large = `/checkout?${query}#checkout-action`;
  assert.ok(large.length > 2048 && large.length < 24576);
  assert.equal(resolveAuthReturnPath(large), large);
});

test("rejects external, authentication-loop, and unrelated return paths", () => {
  assert.equal(resolveAuthReturnPath("https://evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("//evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("/\\evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("/login"), null);
  assert.equal(resolveAuthReturnPath("/admin/security"), null);
});
