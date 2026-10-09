import { formatNumber, formatPlural, type SupportedLocale } from "@score/i18n";

/** Labels only: MusicXML, MIDI and API pitch values retain international spelling. */
export function pitchClassLabel(value: string, locale: SupportedLocale) {
  if (locale !== "de") return value;
  return value.replace(/^Bb(?=$|\s)/u, "B (B♭)").replace(/^B(?=$|\s)(?! \()/u, "H (B)");
}

export function semitoneCount(value: number, locale: "en" | "es" | "de" | "ru", signed = false) {
  const unit = locale === "en" ? formatPlural(locale, Math.abs(value), { one: "semitone", other: "semitones" })
    : locale === "es" ? formatPlural(locale, Math.abs(value), { one: "semitono", other: "semitonos" })
    : locale === "de"
    ? formatPlural(locale, Math.abs(value), { one: "Halbton", other: "Halbtöne" })
    : formatPlural(locale, Math.abs(value), { one: "полутон", few: "полутона", many: "полутонов", other: "полутона" });
  return `${formatNumber(value, locale, signed ? { signDisplay: "exceptZero" } : {})} ${unit}`;
}
