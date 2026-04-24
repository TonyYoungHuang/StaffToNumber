import type { Metadata } from "next";
import { PaddlePaymentLinkPage } from "../../../components/PaddlePaymentLinkPage";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaddleCheckoutPage() {
  return (
    <section className="public-container public-page stack-xl">
      <PaddlePaymentLinkPage
        clientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""}
        environment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox"}
      />
    </section>
  );
}
