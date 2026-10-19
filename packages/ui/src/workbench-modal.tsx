"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native dialog supplies focus containment, Escape and inert background. */
export function WorkbenchModal({ title, closeLabel, onClose, children, wide = false, busy = false }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode; wide?: boolean; busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close(); document.body.style.overflow = overflow;
      if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={`wb-modal${wide ? " wb-modal-wide" : ""}`} aria-label={title}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="wb-modal-heading"><h2>{title}</h2><button type="button" className="button button-tertiary" aria-label={closeLabel} disabled={busy} onClick={onClose}>×</button></div>
    {children}
  </dialog>;
}
