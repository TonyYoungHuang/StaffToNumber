export type RecognitionMode = "simple" | "complex";
export type RecognitionOption = {
  mode: RecognitionMode;
  creditCost: number;
  canSubmit: boolean;
  reason: string | null;
  creditSource: "plan" | "free_trial" | "score_pass" | null;
};
export type RecognitionOptions = {
  defaultMode: RecognitionMode;
  quota: { jobs: { used: number; limit: number; remaining: number } };
  freeTrial: { available: boolean; omrJobsRemaining: number };
  scorePasses: Array<{ id: string; documentId: string | null; credits: number; remaining: number; maxPages: number }>;
  options: RecognitionOption[];
};

export function recognitionOption(options: RecognitionOptions | null, mode: RecognitionMode) {
  return options?.options.find(option => option.mode === mode) ?? null;
}
