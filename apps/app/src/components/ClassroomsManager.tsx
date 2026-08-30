"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { formatDateTime, formatNumber } from "@score/i18n";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useEducationMessages } from "../lib/education-messages/client";
import { resolveEducationLabel } from "../lib/education-messages/format";

type ClassroomStudent = {
  id: string;
  classroomId: string;
  displayName: string;
  contactEmail: string | null;
  externalRef: string | null;
  userId: string | null;
  status: "invited" | "active" | "archived";
  guardians: ClassroomGuardian[];
  createdAt: string;
  updatedAt: string;
};

type ClassroomGuardian = {
  id: string;
  studentId: string;
  userId: string | null;
  invitedEmail: string;
  displayName: string;
  relationship: string | null;
  status: "invited" | "active" | "removed";
};

type Classroom = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  access?: { role: string; canOperate: boolean; canAdmin: boolean };
  students: ClassroomStudent[];
};

type ClassroomsPayload = {
  classrooms: Classroom[];
};

type ClassroomPayload = {
  classroom: Classroom;
};

type StudentsPayload = {
  student?: ClassroomStudent;
  importedCount?: number;
  students: ClassroomStudent[];
};

type GuardiansPayload = { guardian?: ClassroomGuardian; guardians: ClassroomGuardian[] };

