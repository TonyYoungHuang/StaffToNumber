"""Bounded, offline raster preparation. No models, OCR, or network access.

All output remains grayscale: thresholding is used only for measurements. A
configuration is fixed before recognition and includes its invertible mapping.
Uncertain staff detection preserves the complete page rather than guessing a crop.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

cv2.setNumThreads(1)
MAX_PIXELS = 12_000_000


def bounded_size(width, height, max_pixels):
    factor = min(1.0, math.sqrt(max_pixels / max(1, width * height)))
    return max(1, math.floor(width * factor)), max(1, math.floor(height * factor))


def inspect(gray):
    height, width = gray.shape
    scale = min(1.0, 1800 / max(width, height))
    small = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else gray
    ink = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    # Long horizontal segments, with no erosion/dilation ever applied to the
    # image delivered to the engine. Nearby rows represent one thick staff line.
    lines = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((1, max(15, small.shape[1] // 10)), np.uint8))
    rows = np.flatnonzero(np.count_nonzero(lines, axis=1) >= max(30, small.shape[1] * .12))
    peaks = []
    for row in rows:
        if not peaks or row - peaks[-1][-1] > 2:
            peaks.append([int(row)])
        else:
            peaks[-1].append(int(row))
    centers = [float(np.mean(group)) for group in peaks]
    groups = []
    index = 0
    while index + 4 < len(centers):
        candidate = centers[index:index + 5]
        gaps = np.diff(candidate)
        spacing = float(np.median(gaps))
        if spacing >= 2 and spacing <= 45 and max(abs(gaps - spacing)) <= max(1.5, spacing * .22):
            groups.append(candidate)
            index += 5
        else:
            index += 1
    spacing = float(np.median([np.median(np.diff(group)) for group in groups])) / scale if groups else None
    # The existing layout detector resolves staff segments independently,
    # including screenshots whose broken lines disappear in row projection.
    # Its module imports no learned models and does not invoke HOMR here.
    staff_count = len(groups)
    try:
        from complex_omr_adapter import line_inventory
        detected, _ = line_inventory(cv2.cvtColor(small, cv2.COLOR_GRAY2BGR))
        if detected:
            spacing = float(np.median([staff["unit"] for staff in detected])) / scale
            staff_count = len(detected)
    except ImportError:
        pass
    # The crop includes every dark component, not only detected staffs, keeping
    # lyrics, clefs, titles, and an undetected bottom system. Border-touching ink
    # or dark backgrounds suppress cropping completely.
    crop = [0, 0, width, height]
    if staff_count:
        ys, xs = np.where(ink > 0)
        if len(xs):
            padding = max(20, round((spacing or 10) * 5))
            x0 = max(0, math.floor(xs.min() / scale) - padding)
            y0 = max(0, math.floor(ys.min() / scale) - padding)
            x1 = min(width, math.ceil((xs.max() + 1) / scale) + padding)
            y1 = min(height, math.ceil((ys.max() + 1) / scale) + padding)
            if (x1 - x0) * (y1 - y0) >= width * height * .35:
                crop = [x0, y0, x1 - x0, y1 - y0]
    return {
        "staffSpacing": round(spacing, 3) if spacing else None,
        "expectedStaffCount": staff_count or None,
        "staffDetection": "estimated" if staff_count else "uncertain",
        "crop": crop,
        "brightness": round(float(np.median(small)), 2),
        "contrast": round(float(np.percentile(small, 95) - np.percentile(small, 5)), 2),
        "blurVariance": round(float(cv2.Laplacian(small, cv2.CV_64F).var()), 2),
    }


def requested_scale(spacing):
    if spacing is None:
        return 1
    return 3 if spacing < 8 else 2 if spacing < 16 else 1


def flatten_shadow(gray):
    # Estimate the paper illumination on a thumbnail. Dividing by this slowly
    # changing field preserves fine note edges and gray antialiasing. No binary
    # output, sharpening, or removal of horizontal lines/watermarks.
    height, width = gray.shape
    small = cv2.resize(gray, (max(1, width // 4), max(1, height // 4)), interpolation=cv2.INTER_AREA)
    background = cv2.GaussianBlur(cv2.dilate(small, np.ones((15, 15), np.uint8)), (0, 0), 12)
    background = cv2.resize(background, (width, height), interpolation=cv2.INTER_LINEAR)
    flat = cv2.divide(gray, np.maximum(background, 1), scale=245)
    return cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8)).apply(flat)


def rectify(gray, corners, max_pixels):
    height, width = gray.shape
    points = np.asarray(corners, dtype=np.float32)
    if points.shape != (4, 2) or not np.isfinite(points).all() or np.any(points < 0) or np.any(points > 1):
        raise ValueError("Photo corners must be four normalized points in clockwise order.")
    points *= [width - 1, height - 1]
    if not cv2.isContourConvex(points.reshape(4, 1, 2)) or abs(cv2.contourArea(points)) < width * height * .05:
        raise ValueError("Photo corners must enclose a visible, convex page.")
    target_width = round(max(np.linalg.norm(points[1] - points[0]), np.linalg.norm(points[2] - points[3])))
    target_height = round(max(np.linalg.norm(points[3] - points[0]), np.linalg.norm(points[2] - points[1])))
    target_width, target_height = bounded_size(target_width, target_height, max_pixels)
    target = np.asarray([[0, 0], [target_width - 1, 0], [target_width - 1, target_height - 1], [0, target_height - 1]], np.float32)
    matrix = cv2.getPerspectiveTransform(points, target)
    return cv2.warpPerspective(gray, matrix, (target_width, target_height), flags=cv2.INTER_LANCZOS4, borderValue=255), matrix


def prepare(request):
    limit = max(1, min(MAX_PIXELS, int(request.get("maxPixels", MAX_PIXELS))))
    output = Path(request["outputDir"]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    source = Path(request["inputPath"])
    # Inspect the header before materializing an array. This supplements the
    # existing upload and decompression protections; it does not replace them.
    with Image.open(source) as raw:
        if raw.width * raw.height > 32_000_000:
            raise ValueError("Raster exceeds the source pixel safety budget.")
        orientation = int(raw.getexif().get(274, 1))
        oriented = ImageOps.exif_transpose(raw)
        original_width, original_height = oriented.size
        size = bounded_size(*oriented.size, limit)
        if oriented.size != size:
            oriented = oriented.resize(size, Image.Resampling.LANCZOS)
        # Flatten alpha onto white, keeping gray detail instead of converting
        # transparent pixels to black.
        if "A" in oriented.getbands():
            rgba = oriented.convert("RGBA")
            white = Image.new("RGBA", rgba.size, "white")
            white.alpha_composite(rgba)
            oriented = white
        gray = np.asarray(oriented.convert("L"))
    matrix = np.diag([gray.shape[1] / original_width, gray.shape[0] / original_height, 1.0])
    if request.get("corners"):
        gray, perspective = rectify(gray, request["corners"], limit)
        matrix = perspective @ matrix
    rotation = request.get("rotationDegrees", 0)
    if rotation not in (0, 90, 180, 270):
        raise ValueError("Unsupported raster orientation.")
    if rotation:
        height, width = gray.shape
        rotations = {
            90: (cv2.ROTATE_90_CLOCKWISE, [[0, -1, height - 1], [1, 0, 0], [0, 0, 1]]),
            180: (cv2.ROTATE_180, [[-1, 0, width - 1], [0, -1, height - 1], [0, 0, 1]]),
            270: (cv2.ROTATE_90_COUNTERCLOCKWISE, [[0, 1, 0], [-1, 0, width - 1], [0, 0, 1]]),
        }
        code, orientation_matrix = rotations[rotation]
        gray = cv2.rotate(gray, code)
        matrix = np.asarray(orientation_matrix) @ matrix
    diagnostics = inspect(gray)
    # Quality alternatives are sequential and share the admitted pixel budget.
    # A low-confidence photo must retain enhancement on the ordinary lane.
    ids = ["gray", "detail", "shadow-detail"]
    requested = request.get("variantIds")
    if requested:
        ids = [identifier for identifier in ids if identifier in requested]
    ids = ids[:max(1, min(3, int(request.get("maxVariants", 3))))]
    variants = []
    staff_count_evidence = [diagnostics["expectedStaffCount"]] if diagnostics["expectedStaffCount"] else []
    for identifier in ids:
        image = gray
        transform = matrix.copy()
        scale = 1
        crop = [0, 0, gray.shape[1], gray.shape[0]]
        operations = ["grayscale-detail"]
        if rotation:
            operations.append(f"orientation-{rotation}")
        if request.get("corners"):
            operations.append("manual-perspective")
        if identifier != "gray":
            crop = diagnostics["crop"]
            x, y, width, height = crop
            image = gray[y:y + height, x:x + width]
            transform = np.asarray([[1, 0, -x], [0, 1, -y], [0, 0, 1]]) @ transform
            if crop != [0, 0, gray.shape[1], gray.shape[0]]:
                operations.append("conservative-crop")
            if identifier == "shadow-detail":
                image = flatten_shadow(image)
                operations.append("shadow-safe-grayscale")
            desired = requested_scale(diagnostics["staffSpacing"])
            # 2x and 3x are real scales, never enlarged and then shrunk by the
            # old 3000px normalization. An affordable fractional scale is a
            # single resize, never 2x followed by another shrinking operation.
            scale = next((candidate for candidate in [desired, 2, 1] if candidate <= desired and image.size * candidate * candidate <= limit), 1)
            if scale == 1 and desired > 1:
                # A just-too-large screenshot should use the remaining pixel
                # allowance directly, not lose its entire scale improvement.
                # Tiny (<15%) changes only add resampling, so keep those 1x.
                affordable = math.sqrt(limit / image.size)
                if affordable >= 1.15:
                    scale = min(desired, affordable)
            if scale > 1:
                input_height, input_width = image.shape
                output_width, output_height = math.floor(input_width * scale), math.floor(input_height * scale)
                image = cv2.resize(image, (output_width, output_height), interpolation=cv2.INTER_LANCZOS4)
                x_scale, y_scale = output_width / input_width, output_height / input_height
                transform = np.diag([x_scale, y_scale, 1.0]) @ transform
                scale = min(x_scale, y_scale)
                operations.append(f"staff-spacing-{int(scale)}x" if scale in (2, 3) else "staff-spacing-budget-fit")
            # Low-resolution source detection can itself miss staff rows. Recheck
            # the prepared detail before scoring engine coverage, so recognizing
            # seven rows is not called complete when ten are now visible.
            refined_staff_count = inspect(image)["expectedStaffCount"]
            if refined_staff_count:
                staff_count_evidence.append(refined_staff_count)
        destination = output / f"{identifier}.png"
        ok, encoded = cv2.imencode(".png", image)
        if not ok:
            raise ValueError("Could not encode enhanced raster.")
        encoded.tofile(str(destination))
        variants.append({
            "id": identifier, "imagePath": str(destination), "width": int(image.shape[1]), "height": int(image.shape[0]),
            "scale": scale, "crop": crop, "operations": operations,
            "sourceToImage": transform.reshape(-1).tolist(), "imageToSource": np.linalg.inv(transform).reshape(-1).tolist(),
            "coordinateSpace": "exif-oriented-source", "exifOrientation": orientation,
            "sourceWidth": original_width, "sourceHeight": original_height,
            "requiresBigLane": False,
        })
    diagnostics["staffCountEvidence"] = staff_count_evidence
    if staff_count_evidence:
        diagnostics["expectedStaffCount"] = max(staff_count_evidence)
        diagnostics["staffDetection"] = "estimated"
    return {"schemaVersion": 1, "diagnostics": diagnostics, "variants": variants}


if __name__ == "__main__":
    request_path, result_path = map(Path, sys.argv[1:3])
    result = prepare(json.loads(request_path.read_text(encoding="utf-8-sig")))
    result_path.write_text(json.dumps(result), encoding="utf-8")
