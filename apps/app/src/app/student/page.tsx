import type { Metadata } from "next";
import { StudentHome } from "../../components/StudentHome";
import { EducationMessagesProvider } from "../../lib/education-messages/client";
import { getEducationMessages } from "../../lib/education-messages";
import { readAppLocale } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const copy = getEducationMessages(locale).pages.student;
  return { title: copy.metadataTitle, description: copy.metadataDescription };
}

export default async function StudentPage() {
  const locale = await readAppLocale();
  const messages = getEducationMessages(locale);
  return (
    <EducationMessagesProvider locale={locale} messages={messages}>
      <StudentHome />
    </EducationMessagesProvider>
  );
}