export function ClassroomsManager() {
  const { locale, messages } = useEducationMessages();
  const copy = messages.classrooms;
  const token = getStoredToken();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [classroomName, setClassroomName] = useState("");
  const [classroomDescription, setClassroomDescription] = useState("");
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [studentDrafts, setStudentDrafts] = useState<Record<string, { displayName: string; contactEmail: string; externalRef: string }>>({});
  const [bulkRosterDrafts, setBulkRosterDrafts] = useState<Record<string, string>>({});
  const [guardianDrafts, setGuardianDrafts] = useState<Record<string, { displayName: string; email: string; relationship: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void refreshClassrooms();
  }, []);

  async function refreshClassrooms() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await apiRequest<ClassroomsPayload>("/api/score-classrooms", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setLoading(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setClassrooms(result.data.classrooms);
  }

  async function createClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !classroomName.trim()) {
      return;
    }

    setCreatingClassroom(true);
    const result = await apiRequest<ClassroomPayload>("/api/score-classrooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: classroomName,
        description: classroomDescription,
      }),
    });
    setCreatingClassroom(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setClassrooms((current) => [result.data.classroom, ...current]);
    setClassroomName("");
    setClassroomDescription("");
    setStatus(copy.created);
    setStatusKind("success");
    window.dispatchEvent(new Event("score-classrooms-changed"));
  }

  async function addStudent(classroomId: string) {
    if (!token) {
      return;
    }

    const draft = studentDrafts[classroomId] ?? { displayName: "", contactEmail: "", externalRef: "" };
    if (!draft.displayName.trim()) {
      return;
    }

    setBusyId(classroomId);
    const result = await apiRequest<StudentsPayload>(`/api/score-classrooms/${classroomId}/students`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    setBusyId(null);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setClassrooms((current) => current.map((classroom) => (classroom.id === classroomId ? { ...classroom, students: result.data.students } : classroom)));
    setStudentDrafts((current) => ({ ...current, [classroomId]: { displayName: "", contactEmail: "", externalRef: "" } }));
    setStatus(copy.studentAdded);
    setStatusKind("success");
  }

  async function archiveClassroom(classroomId: string) {
    if (!token) {
      return;
    }

    setBusyId(classroomId);
    const result = await apiRequest<ClassroomPayload>(`/api/score-classrooms/${classroomId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setBusyId(null);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setClassrooms((current) => current.filter((classroom) => classroom.id !== classroomId));
    setStatus(copy.archived);
    setStatusKind("success");
    window.dispatchEvent(new Event("score-classrooms-changed"));
  }

  async function archiveStudent(classroomId: string, studentId: string) {
    if (!token) {
      return;
    }

    setBusyId(studentId);
    const result = await apiRequest<StudentsPayload>(`/api/score-classrooms/${classroomId}/students/${studentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setBusyId(null);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setClassrooms((current) => current.map((classroom) => (classroom.id === classroomId ? { ...classroom, students: result.data.students } : classroom)));
    setStatus(copy.archived);
    setStatusKind("success");
  }

  async function importBulkRoster(classroomId: string) {
    if (!token) return;
    const rows = (bulkRosterDrafts[classroomId] ?? "").split(/\r?\n/u).map((row) => row.trim()).filter(Boolean);
    const students = rows.map((row) => {
      const [displayName = "", contactEmail = "", externalRef = ""] = row.split("\t").map((value) => value.trim());
      return { displayName, contactEmail, externalRef };
    });
    if (!students.length || students.some((student) => !student.displayName)) return;
    setBusyId(`bulk-${classroomId}`);
    const result = await apiRequest<StudentsPayload>(`/api/score-classrooms/${classroomId}/students/bulk`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ students }),
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setClassrooms((current) => current.map((classroom) => classroom.id === classroomId ? { ...classroom, students: result.data.students } : classroom));
    setBulkRosterDrafts((current) => ({ ...current, [classroomId]: "" }));
    setStatus(copy.rosterImported);
    setStatusKind("success");
  }

  async function inviteGuardian(classroomId: string, studentId: string) {
    if (!token) return;
    const draft = guardianDrafts[studentId] ?? { displayName: "", email: "", relationship: "" };
    if (!draft.displayName.trim() || !draft.email.trim()) return;
    setBusyId(`guardian-${studentId}`);
    const result = await apiRequest<GuardiansPayload>(`/api/education/classrooms/${classroomId}/students/${studentId}/guardians`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    updateStudentGuardians(classroomId, studentId, result.data.guardians);
    setGuardianDrafts((current) => ({ ...current, [studentId]: { displayName: "", email: "", relationship: "" } }));
    setStatus(copy.guardianInvited);
    setStatusKind("success");
  }

  async function removeGuardian(classroomId: string, studentId: string, guardianId: string) {
    if (!token) return;
    setBusyId(guardianId);
    const result = await apiRequest<GuardiansPayload>(`/api/education/classrooms/${classroomId}/students/${studentId}/guardians/${guardianId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    updateStudentGuardians(classroomId, studentId, result.data.guardians);
    setStatus(copy.archived);
    setStatusKind("success");
  }

  function updateStudentGuardians(classroomId: string, studentId: string, guardians: ClassroomGuardian[]) {
    setClassrooms((current) => current.map((classroom) => classroom.id !== classroomId ? classroom : {
      ...classroom,
      students: classroom.students.map((student) => student.id === studentId ? { ...student, guardians } : student),
    }));
  }

  function updateStudentDraft(classroomId: string, field: "displayName" | "contactEmail" | "externalRef", value: string) {
    setStudentDrafts((current) => ({
      ...current,
      [classroomId]: {
        ...(current[classroomId] ?? {
          displayName: "",
          contactEmail: "",
          externalRef: "",
        }),
        [field]: value,
      },
    }));
  }

  return (
    <div className="page-shell stack-xl">
      <section className="page-banner">
        <div className="stack-sm">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="card-title">{copy.title}</h2>
          <p className="body-copy">{copy.body}</p>
        </div>
      </section>

      {status && statusKind ? <p className={`form-status ${statusKind}`} role="status" aria-label={copy.statusAria}>{status}</p> : null}

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.createTitle}</p>
          <h2 className="card-title">{copy.createTitle}</h2>
        </div>
        <form className="correction-panel" onSubmit={createClassroom}>
          <label className="field-group">
            <span>{copy.name}</span>
            <input className="field-control" value={classroomName} maxLength={120} onChange={(event) => setClassroomName(event.target.value)} />
          </label>
          <label className="field-group wide">
            <span>{copy.description}</span>
            <input className="field-control" value={classroomDescription} maxLength={1000} onChange={(event) => setClassroomDescription(event.target.value)} />
          </label>
          <div className="button-row wide">
            <button type="submit" className="button button-primary" disabled={creatingClassroom || !classroomName.trim()}>
              {creatingClassroom ? copy.creating : copy.create}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.students}</p>
          <h2 className="card-title">{copy.title}</h2>
        </div>
        {loading ? <div className="empty-state" role="status" aria-label={copy.loadingAria}>{copy.loading}</div> : null}
        {!loading && classrooms.length === 0 ? <div className="empty-state">{copy.empty}</div> : null}
        <div className="list-grid" aria-label={copy.rosterAria}>
          {classrooms.map((classroom) => {
            const draft = studentDrafts[classroom.id] ?? { displayName: "", contactEmail: "", externalRef: "" };
            return (
              <div key={classroom.id} className="list-item stack-md">
                <div className="list-item-content">
                  <p className="item-title">{classroom.name}</p>
                  {classroom.description ? <p className="body-copy">{classroom.description}</p> : null}
                  <p className="item-meta">
                    {formatNumber(classroom.students.length, locale)} {copy.students} | {resolveEducationLabel(messages.shared.roles, classroom.access?.role ?? "owner")} | {formatDateTime(classroom.updatedAt, locale)}
                  </p>
                </div>

                <div className="correction-panel">
                  <label className="field-group">
                    <span>{copy.displayName}</span>
                    <input className="field-control" disabled={classroom.access?.canOperate === false} value={draft.displayName} onChange={(event) => updateStudentDraft(classroom.id, "displayName", event.target.value)} />
                  </label>
                  <label className="field-group">
                    <span>{copy.contactEmail}</span>
                    <input className="field-control" disabled={classroom.access?.canOperate === false} value={draft.contactEmail} onChange={(event) => updateStudentDraft(classroom.id, "contactEmail", event.target.value)} />
                  </label>
                  <label className="field-group">
                    <span>{copy.externalRef}</span>
                    <input className="field-control" disabled={classroom.access?.canOperate === false} value={draft.externalRef} onChange={(event) => updateStudentDraft(classroom.id, "externalRef", event.target.value)} />
                  </label>
                  <div className="button-row">
                    <button type="button" className="button button-secondary" disabled={classroom.access?.canOperate === false || busyId === classroom.id || !draft.displayName.trim()} onClick={() => void addStudent(classroom.id)}>
                      {copy.addStudent}
                    </button>
                    <button type="button" className="button button-secondary button-ghost" disabled={classroom.access?.canAdmin === false || busyId === classroom.id} onClick={() => void archiveClassroom(classroom.id)}>
                      {copy.archiveClassroom}
                    </button>
                  </div>
                </div>

                <div className="stack-sm">
                  <label className="field-group wide">
                    <span>{copy.bulkRoster}</span>
                    <textarea className="field-control" rows={3} disabled={classroom.access?.canOperate === false} placeholder={copy.bulkHint} value={bulkRosterDrafts[classroom.id] ?? ""} onChange={(event) => setBulkRosterDrafts((current) => ({ ...current, [classroom.id]: event.target.value }))} />
                  </label>
                  <div className="button-row">
                    <button type="button" className="button button-secondary button-ghost" disabled={classroom.access?.canOperate === false || busyId === `bulk-${classroom.id}` || !(bulkRosterDrafts[classroom.id] ?? "").trim()} onClick={() => void importBulkRoster(classroom.id)}>{copy.importRoster}</button>
                  </div>
                </div>

                {classroom.students.length > 0 ? (
                  <div className="list-grid">
                    {classroom.students.map((student) => {
                      const guardianDraft = guardianDrafts[student.id] ?? { displayName: "", email: "", relationship: "" };
                      return (
                      <div key={student.id} className="list-item stack-sm">
                        <div className="list-item-content">
                          <p className="item-title">{student.displayName} <span className="status-chip tone-cyan">{resolveEducationLabel(messages.shared.statuses, student.status)}</span></p>
                          <p className="item-meta">{[student.contactEmail, student.externalRef].filter(Boolean).join(" | ") || "-"}</p>
                        </div>
                        <button type="button" className="button button-secondary button-ghost" disabled={classroom.access?.canOperate === false || busyId === student.id} onClick={() => void archiveStudent(classroom.id, student.id)}>
                          {copy.removeStudent}
                        </button>
                        <div className="correction-panel wide">
                          <label className="field-group"><span>{copy.guardianName}</span><input className="field-control" disabled={classroom.access?.canOperate === false} value={guardianDraft.displayName} onChange={(event) => setGuardianDrafts((current) => ({ ...current, [student.id]: { ...guardianDraft, displayName: event.target.value } }))} /></label>
                          <label className="field-group"><span>{copy.guardianEmail}</span><input className="field-control" type="email" disabled={classroom.access?.canOperate === false} value={guardianDraft.email} onChange={(event) => setGuardianDrafts((current) => ({ ...current, [student.id]: { ...guardianDraft, email: event.target.value } }))} /></label>
                          <label className="field-group"><span>{copy.relationship}</span><input className="field-control" disabled={classroom.access?.canOperate === false} value={guardianDraft.relationship} onChange={(event) => setGuardianDrafts((current) => ({ ...current, [student.id]: { ...guardianDraft, relationship: event.target.value } }))} /></label>
                          <div className="button-row"><button type="button" className="button button-secondary button-ghost" disabled={classroom.access?.canOperate === false || busyId === `guardian-${student.id}` || !guardianDraft.displayName.trim() || !guardianDraft.email.trim()} onClick={() => void inviteGuardian(classroom.id, student.id)}>{copy.inviteGuardian}</button></div>
                        </div>
                        {student.guardians.length ? <div className="list-grid wide">{student.guardians.map((guardian) => <div className="list-item" key={guardian.id}><div><p className="item-title">{guardian.displayName}</p><p className="item-meta">{copy.guardian}{guardian.relationship ? ` · ${guardian.relationship}` : ""} · {guardian.invitedEmail} · {resolveEducationLabel(messages.shared.statuses, guardian.status)}</p></div><button type="button" className="button button-secondary button-ghost" disabled={classroom.access?.canOperate === false || busyId === guardian.id} onClick={() => void removeGuardian(classroom.id, student.id, guardian.id)}>{copy.removeStudent}</button></div>)}</div> : null}
                      </div>
                    );})}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
