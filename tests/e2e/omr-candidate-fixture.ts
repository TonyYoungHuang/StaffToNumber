import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { APIRequestContext } from "@playwright/test";
import type { ScoreJson, ScorePitchStep } from "@score/shared";
import { commitOmrCandidate } from "../../services/worker/dist/omr-candidate-commit.js";
import { grantActiveEntitlement } from "./activation-fixture";

const apiUrl = "http://127.0.0.1:43102";
const root = process.cwd();
const dbFile = path.join(root, ".tmp", "e2e", "app.sqlite");
const storageDir = path.join(root, ".tmp", "e2e", "storage");
const sourceFixture = path.join(root, "apps", "www", "public", "product", "feature-pdf-score-scanner-real.png");

export type NotationE2EProfile =
  | "melody"
  | "piano"
  | "satb"
  | "bb-clarinet"
  | "incremental-pages"
  | "virtualized-pages"
  | "performance-20k";

export type OmrCandidateFixture = {
  token: string;
  userId: string;
  documentId: string;
  jobId: string;
  initialCandidateRevisionId: string;
  firstEventId: string;
  lastEventId: string;
  eventCount: number;
  staffCount: number;
  voiceCount: number;
};

type RegistrationPayload = {
  token: string;
  user: { id: string };
};

type OmrUploadPayload = {
  score: { id: string };
  job: { id: string };
};

export async function createOmrCandidateFixture(
  request: APIRequestContext,
  label: string,
  profile: NotationE2EProfile = "melody",
): Promise<OmrCandidateFixture> {
  const unique = `${Date.now()}-${randomUUID()}`;
  const registration = await request.post(`${apiUrl}/api/auth/register`, {
    data: {
      email: `omr-${label}-${unique}@example.test`,
      password: "E2E-password-2026!",
    },
  });
  if (registration.status() !== 201) {
    throw new Error(`Could not register the OMR E2E user: ${registration.status()} ${await registration.text()}`);
  }
  const registered = (await registration.json()) as RegistrationPayload;
  await grantActiveEntitlement(request, registered.token, "OMR");

  const upload = await request.post(`${apiUrl}/api/scores/import/omr`, {
    headers: { Authorization: `Bearer ${registered.token}` },
    multipart: {
      file: {
        name: `${label}-candidate-score.png`,
        mimeType: "image/png",
        buffer: fs.readFileSync(sourceFixture),
      },
    },
  });
  if (upload.status() !== 201) {
    throw new Error(`Could not upload the OMR E2E source: ${upload.status()} ${await upload.text()}`);
  }
  const uploaded = (await upload.json()) as OmrUploadPayload;
  const candidate = completeOmrJob({
    userId: registered.user.id,
    documentId: uploaded.score.id,
    jobId: uploaded.job.id,
    label,
    profile,
  });

  return {
    token: registered.token,
    userId: registered.user.id,
    documentId: uploaded.score.id,
    jobId: uploaded.job.id,
    initialCandidateRevisionId: candidate.revisionId,
    firstEventId: candidate.firstEventId,
    lastEventId: candidate.lastEventId,
    eventCount: candidate.eventCount,
    staffCount: candidate.staffCount,
    voiceCount: candidate.voiceCount,
  };
}

export function readOmrDocumentState(documentId: string) {
  const db = openDatabase();
  try {
    const document = db
      .prepare("SELECT current_revision_id, pending_revision_id, status FROM score_documents WHERE id = ?")
      .get(documentId) as { current_revision_id: string | null; pending_revision_id: string | null; status: string } | undefined;
    const revisions = db
      .prepare("SELECT id, revision_number, created_from, status, score_json FROM score_revisions WHERE document_id = ? ORDER BY revision_number ASC")
      .all(documentId) as Array<{ id: string; revision_number: number; created_from: string; status: string; score_json: string }>;
    return { document, revisions };
  } finally {
    db.close();
  }
}

