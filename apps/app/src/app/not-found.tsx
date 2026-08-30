import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { Panel, SectionIntro } from "@score/ui";
import { getAuthMessages } from "../lib/auth-messages";
import { readAppLocale } from "../lib/locale";
import { accountActivationRoute } from "../lib/release";

export default async function NotFound() {
  const locale = await readAppLocale();
  const copy = getAuthMessages(locale).notFound;

  return (
    <div className="container section-shell">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          body={copy.body}
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
            {copy.edit}
          </Link>
          <Link href={APP_ROUTES.home} className="button button-secondary">
            {copy.home}
          </Link>
          <Link href={accountActivationRoute} className="button button-tertiary">
            {copy.upgrade}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
