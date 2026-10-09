import type { ReactNode } from "react";
import { readAppLocale } from "../../lib/locale";
import { getAdminMessages } from "../../lib/admin-messages";
import { AdminMessagesProvider } from "../../lib/admin-messages/client";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await readAppLocale();
  return <AdminMessagesProvider messages={getAdminMessages(locale)}>{children}</AdminMessagesProvider>;
}
