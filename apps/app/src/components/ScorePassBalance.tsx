"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSingleScorePassCopy } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

type Pass = { id: string; documentId: string | null; remaining: number; credits: number };
export function ScorePassBalance() {
  const params = useParams<{ id: string }>();
  const { locale } = useAppLocale();
  const copy = getSingleScorePassCopy(locale);
  const [pass, setPass] = useState<Pass | null>(null);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const result = await apiRequest<{ user: { scorePasses?: Pass[] } }>("/api/auth/me");
      if (!active) return;
      const current = result.ok ? result.data.user.scorePasses?.find(p => p.documentId === params.id) : undefined;
      setPass(current ?? null);
      if (current) timer = setTimeout(refresh, 10000);
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [params.id]);
  return pass ? <aside className="surface-panel inline-meta" aria-live="polite"><strong>{copy.name}</strong><span>{copy.remaining}: {pass.remaining} / {pass.credits}</span></aside> : null;
}
