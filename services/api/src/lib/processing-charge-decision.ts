export type ProcessingChargeDecision = {
  source: "monthly" | "prepaid" | "score_pass" | "free_trial";
  available: number;
  paidAccess: boolean;
  canSubmit: boolean;
};

/** The one source-selection rule used by quotes, creation and retries.
 * A reservation still validates the chosen pool while the account is locked. */
export function processingChargeDecision(input: {
  paid: boolean;
  monthlyRemaining: number;
  prepaidRemaining: number;
  passRemaining: number | null;
  creditCost: number;
  allowFreeTrial?: boolean;
}): ProcessingChargeDecision {
  const paidAccess = input.paid || input.passRemaining !== null;
  const source = input.paid && input.monthlyRemaining >= input.creditCost ? "monthly"
    : input.paid && input.prepaidRemaining >= input.creditCost ? "prepaid"
    : input.passRemaining !== null ? "score_pass"
    : !input.paid && input.allowFreeTrial ? "free_trial"
    : input.paid && input.monthlyRemaining < input.creditCost ? "prepaid" : "monthly";
  const available = source === "monthly" ? input.monthlyRemaining : source === "prepaid" ? input.prepaidRemaining
    : source === "score_pass" ? input.passRemaining! : input.creditCost;
  return { source, available, paidAccess, canSubmit: (paidAccess || source === "free_trial") && available >= input.creditCost };
}
