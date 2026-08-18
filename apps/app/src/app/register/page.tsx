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
          ? "用邮箱和密码创建账户，即可免费识别一页五线谱 PDF 或一张图片；无需先付款或兑换激活码。"
          : "Create an account to scan one staff-score PDF page or one image for free. No payment or activation code is required to start."
      }
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
