#!/usr/bin/env python3
"""Bento Stdio MCP Server: Zero-dependency JSON-RPC 2.0 Model Context Protocol Server."""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path

# Add Bento source to sys.path if not present
BENTO_SRC = Path("/Users/tmnguyen/Dev/bento/src")
if BENTO_SRC.exists() and str(BENTO_SRC) not in sys.path:
    sys.path.insert(0, str(BENTO_SRC))

from bento.frameworks.cli import build_controller

TOOLS = [
    {
        "name": "bento_run",
        "description": "Run a single deterministic Bento verification scenario contract JSON file to evaluate test assertions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "scenario_file": {
                    "type": "string",
                    "description": "Path to scenario JSON contract file (e.g. 'scenario.json' or 'benchmarks/health.json').",
                },
                "cwd": {
                    "type": "string",
                    "description": "Optional working directory override.",
                },
                "verbose": {
                    "type": "boolean",
                    "description": "Show verbose step stdout/stderr.",
                    "default": False,
                },
            },
            "required": ["scenario_file"],
        },
    },
    {
        "name": "bento_suite",
        "description": "Run all Bento scenario contracts in a directory and report aggregated pass rates.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "Directory containing scenario JSON files (e.g. 'examples' or 'benchmarks').",
                },
                "suite_name": {
                    "type": "string",
                    "description": "Optional custom name for the test suite.",
                    "default": "Bento Suite",
                },
            },
            "required": ["directory"],
        },
    },
    {
        "name": "bento_memory_list",
        "description": "List all active architectural rules, negative guards, and anti-patterns currently enforced in Bento's Memory Bank.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cwd": {
                    "type": "string",
                    "description": "Optional working directory where .bento/memory is located.",
                },
            },
        },
    },
    {
        "name": "bento_memory_add",
        "description": "Add a new architectural rule, negative guard, or anti-pattern to Bento's persistent Memory Bank.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short descriptive title for the rule."},
                "rule": {"type": "string", "description": "The mandatory positive rule to enforce."},
                "category": {"type": "string", "description": "Category (e.g. 'architecture', 'quant', 'git', 'testing').", "default": "general"},
                "anti_pattern": {"type": "string", "description": "Specific forbidden anti-pattern to avoid."},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "List of tags (e.g. ['clean-code', 'io'])."},
                "cwd": {"type": "string", "description": "Working directory."},
            },
            "required": ["title", "rule"],
        },
    },
    {
        "name": "bento_dream",
        "description": "Trigger an autonomous Bento Dream Cycle: Harvests historical execution traces from .bento/traces/, distills new lessons, crystallizes skills, and verifies against benchmarks.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "benchmarks_dir": {"type": "string", "description": "Directory with benchmark contracts.", "default": "examples"},
                "harvest": {"type": "boolean", "description": "Whether to harvest recent execution traces into memory.", "default": True},
                "cwd": {"type": "string", "description": "Working directory."},
            },
        },
    },
    {
        "name": "bento_bg_run",
        "description": "Run a long-running command detached in the background using the Butler Daemon (never blocks chat).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run in background (e.g. 'bento dream --benchmarks examples/')."},
                "tag": {"type": "string", "description": "Label for this task.", "default": "task"},
                "cwd": {"type": "string", "description": "Working directory."},
            },
            "required": ["command"],
        },
    },
    {
        "name": "bento_bg_list",
        "description": "List all active and past background Butler tasks.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cwd": {"type": "string", "description": "Working directory."},
            },
        },
    },
    {
        "name": "bento_bg_status",
        "description": "Check status, pid, runtime, and exit code for a background Butler task.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID (e.g. 'bg-123456')."},
                "cwd": {"type": "string", "description": "Working directory."},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "bento_bg_logs",
        "description": "View stdout/stderr logs from a background Butler task.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID."},
                "lines": {"type": "integer", "description": "Number of log lines to show.", "default": 50},
                "cwd": {"type": "string", "description": "Working directory."},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "bento_bg_kill",
        "description": "Terminate a running background Butler daemon task.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "Task ID to kill."},
                "cwd": {"type": "string", "description": "Working directory."},
            },
            "required": ["task_id"],
        },
    },
]


def handle_tool_call(name: str, args: dict) -> tuple[str, bool]:
    controller = build_controller()
    try:
        if name == "bento_run":
            exit_code, output = controller.handle_run_scenario_file(
                file_path=args["scenario_file"],
                working_dir_override=args.get("cwd"),
                verbose=args.get("verbose", False),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_suite":
            exit_code, output = controller.handle_run_suite_dir(
                directory=args["directory"],
                suite_name=args.get("suite_name", "Bento Suite"),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_memory_list":
            exit_code, output = controller.handle_memory_list(
                working_dir=args.get("cwd"),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_memory_add":
            exit_code, output = controller.handle_memory_add(
                title=args["title"],
                rule=args["rule"],
                category=args.get("category", "general"),
                anti_pattern=args.get("anti_pattern", ""),
                tags=args.get("tags", []),
                working_dir=args.get("cwd"),
            )
            return output, exit_code != 0

        elif name == "bento_dream":
            exit_code, output = controller.handle_dream_cycle(
                benchmarks_dir=args.get("benchmarks_dir", "examples"),
                working_dir=args.get("cwd"),
                harvest_traces=args.get("harvest", True),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_bg_run":
            exit_code, output = controller.handle_bg_run(
                command=args["command"],
                tag=args.get("tag", "task"),
                working_dir=args.get("cwd"),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_bg_list":
            exit_code, output = controller.handle_bg_list(
                working_dir=args.get("cwd"),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_bg_status":
            exit_code, output = controller.handle_bg_status(
                task_id=args["task_id"],
                working_dir=args.get("cwd"),
                json_output=False,
            )
            return output, exit_code != 0

        elif name == "bento_bg_logs":
            exit_code, output = controller.handle_bg_logs(
                task_id=args["task_id"],
                lines=args.get("lines", 50),
                working_dir=args.get("cwd"),
            )
            return output, exit_code != 0

        elif name == "bento_bg_kill":
            exit_code, output = controller.handle_bg_kill(
                task_id=args["task_id"],
                working_dir=args.get("cwd"),
            )
            return output, exit_code != 0

        else:
            return f"Unknown tool: {name}", True

    except Exception as e:
        return f"Execution error in {name}: {str(e)}", True


def send_response(response: dict) -> None:
    body = json.dumps(response)
    sys.stdout.write(body + "\n")
    sys.stdout.flush()


def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except Exception:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "bento-mcp-server",
                        "version": "0.5.0",
                    },
                },
            })

        elif method == "notifications/initialized":
            pass

        elif method == "ping":
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {},
            })

        elif method == "tools/list":
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": TOOLS,
                },
            })

        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            text, is_err = handle_tool_call(tool_name, tool_args)
            send_response({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": text,
                        }
                    ],
                    "isError": is_err,
                },
            })

        else:
            if req_id is not None:
                send_response({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}",
                    },
                })


if __name__ == "__main__":
    main()
