"""Original geometric fixtures; no customer files and no learned models."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

import score_structure_preflight as preview


def sheet(systems=(1,), line_count=5, connected=True, margin_symbols=True):
    image = Image.new("RGB", (800, 1000), "white")
    draw = ImageDraw.Draw(image)
    unit = 8
    top = 100
    for staff_count in systems:
        first = top
        for index in range(staff_count):
            for line in range(line_count):
                draw.line((70, top + line * unit, 740, top + line * unit), fill="black", width=1)
            if margin_symbols:
                # Deliberately asymmetric, original clef-like line art. The
                # free preview looks only at margin density, not symbol names.
                draw.ellipse((80, top - 10, 100, top + 37), outline="black", width=4)
                draw.ellipse((85, top + 4, 106, top + 29), outline="black", width=3)
                draw.line((93, top - 17, 88, top + 47), fill="black", width=3)
            for x in (260, 405, 550):
                draw.ellipse((x - 4, top + 11, x + 5, top + 17), fill="black")
                draw.line((x + 5, top - 8, x + 5, top + 14), fill="black", width=2)
            top += (line_count - 1) * unit + 50
        if staff_count > 1 and connected:
            last = top - 50
            for x in (70, 400, 740):
                draw.line((x, first, x, last), fill="black", width=2)
        top += 60
    return image


class StructurePreflightTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.directory = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def inspect(self, image=None, name="source.png", limits=None):
        source = self.directory / name
        if image is not None:
            image.save(source)
        return preview.preflight({"sourcePath": str(source), "limits": limits or {}})

    def test_single_melody_with_several_systems_is_simple(self):
        result = self.inspect(sheet((1, 1, 1, 1)))
        self.assertEqual(result["recommendation"], "simple")
        self.assertEqual(result["pages"][0]["systemCount"], 4)
        self.assertEqual(result["pages"][0]["maxStavesPerSystem"], 1)
        self.assertTrue(result["complete"])

    def test_ordinary_piano_grand_staff_is_simple(self):
        result = self.inspect(sheet((2, 2)))
        self.assertEqual(result["recommendation"], "simple")
        self.assertEqual(result["pages"][0]["systemCount"], 2)
        self.assertEqual(result["pages"][0]["maxStavesPerSystem"], 2)
        self.assertIn("PIANO_STAFF_LAYOUT", result["reasonCodes"])

    def test_simultaneous_ensemble_is_complex(self):
        result = self.inspect(sheet((4, 4)))
        self.assertEqual(result["recommendation"], "complex")
        self.assertEqual(result["pages"][0]["maxStavesPerSystem"], 4)
        self.assertIn("MULTI_INSTRUMENT_LAYOUT", result["reasonCodes"])

    def test_four_and_six_line_tab_suggest_complex(self):
        for line_count in (4, 6):
            with self.subTest(line_count=line_count):
                result = self.inspect(sheet((1, 1), line_count=line_count))
                self.assertEqual(result["recommendation"], "complex")
                self.assertTrue(result["pages"][0]["hasTab"])
                self.assertEqual(result["pages"][0]["tabStaffCount"], 2)

    def test_all_four_rotations_detect_axis_and_report_correction(self):
        for rotation in (0, 90, 180, 270):
            with self.subTest(rotation=rotation):
                # PIL positive angles are counterclockwise; output is clockwise.
                image = sheet((2,)).rotate(rotation, expand=True)
                result = self.inspect(image)
                self.assertEqual(result["recommendation"], "simple")
                self.assertEqual(result["pages"][0]["rotation"], rotation)
                self.assertTrue(result["pages"][0]["orientationCertain"])

    def test_lines_without_direction_symbols_are_uncertain(self):
        result = self.inspect(sheet((1,), margin_symbols=False))
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertIsNone(result["pages"][0]["rotation"])
        self.assertIn("ORIENTATION_UNCERTAIN", result["reasonCodes"])

    def test_unconnected_close_staves_are_not_declared_piano(self):
        result = self.inspect(sheet((2,), connected=False))
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertIn("SYSTEM_GROUPING_UNCERTAIN", result["reasonCodes"])

    def test_blank_or_unknown_image_is_uncertain(self):
        result = self.inspect(Image.new("RGB", (800, 1000), "white"))
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertEqual(result["sourcePageCount"], 1)
        self.assertTrue(result["complete"])
        self.assertIn("NO_STAFF_DETECTED", result["reasonCodes"])

    def test_short_system_is_not_missed_due_to_page_whitespace(self):
        image = Image.new("RGB", (800, 1000), "white")
        image.paste(sheet((1,)).crop((60, 60, 270, 200)), (60, 100))
        result = self.inspect(image)
        self.assertEqual(result["recommendation"], "simple")
        self.assertEqual(result["pages"][0]["staffCount"], 1)

    def test_exif_rotated_jpeg_preserves_portrait_resolution(self):
        image = sheet((2,)).rotate(90, expand=True)
        exif = Image.Exif()
        exif[274] = 6
        filename = self.directory / "exif.jpg"
        image.save(filename, exif=exif, quality=95)
        result = self.inspect(name="exif.jpg")
        self.assertEqual(result["recommendation"], "simple")
        self.assertEqual((result["pages"][0]["width"], result["pages"][0]["height"]), (800, 1000))
        self.assertEqual(result["pages"][0]["exifOrientation"], 6)

    def test_multiple_simple_pdf_pages_are_all_counted(self):
        filename = self.directory / "pages.pdf"
        first, second = sheet((1, 1)), sheet((1,))
        first.save(filename, format="PDF", save_all=True, append_images=[second], resolution=100)
        result = self.inspect(name="pages.pdf")
        self.assertEqual(result["recommendation"], "simple")
        self.assertEqual(result["sourcePageCount"], 2)
        self.assertEqual(result["pagesAnalyzed"], 2)

    def test_pdf_page_limit_does_not_lie_about_total_pages(self):
        filename = self.directory / "pages.pdf"
        first = sheet((1,))
        first.save(filename, format="PDF", save_all=True, append_images=[sheet((1,)), sheet((1,))], resolution=100)
        result = self.inspect(name="pages.pdf", limits={"maxPages": 1})
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertEqual(result["sourcePageCount"], 3)
        self.assertEqual(result["pagesAnalyzed"], 1)
        self.assertFalse(result["complete"])
        self.assertIn("ANALYSIS_LIMIT_REACHED", result["reasonCodes"])

    def test_total_pixel_budget_has_explicit_partial_result(self):
        filename = self.directory / "frames.tiff"
        sheet((1,)).save(filename, save_all=True, append_images=[sheet((1,)), sheet((1,))])
        result = self.inspect(name="frames.tiff", limits={"maxTotalPixels": 800_000})
        self.assertEqual(result["sourcePageCount"], 3)
        self.assertEqual(result["pagesAnalyzed"], 1)
        self.assertFalse(result["complete"])
        self.assertEqual(result["recommendation"], "uncertain")

    def test_tiff_frames_are_not_discarded(self):
        filename = self.directory / "frames.tiff"
        sheet((1,)).save(filename, save_all=True, append_images=[sheet((4,))])
        result = self.inspect(name="frames.tiff")
        self.assertEqual(result["sourcePageCount"], 2)
        self.assertEqual(result["pagesAnalyzed"], 2)
        self.assertTrue(result["complete"])
        self.assertEqual(result["recommendation"], "complex")

    def test_unknown_page_prevents_a_confident_simple_suggestion(self):
        filename = self.directory / "frames.tiff"
        sheet((1,)).save(filename, save_all=True, append_images=[Image.new("RGB", (800, 1000), "white")])
        result = self.inspect(name="frames.tiff")
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertTrue(result["complete"])

    def test_page_read_failure_never_marks_complete(self):
        with patch.object(preview, "analyze_page", side_effect=ValueError("Unreadable page")):
            result = self.inspect(sheet((1,)))
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertFalse(result["complete"])
        self.assertIn("PAGE_READ_FAILED", result["reasonCodes"])

    def test_oversized_native_raster_is_refused_before_decompression(self):
        filename = self.directory / "header.png"
        filename.write_bytes(b"A caller-owned placeholder")
        class OversizedRaster:
            width, height, n_frames, format = 8000, 8000, 1, "PNG"
            def __enter__(self): return self
            def __exit__(self, *arguments): return False
            def seek(self, index): pass
            def load(self): raise AssertionError("Native raster must not be allocated")
        with patch.object(Image, "open", return_value=OversizedRaster()):
            result = self.inspect(name="header.png")
        self.assertEqual(result["pagesAnalyzed"], 0)
        self.assertFalse(result["complete"])
        self.assertIn("ANALYSIS_LIMIT_REACHED", result["reasonCodes"])

    def test_time_budget_is_enforced_before_next_page(self):
        filename = self.directory / "frames.tiff"
        sheet((1,)).save(filename, save_all=True, append_images=[sheet((1,))])
        with patch.object(preview.time, "monotonic", side_effect=[0, 0, 0, 16, 16]):
            result = self.inspect(name="frames.tiff")
        self.assertEqual(result["pagesAnalyzed"], 1)
        self.assertEqual(result["recommendation"], "uncertain")
        self.assertFalse(result["complete"])

    def test_pixel_limit_is_checked_before_allocating_pdf_bitmap(self):
        filename = self.directory / "pages.pdf"
        sheet((1,)).save(filename, format="PDF", resolution=100)
        import pypdfium2 as pdfium
        original = pdfium.PdfPage.render
        allocations = []

        def render(page, *arguments, **options):
            import math
            width, height = page.get_size()
            allocations.append(math.ceil(width * options["scale"]) * math.ceil(height * options["scale"]))
            return original(page, *arguments, **options)

        with patch.object(pdfium.PdfPage, "render", render):
            result = self.inspect(name="pages.pdf", limits={"maxPagePixels": 200_000})
        self.assertTrue(result["complete"])
        self.assertEqual(len(allocations), 1)
        self.assertLessEqual(allocations[0], 200_000)

    def test_no_network_or_model_import_is_needed(self):
        before = set(sys.modules)
        with patch("socket.socket.connect", side_effect=AssertionError("No network allowed")), patch("socket.socket.connect_ex", side_effect=AssertionError("No network allowed")):
            result = self.inspect(sheet((1,)))
        self.assertEqual(result["recommendation"], "simple")
        added = set(sys.modules) - before
        self.assertFalse(any(name == "onnxruntime" or name.startswith(("homr.", "rapidocr", "torch", "transformers")) for name in added))

    def test_cli_file_contract_and_private_path_not_returned(self):
        filename = self.directory / "private-source.png"
        sheet((1,)).save(filename)
        request, response = self.directory / "request.json", self.directory / "response.json"
        request.write_text(json.dumps({"sourcePath": str(filename)}), encoding="utf-8")
        process = subprocess.run([sys.executable, str(Path(preview.__file__)), "--request", str(request), "--response", str(response)], capture_output=True, text=True, timeout=20)
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(process.stdout, "")
        result = json.loads(response.read_text())
        self.assertEqual(result["schemaVersion"], 1)
        self.assertEqual(result["recommendation"], "simple")
        self.assertNotIn(str(filename), response.read_text())

    def test_invalid_source_has_a_generic_exit_code_and_no_path_leak(self):
        source = self.directory / "secret-not-found.png"
        request = self.directory / "request.json"
        request.write_text(json.dumps({"sourcePath": str(source)}), encoding="utf-8")
        process = subprocess.run([sys.executable, str(Path(preview.__file__)), "--request", str(request)], capture_output=True, text=True, timeout=20)
        self.assertEqual(process.returncode, 2)
        self.assertEqual(process.stderr.strip(), "PREFLIGHT_INVALID_SOURCE")
        self.assertNotIn(str(source), process.stderr)

    def test_limits_are_clamped_and_invalid_values_rejected(self):
        limits = preview.read_limits({"limits": {"maxPages": 10_000, "maxPagePixels": 100_000_000}})
        self.assertEqual(limits["maxPages"], 100)
        self.assertEqual(limits["maxPagePixels"], 2_000_000)
        for invalid in (True, -1, "100", float("nan")):
            with self.subTest(value=invalid), self.assertRaisesRegex(ValueError, "PREFLIGHT_INVALID_REQUEST"):
                preview.read_limits({"limits": {"maxPages": invalid}})


if __name__ == "__main__":
    unittest.main()
