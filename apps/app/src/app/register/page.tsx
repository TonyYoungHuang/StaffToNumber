import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { resolveAuthReturnPath } from "../../lib/auth-return";
import { readAppLocale } from "../../lib/locale";

export const metadata: Metadata = { alternates: { canonical: "/register" } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await readAppLocale();
  const params = await searchParams;
  const redirectTo = resolveAuthReturnPath(params.next);
  const messages = getAuthMessages(locale);
  const copy = messages.routes.register;

  return (
    <AuthShell title={copy.title} description={copy.description} copy={messages.shell}>
      <AuthForm mode="register" redirectTo={redirectTo ?? undefined} messages={messages.form} />
    </AuthShell>
  );
}
