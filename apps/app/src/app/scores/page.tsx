import { EntitlementGate } from "../../components/EntitlementGate";
import { ScoreLibraryManager } from "../../components/ScoreLibraryManager";
import { getAuthMessages } from "../../lib/auth-messages";
import { readAppLocale } from "../../lib/locale";
import { getScoreEntryMessages } from "../../lib/score-entry-messages";

export default async function ScoresPage() {
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  const entitlementCopy = getAuthMessages(locale).entitlement;
  const copy = messages.pages.library;

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>
      <EntitlementGate allowFreePreview copy={entitlementCopy}>
        <ScoreLibraryManager copy={messages.library} />
      </EntitlementGate>
    </section>
  );
}
