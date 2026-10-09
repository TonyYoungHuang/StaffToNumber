"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { AuthForm } from "./AuthForm";

type OpenAuth = (mode?: "login" | "register", onDone?: () => void) => void;
const Context = createContext<OpenAuth | null>(null);
export function useAppAuthModal() {
  const open = useContext(Context);
  if (!open) throw new Error("AppAuthModalProvider required");
  return open;
}

export function AppAuthModalProvider({ children, messages }: { children: ReactNode; messages: AuthMessageCatalog }) {
  const [mode, setMode] = useState<"login" | "register" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef<(() => void) | undefined>(undefined);
  const open = useCallback<OpenAuth>((next = "login", onDone) => { callback.current = onDone; setMode(next); }, []);
  useEffect(() => {
    if (!mode || !dialog.current) return;
    const el = dialog.current, focus = document.activeElement;
    const position = { left: window.scrollX, top: window.scrollY, behavior: "instant" as ScrollBehavior };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.showModal(); window.scrollTo(position);
    return () => { el.close(); document.body.style.overflow = overflow; if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true }); window.scrollTo(position); };
  }, [mode]);
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || !["/login", "/register"].includes(url.pathname)) return;
      event.preventDefault(); event.stopPropagation(); open(url.pathname === "/register" ? "register" : "login");
    };
    document.addEventListener("click", listener, true);
    return () => document.removeEventListener("click", listener, true);
  }, [open]);
  return <Context.Provider value={open}>{children}{mode ? createPortal(
    <dialog ref={dialog} className="app-auth-modal" aria-label={messages.routes[mode].title}
      onCancel={event => { event.preventDefault(); setMode(null); }} onClick={event => { if (event.target === event.currentTarget) setMode(null); }}>
      <div className="stack-lg"><button type="button" className="button button-tertiary" onClick={() => setMode(null)}>{messages.shell.back}</button>
        <AuthForm key={mode} mode={mode} messages={messages.form} onAuthenticated={() => { setMode(null); callback.current?.(); callback.current = undefined; }} />
      </div>
    </dialog>, document.body) : null}</Context.Provider>;
}
