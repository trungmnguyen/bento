"""Unit tests for Bento Background Task Runner (Butler Daemon)."""
import os
import shutil
import tempfile
import time
import unittest
from bento.frameworks.bg_runner import BackgroundTaskRunner


class TestBackgroundTaskRunner(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.runner = BackgroundTaskRunner(base_dir=self.test_dir)
        self.spawned_tasks = []

    def tearDown(self):
        for task_id in self.spawned_tasks:
            try:
                self.runner.kill_task(task_id, working_dir=self.test_dir)
            except Exception:
                pass
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_start_and_get_status_and_list_tasks(self):
        task = self.runner.start_task(
            command="python3 -c 'import time; time.sleep(0.5)'",
            tag="test-sleep",
            working_dir=self.test_dir,
        )
        task_id = task["id"]
        self.spawned_tasks.append(task_id)

        self.assertIn("bg-", task_id)
        self.assertEqual(task["tag"], "test-sleep")
        self.assertGreater(task["pid"], 0)

        # Check status while running
        status = self.runner.get_status(task_id, working_dir=self.test_dir)
        self.assertIsNotNone(status)
        self.assertEqual(status["id"], task_id)

        # Check list tasks
        tasks = self.runner.list_tasks(working_dir=self.test_dir)
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["id"], task_id)

        # Wait for task to finish
        time.sleep(0.7)
        status_after = self.runner.get_status(task_id, working_dir=self.test_dir)
        self.assertIsNotNone(status_after)
        self.assertFalse(status_after["is_alive"])

    def test_kill_task(self):
        task = self.runner.start_task(
            command="python3 -c 'import time; time.sleep(10)'",
            tag="long-task",
            working_dir=self.test_dir,
        )
        task_id = task["id"]
        self.spawned_tasks.append(task_id)

        status_before = self.runner.get_status(task_id, working_dir=self.test_dir)
        self.assertTrue(status_before["is_alive"])

        killed = self.runner.kill_task(task_id, working_dir=self.test_dir)
        self.assertTrue(killed)

        time.sleep(0.2)
        status_after = self.runner.get_status(task_id, working_dir=self.test_dir)
        for _ in range(40):
            if not status_after or not status_after.get("is_alive"):
                break
            time.sleep(0.1)
            status_after = self.runner.get_status(task_id, working_dir=self.test_dir)
        self.assertFalse(status_after["is_alive"])

    def test_prune_tasks(self):
        task = self.runner.start_task(
            command="python3 -c 'exit(0)'",
            tag="quick-task",
            working_dir=self.test_dir,
        )
        task_id = task["id"]
        time.sleep(0.3)

        # Confirm task finished
        status = self.runner.get_status(task_id, working_dir=self.test_dir)
        self.assertFalse(status["is_alive"])

        # Prune tasks
        pruned = self.runner.prune_tasks(stopped_only=True, working_dir=self.test_dir)
        self.assertEqual(pruned, 1)

        # Confirm task is gone
        tasks = self.runner.list_tasks(working_dir=self.test_dir)
        self.assertEqual(len(tasks), 0)
        self.assertIsNone(self.runner.get_status(task_id, working_dir=self.test_dir))
