"""Bounded, local staff-layout preview; never runs recognition or reserves credits.

Only classical image operations are imported from the complex adapter. Its
module-level imports are standard-library-only; none of its model/OCR functions
are called here. This preview is a suggestion, not score-completeness evidence.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys
import time
import warnings

from complex_omr_adapter import line_inventory as _line_inventory


DEFAULT_LIMITS = {
    "maxPagePixels": 1_000_000,
    "maxTotalPixels": 30_000_000,
    "maxPages": 60,
    "dpi": 100,
    "budgetMs": 15_000,
}
HARD_LIMITS = {
    "maxPagePixels": 2_000_000,
    "maxTotalPixels": 60_000_000,
    "maxPages": 100,
    "dpi": 150,
    "budgetMs": 20_000,
}
# Reject pathological raster headers before decompression. PDF allocation is
# independently bounded by maxPagePixels before page.render is invoked.
MAX_SOURCE_RASTER_PIXELS = 32_000_000


def read_limits(request):
    supplied = request.get("limits", {})
    if not isinstance(supplied, dict):
        raise ValueError("PREFLIGHT_INVALID_REQUEST")
    result = {}
    for name, default in DEFAULT_LIMITS.items():
        value = supplied.get(name, default)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 1:
            raise ValueError("PREFLIGHT_INVALID_REQUEST")
        result[name] = min(int(value), HARD_LIMITS[name])
    return result



def _margin_evidence(ink, staffs):
    """A strong asymmetric clef/label margin may distinguish 0 from 180.

    Staff lines alone cannot distinguish upright from upside down. Ordinary
    notes at the right edge may also resemble margin symbols, so weak evidence
    remains uncertain instead of claiming an orientation.
    """
    import cv2
    import numpy as np

    height, width = ink.shape
    horizontal = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, width // 15), 1)))
    marks = cv2.subtract(ink, horizontal)
    left_mass = right_mass = normalized_difference = 0.0
    decisive_left = decisive_right = 0
    for staff in staffs:
        area, unit = staff["bbox"], staff["unit"]
        y0 = max(0, round(area["y"] - 3 * unit))
        y1 = min(height, round(area["y"] + area["height"] + 3 * unit))
        staff_left, staff_right = area["x"], area["x"] + area["width"]
        left = marks[y0:y1, max(0, round(staff_left - 2 * unit)):min(width, round(staff_left + 8 * unit))]
        right = marks[y0:y1, max(0, round(staff_right - 8 * unit)):min(width, round(staff_right + 2 * unit))]
        # Straight barlines do not constitute clef-side evidence.
        counts = []
        for region in (left, right):
            if not region.size:
                counts.append(0)
                continue
            vertical = cv2.morphologyEx(region, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(8, round(5 * unit)))))
            counts.append(int(np.count_nonzero(cv2.subtract(region, vertical))))
        left_count, right_count = counts
        left_mass += left_count
        right_mass += right_count
        normalized_difference += (left_count - right_count) / max(1, unit * unit)
        if left_count > max(unit * unit * 1.3, right_count * 1.6):
            decisive_left += 1
        if right_count > max(unit * unit * 1.3, left_count * 1.6):
            decisive_right += 1
    votes_required = max(1, math.ceil(len(staffs) * .5))
    left_certain = decisive_left >= votes_required and left_mass > right_mass * 1.6 and normalized_difference > len(staffs) * .8
    right_certain = decisive_right >= votes_required and right_mass > left_mass * 1.6 and normalized_difference < -len(staffs) * .8
    return left_certain, right_certain


def _connected_staffs(first, second, ink):
    """A printed connection crossing the gap establishes simultaneity."""
    import cv2
    import numpy as np

    unit = min(first["unit"], second["unit"])
    a, b = first["bbox"], second["bbox"]
    gap_start = round(a["y"] + a["height"] + unit * .6)
    gap_end = round(b["y"] - unit * .6)
    if gap_end <= gap_start:
        return False
    left = max(0, round(max(a["x"], b["x"]) - 3 * unit))
    right = min(ink.shape[1], round(min(a["x"] + a["width"], b["x"] + b["width"]) + unit))
    region = ink[max(0, gap_start):min(ink.shape[0], gap_end), left:right]
    if region.size == 0:
        return False
    # Dilation allows slight photo skew; a continuous long connection remains
    # necessary. A lyric or unrelated short note stem cannot connect a system.
    expanded = cv2.dilate(region, cv2.getStructuringElement(cv2.MORPH_RECT, (max(1, round(unit * .35)), 1)))
    return bool(np.any(np.mean(expanded > 0, axis=0) >= .86))


def _systems(staffs, ink):
    """Avoid treating repeated single-melody systems as an orchestra."""
    groups = []
    uncertain = False
    for staff in staffs:
        if not groups:
            groups.append([staff])
            continue
        prior = groups[-1][-1]
        gap = staff["bbox"]["y"] - prior["bbox"]["y"] - prior["bbox"]["height"]
        unit = min(staff["unit"], prior["unit"])
        if _connected_staffs(prior, staff, ink):
            groups[-1].append(staff)
        elif gap < unit * 7:
            # A close pair could be a disconnected grand staff or independent
            # systems. We cannot establish its instrument structure for free.
            groups[-1].append(staff)
            uncertain = True
        else:
            groups.append([staff])
    # A different staff count between systems may represent an actual layout
    # change, a short last system, or missed lines. Do not silently call it simple.
    if len({len(group) for group in groups}) > 1:
        uncertain = True
    return groups, uncertain


def analyze_page(image, page_number, exif_orientation=1):
    import cv2
    import numpy as np

    # At most two line inventories are needed: 180 preserves horizontal rows.
    candidate = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    rotated = cv2.rotate(candidate, cv2.ROTATE_90_CLOCKWISE)
    horizontal_staffs, horizontal_ink = _line_inventory(candidate)
    vertical_staffs, vertical_ink = _line_inventory(rotated)
    if len(vertical_staffs) > len(horizontal_staffs):
        angle, selected, staffs, ink = 90, rotated, vertical_staffs, vertical_ink
    else:
        angle, selected, staffs, ink = 0, candidate, horizontal_staffs, horizontal_ink

    reasons = []
    orientation_certain = False
    if staffs:
        left_certain, right_certain = _margin_evidence(ink, staffs)
        if left_certain:
            orientation_certain = True
        elif right_certain:
            orientation_certain = True
            angle = (angle + 180) % 360
            selected = cv2.rotate(selected, cv2.ROTATE_180)
            # Transform geometry without a third detector pass.
            height, width = ink.shape
            ink = cv2.rotate(ink, cv2.ROTATE_180)
            staffs = [{**staff, "bbox": {**staff["bbox"], "x": width - 1 - staff["bbox"]["x"] - staff["bbox"]["width"], "y": height - 1 - staff["bbox"]["y"] - staff["bbox"]["height"]}} for staff in reversed(staffs)]
        if not orientation_certain:
            reasons.append("ORIENTATION_UNCERTAIN")
    else:
        reasons.append("NO_STAFF_DETECTED")

    groups, grouping_uncertain = _systems(staffs, ink)
    grouping_uncertain = grouping_uncertain or any(staff.get("inventoryUncertain", False) for staff in staffs)
    if grouping_uncertain:
        reasons.append("SYSTEM_GROUPING_UNCERTAIN")
    tab_count = sum(staff["kind"] == "tablature" for staff in staffs)
    max_staves = max((len(group) for group in groups), default=0)
    if tab_count:
        reasons.append("TAB_NOTATION")
    if max_staves >= 3:
        reasons.append("MULTI_INSTRUMENT_LAYOUT")
    elif max_staves == 2 and not tab_count:
        reasons.append("PIANO_STAFF_LAYOUT")
    elif max_staves == 1 and not tab_count:
        reasons.append("SINGLE_STAFF_LAYOUT")
    if staffs and min(staff["unit"] for staff in staffs) < 3.5:
        reasons.append("LOW_RESOLUTION")
    uncertain = not staffs or not orientation_certain or grouping_uncertain or "LOW_RESOLUTION" in reasons
    return {
        "page": page_number,
        "width": selected.shape[1],
        "height": selected.shape[0],
        "staffCount": len(staffs),
        "standardStaffCount": len(staffs) - tab_count,
        "tabStaffCount": tab_count,
        "systemCount": len(groups),
        "maxStavesPerSystem": max_staves,
        "hasTab": bool(tab_count),
        "uncertain": uncertain,
        "rotation": angle if orientation_certain else None,
        "orientationCertain": orientation_certain,
        "exifOrientation": exif_orientation,
        "reasonCodes": reasons,
    }


def _fit_size(width, height, pixel_limit):
    if width <= 0 or height <= 0:
        raise ValueError("PREFLIGHT_INVALID_SOURCE")
    factor = min(1, math.sqrt(pixel_limit / (width * height)))
    return max(1, math.floor(width * factor)), max(1, math.floor(height * factor))


def preflight(request):
    from PIL import Image, ImageOps
    import cv2  # Readiness only; missing dependencies must fail before page work.
    import numpy
    # OpenCV can use its own pthread pool independently of OMP/BLAS variables.
    cv2.setNumThreads(1)

    started = time.monotonic()
    if not isinstance(request, dict) or not isinstance(request.get("sourcePath"), str):
        raise ValueError("PREFLIGHT_INVALID_REQUEST")
    source = Path(request["sourcePath"])
    if not source.is_file():
        raise ValueError("PREFLIGHT_INVALID_SOURCE")
    limits = read_limits(request)
    deadline = started + limits["budgetMs"] / 1000
    pages = []
    total_pixels = 0
    limit_reached = False
    read_failed = False
    with source.open("rb") as handle:
        is_pdf = handle.read(5) == b"%PDF-"

    def allowance(width, height, page_index):
        nonlocal total_pixels, limit_reached
        if page_index >= limits["maxPages"] or time.monotonic() >= deadline:
            limit_reached = True
            return None
        size = _fit_size(width, height, limits["maxPagePixels"])
        pixels = size[0] * size[1]
        if total_pixels + pixels > limits["maxTotalPixels"]:
            limit_reached = True
            return None
        total_pixels += pixels
        return size

    if is_pdf:
        import pypdfium2 as pdfium

        document = pdfium.PdfDocument(str(source))
        try:
            source_page_count = len(document)
            for index in range(source_page_count):
                if index >= limits["maxPages"] or time.monotonic() >= deadline:
                    limit_reached = True
                    break
                page = document[index]
                bitmap = None
                try:
                    point_width, point_height = page.get_size()
                    initial_scale = limits["dpi"] / 72
                    size = allowance(math.ceil(point_width * initial_scale), math.ceil(point_height * initial_scale), index)
                    if size is None:
                        break
                    # PDFium rounds up: subtract one output pixel in each axis
                    # to ensure its actual allocation cannot exceed the budget.
                    scale = min(initial_scale, max(1, size[0] - 1) / point_width, max(1, size[1] - 1) / point_height)
                    allocation = math.ceil(point_width * scale) * math.ceil(point_height * scale)
                    if allocation > limits["maxPagePixels"]:
                        limit_reached = True
                        break
                    bitmap = page.render(scale=scale)
                    image = bitmap.to_pil().convert("RGB")
                    pages.append(analyze_page(image, index + 1))
                    image.close()
                except Exception:
                    read_failed = True
                    pages.append({"page": index + 1, "staffCount": 0, "systemCount": 0, "maxStavesPerSystem": 0, "hasTab": False, "uncertain": True, "reasonCodes": ["PAGE_READ_FAILED"]})
                finally:
                    if bitmap is not None:
                        bitmap.close()
                    page.close()
        finally:
            document.close()
    else:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(source) as raw:
                if raw.format not in {"JPEG", "PNG", "WEBP", "TIFF", "BMP", "GIF"}:
                    raise ValueError("PREFLIGHT_INVALID_SOURCE")
                source_page_count = int(getattr(raw, "n_frames", 1))
                for index in range(source_page_count):
                    if index >= limits["maxPages"] or time.monotonic() >= deadline:
                        limit_reached = True
                        break
                    try:
                        raw.seek(index)
                        if raw.width * raw.height > MAX_SOURCE_RASTER_PIXELS:
                            limit_reached = True
                            break
                        size = allowance(raw.width, raw.height, index)
                        if size is None:
                            break
                        orientation = int(raw.getexif().get(274, 1))
                        # JPEG draft scales during decoding; other formats are
                        # bounded by the checked source-raster guard above.
                        if index == 0 and source_page_count == 1 and raw.format == "JPEG":
                            raw.draft("RGB", size)
                        image = ImageOps.exif_transpose(raw)
                        # The thumbnail box must follow EXIF width/height swaps;
                        # otherwise a portrait photograph loses resolution twice.
                        target_size = tuple(reversed(size)) if orientation in (5, 6, 7, 8) else size
                        image.thumbnail(target_size, Image.Resampling.LANCZOS)
                        if image.mode in ("RGBA", "LA") or "transparency" in image.info:
                            rgba = image.convert("RGBA")
                            background = Image.new("RGBA", rgba.size, "white")
                            background.alpha_composite(rgba)
                            image = background.convert("RGB")
                            background.close()
                            rgba.close()
                        else:
                            image = image.convert("RGB")
                        pages.append(analyze_page(image, index + 1, orientation))
                        image.close()
                    except Exception:
                        read_failed = True
                        pages.append({"page": index + 1, "staffCount": 0, "systemCount": 0, "maxStavesPerSystem": 0, "hasTab": False, "uncertain": True, "reasonCodes": ["PAGE_READ_FAILED"]})

    complete = len(pages) == source_page_count and not limit_reached and not read_failed
    reasons = list(dict.fromkeys(reason for page in pages for reason in page["reasonCodes"]))
    if limit_reached:
        reasons.append("ANALYSIS_LIMIT_REACHED")
    if read_failed and "PAGE_READ_FAILED" not in reasons:
        reasons.append("PAGE_READ_FAILED")
    if not complete or not pages or any(page["uncertain"] for page in pages):
        recommendation, confidence = "uncertain", "low"
    elif any(page["hasTab"] or page["maxStavesPerSystem"] >= 3 for page in pages):
        recommendation, confidence = "complex", "high"
    else:
        recommendation, confidence = "simple", "medium"
    return {
        "schemaVersion": 1,
        "recommendation": recommendation,
        "confidence": confidence,
        "sourcePageCount": source_page_count,
        "pagesAnalyzed": len(pages),
        "complete": complete,
        "reasonCodes": list(dict.fromkeys(reasons)),
        "pages": pages,
        "elapsedMs": round((time.monotonic() - started) * 1000),
    }


def main():
    parser = argparse.ArgumentParser(description="Local free staff-layout preview")
    parser.add_argument("--request", help="UTF-8 JSON request file; stdin when omitted")
    parser.add_argument("--response", help="UTF-8 JSON response file; stdout when omitted")
    arguments = parser.parse_args()
    try:
        if arguments.request:
            path = Path(arguments.request)
            if path.stat().st_size > 65_536:
                raise ValueError("PREFLIGHT_INVALID_REQUEST")
            request = json.loads(path.read_text(encoding="utf-8-sig"))
        else:
            encoded = sys.stdin.buffer.read(65_537)
            if len(encoded) > 65_536:
                raise ValueError("PREFLIGHT_INVALID_REQUEST")
            request = json.loads(encoded.decode("utf-8-sig"))
        result = json.dumps(preflight(request), ensure_ascii=False, separators=(",", ":"))
        if arguments.response:
            Path(arguments.response).write_text(result, encoding="utf-8")
        else:
            sys.stdout.write(result + "\n")
    except ImportError:
        print("PREFLIGHT_DEPENDENCY_UNAVAILABLE", file=sys.stderr)
        return 3
    except Exception as error:
        # No filesystem paths, source contents or parser traces in caller logs.
        code = str(error) if str(error) in {"PREFLIGHT_INVALID_REQUEST", "PREFLIGHT_INVALID_SOURCE"} else "PREFLIGHT_ANALYSIS_FAILED"
        print(code, file=sys.stderr)
        return 2 if code in {"PREFLIGHT_INVALID_REQUEST", "PREFLIGHT_INVALID_SOURCE"} else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
