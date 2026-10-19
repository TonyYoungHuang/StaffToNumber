import type { SupportedLocale } from "@score/i18n";
import { guestSampleCopy } from "../lib/guest-sample-copy";
import { homeCommercialCopy } from "../lib/home-commercial-copy";
import { GuestSampleWorkbench } from "./GuestSampleWorkbench";

export function GuestSampleDemo({ locale }: { locale: SupportedLocale }) {
  return <GuestSampleWorkbench copy={guestSampleCopy[locale]} scanLabel={homeCommercialCopy[locale].scanAction} />;
}
