"""Complex OMR image inventory and loss-preserving MusicXML assembly.

Layout/recognition imports the pinned upstream homr implementation instead of
reimplementing its neural model. See THIRD_PARTY.md for its AGPL provenance.
This adapter does not promote recognition to a verified score.
"""
from __future__ import annotations

import argparse
import copy
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def box(x0, y0, x1, y1):
    return {"x": round(x0), "y": round(y0), "width": max(1, round(x1 - x0)), "height": max(1, round(y1 - y0))}


def prepare(request):
    from PIL import Image, ImageOps
    output = Path(request["outputDir"])
    output.mkdir(parents=True, exist_ok=True)
    source = Path(request["inputPath"])
    page_limit = int(request.get("maxPagePixels", 12_000_000))
    total_limit = int(request.get("maxTotalPixels", 120_000_000))
    pages = []
    with source.open("rb") as handle:
        is_pdf = handle.read(5) == b"%PDF-"
    if is_pdf:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(str(source))
        total = 0
        try:
            # Plan all page budgets before creating the first bitmap. Use the
            # same equal-share policy as API admission; never omit tail pages.
            allocation_budget = min(page_limit, total_limit // max(1, len(pdf)))
            page_budget = math.floor(allocation_budget * .99)
            minimum_dpi = min(150, int(request.get("dpi", 300)))
            plans = request.get("renderPlan")
            for index in range(len(pdf)):
                page = pdf[index]
                width, height = page.get_size()
                low, high = minimum_dpi, int(request.get("dpi", 300))
                def pixel_count(dpi):
                    return math.ceil(width * dpi / 72) * math.ceil(height * dpi / 72)
                if pixel_count(low) > page_budget:
                    page.close()
                    raise ValueError("PDF cannot fit the raster budget at a useful reading resolution; split or crop it")
                while low < high:
                    middle = math.ceil((low + high) / 2)
                    if pixel_count(middle) <= page_budget:
                        low = middle
                    else:
                        high = middle - 1
                dpi = low
                if plans is not None:
                    admitted_dpi = plans[index].get("dpi") if index < len(plans) else None
                    if len(plans) != len(pdf) or plans[index].get("pageNumber") != index + 1 or not isinstance(admitted_dpi, int) or isinstance(admitted_dpi, bool) or not minimum_dpi <= admitted_dpi <= int(request.get("dpi", 300)) or pixel_count(admitted_dpi) > allocation_budget:
                        page.close()
                        raise ValueError("PDF renderer and admission plan disagree")
                    # Respect admission even if PDFium's float page coordinates
                    # differ by a fraction of a point from the metadata parser.
                    dpi = admitted_dpi
                scale = dpi / 72
                pixels = math.ceil(width * scale) * math.ceil(height * scale)
                total += pixels
                if pixels > page_limit or total > total_limit:
                    raise ValueError("PDF raster budget exceeded before allocating a page bitmap")
                bitmap = page.render(scale=scale)
                try:
                    image = bitmap.to_pil().convert("RGB")
                    filename = output / f"page-{index + 1:03}.png"
                    image.save(filename)
                    pages.append({"page": index + 1, "width": image.width, "height": image.height, "imagePath": str(filename), "renderDpi": dpi, "sourceWidthPoints": width, "sourceHeightPoints": height})
                    image.close()
                finally:
                    bitmap.close()
                    page.close()
        finally:
            pdf.close()
    else:
        with Image.open(source) as raw:
            if raw.width * raw.height > page_limit * 2:
                raise ValueError("Raster source exceeds the complex OMR input pixel budget")
            original_size = raw.size
            orientation = int(raw.getexif().get(274, 1))
            image = ImageOps.exif_transpose(raw).convert("RGBA")
            background = Image.new("RGBA", image.size, "white")
            background.alpha_composite(image)
            image = background.convert("RGB")
            if image.width * image.height > page_limit:
                ratio = math.sqrt(page_limit / (image.width * image.height))
                image = image.resize((int(image.width * ratio), int(image.height * ratio)), Image.Resampling.LANCZOS)
            filename = output / "page-001.png"
            image.save(filename)
            pages.append({"page": 1, "width": image.width, "height": image.height, "imagePath": str(filename), "sourceWidth": original_size[0], "sourceHeight": original_size[1], "exifOrientation": orientation})
    return {"pages": pages, "sourcePageCount": len(pages)}


def classical_staffs(image):
    """Independent line inventory, including 4/6-line TAB that homr excludes.

    These are detected regions, never ground truth. Long printed rules and
    difficult perspective are reported as uncertainty rather than discarded.
    """
    import cv2
    import numpy as np
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    ink = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 41, 13)
    line_map = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(35, image.shape[1] // 12), 1)))
    strengths = np.count_nonzero(line_map, axis=1)
    hits = np.where(strengths > image.shape[1] * .25)[0]
    runs = []
    for value in hits:
        if not runs or value > runs[-1][-1] + 2:
            runs.append([int(value)])
        else:
            runs[-1].append(int(value))
    rows = [sum(run) / len(run) for run in runs]
    candidates = []
    used = set()
    for count in (6, 5, 4):
        for start in range(len(rows) - count + 1):
            if any(index in used for index in range(start, start + count)):
                continue
            segment = rows[start:start + count]
            gaps = np.diff(segment)
            unit = float(np.median(gaps))
            # Five-line staffs need pixel rounding tolerance at small sizes.
            # Four/six-line TAB claims require stronger periodicity evidence.
            tolerance = max(2.0, unit * .22) if count == 5 else max(1.0, unit * .18)
            if unit < 3 or unit > image.shape[0] / 50 or max(abs(gaps - unit)) > tolerance:
                continue
            # A 5-line window inside six equally spaced lines is TAB, not staff.
            if count < 6 and ((start > 0 and abs(segment[0] - rows[start - 1] - unit) < unit * .2) or (start + count < len(rows) and abs(rows[start + count] - segment[-1] - unit) < unit * .2)):
                continue
            x_values = np.where(np.any(line_map[max(0, round(segment[0]) - 2):min(image.shape[0], round(segment[-1]) + 3)] > 0, axis=0))[0]
            if len(x_values) == 0:
                continue
            candidates.append({"bbox": box(int(x_values[0]), segment[0], int(x_values[-1]), segment[-1]), "lineCount": count, "kind": "tablature" if count in (4, 6) else "standard", "unit": unit, "detector": "line-inventory"})
            used.update(range(start, start + count))
    return sorted(candidates, key=lambda staff: staff["bbox"]["y"]), ink


def line_inventory(image):
    """Include a short final system occupying less than a quarter-page width.

    Overlapping windows keep the existing line detector's strict periodicity
    checks without mistaking a few ledger lines for an entire page-wide staff.
    """
    staffs, ink = classical_staffs(image)
    width = image.shape[1]
    for left, right in ((0, round(width * .65)), (round(width * .35), width)):
        additions, _ = classical_staffs(image[:, left:right])
        for candidate in additions:
            candidate = {**candidate, "bbox": {**candidate["bbox"], "x": candidate["bbox"]["x"] + left}}
            overlapping = next((old for old in staffs if abs(old["bbox"]["y"] - candidate["bbox"]["y"]) < min(old["unit"], candidate["unit"]) * 1.5), None)
            if overlapping:
                if overlapping["lineCount"] == candidate["lineCount"]:
                    x0 = min(overlapping["bbox"]["x"], candidate["bbox"]["x"])
                    x1 = max(overlapping["bbox"]["x"] + overlapping["bbox"]["width"], candidate["bbox"]["x"] + candidate["bbox"]["width"])
                    overlapping["bbox"] = {**overlapping["bbox"], "x": x0, "width": x1 - x0}
                else:
                    overlapping["inventoryUncertain"] = True
            else:
                staffs.append(candidate)
    return sorted(staffs, key=lambda staff: staff["bbox"]["y"]), ink


def local_tab_regions(image, ink):
    """Local line projections tolerate photographed staff-line perspective.

    A region must agree in two independent horizontal windows before it can
    override a homr five-line label. Six-line TAB is outside homr's model.
    """
    import cv2
    import numpy as np
    height, width = ink.shape
    horizontal = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(25, width // 80), 1)))
    proposals = []
    for window_index, start in enumerate((.17, .30, .48, .68, .82)):
        left, right = round(width * start), min(width, round(width * (start + .08)))
        scores = np.count_nonzero(horizontal[:, left:right], axis=1)
        hits = np.where(scores > (right - left) * .40)[0]
        runs = []
        for y in hits:
            if not runs or y > runs[-1][-1] + 2:
                runs.append([int(y)])
            else:
                runs[-1].append(int(y))
        rows = [sum(run) / len(run) for run in runs]
        for count in (6, 4):
            for index in range(len(rows) - count + 1):
                selected = rows[index:index + count]
                deltas = np.diff(selected)
                unit = float(np.median(deltas))
                if not (3 <= unit < height / 50) or max(abs(deltas - unit)) > max(1.0, unit * .18):
                    continue
                if (index and abs(selected[0] - rows[index - 1] - unit) < unit * .25) or (index + count < len(rows) and abs(rows[index + count] - selected[-1] - unit) < unit * .25):
                    continue
                center = (selected[0] + selected[-1]) / 2
                prior = next((item for item in proposals if item["lineCount"] == count and abs(item["center"] - center) < unit * .6), None)
                if prior:
                    prior["windows"].add(window_index)
                    prior["minY"] = min(prior["minY"], selected[0])
                    prior["maxY"] = max(prior["maxY"], selected[-1])
                else:
                    proposals.append({"lineCount": count, "center": center, "unit": unit, "minY": selected[0], "maxY": selected[-1], "windows": {window_index}})
    return [item for item in proposals if len(item["windows"]) >= 3]


def homr_config():
    from homr.main import ProcessingConfig
    return ProcessingConfig(enable_debug=False, enable_cache=True, write_staff_positions=False, read_staff_positions=False, selected_staff=-1, transformer_use_gpu=False, segnet_use_gpu=False, coreml_encoder=False, title_detection=False)


def import_homr(request):
    source = Path(request["homrSourceDir"]).resolve()
    if not (source / "homr" / "main.py").is_file():
        raise ValueError("The pinned homr source directory is missing")
    from provision_complex_omr import verify_source
    verify_source(source)
    sys.path.insert(0, str(source))


def read_group_labels(image, groups):
    """Read instrument labels in the retained original left margin only.

    Provisioned RapidOCR model paths are supplied explicitly, so a paid job
    cannot trigger model downloads. Unclear labels stay unassigned.
    """
    import importlib.util
    spec = importlib.util.find_spec("rapidocr")
    if not spec or not spec.origin:
        return False
    model_dir = Path(spec.origin).parent / "models"
    models = (model_dir / "PP-OCRv6_det_small.onnx", model_dir / "ch_ppocr_mobile_v2.0_cls_mobile.onnx", model_dir / "PP-OCRv6_rec_small.onnx")
    if not all(model.is_file() for model in models):
        return False
    from rapidocr import RapidOCR
    reader = RapidOCR(params={"Det.model_path": str(models[0]), "Cls.model_path": str(models[1]), "Rec.model_path": str(models[2])})
    for group in groups:
        members = group["members"]
        left_limit = max(1, min(member["bbox"]["x"] for member in members) - 15)
        area = group["bbox"]
        region = image[max(0, area["y"]):min(image.shape[0], area["y"] + area["height"]), :left_limit]
        if region.size == 0:
            continue
        recognized = reader(region)
        if recognized is None or recognized.txts is None:
            continue
        choices = []
        for index, text in enumerate(recognized.txts):
            confidence = float(recognized.scores[index]) if recognized.scores is not None else 0
            normalized = re.sub(r"[^a-z0-9]", "", text.casefold())
            if confidence >= .7 and len(normalized) >= 2 and any(character.isalpha() for character in normalized):
                choices.append((confidence, text.strip(), normalized))
        if choices:
            confidence, name, normalized = max(choices)
            group["name"] = name
            group["labelConfidence"] = confidence
            group["role"] = "percussion" if normalized in ("dr", "drum", "drums", "perc", "percussion") else "pitched"
            if group["role"] == "percussion":
                for staff in members:
                    if staff["kind"] != "tablature":
                        staff["kind"] = "percussion"
    return True


def inventory(request):
    import cv2
    import numpy as np
    image = cv2.imread(request["imagePath"])
    if image is None:
        raise ValueError("Cannot read normalized page image")
    staffs, ink = line_inventory(image)
    warnings = ["Staff line count is ambiguous; compare the source before confirming" for staff in staffs if staff.get("inventoryUncertain")]
    homr_count = 0
    left_clefs, right_clefs = 0, 0
    homr_error = None
    try:
        if request.get("lineOnly"):
            raise ValueError("Detailed layout models were unavailable; independent staff lines require manual review")
        import_homr(request)
        from homr.main import detect_staffs_in_image
        multis, _, debug, title, homr_count, mapping = detect_staffs_in_image(request["imagePath"], homr_config())
        seen = set()
        for multi_index, multi in enumerate(multis):
            for staff in multi.staffs:
                for clef in staff.get_clefs():
                    x, _ = mapping(clef.center)
                    left_x, _ = mapping((staff.min_x, staff.min_y))
                    right_x, _ = mapping((staff.max_x, staff.max_y))
                    if x < left_x + (right_x - left_x) * .20:
                        left_clefs += 1
                    elif x > left_x + (right_x - left_x) * .80:
                        right_clefs += 1
                # Homr merges two staffs into one Staff grid; split all physical 5-line groups.
                points = staff.grid
                number = len(points[0].y) // 5
                for group_index in range(number):
                    coordinates = [mapping((point.x, y)) for point in points for y in point.y[group_index * 5:(group_index + 1) * 5]]
                    x0, y0 = min(x for x, _ in coordinates), min(y for _, y in coordinates)
                    x1, y1 = max(x for x, _ in coordinates), max(y for _, y in coordinates)
                    proposed = {"bbox": box(x0, y0, x1, y1), "lineCount": 5, "kind": "standard", "unit": (y1 - y0) / 4, "detector": "homr", "homrGroup": multi_index}
                    signature = (round(y0 / 5), round(y1 / 5))
                    if signature in seen:
                        continue
                    seen.add(signature)
                    overlapping = [item for item in staffs if abs(item["bbox"]["y"] + item["bbox"]["height"] / 2 - (y0 + y1) / 2) < max(item["unit"], proposed["unit"]) * 2.2]
                    if overlapping:
                        for item in overlapping:
                            if item["kind"] != "tablature":
                                item["homrGroup"] = multi_index
                                item["detector"] = "homr+line-inventory"
                    else:
                        staffs.append(proposed)
        title.cancel()
        debug.clean_debug_files_from_previous_runs()
    except Exception as error:
        homr_error = str(error)[-2000:]
        warnings.append("homr layout detection failed; independent line regions require manual verification")
    staffs.sort(key=lambda staff: staff["bbox"]["y"])
    for tab in local_tab_regions(image, ink):
        existing = min(staffs, key=lambda staff: abs(staff["bbox"]["y"] + staff["bbox"]["height"] / 2 - tab["center"]), default=None)
        if existing and abs(existing["bbox"]["y"] + existing["bbox"]["height"] / 2 - tab["center"]) < tab["unit"] * 3:
            # Short ledger lines and note beams must never overwrite a complete
            # independent five-line staff. Local perspective evidence is weaker.
            if existing["lineCount"] == 5 and "line-inventory" in existing["detector"]:
                continue
            existing["kind"] = "tablature"
            existing["lineCount"] = tab["lineCount"]
            existing["detector"] += "+local-tab-lines"
            prior = existing["bbox"]
            existing["bbox"] = box(prior["x"], min(prior["y"], tab["minY"]), prior["x"] + prior["width"], max(prior["y"] + prior["height"], tab["maxY"]))
    page = int(request["page"])
    if not staffs:
        return {"page": page, "width": image.shape[1], "height": image.shape[0], "imagePath": request["imagePath"], "staffs": [], "systems": [], "warnings": ["No staff regions detected; blank page or failed layout cannot be distinguished automatically"], "homrError": homr_error}
    # Join staffs into systems using both inter-staff gaps and printed vertical connections.
    unit = float(np.median([staff["unit"] for staff in staffs]))
    gaps = [staffs[i]["bbox"]["y"] - (staffs[i - 1]["bbox"]["y"] + staffs[i - 1]["bbox"]["height"]) for i in range(1, len(staffs))]
    typical_gap = float(np.median(gaps)) if gaps else 0
    systems = []
    current = []
    for index, staff in enumerate(staffs):
        staff["id"] = f"p{page}-staff{index + 1}"
        if current:
            prior = current[-1]
            y0 = prior["bbox"]["y"] + prior["bbox"]["height"]
            y1 = staff["bbox"]["y"]
            left = max(0, min(prior["bbox"]["x"], staff["bbox"]["x"]) - round(unit * 3))
            right = min(image.shape[1], left + round(unit * 12))
            corridor = ink[max(0, y0):min(image.shape[0], y1), left:right]
            connected = corridor.size > 0 and np.any(np.mean(corridor > 0, axis=0) > .8)
            split = not connected and y1 - y0 > 8 * unit
            if split:
                systems.append(current)
                current = []
        current.append(staff)
    if current:
        systems.append(current)
    result_systems = []
    for index, members in enumerate(systems):
        system_id = f"p{page}-system{index + 1}"
        first_y = members[0]["bbox"]["y"]
        last_y = members[-1]["bbox"]["y"] + members[-1]["bbox"]["height"]
        prior_end = systems[index - 1][-1]["bbox"]["y"] + systems[index - 1][-1]["bbox"]["height"] if index else 0
        next_start = systems[index + 1][0]["bbox"]["y"] if index + 1 < len(systems) else image.shape[0]
        # Keep the original left margin, all clefs/braces/labels, and bounded ledger/lyric margins.
        top = max(prior_end + (first_y - prior_end) / 2 if index else 0, first_y - 7 * unit)
        bottom = min(last_y + 7 * unit, last_y + (next_start - last_y) / 2 if index + 1 < len(systems) else image.shape[0])
        system_box = box(0, max(0, top), image.shape[1], min(image.shape[0], bottom))
        groups = []
        for member in members:
            member["page"] = page
            member["systemId"] = system_id
            same_grand = groups and member.get("homrGroup") is not None and all(other.get("homrGroup") == member["homrGroup"] for other in groups[-1]["_members"])
            adjacent_tab = groups and member["kind"] == "tablature" and member["bbox"]["y"] - (groups[-1]["_members"][-1]["bbox"]["y"] + groups[-1]["_members"][-1]["bbox"]["height"]) < 9 * member["unit"]
            # Only merge at most a grand-staff pair; homr groups can also mean an entire system.
            if groups and ((same_grand and len(groups[-1]["_members"]) == 1 and len(members) <= 2) or adjacent_tab):
                groups[-1]["_members"].append(member)
            else:
                groups.append({"_members": [member]})
        for group_index, group in enumerate(groups):
            group_members = group.pop("_members")
            group.update({"id": f"{system_id}-group{group_index + 1}", "ordinal": group_index, "staffIds": [item["id"] for item in group_members], "bbox": box(0, max(system_box["y"], group_members[0]["bbox"]["y"] - 6 * unit), image.shape[1], min(system_box["y"] + system_box["height"], group_members[-1]["bbox"]["y"] + group_members[-1]["bbox"]["height"] + 6 * unit))})
            for member in group_members:
                member["instrumentGroupId"] = group["id"]
            group["members"] = group_members
        try:
            if request.get("lineOnly"):
                warnings.append(f"{system_id}: instrument identities require manual verification")
            elif not read_group_labels(image, groups):
                warnings.append(f"{system_id}: instrument label OCR models were not provisioned; identity requires review")
        except Exception as error:
            warnings.append(f"{system_id}: instrument labels could not be verified: {str(error)[:200]}")
        for group in groups:
            group.pop("members")
        # Long connections through inter-staff gaps distinguish barlines from note stems.
        # Single-staff measures need another detector; no bar count is invented there.
        bar_positions = []
        top_y, bottom_y = members[0]["bbox"]["y"], members[-1]["bbox"]["y"] + members[-1]["bbox"]["height"]
        if len(members) > 1:
            region = ink[max(0, top_y):min(image.shape[0], bottom_y + 1)]
            lines = cv2.HoughLinesP(region, 1, np.pi / 1800, threshold=70, minLineLength=max(40, round((bottom_y - top_y) * .60)), maxLineGap=max(5, round(unit * 2)))
            staff_left = min(item["bbox"]["x"] for item in members)
            staff_right = max(item["bbox"]["x"] + item["bbox"]["width"] for item in members)
            if lines is not None:
                for values in np.asarray(lines).reshape(-1, 4):
                    x0, y0, x1, y1 = map(int, values)
                    if abs(x1 - x0) > abs(y1 - y0) * .08:
                        continue
                    x = (x0 + x1) / 2
                    if x < staff_left - 3 * unit or x > staff_right + 2 * unit:
                        continue
                    if all(abs(x - previous) > 2 * unit for previous in bar_positions):
                        bar_positions.append(round(x))
        bar_positions.sort()
        result_systems.append({"id": system_id, "bbox": system_box, "staffIds": [member["id"] for member in members], "groups": groups, "barlinePositions": bar_positions, "expectedMeasureCount": max(1, len(bar_positions) - 1) if len(bar_positions) >= 2 else None})
        if len(bar_positions) < 2:
            warnings.append(f"{system_id}: original measure boundaries were not independently verified")
    if len(systems) == 1 and len(staffs) > 10:
        warnings.append("Dense layout system boundaries require manual verification")
    return {"page": page, "width": image.shape[1], "height": image.shape[0], "imagePath": request["imagePath"], "staffs": staffs, "systems": result_systems, "warnings": warnings, "homrStaffCount": homr_count, "homrError": homr_error, "directionEvidence": {"leftClefCount": left_clefs, "rightClefCount": right_clefs}}


def compose_affine(first, second):
    """Return second(first(point)) for six-element 2D affine transforms."""
    a, b, c, d, e, f = first
    g, h, i, j, k, l = second
    return [g * a + h * d, g * b + h * e, g * c + h * f + i, j * a + k * d, j * b + k * e, j * c + k * f + l]


def inverse_affine(matrix):
    a, b, c, d, e, f = matrix
    determinant = a * e - b * d
    return [e / determinant, -b / determinant, (b * f - e * c) / determinant, -d / determinant, a / determinant, (d * c - a * f) / determinant]


def orient(request):
    """Score 0/90/180/270 using independent lines and homr/label direction.

    Horizontal line counts determine the axis only. Clefs/left-margin labels
    distinguish 0 from 180; ties remain an explicit orientation uncertainty.
    """
    import cv2
    image = cv2.imread(request["imagePath"])
    if image is None:
        raise ValueError("Cannot read page for orientation selection")
    rotations = {0: image, 90: cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE), 180: cv2.rotate(image, cv2.ROTATE_180), 270: cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)}
    line_scores = {}
    for angle, candidate in rotations.items():
        detected, ink = classical_staffs(candidate)
        line_scores[angle] = len(detected) + len(local_tab_regions(candidate, ink))
    axis = 0 if line_scores[0] + line_scores[180] >= line_scores[90] + line_scores[270] else 90
    selected_angles = [axis, (axis + 180) % 360] if max(line_scores.values()) > 0 else [0, 90, 180, 270]
    candidates = []
    for angle in selected_angles:
        candidate_path = Path(request["imagePath"]).parent / f"p{request['page']}-orientation-{angle}.png"
        cv2.imwrite(str(candidate_path), rotations[angle])
        detected = inventory({**request, "imagePath": str(candidate_path)})
        labels = [group for system in detected["systems"] for group in system["groups"] if group.get("labelConfidence", 0) >= .7]
        evidence = detected.get("directionEvidence", {})
        score = len(detected["staffs"]) * 2 + evidence.get("leftClefCount", 0) * 12 - evidence.get("rightClefCount", 0) * 12 + sum(group["labelConfidence"] for group in labels) * 10
        if detected.get("homrError"):
            score -= 20
        candidates.append((score, angle, detected))
    candidates.sort(key=lambda item: item[0], reverse=True)
    score, angle, chosen = candidates[0]
    if score <= 0 or (len(candidates) > 1 and abs(score - candidates[1][0]) < max(5, abs(score) * .05)):
        chosen["warnings"].append("Page orientation is ambiguous; original source must be checked")
    final_path = Path(request["imagePath"]).parent / f"page-{request['page']:03}-upright.png"
    cv2.imwrite(str(final_path), rotations[angle])
    chosen["imagePath"] = str(final_path)
    source_width = request.get("sourceWidth", request["width"])
    source_height = request.get("sourceHeight", request["height"])
    exif = int(request.get("exifOrientation", 1))
    transforms = {
        1: [1, 0, 0, 0, 1, 0], 2: [-1, 0, source_width - 1, 0, 1, 0],
        3: [-1, 0, source_width - 1, 0, -1, source_height - 1], 4: [1, 0, 0, 0, -1, source_height - 1],
        5: [0, 1, 0, 1, 0, 0], 6: [0, -1, source_height - 1, 1, 0, 0],
        7: [0, -1, source_height - 1, -1, 0, source_width - 1], 8: [0, 1, 0, -1, 0, source_width - 1],
    }
    oriented_width, oriented_height = (source_height, source_width) if exif in (5, 6, 7, 8) else (source_width, source_height)
    source_to_image = compose_affine(transforms.get(exif, transforms[1]), [request["width"] / oriented_width, 0, 0, 0, request["height"] / oriented_height, 0])
    width, height = request["width"], request["height"]
    rotate_affine = {0: [1, 0, 0, 0, 1, 0], 90: [0, -1, height - 1, 1, 0, 0], 180: [-1, 0, width - 1, 0, -1, height - 1], 270: [0, 1, 0, -1, 0, width - 1]}[angle]
    source_to_image = compose_affine(source_to_image, rotate_affine)
    chosen["sourceTransform"] = {"rotationDegrees": angle, "exifOrientation": exif, "sourceWidth": source_width, "sourceHeight": source_height, "sourceToImage": source_to_image, "imageToSource": inverse_affine(source_to_image)}
    chosen["orientationCandidates"] = [{"rotationDegrees": candidate_angle, "score": candidate_score, "staffCount": len(candidate["staffs"]), "homrError": candidate.get("homrError")} for candidate_score, candidate_angle, candidate in candidates]
    return chosen


