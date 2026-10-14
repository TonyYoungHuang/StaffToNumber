import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScoreJson, TransposeSpellingPolicy } from "@score/shared";
import { normalizeScoreTransposeTitle } from "@score/shared";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";
import { runNativeEngine } from "./native-engine-runner.js";

export type Music21TransposeResult = {
  scoreJson: ScoreJson;
  musicXml: string;
  warnings: string[];
};

export async function transposeScoreJsonWithMusic21(input: {
  score: ScoreJson;
  semitones: number;
  music21Command: string;
  timeoutMs: number;
  targetKey?: { tonic: string; mode: string; fifths: number };
  spellingPolicy?: TransposeSpellingPolicy;
  generatedAt?: string;
}): Promise<Music21TransposeResult> {
  if (!input.music21Command) throw new Error("MUSIC21_COMMAND is not configured.");
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "score-music21-"));
  try {
    const sourcePath = path.join(workspace, "source.musicxml");
    const outputPath = path.join(workspace, "transposed.musicxml");
    const scriptPath = fileURLToPath(new URL("../../scripts/music21_transpose.py", import.meta.url));
    fs.writeFileSync(sourcePath, scoreJsonToMusicXml(input.score), "utf8");

    const args = [scriptPath, sourcePath, outputPath, String(input.semitones), "--spelling", input.spellingPolicy ?? "auto"];
    if (input.targetKey) {
      args.push("--target-tonic", input.targetKey.tonic, "--target-mode", input.targetKey.mode, "--target-fifths", String(input.targetKey.fifths));
    }
    const { stderr } = await runNativeEngine({
      command: input.music21Command,
      args,
      label: "music21 transposition",
      timeoutMs: input.timeoutMs,
      shell: true,
    });
    if (!fs.existsSync(outputPath)) {
      throw new Error("music21 finished but did not write a transposed MusicXML file.");
    }

    const musicXml = fs.readFileSync(outputPath, "utf8");
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const transposedTitle = normalizeScoreTransposeTitle(input.score.title, input.semitones, " via music21");
    const scoreJson = parseMusicXmlToScoreJson({
      musicXml,
      title: transposedTitle,
      sourceFileId: "music21-transpose",
      sourceOriginalName: "music21-transposed.musicxml",
      importedAt: generatedAt,
    });

    return {
      musicXml,
      scoreJson: {
        ...scoreJson,
        // The parser prefers the MusicXML movement title to its fallback.
        // music21 retains that old title; the new revision needs this move.
        title: transposedTitle,
        metadata: {
          ...scoreJson.metadata,
          warnings: [
            `Transposed ${input.semitones > 0 ? `+${input.semitones}` : input.semitones} semitones with music21 using ${input.spellingPolicy ?? "auto"} spelling at ${generatedAt}.`,
            ...scoreJson.metadata.warnings,
          ],
        },
      },
      warnings: stderr.trim() ? [stderr.trim().slice(-1200)] : [],
    };
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}
