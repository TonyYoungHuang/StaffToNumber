// TIFF page count follows the main image-file directory chain (not thumbnail
// sub-IFDs). Unsupported BigTIFF or malformed/cyclic files fail closed.
export function countTiffPages(bytes: Uint8Array): number {
  if (bytes.length < 8) return 0;
  const little = bytes[0] === 0x49 && bytes[1] === 0x49;
  if (!little && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(2, little) !== 42) return 0;
  let offset = view.getUint32(4, little), pages = 0;
  const visited = new Set<number>();
  while (offset) {
    if (offset + 2 > bytes.length || visited.has(offset)) return 0;
    visited.add(offset);
    const next = offset + 2 + view.getUint16(offset, little) * 12;
    if (next + 4 > bytes.length) return 0;
    offset = view.getUint32(next, little);
    if (++pages > 5) return pages;
  }
  return pages;
}