def crop(request):
    from PIL import Image, ImageDraw
    area = request["bbox"]
    with Image.open(request["imagePath"]) as image:
        bounds = (max(0, area["x"]), max(0, area["y"]), min(image.width, area["x"] + area["width"]), min(image.height, area["y"] + area["height"]))
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            raise ValueError("Invalid score-region crop")
        region = image.crop(bounds).convert("RGB")
        draw = ImageDraw.Draw(region)
        for mask in request.get("maskRegions", []):
            draw.rectangle((mask["x"] - bounds[0], mask["y"] - bounds[1], mask["x"] + mask["width"] - bounds[0], mask["y"] + mask["height"] - bounds[1]), fill="white")
        region.save(request["outputPath"])
    return {"imagePath": request["outputPath"], "crop": area}


def recognize(request):
    import_homr(request)
    from homr.main import process_image
    from homr.music_xml_generator import XmlGeneratorArguments
    # Models must be prepared during provisioning. Do not download in a paid job.
    from homr.segmentation.config import segnet_path_onnx
    from homr.transformer.configs import default_config
    for model in (segnet_path_onnx, default_config.filepaths.encoder_path, default_config.filepaths.decoder_path):
        if not Path(model).is_file():
            raise ValueError(f"HOMR_MODEL_MISSING: {Path(model).name}; provision homr --init --no-title --gpu no")
    output = process_image(request["imagePath"], homr_config(), XmlGeneratorArguments())
    return {"musicXmlPath": output, "analysis": analyze_xml(Path(output).read_text(encoding="utf-8"))}


