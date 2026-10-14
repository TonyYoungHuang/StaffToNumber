"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useFlowMessages } from "../lib/flow-messages/client";
import { ProcessingProgress } from "@score/ui";
import { useAppLocale } from "./AppLocaleProvider";

type Activity = { busy: boolean; pending: boolean; message: string; error: boolean; blocking: boolean };
const ActivityContext = createContext<{ locked: boolean; register: (id: string, activity: Activity | null) => void } | null>(null);

export function useScoreActivity(busy: boolean, pending: boolean, message: string, error = false, blocking = true) {
  const id = useId();
  const register = useContext(ActivityContext)?.register;
  useEffect(() => {
    register?.(id, busy || pending || error ? { busy, pending, message, error, blocking } : null);
    return () => register?.(id, null);
  }, [id, register, busy, pending, message, error, blocking]);
  return Boolean(register);
}

export function useScoreNavigationLocked() {
  return useContext(ActivityContext)?.locked ?? false;
}

export function ScoreOperationBoundary({ children }: { children: ReactNode }) {
  const { locale } = useAppLocale();
  const copy = useFlowMessages().scoreOperations;
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [slow, setSlow] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const lastFocused = useRef<HTMLElement | null>(null);
  const wasBusy = useRef(false);
  const lastActivity = useRef<{ id: string; message: string } | null>(null);
  const register = useCallback((id: string, activity: Activity | null) => {
    setActivities(current => {
      if (!activity && !current[id]) return current;
      const next = { ...current };
      if (activity) next[id] = activity;
      else delete next[id];
      return next;
    });
  }, []);
  const activeEntry = Object.entries(activities).find(([, activity]) => activity.busy);
  const active = activeEntry?.[1];
  const busy = Boolean(active);
  const blocking = Object.values(activities).some(activity => activity.busy && activity.blocking);
  const locked = blocking || Object.values(activities).some(activity => activity.pending);
  const context = useMemo(() => ({ locked, register }), [locked, register]);

  useEffect(() => {
    if (activeEntry) lastActivity.current = { id: activeEntry[0], message: activeEntry[1].message };
  }, [activeEntry?.[0], active?.message]);

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
    wasBusy.current = blocking;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    if (!blocking) return () => window.clearTimeout(timer);
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
  }, [busy, blocking]);

  return <ActivityContext.Provider value={context}>
    <ProcessingProgress active={busy} label={active?.message ?? lastActivity.current?.message ?? copy.wait} error={!busy && Boolean(lastActivity.current && activities[lastActivity.current.id]?.error)} operationKey={activeEntry?.[0] ?? lastActivity.current?.id} className="score-operation-notice" style={{ top: headerHeight + 12 }} locale={locale} />
    {busy ? <p className="helper-copy" role="status">{slow ? copy.slow : copy.wait}</p> : null}
    {locked && !busy && <div className="score-operation-notice" style={{ top: headerHeight + 12 }} role="status" aria-live="polite" data-score-operation="pending">
      <div><strong>{copy.unsaved}</strong><p>{copy.saveFirst}</p></div>
    </div>}
    <fieldset className="score-operation-content" disabled={blocking} inert={blocking} aria-busy={busy}
      onFocusCapture={event => { if (!blocking) lastFocused.current = event.target as HTMLElement; }}>
      {children}
    </fieldset>
  </ActivityContext.Provider>;
}
