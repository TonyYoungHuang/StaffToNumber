"use client";

import { useState } from "react";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, UploadIcon } from "@score/ui";
import styles from "../app/home-page.module.css";

type WorkbenchMode = "recognize" | "process" | "transcribe";

type HomeHeroWorkbenchProps = {
  isChinese: boolean;
  startUrl: string;
  audioAvailable: boolean;
};

const toolLinks = [
  { zh: "在线编辑", en: "Edit online", bodyZh: "校正音高、时值、调号与小节内容", bodyEn: "Correct pitch, duration, keys, and measures", icon: "✎", href: "/score-editor" },
  { zh: "整谱移调", en: "Transpose", bodyZh: "按目标调或半音数创建新的乐谱版本", bodyEn: "Create a new revision by key or semitone", icon: "↕", href: "/transpose-score" },
  { zh: "生成简谱", en: "Create Jianpu", bodyZh: "从同一份结构化乐谱生成可用简谱", bodyEn: "Create Jianpu from the same structured score", icon: "1·", href: "/staff-to-jianpu" },
  { zh: "乐谱转音频", en: "Score to audio", bodyZh: "播放、变速、循环并生成练习素材", bodyEn: "Play, slow down, loop, and create practice media", icon: "♪", href: "/score-to-audio" },
  { zh: "音视频转谱", en: "Audio to score", bodyZh: "将允许使用的音视频生成待校正候选谱", bodyEn: "Create a reviewable candidate from permitted media", icon: "≈", href: "/audio-to-score" },
] as const;

export function HomeHeroWorkbench({ isChinese, startUrl, audioAvailable }: HomeHeroWorkbenchProps) {
  const [mode, setMode] = useState<WorkbenchMode>("recognize");

  const modes = isChinese
    ? [
        {
          id: "recognize" as const,
          label: "乐谱识别",
          title: "上传 PDF 或乐谱图片",
          body: "进入工作台后上传文件，生成带诊断、可人工校正的五线谱候选。",
          formats: ["PDF", "PNG", "JPG", "WEBP", "TIFF"],
          action: "免费识别第一页",
          href: startUrl,
        },
        {
          id: "process" as const,
          label: "乐谱处理",
          title: "导入结构化乐谱",
          body: "使用同一个乐谱工程继续编辑、移调、生成简谱、播放和导出。",
          formats: ["MusicXML", "MXL", "MIDI", "Score JSON"],
          action: "进入乐谱工作台",
          href: startUrl,
        },
        {
          id: "transcribe" as const,
          label: "音视频转谱",
          title: "导入音乐或视频文件",
          body: "生成需要人工复核的 MIDI 与五线谱候选；复杂多声部内容仍需校正。",
          formats: ["MP3", "WAV", "M4A", "MP4", "MOV"],
          action: audioAvailable ? "开始生成候选谱" : "查看实验能力状态",
          href: audioAvailable ? startUrl : "/audio-to-score",
          experimental: true,
        },
      ]
    : [
        {
          id: "recognize" as const,
          label: "Recognize",
          title: "Upload a PDF or score image",
          body: "Open the workspace, upload a file, and create a diagnosable candidate ready for human correction.",
          formats: ["PDF", "PNG", "JPG", "WEBP", "TIFF"],
          action: "Scan one page free",
          href: startUrl,
        },
        {
          id: "process" as const,
          label: "Process score",
          title: "Import structured notation",
          body: "Keep editing, transposing, converting, playing, and exporting inside one score project.",
          formats: ["MusicXML", "MXL", "MIDI", "Score JSON"],
          action: "Open score workspace",
          href: startUrl,
        },
        {
          id: "transcribe" as const,
          label: "Audio to score",
          title: "Import audio or video",
          body: "Create a MIDI and notation candidate for review; dense polyphony still requires correction.",
          formats: ["MP3", "WAV", "M4A", "MP4", "MOV"],
          action: audioAvailable ? "Create a candidate" : "Check experimental status",
          href: audioAvailable ? startUrl : "/audio-to-score",
          experimental: true,
        },
      ];

  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  return (
    <div id="home-workbench" className={styles.workbench} aria-label={isChinese ? "AI 乐谱操作台" : "AI score workbench"}>
      <div className={styles.workbenchHeading}>
        <span><SparkIcon width={16} height={16} />{isChinese ? "AI 乐谱操作台" : "AI score workbench"}</span>
        <em>{isChinese ? "在线工作台" : "Online workspace"}</em>
      </div>

      <div className={styles.modeTabs} role="tablist" aria-label={isChinese ? "乐谱任务类型" : "Score task type"}>
        {modes.map((item) => (
          <button
            key={item.id}
            id={`home-workbench-tab-${item.id}`}
            type="button"
            role="tab"
            aria-controls="home-workbench-panel"
            aria-selected={item.id === mode}
            tabIndex={item.id === mode ? 0 : -1}
            className={item.id === mode ? styles.activeTab : undefined}
            onClick={() => setMode(item.id)}
          >
            {item.label}
            {item.experimental ? <small>{isChinese ? "实验" : "Experimental"}</small> : null}
          </button>
        ))}
      </div>

      <div
        id="home-workbench-panel"
        className={styles.workbenchPanel}
        role="tabpanel"
        aria-labelledby={`home-workbench-tab-${mode}`}
      >
        <a className={styles.dropZone} href={activeMode.href}>
          <span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span>
          <strong>{activeMode.title}</strong>
          <p>{activeMode.body}</p>
          <span className={styles.formatList} aria-label={isChinese ? "支持格式" : "Supported formats"}>
            {activeMode.formats.map((format) => <i key={format}>{format}</i>)}
          </span>
        </a>

        <a className={styles.workbenchAction} href={activeMode.href}>
          {activeMode.action}<ArrowNorthEastIcon width={16} height={16} />
        </a>
      </div>

      <nav className={styles.toolRail} aria-label={isChinese ? "可用乐谱功能" : "Available score tools"}>
        {toolLinks.map((tool) => (
          <a key={tool.href} href={tool.href}>
            <span aria-hidden="true">{tool.icon}</span>
            <strong>{isChinese ? tool.zh : tool.en}</strong>
            <small>{isChinese ? tool.bodyZh : tool.bodyEn}</small>
            <ArrowNorthEastIcon width={17} height={17} />
          </a>
        ))}
      </nav>

      <p className={styles.workbenchStatus}>
        <CheckSealIcon width={15} height={15} />
        {isChinese
          ? "文件在受保护的工程工作台中上传；候选结果需要人工核对。"
          : "Files upload inside the protected project workspace; candidates require human review."}
      </p>
    </div>
  );
}
