import { AuthShell } from "../../components/AuthShell";
import { PasswordResetRequestForm } from "../../components/PasswordResetRequestForm";
import { readAppLocale } from "../../lib/locale";

export default async function ForgotPasswordPage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "找回密码" : "Forgot password"}
      description={
        locale === "zh-CN"
          ? "输入账号邮箱，系统会准备密码重置邮件，让你重新进入当前工作台。"
          : "Enter your account email and the system will prepare a password reset message so you can regain access to the current studio."
      }
    >
      <PasswordResetRequestForm />
    </AuthShell>
  );
}
