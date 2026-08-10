import type { ScoreRecognitionPage } from "@score/shared";

export type OmrBoundingBox = { x: number; y: number; width: number; height: number };

export type OmrOverlayRect = {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
  clipped: boolean;
};

export function projectOmrBbox(page: ScoreRecognitionPage, bbox: OmrBoundingBox): OmrOverlayRect | null {
  if (!isPositive(page.width) || !isPositive(page.height) || !isRect(bbox)) return null;

  const requestedCrop = page.imageTransform?.crop;
  const crop = requestedCrop && isRect(requestedCrop)
    ? intersectRects(requestedCrop, { x: 0, y: 0, width: page.width, height: page.height })
    : { x: 0, y: 0, width: page.width, height: page.height };
  if (!crop) return null;

  const visible = intersectRects(bbox, crop);
  if (!visible) return null;
  const local = {
    x: visible.x - crop.x,
    y: visible.y - crop.y,
    width: visible.width,
    height: visible.height,
  };
  const rotation = page.imageTransform?.rotation ?? 0;
  const transformed = rotateRect(local, crop.width, crop.height, rotation);
  const outputWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width;
  const outputHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height;

  return {
    leftPercent: (transformed.x / outputWidth) * 100,
    topPercent: (transformed.y / outputHeight) * 100,
    widthPercent: (transformed.width / outputWidth) * 100,
    heightPercent: (transformed.height / outputHeight) * 100,
    clipped: !sameRect(visible, bbox),
  };
}

export function projectOmrBboxToCssPixels(
  page: ScoreRecognitionPage,
  bbox: OmrBoundingBox,
  renderedWidth: number,
  renderedHeight: number,
) {
  if (!isPositive(renderedWidth) || !isPositive(renderedHeight)) return null;
  const projected = projectOmrBbox(page, bbox);
  if (!projected) return null;
  return {
    x: (projected.leftPercent / 100) * renderedWidth,
    y: (projected.topPercent / 100) * renderedHeight,
    width: (projected.widthPercent / 100) * renderedWidth,
    height: (projected.heightPercent / 100) * renderedHeight,
    clipped: projected.clipped,
  };
}

export function hasMatchingOmrImageDimensions(page: ScoreRecognitionPage, naturalWidth: number, naturalHeight: number) {
  if (!page.imageWidth || !page.imageHeight || !isPositive(naturalWidth) || !isPositive(naturalHeight)) return true;
  return page.imageWidth === naturalWidth && page.imageHeight === naturalHeight;
}

function rotateRect(rect: OmrBoundingBox, width: number, height: number, rotation: 0 | 90 | 180 | 270): OmrBoundingBox {
  if (rotation === 90) {
    return { x: height - rect.y - rect.height, y: rect.x, width: rect.height, height: rect.width };
  }
  if (rotation === 180) {
    return { x: width - rect.x - rect.width, y: height - rect.y - rect.height, width: rect.width, height: rect.height };
  }
  if (rotation === 270) {
    return { x: rect.y, y: width - rect.x - rect.width, width: rect.height, height: rect.width };
  }
  return rect;
}

function intersectRects(left: OmrBoundingBox, right: OmrBoundingBox): OmrBoundingBox | null {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const rightEdge = Math.min(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height);
  if (rightEdge <= x || bottomEdge <= y) return null;
  return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

function isRect(value: OmrBoundingBox) {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && isPositive(value.width) && isPositive(value.height);
}

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function sameRect(left: OmrBoundingBox, right: OmrBoundingBox) {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}