export function readScoreCollaborationCommands(documentId: string) {
  const db = openDatabase();
  try {
    const rows = db
      .prepare(
        `
          SELECT id, actor_id, actor_role, base_revision_id, applied_revision_id,
                 command_type, target_scopes_json, status, conflicting_command_ids_json, conflict_reason
          FROM score_collaboration_commands
          WHERE document_id = ?
          ORDER BY created_at ASC, id ASC
        `,
      )
      .all(documentId) as Array<{
        id: string;
        actor_id: string;
        actor_role: string;
        base_revision_id: string;
        applied_revision_id: string | null;
        command_type: string;
        target_scopes_json: string;
        status: string;
        conflicting_command_ids_json: string;
        conflict_reason: string | null;
      }>;
    return rows.map((row) => ({
      ...row,
      targetScopes: JSON.parse(row.target_scopes_json) as string[],
      conflictingCommandIds: JSON.parse(row.conflicting_command_ids_json) as string[],
    }));
  } finally {
    db.close();
  }
}

function completeOmrJob(input: { userId: string; documentId: string; jobId: string; label: string; profile: NotationE2EProfile }) {
  const timestamp = new Date().toISOString();
  const musicXml = buildMusicXml(input.label, input.profile);
  const musicXmlFileId = randomUUID();
  const pageImageFileId = randomUUID();
  const resultDir = path.join(storageDir, input.userId, "scores", "omr-results");
  const storedName = `${musicXmlFileId}-${input.label}-candidate.musicxml`;
  const storagePath = path.join(resultDir, storedName);
  const pageImageStoredName = `${pageImageFileId}-${input.label}-audiveris-page-001.png`;
  const pageImageStoragePath = path.join(resultDir, pageImageStoredName);
  fs.mkdirSync(resultDir, { recursive: true });
  fs.writeFileSync(storagePath, musicXml, "utf8");
  fs.copyFileSync(sourceFixture, pageImageStoragePath);
  const scoreJson = buildScoreJson(input.label, musicXmlFileId, timestamp, input.profile);

  return withImmediateTransactionRetry((db) => {
    const claimed = db.prepare(
      `
        UPDATE score_jobs
        SET status = 'processing', started_at = ?, updated_at = ?, progress_percent = 50,
            attempt_count = attempt_count + 1
        WHERE id = ? AND status = 'queued'
      `,
    ).run(timestamp, timestamp, input.jobId);
    if (claimed.changes !== 1) throw new Error(`OMR E2E job ${input.jobId} was not queued.`);

    db.prepare(
      `
        INSERT INTO files (
          id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'application/vnd.recordare.musicxml+xml', ?, 'score_musicxml', ?)
      `,
    ).run(
      musicXmlFileId,
      input.userId,
      `${input.label}-candidate.musicxml`,
      storedName,
      storagePath,
      Buffer.byteLength(musicXml),
      timestamp,
    );

    db.prepare(
      `
        INSERT INTO files (
          id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'image/png', ?, 'omr_page_image', ?)
      `,
    ).run(
      pageImageFileId,
      input.userId,
      `${input.label}-audiveris-page-001.png`,
      pageImageStoredName,
      pageImageStoragePath,
      fs.statSync(pageImageStoragePath).size,
      timestamp,
    );

    const revisionId = commitOmrCandidate(db, {
      jobId: input.jobId,
      documentId: input.documentId,
      scoreJson,
      musicXmlFileId,
      outputFileIds: [musicXmlFileId, pageImageFileId],
      assets: [
        { fileId: musicXmlFileId, assetKind: "score_musicxml" },
        { fileId: pageImageFileId, assetKind: "omr_page_image" },
      ],
      timestamp,
      manageTransaction: false,
    });
    if (!revisionId) throw new Error(`OMR E2E job ${input.jobId} did not create a candidate revision.`);

    db.prepare(
      `
        INSERT INTO omr_diagnostics (
          id, job_id, document_id, diagnostics_json, confidence, source_page_count, created_at
        )
        VALUES (?, ?, ?, ?, 0.62, 1, ?)
      `,
    ).run(
      randomUUID(),
      input.jobId,
      input.documentId,
      JSON.stringify({
        engine: "audiveris",
        engineVersion: "e2e-fixture",
        confidence: 0.62,
        issueCount: scoreJson.recognitionLayer?.symbols.length ?? 0,
        symbols: scoreJson.recognitionLayer?.symbols ?? [],
      }),
      timestamp,
    );

    return {
      revisionId,
      firstEventId: scoreJson.measures[0]!.events[0]!.id,
      lastEventId: scoreJson.measures.at(-1)!.events.at(-1)!.id,
      eventCount: scoreJson.measures.reduce((sum, measure) => sum + measure.events.length, 0),
      staffCount: scoreJson.parts[0]!.staffCount ?? 1,
      voiceCount: new Set(scoreJson.measures.flatMap((measure) => measure.events.map((event) => event.voice ?? "1"))).size,
    };
  });
}

