import type { Workflow } from './types';

export const CONTAINER_NAME = 'temporal-dev';
export const DATA_VOLUME_NAME = 'temporal-dev-data';
export const NETWORK_NAME = 'temporal-network';
export const NAMESPACE = 'default';
export const TEMPORAL_GRPC_ENDPOINT = 'localhost:7233';
export const TEMPORAL_WEB_URL = 'http://localhost:8233';
export const SOURCE_CODE_URL = 'https://github.com/temporal-community/docker-extension';
export const WORKFLOW_PAGE_SIZE = 20;

export const STATUS_MAP: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'default' | 'warning' }> = {
  WORKFLOW_EXECUTION_STATUS_RUNNING:          { label: 'Running',    color: 'success' },
  WORKFLOW_EXECUTION_STATUS_COMPLETED:        { label: 'Completed',  color: 'info'    },
  WORKFLOW_EXECUTION_STATUS_FAILED:           { label: 'Failed',     color: 'error'   },
  WORKFLOW_EXECUTION_STATUS_CANCELED:         { label: 'Canceled',   color: 'default' },
  WORKFLOW_EXECUTION_STATUS_TERMINATED:       { label: 'Terminated', color: 'default' },
  WORKFLOW_EXECUTION_STATUS_CONTINUED_AS_NEW: { label: 'Continued',  color: 'info'    },
  WORKFLOW_EXECUTION_STATUS_TIMED_OUT:        { label: 'Timed Out',  color: 'warning' },
};

export const HANDOFF_LINKS = [
  { label: 'Open Temporal UI', query: undefined },
  { label: 'Running workflows', query: 'ExecutionStatus="Running"' },
  { label: 'Failed workflows', query: 'ExecutionStatus="Failed"' },
] as const;

export function workflowUrl(workflow: Workflow): string {
  const { workflowId, runId } = workflow.execution;
  return `${TEMPORAL_WEB_URL}/namespaces/${NAMESPACE}/workflows/${encodeURIComponent(workflowId)}/${encodeURIComponent(runId)}/history`;
}

export function workflowListUrl(query?: string): string {
  const queryString = query ? `?query=${encodeURIComponent(query)}` : '';
  return `${TEMPORAL_WEB_URL}/namespaces/${NAMESPACE}/workflows${queryString}`;
}
