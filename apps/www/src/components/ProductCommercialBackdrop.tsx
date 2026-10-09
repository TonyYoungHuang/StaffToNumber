"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ProductCommercialBackdrop.module.css";

type Props = {
  title: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  filmSrc: string;
  pricingHref: string;
};

export function ProductCommercialBackdrop({ title, description, videoSrc, posterSrc, filmSrc, pricingHref }: Props) {
  const id = useId();
  const regionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const userStarted = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  function loadVideo() {
    const video = videoRef.current;
    if (video && !video.getAttribute("src")) {
      video.src = videoSrc;
      video.load();
    }
    return video;
  }

  useEffect(() => {
    const video = videoRef.current;
    const region = regionRef.current;
    if (!video || !region) return;
    let visible = false;
    let disposed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    video.muted = true;
    video.defaultMuted = true;

    const canPlay = () => visible && !document.hidden && !userPaused.current &&
      (userStarted.current || (!motion.matches && !connection?.saveData));
    function synchronize() {
      if (disposed) return;
      if (!canPlay()) { video!.pause(); return; }
      if (!video!.getAttribute("src")) { video!.src = videoSrc; video!.load(); }
      if (video!.paused && !video!.error) void video!.play().catch(() => undefined);
    }
    // A pending play() can resolve after scrolling away. Check again when the
    // browser actually starts playback, including when returning to a tab.
    function guardPlayback() { if (!canPlay()) video!.pause(); }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.12;
      synchronize();
    }, { threshold: [0, 0.12] });
    observer.observe(region);
    motion.addEventListener("change", synchronize);
    connection?.addEventListener?.("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    video.addEventListener("play", guardPlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener("change", synchronize);
      connection?.removeEventListener?.("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
      video.removeEventListener("play", guardPlayback);
      video.pause();
    };
  }, [videoSrc]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      userPaused.current = true;
      video.pause();
    } else {
      userStarted.current = true;
      userPaused.current = false;
      loadVideo();
      void video.play().catch(() => undefined);
    }
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted && video.paused && !userPaused.current) {
      userStarted.current = true;
      loadVideo();
      void video.play().catch(() => undefined);
    }
  }

  return (
    <section ref={regionRef} className={styles.section} aria-labelledby={`${id}-title`} lang="en">
      <div className={styles.media} style={{ backgroundImage: `url("${posterSrc}")` }} aria-hidden="true">
        <video
          ref={videoRef}
          id={`${id}-video`}
          className={styles.video}
          width={1920}
          height={1080}
          muted={muted}
          loop
          playsInline
          preload="none"
          poster={posterSrc}
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => { setFailed(true); setPlaying(false); }}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        />
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.eyebrow}>ScoreTransposer by the numbers</p>
        <h2 id={`${id}-title`}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <dl className={styles.metrics} aria-label="ScoreTransposer in numbers">
          <div><dt>Users</dt><dd>2K</dd></div>
          <div><dt>Countries</dt><dd>97</dd></div>
          <div><dt>Scores corrected</dt><dd>65K</dd></div>
        </dl>
        <div className={styles.actions}>
          <a className={styles.primary} href="#home-workbench">Start with your score <span aria-hidden="true">↗</span></a>
          <a className={styles.secondary} href={pricingHref}>Explore plans <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div className={styles.controls}>
        {failed ? <a className={styles.fallback} href={filmSrc}>Watch the film ↗</a> : <>
          <button type="button" onClick={toggleSound} aria-controls={`${id}-video`} aria-label={muted ? "Enable sound" : "Mute sound"} className={styles.sound}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M11 4 6 8H3v8h3l5 4V4Z" />
              {muted ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
            </svg>
            <span>{muted ? "Sound off" : "Sound on"}</span>
          </button>
          <button type="button" onClick={togglePlayback} aria-controls={`${id}-video`} aria-label={playing ? "Pause animation" : "Play animation"} className={styles.play}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="m7 4 14 8-14 8z" />}</svg>
          </button>
        </>}
      </div>
    </section>
  );
}
