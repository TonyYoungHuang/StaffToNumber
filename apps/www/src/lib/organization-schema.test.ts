import assert from "node:assert/strict";
import test from "node:test";
import { buildOrganizationSchema } from "./organization-schema.js";

const emptyOperator = {
  legalName: "",
  registrationIdentifier: "",
  addressCountry: "",
  addressRegion: "",
  addressLocality: "",
  postalCode: "",
  sameAs: [],
};

test("Organization schema keeps unknown legal-entity fields absent instead of inventing placeholders", () => {
  const schema = buildOrganizationSchema({
    siteName: "ScoreTransposer",
    siteUrl: "https://scoretransposer.com",
    supportEmail: "support@scoretransposer.com",
    operator: emptyOperator,
  }) as Record<string, unknown>;
  assert.equal(schema.name, "ScoreTransposer");
  assert.equal("legalName" in schema, false);
  assert.equal("identifier" in schema, false);
  assert.equal("address" in schema, false);
  assert.equal("sameAs" in schema, false);
});

test("Organization schema publishes only configured operator identity fields", () => {
  const schema = buildOrganizationSchema({
    siteName: "ScoreTransposer",
    siteUrl: "https://scoretransposer.com",
    supportEmail: "support@scoretransposer.com",
    operator: {
      legalName: "Example Music Software LLC",
      registrationIdentifier: "EXAMPLE-123",
      addressCountry: "US",
      addressRegion: "CA",
      addressLocality: "San Francisco",
      postalCode: "94105",
      sameAs: ["https://www.linkedin.com/company/example"],
    },
  }) as Record<string, unknown>;
  assert.equal(schema.legalName, "Example Music Software LLC");
  assert.deepEqual(schema.sameAs, ["https://www.linkedin.com/company/example"]);
  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    addressCountry: "US",
    addressRegion: "CA",
    addressLocality: "San Francisco",
    postalCode: "94105",
  });
});
