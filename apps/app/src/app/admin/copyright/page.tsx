import { AdminCopyrightManager } from "../../../components/AdminCopyrightManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminCopyrightPage() {
  const locale = await readAppLocale();
  return <section className="container page-shell"><header className="page-banner"><p className="eyebrow">{locale === "zh-CN" ? "版权运营" : "Copyright operations"}</p><h1 className="page-title">{locale === "zh-CN" ? "版权投诉处理台" : "Copyright complaint desk"}</h1></header><AdminCopyrightManager /></section>;
}
