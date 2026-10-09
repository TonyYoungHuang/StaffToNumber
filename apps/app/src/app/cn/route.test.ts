import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { GET as admin } from "./admin/route";
import { GET as locale } from "../api/locale/route";
import { shopDeliveryText } from "../../lib/shop-activation";

test("Chinese customer and seller links override existing language and preserve their destination", async () => {
  for (const [handler, path] of [[GET, "/activate?shop=1"], [admin, "/admin/codes"]] as const) {
    const request = new NextRequest("https://app.scoretransposer.com/cn?next=https://evil.invalid", { headers: { cookie: "score_locale=en" } });
    const first = handler(request);
    const next = new URL(first.headers.get("location")!);
    assert.equal(next.searchParams.get("locale"), "zh-CN");
    assert.equal(next.searchParams.get("next"), path);
    const second = await locale(new NextRequest(next));
    assert.match(second.headers.get("set-cookie")!, /score_locale=zh-CN/);
    assert.equal(new URL(second.headers.get("location")!).pathname, path.split("?")[0]);
  }
});
test("delivery text has a clean customer link, purchased plan and no code in its URL", () => {
  const text = shopDeliveryText({ code: "QA-EXAMPLE", planCode: "converter-pro-monthly", entitlementDays: 30, expiresAt: null }, "https://app.scoretransposer.com");
  assert.match(text, /Converter Pro · 1 个月/); assert.match(text, /https:\/\/app.scoretransposer.com\/cn\n/);
  assert.match(text, /不会自动续费或扣款/); assert.doesNotMatch(text, /admin|\?code=/);
});
