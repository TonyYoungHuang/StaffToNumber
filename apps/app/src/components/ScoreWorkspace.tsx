"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useScoreNavigationLocked } from "./ScoreOperationBoundary";
import { useFlowMessages } from "../lib/flow-messages/client";
import { useAppLocale } from "./AppLocaleProvider";

export type WorkspaceView = "edit" | "jianpu" | "transpose" | "play" | "export" | "share" | "history" | "parts" | "source" | "teaching" | "advanced";
const mainViews: WorkspaceView[] = ["edit", "transpose", "play", "export"];
const extraViews: WorkspaceView[] = ["parts", "share", "history", "source", "teaching", "advanced", "jianpu"];
const anchors: Record<WorkspaceView, string> = { edit: "visual-editor", jianpu: "jianpu-preview", transpose: "transpose-score", play: "playback-practice", export: "export-center", share: "score-sharing", history: "revision-history", parts: "score-parts", source: "omr-comparison", teaching: "teaching-workflow", advanced: "score-json-model" };
const aliasViews: Record<string, WorkspaceView> = { "correction-editor": "edit", "live-collaboration": "share", "project-comments": "share", "score-jobs": "export", "print-export-settings": "export", "audio-export-settings": "export" };
const WorkspaceContext = createContext<WorkspaceView>("edit");

export function ScoreWorkspace({ header, preview, children }: { header: ReactNode; preview?: ReactNode; children: ReactNode }) {
  const { locale } = useAppLocale();
  const locked = useScoreNavigationLocked();
  const lockedRef = useRef(locked); lockedRef.current = locked;
  const copy = useFlowMessages();
  const [sheetOpen, setSheetOpen] = useState(true);
  const [view, setView] = useState<WorkspaceView>("edit");
  useEffect(() => {
    const sync = () => {
      // Next can cache the original hash as part of a route's canonical URL and
      // append a later destination hash on return. The last known tool is the
      // user's destination; normalize it before resolving the panel.
      const rawAnchor = window.location.hash.slice(1);
      const anchor = rawAnchor.split("#").at(-1) ?? "";
      const found = Object.entries(anchors).find(([, value]) => value === anchor)?.[0] as WorkspaceView | undefined;
      if (rawAnchor !== anchor && (found || aliasViews[anchor])) {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${anchor}`);
      }
      if (!lockedRef.current) setView(found ?? aliasViews[anchor] ?? "edit");
    };
    sync();
    // Next's same-page Link navigation uses pushState without a hashchange.
    // Resolve the clicked anchor as well as native hash/back navigation.
    const followAnchor = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      const anchor = url.hash.slice(1);
      const next = Object.entries(anchors).find(([, value]) => value === anchor)?.[0] as WorkspaceView | undefined;
      const destination = next ?? aliasViews[anchor];
      if (destination) select(destination);
    };
    document.addEventListener("click", followAnchor);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { document.removeEventListener("click", followAnchor); window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  function select(next: WorkspaceView) {
    if (lockedRef.current) return;
    setView(next);
    setSheetOpen(true);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${anchors[next]}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    document.getElementById("score-workspace-tools")?.scrollIntoView({ block: "start" });
  }
  return <WorkspaceContext.Provider value={view}>
    <div className="score-workspace page-stack">
      {header}
      <nav id="score-workspace-tools" className="workspace-tools" aria-label={copy.edit}>
        {mainViews.map(name => <button key={name} type="button" className={`button ${view === name ? "button-primary" : "button-secondary"}`} aria-pressed={view === name} disabled={locked} onClick={() => select(name)}>{copy[name]}</button>)}
        <label className="workspace-more"><span className="sr-only">{copy.more}</span><select className="field-select" aria-label={copy.more} disabled={locked} value={extraViews.includes(view) ? view : ""} onChange={event => select(event.target.value as WorkspaceView)}>
          <option value="" disabled>{copy.more}</option>
          {extraViews.map(name => <option key={name} value={name}>{copy[name]}</option>)}
        </select></label>
      </nav>
      <div className="workspace-body" data-view={view}>
        <div className="workspace-canvas" hidden={view === "edit"}>{view !== "edit" ? preview : null}</div>
        <div className="workspace-properties" data-expanded={sheetOpen}>
          {view !== "edit" ? <button type="button" className="workspace-sheet-handle" aria-expanded={sheetOpen} aria-controls="workspace-properties-content" onClick={() => setSheetOpen(value => !value)}><span aria-hidden="true" />{copy[view]}</button> : null}
          <div id="workspace-properties-content">{children}</div>
        </div>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}

// Keep panels mounted so switching views preserves unsaved fields and playback.
export function WorkspacePanel({ name, children }: { name: WorkspaceView; children: ReactNode }) {
  const view = useContext(WorkspaceContext);
  return <div className="workspace-panel stack-lg" data-workspace-view={name} hidden={view !== name}>{children}</div>;
}
