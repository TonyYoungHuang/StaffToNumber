"use client";

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { RecognitionExperienceMessages } from '@score/i18n';

export type PhotoCorner = { x: number; y: number };
export type PhotoCorners = [PhotoCorner, PhotoCorner, PhotoCorner, PhotoCorner];
const fullCorners = (): PhotoCorners => [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** Solve the projective map from a unit rectangle to a clockwise quadrilateral. */
export function photoPerspective(corners: PhotoCorners): number[] | null {
  const matrix: number[][] = [];
  for (const [index, [u, v]] of [[0, 0], [1, 0], [1, 1], [0, 1]].entries()) {
    const { x, y } = corners[index]!;
    matrix.push([u!, v!, 1, 0, 0, 0, -u! * x, -v! * x, x]);
    matrix.push([0, 0, 0, u!, v!, 1, -u! * y, -v! * y, y]);
  }
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(matrix[row]![column]!) > Math.abs(matrix[pivot]![column]!)) pivot = row;
    if (Math.abs(matrix[pivot]![column]!) < 1e-8) return null;
    [matrix[column], matrix[pivot]] = [matrix[pivot]!, matrix[column]!];
    const divisor = matrix[column]![column]!;
    matrix[column] = matrix[column]!.map(value => value / divisor);
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = matrix[row]![column]!;
      matrix[row] = matrix[row]!.map((value, index) => value - factor * matrix[column]![index]!);
    }
  }
  return [...matrix.map(row => row[8]!), 1];
}
export function validPhotoCorners(corners: PhotoCorners): boolean {
  if (corners.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return false;
  const area = Math.abs(corners.reduce((sum, point, index) => {
    const next = corners[(index + 1) % 4]!;
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  if (area < 0.05) return false;
  for (let index = 0; index < 4; index++) {
    const a = corners[index]!; const b = corners[(index + 1) % 4]!; const c = corners[(index + 2) % 4]!;
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) < 0.01) return false;
  }
  return photoPerspective(corners) !== null;
}

/** The preview is local; the unchanged original plus corners is uploaded. */
export function PhotoCornerEditor({ file, messages: copy, onContinue }: { file: File; messages: RecognitionExperienceMessages; onContinue: (corners: PhotoCorners | null) => void }) {
  const [url, setUrl] = useState('');
  const [corners, setCorners] = useState<PhotoCorners>(fullCorners);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<number | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file); setUrl(next); setCorners(fullCorners()); setPreview(false); setError(false);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const valid = validPhotoCorners(corners);
  useEffect(() => {
    if (!preview || !valid || !imageRef.current?.naturalWidth || !canvasRef.current) return;
    const image = imageRef.current;
    const source = document.createElement('canvas');
    const ratio = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    source.width = Math.max(1, Math.round(image.naturalWidth * ratio)); source.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = source.getContext('2d', { willReadFrequently: true });
    const target = canvasRef.current;
    const output = target.getContext('2d'); const map = photoPerspective(corners);
    if (!context || !output || !map) { setError(true); return; }
    const distance = (a: PhotoCorner, b: PhotoCorner) => Math.hypot((b.x - a.x) * source.width, (b.y - a.y) * source.height);
    target.width = Math.max(1, Math.round(Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]))));
    target.height = Math.max(1, Math.round(Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]))));
    try {
      context.drawImage(image, 0, 0, source.width, source.height);
      const pixels = context.getImageData(0, 0, source.width, source.height);
      const result = output.createImageData(target.width, target.height);
      for (let y = 0; y < target.height; y++) for (let x = 0; x < target.width; x++) {
        const u = x / Math.max(1, target.width - 1); const v = y / Math.max(1, target.height - 1);
        const divisor = map[6]! * u + map[7]! * v + 1;
        const sx = Math.max(0, Math.min(source.width - 1, Math.round((map[0]! * u + map[1]! * v + map[2]!) / divisor * (source.width - 1))));
        const sy = Math.max(0, Math.min(source.height - 1, Math.round((map[3]! * u + map[4]! * v + map[5]!) / divisor * (source.height - 1))));
        const from = (sy * source.width + sx) * 4; const to = (y * target.width + x) * 4;
        result.data[to] = pixels.data[from]!; result.data[to + 1] = pixels.data[from + 1]!; result.data[to + 2] = pixels.data[from + 2]!; result.data[to + 3] = 255;
      }
      output.putImageData(result, 0, 0);
    } catch { setError(true); }
    source.width = 0; source.height = 0;
  }, [corners, preview, valid, imageVersion]);
  function move(event: PointerEvent<HTMLElement>, index: number) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
    setCorners(current => current.map((value, position) => position === index ? point : value) as PhotoCorners);
  }
  return <section className="surface-panel stack-md" data-photo-corner-editor>
    <h3 className="card-title">{copy.photoTitle}</h3><p>{copy.photoGuide}</p><p>{copy.photoCorners}</p>
    <div className="button-row"><button type="button" className="button button-secondary" aria-pressed={!preview} onClick={() => setPreview(false)}>{copy.photoOriginal}</button><button type="button" className="button button-secondary" aria-pressed={preview} disabled={!valid || error} onClick={() => setPreview(true)}>{copy.photoPreview}</button></div>
    <div ref={surfaceRef} style={{ position: 'relative', maxWidth: 640, marginInline: 'auto', width: '100%', touchAction: 'none' }} hidden={preview}>
      {url ? <img ref={imageRef} src={url} alt={copy.photoOriginal} style={{ width: '100%', display: 'block' }} onLoad={() => setImageVersion(version => version + 1)} onError={() => setError(true)} /> : null}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}><polygon points={corners.map(point => `${point.x * 100},${point.y * 100}`).join(' ')} fill="rgba(16,185,129,.08)" stroke={valid ? '#047857' : '#b42318'} strokeWidth=".6" /></svg>
      {corners.map((point, index) => <button key={index} type="button" aria-label={`${copy.photoCorners} ${index + 1}`} style={{ position: 'absolute', left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%,-50%)', width: 48, height: 48, borderRadius: '50%', background: '#fff', border: '3px solid #047857', cursor: 'grab', touchAction: 'none' }} onPointerDown={event => { dragging.current = index; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (dragging.current === index) move(event, index); }} onPointerUp={event => { dragging.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragging.current = null; }} onKeyDown={event => {
        const delta = event.shiftKey ? .02 : .005; const offset = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] }[event.key];
        if (offset) { event.preventDefault(); setCorners(current => current.map((value, position) => position === index ? { x: Math.max(0, Math.min(1, value.x + offset[0]!)), y: Math.max(0, Math.min(1, value.y + offset[1]!)) } : value) as PhotoCorners); }
      }} />)}
    </div>
    <canvas ref={canvasRef} aria-label={copy.photoPreview} hidden={!preview} style={{ maxWidth: '100%', marginInline: 'auto' }} />
    {error ? <p role="status">{copy.photoError}</p> : null}
    <div className="button-row"><button type="button" className="button button-primary" disabled={!valid || error} onClick={() => onContinue(corners)}>{copy.photoApply}</button><button type="button" className="button button-secondary" onClick={() => onContinue(null)}>{copy.photoSkip}</button><button type="button" className="button button-tertiary" onClick={() => { setCorners(fullCorners()); setPreview(false); }}>{copy.photoReset}</button></div>
  </section>;
}
