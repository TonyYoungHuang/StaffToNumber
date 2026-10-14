"""Exercise the production wrapper's admission arithmetic without engine installs.

The wrapper remains one self-contained bind-mounted file. Extract only its
function definitions, so Windows can verify the same gate without Linux flock.
"""
import ast
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch


MIB = 1024 * 1024
WRAPPER = Path(__file__).resolve().parents[3] / "deploy" / "hetzner" / "music-engine-serial.sh"
source = WRAPPER.read_text(encoding="utf-8").split("<<'PY'\n", 1)[1].rsplit("\nPY", 1)[0]
tree = ast.parse(source)
functions = ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef)], type_ignores=[])
namespace = {"os": os}
exec(compile(functions, str(WRAPPER), "exec"), namespace)
admit = namespace["memory_admissible"]


def active(memory_mb=1024, group="worker", baseline=100):
    return {"memory_bytes": memory_mb * MIB, "group": group,
            "host_baseline_available": 2483 * MIB, "cgroup_baseline_current": baseline * MIB}


class ResourceGateTests(unittest.TestCase):
    def test_reads_host_and_real_cgroup_v2_limit_in_bytes(self):
        files = {"/proc/meminfo": "MemTotal: 3906000 kB\nMemAvailable: 2542592 kB\n",
                 "/sys/fs/cgroup/memory.current": str(100 * MIB),
                 "/sys/fs/cgroup/memory.max": str(2560 * MIB)}
        with patch("os.path.exists", side_effect=lambda name: name.replace("\\", "/") in files), \
             patch("builtins.open", side_effect=lambda name: io.StringIO(files[name.replace("\\", "/")])):
            self.assertEqual(namespace["memory_snapshot"](), (2542592 * 1024, 100 * MIB, 2560 * MIB))

    def test_reads_cgroup_v1_when_v2_sensor_is_absent(self):
        files = {"/proc/meminfo": "MemAvailable: 1000000 kB\n",
                 "/sys/fs/cgroup/memory/memory.usage_in_bytes": str(200 * MIB),
                 "/sys/fs/cgroup/memory/memory.limit_in_bytes": str(1792 * MIB)}
        with patch("os.path.exists", side_effect=lambda name: name.replace("\\", "/") in files), \
             patch("builtins.open", side_effect=lambda name: io.StringIO(files[name.replace("\\", "/")])):
            self.assertEqual(namespace["memory_snapshot"](), (1000000 * 1024, 200 * MIB, 1792 * MIB))

    def test_v1_unlimited_sentinel_is_not_a_container_memory_sensor(self):
        files = {"/proc/meminfo": "MemAvailable: 1000000 kB\n",
                 "/sys/fs/cgroup/memory/memory.usage_in_bytes": str(200 * MIB),
                 "/sys/fs/cgroup/memory/memory.limit_in_bytes": str(9223372036854771712)}
        with patch("os.path.exists", side_effect=lambda name: name.replace("\\", "/") in files), \
             patch("builtins.open", side_effect=lambda name: io.StringIO(files[name.replace("\\", "/")])):
            self.assertEqual(namespace["memory_snapshot"](), (1000000 * 1024, 200 * MIB, None))

    def test_measured_headroom_preserves_two_light_slots(self):
        current = (2483 * MIB, 100 * MIB, 2560 * MIB)
        self.assertTrue(admit(current, [], 1024 * MIB, 256 * MIB, "worker")[0])
        self.assertTrue(admit(current, [active()], 1024 * MIB, 256 * MIB, "worker")[0])
        self.assertFalse(admit(current, [active(), active()], 1024 * MIB, 256 * MIB, "worker")[0])

    def test_rss_growth_does_not_force_single_concurrency(self):
        current = (1683 * MIB, 900 * MIB, 2560 * MIB)
        self.assertTrue(admit(current, [active()], 1024 * MIB, 256 * MIB, "worker")[0])

    def test_cross_container_reservations_protect_host(self):
        current = (2483 * MIB, 180 * MIB, 1792 * MIB)
        self.assertFalse(admit(current, [active(), active()], 1024 * MIB, 256 * MIB, "api")[0])
        self.assertTrue(admit(current, [active()], 1024 * MIB, 256 * MIB, "api")[0])
        self.assertFalse(admit((1483 * MIB, 180 * MIB, 1792 * MIB), [active()], 1024 * MIB, 256 * MIB, "api")[0])

    def test_other_site_pressure_does_not_erase_future_engine_growth(self):
        current = (1483 * MIB, 100 * MIB, 2560 * MIB)
        self.assertFalse(admit(current, [active()], 1024 * MIB, 256 * MIB, "worker")[0])

    def test_unlimited_root_cgroup_does_not_credit_other_sites_growth(self):
        current = (1483 * MIB, 1100 * MIB, None)
        self.assertFalse(admit(current, [active()], 1024 * MIB, 256 * MIB, "worker")[0])

    def test_three_engines_can_run_with_sufficient_memory(self):
        current = (6000 * MIB, 100 * MIB, 6144 * MIB)
        self.assertTrue(admit(current, [active(), active()], 1024 * MIB, 256 * MIB, "worker")[0])

    def test_heavy_engine_keeps_memory_headroom(self):
        self.assertTrue(admit((2483 * MIB, 100 * MIB, 2560 * MIB), [], 2048 * MIB, 256 * MIB, "worker")[0])
        self.assertFalse(admit((2200 * MIB, 100 * MIB, 2560 * MIB), [], 2048 * MIB, 256 * MIB, "worker")[0])
        self.assertFalse(admit((3000 * MIB, 400 * MIB, 2560 * MIB), [], 2048 * MIB, 256 * MIB, "worker")[0])


