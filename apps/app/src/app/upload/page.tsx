import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { UploadManager } from "../../components/UploadManager";

export default function UploadPage() {
  return (
    <section className="container page-shell">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">Module 3</p>
          <h1 className="page-title">File upload and source storage.</h1>
          <p className="body-copy large">
            Upload staff PDFs into the studio, keep them reusable, and prepare clean inputs for the conversion job queue.
          </p>
        </div>
        <div className="stack-md">
          <div className="page-banner-actions">
            <Link href={APP_ROUTES.jobs} className="button button-primary">
              Go to jobs
            </Link>
            <Link href={APP_ROUTES.dashboard} className="button button-secondary">
              Open dashboard
            </Link>
          </div>
          <p className="micro-copy">Current live acceptance remains PDF only, matching the app scope you confirmed for v2.</p>
        </div>
      </div>
      <UploadManager />
    </section>
  );
}
