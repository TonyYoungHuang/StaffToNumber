"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowNorthEastIcon, CheckSealIcon, DownloadIcon } from "@score/ui";

export type HomeIntent = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  input: string;
  output: string;
  status: string;
  statusTone: "ready" | "review" | "pending";
  href: string;
  action: string;
};

export function HomeIntentSwitcher({
  intents,
  initialIntent,
  modelLabel,
  ariaLabel,
}: {
  intents: HomeIntent[];
  initialIntent?: string;
  modelLabel: string;
  ariaLabel: string;
}) {
  const intentIds = useMemo(() => new Set(intents.map((intent) => intent.id)), [intents]);
  const [activeId, setActiveId] = useState(
    initialIntent && intentIds.has(initialIntent) ? initialIntent : (intents[0]?.id ?? ""),
  );
  const activeIntent = intents.find((intent) => intent.id === activeId) ?? intents[0];

  function activateIntent(index: number, focus = false) {
    const nextIntent = intents[(index + intents.length) % intents.length];
    if (!nextIntent) return;
    setActiveId(nextIntent.id);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextIntent.id);
    url.hash = "intent-switcher";
    window.history.replaceState(null, "", url);
    if (focus) requestAnimationFrame(() => document.getElementById(`intent-tab-${nextIntent.id}`)?.focus());
  }

  useEffect(() => {
    function syncIntentFromUrl() {
      const intent = new URL(window.location.href).searchParams.get("mode");
      if (intent && intentIds.has(intent)) setActiveId(intent);
    }
    window.addEventListener("popstate", syncIntentFromUrl);
    return () => window.removeEventListener("popstate", syncIntentFromUrl);
  }, [intentIds]);

  if (!activeIntent) return null;

  return (
    <div className="home-intent-shell" id="intent-switcher">
      <div className="home-intent-tabs" role="tablist" aria-label={ariaLabel}>
        {intents.map((intent, index) => (
          <button
            key={intent.id}
            id={`intent-tab-${intent.id}`}
            type="button"
            role="tab"
            aria-selected={intent.id === activeIntent.id}
            aria-controls={`intent-panel-${intent.id}`}
            tabIndex={intent.id === activeIntent.id ? 0 : -1}
            className={intent.id === activeIntent.id ? "is-active" : undefined}
            onClick={() => activateIntent(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                activateIntent(index + 1, true);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                activateIntent(index - 1, true);
              } else if (event.key === "Home") {
                event.preventDefault();
                activateIntent(0, true);
              } else if (event.key === "End") {
                event.preventDefault();
                activateIntent(intents.length - 1, true);
              }
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {intent.label}
          </button>
        ))}
      </div>

      <div
        id={`intent-panel-${activeIntent.id}`}
        className="home-intent-panel"
        role="tabpanel"
        aria-labelledby={`intent-tab-${activeIntent.id}`}
      >
        <div className="home-intent-copy">
          <div className={`home-state-badge is-${activeIntent.statusTone}`}>
            <span aria-hidden="true" />
            {activeIntent.status}
          </div>
          <p className="home-kicker">{activeIntent.eyebrow}</p>
          <h3>{activeIntent.title}</h3>
          <p>{activeIntent.body}</p>
          <Link href={activeIntent.href}>{activeIntent.action}<ArrowNorthEastIcon width={16} height={16} /></Link>
        </div>
        <div className="home-intent-diagram" aria-label={`${activeIntent.input} → ${modelLabel} → ${activeIntent.output}`}>
          <div><small>INPUT</small><strong>{activeIntent.input}</strong></div>
          <span aria-hidden="true">→</span>
          <div className="is-model"><small>MODEL</small><strong>{modelLabel}</strong></div>
          <span aria-hidden="true">→</span>
          <div><small>OUTPUT</small><strong>{activeIntent.output}</strong></div>
        </div>
      </div>
    </div>
  );
}

export type PlaybackTrack = {
  id: string;
  label: string;
  keyLabel: string;
  revision: string;
  audioSrc: string;
  notes: Array<{ name: string; degree: string; y: number }>;
};

type PlaybackCopy = {
  play: string;
  pause: string;
  muted: string;
  unmuted: string;
  muteAction: string;
  unmuteAction: string;
  tempo: string;
  currentNote: string;
  idle: string;
  sample: string;
  sampleNote: string;
  revisionLabel: string;
  inputDownload: string;
  audioDownload: string;
  error: string;
};

