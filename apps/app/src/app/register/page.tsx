import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { readAppLocale } from "../../lib/locale";

export default async function RegisterPage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "创建账户" : "Create your account"}
      description={
        locale === "zh-CN"
          ? "先用邮箱和密码创建账户，再兑换你的专属激活码，解锁一年的使用权限。"
          : "Create an account with your email and password first, then redeem your dedicated activation code to unlock one year of access."
      }
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
