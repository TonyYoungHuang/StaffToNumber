"use client";

import { useEffect, useRef, useState } from "react";
import { StatusPill } from "@score/ui";
import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";
import { apiRequest } from "../lib/api";
import { analyzePracticePerformance, type PracticePerformanceAnalysis } from "../lib/practice-performance-analysis";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";

type RecorderStatus = "idle" | "requesting" | "count_in" | "recording" | "paused" | "ready" | "error";

function recorderFormat() {
  const candidates = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function recordingExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PracticeRecorder({ locale, value, playbackEndpoint, practiceSettings, selectedEventId, onEventSelect, onAnalysis, onRecording }: {
  locale: string;
  value: File | null;
  playbackEndpoint?: string | null;
  practiceSettings?: {
    soloPartIds: string[];
    mutedPartIds: string[];
    loopEnabled: boolean;
    loopStartBeat: number;
    loopEndBeat: number;
  };
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
  onAnalysis?: (analysis: PracticePerformanceAnalysis | null) => void;
  onRecording: (file: File | null) => void;
}) {
  const isChinese = locale === "zh-CN";
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const decodedRef = useRef<{ samples: Float32Array; sampleRate: number; playback: PlaybackDocument; events: PlaybackNoteEvent[]; scoreRevisionId: string | null } | null>(null);
  const recordedFileRef = useRef<File | null>(null);
  const discardRef = useRef(false);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [countInBeats, setCountInBeats] = useState(4);
  const [countInRemaining, setCountInRemaining] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PracticePerformanceAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [manualStart, setManualStart] = useState("0");
  const [manualScale, setManualScale] = useState("1");

  const copy = isChinese
    ? {
        title: "浏览器直接录音",
        device: "麦克风",
        defaultDevice: "系统默认麦克风",
        countIn: "预备拍",
        beats: "拍",
        start: "开始录音",
        requesting: "正在请求麦克风权限...",
        pause: "暂停",
        resume: "继续",
        stop: "停止",
        cancel: "取消",
        rerecord: "重录",
        ready: "录音已挂到本次作业，可试听后提交。",
        unsupported: "当前浏览器不支持 MediaRecorder 录音。",
        denied: "无法使用麦克风，请检查浏览器权限和输入设备。",
        recording: "录音中",
        paused: "已暂停",
        countInStatus: "准备",
        analysis: "逐音练习反馈",
        analyzing: "正在对齐录音与乐谱...",
        analysisFailed: "无法分析这段录音，可继续提交并由老师人工批阅。",
        completeness: "检测完整度",
        alignment: "时间对齐",
        startOffset: "录音起点（秒）",
        timeScale: "时间伸缩",
        applyAlignment: "应用人工对齐",
        measure: "小节",
        detected: "已检测",
        pitchAttention: "音高需关注",
        rhythmAttention: "节奏需关注",
        polyphonic: "复音未评分",
        jump: "试听此音",
      }
    : {
        title: "Record in this browser",
        device: "Microphone",
        defaultDevice: "System default microphone",
        countIn: "Count-in",
        beats: "beats",
        start: "Start recording",
        requesting: "Requesting microphone access...",
        pause: "Pause",
        resume: "Resume",
        stop: "Stop",
        cancel: "Cancel",
        rerecord: "Record again",
        ready: "The recording is attached to this submission. Review it before submitting.",
        unsupported: "This browser does not support MediaRecorder.",
        denied: "The microphone is unavailable. Check browser permission and the selected input device.",
        recording: "Recording",
        paused: "Paused",
        countInStatus: "Get ready",
        analysis: "Per-note practice feedback",
        analyzing: "Aligning the recording with the score...",
        analysisFailed: "This recording could not be analyzed. It can still be submitted for teacher review.",
        completeness: "Detected completeness",
        alignment: "Timeline alignment",
        startOffset: "Recording start (seconds)",
        timeScale: "Time scale",
        applyAlignment: "Apply manual alignment",
        measure: "Measure",
        detected: "Detected",
        pitchAttention: "Pitch attention",
        rhythmAttention: "Rhythm attention",
        polyphonic: "Polyphonic unscored",
        jump: "Play this note",
      };

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    recordedFileRef.current = null;
    setPreviewUrl(null);
    decodedRef.current = null;
    setAnalysis(null);
    onAnalysis?.(null);
    setAnalysisError(null);
  }

  function filteredEvents(playback: PlaybackDocument) {
    const solo = new Set(practiceSettings?.soloPartIds ?? []);
    const muted = new Set(practiceSettings?.mutedPartIds ?? []);
    return playback.events.filter((event) => {
      if (solo.size > 0 && !solo.has(event.partId)) return false;
      if (muted.has(event.partId)) return false;
      if (practiceSettings?.loopEnabled && (event.startBeat >= practiceSettings.loopEndBeat || event.startBeat + event.durationBeats <= practiceSettings.loopStartBeat)) return false;
      return true;
    });
  }

  async function analyzeBlob(blob: Blob) {
    if (!playbackEndpoint) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const [playbackResult, audioBuffer] = await Promise.all([
        apiRequest<{ playback: PlaybackDocument; revisionId?: string | null }>(playbackEndpoint),
        blob.arrayBuffer(),
      ]);
      if (!playbackResult.ok) throw new Error(playbackResult.error);
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(audioBuffer.slice(0));
      const samples = new Float32Array(decoded.getChannelData(0));
      await context.close();
      const events = filteredEvents(playbackResult.data.playback);
      const scoreRevisionId = playbackResult.data.revisionId ?? null;
      decodedRef.current = { samples, sampleRate: decoded.sampleRate, playback: playbackResult.data.playback, events, scoreRevisionId };
      const result = analyzePracticePerformance({ samples, sampleRate: decoded.sampleRate, playback: playbackResult.data.playback, events, scoreRevisionId });
      setAnalysis(result);
      onAnalysis?.(result);
      setManualStart(result.alignment.recordingStartSeconds.toFixed(3));
      setManualScale(result.alignment.timeScale.toFixed(3));
    } catch {
      decodedRef.current = null;
      setAnalysis(null);
      setAnalysisError(copy.analysisFailed);
    } finally {
      setAnalyzing(false);
    }
  }

  function applyManualAlignment() {
    const decoded = decodedRef.current;
    const recordingStartSeconds = Number(manualStart);
    const timeScale = Number(manualScale);
    if (!decoded || !Number.isFinite(recordingStartSeconds) || !Number.isFinite(timeScale)) return;
    const result = analyzePracticePerformance({ ...decoded, alignment: { recordingStartSeconds, timeScale } });
    setAnalysis(result);
    onAnalysis?.(result);
  }

  function seekToFeedback(eventId: string) {
    const feedback = analysis?.events.find((event) => event.sourceEventId === eventId);
    if (feedback && previewAudioRef.current) previewAudioRef.current.currentTime = feedback.recordingTimeSeconds;
    onEventSelect?.(eventId);
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const audioInputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
    setDevices(audioInputs);
    if (deviceId && !audioInputs.some((device) => device.deviceId === deviceId)) setDeviceId("");
  }

  function beep() {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.09);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  }

  function beginRecorder(stream: MediaStream) {
    const mimeType = recorderFormat();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    discardRef.current = false;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      releaseStream();
      recorderRef.current = null;
      if (discardRef.current || chunksRef.current.length === 0) {
        chunksRef.current = [];
        setStatus("idle");
        return;
      }
      const finalType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: finalType });
      const file = new File([blob], `practice-recording-${Date.now()}.${recordingExtension(finalType)}`, { type: finalType });
      chunksRef.current = [];
      clearPreview();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      recordedFileRef.current = file;
      setPreviewUrl(url);
      setStatus("ready");
      onRecording(file);
      void analyzeBlob(blob);
    };
    recorder.onerror = () => {
      releaseStream();
      setError(copy.denied);
      setStatus("error");
    };
    recorder.start(250);
    setElapsedSeconds(0);
    setStatus("recording");
  }

  function runCountIn(stream: MediaStream) {
    if (countInBeats === 0) {
      beginRecorder(stream);
      return;
    }
    setStatus("count_in");
    let remaining = countInBeats;
    const tick = () => {
      setCountInRemaining(remaining);
      beep();
      remaining -= 1;
      if (remaining === 0) {
        countInTimerRef.current = setTimeout(() => {
          setCountInRemaining(0);
          beginRecorder(stream);
        }, 1_000);
        return;
      }
      countInTimerRef.current = setTimeout(tick, 1_000);
    };
    tick();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(copy.unsupported);
      setStatus("error");
      return;
    }
    setError(null);
    clearPreview();
    onRecording(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : true,
        video: false,
      });
      streamRef.current = stream;
      await refreshDevices();
      runCountIn(stream);
    } catch {
      releaseStream();
      setError(copy.denied);
      setStatus("error");
    }
  }

  function pauseOrResume() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setStatus("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      setStatus("recording");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function discardRecording() {
    discardRef.current = true;
    if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    else releaseStream();
    clearPreview();
    onRecording(null);
    setElapsedSeconds(0);
    setStatus("idle");
  }

  useEffect(() => {
    void refreshDevices();
    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1_000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (value || !recordedFileRef.current) return;
    clearPreview();
    setElapsedSeconds(0);
    setStatus("idle");
  }, [value]);

  useEffect(() => {
    if (selectedEventId) seekToFeedback(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => () => {
    discardRef.current = true;
    if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    releaseStream();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  return (
    <div className="list-item stack-md">
      <div className="score-review-toolbar">
        <p className="item-title">{copy.title}</p>
        <StatusPill tone={status === "ready" ? "green" : status === "error" ? "red" : status === "recording" ? "cyan" : "amber"}>
          {status === "recording" ? `${copy.recording} ${formatSeconds(elapsedSeconds)}` : status === "paused" ? `${copy.paused} ${formatSeconds(elapsedSeconds)}` : status === "count_in" ? `${copy.countInStatus} ${countInRemaining}` : status}
        </StatusPill>
      </div>
      <div className="form-grid">
        <label className="field-group">
          <span>{copy.device}</span>
          <select className="field-select" value={deviceId} disabled={["requesting", "count_in", "recording", "paused"].includes(status)} onChange={(event) => setDeviceId(event.target.value)}>
            <option value="">{copy.defaultDevice}</option>
            {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${copy.device} ${index + 1}`}</option>)}
          </select>
        </label>
        <label className="field-group">
          <span>{copy.countIn}</span>
          <select className="field-select" value={countInBeats} disabled={["requesting", "count_in", "recording", "paused"].includes(status)} onChange={(event) => setCountInBeats(Number(event.target.value))}>
            {[0, 2, 4].map((beats) => <option key={beats} value={beats}>{beats} {copy.beats}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="form-status error">{error}</p> : null}
      {status === "requesting" ? <p className="helper-copy">{copy.requesting}</p> : null}
      {status === "ready" && previewUrl ? <><AudioWaveformPlayer ref={previewAudioRef} src={previewUrl} locale={locale} markers={analysis?.events.map((event) => event.recordingTimeSeconds) ?? []} /><p className="form-status success">{copy.ready}</p></> : null}
      {analyzing ? <p className="helper-copy">{copy.analyzing}</p> : null}
      {analysisError ? <p className="form-status error">{analysisError}</p> : null}
      {analysis ? (
        <div className="stack-md">
          <div className="score-review-toolbar">
            <p className="item-title">{copy.analysis}</p>
            <StatusPill tone={analysis.completeness.ratio >= 0.8 ? "green" : "amber"}>{copy.completeness}: {analysis.completeness.detected}/{analysis.completeness.expected}</StatusPill>
          </div>
          <div className="form-grid">
            <label className="field-group"><span>{copy.startOffset}</span><input className="field-control" type="number" min={0} step={0.01} value={manualStart} onChange={(event) => setManualStart(event.target.value)} /></label>
            <label className="field-group"><span>{copy.timeScale}</span><input className="field-control" type="number" min={0.5} max={2} step={0.01} value={manualScale} onChange={(event) => setManualScale(event.target.value)} /></label>
          </div>
          <div className="button-row"><button type="button" className="button button-secondary" onClick={applyManualAlignment}>{copy.applyAlignment}</button><span className="item-meta">{copy.alignment}: {analysis.alignment.source}</span></div>
          {analysis.warnings.map((warning) => <p key={warning} className="helper-copy">{warning}</p>)}
          <div className="metric-grid">
            {analysis.measures.map((measure) => (
              <div className="metric-card" key={measure.measureId}>
                <p className="metric-label">{copy.measure} {measure.measureNumber}</p>
                <p className="item-meta">{copy.detected}: {measure.detectedCount}/{measure.eventCount}</p>
                <p className="item-meta">{copy.pitchAttention}: {measure.pitchAttentionCount} · {copy.rhythmAttention}: {measure.rhythmAttentionCount}</p>
                {measure.polyphonicUnscoredCount ? <p className="item-meta">{copy.polyphonic}: {measure.polyphonicUnscoredCount}</p> : null}
              </div>
            ))}
          </div>
          <div className="list-grid">
            {analysis.events.slice(0, 32).map((event) => (
              <button type="button" className="list-item" key={event.eventId} onClick={() => seekToFeedback(event.sourceEventId)}>
                <StatusPill tone={event.status === "matched" ? "green" : event.status === "missing" ? "red" : "amber"}>{event.status}</StatusPill>
                <span className="list-item-content"><span className="item-title">{copy.measure} {event.measureNumber} · {event.noteName}</span><span className="item-meta">{event.pitchCents === null ? "pitch n/a" : `${event.pitchCents > 0 ? "+" : ""}${event.pitchCents} cents`} · {event.onsetDeltaMs === null ? "onset n/a" : `${event.onsetDeltaMs > 0 ? "+" : ""}${event.onsetDeltaMs} ms`} · {copy.jump}</span></span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="button-row">
        {["idle", "ready", "error"].includes(status) ? <button type="button" className="button button-secondary" onClick={() => void startRecording()}>{status === "ready" ? copy.rerecord : copy.start}</button> : null}
        {["recording", "paused"].includes(status) ? <button type="button" className="button button-secondary" onClick={pauseOrResume}>{status === "paused" ? copy.resume : copy.pause}</button> : null}
        {["recording", "paused"].includes(status) ? <button type="button" className="button button-primary" onClick={stopRecording}>{copy.stop}</button> : null}
        {["count_in", "recording", "paused", "ready"].includes(status) ? <button type="button" className="button button-tertiary" onClick={discardRecording}>{status === "ready" ? copy.rerecord : copy.cancel}</button> : null}
      </div>
    </div>
  );
}
