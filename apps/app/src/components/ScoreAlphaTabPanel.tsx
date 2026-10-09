"use client";

import { useEffect, useRef, useState } from "react";
import type { AlphaTabApi, model } from "@coderline/alphatab";
import type { PlaybackDocument, ScoreJson } from "@score/shared";
import { useAppLocale } from "./AppLocaleProvider";
import { getEnsembleMessages } from "../lib/ensemble-messages";
import { alphaTabEventMap } from "../lib/alpha-tab-event-map";
import { playbackToAlphaMidi } from "../lib/alpha-tab-playback";
import { apiRequest } from "../lib/api";
import styles from "./ScoreEnsembleWorkspace.module.css";

export function ScoreAlphaTabPanel({ scoreId, revisionId, isCandidate, token, musicXml, scoreJson, selectedPartId, onEventSelect }: {
  scoreId: string;
  revisionId: string;
  isCandidate: boolean;
  token: string | null;
  musicXml: string | null;
  scoreJson: ScoreJson;
  selectedPartId: string;
  onEventSelect: (eventId: string) => void;
}) {
  const { locale } = useAppLocale();
  const copy = getEnsembleMessages(locale);
  const container = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const onSelectRef = useRef(onEventSelect); onSelectRef.current = onEventSelect;
  const selectedPartRef = useRef(selectedPartId); selectedPartRef.current = selectedPartId;
  const [opened, setOpened] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState<Array<{ index: number; name: string }>>([]);
  const [muted, setMuted] = useState<number[]>([]);
  const [solo, setSolo] = useState<number[]>([]);
  const [mappingMessage, setMappingMessage] = useState(false);
  const [unplaced, setUnplaced] = useState<Array<{ id: string; label: string }>>([]);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!opened || !musicXml || !container.current) return;
    let cancelled = false;
    const controller = new AbortController();
    let api: AlphaTabApi | null = null;
    setState("loading"); setReady(false); setMappingMessage(false); setPlaying(false); setMuted([]); setSolo([]); setUnplaced([]);
    async function load() {
      try {
        const alphaTab = await import("@coderline/alphatab");
        if (cancelled || !container.current) return;
        // Use the unchanged, self-hosted 1.8.4 worker modules. Next's worker URL
        // rewriting does not understand alphaTab's Environment.alphaTabWorker
        // indirection; rendering on the main thread does not disable its synth.
        alphaTab.Environment.initializeMain(
          () => new Worker("/vendor/alphatab/alphaTab.worker.mjs", { type: "module" }),
          context => context.audioWorklet.addModule("/vendor/alphatab/alphaTab.worklet.mjs"),
        );
        api = new alphaTab.AlphaTabApi(container.current, {
          core: { fontDirectory: "/vendor/alphatab/font/", useWorkers: false, includeNoteBounds: true },
          display: { scale: 0.9, staveProfile: alphaTab.StaveProfile.Default },
          // alphaTab 1.8.4's AudioWorklet output stops an unstarted buffer
          // when a canonical MIDI reload precedes Play. Its supported
          // ScriptProcessor output handles reload/stop/destroy correctly.
          player: { playerMode: alphaTab.PlayerMode.EnabledSynthesizer, outputMode: alphaTab.PlayerOutputMode.WebAudioScriptProcessor, soundFont: "/vendor/alphatab/soundfont/sonivox.sf2", enableCursor: true, enableUserInteraction: true, scrollElement: container.current },
        });
        apiRef.current = api;
        let map = new WeakMap<model.Note, string>();
        let canonicalMidi: ReturnType<typeof playbackToAlphaMidi> | null = null;
        let originalMidiLoaded = false;
        let canonicalRequested = false;
        let canonicalReady = false;
        const syncReady = () => { if (!cancelled) setReady(canonicalReady && Boolean(api?.isReadyForPlayback)); };
        const installCanonicalMidi = () => {
          if (cancelled || !api?.player || !originalMidiLoaded || !canonicalMidi || canonicalRequested) return;
          canonicalRequested = true;
          api.player.loadMidiFile(canonicalMidi);
        };
        api.scoreLoaded.on(score => {
          if (cancelled || !api) return;
          map = alphaTabEventMap(score, scoreJson, musicXml!);
          const withoutString: Array<{ id: string; label: string }> = [];
          for (const track of score.tracks) for (const staff of track.staves) {
            if (!staff.showTablature) continue;
            for (const bar of staff.bars) for (const voice of bar.voices) for (const beat of voice.beats) {
              for (const note of beat.notes) if (note.isVisible && (!Number.isInteger(note.string) || note.string < 1 || note.string > staff.tuning.length)) {
                // There is no legitimate TAB position for an unspecified
                // string. Keep the canonical symbol and offer its event
                // separately; never invent a fret or remove source notation.
                note.isVisible = false;
                const id = map.get(note);
                if (id) withoutString.push({ id, label: `${track.name} · ${bar.index + 1} · ×` });
              }
              if (beat.notes.length && beat.notes.every(note => !note.isVisible)) beat.isEmpty = true;
            }
          }
          setUnplaced(withoutString);
          void apiRequest<{ playback: PlaybackDocument; revisionId?: string }>(`/api/scores/${encodeURIComponent(scoreId)}/${isCandidate ? "candidate/" : ""}playback`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, signal: controller.signal }).then(response => {
            if (cancelled) return;
            if (!response.ok || !response.data?.playback) throw new Error("Canonical playback is unavailable.");
            if (response.data.revisionId !== revisionId) throw new Error("The playback revision has changed. Reload the score.");
            canonicalMidi = playbackToAlphaMidi(alphaTab, response.data.playback, score);
            installCanonicalMidi();
          }).catch(() => { if (!cancelled) { setState("error"); setReady(false); } });
          setTracks(score.tracks.map(track => ({ index: track.index, name: track.name })));
          const part = scoreJson.parts.find(item => item.id === selectedPartRef.current);
          const selected = part ? score.tracks.filter(track => track.name === part.name) : [];
          if (selected.length === 1) api.renderTracks(selected);
        });
        api.noteMouseDown.on(note => {
          const id = map.get(note);
          setMappingMessage(!id);
          if (id) onSelectRef.current(id);
        });
        api.renderFinished.on(() => { if (!cancelled) setState(current => current === "error" ? current : "ready"); });
        // In alphaTab 1.8.4 subscribing to api.midiLoaded reads its recursive
        // worker loadedMidiInfo getter. playerReady is the public equivalent
        // completion signal and fires again after our canonical MIDI loads.
        api.playerReady.on(() => {
          if (!originalMidiLoaded) { originalMidiLoaded = true; installCanonicalMidi(); }
          else if (canonicalRequested) { canonicalReady = true; syncReady(); }
        });
        api.soundFontLoaded.on(syncReady);
        api.playerStateChanged.on(args => { if (!cancelled) setPlaying(args.state === alphaTab.synth.PlayerState.Playing); });
        api.error.on(() => { if (!cancelled) { setState("error"); setReady(false); } });
        // The importer can omit a completely empty manual part. Its public
        // all-tracks marker uses the imported model instead of guessed indices.
        if (!api.load(new TextEncoder().encode(musicXml!), [-1])) throw new Error("Unsupported notation preview");
      } catch (error) {
        console.warn("Instrument preview initialization failed", error);
        if (!cancelled) { setState("error"); setReady(false); }
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); api?.destroy(); if (apiRef.current === api) apiRef.current = null; };
  }, [opened, musicXml, scoreJson, scoreId, revisionId, isCandidate, token, attempt]);
  useEffect(() => {
    const api = apiRef.current;
    if (!api?.score) return;
    const part = scoreJson.parts.find(item => item.id === selectedPartId);
    const selected = part ? api.score.tracks.filter(track => track.name === part.name) : api.score.tracks;
    if (selected.length) api.renderTracks(selected);
  }, [selectedPartId, scoreJson]);
  function toggle(index: number, mode: "mute" | "solo") {
    const api = apiRef.current;
    const track = api?.score?.tracks[index];
    if (!api || !track) return;
    const current = mode === "mute" ? muted : solo;
    const on = !current.includes(index);
    const next = on ? [...current, index] : current.filter(value => value !== index);
    if (mode === "mute") { api.changeTrackMute([track], on); setMuted(next); }
    else { api.changeTrackSolo([track], on); setSolo(next); }
  }
  return <section className="surface-panel stack-lg" data-alpha-tab-panel>
    <h2 className="card-title">{copy.tabDrumTitle}</h2>
    {!opened ? <button type="button" className="button button-secondary" disabled={!musicXml} onClick={() => setOpened(true)}>{copy.loadTabPlayer}</button> : null}
    {opened && state === "loading" ? <p role="status">{copy.loading}</p> : null}
    {opened && state === "error" ? <div role="alert"><p className="form-status error">{copy.playerFailed}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button></div> : null}
    {opened ? <>
      <div className={styles.toolbar}>
        <button type="button" className="button button-primary" disabled={!ready} onClick={() => playing ? apiRef.current?.pause() : apiRef.current?.play()}>{playing ? copy.pause : copy.play}</button>
        <button type="button" className="button button-secondary" disabled={!ready} onClick={() => apiRef.current?.stop()}>{copy.stop}</button>
        <label className="field-group"><span>{copy.speed}</span><select className="field-select" defaultValue="1" disabled={!ready} onChange={event => { if (apiRef.current) apiRef.current.playbackSpeed = Number(event.target.value); }}><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option></select></label>
        <label className="field-group"><span>{copy.volume}</span><input aria-label={copy.volume} type="range" min="0" max="1" step="0.05" defaultValue="0.8" onChange={event => { if (apiRef.current) apiRef.current.masterVolume = Number(event.target.value); }} /></label>
      </div>
      <div className={styles.trackGrid}>{tracks.map(track => <div key={track.index} className={styles.track}><strong>{track.name}</strong><label><input type="checkbox" checked={muted.includes(track.index)} onChange={() => toggle(track.index, "mute")} />{copy.mute}</label><label><input type="checkbox" checked={solo.includes(track.index)} onChange={() => toggle(track.index, "solo")} />{copy.solo}</label></div>)}</div>
      {mappingMessage ? <p className="helper-copy" role="status">{copy.playerMappingMissing}</p> : null}
      {unplaced.length ? <div className="stack-md"><p className="helper-copy">{copy.tabPositionMissing}</p><div className={styles.toolbar}>{unplaced.map(item => <button type="button" className="button button-secondary" key={item.id} data-alpha-unplaced-event-id={item.id} onClick={() => onSelectRef.current(item.id)}>{item.label}</button>)}</div></div> : null}
      <div className={styles.player}><div ref={container} className={styles.playerInner} data-alpha-tab-container /></div>
    </> : null}
  </section>;
}
