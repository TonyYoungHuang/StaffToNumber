import { AuthShell } from "../../components/AuthShell";
import { PasswordResetConfirmForm } from "../../components/PasswordResetConfirmForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { readAppLocale } from "../../lib/locale";

export default async function ResetPasswordPage() {
  const locale = await readAppLocale();
  const messages = getAuthMessages(locale);
  const copy = messages.routes.resetPassword;

  return (
    <AuthShell title={copy.title} description={copy.description} copy={messages.shell}>
      <PasswordResetConfirmForm copy={messages.resetConfirm} />
    </AuthShell>
  );
}
