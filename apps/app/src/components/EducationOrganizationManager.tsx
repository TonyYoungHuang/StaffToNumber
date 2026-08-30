"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useEducationMessages } from "../lib/education-messages/client";
import { resolveEducationLabel } from "../lib/education-messages/format";

type Campus = { id: string; name: string; code: string | null; timezone: string };
type OrganizationMember = { id: string; invitedEmail: string; displayName: string; role: string; status: string };
type Organization = { id: string; name: string; slug: string; currentRole: string; campuses: Campus[]; members: OrganizationMember[] };
type ClassroomStaff = { id: string; invitedEmail: string; displayName: string; role: string; status: string };
type Classroom = {
  id: string;
  name: string;
  organizationId: string | null;
  campusId: string | null;
  access: { role: string; canOperate: boolean; canAdmin: boolean };
  staff: ClassroomStaff[];
};

export function EducationOrganizationManager() {
  const { messages } = useEducationMessages();
  const copy = messages.organization;
  const token = getStoredToken();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [campus, setCampus] = useState({ name: "", code: "", timezone: "Asia/Shanghai" });
  const [member, setMember] = useState({ displayName: "", email: "", role: "teacher" });
  const [staff, setStaff] = useState({ displayName: "", email: "", role: "teacher" });
  const [placement, setPlacement] = useState({ organizationId: "", campusId: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!token) return;
    const [organizationResult, classroomResult] = await Promise.all([
      apiRequest<{ organizations: Organization[] }>("/api/education/organizations", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<{ classrooms: Classroom[] }>("/api/score-classrooms", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!organizationResult.ok || !classroomResult.ok) {
      setStatus(!organizationResult.ok ? organizationResult.error : !classroomResult.ok ? classroomResult.error : "");
      setStatusKind("error");
      return;
    }
    setOrganizations(organizationResult.data.organizations);
    setClassrooms(classroomResult.data.classrooms);
    setOrganizationId((current) => organizationResult.data.organizations.some((item) => item.id === current) ? current : organizationResult.data.organizations[0]?.id ?? "");
    setClassroomId((current) => classroomResult.data.classrooms.some((item) => item.id === current) ? current : classroomResult.data.classrooms[0]?.id ?? "");
  }

  useEffect(() => {
    const changed = () => { void refresh(); };
    window.addEventListener("score-classrooms-changed", changed);
    void refresh();
    return () => window.removeEventListener("score-classrooms-changed", changed);
  }, []);

  async function submit(path: string, body: object, clear: () => void, event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    const result = await apiRequest<unknown>(`/api/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    clear();
    setStatus(copy.accessUpdated);
    setStatusKind("success");
    await refresh();
    window.dispatchEvent(new Event("score-classrooms-changed"));
  }

  async function savePlacement(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId) return;
    setBusy(true);
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/placement`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(placement),
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(copy.placementUpdated);
    setStatusKind("success");
    await refresh();
    window.dispatchEvent(new Event("score-classrooms-changed"));
  }

  async function remove(path: string) {
    if (!token) return;
    setBusy(true);
    const result = await apiRequest<unknown>(`/api/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(copy.memberRemoved);
    setStatusKind("success");
    await refresh();
  }

  const selectedOrganization = organizations.find((item) => item.id === organizationId);
  const selectedClassroom = classrooms.find((item) => item.id === classroomId);
  const canAdminOrganization = selectedOrganization?.currentRole === "owner" || selectedOrganization?.currentRole === "admin";
  const placementCampuses = organizations.find((item) => item.id === placement.organizationId)?.campuses ?? [];

  return (
    <section className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={(event) => void submit("education/organizations", { name: organizationName }, () => setOrganizationName(""), event)}>
          <p className="item-title">{copy.createOrganization}</p>
          <input className="field-control" maxLength={160} placeholder={copy.organizationName} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          <button className="button button-secondary" disabled={busy || !organizationName.trim()}>{copy.createOrganization}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/organizations/${organizationId}/campuses`, campus, () => setCampus({ name: "", code: "", timezone: "Asia/Shanghai" }), event)}>
          <p className="item-title">{copy.addCampus}</p>
          <select className="field-select" aria-label={copy.organizationSelectAria} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">{copy.selectOrganization}</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name} · {resolveEducationLabel(messages.shared.roles, item.currentRole)}</option>)}</select>
          <input className="field-control" placeholder={copy.campusName} value={campus.name} onChange={(event) => setCampus({ ...campus, name: event.target.value })} />
          <div className="form-grid two-column-grid"><input className="field-control" placeholder={copy.campusCode} value={campus.code} onChange={(event) => setCampus({ ...campus, code: event.target.value })} /><input className="field-control" placeholder="Asia/Shanghai" value={campus.timezone} onChange={(event) => setCampus({ ...campus, timezone: event.target.value })} /></div>
          <button className="button button-secondary" disabled={busy || !canAdminOrganization || !campus.name.trim()}>{copy.saveCampus}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/organizations/${organizationId}/members`, member, () => setMember({ displayName: "", email: "", role: "teacher" }), event)}>
          <p className="item-title">{copy.inviteOrganizationMember}</p>
          <input className="field-control" placeholder={copy.displayName} value={member.displayName} onChange={(event) => setMember({ ...member, displayName: event.target.value })} />
          <input className="field-control" type="email" placeholder={copy.signInEmail} value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} />
          <select className="field-select" aria-label={copy.memberRoleAria} value={member.role} onChange={(event) => setMember({ ...member, role: event.target.value })}><option value="admin">{messages.shared.roles.admin}</option><option value="teacher">{messages.shared.roles.teacher}</option><option value="assistant">{messages.shared.roles.assistant}</option><option value="observer">{messages.shared.roles.observer}</option></select>
          <button className="button button-secondary" disabled={busy || !canAdminOrganization || !member.displayName || !member.email}>{copy.inviteMember}</button>
        </form>
      </div>

      {selectedOrganization ? <div className="stack-sm"><p className="eyebrow">{selectedOrganization.name} · {selectedOrganization.slug}</p>{selectedOrganization.campuses.length ? <p className="item-meta">{copy.campuses}: {selectedOrganization.campuses.map((item) => `${item.name} (${item.timezone})`).join(" · ")}</p> : null}{selectedOrganization.members.map((item) => <div className="list-item" key={item.id}><div><p className="item-title">{item.displayName} <span className="status-chip tone-cyan">{resolveEducationLabel(messages.shared.roles, item.role)}</span></p><p className="item-meta">{item.invitedEmail} · {resolveEducationLabel(messages.shared.statuses, item.status)}</p></div>{canAdminOrganization && item.role !== "owner" ? <button type="button" className="button button-ghost button-tertiary" disabled={busy} onClick={() => void remove(`education/organizations/${selectedOrganization.id}/members/${item.id}`)}>{copy.remove}</button> : null}</div>)}</div> : null}

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={savePlacement}>
          <p className="item-title">{copy.classroomPlacement}</p>
          <select className="field-select" aria-label={copy.classroomSelectAria} value={classroomId} onChange={(event) => { const id = event.target.value; const item = classrooms.find((entry) => entry.id === id); setClassroomId(id); setPlacement({ organizationId: item?.organizationId ?? "", campusId: item?.campusId ?? "" }); }}><option value="">{copy.selectClassroom}</option>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {resolveEducationLabel(messages.shared.roles, item.access.role)}</option>)}</select>
          <select className="field-select" aria-label={copy.organizationSelectAria} value={placement.organizationId} onChange={(event) => setPlacement({ organizationId: event.target.value, campusId: "" })}><option value="">{copy.personalClassroom}</option>{organizations.filter((item) => item.currentRole === "owner" || item.currentRole === "admin").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="field-select" value={placement.campusId} onChange={(event) => setPlacement({ ...placement, campusId: event.target.value })}><option value="">{copy.noCampus}</option>{placementCampuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-secondary" disabled={busy || !selectedClassroom?.access.canAdmin}>{copy.savePlacement}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/classrooms/${classroomId}/staff`, staff, () => setStaff({ displayName: "", email: "", role: "teacher" }), event)}>
          <p className="item-title">{copy.assignClassroomStaff}</p>
          <input className="field-control" placeholder={copy.displayName} value={staff.displayName} onChange={(event) => setStaff({ ...staff, displayName: event.target.value })} />
          <input className="field-control" type="email" placeholder={copy.signInEmail} value={staff.email} onChange={(event) => setStaff({ ...staff, email: event.target.value })} />
          <select className="field-select" aria-label={copy.staffRoleAria} value={staff.role} onChange={(event) => setStaff({ ...staff, role: event.target.value })}><option value="teacher">{messages.shared.roles.teacher}</option><option value="assistant">{messages.shared.roles.assistant}</option><option value="observer">{messages.shared.roles.observer}</option></select>
          <button className="button button-secondary" disabled={busy || !selectedClassroom?.access.canAdmin || !staff.displayName || !staff.email}>{copy.assignStaff}</button>
        </form>

        <div className="mini-card stack-sm"><p className="item-title">{copy.classroomStaff}</p>{!selectedClassroom?.staff.length ? <p className="empty-state">{copy.noStaff}</p> : selectedClassroom.staff.map((item) => <div className="list-item" key={item.id}><div><p className="item-title">{item.displayName}</p><p className="item-meta">{resolveEducationLabel(messages.shared.roles, item.role)} · {resolveEducationLabel(messages.shared.statuses, item.status)} · {item.invitedEmail}</p></div>{selectedClassroom.access.canAdmin ? <button type="button" className="button button-ghost button-tertiary" disabled={busy} onClick={() => void remove(`education/classrooms/${selectedClassroom.id}/staff/${item.id}`)}>{copy.remove}</button> : null}</div>)}</div>
      </div>
      {status ? <p className={`form-status ${statusKind}`} role="status" aria-label={copy.statusAria}>{status}</p> : null}
    </section>
  );
}
