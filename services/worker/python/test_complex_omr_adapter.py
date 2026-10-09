"""Original synthetic scores exercise assembly invariants, not note accuracy."""
import tempfile
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

import complex_omr_adapter as adapter


class LineInventoryTests(unittest.TestCase):
    def test_low_resolution_staffs_with_ledger_marks_do_not_become_tab(self):
        import cv2
        import numpy as np
        for unit in (4, 5, 7, 9):
            image = np.full((1400, 1080, 3), 255, dtype=np.uint8)
            for system in range(10):
                top = 100 + system * 120
                for line in range(5):
                    cv2.line(image, (100, top + line * unit), (1000, top + line * unit), (0, 0, 0), 1)
                for x in (220, 540, 850):
                    cv2.line(image, (x - 6, top - unit), (x + 6, top - unit), (0, 0, 0), 1)
                    cv2.ellipse(image, (x, top + 2 * unit), (3, 2), 0, 0, 360, (0, 0, 0), -1)
            staffs, _ = adapter.classical_staffs(image)
            self.assertEqual(len(staffs), 10, unit)
            self.assertTrue(all(staff['lineCount'] == 5 and staff['kind'] == 'standard' for staff in staffs), unit)

    def test_true_four_and_six_line_tab_survive_low_resolution_detection(self):
        import cv2
        import numpy as np
        for unit in (4, 5, 7, 9):
            for count in (4, 6):
                image = np.full((1000, 900, 3), 255, dtype=np.uint8)
                for line in range(count):
                    cv2.line(image, (80, 150 + line * unit), (850, 150 + line * unit), (0, 0, 0), 1)
                staffs, _ = adapter.classical_staffs(image)
                self.assertEqual(len(staffs), 1)
                self.assertEqual(staffs[0]['lineCount'], count)
                self.assertEqual(staffs[0]['kind'], 'tablature')


def score(names, *, movement="", instrument_suffix="", extra=""):
    descriptors, parts = [], []
    for index, name in enumerate(names):
        pid = f"X{index + 1}"
        iid = f"{pid}{instrument_suffix}-I"
        descriptors.append(f'<score-part id="{pid}"><part-name>{name}</part-name><score-instrument id="{iid}"><instrument-name>{name}</instrument-name></score-instrument><midi-instrument id="{iid}"><midi-channel>{index + 1}</midi-channel><midi-program>1</midi-program></midi-instrument></score-part>')
        parts.append(f'<part id="{pid}"><measure number="1"><attributes><divisions>480</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note id="old"><pitch><step>C</step><octave>4</octave></pitch><duration>1920</duration><instrument id="{iid}"/><type>whole</type>{extra}</note></measure></part>')
    return '<score-partwise version="4.0">' + (f'<movement-title>{movement}</movement-title>' if movement else '') + '<part-list>' + ''.join(descriptors) + '</part-list>' + ''.join(parts) + '</score-partwise>'


class AssemblyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def chunk(self, xml, page=1, system=0, **kwargs):
        filename = self.directory / f"input-{len(list(self.directory.glob('input-*')))}.musicxml"
        filename.write_text(xml, encoding="utf-8")
        return {"musicXmlPath": str(filename), "page": page, "systemOrder": system, "scope": "system", **kwargs}

    def merge(self, chunks):
        result = adapter.merge({"chunks": chunks, "outputPath": str(self.directory / "merged.musicxml")})
        return result, ET.parse(result["musicXmlPath"]).getroot()

    def test_duplicate_named_instruments_stay_distinct_across_pages(self):
        result, root = self.merge([self.chunk(score(["Flute", "Flute"])), self.chunk(score(["Flute", "Flute"]), 2)])
        self.assertEqual(len(root.findall("part")), 2)
        self.assertEqual([len(part.findall("measure")) for part in root.findall("part")], [2, 2])
        self.assertTrue(any(issue["kind"] == "identity-ambiguous" for issue in result["issues"]))

    def test_changed_duplicate_layout_does_not_guess_hidden_instrument(self):
        result, root = self.merge([self.chunk(score(["Flute", "Flute"])), self.chunk(score(["Flute"]), 2)])
        self.assertEqual(len(root.findall("part")), 3)
        self.assertTrue(any(issue["kind"] == "identity-ambiguous" for issue in result["issues"]))

    def test_unique_named_part_survives_hidden_other_part(self):
        result, root = self.merge([self.chunk(score(["Flute", "Violin"])), self.chunk(score(["Violin"]), 2)])
        self.assertEqual(len(root.findall("part")), 2)
        missing = root.findall("part")[0].findall("measure")[1]
        self.assertIsNotNone(missing.find("forward"))
        self.assertIsNone(missing.find("note/rest"))
        self.assertTrue(any(issue["kind"] == "missing-staff" for issue in result["issues"]))

    def test_instrument_references_remap_even_when_upstream_ids_change(self):
        _, root = self.merge([self.chunk(score(["Flute"])), self.chunk(score(["Flute"], instrument_suffix="new"), 2)])
        ids = {instrument.get("id") for instrument in root.findall("part-list/score-part/score-instrument")}
        self.assertTrue(all(instrument.get("id") in ids for instrument in root.findall(".//note/instrument")))

    def test_simultaneous_groups_are_synchronized_not_concatenated(self):
        result, root = self.merge([self.chunk(score(["Flute"]), scope="instrument-group", groupOrdinal=0), self.chunk(score(["Violin"]), scope="instrument-group", groupOrdinal=1)])
        self.assertEqual(result["analysis"]["measureCount"], 1)
        self.assertEqual([len(part.findall("measure")) for part in root.findall("part")], [1, 1])

    def test_unknown_notations_and_lyric_extensions_survive(self):
        extra = '<lyric><text>la</text><extend type="start"/></lyric><notations><technical><string>2</string><fret>7</fret><bend><bend-alter>1</bend-alter></bend></technical><other-notation type="single">editorial</other-notation></notations>'
        _, root = self.merge([self.chunk(score(["Guitar"], extra=extra)), self.chunk(score(["Guitar"], extra=extra), 2)])
        self.assertEqual(len(root.findall(".//technical/fret")), 2)
        self.assertEqual(len(root.findall(".//lyric/extend")), 2)
        self.assertEqual(len(root.findall(".//other-notation")), 2)

    def test_named_movements_are_not_silently_joined(self):
        with self.assertRaisesRegex(ValueError, "MOVEMENT_AMBIGUOUS"):
            self.merge([self.chunk(score(["Flute"], movement="I")), self.chunk(score(["Flute"], movement="II"), 2)])

    def test_explicit_orchestral_group_and_source_comments_survive(self):
        xml = score(["Flute", "Violin"]).replace('<part-list>', '<part-list><part-group type="start" number="7"><group-name>Winds</group-name><group-symbol>bracket</group-symbol></part-group>').replace('</part-list>', '<part-group type="stop" number="7"/></part-list>').replace('<pitch>', '<!-- source-position 10,20 --><pitch>')
        result, root = self.merge([self.chunk(xml), self.chunk(xml, 2)])
        groups = root.findall('part-list/part-group')
        self.assertEqual([node.get('type') for node in groups], ['start', 'stop'])
        self.assertEqual(groups[0].get('number'), groups[1].get('number'))
        self.assertEqual(groups[0].findtext('group-symbol'), 'bracket')
        self.assertIn('source-position 10,20', Path(result['musicXmlPath']).read_text())

    def test_chord_durations_do_not_count_twice(self):
        xml = score(["Piano"]).replace('</note></measure>', '</note><note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1920</duration><type>whole</type></note></measure>')
        self.assertEqual(adapter.analyze_xml(xml)["issues"], [])

    def test_full_measure_rest_without_duration_is_legal(self):
        xml = score(["Flute"])
        root = ET.fromstring(xml)
        note = root.find("part/measure/note")
        note.clear()
        ET.SubElement(note, "rest", measure="yes")
        self.assertEqual(adapter.analyze_xml(ET.tostring(root, encoding="unicode"))["issues"], [])

    def test_incomplete_bar_is_reported(self):
        xml = score(["Flute"]).replace('<duration>1920</duration>', '<duration>480</duration>')
        self.assertTrue(any(issue["kind"] == "duration-mismatch" for issue in adapter.analyze_xml(xml)["issues"]))

    def test_source_drum_label_never_becomes_a_fake_pitched_melody(self):
        filename = self.directory / "drums.musicxml"
        filename.write_text(score(["Part 1"]).replace('<sign>G</sign><line>2</line>', '<sign>F</sign><line>4</line>'), encoding="utf-8")
        result = adapter.annotate({"musicXmlPath": str(filename), "labels": [{"name": "Dr.", "role": "percussion", "labelConfidence": .95}]})
        root = ET.parse(filename).getroot()
        self.assertIsNone(root.find(".//note/pitch"))
        self.assertEqual(root.findtext(".//clef/sign"), "percussion")
        self.assertEqual(root.findtext(".//midi-channel"), "10")
        self.assertIsNone(root.find(".//midi-unpitched"))
        self.assertTrue(any(issue["kind"] == "percussion-unmapped" for issue in result["issues"]))

    def test_trusted_unique_source_label_survives_legitimate_clef_change(self):
        first = self.chunk(score(["Piano"]), trustedPartNames={"X1": "Piano"})
        second = self.chunk(score(["Piano"]).replace('<sign>G</sign><line>2</line>', '<sign>F</sign><line>4</line>'), 2, trustedPartNames={"X1": "Piano"})
        result, root = self.merge([first, second])
        self.assertEqual(result['analysis']['partCount'], 1)
        self.assertEqual([clef.findtext('sign') for clef in root.findall('part/measure/attributes/clef')], ['G', 'F'])

    def test_zero_divisions_produces_explicit_gap_and_never_fake_rest(self):
        result, root = self.merge([self.chunk(score(["Flute"]).replace('<divisions>480</divisions>', '<divisions>0</divisions>'))])
        measure = root.find('part/measure')
        self.assertIsNone(measure.find('note'))
        self.assertIsNotNone(measure.find('forward'))
        self.assertEqual(measure.findtext('attributes/divisions'), '480')
        self.assertTrue(any(issue['kind'] == 'invalid-source-timing' for issue in result['issues']))
        self.assertIn('Unrecognized', measure.findtext('direction/direction-type/words'))

    def test_upstream_element_order_is_repaired_without_pitch_changes(self):
        xml = score(["Flute"]).replace('<step>C</step><octave>4</octave>', '<octave>4</octave><alter>1</alter><step>C</step>').replace('<type>whole</type>', '<type>whole</type><voice>1</voice>')
        _, root = self.merge([self.chunk(xml)])
        note = root.find('part/measure/note')
        self.assertEqual([node.tag for node in note.find('pitch')], ['step', 'alter', 'octave'])
        self.assertLess(list(note).index(note.find('voice')), list(note).index(note.find('type')))
        self.assertEqual(note.findtext('pitch/alter'), '1')

    def test_source_staff_ids_remain_exact_across_assembly(self):
        chunk = self.chunk(score(["Flute"]), systemId='p1-system1', sourceStaffMap={'p1-system1|X1|1': 'source-staff1'})
        result, _ = self.merge([chunk])
        self.assertEqual(result['sourceRefs'][0]['sourceStaffId'], 'source-staff1')
        self.assertEqual(result['staffBindings'][0]['measureNumbers'], [1])

    def test_unresolved_measure_still_binds_the_detected_source_staff(self):
        chunk = self.chunk(score(["Flute"]).replace('<divisions>480</divisions>', '<divisions>0</divisions>'), systemId='p1-system1', sourceStaffMap={'p1-system1|X1|1': 'source-staff1'})
        result, _ = self.merge([chunk])
        self.assertFalse(result['sourceRefs'])
        self.assertEqual(result['staffBindings'][0], {'sourceStaffId':'source-staff1','partId':'P1','page':1,'systemId':'p1-system1','measureNumbers':[1]})

    def test_existing_explicit_drum_mapping_is_preserved(self):
        filename = self.directory / "mapped-drums.musicxml"
        filename.write_text(score(["Drums"]).replace('<pitch><step>C</step><octave>4</octave></pitch>', '<unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched>').replace('<midi-program>1</midi-program>', '<midi-program>1</midi-program><midi-unpitched>43</midi-unpitched>'), encoding='utf-8')
        result = adapter.annotate({'musicXmlPath': str(filename), 'labels': [{'name':'Dr.','role':'percussion','labelConfidence':.95}]})
        self.assertEqual(ET.parse(filename).getroot().findtext('.//midi-unpitched'), '43')
        self.assertFalse(result['issues'])

    def test_forward_inverse_orientation_transforms_restore_source_pixels(self):
        first = [0, -1, 3999, 1, 0, 0]  # EXIF orientation 6.
        second = [-1, 0, 2999, 0, -1, 3999]  # Additional 180-degree rotation.
        combined = adapter.compose_affine(first, second)
        identity = adapter.compose_affine(combined, adapter.inverse_affine(combined))
        for actual, expected in zip(identity, [1,0,0,0,1,0]):
            self.assertAlmostEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
