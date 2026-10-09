"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatMessage, type SupportedLocale, type MessageVariables } from "@score/i18n";

type AdminCopy = { text: Record<string, string>; statuses: Record<string, string>; month: string; year: string };
const AdminCopyContext = createContext<AdminCopy | null>(null);

export function AdminMessagesProvider({ messages, children }: { messages: AdminCopy; children: ReactNode }) {
  return <AdminCopyContext.Provider value={messages}>{children}</AdminCopyContext.Provider>;
}

export function useAdminMessages() {
  const copy = useContext(AdminCopyContext);
  if (!copy) throw new Error("Admin messages are not available.");
  return {
    adminText(_locale: SupportedLocale, text: string, values: MessageVariables = {}) {
      return formatMessage(copy.text[text] ?? text, values);
    },
    adminStatus(_locale: SupportedLocale, status: string) { return copy.statuses[status] ?? status; },
    adminPlanName(_locale: SupportedLocale, code: string) {
      return `${code.startsWith("converter-pro") ? "Converter Pro" : "Starter"} · ${code.endsWith("annual") ? copy.year : copy.month}`;
    },
  };
}
