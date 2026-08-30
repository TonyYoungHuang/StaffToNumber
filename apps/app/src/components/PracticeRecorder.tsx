"use client";

import { useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { StatusPill } from "@score/ui";
import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";
import { apiRequest } from "../lib/api";
import { usePlaybackPracticeMessages } from "../lib/playback-practice-messages/client";
import {
  formatPlaybackDuration,
  formatPlaybackNumber,
  formatPlaybackPercent,
  formatSignedPlaybackNumber,
  rawPlaybackErrorOrFallback,
} from "../lib/playback-practice-messages/formatters";
import type { PlaybackRecorderStatus } from "../lib/playback-practice-messages/types";
import { analyzePracticePerformance, type PracticePerformanceAnalysis } from "../lib/practice-performance-analysis";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";

function recorderFormat() {
  const candidates = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function recordingExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

export function PracticeRecorder({ locale, value, playbackEndpoint, practiceSettings, selectedEventId, onEventSelect, onAnalysis, onRecording }: {
  locale: SupportedLocale;
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
  const { messages } = usePlaybackPracticeMessages();
  const copy = messages.recorder;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const decodedRef = useRef<{ samples: Float32Array; sampleRate: number; playback: PlaybackDocument; events: PlaybackNoteEvent[]; scoreRevisionId: string | null } | null>(null);
  const recordedFileRef = useRef<File | null>(null);
  const discardRef = useRef(false);
  const [status, setStatus] = useState<PlaybackRecorderStatus>("idle");
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
      if (!playbackResult.ok) {
        decodedRef.current = null;
        setAnalysis(null);
        setAnalysisError(rawPlaybackErrorOrFallback(playbackResult.error, copy.analysisFailed));
        return;
      }
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
      setManualStart(String(Math.round(result.alignment.recordingStartSeconds * 1_000) / 1_000));
      setManualScale(String(Math.round(result.alignment.timeScale * 1_000) / 1_000));
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
    <div className="list-item stack-md" role="region" aria-label={copy.regionAria}>
      <div className="score-review-toolbar">
        <p className="item-title">{copy.title}</p>
        <StatusPill tone={status === "ready" ? "green" : status === "error" ? "red" : status === "recording" ? "cyan" : "amber"}>
          {status === "recording"
            ? formatMessage(copy.recordingStatusTemplate, { duration: formatPlaybackDuration(elapsedSeconds, locale) })
            : status === "paused"
              ? formatMessage(copy.pausedStatusTemplate, { duration: formatPlaybackDuration(elapsedSeconds, locale) })
              : status === "count_in"
                ? formatMessage(copy.countInStatusTemplate, { count: formatPlaybackNumber(countInRemaining, locale) })
                : copy.statuses[status]}
        </StatusPill>
      </div>
      <div className="form-grid">
        <label className="field-group">
          <span>{copy.device}</span>
          <select className="field-select" value={deviceId} disabled={["requesting", "count_in", "recording", "paused"].includes(status)} onChange={(event) => setDeviceId(event.target.value)}>
            <option value="">{copy.defaultDevice}</option>
            {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || formatMessage(copy.deviceTemplate, { index: formatPlaybackNumber(index + 1, locale) })}</option>)}
          </select>
        </label>
        <label className="field-group">
          <span>{copy.countIn}</span>
          <select className="field-select" value={countInBeats} disabled={["requesting", "count_in", "recording", "paused"].includes(status)} onChange={(event) => setCountInBeats(Number(event.target.value))}>
            {[0, 2, 4].map((beats) => <option key={beats} value={beats}>{formatMessage(copy.beatsTemplate, { count: formatPlaybackNumber(beats, locale) })}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {status === "requesting" ? <p className="helper-copy" role="status">{copy.requesting}</p> : null}
      {status === "ready" && previewUrl ? <><AudioWaveformPlayer ref={previewAudioRef} src={previewUrl} locale={locale} markers={analysis?.events.map((event) => event.recordingTimeSeconds) ?? []} /><p className="form-status success" role="status">{copy.ready}</p></> : null}
      {analyzing ? <p className="helper-copy" role="status">{copy.analyzing}</p> : null}
      {analysisError ? <p className="form-status error" role="alert">{analysisError}</p> : null}
      {analysis ? (
        <div className="stack-md" role="region" aria-label={copy.feedbackAria}>
          <div className="score-review-toolbar">
            <p className="item-title">{copy.analysis}</p>
            <StatusPill tone={analysis.completeness.ratio >= 0.8 ? "green" : "amber"}>
              {copy.completeness}: {formatMessage(copy.completenessTemplate, {
                detected: formatPlaybackNumber(analysis.completeness.detected, locale),
                expected: formatPlaybackNumber(analysis.completeness.expected, locale),
                percent: formatPlaybackPercent(analysis.completeness.ratio, locale),
              })}
            </StatusPill>
          </div>
          <div className="form-grid">
            <label className="field-group"><span>{copy.startOffset}</span><input className="field-control" type="number" min={0} step={0.01} value={manualStart} onChange={(event) => setManualStart(event.target.value)} /></label>
            <label className="field-group"><span>{copy.timeScale}</span><input className="field-control" type="number" min={0.5} max={2} step={0.01} value={manualScale} onChange={(event) => setManualScale(event.target.value)} /></label>
          </div>
          <div className="button-row"><button type="button" className="button button-secondary" onClick={applyManualAlignment}>{copy.applyAlignment}</button><span className="item-meta">{copy.alignment}: {copy.alignmentSources[analysis.alignment.source]}</span></div>
          {analysis.warnings.map((warning) => <p key={warning} className="helper-copy">{warning}</p>)}
          <div className="metric-grid">
            {analysis.measures.map((measure) => (
              <div className="metric-card" key={measure.measureId}>
                <p className="metric-label">{formatMessage(copy.measureTemplate, { measure: measure.measureNumber })}</p>
                <p className="item-meta">{formatMessage(copy.detectedTemplate, { detected: formatPlaybackNumber(measure.detectedCount, locale), total: formatPlaybackNumber(measure.eventCount, locale) })}</p>
                <p className="item-meta">{formatMessage(copy.pitchAttentionTemplate, { count: formatPlaybackNumber(measure.pitchAttentionCount, locale) })} · {formatMessage(copy.rhythmAttentionTemplate, { count: formatPlaybackNumber(measure.rhythmAttentionCount, locale) })}</p>
                {measure.polyphonicUnscoredCount ? <p className="item-meta">{formatMessage(copy.polyphonicTemplate, { count: formatPlaybackNumber(measure.polyphonicUnscoredCount, locale) })}</p> : null}
              </div>
            ))}
          </div>
          <div className="list-grid">
            {analysis.events.slice(0, 32).map((event) => (
              <button
                type="button"
                className="list-item"
                key={event.eventId}
                aria-label={formatMessage(copy.feedbackButtonTemplate, {
                  measure: formatMessage(copy.measureTemplate, { measure: event.measureNumber }),
                  note: event.noteName,
                  status: copy.eventStatuses[event.status],
                  action: copy.jump,
                })}
                onClick={() => seekToFeedback(event.sourceEventId)}
              >
                <StatusPill tone={event.status === "matched" ? "green" : event.status === "missing" ? "red" : "amber"}>{copy.eventStatuses[event.status]}</StatusPill>
                <span className="list-item-content">
                  <span className="item-title">{formatMessage(copy.measureTemplate, { measure: event.measureNumber })} · {event.noteName}</span>
                  <span className="item-meta">
                    {event.pitchCents === null ? copy.pitchUnavailable : formatMessage(copy.centsTemplate, { value: formatSignedPlaybackNumber(event.pitchCents, locale) })} · {event.onsetDeltaMs === null ? copy.onsetUnavailable : formatMessage(copy.onsetTemplate, { value: formatSignedPlaybackNumber(event.onsetDeltaMs, locale) })} · {copy.jump}
                  </span>
                </span>
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
