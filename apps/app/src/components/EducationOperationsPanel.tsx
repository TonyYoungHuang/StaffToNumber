"use client";

import { formatDateTime, formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiMultipartRequest, apiRequest, downloadAuthenticatedFile } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useEducationMessages } from "../lib/education-messages/client";
import { resolveEducationLabel } from "../lib/education-messages/format";

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
  const { locale, messages } = useEducationMessages();
  const copy = messages.operations;
  const shared = messages.shared;
  const token = getStoredToken();
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
    setStatus(copy.saved);
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
    setStatus(copy.archived);
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
    setStatus(formatMessage(copy.retriedEmails, { count: formatNumber(result.data.retried, locale) }));
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
    setStatus(formatMessage(copy.rosterSynced, {
      imported: formatNumber(result.data.imported, locale),
      skipped: formatNumber(result.data.skipped, locale),
    }));
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
    setStatus(copy.retentionSaved);
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
    setStatus(formatMessage(copy.retentionPurged, { count: formatNumber(result.data.result.purged, locale) }));
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
    setStatus(copy.fileUploaded);
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
    setStatus(formatMessage(copy.versionRestored, {
      from: formatNumber(item.versionNumber, locale),
      to: formatNumber(result.data.resource.versionNumber, locale),
    }));
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
    setStatus(copy.folderCreated);
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
    setStatus(copy.resourceReused);
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
    setStatus(formatMessage(copy.folderUpdated, { count: formatNumber(result.data.resources.length, locale) }));
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
    setStatus(formatMessage(copy.resourceMoved, { version: formatNumber(result.data.resource.versionNumber, locale) }));
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
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>
      <label className="field-group">
        <span>{copy.classroom}</span>
        <select className="field-select" aria-label={copy.currentClassroomAria} value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setResourceHistory(null); setFolderEditing(null); }}>
          <option value="">{copy.selectClassroom}</option>
          {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
        </select>
      </label>

      <div className="three-column-grid">
        <form className="mini-card stack-sm" onSubmit={(event) => void saveResource(event)}>
          <p className="item-title">{versioningResourceId ? copy.resource.publishVersion : copy.resource.add}</p>
          <div className="button-row" role="group" aria-label={copy.resource.sourceAria}>
            <button type="button" className={`button button-secondary button-ghost${resourceSource === "external" ? " is-active" : ""}`} aria-pressed={resourceSource === "external"} onClick={() => { setResourceSource("external"); setResourceFile(null); }}>{shared.resourceSources.external}</button>
            <button type="button" className={`button button-secondary button-ghost${resourceSource === "file" ? " is-active" : ""}`} aria-pressed={resourceSource === "file"} onClick={() => setResourceSource("file")}>{shared.resourceSources.file}</button>
          </div>
          <input className="field-control" maxLength={160} placeholder={copy.resource.title} value={resource.title} onChange={(event) => setResource({ ...resource, title: event.target.value })} />
          {resourceSource === "external" ? <input className="field-control" type="url" placeholder="https://..." value={resource.url} onChange={(event) => setResource({ ...resource, url: event.target.value })} /> : <label className="field-group"><span>{copy.resource.file}</span><input className="field-control" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.musicxml,.xml,.mxl,.json,.mid,.midi,.wav,.mp3,.aac,.flac,.ogg,.aiff,.m4a,.mp4,.mov,.webm" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setResourceFile(selected); if (selected && !resource.title) setResource((current) => ({ ...current, title: selected.name.replace(/\.[^.]+$/u, "") })); }} /></label>}
          <div className="form-grid two-column-grid">
            <select className="field-select" aria-label={copy.resource.typeAria} value={resource.resourceType} onChange={(event) => setResource({ ...resource, resourceType: event.target.value })}><option value="score">{shared.resourceTypes.score}</option><option value="audio">{shared.resourceTypes.audio}</option><option value="video">{shared.resourceTypes.video}</option><option value="document">{shared.resourceTypes.document}</option></select>
            <select className="field-select" aria-label={copy.resource.visibilityAria} value={resource.visibility} onChange={(event) => {
              const visibility = event.target.value as ResourceDraft["visibility"];
              setResource({ ...resource, visibility, selectedStudentIds: visibility === "selected" ? resource.selectedStudentIds : [] });
            }}>
              <option value="classroom">{shared.resourceVisibilities.classroom}</option>
              <option value="selected">{shared.resourceVisibilities.selected}</option>
              <option value="staff">{shared.resourceVisibilities.staff}</option>
            </select>
          </div>
          {resource.visibility === "selected" ? (
            <fieldset className="resource-student-access stack-sm">
              <legend>{copy.resource.studentsWithAccess}</legend>
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
              )) : <p className="item-meta">{copy.resource.noActiveStudents}</p>}
            </fieldset>
          ) : null}
          <select className="field-select" aria-label={copy.resource.folderAria} value={resource.folderId} onChange={(event) => setResource({ ...resource, folderId: event.target.value, folderPath: "" })}><option value="">{copy.resource.rootFolder}</option>{selected?.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
          <input className="field-control" placeholder={copy.resource.tags} value={resource.tags} onChange={(event) => setResource({ ...resource, tags: event.target.value })} />
          <div className="button-row">
            <button className="button button-secondary" disabled={!canOperate || busyId !== null || !classroomId || !resource.title || (resource.visibility === "selected" && resource.selectedStudentIds.length === 0) || (resourceSource === "external" ? !resource.url : !resourceFile)}>{resourceSource === "file" ? copy.resource.upload : copy.resource.save}</button>
            {versioningResourceId ? <button type="button" className="button button-ghost" onClick={clearResourceDraft}>{copy.resource.cancel}</button> : null}
          </div>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit("notifications", { ...notice, publishAt: notice.publishAt ? new Date(notice.publishAt).toISOString() : null }, () => setNotice({ title: "", body: "", publishAt: "" }), event)}>
          <p className="item-title">{copy.notification.publish}</p>
          <input className="field-control" maxLength={160} placeholder={copy.notification.title} value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} />
          <textarea className="field-control" rows={4} maxLength={4000} placeholder={copy.notification.body} value={notice.body} onChange={(event) => setNotice({ ...notice, body: event.target.value })} />
          <label className="field-group"><span>{copy.notification.scheduleLabel}</span><input className="field-control" type="datetime-local" value={notice.publishAt} onChange={(event) => setNotice({ ...notice, publishAt: event.target.value })} /></label>
          <button className="button button-secondary" disabled={!canOperate || busyId === "notifications" || !classroomId || !notice.title || !notice.body}>{notice.publishAt ? copy.notification.schedule : copy.notification.publishNow}</button>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void saveRetentionPolicy(event)}>
          <p className="item-title">{copy.retention.title}</p>
          <label className="toggle-row"><input type="checkbox" checked={retentionDraft.enabled} onChange={(event) => setRetentionDraft({ ...retentionDraft, enabled: event.target.checked })} /><span>{copy.retention.enable}</span></label>
          <label className="field-group"><span>{copy.retention.days}</span><input className="field-control" type="number" min={30} max={3650} value={retentionDraft.historicalVersionDays} onChange={(event) => setRetentionDraft({ ...retentionDraft, historicalVersionDays: Number(event.target.value) })} /></label>
          <label className="field-group"><span>{copy.retention.minimumVersions}</span><input className="field-control" type="number" min={1} max={20} value={retentionDraft.minimumVersionsPerGroup} onChange={(event) => setRetentionDraft({ ...retentionDraft, minimumVersionsPerGroup: Number(event.target.value) })} /></label>
          <p className="item-meta">{copy.retention.note}</p>
          {retentionPreview ? <p className="item-meta">{formatMessage(copy.retention.previewSummary, { count: formatNumber(retentionPreview.versions.length, locale), size: formatBytes(retentionPreview.totalBytes, locale) })}</p> : null}
          <div className="button-row">
            <button className="button button-secondary" disabled={!canAdmin || busyId === "retention-policy"}>{copy.retention.save}</button>
            <button type="button" className="button button-secondary button-ghost" disabled={!classroomId || busyId === "retention-preview"} onClick={() => void previewRetention()}>{copy.retention.preview}</button>
            {retentionPreview && retentionPreview.versions.length > 0 ? <button type="button" className="button button-secondary button-ghost" disabled={!canAdmin || !retentionDraft.enabled || busyId === "retention-purge"} onClick={() => void purgeRetentionCandidates()}>{copy.retention.purge}</button> : null}
          </div>
        </form>

        <form className="mini-card stack-sm" onSubmit={(event) => void submit("lms", lms, () => setLms(emptyLms), event)}>
          <p className="item-title">{copy.lms.title}</p>
          <select className="field-select" value={lms.provider} onChange={(event) => setLms({ ...lms, provider: event.target.value })}><option value="manual">{copy.lms.providers.manual}</option><option value="canvas">{copy.lms.providers.canvas}</option><option value="moodle">{copy.lms.providers.moodle}</option><option value="google-classroom">{copy.lms.providers["google-classroom"]}</option></select>
          <input className="field-control" placeholder={copy.lms.courseRef} value={lms.courseRef} onChange={(event) => setLms({ ...lms, courseRef: event.target.value })} />
          <input className="field-control" type="url" placeholder={copy.lms.baseUrl} value={lms.baseUrl} onChange={(event) => setLms({ ...lms, baseUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder={copy.lms.issuer} value={lms.issuer} onChange={(event) => setLms({ ...lms, issuer: event.target.value })} />
          <div className="form-grid two-column"><input className="field-control" placeholder={copy.lms.clientId} value={lms.clientId} onChange={(event) => setLms({ ...lms, clientId: event.target.value })} /><input className="field-control" placeholder={copy.lms.deploymentId} value={lms.deploymentId} onChange={(event) => setLms({ ...lms, deploymentId: event.target.value })} /></div>
          <input className="field-control" type="url" placeholder={copy.lms.oidcAuthUrl} value={lms.oidcAuthUrl} onChange={(event) => setLms({ ...lms, oidcAuthUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder={copy.lms.tokenUrl} value={lms.tokenUrl} onChange={(event) => setLms({ ...lms, tokenUrl: event.target.value })} />
          <input className="field-control" type="url" placeholder={copy.lms.jwksUrl} value={lms.jwksUrl} onChange={(event) => setLms({ ...lms, jwksUrl: event.target.value })} />
          <p className="item-meta">{copy.lms.note}</p>
          <button className="button button-secondary" disabled={!canOperate || busyId === "lms" || !classroomId || !lms.courseRef}>{copy.lms.saveDraft}</button>
        </form>
      </div>

      {selected ? (
        <div className="stack-lg">
          <div className="stack-sm">
            <div className="section-heading-row"><div><p className="eyebrow">{copy.library.eyebrow}</p><h3 className="card-title">{formatMessage(copy.library.resourceCount, { count: formatNumber(selected.resources.length, locale) })}</h3></div><input className="field-control compact-control" type="search" placeholder={copy.library.search} value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} /></div>
            {canOperate ? <div className="resource-library-tools">
              <form className="form-grid resource-tool-form" onSubmit={(event) => void createResourceFolder(event)}>
                <input className="field-control" maxLength={80} placeholder={copy.library.newFolder} value={folderDraft.name} onChange={(event) => setFolderDraft({ ...folderDraft, name: event.target.value })} />
                <select className="field-select" aria-label={copy.library.parentFolderAria} value={folderDraft.parentId} onChange={(event) => setFolderDraft({ ...folderDraft, parentId: event.target.value })}><option value="">{copy.library.underRoot}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
                <button className="button button-secondary" disabled={!folderDraft.name || busyId === "resource-folder"}>{copy.library.createFolder}</button>
              </form>
              <form className="form-grid resource-tool-form resource-reuse-form" onSubmit={(event) => void reuseResource(event)}>
                <select className="field-select" aria-label={copy.library.sourceClassroomAria} value={reuseDraft.sourceClassroomId} onChange={(event) => setReuseDraft({ sourceClassroomId: event.target.value, sourceResourceId: "", folderId: reuseDraft.folderId })}><option value="">{copy.library.sourceClassroom}</option>{classrooms.filter((classroom) => classroom.id !== classroomId).map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
                <select className="field-select" aria-label={copy.library.sourceResourceAria} value={reuseDraft.sourceResourceId} onChange={(event) => setReuseDraft({ ...reuseDraft, sourceResourceId: event.target.value })}><option value="">{copy.library.selectResource}</option>{reuseSource?.resources.map((item) => <option key={item.id} value={item.id}>{item.title} · {formatMessage(copy.resource.version, { version: formatNumber(item.versionNumber, locale) })}</option>)}</select>
                <select className="field-select" aria-label={copy.library.reuseFolderAria} value={reuseDraft.folderId} onChange={(event) => setReuseDraft({ ...reuseDraft, folderId: event.target.value })}><option value="">{copy.library.reuseRoot}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select>
                <button className="button button-secondary" disabled={!reuseDraft.sourceResourceId || busyId === "reuse-resource"}>{copy.library.reuse}</button>
              </form>
              {selected.resourceFolders.length > 0 ? <div className="resource-folder-manager" aria-label={copy.library.folderManagementAria}>
                {selected.resourceFolders.map((folder) => <div className="resource-folder-row" key={folder.id}>
                  {folderEditing?.id === folder.id ? <form className="resource-folder-edit" onSubmit={(event) => void updateResourceFolder(event)}>
                    <input className="field-control" aria-label={formatMessage(copy.library.renameAria, { path: folder.path })} maxLength={80} value={folderEditing.name} onChange={(event) => setFolderEditing({ ...folderEditing, name: event.target.value })} />
                    <select className="field-select" aria-label={formatMessage(copy.library.parentForAria, { path: folder.path })} value={folderEditing.parentId} onChange={(event) => setFolderEditing({ ...folderEditing, parentId: event.target.value })}><option value="">{copy.library.underRoot}</option>{selected.resourceFolders.filter((candidate) => candidate.id !== folder.id && !candidate.path.startsWith(`${folder.path}/`)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.path}</option>)}</select>
                    <div className="button-row"><button className="button button-secondary button-ghost" disabled={!folderEditing.name.trim() || busyId === `folder-update-${folder.id}`}>{copy.library.save}</button><button type="button" className="button button-secondary button-ghost" onClick={() => setFolderEditing(null)}>{copy.library.cancel}</button></div>
                  </form> : <><span title={folder.path}>{folder.path}</span><div className="button-row"><button type="button" className="button button-secondary button-ghost" onClick={() => setFolderEditing({ id: folder.id, name: folder.name, parentId: folder.parentId ?? "" })}>{copy.library.edit}</button><button type="button" className="button button-secondary button-ghost" disabled={busyId === folder.id} onClick={() => void archive("resource-folders", folder.id)}>{copy.library.archiveEmptyFolder}</button></div></>}
                </div>)}
              </div> : null}
            </div> : null}
            {visibleResources.length === 0 ? <div className="empty-state">{copy.library.noMatches}</div> : visibleResources.map((item) => (
              <Fragment key={item.id}>
                <div className="list-item">
                  <div><p className="item-title">{item.sourceType === "external" && item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <button type="button" className="text-action" disabled={busyId === `download-${item.id}`} onClick={() => void downloadResource(item)}>{item.title}</button>} <span className="status-chip tone-cyan">{formatMessage(copy.resource.version, { version: formatNumber(item.versionNumber, locale) })}</span></p><p className="item-meta">{item.folderPath || copy.library.root} · {resolveEducationLabel(shared.resourceTypes, item.resourceType)} · {item.sourceType === "file" ? (item.originalName ?? shared.resourceSources.file) : shared.resourceSources.external} · {item.visibility === "selected" ? formatMessage(copy.resource.selectedStudents, { count: formatNumber(item.selectedStudentIds.length, locale) }) : shared.resourceVisibilities[item.visibility]}{item.sizeBytes ? ` · ${formatBytes(item.sizeBytes, locale)}` : ""}{item.tags.length ? ` · ${item.tags.join(" / ")}` : ""}</p></div>
                  <div className="resource-row-actions"><div className="button-row"><button type="button" className="button button-secondary button-ghost" disabled={busyId === `history-${item.id}`} aria-expanded={resourceHistory?.groupId === item.versionGroupId} onClick={() => void toggleResourceHistory(item)}>{copy.resource.history}</button><button type="button" className="button button-secondary button-ghost" disabled={!canOperate} onClick={() => editResourceVersion(item)}>{copy.resource.newVersion}</button><button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === item.id} onClick={() => void archive("resources", item.id)}>{copy.resource.archive}</button></div>{canOperate ? <div className="resource-move-control"><select className="field-select compact-control" aria-label={formatMessage(copy.resource.moveAria, { title: item.title })} value={resourceMoveTargets[item.id] ?? item.folderId ?? ""} onChange={(event) => setResourceMoveTargets((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">{copy.resource.rootFolder}</option>{selected.resourceFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.path}</option>)}</select><button type="button" className="button button-secondary button-ghost" disabled={busyId === `move-${item.id}` || (resourceMoveTargets[item.id] ?? item.folderId ?? "") === (item.folderId ?? "")} onClick={() => void moveResource(item)}>{copy.resource.move}</button></div> : null}</div>
                </div>
                {resourceHistory?.groupId === item.versionGroupId ? <div className="resource-version-history stack-sm" aria-label={formatMessage(copy.history.aria, { title: item.title })}>
                  <p className="item-meta">{copy.history.note}</p>
                  {resourceHistory.versions.map((version) => <div className="list-item compact-list-item" key={version.id}>
                    <div><p className="item-title">{formatMessage(copy.resource.version, { version: formatNumber(version.versionNumber, locale) })} <span className={`status-chip ${version.archivedAt ? "tone-neutral" : "tone-cyan"}`}>{version.contentPurgedAt ? copy.history.contentExpired : version.archivedAt ? copy.history.historical : copy.history.current}</span>{version.retentionHold ? <span className="status-chip tone-cyan">{copy.history.held}</span> : null}</p><p className="item-meta">{formatDateTime(version.createdAt, locale)} · {version.sourceType === "file" ? (version.originalName ?? shared.resourceSources.file) : shared.resourceSources.external}{version.restoredFromId ? ` · ${copy.history.restoredFromHistory}` : ""}</p></div>
                    <div className="button-row">{version.downloadPath ? <button type="button" className="button button-secondary button-ghost" disabled={busyId === `download-${version.id}`} onClick={() => void downloadResource(version)}>{copy.history.download}</button> : version.url ? <a className="button button-secondary button-ghost" href={version.url} target="_blank" rel="noreferrer">{copy.history.open}</a> : null}{version.archivedAt && !version.contentPurgedAt ? <button type="button" className="button button-secondary button-ghost" disabled={!canAdmin || busyId === `retention-hold-${version.id}`} onClick={() => void toggleRetentionHold(version)}>{version.retentionHold ? copy.history.removeHold : copy.history.keep}</button> : null}{version.archivedAt && !version.contentPurgedAt ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `restore-${version.id}`} onClick={() => void restoreResourceVersion(version)}>{copy.history.restore}</button> : null}</div>
                  </div>)}
                </div> : null}
              </Fragment>
            ))}
          </div>

          <div className="stack-sm">
            <p className="eyebrow">{copy.notification.history}</p>
            {selected.notifications.length === 0 ? <div className="empty-state">{copy.notification.empty}</div> : selected.notifications.map((item) => (
              <div className="list-item" key={item.id}><div><p className="item-title">{item.title} <span className="status-chip tone-cyan">{resolveEducationLabel(shared.statuses, item.status)}</span></p><p className="body-copy">{item.body}</p><p className="item-meta">{formatDateTime(item.publishedAt, locale)} · {copy.notification.read} {formatNumber(item.readCount, locale)}/{formatNumber(item.recipientCount, locale)} · {copy.notification.email} {copy.notification.sent} {formatNumber(item.emailSentCount, locale)}, {copy.notification.pending} {formatNumber(item.emailPendingCount, locale)}, {copy.notification.failed} {formatNumber(item.emailFailedCount, locale)}</p></div><div className="button-row">{item.emailFailedCount > 0 && item.status !== "cancelled" ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `retry-${item.id}`} onClick={() => void retryFailedNotification(item.id)}>{copy.notification.retryFailed}</button> : null}{item.status !== "cancelled" ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === item.id} onClick={() => void archive("notifications", item.id)}>{copy.notification.cancel}</button> : null}</div></div>
            ))}
          </div>

          {selected.lmsConnections.length > 0 ? <div className="stack-sm"><p className="eyebrow">{copy.lms.section}</p>{selected.lmsConnections.map((connection) => <div className="list-item" key={connection.id}><div><p className="item-title">{resolveEducationLabel(copy.lms.providers, connection.provider)} · {connection.courseRef} <span className={`status-chip ${connection.status === "verified" ? "tone-green" : "tone-amber"}`}>{resolveEducationLabel(shared.statuses, connection.status)}</span></p><p className="item-meta">{connection.deploymentId ?? copy.lms.deploymentMissing}{connection.verifiedAt ? ` · ${formatDateTime(connection.verifiedAt, locale)}` : ""}{connection.lastRosterSyncAt ? ` · ${copy.lms.rosterSynced} ${formatDateTime(connection.lastRosterSyncAt, locale)}` : ""}</p>{connection.lastError ? <p className="form-status error">{connection.lastError}</p> : null}</div>{connection.status === "verified" && connection.nrpsUrl ? <button type="button" className="button button-secondary button-ghost" disabled={!canOperate || busyId === `lms-sync-${connection.id}`} onClick={() => void syncLmsRoster(connection.id)}>{copy.lms.syncRoster}</button> : null}</div>)}</div> : null}
        </div>
      ) : null}
      {status ? <p className={`form-status ${statusKind}`} role="status" aria-label={copy.statusAria}>{status}</p> : null}
    </section>
  );
}

function formatBytes(value: number, locale: SupportedLocale) {
  if (value < 1024) return `${formatNumber(value, locale)} B`;
  if (value < 1024 * 1024) return `${formatNumber(value / 1024, locale, { maximumFractionDigits: 1 })} KB`;
  return `${formatNumber(value / (1024 * 1024), locale, { maximumFractionDigits: 1 })} MB`;
}
