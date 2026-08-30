"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateTime, formatNumber } from "@score/i18n";
import { apiRequest, downloadAuthenticatedFile } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useEducationMessages } from "../lib/education-messages/client";
import { resolveEducationLabel } from "../lib/education-messages/format";

type StudentResource = {
  id: string;
  title: string;
  resourceType: string;
  url: string | null;
  sourceType: "external" | "file";
  downloadPath: string | null;
  originalName: string | null;
  createdAt: string;
};

type StudentNotification = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  readAt: string | null;
};

type StudentAssignment = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  status: string;
  scoreTitle: string;
  shareToken: string | null;
  submissionId: string | null;
  submissionStatus: string | null;
  teacherFeedback: string | null;
  gradeScore: number | null;
  gradeMax: number | null;
  submittedAt: string | null;
};

type StudentClassroom = {
  id: string;
  name: string;
  studentId: string;
  subjectStudentName: string;
  role: "student" | "guardian";
  exitRequest: {
    id: string;
    status: "pending_guardian" | "approved" | "rejected" | "cancelled";
    reason: string | null;
    requestedAt: string;
  } | null;
  resources: StudentResource[];
  notifications: StudentNotification[];
  assignments: StudentAssignment[];
};

type StudentHomePayload = { classrooms: StudentClassroom[] };
type NotificationPreferences = {
  emailClassroomAnnouncements: boolean;
  locale: "zh-CN" | "en";
  updatedAt: string | null;
};

