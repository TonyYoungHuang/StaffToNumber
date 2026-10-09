"use client";

import { useId, useRef, useState } from "react";
import styles from "./ProductOverviewVideo.module.css";

export type ProductOverviewVideoChapter = {
  start: number;
  title: string;
  detail: string;
};

export type ProductOverviewVideoProps = {
  title: string;
  description: string;
  playLabel: string;
  videoLabel: string;
  chapterLabel: string;
  posterSrc: string;
  videoSrc: string;
  captionsSrc: string;
  locale: string;
  chapters: readonly ProductOverviewVideoChapter[];
  note?: string;
};

function formatTime(seconds: number) {
  const time = Math.max(0, Math.floor(seconds));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;
}

function languageLabel(locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

export function ProductOverviewVideo({
  title,
  description,
  playLabel,
  videoLabel,
  chapterLabel,
  posterSrc,
  videoSrc,
  captionsSrc,
  locale,
  chapters,
  note,
}: ProductOverviewVideoProps) {
  const id = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeChapter, setActiveChapter] = useState(-1);
  const [failed, setFailed] = useState(false);
  const videoId = `${id}-video`;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const chaptersId = `${id}-chapters`;

  function updateChapter(time: number) {
    let current = -1;
    for (let index = 0; index < chapters.length; index += 1) {
      if (time >= chapters[index].start) current = index;
    }
    setActiveChapter(current);
  }

  function seekTo(start: number) {
    const video = videoRef.current;
    if (!video) return;

    const target = Math.max(0, start);
    pendingSeekRef.current = target;
    if (video.readyState >= 1) {
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(target, Math.max(0, video.duration - 0.01))
        : target;
      pendingSeekRef.current = null;
    }
    updateChapter(target);
  }

  function play(start?: number) {
    const video = videoRef.current;
    if (!video) return;

    // Seeking exactly onto adjacent caption boundaries can leave the previous
    // cue active in Chromium. Enter the new chapter by an imperceptible 10 ms.
    if (start !== undefined) seekTo(start + 0.01);
    // Invoke play within the user's click so audio is allowed on mobile too.
    // Native controls remain available if browser playback policy rejects it.
    void video.play().catch(() => undefined);
    video.focus({ preventScroll: true });
  }

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.heading}>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </div>

      <div className={styles.player}>
        <video
          ref={videoRef}
          id={videoId}
          className={styles.video}
          width={1920}
          height={1080}
          controls
          playsInline
          preload="none"
          lang={locale}
          poster={posterSrc}
          aria-label={videoLabel}
          aria-describedby={descriptionId}
          tabIndex={0}
          onPlay={() => {
            setHasStarted(true);
            setFailed(false);
          }}
          onTimeUpdate={(event) => updateChapter(event.currentTarget.currentTime)}
          onLoadedMetadata={() => {
            if (pendingSeekRef.current !== null) seekTo(pendingSeekRef.current);
          }}
          onError={() => setFailed(true)}
        >
          <source src={videoSrc} type="video/mp4" onError={() => setFailed(true)} />
          <track
            key={captionsSrc}
            kind="captions"
            src={captionsSrc}
            srcLang={locale}
            label={languageLabel(locale)}
            default
          />
          <a href={videoSrc}>{videoLabel}</a>
        </video>

        {!hasStarted && !failed ? (
          <div className={styles.playOverlay}>
            <button className={styles.playButton} type="button" aria-controls={videoId} onClick={() => play()}>
              <span className={styles.playIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M8 4.8a1 1 0 0 1 1.54-.84l10.08 6.2a2.16 2.16 0 0 1 0 3.68l-10.08 6.2A1 1 0 0 1 8 19.2Z" />
                </svg>
              </span>
              <span>{playLabel}</span>
            </button>
          </div>
        ) : null}
      </div>

      {failed ? <a className={styles.fallback} href={videoSrc}>{videoLabel}</a> : null}

      {chapters.length > 0 ? (
        <nav className={styles.chapters} aria-labelledby={chaptersId}>
          <h3 id={chaptersId}>{chapterLabel}</h3>
          <ol className={styles.chapterList}>
            {chapters.map((chapter, index) => (
              <li key={`${chapter.start}-${chapter.title}`}>
                <button
                  type="button"
                  className={styles.chapterButton}
                  aria-controls={videoId}
                  aria-current={index === activeChapter ? "true" : undefined}
                  onClick={() => play(chapter.start)}
                >
                  <span className={styles.timestamp}>{formatTime(chapter.start)}</span>
                  <span className={styles.chapterCopy}>
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                    <span className={styles.chapterDetail}>{chapter.detail}</span>
                  </span>
                  <span className={styles.chapterArrow} aria-hidden="true">↗</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {note ? <p className={styles.note}>{note}</p> : null}
    </section>
  );
}
