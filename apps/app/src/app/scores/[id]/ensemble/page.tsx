import type { Metadata } from "next";
import { EntitlementGate } from "../../../../components/EntitlementGate";
import { ScoreAccessWorkspace } from "../../../../components/ScoreAccessWorkspace";
import { getAuthMessages } from "../../../../lib/auth-messages";
import { readAppLocale } from "../../../../lib/locale";
import { getScoreCorrectionMessages } from "../../../../lib/score-correction-messages";
import { getScoreDetailMessages } from "../../../../lib/score-detail-messages";
import { getScoreEntryMessages } from "../../../../lib/score-entry-messages";
import { ScoreEditorMessagesProvider } from "../../../../lib/score-editor-messages/client";
import { getScoreEditorMessages } from "../../../../lib/score-editor-messages";
import { PlaybackPracticeMessagesProvider } from "../../../../lib/playback-practice-messages/client";
import { getPlaybackPracticeMessages } from "../../../../lib/playback-practice-messages";
import { ScoreSharingMessagesProvider } from "../../../../lib/score-sharing-messages/client";
import { getScoreSharingMessages } from "../../../../lib/score-sharing-messages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EnsembleScorePage() {
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  return <section className="container page-shell">
    <EntitlementGate allowFreePreview copy={getAuthMessages(locale).entitlement}>
      <ScoreEditorMessagesProvider locale={locale} messages={getScoreEditorMessages(locale)}>
        <PlaybackPracticeMessagesProvider locale={locale} messages={getPlaybackPracticeMessages(locale)}>
          <ScoreSharingMessagesProvider locale={locale} messages={getScoreSharingMessages(locale)}>
            <ScoreAccessWorkspace ensemble accessCopy={messages.access} reviewMessages={{ candidate: messages.candidate, omr: messages.omr, correction: getScoreCorrectionMessages(locale), detail: getScoreDetailMessages(locale) }} />
          </ScoreSharingMessagesProvider>
        </PlaybackPracticeMessagesProvider>
      </ScoreEditorMessagesProvider>
    </EntitlementGate>
  </section>;
}