export function StudentHome() {
  const { locale, messages } = useEducationMessages();
  const copy = messages.student;
  const [classrooms, setClassrooms] = useState<StudentClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);
  const [busyExitId, setBusyExitId] = useState<string | null>(null);
  const [exitReasons, setExitReasons] = useState<Record<string, string>>({});
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    emailClassroomAnnouncements: false,
    locale: "en",
    updatedAt: null,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  const loadHome = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setError(copy.login);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [result, preferenceResult] = await Promise.all([
      apiRequest<StudentHomePayload>("/api/education/student-home", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<{ preferences: NotificationPreferences }>("/api/education/notification-preferences", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setClassrooms(result.data.classrooms);
    if (preferenceResult.ok) setNotificationPreferences(preferenceResult.data.preferences);
  }, [copy.login]);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const unreadCount = useMemo(
    () => classrooms.reduce((total, classroom) => total + classroom.notifications.filter((item) => !item.readAt).length, 0),
    [classrooms],
  );

  async function markRead(classroomId: string, notificationId: string) {
    const token = getStoredToken();
    if (!token) return;
    setBusyNotificationId(notificationId);
    const result = await apiRequest<{ receipt: { readAt: string } }>(`/api/education/student-notifications/${notificationId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    setBusyNotificationId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setClassrooms((current) => current.map((classroom) => classroom.id !== classroomId
      ? classroom
      : {
          ...classroom,
          notifications: classroom.notifications.map((item) => item.id === notificationId
            ? { ...item, readAt: result.data.receipt.readAt }
            : item),
        }));
  }

  async function saveEmailPreference(enabled: boolean) {
    const token = getStoredToken();
    if (!token) return;
    const previous = notificationPreferences;
    setNotificationPreferences((current) => ({ ...current, emailClassroomAnnouncements: enabled }));
    setSavingPreferences(true);
    const result = await apiRequest<{ preferences: NotificationPreferences }>("/api/education/notification-preferences", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emailClassroomAnnouncements: enabled, locale: locale === "zh-CN" ? "zh-CN" : "en" }),
    });
    setSavingPreferences(false);
    if (!result.ok) {
      setNotificationPreferences(previous);
      setError(result.error);
      return;
    }
    setError(null);
    setNotificationPreferences(result.data.preferences);
  }

  function formatDate(value: string | null) {
    if (!value) return copy.noDue;
    return formatDateTime(value, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function submissionLabel(assignment: StudentAssignment) {
    if (assignment.submissionStatus === "reviewed" || assignment.teacherFeedback || assignment.gradeScore !== null) return copy.submissionStatuses.reviewed;
    if (assignment.submissionId) return copy.submissionStatuses.submitted;
    return copy.submissionStatuses.pending;
  }

  async function downloadResource(resource: StudentResource) {
    const token = getStoredToken();
    if (!token || !resource.downloadPath) return;
    setBusyResourceId(resource.id);
    const result = await downloadAuthenticatedFile(resource.downloadPath, token, resource.originalName ?? resource.title);
    setBusyResourceId(null);
    if (!result.ok) setError(result.error);
  }

  async function requestExit(classroom: StudentClassroom) {
    const token = getStoredToken();
    if (!token) return;
    setBusyExitId(classroom.studentId);
    const result = await apiRequest<{ exitRequest: NonNullable<StudentClassroom["exitRequest"]> }>(`/api/education/student-classrooms/${classroom.id}/exit-requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: exitReasons[classroom.studentId]?.trim() || null }),
    });
    setBusyExitId(null);
    if (!result.ok) { setError(result.error); return; }
    if (result.data.exitRequest.status === "approved") {
      setClassrooms((current) => current.filter((item) => !(item.id === classroom.id && item.studentId === classroom.studentId)));
      return;
    }
    setClassrooms((current) => current.map((item) => item.id === classroom.id && item.studentId === classroom.studentId ? { ...item, exitRequest: result.data.exitRequest } : item));
  }

  async function cancelExit(classroom: StudentClassroom) {
    const token = getStoredToken();
    if (!token || !classroom.exitRequest) return;
    setBusyExitId(classroom.exitRequest.id);
    const result = await apiRequest<{ exitRequest: NonNullable<StudentClassroom["exitRequest"]> }>(`/api/education/student-exit-requests/${classroom.exitRequest.id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setBusyExitId(null);
    if (!result.ok) { setError(result.error); return; }
    setClassrooms((current) => current.map((item) => item.studentId === classroom.studentId ? { ...item, exitRequest: result.data.exitRequest } : item));
  }

  async function decideExit(classroom: StudentClassroom, decision: "approve" | "reject") {
    const token = getStoredToken();
    if (!token || !classroom.exitRequest) return;
    setBusyExitId(classroom.exitRequest.id);
    const result = await apiRequest<{ exitRequest: NonNullable<StudentClassroom["exitRequest"]> }>(`/api/education/guardian-exit-requests/${classroom.exitRequest.id}/decision`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision }),
    });
    setBusyExitId(null);
    if (!result.ok) { setError(result.error); return; }
    if (decision === "approve") {
      setClassrooms((current) => current.filter((item) => !(item.id === classroom.id && item.studentId === classroom.studentId)));
      return;
    }
    setClassrooms((current) => current.map((item) => item.studentId === classroom.studentId ? { ...item, exitRequest: result.data.exitRequest } : item));
  }

  return (
    <div className="page-shell student-home">
      <section className="page-banner split">
        <div className="stack-sm">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="body-copy">{copy.body}</p>
        </div>
        <div className="student-home-summary" aria-live="polite" aria-label={copy.summaryAria}>
          <strong>{formatNumber(classrooms.length, locale)}</strong>
          <span>{copy.title}</span>
          <strong>{formatNumber(unreadCount, locale)}</strong>
          <span>{copy.unread}</span>
        </div>
      </section>

      {loading ? <p className="empty-state" role="status" aria-label={copy.loadingAria}>{copy.loading}</p> : null}
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {!loading && !error && classrooms.length === 0 ? <p className="empty-state">{copy.empty}</p> : null}

      {!loading ? (
        <section className="student-notification-preferences" aria-labelledby="notification-preferences-title" aria-label={copy.preferencesAria}>
          <div className="stack-xs">
            <h2 className="student-section-title" id="notification-preferences-title">{copy.preferences}</h2>
            <p className="item-meta">{copy.emailHint}</p>
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={notificationPreferences.emailClassroomAnnouncements}
              disabled={savingPreferences}
              onChange={(event) => void saveEmailPreference(event.target.checked)}
            />
            <span>{copy.emailAnnouncements}</span>
          </label>
        </section>
      ) : null}

      {classrooms.map((classroom) => {
        const classUnread = classroom.notifications.filter((item) => !item.readAt).length;
        return (
          <section className="surface-panel stack-lg" key={`${classroom.id}-${classroom.role}-${classroom.studentId}`}>
            <div className="student-class-heading">
              <div><h2 className="card-title">{classroom.name}</h2><p className="item-meta">{classroom.role === "guardian" ? `${copy.guardianView} · ${classroom.subjectStudentName}` : copy.studentView}</p></div>
              <span className="status-chip tone-cyan">{formatNumber(classUnread, locale)} {copy.unread}</span>
            </div>

            {classroom.role === "student" || classroom.exitRequest?.status === "pending_guardian" ? (
              <div className="student-exit-control stack-sm">
                <h3 className="student-section-title">{copy.exitClass}</h3>
                {classroom.role === "student" ? (
                  classroom.exitRequest?.status === "pending_guardian" ? (
                    <div className="button-row"><span className="item-meta">{copy.awaitingGuardian}</span><button type="button" className="button button-secondary button-ghost" disabled={busyExitId === classroom.exitRequest.id} onClick={() => void cancelExit(classroom)}>{copy.cancelExit}</button></div>
                  ) : (
                    <div className="form-grid two-column-grid">
                      <div className="stack-xs">{classroom.exitRequest?.status === "rejected" ? <p className="item-meta">{copy.exitRejected}</p> : null}<input className="field-control" maxLength={500} placeholder={copy.exitReason} value={exitReasons[classroom.studentId] ?? ""} onChange={(event) => setExitReasons((current) => ({ ...current, [classroom.studentId]: event.target.value }))} /></div>
                      <button type="button" className="button button-secondary button-ghost" disabled={busyExitId === classroom.studentId} onClick={() => void requestExit(classroom)}>{copy.requestExit}</button>
                    </div>
                  )
                ) : classroom.exitRequest ? (
                  <div className="button-row"><span className="item-meta">{classroom.exitRequest.reason || copy.awaitingGuardian}</span><button type="button" className="button button-secondary" disabled={busyExitId === classroom.exitRequest.id} onClick={() => void decideExit(classroom, "approve")}>{copy.approveExit}</button><button type="button" className="button button-secondary button-ghost" disabled={busyExitId === classroom.exitRequest.id} onClick={() => void decideExit(classroom, "reject")}>{copy.rejectExit}</button></div>
                ) : null}
              </div>
            ) : null}

            <div className="student-home-columns">
              <div className="stack-md">
                <h3 className="student-section-title">{copy.assignments}</h3>
                {classroom.assignments.length === 0 ? <p className="empty-state">{copy.noAssignments}</p> : null}
                <div className="list-grid">
                  {classroom.assignments.map((assignment) => (
                    <article className="list-item student-assignment" key={assignment.id}>
                      <div className="list-item-content">
                        <div className="student-class-heading">
                          <h4 className="item-title">{assignment.title}</h4>
                          <span className="status-chip tone-cyan">{submissionLabel(assignment)}</span>
                        </div>
                        <p className="item-meta">{copy.score}: {assignment.scoreTitle}</p>
                        <p className="item-meta">{copy.due}: {formatDate(assignment.dueAt)}</p>
                        {assignment.instructions ? <p className="body-copy">{assignment.instructions}</p> : null}
                        {assignment.gradeScore !== null ? (
                          <p className="student-grade"><span>{copy.grade}</span><strong>{formatNumber(assignment.gradeScore, locale)}/{formatNumber(assignment.gradeMax ?? 100, locale)}</strong></p>
                        ) : null}
                        {assignment.teacherFeedback ? (
                          <div className="student-feedback"><strong>{copy.feedback}</strong><p>{assignment.teacherFeedback}</p></div>
                        ) : null}
                      </div>
                      {assignment.shareToken ? (
                        <Link className="button button-secondary button-ghost" href={`/scores/shared/${assignment.shareToken}`}>{copy.openScore}</Link>
                      ) : <span className="micro-copy">{copy.noShare}</span>}
                    </article>
                  ))}
                </div>
              </div>

              <div className="stack-lg">
                <div className="stack-md">
                  <h3 className="student-section-title">{copy.notifications}</h3>
                  {classroom.notifications.length === 0 ? <p className="empty-state">{copy.noNotifications}</p> : null}
                  <div className="list-grid">
                    {classroom.notifications.map((notification) => (
                      <article className={`student-notification${notification.readAt ? " is-read" : ""}`} key={notification.id}>
                        <div className="stack-xs">
                          <h4 className="item-title">{notification.title}</h4>
                          <p className="body-copy">{notification.body}</p>
                          <p className="micro-copy">{formatDate(notification.publishedAt)}</p>
                        </div>
                        {notification.readAt ? <span className="micro-copy">{copy.read}</span> : (
                          <button className="button button-ghost button-tertiary" type="button" disabled={busyNotificationId === notification.id} onClick={() => void markRead(classroom.id, notification.id)}>
                            {copy.markRead}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </div>

                <div className="stack-md">
                  <h3 className="student-section-title">{copy.resources}</h3>
                  {classroom.resources.length === 0 ? <p className="empty-state">{copy.noResources}</p> : null}
                  <div className="list-grid">
                    {classroom.resources.map((resource) => resource.sourceType === "external" && resource.url ? (
                      <a className="student-resource" href={resource.url} target="_blank" rel="noreferrer" key={resource.id}>
                        <span><strong>{resource.title}</strong><small>{resolveEducationLabel(messages.shared.resourceTypes, resource.resourceType)}</small></span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <button type="button" className="student-resource" disabled={busyResourceId === resource.id} onClick={() => void downloadResource(resource)} key={resource.id}>
                        <span><strong>{resource.title}</strong><small>{resource.originalName ?? resolveEducationLabel(messages.shared.resourceTypes, resource.resourceType)}</small></span>
                        <span aria-hidden="true">↓</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