@unittest.skipUnless(sys.platform == "linux", "Shared flock/process admission requires Linux")
class SharedPoolTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="score-engine-admission-")
        self.addCleanup(self.directory.cleanup)
        self.children = []
        self.addCleanup(self.stop_children)

    def stop_children(self):
        for child in self.children:
            if child.poll() is None:
                child.kill()
            child.communicate(timeout=3)

    def start(self, name, available_mb=6000, wait_ms=200):
        # The real dispatcher, file metadata, exec and flock code run unchanged;
        # only the host/cgroup sensor returns a deterministic fixture snapshot.
        program = source.replace("wrapper, engine, *args = sys.argv[1:]",
            f"def memory_snapshot(): return ({available_mb} * 1024 * 1024, 100 * 1024 * 1024, 6144 * 1024 * 1024)\n"
            "wrapper, engine, *args = sys.argv[1:]")
        launched = Path(self.directory.name) / f"{name}.started"
        engine = "from pathlib import Path; import sys,time; Path(sys.argv[1]).write_text('started'); time.sleep(30)"
        environment = {**os.environ, "MUSIC_ENGINE_LOCK_DIR": self.directory.name,
                       "MUSIC_ENGINE_QUEUE_WAIT_MS": str(wait_ms), "MUSIC_ENGINE_MAX_CONCURRENCY": "3"}
        child = subprocess.Popen([sys.executable, "-B", "-c", program, "score-musescore", sys.executable,
                                  "-c", engine, str(launched)], env=environment,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.children.append(child)
        return child, launched

    def wait_started(self, launched):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline and not launched.exists():
            time.sleep(0.01)
        self.assertTrue(launched.exists(), f"Engine never started: {launched}")

    def test_three_processes_use_pool_and_exit_releases_slot(self):
        engines = [self.start(str(index)) for index in range(3)]
        for _, launched in engines:
            self.wait_started(launched)
        blocked, launched = self.start("fourth")
        _, stderr = blocked.communicate(timeout=3)
        self.assertEqual(blocked.returncode, 75)
        self.assertIn(b"ENGINE_RESOURCE_BUSY", stderr)
        self.assertFalse(launched.exists())
        engines[0][0].kill()
        engines[0][0].communicate(timeout=3)
        _, retry_started = self.start("retry")
        self.wait_started(retry_started)

    def test_insufficient_memory_never_launches_engine(self):
        blocked, launched = self.start("low-memory", available_mb=900)
        _, stderr = blocked.communicate(timeout=3)
        self.assertEqual(blocked.returncode, 75)
        self.assertIn(b"ENGINE_MEMORY_PRESSURE", stderr)
        self.assertFalse(launched.exists())


if __name__ == "__main__":
    unittest.main(testRunner=unittest.TextTestRunner(stream=sys.stdout))
