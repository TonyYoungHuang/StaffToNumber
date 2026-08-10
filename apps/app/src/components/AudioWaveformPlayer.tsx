"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

export const AudioWaveformPlayer = forwardRef<HTMLAudioElement, {
  src: string;
  locale: string;
  onTimeUpdate?: (seconds: number) => void;
  markers?: number[];
}>(function AudioWaveformPlayer({ src, locale, onTimeUpdate, markers = [] }, forwardedRef) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const isChinese = locale === "zh-CN";

  function setAudioRef(element: HTMLAudioElement | null) {
    audioRef.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }

  useEffect(() => {
    let cancelled = false;
    const context = new AudioContext();
    void fetch(src).then((response) => response.arrayBuffer()).then((buffer) => context.decodeAudioData(buffer)).then((decoded) => {
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
    }).catch(() => setPeaks([]));
    return () => { cancelled = true; void context.close(); };
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

  return (
    <div className="audio-waveform-player stack-sm">
      <canvas ref={canvasRef} className="audio-waveform-canvas" onPointerDown={(event) => {
        const canvas = canvasRef.current;
        const audio = audioRef.current;
        if (!canvas || !audio || duration <= 0) return;
        const rect = canvas.getBoundingClientRect();
        audio.currentTime = Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration));
      }} aria-label={isChinese ? "录音波形，可点击跳转" : "Recording waveform; click to seek"} />
      <audio ref={setAudioRef} className="field-control" controls src={src} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => {
        setCurrentTime(event.currentTarget.currentTime);
        onTimeUpdate?.(event.currentTarget.currentTime);
      }} />
      <label className="field-group compact">
        <span>{isChinese ? "速度训练" : "Practice speed"}</span>
        <select className="field-select" value={playbackRate} onChange={(event) => {
          const rate = Number(event.target.value);
          setPlaybackRate(rate);
          if (audioRef.current) audioRef.current.playbackRate = rate;
        }}>
          {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
      </label>
    </div>
  );
});
