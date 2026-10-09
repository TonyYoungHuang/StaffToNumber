import type { Metadata } from "next";
import { ScoreRecognitionPage } from "../../../components/ScoreRecognitionPage";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SimpleScorePage() {
  return <ScoreRecognitionPage mode="simple" />;
}
