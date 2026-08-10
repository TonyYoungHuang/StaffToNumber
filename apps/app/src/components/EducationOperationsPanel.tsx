"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiMultipartRequest, apiRequest, downloadAuthenticatedFile } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type ClassroomResource = {
  id: string;
  title: string;
  resourceType: string;
  url: string | null;
  sourceType: "external" | "file";
  downloadPath: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  folderId: string | null;
  folderPath: string | null;
  tags: string[];
  visibility: "classroom" | "selected" | "staff";
  selectedStudentIds: string[];
  versionGroupId: string;
  versionNumber: number;
  restoredFromId: string | null;
  reusedFromResourceId: string | null;
  createdAt: string;
  archivedAt: string | null;
  retentionHold: boolean;
  contentPurgedAt: string | null;
};

type ClassroomResourceFolder = { id: string; parentId: string | null; name: string; path: string };

type ClassroomNotification = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  status: "published" | "scheduled" | "cancelled";
  recipientCount: number;
  readCount: number;
  emailPendingCount: number;
  emailSentCount: number;
  emailFailedCount: number;
};

type EducationClassroom = {
  id: string;
  name: string;
  access: { role: string; canOperate: boolean; canAdmin: boolean };
  students: Array<{ id: string; displayName: string; contactEmail: string | null; status: string }>;
  resourceFolders: ClassroomResourceFolder[];
  resources: ClassroomResource[];
  retentionPolicy: { enabled: boolean; historicalVersionDays: number; minimumVersionsPerGroup: number; updatedAt: string | null };
  notifications: ClassroomNotification[];
  lmsConnections: Array<{ id: string; provider: string; courseRef: string; status: "draft" | "verified" | string; clientId?: string | null; deploymentId?: string | null; verifiedAt?: string | null; lastError?: string | null; nrpsUrl?: string | null; agsLineitemsUrl?: string | null; lastRosterSyncAt?: string | null; lastGradeSyncAt?: string | null }>;
};

type ResourceDraft = {
  title: string;
  url: string;
  resourceType: string;
  folderId: string;
  folderPath: string;
  tags: string;
  visibility: "classroom" | "selected" | "staff";
  selectedStudentIds: string[];
};

const emptyResource: ResourceDraft = { title: "", url: "", resourceType: "score", folderId: "", folderPath: "", tags: "", visibility: "classroom", selectedStudentIds: [] };

