import Link from "next/link";
import { Panel, SectionIntro } from "@score/ui";
import { readSiteLocale } from "../lib/locale";
import { localizePublicHref } from "../lib/locale-routing";
import { getPublicNotFoundCopy } from "../lib/public-route-localization";
import { getCheckoutUrl, getSupportUrl } from "../lib/site";

export default async function NotFound() {
  const locale = await readSiteLocale();
  const copy = getPublicNotFoundCopy(locale);
  const checkoutUrl = getCheckoutUrl(locale);

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          body={copy.body}
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <Link href={localizePublicHref("/", locale)} className="public-button primary">
            {copy.home}
          </Link>
          <Link href={localizePublicHref("/faq", locale)} className="public-button secondary">
            {copy.faq}
          </Link>
          <Link href={localizePublicHref(getSupportUrl("general", "not-found"), locale)} className="public-button tertiary">
            {copy.support}
          </Link>
          <Link href={checkoutUrl} className="public-button tertiary">
            {copy.access}
          </Link>
        </div>
      </Panel>
    </section>
  );
}
