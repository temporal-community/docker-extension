import { useCallback, useEffect, useState } from 'react';
import { WORKFLOW_PAGE_SIZE } from '../constants';
import type { Workflow, WorkflowsResponse } from '../types';
import { getTemporalWebUrl } from '../utils';

const devWorkflows: Workflow[] = Array.from({ length: 8 }, (_, index) => ({
  execution: {
    workflowId: `extension-local-dev-${String(index + 1).padStart(2, '0')}`,
    runId: `local-dev-run-${index + 1}`,
  },
  type: { name: 'LocalDevWorkflow' },
  status: 'WORKFLOW_EXECUTION_STATUS_RUNNING',
  startTime: new Date(Date.now() - (index + 1) * 45_000).toISOString(),
  taskQueue: 'local-dev-task-queue',
}));

export function useWorkflows(running: boolean) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [lastWorkflowCheck, setLastWorkflowCheck] = useState<Date | null>(null);

  const fetchWorkflows = useCallback(async (): Promise<Workflow[]> => {
    try {
      const res = await fetch(getTemporalWebUrl(`/api/v1/namespaces/default/workflows?pageSize=${WORKFLOW_PAGE_SIZE}`));
      if (!res.ok) return [];
      const data = (await res.json()) as WorkflowsResponse;
      return Array.isArray(data.executions) ? data.executions : [];
    } catch {
      return import.meta.env.DEV ? devWorkflows : [];
    }
  }, []);

  const refreshWorkflows = useCallback(async () => {
    if (!running) {
      setWorkflows([]);
      setLastWorkflowCheck(null);
      return;
    }

    const nextWorkflows = await fetchWorkflows();
    setWorkflows(nextWorkflows);
    setLastWorkflowCheck(new Date());
  }, [fetchWorkflows, running]);

  useEffect(() => {
    if (!running) {
      setWorkflows([]);
      setLastWorkflowCheck(null);
      return;
    }

    void refreshWorkflows();
    const wi = setInterval(refreshWorkflows, 10000);
    return () => { clearInterval(wi); };
  }, [running, refreshWorkflows]);

  return {
    fetchWorkflows,
    lastWorkflowCheck,
    refreshWorkflows,
    setLastWorkflowCheck,
    setWorkflows,
    workflows,
  };
}
