import Link from "next/link";
import { Panel, SectionIntro } from "@score/ui";
import { readSiteLocale } from "../lib/locale";
import { getSupportUrl } from "../lib/site";

export default async function NotFound() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "页面未找到" : "Page not found"}
          title={
            isChinese
              ? "这个公开页面不存在，先回到可用的站点入口"
              : "This public page does not exist. Use one of the live entry points instead."
          }
          body={
            isChinese
              ? "如果你是从搜索结果或旧链接进入的，最稳妥的下一步是回到首页、FAQ、Support 或 Checkout。"
              : "If you landed here from search or an older link, the safest next step is to return to the homepage, FAQ, support, or checkout."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <Link href="/" className="public-button primary">
            {isChinese ? "返回首页" : "Back to homepage"}
          </Link>
          <Link href="/faq" className="public-button secondary">
            {isChinese ? "常见问题" : "FAQ"}
          </Link>
          <Link href={getSupportUrl("general", "not-found")} className="public-button tertiary">
            {isChinese ? "支持页" : "Support"}
          </Link>
          <Link href="/checkout" className="public-button tertiary">
            {isChinese ? "开通路径" : "Checkout"}
          </Link>
        </div>
      </Panel>
    </section>
  );
}
