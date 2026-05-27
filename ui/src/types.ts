export type LogType = 'success' | 'error' | 'info';

export interface LogEntry {
  msg: string;
  type: LogType;
  time: string;
}

export interface Workflow {
  execution: { workflowId: string; runId: string };
  type?: { name: string };
  status: string;
  startTime?: string;
  executionTime?: string;
  taskQueue?: string;
}

export interface WorkflowsResponse {
  executions?: Workflow[];
}

export interface DiagnosticItem {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ReadinessCheck {
  label: string;
  ok: boolean;
  detail: string;
}
