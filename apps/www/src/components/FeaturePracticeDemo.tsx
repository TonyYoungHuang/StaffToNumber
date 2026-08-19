"use client";

import Link from "next/link";
import type { SupportedLocale } from "@score/shared";
import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useState, useRef } from "react";
import { ArrowNorthEastIcon, CheckSealIcon } from "@score/ui";
import {
  PRACTICE_DEMO_DEFAULTS,
  parsePracticeDemoState,
  serializePracticeDemoState,
  type PracticeDemoState,
} from "../lib/practice-demo-state";

const BEAT_SECONDS = 0.8;
const BASE_TEMPO = 96;
const NOTES = ["C4", "D4", "E4", "G4"];
const TEMPO_PRESETS = [72, 96, 120];
const LOOP_STARTS = [0, 1, 2];
const LOOP_ENDS = [2, 3, 4];
const SIGNAL_LEVELS = [38, 68, 48, 82, 56, 74, 42, 88, 52, 70, 46, 78];

export function FeaturePracticeDemo({
  locale,
  workspaceHref,
  workspaceAvailable,
}: {
  locale: SupportedLocale;
  workspaceHref: string;
  workspaceAvailable: boolean;
}) {
  const isChinese = locale === "zh-CN";
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

  const copy = isChinese
    ? {
        title: "在专门的练习页里控制循环、速度和节拍",
        body: "这段公开演示使用与首页相同的自制 MusicXML/WAV。完整工作区再提供按小节循环、倒拍、声部 solo/mute 和 Tone.js 节拍器。",
        play: "播放练习段",
        pause: "暂停",
        muted: "默认静音",
        sound: "声音已开启",
        tempo: "练习速度",
        loop: "循环片段",
        metronome: "可视节拍器",
        start: "起始拍",
        end: "结束拍",
        beat: "当前拍",
        ready: "真实产品范围",
        action: workspaceAvailable ? "进入工作区练习" : "查看工作区开放状态",
        error: "音频没有成功加载，请稍后重试或下载 WAV 检查。",
        experiment: "实验练习工具",
        experimentTitle: "把这一组练习设置作为链接带走",
        experimentBody: "速度、循环区间和节拍器会写入当前 URL；声音始终默认静音，不会写入分享链接。",
        copyLink: "复制练习链接",
        copied: "练习链接已复制。",
        copyFallback: "浏览器阻止了自动复制，设置已写入地址栏。",
        reset: "恢复默认",
        resetDone: "已恢复 96 BPM、循环第 2～3 拍和可视节拍器。",
        shortcuts: "聚焦此练习舞台后可用快捷键",
        shortcutRegion: "练习舞台。按空格播放或暂停，M 切换节拍器，L 切换循环，加减号调整速度，R 恢复默认。",
        shortcutPlay: "播放/暂停",
        shortcutTempo: "调整速度",
        shortcutLoop: "循环",
        shortcutMetronome: "节拍器",
        shortcutReset: "重置",
      }
    : {
        title: "Control loops, tempo, and the metronome on the dedicated practice page",
        body: "This public demo uses the same self-authored MusicXML/WAV as the homepage. The full workspace adds measure loops, count-in, part solo/mute, and a Tone.js metronome.",
        play: "Play practice phrase",
        pause: "Pause",
        muted: "Muted by default",
        sound: "Sound enabled",
        tempo: "Practice tempo",
        loop: "Loop section",
        metronome: "Visual metronome",
        start: "Start beat",
        end: "End beat",
        beat: "Current beat",
        ready: "Real product scope",
        action: workspaceAvailable ? "Practice in the workspace" : "Check workspace availability",
        error: "The audio did not load. Try again later or download the WAV to inspect it.",
        experiment: "Experimental practice lab",
        experimentTitle: "Take this exact practice setup with you",
        experimentBody: "Tempo, loop boundaries, and the metronome live in the URL. Sound always stays muted by default and is never shared.",
        copyLink: "Copy practice link",
        copied: "Practice link copied.",
        copyFallback: "The browser blocked automatic copying. The setup is ready in the address bar.",
        reset: "Reset defaults",
        resetDone: "Reset to 96 BPM, beats 2–3, and the visual metronome.",
        shortcuts: "Keyboard controls are available when this practice stage is focused",
        shortcutRegion: "Practice stage. Press Space to play or pause, M for metronome, L for loop, plus or minus for tempo, and R to reset.",
        shortcutPlay: "Play/pause",
        shortcutTempo: "Change tempo",
        shortcutLoop: "Loop",
        shortcutMetronome: "Metronome",
        shortcutReset: "Reset",
      };

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
        src="/examples/score-to-audio/output?semitones=0"
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
          <p className="eyebrow">{isChinese ? "练习控制专项展示" : "Dedicated practice controls"}</p>
          <h2 id="feature-practice-title">{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <span><CheckSealIcon width={18} height={18} /><strong>{copy.ready}</strong>Score JSON → playback events</span>
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
          <Link href={workspaceHref} className="public-button tertiary">{copy.action}<ArrowNorthEastIcon width={15} height={15} /></Link>
        </div>
      </div>
    </section>
  );
}
