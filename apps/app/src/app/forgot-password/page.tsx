import { AuthShell } from "../../components/AuthShell";
import { PasswordResetRequestForm } from "../../components/PasswordResetRequestForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { readAppLocale } from "../../lib/locale";

export default async function ForgotPasswordPage() {
  const locale = await readAppLocale();
  const messages = getAuthMessages(locale);
  const copy = messages.routes.forgotPassword;

  return (
    <AuthShell title={copy.title} description={copy.description} copy={messages.shell}>
      <PasswordResetRequestForm locale={locale} copy={messages.resetRequest} />
    </AuthShell>
  );
}
