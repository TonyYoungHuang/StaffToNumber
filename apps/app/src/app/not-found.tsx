import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { Panel, SectionIntro } from "@score/ui";
import { readAppLocale } from "../lib/locale";

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
              ? "你可以回到账户、上传、任务或支付页继续当前流程。"
              : "You can return to account, uploads, jobs, or checkout to continue the current workflow."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <Link href={APP_ROUTES.dashboard} className="button button-primary">
            {isChinese ? "账户" : "Account"}
          </Link>
          <Link href={APP_ROUTES.upload} className="button button-secondary">
            {isChinese ? "上传" : "Uploads"}
          </Link>
          <Link href={APP_ROUTES.jobs} className="button button-secondary">
            {isChinese ? "任务" : "Jobs"}
          </Link>
          <Link href={APP_ROUTES.checkout} className="button button-tertiary">
            {isChinese ? "支付" : "Checkout"}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
