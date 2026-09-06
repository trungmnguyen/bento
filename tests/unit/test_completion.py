"""Unit tests for Bento Shell Completion generator use case."""
import unittest
from bento.use_cases.completion import GenerateCompletionUseCase


class TestGenerateCompletionUseCase(unittest.TestCase):
    def setUp(self):
        self.use_case = GenerateCompletionUseCase()

    def test_generate_zsh(self):
        script = self.use_case.execute("zsh")
        self.assertIn("#compdef bento", script)
        self.assertIn("_bento()", script)
        self.assertIn("orchestra", script)
        self.assertIn("doctor", script)
        self.assertIn("arena", script)
        self.assertIn("export", script)

    def test_generate_bash(self):
        script = self.use_case.execute("bash")
        self.assertIn("_bento_completions()", script)
        self.assertIn("complete -F _bento_completions bento", script)

    def test_generate_fish(self):
        script = self.use_case.execute("fish")
        self.assertIn("complete -c bento", script)
        self.assertIn("__fish_use_subcommand", script)

    def test_unsupported_shell(self):
        with self.assertRaises(ValueError):
            self.use_case.execute("powershell")


if __name__ == "__main__":
    unittest.main()
