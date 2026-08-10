"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

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
  const { locale } = useAppLocale();
  const isChinese = locale === "zh-CN";
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
    setStatus(isChinese ? "机构权限已更新。" : "Education access updated.");
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
    setStatus(isChinese ? "课堂归属已更新。" : "Classroom placement updated.");
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
    setStatus(isChinese ? "成员已移除。" : "Member removed.");
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
        <p className="eyebrow">{isChinese ? "机构权限" : "Organization access"}</p>
        <h1 className="card-title">{isChinese ? "机构、校区与课堂人员" : "Organizations, campuses, and classroom staff"}</h1>
        <p className="body-copy">{isChinese ? "机构管理员管理校区和成员；课堂教师、助教可运营课堂，观察者保持只读。邀请邮箱会在账号登录后由服务端自动认领。" : "Organization admins manage campuses and members. Classroom teachers and assistants can operate classes; observers remain read-only. Email invitations are claimed server-side at sign-in."}</p>
      </div>

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={(event) => void submit("education/organizations", { name: organizationName }, () => setOrganizationName(""), event)}>
          <p className="item-title">{isChinese ? "新建机构" : "Create organization"}</p>
          <input className="field-control" maxLength={160} placeholder={isChinese ? "机构名称" : "Organization name"} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          <button className="button button-secondary" disabled={busy || !organizationName.trim()}>{isChinese ? "创建机构" : "Create organization"}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/organizations/${organizationId}/campuses`, campus, () => setCampus({ name: "", code: "", timezone: "Asia/Shanghai" }), event)}>
          <p className="item-title">{isChinese ? "添加校区" : "Add campus"}</p>
          <select className="field-select" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">{isChinese ? "选择机构" : "Select organization"}</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currentRole}</option>)}</select>
          <input className="field-control" placeholder={isChinese ? "校区名称" : "Campus name"} value={campus.name} onChange={(event) => setCampus({ ...campus, name: event.target.value })} />
          <div className="form-grid two-column-grid"><input className="field-control" placeholder={isChinese ? "校区代码" : "Campus code"} value={campus.code} onChange={(event) => setCampus({ ...campus, code: event.target.value })} /><input className="field-control" placeholder="Asia/Shanghai" value={campus.timezone} onChange={(event) => setCampus({ ...campus, timezone: event.target.value })} /></div>
          <button className="button button-secondary" disabled={busy || !canAdminOrganization || !campus.name.trim()}>{isChinese ? "保存校区" : "Save campus"}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/organizations/${organizationId}/members`, member, () => setMember({ displayName: "", email: "", role: "teacher" }), event)}>
          <p className="item-title">{isChinese ? "邀请机构成员" : "Invite organization member"}</p>
          <input className="field-control" placeholder={isChinese ? "姓名" : "Display name"} value={member.displayName} onChange={(event) => setMember({ ...member, displayName: event.target.value })} />
          <input className="field-control" type="email" placeholder={isChinese ? "登录邮箱" : "Sign-in email"} value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} />
          <select className="field-select" value={member.role} onChange={(event) => setMember({ ...member, role: event.target.value })}><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="assistant">Assistant</option><option value="observer">Observer</option></select>
          <button className="button button-secondary" disabled={busy || !canAdminOrganization || !member.displayName || !member.email}>{isChinese ? "发送邀请" : "Invite member"}</button>
        </form>
      </div>

      {selectedOrganization ? <div className="stack-sm"><p className="eyebrow">{selectedOrganization.name} · {selectedOrganization.slug}</p>{selectedOrganization.campuses.length ? <p className="item-meta">{isChinese ? "校区" : "Campuses"}: {selectedOrganization.campuses.map((item) => `${item.name} (${item.timezone})`).join(" · ")}</p> : null}{selectedOrganization.members.map((item) => <div className="list-item" key={item.id}><div><p className="item-title">{item.displayName} <span className="status-chip tone-cyan">{item.role}</span></p><p className="item-meta">{item.invitedEmail} · {item.status}</p></div>{canAdminOrganization && item.role !== "owner" ? <button type="button" className="button button-ghost button-tertiary" disabled={busy} onClick={() => void remove(`education/organizations/${selectedOrganization.id}/members/${item.id}`)}>{isChinese ? "移除" : "Remove"}</button> : null}</div>)}</div> : null}

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={savePlacement}>
          <p className="item-title">{isChinese ? "课堂归属" : "Classroom placement"}</p>
          <select className="field-select" value={classroomId} onChange={(event) => { const id = event.target.value; const item = classrooms.find((entry) => entry.id === id); setClassroomId(id); setPlacement({ organizationId: item?.organizationId ?? "", campusId: item?.campusId ?? "" }); }}><option value="">{isChinese ? "选择课堂" : "Select classroom"}</option>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.access.role}</option>)}</select>
          <select className="field-select" value={placement.organizationId} onChange={(event) => setPlacement({ organizationId: event.target.value, campusId: "" })}><option value="">{isChinese ? "个人课堂" : "Personal classroom"}</option>{organizations.filter((item) => item.currentRole === "owner" || item.currentRole === "admin").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="field-select" value={placement.campusId} onChange={(event) => setPlacement({ ...placement, campusId: event.target.value })}><option value="">{isChinese ? "不指定校区" : "No campus"}</option>{placementCampuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-secondary" disabled={busy || !selectedClassroom?.access.canAdmin}>{isChinese ? "保存归属" : "Save placement"}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit(`education/classrooms/${classroomId}/staff`, staff, () => setStaff({ displayName: "", email: "", role: "teacher" }), event)}>
          <p className="item-title">{isChinese ? "分配课堂人员" : "Assign classroom staff"}</p>
          <input className="field-control" placeholder={isChinese ? "姓名" : "Display name"} value={staff.displayName} onChange={(event) => setStaff({ ...staff, displayName: event.target.value })} />
          <input className="field-control" type="email" placeholder={isChinese ? "登录邮箱" : "Sign-in email"} value={staff.email} onChange={(event) => setStaff({ ...staff, email: event.target.value })} />
          <select className="field-select" value={staff.role} onChange={(event) => setStaff({ ...staff, role: event.target.value })}><option value="teacher">Teacher</option><option value="assistant">Assistant</option><option value="observer">Observer</option></select>
          <button className="button button-secondary" disabled={busy || !selectedClassroom?.access.canAdmin || !staff.displayName || !staff.email}>{isChinese ? "分配人员" : "Assign staff"}</button>
        </form>

        <div className="mini-card stack-sm"><p className="item-title">{isChinese ? "课堂人员" : "Classroom staff"}</p>{!selectedClassroom?.staff.length ? <p className="empty-state">{isChinese ? "尚未分配。" : "No staff assigned."}</p> : selectedClassroom.staff.map((item) => <div className="list-item" key={item.id}><div><p className="item-title">{item.displayName}</p><p className="item-meta">{item.role} · {item.status} · {item.invitedEmail}</p></div>{selectedClassroom.access.canAdmin ? <button type="button" className="button button-ghost button-tertiary" disabled={busy} onClick={() => void remove(`education/classrooms/${selectedClassroom.id}/staff/${item.id}`)}>{isChinese ? "移除" : "Remove"}</button> : null}</div>)}</div>
      </div>
      {status ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
    </section>
  );
}
