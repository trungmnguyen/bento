"""Unit tests for FileSystemStorageGateway boundary enforcement (SEC-15)."""
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from bento.frameworks.fs_storage import FileSystemStorageGateway


class TestFileSystemStorageGateway(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.mkdtemp()
        self.gateway = FileSystemStorageGateway(base_dir=self.workspace)

    def tearDown(self):
        shutil.rmtree(self.workspace, ignore_errors=True)

    def test_write_and_read_within_boundary(self):
        file_path = os.path.join(self.workspace, "valid.txt")
        self.gateway.write_text(file_path, "Hello Bento")
        content = self.gateway.read_text(file_path)
        self.assertEqual(content, "Hello Bento")
        self.assertTrue(self.gateway.file_exists(file_path))

    def test_write_outside_boundary_raises_permission_error(self):
        outside_path = os.path.join(tempfile.gettempdir(), "escaped_bento.txt")
        with self.assertRaises(PermissionError):
            self.gateway.write_text(outside_path, "Exploit")

    def test_read_outside_boundary_raises_permission_error(self):
        outside_path = os.path.join(tempfile.gettempdir(), "escaped_read.txt")
        Path(outside_path).write_text("Secret")
        try:
            with self.assertRaises(PermissionError):
                self.gateway.read_text(outside_path)
        finally:
            if os.path.exists(outside_path):
                os.remove(outside_path)

    def test_directory_traversal_path_blocked(self):
        traversal_path = os.path.join(self.workspace, "../../traversal.txt")
        with self.assertRaises(PermissionError):
            self.gateway.write_text(traversal_path, "Blocked")


if __name__ == "__main__":
    unittest.main()
