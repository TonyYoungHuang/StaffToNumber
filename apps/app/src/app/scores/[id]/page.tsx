import { EntitlementGate } from "../../../components/EntitlementGate";
import { ScoreAccessWorkspace } from "../../../components/ScoreAccessWorkspace";

export default function ScoreDetailPage() {
  return (
    <section className="container page-shell">
      <EntitlementGate allowFreePreview>
        <ScoreAccessWorkspace />
      </EntitlementGate>
    </section>
  );
}
