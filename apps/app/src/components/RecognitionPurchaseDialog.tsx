"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFlowMessages } from "../lib/flow-messages/client";

/** Mount only once the file and selected recognition mode require payment. */
export function RecognitionPurchaseDialog({ children }: { children: ReactNode }) {
  const copy = useFlowMessages();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true }); };
  }, [open]);
  return <>
    <button type="button" className="button button-secondary" onClick={() => setOpen(true)}>{copy.paymentOptions}</button>
    <dialog ref={dialog} data-recognition-purchase-dialog className="recognition-purchase-dialog" aria-label={copy.paymentOptions} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="stack-lg"><div className="button-row"><h2 className="card-title">{copy.paymentOptions}</h2><button type="button" className="button button-tertiary" onClick={() => setOpen(false)}>{copy.close}</button></div>{children}</div>
    </dialog>
  </>;
}
