import { EntitlementGate } from "../../../components/EntitlementGate";
import { ScoreAccessWorkspace } from "../../../components/ScoreAccessWorkspace";
import { getAuthMessages } from "../../../lib/auth-messages";
import { readAppLocale } from "../../../lib/locale";
import { getScoreCorrectionMessages } from "../../../lib/score-correction-messages";
import { getScoreDetailMessages } from "../../../lib/score-detail-messages";
import { getScoreEntryMessages } from "../../../lib/score-entry-messages";
import { ScoreEditorMessagesProvider } from "../../../lib/score-editor-messages/client";
import { getScoreEditorMessages } from "../../../lib/score-editor-messages";
import { PlaybackPracticeMessagesProvider } from "../../../lib/playback-practice-messages/client";
import { getPlaybackPracticeMessages } from "../../../lib/playback-practice-messages";
import { ScoreSharingMessagesProvider } from "../../../lib/score-sharing-messages/client";
import { getScoreSharingMessages } from "../../../lib/score-sharing-messages";

export default async function ScoreDetailPage() {
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  const correctionMessages = getScoreCorrectionMessages(locale);
  const detailMessages = getScoreDetailMessages(locale);
  const entitlementCopy = getAuthMessages(locale).entitlement;

  return (
    <section className="container page-shell">
      <EntitlementGate allowFreePreview copy={entitlementCopy}>
        <ScoreEditorMessagesProvider locale={locale} messages={getScoreEditorMessages(locale)}>
          <PlaybackPracticeMessagesProvider locale={locale} messages={getPlaybackPracticeMessages(locale)}>
            <ScoreSharingMessagesProvider locale={locale} messages={getScoreSharingMessages(locale)}>
              <ScoreAccessWorkspace
                accessCopy={messages.access}
                reviewMessages={{ candidate: messages.candidate, omr: messages.omr, correction: correctionMessages, detail: detailMessages }}
              />
            </ScoreSharingMessagesProvider>
          </PlaybackPracticeMessagesProvider>
        </ScoreEditorMessagesProvider>
      </EntitlementGate>
    </section>
  );
}
