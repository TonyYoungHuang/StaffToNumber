import type { FastifyInstance } from "fastify";

// Reasons are authored here, never copied from uploaded data or exception text.
const reasons: Record<string, string> = {
  PDF_INVALID: "PDF metadata could not be parsed or has no valid pages.",
  PDF_PAGE_PIXEL_LIMIT: "A PDF page exceeds the recognition pixel budget.",
  PDF_TOTAL_PIXEL_LIMIT: "The PDF exceeds the total recognition pixel budget.",
  PDF_PAGE_COUNT_LIMIT: "The PDF exceeds the preflight page limit.",
  PDF_PAGE_DIMENSION_LIMIT: "The PDF page canvas exceeds the preflight size limit.",
  SCORE_PREFLIGHT_INVALID_SOURCE: "The local adapter could not inspect the source.",
  SCORE_PREFLIGHT_UNAVAILABLE: "The preflight adapter or its dependencies are unavailable.",
  SCORE_PREFLIGHT_FAILED: "The preflight adapter did not return a valid bounded result.",
  SCORE_PREFLIGHT_TIMEOUT: "The preflight time budget was exhausted.",
  SCORE_PREFLIGHT_BUSY: "The preflight concurrency limit was reached.",
  SCORE_PREFLIGHT_RATE_LIMIT: "The preflight request rate limit was reached.",
  SCORE_PASS_REQUIRED: "No usable pass is available for this score.",
  SCORE_PASS_CREDITS_EXHAUSTED: "The pass has insufficient processing credits.",
  SCORE_PASS_PAGE_LIMIT: "The source exceeds the pass page limit.",
  FREE_TRIAL_OMR_LIMIT_REACHED: "The lifetime free project is already in use.",
  COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED: "Complex recognition requires paid access.",
  PLAN_JOB_QUOTA_EXCEEDED: "The processing quota was exhausted.",
  PLAN_STORAGE_QUOTA_EXCEEDED: "The account storage quota was exhausted.",
  STORAGE_CAPACITY_REACHED: "The local storage reserve was reached.",
  OBJECT_STORAGE_UNAVAILABLE: "Object storage could not accept the source.",
  SCANNER_UNAVAILABLE: "The malware scanner is unavailable.",
  SCANNER_FAILED: "The malware scanner could not verify the source.",
  MALWARE_DETECTED: "The malware scanner rejected the source.",
  EMPTY_FILE: "No nonempty source was supplied.",
  FILE_TOO_LARGE: "The upload exceeds the file size limit.",
  UNSUPPORTED_FILE_TYPE: "The source format is unsupported.",
  UNSAFE_STORAGE_PATH: "The storage path validation failed.",
  UPLOAD_FAILED: "The source could not be verified.",
  INVALID_RECOGNITION_MODE: "The supplied recognition mode is invalid or conflicting.",
  INVALID_EXPECTED_CREDIT_COST: "The quoted credit cost is invalid.",
  OMR_PRICE_CHANGED: "The recognition quote requires reconfirmation.",
  FST_REQ_FILE_TOO_LARGE: "The multipart file size limit was reached.",
  FST_FILES_LIMIT: "The multipart file count limit was reached.",
  FST_ERR_CTP_INVALID_MEDIA_TYPE: "The request content type is unsupported.",
  ACCOUNT_INACTIVE: "The account is unavailable or inactive.",
  AUTH_REQUIRED: "Authentication is required.",
  SESSION_INVALID: "The session is missing or expired.",
};
const legacyErrors: Record<string, string> = {
  "An active account is required.": "ACCOUNT_INACTIVE",
  Unauthorized: "AUTH_REQUIRED",
  "Session not found": "SESSION_INVALID",
  "Session expired": "SESSION_INVALID",
  "No PDF or image file uploaded.": "EMPTY_FILE",
};

export function sanitizedOmrResponseError(payload: unknown) {
  let body: Record<string, unknown> = {};
  try {
    if (typeof payload === "string" && payload.length <= 32_768) body = JSON.parse(payload);
    else if (Buffer.isBuffer(payload) && payload.length <= 32_768) body = JSON.parse(payload.toString("utf8"));
  } catch { /* Only bounded JSON error responses supply known reason codes. */ }
  if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
  const known = (code: unknown): code is string => typeof code === "string" && Object.hasOwn(reasons, code);
  const legacy = typeof body.error === "string" && Object.hasOwn(legacyErrors, body.error) ? legacyErrors[body.error] : undefined;
  const code = known(body.code) ? body.code : legacy ?? "UNCLASSIFIED_ERROR";
  return { errorCode: code, errorReason: reasons[code] ?? "The endpoint returned an unclassified error." };
}

export function registerOmrErrorLogging(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply, payload) => {
    const route = request.routeOptions.url;
    if (request.method !== "POST" || reply.statusCode < 400 || reply.statusCode >= 600
      || !route || !/^(?:\/api)?\/scores\/import\/omr(?:\/preflight)?$/u.test(route)) return payload;
    const record = { event: "omr.http_error", requestId: request.id, traceId: request.traceId,
      route, statusCode: reply.statusCode, ...sanitizedOmrResponseError(payload) };
    if (reply.statusCode >= 500) request.log.error(record, "OMR endpoint rejected the request.");
    else request.log.warn(record, "OMR endpoint rejected the request.");
    return payload;
  });
}
