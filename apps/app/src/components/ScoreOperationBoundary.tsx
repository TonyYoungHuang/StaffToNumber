"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useFlowMessages } from "../lib/flow-messages/client";

type Activity = { busy: boolean; pending: boolean; message: string };
const ActivityContext = createContext<{ locked: boolean; register: (id: string, activity: Activity | null) => void } | null>(null);

export function useScoreActivity(busy: boolean, pending: boolean, message: string) {
  const id = useId();
  const register = useContext(ActivityContext)?.register;
  useEffect(() => {
    register?.(id, busy || pending ? { busy, pending, message } : null);
    return () => register?.(id, null);
  }, [id, register, busy, pending, message]);
}

export function useScoreNavigationLocked() {
  return useContext(ActivityContext)?.locked ?? false;
}

export function ScoreOperationBoundary({ children }: { children: ReactNode }) {
  const copy = useFlowMessages().scoreOperations;
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [slow, setSlow] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const lastFocused = useRef<HTMLElement | null>(null);
  const wasBusy = useRef(false);
  const register = useCallback((id: string, activity: Activity | null) => {
    setActivities(current => {
      if (!activity && !current[id]) return current;
      const next = { ...current };
      if (activity) next[id] = activity;
      else delete next[id];
      return next;
    });
  }, []);
  const active = Object.values(activities).find(activity => activity.busy);
  const busy = Boolean(active);
  const locked = busy || Object.values(activities).some(activity => activity.pending);
  const context = useMemo(() => ({ locked, register }), [locked, register]);

  useEffect(() => {
    if (!locked) return;
    const header = document.querySelector(".app-header");
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [locked]);

  useEffect(() => {
    setSlow(false);
    if (!busy) {
      if (wasBusy.current && lastFocused.current?.isConnected && !lastFocused.current.closest("[hidden]")) {
        lastFocused.current.focus({ preventScroll: true });
      }
      wasBusy.current = false;
      return;
    }
    wasBusy.current = true;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (link && link.target !== "_blank" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigate, true);
    };
  }, [busy]);

  return <ActivityContext.Provider value={context}>
    {locked && <div className="score-operation-notice" style={{ top: headerHeight + 12 }} role="status" aria-live="polite" data-score-operation={busy ? "busy" : "pending"}>
      {busy && <span className="score-operation-spinner" aria-hidden="true" />}
      <div><strong>{active?.message ?? copy.unsaved}</strong><p>{busy ? slow ? copy.slow : copy.wait : copy.saveFirst}</p></div>
    </div>}
    <fieldset className="score-operation-content" disabled={busy} inert={busy} aria-busy={busy}
      onFocusCapture={event => { if (!busy) lastFocused.current = event.target as HTMLElement; }}>
      {children}
    </fieldset>
  </ActivityContext.Provider>;
}
