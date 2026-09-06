import { SystemStatus, BackgroundTask, MemoryLesson, TelemetryMetrics } from '../types';

export function generateHarnessReport(params: {
  status: SystemStatus;
  tasks: BackgroundTask[];
  lessons: MemoryLesson[];
  telemetry: TelemetryMetrics | null;
  vitals: { rss_mb: number; load_avg: number[]; active_daemons: number } | null;
}): string {
  const { status, tasks, lessons, telemetry, vitals } = params;
  const runningCount = tasks.filter((t) => t.status === 'RUNNING').length;
  const passRate = typeof telemetry?.pass_rate === 'number' ? `${telemetry.pass_rate.toFixed(1)}%` : 'N/A';
  const p90 = typeof telemetry?.p90_latency_ms === 'number' ? `${telemetry.p90_latency_ms.toFixed(0)}ms` : 'N/A';
  const loadStr = Array.isArray(vitals?.load_avg) ? vitals!.load_avg.join(', ') : '0.0';

  return `### 🍱 Bento Harness Executive Health Snapshot
*Generated at ${new Date().toISOString()} · Repository: \`${status.cwd || 'current'}\`*

| Subsystem | Metric / Value | Health Status |
| :--- | :--- | :--- |
| **System Vitals** | RSS: \`${vitals?.rss_mb || 0} MB\` · Load: \`${loadStr}\` | ${vitals && vitals.rss_mb < 500 ? '🟢 Nominal' : '🟡 Review'} |
| **Kitchen Chefs** | Active Daemons: \`${runningCount}\` / Total: \`${tasks.length}\` | ${runningCount > 0 ? '🍳 Simmering' : '⚪ Idle'} |
| **Memory Bank** | Rules Seasoned: \`${lessons.length}\` Golden Axioms | 🧠 Inoculated |
| **Tasting Telemetry** | Pass Rate: \`${passRate}\` · P90 Latency: \`${p90}\` | ${telemetry && telemetry.pass_rate >= 90 ? '🍵 Grade A' : '🌶️ Needs Polish'} |

#### 🍙 Active Memory Bank Directives
${lessons.slice(0, 6).map((l) => `- **[${(l.category || 'general').toUpperCase()}] ${l.title}:** ${l.rule}`).join('\n')}

---
*Verified with Bento Autonomous Harness · Zero Python External Dependencies*
`;
}

export async function copyHarnessReport(params: {
  status: SystemStatus;
  tasks: BackgroundTask[];
  lessons: MemoryLesson[];
  traces?: unknown[];
  scenarios?: unknown[];
  telemetry: TelemetryMetrics | null;
  vitals?: { rss_mb: number; load_avg: number[]; active_daemons: number } | null;
}): Promise<boolean> {
  const report = generateHarnessReport({
    status: params.status,
    tasks: params.tasks,
    lessons: params.lessons,
    telemetry: params.telemetry,
    vitals: params.vitals || null,
  });
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

