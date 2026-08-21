import { ClassroomsManager } from "../../components/ClassroomsManager";
import { EducationOperationsPanel } from "../../components/EducationOperationsPanel";
import { EducationOrganizationManager } from "../../components/EducationOrganizationManager";
import { EntitlementGate } from "../../components/EntitlementGate";
import { readAppLocale } from "../../lib/locale";

export default async function ClassroomsPage() {
  const locale = await readAppLocale();
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "教学工作台" : "Teaching workspace"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "课堂与机构管理" : "Classrooms and organizations"}</h1>
        <p className="body-copy large">{locale === "zh-CN" ? "集中管理课堂、学生名册、资源、通知和教学协作。" : "Manage classrooms, rosters, resources, notifications, and teaching collaboration."}</p>
      </div>
      <EntitlementGate deniedMode="panel">
        <div className="page-stack"><EducationOrganizationManager /><ClassroomsManager /><EducationOperationsPanel /></div>
      </EntitlementGate>
    </section>
  );
}
