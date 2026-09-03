"""Unit tests for Bento Ambient File Watcher."""
import os
import shutil
import tempfile
import time
import unittest
from bento.frameworks.watcher import AmbientWatcher


class TestAmbientWatcher(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.watcher = AmbientWatcher(watch_dir=self.test_dir, debounce_sec=0.1)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_detects_file_modification(self):
        test_file = os.path.join(self.test_dir, "test.py")
        with open(test_file, "w") as f:
            f.write("print(1)")

        # First check initializes the baseline
        self.watcher.check_for_changes()

        time.sleep(0.1)
        # Modify file
        with open(test_file, "a") as f:
            f.write("\nprint(2)")

        changed = self.watcher.check_for_changes()
        self.assertIn(test_file, changed)
