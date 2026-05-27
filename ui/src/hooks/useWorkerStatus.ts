import { useCallback, useEffect, useState } from 'react';
import { CONTAINER_NAME, NAMESPACE } from '../constants';
import { ddClient } from '../dockerClient';
import type { Workflow } from '../types';

export function useWorkerStatus(running: boolean, workflows: Workflow[]) {
  const [workerPollerCount, setWorkerPollerCount] = useState(0);
  const [workerQueueCount, setWorkerQueueCount] = useState(0);
  const [workerActiveQueueCount, setWorkerActiveQueueCount] = useState(0);
  const [lastWorkerCheck, setLastWorkerCheck] = useState<Date | null>(null);

  const refreshWorkerStatus = useCallback(async (inputWorkflows: Workflow[]) => {
    if (!running) {
      setWorkerPollerCount(0);
      setWorkerQueueCount(0);
      setWorkerActiveQueueCount(0);
      setLastWorkerCheck(new Date());
      return;
    }

    const workflowQueues = Array.from(
      new Set(
        inputWorkflows
          .map((w) => w.taskQueue?.trim())
          .filter((q): q is string => Boolean(q)),
      ),
    );

    if (workflowQueues.length === 0) {
      setWorkerPollerCount(0);
      setWorkerQueueCount(0);
      setWorkerActiveQueueCount(0);
      setLastWorkerCheck(new Date());
      return;
    }

    const pollerCounts = await Promise.all(workflowQueues.map(async (queue) => {
      try {
        const result = await ddClient.docker.cli.exec('exec', [
          CONTAINER_NAME,
          'temporal',
          'task-queue',
          'describe',
          '--namespace', NAMESPACE,
          '--task-queue', queue,
          '--task-queue-type', 'workflow',
          '--output', 'json',
        ]);

        const parsed = JSON.parse(result.stdout ?? '{}') as { pollers?: Array<unknown> };
        return Array.isArray(parsed.pollers) ? parsed.pollers.length : 0;
      } catch {
        return 0;
      }
    }));

    setWorkerPollerCount(pollerCounts.reduce((sum, count) => sum + count, 0));
    setWorkerQueueCount(workflowQueues.length);
    setWorkerActiveQueueCount(pollerCounts.filter((count) => count > 0).length);
    setLastWorkerCheck(new Date());
  }, [running]);

  useEffect(() => {
    void refreshWorkerStatus(workflows);
  }, [workflows, refreshWorkerStatus]);

  return {
    lastWorkerCheck,
    workerActiveQueueCount,
    workerPollerCount,
    workerQueueCount,
  };
}
