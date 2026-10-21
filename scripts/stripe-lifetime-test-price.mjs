import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import Stripe from "stripe";

export const lifetimeLookupKey = "converter_pro_lifetime_usd_v1";
export function assertTestKey(key) {
  if (typeof key !== "string" || !/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key)) throw new Error("A Stripe TEST secret/restricted key from the local development env file is required. No API call made.");
}
export function validateLifetimePrice(price) {
  if (price.livemode !== false || price.type !== "one_time" || price.recurring || price.currency !== "usd"
    || price.unit_amount !== 9900 || !price.active || price.lookup_key !== lifetimeLookupKey) throw new Error("The existing TEST lifetime Price does not match $99 USD one-time. Refusing to modify it.");
  return price;
}
export async function ensureLifetimeTestPrice(key, client = new Stripe(key)) {
  // Guard each individual request, not just CLI startup. No live object is touched.
  const request = async (operation) => { assertTestKey(key); return operation(); };
  const prices = await request(() => client.prices.list({ lookup_keys: [lifetimeLookupKey], limit: 100 }));
  if (prices.data.length > 1) throw new Error("Ambiguous lifetime lookup key.");
  if (prices.data.length) return validateLifetimePrice(prices.data[0]);
  const product = await request(() => client.products.create({ name: "Converter Pro Lifetime", metadata: { product_code: "converter-pro-lifetime" } }, { idempotencyKey: `${lifetimeLookupKey}_product` }));
  if (product.livemode !== false) throw new Error("Unexpected live product. Aborting.");
  const price = await request(() => client.prices.create({ product: product.id, currency: "usd", unit_amount: 9900,
    lookup_key: lifetimeLookupKey, metadata: { product_code: "converter-pro-lifetime", purchase_model: "lifetime", billing_kind: "one_time" } }, { idempotencyKey: `${lifetimeLookupKey}_price` }));
  return validateLifetimePrice(price);
}

async function main() {
  const envArg = process.argv.find(arg => arg.startsWith("--env-file="));
  const envFile = path.resolve(envArg?.slice("--env-file=".length) || "services/api/.env");
  if (!fs.existsSync(envFile)) throw new Error(`Missing local development env file: ${envFile}. Supply --env-file=<existing local dev env>.`);
  const env = parseEnv(fs.readFileSync(envFile, "utf8"));
  const key = env.STRIPE_SECRET_KEY?.trim();
  assertTestKey(key);
  const price = await ensureLifetimeTestPrice(key);
  const output = process.argv.find(arg => arg.startsWith("--output="))?.slice("--output=".length);
  if (output) {
    const target = path.resolve(output);
    if (!/^E:[\\/]/i.test(target)) throw new Error("Output must be on E:.");
    fs.writeFileSync(target, `STRIPE_PRICE_CONVERTER_PRO_LIFETIME=${price.id}\n`, "utf8");
  }
  console.log(JSON.stringify({ status: "test_price_ready", price: `${price.id.slice(0, 10)}…${price.id.slice(-4)}`, lookupKey: price.lookup_key, amount: 9900, currency: "usd", outputWritten: Boolean(output) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(String(error.message).replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/g, "[REDACTED]")); process.exitCode = 1; });
}
