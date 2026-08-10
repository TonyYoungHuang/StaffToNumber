import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { ScoreJson, TransposeSpellingPolicy } from "@score/shared";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";

export type Music21TransposeResult = {
  scoreJson: ScoreJson;
  musicXml: string;
  warnings: string[];
};

export function transposeScoreJsonWithMusic21(input: {
  score: ScoreJson;
  semitones: number;
  music21Command: string;
  timeoutMs: number;
  targetKey?: { tonic: string; mode: string; fifths: number };
  spellingPolicy?: TransposeSpellingPolicy;
  generatedAt?: string;
}): Promise<Music21TransposeResult> {
  return new Promise((resolve, reject) => {
    if (!input.music21Command) {
      reject(new Error("MUSIC21_COMMAND is not configured."));
      return;
    }

    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "score-music21-"));
    const sourcePath = path.join(workspace, "source.musicxml");
    const outputPath = path.join(workspace, "transposed.musicxml");
    const scriptPath = fileURLToPath(new URL("../../scripts/music21_transpose.py", import.meta.url));
    fs.writeFileSync(sourcePath, scoreJsonToMusicXml(input.score), "utf8");

    const args = [scriptPath, sourcePath, outputPath, String(input.semitones), "--spelling", input.spellingPolicy ?? "auto"];
    if (input.targetKey) {
      args.push("--target-tonic", input.targetKey.tonic, "--target-mode", input.targetKey.mode, "--target-fifths", String(input.targetKey.fifths));
    }
    const child = spawn(input.music21Command, args, {
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`music21 transposition timed out after ${input.timeoutMs} ms.`));
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      fs.rmSync(workspace, { recursive: true, force: true });
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      try {
        if (code !== 0) {
          reject(new Error(`music21 exited with code ${code}. ${stderr || stdout}`.trim()));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          reject(new Error("music21 finished but did not write a transposed MusicXML file."));
          return;
        }

        const musicXml = fs.readFileSync(outputPath, "utf8");
        const generatedAt = input.generatedAt ?? new Date().toISOString();
        const scoreJson = parseMusicXmlToScoreJson({
          musicXml,
          title: `${input.score.title} (${input.semitones > 0 ? `+${input.semitones}` : input.semitones} semitones via music21)`,
          sourceFileId: "music21-transpose",
          sourceOriginalName: "music21-transposed.musicxml",
          importedAt: generatedAt,
        });

        resolve({
          musicXml,
          scoreJson: {
            ...scoreJson,
            metadata: {
              ...scoreJson.metadata,
              warnings: [
                `Transposed ${input.semitones > 0 ? `+${input.semitones}` : input.semitones} semitones with music21 using ${input.spellingPolicy ?? "auto"} spelling at ${generatedAt}.`,
                ...scoreJson.metadata.warnings,
              ],
            },
          },
          warnings: stderr.trim() ? [stderr.trim().slice(-1200)] : [],
        });
      } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
      }
    });
  });
}
