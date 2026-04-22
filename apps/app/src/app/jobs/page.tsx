import { JobsManager } from "../../components/JobsManager";

export default function JobsPage() {
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">Module 4 + Module 5</p>
        <h1 className="page-title">Conversion jobs and output review.</h1>
        <p className="body-copy large">
          Queue Staff PDF {"->"} Jianpu jobs, watch status updates, inspect preview text, and download the final PDF or draft bundle.
        </p>
      </div>
      <JobsManager />
    </section>
  );
}
