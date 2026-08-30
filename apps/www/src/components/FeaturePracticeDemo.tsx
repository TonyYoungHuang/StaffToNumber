"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useState, useRef } from "react";
import { ArrowNorthEastIcon, CheckSealIcon } from "@score/ui";
import {
  PRACTICE_DEMO_DEFAULTS,
  parsePracticeDemoState,
  serializePracticeDemoState,
  type PracticeDemoState,
} from "../lib/practice-demo-state";
import type { FeaturePracticeCopy } from "../lib/feature-localization/types";

const BEAT_SECONDS = 0.8;
const BASE_TEMPO = 96;
const NOTES = ["C4", "D4", "E4", "G4"];
const TEMPO_PRESETS = [72, 96, 120];
const LOOP_STARTS = [0, 1, 2];
const LOOP_ENDS = [2, 3, 4];
const SIGNAL_LEVELS = [38, 68, 48, 82, 56, 74, 42, 88, 52, 70, 46, 78];

export function FeaturePracticeDemo({
  copy,
  audioSrc,
  workspaceHref,
  workspaceAvailable,
}: {
  copy: FeaturePracticeCopy;
  audioSrc: string;
  workspaceHref: string;
  workspaceAvailable: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [tempo, setTempo] = useState(PRACTICE_DEMO_DEFAULTS.tempo);
  const [loopEnabled, setLoopEnabled] = useState(PRACTICE_DEMO_DEFAULTS.loopEnabled);
  const [metronomeEnabled, setMetronomeEnabled] = useState(PRACTICE_DEMO_DEFAULTS.metronomeEnabled);
  const [loopStart, setLoopStart] = useState(PRACTICE_DEMO_DEFAULTS.loopStart);
  const [loopEnd, setLoopEnd] = useState(PRACTICE_DEMO_DEFAULTS.loopEnd);
  const [currentTime, setCurrentTime] = useState(0);
  const [urlReady, setUrlReady] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [error, setError] = useState("");
  const currentBeat = Math.min(NOTES.length - 1, Math.max(0, Math.floor(currentTime / BEAT_SECONDS)));

  const activeStart = loopEnabled ? loopStart * BEAT_SECONDS : 0;
  const activeEnd = loopEnabled ? loopEnd * BEAT_SECONDS : NOTES.length * BEAT_SECONDS;
  const progress = Math.max(0, Math.min(100, ((currentTime - activeStart) / (activeEnd - activeStart)) * 100));
  const signalStyle = { "--practice-progress": String(progress) + "%" } as CSSProperties;

  useEffect(() => {
    const restoreFromUrl = () => {
      const state = parsePracticeDemoState(window.location.search);
      setTempo(state.tempo);
      setLoopEnabled(state.loopEnabled);
      setMetronomeEnabled(state.metronomeEnabled);
      setLoopStart(state.loopStart);
      setLoopEnd(state.loopEnd);
      setCurrentTime(state.loopEnabled ? state.loopStart * BEAT_SECONDS : 0);
      setShareStatus("");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.playbackRate = state.tempo / BASE_TEMPO;
        audioRef.current.currentTime = state.loopEnabled ? state.loopStart * BEAT_SECONDS : 0;
      }
    };

    restoreFromUrl();
    setUrlReady(true);
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const query = serializePracticeDemoState(currentPracticeState(), window.location.search);
    const nextUrl = window.location.pathname + "?" + query + window.location.hash;
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, "", nextUrl);
  }, [loopEnabled, loopEnd, loopStart, metronomeEnabled, tempo, urlReady]);

  function currentPracticeState(): PracticeDemoState {
    return { tempo, loopEnabled, metronomeEnabled, loopStart, loopEnd };
  }

  function applyTempo(nextTempo: number) {
    const safeTempo = Math.max(60, Math.min(144, nextTempo));
    setTempo(safeTempo);
    setShareStatus("");
    if (audioRef.current) audioRef.current.playbackRate = safeTempo / BASE_TEMPO;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (loopEnabled && (audio.currentTime < loopStart * BEAT_SECONDS || audio.currentTime >= loopEnd * BEAT_SECONDS)) {
      audio.currentTime = loopStart * BEAT_SECONDS;
    }
    audio.playbackRate = tempo / BASE_TEMPO;
    try {
      await audio.play();
    } catch {
      setPlaying(false);
      setError(copy.error);
    }
  }

  function updateLoopStart(nextStart: number) {
    setLoopStart(nextStart);
    if (nextStart >= loopEnd) setLoopEnd(Math.min(NOTES.length, nextStart + 1));
    if (audioRef.current) audioRef.current.currentTime = nextStart * BEAT_SECONDS;
    setCurrentTime(nextStart * BEAT_SECONDS);
    setShareStatus("");
  }

  function updateLoopEnd(nextEnd: number) {
    setLoopEnd(nextEnd);
    if (nextEnd <= loopStart) setLoopStart(Math.max(0, nextEnd - 1));
    setShareStatus("");
  }

  function resetPractice() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.playbackRate = PRACTICE_DEMO_DEFAULTS.tempo / BASE_TEMPO;
      audio.currentTime = PRACTICE_DEMO_DEFAULTS.loopStart * BEAT_SECONDS;
    }
    setPlaying(false);
    setTempo(PRACTICE_DEMO_DEFAULTS.tempo);
    setLoopEnabled(PRACTICE_DEMO_DEFAULTS.loopEnabled);
    setMetronomeEnabled(PRACTICE_DEMO_DEFAULTS.metronomeEnabled);
    setLoopStart(PRACTICE_DEMO_DEFAULTS.loopStart);
    setLoopEnd(PRACTICE_DEMO_DEFAULTS.loopEnd);
    setCurrentTime(PRACTICE_DEMO_DEFAULTS.loopStart * BEAT_SECONDS);
    setError("");
    setShareStatus(copy.resetDone);
  }

  async function copyPracticeLink() {
    const query = serializePracticeDemoState(currentPracticeState(), window.location.search);
    const href = window.location.origin + window.location.pathname + "?" + query + window.location.hash;
    window.history.replaceState(window.history.state, "", href);
    let copied = false;

    try {
      await navigator.clipboard.writeText(href);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = href;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      textarea.remove();
    }

    setShareStatus(copied ? copy.copied : copy.copyFallback);
  }

  function handleShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const key = event.key === " " ? "space" : event.key.toLowerCase();
    if (!["space", "m", "l", "r", "+", "=", "-"].includes(key)) return;
    event.preventDefault();

    if (key === "space") {
      void togglePlayback();
    } else if (key === "m") {
      setMetronomeEnabled((value) => !value);
      setShareStatus("");
    } else if (key === "l") {
      setLoopEnabled((value) => !value);
      setShareStatus("");
    } else if (key === "r") {
      resetPractice();
    } else {
      applyTempo(tempo + (key === "-" ? -4 : 4));
    }
  }

  return (
    <section className="feature-practice-demo" aria-labelledby="feature-practice-title">
      <audio
        ref={audioRef}
        src={audioSrc}
        muted={muted}
        preload="none"
        onLoadedMetadata={(event) => { event.currentTarget.playbackRate = tempo / BASE_TEMPO; }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (loopEnabled && audio.currentTime >= loopEnd * BEAT_SECONDS - 0.02) {
            audio.currentTime = loopStart * BEAT_SECONDS;
          }
          setCurrentTime(audio.currentTime);
        }}
        onEnded={(event) => {
          if (loopEnabled) {
            event.currentTarget.currentTime = loopStart * BEAT_SECONDS;
            void event.currentTarget.play().catch(() => {
              setPlaying(false);
              setError(copy.error);
            });
          } else {
            setPlaying(false);
            setCurrentTime(0);
          }
        }}
        onError={() => setError(copy.error)}
      />

      <div className="feature-practice-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="feature-practice-title">{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <span><CheckSealIcon width={18} height={18} /><strong>{copy.ready}</strong>{copy.readyDetail}</span>
      </div>

      <div
        className="feature-practice-stage"
        role="group"
        tabIndex={0}
        aria-label={copy.shortcutRegion}
        onKeyDown={handleShortcut}
      >
        <div className={"feature-practice-signal" + (playing ? " is-playing" : "")} style={signalStyle} aria-hidden="true">
          <i />
          {SIGNAL_LEVELS.map((level, index) => (
            <span
              key={String(level) + "-" + String(index)}
              className={playing && Math.floor(index / 3) === currentBeat ? "is-active" : undefined}
              style={{ height: String(level) + "%" }}
            />
          ))}
        </div>

        <div className="feature-practice-score" aria-label={NOTES.join(", ") + "; " + copy.beat + " " + String(currentBeat + 1)}>
          {NOTES.map((note, index) => {
            const inLoop = !loopEnabled || (index >= loopStart && index < loopEnd);
            const active = playing && index === currentBeat;
            return (
              <div key={note} className={(inLoop ? "is-in-loop" : "is-outside-loop") + (active ? " is-active" : "")}>
                <i aria-hidden="true" />
                <strong>{note}</strong>
                <small>{index + 1}</small>
                {metronomeEnabled ? <span aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>

        <div className="feature-practice-controls">
          <button type="button" className="public-button primary" onClick={() => void togglePlayback()}>{playing ? copy.pause : copy.play}</button>
          <button
            type="button"
            className="public-button secondary"
            aria-pressed={!muted}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? copy.muted : copy.sound}
          </button>
          <label className="feature-practice-range">
            <span>{copy.tempo}: <strong>{tempo} BPM</strong></span>
            <input type="range" min="60" max="144" step="4" value={tempo} onChange={(event) => applyTempo(Number(event.target.value))} />
          </label>
          <div className="feature-tempo-presets" role="group" aria-label={copy.tempo}>
            {TEMPO_PRESETS.map((value) => (
              <button key={value} type="button" className={tempo === value ? "is-active" : undefined} aria-pressed={tempo === value} onClick={() => applyTempo(value)}>{value}</button>
            ))}
          </div>
          <label className="feature-practice-toggle"><input type="checkbox" checked={loopEnabled} onChange={(event) => { setLoopEnabled(event.target.checked); setShareStatus(""); }} /><span>{copy.loop}</span></label>
          <label className="feature-practice-toggle"><input type="checkbox" checked={metronomeEnabled} onChange={(event) => { setMetronomeEnabled(event.target.checked); setShareStatus(""); }} /><span>{copy.metronome}</span></label>
          <label className="feature-practice-select"><span>{copy.start}</span><select value={loopStart} disabled={!loopEnabled} onChange={(event) => updateLoopStart(Number(event.target.value))}>{LOOP_STARTS.map((beat) => <option key={beat} value={beat}>{beat + 1}</option>)}</select></label>
          <label className="feature-practice-select"><span>{copy.end}</span><select value={loopEnd} disabled={!loopEnabled} onChange={(event) => updateLoopEnd(Number(event.target.value))}>{LOOP_ENDS.map((beat) => <option key={beat} value={beat}>{beat}</option>)}</select></label>
        </div>

        <div className="feature-practice-experiment">
          <div>
            <span>{copy.experiment}</span>
            <strong>{copy.experimentTitle}</strong>
            <p>{copy.experimentBody}</p>
          </div>
          <div className="feature-practice-share-actions">
            <button type="button" className="public-button secondary" onClick={() => void copyPracticeLink()}>{copy.copyLink}</button>
            <button type="button" className="public-button tertiary" onClick={resetPractice}>{copy.reset}</button>
          </div>
          <p className="feature-practice-share-status" aria-live="polite">{shareStatus}</p>
        </div>

        <div className="feature-practice-shortcuts" aria-label={copy.shortcuts}>
          <span>{copy.shortcuts}</span>
          <div><kbd>Space</kbd><small>{copy.shortcutPlay}</small></div>
          <div><kbd>− / +</kbd><small>{copy.shortcutTempo}</small></div>
          <div><kbd>L</kbd><small>{copy.shortcutLoop}</small></div>
          <div><kbd>M</kbd><small>{copy.shortcutMetronome}</small></div>
          <div><kbd>R</kbd><small>{copy.shortcutReset}</small></div>
        </div>

        <div className="feature-practice-footer">
          <p aria-live="polite">{copy.beat}: <strong>{currentBeat + 1} · {NOTES[currentBeat]}</strong>{error ? <span role="status">{error}</span> : null}</p>
          <Link href={workspaceHref} className="public-button tertiary">{workspaceAvailable ? copy.actionAvailable : copy.actionUnavailable}<ArrowNorthEastIcon width={15} height={15} /></Link>
        </div>
      </div>
    </section>
  );
}
