import { JobsManager } from "../../components/JobsManager";

export default function JobsPage() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", color: "#516174" }}>Module 4</p>
      <h1 style={{ fontSize: "44px", margin: "12px 0 24px" }}>Conversion jobs</h1>
      <JobsManager />
    </main>
  );
}
