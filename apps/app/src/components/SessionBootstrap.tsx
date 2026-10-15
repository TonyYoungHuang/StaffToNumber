"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getSessionStatus, getServerSessionStatus, restoreSessionFromCookie, subscribeAuthChanges } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeAuthChanges, getSessionStatus, getServerSessionStatus);
  const [failed, setFailed] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const copy = useFlowMessages();
  const restore = () => { setFailed(false); void restoreSessionFromCookie().then(result => setFailed(result === "checking")); };
  useEffect(restore, []);
  useEffect(() => { if (status !== "checking") setBootstrapped(true); }, [status]);
  if (bootstrapped || status !== "checking") return children;
  return <main className="container app-main" role="status" aria-busy={!failed}>
    <p>{copy.waitingAccess}</p>
    {failed ? <button type="button" className="button button-secondary" onClick={restore}>{copy.retry}</button> : null}
  </main>;
}
