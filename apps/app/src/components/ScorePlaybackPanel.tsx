"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackDocument, PlaybackMeasureMarker, PlaybackNoteEvent } from "@score/shared";
import { apiRequest } from "../lib/api";
import { buildPlaybackTempoSegments, playbackSecondsAtBeat, playbackTempoAtBeat } from "../lib/playback-timeline";
import { useAppLocale } from "./AppLocaleProvider";

type PlaybackPayload = {
  playback: PlaybackDocument;
};

export type PlaybackPracticeSettings = {
  tempoBpm: number;
  metronomeEnabled: boolean;
  countInEnabled: boolean;
  soloPartIds: string[];
  mutedPartIds: string[];
  partVolumes: Record<string, number>;
  loopEnabled: boolean;
  loopStartBeat: number;
  loopEndBeat: number;
};

export const DEFAULT_PLAYBACK_PRACTICE_SETTINGS: PlaybackPracticeSettings = {
  tempoBpm: 96,
  metronomeEnabled: false,
  countInEnabled: false,
  soloPartIds: [],
  mutedPartIds: [],
  partVolumes: {},
  loopEnabled: false,
  loopStartBeat: 0,
  loopEndBeat: 4,
};

export type PlaybackPracticeExportActions = {
  midi?: {
    label: string;
    loadingLabel: string;
    loading: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
  wav?: {
    label: string;
    loadingLabel: string;
    loading: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
  mp3?: {
    label: string;
    loadingLabel: string;
    loading: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
};

type ToneModule = typeof import("tone");

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function filterEvents(events: PlaybackNoteEvent[], soloPartIds: string[], mutedPartIds: string[]) {
  if (soloPartIds.length > 0) {
    return events.filter((event) => soloPartIds.includes(event.partId));
  }

  return events.filter((event) => !mutedPartIds.includes(event.partId));
}

function partVolume(partVolumes: Record<string, number>, partId: string) {
  return clamp(partVolumes[partId] ?? 1, 0, 1.5);
}

function markerLabel(marker: PlaybackMeasureMarker) {
  return marker.occurrence > 1 ? `M${marker.measureNumber} repeat ${marker.occurrence}` : `M${marker.measureNumber}`;
}

function isClose(left: number, right: number) {
  return Math.abs(left - right) < 0.0001;
}

function markerEndBeat(markers: PlaybackMeasureMarker[], index: number, totalBeats: number) {
  return markers[index + 1]?.startBeat ?? totalBeats;
}

export function ScorePlaybackPanel({
  scoreId,
  token,
  playbackEndpoint,
  revisionId,
  practiceSettings,
  onPracticeSettingsChange,
  exportActions,
  selectedEventId,
  onPlaybackEventChange,
}: {
  scoreId: string;
  token: string | null;
  playbackEndpoint?: string | null;
  revisionId: string | null;
  practiceSettings: PlaybackPracticeSettings;
  onPracticeSettingsChange: (settings: PlaybackPracticeSettings) => void;
  exportActions?: PlaybackPracticeExportActions;
  selectedEventId?: string | null;
  onPlaybackEventChange?: (eventId: string | null) => void;
}) {
  const { locale } = useAppLocale();
  const [playback, setPlayback] = useState<PlaybackDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seekBeat, setSeekBeat] = useState(0);
  const [speedLadderEnabled, setSpeedLadderEnabled] = useState(false);
  const [speedLadderTargetBpm, setSpeedLadderTargetBpm] = useState(120);
  const [speedLadderStepBpm, setSpeedLadderStepBpm] = useState(5);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const toneRef = useRef<ToneModule | null>(null);
  const synthRef = useRef<import("tone").PolySynth | null>(null);
  const metronomeRef = useRef<import("tone").MembraneSynth | null>(null);
  const scheduledIdsRef = useRef<number[]>([]);
  const speedLadderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            eyebrow: "播放练习",
            title: "Tone.js 分声部练习播放器",
            body: "从当前 Score JSON 生成可练习的播放事件，支持变速、片段循环、节拍器、倒拍以及声部 solo/mute。",
            load: "生成播放事件",
            play: "播放",
            stop: "停止",
            tempo: "速度 BPM",
            loop: "循环片段",
            loopStart: "起始拍",
            loopEnd: "结束拍",
            metronome: "节拍器",
            countIn: "一小节倒拍",
            loading: "正在生成播放事件...",
            ready: "播放事件已生成。",
            failed: "播放生成失败。",
            empty: "先生成播放事件，再开始试听。",
            noEvents: "当前筛选没有可播放音符。",
            events: "事件",
            activeEvents: "当前播放",
            beats: "总拍数",
            parts: "声部",
            solo: "Solo",
            mute: "Mute",
            allParts: "全部声部",
            revision: "版本",
            speedLadder: "速度阶梯",
            targetTempo: "目标速度",
            tempoStep: "每轮加速",
            ladderComplete: "速度阶梯训练已完成。",
          }
        : {
            eyebrow: "Playback practice",
            title: "Tone.js part practice player",
            body: "Generates practice-ready playback events from the current Score JSON with tempo, loop ranges, metronome, count-in, and part solo/mute.",
            load: "Generate playback events",
            play: "Play",
            stop: "Stop",
            tempo: "Tempo BPM",
            loop: "Loop section",
            loopStart: "Start beat",
            loopEnd: "End beat",
            metronome: "Metronome",
            countIn: "One-bar count-in",
            loading: "Generating playback events...",
            ready: "Playback events generated.",
            failed: "Playback generation failed.",
            empty: "Generate playback events before listening.",
            noEvents: "The current part filter has no playable notes.",
            events: "Events",
            activeEvents: "Active events",
            beats: "Total beats",
            parts: "Parts",
            solo: "Solo",
            mute: "Mute",
            allParts: "All parts",
            revision: "Revision",
            speedLadder: "Speed ladder",
            targetTempo: "Target tempo",
            tempoStep: "Increase per pass",
            ladderComplete: "Speed ladder completed.",
          },
    [locale],
  );

  const activeEvents = useMemo(
    () => (playback ? filterEvents(playback.events, practiceSettings.soloPartIds, practiceSettings.mutedPartIds) : []),
    [playback, practiceSettings.mutedPartIds, practiceSettings.soloPartIds],
  );
  const measureLoopMarkers = useMemo(() => {
    if (!playback) {
      return [];
    }

    const firstPartId = playback.parts[0]?.id;
    if (!firstPartId) {
      return [];
    }

    return playback.measureMarkers
      .filter((marker) => marker.partId === firstPartId)
      .sort((left, right) => left.startBeat - right.startBeat || left.measureNumber.localeCompare(right.measureNumber) || left.occurrence - right.occurrence);
  }, [playback]);
  const selectedStartMeasureId = useMemo(
    () => measureLoopMarkers.find((marker) => isClose(marker.startBeat, practiceSettings.loopStartBeat))?.id ?? "",
    [measureLoopMarkers, practiceSettings.loopStartBeat],
  );
  const selectedEndMeasureId = useMemo(() => {
    if (!playback) {
      return "";
    }

    return measureLoopMarkers.find((marker, index) => isClose(markerEndBeat(measureLoopMarkers, index, playback.totalBeats), practiceSettings.loopEndBeat))?.id ?? "";
  }, [measureLoopMarkers, playback, practiceSettings.loopEndBeat]);
  const diagnosticsLabel = locale === "zh-CN" ? "播放诊断" : "Playback diagnostics";

  useEffect(() => {
    if (!playback || !selectedEventId || playing) return;
    const selectedEvent = playback.events.find((event) => event.sourceEventId === selectedEventId);
    if (selectedEvent) setSeekBeat(selectedEvent.startBeat);
  }, [playback, playing, selectedEventId]);

  function updatePracticeSettings(nextSettings: Partial<PlaybackPracticeSettings>) {
    onPracticeSettingsChange({
      ...practiceSettings,
      ...nextSettings,
    });
  }

  async function loadPlayback() {
    const endpoint = playbackEndpoint ?? (scoreId ? `/api/scores/${scoreId}/playback` : null);
    if (!endpoint || (!playbackEndpoint && !token)) {
      setStatus(copy.failed);
      setStatusKind("error");
      return null;
    }

    setLoading(true);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<PlaybackPayload>(endpoint, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    setLoading(false);

    if (!result.ok) {
      setPlayback(null);
      setStatus(result.error || copy.failed);
      setStatusKind("error");
      return null;
    }

    setPlayback(result.data.playback);
    setSeekBeat(0);
    updatePracticeSettings({
      tempoBpm: result.data.playback.tempoBpm,
      soloPartIds: [],
      mutedPartIds: [],
      partVolumes: {},
      loopStartBeat: 0,
      loopEndBeat: Math.max(result.data.playback.totalBeats, 1),
    });
    setStatus(copy.ready);
    setStatusKind("success");
    return result.data.playback;
  }

  async function ensureTone() {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }

    if (!synthRef.current) {
      synthRef.current = new toneRef.current.PolySynth(toneRef.current.Synth).toDestination();
    }

    if (!metronomeRef.current) {
      metronomeRef.current = new toneRef.current.MembraneSynth({
        envelope: {
          attack: 0.001,
          decay: 0.08,
          sustain: 0,
          release: 0.03,
        },
      }).toDestination();
    }

    return toneRef.current;
  }

  function stopPlayback() {
    if (speedLadderTimerRef.current) {
      clearTimeout(speedLadderTimerRef.current);
      speedLadderTimerRef.current = null;
    }
    const tone = toneRef.current;
    if (tone) {
      for (const id of scheduledIdsRef.current) {
        tone.Transport.clear(id);
      }
      scheduledIdsRef.current = [];
      tone.Transport.stop();
      tone.Transport.cancel();
      tone.Transport.loop = false;
    }
    setPlaying(false);
  }

  function scheduleMetronome(input: { tone: ToneModule; ppq: number; startOffsetBeats: number; beats: number; downbeatEvery: number }) {
    for (let beat = 0; beat < input.beats; beat += 1) {
      const id = input.tone.Transport.schedule((time) => {
        metronomeRef.current?.triggerAttackRelease(beat % input.downbeatEvery === 0 ? "C4" : "C3", "16n", time, 0.58);
      }, `${Math.round((input.startOffsetBeats + beat) * input.ppq)}i`);
      scheduledIdsRef.current.push(id);
    }
  }

  async function play(tempoOverride?: number) {
    const currentPlayback = playback ?? (await loadPlayback());
    if (!currentPlayback || currentPlayback.events.length === 0) {
      setStatus(copy.empty);
      setStatusKind("error");
      return;
    }

    const totalBeats = Math.max(currentPlayback.totalBeats, 0.25);
    const sectionStart = practiceSettings.loopEnabled
      ? clamp(practiceSettings.loopStartBeat, 0, Math.max(totalBeats - 0.25, 0))
      : clamp(seekBeat, 0, Math.max(totalBeats - 0.25, 0));
    const sectionEnd = practiceSettings.loopEnabled ? clamp(practiceSettings.loopEndBeat, sectionStart + 0.25, totalBeats) : totalBeats;
    const sectionBeats = Math.max(sectionEnd - sectionStart, 0.25);
    const playableEvents = filterEvents(currentPlayback.events, practiceSettings.soloPartIds, practiceSettings.mutedPartIds).filter(
      (event) => event.startBeat >= sectionStart && event.startBeat < sectionEnd,
    );

    if (playableEvents.length === 0) {
      setStatus(copy.noEvents);
      setStatusKind("error");
      return;
    }

    stopPlayback();
    const tone = await ensureTone();
    await tone.start();
    const effectiveTempo = clamp(tempoOverride ?? practiceSettings.tempoBpm, 40, 220);
    const tempoSegments = buildPlaybackTempoSegments(currentPlayback, effectiveTempo);
    const sectionTempo = playbackTempoAtBeat(tempoSegments, sectionStart);
    tone.Transport.bpm.value = sectionTempo;
    const ppq = tone.Transport.PPQ;
    const downbeatEvery = Math.max(1, Math.round(currentPlayback.downbeatEvery || 4));
    const countInBeats = practiceSettings.countInEnabled ? downbeatEvery : 0;

    const resetTempoId = tone.Transport.schedule(() => {
      tone.Transport.bpm.value = sectionTempo;
    }, `${Math.round(countInBeats * ppq)}i`);
    scheduledIdsRef.current.push(resetTempoId);
    for (const tempo of tempoSegments) {
      if (tempo.startBeat <= sectionStart || tempo.startBeat >= sectionEnd) continue;
      const id = tone.Transport.schedule(() => {
        tone.Transport.bpm.value = tempo.bpm;
      }, `${Math.round((countInBeats + tempo.startBeat - sectionStart) * ppq)}i`);
      scheduledIdsRef.current.push(id);
    }

    if (practiceSettings.countInEnabled || practiceSettings.metronomeEnabled) {
      scheduleMetronome({
        tone,
        ppq,
        startOffsetBeats: 0,
        beats: countInBeats + (practiceSettings.metronomeEnabled ? Math.ceil(sectionBeats) : 0),
        downbeatEvery,
      });
    }

    for (const event of playableEvents) {
      const eventOffsetBeats = event.startBeat - sectionStart + countInBeats;
      const soundEndBeat = Math.min(sectionEnd, event.startBeat + Math.max(event.soundDurationBeats ?? event.durationBeats, 0.125));
      const soundDurationSeconds = Math.max(0.01, playbackSecondsAtBeat(tempoSegments, soundEndBeat) - playbackSecondsAtBeat(tempoSegments, event.startBeat));
      const id = tone.Transport.schedule((time) => {
        const velocity = clamp(event.velocity * partVolume(practiceSettings.partVolumes, event.partId), 0, 1);
        synthRef.current?.triggerAttackRelease(event.noteName, soundDurationSeconds, time, velocity);
        tone.Draw.schedule(() => {
          setSeekBeat(event.startBeat);
          onPlaybackEventChange?.(event.sourceEventId);
        }, time);
      }, `${Math.round(eventOffsetBeats * ppq)}i`);
      scheduledIdsRef.current.push(id);
    }

    if (practiceSettings.loopEnabled && !speedLadderEnabled) {
      tone.Transport.loop = true;
      tone.Transport.loopStart = `${Math.round(countInBeats * ppq)}i`;
      tone.Transport.loopEnd = `${Math.round((countInBeats + sectionBeats) * ppq)}i`;
    } else {
      const stopId = tone.Transport.schedule(() => {
        const nextTempo = Math.min(speedLadderTargetBpm, effectiveTempo + speedLadderStepBpm);
        const shouldContinue = speedLadderEnabled && effectiveTempo < speedLadderTargetBpm && nextTempo > effectiveTempo;
        setTimeout(() => {
          stopPlayback();
          if (shouldContinue) {
            updatePracticeSettings({ tempoBpm: nextTempo });
            speedLadderTimerRef.current = setTimeout(() => void play(nextTempo), 350);
          } else if (speedLadderEnabled) {
            setStatus(copy.ladderComplete);
            setStatusKind("success");
          }
        }, 0);
      }, `${Math.round((countInBeats + sectionBeats + 0.5) * ppq)}i`);
      scheduledIdsRef.current.push(stopId);
    }

    tone.Transport.start();
    setPlaying(true);
  }

  function setSafeLoopStart(value: number) {
    const totalBeats = Math.max(playback?.totalBeats ?? practiceSettings.loopEndBeat, 0.25);
    const nextStart = clamp(value, 0, Math.max(totalBeats - 0.25, 0));
    updatePracticeSettings({
      loopStartBeat: nextStart,
      loopEndBeat:
        practiceSettings.loopEndBeat <= nextStart
          ? clamp(nextStart + 1, nextStart + 0.25, totalBeats)
          : practiceSettings.loopEndBeat,
    });
  }

  function setPracticeTempo(value: number) {
    const tempo = clamp(value, 40, 220);
    updatePracticeSettings({ tempoBpm: tempo });
    setSpeedLadderTargetBpm((current) => Math.max(current, tempo));
  }

  function setSafeLoopEnd(value: number) {
    const totalBeats = Math.max(playback?.totalBeats ?? value, 0.25);
    updatePracticeSettings({
      loopEndBeat: clamp(value, practiceSettings.loopStartBeat + 0.25, totalBeats),
    });
  }

  function setLoopStartMeasure(markerId: string) {
    const marker = measureLoopMarkers.find((item) => item.id === markerId);
    if (!marker) {
      return;
    }

    setSafeLoopStart(marker.startBeat);
  }

  function setLoopEndMeasure(markerId: string) {
    if (!playback) {
      return;
    }

    const markerIndex = measureLoopMarkers.findIndex((item) => item.id === markerId);
    if (markerIndex < 0) {
      return;
    }

    const marker = measureLoopMarkers[markerIndex];
    const endBeat = markerEndBeat(measureLoopMarkers, markerIndex, playback.totalBeats);
    updatePracticeSettings({
      loopStartBeat: practiceSettings.loopStartBeat >= endBeat ? marker.startBeat : practiceSettings.loopStartBeat,
      loopEndBeat: clamp(endBeat, marker.startBeat + 0.25, Math.max(playback.totalBeats, 0.25)),
    });
  }

  return (
    <section className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="practice-grid">
        <div className="playback-panel">
          <label className="field-group">
            <span className="field-label">{copy.tempo}</span>
            <input
              className="field-control"
              type="number"
              min={40}
              max={220}
              step={1}
              value={practiceSettings.tempoBpm}
              onChange={(event) => setPracticeTempo(Number(event.target.value))}
            />
            <input
              className="practice-range"
              type="range"
              min={40}
              max={220}
              step={1}
              value={practiceSettings.tempoBpm}
              onChange={(event) => setPracticeTempo(Number(event.target.value))}
            />
          </label>

          <label className="field-group">
            <span className="field-label">{locale === "zh-CN" ? "播放位置" : "Playhead"}</span>
            <input
              className="practice-range"
              type="range"
              min={0}
              max={Math.max(playback?.totalBeats ?? 1, 1)}
              step={0.25}
              value={clamp(seekBeat, 0, Math.max(playback?.totalBeats ?? 1, 1))}
              disabled={!playback || playing}
              onChange={(event) => setSeekBeat(Number(event.target.value))}
            />
            <span className="item-meta">{seekBeat.toFixed(2)} / {(playback?.totalBeats ?? 0).toFixed(2)}</span>
          </label>

          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={() => void loadPlayback()} disabled={loading}>
              {loading ? copy.loading : copy.load}
            </button>
            <button type="button" className="button button-primary" onClick={() => void play()} disabled={playing || loading}>
              {copy.play}
            </button>
            <button type="button" className="button button-secondary" onClick={stopPlayback} disabled={!playing}>
              {copy.stop}
            </button>
          </div>
          {exportActions?.midi || exportActions?.wav || exportActions?.mp3 ? (
            <div className="button-row">
              <span className="item-meta">Practice exports</span>
              {exportActions.midi ? (
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={exportActions.midi.onClick}
                  disabled={exportActions.midi.loading || exportActions.midi.disabled}
                >
                  {exportActions.midi.loading ? exportActions.midi.loadingLabel : exportActions.midi.label}
                </button>
              ) : null}
              {exportActions.wav ? (
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={exportActions.wav.onClick}
                  disabled={exportActions.wav.loading || exportActions.wav.disabled}
                >
                  {exportActions.wav.loading ? exportActions.wav.loadingLabel : exportActions.wav.label}
                </button>
              ) : null}
              {exportActions.mp3 ? (
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={exportActions.mp3.onClick}
                  disabled={exportActions.mp3.loading || exportActions.mp3.disabled}
                >
                  {exportActions.mp3.loading ? exportActions.mp3.loadingLabel : exportActions.mp3.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="practice-controls">
          <label className="practice-toggle">
            <input type="checkbox" checked={speedLadderEnabled} onChange={(event) => {
              setSpeedLadderEnabled(event.target.checked);
              setSpeedLadderTargetBpm(Math.max(practiceSettings.tempoBpm, speedLadderTargetBpm));
            }} />
            <span>{copy.speedLadder}</span>
          </label>
          {speedLadderEnabled ? (
            <div className="form-grid">
              <label className="field-group compact"><span>{copy.targetTempo}</span><input className="field-control" type="number" min={practiceSettings.tempoBpm} max={220} value={speedLadderTargetBpm} onChange={(event) => setSpeedLadderTargetBpm(clamp(Number(event.target.value), practiceSettings.tempoBpm, 220))} /></label>
              <label className="field-group compact"><span>{copy.tempoStep}</span><input className="field-control" type="number" min={1} max={30} value={speedLadderStepBpm} onChange={(event) => setSpeedLadderStepBpm(clamp(Number(event.target.value), 1, 30))} /></label>
            </div>
          ) : null}
          <label className="practice-toggle">
            <input type="checkbox" checked={practiceSettings.loopEnabled} onChange={(event) => updatePracticeSettings({ loopEnabled: event.target.checked })} />
            <span>{copy.loop}</span>
          </label>
          <label className="practice-toggle">
            <input type="checkbox" checked={practiceSettings.metronomeEnabled} onChange={(event) => updatePracticeSettings({ metronomeEnabled: event.target.checked })} />
            <span>{copy.metronome}</span>
          </label>
          <label className="practice-toggle">
            <input type="checkbox" checked={practiceSettings.countInEnabled} onChange={(event) => updatePracticeSettings({ countInEnabled: event.target.checked })} />
            <span>{copy.countIn}</span>
          </label>
        </div>

        <div className="loop-controls">
          {measureLoopMarkers.length > 0 ? (
            <>
              <label className="field-group">
                <span className="field-label">{locale === "zh-CN" ? "起始小节" : "Start measure"}</span>
                <select
                  className="field-select"
                  value={selectedStartMeasureId}
                  disabled={!practiceSettings.loopEnabled}
                  onChange={(event) => setLoopStartMeasure(event.target.value)}
                >
                  <option value="">{locale === "zh-CN" ? "按拍数" : "By beat"}</option>
                  {measureLoopMarkers.map((marker) => (
                    <option key={marker.id} value={marker.id}>
                      {markerLabel(marker)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group">
                <span className="field-label">{locale === "zh-CN" ? "结束小节" : "End measure"}</span>
                <select
                  className="field-select"
                  value={selectedEndMeasureId}
                  disabled={!practiceSettings.loopEnabled}
                  onChange={(event) => setLoopEndMeasure(event.target.value)}
                >
                  <option value="">{locale === "zh-CN" ? "按拍数" : "By beat"}</option>
                  {measureLoopMarkers.map((marker) => (
                    <option key={marker.id} value={marker.id}>
                      {markerLabel(marker)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="field-group">
            <span className="field-label">{copy.loopStart}</span>
            <input
              className="field-control"
              type="number"
              min={0}
              max={playback?.totalBeats ?? 999}
              step={0.25}
              value={practiceSettings.loopStartBeat}
              disabled={!practiceSettings.loopEnabled}
              onChange={(event) => setSafeLoopStart(Number(event.target.value))}
            />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.loopEnd}</span>
            <input
              className="field-control"
              type="number"
              min={0.25}
              max={playback?.totalBeats ?? 999}
              step={0.25}
              value={practiceSettings.loopEndBeat}
              disabled={!practiceSettings.loopEnabled}
              onChange={(event) => setSafeLoopEnd(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      {playback ? (
        <div className="part-practice-list">
          <div className="part-practice-header">
            <p className="metric-label">{copy.allParts}</p>
            <p className="item-meta">
              {practiceSettings.soloPartIds.length > 0
                ? `${copy.solo}: ${practiceSettings.soloPartIds.length}`
                : practiceSettings.mutedPartIds.length > 0
                  ? `${copy.mute}: ${practiceSettings.mutedPartIds.length}`
                  : copy.allParts}
            </p>
          </div>
          {playback.parts.map((part) => {
            const isSolo = practiceSettings.soloPartIds.includes(part.id);
            const isMuted = practiceSettings.mutedPartIds.includes(part.id);
            const volume = partVolume(practiceSettings.partVolumes, part.id);

            return (
              <div key={part.id} className="part-practice-row">
                <div className="list-item-content">
                  <p className="item-title">{part.name}</p>
                  <p className="item-meta">{part.id}</p>
                  <label className="field-group">
                    <span className="field-label">{locale === "zh-CN" ? "声部音量" : "Part volume"}</span>
                    <input
                      className="practice-range"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={volume}
                      onChange={(event) =>
                        updatePracticeSettings({
                          partVolumes: {
                            ...practiceSettings.partVolumes,
                            [part.id]: Number(event.target.value),
                          },
                        })
                      }
                    />
                    <span className="item-meta">{Math.round(volume * 100)}%</span>
                  </label>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className={`button button-secondary button-ghost toggle-button${isSolo ? " is-active" : ""}`}
                    onClick={() => {
                      updatePracticeSettings({
                        soloPartIds: toggleValue(practiceSettings.soloPartIds, part.id),
                        mutedPartIds: practiceSettings.mutedPartIds.filter((value) => value !== part.id),
                      });
                    }}
                  >
                    {copy.solo}
                  </button>
                  <button
                    type="button"
                    className={`button button-secondary button-ghost toggle-button${isMuted ? " is-active-danger" : ""}`}
                    disabled={isSolo}
                    onClick={() => updatePracticeSettings({ mutedPartIds: toggleValue(practiceSettings.mutedPartIds, part.id) })}
                  >
                    {copy.mute}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
      {playback && playback.metadata.warnings.length > 0 ? (
        <div className="mini-card stack-xs wide">
          <p className="metric-label">{diagnosticsLabel}</p>
          <ul className="stack-xs">
            {playback.metadata.warnings.map((warning, index) => (
              <li className="item-meta" key={`${warning}-${index}`}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {playback?.navigationGraphs?.map((graph) => {
        const transitions = graph.steps.filter((step) => step.action !== "play");
        return (
          <details key={graph.partId} className="wide">
            <summary className="item-title">
              {locale === "zh-CN" ? "演奏顺序" : "Playback path"} · {playback.parts.find((part) => part.id === graph.partId)?.name ?? graph.partId} · {graph.jumpCount}{" "}
              {locale === "zh-CN" ? "次跳转" : "jumps"}
            </summary>
            <div className="stack-xs">
              <p className="item-meta">
                {locale === "zh-CN" ? "终止" : "Terminated"}: {graph.terminatedBy}
                {graph.unreachableMeasureIds.length > 0 ? ` · ${locale === "zh-CN" ? "不可达小节" : "Unreachable measures"}: ${graph.unreachableMeasureIds.length}` : ""}
              </p>
              {transitions.map((step) => (
                <p key={`${step.sequence}-${step.action}`} className="item-meta">
                  M{step.measureNumber} · {step.action}{step.detail ? ` · ${step.detail}` : ""}
                </p>
              ))}
            </div>
          </details>
        );
      })}
      {playback ? (
        <div className="score-summary-grid">
          <div className="mini-card stack-xs">
            <p className="metric-label">{copy.events}</p>
            <p className="metric-value compact">{playback.metadata.eventCount}</p>
          </div>
          <div className="mini-card stack-xs">
            <p className="metric-label">{copy.activeEvents}</p>
            <p className="metric-value compact">{activeEvents.length}</p>
          </div>
          <div className="mini-card stack-xs">
            <p className="metric-label">{copy.beats}</p>
            <p className="metric-value compact">{playback.totalBeats}</p>
          </div>
          <div className="mini-card stack-xs">
            <p className="metric-label">{copy.parts}</p>
            <p className="metric-value compact">{playback.parts.length}</p>
          </div>
          <div className="mini-card stack-xs wide">
            <p className="metric-label">{copy.revision}</p>
            <p className="item-title">{revisionId ?? "-"}</p>
          </div>
        </div>
      ) : (
        <div className="empty-state">{copy.empty}</div>
      )}
    </section>
  );
}
