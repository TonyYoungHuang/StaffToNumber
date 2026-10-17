/** Read dimensions without decoding pixels. EXIF rotations preserve pixel count.
 * Every offset is bounded; TIFF follows only the main frame chain, not EXIF IFDs.
 */
export function recognitionImageMetadata(bytes: Buffer, kind: string): { pageCount: number; maxPagePixels: number } | null {
  const single = (width: number, height: number) => Number.isSafeInteger(width * height) && width > 0 && height > 0
    ? { pageCount: 1, maxPagePixels: width * height } : null;
  if (kind === "png" && bytes.length >= 24 && bytes.toString("ascii", 12, 16) === "IHDR") {
    return single(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
  }
  if (kind === "jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return length >= 8 ? single(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)) : null;
      }
      offset += length;
    }
  }
  if (kind === "webp") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const tag = bytes.toString("ascii", offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8;
      if (start + length > bytes.length) return null;
      if (tag === "VP8X" && length >= 10) return single(1 + bytes.readUIntLE(start + 4, 3), 1 + bytes.readUIntLE(start + 7, 3));
      if (tag === "VP8 " && length >= 10 && bytes.toString("hex", start + 3, start + 6) === "9d012a") {
        return single(bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff);
      }
      if (tag === "VP8L" && length >= 5 && bytes[start] === 0x2f) {
        const bits = bytes.readUInt32LE(start + 1);
        return single(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff));
      }
      offset = start + length + length % 2;
    }
  }
  if (kind === "tiff" && bytes.length >= 8) {
    const little = bytes.toString("ascii", 0, 2) === "II";
    if (!little && bytes.toString("ascii", 0, 2) !== "MM") return null;
    const u16 = (offset: number) => little ? bytes.readUInt16LE(offset) : bytes.readUInt16BE(offset);
    const u32 = (offset: number) => little ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset);
    if (u16(2) !== 42) return null;
    let offset = u32(4), pageCount = 0, maxPagePixels = 0;
    const visited = new Set<number>();
    while (offset) {
      if (offset + 2 > bytes.length || visited.has(offset)) return null;
      visited.add(offset);
      const count = u16(offset), next = offset + 2 + count * 12;
      if (next + 4 > bytes.length) return null;
      let width = 0, height = 0;
      for (let entry = offset + 2; entry < next; entry += 12) {
        const tag = u16(entry);
        if ((tag !== 256 && tag !== 257) || u32(entry + 4) !== 1) continue;
        const type = u16(entry + 2), value = type === 3 ? u16(entry + 8) : type === 4 ? u32(entry + 8) : 0;
        if (tag === 256) width = value; else height = value;
      }
      const metadata = single(width, height);
      if (!metadata) return null;
      maxPagePixels = Math.max(maxPagePixels, metadata.maxPagePixels);
      pageCount++;
      offset = u32(next);
    }
    return pageCount ? { pageCount, maxPagePixels } : null;
  }
  return null;
}
