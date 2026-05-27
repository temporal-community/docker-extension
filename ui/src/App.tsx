import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import { ClearHistoryDialog } from './components/ClearHistoryDialog';
import { ControlPanel } from './components/ControlPanel';
import { HeaderHero } from './components/HeaderHero';
import { LogsPanel } from './components/LogsPanel';
import { RecentActivityPanel } from './components/RecentActivityPanel';
import {
  CONTAINER_NAME,
  DATA_VOLUME_NAME,
  NETWORK_NAME,
  TEMPORAL_WEB_URL,
} from './constants';
import { ddClient } from './dockerClient';
import { useDockerTheme } from './hooks/useDockerTheme';
import { useLogs } from './hooks/useLogs';
import { useReadiness } from './hooks/useReadiness';
import { useWorkerStatus } from './hooks/useWorkerStatus';
import { useWorkflows } from './hooks/useWorkflows';
import logoDarkUrl from './assets/temporal-logo-dark.png';
import logoLightUrl from './assets/temporal-logo-light.png';
import { getErrorMessage, getTemporalWebUrl, startupDiagnostics } from './utils';

export function App() {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [diagnostics, setDiagnostics] = useState<ReturnType<typeof startupDiagnostics>>([]);

  const { theme, prefersDark } = useDockerTheme();
  const {
    addLog,
    logRef,
    logs,
    logsMinimized,
    setLogsMinimized,
    setShowAllLogs,
    showAllLogs,
    visibleLogs,
  } = useLogs();
  const {
    fetchWorkflows,
    lastWorkflowCheck,
    refreshWorkflows,
    setLastWorkflowCheck,
    setWorkflows,
    workflows,
  } = useWorkflows(running);
  const {
    lastWorkerCheck,
    workerActiveQueueCount,
    workerPollerCount,
    workerQueueCount,
  } = useWorkerStatus(running, workflows);
  const { checks: readinessChecks, refreshReadiness } = useReadiness(running);

  const checkStatus = useCallback(async () => {
    try {
      const inspectResult = await ddClient.docker.cli.exec('container', [
        'inspect', '--format', '{{.State.Running}}', CONTAINER_NAME,
      ]);
      const isRunning = inspectResult.stdout?.trim().toLowerCase() === 'true';
      setRunning(isRunning);
      setLastStatusCheck(new Date());
    } catch {
      try {
        const psResult = await ddClient.docker.cli.exec('ps', [
          '--filter', `name=^/${CONTAINER_NAME}$`, '--format', '{{.State}}',
        ]);
        setRunning(psResult.stdout?.trim().toLowerCase() === 'running');
        setLastStatusCheck(new Date());
      } catch {
        setRunning(false);
        setLastStatusCheck(new Date());
      }
    }
  }, []);

  useEffect(() => {
    void checkStatus();
    const si = setInterval(checkStatus, 5000);
    return () => { clearInterval(si); };
  }, [checkStatus]);

  async function waitForReady(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(getTemporalWebUrl());
        if (res.ok || res.status === 405) return true;
      } catch {
        // Not ready yet.
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  async function startServer() {
    addLog('Creating data volume...', 'info');
    try {
      await ddClient.docker.cli.exec('volume', ['create', DATA_VOLUME_NAME]);
      addLog('Volume ready', 'success');
    } catch {
      addLog('Using existing volume', 'info');
    }

    try {
      await ddClient.docker.cli.exec('run', [
        '--rm', '-v', `${DATA_VOLUME_NAME}:/data`, 'alpine', 'chmod', '777', '/data',
      ]);
    } catch {
      // Permissions may already be set.
    }

    addLog('Creating network...', 'info');
    try {
      await ddClient.docker.cli.exec('network', ['create', NETWORK_NAME]);
      addLog('Network ready', 'success');
    } catch {
      addLog('Using existing network', 'info');
    }

    addLog('Starting Temporal...', 'info');
    await ddClient.docker.cli.exec('run', [
      '-d', '--name', CONTAINER_NAME,
      '--network', NETWORK_NAME,
      '-p', '7233:7233', '-p', '8233:8233',
      '-v', `${DATA_VOLUME_NAME}:/data`,
      'temporalio/temporal:latest',
      'server', 'start-dev',
      '--ip', '0.0.0.0', '--ui-ip', '0.0.0.0',
      '--db-filename', '/data/temporal.db',
    ]);
    addLog('Temporal container started', 'success');
  }

  async function syncReadyState() {
    await checkStatus();
    const nextWorkflows = await fetchWorkflows();
    setWorkflows(nextWorkflows);
    setLastWorkflowCheck(new Date());
    await refreshReadiness();
  }

  async function handleStart() {
    setBusy(true);
    setDiagnostics([]);
    try {
      try {
        await ddClient.docker.cli.exec('rm', ['-f', CONTAINER_NAME]);
      } catch {
        // No previous container to remove.
      }
      await startServer();
      addLog('Waiting for Temporal to be ready...', 'info');
      if (await waitForReady()) {
        addLog('Ready — open Temporal UI for workflow inspection', 'success');
        await syncReadyState();
      } else {
        const message = 'Temporal did not respond within 30s';
        setDiagnostics(startupDiagnostics(message));
        addLog(message, 'error');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setDiagnostics(startupDiagnostics(message));
      addLog('Error: ' + message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await ddClient.docker.cli.exec('rm', ['-f', CONTAINER_NAME]);
      addLog('Temporal stopped', 'success');
      try {
        await ddClient.docker.cli.exec('network', ['rm', NETWORK_NAME]);
      } catch {
        // Network may still be in use or already gone.
      }
      setWorkflows([]);
      setLastWorkflowCheck(null);
      await checkStatus();
    } catch (err: unknown) {
      addLog('Error: ' + getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setClearOpen(false);
    setClearConfirm('');
    setBusy(true);
    setDiagnostics([]);
    addLog('Resetting local Temporal history...', 'info');
    try {
      try {
        await ddClient.docker.cli.exec('rm', ['-f', CONTAINER_NAME]);
        addLog('Container stopped', 'success');
      } catch {
        addLog('No container to remove', 'info');
      }

      try {
        await ddClient.docker.cli.exec('volume', ['rm', DATA_VOLUME_NAME]);
        addLog('Data volume removed', 'success');
      } catch {
        addLog('Data volume already removed', 'info');
      }

      try {
        await ddClient.docker.cli.exec('network', ['rm', NETWORK_NAME]);
      } catch {
        // Network may already be gone.
      }

      addLog('Restarting with a fresh database...', 'info');
      await startServer();
      if (await waitForReady()) {
        addLog('Ready with fresh database', 'success');
        await syncReadyState();
      } else {
        const message = 'Temporal did not respond within 30s';
        setDiagnostics(startupDiagnostics(message));
        addLog(message, 'error');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setDiagnostics(startupDiagnostics(message));
      addLog('Error: ' + message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      addLog(`Copied ${value}`, 'success');
    } catch {
      addLog(`Copy failed. Value: ${value}`, 'error');
    }
  }

  function openClearDialog() {
    setClearConfirm('');
    setClearOpen(true);
  }

  const logoUrl = prefersDark ? logoLightUrl : logoDarkUrl;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        html: { height: '100%', overflow: 'hidden' },
        body: { height: '100%', overflow: 'hidden' },
        '#root': { height: '100%', overflow: 'hidden' },
      }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', p: { xs: 1, md: 2 }, boxSizing: 'border-box' }}>
          <HeaderHero logoUrl={logoUrl} running={running} busy={busy} />
          <Box
            sx={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 1, md: 1.5 },
            }}
          >
            <ControlPanel
              busy={busy}
              diagnostics={diagnostics}
              lastStatusCheck={lastStatusCheck}
              lastWorkerCheck={lastWorkerCheck}
              logCount={logs.length}
              onClearClick={openClearDialog}
              onCopy={handleCopy}
              onStart={handleStart}
              onStop={handleStop}
              onTroubleshootClick={() => setLogsMinimized(false)}
              readinessChecks={readinessChecks}
              running={running}
              workerActiveQueueCount={workerActiveQueueCount}
              workerPollerCount={workerPollerCount}
              workerQueueCount={workerQueueCount}
            />
            <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <RecentActivityPanel
                busy={busy}
                lastWorkflowCheck={lastWorkflowCheck}
                onRefresh={refreshWorkflows}
                running={running}
                workflows={workflows}
              />
            </Box>
          </Box>
        </Box>
        <ClearHistoryDialog
          confirmValue={clearConfirm}
          onCancel={() => setClearOpen(false)}
          onConfirm={handleClear}
          onConfirmValueChange={setClearConfirm}
          open={clearOpen}
        />
        <LogsPanel
          logRef={logRef}
          logs={logs}
          logsMinimized={logsMinimized}
          setLogsMinimized={setLogsMinimized}
          setShowAllLogs={setShowAllLogs}
          showAllLogs={showAllLogs}
          visibleLogs={visibleLogs}
        />
      </Box>
    </ThemeProvider>
  );
}
