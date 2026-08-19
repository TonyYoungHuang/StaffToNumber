import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { readAppLocale } from "../../lib/locale";

export const metadata: Metadata = { alternates: { canonical: "/login" } };

export default async function LoginPage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "登录" : "Sign in"}
      description={
        locale === "zh-CN"
          ? "继续查看你保存的乐谱、修改记录和导出文件。"
          : "Continue to your saved scores, edit history, and exports."
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
