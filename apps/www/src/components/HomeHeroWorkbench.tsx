"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, UploadIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { localizePublicHref } from "../lib/locale-routing";
import styles from "../app/home-page.module.css";
import { HomeCandidatePreview } from "./HomeCandidatePreview";

type WorkbenchMode = "recognize" | "process" | "transcribe";
type AuthMode = "login" | "register";
type SessionState = "checking" | "anonymous" | "authenticated";
type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

type AuthPayload = { user: { id: string; email: string } };
type ScorePayload = {
  score: { id: string; title: string; pendingRevisionId?: string | null; currentRevisionId: string | null };
};
type JobPayload = {
  jobs: Array<{ id: string; status: JobStatus; progressPercent: number; errorMessage: string | null }>;
};
type OmrImportPayload = ScorePayload & { job: JobPayload["jobs"][number] };

type HomeHeroWorkbenchProps = {
  isChinese: boolean;
  appUrl: string;
  startUrl: string;
  audioAvailable: boolean;
};

const HOME_SCAN_EVENT = "scoretransposer:start-free-scan";
const acceptedScoreFiles = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/pdf,image/png,image/jpeg,image/webp,image/tiff";

const toolLinks = [
  { zh: "在线编辑", en: "Edit online", bodyZh: "校正音高、时值、调号与小节内容", bodyEn: "Correct pitch, duration, keys, and measures", icon: "✎", href: "/score-editor" },
  { zh: "转谱", en: "Convert score", bodyZh: "在 MusicXML 与 MIDI 等结构化格式间转换", bodyEn: "Convert between MusicXML, MIDI, and structured formats", icon: "⇄", href: "/musicxml-midi" },
  { zh: "移调", en: "Transpose", bodyZh: "按目标调或半音数创建新的乐谱版本", bodyEn: "Create a new revision by key or semitone", icon: "↕", href: "/transpose-score" },
  { zh: "生成简谱", en: "Create Jianpu", bodyZh: "从同一份结构化乐谱生成可用简谱", bodyEn: "Create Jianpu from the same structured score", icon: "1·", href: "/staff-to-jianpu" },
  { zh: "乐谱转音频", en: "Score to audio", bodyZh: "播放、变速、循环并生成练习素材", bodyEn: "Play, slow down, loop, and create practice media", icon: "♪", href: "/score-to-audio" },
  { zh: "音视频转谱", en: "Audio to score", bodyZh: "将允许使用的音视频生成待校正候选谱", bodyEn: "Create a reviewable candidate from permitted media", icon: "♫", href: "/audio-to-score" },
] as const;

function localizedApiError(error: string | undefined, isChinese: boolean, fallback: string) {
  const message = error?.trim();
  if (!message) return fallback;
  if (!isChinese) return message;
  if (/invalid email or password/iu.test(message)) return "邮箱或密码不正确，请检查后重试。";
  if (/email already registered/iu.test(message)) return "该邮箱已经注册，请切换到登录。";
  if (/valid email address/iu.test(message)) return "请输入有效的邮箱地址。";
  if (/password must be at least 8/iu.test(message)) return "密码至少需要 8 个字符。";
  if (/free.*(?:trial|scan).*(?:used|limit|remaining)|another scan/iu.test(message)) return "本账户的一个永久免费乐谱项目已经创建；升级后可以处理更多乐谱。";
  if (/page.*(?:limit|count)|single.page|one page/iu.test(message)) return "PDF 文档暂时无法完成验证，请检查文件是否完整、可打开且未加密。";
  if (/file content|supported file type|no pdf or image/iu.test(message)) return "文件内容与支持格式不符，请选择有效的乐谱 PDF 或图片。";
  return fallback;
}

