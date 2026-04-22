import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { DashboardClient } from "../../components/DashboardClient";

export default function DashboardPage() {
  return (
    <section className="container page-shell">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">Account overview and entitlement state.</h1>
          <p className="body-copy large">
            Review sign-in status, current entitlement dates, and the next operational step in the Staff PDF {"->"} Jianpu workflow.
          </p>
        </div>
        <div className="stack-md">
          <div className="page-banner-actions">
            <Link href={APP_ROUTES.upload} className="button button-primary">
              Open uploads
            </Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">
              Open jobs
            </Link>
          </div>
          <p className="micro-copy">This dashboard keeps activation, uploads, and queue operations visually aligned with the Stitch studio language.</p>
        </div>
      </div>
      <DashboardClient />
    </section>
  );
}
