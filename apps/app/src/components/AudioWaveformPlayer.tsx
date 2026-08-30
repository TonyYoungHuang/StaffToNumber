"use client";

import { formatMessage, type SupportedLocale } from "@score/i18n";
import { forwardRef, useEffect, useRef, useState } from "react";
import { usePlaybackPracticeMessages } from "../lib/playback-practice-messages/client";
import {
  formatPlaybackDuration,
  formatPlaybackNumber,
} from "../lib/playback-practice-messages/formatters";

const EMPTY_MARKERS: number[] = [];

export const AudioWaveformPlayer = forwardRef<HTMLAudioElement, {
  src: string;
  locale: SupportedLocale;
  onTimeUpdate?: (seconds: number) => void;
  markers?: number[];
}>(function AudioWaveformPlayer({ src, locale, onTimeUpdate, markers = EMPTY_MARKERS }, forwardedRef) {
  const { messages } = usePlaybackPracticeMessages();
  const copy = messages.waveform;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformStatus, setWaveformStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  function setAudioRef(element: HTMLAudioElement | null) {
    audioRef.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }

  useEffect(() => {
    let cancelled = false;
    setWaveformStatus("loading");
    setPeaks([]);
    setDuration(0);
    setCurrentTime(0);
    const context = new AudioContext();
    void fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => context.decodeAudioData(buffer))
      .then((decoded) => {
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        const bucketCount = 600;
        const bucketSize = Math.max(1, Math.floor(channel.length / bucketCount));
        setPeaks(Array.from({ length: bucketCount }, (_, index) => {
          let peak = 0;
          const end = Math.min(channel.length, (index + 1) * bucketSize);
          for (let sample = index * bucketSize; sample < end; sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
          return peak;
        }));
        setDuration(decoded.duration);
        setWaveformStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPeaks([]);
        setWaveformStatus("unavailable");
      });
    return () => {
      cancelled = true;
      void context.close();
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    const playedX = duration > 0 ? (currentTime / duration) * width : 0;
    peaks.forEach((peak, index) => {
      const x = (index / peaks.length) * width;
      const barHeight = Math.max(2, peak * (height - 12));
      context.fillStyle = x <= playedX ? "#0f766e" : "#94a3b8";
      context.fillRect(x, (height - barHeight) / 2, Math.max(1, width / peaks.length), barHeight);
    });
    context.fillStyle = "#dc2626";
    for (const marker of markers) context.fillRect(duration > 0 ? (marker / duration) * width : 0, 0, 2, height);
  }, [currentTime, duration, markers, peaks]);

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const nextTime = Math.max(0, Math.min(duration, seconds));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    onTimeUpdate?.(nextTime);
  }

  const waveformValue = formatMessage(copy.waveformValueTemplate, {
    label: copy.waveformAria,
    current: formatPlaybackDuration(currentTime, locale),
    duration: formatPlaybackDuration(duration, locale),
  });

  return (
    <div className="audio-waveform-player stack-sm">
      <canvas
        ref={canvasRef}
        className="audio-waveform-canvas"
        role="slider"
        tabIndex={0}
        aria-label={copy.waveformAria}
        aria-valuemin={0}
        aria-valuemax={Math.max(1, duration)}
        aria-valuenow={Math.max(0, Math.min(duration, currentTime))}
        aria-valuetext={waveformValue}
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          if (!canvas || duration <= 0) return;
          const rect = canvas.getBoundingClientRect();
          seekTo(((event.clientX - rect.left) / rect.width) * duration);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            seekTo(currentTime - 1);
          } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            seekTo(currentTime + 1);
          } else if (event.key === "Home") {
            event.preventDefault();
            seekTo(0);
          } else if (event.key === "End") {
            event.preventDefault();
            seekTo(duration);
          }
        }}
      />
      {waveformStatus === "loading" ? <p className="helper-copy" role="status">{copy.waveformLoading}</p> : null}
      {waveformStatus === "unavailable" ? <p className="helper-copy" role="status">{copy.waveformUnavailable}</p> : null}
      <audio
        ref={setAudioRef}
        className="field-control"
        controls
        src={src}
        aria-label={copy.recordingPlayback}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
          onTimeUpdate?.(event.currentTarget.currentTime);
        }}
      />
      <label className="field-group compact">
        <span>{copy.practiceSpeed}</span>
        <select className="field-select" value={playbackRate} onChange={(event) => {
          const rate = Number(event.target.value);
          setPlaybackRate(rate);
          if (audioRef.current) audioRef.current.playbackRate = rate;
        }}>
          {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
            <option key={rate} value={rate}>
              {formatMessage(copy.rateTemplate, { rate: formatPlaybackNumber(rate, locale, { maximumFractionDigits: 2 }) })}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
});