export function HomeHeroWorkbench({ isChinese, appUrl, startUrl, audioAvailable }: HomeHeroWorkbenchProps) {
  const locale = isChinese ? "zh-CN" : "en";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<WorkbenchMode>("recognize");
  const [session, setSession] = useState<SessionState>("checking");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [scoreTitle, setScoreTitle] = useState<string | null>(null);
  const [job, setJob] = useState<JobPayload["jobs"][number] | null>(null);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const copy = isChinese
    ? {
        modes: [
          { id: "recognize" as const, label: "乐谱识别", title: "上传 PDF 或乐谱图片", body: "登录后上传一份完整多页 PDF 或一张乐谱图片，创建可长期校正、播放、转换与导出的免费项目。", formats: ["PDF", "PNG", "JPG", "WEBP", "TIFF"], action: "免费创建", href: "" },
          { id: "process" as const, label: "乐谱处理", title: "导入结构化乐谱", body: "使用同一个乐谱工程继续编辑、移调、生成简谱、播放和导出。", formats: ["MusicXML", "MXL", "MIDI", "Score JSON"], action: "进入乐谱工作台", href: startUrl },
          { id: "transcribe" as const, label: "音视频转谱", title: "导入音乐或视频文件", body: "生成需要人工复核的 MIDI 与五线谱候选；复杂多声部内容仍需校正。", formats: ["MP3", "WAV", "M4A", "MP4", "MOV"], action: audioAvailable ? "开始生成候选谱" : "查看实验能力状态", href: audioAvailable ? startUrl : "/audio-to-score", experimental: true },
        ],
        checking: "正在检查登录状态...", signedIn: "已登录，可选择一份完整乐谱创建免费项目。", signInFirst: "先登录或注册，完成后仍停留在首页。",
        authTitle: "登录后免费创建", authBody: "登录成功后窗口会关闭，仍停留在首页选择一份完整 PDF 或乐谱图片；识别完成即可校正并继续使用项目功能。", login: "登录", register: "注册", email: "邮箱", password: "密码（至少 8 位）", submitting: "请稍候...", authFailed: "登录未完成，请检查邮箱、密码或网络后重试。", close: "关闭登录窗口",
        uploading: "正在安全上传", queued: "已进入识别队列", processing: "正在识别乐谱", completed: "候选谱已生成", failed: "识别未完成", cancelled: "识别已取消",
        candidateTitle: "免费编辑候选", candidateBody: "这是待人工核对的候选稿。进入工程后可免费修改音符、节奏和小节属性。", previewLoading: "正在生成可编辑的五线谱候选...", openProject: "开始免费编辑", retry: "重新选择文件", invalidFile: "请选择 PDF、PNG、JPG、WEBP 或 TIFF 乐谱文件。", uploadFailed: "上传未完成，请检查文件或网络后重试。",
      }
    : {
        modes: [
          { id: "recognize" as const, label: "Recognize", title: "Upload a PDF or score image", body: "Sign in and upload one complete multi-page PDF or score image. Keep the free project for correction, playback, conversion, sharing, and export.", formats: ["PDF", "PNG", "JPG", "WEBP", "TIFF"], action: "Create for free", href: "" },
          { id: "process" as const, label: "Process score", title: "Import structured notation", body: "Keep editing, transposing, converting, playing, and exporting inside one score project.", formats: ["MusicXML", "MXL", "MIDI", "Score JSON"], action: "Open score workspace", href: startUrl },
          { id: "transcribe" as const, label: "Audio to score", title: "Import audio or video", body: "Create a MIDI and notation candidate for review; dense polyphony still requires correction.", formats: ["MP3", "WAV", "M4A", "MP4", "MOV"], action: audioAvailable ? "Create a candidate" : "Check experimental status", href: audioAvailable ? startUrl : "/audio-to-score", experimental: true },
        ],
        checking: "Checking sign-in status...", signedIn: "Signed in. Choose one score page to begin.", signInFirst: "Sign in or register first; you will stay on this homepage.",
        authTitle: "Sign in to create for free", authBody: "After authentication, this dialog closes. Choose one complete PDF or score image, then correct it and use the current project-level tools.", login: "Sign in", register: "Register", email: "Email", password: "Password (8+ characters)", submitting: "Please wait...", authFailed: "Sign-in did not finish. Check your email, password, or connection and try again.", close: "Close sign-in dialog",
        uploading: "Uploading securely", queued: "Waiting in recognition queue", processing: "Recognizing score", completed: "Candidate ready", failed: "Recognition did not finish", cancelled: "Recognition cancelled",
        candidateTitle: "Free editing candidate", candidateBody: "This candidate needs a musical review. Open the project to correct notes, rhythm, and measure attributes for free.", previewLoading: "Creating an editable staff candidate...", openProject: "Start editing for free", retry: "Choose another file", invalidFile: "Choose a PDF, PNG, JPG, WEBP, or TIFF score file.", uploadFailed: "The upload did not finish. Check the file or connection and try again.",
      };

  const activeMode = copy.modes.find((item) => item.id === mode) ?? copy.modes[0];

  const beginFileSelection = useCallback(() => {
    setMode("recognize");
    document.getElementById("home-workbench")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (session !== "authenticated") {
      setAuthError(null);
      setAuthOpen(true);
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }, [session]);

  useEffect(() => {
    void apiRequest<AuthPayload>("/api/auth/me").then((result) => setSession(result.ok ? "authenticated" : "anonymous"));
  }, []);

  useEffect(() => {
    const listener = () => beginFileSelection();
    window.addEventListener(HOME_SCAN_EVENT, listener);
    return () => window.removeEventListener(HOME_SCAN_EVENT, listener);
  }, [beginFileSelection]);

  useEffect(() => {
    const handleHomepageScanLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href="#home-workbench"]') : null;
      if (!link) return;
      event.preventDefault();
      beginFileSelection();
    };
    document.addEventListener("click", handleHomepageScanLink);
    return () => document.removeEventListener("click", handleHomepageScanLink);
  }, [beginFileSelection]);

  useEffect(() => {
    const handleHashStart = () => {
      if (session !== "checking" && window.location.hash === "#home-workbench") beginFileSelection();
    };
    handleHashStart();
    window.addEventListener("hashchange", handleHashStart);
    return () => window.removeEventListener("hashchange", handleHashStart);
  }, [beginFileSelection, session]);

  useEffect(() => {
    if (!authOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [authOpen]);

  const startUpload = useCallback((file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"].includes(extension)) {
      setRecognitionError(copy.invalidFile);
      return;
    }

    setPendingFile(null);
    setRecognitionError(null);
    setMusicXml(null);
    setScoreId(null);
    setScoreTitle(file.name.replace(/\.[^.]+$/u, ""));
    setJob(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/scores/import/omr`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => { setUploadProgress(null); setRecognitionError(copy.uploadFailed); };
    xhr.onload = () => {
      setUploadProgress(null);
      let payload: OmrImportPayload | { error?: string } | null = null;
      try { payload = JSON.parse(xhr.responseText || "null") as OmrImportPayload | { error?: string } | null; } catch { payload = null; }
      if (xhr.status === 401) {
        setSession("anonymous");
        setPendingFile(file);
        setAuthOpen(true);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload || !("score" in payload) || !("job" in payload)) {
        setRecognitionError(localizedApiError(payload && "error" in payload ? payload.error : undefined, isChinese, copy.uploadFailed));
        return;
      }
      setScoreId(payload.score.id);
      setScoreTitle(payload.score.title);
      setJob(payload.job);
    };
    xhr.send(formData);
  }, [copy.invalidFile, copy.uploadFailed, isChinese]);

  useEffect(() => {
    if (!scoreId || job?.status === "failed" || job?.status === "cancelled" || (job?.status === "completed" && musicXml)) return;
    let active = true;
    const refresh = async () => {
      const [scoreResult, jobsResult] = await Promise.all([
        apiRequest<ScorePayload>(`/api/scores/${scoreId}`),
        apiRequest<JobPayload>(`/api/scores/${scoreId}/jobs`),
      ]);
      if (!active) return;
      if (!scoreResult.ok || !jobsResult.ok) {
        setRecognitionError(localizedApiError(!scoreResult.ok ? scoreResult.error : jobsResult.ok ? undefined : jobsResult.error, isChinese, copy.uploadFailed));
        return;
      }
      const latestJob = jobsResult.data.jobs[0] ?? null;
      setJob(latestJob);
      setScoreTitle(scoreResult.data.score.title);
      const hasCandidate = Boolean(scoreResult.data.score.pendingRevisionId);
      const hasCurrent = Boolean(scoreResult.data.score.currentRevisionId);
      if (latestJob?.status === "completed" && (hasCandidate || hasCurrent)) {
        const preview = await apiRequest<{ musicXml: string }>(hasCandidate ? `/api/scores/${scoreId}/candidate/musicxml-preview` : `/api/scores/${scoreId}/musicxml-preview`);
        if (active && preview.ok) setMusicXml(preview.data.musicXml);
      }
      if (latestJob?.status === "failed") setRecognitionError(localizedApiError(latestJob.errorMessage ?? undefined, isChinese, copy.uploadFailed));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [copy.uploadFailed, isChinese, job?.status, musicXml, scoreId]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    const result = await apiRequest<AuthPayload>(`/api/auth/${authMode}`, { method: "POST", body: JSON.stringify({ email, password }) });
    setAuthSubmitting(false);
    if (!result.ok) { setAuthError(localizedApiError(result.error, isChinese, copy.authFailed)); return; }
    setSession("authenticated");
    setAuthOpen(false);
    setPassword("");
    if (pendingFile) startUpload(pendingFile);
    else if (window.location.hash !== "#home-workbench") window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function acceptFile(file: File | undefined) {
    if (!file) return;
    if (session !== "authenticated") { setPendingFile(file); setAuthOpen(true); return; }
    startUpload(file);
  }

  const jobLabel = job ? copy[job.status] : null;
  const busy = uploadProgress !== null || job?.status === "queued" || job?.status === "processing";

  return (
    <div id="home-workbench" className={styles.workbench} aria-label={isChinese ? "AI 乐谱操作台" : "AI score workbench"}>
      <input ref={fileInputRef} className={styles.visuallyHidden} type="file" accept={acceptedScoreFiles} tabIndex={-1} aria-hidden="true" onChange={(event) => acceptFile(event.target.files?.[0])} />
      <div className={styles.workbenchHeading}><span><SparkIcon width={16} height={16} />{isChinese ? "AI 乐谱操作台" : "AI score workbench"}</span><em>{isChinese ? "首页即工作台" : "Homepage workspace"}</em></div>

      <div className={styles.modeTabs} role="tablist" aria-label={isChinese ? "乐谱任务类型" : "Score task type"}>
        {copy.modes.map((item) => <button key={item.id} id={`home-workbench-tab-${item.id}`} type="button" role="tab" aria-controls="home-workbench-panel" aria-selected={item.id === mode} tabIndex={item.id === mode ? 0 : -1} className={item.id === mode ? styles.activeTab : undefined} onClick={() => setMode(item.id)}>{item.label}{item.experimental ? <small>{isChinese ? "实验" : "Experimental"}</small> : null}</button>)}
      </div>

      <div id="home-workbench-panel" className={styles.workbenchPanel} role="tabpanel" aria-labelledby={`home-workbench-tab-${mode}`}>
        {mode === "recognize" ? (
          <button type="button" className={styles.dropZone} disabled={busy} onClick={beginFileSelection} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }}>
            <span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList} aria-label={isChinese ? "支持格式" : "Supported formats"}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span>
          </button>
        ) : (
          <a className={styles.dropZone} href={localizePublicHref(activeMode.href, locale)}><span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span></a>
        )}

        {mode === "recognize" ? <button type="button" className={styles.workbenchAction} onClick={beginFileSelection} disabled={busy}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></button> : <a className={styles.workbenchAction} href={localizePublicHref(activeMode.href, locale)}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></a>}

        {mode === "recognize" && (uploadProgress !== null || job || recognitionError) ? (
          <section className={styles.recognitionPanel} aria-live="polite">
            <div className={styles.recognitionHeading}><div><small>{copy.candidateTitle}</small><strong>{scoreTitle ?? activeMode.title}</strong></div><span className={recognitionError ? styles.statusError : job?.status === "completed" ? styles.statusDone : styles.statusWorking}>{recognitionError ? copy.failed : uploadProgress !== null ? `${copy.uploading} · ${uploadProgress}%` : jobLabel}</span></div>
            {busy ? <div className={styles.progressTrack}><span style={{ width: `${uploadProgress ?? Math.max(8, job?.progressPercent ?? 8)}%` }} /></div> : null}
            {recognitionError ? <p className={styles.recognitionError} role="alert">{recognitionError}</p> : null}
            {job?.status === "completed" ? <p>{copy.candidateBody}</p> : null}
            {job?.status === "completed" ? <HomeCandidatePreview musicXml={musicXml} loadingLabel={copy.previewLoading} /> : null}
            <div className={styles.recognitionActions}>{scoreId ? <a href={`${appUrl}/scores/${scoreId}`}>{copy.openProject}<ArrowNorthEastIcon width={15} height={15} /></a> : null}{!busy ? <button type="button" onClick={beginFileSelection}>{copy.retry}</button> : null}</div>
          </section>
        ) : null}
      </div>

      <nav className={styles.toolRail} aria-label={isChinese ? "可用乐谱功能" : "Available score tools"}>{toolLinks.map((tool) => <a key={tool.href} href={localizePublicHref(tool.href, locale)}><span aria-hidden="true">{tool.icon}</span><strong>{isChinese ? tool.zh : tool.en}</strong><small>{isChinese ? tool.bodyZh : tool.bodyEn}</small><ArrowNorthEastIcon width={17} height={17} /></a>)}</nav>
      <p className={styles.workbenchStatus}><CheckSealIcon width={15} height={15} />{session === "checking" ? copy.checking : session === "authenticated" ? copy.signedIn : copy.signInFirst}</p>

      {authOpen ? (
        <div className={styles.authBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className={styles.authDialog} role="dialog" aria-modal="true" aria-labelledby="home-auth-title">
            <button type="button" className={styles.authClose} aria-label={copy.close} onClick={() => setAuthOpen(false)}>×</button>
            <p className={styles.kicker}>{authMode === "login" ? copy.login : copy.register}</p><h2 id="home-auth-title">{copy.authTitle}</h2><p>{copy.authBody}</p>
            <div className={styles.authTabs} role="tablist"><button type="button" aria-selected={authMode === "login"} onClick={() => { setAuthMode("login"); setAuthError(null); }}>{copy.login}</button><button type="button" aria-selected={authMode === "register"} onClick={() => { setAuthMode("register"); setAuthError(null); }}>{copy.register}</button></div>
            <form onSubmit={submitAuth}><label><span>{copy.email}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus /></label><label><span>{copy.password}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={8} required /></label><button type="submit" disabled={authSubmitting}>{authSubmitting ? copy.submitting : authMode === "login" ? copy.login : copy.register}</button></form>
            {authError ? <p className={styles.authError} role="alert">{authError}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
