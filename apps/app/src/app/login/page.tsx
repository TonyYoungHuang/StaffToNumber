import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { readAppLocale } from "../../lib/locale";

export default async function LoginPage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "登录" : "Sign in"}
      description={
        locale === "zh-CN"
          ? "登录你的转换账户，以便管理激活状态、上传五线谱 PDF，并查看转换结果。"
          : "Sign in to your converter account so you can manage activation, upload staff PDFs, and review job output."
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
