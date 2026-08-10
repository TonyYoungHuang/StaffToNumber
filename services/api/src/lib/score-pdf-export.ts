import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export async function renderMusicXmlWithMuseScore(input: {
  musicXmlPath: string;
  outputPath: string;
  outputLabel: string;
  museScoreCommand: string;
  timeoutMs: number;
  imageResolutionDpi?: number;
  trimImageMargin?: number;
}) {
  if (!input.museScoreCommand) {
    throw new Error("MUSESCORE_COMMAND is not configured. Install MuseScore and set MUSESCORE_COMMAND to enable rendered score export.");
  }

  const args = buildMuseScoreRenderArgs(input);
  const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(input.museScoreCommand, args, {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`MuseScore timed out after ${input.timeoutMs} ms.`));
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`MuseScore exited with code ${code}. ${stderr || stdout}`.trim()));
        return;
      }

      resolve({ stdout, stderr });
    });
  });

  if (fs.existsSync(input.outputPath)) {
    return {
      ...result,
      outputPath: input.outputPath,
      outputPaths: [input.outputPath],
    };
  }

  const fallbackOutputPaths = findMuseScoreOutputVariants(input.outputPath);
  if (fallbackOutputPaths.length === 1) {
    fs.copyFileSync(fallbackOutputPaths[0], input.outputPath);
    return {
      ...result,
      outputPath: input.outputPath,
      outputPaths: [input.outputPath],
    };
  }

  if (fallbackOutputPaths.length > 1) {
    return {
      ...result,
      outputPath: fallbackOutputPaths[0],
      outputPaths: fallbackOutputPaths,
    };
  }

  throw new Error(`MuseScore finished but no ${input.outputLabel} output was created.`);
}

export async function renderMusicXmlToPdf(input: {
  musicXmlPath: string;
  pdfPath: string;
  museScoreCommand: string;
  timeoutMs: number;
}) {
  return renderMusicXmlWithMuseScore({
    musicXmlPath: input.musicXmlPath,
    outputPath: input.pdfPath,
    outputLabel: "PDF",
    museScoreCommand: input.museScoreCommand,
    timeoutMs: input.timeoutMs,
  });
}

export function buildMuseScoreRenderArgs(input: {
  musicXmlPath: string;
  outputPath: string;
  imageResolutionDpi?: number;
  trimImageMargin?: number;
}) {
  const args: string[] = [];

  if (input.imageResolutionDpi !== undefined) {
    args.push("-r", String(input.imageResolutionDpi));
  }

  if (input.trimImageMargin !== undefined) {
    args.push("-T", String(input.trimImageMargin));
  }

  args.push("-o", input.outputPath, input.musicXmlPath);
  return args;
}

function findMuseScoreOutputVariants(outputPath: string) {
  const directory = path.dirname(outputPath);
  const extension = path.extname(outputPath);
  const baseName = path.basename(outputPath, extension);

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((entry) => entry.startsWith(`${baseName}-`) && entry.endsWith(extension))
    .sort()
    .map((entry) => path.join(directory, entry));
}