type FixtureEventDefinition = {
  step: ScorePitchStep;
  alter: number;
  octave: number;
  staff: number;
  voice: string;
};

type NotationProfileDefinition = {
  partName: string;
  abbreviation: string;
  midiProgram: number;
  staffCount: number;
  fifths: number;
  clefs: Array<{ sign: string; line: number; number?: number }>;
  transpose?: { diatonic: number; chromatic: number };
  events: FixtureEventDefinition[];
};

function buildScoreJson(
  label: string,
  sourceFileId: string,
  importedAt: string,
  profileId: NotationE2EProfile,
): ScoreJson {
  if (profileId === "incremental-pages") {
    return buildIncrementalPageScoreJson(label, sourceFileId, importedAt);
  }
  if (profileId === "virtualized-pages") {
    return buildVirtualizedPageScoreJson(label, sourceFileId, importedAt);
  }
  if (profileId === "performance-20k") {
    return buildPerformanceScoreJson(label, sourceFileId, importedAt);
  }
  const profile = getNotationProfile(profileId);
  const measureId = randomUUID();
  const events = profile.events.map((definition, index) => {
    const eventId = randomUUID();
    return {
      id: eventId,
      type: "note" as const,
      pitch: { step: definition.step, alter: definition.alter, octave: definition.octave },
      duration: 1,
      durationType: "quarter",
      dots: 0,
      voice: definition.voice,
      staff: definition.staff,
      chord: false,
      ties: [],
      lyrics: [],
      recognition: {
        confidence: 0.62,
        source: "omr-engine" as const,
        page: 1,
        bbox: { x: 120 + (index % 4) * 170, y: 260 + Math.floor(index / 4) * 90, width: 42, height: 56 },
        issues: ["Low Audiveris symbol confidence"],
      },
    };
  });

  return {
    schemaVersion: 2,
    title: `${label} candidate score`,
    source: { kind: "musicxml", fileId: sourceFileId, originalName: `${label}-candidate.musicxml` },
    metadata: {
      importedAt,
      parser: "musicxml-basic-v1",
      workTitle: `${label} candidate score`,
      measureCount: 1,
      noteCount: events.length,
      restCount: 0,
      warnings: ["E2E Audiveris candidate requires human review."],
    },
    parts: [
      {
        id: "P1",
        name: profile.partName,
        abbreviation: profile.abbreviation,
        midiProgram: profile.midiProgram,
        staffCount: profile.staffCount,
        measureCount: 1,
      },
    ],
    measures: [
      {
        id: measureId,
        partId: "P1",
        number: "1",
        sequence: 1,
        attributes: {
          divisions: 1,
          key: { fifths: profile.fifths, mode: "major" },
          time: { beats: "4", beatType: "4" },
          staves: profile.staffCount,
          clef: profile.clefs[0],
          clefs: profile.clefs,
        },
        events,
      },
    ],
    recognitionLayer: {
      engine: "audiveris",
      engineVersion: "e2e-fixture",
      pages: [{ page: 1, width: 1000, height: 1400 }],
      symbols: events.map((event, index) => ({
        id: randomUUID(),
        engineId: `audiveris-inter-${index + 1}`,
        shape: "NOTEHEAD_BLACK",
        grade: 0.61 + index * 0.01,
        contextualGrade: 0.62,
        confidence: 0.62,
        page: 1,
        bbox: event.recognition.bbox!,
        measureId,
        eventId: event.id,
        issues: ["Low Audiveris symbol confidence"],
      })),
    },
  };
}

