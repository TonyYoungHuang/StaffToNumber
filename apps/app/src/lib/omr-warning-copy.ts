import type { ScoreEntryMessages } from "./score-entry-messages/types";

export type OmrWarningReason = keyof ScoreEntryMessages["omr"]["reasons"];

export function omrWarningReason(issue: string): OmrWarningReason {
  if (issue === "Low Audiveris symbol confidence" || issue === "Audiveris symbol should be reviewed") return "uncertainSymbol";
  if (/^Voice .+ totals .+\/.+ duration units\.$/u.test(issue)) return "rhythm";
  if (issue === "Event duration is zero or invalid.") return "duration";
  if (issue === "Printed duration type is missing.") return "durationType";
  if (issue === "Time signature could not be validated.") return "timeSignature";
  return "unknown";
}

export function plainOmrWarnings(issues: readonly string[], copy: ScoreEntryMessages["omr"]["reasons"]): string[] {
  return [...new Set(issues.map(issue => copy[omrWarningReason(issue)]))];
}