export function EducationOperationsPanel() {
  const { locale } = useAppLocale();
  const token = getStoredToken();
  const isChinese = locale === "zh-CN";
  const [classrooms, setClassrooms] = useState<EducationClassroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [resource, setResource] = useState<ResourceDraft>(emptyResource);
  const [resourceSource, setResourceSource] = useState<"external" | "file">("external");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceSearch, setResourceSearch] = useState("");
  const [versioningResourceId, setVersioningResourceId] = useState<string | null>(null);
  const [resourceHistory, setResourceHistory] = useState<{ groupId: string; versions: ClassroomResource[] } | null>(null);
  const [folderDraft, setFolderDraft] = useState({ name: "", parentId: "" });
  const [folderEditing, setFolderEditing] = useState<{ id: string; name: string; parentId: string } | null>(null);
  const [reuseDraft, setReuseDraft] = useState({ sourceClassroomId: "", sourceResourceId: "", folderId: "" });
  const [resourceMoveTargets, setResourceMoveTargets] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState({ title: "", body: "", publishAt: "" });
  const [retentionDraft, setRetentionDraft] = useState({ enabled: false, historicalVersionDays: 365, minimumVersionsPerGroup: 3 });
  const [retentionPreview, setRetentionPreview] = useState<{ versions: Array<{ id: string }>; totalBytes: number } | null>(null);
  const emptyLms = { provider: "manual", baseUrl: "", courseRef: "", issuer: "", clientId: "", deploymentId: "", oidcAuthUrl: "", tokenUrl: "", jwksUrl: "" };
  const [lms, setLms] = useState(emptyLms);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const result = await apiRequest<{ classrooms: EducationClassroom[] }>("/api/education/overview", { headers: { Authorization: `Bearer ${token}` } });
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setClassrooms(result.data.classrooms);
    setClassroomId((current) => result.data.classrooms.some((classroom) => classroom.id === current) ? current : result.data.classrooms[0]?.id || "");
  }

  useEffect(() => {
    const handleClassroomsChanged = () => { void refresh(); };
    window.addEventListener("score-classrooms-changed", handleClassroomsChanged);
    void refresh();
    return () => window.removeEventListener("score-classrooms-changed", handleClassroomsChanged);
  }, []);

  useEffect(() => {
    const selected = classrooms.find((classroom) => classroom.id === classroomId);
    if (!selected) return;
    setRetentionDraft({
      enabled: selected.retentionPolicy.enabled,
      historicalVersionDays: selected.retentionPolicy.historicalVersionDays,
      minimumVersionsPerGroup: selected.retentionPolicy.minimumVersionsPerGroup,
    });
    setRetentionPreview(null);
  }, [classroomId, classrooms]);

  async function submit(path: string, body: object, clear: () => void, event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId) return;
    setBusyId(path);
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    clear();
    setStatus(isChinese ? "已保存到课堂。" : "Saved to the classroom.");
    setStatusKind("success");
    await refresh();
  }

  async function archive(path: string, id: string) {
    if (!token || !classroomId) return;
    setBusyId(id);
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/${path}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(isChinese ? "已归档。" : "Archived.");
    setStatusKind("success");
    await refresh();
  }

  async function retryFailedNotification(id: string) {
    if (!token || !classroomId) return;
    setBusyId(`retry-${id}`);
    const result = await apiRequest<{ retried: number }>(`/api/education/classrooms/${classroomId}/notifications/${id}/retry-failed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: "{}",
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(isChinese ? `已重新加入 ${result.data.retried} 封失败邮件。` : `${result.data.retried} failed email deliveries queued again.`);
    setStatusKind("success");
    await refresh();
  }

  async function syncLmsRoster(connectionId: string) {
    if (!token || !classroomId) return;
    setBusyId(`lms-sync-${connectionId}`);
    const result = await apiRequest<{ imported: number; skipped: number }>(`/api/education/classrooms/${classroomId}/lms/${connectionId}/sync-roster`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: "{}",
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(isChinese ? `已同步 ${result.data.imported} 名学生，跳过 ${result.data.skipped} 条非学生记录。` : `${result.data.imported} learners synced; ${result.data.skipped} non-learner records skipped.`);
    setStatusKind("success");
    await refresh();
  }

  async function saveRetentionPolicy(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId) return;
    setBusyId("retention-policy");
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/resource-retention`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(retentionDraft),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setStatus(isChinese ? "资源版本保留策略已保存。" : "Resource version retention policy saved.");
    setStatusKind("success");
    await refresh();
  }

  async function previewRetention() {
    if (!token || !classroomId) return;
    setBusyId("retention-preview");
    const result = await apiRequest<{ preview: { versions: Array<{ id: string }>; totalBytes: number } }>(`/api/education/classrooms/${classroomId}/resource-retention/preview`, { headers: { Authorization: `Bearer ${token}` } });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setRetentionPreview(result.data.preview);
  }

  async function purgeRetentionCandidates() {
    if (!token || !classroomId) return;
    setBusyId("retention-purge");
    const result = await apiRequest<{ result: { purged: number } }>(`/api/education/classrooms/${classroomId}/resource-retention/purge`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: "{}",
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setStatus(isChinese ? `已清理 ${result.data.result.purged} 个过期历史版本的文件内容。` : `Purged file content from ${result.data.result.purged} expired historical versions.`);
    setStatusKind("success");
    setRetentionPreview(null);
    setResourceHistory(null);
    await refresh();
  }

  async function toggleRetentionHold(item: ClassroomResource) {
    if (!token || !classroomId) return;
    setBusyId(`retention-hold-${item.id}`);
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/resources/${item.id}/retention-hold`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ retentionHold: !item.retentionHold }),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    await refresh();
    await fetchResourceHistory(item);
  }

  function editResourceVersion(item: ClassroomResource) {
    setVersioningResourceId(item.id);
    setResource({
      title: item.title,
      url: item.url ?? "",
      resourceType: item.resourceType,
      folderId: item.folderId ?? "",
      folderPath: item.folderPath ?? "",
      tags: item.tags.join(", "),
      visibility: item.visibility,
      selectedStudentIds: item.selectedStudentIds,
    });
    setResourceSource(item.sourceType);
    setResourceFile(null);
  }

  async function saveResource(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId || !resource.title) return;
    if (resourceSource === "external") {
      if (!resource.url) return;
      await submit(resourcePath, resourcePayload, clearResourceDraft, event);
      return;
    }
    if (!resourceFile) return;
    const query = new URLSearchParams({
      title: resource.title,
      resourceType: resource.resourceType,
      folderId: resource.folderId,
      folderPath: resource.folderPath,
      tags: resource.tags,
      visibility: resource.visibility,
      selectedStudentIds: resource.selectedStudentIds.join(","),
    });
    const path = versioningResourceId
      ? `/api/education/classrooms/${classroomId}/resources/${versioningResourceId}/versions/upload?${query}`
      : `/api/education/classrooms/${classroomId}/resources/upload?${query}`;
    const formData = new FormData();
    formData.append("file", resourceFile);
    setBusyId(path);
    const result = await apiMultipartRequest<unknown>(path, formData, token);
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    clearResourceDraft();
    setStatus(isChinese ? "文件已安全上传到课堂。" : "File uploaded securely to the classroom.");
    setStatusKind("success");
    await refresh();
  }

  function clearResourceDraft() {
    setResource(emptyResource);
    setVersioningResourceId(null);
    setResourceSource("external");
    setResourceFile(null);
  }

  async function downloadResource(item: ClassroomResource) {
    if (!token || !item.downloadPath) return;
    setBusyId(`download-${item.id}`);
    const result = await downloadAuthenticatedFile(item.downloadPath, token, item.originalName ?? item.title);
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
    }
  }

  async function fetchResourceHistory(item: Pick<ClassroomResource, "id" | "versionGroupId">) {
    if (!token || !classroomId) return;
    setBusyId(`history-${item.id}`);
    const result = await apiRequest<{ versions: ClassroomResource[] }>(`/api/education/classrooms/${classroomId}/resources/${item.id}/versions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setResourceHistory({ groupId: item.versionGroupId, versions: result.data.versions });
  }

  async function toggleResourceHistory(item: ClassroomResource) {
    if (resourceHistory?.groupId === item.versionGroupId) {
      setResourceHistory(null);
      return;
    }
    await fetchResourceHistory(item);
  }

  async function restoreResourceVersion(item: ClassroomResource) {
    if (!token || !classroomId) return;
    setBusyId(`restore-${item.id}`);
    const result = await apiRequest<{ resource: ClassroomResource }>(`/api/education/classrooms/${classroomId}/resources/${item.id}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: "{}",
    });
    setBusyId(null);
    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }
    setStatus(isChinese ? `已将 v${item.versionNumber} 恢复为新的 v${result.data.resource.versionNumber}。` : `Restored v${item.versionNumber} as new v${result.data.resource.versionNumber}.`);
    setStatusKind("success");
    await refresh();
    await fetchResourceHistory(result.data.resource);
  }

  async function createResourceFolder(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId || !folderDraft.name) return;
    setBusyId("resource-folder");
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/resource-folders`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: folderDraft.name, parentId: folderDraft.parentId || null }),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setFolderDraft({ name: "", parentId: "" });
    setStatus(isChinese ? "文件夹已创建。" : "Folder created.");
    setStatusKind("success");
    await refresh();
  }

  async function reuseResource(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId || !reuseDraft.sourceClassroomId || !reuseDraft.sourceResourceId) return;
    setBusyId("reuse-resource");
    const result = await apiRequest<unknown>(`/api/education/classrooms/${classroomId}/resources/reuse`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...reuseDraft, folderId: reuseDraft.folderId || null }),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setReuseDraft({ sourceClassroomId: "", sourceResourceId: "", folderId: "" });
    setStatus(isChinese ? "资源已复用到当前课堂。" : "Resource reused in this classroom.");
    setStatusKind("success");
    await refresh();
  }

  async function updateResourceFolder(event: FormEvent) {
    event.preventDefault();
    if (!token || !classroomId || !folderEditing?.name) return;
    setBusyId(`folder-update-${folderEditing.id}`);
    const result = await apiRequest<{ folder: ClassroomResourceFolder; resources: ClassroomResource[] }>(`/api/education/classrooms/${classroomId}/resource-folders/${folderEditing.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: folderEditing.name, parentId: folderEditing.parentId || null }),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setFolderEditing(null);
    setResourceHistory(null);
    setStatus(isChinese
      ? `文件夹已更新；${result.data.resources.length} 项资源已生成不可变新版本。`
      : `Folder updated; ${result.data.resources.length} resource versions created.`);
    setStatusKind("success");
    await refresh();
  }

  async function moveResource(item: ClassroomResource) {
    if (!token || !classroomId) return;
    const folderId = resourceMoveTargets[item.id] ?? item.folderId ?? "";
    if (folderId === (item.folderId ?? "")) return;
    setBusyId(`move-${item.id}`);
    const result = await apiRequest<{ resource: ClassroomResource }>(`/api/education/classrooms/${classroomId}/resources/${item.id}/move`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ folderId: folderId || null }),
    });
    setBusyId(null);
    if (!result.ok) { setStatus(result.error); setStatusKind("error"); return; }
    setResourceMoveTargets((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setResourceHistory(null);
    setStatus(isChinese ? `资源已移动，并创建 v${result.data.resource.versionNumber}。` : `Resource moved as immutable v${result.data.resource.versionNumber}.`);
    setStatusKind("success");
    await refresh();
  }

  const selected = classrooms.find((classroom) => classroom.id === classroomId);
  const reuseSource = classrooms.find((classroom) => classroom.id === reuseDraft.sourceClassroomId);
  const canOperate = selected?.access.canOperate ?? false;
  const canAdmin = selected?.access.canAdmin ?? false;
  const visibleResources = useMemo(() => {
    const query = resourceSearch.trim().toLocaleLowerCase();
    if (!query) return selected?.resources ?? [];
    return (selected?.resources ?? []).filter((item) => [item.title, item.folderPath, item.resourceType, ...item.tags].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(query)));
  }, [resourceSearch, selected]);

  const resourcePayload = {
    ...resource,
    tags: resource.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  };
  const resourcePath = versioningResourceId ? `resources/${versioningResourceId}/versions` : "resources";

  return (
    <section className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{isChinese ? "课堂运营" : "Class operations"}</p>
        <h2 className="card-title">{isChinese ? "通知、资源库与 LMS" : "Notifications, resources, and LMS"}</h2>
        <p className="body-copy">{isChinese ? "学生账户按花名册邮箱关联；课堂资源、定时通知和阅读回执在这里统一管理。" : "Student accounts link by roster email; manage versioned resources, scheduled notices, and read receipts here."}</p>
      </div>
      <label className="field-group">
        <span>{isChinese ? "课堂" : "Classroom"}</span>
        <select className="field-select" aria-label={isChinese ? "当前课堂" : "Current classroom"} value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setResourceHistory(null); setFolderEditing(null); }}>
          <option value="">{isChinese ? "选择课堂" : "Select classroom"}</option>
          {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
        </select>
      </label>

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={(event) => void saveResource(event)}>
          <p className="item-title">{versioningResourceId ? (isChinese ? "发布资源新版本" : "Publish resource version") : (isChinese ? "添加资源" : "Add resource")}</p>
          <div className="button-row" role="group" aria-label={isChinese ? "资源来源" : "Resource source"}>
            <button type="button" className={`button button-secondary button-ghost${resourceSource === "external" ? " is-active" : ""}`} aria-pressed={resourceSource === "external"} onClick={() => { setResourceSource("external"); setResourceFile(null); }}>{isChinese ? "外链" : "Link"}</button>
            <button type="button" className={`button button-secondary button-ghost${resourceSource === "file" ? " is-active" : ""}`} aria-pressed={resourceSource === "file"} onClick={() => setResourceSource("file")}>{isChinese ? "上传文件" : "Upload file"}</button>
          </div>
          <input className="field-control" maxLength={160} placeholder={isChinese ? "资源标题" : "Resource title"} value={resource.title} onChange={(event) => setResource({ ...resource, title: event.target.value })} />
          {resourceSource === "external" ? <input className="field-control" type="url" placeholder="https://..." value={resource.url} onChange={(event) => setResource({ ...resource, url: event.target.value })} /> : <label className="field-group"><span>{isChinese ? "资源文件" : "Resource file"}</span><input className="field-control" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.musicxml,.xml,.mxl,.json,.mid,.midi,.wav,.mp3,.aac,.flac,.ogg,.aiff,.m4a,.mp4,.mov,.webm" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setResourceFile(selected); if (selected && !resource.title) setResource((current) => ({ ...current, title: selected.name.replace(/\.[^.]+$/u, "") })); }} /></label>}
          <div className="form-grid two-column-grid">
            <select className="field-select" value={resource.resourceType} onChange={(event) => setResource({ ...resource, resourceType: event.target.value })}><option value="score">Score</option><option value="audio">Audio</option><option value="video">Video</option><option value="document">Document</option></select>
            <select className="field-select" aria-label={isChinese ? "资源可见范围" : "Resource visibility"} value={resource.visibility} onChange={(event) => {
              const visibility = event.target.value as ResourceDraft["visibility"];
              setResource({ ...resource, visibility, selectedStudentIds: visibility === "selected" ? resource.selectedStudentIds : [] });
            }}>
              <option value="classroom">{isChinese ? "全班可见" : "Classroom"}</option>
              <option value="selected">{isChinese ? "指定学生" : "Selected students"}</option>
              <option value="staff">{isChinese ? "仅教师团队" : "Staff only"}</option>
            </select>
          </div>
          {resource.visibility === "selected" ? (
            <fieldset className="resource-student-access stack-sm">
              <legend>{isChinese ? "可访问学生" : "Students with access"}</legend>
              {selected?.students.length ? selected.students.map((student) => (
                <label className="resource-student-option" key={student.id}>
                  <input
                    type="checkbox"
                    checked={resource.selectedStudentIds.includes(student.id)}
                    onChange={(event) => setResource((current) => ({
                      ...current,
                      selectedStudentIds: event.target.checked
                        ? [...new Set([...current.selectedStudentIds, student.id])]
                        : current.selectedStudentIds.filter((studentId) => studentId !== student.id),
                    }))}
                  />
                  <span>{student.displayName}{student.contactEmail ? ` (${student.contactEmail})` : ""}</span>
                </label>
              )) : <p className="item-meta">{isChinese ? "当前课堂没有可授权的活跃学生。" : "This classroom has no active students to authorize."}</p>}
            </fieldset>
          ) : null}
          <select className="field-select" aria-label={isChinese ? "资源文件夹" : "Resource folder"} value={resource.folderId} onChange={(event) => setResource({ ...resource, folderId: event.target.value, folderPath: "" })}><option value="">{isChinese ? "根目录" : "Root folder"}</option>{selected?.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
          <input className="field-control" placeholder={isChinese ? "标签，用逗号分隔" : "Comma-separated tags"} value={resource.tags} onChange={(event) => setResource({ ...resource, tags: event.target.value })} />
          <div className="button-row">
            <button className="button button-secondary" disabled={!canOperate || busyId !== null || !classroomId || !resource.title || (resource.visibility === "selected" && resource.selectedStudentIds.length === 0) || (resourceSource === "external" ? !resource.url : !resourceFile)}>{resourceSource === "file" ? (isChinese ? "上传资源" : "Upload resource") : (isChinese ? "保存资源" : "Save resource")}</button>
            {versioningResourceId ? <button type="button" className="button button-ghost" onClick={clearResourceDraft}>{isChinese ? "取消" : "Cancel"}</button> : null}
          </div>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit("notifications", { ...notice, publishAt: notice.publishAt ? new Date(notice.publishAt).toISOString() : null }, () => setNotice({ title: "", body: "", publishAt: "" }), event)}>
          <p className="item-title">{isChinese ? "发布通知" : "Publish notification"}</p>
          <input className="field-control" maxLength={160} placeholder={isChinese ? "通知标题" : "Notification title"} value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} />
          <textarea className="field-control" rows={4} maxLength={4000} value={notice.body} onChange={(event) => setNotice({ ...notice, body: event.target.value })} />
          <label className="field-group"><span>{isChinese ? "定时发布（留空则立即）" : "Schedule (blank publishes now)"}</span><input className="field-control" type="datetime-local" value={notice.publishAt} onChange={(event) => setNotice({ ...notice, publishAt: event.target.value })} /></label>
          <button className="button button-secondary" disabled={!canOperate || busyId === "notifications" || !classroomId || !notice.title || !notice.body}>{notice.publishAt ? (isChinese ? "安排发布" : "Schedule") : (isChinese ? "立即发布" : "Publish now")}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void saveRetentionPolicy(event)}>
          <p className="item-title">{isChinese ? "历史版本保留" : "Version retention"}</p>
          <label className="toggle-row"><input type="checkbox" checked={retentionDraft.enabled} onChange={(event) => setRetentionDraft({ ...retentionDraft, enabled: event.target.checked })} /><span>{isChinese ? "启用自动清理" : "Enable automatic cleanup"}</span></label>
          <label className="field-group"><span>{isChinese ? "历史版本保留天数" : "Historical version days"}</span><input className="field-control" type="number" min={30} max={3650} value={retentionDraft.historicalVersionDays} onChange={(event) => setRetentionDraft({ ...retentionDraft, historicalVersionDays: Number(event.target.value) })} /></label>
          <label className="field-group"><span>{isChinese ? "每组至少保留的历史版本" : "Minimum historical versions per group"}</span><input className="field-control" type="number" min={1} max={20} value={retentionDraft.minimumVersionsPerGroup} onChange={(event) => setRetentionDraft({ ...retentionDraft, minimumVersionsPerGroup: Number(event.target.value) })} /></label>
          <p className="item-meta">{isChinese ? "当前版本和手动锁定版本不会清理。清理只移除文件内容，版本记录仍保留。" : "Current and held versions are never purged. Cleanup removes file content while preserving version history."}</p>
          {retentionPreview ? <p className="item-meta">{isChinese ? `将清理 ${retentionPreview.versions.length} 个版本，约 ${formatBytes(retentionPreview.totalBytes)}。` : `${retentionPreview.versions.length} versions, about ${formatBytes(retentionPreview.totalBytes)}, are eligible.`}</p> : null}
          <div className="button-row">
            <button className="button button-secondary" disabled={!canAdmin || busyId === "retention-policy"}>{isChinese ? "保存策略" : "Save policy"}</button>
            <button type="button" className="button button-secondary button-ghost" disabled={!classroomId || busyId === "retention-preview"} onClick={() => void previewRetention()}>{isChinese ? "预览" : "Preview"}</button>
            {retentionPreview && retentionPreview.versions.length > 0 ? <button type="button" className="button button-secondary button-ghost" disabled={!canAdmin || !retentionDraft.enabled || busyId === "retention-purge"} onClick={() => void purgeRetentionCandidates()}>{isChinese ? "执行清理" : "Purge eligible"}</button> : null}
          </div>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit("lms", lms, () => setLms(emptyLms), event)}>
          <p className="item-title">{isChinese ? "LTI 1.3 连接" : "LTI 1.3 connection"}</p>
          <select className="field-select" value={lms.provider} onChange={(event) => setLms({ ...lms, provider: event.target.value })}><option value="manual">Manual/LTI</option><option value="canvas">Canvas</option><option value="moodle">Moodle</option><option value="google-classroom">Google Classroom</option></select>
          <input className="field-control" placeholder={isChinese ? "课程编号" : "Course reference"} value={lms.courseRef} onChange={(event) => setLms({ ...lms, courseRef: event.target.value })} />
          <input className="field-control" type="url" placeholder={isChinese ? "LMS 地址（可选）" : "LMS URL (optional)"} value={lms.baseUrl} onChange={(event) => setLms({ ...lms, baseUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder="Issuer (https://...)" value={lms.issuer} onChange={(event) => setLms({ ...lms, issuer: event.target.value })} />
          <div className="form-grid two-column"><input className="field-control" placeholder="Client ID" value={lms.clientId} onChange={(event) => setLms({ ...lms, clientId: event.target.value })} /><input className="field-control" placeholder="Deployment ID" value={lms.deploymentId} onChange={(event) => setLms({ ...lms, deploymentId: event.target.value })} /></div>
          <input className="field-control" type="url" placeholder={isChinese ? "OIDC 授权地址" : "OIDC authorization URL"} value={lms.oidcAuthUrl} onChange={(event) => setLms({ ...lms, oidcAuthUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder={isChinese ? "OAuth Token 地址" : "OAuth token URL"} value={lms.tokenUrl} onChange={(event) => setLms({ ...lms, tokenUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder={isChinese ? "平台 JWKS 地址" : "Platform JWKS URL"} value={lms.jwksUrl} onChange={(event) => setLms({ ...lms, jwksUrl: event.target.value })} />
          <p className="item-meta">{isChinese ? "保存后从 LMS 发起一次工具启动；只有签名、nonce、deployment 与 target link 全部验证通过才会启用连接。" : "After saving, launch the tool once from the LMS. The connection activates only after signature, nonce, deployment, and target-link verification."}</p>
          <button className="button button-secondary" disabled={!canOperate || busyId === "lms" || !classroomId || !lms.courseRef}>{isChinese ? "保存草稿" : "Save draft"}</button>
        </form>
      </div>

      {selected ? (
        <div className="stack-lg">
          <div className="stack-sm">
            <div className="section-heading-row"><div><p className="eyebrow">{isChinese ? "资源库" : "Resource library"}</p><h3 className="card-title">{selected.resources.length} {isChinese ? "项资源" : "resources"}</h3></div><input className="field-control compact-control" type="search" placeholder={isChinese ? "搜索标题、文件夹或标签" : "Search title, folder, or tag"} value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} /></div>
            {canOperate ? <div className="resource-library-tools">
              <form className="form-grid resource-tool-form" onSubmit={(event) => void createResourceFolder(event)}>
                <input className="field-control" maxLength={80} placeholder={isChinese ? "新文件夹名称" : "New folder name"} value={folderDraft.name} onChange={(event) => setFolderDraft({ ...folderDraft, name: event.target.value })} />
                <select className="field-select" aria-label={isChinese ? "父文件夹" : "Parent folder"} value={folderDraft.parentId} onChange={(event) => setFolderDraft({ ...folderDraft, parentId: event.target.value })}><option value="">{isChinese ? "根目录下" : "Under root"}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
                <button className="button button-secondary" disabled={!folderDraft.name || busyId === "resource-folder"}>{isChinese ? "创建文件夹" : "Create folder"}</button>
              </form>
              <form className="form-grid resource-tool-form resource-reuse-form" onSubmit={(event) => void reuseResource(event)}>
                <select className="field-select" aria-label={isChinese ? "来源课堂" : "Source classroom"} value={reuseDraft.sourceClassroomId} onChange={(event) => setReuseDraft({ sourceClassroomId: event.target.value, sourceResourceId: "", folderId: reuseDraft.folderId })}><option value="">{isChinese ? "选择来源课堂" : "Source classroom"}</option>{classrooms.filter((classroom) => classroom.id !== classroomId).map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
                <select className="field-select" aria-label={isChinese ? "来源资源" : "Source resource"} value={reuseDraft.sourceResourceId} onChange={(event) => setReuseDraft({ ...reuseDraft, sourceResourceId: event.target.value })}><option value="">{isChinese ? "选择资源" : "Select resource"}</option>{reuseSource?.resources.map((item) => <option key={item.id} value={item.id}>{item.title} · v{item.versionNumber}</option>)}</select>
                <select className="field-select" aria-label={isChinese ? "复用目标文件夹" : "Reuse target folder"} value={reuseDraft.folderId} onChange={(event) => setReuseDraft({ ...reuseDraft, folderId: event.target.value })}><option value="">{isChinese ? "复用到根目录" : "Reuse to root"}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
                <button className="button button-secondary" disabled={!reuseDraft.sourceResourceId || busyId === "reuse-resource"}>{isChinese ? "复用资源" : "Reuse resource"}</button>
              </form>
              {selected.resourceFolders.length > 0 ? <div className="resource-folder-manager" aria-label={isChinese ? "文件夹管理" : "Folder management"}>
                {selected.resourceFolders.map((folder) => <div className="resource-folder-row" key={folder.id}>
                  {folderEditing?.id === folder.id ? <form className="resource-folder-edit" onSubmit={(event) => void updateResourceFolder(event)}>
                    <input className="field-control" aria-label={isChinese ? `重命名 ${folder.path}` : `Rename ${folder.path}`} maxLength={80} value={folderEditing.name} onChange={(event) => setFolderEditing({ ...folderEditing, name: event.target.value })} />
                    <select className="field-select" aria-label={isChinese ? `${folder.path} 的父文件夹` : `Parent for ${folder.path}`} value={folderEditing.parentId} onChange={(event) => setFolderEditing({ ...folderEditing, parentId: event.target.value })}><option value="">{isChinese ? "根目录下" : "Under root"}</option>{selected.resourceFolders.filter((candidate) => candidate.id !== folder.id && !candidate.path.startsWith(`${folder.path}/`)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.path}</option>)}</select>
                    <div className="button-row"><button className="button button-secondary button-ghost" disabled={!folderEditing.name.trim() || busyId === `folder-update-${folder.id}`}>{isChinese ? "保存" : "Save"}</button><button type="button" className="button button-secondary button-ghost" onClick={() => setFolderEditing(null)}>{isChinese ? "取消" : "Cancel"}</button></div>
                  </form> : <><span title={folder.path}>{folder.path}</span><div className="button-row"><button type="button" className="button button-secondary button-ghost" onClick={() => setFolderEditing({ id: folder.id, name: folder.name, parentId: folder.parentId ?? "" })}>{isChinese ? "编辑" : "Edit"}</button><button type="button" className="button button-secondary button-ghost" disabled={busyId === folder.id} onClick={() => void archive("resource-folders", folder.id)}>{isChinese ? "归档空文件夹" : "Archive empty folder"}</button></div></>}
                </div>)}
              </div> : null}
            </div> : null}
            {visibleResources.length === 0 ? <div className="empty-state">{isChinese ? "没有匹配的资源。" : "No matching resources."}</div> : visibleResources.map((item) => (
              <Fragment key={item.id}>
                <div className="list-item">
                  <div><p className="item-title">{item.sourceType === "external" && item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <button type="button" className="text-action" disabled={busyId === `download-${item.id}`} onClick={() => void downloadResource(item)}>{item.title}</button>} <span className="status-chip tone-cyan">v{item.versionNumber}</span></p><p className="item-meta">{item.folderPath || (isChinese ? "根目录" : "Root")} · {item.resourceType} · {item.sourceType === "file" ? (item.originalName ?? (isChinese ? "上传文件" : "Uploaded file")) : (isChinese ? "外链" : "Link")} · {item.visibility === "staff" ? (isChinese ? "仅教师团队" : "Staff") : item.visibility === "selected" ? `${isChinese ? "指定学生" : "Selected students"} (${item.selectedStudentIds.length})` : (isChinese ? "全班" : "Classroom")}{item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}{item.tags.length ? ` · ${item.tags.join(" / ")}` : ""}</p></div>
                  <div className="resource-row-actions"><div className="button-row"><button type="button" className="button button-secondary button-ghost" disabled={busyId === `history-${item.id}`} aria-expanded={resourceHistory?.groupId === item.versionGroupId} onClick={() => void toggleResourceHistory(item)}>{isChinese ? "版本历史" : "History"}</button><button type="button" className="button button-secondary button-ghost" disabled={!canOperate} onClick={() => editResourceVersion(item)}>{isChinese ? "新版本" : "New version"}</button><button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === item.id} onClick={() => void archive("resources", item.id)}>{isChinese ? "归档" : "Archive"}</button></div>{canOperate ? <div className="resource-move-control"><select className="field-select compact-control" aria-label={isChinese ? `移动 ${item.title}` : `Move ${item.title}`} value={resourceMoveTargets[item.id] ?? item.folderId ?? ""} onChange={(event) => setResourceMoveTargets((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">{isChinese ? "根目录" : "Root folder"}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select><button type="button" className="button button-secondary button-ghost" disabled={busyId === `move-${item.id}` || (resourceMoveTargets[item.id] ?? item.folderId ?? "") === (item.folderId ?? "")} onClick={() => void moveResource(item)}>{isChinese ? "移动" : "Move"}</button></div> : null}</div>
                </div>
                {resourceHistory?.groupId === item.versionGroupId ? <div className="resource-version-history stack-sm" aria-label={isChinese ? `${item.title} 版本历史` : `${item.title} version history`}>
                  <p className="item-meta">{isChinese ? "历史版本保持只读；恢复会创建新的当前版本。" : "History is read-only. Restoring creates a new current version."}</p>
                  {resourceHistory.versions.map((version) => <div className="list-item compact-list-item" key={version.id}>
                    <div><p className="item-title">v{version.versionNumber} <span className={`status-chip ${version.archivedAt ? "tone-neutral" : "tone-cyan"}`}>{version.contentPurgedAt ? (isChinese ? "内容已过期" : "Content expired") : version.archivedAt ? (isChinese ? "历史" : "Historical") : (isChinese ? "当前" : "Current")}</span>{version.retentionHold ? <span className="status-chip tone-cyan">{isChinese ? "保留锁" : "Held"}</span> : null}</p><p className="item-meta">{new Date(version.createdAt).toLocaleString(locale)} · {version.sourceType === "file" ? (version.originalName ?? (isChinese ? "上传文件" : "Uploaded file")) : (isChinese ? "外链" : "Link")}{version.restoredFromId ? ` · ${isChinese ? "由历史版本恢复" : "Restored from history"}` : ""}</p></div>
                    <div className="button-row">{version.downloadPath ? <button type="button" className="button button-secondary button-ghost" disabled={busyId === `download-${version.id}`} onClick={() => void downloadResource(version)}>{isChinese ? "下载" : "Download"}</button> : version.url ? <a className="button button-secondary button-ghost" href={version.url} target="_blank" rel="noreferrer">{isChinese ? "打开" : "Open"}</a> : null}{version.archivedAt && !version.contentPurgedAt ? <button type="button" className="button button-secondary button-ghost" disabled={!canAdmin || busyId === `retention-hold-${version.id}`} onClick={() => void toggleRetentionHold(version)}>{version.retentionHold ? (isChinese ? "取消保留" : "Remove hold") : (isChinese ? "永久保留" : "Keep")}</button> : null}{version.archivedAt && !version.contentPurgedAt ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `restore-${version.id}`} onClick={() => void restoreResourceVersion(version)}>{isChinese ? "恢复为新版" : "Restore"}</button> : null}</div>
                  </div>)}
                </div> : null}
              </Fragment>
            ))}
          </div>

          <div className="stack-sm">
            <p className="eyebrow">{isChinese ? "通知记录" : "Notification history"}</p>
            {selected.notifications.length === 0 ? <div className="empty-state">{isChinese ? "还没有通知。" : "No notifications yet."}</div> : selected.notifications.map((item) => (
              <div className="list-item" key={item.id}><div><p className="item-title">{item.title} <span className="status-chip tone-cyan">{item.status}</span></p><p className="body-copy">{item.body}</p><p className="item-meta">{new Date(item.publishedAt).toLocaleString(locale)} · {isChinese ? "已读" : "Read"} {item.readCount}/{item.recipientCount} · {isChinese ? "邮件" : "Email"} {isChinese ? "已发送" : "sent"} {item.emailSentCount}, {isChinese ? "待发送" : "pending"} {item.emailPendingCount}, {isChinese ? "失败" : "failed"} {item.emailFailedCount}</p></div><div className="button-row">{item.emailFailedCount > 0 && item.status !== "cancelled" ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `retry-${item.id}`} onClick={() => void retryFailedNotification(item.id)}>{isChinese ? "重试失败邮件" : "Retry failed email"}</button> : null}{item.status !== "cancelled" ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === item.id} onClick={() => void archive("notifications", item.id)}>{isChinese ? "取消" : "Cancel"}</button> : null}</div></div>
            ))}
          </div>

          {selected.lmsConnections.length > 0 ? <div className="stack-sm"><p className="eyebrow">LMS / LTI</p>{selected.lmsConnections.map((connection) => <div className="list-item" key={connection.id}><div><p className="item-title">{connection.provider} · {connection.courseRef} <span className={`status-chip ${connection.status === "verified" ? "tone-green" : "tone-amber"}`}>{connection.status}</span></p><p className="item-meta">{connection.deploymentId ?? (isChinese ? "尚未配置 Deployment ID" : "Deployment ID not configured")}{connection.verifiedAt ? ` · ${new Date(connection.verifiedAt).toLocaleString(locale)}` : ""}{connection.lastRosterSyncAt ? ` · ${isChinese ? "名单同步" : "roster synced"} ${new Date(connection.lastRosterSyncAt).toLocaleString(locale)}` : ""}</p>{connection.lastError ? <p className="form-status error">{connection.lastError}</p> : null}</div>{connection.status === "verified" && connection.nrpsUrl ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `lms-sync-${connection.id}`} onClick={() => void syncLmsRoster(connection.id)}>{isChinese ? "同步名单" : "Sync roster"}</button> : null}</div>)}</div> : null}
        </div>
      ) : null}
      {status ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
