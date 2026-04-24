import { AuthShell } from "../../components/AuthShell";
import { PasswordResetConfirmForm } from "../../components/PasswordResetConfirmForm";
import { readAppLocale } from "../../lib/locale";

export default async function ResetPasswordPage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "重置密码" : "Reset password"}
      description={
        locale === "zh-CN"
          ? "验证重置链接后，设置新的登录密码，并重新进入应用。"
          : "Verify the reset link, set a new password, and sign in again to continue using the app."
      }
    >
      <PasswordResetConfirmForm />
    </AuthShell>
  );
}
