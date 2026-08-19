import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivePublicAnnouncement,
  getPublishableTestimonials,
  type ApprovedTestimonial,
  type PublicAnnouncement,
} from "./public-content.js";

const announcement: PublicAnnouncement = {
  id: "real-event-2026",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  href: "/support?source=real-event-2026",
  copy: {
    en: { label: "Approved event", action: "View details" },
    "zh-CN": { label: "已审核活动", action: "查看详情" },
  },
  approvedAt: "2026-07-30T00:00:00.000Z",
  approvedBy: "content-owner",
};

const testimonial: ApprovedTestimonial = {
  id: "approved-testimonial",
  quote: { en: "Traceable feedback.", "zh-CN": "可追溯的反馈。" },
  person: "Authorized reviewer",
  role: { en: "Music teacher", "zh-CN": "音乐教师" },
  sourceLabel: "Written interview",
  permissionReference: "permission-record-001",
  permissionGrantedAt: "2026-07-28T00:00:00.000Z",
  approvedAt: "2026-07-30T00:00:00.000Z",
  approvedBy: "content-owner",
};

test("announcement bar only accepts approved content inside its real time window", () => {
  assert.equal(getActivePublicAnnouncement(new Date("2026-08-15T00:00:00.000Z"), [announcement])?.id, announcement.id);
  assert.equal(getActivePublicAnnouncement(new Date("2026-09-02T00:00:00.000Z"), [announcement]), null);
  assert.equal(getActivePublicAnnouncement(new Date("2026-08-15T00:00:00.000Z"), [{ ...announcement, approvedBy: "" }]), null);
  assert.equal(getActivePublicAnnouncement(new Date("2026-08-15T00:00:00.000Z"), [{ ...announcement, copy: { ...announcement.copy, en: { ...announcement.copy.en, action: "" } } }]), null);
  assert.equal(getActivePublicAnnouncement(new Date("2026-08-15T00:00:00.000Z"), [{ ...announcement, approvedAt: "2026-08-16T00:00:00.000Z" }]), null);
});

test("testimonials require permission, source and approval records", () => {
  assert.deepEqual(getPublishableTestimonials([testimonial]), [testimonial]);
  assert.deepEqual(getPublishableTestimonials([{ ...testimonial, permissionReference: "" }]), []);
  assert.deepEqual(getPublishableTestimonials([{ ...testimonial, approvedAt: "not-a-date" }]), []);
  assert.deepEqual(getPublishableTestimonials([{ ...testimonial, role: { ...testimonial.role, "zh-CN": "" } }]), []);
});
