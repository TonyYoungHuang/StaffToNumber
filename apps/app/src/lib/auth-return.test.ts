import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthReturnPath } from "./auth-return";

test("accepts supported authenticated app return paths", () => {
  assert.equal(resolveAuthReturnPath("/checkout"), "/checkout");
  assert.equal(resolveAuthReturnPath("/scores/project-1?tab=edit#measure-4"), "/scores/project-1?tab=edit#measure-4");
  assert.equal(resolveAuthReturnPath(["/billing", "/dashboard"]), "/billing");
});

test("rejects external, authentication-loop, and unrelated return paths", () => {
  assert.equal(resolveAuthReturnPath("https://evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("//evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("/\\evil.example/checkout"), null);
  assert.equal(resolveAuthReturnPath("/login"), null);
  assert.equal(resolveAuthReturnPath("/admin/security"), null);
});
