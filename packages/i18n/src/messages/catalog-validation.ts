import { enMessages } from "./en.ts";

export type PlaceholderMismatch = {
  key: string;
  expected: readonly string[];
  actual: readonly string[];
};

export type MessageCatalogIssues = {
  missingKeys: readonly string[];
  extraKeys: readonly string[];
  emptyKeys: readonly string[];
  placeholderMismatches: readonly PlaceholderMismatch[];
};

function placeholderNames(template: string): string[] {
  return [...template.matchAll(/\{([a-zA-Z][\w]*)\}/gu)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function areEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function getMessageCatalogIssues(
  catalog: Readonly<Record<string, string>>,
  reference: Readonly<Record<string, string>> = enMessages,
): MessageCatalogIssues {
  const referenceKeys = Object.keys(reference).sort();
  const catalogKeys = Object.keys(catalog).sort();
  const referenceKeySet = new Set(referenceKeys);
  const catalogKeySet = new Set(catalogKeys);
  const commonKeys = referenceKeys.filter((key) => catalogKeySet.has(key));

  return {
    missingKeys: referenceKeys.filter((key) => !catalogKeySet.has(key)),
    extraKeys: catalogKeys.filter((key) => !referenceKeySet.has(key)),
    emptyKeys: commonKeys.filter((key) => !catalog[key]?.trim()),
    placeholderMismatches: commonKeys.flatMap((key) => {
      const expected = placeholderNames(reference[key] ?? "");
      const actual = placeholderNames(catalog[key] ?? "");
      return areEqual(expected, actual) ? [] : [{ key, expected, actual }];
    }),
  };
}

export function isMessageCatalogComplete(issues: MessageCatalogIssues): boolean {
  return issues.missingKeys.length === 0
    && issues.extraKeys.length === 0
    && issues.emptyKeys.length === 0
    && issues.placeholderMismatches.length === 0;
}

export function assertMessageCatalogComplete(
  catalog: Readonly<Record<string, string>>,
  label = "message catalog",
  reference: Readonly<Record<string, string>> = enMessages,
): void {
  const issues = getMessageCatalogIssues(catalog, reference);
  if (isMessageCatalogComplete(issues)) return;

  const details = [
    issues.missingKeys.length ? `missing: ${issues.missingKeys.join(", ")}` : "",
    issues.extraKeys.length ? `extra: ${issues.extraKeys.join(", ")}` : "",
    issues.emptyKeys.length ? `empty: ${issues.emptyKeys.join(", ")}` : "",
    issues.placeholderMismatches.length
      ? `placeholder mismatch: ${issues.placeholderMismatches.map(({ key }) => key).join(", ")}`
      : "",
  ].filter(Boolean);

  throw new Error(`${label} is incomplete (${details.join("; ")}).`);
}
