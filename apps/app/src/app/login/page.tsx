import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { resolveAuthReturnPath } from "../../lib/auth-return";
import { readAppLocale } from "../../lib/locale";

export const metadata: Metadata = { alternates: { canonical: "/login" } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await readAppLocale();
  const params = await searchParams;
  const redirectTo = resolveAuthReturnPath(params.next);
  const continuesToCheckout = redirectTo === "/checkout";
  const messages = getAuthMessages(locale);
  const copy = messages.routes.login;

  return (
    <AuthShell
      title={continuesToCheckout ? copy.checkoutTitle : copy.title}
      description={continuesToCheckout ? copy.checkoutDescription : copy.description}
      copy={messages.shell}
    >
      <AuthForm mode="login" redirectTo={redirectTo ?? undefined} messages={messages.form} />
    </AuthShell>
  );
}