function buildMusicXml(label: string, profileId: NotationE2EProfile) {
  if (profileId === "incremental-pages") {
    return buildIncrementalPageMusicXml(label);
  }
  if (profileId === "virtualized-pages") {
    return buildVirtualizedPageMusicXml(label);
  }
  if (profileId === "performance-20k") {
    return buildPerformanceMusicXml(label);
  }
  const profile = getNotationProfile(profileId);
  const voiceGroups = Array.from(
    profile.events.reduce((groups, event) => {
      const key = `${event.staff}:${event.voice}`;
      const group = groups.get(key) ?? [];
      group.push(event);
      groups.set(key, group);
      return groups;
    }, new Map<string, FixtureEventDefinition[]>()),
  ).map(([, events]) => events);
  const clefs = profile.clefs
    .map(
      (clef, index) =>
        `<clef${profile.staffCount > 1 ? ` number="${index + 1}"` : ""}><sign>${clef.sign}</sign><line>${clef.line}</line></clef>`,
    )
    .join("\n        ");
  const transpose = profile.transpose
    ? `<transpose><diatonic>${profile.transpose.diatonic}</diatonic><chromatic>${profile.transpose.chromatic}</chromatic></transpose>`
    : "";
  const notes = voiceGroups
    .map((events, groupIndex) => {
      const backup = groupIndex === 0 ? "" : "      <backup><duration>4</duration></backup>\n";
      return `${backup}${events.map((event) => buildMusicXmlNote(event)).join("\n")}`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${escapeXml(label)} candidate score</work-title></work>
  <part-list><score-part id="P1"><part-name>${escapeXml(profile.partName)}</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>${profile.fifths}</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        ${profile.staffCount > 1 ? `<staves>${profile.staffCount}</staves>` : ""}
        ${transpose}
        ${clefs}
      </attributes>
${notes}
    </measure>
  </part>
</score-partwise>`;
}

function buildMusicXmlNote(event: FixtureEventDefinition) {
  const alter = event.alter === 0 ? "" : `<alter>${event.alter}</alter>`;
  return `      <note><pitch><step>${event.step}</step>${alter}<octave>${event.octave}</octave></pitch><duration>1</duration><voice>${event.voice}</voice><type>quarter</type><staff>${event.staff}</staff></note>`;
}

function getNotationProfile(profile: NotationE2EProfile): NotationProfileDefinition {
  const stream = (
    steps: Array<[ScorePitchStep, number, number]>,
    staff: number,
    voice: string,
  ): FixtureEventDefinition[] => steps.map(([step, alter, octave]) => ({ step, alter, octave, staff, voice }));

  if (profile === "piano") {
    return {
      partName: "Piano",
      abbreviation: "Pno.",
      midiProgram: 1,
      staffCount: 2,
      fifths: 0,
      clefs: [
        { sign: "G", line: 2, number: 1 },
        { sign: "F", line: 4, number: 2 },
      ],
      events: [
        ...stream([["C", 0, 5], ["D", 0, 5], ["E", 0, 5], ["F", 0, 5]], 1, "1"),
        ...stream([["C", 0, 3], ["D", 0, 3], ["E", 0, 3], ["F", 0, 3]], 2, "1"),
      ],
    };
  }

  if (profile === "satb") {
    return {
      partName: "SATB Choir",
      abbreviation: "SATB",
      midiProgram: 53,
      staffCount: 2,
      fifths: 0,
      clefs: [
        { sign: "G", line: 2, number: 1 },
        { sign: "F", line: 4, number: 2 },
      ],
      events: [
        ...stream([["G", 0, 4], ["A", 0, 4], ["B", 0, 4], ["C", 0, 5]], 1, "1"),
        ...stream([["E", 0, 4], ["F", 0, 4], ["G", 0, 4], ["A", 0, 4]], 1, "2"),
        ...stream([["C", 0, 4], ["D", 0, 4], ["E", 0, 4], ["F", 0, 4]], 2, "1"),
        ...stream([["C", 0, 3], ["B", 0, 2], ["A", 0, 2], ["G", 0, 2]], 2, "2"),
      ],
    };
  }

  if (profile === "bb-clarinet") {
    return {
      partName: "Bb Clarinet (written pitch)",
      abbreviation: "Cl. in Bb",
      midiProgram: 72,
      staffCount: 1,
      fifths: 2,
      clefs: [{ sign: "G", line: 2 }],
      transpose: { diatonic: -1, chromatic: -2 },
      events: stream([["D", 0, 4], ["E", 0, 4], ["F", 1, 4], ["G", 0, 4]], 1, "1"),
    };
  }

  return {
    partName: "Solo melody",
    abbreviation: "Solo",
    midiProgram: 1,
    staffCount: 1,
    fifths: 0,
    clefs: [{ sign: "G", line: 2 }],
    events: stream([["C", 0, 4], ["D", 0, 4], ["E", 0, 4], ["F", 0, 4]], 1, "1"),
  };
}

function buildIncrementalPageScoreJson(label: string, sourceFileId: string, importedAt: string): ScoreJson {
  const steps: ScorePitchStep[] = ["C", "D", "E", "F"];
  const measures = Array.from({ length: 4 }, (_, measureIndex) => {
    const measureId = randomUUID();
    return {
      id: measureId,
      partId: "P1",
      number: String(measureIndex + 1),
      sequence: measureIndex + 1,
      ...(measureIndex === 0
        ? {
            attributes: {
              divisions: 1,
              key: { fifths: 0, mode: "major" },
              time: { beats: "4", beatType: "4" },
              staves: 1,
              clef: { sign: "G", line: 2 },
              clefs: [{ sign: "G", line: 2 }],
            },
          }
        : {}),
      ...(measureIndex === 1
        ? { layout: { id: randomUUID(), newSystem: true } }
        : measureIndex === 2
          ? { layout: { id: randomUUID(), newPage: true } }
          : {}),
      events: steps.map((step, eventIndex) => ({
        id: randomUUID(),
        type: "note" as const,
        pitch: { step, alter: 0, octave: 4 },
        duration: 1,
        durationType: "quarter",
        dots: 0,
        voice: "1",
        staff: 1,
        chord: false,
        ties: [],
        lyrics: [],
        recognition: {
          confidence: 0.62,
          source: "omr-engine" as const,
          page: 1,
          bbox: { x: 120 + eventIndex * 170, y: 220 + measureIndex * 180, width: 42, height: 56 },
          issues: ["Low Audiveris symbol confidence"],
        },
      })),
    };
  });
  const events = measures.flatMap((measure) => measure.events);

  return {
    schemaVersion: 2,
    title: `${label} candidate score`,
    source: { kind: "musicxml", fileId: sourceFileId, originalName: `${label}-candidate.musicxml` },
    metadata: {
      importedAt,
      parser: "musicxml-basic-v1",
      workTitle: `${label} candidate score`,
      measureCount: measures.length,
      noteCount: events.length,
      restCount: 0,
      warnings: ["E2E multi-page candidate requires human review."],
    },
    parts: [{ id: "P1", name: "Incremental piano", abbreviation: "Pno.", midiProgram: 1, staffCount: 1, measureCount: measures.length }],
    measures,
    recognitionLayer: {
      engine: "audiveris",
      engineVersion: "e2e-fixture",
      pages: [{ page: 1, width: 1000, height: 1400 }],
      symbols: measures.flatMap((measure) =>
        measure.events.map((event, eventIndex) => ({
          id: randomUUID(),
          engineId: `audiveris-${measure.number}-${eventIndex + 1}`,
          shape: "NOTEHEAD_BLACK",
          grade: 0.62,
          contextualGrade: 0.62,
          confidence: 0.62,
          page: 1,
          bbox: event.recognition.bbox!,
          measureId: measure.id,
          eventId: event.id,
          issues: ["Low Audiveris symbol confidence"],
        })),
      ),
    },
  };
}

function buildIncrementalPageMusicXml(label: string) {
  const notes = ["C", "D", "E", "F"]
    .map(
      (step) =>
        `      <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>`,
    )
    .join("\n");
  const measures = Array.from({ length: 4 }, (_, index) => `    <measure number="${index + 1}">
${index === 1 ? "      <print new-system=\"yes\"/>\n" : index === 2 ? "      <print new-page=\"yes\"/>\n" : ""}${
    index === 0
      ? "      <attributes><divisions>1</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n"
      : ""
  }${notes}
    </measure>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${escapeXml(label)} candidate score</work-title></work>
  <part-list><score-part id="P1"><part-name>Incremental piano</part-name></score-part></part-list>
  <part id="P1">
${measures}
  </part>
</score-partwise>`;
}

function buildVirtualizedPageScoreJson(label: string, sourceFileId: string, importedAt: string): ScoreJson {
  const steps: ScorePitchStep[] = ["C", "D", "E", "F"];
  const measures = Array.from({ length: 100 }, (_, measureIndex) => ({
    id: randomUUID(),
    partId: "P1",
    number: String(measureIndex + 1),
    sequence: measureIndex + 1,
    ...(measureIndex === 0
      ? {
          attributes: {
            divisions: 1,
            key: { fifths: 0, mode: "major" },
            time: { beats: "4", beatType: "4" },
            staves: 1,
            clef: { sign: "G", line: 2 },
            clefs: [{ sign: "G", line: 2 }],
          },
        }
      : { layout: { id: randomUUID(), newPage: true } }),
    events: steps.map((step) => ({
      id: randomUUID(),
      type: "note" as const,
      pitch: { step, alter: 0, octave: 4 },
      duration: 1,
      durationType: "quarter",
      dots: 0,
      voice: "1",
      staff: 1,
      chord: false,
      ties: [],
      lyrics: [],
    })),
  }));

  return {
    schemaVersion: 2,
    title: `${label} candidate score`,
    source: { kind: "musicxml", fileId: sourceFileId, originalName: `${label}-candidate.musicxml` },
    metadata: {
      importedAt,
      parser: "musicxml-basic-v1",
      workTitle: `${label} candidate score`,
      measureCount: measures.length,
      noteCount: measures.length * steps.length,
      restCount: 0,
      warnings: ["E2E 100-page virtualization fixture."],
    },
    parts: [{ id: "P1", name: "Long score", abbreviation: "Long", midiProgram: 1, staffCount: 1, measureCount: measures.length }],
    measures,
    recognitionLayer: {
      engine: "audiveris",
      engineVersion: "e2e-fixture",
      pages: [{ page: 1, width: 1000, height: 1400 }],
      symbols: [],
    },
  };
}

function buildVirtualizedPageMusicXml(label: string) {
  const notes = ["C", "D", "E", "F"]
    .map(
      (step) =>
        `      <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>`,
    )
    .join("\n");
  const measures = Array.from({ length: 100 }, (_, index) => `    <measure number="${index + 1}">
${index > 0 ? "      <print new-page=\"yes\"/>\n" : ""}${
    index === 0
      ? "      <attributes><divisions>1</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n"
      : ""
  }${notes}
    </measure>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${escapeXml(label)} candidate score</work-title></work>
  <part-list><score-part id="P1"><part-name>Long score</part-name></score-part></part-list>
  <part id="P1">
${measures}
  </part>
</score-partwise>`;
}

function buildPerformanceScoreJson(label: string, sourceFileId: string, importedAt: string): ScoreJson {
  const measureCount = 5_000;
  const steps: ScorePitchStep[] = ["C", "D", "E", "F"];
  const measures = Array.from({ length: measureCount }, (_, measureIndex) => ({
    id: randomUUID(),
    partId: "P1",
    number: String(measureIndex + 1),
    sequence: measureIndex + 1,
    ...(measureIndex === 0
      ? {
          attributes: {
            divisions: 1,
            key: { fifths: 0, mode: "major" },
            time: { beats: "4", beatType: "4" },
            staves: 1,
            clef: { sign: "G", line: 2 },
            clefs: [{ sign: "G", line: 2 }],
          },
        }
      : {}),
    events: steps.map((step) => ({
      id: randomUUID(),
      type: "note" as const,
      pitch: { step, alter: 0, octave: 4 },
      duration: 1,
      durationType: "quarter",
      dots: 0,
      voice: "1",
      staff: 1,
      chord: false,
      ties: [],
      lyrics: [],
    })),
  }));

  return {
    schemaVersion: 2,
    title: `${label} candidate score`,
    source: { kind: "musicxml", fileId: sourceFileId, originalName: `${label}-candidate.musicxml` },
    metadata: {
      importedAt,
      parser: "musicxml-basic-v1",
      workTitle: `${label} candidate score`,
      measureCount,
      noteCount: measureCount * steps.length,
      restCount: 0,
      warnings: ["E2E 20,000-note performance fixture."],
    },
    parts: [{ id: "P1", name: "20k performance score", abbreviation: "20k", midiProgram: 1, staffCount: 1, measureCount }],
    measures,
    recognitionLayer: {
      engine: "audiveris",
      engineVersion: "e2e-fixture",
      pages: [{ page: 1, width: 1000, height: 1400 }],
      symbols: [],
    },
  };
}

function buildPerformanceMusicXml(label: string) {
  const notes = ["C", "D", "E", "F"]
    .map(
      (step) =>
        `      <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>`,
    )
    .join("\n");
  const measures = Array.from({ length: 5_000 }, (_, index) => `    <measure number="${index + 1}">
${
  index === 0
    ? "      <attributes><divisions>1</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n"
    : ""
}${notes}
    </measure>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${escapeXml(label)} candidate score</work-title></work>
  <part-list><score-part id="P1"><part-name>20k performance score</part-name></score-part></part-list>
  <part id="P1">
${measures}
  </part>
</score-partwise>`;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function openDatabase() {
  const db = new DatabaseSync(dbFile);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 10000;");
  return db;
}

function withImmediateTransactionRetry<T>(operation: (db: DatabaseSync) => T): T {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const db = openDatabase();
    let transactionStarted = false;
    try {
      db.exec("BEGIN IMMEDIATE");
      transactionStarted = true;
      const result = operation(db);
      db.exec("COMMIT");
      transactionStarted = false;
      return result;
    } catch (error) {
      lastError = error;
      if (transactionStarted) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Preserve the original database error.
        }
      }
      if (!isSqliteBusy(error) || attempt === 4) throw error;
    } finally {
      db.close();
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 250);
  }
  throw lastError;
}

function isSqliteBusy(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return code === "ERR_SQLITE_ERROR" && /database is (?:locked|busy)/iu.test(error.message);
}
