"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken } from "../lib/auth-storage";
import { accountActivationRoute } from "../lib/release";
import { useAppLocale } from "./AppLocaleProvider";

type ScoreDocument = {
  id: string;
  title: string;
  status: "imported" | "candidate" | "needs_review" | "ready" | "archived";
  sourceFileId: string | null;
  currentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevision: {
    id: string;
    revisionNumber: number;
    musicxmlFileId: string | null;
    createdFrom: string;
    createdAt: string;
  } | null;
  pendingRevision: {
    id: string;
    revisionNumber: number;
    musicxmlFileId: string | null;
    createdFrom: string;
    createdAt: string;
  } | null;
};

type ScoresPayload = {
  scores: ScoreDocument[];
};

type ImportPayload = {
  score: ScoreDocument;
};

type OmrImportPayload = ImportPayload & {
  job: {
    id: string;
    jobType: string;
    status: string;
  };
};

type AccessPayload = {
  user: {
    entitlement: { status: "inactive" | "active" | "expired" };
    freeTrial: {
      omrJobsUsed: number;
      omrJobsLimit: number;
      omrJobsRemaining: number;
      available: boolean;
      maxSourcePages: number;
    };
  };
};

export type ScoreImportView = "library" | "musicxml" | "backup" | "midi" | "scan" | "audio" | "jianpu";

