"use client";

import { useEffect, useRef, useState } from "react";
import type { GuestSampleCopy } from "../lib/guest-sample-copy";
import {
  GUEST_SAMPLE_KEYS, guestSample, guestSampleDuration, guestSampleFrequency, guestSampleMeasureAt,
  type GuestSampleEvent, type GuestSampleKey, type GuestSampleNotation,
} from "../lib/guest-sample";
import styles from "./GuestSampleDemo.module.css";

function JianpuNote({ event }: { event: GuestSampleEvent }) {
  const octave = event.octaveShift ?? 0;
  const lines = event.durationType === "eighth" ? 1 : event.durationType === "16th" ? 2 : 0;
  const extension = event.durationType === "whole" ? " — — —" : event.durationType === "half" ? " —" : "";
  const accidental = (event.accidental ?? 0) > 0 ? "♯" : (event.accidental ?? 0) < 0 ? "♭" : "";
  return (
    <span className={styles.note}>
      <span className={styles.octave}>{octave > 0 ? "·".repeat(octave) : "\u00a0"}</span>
      <span className={styles.degree} style={{ borderBottom: lines ? `${lines === 1 ? 1 : 3}px ${lines === 1 ? "solid" : "double"}` : undefined }}>
        {event.type === "rest" ? "0" : accidental + String(event.degree)}{event.dots ? "·".repeat(event.dots) : ""}{extension}
      </span>
      <span className={styles.octave}>{octave < 0 ? "·".repeat(-octave) : "\u00a0"}</span>
    </span>
  );
}

export function GuestSampleWorkbench({ copy, scanLabel }: {
  copy: GuestSampleCopy;
  scanLabel: string;
}) {
  const [key, setKey] = useState<GuestSampleKey>("C");
  const [notation, setNotation] = useState<GuestSampleNotation>("staff");
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState("");
  const contextRef = useRef<AudioContext | null>(null);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const variant = guestSample.variants[key];
  const duration = guestSampleDuration(variant);
  const activeMeasure = playing ? guestSampleMeasureAt(variant, position) : undefined;

  function stop() {
    generationRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setPlaying(false);
    setStarting(false);
    setPosition(0);
  }

  useEffect(() => () => {
    generationRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    if (contextRef.current && contextRef.current.state !== "closed") void contextRef.current.close();
  }, []);

  async function play() {
    stop();
    setError("");
    setStarting(true);
    const generation = generationRef.current;
    try {
      // The prepared Score JSON timeline supplies all pitches, rhythms and repeats.
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio unavailable");
      const context = new AudioContextClass();
      contextRef.current = context;
      // Unlock audio synchronously inside the user gesture, including Safari.
      const unlock = context.createBufferSource();
      unlock.buffer = context.createBuffer(1, 1, context.sampleRate);
      unlock.connect(context.destination); unlock.start();
      await Promise.race([context.resume(), new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Audio start timed out")), 8000))]);
      if (context.state !== "running") throw new Error("Audio context suspended");
      if (generation !== generationRef.current) return;
      const startAt = context.currentTime + 0.04;
      const secondsPerBeat = 60 / variant.playback.tempoBpm;
      for (const event of variant.playback.events) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = startAt + event.startBeat * secondsPerBeat;
        const end = start + event.soundDurationBeats * secondsPerBeat;
        oscillator.type = "triangle";
        oscillator.frequency.value = guestSampleFrequency(event.midi);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(event.velocity * 0.22, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
      }
      setStarting(false);
      setPlaying(true);
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(0, context.currentTime - startAt);
        if (elapsed >= duration) stop();
        else setPosition(elapsed);
      }, 80);
    } catch {
      if (generation !== generationRef.current) return;
      stop();
      setError(copy.error);
    }
  }

  return (
    <section id="sample-score-demo" className={styles.demo} aria-labelledby="guest-sample-title" data-guest-sample>
      <div className={styles.heading}>
        <p className="eyebrow">{copy.badge}</p>
        <h2 id="guest-sample-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <div className={styles.workbench}>
        <details className={styles.source}>
          <summary>{copy.source}</summary>
          <img src={guestSample.source.image} alt={copy.sourceAlt} width={340} loading="lazy" />
        </details>
        <div className={styles.controls}>
          <label className={styles.key}>
            <span>{copy.key}</span>
            <select value={key} onChange={(event) => { stop(); setError(""); setKey(event.target.value as GuestSampleKey); }}>
              {GUEST_SAMPLE_KEYS.map((value) => <option key={value} value={value}>{copy.keyNames[value]}</option>)}
            </select>
          </label>
          <div className={styles.notations} role="group" aria-label={copy.prepared}>
            <button type="button" aria-pressed={notation === "staff"} onClick={() => setNotation("staff")}>{copy.staff}</button>
            <button type="button" aria-pressed={notation === "jianpu"} onClick={() => setNotation("jianpu")}>{copy.jianpu}</button>
          </div>
        </div>
        <div className={styles.score} aria-label={copy.prepared}>
          {notation === "staff" ? (
            <img src={variant.staffImage} alt={copy.preview.replace("{key}", copy.keyNames[key])} width={340} loading="lazy" />
          ) : (
            <div className={styles.jianpu}>
              <p>1={key === "Bb" ? "B♭" : key} · 4/4 · ♩=96</p>
              <div className={styles.measures}>
                {variant.jianpu.map((measure) => (
                  <div key={measure.id} className={styles.measure + (activeMeasure === measure.id ? ` ${styles.active}` : "")} aria-label={`${copy.measure} ${measure.number}`}>
                    <small>{measure.number}</small>
                    {measure.barlines.some((barline) => barline.ending) ? <span className={styles.ending}>{measure.barlines.find((barline) => barline.ending)?.ending?.number}.</span> : null}
                    {measure.barlines.some((barline) => barline.repeatDirection === "forward") ? <span aria-hidden="true">‖:</span> : null}
                    {measure.events.map((event) => <JianpuNote key={event.id} event={event} />)}
                    <span aria-hidden="true">{measure.barlines.some((barline) => barline.repeatDirection === "backward") ? ":‖" : "|"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <button type="button" className="public-button primary" aria-busy={starting} aria-pressed={playing || starting} onClick={() => playing || starting ? stop() : void play()}>{playing || starting ? copy.stop : copy.play}</button>
          <progress value={position} max={duration} aria-label={copy.progress} />
          <a className="public-button secondary" href="#home-workbench">{scanLabel}</a>
        </div>
        <p className={styles.allowance}>{copy.allowance}</p>
        {error ? <p role="status">{error}</p> : null}
      </div>
    </section>
  );
}
