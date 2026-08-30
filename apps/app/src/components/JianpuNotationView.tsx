"use client";

import { useEffect, useRef } from "react";
import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import type { JianpuDocument, JianpuEvent } from "@score/shared";
import { usePlaybackPracticeMessages } from "../lib/playback-practice-messages/client";
import type { JianpuViewMessages } from "../lib/playback-practice-messages/types";

function durationUnderlines(durationType: string | undefined) {
  return durationType === "eighth" ? 1 : durationType === "16th" ? 2 : durationType === "32nd" ? 3 : durationType === "64th" ? 4 : 0;
}

function durationExtensions(durationType: string | undefined) {
  return durationType === "whole" ? 3 : durationType === "half" ? 1 : 0;
}

function accidentalText(accidental: number) {
  return accidental > 0 ? "#".repeat(accidental) : accidental < 0 ? "b".repeat(Math.abs(accidental)) : "";
}

function eventGroups(events: JianpuEvent[]) {
  const groups: JianpuEvent[][] = [];
  for (const event of events) {
    const previous = groups.at(-1);
    if (event.type === "note" && event.chord && previous?.[0]?.type === "note") previous.push(event);
    else groups.push([event]);
  }
  return groups;
}

function ornamentLabel(event: JianpuEvent) {
  const tuplet = event.timeModification && event.tuplets?.some((item) => item.type === "start") ? String(event.timeModification.actualNotes) : "";
  if (event.type !== "note" || !event.ornaments?.length) return tuplet;
  const ornaments = event.ornaments.map((ornament) => ornament.type === "trill-mark" ? "tr" : ornament.type === "tremolo" ? `trem${ornament.value ?? ""}` : ornament.type).join(" ");
  return [tuplet, ornaments].filter(Boolean).join(" ");
}

function JianpuEventButton({
  event,
  selected,
  onSelect,
  copy,
  locale,
}: {
  event: JianpuEvent;
  selected: boolean;
  onSelect: (eventId: string) => void;
  copy: JianpuViewMessages;
  locale: SupportedLocale;
}) {
  const degree = event.type === "note" ? String(event.degree) : "0";
  const octaveShift = event.type === "note" ? event.octaveShift : 0;
  const underlines = durationUnderlines(event.durationType);
  const extensions = durationExtensions(event.durationType);
  const voice = event.voice ?? "1";
  const staff = formatNumber(event.staff ?? 1, locale);
  const context = event.voice && (event.voice !== "1" || (event.staff ?? 1) !== 1)
    ? `${copy.voiceShort}${event.voice}${(event.staff ?? 1) !== 1 ? ` ${copy.staffShort}${staff}` : ""}`
    : "";
  const label = formatMessage(copy.eventLabelTemplate, {
    kind: event.type === "note" ? copy.note : copy.rest,
    degree,
    voice,
    staff,
  });

  return (
    <button
      type="button"
      className={`jianpu-event${selected ? " is-selected" : ""}`}
      aria-label={label}
      aria-pressed={selected}
      data-event-id={event.id}
      onClick={() => onSelect(event.id)}
    >
      <span className="jianpu-ornament">{ornamentLabel(event)}</span>
      <span className="jianpu-octave-dots above" aria-hidden="true">
        {Array.from({ length: Math.max(0, octaveShift) }, (_, index) => <i key={index} />)}
      </span>
      <span className="jianpu-glyph-row">
        {event.type === "note" && event.slurs?.some((slur) => slur.type === "start") ? <span className="jianpu-connection">(</span> : null}
        {event.type === "note" && event.ties?.some((tie) => tie.type === "stop") ? <span className="jianpu-connection">~</span> : null}
        {event.type === "note" ? <span className="jianpu-accidental">{accidentalText(event.accidental)}</span> : null}
        <span className="jianpu-degree">{degree}</span>
        {event.type === "note" && event.ties?.some((tie) => tie.type === "start") ? <span className="jianpu-connection">~</span> : null}
        {event.type === "note" && event.slurs?.some((slur) => slur.type === "stop") ? <span className="jianpu-connection">)</span> : null}
        {event.dots > 0 ? <span className="jianpu-duration-dots">{".".repeat(event.dots)}</span> : null}
        {extensions > 0 ? <span className="jianpu-extensions">{"-".repeat(extensions)}</span> : null}
      </span>
      <span className="jianpu-underlines" aria-hidden="true">
        {Array.from({ length: underlines }, (_, index) => <i key={index} />)}
      </span>
      <span className="jianpu-octave-dots below" aria-hidden="true">
        {Array.from({ length: Math.max(0, -octaveShift) }, (_, index) => <i key={index} />)}
      </span>
      <span className="jianpu-event-context">{context}</span>
    </button>
  );
}

export function JianpuNotationView({
  document,
  selectedEventId,
  onEventSelect,
  locale,
}: {
  document: JianpuDocument;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  locale: SupportedLocale;
}) {
  const { messages } = usePlaybackPracticeMessages();
  const copy = messages.jianpu;
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedEventId) return;
    const selected = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-event-id]") ?? [])
      .find((element) => element.dataset.eventId === selectedEventId);
    selected?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedEventId]);

  return (
    <div ref={rootRef} className="jianpu-notation-view" role="region" aria-label={copy.regionAria}>
      {document.parts.length === 0 ? <div className="empty-state" role="status">{copy.empty}</div> : null}
      {document.parts.map((part) => (
        <section className="jianpu-part" key={part.id} aria-label={part.name}>
          {document.parts.length > 1 ? <h3 className="jianpu-part-name">{part.name}</h3> : null}
          <div className="jianpu-measures">
            {part.measures.map((measure) => (
              <div
                className="jianpu-measure"
                key={measure.id}
                role="group"
                aria-label={formatMessage(copy.measureAriaTemplate, { measure: measure.number })}
                data-implicit={measure.implicit ? "true" : undefined}
              >
                <span className="jianpu-measure-number">{measure.number}</span>
                <div className="jianpu-event-line">
                  {eventGroups(measure.events).map((group) => (
                    <span className={`jianpu-event-group${group.length > 1 ? " is-chord" : ""}`} key={group[0].id}>
                      {group.map((event) => (
                        <JianpuEventButton key={event.id} event={event} selected={selectedEventId === event.id} onSelect={onEventSelect} copy={copy} locale={locale} />
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
