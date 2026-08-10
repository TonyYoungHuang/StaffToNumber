import { EntitlementGate } from "../../../components/EntitlementGate";
import { ScoreDetailClient } from "../../../components/ScoreDetailClient";

export default function ScoreDetailPage() {
  return (
    <section className="container page-shell">
      <EntitlementGate>
        <ScoreDetailClient />
      </EntitlementGate>
    </section>
  );
}
