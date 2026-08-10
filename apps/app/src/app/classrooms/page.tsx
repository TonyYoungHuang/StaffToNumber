import { ClassroomsManager } from "../../components/ClassroomsManager";
import { EducationOperationsPanel } from "../../components/EducationOperationsPanel";
import { EducationOrganizationManager } from "../../components/EducationOrganizationManager";

export default function ClassroomsPage() {
  return <div className="page-stack"><EducationOrganizationManager /><ClassroomsManager /><EducationOperationsPanel /></div>;
}