export function HomePlaybackDemo({
  tracks,
  copy,
  ariaLabel,
}: {
  tracks: PlaybackTrack[];
  copy: PlaybackCopy;
  ariaLabel: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState(tracks[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3.2);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState("");
  const activeTrack = tracks.find((track) => track.id === activeId) ?? tracks[0];
  const progress = Math.max(0, Math.min(1, duration > 0 ? currentTime / duration : 0));
  const noteIndex = Math.min((activeTrack?.notes.length ?? 1) - 1, Math.floor(progress * (activeTrack?.notes.length ?? 1)));
  const currentNote = currentTime > 0 ? activeTrack?.notes[noteIndex]?.name : null;

  function selectTrack(trackId: string) {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
    setError("");
    setActiveId(trackId);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setPlaying(false);
      setError(copy.error);
    }
  }

  function setRate(rate: number) {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }

  if (!activeTrack) return null;

  return (
    <div className="home-playback-shell">
      <audio
        key={activeTrack.audioSrc}
        ref={audioRef}
        src={activeTrack.audioSrc}
        muted={muted}
        preload="none"
        onLoadedMetadata={(event) => {
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 3.2);
          event.currentTarget.playbackRate = playbackRate;
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setError(copy.error)}
      />

      <div className="home-playback-head">
        <div className="home-playback-track-tabs" role="group" aria-label={ariaLabel}>
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              className={track.id === activeTrack.id ? "is-active" : undefined}
              aria-pressed={track.id === activeTrack.id}
              onClick={() => selectTrack(track.id)}
            >
              <span>{track.label}</span>
              <strong>{track.keyLabel}</strong>
            </button>
          ))}
        </div>
        <div className="home-playback-proof">
          <CheckSealIcon width={17} height={17} />
          <span><strong>{copy.sample}</strong>{copy.sampleNote}</span>
        </div>
      </div>

      <div
        className="home-demo-score"
        style={{ "--playback-left": `${12 + progress * 78}%` } as CSSProperties}
        aria-label={`${activeTrack.keyLabel}: ${activeTrack.notes.map((note) => note.name).join(", ")}`}
      >
        <div className="home-demo-score-meta">
          <span>{activeTrack.keyLabel}</span>
          <span>{copy.revisionLabel}: {activeTrack.revision}</span>
        </div>
        <div className="home-demo-staff">
          <div className="home-demo-clef" aria-hidden="true">𝄞</div>
          <div className="home-demo-cursor" aria-hidden="true" />
          <div className="home-demo-notes">
            {activeTrack.notes.map((note, index) => (
              <div
                key={`${activeTrack.id}-${note.name}`}
                className={`home-demo-note${index === noteIndex && currentTime > 0 ? " is-active" : ""}`}
                style={{ "--note-y": `${note.y}px` } as CSSProperties}
              >
                <i aria-hidden="true" />
                <span>{note.name}</span>
                <small>{note.degree}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-playback-controls">
        <button type="button" className="home-play-control" onClick={() => void togglePlayback()}>
          <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
          {playing ? copy.pause : copy.play}
        </button>
        <button
          type="button"
          className="home-mute-control"
          aria-pressed={!muted}
          aria-label={muted ? copy.unmuteAction : copy.muteAction}
          onClick={() => setMuted((value) => !value)}
        >
          <span aria-hidden="true">{muted ? "⌁" : "♪"}</span>
          {muted ? copy.muted : copy.unmuted}
        </button>
        <div className="home-rate-control" role="group" aria-label={copy.tempo}>
          <span>{copy.tempo}</span>
          {[0.75, 1, 1.25].map((rate) => (
            <button
              key={rate}
              type="button"
              className={playbackRate === rate ? "is-active" : undefined}
              aria-pressed={playbackRate === rate}
              onClick={() => setRate(rate)}
            >
              {rate}×
            </button>
          ))}
        </div>
        <div className="home-playback-live" aria-live="polite">
          <span>{copy.currentNote}</span>
          <strong>{currentNote ?? copy.idle}</strong>
        </div>
      </div>

      <div className="home-playback-downloads">
        <a href="/examples/score-to-audio/input" download>{copy.inputDownload}<DownloadIcon width={15} height={15} /></a>
        <a href={activeTrack.audioSrc} download>{copy.audioDownload}<DownloadIcon width={15} height={15} /></a>
        {error ? <p role="status">{error}</p> : null}
      </div>
    </div>
  );
}
