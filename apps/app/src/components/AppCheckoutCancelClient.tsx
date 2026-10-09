"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCheckoutReturn } from "../lib/flow-return";
import { useFlowMessages } from "../lib/flow-messages/client";
import { useAppLocale } from "./AppLocaleProvider";
export function AppCheckoutCancelClient({ orderId, title, body }: { orderId: string; title: string; body: string }) {
 const { locale } = useAppLocale(); const copy = useFlowMessages();
 const [target, setTarget] = useState({ next: "/scores", retry: "/checkout", createdAt: 0 });
 useEffect(() => { setTarget(readCheckoutReturn(orderId)); }, [orderId]);
 return <div className="surface-panel stack-lg"><h1 className="page-title">{title}</h1><p>{body}</p><div className="button-row"><Link href={target.retry} className="button button-primary">{copy.retry}</Link><Link href={target.next} className="button button-secondary">{copy.resume}</Link></div></div>;
}
