"""Synthetic geometric regression; no private/customer fixtures."""
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import raster_enhancement as raster


class RasterEnhancementTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.directory = Path(self.temporary.name)
        self.image = np.full((400, 600), 245, np.uint8)
        for base in [100, 200, 300]:
            for line in range(5):
                cv2.line(self.image, (60, base + line * 6), (540, base + line * 6), 30, 1)
        # Bottom annotation must survive cropping, even below all detected staffs.
        cv2.putText(self.image, "lyrics", (70, 375), cv2.FONT_HERSHEY_SIMPLEX, .5, 20, 1)
        self.source = self.directory / "synthetic.png"
        Image.fromarray(self.image).save(self.source)

    def tearDown(self):
        self.temporary.cleanup()

    def prepare(self, **values):
        return raster.prepare({"inputPath": str(self.source), "outputDir": str(self.directory / "output"), "lane": "big", **values})

    def test_big_lane_uses_at_most_three_grayscale_variants_and_real_3x(self):
        result = self.prepare()
        self.assertEqual(len(result["variants"]), 3)
        self.assertEqual(result["diagnostics"]["expectedStaffCount"], 3)
        detail = result["variants"][1]
        self.assertEqual(detail["scale"], 3)
        self.assertLessEqual(detail["width"] * detail["height"], 12_000_000)
        for variant in result["variants"]:
            with Image.open(variant["imagePath"]) as image:
                self.assertEqual(image.mode, "L")
                self.assertGreater(len(np.unique(image)), 2)
            forward = np.asarray(variant["sourceToImage"]).reshape(3, 3)
            inverse = np.asarray(variant["imageToSource"]).reshape(3, 3)
            np.testing.assert_allclose(inverse @ forward, np.eye(3), atol=1e-8)
        self.assertGreaterEqual(sum(detail["crop"][1::2]), 390)

    def test_normal_lane_keeps_bounded_quality_alternatives(self):
        result = self.prepare(lane="normal")
        self.assertEqual([variant["id"] for variant in result["variants"]], ["gray", "detail", "shadow-detail"])
        self.assertTrue(all(not variant["requiresBigLane"] for variant in result["variants"]))
        self.assertTrue(all(variant["width"] * variant["height"] <= 12_000_000 for variant in result["variants"]))

    def test_pixel_budget_prevents_an_unaffordable_2x_resize(self):
        result = self.prepare(maxPixels=300_000)
        self.assertLess(result["variants"][1]["scale"], 2)
        self.assertTrue(all(variant["width"] * variant["height"] <= 300_000 for variant in result["variants"]))

    def test_budget_fit_uses_available_pixels_in_one_resize_when_2x_cannot_fit(self):
        result = self.prepare(maxPixels=700_000)
        detail = result["variants"][1]
        self.assertGreater(detail["scale"], 1)
        self.assertLess(detail["scale"], 2)
        self.assertLessEqual(detail["width"] * detail["height"], 700_000)
        self.assertIn("staff-spacing-budget-fit", detail["operations"])

    def test_manual_corners_have_invertible_perspective_mapping(self):
        result = self.prepare(lane="normal", corners=[[.1, .1], [.9, .05], [.95, .95], [.05, .9]])
        self.assertIn("manual-perspective", result["variants"][0]["operations"])
        matrix = np.asarray(result["variants"][0]["sourceToImage"]).reshape(3, 3)
        self.assertNotEqual(matrix[2, 0], 0)

    def test_known_orientation_rotates_once_and_retains_source_mapping(self):
        result = self.prepare(lane="normal", rotationDegrees=90)
        variant = result["variants"][0]
        self.assertEqual((variant["width"], variant["height"]), (400, 600))
        matrix = np.asarray(variant["sourceToImage"]).reshape(3, 3)
        np.testing.assert_allclose(matrix @ [0, 0, 1], [399, 0, 1])
        self.assertIn("orientation-90", variant["operations"])

    def test_invalid_corners_and_empty_detection_do_not_guess_a_crop(self):
        with self.assertRaises(ValueError):
            self.prepare(corners=[[0, 0], [1, 1], [1, 0], [0, 1]])
        Image.new("L", (600, 400), "white").save(self.source)
        result = self.prepare()
        self.assertEqual(result["diagnostics"]["staffDetection"], "uncertain")
        self.assertEqual(result["variants"][1]["crop"], [0, 0, 600, 400])


if __name__ == "__main__":
    unittest.main()
