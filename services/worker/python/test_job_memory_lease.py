"""Offline Linux regression for full-job lane exclusion and authenticated bypass."""
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import tempfile
import time
import unittest

try:
    import fcntl
except ImportError:
    fcntl = None


@unittest.skipUnless(fcntl is not None, "Linux flock regression runs in the local offline container")
class JobMemoryLeaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.children = []

    def tearDown(self):
        for child in self.children:
            if child.poll() is None:
                child.kill()
            child.communicate(timeout=5)
        self.temp.cleanup()

    def start(self, weight, token="test-token", wait_ms=1000):
        child = subprocess.Popen([sys.executable, str(Path(__file__).with_name("job_memory_lease.py")), str(self.directory), token, "1", str(weight), "2", str(wait_ms)],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.children.append(child)
        return child

    def ready(self, child):
        with selectors.DefaultSelector() as selector:
            selector.register(child.stdout, selectors.EVENT_READ)
            self.assertTrue(selector.select(timeout=5), "Lease holder never reported admission")
        line = child.stdout.readline()
        self.assertTrue(line, child.stderr.read() if child.poll() is not None else "Missing ready record")
        self.assertTrue(json.loads(line)["ready"])

    def release(self, child):
        child.stdin.close()
        child.stdin = None
        self.assertEqual(child.wait(timeout=5), 0)

    def test_big_is_exclusive_and_crash_releases_locks(self):
        normal = self.start(1)
        self.ready(normal)
        blocked_big = self.start(2, wait_ms=150)
        self.assertNotEqual(blocked_big.wait(timeout=5), 0)
        self.assertIn("ENGINE_RESOURCE_BUSY", blocked_big.stderr.read())
        self.release(normal)
        big = self.start(2)
        self.ready(big)
        for index in range(2):
            with (self.directory / f"slot-{index}.lock").open("a+") as slot:
                with self.assertRaises(BlockingIOError):
                    fcntl.flock(slot, fcntl.LOCK_EX | fcntl.LOCK_NB)
        blocked_normal = self.start(1, wait_ms=150)
        self.assertNotEqual(blocked_normal.wait(timeout=5), 0)
        big.kill()
        big.wait(timeout=5)
        replacement = self.start(1)
        self.ready(replacement)
        self.release(replacement)

    def test_waiting_big_job_blocks_new_normal_jobs_and_wrappers_until_existing_normal_drains(self):
        normal = self.start(1, token="normal-holder")
        self.ready(normal)
        waiting_big = self.start(2, token="waiting-big", wait_ms=5000)
        # Wait for the actual flock intent, rather than guessing from a sleep.
        deadline = time.monotonic() + 3
        intent_seen = False
        while time.monotonic() < deadline:
            with (self.directory / "big-intent.lock").open("a") as intent:
                try:
                    fcntl.flock(intent, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    fcntl.flock(intent, fcntl.LOCK_UN)
                except BlockingIOError:
                    intent_seen = True
                    break
            time.sleep(.01)
        self.assertTrue(intent_seen, "Big job never announced admission intent")
        late_normal = self.start(1, token="late-normal", wait_ms=150)
        self.assertNotEqual(late_normal.wait(timeout=5), 0, "A new normal job cut in ahead of the waiting big job")
        self.assertIn("ENGINE_RESOURCE_BUSY", late_normal.stderr.read())
        wrapper = Path(__file__).resolve().parents[3] / "deploy/hetzner/music-engine-serial.sh"
        code = wrapper.read_text().split("<<'PY'\n", 1)[1].rsplit("\nPY", 1)[0]
        environment = {**os.environ, "RECOGNITION_LANES_ENABLED": "true", "MUSIC_ENGINE_MAX_CONCURRENCY": "2", "MUSIC_ENGINE_LOCK_DIR": str(self.directory),
                       "MUSIC_ENGINE_QUEUE_WAIT_MS": "150", "SCORE_ENGINE_START_NOTIFY": "1", "MUSIC_ENGINE_MEMORY_MB": "1"}
        blocked_wrapper = subprocess.run([sys.executable, "-", "score-audiveris", "/bin/true"], input=code, text=True, capture_output=True, env=environment, timeout=5)
        self.assertEqual(blocked_wrapper.returncode, 75)
        self.assertIn("ENGINE_RESOURCE_BUSY", blocked_wrapper.stderr)
        # A job already holding its normal lease must finish its own child
        # commands; making it wait on big intent would deadlock draining.
        environment["MUSIC_ENGINE_JOB_TOKEN"] = "normal-holder"
        admitted_wrapper = subprocess.run([sys.executable, "-", "score-audiveris", "/bin/true"], input=code, text=True, capture_output=True, env=environment, timeout=5)
        self.assertEqual(admitted_wrapper.returncode, 0, admitted_wrapper.stderr)
        self.assertIn("SCORE_ENGINE_STARTED", admitted_wrapper.stderr)
        self.release(normal)
        self.ready(waiting_big)
        self.release(waiting_big)
        next_normal = self.start(1)
        self.ready(next_normal)
        self.release(next_normal)

    def test_wrapper_requires_live_token_and_emits_execution_start(self):
        holder = self.start(2, token="live-token")
        self.ready(holder)
        wrapper = Path(__file__).resolve().parents[3] / "deploy/hetzner/music-engine-serial.sh"
        code = wrapper.read_text().split("<<'PY'\n", 1)[1].rsplit("\nPY", 1)[0]
        environment = {**os.environ, "RECOGNITION_LANES_ENABLED": "true", "MUSIC_ENGINE_MAX_CONCURRENCY": "2", "MUSIC_ENGINE_LOCK_DIR": str(self.directory),
                       "MUSIC_ENGINE_JOB_TOKEN": "live-token", "SCORE_ENGINE_START_NOTIFY": "1", "MUSIC_ENGINE_MEMORY_MB": "1"}
        result = subprocess.run([sys.executable, "-", "score-audiveris", "/bin/true"], input=code, text=True, capture_output=True, env=environment, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("SCORE_ENGINE_STARTED", result.stderr)
        environment["MUSIC_ENGINE_JOB_TOKEN"] = "wrong-token"
        result = subprocess.run([sys.executable, "-", "score-audiveris", "/bin/true"], input=code, text=True, capture_output=True, env=environment, timeout=5)
        self.assertEqual(result.returncode, 75)
        self.assertIn("ENGINE_RESOURCE_UNAVAILABLE", result.stderr)
        self.release(holder)


if __name__ == "__main__":
    unittest.main()
