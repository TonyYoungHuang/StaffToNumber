import { DashboardBannerActions } from "../../components/DashboardBannerActions";
import { DashboardClient } from "../../components/DashboardClient";
import { readAppLocale } from "../../lib/locale";
import { getWorkspaceMessages } from "../../lib/workspace-messages";
import { APP_ROUTES } from "@score/shared";

export default async function DashboardPage() {
  const locale = await readAppLocale();
  const messages = getWorkspaceMessages(locale);
  const copy = messages.pages.dashboard;

  return (
    <section className="container page-shell">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="body-copy large">{copy.body}</p>
        </div>
        <div className="stack-md">
          <DashboardBannerActions copy={messages.banner} setupHref={APP_ROUTES.activate} />
          <p className="micro-copy">{copy.note}</p>
        </div>
      </div>
      <DashboardClient
        copy={messages.dashboard}
        operationsCopy={messages.operations}
      />
    </section>
  );
}
