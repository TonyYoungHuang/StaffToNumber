import path from "node:path";
import AdmZip from "adm-zip";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

const MAX_XML_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
type XmlNode = { [name: string]: XmlNode[] | Record<string, unknown> };

/** Convert timewise structurally, preserving every original measure child. */
export function normalizeMusicXmlScore(xml: string): string {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES || /<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Unsafe, malformed or oversized MusicXML.");
  if (/<score-partwise\b/u.test(xml)) return xml.replace(/^\uFEFF/u, "");
  if (!/<score-timewise\b/u.test(xml)) throw new Error("This XML does not contain a supported score document.");
  const tree = new XMLParser({ preserveOrder: true, ignoreAttributes: false, parseTagValue: false, trimValues: false }).parse(xml) as XmlNode[];
  const root = tree.find(node => "score-timewise" in node);
  if (!root) throw new Error("The timewise MusicXML root could not be read.");
  const children = root["score-timewise"] as XmlNode[];
  const output = children.filter(node => !("measure" in node));
  const parts = new Map<string, XmlNode>();
  for (const measure of children.filter(node => "measure" in node)) {
    for (const sourcePart of (measure.measure as XmlNode[]).filter(node => "part" in node)) {
      const id = String((sourcePart[":@"] as Record<string, unknown> | undefined)?.["@_id"] ?? "");
      if (!id) throw new Error("A timewise MusicXML part has no identity.");
      let part = parts.get(id);
      if (!part) { part = { part: [], ":@": { "@_id": id } }; parts.set(id, part); output.push(part); }
      (part.part as XmlNode[]).push({ measure: sourcePart.part, ...(measure[":@"] ? { ":@": measure[":@"] } : {}) });
    }
  }
  delete root["score-timewise"];
  root["score-partwise"] = output;
  return new XMLBuilder({ preserveOrder: true, ignoreAttributes: false }).build(tree) as string;
}

export type MusicXmlContainerResult = {
  candidates: Array<{ rootPath: string; musicXml: string }>;
  rejected: Array<{ rootPath: string; message: string }>;
};

/** Every score root is delivered. Unsupported/broken siblings are isolated. */
export function extractMusicXmlCandidatesFromCompressedMxl(buffer: Buffer): MusicXmlContainerResult {
  const archive = new AdmZip(buffer), entries = archive.getEntries();
  if (entries.length > 1_000) throw new Error("The compressed MusicXML package contains too many files.");
  if (entries.reduce((sum, entry) => sum + Number(entry.header.size || 0), 0) > MAX_ARCHIVE_BYTES) throw new Error("The compressed MusicXML package expands beyond the 50 MB safety limit.");
  const candidates: MusicXmlContainerResult["candidates"] = [], rejected: MusicXmlContainerResult["rejected"] = [];
  const visited = new Set<string>(), active = new Set<string>(), cache = new Map<string, string>();
  let expandedBytes = 0;
  const read = (entry: ReturnType<AdmZip["getEntries"]>[number]) => {
    if (cache.has(entry.entryName)) return cache.get(entry.entryName)!;
    if (Number(entry.header.size || 0) > MAX_XML_BYTES) throw new Error("A score XML exceeds the 20 MB safety limit.");
    const data = entry.getData(); expandedBytes += data.byteLength;
    if (data.byteLength > MAX_XML_BYTES || expandedBytes > MAX_ARCHIVE_BYTES) throw new Error("The MusicXML package exceeds its actual decompression safety limit.");
    const xml = data.toString("utf8"); cache.set(entry.entryName, xml); return xml;
  };
  const safePath = (name: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|[\\/])|[?#]/iu.test(name) || name.split(/[\\/]/u).includes("..")) throw new Error("External or out-of-directory MusicXML references are not supported.");
    return name;
  };
  const visit = (name: string) => {
    safePath(name);
    if (active.has(name)) throw new Error("Cyclic MusicXML opus references are not supported.");
    if (visited.has(name)) return;
    visited.add(name); active.add(name);
    try {
      const entry = archive.getEntry(name);
      if (!entry || entry.isDirectory) throw new Error("A referenced MusicXML score is missing.");
      const xml = read(entry);
      if (/<opus\b/u.test(xml)) {
        if (/<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Unsafe or malformed MusicXML opus.");
        for (const reference of xml.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/giu)) {
          const target = reference[1];
          if (/^(?:[a-z][a-z\d+.-]*:|[\\/])|[?#]/iu.test(target)) throw new Error("External MusicXML references are not supported.");
          visit(safePath(path.posix.normalize(path.posix.join(path.posix.dirname(name), target))));
        }
      } else if (/<score-(?:partwise|timewise)\b/u.test(xml)) {
        candidates.push({ rootPath: name, musicXml: normalizeMusicXmlScore(xml) });
      }
    } finally { active.delete(name); }
  };
  const roots: string[] = [];
  const container = archive.getEntry("META-INF/container.xml");
  if (container && !container.isDirectory) {
    const xml = read(container);
    if (/<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Unsafe or malformed MusicXML container.");
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(xml) as { container?: { rootfiles?: { rootfile?: { "full-path"?: string } | Array<{ "full-path"?: string }> } } };
    const files = parsed.container?.rootfiles?.rootfile;
    for (const file of files ? (Array.isArray(files) ? files : [files]) : []) if (file["full-path"]) roots.push(file["full-path"]);
  }
  roots.push(...entries.filter(entry => !entry.isDirectory && /\.(musicxml|xml)$/iu.test(entry.entryName) && !entry.entryName.toLowerCase().startsWith("meta-inf/")).map(entry => entry.entryName));
  for (const name of new Set(roots)) {
    try { visit(name); }
    catch (error) { rejected.push({ rootPath: name, message: error instanceof Error ? error.message : "This result cannot be read." }); }
  }
  if (!candidates.length) throw new Error("The compressed MusicXML package does not contain a readable score XML file.");
  return { candidates, rejected };
}
