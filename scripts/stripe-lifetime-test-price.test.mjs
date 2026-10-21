import assert from "node:assert/strict";
import test from "node:test";
import { assertTestKey, ensureLifetimeTestPrice, lifetimeLookupKey } from "./stripe-lifetime-test-price.mjs";

test("test provisioning guards every request, reuses lookup keys and validates the full price", async () => {
  let writes = 0, reads = 0;
  let stored;
  const client = {
    products: { create: async (_params, options) => { writes++; assert.ok(options.idempotencyKey); return { id: "prod_test", livemode: false }; } },
    prices: {
      list: async () => { reads++; return { data: stored ? [stored] : [] }; },
      create: async (params, options) => { writes++; assert.ok(options.idempotencyKey); stored = { ...params, id: "price_test", type: "one_time", livemode: false, active: true }; return stored; },
    },
  };
  for (const key of ["sk_live_fixture", "rk_live_fixture", "", "pk_test_fixture"]) {
    assert.throws(() => assertTestKey(key));
    await assert.rejects(ensureLifetimeTestPrice(key, client));
  }
  assert.equal(reads, 0); assert.equal(writes, 0);
  assert.equal((await ensureLifetimeTestPrice("sk_test_fixture", client)).lookup_key, lifetimeLookupKey);
  await ensureLifetimeTestPrice("rk_test_fixture", client);
  assert.equal(writes, 2); assert.equal(reads, 2);
  stored.type = "recurring";
  await assert.rejects(ensureLifetimeTestPrice("sk_test_fixture", client));
  assert.equal(writes, 2);
});