def parse_xml(xml):
    if len(xml.encode("utf-8")) > 20 * 1024 * 1024 or "<!ENTITY" in xml.upper():
        raise ValueError("Unsafe or oversized MusicXML")
    root = ET.fromstring(xml, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
    if root.tag != "score-partwise":
        raise ValueError("Complex assembly currently requires score-partwise MusicXML")
    return root


def fraction_text(node, name, fallback=0):
    value = node.findtext(name)
    try:
        return Fraction(value) if value is not None else Fraction(fallback)
    except (ValueError, ZeroDivisionError):
        return Fraction(fallback)


def analyze_xml(xml):
    root = parse_xml(xml)
    descriptors = {part.get("id"): part for part in root.findall("part-list/score-part")}
    summaries = []
    all_issues = []
    for part in root.findall("part"):
        identifier = part.get("id", "")
        descriptor = descriptors.get(identifier, ET.Element("score-part"))
        division, beats, beat_type, staves = Fraction(1), Fraction(4), Fraction(4), 1
        clefs = {}
        transposition = ""
        system_index = 0
        systems = [0]
        issues = []
        measure_lengths = []
        for index, measure in enumerate(part.findall("measure")):
            if index and any(node.get("new-system") == "yes" or node.get("new-page") == "yes" for node in measure.findall("print")):
                systems.append(0)
                system_index += 1
            systems[system_index] += 1
            attrs = measure.find("attributes")
            if attrs is not None:
                division = fraction_text(attrs, "divisions", division)
                beats = sum((Fraction(value) for node in attrs.findall("time/beats") for value in (node.text or "4").split("+")), Fraction(0)) if attrs.find("time/beats") is not None else beats
                beat_type = fraction_text(attrs, "time/beat-type", beat_type)
                staves = max(staves, int(attrs.findtext("staves", str(staves))))
                for clef in attrs.findall("clef"):
                    clefs[int(clef.get("number", "1"))] = f"{clef.findtext('sign', '')}:{clef.findtext('line', '')}:{clef.findtext('clef-octave-change', '')}"
                transpose = attrs.find("transpose")
                if transpose is not None:
                    transposition = ET.tostring(transpose, encoding="unicode")
            if division <= 0 or beat_type <= 0:
                issues.append({"kind": "duration-mismatch", "partId": identifier, "measure": index + 1, "message": "Invalid divisions or time signature"})
                continue
            expected = beats * 4 / beat_type
            cursor = Fraction(0)
            longest = Fraction(0)
            note_count = 0
            for node in measure:
                if node.tag == "backup":
                    cursor -= fraction_text(node, "duration") / division
                    if cursor < 0:
                        issues.append({"kind": "duration-mismatch", "partId": identifier, "measure": index + 1, "message": "Backup precedes the measure start"})
                elif node.tag == "forward":
                    cursor += fraction_text(node, "duration") / division
                    longest = max(longest, cursor)
                elif node.tag == "note":
                    if node.find("grace") is not None:
                        continue
                    note_count += 1
                    rest = node.find("rest")
                    duration = fraction_text(node, "duration", expected * division if rest is not None and rest.get("measure") == "yes" else 0) / division
                    if duration <= 0:
                        issues.append({"kind": "duration-mismatch", "partId": identifier, "measure": index + 1, "message": "Non-grace event has no positive duration"})
                    if node.find("chord") is None:
                        cursor += duration
                        longest = max(longest, cursor)
            measure_lengths.append(float(longest))
            if note_count == 0:
                issues.append({"kind": "empty-unresolved-measure", "partId": identifier, "measure": index + 1, "message": "No notes or explicit rests; do not infer silence"})
            if longest > expected or (longest < expected and measure.get("implicit") != "yes" and note_count > 0):
                issues.append({"kind": "duration-mismatch", "partId": identifier, "measure": index + 1, "message": f"Measure spans {longest} quarter notes, expected {expected}"})
        midi = descriptor.find("midi-instrument")
        summaries.append({"id": identifier, "name": descriptor.findtext("part-name", ""), "abbreviation": descriptor.findtext("part-abbreviation", ""), "staffCount": staves, "clefs": clefs, "transposition": transposition, "midiProgram": midi.findtext("midi-program", "") if midi is not None else "", "midiChannel": midi.findtext("midi-channel", "") if midi is not None else "", "measureCount": len(part.findall("measure")), "systemMeasureCounts": systems, "measureLengths": measure_lengths, "hasTabTechnical": bool(part.findall(".//technical/string")), "issues": issues})
        all_issues.extend(issues)
    counts = {part["measureCount"] for part in summaries}
    if len(counts) > 1:
        all_issues.append({"kind": "measure-count", "message": "Parts have different measure counts; synchronization is incomplete"})
    return {"parts": summaries, "partCount": len(summaries), "physicalStaffCount": sum(part["staffCount"] for part in summaries), "systemCount": max((len(part["systemMeasureCounts"]) for part in summaries), default=0), "measureCount": max(counts, default=0), "issues": all_issues, "movementTitle": root.findtext("movement-title", "")}


def analyze(request):
    return analyze_xml(Path(request["musicXmlPath"]).read_text(encoding="utf-8"))


def annotate(request):
    """Apply source label evidence without guessing a drum sound mapping."""
    output = Path(request["musicXmlPath"])
    root = parse_xml(output.read_text(encoding="utf-8"))
    parts = root.findall("part")
    labels = request["labels"]
    descriptors = root.findall("part-list/score-part")
    if len(parts) != len(labels) or len(descriptors) != len(parts):
        raise ValueError("Source label assignment does not match the recognized part layout")
    warnings = []
    for descriptor, part, label in zip(descriptors, parts, labels):
        if not label.get("name") or label.get("labelConfidence", 0) < .7:
            continue
        for tag in ("part-name", "part-abbreviation"):
            node = descriptor.find(tag)
            if node is None:
                node = ET.Element(tag)
                if tag == "part-name":
                    descriptor.insert(0, node)
                else:
                    name_nodes = [item for item in descriptor if item.tag in ("part-name", "part-name-display")]
                    descriptor.insert(len(name_nodes), node)
            node.text = label["name"]
        if label.get("role") != "percussion":
            continue
        fallback_pitch = bool(part.findall(".//note/pitch"))
        missing_mapping = fallback_pitch or not bool(descriptor.findall("midi-instrument/midi-unpitched"))
        # Preserve graphical positions, convert pitched fallback interpretation to
        # unpitched notation, and leave sound mapping absent rather than inventing it.
        clefs = {1: ("G", 2)}
        for measure in part.findall("measure"):
            attributes = measure.find("attributes")
            if attributes is not None:
                for clef in attributes.findall("clef"):
                    staff_no = int(clef.get("number", "1"))
                    clefs[staff_no] = (clef.findtext("sign", "G"), int(clef.findtext("line", "2")))
                    clef.clear()
                    if staff_no != 1:
                        clef.set("number", str(staff_no))
                    ET.SubElement(clef, "sign").text = "percussion"
                for key in attributes.findall("key"):
                    attributes.remove(key)
            for note in measure.findall("note"):
                pitch = note.find("pitch")
                if pitch is None:
                    continue
                step = pitch.findtext("step", "C")
                octave = int(pitch.findtext("octave", "4"))
                sign, line = clefs.get(int(note.findtext("staff", "1")), ("G", 2))
                # Convert source clef's bottom line to the G-clef display reference E4.
                clef_anchor = {"G": (4, "G"), "F": (3, "F"), "C": (4, "C")}.get(sign, (4, "G"))
                bottom = clef_anchor[0] * 7 + "CDEFGAB".index(clef_anchor[1]) - 2 * (line - 1)
                display_index = octave * 7 + "CDEFGAB".index(step) + (4 * 7 + 2 - bottom)
                display_octave, display_step = divmod(display_index, 7)
                position = list(note).index(pitch)
                note.remove(pitch)
                unpitched = ET.Element("unpitched")
                ET.SubElement(unpitched, "display-step").text = "CDEFGAB"[display_step]
                ET.SubElement(unpitched, "display-octave").text = str(display_octave)
                note.insert(position, unpitched)
                for accidental in note.findall("accidental"):
                    note.remove(accidental)
        for midi in descriptor.findall("midi-instrument"):
            channel = midi.find("midi-channel")
            if channel is None:
                channel = ET.SubElement(midi, "midi-channel")
            channel.text = "10"
            if fallback_pitch:
                for node in midi.findall("midi-program") + midi.findall("midi-unpitched"):
                    midi.remove(node)
        if missing_mapping:
            warnings.append({"kind": "percussion-unmapped", "message": f"{label['name']}: percussion notation retained; drum sound assignments require explicit review"})
    ET.ElementTree(root).write(output, encoding="utf-8", xml_declaration=True)
    return {"musicXmlPath": str(output), "analysis": analyze_xml(output.read_text(encoding="utf-8")), "issues": warnings}


def normalized_name(value):
    return re.sub(r"[\s._\-]+", "", value).casefold()


def normalize_xml(root):
    """Repair element order without changing pitches, and flag unusable bars.

    Some upstream homr exports put voice after type or alter after octave.
    Invalid divisions cannot be inferred: keep the raw region in evidence and
    replace its unusable timing with an explicit unresolved synchronization bar.
    """
    orders = {
        "pitch": "step alter octave",
        "unpitched": "display-step display-octave",
        "attributes": "footnote level divisions key time staves part-symbol instruments clef staff-details transpose for-part directive measure-style",
        "note": "grace cue chord pitch unpitched rest duration tie instrument footnote level voice type dot accidental time-modification stem notehead notehead-text staff beam notations lyric play listen",
        "midi-instrument": "midi-channel midi-name midi-bank midi-program midi-unpitched volume pan elevation",
    }
    issues = []
    for part in root.findall("part"):
        division = Fraction(1)
        beats, beat_type = Fraction(4), Fraction(4)
        for index, measure in enumerate(part.findall("measure")):
            attributes = measure.find("attributes")
            if attributes is not None:
                division = fraction_text(attributes, "divisions", division)
                if attributes.find("time/beats") is not None:
                    beats = sum((Fraction(value) for node in attributes.findall("time/beats") for value in (node.text or "4").split("+")), Fraction(0))
                beat_type = fraction_text(attributes, "time/beat-type", beat_type)
            invalid_timing = division <= 0 or beat_type <= 0
            expected = beats * 4 / beat_type if beat_type > 0 and beats > 0 else Fraction(4)
            for note in measure.findall("note"):
                if note.find("grace") is not None:
                    continue
                duration = note.find("duration")
                rest = note.find("rest")
                if duration is None and rest is not None and rest.get("measure") == "yes" and division > 0:
                    duration = ET.Element("duration")
                    duration.text = str(expected * division)
                    note.append(duration)
                elif fraction_text(note, "duration") <= 0:
                    invalid_timing = True
            if invalid_timing:
                if attributes is None:
                    attributes = ET.Element("attributes")
                    measure.insert(0, attributes)
                divisions = attributes.find("divisions")
                if divisions is None:
                    divisions = ET.SubElement(attributes, "divisions")
                divisions.text = "480"
                for node in list(measure):
                    if node.tag in ("note", "backup", "forward"):
                        measure.remove(node)
                direction = ET.SubElement(measure, "direction")
                ET.SubElement(ET.SubElement(direction, "direction-type"), "words").text = "Unrecognized source timing; review the original region"
                ET.SubElement(ET.SubElement(measure, "forward"), "duration").text = str(max(1, round(expected * 480)))
                measure.set("implicit", "yes")
                issues.append({"kind": "invalid-source-timing", "partId": part.get("id"), "measure": index + 1, "message": "Nonpositive divisions/duration prevented musical timing interpretation. This bar is an unresolved silent synchronization placeholder; raw recognition remains in evidence."})
    for node in root.iter():
        if node.tag == "direction":
            node.attrib.pop("print-object", None)  # Not allowed on MusicXML direction.
        if node.tag not in orders:
            continue
        order = {tag: index for index, tag in enumerate(orders[node.tag].split())}
        node[:] = sorted(list(node), key=lambda child: order.get(child.tag, -1 if child.tag is ET.Comment else len(order)))
    return issues


def merge(request):
    """Join sequential segments and simultaneous instrument-group segments.

    Names alone never combine duplicated instruments. Stable layout positions
    are used only for identical layouts, and this inference is explicitly
    recorded. Missing material produces a flagged silent forward, not a fake
    rest, note, or a claim of complete recognition.
    """
    chunks = sorted(request["chunks"], key=lambda chunk: (chunk["page"], chunk["systemOrder"], chunk.get("groupOrdinal", -1)))
    if not chunks:
        raise ValueError("No recognized regions are available for a candidate")
    sequences = {}
    parsed = []
    movements = set()
    normalization_issues = []
    for chunk in chunks:
        root = parse_xml(Path(chunk["musicXmlPath"]).read_text(encoding="utf-8"))
        normalization_issues.extend({**issue, "page": chunk["page"], "systemId": chunk.get("systemId"), "_sourceXmlPath": chunk["musicXmlPath"]} for issue in normalize_xml(root))
        facts = analyze_xml(ET.tostring(root, encoding="unicode"))
        if facts["movementTitle"]:
            movements.add(facts["movementTitle"])
        key = (chunk["page"], chunk["systemOrder"])
        parsed.append((chunk, root, facts))
        sequences.setdefault(key, []).append((chunk, root, facts))
    if len(movements) > 1:
        raise ValueError("MOVEMENT_AMBIGUOUS: different named movements must remain separate documents")
    merged = ET.Element("score-partwise", version=parsed[0][1].get("version", "4.0"))
    for node in parsed[0][1]:
        if node.tag not in ("part", "part-list"):
            merged.append(copy.deepcopy(node))
    identification = merged.find("identification")
    if identification is None:
        identification = ET.Element("identification")
        preceding = [node for node in merged if node.tag in ("work", "movement-number", "movement-title")]
        merged.insert(len(preceding), identification)
    miscellaneous = identification.find("miscellaneous")
    if miscellaneous is None:
        miscellaneous = ET.SubElement(identification, "miscellaneous")
    ET.SubElement(miscellaneous, "miscellaneous-field", name="recognition-status").text = "candidate-review-required"
    part_list = ET.SubElement(merged, "part-list")
    tracks = []
    slots = []
    issues = normalization_issues
    last_layout = None
    for (page, system_order), segment_chunks in sequences.items():
        entries = []
        for chunk, root, facts in segment_chunks:
            descriptor_map = {item.get("id"): item for item in root.findall("part-list/score-part")}
            for position, part in enumerate(root.findall("part")):
                fact = facts["parts"][position]
                ordinal = int(chunk.get("groupOrdinal", 0)) + position if chunk.get("scope") == "instrument-group" else position
                name = normalized_name(fact["name"])
                generic = not name or bool(re.fullmatch(r"(?:part|voice|staff|p)\d*", name))
                fingerprint = (fact["staffCount"], tuple(sorted(fact["clefs"].items())), fact["transposition"], fact["midiProgram"])
                trusted = normalized_name(chunk.get("trustedPartNames", {}).get(part.get("id"), ""))
                entries.append({"part": part, "descriptor": descriptor_map.get(part.get("id"), ET.Element("score-part")), "fact": fact, "name": name, "generic": generic, "ordinal": ordinal, "fingerprint": fingerprint, "chunk": chunk, "sourceRoot": root, "trusted": trusted})
        layout = tuple((entry["name"], entry["fingerprint"]) for entry in entries)
        names = [entry["name"] for entry in entries if not entry["generic"]]
        used_tracks = set()
        segment_parts = {}
        segment_count = max((entry["fact"]["measureCount"] for entry in entries), default=0)
        for entry in entries:
            matching = [track for track in tracks if track["name"] == entry["name"] and (track["fingerprint"] == entry["fingerprint"] or (entry["trusted"] and entry["trusted"] == track.get("trusted") and track["fingerprint"][0] == entry["fingerprint"][0])) and track["id"] not in used_tracks]
            unique_name = not entry["generic"] and names.count(entry["name"]) == 1 and len(matching) == 1
            if unique_name:
                track = matching[0]
            elif last_layout == layout:
                positional = [track for track in matching if track["ordinal"] == entry["ordinal"]]
                track = positional[0] if len(positional) == 1 else None
                if track is not None:
                    issues.append({"kind": "identity-ambiguous", "page": page, "systemId": entry["chunk"].get("systemId"), "partId": track["id"], "message": "Instrument continuity inferred from unchanged layout; labels are duplicated or generic"})
            else:
                track = None
            if track is None:
                identifier = f"P{len(tracks) + 1}"
                track = {"id": identifier, "name": entry["name"], "fingerprint": entry["fingerprint"], "ordinal": entry["ordinal"], "descriptor": entry["descriptor"], "originalId": entry["part"].get("id", ""), "sourceRoot": entry["sourceRoot"], "trusted": entry["trusted"], "xml": ET.Element("part", id=identifier)}
                tracks.append(track)
                if slots and matching:
                    issues.append({"kind": "identity-ambiguous", "page": page, "systemId": entry["chunk"].get("systemId"), "partId": identifier, "message": "Changed layout prevents safe identity matching; this part is preserved separately"})
            used_tracks.add(track["id"])
            for issue in issues:
                if issue.get("_sourceXmlPath") == entry["chunk"]["musicXmlPath"] and issue.get("partId") == entry["part"].get("id") and issue.get("page") == page:
                    issue["partId"] = track["id"]
                    issue["measure"] += sum(slot["count"] for slot in slots)
                    issue.pop("_sourceXmlPath", None)
            segment_parts[track["id"]] = (entry["part"], entry["chunk"], entry["fact"], entry["descriptor"])
        slots.append({"page": page, "systemOrder": system_order, "count": segment_count, "parts": segment_parts})
        last_layout = layout
    # Retain first appearance's explicit part-list braces/brackets. Repeated
    # page declarations are layout repetitions, not additional global groups.
    before = {}
    after = {}
    group_number = 0
    processed_roots = set()
    for track in tracks:
        source_root = track["sourceRoot"]
        if id(source_root) in processed_roots:
            continue
        processed_roots.add(id(source_root))
        source_tracks = [item for item in tracks if item["sourceRoot"] is source_root]
        source_ids = {item["originalId"]: item["id"] for item in source_tracks}
        source_order = [node.get("id") for node in source_root.findall("part-list/score-part")]
        if any(identifier not in source_ids for identifier in source_order):
            if source_root.findall("part-list/part-group"):
                issues.append({"kind": "part-group-ambiguous", "message": "Source group layout could not be safely remapped; original recognition XML remains in the evidence bundle"})
            continue
        remapped_numbers = {}
        current = None
        pending = []
        for node in source_root.find("part-list"):
            if node.tag == "score-part":
                current = source_ids[node.get("id")]
                before.setdefault(current, []).extend(pending)
                pending = []
            elif node.tag == "part-group":
                preserved = copy.deepcopy(node)
                number = node.get("number", "1")
                if node.get("type") == "start":
                    group_number += 1
                    remapped_numbers[number] = str(group_number)
                preserved.set("number", remapped_numbers.get(number, number))
                if node.get("type") == "stop" and current:
                    after.setdefault(current, []).append(preserved)
                else:
                    pending.append(preserved)
        if pending and current:
            after.setdefault(current, []).extend(pending)
    # Remap score instruments and every note reference, including percussion.
    for track in tracks:
        descriptor = copy.deepcopy(track["descriptor"])
        descriptor.set("id", track["id"])
        mapping = {}
        for index, instrument in enumerate(descriptor.findall("score-instrument")):
            old = instrument.get("id", "")
            mapping[old] = f"{track['id']}-I{index + 1}"
            instrument.set("id", mapping[old])
        for instrument in descriptor.findall("midi-instrument"):
            if instrument.get("id") in mapping:
                instrument.set("id", mapping[instrument.get("id")])
        track["instrumentMap"] = mapping
        part_list.extend(before.get(track["id"], []))
        part_list.append(descriptor)
        part_list.extend(after.get(track["id"], []))
    measure_number = 0
    refs = []
    staff_bindings = {}
    for slot in slots:
        template = next(iter(slot["parts"].values()))[0].findall("measure") if slot["parts"] else []
        for track in tracks:
            available = slot["parts"].get(track["id"])
            source_measures = available[0].findall("measure") if available else []
            source_system = 0
            current_instrument_map = {}
            if available:
                for index, instrument in enumerate(available[3].findall("score-instrument")):
                    current_instrument_map[instrument.get("id", "")] = f"{track['id']}-I{index + 1}"
            for offset in range(slot["count"]):
                if offset < len(source_measures):
                    measure = copy.deepcopy(source_measures[offset])
                    if offset and any(node.get("new-system") == "yes" or node.get("new-page") == "yes" for node in measure.findall("print")):
                        source_system += 1
                    for instrument in measure.findall(".//instrument"):
                        previous = instrument.get("id", "")
                        if previous in current_instrument_map:
                            instrument.set("id", current_instrument_map[previous])
                    for note_index, note in enumerate(measure.findall("note")):
                        original_id = note.get("id")
                        stable_id = f"omr-{track['id']}-p{slot['page']}-s{slot['systemOrder']}-m{offset + 1}-n{note_index + 1}"
                        note.set("id", stable_id)
                        system_id = available[1].get("systemId") or f"p{slot['page']}-system{source_system + 1}"
                        staff_number = int(note.findtext("staff", "1"))
                        staff_key = f"{system_id}|{available[0].get('id')}|{staff_number}"
                        refs.append({"noteId": stable_id, "sourceNoteId": original_id, "page": slot["page"], "systemId": system_id, "sourceStaffId": available[1].get("sourceStaffMap", {}).get(staff_key), "sourceRegion": available[1].get("bbox"), "partId": track["id"], "measureNumber": measure_number + offset + 1, "sourceMeasureNumber": source_measures[offset].get("number"), "sourceNoteIndex": note_index, "staff": staff_number})
                else:
                    measure = ET.Element("measure", implicit="yes")
                    # A forward is a synchronization placeholder, never recognized silence.
                    attributes = ET.SubElement(measure, "attributes")
                    ET.SubElement(attributes, "divisions").text = "480"
                    direction = ET.SubElement(measure, "direction")
                    ET.SubElement(ET.SubElement(direction, "direction-type"), "words").text = "OMR region not recognized; original source must be checked"
                    length = Fraction(4)
                    if template and offset < len(template):
                        template_facts = next(iter(slot["parts"].values()))[2]
                        if offset < len(template_facts["measureLengths"]):
                            length = Fraction(str(template_facts["measureLengths"][offset]))
                    ET.SubElement(ET.SubElement(measure, "forward"), "duration").text = str(max(1, round(length * 480)))
                    issues.append({"kind": "missing-staff", "page": slot["page"], "partId": track["id"], "measure": measure_number + offset + 1, "message": "Part region absent from recognition; silent synchronization placeholder is not an original rest"})
                measure.set("number", str(measure_number + offset + 1))
                if available:
                    system_id = available[1].get("systemId") or f"p{slot['page']}-system{source_system + 1}"
                    prefix = f"{system_id}|{available[0].get('id')}|"
                    for key, staff_id in available[1].get("sourceStaffMap", {}).items():
                        if key.startswith(prefix):
                            binding = staff_bindings.setdefault(staff_id, {"sourceStaffId": staff_id, "partId": track["id"], "page": slot["page"], "systemId": system_id, "measureNumbers": []})
                            binding["measureNumbers"].append(measure_number + offset + 1)
                if offset == 0:
                    printing = measure.find("print")
                    if printing is None:
                        printing = ET.Element("print")
                        measure.insert(0, printing)
                    if measure_number:
                        printing.set("new-page" if slot["systemOrder"] == 0 else "new-system", "yes")
                track["xml"].append(measure)
        measure_number += slot["count"]
    for track in tracks:
        merged.append(track["xml"])
    # Newly added directions/attributes must also obey MusicXML child order.
    normalize_xml(merged)
    output = Path(request["outputPath"])
    ET.ElementTree(merged).write(output, encoding="utf-8", xml_declaration=True)
    result = {"musicXmlPath": str(output), "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "sourceRefs": refs, "staffBindings": list(staff_bindings.values()), "issues": issues, "analysis": analyze_xml(output.read_text(encoding="utf-8"))}
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare", "orient", "inventory", "crop", "recognize", "analyze", "annotate", "merge"])
    parser.add_argument("request")
    parser.add_argument("result")
    args = parser.parse_args()
    request = json.loads(Path(args.request).read_text(encoding="utf-8"))
    result = globals()[args.action](request)
    write_json(args.result, result)


if __name__ == "__main__":
    main()
