import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";
import { resolveAuthReturnPath } from "../../lib/auth-return";
import { readAppLocale } from "../../lib/locale";

export const metadata: Metadata = { alternates: { canonical: "/login" } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await readAppLocale();
  const params = await searchParams;
  const redirectTo = resolveAuthReturnPath(params.next);
  const continuesToCheckout = redirectTo === "/checkout";

  return (
    <AuthShell
      title={
        continuesToCheckout
          ? locale === "zh-CN" ? "登录后继续付款" : "Sign in to continue to checkout"
          : locale === "zh-CN" ? "登录" : "Sign in"
      }
      description={
        continuesToCheckout
          ? locale === "zh-CN"
            ? "使用 Google 或邮箱登录。Google 用于确认账户与权益归属，付款仍由已配置的第三方支付渠道安全处理。"
            : "Sign in with Google or email. Google identifies the account receiving access; payment is still handled securely by the configured provider."
          : locale === "zh-CN"
            ? "继续查看你保存的乐谱、修改记录和导出文件。"
            : "Continue to your saved scores, edit history, and exports."
      }
    >
      <AuthForm mode="login" redirectTo={redirectTo ?? undefined} />
    </AuthShell>
  );
}
