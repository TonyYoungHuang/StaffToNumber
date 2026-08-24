import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { Panel, SectionIntro } from "@score/ui";
import { readAppLocale } from "../lib/locale";
import { accountActivationRoute } from "../lib/release";

export default async function NotFound() {
  const locale = await readAppLocale();
  const isChinese = locale === "zh-CN";

  return (
    <div className="container section-shell">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "页面未找到" : "Page not found"}
          title={
            isChinese
              ? "这个应用内页面不存在，请返回可用工作流"
              : "This app page does not exist. Return to a live studio route."
          }
          body={
            isChinese
              ? "你可以返回免费识谱入口、工作台首页或升级状态页继续。"
              : "Return to free editing, the studio homepage, or upgrade status to continue."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
            {isChinese ? "免费编辑" : "Edit for free"}
          </Link>
          <Link href={APP_ROUTES.home} className="button button-secondary">
            {isChinese ? "工作台首页" : "Studio home"}
          </Link>
          <Link href={accountActivationRoute} className="button button-tertiary">
            {isChinese ? "升级状态" : "Upgrade status"}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
