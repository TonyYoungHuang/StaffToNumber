import type { APIRequestContext } from "@playwright/test";

const apiUrl = "http://127.0.0.1:43102";
const adminApiKey = "e2e-admin-key-with-at-least-32-characters";

type GeneratedActivationCodes = {
  codes: Array<{ code: string }>;
};

export async function grantActiveEntitlement(
  request: APIRequestContext,
  token: string,
  prefix = "E2E",
) {
  const generated = await request.post(`${apiUrl}/api/admin/activation-codes/generate`, {
    headers: { "x-admin-api-key": adminApiKey },
    data: {
      quantity: 1,
      entitlementDays: 1,
      prefix,
      note: "Playwright release-gate entitlement",
    },
  });
  if (generated.status() !== 201) {
    throw new Error(`Could not generate an E2E activation code: ${generated.status()} ${await generated.text()}`);
  }

  const payload = (await generated.json()) as GeneratedActivationCodes;
  const code = payload.codes[0]?.code;
  if (!code) throw new Error("The E2E activation-code response did not contain a code.");

  const redeemed = await request.post(`${apiUrl}/api/activation/redeem`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { code },
  });
  if (redeemed.status() !== 200) {
    throw new Error(`Could not redeem the E2E activation code: ${redeemed.status()} ${await redeemed.text()}`);
  }
}
