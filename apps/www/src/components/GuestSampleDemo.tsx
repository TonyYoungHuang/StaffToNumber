import type { SupportedLocale } from "@score/i18n";
import { guestSampleCopy } from "../lib/guest-sample-copy";
import { GUEST_SAMPLE_KEYS, guestSampleTaskSource, type GuestSampleKey, type GuestSampleNotation } from "../lib/guest-sample";
import { getAppTaskUrl } from "../lib/site";
import { GuestSampleWorkbench } from "./GuestSampleWorkbench";

export function GuestSampleDemo({ locale }: { locale: SupportedLocale }) {
  const workspaceHrefs = Object.fromEntries(GUEST_SAMPLE_KEYS.map((key) => [key, Object.fromEntries(
    (["staff", "jianpu"] as const).map((notation) => [notation, getAppTaskUrl(
      guestSampleTaskSource(key, notation), locale,
      key === "C" ? {} : { targetTonic: key, targetMode: "major" },
    )]),
  )])) as Record<GuestSampleKey, Record<GuestSampleNotation, string>>;
  return <GuestSampleWorkbench copy={guestSampleCopy[locale]} workspaceHrefs={workspaceHrefs} />;
}
