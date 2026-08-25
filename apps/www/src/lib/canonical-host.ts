export const canonicalPublicHostname = "scoretransposer.com";

const acceptedPublicHostnames = new Set([
  canonicalPublicHostname,
  `www.${canonicalPublicHostname}`,
]);

type CanonicalRequestOrigin = {
  hostname?: string | null;
  protocol?: string | null;
};

function normalizeHostname(value: string | null | undefined) {
  const firstValue = value?.split(",", 1)[0]?.trim();
  if (!firstValue) return null;

  try {
    return new URL(`http://${firstValue}`).hostname.toLowerCase().replace(/\.$/u, "");
  } catch {
    return null;
  }
}

function normalizeProtocol(value: string | null | undefined, fallback: string) {
  const protocol = value?.split(",", 1)[0]?.trim().toLowerCase().replace(/:$/u, "");
  return protocol === "http" || protocol === "https" ? `${protocol}:` : fallback;
}

/**
 * Returns the one public origin for production-domain requests.
 * Local and preview hosts intentionally pass through unchanged.
 */
export function getCanonicalPublicUrl(requestUrl: URL, requestOrigin: CanonicalRequestOrigin = {}) {
  const hostname = normalizeHostname(requestOrigin.hostname)
    ?? requestUrl.hostname.toLowerCase().replace(/\.$/u, "");
  const protocol = normalizeProtocol(requestOrigin.protocol, requestUrl.protocol);
  if (!acceptedPublicHostnames.has(hostname)) return null;
  if (hostname === canonicalPublicHostname && protocol === "https:") return null;

  const destination = new URL(requestUrl);
  destination.protocol = "https:";
  destination.hostname = canonicalPublicHostname;
  destination.port = "";
  return destination;
}
