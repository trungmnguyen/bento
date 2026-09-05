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
