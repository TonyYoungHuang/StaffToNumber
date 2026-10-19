import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditPlanCard, type CreditPlanCardData } from "./credit-plan-card";

const plan: CreditPlanCardData = {
  code: "starter-monthly", badge: "Starter", name: "Starter", cycle: "Monthly",
  price: "$7.99", unitPrice: "$0.16 per credit", credits: "50 credits / month",
  audience: "Detailed personal score editing description", cta: "Choose Starter", featured: false,
  benefits: ["Full A", "Full B", "Full C", "Full D", "Full E"],
  resources: ["50 per month, UTC reset", "250 MB", "Library and revisions", "Monthly renewal"],
};

test("server rendering includes both copies for CSS selection with a single action", () => {
  const markup = renderToStaticMarkup(<CreditPlanCard plan={{ ...plan,
    benefitsShort: ["Scan", "Edit", "Export"], resourcesShort: ["250 MB", "UTC reset, no rollover"],
    audienceShort: "Personal use",
  }} actionHref="/checkout" />);
  for (const kind of ["features", "resource-list", "audience"]) {
    assert.ok(markup.includes(`score-plan-card__${kind}--full`));
    assert.ok(markup.includes(`score-plan-card__${kind}--short`));
  }
  assert.equal((markup.match(/<li>/gu) ?? []).length, 14);
  assert.equal((markup.match(/<a /gu) ?? []).length, 1);
  assert.ok(markup.includes("Full E"));
  assert.ok(markup.includes("UTC reset, no rollover"));
});

test("callers without compact fields retain one always-visible detailed copy", () => {
  const markup = renderToStaticMarkup(<CreditPlanCard plan={plan} />);
  assert.doesNotMatch(markup, /--full|--short/u);
  assert.equal((markup.match(/<li>/gu) ?? []).length, 9);
});

test("compact benefits alone do not hide resources or audience on mobile", () => {
  const markup = renderToStaticMarkup(<CreditPlanCard plan={{ ...plan, benefitsShort: ["Scan"] }} />);
  assert.ok(markup.includes("score-plan-card__features--full"));
  assert.doesNotMatch(markup, /score-plan-card__(?:resource-list|audience)--full/u);
});
