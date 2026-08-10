import { generateKeyPairSync, randomUUID } from "node:crypto";

const keyId = `score-lti-${randomUUID()}`;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
const privatePem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const publicJwk = publicKey.export({ format: "jwk" });

process.stdout.write(`${JSON.stringify({
  LTI_KEY_ID: keyId,
  LTI_PRIVATE_KEY_BASE64: Buffer.from(privatePem, "utf8").toString("base64"),
  jwks: { keys: [{ ...publicJwk, kid: keyId, use: "sig", alg: "RS256" }] },
}, null, 2)}\n`);
