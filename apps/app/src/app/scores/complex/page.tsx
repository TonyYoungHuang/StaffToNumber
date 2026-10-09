import type { Metadata } from "next";
import { ScoreRecognitionPage } from "../../../components/ScoreRecognitionPage";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ComplexScorePage() {
  return <ScoreRecognitionPage mode="complex" />;
}
