import { AuthShell } from "../../components/AuthShell";
import { ActivationForm } from "../../components/ActivationForm";
import { readAppLocale } from "../../lib/locale";

export default async function ActivatePage() {
  const locale = await readAppLocale();

  return (
    <AuthShell
      title={locale === "zh-CN" ? "兑换激活码" : "Redeem activation code"}
      description={
        locale === "zh-CN"
          ? "输入购买后获得的激活码，即可开通当前工作台的一年使用权限。"
          : "Enter the code from your purchase to activate the current studio workflow for one year of use."
      }
    >
      <ActivationForm />
    </AuthShell>
  );
}
