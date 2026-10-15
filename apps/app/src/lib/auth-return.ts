import { APP_ROUTES } from "@score/shared";

const allowedReturnRoots = [
  APP_ROUTES.checkout,
  APP_ROUTES.billing,
  APP_ROUTES.dashboard,
  APP_ROUTES.scores,
  APP_ROUTES.activate,
] as const;

export function resolveAuthReturnPath(candidate: string | string[] | undefined) {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!value || value.length > 24576 || !value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\u007f\\]/u.test(value)) {
    return null;
  }

  try {
    const rawPath = value.split(/[?#]/u)[0];
    if (/%(?:2f|5c|00|0[ad]|25)/iu.test(rawPath)) return null;
    const baseUrl = new URL("https://app.scoretransposer.com");
    const url = new URL(value, baseUrl);
    const isAllowed = url.origin === baseUrl.origin
      && allowedReturnRoots.some((root) => url.pathname === root || url.pathname.startsWith(`${root}/`));
    if (!isAllowed) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