export function ScoreLibraryManager({ view = "library" }: { view?: ScoreImportView }) {
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const audioTranscriptionAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const [scores, setScores] = useState<ScoreDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [scoreJsonImporting, setScoreJsonImporting] = useState(false);
  const [midiImporting, setMidiImporting] = useState(false);
  const [omrImporting, setOmrImporting] = useState(false);
  const [audioImporting, setAudioImporting] = useState(false);
  const [jianpuImporting, setJianpuImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedScoreJsonFile, setSelectedScoreJsonFile] = useState<File | null>(null);
  const [selectedMidiFile, setSelectedMidiFile] = useState<File | null>(null);
  const [selectedOmrFile, setSelectedOmrFile] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [jianpuTitle, setJianpuTitle] = useState("");
  const [jianpuText, setJianpuText] = useState("1=C\n4/4\n1 2 3 4 | 5 - 5 - | 6 5 3 1 | 2 0 1 - |");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [access, setAccess] = useState<AccessPayload["user"] | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          signInFirst: "请先登录。",
          importFailed: "MusicXML 导入失败。",
          chooseFile: "请选择 .musicxml、.xml 或 .mxl 文件。",
          imported: "乐谱已创建，可以在“我的乐谱”中打开。",
          metrics: {
            projects: ["我的乐谱", "你保存过的乐谱都会显示在这里。"],
            format: ["可继续编辑", "识别或导入后可以校对、移调、播放和导出。"],
            revisions: ["有修改记录", "修改前的版本会保留，需要时可以找回。"],
          },
          import: {
            eyebrow: "从制谱软件导入",
            title: "选择 MusicXML 文件",
            body: "如果你使用 MuseScore、Sibelius、Finale 等制谱软件，可把导出的 MusicXML 文件带到这里继续编辑。",
            dropTitle: "点击选择文件",
            dropBody: "支持 .musicxml、.xml 和 .mxl 文件。",
            selected: "已选择",
            empty: "尚未选择文件。",
            button: "导入 MusicXML",
            importing: "导入中...",
            clear: "清空选择",
          },
          list: {
            eyebrow: "我的乐谱",
            title: "已保存的乐谱",
            body: "打开任意乐谱，继续校对、转简谱、移调、播放或导出。",
            loading: "正在加载乐谱...",
            empty: "这里还没有乐谱。创建第一份乐谱后，它会出现在这里。",
            open: "打开乐谱",
            source: "原文件",
            revision: "修改记录",
          },
        }
      : {
          signInFirst: "Please sign in first.",
          importFailed: "MusicXML import failed.",
          chooseFile: "Please choose a .musicxml, .xml, or .mxl file.",
          imported: "Your score has been added to My Scores.",
          metrics: {
            projects: ["My scores", "Every score you save appears here."],
            format: ["Ready to edit", "After recognition or import, continue correcting, transposing, practicing, and exporting."],
            revisions: ["Edit history", "Earlier versions stay available when you need them."],
          },
          import: {
            eyebrow: "Import from notation software",
            title: "Choose a MusicXML file",
            body: "Bring in a MusicXML export from MuseScore, Sibelius, Finale, or another notation app and continue editing here.",
            dropTitle: "Choose a file",
            dropBody: "Supports .musicxml, .xml, and .mxl files.",
            selected: "Selected",
            empty: "No file selected yet.",
            button: "Import MusicXML",
            importing: "Importing...",
            clear: "Clear selection",
          },
          list: {
            eyebrow: "My scores",
            title: "Saved scores",
            body: "Open a score to continue correcting, converting, transposing, practicing, or exporting.",
            loading: "Loading scores...",
            empty: "No scores yet. Create your first score and it will appear here.",
            open: "Open score",
            source: "Source file",
            revision: "Edit history",
          },
        };
  const omrCopy =
    locale === "zh-CN"
      ? {
          chooseFile: "请选择 PDF 或图片文件。",
          importFailed: "OMR 导入任务创建失败。",
          imported: "文件已上传，正在识别。完成后可在“我的乐谱”中查看并校对。",
          eyebrow: "乐谱识别",
          title: "上传 PDF 或乐谱图片",
          body: "把纸质谱或 PDF 变成可查看、可校对的电子乐谱。复杂谱面可能需要你手动确认少量音符。",
          dropTitle: "点击选择 PDF 或图片",
          dropBody: "支持 PDF、PNG、JPG、WEBP 和 TIFF。",
          selected: "已选择",
          empty: "尚未选择扫描件。",
          button: "开始识别",
          importing: "正在上传...",
          clear: "重新选择",
        }
      : {
          chooseFile: "Please choose a PDF or image file.",
          importFailed: "OMR import job could not be created.",
          imported: "Your file is uploaded and recognition has started. Review it later in My Scores.",
          eyebrow: "Score recognition",
          title: "Upload a PDF or score image",
          body: "Turn a printed score or PDF into a score you can review and correct. Complex notation may need a few manual fixes.",
          dropTitle: "Choose a PDF or image",
          dropBody: "Supports PDF, PNG, JPG, WEBP, and TIFF.",
          selected: "Selected",
          empty: "No scan selected yet.",
          button: "Start recognition",
          importing: "Uploading...",
          clear: "Choose another file",
        };
  const scoreJsonCopy =
    locale === "zh-CN"
      ? {
          chooseFile: "请选择乐谱备份文件。",
          importFailed: "备份恢复失败。",
          imported: "乐谱备份已恢复。",
          eyebrow: "恢复备份",
          title: "选择乐谱备份文件",
          body: "如果你之前从本网站下载过乐谱备份，可以在这里恢复并继续编辑。",
          dropTitle: "点击选择备份文件",
          dropBody: "支持 .score.json 和 .json 文件。",
          selected: "已选择",
          empty: "尚未选择 Score JSON 快照。",
          button: "恢复乐谱",
          importing: "正在导入...",
          clear: "重新选择",
        }
      : {
          chooseFile: "Please choose a score backup file.",
          importFailed: "The backup could not be restored.",
          imported: "Your score backup has been restored.",
          eyebrow: "Restore a backup",
          title: "Choose a score backup",
          body: "Restore a score backup previously downloaded from this site and continue editing it.",
          dropTitle: "Choose a backup file",
          dropBody: "Supports .score.json and .json files.",
          selected: "Selected",
          empty: "No Score JSON snapshot selected yet.",
          button: "Restore score",
          importing: "Importing...",
          clear: "Choose another file",
        };
  const midiCopy =
    locale === "zh-CN"
      ? {
          chooseFile: "请选择 MIDI 文件。",
          importFailed: "MIDI 导入失败。",
          imported: "MIDI 已导入，可以在“我的乐谱”中打开。",
          eyebrow: "导入 MIDI",
          title: "选择 MIDI 文件",
          body: "把 MIDI 中的音符和节奏转换成可查看、播放和移调的乐谱。复杂排版可能需要手动调整。",
          dropTitle: "点击选择 .mid 或 .midi 文件",
          dropBody: "支持标准 MIDI 文件。",
          selected: "已选择",
          empty: "尚未选择 MIDI 文件。",
          button: "导入 MIDI",
          importing: "正在导入...",
          clear: "清空 MIDI",
        }
      : {
          chooseFile: "Please choose a MIDI file.",
          importFailed: "MIDI import failed.",
          imported: "MIDI converted into a score project.",
          eyebrow: "Foundation",
          title: "Choose a MIDI file",
          body: "Turn MIDI notes and rhythm into a score you can view, play, and transpose. Complex engraving may need manual adjustment.",
          dropTitle: "Choose a .mid or .midi file",
          dropBody: "Supports standard MIDI files.",
          selected: "Selected",
          empty: "No MIDI file selected yet.",
          button: "Import MIDI",
          importing: "Importing...",
          clear: "Clear MIDI",
        };
  const audioCopy =
    locale === "zh-CN"
      ? {
          chooseFile: "请选择音频文件。",
          importFailed: "音频转谱任务创建失败。",
          imported: "音频已上传，正在尝试生成乐谱。完成后请检查音高和节奏。",
          eyebrow: "录音转乐谱（试用功能）",
          title: "选择录音文件",
          body: "上传一段旋律录音，系统会尝试生成可编辑乐谱。多人合奏、噪声或复杂和声可能影响结果。",
          dropTitle: "点击选择音频",
          dropBody: "支持 WAV、MP3、M4A、AAC、FLAC、OGG 和 AIFF。",
          selected: "已选择",
          empty: "尚未选择音频。",
          button: "开始转谱",
          importing: "正在上传...",
          clear: "重新选择",
        }
      : {
          chooseFile: "Please choose an audio file.",
          importFailed: "Audio transcription job could not be created.",
          imported: "Audio transcription project created. Basic Pitch will try to create MIDI and a first-pass editable score revision.",
          eyebrow: "Phase 7",
          title: "Choose a recording",
          body: "Upload a melody recording and the site will try to create an editable score. Ensembles, noise, and complex harmony can reduce accuracy.",
          dropTitle: "Choose an audio file",
          dropBody: "Supports WAV, MP3, M4A, AAC, FLAC, OGG, and AIFF.",
          selected: "Selected",
          empty: "No audio selected yet.",
          button: "Start transcription",
          importing: "Uploading...",
          clear: "Choose another file",
        };
  const jianpuCopy =
    locale === "zh-CN"
      ? {
          empty: "请输入简谱文本。",
          importFailed: "简谱导入失败。",
          imported: "简谱已生成，可以在“我的乐谱”中查看五线谱并继续编辑。",
          eyebrow: "简谱转五线谱",
          title: "输入简谱",
          body: "填写调号、拍号和数字音符，系统会生成对应五线谱。生成后可以播放、移调和导出。",
          titleLabel: "乐谱标题",
          titlePlaceholder: "例如：小星星简谱",
          textLabel: "简谱文本",
          textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |",
          button: "导入简谱",
          importing: "正在导入...",
          clear: "恢复示例",
        }
      : {
          empty: "Please enter Jianpu text.",
          importFailed: "Jianpu import failed.",
          imported: "Jianpu score project created. Preview, transpose, playback, and MusicXML export can use it now.",
          eyebrow: "Phase 2",
          title: "Enter numbered notation",
          body: "Enter the key, meter, numbered notes, rests, and barlines to create a staff score you can play, transpose, and export.",
          titleLabel: "Score title",
          titlePlaceholder: "Example: Twinkle in Jianpu",
          textLabel: "Jianpu text",
          textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |",
          button: "Import Jianpu",
          importing: "Importing...",
          clear: "Restore sample",
        };

  async function loadScores() {
    if (!token) {
      setLoading(false);
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    const result = await apiRequest<ScoresPayload>("/api/scores", {
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

    setScores(result.data.scores);
  }

  useEffect(() => {
    void loadScores();
    void loadAccess();
  }, []);

  async function loadAccess() {
    if (!token) return;
    const result = await apiRequest<AccessPayload>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.ok) setAccess(result.data.user);
  }

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedFile) {
      setStatus(copy.chooseFile);
      setStatusKind("error");
      return;
    }

    setImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/musicxml`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? copy.importFailed : copy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(copy.imported);
      setStatusKind("success");
      setSelectedFile(null);
      const input = document.getElementById("musicxml-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
      await loadAccess();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.importFailed);
      setStatusKind("error");
    } finally {
      setImporting(false);
    }
  }

  async function handleOmrImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedOmrFile) {
      setStatus(omrCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setOmrImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedOmrFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/omr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as OmrImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? omrCopy.importFailed : omrCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(omrCopy.imported);
      setStatusKind("success");
      const extension = selectedOmrFile.name.split(".").pop()?.toLowerCase() || "unknown";
      trackFunnelEvent("free_omr_created", {
        free_trial: !hasPaidAccess,
        source_type: extension === "pdf" ? "pdf" : "image",
      });
      setSelectedOmrFile(null);
      const input = document.getElementById("score-scan-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
      await loadAccess();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : omrCopy.importFailed);
      setStatusKind("error");
    } finally {
      setOmrImporting(false);
    }
  }

  async function handleScoreJsonImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedScoreJsonFile) {
      setStatus(scoreJsonCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setScoreJsonImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedScoreJsonFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/score-json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? scoreJsonCopy.importFailed : scoreJsonCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(scoreJsonCopy.imported);
      setStatusKind("success");
      setSelectedScoreJsonFile(null);
      const input = document.getElementById("score-json-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : scoreJsonCopy.importFailed);
      setStatusKind("error");
    } finally {
      setScoreJsonImporting(false);
    }
  }

  async function handleMidiImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedMidiFile) {
      setStatus(midiCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setMidiImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedMidiFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/midi`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? midiCopy.importFailed : midiCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(midiCopy.imported);
      setStatusKind("success");
      setSelectedMidiFile(null);
      const input = document.getElementById("midi-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : midiCopy.importFailed);
      setStatusKind("error");
    } finally {
      setMidiImporting(false);
    }
  }

  async function handleAudioImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedAudioFile) {
      setStatus(audioCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setAudioImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedAudioFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as OmrImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? audioCopy.importFailed : audioCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(audioCopy.imported);
      setStatusKind("success");
      setSelectedAudioFile(null);
      const input = document.getElementById("audio-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : audioCopy.importFailed);
      setStatusKind("error");
    } finally {
      setAudioImporting(false);
    }
  }

  async function handleJianpuImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!jianpuText.trim()) {
      setStatus(jianpuCopy.empty);
      setStatusKind("error");
      return;
    }

    setJianpuImporting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<ImportPayload>("/api/scores/import/jianpu", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: jianpuTitle,
        text: jianpuText,
      }),
    });

    setJianpuImporting(false);

    if (!result.ok) {
      setStatus(result.error || jianpuCopy.importFailed);
      setStatusKind("error");
      return;
    }

    setStatus(jianpuCopy.imported);
    setStatusKind("success");
    setJianpuTitle("");
    await loadScores();
  }

  const revisionCount = scores.filter((score) => score.pendingRevision || score.currentRevision).length;
  const statusTone = status ? statusKind : null;
  const hasPaidAccess = access?.entitlement.status === "active";
  const freeTrialAvailable = access?.freeTrial.available ?? false;

  return (
    <div className="page-stack">
      {view === "library" && access && !hasPaidAccess ? (
        <section className="surface-panel stack-sm">
          <p className="eyebrow">{locale === "zh-CN" ? "免费单页预览" : "Free one-page preview"}</p>
          <h2 className="card-title">
            {freeTrialAvailable
              ? locale === "zh-CN" ? "你可以免费识别一页 PDF 或一张乐谱图片。" : "You can scan one PDF page or one score image for free."
              : locale === "zh-CN" ? "免费预览已经使用。" : "Your free preview has been used."}
          </h2>
          <p className="body-copy">
            {locale === "zh-CN"
              ? "免费层可以查看识别后的五线谱，但不提供下载。再次识别、多页处理、校对和完整导出需要开通权限。"
              : "The free tier shows the recognized staff score without downloads. Additional scans, multi-page processing, correction, and exports require access."}
          </p>
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
              {freeTrialAvailable
                ? locale === "zh-CN" ? "开始免费预览" : "Start free preview"
                : locale === "zh-CN" ? "查看试用工程" : "View trial project"}
            </Link>
            <Link
              href={accountActivationRoute}
              className="button button-secondary"
              onClick={() => trackFunnelEvent("upgrade_click", { source: "score_library_trial_banner" })}
            >
              {locale === "zh-CN" ? "开通完整功能" : "Unlock full access"}
            </Link>
          </div>
        </section>
      ) : null}

      {view === "library" ? <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.projects[0]}</p>
          <p className="metric-value">{scores.length}</p>
          <p className="helper-copy">{copy.metrics.projects[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.format[0]}</p>
            <p className="metric-value">{locale === "zh-CN" ? "可编辑" : "Editable"}</p>
          <p className="helper-copy">{copy.metrics.format[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.revisions[0]}</p>
          <p className="metric-value">{revisionCount}</p>
          <p className="helper-copy">{copy.metrics.revisions[1]}</p>
        </div>
      </div> : null}

      <section className={`surface-panel${view === "library" ? "" : " single-task-panel"}`}>
        {view === "musicxml" && hasPaidAccess ? <form id="musicxml-import" onSubmit={handleImport} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.import.eyebrow}</p>
            <h2 className="card-title">{copy.import.title}</h2>
            <p className="body-copy">{copy.import.body}</p>
          </div>

          <label htmlFor="musicxml-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{copy.import.dropTitle}</p>
              <p className="dropzone-copy">{copy.import.dropBody}</p>
            </div>
            <span className="status-chip tone-cyan">MusicXML</span>
          </label>
          <input
            id="musicxml-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".musicxml,.xml,.mxl,application/xml,text/xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          {selectedFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{copy.import.selected}</p>
              <p className="item-title">{selectedFile.name}</p>
              <p className="helper-copy">{formatSize(selectedFile.size)}</p>
            </div>
          ) : (
            <div className="empty-state">{copy.import.empty}</div>
          )}

          <div className="button-row">
            <button type="submit" disabled={importing || !hasPaidAccess} className="button button-primary">
              {importing ? copy.import.importing : copy.import.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedFile(null)}>
              {copy.import.clear}
            </button>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
        </form> : null}

        {view === "backup" && hasPaidAccess ? <div id="score-json-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{scoreJsonCopy.eyebrow}</p>
            <h2 className="card-title">{scoreJsonCopy.title}</h2>
            <p className="body-copy">{scoreJsonCopy.body}</p>
          </div>

          <label htmlFor="score-json-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{scoreJsonCopy.dropTitle}</p>
              <p className="dropzone-copy">{scoreJsonCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-cyan">Score JSON</span>
          </label>
          <input
            id="score-json-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".score.json,.json,application/json"
            onChange={(event) => setSelectedScoreJsonFile(event.target.files?.[0] ?? null)}
          />

          {selectedScoreJsonFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{scoreJsonCopy.selected}</p>
              <p className="item-title">{selectedScoreJsonFile.name}</p>
              <p className="helper-copy">{formatSize(selectedScoreJsonFile.size)}</p>
            </div>
          ) : (
            <div className="empty-state">{scoreJsonCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={scoreJsonImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleScoreJsonImport()}>
              {scoreJsonImporting ? scoreJsonCopy.importing : scoreJsonCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedScoreJsonFile(null)}>
              {scoreJsonCopy.clear}
            </button>
          </div>
        </div> : null}

        {view === "midi" && hasPaidAccess ? <div id="midi-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{midiCopy.eyebrow}</p>
            <h2 className="card-title">{midiCopy.title}</h2>
            <p className="body-copy">{midiCopy.body}</p>
          </div>

          <label htmlFor="midi-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{midiCopy.dropTitle}</p>
              <p className="dropzone-copy">{midiCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-primary">MIDI</span>
          </label>
          <input
            id="midi-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".mid,.midi,audio/midi,audio/x-midi"
            onChange={(event) => setSelectedMidiFile(event.target.files?.[0] ?? null)}
          />

          {selectedMidiFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{midiCopy.selected}</p>
              <p className="item-title">{selectedMidiFile.name}</p>
              <p className="helper-copy">{formatSize(selectedMidiFile.size)}</p>
            </div>
          ) : (
            <div className="empty-state">{midiCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={midiImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleMidiImport()}>
              {midiImporting ? midiCopy.importing : midiCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedMidiFile(null)}>
              {midiCopy.clear}
            </button>
          </div>
        </div> : null}

        {view === "scan" ? <div id="score-scan" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{omrCopy.eyebrow}</p>
            <h2 className="card-title">{omrCopy.title}</h2>
            <p className="body-copy">{omrCopy.body}</p>
          </div>

          <label htmlFor="score-scan-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{omrCopy.dropTitle}</p>
              <p className="dropzone-copy">{omrCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-amber">PDF / JPG</span>
          </label>
          <input
            id="score-scan-input"
            className="sr-only"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/pdf,image/*"
            onChange={(event) => setSelectedOmrFile(event.target.files?.[0] ?? null)}
          />

          {selectedOmrFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{omrCopy.selected}</p>
              <p className="item-title">{selectedOmrFile.name}</p>
              <p className="helper-copy">{formatSize(selectedOmrFile.size)}</p>
            </div>
          ) : (
            <div className="empty-state">{omrCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={omrImporting || (!hasPaidAccess && !freeTrialAvailable)} className="button button-primary" onClick={() => void handleOmrImport()}>
              {omrImporting ? omrCopy.importing : omrCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedOmrFile(null)}>
              {omrCopy.clear}
            </button>
          </div>
        </div> : null}

        {view === "audio" && hasPaidAccess && audioTranscriptionAvailable ? <div id="audio-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{audioCopy.eyebrow}</p>
            <h2 className="card-title">{audioCopy.title}</h2>
            <p className="body-copy">{audioCopy.body}</p>
          </div>

          <label htmlFor="audio-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{audioCopy.dropTitle}</p>
              <p className="dropzone-copy">{audioCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-primary">Audio</span>
          </label>
          <input
            id="audio-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".wav,.mp3,.m4a,.aac,.flac,.ogg,.aif,.aiff,audio/*"
            onChange={(event) => setSelectedAudioFile(event.target.files?.[0] ?? null)}
          />

          {selectedAudioFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{audioCopy.selected}</p>
              <p className="item-title">{selectedAudioFile.name}</p>
              <p className="helper-copy">{formatSize(selectedAudioFile.size)}</p>
            </div>
          ) : (
            <div className="empty-state">{audioCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={audioImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleAudioImport()}>
              {audioImporting ? audioCopy.importing : audioCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedAudioFile(null)}>
              {audioCopy.clear}
            </button>
          </div>
        </div> : null}

        {view === "jianpu" && hasPaidAccess ? <form id="jianpu-import" onSubmit={handleJianpuImport} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{jianpuCopy.eyebrow}</p>
            <h2 className="card-title">{jianpuCopy.title}</h2>
            <p className="body-copy">{jianpuCopy.body}</p>
          </div>

          <label className="field-group">
            <span className="field-label">{jianpuCopy.titleLabel}</span>
            <input
              className="field-control"
              disabled={!hasPaidAccess}
              value={jianpuTitle}
              placeholder={jianpuCopy.titlePlaceholder}
              onChange={(event) => setJianpuTitle(event.target.value)}
            />
          </label>

          <label className="field-group">
            <span className="field-label">{jianpuCopy.textLabel}</span>
            <textarea
              className="field-control"
              disabled={!hasPaidAccess}
              rows={8}
              value={jianpuText}
              placeholder={jianpuCopy.textPlaceholder}
              onChange={(event) => setJianpuText(event.target.value)}
            />
          </label>

          <div className="button-row">
            <button type="submit" disabled={jianpuImporting || !hasPaidAccess} className="button button-primary">
              {jianpuImporting ? jianpuCopy.importing : jianpuCopy.button}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setJianpuTitle("");
                setJianpuText("1=C\n4/4\n1 2 3 4 | 5 - 5 - | 6 5 3 1 | 2 0 1 - |");
              }}
            >
              {jianpuCopy.clear}
            </button>
          </div>
        </form> : null}

        {view === "library" ? <div className="preview-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.list.eyebrow}</p>
            <h2 className="card-title">{copy.list.title}</h2>
            <p className="body-copy">{copy.list.body}</p>
          </div>

          {loading ? <div className="empty-state">{copy.list.loading}</div> : null}
          {!loading && scores.length === 0 ? <div className="empty-state">{copy.list.empty}</div> : null}

          {!loading && scores.length > 0 ? (
            <div className="list-grid">
              {scores.map((score) => (
                <div key={score.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">{score.title}</p>
                    <p className="item-meta">
                      {translateStatus(score.status, locale)} | {copy.list.revision}{" "}
                      {(score.pendingRevision ?? score.currentRevision)?.revisionNumber ?? 0} | {formatLocal(score.updatedAt, locale)}
                    </p>
                  </div>
                  <Link href={`${APP_ROUTES.scores}/${score.id}`} className="button button-secondary button-ghost">
                    {copy.list.open}
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new`} className="button button-primary">
              {locale === "zh-CN" ? "创建新乐谱" : "Create a new score"}
            </Link>
          </div>
        </div> : null}

        {view !== "library" && view !== "musicxml" && status && statusTone ? (
          <p className={`form-status ${statusTone}`}>{status}</p>
        ) : null}
      </section>
    </div>
  );
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function translateStatus(status: ScoreDocument["status"], locale: string) {
  if (locale !== "zh-CN") {
    return status;
  }

  switch (status) {
    case "imported":
      return "已导入";
    case "candidate":
      return "待校对";
    case "needs_review":
      return "待确认";
    case "ready":
      return "可使用";
    case "archived":
      return "已归档";
    default:
      return status;
  }
}
