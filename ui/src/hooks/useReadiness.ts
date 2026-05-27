import { useCallback, useEffect, useState } from 'react';
import { CONTAINER_NAME, DATA_VOLUME_NAME } from '../constants';
import { ddClient } from '../dockerClient';
import type { ReadinessCheck } from '../types';
import { getTemporalWebUrl } from '../utils';

const stoppedChecks: ReadinessCheck[] = [
  { label: 'Container', ok: false, detail: 'Stopped' },
  { label: 'gRPC endpoint', ok: false, detail: 'Waiting for server' },
  { label: 'Web UI', ok: false, detail: 'Waiting for server' },
  { label: 'Persistent data', ok: false, detail: 'Volume checked at start' },
];

export function useReadiness(running: boolean) {
  const [checks, setChecks] = useState<ReadinessCheck[]>(stoppedChecks);

  const refreshReadiness = useCallback(async () => {
    if (!running) {
      setChecks(stoppedChecks);
      return;
    }

    const nextChecks: ReadinessCheck[] = [
      { label: 'Container', ok: true, detail: 'Running' },
      { label: 'gRPC endpoint', ok: false, detail: 'Checking' },
      { label: 'Web UI', ok: false, detail: 'Checking' },
      { label: 'Persistent data', ok: false, detail: 'Checking' },
    ];

    try {
      await ddClient.docker.cli.exec('exec', [
        CONTAINER_NAME,
        'temporal',
        'operator',
        'cluster',
        'health',
      ]);
      nextChecks[1] = { label: 'gRPC endpoint', ok: true, detail: 'Ready on localhost:7233' };
    } catch {
      nextChecks[1] = { label: 'gRPC endpoint', ok: false, detail: 'Not ready yet' };
    }

    try {
      const res = await fetch(getTemporalWebUrl());
      nextChecks[2] = { label: 'Web UI', ok: res.ok || res.status === 405, detail: 'Ready on localhost:8233' };
    } catch {
      nextChecks[2] = { label: 'Web UI', ok: false, detail: 'Not ready yet' };
    }

    try {
      const inspect = await ddClient.docker.cli.exec('container', ['inspect', CONTAINER_NAME]);
      const [container] = JSON.parse(inspect.stdout ?? '[]') as Array<{
        Mounts?: Array<{ Destination?: string; Name?: string; Type?: string }>;
      }>;
      const hasVolume = container?.Mounts?.some((mount) => (
        mount.Type === 'volume' &&
        mount.Name === DATA_VOLUME_NAME &&
        mount.Destination === '/data'
      )) ?? false;
      nextChecks[3] = {
        label: 'Persistent data',
        ok: hasVolume,
        detail: hasVolume ? DATA_VOLUME_NAME : 'Volume not mounted',
      };
    } catch {
      nextChecks[3] = { label: 'Persistent data', ok: false, detail: 'Unable to inspect volume' };
    }

    setChecks(nextChecks);
  }, [running]);

  useEffect(() => {
    void refreshReadiness();
    const ri = setInterval(refreshReadiness, 10000);
    return () => { clearInterval(ri); };
  }, [refreshReadiness]);

  return { checks, refreshReadiness };
}
