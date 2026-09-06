export interface SystemStatus {
  status: string;
  uptime_sec: number;
  active_tasks_count: number;
  total_lessons_count: number;
  recent_traces_count: number;
  benchmarks_count: number;
  cwd: string;
}

export interface BackgroundTask {
  task_id: string;
  tag: string;
  command: string;
  pid: number | null;
  status: 'RUNNING' | 'COMPLETED' | 'KILLED' | 'FAILED' | 'UNKNOWN';
  start_time: string;
  duration_sec: number;
  log_file: string;
  exit_code: number | null;
}

export interface MemoryLesson {
  id: string;
  title: string;
  category: string;
  context: string;
  rule: string;
  anti_pattern?: string;
  discovery_date: string;
  tags: string[];
  source_scenario?: string;
}

export interface TraceEvent {
  timestamp: string;
  task_name: string;
  iteration: number;
  event_type: string;
  prompt_sent: string;
  agent_output: string;
  exit_code: number;
  passed: boolean;
  failed_assertions: string[];
  tags: string[];
}

export interface CrystallizedSkill {
  name: string;
  description: string;
  trigger_tags: string[];
  steps: string[];
}

export interface ScenarioStep {
  name: string;
  command: string;
  assertions: {
    type: string;
    expected: any;
    target_field: string;
    description: string;
  }[];
}

export interface Scenario {
  name: string;
  description: string;
  tags: string[];
  steps: ScenarioStep[];
}

export interface SuiteResult {
  suite_name: string;
  passed_scenarios: number;
  total_scenarios: number;
  pass_rate: number;
  total_duration_ms: number;
  all_passed: boolean;
  results: {
    scenario_name: string;
    passed: boolean;
    duration_ms: number;
    step_results: {
      step_name: string;
      status: string;
      error_message?: string;
    }[];
  }[];
}

export interface MemoryGraphNode {
  id: string;
  label: string;
  node_type: 'category_hub' | 'golden_rule' | 'anti_pattern' | 'scenario';
  category: string;
  weight: number;
  x: number;
  y: number;
  details: Record<string, any>;
  tags: string[];
}

export interface MemoryGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface MemoryGraph {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  categories: string[];
  total_rules: number;
  total_anti_patterns: number;
}

export interface PreflightAssertionResult {
  type: string;
  target_field: string;
  expected: any;
  actual_value: any;
  passed: boolean;
  error_message?: string | null;
}

export interface PreflightResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  all_passed: boolean;
  assertion_results: PreflightAssertionResult[];
}

export interface TelemetryMetrics {
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  pass_rate: number;
  p50_latency_ms: number;
  p90_latency_ms: number;
  p99_latency_ms: number;
  avg_latency_ms: number;
  recent_latencies: number[];
  recent_pass_flags: boolean[];
}

export interface BentoNotification {
  id: string;
  timestamp: string;
  category: 'DAEMON' | 'ARENA' | 'DREAM' | 'BATTERY' | 'SYSTEM';
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  read: boolean;
  actionTab?: string;
}

export interface SystemVitals {
  rss_mb: number;
  load_avg: number[];
  active_daemons: number;
  os?: string;
  python_version?: string;
}
