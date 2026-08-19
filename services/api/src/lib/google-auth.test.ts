import assert from "node:assert/strict";
import test from "node:test";
import { googleAccountFromClaims } from "./google-auth.js";

test("Google claims require a verified email and normalize the account", () => {
  assert.deepEqual(
    googleAccountFromClaims({
      sub: "google-user-1",
      email: "  Friend@Example.com ",
      email_verified: true,
      name: "  Example Friend ",
      picture: "https://example.com/avatar.png",
    }),
    {
      subject: "google-user-1",
      email: "friend@example.com",
      name: "Example Friend",
      picture: "https://example.com/avatar.png",
    },
  );

  assert.throws(
    () => googleAccountFromClaims({ sub: "google-user-2", email: "friend@example.com", email_verified: false }),
    /verified email/u,
  );
});
