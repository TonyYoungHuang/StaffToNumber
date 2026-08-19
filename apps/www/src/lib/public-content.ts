import type { SupportedLocale } from "@score/shared";

export type PublicAnnouncement = {
  id: string;
  startsAt: string;
  endsAt: string;
  href: string;
  copy: Record<SupportedLocale, { label: string; action: string }>;
  approvedAt: string;
  approvedBy: string;
};

export type ApprovedTestimonial = {
  id: string;
  quote: Record<SupportedLocale, string>;
  person: string;
  role: Record<SupportedLocale, string>;
  sourceLabel: string;
  sourceUrl?: string;
  permissionReference: string;
  permissionGrantedAt: string;
  approvedAt: string;
  approvedBy: string;
};

// Intentionally empty until a real, approved event is scheduled. Do not add
// evergreen marketing copy here just to force the announcement bar to render.
export const publicAnnouncements: PublicAnnouncement[] = [];

// Intentionally empty until written permission and a traceable source exist.
// Product claims and self-authored examples are not user testimonials.
export const approvedTestimonials: ApprovedTestimonial[] = [];

function validDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getActivePublicAnnouncement(at: Date, items: PublicAnnouncement[] = publicAnnouncements) {
  const timestamp = at.getTime();
  return items.find((item) => {
    const start = validDate(item.startsAt);
    const end = validDate(item.endsAt);
    const approved = validDate(item.approvedAt);
    return Boolean(
      item.id.trim()
      && item.href.trim()
      && item.approvedBy.trim()
      && item.copy.en.label.trim()
      && item.copy.en.action.trim()
      && item.copy["zh-CN"].label.trim()
      && item.copy["zh-CN"].action.trim()
      && start !== null
      && end !== null
      && approved !== null
      && approved <= timestamp
      && start <= timestamp
      && timestamp < end,
    );
  }) ?? null;
}

export function getPublishableTestimonials(items: ApprovedTestimonial[] = approvedTestimonials) {
  return items.filter((item) => Boolean(
    item.id.trim()
    && item.person.trim()
    && item.quote.en.trim()
    && item.quote["zh-CN"].trim()
    && item.role.en.trim()
    && item.role["zh-CN"].trim()
    && item.sourceLabel.trim()
    && item.permissionReference.trim()
    && validDate(item.permissionGrantedAt) !== null
    && validDate(item.approvedAt) !== null
    && item.approvedBy.trim(),
  ));
}
