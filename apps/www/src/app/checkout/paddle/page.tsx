import type { Metadata } from "next";
import { PaddlePaymentLinkPage } from "../../../components/PaddlePaymentLinkPage";
import { getCheckoutMessages } from "../../../lib/checkout-localization";
import { readSiteLocale } from "../../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getCheckoutMessages(await readSiteLocale()).paddlePage;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function PaddleCheckoutPage() {
  const messages = getCheckoutMessages(await readSiteLocale());
  return (
    <section className="public-container public-page stack-xl">
      <PaddlePaymentLinkPage
        clientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""}
        environment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox"}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://scoretransposer.com"}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scoretransposer.com"}
        copy={messages.paddle}
        translationNotice={messages.translationNotice}
      />
    </section>
  );
}
