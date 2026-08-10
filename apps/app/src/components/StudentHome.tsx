"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, downloadAuthenticatedFile } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

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
  const { locale } = useAppLocale();
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

  const copy = locale === "zh-CN"
    ? {
        eyebrow: "学习中心",
        title: "我的课堂",
        body: "集中查看老师发布的乐谱作业、练习资料、通知、成绩和反馈。",
        loading: "正在加载课堂内容...",
        login: "请先登录，再查看已关联到你邮箱的课堂。",
        empty: "还没有关联的课堂。请让老师把你登录使用的邮箱加入班级花名册。",
        assignments: "乐谱作业",
        resources: "学习资料",
        notifications: "课堂通知",
        unread: "条未读",
        due: "截止",
        noDue: "无截止时间",
        score: "乐谱",
        openScore: "打开乐谱",
        noShare: "老师尚未开放乐谱",
        pending: "待提交",
        submitted: "已提交",
        reviewed: "已批改",
        feedback: "教师反馈",
        grade: "成绩",
        noAssignments: "暂无作业。",
        noResources: "暂无学习资料。",
        noNotifications: "暂无课堂通知。",
        markRead: "标为已读",
        read: "已读",
        loadFailed: "课堂内容加载失败。",
        readFailed: "通知状态更新失败。",
        downloadFailed: "资源下载失败。",
        guardianView: "监护人视图",
        studentView: "学生视图",
        exitClass: "退出课堂",
        exitReason: "退出原因（可选）",
        requestExit: "申请退出",
        awaitingGuardian: "等待监护人同意",
        cancelExit: "撤回申请",
        approveExit: "同意退出",
        rejectExit: "拒绝退出",
        exitRejected: "监护人已拒绝上次申请，可重新提交。",
        exitFailed: "退出申请处理失败。",
        preferences: "通知设置",
        emailAnnouncements: "通过邮件接收课堂通知",
        emailHint: "默认关闭。开启后，新发布的课堂通知会发送到你的登录邮箱。",
        preferenceFailed: "通知设置保存失败。",
      }
    : {
        eyebrow: "Learning hub",
        title: "My classes",
        body: "Review assigned scores, practice resources, announcements, grades, and teacher feedback in one place.",
        loading: "Loading class content...",
        login: "Sign in to view classes linked to your account email.",
        empty: "No classes are linked yet. Ask your teacher to add your sign-in email to the roster.",
        assignments: "Score assignments",
        resources: "Learning resources",
        notifications: "Class announcements",
        unread: "unread",
        due: "Due",
        noDue: "No due date",
        score: "Score",
        openScore: "Open score",
        noShare: "The score has not been shared yet",
        pending: "Not submitted",
        submitted: "Submitted",
        reviewed: "Reviewed",
        feedback: "Teacher feedback",
        grade: "Grade",
        noAssignments: "No assignments yet.",
        noResources: "No learning resources yet.",
        noNotifications: "No announcements yet.",
        markRead: "Mark as read",
        read: "Read",
        loadFailed: "Could not load class content.",
        readFailed: "Could not update the announcement.",
        downloadFailed: "Could not download the resource.",
        guardianView: "Guardian view",
        studentView: "Student view",
        exitClass: "Leave class",
        exitReason: "Reason for leaving (optional)",
        requestExit: "Request to leave",
        awaitingGuardian: "Awaiting guardian consent",
        cancelExit: "Withdraw request",
        approveExit: "Approve exit",
        rejectExit: "Reject exit",
        exitRejected: "The guardian rejected the last request. A new request can be submitted.",
        exitFailed: "Could not process the exit request.",
        preferences: "Notification settings",
        emailAnnouncements: "Email me classroom announcements",
        emailHint: "Off by default. New classroom announcements will be sent to your sign-in email when enabled.",
        preferenceFailed: "Could not save notification settings.",
      };

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
      setError(result.error || copy.loadFailed);
      return;
    }
    setError(null);
    setClassrooms(result.data.classrooms);
    if (preferenceResult.ok) setNotificationPreferences(preferenceResult.data.preferences);
  }, [copy.loadFailed, copy.login]);

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
      setError(result.error || copy.readFailed);
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
      setError(result.error || copy.preferenceFailed);
      return;
    }
    setError(null);
    setNotificationPreferences(result.data.preferences);
  }

  function formatDate(value: string | null) {
    if (!value) return copy.noDue;
    return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function submissionLabel(assignment: StudentAssignment) {
    if (assignment.submissionStatus === "reviewed" || assignment.teacherFeedback || assignment.gradeScore !== null) return copy.reviewed;
    if (assignment.submissionId) return copy.submitted;
    return copy.pending;
  }

  async function downloadResource(resource: StudentResource) {
    const token = getStoredToken();
    if (!token || !resource.downloadPath) return;
    setBusyResourceId(resource.id);
    const result = await downloadAuthenticatedFile(resource.downloadPath, token, resource.originalName ?? resource.title);
    setBusyResourceId(null);
    if (!result.ok) setError(result.error || copy.downloadFailed);
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
    if (!result.ok) { setError(result.error || copy.exitFailed); return; }
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
    if (!result.ok) { setError(result.error || copy.exitFailed); return; }
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
    if (!result.ok) { setError(result.error || copy.exitFailed); return; }
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
        <div className="student-home-summary" aria-live="polite">
          <strong>{classrooms.length}</strong>
          <span>{copy.title}</span>
          <strong>{unreadCount}</strong>
          <span>{copy.unread}</span>
        </div>
      </section>

      {loading ? <p className="empty-state">{copy.loading}</p> : null}
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {!loading && !error && classrooms.length === 0 ? <p className="empty-state">{copy.empty}</p> : null}

      {!loading ? (
        <section className="student-notification-preferences" aria-labelledby="notification-preferences-title">
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
              <span className="status-chip tone-cyan">{classUnread} {copy.unread}</span>
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
                          <p className="student-grade"><span>{copy.grade}</span><strong>{assignment.gradeScore}/{assignment.gradeMax ?? 100}</strong></p>
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
                        <span><strong>{resource.title}</strong><small>{resource.resourceType}</small></span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <button type="button" className="student-resource" disabled={busyResourceId === resource.id} onClick={() => void downloadResource(resource)} key={resource.id}>
                        <span><strong>{resource.title}</strong><small>{resource.originalName ?? resource.resourceType}</small></span>
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
