import { SharedScoreViewer } from "../../../../components/SharedScoreViewer";
import { readAppLocale } from "../../../../lib/locale";
import { ScoreSharingMessagesProvider } from "../../../../lib/score-sharing-messages/client";
import { getScoreSharingMessages } from "../../../../lib/score-sharing-messages";
import { ScoreEditorMessagesProvider } from "../../../../lib/score-editor-messages/client";
import { getScoreEditorMessages } from "../../../../lib/score-editor-messages";
import { PlaybackPracticeMessagesProvider } from "../../../../lib/playback-practice-messages/client";
import { getPlaybackPracticeMessages } from "../../../../lib/playback-practice-messages";

export default async function SharedScorePage() {
  const locale = await readAppLocale();
  return (
    <ScoreSharingMessagesProvider locale={locale} messages={getScoreSharingMessages(locale)}>
      <ScoreEditorMessagesProvider locale={locale} messages={getScoreEditorMessages(locale)}>
        <PlaybackPracticeMessagesProvider locale={locale} messages={getPlaybackPracticeMessages(locale)}>
          <SharedScoreViewer />
        </PlaybackPracticeMessagesProvider>
      </ScoreEditorMessagesProvider>
    </ScoreSharingMessagesProvider>
  );
}
