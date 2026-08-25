import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
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

  return (
    <AuthShell
      title={locale === "zh-CN" ? "创建账户" : "Create your account"}
      description={
        locale === "zh-CN"
          ? "使用 Google 或邮箱创建账户，即可从一份完整多页五线谱 PDF 或一张图片创建终身免费的乐谱项目。"
          : "Create an account with Google or email and build one lifetime free project from a complete staff-score PDF or image."
      }
    >
      <AuthForm mode="register" redirectTo={redirectTo ?? undefined} />
    </AuthShell>
  );
}
